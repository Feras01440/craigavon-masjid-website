import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SITE_DESCRIPTION, SITE_NAME } from "@/content/public-copy";
import { SiteStructuredData } from "@/components/site/site-structured-data";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

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
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#173a31",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <SiteStructuredData />
        {children}
      </body>
    </html>
  );
}
