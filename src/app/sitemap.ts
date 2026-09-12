import type { MetadataRoute } from "next";
import { getSiteUrl, indexingIsApproved } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  if (!siteUrl || !indexingIsApproved()) return [];
  const paths = [
    "/",
    "/prayer-times",
    "/services",
    "/education",
    "/news",
    "/about",
    "/contact",
    "/policies",
    "/accessibility",
  ];
  return paths.map((path, index) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: index === 0 || path === "/prayer-times" ? "daily" : "weekly",
    priority: index === 0 ? 1 : path === "/prayer-times" ? 0.9 : 0.7,
  }));
}
