"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import { AdminAccessError, safeActionError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/session";

const enquiryUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "in_progress", "awaiting_response", "closed", "deleted"]),
  assignedTo: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
});

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateEnquiryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = enquiryUpdateSchema.safeParse({
      id: textField(formData, "id"),
      status: textField(formData, "status"),
      assignedTo: textField(formData, "assignedTo"),
    });
    if (!parsed.success) return { status: "error", message: "Choose a valid status and assignee." };

    const context = await requirePermission("enquiries:write", { requireAal2: true });
    const mutation =
      parsed.data.status === "deleted"
        ? context.supabase.from("enquiries").delete().eq("id", parsed.data.id)
        : context.supabase
            .from("enquiries")
            .update({
              status: parsed.data.status,
              assigned_to: parsed.data.assignedTo,
              closed_at: parsed.data.status === "closed" ? new Date().toISOString() : null,
              deleted_at: null,
            })
            .eq("id", parsed.data.id);
    const { data, error } = await mutation.select("id").maybeSingle();
    if (error || !data) throw new AdminAccessError("service", "The enquiry could not be updated.");

    revalidatePath("/admin/enquiries");
    revalidatePath("/admin");
    return { status: "success", message: "Enquiry updated." };
  } catch (error) {
    return safeActionError(error);
  }
}
