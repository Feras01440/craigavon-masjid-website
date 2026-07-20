import type { Metadata } from "next";
import Link from "next/link";
import {
  EmptyState,
  PageIntro,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
} from "@/components/site";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  title: "Policies",
  description: "Policies published by the Muslim Association of Craigavon.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PoliciesPage() {
  const content = await getPublishedContent(["policy"], { limit: 100 });
  const approvedPolicies = content.status === "ready" ? content.items : [];
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Policies"
        title="Policies"
        description="The Association's published policies, including how personal information is handled."
        current="Policies"
      />

      <section
        className="section"
        aria-label={content.status === "unavailable" ? "Policy register" : undefined}
        aria-labelledby={content.status === "unavailable" ? undefined : "policy-list-heading"}
      >
        <div className="site-container">
          {content.status === "unavailable" ? (
            <PublishedContentUnavailable subject="The policy list" />
          ) : (
            <>
              {approvedPolicies.length > 0 ? (
                <div className="policy-register-section">
                  <div className="section-heading">
                    <p className="eyebrow">Published documents</p>
                    <h2 id="policy-list-heading">Current policies</h2>
                  </div>
                  <PublishedContentList compact items={approvedPolicies} linkBase="/policies" />
                  {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
                </div>
              ) : (
                <EmptyState title="No policies are published online yet">
                  <p>
                    Policies appear here once adopted. If you need a copy of a document in the
                    meantime, <Link href="/contact">contact us</Link>.
                  </p>
                </EmptyState>
              )}
            </>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
