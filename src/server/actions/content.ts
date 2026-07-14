"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import { AdminAccessError, safeActionError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/session";
import {
  educationDocumentSchema,
  eventDocumentSchema,
  faqDocumentSchema,
  isPublishableContentKind,
  noticeDocumentSchema,
  policyDocumentSchema,
  safeContentLinkSchema,
  serviceDocumentSchema,
} from "@/lib/content/content-documents";
import { wallTimeToInstant } from "@/lib/prayer/timezone";
import type { ContentKind, ContentStatus, Json } from "@/types/database";

const contentKinds = [
  "page",
  "announcement",
  "emergency_notice",
  "event",
  "recurring_programme",
  "education",
  "service",
  "faq",
  "policy",
  "navigation",
  "social_link",
  "donation_appeal",
] as const;
const contentStatuses = ["draft", "scheduled", "published", "archived"] as const;

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(maximum).nullable(),
  );

const validDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const contentInputSchema = z
  .object({
    id: z.uuid().optional(),
    expectedVersion: z.coerce.number().int().positive().optional(),
    kind: z.enum(contentKinds),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
    title: z.string().trim().min(1).max(160),
    summary: optionalText(500),
    bodyText: z.string().trim().min(1, "Add the main content.").max(50_000),
    actionLabel: optionalText(80),
    actionUrl: optionalText(2_048),
    eventStartsAt: optionalText(32),
    eventEndsAt: optionalText(32),
    eventLocation: optionalText(300),
    eventUrl: optionalText(2_048),
    serviceAudience: optionalText(500),
    serviceAvailability: optionalText(500),
    serviceAccessInstructions: optionalText(500),
    serviceUrl: optionalText(2_048),
    educationAudience: optionalText(500),
    educationSchedule: optionalText(500),
    educationRegistrationUrl: optionalText(2_048),
    educationSafeguardingNote: optionalText(500),
    policyOwner: optionalText(160),
    policyEffectiveOn: optionalText(10),
    policyReviewOn: optionalText(10),
    category: optionalText(80),
    status: z.enum(contentStatuses),
    featured: z.boolean(),
    publishAt: z.string().trim().nullable(),
    expiresAt: z.string().trim().nullable(),
    emergencyConfirmation: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    const publicStatus = value.status === "scheduled" || value.status === "published";
    if (publicStatus && !isPublishableContentKind(value.kind)) {
      context.addIssue({
        code: "custom",
        path: ["kind"],
        message: "This legacy content type has no verified public page and cannot be published.",
      });
    }
    if (value.status === "scheduled" && !value.publishAt) {
      context.addIssue({
        code: "custom",
        path: ["publishAt"],
        message: "Choose when this should publish.",
      });
    }
    if (
      value.kind === "emergency_notice" &&
      (value.status === "scheduled" || value.status === "published") &&
      value.emergencyConfirmation !== "PUBLISH EMERGENCY"
    ) {
      context.addIssue({
        code: "custom",
        path: ["emergencyConfirmation"],
        message: "Type “PUBLISH EMERGENCY” to confirm this urgent public notice.",
      });
    }
    if ((value.actionLabel === null) !== (value.actionUrl === null)) {
      context.addIssue({
        code: "custom",
        path: [value.actionLabel === null ? "actionLabel" : "actionUrl"],
        message: "Add both the link label and address, or leave both empty.",
      });
    }
    for (const [field, link] of [
      ["actionUrl", value.actionUrl],
      ["eventUrl", value.eventUrl],
      ["serviceUrl", value.serviceUrl],
      ["educationRegistrationUrl", value.educationRegistrationUrl],
    ] as const) {
      if (link && !safeContentLinkSchema.safeParse(link).success) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Use a secure https:// address or a site path beginning with /.",
        });
      }
    }
    if (value.kind === "event") {
      if (publicStatus && !value.eventStartsAt) {
        context.addIssue({
          code: "custom",
          path: ["eventStartsAt"],
          message: "Add the event start date and time before publication.",
        });
      }
      if (publicStatus && !value.eventLocation) {
        context.addIssue({
          code: "custom",
          path: ["eventLocation"],
          message: "Add the approved event location before publication.",
        });
      }
      if (value.eventEndsAt && !value.eventStartsAt) {
        context.addIssue({
          code: "custom",
          path: ["eventStartsAt"],
          message: "Add a start time before adding an end time.",
        });
      }
    }
    if (value.kind === "policy") {
      if (publicStatus && !value.policyOwner) {
        context.addIssue({
          code: "custom",
          path: ["policyOwner"],
          message: "Add the formally approved policy owner before publication.",
        });
      }
      if (publicStatus && !value.policyEffectiveOn) {
        context.addIssue({
          code: "custom",
          path: ["policyEffectiveOn"],
          message: "Add the effective date before publication.",
        });
      }
      for (const [field, date] of [
        ["policyEffectiveOn", value.policyEffectiveOn],
        ["policyReviewOn", value.policyReviewOn],
      ] as const) {
        if (date && !validDateOnly(date)) {
          context.addIssue({ code: "custom", path: [field], message: "Use a real calendar date." });
        }
      }
      if (
        value.policyEffectiveOn &&
        value.policyReviewOn &&
        value.policyReviewOn < value.policyEffectiveOn
      ) {
        context.addIssue({
          code: "custom",
          path: ["policyReviewOn"],
          message: "The review date cannot be before the effective date.",
        });
      }
    }
  });

const revisionSnapshotSchema = z.object({
  kind: z.enum(contentKinds),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(160),
  summary: z.string().max(500).nullable(),
  body: z.unknown(),
  category: z.string().max(80).nullable(),
  featured: z.boolean(),
  publish_at: z.string().nullable(),
  expires_at: z.string().nullable(),
});

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function londonWallTimeToIso(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!match?.[1] || !match[2]) {
    throw new AdminAccessError("validation", "Use a valid publication date and time.");
  }
  let result;
  try {
    result = wallTimeToInstant(match[1], match[2], "Europe/London", "reject");
  } catch {
    throw new AdminAccessError("validation", "Use a real calendar date and time.");
  }
  if (!result.ok) {
    const explanation =
      result.reason === "ambiguous"
        ? "That clock time occurs twice when daylight saving changes. Choose a different time."
        : "That clock time does not exist because the clocks change. Choose a different time.";
    throw new AdminAccessError("validation", explanation);
  }
  return result.instant.toISOString();
}

function readContentInput(formData: FormData) {
  const raw = {
    id: formString(formData, "id") || undefined,
    expectedVersion: formString(formData, "expectedVersion") || undefined,
    kind: formString(formData, "kind"),
    slug: formString(formData, "slug"),
    title: formString(formData, "title"),
    summary: formString(formData, "summary"),
    bodyText: formString(formData, "bodyText"),
    actionLabel: formString(formData, "actionLabel"),
    actionUrl: formString(formData, "actionUrl"),
    eventStartsAt: formString(formData, "eventStartsAt"),
    eventEndsAt: formString(formData, "eventEndsAt"),
    eventLocation: formString(formData, "eventLocation"),
    eventUrl: formString(formData, "eventUrl"),
    serviceAudience: formString(formData, "serviceAudience"),
    serviceAvailability: formString(formData, "serviceAvailability"),
    serviceAccessInstructions: formString(formData, "serviceAccessInstructions"),
    serviceUrl: formString(formData, "serviceUrl"),
    educationAudience: formString(formData, "educationAudience"),
    educationSchedule: formString(formData, "educationSchedule"),
    educationRegistrationUrl: formString(formData, "educationRegistrationUrl"),
    educationSafeguardingNote: formString(formData, "educationSafeguardingNote"),
    policyOwner: formString(formData, "policyOwner"),
    policyEffectiveOn: formString(formData, "policyEffectiveOn"),
    policyReviewOn: formString(formData, "policyReviewOn"),
    category: formString(formData, "category"),
    status: formString(formData, "status"),
    featured: formData.get("featured") === "on",
    publishAt: formString(formData, "publishAt") || null,
    expiresAt: formString(formData, "expiresAt") || null,
    emergencyConfirmation: formString(formData, "emergencyConfirmation"),
  };
  return contentInputSchema.safeParse(raw);
}

function zodFailure(error: z.ZodError): ActionState {
  const flattened = z.flattenError(error);
  return {
    status: "error",
    message: "Check the highlighted fields. Nothing was saved.",
    fieldErrors: flattened.fieldErrors,
  };
}

type ContentInput = z.infer<typeof contentInputSchema>;

function parsedDocumentJson(schema: z.ZodType, value: unknown): Json {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AdminAccessError(
      "validation",
      "The structured content details are incomplete or inconsistent.",
    );
  }
  return parsed.data as Json;
}

function bodyDocument(input: ContentInput): Json {
  if (!isPublishableContentKind(input.kind)) {
    return { version: 1, format: "plain_text", text: input.bodyText };
  }

  switch (input.kind) {
    case "announcement":
    case "emergency_notice":
      return parsedDocumentJson(noticeDocumentSchema, {
        version: 2,
        format: "notice",
        text: input.bodyText,
        action_label: input.actionLabel,
        action_url: input.actionUrl,
      });
    case "event": {
      const startsAt = londonWallTimeToIso(input.eventStartsAt);
      const endsAt = londonWallTimeToIso(input.eventEndsAt);
      if (startsAt && endsAt && endsAt <= startsAt) {
        throw new AdminAccessError(
          "validation",
          "The event end time must be after its start time.",
        );
      }
      return parsedDocumentJson(eventDocumentSchema, {
        version: 2,
        format: "event",
        text: input.bodyText,
        starts_at: startsAt,
        ends_at: endsAt,
        location: input.eventLocation,
        event_url: input.eventUrl,
      });
    }
    case "service":
      return parsedDocumentJson(serviceDocumentSchema, {
        version: 2,
        format: "service",
        text: input.bodyText,
        audience: input.serviceAudience,
        availability: input.serviceAvailability,
        access_instructions: input.serviceAccessInstructions,
        service_url: input.serviceUrl,
      });
    case "education":
      return parsedDocumentJson(educationDocumentSchema, {
        version: 2,
        format: "education",
        text: input.bodyText,
        audience: input.educationAudience,
        schedule: input.educationSchedule,
        registration_url: input.educationRegistrationUrl,
        safeguarding_note: input.educationSafeguardingNote,
      });
    case "policy":
      return parsedDocumentJson(policyDocumentSchema, {
        version: 2,
        format: "policy",
        text: input.bodyText,
        owner: input.policyOwner,
        effective_on: input.policyEffectiveOn,
        review_on: input.policyReviewOn,
      });
    case "faq":
      return parsedDocumentJson(faqDocumentSchema, {
        version: 2,
        format: "faq",
        text: input.bodyText,
      });
  }
}

function publicationValues(status: ContentStatus, actorId: string, publishAt: string | null) {
  if (status === "published") {
    return { published_by: actorId, published_at: new Date().toISOString(), publish_at: publishAt };
  }
  return { published_by: null, published_at: null, publish_at: publishAt };
}

async function ensurePublicationPermission(status: ContentStatus): Promise<void> {
  if (status === "published" || status === "scheduled") {
    await requirePermission("content:publish", { requireAal2: true });
  }
}

function contentError(error: { code?: string; message?: string } | null): never {
  if (error?.code === "23505") {
    throw new AdminAccessError("conflict", "That slug is already used by another item.");
  }
  throw new AdminAccessError(
    "service",
    "The content service refused the change. Nothing was saved.",
  );
}

export async function createContentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = readContentInput(formData);
    if (!parsed.success) return zodFailure(parsed.error);
    if (!isPublishableContentKind(parsed.data.kind)) {
      throw new AdminAccessError(
        "validation",
        "New content must use a type that has a verified public destination.",
      );
    }
    const context = await requirePermission("content:write", { requireAal2: true });
    await ensurePublicationPermission(parsed.data.status);

    const publishAt = londonWallTimeToIso(parsed.data.publishAt);
    const expiresAt = londonWallTimeToIso(parsed.data.expiresAt);
    const now = new Date().toISOString();
    if (expiresAt && publishAt && expiresAt <= publishAt) {
      return { status: "error", message: "The expiry must be later than the publication time." };
    }
    if (parsed.data.status === "scheduled" && publishAt && publishAt <= now) {
      return { status: "error", message: "A scheduled item needs a future publication time." };
    }
    if (parsed.data.status === "published" && publishAt && publishAt > now) {
      return { status: "error", message: "Choose Scheduled for a future publication time." };
    }
    if (
      (parsed.data.status === "published" || parsed.data.status === "scheduled") &&
      expiresAt &&
      expiresAt <= now
    ) {
      return { status: "error", message: "A public item needs a future expiry time." };
    }

    const { error } = await context.supabase.from("content_items").insert({
      kind: parsed.data.kind,
      slug: parsed.data.slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      body: bodyDocument(parsed.data),
      category: parsed.data.category,
      status: parsed.data.status,
      featured: parsed.data.featured,
      expires_at: expiresAt,
      created_by: context.userId,
      updated_by: context.userId,
      ...publicationValues(parsed.data.status, context.userId, publishAt),
    });
    if (error) contentError(error);

    revalidatePath("/admin/content");
    revalidatePath("/", "layout");
    return { status: "success", message: "Content created successfully." };
  } catch (error) {
    return safeActionError(error);
  }
}

export async function updateContentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = readContentInput(formData);
    if (!parsed.success) return zodFailure(parsed.error);
    if (!parsed.data.id || !parsed.data.expectedVersion) {
      throw new AdminAccessError(
        "validation",
        "This edit is missing its version. Reload and try again.",
      );
    }
    const context = await requirePermission("content:write", { requireAal2: true });
    const { data: existing, error: existingError } = await context.supabase
      .from("content_items")
      .select("kind")
      .eq("id", parsed.data.id)
      .eq("version", parsed.data.expectedVersion)
      .is("deleted_at", null)
      .maybeSingle();
    if (existingError) contentError(existingError);
    if (!existing) {
      throw new AdminAccessError(
        "conflict",
        "Someone else changed this item first. Reload the page before applying your edit.",
      );
    }
    if (!isPublishableContentKind(parsed.data.kind) && parsed.data.kind !== existing.kind) {
      throw new AdminAccessError(
        "validation",
        "An item cannot be changed into a legacy content type with no public destination.",
      );
    }
    await ensurePublicationPermission(parsed.data.status);

    const publishAt = londonWallTimeToIso(parsed.data.publishAt);
    const expiresAt = londonWallTimeToIso(parsed.data.expiresAt);
    const now = new Date().toISOString();
    if (expiresAt && publishAt && expiresAt <= publishAt) {
      return { status: "error", message: "The expiry must be later than the publication time." };
    }
    if (parsed.data.status === "scheduled" && publishAt && publishAt <= now) {
      return { status: "error", message: "A scheduled item needs a future publication time." };
    }
    if (parsed.data.status === "published" && publishAt && publishAt > now) {
      return { status: "error", message: "Choose Scheduled for a future publication time." };
    }
    if (
      (parsed.data.status === "published" || parsed.data.status === "scheduled") &&
      expiresAt &&
      expiresAt <= now
    ) {
      return { status: "error", message: "A public item needs a future expiry time." };
    }

    const { data, error } = await context.supabase
      .from("content_items")
      .update({
        kind: parsed.data.kind,
        slug: parsed.data.slug,
        title: parsed.data.title,
        summary: parsed.data.summary,
        body: bodyDocument(parsed.data),
        category: parsed.data.category,
        status: parsed.data.status,
        featured: parsed.data.featured,
        expires_at: expiresAt,
        ...publicationValues(parsed.data.status, context.userId, publishAt),
      })
      .eq("id", parsed.data.id)
      .eq("version", parsed.data.expectedVersion)
      .is("deleted_at", null)
      .select("id, version")
      .maybeSingle();
    if (error) contentError(error);
    if (!data) {
      throw new AdminAccessError(
        "conflict",
        "Someone else changed this item first. Reload the page before applying your edit.",
      );
    }

    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${parsed.data.id}`);
    revalidatePath("/", "layout");
    return { status: "success", message: `Changes saved as version ${data.version}.` };
  } catch (error) {
    return safeActionError(error);
  }
}

const itemMutationSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

export async function softDeleteContentAction(formData: FormData): Promise<void> {
  const parsed = itemMutationSchema.safeParse({
    id: formString(formData, "id"),
    expectedVersion: formString(formData, "expectedVersion"),
  });
  if (!parsed.success)
    throw new AdminAccessError("validation", "Reload this item before archiving it.");
  const context = await requirePermission("content:write", { requireAal2: true });
  const { data, error } = await context.supabase
    .from("content_items")
    .update({ status: "archived", deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("version", parsed.data.expectedVersion)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) contentError(error);
  if (!data)
    throw new AdminAccessError("conflict", "This item changed. Reload before archiving it.");
  revalidatePath("/admin/content");
  revalidatePath("/", "layout");
}

const restoreSchema = itemMutationSchema.extend({ revisionId: z.coerce.number().int().positive() });

export async function restoreContentRevisionAction(formData: FormData): Promise<void> {
  const parsed = restoreSchema.safeParse({
    id: formString(formData, "id"),
    expectedVersion: formString(formData, "expectedVersion"),
    revisionId: formString(formData, "revisionId"),
  });
  if (!parsed.success)
    throw new AdminAccessError("validation", "Reload before restoring this revision.");
  const context = await requirePermission("content:write", { requireAal2: true });
  const { data: revision, error: revisionError } = await context.supabase
    .from("content_revisions")
    .select("snapshot")
    .eq("id", parsed.data.revisionId)
    .eq("content_item_id", parsed.data.id)
    .maybeSingle();
  if (revisionError || !revision) {
    throw new AdminAccessError("service", "That revision is no longer available.");
  }
  const snapshot = revisionSnapshotSchema.safeParse(revision.snapshot);
  if (!snapshot.success)
    throw new AdminAccessError("service", "That revision cannot be safely restored.");

  const { data, error } = await context.supabase
    .from("content_items")
    .update({
      kind: snapshot.data.kind as ContentKind,
      slug: snapshot.data.slug,
      title: snapshot.data.title,
      summary: snapshot.data.summary,
      body: snapshot.data.body as Json,
      category: snapshot.data.category,
      featured: snapshot.data.featured,
      publish_at: snapshot.data.publish_at,
      expires_at: snapshot.data.expires_at,
      status: "draft",
      published_at: null,
      published_by: null,
      deleted_at: null,
    })
    .eq("id", parsed.data.id)
    .eq("version", parsed.data.expectedVersion)
    .select("id")
    .maybeSingle();
  if (error) contentError(error);
  if (!data)
    throw new AdminAccessError("conflict", "This item changed. Reload before restoring it.");
  revalidatePath(`/admin/content/${parsed.data.id}`);
  revalidatePath("/admin/content");
}
