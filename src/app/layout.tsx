import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { SITE_DESCRIPTION, SITE_NAME } from "@/content/public-copy";
import { SiteStructuredData } from "@/components/site/site-structured-data";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

// Self-hosted, SIL OFL-licensed faces (see src/fonts/README.md). Fraunces
// (variable, true weights) carries public display headings and prayer
// numerals, Inter (variable) the UI and body text, and Amiri the Arabic
// prayer names and hold screens. Marcellus stays loaded solely for the TV
// display, which is pinned to its pre-redesign appearance.
const displayFace = localFont({
  src: "../fonts/fraunces-var-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-display-face",
  fallback: ["Georgia", "Times New Roman", "serif"],
});
const tvDisplayFace = localFont({
  src: "../fonts/marcellus-latin.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-marcellus-face",
  fallback: ["Georgia", "Times New Roman", "serif"],
  // Used only by the TV display; phones should not preload it.
  preload: false,
});
const bodyFace = localFont({
  src: "../fonts/inter-var-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-body-face",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
});
const arabicFace = localFont({
  src: [
    { path: "../fonts/amiri-regular-arabic.woff2", weight: "400", style: "normal" },
    { path: "../fonts/amiri-bold-arabic.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-arabic-face",
  fallback: ["serif"],
  // Small decorative Arabic strings; swap-in without blocking first paint.
  preload: false,
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  ...(siteUrl
    ? {
        openGraph: {
          type: "website" as const,
          siteName: SITE_NAME,
          title: SITE_NAME,
          description: SITE_DESCRIPTION,
          images: [{ url: "/brand/social-card.png", width: 1200, height: 630 }],
        },
        twitter: {
          card: "summary_large_image" as const,
          title: SITE_NAME,
          description: SITE_DESCRIPTION,
          images: ["/brand/social-card.png"],
        },
      }
    : {}),
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/brand/muslim-association-of-craigavon-logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: "/brand/muslim-association-of-craigavon-logo-192.png",
  },
  referrer: "strict-origin-when-cross-origin",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: "Craigavon Masjid",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#173a31",
};

// Public routes render through ISR and are shared-cached at the CDN; only
// /admin and /tv opt into per-request rendering (their own segment configs)
// and receive the per-request CSP nonce from proxy.ts. See
// docs/architecture/ADR-003-public-caching.md.

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      className={`${displayFace.variable} ${tvDisplayFace.variable} ${bodyFace.variable} ${arabicFace.variable}`}
      lang="en"
    >
      <body>
        <SiteStructuredData />
        {children}
      </body>
    </html>
  );
}
