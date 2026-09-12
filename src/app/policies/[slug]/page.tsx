import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import {
  PageIntro,
  PublicShell,
  PublishedContentBody,
  PublishedContentUnavailable,
  StatusPanel,
} from "@/components/site";
import { getPublishedPolicy } from "@/server/repositories/public-content";

type PolicyStatusPageProps = {
  params: Promise<{ slug: string }>;
};

const loadPublishedPolicy = cache((slug: string) => getPublishedPolicy(slug));
const policyDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "Europe/London",
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PolicyStatusPageProps): Promise<Metadata> {
  const { slug } = await params;
  const published = await loadPublishedPolicy(slug);

  if (published.status === "ready") {
    const approvedPolicy = published.items[0]!;
    return {
      title: approvedPolicy.seoTitle ?? approvedPolicy.title,
      description:
        approvedPolicy.seoDescription ??
        approvedPolicy.summary ??
        `Current published policy: ${approvedPolicy.title}.`,
    };
  }

  if (published.status === "empty") {
    return { title: "Policy not found" };
  }

  if (published.status === "unavailable") {
    return {
      title: "Policy information unavailable",
      description: "The current published policy could not be checked.",
      robots: { index: false, follow: true },
    };
  }

  return { title: "Policy not found" };
}

export default async function PolicyStatusPage({ params }: PolicyStatusPageProps) {
  const { slug } = await params;
  const published = await loadPublishedPolicy(slug);

  if (published.status === "ready") {
    const approvedPolicy = published.items[0]!;
    return (
      <PublicShell>
        <PageIntro
          eyebrow="Published policy"
          title={approvedPolicy.title}
          description={
            approvedPolicy.summary ??
            "This is the current policy text available through the approved publishing workflow."
          }
          current={approvedPolicy.title}
          parent={{ href: "/policies", label: "Policies" }}
        />

        <section className="section">
          <div className="site-container content-grid">
            <div className="prose prose--wide">
              <p className="status-badge">Published</p>
              <p className="published-policy-date">
                Published{" "}
                <time dateTime={approvedPolicy.publishedAt}>
                  {policyDateFormatter.format(new Date(approvedPolicy.publishedAt))}
                </time>
              </p>
              <PublishedContentBody item={approvedPolicy} />
            </div>
            <StatusPanel title="Current public version">
              <p>
                This record passed the publishing workflow. If it is replaced, archived or reaches
                its approved expiry, it will no longer be returned by the public repository.
              </p>
            </StatusPanel>
          </div>
        </section>
      </PublicShell>
    );
  }

  if (published.status === "unavailable") {
    const title = "Policy information";
    return (
      <PublicShell>
        <PageIntro
          eyebrow="Policy status"
          title={title}
          description="The website cannot currently confirm whether a published version is available."
          current={title}
          parent={{ href: "/policies", label: "Policies" }}
        />
        <section className="section">
          <div className="site-container">
            <PublishedContentUnavailable subject="The current published policy" />
          </div>
        </section>
      </PublicShell>
    );
  }

  notFound();
}
