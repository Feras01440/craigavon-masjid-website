import { describe, expect, it } from "vitest";

import {
  managedSettingDefaults,
  managedSettingValueAsJson,
  validateManagedSettingValue,
} from "@/lib/settings/site-settings";

describe("managed site setting validation", () => {
  it("allows incomplete identity details to remain a private draft", () => {
    expect(
      validateManagedSettingValue("site_identity", managedSettingDefaults.site_identity, "draft")
        .success,
    ).toBe(true);
  });

  it("prevents publishing identity details before both public names are confirmed", () => {
    const result = validateManagedSettingValue(
      "site_identity",
      managedSettingDefaults.site_identity,
      "published",
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["official_name", "public_masjid_name"]),
      );
    }
  });

  it("validates complete homepage copy and paired calls to action", () => {
    expect(
      validateManagedSettingValue(
        "homepage_content",
        managedSettingDefaults.homepage_content,
        "published",
      ).success,
    ).toBe(true);

    const missingRoute = validateManagedSettingValue(
      "homepage_content",
      {
        ...managedSettingDefaults.homepage_content,
        primary_cta_route: "",
      },
      "draft",
    );
    expect(missingRoute.success).toBe(false);
    if (!missingRoute.success) {
      expect(missingRoute.error.issues[0]?.path).toEqual(["primary_cta_route"]);
    }

    const missingLabelAndCopy = validateManagedSettingValue(
      "homepage_content",
      {
        ...managedSettingDefaults.homepage_content,
        heading: "",
        introduction: "",
        secondary_cta_label: "",
      },
      "published",
    );
    expect(missingLabelAndCopy.success).toBe(false);
    if (!missingLabelAndCopy.success) {
      expect(missingLabelAndCopy.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["heading", "introduction", "secondary_cta_label"]),
      );
    }
  });

  it("requires secure map links", () => {
    const result = validateManagedSettingValue(
      "contact_information",
      {
        ...managedSettingDefaults.contact_information,
        map_url: "http://example.org/map",
      },
      "draft",
    );
    expect(result.success).toBe(false);
  });

  it("publishes contact details only with a verified public route", () => {
    expect(
      validateManagedSettingValue(
        "contact_information",
        managedSettingDefaults.contact_information,
        "published",
      ).success,
    ).toBe(false);
    const approved = {
      ...managedSettingDefaults.contact_information,
      public_email: "info@example.org",
      map_url: "https://example.org/map",
    };
    const result = validateManagedSettingValue("contact_information", approved, "published");
    expect(result.success).toBe(true);
    if (result.success) expect(managedSettingValueAsJson(result.data)).toEqual(approved);
  });

  it("accepts confirmed identity while rejecting a partially confirmed publication", () => {
    expect(
      validateManagedSettingValue(
        "site_identity",
        {
          ...managedSettingDefaults.site_identity,
          official_name: "Muslim Association of Craigavon",
        },
        "published",
      ).success,
    ).toBe(false);
    expect(
      validateManagedSettingValue(
        "site_identity",
        {
          ...managedSettingDefaults.site_identity,
          official_name: "Muslim Association of Craigavon",
          public_masjid_name: "Craigavon Masjid",
        },
        "published",
      ).success,
    ).toBe(true);
  });

  it("rejects navigation destinations outside the controlled route list", () => {
    const result = validateManagedSettingValue(
      "navigation_footer",
      {
        ...managedSettingDefaults.navigation_footer,
        primary_navigation: ["https://unapproved.example"],
      },
      "draft",
    );
    expect(result.success).toBe(false);
  });

  it("enforces bounded TV display intervals", () => {
    const result = validateManagedSettingValue(
      "tv_display",
      { ...managedSettingDefaults.tv_display, refresh_seconds: 5 },
      "draft",
    );
    expect(result.success).toBe(false);
  });

  it("requires an approved and tested enquiry operating route before publication", () => {
    const incomplete = validateManagedSettingValue(
      "enquiry_configuration",
      managedSettingDefaults.enquiry_configuration,
      "published",
    );
    expect(incomplete.success).toBe(false);

    const complete = validateManagedSettingValue(
      "enquiry_configuration",
      {
        privacy_notice_version: "2026-07",
        retention_days: 90,
        queue_owner_role: "enquiries_manager",
        monitoring_schedule: "Checked by the responsible role every working day.",
        fallback_procedure: "A super administrator checks the secure queue during planned cover.",
        route_tested_at: "2026-07-13T12:00:00.000Z",
        notification_mode: "admin_queue",
      },
      "published",
    );
    expect(complete.success).toBe(true);
  });

  it("does not accept undeclared fields that could silently become public configuration", () => {
    const result = validateManagedSettingValue(
      "feature_flags",
      { ...managedSettingDefaults.feature_flags, unknown_feature: true },
      "draft",
    );
    expect(result.success).toBe(false);
  });
});
