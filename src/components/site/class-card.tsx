import type { PublicContentItem } from "@/lib/content/public-content";

/*
 * A class or programme on the Education page: the schedule leads, because
 * that is what a parent or student is looking for, then who it is for and
 * a short description from the committee's published record.
 */
export function ClassCard({ item }: { item: PublicContentItem }) {
  const details = item.details?.format === "education" ? item.details : null;
  return (
    <article className="class-card" id={`content-${item.id}`}>
      {details?.schedule ? <p className="class-card__schedule">{details.schedule}</p> : null}
      <h3 className="class-card__title">{item.title}</h3>
      {details?.audience ? <p className="class-card__audience">{details.audience}</p> : null}
      <div className="class-card__body">
        {item.bodyBlocks.map((block, index) => (
          <p key={`${item.id}-${index}`}>{block}</p>
        ))}
      </div>
      {details?.registrationUrl ? (
        <p className="class-card__action">
          <a className="text-link" href={details.registrationUrl}>
            Register
          </a>
        </p>
      ) : null}
      {details?.safeguardingNote ? (
        <p className="class-card__note">{details.safeguardingNote}</p>
      ) : null}
    </article>
  );
}
