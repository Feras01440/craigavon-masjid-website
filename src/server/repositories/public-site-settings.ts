import "server-only";

import { cache } from "react";

import { MASJID_NAME, primaryNavigation, SITE_NAME } from "@/content/public-copy";
import { demoModeIsActive } from "@/lib/demo-mode";
import {
  contactInformationSchema,
  homepageContentSchema,
  managedSettingDefaults,
  navigationFooterSchema,
  siteIdentitySchema,
  tvDisplaySchema,
  type ContactInformationSetting,
  type HomepageContentSetting,
  type TvDisplaySetting,
} from "@/lib/settings/site-settings";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type { ContactInformationSetting } from "@/lib/settings/site-settings";

export type PublicNavigationItem = { href: string; label: string };
export type PublicSiteChrome = {
  siteName: string;
  masjidName: string;
  primaryNavigation: PublicNavigationItem[];
  footerNavigation: PublicNavigationItem[];
  footerNote: string;
  footerLegalNote: string;
  contact: ContactInformationSetting | null;
};

const routeDetails: Record<string, PublicNavigationItem> = {
  ...Object.fromEntries(
    primaryNavigation.map((item) => [item.href.slice(1), { href: item.href, label: item.label }]),
  ),
  policies: { href: "/policies", label: "Policies" },
  accessibility: { href: "/accessibility", label: "Accessibility" },
  // Retired routes now redirect; published settings that still reference them
  // resolve to the destination instead of a dead link.
  visit: { href: "/contact", label: "Contact" },
  "new-muslims": { href: "/services", label: "Services" },
};
const fallbackFooter = [
  "prayer-times",
  "about",
  "services",
  "education",
  "news",
  "policies",
  "accessibility",
  "contact",
];

async function readPublishedSettings(): Promise<Map<string, unknown>> {
  try {
    const client = createSupabaseServiceClient({
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: 60, tags: ["public-site-settings"] } }),
    });
    let query = client
      .from("site_settings")
      .select("key,value")
      .in("key", [
        "site_identity",
        "homepage_content",
        "contact_information",
        "navigation_footer",
        "tv_display",
      ])
      .eq("status", "published");
    if (!demoModeIsActive()) query = query.eq("demo_local_only", false);
    const { data, error } = await query;
    if (error) return new Map();
    return new Map((data ?? []).map((row) => [row.key, row.value]));
  } catch {
    return new Map();
  }
}

const readPublishedSettingsOnce = cache(readPublishedSettings);

function navigation(keys: readonly string[], fallback: readonly string[]): PublicNavigationItem[] {
  const resolve = (source: readonly string[]) => {
    const seen = new Set<string>();
    return source
      .map((key) => routeDetails[key])
      .filter((item): item is PublicNavigationItem => {
        if (!item || seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      });
  };
  const selected = resolve(keys);
  return selected.length > 0 ? selected : resolve(fallback);
}

export const getPublicSiteChrome = cache(async (): Promise<PublicSiteChrome> => {
  const values = await readPublishedSettingsOnce();
  const identity = siteIdentitySchema.safeParse(values.get("site_identity"));
  const nav = navigationFooterSchema.safeParse(values.get("navigation_footer"));
  const contact = contactInformationSchema.safeParse(values.get("contact_information"));
  return {
    siteName:
      identity.success && identity.data.official_name ? identity.data.official_name : SITE_NAME,
    masjidName:
      identity.success && identity.data.public_masjid_name
        ? identity.data.public_masjid_name
        : MASJID_NAME,
    primaryNavigation: navigation(
      nav.success ? nav.data.primary_navigation : [],
      primaryNavigation.map((item) => item.href.slice(1)),
    ),
    footerNavigation: navigation(nav.success ? nav.data.footer_navigation : [], fallbackFooter),
    footerNote: nav.success && nav.data.footer_note ? nav.data.footer_note : "",
    footerLegalNote: nav.success ? nav.data.footer_legal_note : "",
    contact: contact.success ? contact.data : null,
  };
});

export const getPublicContactInformation = cache(
  async (): Promise<ContactInformationSetting | null> => {
    const values = await readPublishedSettingsOnce();
    const parsed = contactInformationSchema.safeParse(values.get("contact_information"));
    return parsed.success ? parsed.data : null;
  },
);

export const getPublicHomepageContent = cache(async (): Promise<HomepageContentSetting> => {
  const values = await readPublishedSettingsOnce();
  const parsed = homepageContentSchema.safeParse(values.get("homepage_content"));
  return parsed.success ? parsed.data : { ...managedSettingDefaults.homepage_content };
});

export const getPublicTvDisplaySetting = cache(async (): Promise<TvDisplaySetting> => {
  const values = await readPublishedSettingsOnce();
  const parsed = tvDisplaySchema.safeParse(values.get("tv_display"));
  return parsed.success ? parsed.data : { ...managedSettingDefaults.tv_display };
});
