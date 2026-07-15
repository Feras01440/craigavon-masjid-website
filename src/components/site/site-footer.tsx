/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import type { PublicNavigationItem } from "@/server/repositories/public-site-settings";

export function SiteFooter({
  siteName,
  navigation,
  note,
  legalNote,
}: {
  siteName: string;
  navigation: PublicNavigationItem[];
  note: string;
  legalNote: string;
}) {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__grid">
        <div>
          <div className="site-footer__brand">
            <img
              className="site-footer__logo"
              src="/brand/muslim-association-of-craigavon-logo-256.webp"
              alt=""
              aria-hidden="true"
              width={256}
              height={256}
              loading="eager"
              decoding="async"
            />
            <p className="site-footer__name">{siteName}</p>
          </div>
          <p className="site-footer__note">{note}</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} prefetch={false}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="site-container site-footer__bottom">
        <p>
          {legalNote ||
            "Public information is reviewed before publication and removed when it expires."}
        </p>
      </div>
    </footer>
  );
}
