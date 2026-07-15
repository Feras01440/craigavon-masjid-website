import type { Metadata } from "next";

import { PageIntro, PublicShell, StatusPanel } from "@/components/site";

export const metadata: Metadata = {
  title: "New Muslims",
  description:
    "Practical contact and visiting information for new Muslims and people exploring Islam.",
};

export default function NewMuslimsPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="New Muslims"
        title="Practical information for a first conversation"
        description="If you are exploring Islam or recently became Muslim, use the published contact and visiting pages to check how to speak with the Association privately."
        current="New Muslims"
      />

      <section className="section" aria-labelledby="new-muslim-plan">
        <div className="site-container content-grid">
          <div className="prose">
            <p className="eyebrow">Before making contact</p>
            <h2 id="new-muslim-plan">Practical information without pressure</h2>
            <ul className="plain-list">
              <li>Check the contact page for a currently monitored route</li>
              <li>Ask what support is available before sharing sensitive information</li>
              <li>What to expect from a first conversation or visit</li>
              <li>Learning information only when a programme is confirmed</li>
            </ul>
          </div>
          <StatusPanel title="Use a confirmed contact route">
            <p>
              Religious enquiries can be sensitive. If no contact route is shown, the Association is
              not currently accepting private enquiries through this website.
            </p>
          </StatusPanel>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="religious-review">
        <div className="site-container prose prose--wide">
          <p className="eyebrow">Religious information</p>
          <h2 id="religious-review">Ask for a suitable person to speak with</h2>
          <p>
            This page does not try to replace a private conversation or qualified religious
            guidance. It contains no unsourced quotation or generic teaching copy.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
