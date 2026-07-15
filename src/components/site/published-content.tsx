import type { PublicContentItem } from "@/lib/content/public-content";
import Link from "next/link";
import { PublishedContentBody } from "./published-content-body";
import { StatusPanel } from "./status-panel";

export { PublishedContentBody } from "./published-content-body";

const publishedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
  timeZoneName: "short",
});

const contentTypeLabels: Record<PublicContentItem["sourceKind"], string> = {
  announcement: "Notice",
  emergency_notice: "Urgent notice",
  event: "Event",
  recurring_programme: "Recurring programme",
  service: "Service",
  education: "Learning",
  policy: "Policy",
  faq: "Frequently asked question",
};

type PublishedContentListProps = {
  items: PublicContentItem[];
  compact?: boolean;
  linkBase?: string;
};

export function PublishedContentList({
  items,
  compact = false,
  linkBase,
}: PublishedContentListProps) {
  return (
    <div className="published-content-grid">
      {items.map((item) => (
        <article
          id={`content-${item.id}`}
          className={`published-content-card${item.sourceKind === "emergency_notice" ? " published-content-card--urgent" : ""}`}
          key={item.id}
        >
          <div className="published-content-card__meta">
            <span className="published-content-card__labels">
              <span className="status-badge">{contentTypeLabels[item.sourceKind]}</span>
              {item.featured && <span className="published-content-card__featured">Featured</span>}
            </span>
            <span className="published-content-card__dates">
              <time dateTime={item.publishedAt}>
                Published {publishedDateFormatter.format(new Date(item.publishedAt))}
              </time>
              {item.updatedAt !== item.publishedAt && (
                <time dateTime={item.updatedAt}>
                  Updated {publishedDateFormatter.format(new Date(item.updatedAt))}
                </time>
              )}
            </span>
          </div>
          {item.category && <p className="published-content-card__category">{item.category}</p>}
          <h3>{item.title}</h3>
          {item.summary && <p className="published-content-card__summary">{item.summary}</p>}
          {compact && !item.summary && (
            <p className="published-content-card__summary">{item.bodyBlocks[0]}</p>
          )}
          {!compact && <PublishedContentBody item={item} />}
          {linkBase && (
            <Link className="text-link" href={`${linkBase}/${item.slug}`}>
              Read approved {item.type === "policy" ? "policy" : "information"}
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}

export function PublishedFaqList({ items }: PublishedContentListProps) {
  return (
    <dl className="published-faq-list">
      {items.map((item) => (
        <div id={`content-${item.id}`} key={item.id}>
          <dt>{item.title}</dt>
          <dd>
            {item.bodyBlocks.map((block, index) => (
              <p key={`${item.id}-${index}`}>{block}</p>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PublishedContentUnavailable({ subject }: { subject: string }) {
  return (
    <StatusPanel label="Publishing service" title={`${subject} could not be checked`}>
      <p>
        The website cannot confirm the current approved information right now. No cached, inherited
        or unverified fallback is being shown. Please try again later.
      </p>
    </StatusPanel>
  );
}

export function PublishedContentOmissionNotice() {
  return (
    <div className="published-content-warning">
      <p>
        Some approved entries could not be displayed because their stored structure did not pass the
        public validation checks.
      </p>
    </div>
  );
}
