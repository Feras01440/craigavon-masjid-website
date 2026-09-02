-- Muslim Association of Craigavon platform
-- Initial content, prayer, administration, enquiry and media schema.

create extension if not exists pgcrypto;

create type public.admin_role as enum (
  'super_admin',
  'website_editor',
  'prayer_editor',
  'enquiries_manager',
  'reviewer'
);

create type public.account_status as enum ('invited', 'active', 'disabled');
create type public.content_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.content_kind as enum (
  'page',
  'announcement',
  'emergency_notice',
  'event',
  'recurring_programme',
  'education',
  'service',
  'faq',
  'policy',
  'navigation',
  'social_link',
  'donation_appeal'
);
create type public.media_status as enum ('draft', 'published', 'archived');
create type public.prayer_key as enum ('fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha');
create type public.enquiry_status as enum (
  'new',
  'in_progress',
  'awaiting_response',
  'closed',
  'deleted'
);

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  role public.admin_role not null default 'reviewer',
  status public.account_status not null default 'invited',
  mfa_required boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disabled_account_has_timestamp check (
    (status = 'disabled' and disabled_at is not null)
    or (status <> 'disabled' and disabled_at is null)
  )
);

create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  role public.admin_role not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, created_at),
  constraint invite_expiry_after_creation check (expires_at > created_at),
  constraint invite_not_accepted_and_revoked check (
    accepted_at is null or revoked_at is null
  )
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,80}$'),
  value jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_status_is_supported check (
    status in ('draft', 'published', 'archived')
  ),
  constraint published_settings_have_metadata check (
    status <> 'published' or (published_by is not null and published_at is not null)
  )
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  kind public.content_kind not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  summary text check (summary is null or char_length(summary) <= 500),
  body jsonb not null default '{}'::jsonb,
  category text check (category is null or char_length(category) <= 80),
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  publish_at timestamptz,
  expires_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_schedule_is_valid check (
    expires_at is null or publish_at is null or expires_at > publish_at
  ),
  constraint approved_content_has_metadata check (
    status not in ('published', 'scheduled')
    or (
      published_by is not null
      and published_at is not null
      and (status <> 'scheduled' or publish_at is not null)
    )
  )
);

create unique index content_items_active_slug_idx
  on public.content_items(kind, slug)
  where deleted_at is null;
create index content_items_publication_idx
  on public.content_items(status, publish_at, expires_at)
  where deleted_at is null;
create index content_items_kind_updated_idx
  on public.content_items(kind, updated_at desc)
  where deleted_at is null;

create table public.content_revisions (
  id bigint generated always as identity primary key,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (content_item_id, version)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  object_path text not null unique,
  original_name text not null check (char_length(original_name) <= 255),
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text check (alt_text is null or char_length(alt_text) <= 500),
  decorative boolean not null default false,
  caption text check (caption is null or char_length(caption) <= 1000),
  credit text check (credit is null or char_length(credit) <= 300),
  status public.media_status not null default 'draft',
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_dimensions_present check (
    width is not null and height is not null
  ),
  constraint meaningful_image_has_alt check (
    decorative or nullif(trim(alt_text), '') is not null
  ),
  constraint decorative_image_has_no_alt check (
    not decorative or coalesce(alt_text, '') = ''
  )
);

create table public.media_usage (
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  field_path text not null check (char_length(field_path) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (media_asset_id, content_item_id, field_path)
);

create table public.prayer_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  status public.content_status not null default 'draft',
  effective_from date not null,
  effective_to date,
  timezone text not null default 'Europe/London',
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  calculation_method text not null check (char_length(calculation_method) between 1 and 80),
  madhab text not null check (madhab in ('standard', 'hanafi')),
  high_latitude_rule text not null check (
    high_latitude_rule in ('middle_of_night', 'seventh_of_night', 'twilight_angle')
  ),
  adjustments jsonb not null default '{}'::jsonb,
  congregation_rules jsonb not null default '{}'::jsonb,
  hijri_adjustment smallint not null default 0 check (hijri_adjustment between -1 and 1),
  source_name text not null check (char_length(source_name) between 1 and 200),
  source_reference text check (source_reference is null or char_length(source_reference) <= 500),
  calculation_library text not null default 'adhan',
  calculation_library_version text not null,
  version integer not null default 1 check (version > 0),
  approval_note text check (approval_note is null or char_length(approval_note) <= 1000),
  approved_by uuid references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_effective_range check (
    effective_to is null or effective_to >= effective_from
  ),
  constraint published_prayer_settings_are_approved check (
    status <> 'published'
    or (approved_by is not null and published_at is not null and approval_note is not null)
  ),
  constraint published_prayer_horizon_is_bounded check (
    status <> 'published'
    or (
      effective_to is not null
      and effective_to - effective_from between 0 and 365
    )
  )
);

create unique index prayer_settings_one_published_range_idx
  on public.prayer_settings(effective_from, coalesce(effective_to, 'infinity'::date))
  where status = 'published';
alter table public.prayer_settings
  add constraint prayer_settings_published_ranges_do_not_overlap
  exclude using gist (
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') with &&
  ) where (status = 'published');
create index prayer_settings_current_idx
  on public.prayer_settings(status, effective_from, effective_to);

create table public.prayer_settings_revisions (
  id bigint generated always as identity primary key,
  prayer_settings_id uuid not null references public.prayer_settings(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  reason text check (reason is null or char_length(reason) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (prayer_settings_id, version)
);

create table public.jumuah_sessions (
  id uuid primary key default gen_random_uuid(),
  prayer_settings_id uuid not null references public.prayer_settings(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  khutbah_time time not null,
  prayer_time time,
  display_order smallint not null default 1 check (display_order between 1 and 20),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prayer_settings_id, display_order),
  constraint jumuah_prayer_after_khutbah check (
    prayer_time is null or prayer_time >= khutbah_time
  )
);

create table public.prayer_overrides (
  id uuid primary key default gen_random_uuid(),
  prayer_settings_id uuid not null references public.prayer_settings(id) on delete cascade,
  prayer_date date not null,
  prayer public.prayer_key not null,
  begins_at time,
  congregation_at time,
  unavailable boolean not null default false,
  reason text not null check (char_length(reason) between 1 and 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prayer_settings_id, prayer_date, prayer),
  constraint override_has_value check (
    unavailable or begins_at is not null or congregation_at is not null
  ),
  constraint unavailable_override_has_no_times check (
    not unavailable or (begins_at is null and congregation_at is null)
  )
);

create table public.seasonal_arrangements (
  id uuid primary key default gen_random_uuid(),
  prayer_settings_id uuid not null references public.prayer_settings(id) on delete cascade,
  kind text not null check (kind in ('ramadan', 'eid_al_fitr', 'eid_al_adha', 'closure', 'other')),
  title text not null check (char_length(title) between 1 and 160),
  starts_on date not null,
  ends_on date not null,
  details jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasonal_range_is_valid check (ends_on >= starts_on)
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (
    kind in ('general', 'visit', 'new_muslim_support', 'service', 'volunteering', 'class_interest')
  ),
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  message text not null check (char_length(message) between 10 and 5000),
  privacy_notice_version text not null check (char_length(privacy_notice_version) <= 40),
  status public.enquiry_status not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  source_fingerprint text,
  retention_until date not null,
  closed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiry_has_contact_route check (
    nullif(trim(coalesce(email, '')), '') is not null
    or nullif(trim(coalesce(phone, '')), '') is not null
  ),
  constraint closed_enquiry_has_timestamp check (
    status not in ('closed', 'deleted') or closed_at is not null
  )
);

create index enquiries_work_queue_idx
  on public.enquiries(status, created_at)
  where deleted_at is null;
create index enquiries_retention_idx
  on public.enquiries(retention_until)
  where deleted_at is null;

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path ~ '^/'),
  to_path text not null check (to_path ~ '^/' or to_path ~ '^https://'),
  status_code smallint not null default 308 check (status_code in (301, 302, 307, 308)),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 100),
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log(actor_id, created_at desc);

create table public.rate_limits (
  key_hash text not null,
  action text not null,
  window_started_at timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (key_hash, action, window_started_at)
);

create index rate_limits_expiry_idx on public.rate_limits(updated_at);

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.admin_profiles
  where id = auth.uid()
    and status = 'active'
$$;

create or replace function public.has_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create or replace function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_admin_role()
    when 'super_admin' then true
    when 'website_editor' then permission = any(array[
      'admin:access', 'content:read', 'content:write', 'content:publish',
      'media:read', 'media:write', 'prayer:read', 'audit:read'
    ])
    when 'prayer_editor' then permission = any(array[
      'admin:access', 'content:read', 'prayer:read', 'prayer:write',
      'prayer:publish', 'audit:read'
    ])
    when 'enquiries_manager' then permission = any(array[
      'admin:access', 'content:read', 'enquiries:read', 'enquiries:write'
    ])
    when 'reviewer' then permission = any(array[
      'admin:access', 'content:read', 'media:read', 'prayer:read', 'audit:read'
    ])
    else false
  end
$$;

create or replace function public.establish_trusted_admin_actor(
  p_actor_id uuid,
  p_permission text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null then
    raise exception 'A trusted administrative actor is required.' using errcode = '42501';
  end if;

  -- These claims exist only for the current service-role transaction. They preserve
  -- the already-authenticated AAL2 actor in triggers and audit records.
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'role', 'service_role', 'aal', 'aal2')::text,
    true
  );

  if not public.has_permission(p_permission) or not public.has_aal2() then
    raise exception 'The trusted actor is not authorised for this operation.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.version_content_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.content_revisions (
    content_item_id, version, snapshot, created_by
  ) values (
    old.id, old.version, to_jsonb(old), auth.uid()
  );
  new.version = old.version + 1;
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_content_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('published', 'scheduled') then
    if not public.has_permission('content:publish') or not public.has_aal2() then
      raise exception 'Publishing content requires an authorised account with MFA.' using errcode = '42501';
    end if;
    if new.status = 'scheduled' and (new.publish_at is null or new.publish_at <= now()) then
      raise exception 'Scheduled content requires a future publication time.';
    end if;
    new.published_by = auth.uid();
    new.published_at = now();
  else
    new.published_by = null;
    new.published_at = null;
  end if;
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  end if;
  new.updated_by = auth.uid();
  return new;
end;
$$;

create or replace function public.version_and_enforce_site_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'scheduled' then
    raise exception 'Site settings cannot be scheduled; save a draft or publish it now.';
  end if;

  if new.status = 'published' then
    if not public.has_permission('content:publish') or not public.has_aal2() then
      raise exception 'Publishing site settings requires an authorised account with MFA.' using errcode = '42501';
    end if;
    new.published_by = auth.uid();
    new.published_at = now();
  else
    new.published_by = null;
    new.published_at = null;
  end if;

  if tg_op = 'INSERT' then
    new.version = 1;
    new.created_by = auth.uid();
  else
    new.version = old.version + 1;
    new.created_by = old.created_by;
  end if;

  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.save_site_setting(
  p_actor_id uuid,
  p_key text,
  p_expected_version integer,
  p_status public.content_status,
  p_value jsonb
)
returns table (setting_key text, setting_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_version integer;
begin
  perform public.establish_trusted_admin_actor(p_actor_id, 'content:write');
  if p_status = 'published' and not public.has_permission('content:publish') then
    raise exception 'The trusted actor cannot publish site settings.' using errcode = '42501';
  end if;
  if p_key not in (
    'site_identity', 'contact_information', 'navigation_footer',
    'tv_display', 'feature_flags', 'enquiry_configuration'
  ) or p_status not in ('draft', 'published', 'archived')
    or jsonb_typeof(p_value) <> 'object' then
    raise exception 'The site-setting payload is invalid.' using errcode = '22023';
  end if;

  if p_expected_version is null then
    insert into public.site_settings (key, value, status)
    values (p_key, p_value, p_status)
    returning key, version into v_key, v_version;
  else
    update public.site_settings
    set value = p_value, status = p_status
    where key = p_key and version = p_expected_version
    returning key, version into v_key, v_version;
    if not found then
      raise exception 'This setting changed; reload before saving.' using errcode = '40001';
    end if;
  end if;

  return query select v_key, v_version;
end;
$$;

create or replace function public.version_prayer_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'published' and not (
    new.status = 'archived'
    and current_setting('app.prayer_withdrawal_authorised', true) = 'true'
  ) then
    raise exception 'Published prayer settings are immutable; create a new draft revision.';
  end if;
  insert into public.prayer_settings_revisions (
    prayer_settings_id, version, snapshot, reason, created_by
  ) values (
    old.id,
    old.version,
    jsonb_build_object(
      'settings', to_jsonb(old),
      'jumuah_sessions', coalesce((
        select jsonb_agg(to_jsonb(session_row) order by session_row.display_order)
        from public.jumuah_sessions session_row
        where session_row.prayer_settings_id = old.id
      ), '[]'::jsonb),
      'overrides', coalesce((
        select jsonb_agg(to_jsonb(override_row) order by override_row.prayer_date, override_row.prayer)
        from public.prayer_overrides override_row
        where override_row.prayer_settings_id = old.id
      ), '[]'::jsonb),
      'seasonal_arrangements', coalesce((
        select jsonb_agg(to_jsonb(arrangement_row) order by arrangement_row.starts_on, arrangement_row.title)
        from public.seasonal_arrangements arrangement_row
        where arrangement_row.prayer_settings_id = old.id
      ), '[]'::jsonb)
    ),
    nullif(current_setting('app.prayer_revision_reason', true), ''),
    auth.uid()
  );
  new.version = old.version + 1;
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_published_prayer_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_id uuid;
  parent_status public.content_status;
begin
  parent_id = coalesce(new.prayer_settings_id, old.prayer_settings_id);
  select status into parent_status
  from public.prayer_settings
  where id = parent_id;
  if parent_status = 'published' then
    raise exception 'Published prayer settings are immutable; create a new draft revision.';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id text;
begin
  row_id = coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'key');
  insert into public.audit_log (
    actor_id, action, entity_type, entity_id, before_state, after_state
  ) values (
    auth.uid(), lower(tg_op), tg_table_name, row_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_enquiry_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (
      actor_id, action, entity_type, entity_id, before_state, after_state
    ) values (
      auth.uid(), 'delete', 'enquiries', old.id::text,
      jsonb_build_object(
        'status', old.status,
        'assigned_to', old.assigned_to,
        'retention_until', old.retention_until
      ),
      null
    );
    return old;
  end if;

  insert into public.audit_log (
    actor_id, action, entity_type, entity_id, before_state, after_state
  ) values (
    auth.uid(), lower(tg_op), 'enquiries', coalesce(new.id, old.id)::text,
    case when tg_op = 'UPDATE' then jsonb_build_object(
      'status', old.status, 'assigned_to', old.assigned_to, 'retention_until', old.retention_until
    ) else null end,
    jsonb_build_object(
      'status', new.status, 'assigned_to', new.assigned_to, 'retention_until', new.retention_until
    )
  );
  return new;
end;
$$;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer default 900
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz;
  current_attempts integer;
  current_block timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 or p_block_seconds < 1 then
    raise exception 'Invalid rate-limit configuration.';
  end if;

  -- Retain only the short-lived pseudonymous state needed to enforce active limits.
  delete from public.rate_limits
  where updated_at < now() - interval '48 hours'
    and (blocked_until is null or blocked_until <= now());

  select max(blocked_until) into current_block
  from public.rate_limits
  where key_hash = p_key_hash
    and action = p_action
    and blocked_until > now();
  if current_block is not null then
    return query select
      false,
      0,
      ceil(extract(epoch from current_block - now()))::integer;
    return;
  end if;

  current_window = to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (key_hash, action, window_started_at)
  values (p_key_hash, p_action, current_window)
  on conflict (key_hash, action, window_started_at)
  do update set
    attempts = public.rate_limits.attempts + 1,
    blocked_until = case
      when public.rate_limits.attempts + 1 > p_limit
        then greatest(coalesce(public.rate_limits.blocked_until, now()), now() + make_interval(secs => p_block_seconds))
      else public.rate_limits.blocked_until
    end,
    updated_at = now()
  returning attempts, blocked_until into current_attempts, current_block;

  return query select
    current_attempts <= p_limit and (current_block is null or current_block <= now()),
    greatest(p_limit - current_attempts, 0),
    case when current_block > now()
      then ceil(extract(epoch from current_block - now()))::integer
      else 0
    end;
end;
$$;

create or replace function public.purge_expired_operational_data()
returns table (enquiries_purged bigint, rate_limits_purged bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enquiries bigint;
  v_rate_limits bigint;
begin
  delete from public.enquiries
  where retention_until <= (now() at time zone 'UTC')::date;
  get diagnostics v_enquiries = row_count;

  delete from public.rate_limits
  where updated_at < now() - interval '48 hours'
    and (blocked_until is null or blocked_until <= now());
  get diagnostics v_rate_limits = row_count;

  return query select v_enquiries, v_rate_limits;
end;
$$;

create or replace function public.register_media_asset(
  p_object_path text,
  p_original_name text,
  p_mime_type text,
  p_byte_size bigint,
  p_width integer,
  p_height integer,
  p_alt_text text,
  p_decorative boolean,
  p_caption text,
  p_credit text,
  p_status public.media_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.has_permission('media:write') or not public.has_aal2() then
    raise exception 'Media registration requires an authorised account with MFA.' using errcode = '42501';
  end if;
  if p_status not in ('draft', 'published') then
    raise exception 'A new media asset must be draft or published.';
  end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/avif') then
    raise exception 'Only server-processed raster images can be registered.';
  end if;
  if not starts_with(p_object_path, auth.uid()::text || '/')
    or char_length(p_object_path) > 500
    or p_original_name is null
    or char_length(p_original_name) not between 1 and 255 then
    raise exception 'The media object identity is invalid.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'media' and name = p_object_path
  ) then
    raise exception 'The processed media object was not found.' using errcode = 'P0002';
  end if;

  insert into public.media_assets (
    bucket, object_path, original_name, mime_type, byte_size, width, height,
    alt_text, decorative, caption, credit, status, uploaded_by
  ) values (
    'media', p_object_path, p_original_name, p_mime_type, p_byte_size, p_width, p_height,
    nullif(trim(p_alt_text), ''), p_decorative, nullif(trim(p_caption), ''),
    nullif(trim(p_credit), ''), p_status, auth.uid()
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_media_asset_status(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_status public.media_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.has_permission('media:write') or not public.has_aal2() then
    raise exception 'Media changes require an authorised account with MFA.' using errcode = '42501';
  end if;
  if p_status = 'archived' and exists (
    select 1 from public.media_usage where media_asset_id = p_id
  ) then
    raise exception 'This asset is still referenced by content.' using errcode = '23503';
  end if;
  update public.media_assets
  set status = p_status,
      deleted_at = case when p_status = 'archived' then now() else null end
  where id = p_id and updated_at = p_expected_updated_at
  returning id into v_id;
  if v_id is null then
    raise exception 'This media asset changed; reload before saving.' using errcode = '40001';
  end if;
  return v_id;
end;
$$;

create or replace function public.save_prayer_draft(
  p_id uuid,
  p_expected_version integer,
  p_payload jsonb,
  p_jumuah jsonb
)
returns table (settings_id uuid, settings_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_version integer;
  v_status public.content_status;
begin
  if not public.has_permission('prayer:write') or not public.has_aal2() then
    raise exception 'Prayer editing requires an authorised account with MFA.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_jumuah, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_jumuah, '[]'::jsonb)) > 10 then
    raise exception 'Friday prayer sessions must be an array with at most 10 entries.';
  end if;

  if p_id is null then
    insert into public.prayer_settings (
      name, status, effective_from, effective_to, timezone, latitude, longitude,
      calculation_method, madhab, high_latitude_rule, adjustments, congregation_rules,
      hijri_adjustment, source_name, source_reference, calculation_library,
      calculation_library_version, created_by, updated_by
    ) values (
      p_payload ->> 'name',
      'draft',
      (p_payload ->> 'effective_from')::date,
      (p_payload ->> 'effective_to')::date,
      p_payload ->> 'timezone',
      (p_payload ->> 'latitude')::numeric,
      (p_payload ->> 'longitude')::numeric,
      p_payload ->> 'calculation_method',
      p_payload ->> 'madhab',
      p_payload ->> 'high_latitude_rule',
      p_payload -> 'adjustments',
      p_payload -> 'congregation_rules',
      (p_payload ->> 'hijri_adjustment')::smallint,
      p_payload ->> 'source_name',
      nullif(trim(p_payload ->> 'source_reference'), ''),
      p_payload ->> 'calculation_library',
      p_payload ->> 'calculation_library_version',
      auth.uid(),
      auth.uid()
    ) returning id, version into v_id, v_version;
  else
    select status, version into v_status, v_version
    from public.prayer_settings
    where id = p_id
    for update;
    if not found then
      raise exception 'Prayer settings were not found.' using errcode = 'P0002';
    end if;
    if v_status = 'published' then
      raise exception 'Published prayer settings are immutable; create a new draft.';
    end if;
    if p_expected_version is null or v_version <> p_expected_version then
      raise exception 'Prayer settings changed while you were editing.' using errcode = '40001';
    end if;

    update public.prayer_settings set
      name = p_payload ->> 'name',
      status = 'draft',
      effective_from = (p_payload ->> 'effective_from')::date,
      effective_to = (p_payload ->> 'effective_to')::date,
      timezone = p_payload ->> 'timezone',
      latitude = (p_payload ->> 'latitude')::numeric,
      longitude = (p_payload ->> 'longitude')::numeric,
      calculation_method = p_payload ->> 'calculation_method',
      madhab = p_payload ->> 'madhab',
      high_latitude_rule = p_payload ->> 'high_latitude_rule',
      adjustments = p_payload -> 'adjustments',
      congregation_rules = p_payload -> 'congregation_rules',
      hijri_adjustment = (p_payload ->> 'hijri_adjustment')::smallint,
      source_name = p_payload ->> 'source_name',
      source_reference = nullif(trim(p_payload ->> 'source_reference'), ''),
      calculation_library = p_payload ->> 'calculation_library',
      calculation_library_version = p_payload ->> 'calculation_library_version',
      approval_note = null,
      approved_by = null,
      published_at = null
    where id = p_id and version = p_expected_version
    returning id, version into v_id, v_version;
    if not found then
      raise exception 'Prayer settings changed while you were editing.' using errcode = '40001';
    end if;
    delete from public.jumuah_sessions where prayer_settings_id = v_id;
  end if;

  insert into public.jumuah_sessions (
    prayer_settings_id, label, khutbah_time, prayer_time, display_order, notes
  )
  select
    v_id,
    session_item ->> 'label',
    (session_item ->> 'khutbah_time')::time,
    (session_item ->> 'prayer_time')::time,
    (session_item ->> 'display_order')::smallint,
    nullif(trim(session_item ->> 'notes'), '')
  from jsonb_array_elements(coalesce(p_jumuah, '[]'::jsonb)) session_item;

  return query select v_id, v_version;
end;
$$;

create or replace function public.publish_prayer_settings(
  p_actor_id uuid,
  p_id uuid,
  p_expected_version integer,
  p_approval_note text
)
returns table (settings_id uuid, settings_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_version integer;
begin
  perform public.establish_trusted_admin_actor(p_actor_id, 'prayer:publish');
  if not public.has_permission('prayer:publish') or not public.has_aal2() then
    raise exception 'Prayer publication requires an authorised account with MFA.' using errcode = '42501';
  end if;
  if nullif(trim(p_approval_note), '') is null or char_length(p_approval_note) > 1000 then
    raise exception 'Record a concise committee approval note.';
  end if;
  if exists (
    select 1
    from public.prayer_settings
    where id = p_id
      and (
        effective_to is null
        or effective_to - effective_from not between 0 and 365
      )
  ) then
    raise exception 'Prayer publication requires a bounded effective period of at most 366 days.'
      using errcode = '22023';
  end if;

  update public.prayer_settings set
    status = 'published',
    approval_note = trim(p_approval_note),
    approved_by = auth.uid(),
    published_at = now()
  where id = p_id
    and version = p_expected_version
    and status = 'draft'
  returning id, version into v_id, v_version;
  if not found then
    raise exception 'This draft changed or is no longer publishable.' using errcode = '40001';
  end if;
  return query select v_id, v_version;
end;
$$;

create or replace function public.withdraw_prayer_settings(
  p_actor_id uuid,
  p_id uuid,
  p_expected_version integer,
  p_reason text,
  p_replacement_id uuid default null,
  p_replacement_expected_version integer default null,
  p_replacement_approval_note text default null
)
returns table (
  withdrawn_settings_id uuid,
  withdrawn_settings_version integer,
  replacement_settings_id uuid,
  replacement_settings_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.content_status;
  v_version integer;
  v_effective_from date;
  v_effective_to date;
  v_timezone text;
  v_replacement_status public.content_status;
  v_replacement_version integer;
  v_replacement_from date;
  v_replacement_to date;
  v_required_coverage_date date;
begin
  perform public.establish_trusted_admin_actor(p_actor_id, 'prayer:publish');
  if not public.has_permission('prayer:publish') or not public.has_aal2() then
    raise exception 'Prayer withdrawal requires an authorised account with MFA.' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null
    or char_length(trim(p_reason)) < 10
    or char_length(trim(p_reason)) > 1000 then
    raise exception 'Record a verified withdrawal reason between 10 and 1,000 characters.'
      using errcode = '22023';
  end if;
  if (p_replacement_id is null) <> (p_replacement_expected_version is null) then
    raise exception 'Replacement identity and version must be supplied together.' using errcode = '22023';
  end if;
  if p_replacement_id = p_id then
    raise exception 'A prayer timetable cannot replace itself.' using errcode = '22023';
  end if;

  select status, version, effective_from, effective_to, timezone
  into v_status, v_version, v_effective_from, v_effective_to, v_timezone
  from public.prayer_settings
  where id = p_id
  for update;
  if not found or v_status <> 'published' or v_version <> p_expected_version then
    raise exception 'This published timetable changed or has already been withdrawn.' using errcode = '40001';
  end if;

  if p_replacement_id is not null then
    if nullif(trim(p_replacement_approval_note), '') is null
      or char_length(trim(p_replacement_approval_note)) < 10
      or char_length(trim(p_replacement_approval_note)) > 1000 then
      raise exception 'Record replacement approval evidence between 10 and 1,000 characters.'
        using errcode = '22023';
    end if;
    select status, version, effective_from, effective_to
    into v_replacement_status, v_replacement_version, v_replacement_from, v_replacement_to
    from public.prayer_settings
    where id = p_replacement_id
    for update;
    if not found
      or v_replacement_status <> 'draft'
      or v_replacement_version <> p_replacement_expected_version then
      raise exception 'The replacement draft changed or is no longer publishable.' using errcode = '40001';
    end if;
    if v_replacement_to is null
      or v_replacement_to - v_replacement_from not between 0 and 365 then
      raise exception 'The replacement requires a bounded effective period of at most 366 days.'
        using errcode = '22023';
    end if;
    v_required_coverage_date = greatest((now() at time zone v_timezone)::date, v_effective_from);
    if (v_effective_to is null or v_required_coverage_date <= v_effective_to)
      and not (
        v_replacement_from <= v_required_coverage_date
        and v_replacement_to >= v_required_coverage_date
      ) then
      raise exception 'The replacement does not cover the next date served by the withdrawn timetable.'
        using errcode = '22023';
    end if;
  elsif p_replacement_approval_note is not null then
    raise exception 'Replacement approval evidence requires a selected replacement.' using errcode = '22023';
  end if;

  perform set_config('app.prayer_withdrawal_authorised', 'true', true);
  perform set_config('app.prayer_revision_reason', trim(p_reason), true);
  update public.prayer_settings
  set status = 'archived'
  where id = p_id and status = 'published' and version = p_expected_version
  returning id, version into withdrawn_settings_id, withdrawn_settings_version;
  if not found then
    raise exception 'This published timetable changed or has already been withdrawn.' using errcode = '40001';
  end if;

  replacement_settings_id = null;
  replacement_settings_version = null;
  if p_replacement_id is not null then
    perform set_config(
      'app.prayer_revision_reason',
      'Published atomically as replacement for ' || p_id::text,
      true
    );
    update public.prayer_settings
    set
      status = 'published',
      approval_note = trim(p_replacement_approval_note),
      approved_by = auth.uid(),
      published_at = now()
    where id = p_replacement_id
      and status = 'draft'
      and version = p_replacement_expected_version
    returning id, version into replacement_settings_id, replacement_settings_version;
    if not found then
      raise exception 'The replacement draft changed or is no longer publishable.' using errcode = '40001';
    end if;
  end if;

  insert into public.audit_log (
    actor_id, action, entity_type, entity_id, before_state, after_state
  ) values (
    auth.uid(),
    case when replacement_settings_id is null then 'withdraw' else 'replace' end,
    'prayer_settings',
    p_id::text,
    jsonb_build_object('status', 'published', 'version', p_expected_version),
    jsonb_build_object(
      'status', 'archived',
      'version', withdrawn_settings_version,
      'reason', trim(p_reason),
      'replacement_id', replacement_settings_id,
      'replacement_version', replacement_settings_version
    )
  );

  return next;
end;
$$;

create or replace function public.clone_prayer_settings_draft(
  p_source_id uuid,
  p_revision_id bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb;
  v_settings jsonb;
  v_jumuah jsonb;
  v_overrides jsonb;
  v_seasonal jsonb;
  v_new_id uuid;
begin
  if not public.has_permission('prayer:write') or not public.has_aal2() then
    raise exception 'Prayer editing requires an authorised account with MFA.' using errcode = '42501';
  end if;

  if p_revision_id is null then
    select
      to_jsonb(setting_row),
      coalesce((select jsonb_agg(to_jsonb(session_row) order by session_row.display_order)
        from public.jumuah_sessions session_row where session_row.prayer_settings_id = setting_row.id), '[]'::jsonb),
      coalesce((select jsonb_agg(to_jsonb(override_row) order by override_row.prayer_date, override_row.prayer)
        from public.prayer_overrides override_row where override_row.prayer_settings_id = setting_row.id), '[]'::jsonb),
      coalesce((select jsonb_agg(to_jsonb(arrangement_row) order by arrangement_row.starts_on, arrangement_row.title)
        from public.seasonal_arrangements arrangement_row where arrangement_row.prayer_settings_id = setting_row.id), '[]'::jsonb)
    into v_settings, v_jumuah, v_overrides, v_seasonal
    from public.prayer_settings setting_row
    where setting_row.id = p_source_id;
  else
    select snapshot into v_snapshot
    from public.prayer_settings_revisions
    where id = p_revision_id and prayer_settings_id = p_source_id;
    v_settings = coalesce(v_snapshot -> 'settings', v_snapshot);
    v_jumuah = coalesce(v_snapshot -> 'jumuah_sessions', '[]'::jsonb);
    v_overrides = coalesce(v_snapshot -> 'overrides', '[]'::jsonb);
    v_seasonal = coalesce(v_snapshot -> 'seasonal_arrangements', '[]'::jsonb);
  end if;
  if v_settings is null then
    raise exception 'The source prayer settings were not found.' using errcode = 'P0002';
  end if;

  insert into public.prayer_settings (
    name, status, effective_from, effective_to, timezone, latitude, longitude,
    calculation_method, madhab, high_latitude_rule, adjustments, congregation_rules,
    hijri_adjustment, source_name, source_reference, calculation_library,
    calculation_library_version, created_by, updated_by
  ) values (
    left(v_settings ->> 'name', 100) || ' - restored draft',
    'draft',
    (v_settings ->> 'effective_from')::date,
    (v_settings ->> 'effective_to')::date,
    v_settings ->> 'timezone',
    (v_settings ->> 'latitude')::numeric,
    (v_settings ->> 'longitude')::numeric,
    v_settings ->> 'calculation_method',
    v_settings ->> 'madhab',
    v_settings ->> 'high_latitude_rule',
    v_settings -> 'adjustments',
    v_settings -> 'congregation_rules',
    (v_settings ->> 'hijri_adjustment')::smallint,
    v_settings ->> 'source_name',
    v_settings ->> 'source_reference',
    v_settings ->> 'calculation_library',
    v_settings ->> 'calculation_library_version',
    auth.uid(),
    auth.uid()
  ) returning id into v_new_id;

  insert into public.jumuah_sessions (
    prayer_settings_id, label, khutbah_time, prayer_time, display_order, notes
  ) select
    v_new_id, item ->> 'label', (item ->> 'khutbah_time')::time,
    (item ->> 'prayer_time')::time, (item ->> 'display_order')::smallint,
    item ->> 'notes'
  from jsonb_array_elements(coalesce(v_jumuah, '[]'::jsonb)) item;

  insert into public.prayer_overrides (
    prayer_settings_id, prayer_date, prayer, begins_at, congregation_at,
    unavailable, reason, created_by
  ) select
    v_new_id, (item ->> 'prayer_date')::date, (item ->> 'prayer')::public.prayer_key,
    (item ->> 'begins_at')::time, (item ->> 'congregation_at')::time,
    coalesce((item ->> 'unavailable')::boolean, false), item ->> 'reason', auth.uid()
  from jsonb_array_elements(coalesce(v_overrides, '[]'::jsonb)) item;

  insert into public.seasonal_arrangements (
    prayer_settings_id, kind, title, starts_on, ends_on, details, created_by
  ) select
    v_new_id, item ->> 'kind', item ->> 'title',
    (item ->> 'starts_on')::date, (item ->> 'ends_on')::date,
    coalesce(item -> 'details', '{}'::jsonb), auth.uid()
  from jsonb_array_elements(coalesce(v_seasonal, '[]'::jsonb)) item;

  return v_new_id;
end;
$$;

create or replace function public.save_prayer_override(
  p_settings_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns table (override_id uuid, settings_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_override_id uuid;
  v_version integer;
begin
  if not public.has_permission('prayer:write') or not public.has_aal2() then
    raise exception 'Prayer editing requires an authorised account with MFA.' using errcode = '42501';
  end if;
  update public.prayer_settings
  set updated_at = now()
  where id = p_settings_id and version = p_expected_version and status = 'draft'
  returning version into v_version;
  if not found then
    raise exception 'This draft changed or is no longer editable.' using errcode = '40001';
  end if;

  insert into public.prayer_overrides (
    prayer_settings_id, prayer_date, prayer, begins_at, congregation_at,
    unavailable, reason, created_by
  ) values (
    p_settings_id,
    (p_payload ->> 'prayer_date')::date,
    (p_payload ->> 'prayer')::public.prayer_key,
    (p_payload ->> 'begins_at')::time,
    (p_payload ->> 'congregation_at')::time,
    coalesce((p_payload ->> 'unavailable')::boolean, false),
    p_payload ->> 'reason',
    auth.uid()
  )
  on conflict (prayer_settings_id, prayer_date, prayer)
  do update set
    begins_at = excluded.begins_at,
    congregation_at = excluded.congregation_at,
    unavailable = excluded.unavailable,
    reason = excluded.reason
  returning id into v_override_id;

  return query select v_override_id, v_version;
end;
$$;

create or replace function public.delete_prayer_override(
  p_settings_id uuid,
  p_expected_version integer,
  p_override_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  if not public.has_permission('prayer:write') or not public.has_aal2() then
    raise exception 'Prayer editing requires an authorised account with MFA.' using errcode = '42501';
  end if;
  update public.prayer_settings
  set updated_at = now()
  where id = p_settings_id and version = p_expected_version and status = 'draft'
  returning version into v_version;
  if not found then
    raise exception 'This draft changed or is no longer editable.' using errcode = '40001';
  end if;
  delete from public.prayer_overrides
  where id = p_override_id and prayer_settings_id = p_settings_id;
  if not found then
    raise exception 'That override no longer exists.' using errcode = 'P0002';
  end if;
  return v_version;
end;
$$;

create trigger admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();
create trigger site_settings_version_and_publication
before insert or update on public.site_settings
for each row execute function public.version_and_enforce_site_setting();
create trigger content_items_version
before update on public.content_items
for each row execute function public.version_content_item();
create trigger content_items_enforce_publication
before insert or update on public.content_items
for each row execute function public.enforce_content_publication();
create trigger media_assets_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();
create trigger prayer_settings_version
before update on public.prayer_settings
for each row execute function public.version_prayer_settings();
create trigger jumuah_sessions_updated_at
before update on public.jumuah_sessions
for each row execute function public.set_updated_at();
create trigger jumuah_sessions_protect_published
before insert or update or delete on public.jumuah_sessions
for each row execute function public.prevent_published_prayer_child_change();
create trigger prayer_overrides_updated_at
before update on public.prayer_overrides
for each row execute function public.set_updated_at();
create trigger prayer_overrides_protect_published
before insert or update or delete on public.prayer_overrides
for each row execute function public.prevent_published_prayer_child_change();
create trigger seasonal_arrangements_updated_at
before update on public.seasonal_arrangements
for each row execute function public.set_updated_at();
create trigger seasonal_arrangements_protect_published
before insert or update or delete on public.seasonal_arrangements
for each row execute function public.prevent_published_prayer_child_change();
create trigger enquiries_updated_at
before update on public.enquiries
for each row execute function public.set_updated_at();
create trigger redirects_updated_at
before update on public.redirects
for each row execute function public.set_updated_at();

create trigger content_items_audit
after insert or update on public.content_items
for each row execute function public.audit_row_change();
create trigger site_settings_audit
after insert or update on public.site_settings
for each row execute function public.audit_row_change();
create trigger prayer_settings_audit
after insert or update on public.prayer_settings
for each row execute function public.audit_row_change();
create trigger prayer_overrides_audit
after insert or update or delete on public.prayer_overrides
for each row execute function public.audit_row_change();
create trigger jumuah_sessions_audit
after insert or update or delete on public.jumuah_sessions
for each row execute function public.audit_row_change();
create trigger seasonal_arrangements_audit
after insert or update or delete on public.seasonal_arrangements
for each row execute function public.audit_row_change();
create trigger media_assets_audit
after insert or update on public.media_assets
for each row execute function public.audit_row_change();
create trigger admin_profiles_audit
after insert or update on public.admin_profiles
for each row execute function public.audit_row_change();
create trigger admin_invites_audit
after insert or update on public.admin_invites
for each row execute function public.audit_row_change();
create trigger enquiries_audit
after insert or update or delete on public.enquiries
for each row execute function public.audit_enquiry_change();

alter table public.admin_profiles enable row level security;
alter table public.admin_invites enable row level security;
alter table public.site_settings enable row level security;
alter table public.content_items enable row level security;
alter table public.content_revisions enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_usage enable row level security;
alter table public.prayer_settings enable row level security;
alter table public.prayer_settings_revisions enable row level security;
alter table public.jumuah_sessions enable row level security;
alter table public.prayer_overrides enable row level security;
alter table public.seasonal_arrangements enable row level security;
alter table public.enquiries enable row level security;
alter table public.redirects enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

create policy admin_profile_self_read
on public.admin_profiles for select to authenticated
using (id = auth.uid());
create policy admin_profiles_super_admin_read
on public.admin_profiles for select to authenticated
using (public.current_admin_role() = 'super_admin');
create policy admin_profiles_super_admin_insert
on public.admin_profiles for insert to authenticated
with check (public.current_admin_role() = 'super_admin' and public.has_aal2());
create policy admin_profiles_super_admin_update
on public.admin_profiles for update to authenticated
using (public.current_admin_role() = 'super_admin' and public.has_aal2())
with check (public.current_admin_role() = 'super_admin' and public.has_aal2());

create policy admin_invites_super_admin_all
on public.admin_invites for all to authenticated
using (public.current_admin_role() = 'super_admin' and public.has_aal2())
with check (public.current_admin_role() = 'super_admin' and public.has_aal2());

create policy site_settings_editor_read
on public.site_settings for select to authenticated
using (public.has_permission('content:read'));

create policy content_items_editor_read
on public.content_items for select to authenticated
using (public.has_permission('content:read'));
create policy content_items_editor_insert
on public.content_items for insert to authenticated
with check (public.has_permission('content:write') and public.has_aal2());
create policy content_items_editor_update
on public.content_items for update to authenticated
using (public.has_permission('content:write') and public.has_aal2())
with check (public.has_permission('content:write') and public.has_aal2());

create policy content_revisions_editor_read
on public.content_revisions for select to authenticated
using (public.has_permission('content:read'));

create policy media_assets_editor_read
on public.media_assets for select to authenticated
using (public.has_permission('media:read'));
create policy media_usage_editor_read
on public.media_usage for select to authenticated
using (public.has_permission('media:read'));
create policy prayer_settings_editor_read
on public.prayer_settings for select to authenticated
using (public.has_permission('prayer:read'));

create policy prayer_revisions_editor_read
on public.prayer_settings_revisions for select to authenticated
using (public.has_permission('prayer:read'));

create policy jumuah_sessions_editor_read
on public.jumuah_sessions for select to authenticated
using (public.has_permission('prayer:read'));

create policy prayer_overrides_editor_read
on public.prayer_overrides for select to authenticated
using (public.has_permission('prayer:read'));

create policy seasonal_arrangements_editor_read
on public.seasonal_arrangements for select to authenticated
using (public.has_permission('prayer:read'));

create policy enquiries_manager_read
on public.enquiries for select to authenticated
using (public.has_permission('enquiries:read'));
create policy enquiries_manager_update
on public.enquiries for update to authenticated
using (public.has_permission('enquiries:write') and public.has_aal2())
with check (public.has_permission('enquiries:write') and public.has_aal2());
create policy enquiries_manager_delete
on public.enquiries for delete to authenticated
using (public.has_permission('enquiries:write') and public.has_aal2());

create policy redirects_editor_read
on public.redirects for select to authenticated
using (public.has_permission('content:read'));
create policy redirects_editor_all
on public.redirects for all to authenticated
using (public.has_permission('content:write') and public.has_aal2())
with check (public.has_permission('content:write') and public.has_aal2());

create policy audit_log_reviewer_read
on public.audit_log for select to authenticated
using (public.has_permission('audit:read'));

revoke all on function public.current_admin_role() from public;
revoke all on function public.has_aal2() from public;
revoke all on function public.has_permission(text) from public;
revoke all on function public.establish_trusted_admin_actor(uuid, text) from public;
revoke all on function public.save_site_setting(uuid, text, integer, public.content_status, jsonb) from public;
revoke all on function public.consume_rate_limit(text, text, integer, integer, integer) from public;
revoke all on function public.purge_expired_operational_data() from public;
revoke all on function public.register_media_asset(text, text, text, bigint, integer, integer, text, boolean, text, text, public.media_status) from public;
revoke all on function public.update_media_asset_status(uuid, timestamptz, public.media_status) from public;
revoke all on function public.save_prayer_draft(uuid, integer, jsonb, jsonb) from public;
revoke all on function public.publish_prayer_settings(uuid, uuid, integer, text) from public;
revoke all on function public.withdraw_prayer_settings(uuid, uuid, integer, text, uuid, integer, text) from public;
revoke all on function public.clone_prayer_settings_draft(uuid, bigint) from public;
revoke all on function public.save_prayer_override(uuid, integer, jsonb) from public;
revoke all on function public.delete_prayer_override(uuid, integer, uuid) from public;
grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.has_aal2() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.save_site_setting(uuid, text, integer, public.content_status, jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer, integer) to service_role;
grant execute on function public.purge_expired_operational_data() to service_role;
grant execute on function public.register_media_asset(text, text, text, bigint, integer, integer, text, boolean, text, text, public.media_status) to authenticated;
grant execute on function public.update_media_asset_status(uuid, timestamptz, public.media_status) to authenticated;
grant execute on function public.save_prayer_draft(uuid, integer, jsonb, jsonb) to authenticated;
grant execute on function public.publish_prayer_settings(uuid, uuid, integer, text) to service_role;
grant execute on function public.withdraw_prayer_settings(uuid, uuid, integer, text, uuid, integer, text) to service_role;
grant execute on function public.clone_prayer_settings_draft(uuid, bigint) to authenticated;
grant execute on function public.save_prayer_override(uuid, integer, jsonb) to authenticated;
grant execute on function public.delete_prayer_override(uuid, integer, uuid) to authenticated;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke insert, update, delete on public.site_settings, public.media_assets,
  public.media_usage, public.prayer_settings, public.jumuah_sessions,
  public.prayer_overrides, public.seasonal_arrangements
  from authenticated;
grant select, insert, update on public.admin_profiles, public.admin_invites,
  public.content_items,
  public.enquiries, public.redirects
  to authenticated;
grant select on public.site_settings to authenticated;
grant select on public.media_assets, public.media_usage to authenticated;
grant select on public.prayer_settings, public.jumuah_sessions,
  public.prayer_overrides, public.seasonal_arrangements to authenticated;
grant delete on public.enquiries to authenticated;
grant select on public.content_revisions, public.prayer_settings_revisions,
  public.audit_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.prayer_settings is
  'Effective-dated, explicitly approved prayer configuration. Published rows are immutable.';
comment on table public.audit_log is
  'Append-only record of significant changes. Enquiry audit entries intentionally exclude message bodies.';
comment on function public.consume_rate_limit is
  'Server-only fixed-window rate limiter; callers must pass a non-reversible request fingerprint.';
