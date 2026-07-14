import type { PublicContentItem } from "@/lib/content/public-content";

const eventDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
  timeZoneName: "short",
});

const policyDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "Europe/London",
});

function policyDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PublishedContentDetails({ item }: { item: PublicContentItem }) {
  const details = item.details;
  if (!details || details.format === "faq") return null;

  if (details.format === "notice") {
    return details.actionLabel && details.actionUrl ? (
      <p className="published-content__action">
        <a className="text-link" href={details.actionUrl}>
          {details.actionLabel}
        </a>
      </p>
    ) : null;
  }

  if (details.format === "event") {
    return (
      <>
        <dl className="published-content__details">
          <Detail label="Starts">
            <time dateTime={details.startsAt}>
              {eventDateFormatter.format(new Date(details.startsAt))}
            </time>
          </Detail>
          {details.endsAt && (
            <Detail label="Ends">
              <time dateTime={details.endsAt}>
                {eventDateFormatter.format(new Date(details.endsAt))}
              </time>
            </Detail>
          )}
          <Detail label="Location">{details.location}</Detail>
        </dl>
        {details.eventUrl && (
          <p className="published-content__action">
            <a className="text-link" href={details.eventUrl}>
              Event details or registration
            </a>
          </p>
        )}
      </>
    );
  }

  if (details.format === "service") {
    const hasDetails = details.audience || details.availability || details.accessInstructions;
    return (
      <>
        {hasDetails && (
          <dl className="published-content__details">
            {details.audience && <Detail label="Who it is for">{details.audience}</Detail>}
            {details.availability && <Detail label="Availability">{details.availability}</Detail>}
            {details.accessInstructions && (
              <Detail label="How to access it">{details.accessInstructions}</Detail>
            )}
          </dl>
        )}
        {details.serviceUrl && (
          <p className="published-content__action">
            <a className="text-link" href={details.serviceUrl}>
              Service information
            </a>
          </p>
        )}
      </>
    );
  }

  if (details.format === "education") {
    const hasDetails = details.audience || details.schedule || details.safeguardingNote;
    return (
      <>
        {hasDetails && (
          <dl className="published-content__details">
            {details.audience && <Detail label="Audience">{details.audience}</Detail>}
            {details.schedule && <Detail label="Schedule">{details.schedule}</Detail>}
            {details.safeguardingNote && (
              <Detail label="Registration and safeguarding">{details.safeguardingNote}</Detail>
            )}
          </dl>
        )}
        {details.registrationUrl && (
          <p className="published-content__action">
            <a className="text-link" href={details.registrationUrl}>
              Registration information
            </a>
          </p>
        )}
      </>
    );
  }

  return (
    <dl className="published-content__details">
      <Detail label="Policy owner">{details.owner}</Detail>
      <Detail label="Effective from">
        <time dateTime={details.effectiveOn}>
          {policyDateFormatter.format(policyDate(details.effectiveOn))}
        </time>
      </Detail>
      {details.reviewOn && (
        <Detail label="Review due">
          <time dateTime={details.reviewOn}>
            {policyDateFormatter.format(policyDate(details.reviewOn))}
          </time>
        </Detail>
      )}
    </dl>
  );
}

export function PublishedContentBody({ item }: { item: PublicContentItem }) {
  return (
    <div className="published-content__body">
      <PublishedContentDetails item={item} />
      {item.bodyBlocks.map((block, index) => (
        <p key={`${item.id}-${index}`}>{block}</p>
      ))}
    </div>
  );
}
