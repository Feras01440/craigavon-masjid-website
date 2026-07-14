import type { Metadata } from "next";

import { PageIntro, PublicShell, StatusPanel } from "@/components/site";
import { SITE_NAME } from "@/content/public-copy";

export const metadata: Metadata = {
  title: "About",
  description:
    "What is currently confirmed for the Muslim Association of Craigavon public website and what remains under review.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="About"
        title="What we can say with confidence"
        description="This website is maintained for the Muslim Association of Craigavon. Organisational history, governance and local-role statements remain unpublished until the committee confirms them."
        current="About"
      />

      <section className="section" aria-labelledby="identity-heading">
        <div className="site-container content-grid">
          <div className="prose">
            <p className="eyebrow">Identity</p>
            <h2 id="identity-heading">A restrained public record</h2>
            <p>
              {SITE_NAME} is the only name used in the public text lock-up during this rebuild. No
              invented logo, Arabic name, founding story or geographic claim is being carried
              forward.
            </p>
            <p>
              Once the committee provides evidence and approval, this page can explain the
              Association&apos;s purpose, governance, history and responsibilities in direct, dated
              language.
            </p>
          </div>

          <StatusPanel title="Organisational details are under review">
            <p>
              The official logo, legal naming, governance overview, history and service-area wording
              are not yet approved for publication.
            </p>
          </StatusPanel>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="standards-heading">
        <div className="site-container">
          <div className="section-heading">
            <p className="eyebrow">Editorial approach</p>
            <h2 id="standards-heading">How information earns its place</h2>
          </div>
          <ol className="numbered-principles">
            <li>
              <span>01</span>
              <div>
                <h3>Source</h3>
                <p>A page must point to evidence beyond the page itself.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Approval</h3>
                <p>The responsible committee role approves the exact value or wording.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Review</h3>
                <p>Changing information has an owner, review date and expiry where needed.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </PublicShell>
  );
}
