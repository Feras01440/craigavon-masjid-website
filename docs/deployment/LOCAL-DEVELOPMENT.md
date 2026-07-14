# Local development

This procedure recreates the application and database locally. It does not connect to production and
is not proof that a hosted environment works.

## Prerequisites

- Git
- Node.js 22, matching `.node-version` (the package minimum is 20.9, but development and CI should
  use the pinned major)
- pnpm 11.7.0, matching `package.json`
- Docker Desktop or another Docker-compatible engine supported by the Supabase CLI
- Supabase CLI 2.101.0, installed separately to match CI

The Supabase CLI is not a dependency in `package.json`; commands such as `pnpm db:reset` work only
when `supabase` is already on `PATH`. Follow the
[official local-development CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started)
and do not install an unreviewed global package under a misleading name.

## 1. Install locked application dependencies

From the repository root:

```powershell
node --version
pnpm --version
supabase --version
docker version
pnpm install --frozen-lockfile
```

Record failures instead of falling back to an unlocked install. A lockfile change should be
intentional and reviewed.

## 2. Start and rebuild local Supabase

```powershell
supabase start
supabase db reset
supabase status
```

`supabase db reset` deletes and recreates the **local** database, applies every file in
`supabase/migrations`, and loads `supabase/seed.sql`. Never run a reset command against a production
connection string.

The seed adds only draft feature/readiness settings. It intentionally does not add public
announcements, events, services, contacts, administrator accounts, or prayer times.

Local services normally include the API, database, Studio, and a mail catcher. Use the URLs printed
by `supabase status`; do not rely on memorised ports if the CLI reports different values.

## 3. Configure the local environment

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local` with the local API URL, publishable/anonymous key, and service-role key printed by
the local stack:

```dotenv
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=<local API URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable or anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service-role key>
NEXT_PUBLIC_INDEXING_ENABLED=false
NEXT_PUBLIC_IDENTITY_APPROVED=false
ENQUIRY_TRUSTED_IP_HEADER=x-forwarded-for
ENQUIRY_FINGERPRINT_PEPPER=<random local test secret>
CRON_SECRET=<random value of at least 32 characters>
```

Use `http://127.0.0.1:3000` consistently because `pnpm dev` binds to that address. Mixing
`localhost` and `127.0.0.1` can break Auth allow-lists and cookies even though both reach the same
computer.

Keep both public release gates false locally. The enquiry variables are needed only when exercising
the form behind a trusted local proxy; otherwise the form stays off. `CRON_SECRET` protects the
retention POST route. The optional monitoring variable remains inactive until a provider integration
is implemented.

Never paste `supabase status` output into an issue, screenshot, chat, or committed file: it includes
privileged local credentials.

## 4. Verify the local Auth callback before testing sign-in

The checked-in `supabase/config.toml` uses `http://127.0.0.1:3000` as its Site URL and allows the
implemented `/admin/auth/callback` route on both `127.0.0.1` and `localhost`. Set
`NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` in `.env.local` so the application and recommended
local origin use the same value, then verify that the effective Auth configuration includes:

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/admin/auth/callback
```

If you intentionally change `supabase/config.toml`, restart the local stack. Use one origin
consistently for each test. Production Auth URLs are configured separately in Supabase and must use
the exact deployed HTTPS origin.

## 5. Create a local-only first administrator

There is no administrator seed because bootstrap authority must not be fabricated. For local
verification only, create the first synthetic administrator as follows; later accounts can be
managed through `/admin/users` after AAL2 confirmation:

1. In local Supabase Studio, create or invite a synthetic Auth user with an email address that does
   not identify a real person.
2. Copy the new `auth.users.id` UUID.
3. In the local SQL editor, insert the bootstrap profile and invitation in one transaction,
   replacing all placeholders:

```sql
begin;

insert into public.admin_profiles (
  id, display_name, role, status, mfa_required, invited_by
) values (
  '<AUTH-USER-UUID>',
  'Local Super Admin',
  'super_admin',
  'invited',
  true,
  '<AUTH-USER-UUID>'
);

insert into public.admin_invites (
  email, role, invited_by, expires_at
) values (
  'admin-local@example.invalid',
  'super_admin',
  '<AUTH-USER-UUID>',
  now() + interval '7 days'
);

commit;
```

4. Open `/admin/sign-in`, request a link for the same lowercase address, and open the newest message
   in the local mail catcher.
5. The first accepted link changes the profile from `invited` to `active` and marks the invitation
   accepted.
6. Open **Security**, enrol a TOTP factor, and confirm AAL2 before testing mutations.

If any statement fails, roll back and inspect the Auth user, lowercase email, UUID, and existing
profile before retrying. Do not weaken RLS, enable public sign-up, or put a service-role key in
browser code to bypass setup.

## 6. Run the application

```powershell
pnpm dev
```

Open `http://127.0.0.1:3000`. Useful routes are:

- `/` — public home
- `/prayer-times` — public timetable and unavailable state
- `/api/prayer?days=1` — prayer API; returns `503` until an approved configuration exists
- `/api/health` — configuration/database reachability probe; returns `503` until Supabase is set
- `/tv` — display mode
- `/admin/sign-in` — committee sign-in
- `/admin/content` — protected content management
- `/admin/settings` — protected controlled public configuration
- `/admin/prayer-times` — protected draft, preview, publish and withdrawal/replacement workflow
- `/admin/audit` — protected metadata-only audit history
- `/admin/security` — protected TOTP enrolment/confirmation

The missing prayer configuration is intentional. Do not insert guessed settings merely to make the
unavailable state disappear.

## 7. Verification commands

Run checks separately so the evidence shows which stage failed:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
supabase db lint --local --level warning
```

`pnpm test:e2e` runs the committed Playwright journeys across phone, tablet, desktop and TV
projects. Browser availability differs by machine, so record the exact projects, browser channels,
test count and result from the current run.

`pnpm test:coverage` enforces 80% global thresholds over configured library/server files. Its
current result must be recorded; the existence of thresholds is not evidence they pass.

## 8. Reset or stop

Use a reset when migration/seed changes need a clean replay:

```powershell
supabase db reset
```

Stop the local stack when finished:

```powershell
supabase stop
```

Keep `.env.local`, Supabase CLI state, coverage output, Playwright output, and `.next` out of Git.

## Troubleshooting

### Administration says it is not configured

Check that all four required values are present in the running process and restart `pnpm dev` after
editing `.env.local`. Keep the service-role key server-only.

### The sign-in link returns to the sign-in page

Check, in order:

1. the browser origin exactly matches `NEXT_PUBLIC_SITE_URL`;
2. the callback URL is in the Auth allow-list;
3. the Auth user UUID matches `admin_profiles.id`;
4. the profile is `invited` or `active`, not `disabled`;
5. an invited profile has a matching lowercase, unexpired, unrevoked invite; and
6. the newest link was used only once.

### Prayer API returns 503

This is expected when configuration is absent, unapproved, invalid, outside its effective dates, or
Supabase is unavailable. Read the JSON `reason`; never convert a safety failure to a fabricated
timetable.

### A dashboard navigation link is absent

Admin navigation is role-aware. Confirm the synthetic profile role and server-enforced permission;
do not broaden the role merely to expose a screen.
