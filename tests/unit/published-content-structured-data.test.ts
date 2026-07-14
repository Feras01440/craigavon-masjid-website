import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildPublishedContentStructuredData,
  PublishedContentStructuredData,
} from "@/components/site/published-content-structured-data";
import type { PublicContentItem } from "@/lib/content/public-content";

const now = new Date("2026-07-13T12:00:00.000Z");
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalIndexing = process.env.NEXT_PUBLIC_INDEXING_ENABLED;

function item(overrides: Partial<PublicContentItem> = {}): PublicContentItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    type: "event",
    sourceKind: "event",
    slug: "approved-event",
    title: "Approved event",
    summary: "Approved summary.",
    bodyBlocks: ["Approved details."],
    details: {
      format: "event",
      startsAt: "2026-08-01T10:00:00.000Z",
      endsAt: "2026-08-01T12:00:00.000Z",
      location: "Approved public venue wording",
      eventUrl: "/contact",
    },
    category: null,
    featured: false,
    publishedAt: "2026-07-13T09:00:00.000Z",
    updatedAt: "2026-07-13T09:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  if (originalIndexing === undefined) delete process.env.NEXT_PUBLIC_INDEXING_ENABLED;
  else process.env.NEXT_PUBLIC_INDEXING_ENABLED = originalIndexing;
});

describe("published content structured data", () => {
  it("builds Event and FAQPage records only from effective mapped items", () => {
    const faq = item({
      id: "22222222-2222-4222-8222-222222222222",
      type: "faq",
      sourceKind: "faq",
      slug: "approved-question",
      title: "Approved question?",
      summary: null,
      bodyBlocks: ["Approved answer."],
      details: { format: "faq" },
    });
    const expired = item({
      id: "33333333-3333-4333-8333-333333333333",
      expiresAt: "2026-07-13T11:59:59.000Z",
    });

    const graph = buildPublishedContentStructuredData(
      [item(), faq, expired],
      new URL("https://example.org/"),
      now,
    );

    expect(graph).toHaveLength(2);
    expect(graph[0]).toMatchObject({
      "@type": "Event",
      name: "Approved event",
      startDate: "2026-08-01T10:00:00.000Z",
      location: { "@type": "Place", name: "Approved public venue wording" },
      url: "https://example.org/contact",
    });
    expect(graph[1]).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Approved question?",
          acceptedAnswer: { "@type": "Answer", text: "Approved answer." },
        },
      ],
    });
  });

  it("emits no JSON-LD unless the site URL and indexing gates are both enabled", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.org";
    process.env.NEXT_PUBLIC_INDEXING_ENABLED = "false";
    expect(
      renderToStaticMarkup(createElement(PublishedContentStructuredData, { items: [item()] })),
    ).toBe("");

    process.env.NEXT_PUBLIC_INDEXING_ENABLED = "true";
    const markup = renderToStaticMarkup(
      createElement(PublishedContentStructuredData, { items: [item()] }),
    );
    expect(markup).toContain('type="application/ld+json"');
    expect(markup).toContain("schema.org");
    expect(markup).toContain("Approved event");
  });
});
