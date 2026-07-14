import { describe, expect, it } from "vitest";

import {
  enquiryConfigurationSchema,
  enquiryRouteWasTestedRecently,
  normalisePublicEnquiry,
  publicEnquirySchema,
  sanitiseEnquiryText,
} from "@/lib/enquiries/public-enquiry";

const validInput = {
  kind: "general" as const,
  name: " A Visitor ",
  email: "VISITOR@EXAMPLE.ORG",
  phone: "",
  message: "Please send the approved information.",
  privacyAccepted: true as const,
  website: "",
};

describe("public enquiry validation and minimisation", () => {
  it("accepts either reply route and converts blank optional contacts to null", () => {
    const withEmail = publicEnquirySchema.parse(validInput);
    const withPhone = publicEnquirySchema.parse({
      ...validInput,
      email: "  ",
      phone: " 028 0000 0000 ",
    });

    expect(withEmail).toMatchObject({ name: "A Visitor", phone: null });
    expect(withPhone).toMatchObject({ email: null, phone: "028 0000 0000" });
  });

  it.each([
    [{ ...validInput, email: "", phone: "" }, "email"],
    [{ ...validInput, email: "not-an-address" }, "email"],
    [{ ...validInput, privacyAccepted: false }, "privacyAccepted"],
    [{ ...validInput, website: "bot-filled" }, "website"],
    [{ ...validInput, message: "Too short" }, "message"],
  ])("rejects invalid or abusive input without accepting it", (input, field) => {
    const result = publicEnquirySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });

  it("removes active markup, controls and normalises human text", () => {
    expect(
      sanitiseEnquiryText(
        "  Cafe\u0301\r\n<script>doBadThing()</script><strong>Visible</strong>\u202e  ",
      ),
    ).toBe("Café\nVisible");
  });

  it("normalises stored contact text without changing the validated intent", () => {
    const parsed = publicEnquirySchema.parse({
      ...validInput,
      name: "<b>A Visitor</b>",
      phone: "<i>028 0000 0000</i>",
      message: "<p>Please reply with the checked details.</p>",
    });
    expect(normalisePublicEnquiry(parsed)).toMatchObject({
      name: "A Visitor",
      email: "visitor@example.org",
      phone: "028 0000 0000",
      message: "Please reply with the checked details.",
    });

    const emailOnly = publicEnquirySchema.parse(validInput);
    expect(normalisePublicEnquiry(emailOnly).phone).toBeNull();
  });

  it("requires a bounded, staffed enquiry operating configuration", () => {
    const valid = {
      privacy_notice_version: "2026-07",
      retention_days: 90,
      queue_owner_role: "enquiries_manager",
      monitoring_schedule: "Checked every working day.",
      fallback_procedure: "A super administrator covers planned absence.",
      route_tested_at: "2026-07-13T12:00:00.000Z",
      notification_mode: "admin_queue",
    };
    expect(enquiryConfigurationSchema.safeParse(valid).success).toBe(true);
    expect(enquiryConfigurationSchema.safeParse({ ...valid, retention_days: 6 }).success).toBe(
      false,
    );
    expect(
      enquiryConfigurationSchema.safeParse({ ...valid, queue_owner_role: "website_editor" })
        .success,
    ).toBe(false);
  });

  it("accepts only a recent route test, with a small positive clock-skew allowance", () => {
    const now = Date.parse("2026-07-13T12:00:00.000Z");
    expect(enquiryRouteWasTestedRecently("2026-07-13T12:05:00.000Z", now)).toBe(true);
    expect(enquiryRouteWasTestedRecently("2026-04-14T12:00:00.000Z", now)).toBe(true);
    expect(enquiryRouteWasTestedRecently("2026-07-13T12:05:01.000Z", now)).toBe(false);
    expect(enquiryRouteWasTestedRecently("2026-04-14T11:59:59.000Z", now)).toBe(false);
    expect(enquiryRouteWasTestedRecently("not-a-date", now)).toBe(false);
  });
});
