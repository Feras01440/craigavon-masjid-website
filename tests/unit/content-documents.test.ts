import { describe, expect, it } from "vitest";

import {
  contentDocumentIsCompatible,
  contentDocumentSchema,
  contentDocumentText,
  eventDocumentSchema,
  isPublishableContentKind,
  noticeDocumentSchema,
  policyDocumentSchema,
  publishableContentKinds,
  safeContentLinkSchema,
} from "@/lib/content/content-documents";

describe("content document contracts", () => {
  it("allows new publication only for content types with public consumers", () => {
    expect(publishableContentKinds).toEqual([
      "announcement",
      "emergency_notice",
      "event",
      "recurring_programme",
      "education",
      "service",
      "faq",
      "policy",
    ]);
    for (const kind of ["page", "navigation", "social_link", "donation_appeal"] as const) {
      expect(isPublishableContentKind(kind)).toBe(false);
    }
  });

  it("keeps the legacy plain-text format compatible with supported public kinds", () => {
    const legacy = contentDocumentSchema.parse({
      version: 1,
      format: "plain_text",
      text: "Approved legacy copy.",
    });

    expect(contentDocumentIsCompatible("event", legacy)).toBe(true);
    expect(contentDocumentIsCompatible("faq", legacy)).toBe(true);
  });

  it("rejects a structured format attached to the wrong content kind", () => {
    const event = eventDocumentSchema.parse({
      version: 2,
      format: "event",
      text: "Approved event details.",
      starts_at: "2026-08-01T10:00:00.000Z",
      ends_at: null,
      location: "Approved venue wording",
      event_url: "/contact",
    });

    expect(contentDocumentIsCompatible("event", event)).toBe(true);
    expect(contentDocumentIsCompatible("service", event)).toBe(false);
  });

  it("accepts only secure external links or site-relative paths", () => {
    expect(safeContentLinkSchema.safeParse("/contact").success).toBe(true);
    expect(safeContentLinkSchema.safeParse("https://example.org/details").success).toBe(true);
    expect(safeContentLinkSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeContentLinkSchema.safeParse("//example.org/details").success).toBe(false);
    expect(safeContentLinkSchema.safeParse("http://example.org/details").success).toBe(false);
    expect(safeContentLinkSchema.safeParse("/unsafe\\path").success).toBe(false);
    expect(safeContentLinkSchema.safeParse("/unsafe\u0000path").success).toBe(false);
    expect(safeContentLinkSchema.safeParse("not a URL").success).toBe(false);
  });

  it("requires notice link labels and addresses to be supplied together", () => {
    const base = {
      version: 2,
      format: "notice",
      text: "Approved notice copy.",
    } as const;
    const missingLabel = noticeDocumentSchema.safeParse({
      ...base,
      action_label: null,
      action_url: "/contact",
    });
    const missingAddress = noticeDocumentSchema.safeParse({
      ...base,
      action_label: "Contact us",
      action_url: null,
    });

    expect(missingLabel.success).toBe(false);
    expect(missingAddress.success).toBe(false);
    if (!missingLabel.success && !missingAddress.success) {
      expect(missingLabel.error.issues[0]?.path).toEqual(["action_label"]);
      expect(missingAddress.error.issues[0]?.path).toEqual(["action_url"]);
    }
  });

  it("validates event chronology and policy calendar controls", () => {
    expect(
      eventDocumentSchema.safeParse({
        version: 2,
        format: "event",
        text: "Details",
        starts_at: null,
        ends_at: "2026-08-01T11:00:00.000Z",
        location: "Venue",
        event_url: null,
      }).success,
    ).toBe(false);
    expect(
      eventDocumentSchema.safeParse({
        version: 2,
        format: "event",
        text: "Details",
        starts_at: "2026-08-01T12:00:00.000Z",
        ends_at: "2026-08-01T11:00:00.000Z",
        location: "Venue",
        event_url: null,
      }).success,
    ).toBe(false);
    expect(
      policyDocumentSchema.safeParse({
        version: 2,
        format: "policy",
        text: "Policy text",
        owner: "Approved role",
        effective_on: "2026-07-13",
        review_on: "2026-07-12",
      }).success,
    ).toBe(false);
    expect(
      policyDocumentSchema.safeParse({
        version: 2,
        format: "policy",
        text: "Policy text",
        owner: "Approved role",
        effective_on: "2026-02-29",
        review_on: null,
      }).success,
    ).toBe(false);
  });

  it("recovers readable text from current, legacy and malformed stored documents", () => {
    expect(
      contentDocumentText({
        version: 1,
        format: "plain_text",
        text: "Approved current copy.",
      }),
    ).toBe("Approved current copy.");
    expect(contentDocumentText({ text: "Recoverable legacy copy." })).toBe(
      "Recoverable legacy copy.",
    );
    expect(contentDocumentText("Unwrapped legacy copy.")).toBe("Unwrapped legacy copy.");
    expect(contentDocumentText(["unexpected", "shape"])).toBe('[\n  "unexpected",\n  "shape"\n]');
  });
});
