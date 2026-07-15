\set ON_ERROR_STOP on

do $$
begin
  if (select count(*) from public.site_settings) <> 3 then
    raise exception 'Expected two seed settings and one recovery setting.';
  end if;
  if not exists (
    select 1 from public.site_settings
    where key = 'recovery_fixture'
      and status = 'published'
      and value ->> 'contact' = '028 0000 0000'
  ) then
    raise exception 'Published site setting was not restored exactly.';
  end if;
  if not exists (
    select 1 from public.content_items
    where id = '92000000-0000-0000-0000-000000000001'
      and status = 'published'
      and title = 'Recovery announcement'
      and version = 2
  ) then
    raise exception 'Published content row or its version was not restored.';
  end if;
  if (select count(*) from public.content_revisions where content_item_id = '92000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'Content revision history was not restored.';
  end if;
  if not exists (
    select 1 from public.prayer_settings
    where id = '93000000-0000-0000-0000-000000000001'
      and status = 'published'
      and version = 2
      and approved_by = '91000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Approved prayer settings were not restored.';
  end if;
  if (select count(*) from public.prayer_settings_revisions where prayer_settings_id = '93000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'Prayer revision history was not restored.';
  end if;
  if (select count(*) from public.jumuah_sessions where prayer_settings_id = '93000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'Friday prayer sessions were not restored.';
  end if;
  if not exists (
    select 1 from public.enquiries
    where id = '94000000-0000-0000-0000-000000000001'
      and status = 'in_progress'
      and assigned_to = '91000000-0000-0000-0000-000000000001'
      and message like 'I would like%'
  ) then
    raise exception 'Private enquiry workflow data was not restored.';
  end if;
  if (select count(*) from public.admin_profiles) <> 2
    or (select count(*) from public.admin_invites) <> 1 then
    raise exception 'Administrator profile or invitation state was not restored.';
  end if;
  if not exists (
    select 1 from public.audit_log
    where entity_type = 'content_items'
      and entity_id = '92000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Audit history was not restored.';
  end if;
  if exists (
    select 1 from public.audit_log
    where entity_type = 'enquiries'
      and entity_id = '94000000-0000-0000-0000-000000000001'
      and (
        coalesce(before_state, '{}'::jsonb) ?| array['name','email','phone','message','source_fingerprint']
        or coalesce(after_state, '{}'::jsonb) ?| array['name','email','phone','message','source_fingerprint']
      )
  ) then
    raise exception 'Restored enquiry audit data contains private message or contact fields.';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'content_items_publication_idx'
  ) then
    raise exception 'Application indexes were not rebuilt in the recovery database.';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.content_items (kind, slug, title)
    values ('page', 'Invalid Restore Slug', 'Constraint probe');
    raise exception 'Expected slug constraint to reject invalid restored data.';
  exception
    when check_violation then
      null;
  end;
end;
$$;

select jsonb_build_object(
  'database', current_database(),
  'seed_settings', (select count(*) from public.site_settings where key in ('feature_flags', 'launch_readiness')),
  'admin_profiles', (select count(*) from public.admin_profiles),
  'pending_invites', (select count(*) from public.admin_invites where accepted_at is null and revoked_at is null),
  'content_rows', (select count(*) from public.content_items),
  'content_revisions', (select count(*) from public.content_revisions),
  'prayer_rows', (select count(*) from public.prayer_settings),
  'prayer_revisions', (select count(*) from public.prayer_settings_revisions),
  'enquiries', (select count(*) from public.enquiries),
  'audit_rows', (select count(*) from public.audit_log)
) as restored_evidence;
