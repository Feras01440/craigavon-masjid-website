import Link from "next/link";
import Image from "next/image";

import type { PublicNavigationItem } from "@/server/repositories/public-site-settings";

export function SiteHeader({
  siteName,
  navigation,
}: {
  siteName: string;
  navigation: PublicNavigationItem[];
}) {
  const navigationItems = navigation.map((item) => (
    <li key={item.href}>
      <Link href={item.href}>{item.label}</Link>
    </li>
  ));

  return (
    <header className="site-header">
      <div className="site-container site-header__inner">
        <Link className="wordmark" href="/" aria-label={`${siteName} — home`}>
          <Image
            className="wordmark__logo"
            src="/brand/muslim-association-of-craigavon-logo-256.webp"
            alt=""
            aria-hidden="true"
            width={256}
            height={256}
            sizes="(max-width: 36rem) 42px, 50px"
            unoptimized
            priority
          />
          <span className="wordmark__name">{siteName}</span>
        </Link>

        <nav className="site-nav site-nav--desktop" aria-label="Primary navigation">
          <ul>{navigationItems}</ul>
        </nav>

        <details className="nav-disclosure">
          <summary className="menu-button">
            <span>Menu</span>
            <span className="menu-button__mark" aria-hidden="true">
              <span />
              <span />
            </span>
          </summary>
          <nav className="site-nav site-nav--mobile" aria-label="Primary navigation">
            <ul>{navigationItems}</ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
