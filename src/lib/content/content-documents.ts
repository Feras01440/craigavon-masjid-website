import { z } from "zod";

import type { ContentKind, Json } from "@/types/database";

export const publishableContentKinds = [
  "announcement",
  "emergency_notice",
  "event",
  "recurring_programme",
  "education",
  "service",
  "faq",
  "policy",
] as const satisfies readonly ContentKind[];

export type PublishableContentKind = (typeof publishableContentKinds)[number];

const publishableKindSet = new Set<ContentKind>(publishableContentKinds);

export function isPublishableContentKind(kind: ContentKind): kind is PublishableContentKind {
  return publishableKindSet.has(kind);
}

const textSchema = z.string().trim().min(1).max(50_000);
const optionalDetailSchema = z.string().trim().min(1).max(500).nullable();

export const safeContentLinkSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => {
    if (value.startsWith("/") && !value.startsWith("//")) {
      return !/[\u0000-\u001f\u007f\\]/u.test(value);
    }
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a secure https:// address or a site path beginning with /.");

const optionalLinkSchema = safeContentLinkSchema.nullable();

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Use a real calendar date.");

export const plainTextDocumentSchema = z
  .object({
    version: z.literal(1),
    format: z.literal("plain_text"),
    text: textSchema,
  })
  .strict();

export const noticeDocumentSchema = z
  .object({
    version: z.literal(2),
    format: z.literal("notice"),
    text: textSchema,
    action_label: z.string().trim().min(1).max(80).nullable(),
    action_url: optionalLinkSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.action_label === null) !== (value.action_url === null)) {
      context.addIssue({
        code: "custom",
        path: value.action_label === null ? ["action_label"] : ["action_url"],
        message: "Add both the link label and address, or leave both empty.",
      });
    }
  });

export const eventDocumentSchema = z
  .object({
    version: z.literal(2),
    format: z.literal("event"),
    text: textSchema,
    starts_at: z.iso.datetime({ offset: true }).nullable(),
    ends_at: z.iso.datetime({ offset: true }).nullable(),
    location: z.string().trim().min(1).max(300).nullable(),
    event_url: optionalLinkSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.ends_at && !value.starts_at) {
      context.addIssue({
        code: "custom",
        path: ["starts_at"],
        message: "Add a start time before adding an end time.",
      });
    }
    if (value.starts_at && value.ends_at && value.ends_at <= value.starts_at) {
      context.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "The end time must be later than the start time.",
      });
    }
  });

export const serviceDocumentSchema = z
  .object({
    version: z.literal(2),
    format: z.literal("service"),
    text: textSchema,
    audience: optionalDetailSchema,
    availability: optionalDetailSchema,
    access_instructions: optionalDetailSchema,
    service_url: optionalLinkSchema,
  })
  .strict();

export const educationDocumentSchema = z
  .object({
    version: z.literal(2),
    format: z.literal("education"),
    text: textSchema,
    audience: optionalDetailSchema,
    schedule: optionalDetailSchema,
    registration_url: optionalLinkSchema,
    safeguarding_note: optionalDetailSchema,
  })
  .strict();

export const policyDocumentSchema = z
  .object({
    version: z.literal(2),
    format: z.literal("policy"),
    text: textSchema,
    owner: z.string().trim().min(1).max(160).nullable(),
    effective_on: dateOnlySchema.nullable(),
    review_on: dateOnlySchema.nullable(),
    download_url: optionalLinkSchema.default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.effective_on && value.review_on && value.review_on < value.effective_on) {
      context.addIssue({
        code: "custom",
        path: ["review_on"],
        message: "The review date cannot be before the effective date.",
      });
    }
  });

export const faqDocumentSchema = z
  .object({
    version: z.literal(2),
    format: z.literal("faq"),
    text: textSchema,
  })
  .strict();

export const contentDocumentSchema = z.discriminatedUnion("format", [
  plainTextDocumentSchema,
  noticeDocumentSchema,
  eventDocumentSchema,
  serviceDocumentSchema,
  educationDocumentSchema,
  policyDocumentSchema,
  faqDocumentSchema,
]);

export type ContentDocument = z.infer<typeof contentDocumentSchema>;

const structuredFormatForKind: Record<PublishableContentKind, ContentDocument["format"]> = {
  announcement: "notice",
  emergency_notice: "notice",
  event: "event",
  recurring_programme: "education",
  service: "service",
  education: "education",
  policy: "policy",
  faq: "faq",
};

export function contentDocumentIsCompatible(
  kind: PublishableContentKind,
  document: ContentDocument,
): boolean {
  return document.format === "plain_text" || document.format === structuredFormatForKind[kind];
}

export function contentDocumentText(value: Json): string {
  const parsed = contentDocumentSchema.safeParse(value);
  if (parsed.success) return parsed.data.text;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const text = value.text;
    if (typeof text === "string") return text;
  }
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
