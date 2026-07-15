import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { demoModeIsActive } from "@/lib/demo-mode";
import { getPublicSiteChrome } from "@/server/repositories/public-site-settings";

type PublicShellProps = {
  children: ReactNode;
};

export async function PublicShell({ children }: PublicShellProps) {
  const chrome = await getPublicSiteChrome();
  const demoMode = demoModeIsActive();
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader siteName={chrome.siteName} navigation={chrome.primaryNavigation} />
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
        navigation={chrome.footerNavigation}
        note={chrome.footerNote}
        legalNote={chrome.footerLegalNote}
      />
    </div>
  );
}
