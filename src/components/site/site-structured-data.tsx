import { SITE_DESCRIPTION, SITE_NAME } from "@/content/public-copy";
import { getSiteUrl, indexingIsApproved } from "@/lib/site-url";

export function SiteStructuredData(): React.ReactNode {
  const siteUrl = getSiteUrl();
  if (!siteUrl || !indexingIsApproved() || process.env.NEXT_PUBLIC_IDENTITY_APPROVED !== "true") {
    return null;
  }
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": new URL("/#organization", siteUrl).toString(),
    name: SITE_NAME,
    url: siteUrl.toString(),
    description: SITE_DESCRIPTION,
    logo: new URL("/brand/muslim-association-of-craigavon-logo-512.png", siteUrl).toString(),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }}
    />
  );
}
