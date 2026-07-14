import { describe, expect, it } from "vitest";

import {
  databaseKindsFor,
  isPublicContentSlug,
  mapPublishedContentRow,
  mapPublishedContentRows,
  publishedContentRowSchema,
} from "@/lib/content/public-content";

const now = new Date("2026-07-13T12:00:00.000Z");

function approvedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "announcement",
    slug: "committee-update",
    title: "Committee update",
    summary: "A checked summary.",
    body: {
      version: 1,
      format: "plain_text",
      text: "First paragraph.\n\nSecond paragraph.",
    },
    category: "Community",
    status: "published",
    featured: false,
    publish_at: "2026-07-13T10:00:00.000Z",
    expires_at: "2026-07-14T12:00:00.000Z",
    published_by: "22222222-2222-4222-8222-222222222222",
    published_at: "2026-07-13T09:00:00.000Z",
    deleted_at: null,
    updated_at: "2026-07-13T09:00:00.000Z",
    ...overrides,
  };
}

describe("public content schema and mapping", () => {
  it("maps a current approved plain-text document into structured blocks", () => {
    const item = mapPublishedContentRow(approvedRow(), now);

    expect(item).toMatchObject({
      type: "news",
      sourceKind: "announcement",
      slug: "committee-update",
      title: "Committee update",
      bodyBlocks: ["First paragraph.", "Second paragraph."],
    });
  });

  it("maps an approved scheduled item only after its effective time", () => {
    expect(mapPublishedContentRow(approvedRow({ status: "scheduled" }), now)?.slug).toBe(
      "committee-update",
    );
    expect(
      mapPublishedContentRow(
        approvedRow({
          status: "scheduled",
          publish_at: "2026-07-13T13:00:00.000Z",
        }),
        now,
      ),
    ).toBeNull();
  });

  it("maps the database announcement kinds to the public news type", () => {
    expect(databaseKindsFor(["news", "event", "news"])).toEqual([
      "announcement",
      "emergency_notice",
      "event",
    ]);
    expect(mapPublishedContentRow(approvedRow({ kind: "emergency_notice" }), now)?.type).toBe(
      "news",
    );
  });

  it("rejects content that is not both approved and current", () => {
    expect(mapPublishedContentRow(approvedRow({ status: "draft" }), now)).toBeNull();
    expect(mapPublishedContentRow(approvedRow({ published_by: null }), now)).toBeNull();
    expect(
      mapPublishedContentRow(approvedRow({ publish_at: "2026-07-13T13:00:00.000Z" }), now),
    ).toBeNull();
    expect(
      mapPublishedContentRow(approvedRow({ expires_at: "2026-07-13T12:00:00.000Z" }), now),
    ).toBeNull();
    expect(mapPublishedContentRow(approvedRow({ deleted_at: now.toISOString() }), now)).toBeNull();
  });

  it("accepts only the versioned plain-text body shape", () => {
    const invalid = approvedRow({
      body: { version: 1, format: "html", text: "<p>Not accepted</p>" },
    });

    expect(publishedContentRowSchema.safeParse(invalid).success).toBe(false);
    expect(mapPublishedContentRow(invalid, now)).toBeNull();
  });

  it("maps a validated structured event into public detail fields", () => {
    const item = mapPublishedContentRow(
      approvedRow({
        kind: "event",
        body: {
          version: 2,
          format: "event",
          text: "Bring the approved information listed here.",
          starts_at: "2026-08-01T10:00:00.000Z",
          ends_at: "2026-08-01T12:00:00.000Z",
          location: "Approved public venue wording",
          event_url: "/contact",
        },
      }),
      now,
    );

    expect(item?.details).toEqual({
      format: "event",
      startsAt: "2026-08-01T10:00:00.000Z",
      endsAt: "2026-08-01T12:00:00.000Z",
      location: "Approved public venue wording",
      eventUrl: "/contact",
    });
  });

  it.each([
    {
      kind: "announcement",
      body: {
        version: 2,
        format: "notice",
        text: "Approved notice.",
        action_label: "Read checked details",
        action_url: "/contact",
      },
      details: {
        format: "notice",
        actionLabel: "Read checked details",
        actionUrl: "/contact",
      },
    },
    {
      kind: "service",
      body: {
        version: 2,
        format: "service",
        text: "Approved service details.",
        audience: "<strong>Approved audience</strong>",
        availability: "By confirmed arrangement",
        access_instructions: null,
        service_url: "/contact",
      },
      details: {
        format: "service",
        audience: "Approved audience",
        availability: "By confirmed arrangement",
        accessInstructions: null,
        serviceUrl: "/contact",
      },
    },
    {
      kind: "education",
      body: {
        version: 2,
        format: "education",
        text: "Approved learning details.",
        audience: "Approved audience",
        schedule: "Approved schedule",
        registration_url: null,
        safeguarding_note: "Approved safeguarding wording",
      },
      details: {
        format: "education",
        audience: "Approved audience",
        schedule: "Approved schedule",
        registrationUrl: null,
        safeguardingNote: "Approved safeguarding wording",
      },
    },
    {
      kind: "policy",
      body: {
        version: 2,
        format: "policy",
        text: "Approved policy text.",
        owner: "Approved committee role",
        effective_on: "2026-07-13",
        review_on: "2027-07-13",
      },
      details: {
        format: "policy",
        owner: "Approved committee role",
        effectiveOn: "2026-07-13",
        reviewOn: "2027-07-13",
      },
    },
    {
      kind: "faq",
      body: { version: 2, format: "faq", text: "Approved answer." },
      details: { format: "faq" },
    },
  ])("maps the $kind structured document", ({ kind, body, details }) => {
    expect(mapPublishedContentRow(approvedRow({ kind, body }), now)?.details).toEqual(details);
  });

  it("rejects mismatched or incomplete structured documents", () => {
    const structuredEvent = {
      version: 2,
      format: "event",
      text: "Event information.",
      starts_at: "2026-08-01T10:00:00.000Z",
      ends_at: null,
      location: "Approved venue wording",
      event_url: null,
    };

    expect(
      mapPublishedContentRow(approvedRow({ kind: "service", body: structuredEvent }), now),
    ).toBeNull();
    expect(
      mapPublishedContentRow(
        approvedRow({ kind: "event", body: { ...structuredEvent, location: null } }),
        now,
      ),
    ).toBeNull();
  });

  it("rejects content kinds outside the explicit public allowlist", () => {
    for (const kind of ["page", "navigation", "donation_appeal", "social_link"]) {
      expect(mapPublishedContentRow(approvedRow({ kind }), now)).toBeNull();
    }
  });

  it("removes markup, script content and unsafe directional controls before rendering", () => {
    const item = mapPublishedContentRow(
      approvedRow({
        title: "<strong>Safe title</strong>\u202e",
        summary: "<em>Safe summary</em>",
        body: {
          version: 1,
          format: "plain_text",
          text: "Visible text. <script>alert('unsafe')</script>\n\n<b>Second block</b>.",
        },
      }),
      now,
    );

    expect(item?.title).toBe("Safe title");
    expect(item?.summary).toBe("Safe summary");
    expect(item?.bodyBlocks).toEqual(["Visible text.", "Second block."]);
  });

  it("keeps ordinary comparison characters as plain text for React to escape", () => {
    const item = mapPublishedContentRow(
      approvedRow({
        body: {
          version: 1,
          format: "plain_text",
          text: "Capacity is 2 < 3 & 4 > 1.",
        },
      }),
      now,
    );

    expect(item?.bodyBlocks).toEqual(["Capacity is 2 < 3 & 4 > 1."]);
  });

  it("reports rejected rows without discarding valid siblings", () => {
    const result = mapPublishedContentRows([approvedRow(), approvedRow({ id: "not-a-uuid" })], now);

    expect(result.items).toHaveLength(1);
    expect(result.rejectedCount).toBe(1);
  });

  it("validates public slugs before they reach a query filter", () => {
    expect(isPublicContentSlug("privacy-notice")).toBe(true);
    expect(isPublicContentSlug("privacy,or(status.eq.draft)")).toBe(false);
    expect(isPublicContentSlug("../privacy")).toBe(false);
  });
});
