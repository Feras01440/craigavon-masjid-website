import { afterEach, describe, expect, it } from "vitest";

import { demoModeIsActive } from "@/lib/demo-mode";
import { PERMISSIONS, ROLE_LABELS, roleHasPermission } from "@/lib/permissions";
import { getSiteUrl, indexingIsApproved } from "@/lib/site-url";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalIndexing = process.env.NEXT_PUBLIC_INDEXING_ENABLED;
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  if (originalIndexing === undefined) delete process.env.NEXT_PUBLIC_INDEXING_ENABLED;
  else process.env.NEXT_PUBLIC_INDEXING_ENABLED = originalIndexing;
  if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  if (originalDemoMode === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
  else process.env.NEXT_PUBLIC_DEMO_MODE = originalDemoMode;
});

describe("local demonstration safety gate", () => {
  it("requires the flag and two explicit HTTP loopback origins", () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    expect(demoModeIsActive()).toBe(true);

    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.org";
    expect(demoModeIsActive()).toBe(false);
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    expect(demoModeIsActive()).toBe(false);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    expect(demoModeIsActive()).toBe(false);
  });
});

describe("committee role permissions", () => {
  it("gives the super administrator every declared permission", () => {
    expect(PERMISSIONS.every((permission) => roleHasPermission("super_admin", permission))).toBe(
      true,
    );
  });

  it("keeps specialist roles inside their intended boundaries", () => {
    expect(roleHasPermission("website_editor", "content:publish")).toBe(true);
    expect(roleHasPermission("website_editor", "users:manage")).toBe(false);
    expect(roleHasPermission("prayer_editor", "prayer:publish")).toBe(true);
    expect(roleHasPermission("prayer_editor", "media:write")).toBe(false);
    expect(roleHasPermission("enquiries_manager", "enquiries:write")).toBe(true);
    expect(roleHasPermission("enquiries_manager", "audit:read")).toBe(false);
    expect(roleHasPermission("reviewer", "audit:read")).toBe(true);
    expect(roleHasPermission("reviewer", "content:write")).toBe(false);
    expect(Object.keys(ROLE_LABELS)).toHaveLength(5);
  });
});

describe("canonical site URL and indexing release gate", () => {
  it("rejects missing, malformed and insecure non-local origins", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBeNull();
    process.env.NEXT_PUBLIC_SITE_URL = "not a URL";
    expect(getSiteUrl()).toBeNull();
    process.env.NEXT_PUBLIC_SITE_URL = "http://example.org/path";
    expect(getSiteUrl()).toBeNull();
  });

  it("canonicalises HTTPS and permits explicit localhost development", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.org/old?query=yes#fragment";
    expect(getSiteUrl()?.toString()).toBe("https://example.org/");
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000/path";
    expect(getSiteUrl()?.toString()).toBe("http://localhost:3000/");
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000/path";
    expect(getSiteUrl()?.toString()).toBe("http://127.0.0.1:3000/");
  });

  it("requires both an approved flag and a valid canonical origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.org";
    process.env.NEXT_PUBLIC_INDEXING_ENABLED = "false";
    expect(indexingIsApproved()).toBe(false);
    process.env.NEXT_PUBLIC_INDEXING_ENABLED = "true";
    expect(indexingIsApproved()).toBe(true);
    process.env.NEXT_PUBLIC_SITE_URL = "http://example.org";
    expect(indexingIsApproved()).toBe(false);
  });
});
