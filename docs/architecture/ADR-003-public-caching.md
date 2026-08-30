# ADR-003 — Public pages are CDN-cached; the per-request CSP nonce is scoped to admin and TV

Date: 2026-08-30 · Status: accepted · Supersedes the caching claims in ADR-001

## Context

The original architecture generated a fresh CSP nonce in `src/proxy.ts` for every request and forced
the root layout dynamic so the nonce could reach the markup. The measured consequences on the
deployed site (30 Aug 2026):

- first request after idle: **12.4s** (serverless cold start);
- warm HTML: **580–1000ms** TTFB;
- `Cache-Control: no-store` and `x-vercel-cache: MISS` on 100% of public requests — every visitor
  paid a full render plus 3–8 Supabase queries.

A masjid site's load is spiky by nature (Jumuʿah, Ramadan). Coupling every page view to a function
invocation and database round trips fails exactly when the community needs the site most, and
contradicts the repo's own 800ms budget.

## Decision

1. **Public routes render through ISR** (`revalidate = 60` on prayer-bearing pages, `300` elsewhere)
   and are cached by the Vercel CDN. Supabase reads in the public repositories use the data cache
   with tags (`prayer-data`, `public-content`, `public-site-settings`, `enquiry-availability`);
   every publish/update action calls `revalidateTag(tag, "max")` plus `revalidatePath`, so committee
   edits appear within one request of publishing.
2. **The CSP nonce is scoped to `/admin` and `/tv`** (which stay per-request dynamic). Cached public
   HTML cannot carry a per-request nonce: middleware runs on every request — including CDN hits — so
   it would stamp a fresh-nonce header onto cached markup holding the old nonce and block every
   script. Public routes therefore use a static policy with `script-src 'self' 'unsafe-inline'` (all
   other directives unchanged). The app injects no inline event handlers and no third-party scripts;
   the weakened directive covers only the framework's own bootstrap. Revisit if Next.js ships
   hash-based CSP support for static output.
3. **Anonymous requests skip auth machinery.** The middleware only runs Supabase session validation
   when an `sb-*` cookie is present, and responses that rotate cookies stay `private, no-store`.
4. **Transient fetch failures throw during regeneration** (`throwOnTransientError` in the prayer
   repository): a failed background rebuild keeps the last good cached page instead of replacing it
   with an apology card. Genuinely-unpublished data still renders fail-closed. Missing environment
   configuration never throws, so the env-less CI build prerenders fail-closed pages successfully.
5. **Functions are pinned to `lhr1`** (`vercel.json`) beside the eu-west-2 Supabase database, and
   TV-only/Arabic fonts no longer preload on phones.

## Consequences

- Steady-state public traffic is served by the CDN; cold starts are invisible except to the first
  visitor after a deploy.
- Prayer pages can be at most ~60s stale; the live "next prayer" behaviour is client-side (shared
  `useNow` clock), so cached HTML never shows a stale countdown or highlight.
- Nonce reuse windows do not exist (public pages have no nonce at all); admin/TV keep the strongest
  policy.
- Route handlers (`/api/prayer`, `/api/display`, media) declare their own `s-maxage`; their CDN
  entries expire by age rather than tag purge.
- CI's e2e job builds without Supabase env and exercises build-time fail-closed prerenders — a
  deliberate, tested configuration.
- Admin and user-scoped reads must never opt into the data cache (`cache: "no-store"` stays); the
  tag-cached rows are service-role public projections only.
