-- P1 database release gates.
--
-- This test is intentionally transactional: a completely reset Supabase database is
-- exercised with realistic identities and records, then returned to its seeded state.

begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
grant execute on all functions in schema extensions to anon, authenticated, service_role;
select extensions.no_plan();

create schema if not exists tests;

create or replace function tests.set_auth(p_uid uuid, p_aal text default 'aal2')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_uid,
      'role', 'authenticated',
      'aal', p_aal,
      'email', 'p1-' || p_uid::text || '@example.test'
    )::text,
    true
  );
end;
$$;

create or replace function tests.exec_rows(p_statement text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  affected bigint;
begin
  execute p_statement;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant usage on schema tests to anon, authenticated;
grant execute on function tests.set_auth(uuid, text) to anon, authenticated;
grant execute on function tests.exec_rows(text) to anon, authenticated;

-- A reset must apply the seed once and must not make any unapproved information public.
select extensions.is(
  (select count(*) from public.site_settings),
  2::bigint,
  'the clean seed contains exactly two private settings rows'
);
select extensions.is(
  (select count(*) from public.site_settings where status <> 'draft'),
  0::bigint,
  'all seeded settings remain drafts'
);
select extensions.is(
  (select count(*) from public.content_items),
  0::bigint,
  'the seed contains no public content'
);
select extensions.is(
  (select count(*) from public.prayer_settings),
  0::bigint,
  'the seed contains no prayer timetable'
);
select extensions.is(
  (select count(*) from public.enquiries),
  0::bigint,
  'the seed contains no personal enquiry data'
);
select extensions.is(
  (select value ->> 'public_enquiries' from public.site_settings where key = 'feature_flags'),
  'false',
  'the public enquiry feature is disabled by default'
);

-- Verify that every application table has RLS enabled and important query paths are indexed.
select extensions.is(
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(array[
        'admin_profiles', 'admin_invites', 'site_settings', 'content_items',
        'content_revisions', 'media_assets', 'media_usage', 'prayer_settings',
        'prayer_settings_revisions', 'jumuah_sessions', 'prayer_overrides',
        'seasonal_arrangements', 'enquiries', 'redirects', 'audit_log', 'rate_limits'
      ])
      and c.relrowsecurity
  ),
  16::bigint,
  'RLS is enabled on all sixteen application tables'
);
select extensions.is(
  (
    select array_agg(policyname::text order by policyname)
    from pg_policies
    where schemaname = 'public'
  ),
  array[
    'admin_invites_super_admin_all',
    'admin_profile_self_read',
    'admin_profiles_super_admin_insert',
    'admin_profiles_super_admin_read',
    'admin_profiles_super_admin_update',
    'audit_log_reviewer_read',
    'content_items_editor_insert',
    'content_items_editor_read',
    'content_items_editor_update',
    'content_revisions_editor_read',
    'enquiries_manager_delete',
    'enquiries_manager_read',
    'enquiries_manager_update',
    'jumuah_sessions_editor_read',
    'media_assets_editor_read',
    'media_usage_editor_read',
    'prayer_overrides_editor_read',
    'prayer_revisions_editor_read',
    'prayer_settings_editor_read',
    'redirects_editor_all',
    'redirects_editor_read',
    'seasonal_arrangements_editor_read',
    'site_settings_editor_read'
  ]::text[],
  'the complete expected application RLS policy inventory exists'
);
select extensions.ok(
  (select count(*) = 4 from pg_indexes where schemaname = 'public' and tablename = 'content_items'),
  'content publication and editorial lookup indexes exist'
);
select extensions.ok(
  (select count(*) >= 3 from pg_indexes where schemaname = 'public' and tablename = 'prayer_settings'),
  'prayer effective-range indexes and exclusion backing index exist'
);
select extensions.ok(
  (select count(*) = 3 from pg_indexes where schemaname = 'public' and tablename = 'enquiries'),
  'enquiry queue and retention indexes exist'
);
select extensions.ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'audit_log_actor_idx'),
  'audit actor lookup is indexed'
);
select extensions.ok(
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'content_items' and column_name = 'demo_local_only'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'content_items' and column_name = 'seo_title'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'content_items' and column_name = 'seo_description'
  )
  and exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'prayer_settings' and column_name = 'demo_local_only'
  ),
  'local-only markers and managed SEO columns exist'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.save_seasonal_arrangement(uuid,integer,jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.delete_seasonal_arrangement(uuid,integer,uuid)', 'execute')
  and has_function_privilege('service_role', 'public.seed_local_demo_data(uuid,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.seed_local_demo_data(uuid,text)', 'execute')
  and not has_function_privilege('anon', 'public.seed_local_demo_data(uuid,text)', 'execute'),
  'seasonal editing is authenticated and the local demo seed is service-role only'
);

-- Supabase Auth fixtures. These accounts never leave this rolled-back transaction.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  fixture.id,
  'authenticated',
  'authenticated',
  fixture.email,
  crypt('P1-only-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '', '', '', ''
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'unauthorised@example.test'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'editor@example.test'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'prayer@example.test'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'enquiries@example.test'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'super@example.test'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'invited@example.test'),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'reviewer@example.test')
) as fixture(id, email);

insert into public.admin_profiles (id, display_name, role, status, mfa_required)
values
  ('10000000-0000-0000-0000-000000000002', 'Website editor', 'website_editor', 'active', true),
  ('10000000-0000-0000-0000-000000000003', 'Prayer editor', 'prayer_editor', 'active', true),
  ('10000000-0000-0000-0000-000000000004', 'Enquiries manager', 'enquiries_manager', 'active', true),
  ('10000000-0000-0000-0000-000000000005', 'Super administrator', 'super_admin', 'active', true),
  ('10000000-0000-0000-0000-000000000007', 'Read-only reviewer', 'reviewer', 'active', true);

insert into storage.objects (bucket_id, name)
values ('media', '10000000-0000-0000-0000-000000000005/p1-release.webp');
insert into public.media_assets (
  id, object_path, original_name, mime_type, byte_size, width, height,
  alt_text, decorative, status, uploaded_by
)
values (
  '15000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000005/p1-release.webp',
  'p1-release.webp',
  'image/webp',
  1024,
  640,
  360,
  'Synthetic release-candidate media fixture',
  false,
  'draft',
  '10000000-0000-0000-0000-000000000005'
);

-- Anonymous callers receive no table or function capability, even for approved rows.
select extensions.ok(
  not exists (
    select 1
    from unnest(array[
      'admin_profiles', 'admin_invites', 'site_settings', 'content_items',
      'content_revisions', 'media_assets', 'media_usage', 'prayer_settings',
      'prayer_settings_revisions', 'jumuah_sessions', 'prayer_overrides',
      'seasonal_arrangements', 'enquiries', 'redirects', 'audit_log', 'rate_limits'
    ]) as application_table(table_name)
    cross join unnest(array['select', 'insert', 'update', 'delete'])
      as requested_privilege(privilege_name)
    where has_table_privilege(
      'anon',
      format('public.%I', application_table.table_name),
      requested_privilege.privilege_name
    )
  ),
  'anonymous callers have no direct read or write privilege on any application table'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.has_permission(text)', 'execute')
  and not has_function_privilege(
    'anon',
    'public.save_prayer_draft(uuid,integer,jsonb,jsonb)',
    'execute'
  ),
  'anonymous callers cannot invoke permission or editorial RPCs'
);

-- An authenticated user without a profile sees no protected rows and has no permissions.
set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000001');
select extensions.is(public.current_admin_role(), null::public.admin_role, 'no profile means no admin role');
select extensions.is(public.has_permission('content:read'), false, 'no profile means no content permission');
select extensions.is((select count(*) from public.site_settings), 0::bigint, 'unauthorised user cannot read settings');
select extensions.is((select count(*) from public.admin_profiles), 0::bigint, 'unauthorised user cannot read profiles');
select extensions.is((select count(*) from public.audit_log), 0::bigint, 'unauthorised user cannot read audit records');
select extensions.is((select count(*) from public.enquiries), 0::bigint, 'unauthorised user cannot read enquiries');
select extensions.throws_ok(
  $$insert into public.content_items (kind, slug, title) values ('page', 'forbidden', 'Forbidden')$$,
  '42501',
  null,
  'unauthorised user cannot create content'
);
reset role;

-- Full permission matrix: each expected list is sorted to prevent accidental omissions.
set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000002');
select extensions.is(
  (
    select array_agg(permission order by permission)
    from unnest(array[
      'admin:access', 'audit:read', 'content:publish', 'content:read', 'content:write',
      'enquiries:read', 'enquiries:write', 'media:read', 'media:write',
      'prayer:publish', 'prayer:read', 'prayer:write', 'users:manage'
    ]) permission
    where public.has_permission(permission)
  ),
  array['admin:access','audit:read','content:publish','content:read','content:write','media:read','media:write','prayer:read'],
  'website editor receives only website, media, read-only prayer, and audit permissions'
);
select tests.set_auth('10000000-0000-0000-0000-000000000003');
select extensions.is(
  (
    select array_agg(permission order by permission)
    from unnest(array[
      'admin:access', 'audit:read', 'content:publish', 'content:read', 'content:write',
      'enquiries:read', 'enquiries:write', 'media:read', 'media:write',
      'prayer:publish', 'prayer:read', 'prayer:write', 'users:manage'
    ]) permission
    where public.has_permission(permission)
  ),
  array['admin:access','audit:read','content:read','prayer:publish','prayer:read','prayer:write'],
  'prayer editor receives only content-read, prayer, and audit permissions'
);
select tests.set_auth('10000000-0000-0000-0000-000000000004');
select extensions.is(
  (
    select array_agg(permission order by permission)
    from unnest(array[
      'admin:access', 'audit:read', 'content:publish', 'content:read', 'content:write',
      'enquiries:read', 'enquiries:write', 'media:read', 'media:write',
      'prayer:publish', 'prayer:read', 'prayer:write', 'users:manage'
    ]) permission
    where public.has_permission(permission)
  ),
  array['admin:access','content:read','enquiries:read','enquiries:write'],
  'enquiries manager receives only content-read and enquiry permissions'
);
select tests.set_auth('10000000-0000-0000-0000-000000000005');
select extensions.is(
  (
    select array_agg(permission order by permission)
    from unnest(array[
      'admin:access', 'audit:read', 'content:publish', 'content:read', 'content:write',
      'enquiries:read', 'enquiries:write', 'media:read', 'media:write',
      'prayer:publish', 'prayer:read', 'prayer:write', 'users:manage'
    ]) permission
    where public.has_permission(permission)
  ),
  array['admin:access','audit:read','content:publish','content:read','content:write','enquiries:read','enquiries:write','media:read','media:write','prayer:publish','prayer:read','prayer:write','users:manage'],
  'super administrator receives the complete permission set'
);
select tests.set_auth('10000000-0000-0000-0000-000000000007');
select extensions.is(
  (
    select array_agg(permission order by permission)
    from unnest(array[
      'admin:access', 'audit:read', 'content:publish', 'content:read', 'content:write',
      'enquiries:read', 'enquiries:write', 'media:read', 'media:write',
      'prayer:publish', 'prayer:read', 'prayer:write', 'users:manage'
    ]) permission
    where public.has_permission(permission)
  ),
  array['admin:access','audit:read','content:read','media:read','prayer:read'],
  'read-only reviewer receives only review permissions'
);
reset role;

-- Website editor: positive content workflow plus negative enquiry, prayer, and user boundaries.
set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000002', 'aal1');
select extensions.throws_ok(
  $$insert into public.content_items (id, kind, slug, title) values ('20000000-0000-0000-0000-000000000001', 'announcement', 'release-notice', 'Release notice')$$,
  '42501', null, 'AAL1 website editor cannot write content'
);
select tests.set_auth('10000000-0000-0000-0000-000000000002', 'aal2');
insert into public.content_items (id, kind, slug, title, summary, body)
values (
  '20000000-0000-0000-0000-000000000001',
  'announcement',
  'release-notice',
  'Release notice draft',
  'Private until deliberately published.',
  '{"blocks":[{"type":"paragraph","text":"Verified release fixture."}]}'::jsonb
);
select extensions.is(
  (select created_by from public.content_items where id = '20000000-0000-0000-0000-000000000001'),
  '10000000-0000-0000-0000-000000000002'::uuid,
  'content trigger records the editor identity'
);
update public.content_items
set status = 'scheduled', publish_at = clock_timestamp() + interval '1 second', expires_at = clock_timestamp() + interval '2 days'
where id = '20000000-0000-0000-0000-000000000001';
select extensions.is(
  (select count(*) from public.content_revisions where content_item_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'scheduling creates an immutable prior revision'
);
select extensions.is(
  (
    select count(*)
    from public.content_items
    where id = '20000000-0000-0000-0000-000000000001'
      and status in ('published', 'scheduled')
      and coalesce(publish_at, published_at) <= clock_timestamp()
      and published_at <= clock_timestamp()
      and (expires_at is null or expires_at > clock_timestamp())
  ),
  0::bigint,
  'scheduled content is excluded before its effective time'
);
select pg_sleep(1.1);
select extensions.is(
  (
    select count(*)
    from public.content_items
    where id = '20000000-0000-0000-0000-000000000001'
      and status in ('published', 'scheduled')
      and coalesce(publish_at, published_at) <= clock_timestamp()
      and published_at <= clock_timestamp()
      and (expires_at is null or expires_at > clock_timestamp())
  ),
  1::bigint,
  'scheduled content becomes eligible after its effective time'
);
update public.content_items
set status = 'published', publish_at = null, expires_at = clock_timestamp() + interval '2 days', title = 'Release notice'
where id = '20000000-0000-0000-0000-000000000001';
select extensions.is(
  (
    select count(*)
    from public.content_items
    where id = '20000000-0000-0000-0000-000000000001'
      and status in ('published', 'scheduled')
      and coalesce(publish_at, published_at) <= clock_timestamp()
      and published_at <= clock_timestamp()
      and (expires_at is null or expires_at > clock_timestamp())
  ),
  1::bigint,
  'published in-window content passes the public repository predicate'
);
update public.content_items
set expires_at = clock_timestamp() - interval '1 second'
where id = '20000000-0000-0000-0000-000000000001';
select extensions.is(
  (
    select count(*)
    from public.content_items
    where id = '20000000-0000-0000-0000-000000000001'
      and status in ('published', 'scheduled')
      and coalesce(publish_at, published_at) <= clock_timestamp()
      and published_at <= clock_timestamp()
      and (expires_at is null or expires_at > clock_timestamp())
  ),
  0::bigint,
  'expired content is excluded from the public repository predicate'
);
update public.content_items item
set
  kind = (revision.snapshot ->> 'kind')::public.content_kind,
  slug = revision.snapshot ->> 'slug',
  title = revision.snapshot ->> 'title',
  summary = revision.snapshot ->> 'summary',
  body = revision.snapshot -> 'body',
  category = revision.snapshot ->> 'category',
  featured = (revision.snapshot ->> 'featured')::boolean,
  publish_at = (revision.snapshot ->> 'publish_at')::timestamptz,
  expires_at = (revision.snapshot ->> 'expires_at')::timestamptz,
  status = 'draft',
  published_at = null,
  published_by = null,
  deleted_at = null
from public.content_revisions revision
where item.id = '20000000-0000-0000-0000-000000000001'
  and revision.content_item_id = item.id
  and revision.version = 1;
select extensions.ok(
  (
    select version = 5
      and title = 'Release notice draft'
      and status = 'draft'
      and published_by is null
      and published_at is null
    from public.content_items
    where id = '20000000-0000-0000-0000-000000000001'
  ),
  'restoring the first revision creates a private draft and removes publication metadata'
);
select extensions.is(
  (select count(*) from public.content_revisions where content_item_id = '20000000-0000-0000-0000-000000000001'),
  4::bigint,
  'the full schedule, publish, expiry, and restore history is retained'
);
insert into public.redirects (id, from_path, to_path, status_code, created_by)
values (
  '25000000-0000-0000-0000-000000000001',
  '/release-candidate-old',
  '/news',
  308,
  '10000000-0000-0000-0000-000000000002'
);
update public.redirects
set to_path = '/about', status_code = 301
where id = '25000000-0000-0000-0000-000000000001';
select extensions.ok(
  (
    select to_path = '/about' and status_code = 301
    from public.redirects
    where id = '25000000-0000-0000-0000-000000000001'
  ),
  'website editor can create, read, and update redirects'
);
select extensions.throws_ok(
  $$delete from public.redirects where id = '25000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'redirects cannot be hard-deleted through an authenticated client'
);
select extensions.is((select count(*) from public.enquiries), 0::bigint, 'website editor cannot read enquiries');
select extensions.throws_ok(
  $$insert into public.admin_invites (email, role, invited_by, expires_at) values ('blocked@example.test', 'reviewer', '10000000-0000-0000-0000-000000000002', now() + interval '1 day')$$,
  '42501', null, 'website editor cannot invite administrators'
);
select extensions.throws_ok(
  $$select * from public.save_prayer_draft(null, null, '{}'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'website editor cannot alter prayer settings'
);
reset role;

-- Trusted fixture links let the cross-domain matrix exercise read policies with real rows.
select tests.set_auth('10000000-0000-0000-0000-000000000005', 'aal2');
insert into public.media_usage (media_asset_id, content_item_id, field_path)
values (
  '15000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'body.blocks[0].image'
);
insert into public.admin_invites (email, role, invited_by, expires_at)
values (
  'hidden-invite@example.test',
  'reviewer',
  '10000000-0000-0000-0000-000000000005',
  now() + interval '7 days'
);

-- Create an enquiry as the trusted server, then prove only the enquiries role can handle it.
insert into public.enquiries (
  id, kind, name, email, message, privacy_notice_version, retention_until
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'general',
    'Release fixture',
    'fixture@example.test',
    'This is realistic private enquiry sample data.',
    'privacy-v1',
    current_date + 30
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'visit',
    'Deletion fixture',
    'deletion-fixture@example.test',
    'This private enquiry proves the authorised deletion policy.',
    'privacy-v1',
    current_date + 30
  );

set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000002', 'aal2');
select extensions.is(
  tests.exec_rows($$update public.enquiries set status = 'in_progress' where id = '30000000-0000-0000-0000-000000000001'$$),
  0::bigint,
  'website editor cannot alter an enquiry'
);
select tests.set_auth('10000000-0000-0000-0000-000000000004', 'aal1');
select extensions.is(
  tests.exec_rows($$update public.enquiries set status = 'in_progress' where id = '30000000-0000-0000-0000-000000000001'$$),
  0::bigint,
  'AAL1 enquiries manager cannot alter an enquiry'
);
select extensions.is(
  tests.exec_rows($$delete from public.enquiries where id = '30000000-0000-0000-0000-000000000002'$$),
  0::bigint,
  'AAL1 enquiries manager cannot delete an enquiry'
);
select tests.set_auth('10000000-0000-0000-0000-000000000004', 'aal2');
update public.enquiries
set status = 'in_progress', assigned_to = '10000000-0000-0000-0000-000000000004'
where id = '30000000-0000-0000-0000-000000000001';
select extensions.ok(
  (select status = 'in_progress' and assigned_to = '10000000-0000-0000-0000-000000000004' from public.enquiries where id = '30000000-0000-0000-0000-000000000001'),
  'AAL2 enquiries manager can handle an enquiry'
);
delete from public.enquiries
where id = '30000000-0000-0000-0000-000000000002';
select extensions.is(
  (select count(*) from public.enquiries where id = '30000000-0000-0000-0000-000000000002'),
  0::bigint,
  'AAL2 enquiries manager can delete an enquiry'
);
select extensions.is((select count(*) from public.audit_log), 0::bigint, 'enquiries manager cannot read audit records');
reset role;
select extensions.ok(
  not exists(
    select 1 from public.audit_log
    where entity_type = 'enquiries'
      and (
        coalesce(before_state, '{}'::jsonb) ?| array['name','email','phone','message','source_fingerprint']
        or coalesce(after_state, '{}'::jsonb) ?| array['name','email','phone','message','source_fingerprint']
      )
  ),
  'enquiry audit records exclude contact details, messages, and fingerprints'
);

-- Prayer editor: the authenticated RPC accepts AAL2 drafts, while publication is server-only.
set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000003', 'aal1');
select extensions.throws_ok(
  $$select * from public.save_prayer_draft(null, null, '{"name":"P1 timetable","effective_from":"2099-01-01","effective_to":"2099-01-31","timezone":"Europe/London","latitude":"54.45","longitude":"-6.39","calculation_method":"MoonsightingCommittee","madhab":"hanafi","high_latitude_rule":"seventh_of_night","adjustments":{},"congregation_rules":{},"hijri_adjustment":0,"source_name":"P1 verified fixture","source_reference":"RC evidence","calculation_library":"adhan","calculation_library_version":"4.4.4"}'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'AAL1 prayer editor cannot save a timetable'
);
select tests.set_auth('10000000-0000-0000-0000-000000000003', 'aal2');
select extensions.lives_ok(
  $$select * from public.save_prayer_draft(null, null, '{"name":"P1 timetable","effective_from":"2099-01-01","effective_to":"2099-01-31","timezone":"Europe/London","latitude":"54.45","longitude":"-6.39","calculation_method":"MoonsightingCommittee","madhab":"hanafi","high_latitude_rule":"seventh_of_night","adjustments":{},"congregation_rules":{},"hijri_adjustment":0,"source_name":"P1 verified fixture","source_reference":"RC evidence","calculation_library":"adhan","calculation_library_version":"4.4.4"}'::jsonb, '[{"label":"Jumuah","khutbah_time":"13:00","prayer_time":"13:15","display_order":1}]'::jsonb)$$,
  'AAL2 prayer editor can create a bounded draft'
);
select extensions.is((select count(*) from public.prayer_settings), 1::bigint, 'prayer draft was stored');
select extensions.is((select count(*) from public.jumuah_sessions), 1::bigint, 'Friday session was stored with the draft');
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.publish_prayer_settings(uuid,uuid,integer,text)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.publish_prayer_settings(uuid,uuid,integer,text)',
    'execute'
  ),
  'authenticated clients cannot call the server-only publication RPC'
);
reset role;

insert into public.prayer_overrides (
  id, prayer_settings_id, prayer_date, prayer, congregation_at, reason, created_by
)
select
  '35000000-0000-0000-0000-000000000001',
  id,
  '2099-01-15',
  'isha',
  '19:30',
  'Synthetic policy-coverage override',
  '10000000-0000-0000-0000-000000000003'
from public.prayer_settings
limit 1;
insert into public.seasonal_arrangements (
  id, prayer_settings_id, kind, title, starts_on, ends_on, details, created_by
)
select
  '36000000-0000-0000-0000-000000000001',
  id,
  'ramadan',
  'Synthetic Ramadan arrangement',
  '2099-01-10',
  '2099-01-20',
  '{"note":"RLS policy fixture"}'::jsonb,
  '10000000-0000-0000-0000-000000000003'
from public.prayer_settings
limit 1;

set local role service_role;
select extensions.throws_ok(
  $$select * from public.publish_prayer_settings('10000000-0000-0000-0000-000000000002', (select id from public.prayer_settings limit 1), 1, 'Website editor must not publish prayer settings')$$,
  '42501', null, 'service RPC rejects a website editor as the trusted actor'
);
select extensions.lives_ok(
  $$select * from public.publish_prayer_settings('10000000-0000-0000-0000-000000000003', (select id from public.prayer_settings limit 1), 1, 'Committee-approved prayer test fixture')$$,
  'service RPC accepts the authorised prayer editor actor'
);
select extensions.throws_ok(
  $$update public.prayer_settings set name = 'Tampered published timetable' where status = 'published'$$,
  'P0001', null, 'published prayer settings are immutable'
);
reset role;
select extensions.ok(
  (select status = 'published' and approved_by = '10000000-0000-0000-0000-000000000003' and approval_note is not null and published_at is not null from public.prayer_settings limit 1),
  'published prayer settings retain actor and approval evidence'
);

-- Cross-domain RLS matrix: policy wiring and table grants must agree with permissions.
select extensions.ok(
  not has_table_privilege('authenticated', 'public.prayer_settings', 'insert')
  and not has_table_privilege('authenticated', 'public.prayer_settings', 'update')
  and not has_table_privilege('authenticated', 'public.prayer_settings', 'delete'),
  'authenticated roles cannot bypass prayer RPCs with direct table writes'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.admin_invites', 'delete')
  and not has_table_privilege('authenticated', 'public.redirects', 'delete')
  and not has_table_privilege('authenticated', 'public.rate_limits', 'select'),
  'hard deletion of invitations and redirects and direct rate-limit reads stay server-only'
);

set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000002', 'aal2');
select extensions.ok(
  (select count(*) from public.admin_profiles) = 1
  and (select count(*) from public.site_settings) = 2
  and (select count(*) from public.content_items) = 1
  and (select count(*) from public.content_revisions) = 4
  and (select count(*) from public.media_assets) = 1
  and (select count(*) from public.media_usage) = 1
  and (select count(*) from public.prayer_settings) = 1
  and (select count(*) from public.prayer_settings_revisions) = 1
  and (select count(*) from public.jumuah_sessions) = 1
  and (select count(*) from public.prayer_overrides) = 1
  and (select count(*) from public.seasonal_arrangements) = 1
  and (select count(*) from public.enquiries) = 0
  and (select count(*) from public.admin_invites) = 0
  and (select count(*) from public.redirects) = 1
  and (select count(*) from public.audit_log) > 0,
  'website editor RLS exposes only self, settings, content, media, prayer-read, redirects, and audit domains'
);
select tests.set_auth('10000000-0000-0000-0000-000000000003', 'aal2');
select extensions.ok(
  (select count(*) from public.admin_profiles) = 1
  and (select count(*) from public.site_settings) = 2
  and (select count(*) from public.content_items) = 1
  and (select count(*) from public.content_revisions) = 4
  and (select count(*) from public.media_assets) = 0
  and (select count(*) from public.media_usage) = 0
  and (select count(*) from public.prayer_settings) = 1
  and (select count(*) from public.prayer_settings_revisions) = 1
  and (select count(*) from public.jumuah_sessions) = 1
  and (select count(*) from public.prayer_overrides) = 1
  and (select count(*) from public.seasonal_arrangements) = 1
  and (select count(*) from public.enquiries) = 0
  and (select count(*) from public.admin_invites) = 0
  and (select count(*) from public.redirects) = 1
  and (select count(*) from public.audit_log) > 0,
  'prayer editor RLS exposes only self, settings, content-read, prayer, redirects, and audit domains'
);
select extensions.throws_ok(
  $$insert into public.content_items (kind, slug, title) values ('page', 'prayer-editor-write', 'Forbidden prayer editor write')$$,
  '42501', null, 'prayer editor cannot create website content'
);
select extensions.is(
  tests.exec_rows($$update public.enquiries set status = 'closed', closed_at = now() where id = '30000000-0000-0000-0000-000000000001'$$),
  0::bigint,
  'prayer editor cannot alter enquiries'
);
select extensions.is(
  tests.exec_rows($$update public.redirects set to_path = '/visit' where id = '25000000-0000-0000-0000-000000000001'$$),
  0::bigint,
  'prayer editor cannot alter redirects'
);
select tests.set_auth('10000000-0000-0000-0000-000000000007', 'aal2');
select extensions.ok(
  (select count(*) from public.admin_profiles) = 1
  and (select count(*) from public.site_settings) = 2
  and (select count(*) from public.content_items) = 1
  and (select count(*) from public.content_revisions) = 4
  and (select count(*) from public.media_assets) = 1
  and (select count(*) from public.media_usage) = 1
  and (select count(*) from public.prayer_settings) = 1
  and (select count(*) from public.prayer_settings_revisions) = 1
  and (select count(*) from public.jumuah_sessions) = 1
  and (select count(*) from public.prayer_overrides) = 1
  and (select count(*) from public.seasonal_arrangements) = 1
  and (select count(*) from public.enquiries) = 0
  and (select count(*) from public.admin_invites) = 0
  and (select count(*) from public.redirects) = 1
  and (select count(*) from public.audit_log) > 0,
  'read-only reviewer can inspect content, media, prayer, redirects, and audit but no private domain'
);
select extensions.throws_ok(
  $$insert into public.content_items (kind, slug, title) values ('page', 'reviewer-write', 'Forbidden reviewer write')$$,
  '42501', null, 'read-only reviewer cannot create website content'
);
select extensions.throws_ok(
  $$select * from public.save_prayer_draft(null, null, '{}'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'read-only reviewer cannot alter prayer settings'
);
select extensions.is(
  tests.exec_rows($$update public.enquiries set status = 'closed', closed_at = now() where id = '30000000-0000-0000-0000-000000000001'$$),
  0::bigint,
  'read-only reviewer cannot alter enquiries'
);
select tests.set_auth('10000000-0000-0000-0000-000000000004', 'aal2');
select extensions.ok(
  (select count(*) from public.admin_profiles) = 1
  and (select count(*) from public.site_settings) = 2
  and (select count(*) from public.content_items) = 1
  and (select count(*) from public.content_revisions) = 4
  and (select count(*) from public.media_assets) = 0
  and (select count(*) from public.media_usage) = 0
  and (select count(*) from public.prayer_settings) = 0
  and (select count(*) from public.prayer_settings_revisions) = 0
  and (select count(*) from public.jumuah_sessions) = 0
  and (select count(*) from public.prayer_overrides) = 0
  and (select count(*) from public.seasonal_arrangements) = 0
  and (select count(*) from public.enquiries) = 1
  and (select count(*) from public.admin_invites) = 0
  and (select count(*) from public.redirects) = 1
  and (select count(*) from public.audit_log) = 0,
  'enquiries manager RLS exposes only self, settings, content-read, enquiries, and redirects'
);
select extensions.throws_ok(
  $$insert into public.content_items (kind, slug, title) values ('page', 'enquiries-editor-write', 'Forbidden enquiries write')$$,
  '42501', null, 'enquiries manager cannot create website content'
);
select extensions.throws_ok(
  $$select * from public.save_prayer_draft(null, null, '{}'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'enquiries manager cannot alter prayer settings'
);
select extensions.throws_ok(
  $$insert into public.admin_profiles (id, display_name, role, status) values ('10000000-0000-0000-0000-000000000001', 'Forbidden profile', 'reviewer', 'active')$$,
  '42501', null, 'enquiries manager cannot create administrator profiles'
);
select extensions.is(
  tests.exec_rows($$update public.redirects set to_path = '/visit' where id = '25000000-0000-0000-0000-000000000001'$$),
  0::bigint,
  'enquiries manager cannot alter redirects'
);
reset role;

-- Super administrator: invitation lifecycle, disabling, and complete read access.
set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000005', 'aal1');
select extensions.throws_ok(
  $$insert into public.admin_invites (email, role, invited_by, expires_at) values ('invited@example.test', 'reviewer', '10000000-0000-0000-0000-000000000005', now() + interval '7 days')$$,
  '42501', null, 'AAL1 super administrator cannot create invitations'
);
select tests.set_auth('10000000-0000-0000-0000-000000000005', 'aal2');
insert into public.admin_profiles (id, display_name, role, status, invited_by)
values (
  '10000000-0000-0000-0000-000000000006',
  'Invited reviewer',
  'reviewer',
  'invited',
  '10000000-0000-0000-0000-000000000005'
);
insert into public.admin_invites (email, role, invited_by, expires_at)
values (
  'invited@example.test',
  'reviewer',
  '10000000-0000-0000-0000-000000000005',
  now() + interval '7 days'
);
select extensions.is((select count(*) from public.admin_profiles), 6::bigint, 'super administrator can see the full admin directory');
select extensions.is((select count(*) from public.admin_invites), 2::bigint, 'super administrator can see every pending invitation');
select extensions.ok(
  (select count(*) from public.site_settings) = 2
  and (select count(*) from public.content_items) = 1
  and (select count(*) from public.content_revisions) = 4
  and (select count(*) from public.media_assets) = 1
  and (select count(*) from public.media_usage) = 1
  and (select count(*) from public.prayer_settings) = 1
  and (select count(*) from public.prayer_settings_revisions) = 1
  and (select count(*) from public.jumuah_sessions) = 1
  and (select count(*) from public.prayer_overrides) = 1
  and (select count(*) from public.seasonal_arrangements) = 1
  and (select count(*) from public.enquiries) = 1
  and (select count(*) from public.redirects) = 1
  and (select count(*) from public.audit_log) > 0,
  'super administrator RLS exposes every application domain'
);
update public.admin_invites set revoked_at = now() where email = 'invited@example.test';
select extensions.ok((select revoked_at is not null from public.admin_invites where email = 'invited@example.test'), 'super administrator can revoke a pending invitation');
select extensions.throws_ok(
  $$delete from public.admin_invites where email = 'hidden-invite@example.test'$$,
  '42501', null, 'administrator invitations must be revoked rather than hard-deleted'
);
update public.admin_profiles
set status = 'disabled', disabled_at = now()
where id = '10000000-0000-0000-0000-000000000002';
reset role;

set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000001', 'aal2');
select extensions.ok(
  (select count(*) from public.admin_profiles) = 0
  and (select count(*) from public.admin_invites) = 0
  and (select count(*) from public.site_settings) = 0
  and (select count(*) from public.content_items) = 0
  and (select count(*) from public.content_revisions) = 0
  and (select count(*) from public.media_assets) = 0
  and (select count(*) from public.media_usage) = 0
  and (select count(*) from public.prayer_settings) = 0
  and (select count(*) from public.prayer_settings_revisions) = 0
  and (select count(*) from public.jumuah_sessions) = 0
  and (select count(*) from public.prayer_overrides) = 0
  and (select count(*) from public.seasonal_arrangements) = 0
  and (select count(*) from public.enquiries) = 0
  and (select count(*) from public.redirects) = 0
  and (select count(*) from public.audit_log) = 0,
  'authenticated non-administrator cannot read any populated application domain'
);
reset role;

set local role authenticated;
select tests.set_auth('10000000-0000-0000-0000-000000000002', 'aal2');
select extensions.is(public.current_admin_role(), null::public.admin_role, 'disabled account immediately loses its database role');
select extensions.is(public.has_permission('content:read'), false, 'disabled account immediately loses all permissions');
select extensions.ok(
  (select count(*) from public.admin_profiles) = 1
  and (select count(*) from public.admin_invites) = 0
  and (select count(*) from public.site_settings) = 0
  and (select count(*) from public.content_items) = 0
  and (select count(*) from public.content_revisions) = 0
  and (select count(*) from public.media_assets) = 0
  and (select count(*) from public.media_usage) = 0
  and (select count(*) from public.prayer_settings) = 0
  and (select count(*) from public.prayer_settings_revisions) = 0
  and (select count(*) from public.jumuah_sessions) = 0
  and (select count(*) from public.prayer_overrides) = 0
  and (select count(*) from public.seasonal_arrangements) = 0
  and (select count(*) from public.enquiries) = 0
  and (select count(*) from public.redirects) = 0
  and (select count(*) from public.audit_log) = 0,
  'disabled account can read only its own disabled profile and no application domain'
);
select extensions.throws_ok(
  $$insert into public.content_items (kind, slug, title) values ('page', 'disabled-write', 'Disabled write')$$,
  '42501', null, 'disabled account cannot alter content'
);
reset role;

-- Database invariants reject malformed, conflicting, or incomplete records.
select extensions.throws_ok(
  $$insert into public.content_items (kind, slug, title) values ('page', 'Invalid Slug', 'Invalid')$$,
  '23514', null, 'content slugs are constrained'
);
select extensions.throws_ok(
  $$insert into public.enquiries (kind, name, message, privacy_notice_version, retention_until) values ('general', 'No route', 'A sufficiently long message', 'v1', current_date + 1)$$,
  '23514', null, 'enquiries require a contact route'
);
select extensions.throws_ok(
  $$insert into public.admin_profiles (id, display_name, role, status) values ('10000000-0000-0000-0000-000000000001', 'Bad disabled state', 'reviewer', 'disabled')$$,
  '23514', null, 'disabled profiles require a timestamp'
);
select extensions.throws_ok(
  $$insert into public.media_assets (object_path, original_name, mime_type, byte_size, width, height, alt_text, decorative, uploaded_by) values ('x/a.webp', 'a.webp', 'image/webp', 100, 10, 10, null, false, '10000000-0000-0000-0000-000000000005')$$,
  '23514', null, 'meaningful media require alternative text'
);
select extensions.ok(
  (select count(*) >= 3 from public.audit_log where entity_type = 'content_items' and entity_id = '20000000-0000-0000-0000-000000000001'),
  'draft, schedule, publish, and restore changes are auditable'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.audit_log', 'insert')
  and not has_table_privilege('authenticated', 'public.audit_log', 'update')
  and not has_table_privilege('authenticated', 'public.audit_log', 'delete'),
  'audit log is append-only for authenticated accounts, including super administrators'
);

select * from extensions.finish();
rollback;
