"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { PublicNavigationItem } from "@/server/repositories/public-site-settings";

export function SiteHeader({
  siteName,
  masjidName,
  navigation,
}: {
  siteName: string;
  masjidName: string;
  navigation: PublicNavigationItem[];
}) {
  const pathname = usePathname();
  const items: PublicNavigationItem[] = [{ href: "/", label: "Home" }, ...navigation];
  const navigationItems = items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return (
      <li key={item.href}>
        <Link href={item.href} prefetch={false} aria-current={active ? "page" : undefined}>
          {item.label}
        </Link>
      </li>
    );
  });

  return (
    <header className="site-header">
      <div className="site-container site-header__inner">
        <Link className="wordmark" href="/" prefetch={false} aria-label={`${siteName} — home`}>
          <img
            className="wordmark__logo"
            src="/brand/muslim-association-of-craigavon-logo-256.webp"
            alt=""
            aria-hidden="true"
            width={256}
            height={256}
            loading="eager"
            decoding="async"
          />
          <span className="wordmark__text">
            <span className="wordmark__name">{masjidName}</span>
            <span className="wordmark__organisation">{siteName}</span>
          </span>
        </Link>

        <nav className="site-nav site-nav--desktop" aria-label="Primary navigation">
          <ul>{navigationItems}</ul>
        </nav>

        <details className="nav-disclosure">
          <summary className="menu-button">
            <span className="menu-button__open">Menu</span>
            <span className="menu-button__close">Close</span>
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
