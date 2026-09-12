import { z } from "zod";

import type { ContentStatus, Json } from "@/types/database";

export const managedSettingKeys = [
  "site_identity",
  "homepage_content",
  "contact_information",
  "navigation_footer",
  "tv_display",
  "feature_flags",
  "enquiry_configuration",
] as const;

export type ManagedSettingKey = (typeof managedSettingKeys)[number];
export type ManagedSettingStatus = Extract<ContentStatus, "draft" | "published" | "archived">;

export const managedRouteKeys = [
  "prayer-times",
  "visit",
  "services",
  "education",
  "news",
  "new-muslims",
  "about",
  "contact",
  "policies",
  "accessibility",
] as const;

export type ManagedRouteKey = (typeof managedRouteKeys)[number];

const emptyText = (maximum: number) => z.string().trim().max(maximum);
const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email address.").max(254)]);
const optionalHttpsUrl = z.union([
  z.literal(""),
  z
    .url("Enter a complete web address.")
    .max(500)
    .refine((value) => value.startsWith("https://"), "Use a secure https:// address."),
]);

export const siteIdentitySchema = z
  .object({
    official_name: emptyText(160),
    public_masjid_name: emptyText(160),
    short_name: emptyText(60),
    default_meta_description: emptyText(300),
  })
  .strict();

export const contactInformationSchema = z
  .object({
    address_line_1: emptyText(160),
    address_line_2: emptyText(160),
    locality: emptyText(120),
    county: emptyText(120),
    postcode: emptyText(20),
    public_email: optionalEmail,
    public_phone: emptyText(40),
    public_whatsapp: emptyText(40),
    map_url: optionalHttpsUrl,
    directions: emptyText(1_000),
    access_information: emptyText(1_000),
    parking_information: emptyText(1_000),
    public_transport_information: emptyText(1_000),
  })
  .strict();

const routeKeySchema = z.enum(managedRouteKeys);

export const homepageContentSchema = z
  .object({
    eyebrow: emptyText(80),
    heading: emptyText(160),
    introduction: emptyText(600),
    primary_cta_label: emptyText(80),
    primary_cta_route: z.union([z.literal(""), routeKeySchema]),
    secondary_cta_label: emptyText(80),
    secondary_cta_route: z.union([z.literal(""), routeKeySchema]),
    information_heading: emptyText(160),
    information_points: z.array(emptyText(180)).max(3),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [labelField, routeField] of [
      ["primary_cta_label", "primary_cta_route"],
      ["secondary_cta_label", "secondary_cta_route"],
    ] as const) {
      if (!!value[labelField] !== !!value[routeField]) {
        context.addIssue({
          code: "custom",
          path: [value[labelField] ? routeField : labelField],
          message: "Add both the link label and destination, or leave both blank.",
        });
      }
    }
  });

export const navigationFooterSchema = z
  .object({
    primary_navigation: z.array(routeKeySchema).max(managedRouteKeys.length),
    footer_navigation: z.array(routeKeySchema).max(managedRouteKeys.length),
    footer_note: emptyText(500),
    footer_legal_note: emptyText(500),
  })
  .strict();

export const tvDisplaySchema = z
  .object({
    refresh_seconds: z.number().int().min(30).max(300),
    notice_rotation_seconds: z.number().int().min(10).max(120),
    prayer_hold_minutes: z.number().int().min(5).max(30),
    show_hijri_date: z.boolean(),
    show_notices: z.boolean(),
    footer_message: emptyText(240),
  })
  .strict();

export const featureFlagsSchema = z
  .object({
    public_enquiries: z.boolean(),
    donations: z.boolean(),
    education_registration: z.boolean(),
    event_registration: z.boolean(),
    analytics: z.boolean(),
  })
  .strict();

export const managedEnquiryConfigurationSchema = z
  .object({
    privacy_notice_version: emptyText(40),
    retention_days: z.number().int().min(7).max(365).nullable(),
    queue_owner_role: z.union([z.literal(""), z.enum(["enquiries_manager", "super_admin"])]),
    monitoring_schedule: emptyText(300),
    fallback_procedure: emptyText(500),
    route_tested_at: z.union([z.literal(""), z.iso.datetime({ offset: true })]),
    notification_mode: z.literal("admin_queue"),
  })
  .strict();

export type SiteIdentitySetting = z.infer<typeof siteIdentitySchema>;
export type HomepageContentSetting = z.infer<typeof homepageContentSchema>;
export type ContactInformationSetting = z.infer<typeof contactInformationSchema>;
export type NavigationFooterSetting = z.infer<typeof navigationFooterSchema>;
export type TvDisplaySetting = z.infer<typeof tvDisplaySchema>;
export type FeatureFlagsSetting = z.infer<typeof featureFlagsSchema>;
export type EnquiryConfigurationSetting = z.infer<typeof managedEnquiryConfigurationSchema>;

export type ManagedSettingValueMap = {
  site_identity: SiteIdentitySetting;
  homepage_content: HomepageContentSetting;
  contact_information: ContactInformationSetting;
  navigation_footer: NavigationFooterSetting;
  tv_display: TvDisplaySetting;
  feature_flags: FeatureFlagsSetting;
  enquiry_configuration: EnquiryConfigurationSetting;
};

export type ManagedSettingValue = ManagedSettingValueMap[ManagedSettingKey];

export const managedSettingDefaults: ManagedSettingValueMap = {
  site_identity: {
    official_name: "Muslim Association of Craigavon",
    public_masjid_name: "Craigavon Masjid",
    short_name: "Craigavon Masjid",
    default_meta_description:
      "Craigavon Masjid — prayer times, Jumuʿah, education and community life with the Muslim Association of Craigavon, County Armagh. All are welcome.",
  },
  homepage_content: {
    eyebrow: "As-salāmu ʿalaykum",
    heading: "Craigavon Masjid",
    introduction: "",
    primary_cta_label: "View prayer times",
    primary_cta_route: "prayer-times",
    secondary_cta_label: "",
    secondary_cta_route: "",
    information_heading: "",
    information_points: [],
  },
  /* Prefill for the committee's contact form; the public site serves these
     only after the committee reviews and publishes the setting. */
  contact_information: {
    address_line_1: "16 Legahory Centre",
    address_line_2: "",
    locality: "Craigavon",
    county: "County Armagh",
    postcode: "BT65 5BE",
    public_email: "abuzid@gmail.com",
    public_phone: "+44 7400 088823",
    public_whatsapp: "+44 7400 088823",
    map_url:
      "https://www.google.com/maps/search/?api=1&query=Craigavon%20Masjid%2C%2016%20Legahory%20Centre%2C%20Craigavon%20BT65%205BE",
    directions:
      "The Legahory Centre is in the Brownlow area of central Craigavon, roughly midway between Portadown and Lurgan — about ten minutes by car from either town, and about thirty minutes from Belfast via the M1.",
    access_information: "Step-free access to the prayer hall; a women's prayer space is available.",
    parking_information: "Free parking is available at the Legahory Centre.",
    public_transport_information: "",
  },
  navigation_footer: {
    primary_navigation: ["prayer-times", "about", "services", "education", "news", "contact"],
    footer_navigation: [
      "prayer-times",
      "about",
      "services",
      "education",
      "news",
      "policies",
      "accessibility",
      "contact",
    ],
    footer_note: "",
    footer_legal_note: "",
  },
  tv_display: {
    refresh_seconds: 60,
    notice_rotation_seconds: 15,
    prayer_hold_minutes: 10,
    show_hijri_date: true,
    show_notices: true,
    footer_message: "",
  },
  feature_flags: {
    public_enquiries: false,
    donations: false,
    education_registration: false,
    event_registration: false,
    analytics: false,
  },
  enquiry_configuration: {
    privacy_notice_version: "",
    retention_days: null,
    queue_owner_role: "",
    monitoring_schedule: "",
    fallback_procedure: "",
    route_tested_at: "",
    notification_mode: "admin_queue",
  },
};

export const managedSettingDetails: Record<
  ManagedSettingKey,
  { title: string; eyebrow: string; description: string }
> = {
  site_identity: {
    title: "Website identity",
    eyebrow: "Public naming",
    description:
      "Record only names and search text that the Association has confirmed for public use.",
  },
  homepage_content: {
    title: "Homepage content",
    eyebrow: "Main public page",
    description:
      "Maintain the homepage heading, introduction, links and short information panel without a code change.",
  },
  contact_information: {
    title: "Contact and visit details",
    eyebrow: "Verified public information",
    description:
      "Keep unconfirmed addresses, contact channels and access details blank until the committee verifies them.",
  },
  navigation_footer: {
    title: "Navigation and footer",
    eyebrow: "Website structure",
    description:
      "Choose from controlled website routes and maintain concise footer information without changing the page layout.",
  },
  tv_display: {
    title: "TV display",
    eyebrow: "Operational presentation",
    description: "Set safe refresh and rotation intervals for the dedicated mosque display.",
  },
  feature_flags: {
    title: "Feature toggles",
    eyebrow: "Release controls",
    description:
      "Keep unapproved or incomplete public features switched off. A toggle does not replace the required policy or content approval.",
  },
  enquiry_configuration: {
    title: "Public enquiry controls",
    eyebrow: "Privacy and retention",
    description:
      "Configure the privacy notice version and approved retention period before enabling the public enquiry form.",
  },
};

type ManagedSettingParseResult =
  { success: true; data: ManagedSettingValue } | { success: false; error: z.ZodError };

function publicationSchema(key: ManagedSettingKey, status: ManagedSettingStatus): z.ZodType {
  const isPublished = status === "published";
  switch (key) {
    case "site_identity":
      return siteIdentitySchema.superRefine((value, context) => {
        if (!isPublished) return;
        if (!value.official_name) {
          context.addIssue({
            code: "custom",
            path: ["official_name"],
            message: "Confirm the official organisation name before publishing.",
          });
        }
        if (!value.public_masjid_name) {
          context.addIssue({
            code: "custom",
            path: ["public_masjid_name"],
            message: "Confirm the public-facing masjid name before publishing.",
          });
        }
      });
    case "homepage_content":
      return homepageContentSchema.superRefine((value, context) => {
        if (!isPublished) return;
        if (!value.heading) {
          context.addIssue({
            code: "custom",
            path: ["heading"],
            message: "Add the public homepage heading before publishing.",
          });
        }
        // The introduction is optional: the hero renders nothing when the
        // committee prefers the masjid name to stand alone.
      });
    case "contact_information":
      return contactInformationSchema.superRefine((value, context) => {
        if (
          isPublished &&
          !value.address_line_1 &&
          !value.public_email &&
          !value.public_phone &&
          !value.public_whatsapp
        ) {
          context.addIssue({
            code: "custom",
            path: ["public_email"],
            message: "Add at least one verified address or contact channel before publishing.",
          });
        }
      });
    case "navigation_footer":
      return navigationFooterSchema;
    case "tv_display":
      return tvDisplaySchema;
    case "feature_flags":
      return featureFlagsSchema;
    case "enquiry_configuration":
      return managedEnquiryConfigurationSchema.superRefine((value, context) => {
        if (!isPublished) return;
        if (!value.privacy_notice_version) {
          context.addIssue({
            code: "custom",
            path: ["privacy_notice_version"],
            message: "Record the adopted privacy notice version before publishing.",
          });
        }
        if (value.retention_days === null) {
          context.addIssue({
            code: "custom",
            path: ["retention_days"],
            message: "Record the committee-approved retention period before publishing.",
          });
        }
        if (!value.queue_owner_role) {
          context.addIssue({
            code: "custom",
            path: ["queue_owner_role"],
            message: "Choose the role responsible for monitoring the enquiry queue.",
          });
        }
        if (value.monitoring_schedule.length < 5) {
          context.addIssue({
            code: "custom",
            path: ["monitoring_schedule"],
            message: "Record the approved queue-monitoring schedule.",
          });
        }
        if (value.fallback_procedure.length < 10) {
          context.addIssue({
            code: "custom",
            path: ["fallback_procedure"],
            message: "Record what staff should do when the normal queue cannot be monitored.",
          });
        }
        if (!value.route_tested_at) {
          context.addIssue({
            code: "custom",
            path: ["route_tested_at"],
            message: "Record when the administrative enquiry route was last tested.",
          });
        }
      });
  }
}

export function validateManagedSettingValue(
  key: ManagedSettingKey,
  value: unknown,
  status: ManagedSettingStatus = "draft",
): ManagedSettingParseResult {
  const result = publicationSchema(key, status).safeParse(value);
  return result.success
    ? { success: true, data: result.data as ManagedSettingValue }
    : { success: false, error: result.error };
}

export function managedSettingValueAsJson(value: ManagedSettingValue): Json {
  return value as Json;
}
