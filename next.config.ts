import type { NextConfig } from "next";

// Vercel's builder packages functions with its own file trace and rejects
// deployment packages containing symlinked directories, which the pnpm-store
// globs below produce. Standalone output and the sharp binary tracing exist
// for CI and self-hosted runs only, so both are skipped on Vercel.
const onVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  ...(onVercel
    ? {}
    : {
        output: "standalone" as const,
        // sharp's native binaries live in optional @img/* packages that the
        // standalone file trace misses under pnpm's layout on Linux; without them
        // the media action's module fails to load at runtime and every upload dies
        // in the admin error boundary. Copy them into the standalone output.
        outputFileTracingIncludes: {
          "/admin/**": [
            "./node_modules/.pnpm/**/node_modules/sharp/**",
            "./node_modules/.pnpm/**/node_modules/@img/**",
          ],
        },
      }),
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // Retired routes from the 2026 public redesign.
      { source: "/visit", destination: "/contact", permanent: true },
      { source: "/new-muslims", destination: "/services", permanent: true },
      // Month browsing moved from a query parameter to a path segment.
      {
        source: "/prayer-times",
        has: [{ type: "query", key: "month", value: "(?<month>\\d{4}-\\d{2})" }],
        destination: "/prayer-times/:month",
        permanent: true,
      },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/prayer-times.html", destination: "/prayer-times", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
      { source: "/contact.html", destination: "/contact", permanent: true },
      { source: "/services.html", destination: "/services", permanent: true },
      { source: "/education.html", destination: "/education", permanent: true },
      { source: "/new-to-islam.html", destination: "/new-muslims", permanent: true },
      { source: "/community.html", destination: "/news", permanent: true },
      { source: "/display.html", destination: "/tv", permanent: true },
    ];
  },
  async headers() {
    return [
      // Backdrop photography and brand marks change rarely and always under
      // a new filename, so the CDN and browsers may keep them for a week and
      // serve stale copies while revalidating.
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
