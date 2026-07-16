"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import { AdminAccessError, safeActionError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/session";
import { parsePrayerDraftForm } from "@/lib/prayer/admin-input";
import { buildScheduleRange } from "@/lib/prayer/engine";
import { parseTimetableCsv } from "@/lib/prayer/import";
import { dateKeyInZone, wallTimeToInstant } from "@/lib/prayer/timezone";
import {
  congregationPrayerKeys,
  congregationRuleSchema,
  dateKeySchema,
  prayerConfigurationSchema,
  prayerOverrideSchema,
  seasonalArrangementSchema,
  type CongregationRule,
} from "@/lib/prayer/types";
import { publicationHorizon, validateConfigurationSchedule } from "@/lib/prayer/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getPrayerConfigurationForAdmin } from "@/server/repositories/prayer-admin";
import type { Json } from "@/types/database";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formIdentity(formData: FormData) {
  return z
    .object({
      id: z.uuid(),
      expectedVersion: z.coerce.number().int().positive(),
    })
    .safeParse({
      id: formString(formData, "id"),
      expectedVersion: formString(formData, "expectedVersion"),
    });
}

function validationFailure(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Check the timetable fields. Nothing was saved.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

function prayerServiceError(error: { code?: string; message?: string } | null): never {
  if (error?.code === "40001") {
    throw new AdminAccessError(
      "conflict",
      "Another editor changed these prayer settings first. Reload before trying again.",
    );
  }
  if (error?.code === "23P01") {
    throw new AdminAccessError(
      "conflict",
      "This publication period overlaps another approved timetable. Adjust the dates first.",
    );
  }
  if (error?.code === "23505") {
    throw new AdminAccessError("conflict", "That dated prayer entry already exists.");
  }
  throw new AdminAccessError(
    "service",
    "The prayer-time service refused the change. Nothing was published.",
  );
}

function revalidatePrayerSurfaces(id?: string): void {
  revalidatePath("/");
  revalidatePath("/prayer-times");
  revalidatePath("/tv");
  revalidatePath("/api/prayer");
  revalidatePath("/api/display");
  revalidatePath("/admin/prayer-times");
  if (id) revalidatePath(`/admin/prayer-times/${id}`);
}

export async function savePrayerDraftAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let createdId: string | null = null;
  try {
    const parsed = parsePrayerDraftForm(formData);
    if (!parsed.success) return validationFailure(parsed.error);
    if (parsed.data.id && !parsed.data.expectedVersion) {
      throw new AdminAccessError("validation", "Reload this draft before saving it.");
    }
    const context = await requirePermission("prayer:write", { requireAal2: true });
    const { data, error } = await context.supabase.rpc("save_prayer_draft", {
      p_id: parsed.data.id ?? null,
      p_expected_version: parsed.data.expectedVersion ?? null,
      p_payload: parsed.data.payload,
      p_jumuah: parsed.data.jumuahPayload,
    });
    if (error || !data?.[0]) prayerServiceError(error);
    createdId = data[0].settings_id;
    revalidatePrayerSurfaces(createdId);
    if (parsed.data.id) {
      return {
        status: "success",
        message: `Draft saved as version ${data[0].settings_version}. Review the preview and full effective-horizon validation before publishing.`,
      };
    }
  } catch (error) {
    return safeActionError(error);
  }
  redirect(`/admin/prayer-times/${createdId}`);
}

export async function publishPrayerSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = formIdentity(formData);
    if (!identity.success) return validationFailure(identity.error);
    const approvalNote = formString(formData, "approvalNote");
    const confirmation = formString(formData, "confirmation");
    if (approvalNote.length < 10 || approvalNote.length > 1000) {
      return {
        status: "error",
        message:
          "Record who approved the timetable and the evidence reviewed (10–1,000 characters).",
      };
    }
    if (confirmation !== "PUBLISH PRAYER TIMES") {
      return {
        status: "error",
        message:
          "Type “PUBLISH PRAYER TIMES” exactly to confirm this religiously sensitive update.",
      };
    }

    const context = await requirePermission("prayer:publish", { requireAal2: true });
    const stored = await getPrayerConfigurationForAdmin(context.supabase, identity.data.id);
    if (!stored || stored.status !== "draft" || stored.version !== identity.data.expectedVersion) {
      throw new AdminAccessError(
        "conflict",
        "This draft changed or is no longer publishable. Reload and review it again.",
      );
    }

    const candidate = prayerConfigurationSchema.parse({
      ...stored,
      status: "published",
      approvalNote,
      approvedBy: context.userId,
      publishedAt: new Date().toISOString(),
    });
    const horizon = publicationHorizon(candidate);
    if (!horizon.ok) return { status: "error", message: horizon.issue.message };
    const schedules = buildScheduleRange(candidate, horizon.firstDate, horizon.days);
    const issues = validateConfigurationSchedule(candidate, schedules);
    const errors = issues.filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
      // The 30-day preview may look clean while a later effective date fails,
      // so name the first failing dates rather than reporting only a count.
      const detail = errors
        .slice(0, 5)
        .map((issue) => `${issue.date ?? "configuration"}: ${issue.message}`)
        .join(" · ");
      return {
        status: "error",
        message: `Publication blocked by ${errors.length} timetable validation ${errors.length === 1 ? "error" : "errors"} — ${detail}${errors.length > 5 ? " · …" : ""}`,
      };
    }

    const service = createSupabaseServiceClient();
    const { data, error } = await service.rpc("publish_prayer_settings", {
      p_actor_id: context.userId,
      p_id: identity.data.id,
      p_expected_version: identity.data.expectedVersion,
      p_approval_note: approvalNote,
    });
    if (error || !data?.[0]) prayerServiceError(error);
    revalidatePrayerSurfaces(identity.data.id);
    return {
      status: "success",
      message: `Prayer timetable version ${data[0].settings_version} published after all ${horizon.days} effective days passed validation (${issues.length} non-blocking warnings).`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}

const cloneSchema = z.object({
  id: z.uuid(),
  revisionId: z.coerce.number().int().positive().optional(),
});

async function clonePrayerDraft(formData: FormData): Promise<never> {
  const parsed = cloneSchema.safeParse({
    id: formString(formData, "id"),
    revisionId: formString(formData, "revisionId") || undefined,
  });
  if (!parsed.success) throw new AdminAccessError("validation", "That revision is unavailable.");
  const context = await requirePermission("prayer:write", { requireAal2: true });
  const { data, error } = await context.supabase.rpc("clone_prayer_settings_draft", {
    p_source_id: parsed.data.id,
    p_revision_id: parsed.data.revisionId ?? null,
  });
  if (error || !data) prayerServiceError(error);
  revalidatePrayerSurfaces(data);
  redirect(`/admin/prayer-times/${data}`);
}

export async function clonePrayerSettingsAction(formData: FormData): Promise<void> {
  await clonePrayerDraft(formData);
}

export async function restorePrayerRevisionAction(formData: FormData): Promise<void> {
  await clonePrayerDraft(formData);
}

const overrideInputSchema = prayerOverrideSchema.extend({
  settingsId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

export async function savePrayerOverrideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const raw = {
      settingsId: formString(formData, "settingsId"),
      expectedVersion: formString(formData, "expectedVersion"),
      date: formString(formData, "date"),
      prayer: formString(formData, "prayer"),
      beginsAt: formString(formData, "beginsAt") || undefined,
      congregationAt: formString(formData, "congregationAt") || undefined,
      unavailable: formData.get("unavailable") === "on",
      reason: formString(formData, "reason"),
    };
    const parsed = overrideInputSchema.safeParse(raw);
    if (!parsed.success) return validationFailure(parsed.error);
    dateKeySchema.parse(parsed.data.date);
    const context = await requirePermission("prayer:write", { requireAal2: true });
    const configuration = await getPrayerConfigurationForAdmin(
      context.supabase,
      parsed.data.settingsId,
    );
    if (!configuration || configuration.status !== "draft") {
      throw new AdminAccessError("conflict", "Create a draft before changing a dated override.");
    }
    for (const time of [parsed.data.beginsAt, parsed.data.congregationAt]) {
      if (!time) continue;
      const resolved = wallTimeToInstant(parsed.data.date, time, configuration.timezone, "reject");
      if (!resolved.ok) {
        return {
          status: "error",
          message: `The selected ${time} clock time is ${resolved.reason} on that date in ${configuration.timezone}. Choose another time.`,
        };
      }
    }
    const payload: Json = {
      prayer_date: parsed.data.date,
      prayer: parsed.data.prayer,
      begins_at: parsed.data.beginsAt ?? null,
      congregation_at: parsed.data.congregationAt ?? null,
      unavailable: parsed.data.unavailable,
      reason: parsed.data.reason,
    };
    const { data, error } = await context.supabase.rpc("save_prayer_override", {
      p_settings_id: parsed.data.settingsId,
      p_expected_version: parsed.data.expectedVersion,
      p_payload: payload,
    });
    if (error || !data?.[0]) prayerServiceError(error);
    revalidatePrayerSurfaces(parsed.data.settingsId);
    return {
      status: "success",
      message: `Dated override saved. The draft is now version ${data[0].settings_version}.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}

const importFormSchema = z.object({
  settingsId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  mode: z.enum(["preview", "import"]),
  replaceExisting: z.boolean(),
  sourceNote: z.string().trim().min(3).max(200),
  csv: z.string().min(1).max(250_000),
});

export async function importPrayerTimetableAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const csvValue = formData.get("csv");
    const parsed = importFormSchema.safeParse({
      settingsId: formString(formData, "settingsId"),
      expectedVersion: formString(formData, "expectedVersion"),
      mode: formString(formData, "mode"),
      replaceExisting: formData.get("replaceExisting") === "on",
      sourceNote: formString(formData, "sourceNote"),
      csv: typeof csvValue === "string" ? csvValue : "",
    });
    if (!parsed.success) return validationFailure(parsed.error);

    const context = await requirePermission("prayer:write", { requireAal2: true });
    const configuration = await getPrayerConfigurationForAdmin(
      context.supabase,
      parsed.data.settingsId,
    );
    if (
      !configuration ||
      configuration.status !== "draft" ||
      configuration.version !== parsed.data.expectedVersion
    ) {
      throw new AdminAccessError(
        "conflict",
        "This draft changed or is no longer editable. Reload before importing.",
      );
    }

    const report = parseTimetableCsv(parsed.data.csv, {
      effectiveFrom: configuration.effectiveFrom,
      effectiveTo: configuration.effectiveTo,
    });

    const problems = report.errors.map((issue) =>
      issue.line > 0 ? `Line ${issue.line}: ${issue.message}` : issue.message,
    );
    if (problems.length === 0) {
      for (const entry of report.entries) {
        for (const time of [entry.beginsAt, entry.congregationAt]) {
          if (!time) continue;
          const resolved = wallTimeToInstant(entry.date, time, configuration.timezone, "reject");
          if (!resolved.ok) {
            problems.push(
              `${entry.date}: ${entry.prayer} ${time} is ${resolved.reason} in ${configuration.timezone} (clock change).`,
            );
          }
        }
      }
    }
    if (problems.length > 0) {
      return {
        status: "error",
        message: `The file has ${problems.length} problem${problems.length === 1 ? "" : "s"}. Nothing was imported.`,
        fieldErrors: { csv: problems.slice(0, 12) },
      };
    }

    const summary = `${report.days} day${report.days === 1 ? "" : "s"} (${report.firstDate} to ${report.finalDate}), ${report.entries.length} dated entries`;
    if (parsed.data.mode === "preview") {
      return {
        status: "success",
        message: `Ready to import: ${summary}; no problems found. ${
          parsed.data.replaceExisting
            ? `All ${configuration.overrides.length} existing dated entries will be replaced.`
            : "Entries for an existing date and prayer will be updated in place."
        } Type the confirmation phrase and choose Import to write it.`,
      };
    }

    if (formString(formData, "confirmation") !== "IMPORT TIMETABLE") {
      return {
        status: "error",
        message: "Type “IMPORT TIMETABLE” exactly to write this file into the draft.",
      };
    }

    const payload = report.entries.map((entry) => ({
      prayer_date: entry.date,
      prayer: entry.prayer,
      begins_at: entry.beginsAt,
      congregation_at: entry.congregationAt,
      unavailable: false,
      reason: `Imported committee timetable: ${parsed.data.sourceNote}`,
    })) as Json;
    const { data, error } = await context.supabase.rpc("import_prayer_overrides", {
      p_settings_id: parsed.data.settingsId,
      p_expected_version: parsed.data.expectedVersion,
      p_overrides: payload,
      p_replace_existing: parsed.data.replaceExisting,
    });
    if (error || !data?.[0]) prayerServiceError(error);
    revalidatePrayerSurfaces(parsed.data.settingsId);
    return {
      status: "success",
      message: `Imported ${summary} in one transaction. Review the preview and publish when the committee approves.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}

export async function deletePrayerOverrideAction(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      settingsId: z.uuid(),
      expectedVersion: z.coerce.number().int().positive(),
      id: z.uuid(),
    })
    .safeParse({
      settingsId: formString(formData, "settingsId"),
      expectedVersion: formString(formData, "expectedVersion"),
      id: formString(formData, "id"),
    });
  if (!parsed.success)
    throw new AdminAccessError("validation", "Reload before removing this override.");
  const context = await requirePermission("prayer:write", { requireAal2: true });
  const { error } = await context.supabase.rpc("delete_prayer_override", {
    p_settings_id: parsed.data.settingsId,
    p_expected_version: parsed.data.expectedVersion,
    p_override_id: parsed.data.id,
  });
  if (error) prayerServiceError(error);
  revalidatePrayerSurfaces(parsed.data.settingsId);
}

function seasonalCongregationRules(formData: FormData) {
  const rules: Partial<Record<(typeof congregationPrayerKeys)[number], CongregationRule>> = {};
  for (const prayer of congregationPrayerKeys) {
    const type = formString(formData, `seasonal_${prayer}_type`);
    if (!type || type === "inherit") continue;
    const candidate =
      type === "fixed"
        ? { type, time: formString(formData, `seasonal_${prayer}_time`) }
        : type === "offset"
          ? {
              type,
              minutes: Number(formString(formData, `seasonal_${prayer}_minutes`)),
              roundTo: Number(formString(formData, `seasonal_${prayer}_round_to`)),
              ...(formString(formData, `seasonal_${prayer}_latest`)
                ? { latest: formString(formData, `seasonal_${prayer}_latest`) }
                : {}),
            }
          : { type };
    const parsed = congregationRuleSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new AdminAccessError(
        "validation",
        `Check the ${prayer} congregation rule for this seasonal arrangement.`,
      );
    }
    rules[prayer] = parsed.data;
  }
  return rules;
}

export async function saveSeasonalArrangementAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = z
      .object({
        settingsId: z.uuid(),
        expectedVersion: z.coerce.number().int().positive(),
      })
      .safeParse({
        settingsId: formString(formData, "settingsId"),
        expectedVersion: formString(formData, "expectedVersion"),
      });
    if (!identity.success) return validationFailure(identity.error);
    const arrangement = seasonalArrangementSchema.safeParse({
      id: formString(formData, "id") || undefined,
      kind: formString(formData, "kind"),
      title: formString(formData, "title"),
      startsOn: formString(formData, "startsOn"),
      endsOn: formString(formData, "endsOn"),
      publicNote: formString(formData, "publicNote") || undefined,
      congregationRules: seasonalCongregationRules(formData),
    });
    if (!arrangement.success) return validationFailure(arrangement.error);

    const context = await requirePermission("prayer:write", { requireAal2: true });
    const { data, error } = await context.supabase.rpc("save_seasonal_arrangement", {
      p_settings_id: identity.data.settingsId,
      p_expected_version: identity.data.expectedVersion,
      p_payload: {
        ...(arrangement.data.id ? { id: arrangement.data.id } : {}),
        kind: arrangement.data.kind,
        title: arrangement.data.title,
        starts_on: arrangement.data.startsOn,
        ends_on: arrangement.data.endsOn,
        details: {
          public_note: arrangement.data.publicNote ?? "",
          congregation_rules: arrangement.data.congregationRules,
        },
      } as Json,
    });
    if (error || !data?.[0]) prayerServiceError(error);
    revalidatePrayerSurfaces(identity.data.settingsId);
    return {
      status: "success",
      message: `Seasonal arrangement saved. The draft is now version ${data[0].settings_version}.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}

export async function deleteSeasonalArrangementAction(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      settingsId: z.uuid(),
      expectedVersion: z.coerce.number().int().positive(),
      id: z.uuid(),
    })
    .safeParse({
      settingsId: formString(formData, "settingsId"),
      expectedVersion: formString(formData, "expectedVersion"),
      id: formString(formData, "id"),
    });
  if (!parsed.success)
    throw new AdminAccessError("validation", "Reload before removing this arrangement.");
  const context = await requirePermission("prayer:write", { requireAal2: true });
  const { error } = await context.supabase.rpc("delete_seasonal_arrangement", {
    p_settings_id: parsed.data.settingsId,
    p_expected_version: parsed.data.expectedVersion,
    p_arrangement_id: parsed.data.id,
  });
  if (error) prayerServiceError(error);
  revalidatePrayerSurfaces(parsed.data.settingsId);
}

const replacementSelectionSchema = z
  .string()
  .regex(/^[0-9a-f-]+:\d+$/i)
  .transform((value) => {
    const [id, version] = value.split(":");
    return { id, version: Number(version) };
  })
  .pipe(z.object({ id: z.uuid(), version: z.number().int().positive() }));

export async function withdrawPrayerSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = formIdentity(formData);
    if (!identity.success) return validationFailure(identity.error);
    const reason = formString(formData, "withdrawalReason");
    const confirmation = formString(formData, "withdrawalConfirmation");
    if (reason.length < 10 || reason.length > 1000) {
      return {
        status: "error",
        message: "Record the verified reason for withdrawal (10–1,000 characters).",
      };
    }
    if (confirmation !== "WITHDRAW PRAYER TIMES") {
      return {
        status: "error",
        message: "Type “WITHDRAW PRAYER TIMES” exactly to confirm this critical change.",
      };
    }

    const replacementValue = formString(formData, "replacement");
    const replacement = replacementValue
      ? replacementSelectionSchema.safeParse(replacementValue)
      : null;
    if (replacement && !replacement.success) {
      return { status: "error", message: "The selected replacement draft is no longer valid." };
    }
    const replacementApprovalNote = formString(formData, "replacementApprovalNote");
    if (
      replacement?.success &&
      (replacementApprovalNote.length < 10 || replacementApprovalNote.length > 1000)
    ) {
      return {
        status: "error",
        message: "Record the replacement approval evidence (10–1,000 characters).",
      };
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
        "This published timetable changed or has already been withdrawn. Reload before continuing.",
      );
    }

    if (replacement?.success) {
      if (replacement.data.id === current.id) {
        return { status: "error", message: "A timetable cannot replace itself." };
      }
      const storedReplacement = await getPrayerConfigurationForAdmin(
        context.supabase,
        replacement.data.id,
      );
      if (
        !storedReplacement ||
        storedReplacement.status !== "draft" ||
        storedReplacement.version !== replacement.data.version
      ) {
        throw new AdminAccessError(
          "conflict",
          "The replacement draft changed or is no longer publishable. Reload and review it again.",
        );
      }
      const candidate = prayerConfigurationSchema.parse({
        ...storedReplacement,
        status: "published",
        approvalNote: replacementApprovalNote,
        approvedBy: context.userId,
        publishedAt: new Date().toISOString(),
      });
      const horizon = publicationHorizon(candidate);
      if (!horizon.ok) return { status: "error", message: horizon.issue.message };
      const today = dateKeyInZone(new Date(), current.timezone);
      const requiredCoverageDate = current.effectiveFrom > today ? current.effectiveFrom : today;
      if (
        (!current.effectiveTo || requiredCoverageDate <= current.effectiveTo) &&
        (candidate.effectiveFrom > requiredCoverageDate ||
          !candidate.effectiveTo ||
          candidate.effectiveTo < requiredCoverageDate)
      ) {
        return {
          status: "error",
          message:
            "The replacement does not cover the next date served by the timetable being withdrawn.",
        };
      }
      const schedules = buildScheduleRange(candidate, horizon.firstDate, horizon.days);
      const errors = validateConfigurationSchedule(candidate, schedules).filter(
        (issue) => issue.severity === "error",
      );
      if (errors.length > 0) {
        return {
          status: "error",
          message: `Atomic replacement blocked by ${errors.length} timetable validation ${errors.length === 1 ? "error" : "errors"}. Correct the replacement draft first.`,
        };
      }
    }

    const replacementData = replacement?.success ? replacement.data : null;
    const service = createSupabaseServiceClient();
    const { data, error } = await service.rpc("withdraw_prayer_settings", {
      p_actor_id: context.userId,
      p_id: identity.data.id,
      p_expected_version: identity.data.expectedVersion,
      p_reason: reason,
      p_replacement_id: replacementData?.id ?? null,
      p_replacement_expected_version: replacementData?.version ?? null,
      p_replacement_approval_note: replacementData ? replacementApprovalNote : null,
    });
    if (error || !data?.[0]) prayerServiceError(error);
    revalidatePrayerSurfaces(identity.data.id);
    if (replacementData) revalidatePrayerSurfaces(replacementData.id);
    return {
      status: "success",
      message: replacementData
        ? "The previous timetable was withdrawn and its fully validated replacement was published atomically."
        : "The timetable was withdrawn. Public prayer surfaces now fail closed until an approved replacement is published.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}
