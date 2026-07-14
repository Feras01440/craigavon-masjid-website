import { Breadcrumb } from "@/components/site/breadcrumb";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  current: string;
  parent?: { href: string; label: string };
};

export function PageIntro({ eyebrow, title, description, current, parent }: PageIntroProps) {
  return (
    <header className="page-intro">
      <div className="site-container page-intro__inner">
        <Breadcrumb current={current} parent={parent} />
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-intro__lead">{description}</p>
      </div>
    </header>
  );
}
