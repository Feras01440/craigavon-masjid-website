import type { Metadata } from "next";
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
  description: "Current policies published by the Muslim Association of Craigavon.",
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
        description={
          content.status === "unavailable"
            ? "The website cannot currently verify the approved policy register, so it does not present a fallback document as current."
            : "Only current documents published through the Association's approval workflow are listed."
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
              {approvedPolicies.length > 0 ? (
                <div className="policy-register-section">
                  <div className="section-heading">
                    <p className="eyebrow">Current register</p>
                    <h2 id="policy-list-heading">Approved public policies</h2>
                  </div>
                  <PublishedContentList compact items={approvedPolicies} linkBase="/policies" />
                  {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
                </div>
              ) : (
                <EmptyState title="No policies are currently published online">
                  <p>Draft and withdrawn documents are not shown as adopted policy.</p>
                </EmptyState>
              )}
            </>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
