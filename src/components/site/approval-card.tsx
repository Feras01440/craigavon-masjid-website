import Link from "next/link";

type ApprovalCardProps = {
  title: string;
  description: string;
};

export function ApprovalCard({ title, description }: ApprovalCardProps) {
  return (
    <article className="approval-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="text-link" href="/prayer-times">
        Prayer times page
      </Link>
    </article>
  );
}
