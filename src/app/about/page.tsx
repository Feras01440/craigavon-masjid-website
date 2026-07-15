import type { Metadata } from "next";

import { PageIntro, PublicShell } from "@/components/site";
import { SITE_NAME } from "@/content/public-copy";

export const metadata: Metadata = {
  title: "About",
  description:
    "About the Muslim Association of Craigavon and how its public information is maintained.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="About"
        title="About the Association"
        description="This website provides prayer, visiting and community information for the Muslim Association of Craigavon."
        current="About"
      />

      <section className="section" aria-labelledby="identity-heading">
        <div className="site-container prose prose--wide">
          <p className="eyebrow">Public information</p>
          <h2 id="identity-heading">{SITE_NAME}</h2>
          <p>
            The Association maintains this website so visitors can find current practical
            information without relying on old notices or informal copies.
          </p>
          <p>
            This page contains only the Association identity currently authorised for public use.
            Prayer, visiting, service and contact information is maintained on the relevant page so
            that practical changes can be dated and reviewed clearly.
          </p>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="standards-heading">
        <div className="site-container">
          <div className="section-heading">
            <p className="eyebrow">Editorial approach</p>
            <h2 id="standards-heading">How public information is maintained</h2>
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
