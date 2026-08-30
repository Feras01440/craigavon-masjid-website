# Deployed environment — what is running right now

_Last updated: 30 August 2026. Keep this file truthful; it is the first stop during an incident._

## Site is down — first five checks

1. **Health endpoint**: `https://craigavon-masjid.vercel.app/api/health` — healthy is HTTP 200; 503
   names the failing dependency.
2. **Vercel status**: <https://www.vercel-status.com>; then the project's function logs: Vercel
   dashboard → `craigavon-masjid` → Observability → Logs.
3. **Supabase status**: <https://status.supabase.com>; then the project dashboard (project ref
   `qdcdkarbbfzdcctlvqjt`, region **eu-west-2**). The project is on a PAID-OR-FREE tier decision the
   committee owns — a free-tier project **pauses after a week of inactivity** and must be restored
   from the dashboard.
4. **Prayer data**: `https://craigavon-masjid.vercel.app/api/prayer?days=1` — 503 with
   `not_approved` means the published timetable window has lapsed: an administrator must publish the
   next window (Admin → Prayer times).
5. **Recent deploys**: Vercel dashboard → Deployments — roll back to the previous production
   deployment with "Promote" if a deploy broke the site.

## The facts

| Item                | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Live origin         | `https://craigavon-masjid.vercel.app`                                                                                              |
| Vercel project      | `craigavon-masjid` (id `prj_jMtqmis7DhSIWExvXEtf9eN8Xobt`, scope `feras-hrh`)                                                      |
| Function region     | `lhr1` (pinned in `vercel.json`, co-located with the database)                                                                     |
| Supabase project    | ref `qdcdkarbbfzdcctlvqjt`, region `eu-west-2`                                                                                     |
| Git branch deployed | `codex/production-platform-rebuild` (see PR #1; `main` still holds the retired static site until the PR is merged)                 |
| Deploy method       | `pnpm deploy:prod` after CI is green (break-glass manual path); Vercel Git integration is the intended steady state once connected |
| Custom domain       | none yet — indexing deliberately disabled until one exists                                                                         |

## Environment variables (set/unset only — never record values)

| Variable                               | Production        | Purpose                              |
| -------------------------------------- | ----------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | set               | Supabase origin                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | set               | anon key                             |
| `SUPABASE_SERVICE_ROLE_KEY`            | set               | server-mediated reads/writes         |
| `NEXT_PUBLIC_SITE_URL`                 | set               | canonical origin                     |
| `NEXT_PUBLIC_INDEXING_ENABLED`         | `false`           | robots/sitemap gate                  |
| `NEXT_PUBLIC_IDENTITY_APPROVED`        | `true`            | identity/structured data gate        |
| `NEXT_PUBLIC_DEMO_MODE`                | `false`           | demo banner + demo rows gate         |
| `ENQUIRY_TRUSTED_IP_HEADER`            | `x-forwarded-for` | enquiry rate limiting                |
| `ENQUIRY_FINGERPRINT_PEPPER`           | set               | enquiry abuse-prevention fingerprint |
| `CRON_SECRET`                          | set               | retention endpoint authorisation     |

Secret material lives only in the owner's local `C:\Users\feras\.deploy\` folder and in the Vercel
dashboard. Credential holders: the owner (feras07hrh@gmail.com). Adding a second technical owner is
an open launch-checklist item.

## Scheduled jobs

- **Enquiry retention**: `POST /api/cron/retention` with `Authorization: Bearer $CRON_SECRET`,
  invoked by the GitHub Actions workflow `.github/workflows/retention-cron.yml` (daily). If the
  workflow is disabled, retention simply does not run — enquiries are then deleted only manually.

## Caching model (summary — full detail in ADR-003)

Public pages are ISR-cached at the CDN (60s prayer surfaces / 300s content) and purged instantly by
admin publish actions. Admin and `/tv` are always rendered per-request. If a public page ever looks
stale beyond those windows, redeploying purges everything.
