import Link from "next/link";
import Image from "next/image";

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
            <Image
              className="site-footer__logo"
              src="/brand/muslim-association-of-craigavon-logo-256.webp"
              alt=""
              aria-hidden="true"
              width={256}
              height={256}
              sizes="48px"
              unoptimized
              loading="eager"
            />
            <p className="site-footer__name">{siteName}</p>
          </div>
          <p className="site-footer__note">{note}</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="site-container site-footer__bottom">
        <p>
          {legalNote ||
            "Contact details and a production domain are awaiting committee confirmation."}
        </p>
      </div>
    </footer>
  );
}
