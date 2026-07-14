import Link from "next/link";

type BreadcrumbProps = {
  current: string;
  parent?: { href: string; label: string };
};

export function Breadcrumb({ current, parent }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href="/">Home</Link>
        </li>
        {parent ? (
          <li>
            <Link href={parent.href}>{parent.label}</Link>
          </li>
        ) : null}
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
