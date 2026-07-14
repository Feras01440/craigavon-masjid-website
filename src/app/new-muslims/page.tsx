import type { Metadata } from "next";

import { PageIntro, PublicShell, StatusPanel } from "@/components/site";

export const metadata: Metadata = {
  title: "New Muslims",
  description:
    "Status of private and practical information being prepared for new Muslims and people exploring Islam.",
};

export default function NewMuslimsPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="New Muslims"
        title="A private contact route is being prepared"
        description="If you are exploring Islam or recently became Muslim, you may want a private conversation and a clear explanation of what support is actually available."
        current="New Muslims"
      />

      <section className="section" aria-labelledby="new-muslim-plan">
        <div className="site-container content-grid">
          <div className="prose">
            <p className="eyebrow">What this page will provide</p>
            <h2 id="new-muslim-plan">Practical information without pressure</h2>
            <ul className="plain-list">
              <li>An approved private contact and its monitoring hours</li>
              <li>A clear description of available support and its limits</li>
              <li>What to expect from a first conversation or visit</li>
              <li>Learning information only when a programme is confirmed</li>
            </ul>
          </div>
          <StatusPanel title="No enquiry form is active">
            <p>
              Religious enquiries can be sensitive. The website will not collect them until approved
              recipients, privacy wording, retention and secure handling are in place.
            </p>
          </StatusPanel>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="religious-review">
        <div className="site-container prose prose--wide">
          <p className="eyebrow">Religious review</p>
          <h2 id="religious-review">No unverified teaching copy</h2>
          <p>
            Qur&apos;anic quotations, hadith, shahadah guidance and explanations of religious
            requirements remain unpublished until a qualified reviewer confirms the exact source,
            wording and context.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
