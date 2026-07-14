import sanitizeHtml from "sanitize-html";
import { z } from "zod";

const optionalContact = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(maximum).nullable(),
  );

export const publicEnquirySchema = z
  .object({
    kind: z.enum([
      "general",
      "visit",
      "new_muslim_support",
      "service",
      "volunteering",
      "class_interest",
    ]),
    name: z.string().trim().min(1, "Enter your name.").max(120),
    email: optionalContact(254).pipe(z.email("Enter a valid email address.").nullable()),
    phone: optionalContact(40),
    message: z.string().trim().min(10).max(2_000),
    privacyAccepted: z.literal(true, { error: "Confirm that you have read the privacy notice." }),
    website: z.string().max(0),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Provide an email address or phone number so the committee can reply.",
      });
    }
  });

export type PublicEnquiryInput = z.infer<typeof publicEnquirySchema>;

const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

export function sanitiseEnquiryText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  })
    .replace(unsafeControlCharacters, "")
    .replace(/\r\n?/gu, "\n")
    .normalize("NFC")
    .trim();
}

export function normalisePublicEnquiry(input: PublicEnquiryInput): PublicEnquiryInput {
  return {
    ...input,
    name: sanitiseEnquiryText(input.name),
    email: input.email?.toLowerCase() ?? null,
    phone: input.phone ? sanitiseEnquiryText(input.phone) : null,
    message: sanitiseEnquiryText(input.message),
  };
}

export const enquiryConfigurationSchema = z.object({
  privacy_notice_version: z.string().trim().min(1).max(40),
  retention_days: z.number().int().min(7).max(365),
  queue_owner_role: z.enum(["enquiries_manager", "super_admin"]),
  monitoring_schedule: z.string().trim().min(5).max(300),
  fallback_procedure: z.string().trim().min(10).max(500),
  route_tested_at: z.iso.datetime({ offset: true }),
  notification_mode: z.literal("admin_queue"),
});

export function enquiryRouteWasTestedRecently(value: string, now = Date.now()): boolean {
  const testedAt = Date.parse(value);
  return (
    Number.isFinite(testedAt) &&
    testedAt <= now + 5 * 60_000 &&
    testedAt >= now - 90 * 24 * 60 * 60_000
  );
}
