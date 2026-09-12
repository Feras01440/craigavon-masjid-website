import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublishedContentBody } from "@/components/site/published-content-body";
import type { PublicContentItem } from "@/lib/content/public-content";

describe("published content rendering", () => {
  it("renders mapped content as escaped React text rather than executable markup", () => {
    const item: PublicContentItem = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "news",
      sourceKind: "announcement",
      slug: "safe-render",
      title: "Safe render",
      summary: null,
      bodyBlocks: ["2 < 3 & <script>alert('unsafe')</script>"],
      category: null,
      featured: false,
      publishedAt: "2026-07-13T09:00:00.000Z",
      updatedAt: "2026-07-13T09:00:00.000Z",
      expiresAt: null,
    };

    const markup = renderToStaticMarkup(createElement(PublishedContentBody, { item }));

    expect(markup).toContain("2 &lt; 3 &amp; &lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("renders structured event details with semantic dates and a safe link", () => {
    const item: PublicContentItem = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "event",
      sourceKind: "event",
      slug: "community-event",
      title: "Community event",
      summary: null,
      bodyBlocks: ["Approved event description."],
      details: {
        format: "event",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: null,
        location: "Approved venue wording",
        eventUrl: "/contact",
      },
      category: null,
      featured: false,
      publishedAt: "2026-07-13T09:00:00.000Z",
      updatedAt: "2026-07-13T09:00:00.000Z",
      expiresAt: null,
    };

    const markup = renderToStaticMarkup(createElement(PublishedContentBody, { item }));

    expect(markup).toContain("<dl");
    expect(markup).toContain('dateTime="2026-08-01T10:00:00.000Z"');
    expect(markup).toContain("Approved venue wording");
    expect(markup).toContain('href="/contact"');
  });
});
