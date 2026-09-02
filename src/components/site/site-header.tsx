"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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
  const disclosure = useRef<HTMLDetailsElement>(null);

  // Progressive enhancement on the no-JS <details> menu: close it again on
  // Escape or a tap outside, like any polished disclosure.
  useEffect(() => {
    const element = disclosure.current;
    if (!element) return;
    const close = () => element.removeAttribute("open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && element.open) close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (element.open && event.target instanceof Node && !element.contains(event.target)) close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  // Navigating closes the menu.
  useEffect(() => {
    disclosure.current?.removeAttribute("open");
  }, [pathname]);

  const items: PublicNavigationItem[] = [{ href: "/", label: "Home" }, ...navigation];
  const navigationItems = items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return (
      <li key={item.href}>
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          {item.label}
        </Link>
      </li>
    );
  });

  return (
    <header className="site-header">
      <div className="site-container site-header__inner">
        <Link className="wordmark" href="/" aria-label={`${siteName} — home`}>
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

        <details className="nav-disclosure" ref={disclosure}>
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
