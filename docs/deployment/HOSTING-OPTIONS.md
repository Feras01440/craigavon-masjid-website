# Hosting options for the committee

Three workable shapes, from smallest to most resilient. Exact prices change; check the providers'
current pricing pages before deciding and record the chosen tier in the committee minutes. No
figures are asserted here.

## 1. Minimum viable — free tiers

- **Vercel Hobby** for the application and **Supabase Free** for the database, Auth and Storage;
  Supabase's built-in email for the handful of committee sign-in messages; provider-managed HTTPS on
  the default `*.vercel.app` URL until a domain is purchased.
- **Fits**: the launch period and a small committee, at no recurring cost.
- **Accept the trade-offs**: a free Supabase project **pauses after about a week without traffic**
  (the site then fails closed until unpaused — the TV keeps its last cached day only); backups and
  point-in-time recovery are limited or absent, so the committee relies on the repository's logical
  backup script run by the technical owner; free-tier email is rate-limited and can be slow; no
  uptime commitments.
- **Not acceptable** once real enquiries (personal data) are enabled — the backup and retention
  promises in [BACKUP-AND-RESTORE.md](../security/BACKUP-AND-RESTORE.md) cannot be met on this tier.

## 2. Recommended — small paid tier

- **Supabase Pro** (removes pausing, adds daily backups with meaningful retention) with **Vercel
  Hobby or Pro**, plus a purchased domain and a transactional email provider (or the domain
  registrar's email forwarding) for sign-in messages with SPF/DKIM/DMARC set.
- **Fits**: normal operation after launch — the tier this platform's operational documents assume.
- **Trade-offs**: a modest monthly cost the committee must budget; PITR (point-in-time recovery) is
  usually an add-on — decide explicitly whether the enquiry queue justifies it.

## 3. Enhanced resilience

- Everything in tier 2 plus: PITR add-on, an isolated **staging** Supabase project for rehearsing
  migrations and upgrades, independent versioned object-storage copies of media in a separate
  provider/failure domain, and an external uptime monitor with alerting approved under the privacy
  policy.
- **Fits**: after the platform becomes the community's primary channel and the committee has a
  standing technical owner comfortable operating it.
- **Trade-offs**: more moving parts to keep patched and more credentials to govern; only worth it
  once tier 2 feels routine.

Whichever tier is chosen: the domain, registrar account, and both provider accounts must be owned by
Association-controlled logins (not a volunteer's personal account), with the technical owner and
backup both holding access.
