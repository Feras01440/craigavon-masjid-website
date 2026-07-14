import Link from "next/link";

type JourneyCardProps = {
  href: string;
  title: string;
  description: string;
  status: string;
};

export function JourneyCard({ href, title, description, status }: JourneyCardProps) {
  return (
    <article className="journey-card">
      <p className="journey-card__status">{status}</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="text-link" href={href}>
        Open this section
      </Link>
    </article>
  );
}
