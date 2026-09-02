# Local product environment

This is the supported path for inspecting the complete product without production credentials. It
creates a loopback-only Supabase stack, replays every migration from zero, enables RLS, creates five
passwordless role accounts, and loads unmistakably labelled demonstration content.

## Prerequisites

- Git
- Node.js 22 (the version in `.node-version`)
- Corepack/pnpm 11.7.0
- Docker Desktop, or another Docker engine supported by the Supabase CLI, with at least 4 GB memory
  available

The repository pins the Supabase CLI as a development dependency. No global Supabase installation or
hosted Supabase project is required.

## Clean-clone setup

```powershell
git clone https://github.com/Feras01440/craigavon-masjid-website.git
Set-Location craigavon-masjid-website
git switch codex/production-platform-rebuild
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

Open <http://127.0.0.1:3000>. The setup command is intentionally destructive only to the local
Supabase containers: it starts the stack, runs `supabase db reset`, applies every migration, loads
the safe base seed, creates local Auth users, and then adds the labelled demonstration records. It
refuses non-loopback URLs and refuses to seed a database that is not in the expected clean local
shape.

`pnpm setup:local` writes a new ignored `.env.local` containing only local keys and randomly
generated local secrets. Never commit or share that file. Running the command again resets all local
data and creates fresh accounts, factors and one-time links.

## Local URLs

| Service                        | URL                                   |
| ------------------------------ | ------------------------------------- |
| Public website                 | <http://127.0.0.1:3000>               |
| Administration                 | <http://127.0.0.1:3000/admin/sign-in> |
| Supabase API                   | <http://127.0.0.1:54321>              |
| Supabase Studio                | <http://127.0.0.1:54323>              |
| Captured Auth email (Inbucket) | <http://127.0.0.1:54324>              |

Use `127.0.0.1` consistently. Mixing it with `localhost` creates different browser origins and can
invalidate Auth cookies or callbacks.

## Local administrator and role accounts

The setup output prints a one-time sign-in link for the local super administrator. It creates these
passwordless accounts:

| Email                          | Role                |
| ------------------------------ | ------------------- |
| `admin.local@example.test`     | Super administrator |
| `editor.local@example.test`    | Website editor      |
| `prayer.local@example.test`    | Prayer-times editor |
| `enquiries.local@example.test` | Enquiries manager   |
| `reviewer.local@example.test`  | Read-only reviewer  |

Set `LOCAL_ADMIN_EMAIL` before `pnpm setup:local` to replace only the first address. The account
still exists solely in the local containers and is tagged as local demonstration data.

Open the printed link, then visit **Security**, select **Set up authenticator**, and confirm a TOTP
code. Protected mutations require AAL2. To create a fresh one-time link for any local role account:

```powershell
pnpm local:link -- reviewer.local@example.test
```

Treat the output as a short-lived credential: open it directly and do not paste it into an issue,
screenshot, pull request or chat.

The normal sign-in screen also sends links to local Inbucket. Open <http://127.0.0.1:54324>, select
the newest message, and use its link once. No live SMTP service is involved.

## Demonstration data and replacement

The public site and dashboard show a development-only banner while `NEXT_PUBLIC_DEMO_MODE=true`.
Seeded records contain `[LOCAL DEMO]`, carry a database `demo_local_only` marker, and are returned
by public repositories only when the site URL and Supabase URL are both HTTP loopback addresses.
Production must set `NEXT_PUBLIC_DEMO_MODE=false`; marked rows are then excluded even if copied by
mistake.

The sample prayer calculation, congregation rules, two Jumu'ah sessions, dated override, Ramadan,
Eid and TV notice exist only to exercise the product. They are not religious or travel guidance.
Contact fields and policy approval remain private drafts rather than invented public facts.

Approved values later replace the demo through normal controls:

- **Website settings**: homepage, identity, contact/directions, navigation/footer, feature flags,
  enquiries and TV settings;
- **Prayer timetable**: create a bounded draft, edit rules/Jumu'ah/seasonal arrangements/overrides,
  preview, approve, then atomically publish or replace;
- **Content**: create approved announcements, events, recurring programmes, education, services,
  FAQs and policies, attach SEO fields and checked policy-download URLs, then publish; and
- **People and access**: invite named committee users, verify roles/MFA, then disable the local-only
  accounts by replacing the local database with the production project.

No code change is required for those replacements.

## Local storage and email

Uploads use the local private `media` Storage bucket. Raster images are signature-checked,
re-encoded, resized when needed, stripped of metadata and registered with required accessibility
metadata. Deleting the local containers deletes these objects. Approved policy documents can use a
checked site path or HTTPS download URL; arbitrary PDF upload remains fail-closed until production
malware scanning/quarantine is selected.

Supabase Auth mail is captured by Inbucket. The public enquiry workflow uses the private dashboard
queue and stays disabled until its privacy, retention, ownership and route-test settings are
approved and published.

## Verification and reset

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm exec supabase db lint --local --level warning --fail-on warning
pnpm exec supabase test db
```

Reset to a fresh demonstration product with `pnpm setup:local`. Stop the containers with:

```powershell
pnpm exec supabase stop --no-backup
```

## Troubleshooting

### Docker or setup does not start

Start Docker Desktop, wait until its engine is ready, then confirm `docker version`. Ensure ports
54320–54326 are free and Docker has sufficient memory. If a stale local stack exists, run
`pnpm exec supabase stop --no-backup`, then retry `pnpm setup:local`.

### The Supabase CLI cannot create its state directory

Confirm your user can write to its normal home-directory cache and that endpoint protection is not
blocking the pinned CLI. Do not run setup as an administrator merely to bypass a permissions error;
fix ownership or use an approved developer directory.

### A sign-in link returns to sign-in

Use the newest link only once, keep the browser on `http://127.0.0.1:3000`, and confirm the app was
restarted after setup. Generate another link with `pnpm local:link -- <local-email>` if necessary.

### A protected form says authenticator confirmation is needed

Visit `/admin/security`, enrol TOTP if necessary, and enter a current code. A magic link establishes
AAL1; publishing and other sensitive changes deliberately require AAL2.

### Prayer data is unavailable

Confirm the development banner is visible and `.env.local` contains `NEXT_PUBLIC_DEMO_MODE=true`. If
demo mode is off, local-only records are deliberately filtered. Never remove that filter or invent a
timetable to make the unavailable state disappear.

### Media upload fails

Confirm local Storage is running in `pnpm exec supabase status`, use a genuine JPEG/PNG/WebP/AVIF
under 10 MB, and supply meaningful alternative text unless the image is explicitly decorative.
