"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import { AdminAccessError, safeActionError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/session";
import { congregationRulesFromForm, payloadFromConfiguration } from "@/lib/prayer/admin-input";
import { buildPrayerSchedule, buildScheduleRange } from "@/lib/prayer/engine";
import { dateKeyInZone, formatTime } from "@/lib/prayer/timezone";
import { congregationPrayerKeys, prayerConfigurationSchema } from "@/lib/prayer/types";
import { publicationHorizon, validateConfigurationSchedule } from "@/lib/prayer/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getPrayerConfigurationForAdmin } from "@/server/repositories/prayer-admin";

/*
 * The committee's most frequent change — Iqamah rules and the Jumuʿah time —
 * as one action against the live timetable. Nothing is written until the
 * new rules have passed validation for every day of the period; then the
 * live configuration is cloned, the clone saved with the new rules, and the
 * two swapped in a single database transaction, exactly as the manual
 * withdraw-with-replacement flow would do.
 */

const identitySchema = z.object({
  id: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u);
const prayerLabels: Record<(typeof congregationPrayerKeys)[number], string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "ʿAsr",
  maghrib: "Maghrib",
  isha: "ʿIshāʾ",
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function serviceRefused(error: { code?: string; message?: string } | null): never {
  if (error?.code === "40001") {
    throw new AdminAccessError(
      "conflict",
      "Another editor changed the timetable first. Reload before trying again.",
    );
  }
  throw new AdminAccessError(
    "service",
    "The prayer-time service refused the change. The live timetable is unchanged.",
  );
}

function revalidatePrayerSurfaces(id: string): void {
  revalidateTag("prayer-data", "max");
  revalidatePath("/");
  revalidatePath("/prayer-times");
  revalidatePath("/prayer-times/[month]", "page");
  revalidatePath("/prayer-times/calendar.ics");
  revalidatePath("/tv");
  revalidatePath("/api/prayer");
  revalidatePath("/api/display");
  revalidatePath("/admin/prayer-times");
  revalidatePath(`/admin/prayer-times/${id}`);
}

export async function quickChangeCongregationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = identitySchema.safeParse({
      id: formString(formData, "id"),
      expectedVersion: formString(formData, "expectedVersion"),
    });
    if (!identity.success) {
      return { status: "error", message: "Reload the timetable and try again." };
    }
    const approvalNote = formString(formData, "approvalNote");
    if (approvalNote.length < 10 || approvalNote.length > 1000) {
      return { status: "error", message: "Add a short approval note (10–1,000 characters)." };
    }
    const khutbah = timeSchema.safeParse(formString(formData, "jumuahKhutbah"));
    if (!khutbah.success) {
      return { status: "error", message: "Enter the Jumuʿah khutbah time as HH:MM." };
    }

    const context = await requirePermission("prayer:publish", { requireAal2: true });
    const current = await getPrayerConfigurationForAdmin(context.supabase, identity.data.id);
    if (
      !current ||
      current.status !== "published" ||
      current.version !== identity.data.expectedVersion
    ) {
      throw new AdminAccessError(
        "conflict",
        "The live timetable changed or was withdrawn. Reload before trying again.",
      );
    }

    const firstSession = current.jumuahSessions[0];
    const parsed = prayerConfigurationSchema.safeParse({
      ...current,
      congregationRules: congregationRulesFromForm(formData),
      jumuahSessions: [
        {
          ...firstSession,
          label: firstSession?.label ?? "Jumuʿah",
          khutbahTime: khutbah.data,
          prayerTime: null,
          displayOrder: 1,
        },
      ],
      status: "published",
      approvalNote,
      approvedBy: context.userId,
      publishedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      return {
        status: "error",
        message: "Check the Iqamah rules. Nothing was changed.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    }
    const candidate = parsed.data;
    const horizon = publicationHorizon(candidate);
    if (!horizon.ok) return { status: "error", message: horizon.issue.message };
    const schedules = buildScheduleRange(candidate, horizon.firstDate, horizon.days);
    const errors = validateConfigurationSchedule(candidate, schedules).filter(
      (issue) => issue.severity === "error",
    );
    if (errors.length > 0) {
      const detail = errors
        .slice(0, 3)
        .map((issue) => `${issue.date ?? "timetable"}: ${issue.message}`)
        .join(" · ");
      return {
        status: "error",
        message: `These rules fail on ${errors.length} day${errors.length === 1 ? "" : "s"} of the timetable, so nothing was changed — ${detail}`,
      };
    }

    const { data: cloneId, error: cloneError } = await context.supabase.rpc(
      "clone_prayer_settings_draft",
      { p_source_id: current.id, p_revision_id: null },
    );
    if (cloneError || !cloneId) serviceRefused(cloneError);
    const clone = await getPrayerConfigurationForAdmin(context.supabase, cloneId);
    if (!clone) serviceRefused(null);

    const { payload, jumuahPayload } = payloadFromConfiguration({
      ...candidate,
      name: current.name,
    });
    const { data: saved, error: saveError } = await context.supabase.rpc("save_prayer_draft", {
      p_id: cloneId,
      p_expected_version: clone.version,
      p_payload: payload,
      p_jumuah: jumuahPayload,
    });
    if (saveError || !saved?.[0]) serviceRefused(saveError);

    const service = createSupabaseServiceClient();
    const { data: swapped, error: swapError } = await service.rpc("withdraw_prayer_settings", {
      p_actor_id: context.userId,
      p_id: current.id,
      p_expected_version: current.version,
      p_reason: `Replaced by a quick Iqamah/Jumuʿah change. ${approvalNote}`,
      p_replacement_id: cloneId,
      p_replacement_expected_version: saved[0].settings_version,
      p_replacement_approval_note: approvalNote,
    });
    if (swapError || !swapped?.[0]) serviceRefused(swapError);

    revalidatePrayerSurfaces(current.id);
    revalidatePrayerSurfaces(cloneId);

    let tomorrow = "";
    try {
      const key = dateKeyInZone(new Date(Date.now() + 86_400_000), candidate.timezone);
      const schedule = buildPrayerSchedule(candidate, key);
      tomorrow = congregationPrayerKeys
        .map(
          (prayer) =>
            `${prayerLabels[prayer]} ${formatTime(schedule.prayers[prayer].congregationAt, schedule.timezone)}`,
        )
        .join(" · ");
    } catch {
      tomorrow = "";
    }
    return {
      status: "success",
      message: `Published. ${tomorrow ? `Tomorrow's Iqamah: ${tomorrow}. ` : ""}Jumuʿah ${khutbah.data}. The website updates within a minute; the new record is at the top of the timetable list.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}
