import type { ReactNode } from "react";

import { NextPrayerStrip } from "@/components/prayer/next-prayer-live";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { demoModeIsActive } from "@/lib/demo-mode";
import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";
import { getPublicSiteChrome } from "@/server/repositories/public-site-settings";

type PublicShellProps = {
  children: ReactNode;
};

export async function PublicShell({ children }: PublicShellProps) {
  const now = new Date();
  const [chrome, prayerBundle] = await Promise.all([
    getPublicSiteChrome(),
    // Graceful here: if the bundle is unavailable the strip simply does not
    // render — the shell must never take a page down with it.
    getPublishedPrayerBundle(dateKeyInZone(now, "Europe/London"), 2),
  ]);
  const demoMode = demoModeIsActive();
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader
        siteName={chrome.siteName}
        masjidName={chrome.masjidName}
        navigation={chrome.primaryNavigation}
      />
      {prayerBundle.status === "available" && (
        <NextPrayerStrip schedules={prayerBundle.schedules} initialNowIso={now.toISOString()} />
      )}
      {demoMode && (
        <div className="demo-banner" role="status">
          Local demonstration — information on this copy is sample data and is not committee
          approved.
        </div>
      )}
      <main className="site-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter
        siteName={chrome.siteName}
        masjidName={chrome.masjidName}
        navigation={chrome.footerNavigation}
        note={chrome.footerNote}
        legalNote={chrome.footerLegalNote}
        contact={chrome.contact}
      />
    </div>
  );
}
