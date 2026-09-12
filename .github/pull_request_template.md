## Summary

<!-- Explain the user or operational outcome, not only the files changed. -->

## Why this change is needed

<!-- Link an issue or committee-confirmation item where one exists. -->

## Change type

- [ ] Public content or design
- [ ] Prayer times, congregation, Jumu'ah, Ramadan, Eid, or TV display
- [ ] Administration, authentication, permissions, or audit trail
- [ ] Enquiries, privacy, safeguarding, or policy
- [ ] Database schema, RLS, Storage, or migration
- [ ] Dependency, build, CI, deployment, or documentation

## Verification

<!-- List exact commands and manual checks. Do not mark a check complete unless it ran. -->

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:coverage`
- [ ] `pnpm build`
- [ ] Relevant Playwright projects
- [ ] Local Supabase migration reset/lint, if schema or policies changed
- [ ] Keyboard, screen-reader, zoom/reflow, and automated accessibility checks, if UI changed

## High-risk review

- [ ] No secret, production credential, enquiry content, private media, or personal data is included
      in source, logs, screenshots, fixtures, or artefacts.
- [ ] New or changed Server Actions, Route Handlers, tables, functions, and Storage paths have
      server-side authorisation and negative RLS tests.
- [ ] Prayer changes include committee-approved evidence, effective dates, invariant tests, a 30-day
      preview, TV/public parity, and rollback to a known-good revision.
- [ ] Database changes use a new reviewed migration and document backup, rollout, and
      rollback/forward-fix behavior.
- [ ] Cache invalidation and stale/offline fallback were tested where published content or prayer
      data changed.
- [ ] Unverified organisational, religious, contact, service, facility, or policy claims remain
      unpublished and are listed for committee confirmation.
- [ ] `CHANGELOG.md` and relevant operational documentation are updated, or the omission is
      explained below.

## Screenshots or evidence

<!-- Use synthetic/test data only. Include mobile and desktop evidence for visible changes. -->

## Rollout, rollback, and remaining risk

<!-- State environment-dependent settings, migrations, feature flags, cache effects, monitoring, and a safe rollback/forward-fix. Write “Not applicable” only with a reason. -->
