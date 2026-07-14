import type { MetadataRoute } from "next";
import { getSiteUrl, indexingIsApproved } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  if (!siteUrl || !indexingIsApproved()) return [];
  const paths = [
    "/",
    "/prayer-times",
    "/visit",
    "/services",
    "/education",
    "/news",
    "/new-muslims",
    "/about",
    "/contact",
    "/policies",
    "/policies/privacy",
    "/policies/accessibility",
    "/policies/safeguarding",
    "/policies/complaints",
    "/policies/website-terms",
  ];
  return paths.map((path, index) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: index === 0 || path === "/prayer-times" ? "daily" : "weekly",
    priority: index === 0 ? 1 : path === "/prayer-times" ? 0.9 : 0.7,
  }));
}
