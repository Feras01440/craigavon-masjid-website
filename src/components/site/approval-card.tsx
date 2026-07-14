import Link from "next/link";

type ApprovalCardProps = {
  title: string;
  description: string;
};

export function ApprovalCard({ title, description }: ApprovalCardProps) {
  return (
    <article className="approval-card">
      <p className="status-badge">Awaiting committee approval</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="text-link" href="/prayer-times">
        View prayer-times status
      </Link>
    </article>
  );
}
