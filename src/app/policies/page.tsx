import type { Metadata } from "next";
import Link from "next/link";

import {
  PageIntro,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
  StatusPanel,
} from "@/components/site";
import { policyEntries } from "@/content/public-copy";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Publication status for privacy, accessibility, safeguarding, complaints and website terms.",
  robots: {
    index: false,
    follow: true,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PoliciesPage() {
  const content = await getPublishedContent(["policy"], { limit: 100 });
  const approvedPolicies = content.status === "ready" ? content.items : [];
  const approvedSlugs = new Set(approvedPolicies.map((policy) => policy.slug));
  const awaitingPolicies =
    content.status === "empty" || (content.status === "ready" && content.omittedCount === 0)
      ? policyEntries.filter((policy) => !approvedSlugs.has(policy.slug))
      : [];

  return (
    <PublicShell>
      <PageIntro
        eyebrow="Policies"
        title="Policy publication status"
        description={
          content.status === "unavailable"
            ? "The website cannot currently verify the approved policy register, so it does not present a fallback document as current."
            : "A draft or planned document is not described as adopted policy. Each page below states what is still required."
        }
        current="Policies"
      />

      <section
        className="section"
        aria-label={content.status === "unavailable" ? "Policy register" : undefined}
        aria-labelledby={content.status === "unavailable" ? undefined : "policy-list-heading"}
      >
        <div className="site-container">
          {content.status === "unavailable" ? (
            <PublishedContentUnavailable subject="The current policy register" />
          ) : (
            <>
              {approvedPolicies.length > 0 && (
                <div className="policy-register-section">
                  <div className="section-heading">
                    <p className="eyebrow">Current register</p>
                    <h2 id="policy-list-heading">Approved public policies</h2>
                  </div>
                  <PublishedContentList compact items={approvedPolicies} linkBase="/policies" />
                  {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
                </div>
              )}

              {awaitingPolicies.length > 0 && (
                <div className="policy-register-section">
                  <div className="section-heading">
                    <p className="eyebrow">Publication checks</p>
                    <h2 id={approvedPolicies.length === 0 ? "policy-list-heading" : undefined}>
                      Documents awaiting approval
                    </h2>
                  </div>
                  <div className="policy-grid">
                    {awaitingPolicies.map((policy) => (
                      <article className="policy-card" key={policy.slug}>
                        <p className="status-badge">{policy.status}</p>
                        <h3>{policy.title}</h3>
                        <p>{policy.summary}</p>
                        <Link className="text-link" href={`/policies/${policy.slug}`}>
                          Read publication status
                        </Link>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="section section--compact">
        <div className="site-container">
          <StatusPanel title="Forms and donations remain unavailable">
            <p>
              Neither will be enabled before the necessary privacy, safeguarding, recipient,
              retention and financial controls are approved.
            </p>
          </StatusPanel>
        </div>
      </section>
    </PublicShell>
  );
}
