import type { PublicContentItem } from "@/lib/content/public-content";
import { getSiteUrl, indexingIsApproved } from "@/lib/site-url";

type JsonLdRecord = Record<string, unknown>;

function effectiveItem(item: PublicContentItem, now: Date): boolean {
  const publishedAt = Date.parse(item.publishedAt);
  const expiresAt = item.expiresAt ? Date.parse(item.expiresAt) : null;
  return (
    Number.isFinite(publishedAt) &&
    publishedAt <= now.getTime() &&
    (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > now.getTime()))
  );
}

function safeAbsoluteUrl(value: string | null, fallback: URL, siteUrl: URL): string {
  if (!value) return fallback.toString();
  try {
    const url = new URL(value, siteUrl);
    return url.protocol === "https:" || url.origin === siteUrl.origin
      ? url.toString()
      : fallback.toString();
  } catch {
    return fallback.toString();
  }
}

export function buildPublishedContentStructuredData(
  items: readonly PublicContentItem[],
  siteUrl: URL,
  now: Date = new Date(),
): JsonLdRecord[] {
  if (Number.isNaN(now.getTime())) return [];
  const effectiveItems = items.filter((item) => effectiveItem(item, now));
  const graph: JsonLdRecord[] = [];

  for (const item of effectiveItems) {
    if (item.sourceKind !== "event" || item.details?.format !== "event") continue;
    const pageUrl = new URL(`/news#content-${item.id}`, siteUrl);
    graph.push({
      "@type": "Event",
      "@id": pageUrl.toString(),
      name: item.title,
      description: item.summary ?? item.bodyBlocks.join("\n\n"),
      startDate: item.details.startsAt,
      ...(item.details.endsAt ? { endDate: item.details.endsAt } : {}),
      location: {
        "@type": "Place",
        name: item.details.location,
      },
      url: safeAbsoluteUrl(item.details.eventUrl, pageUrl, siteUrl),
    });
  }

  const faqs = effectiveItems.filter((item) => item.sourceKind === "faq");
  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": new URL("/services#frequently-asked-questions", siteUrl).toString(),
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        "@id": new URL(`/services#content-${item.id}`, siteUrl).toString(),
        name: item.title,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.bodyBlocks.join("\n\n"),
        },
      })),
    });
  }

  return graph;
}

export function PublishedContentStructuredData({
  items,
}: {
  items: readonly PublicContentItem[];
}): React.ReactNode {
  const siteUrl = getSiteUrl();
  if (!siteUrl || !indexingIsApproved()) return null;

  const graph = buildPublishedContentStructuredData(items, siteUrl);
  if (graph.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@graph": graph,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }}
    />
  );
}
