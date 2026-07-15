import type { Metadata } from "next";

import { PageIntro, PublicShell } from "@/components/site";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Accessibility information for the Muslim Association of Craigavon website.",
};

export default function AccessibilityPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Accessibility"
        title="Using this website"
        description="The website is designed to remain readable and operable with a keyboard, zoom, high-contrast settings and reduced motion."
        current="Accessibility"
      />
      <section className="section">
        <div className="site-container prose prose--wide">
          <h2>Accessibility features</h2>
          <ul className="plain-list">
            <li>A skip link and consistent page landmarks support keyboard navigation.</li>
            <li>Forms use visible labels, instructions and text error messages.</li>
            <li>Tables can be scrolled on narrow screens without changing the page width.</li>
            <li>Motion is reduced when the device requests reduced motion.</li>
            <li>Focus indicators remain visible in standard and forced-colour modes.</li>
          </ul>
          <h2>Changing the display</h2>
          <p>
            Browser zoom up to 200% and narrow reflow are supported. You can also use your device
            text-size, colour and contrast preferences. Prayer times are always accompanied by text;
            colour is not the only status indicator.
          </p>
          <h2>Known limits and help</h2>
          <p>
            Third-party map or registration links may have different accessibility support. A
            committee-approved assistance route will be shown on the contact page when available. If
            no route is published, no unmonitored address is substituted.
          </p>
          <p>
            This information describes the implemented features; it is not a claim that every
            assistive-technology combination has been formally certified.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
