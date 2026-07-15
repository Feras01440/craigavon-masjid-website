-- Final product workflows: SEO fields, homepage management, seasonal prayer editing,
-- and an explicitly service-role-only local demonstration seed.

alter table public.site_settings
  add column demo_local_only boolean not null default false;

alter table public.content_items
  add column demo_local_only boolean not null default false,
  add column seo_title text,
  add column seo_description text,
  add constraint content_seo_title_length check (
    seo_title is null or char_length(seo_title) <= 160
  ),
  add constraint content_seo_description_length check (
    seo_description is null or char_length(seo_description) <= 320
  );

alter table public.prayer_settings
  add column demo_local_only boolean not null default false;

-- A draft cloned from local-only demonstration prayer data must remain local-only.
-- This replaces the original function only to carry the new marker through both
-- current-record and revision-restoration paths.
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

  -- The demo-only calculation uses a fixed Isha interval so the rolling sample
  -- remains internally valid at this high latitude. It is not a production
  -- recommendation and cannot be shown unless local demo mode is explicit.
  insert into public.prayer_settings (
    name, status, effective_from, effective_to, timezone, latitude, longitude,
    calculation_method, madhab, high_latitude_rule, adjustments, congregation_rules,
    hijri_adjustment, source_name, source_reference, calculation_library,
    calculation_library_version, created_by, updated_by, demo_local_only
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
    auth.uid(),
    coalesce((v_settings ->> 'demo_local_only')::boolean, false)
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
    'site_identity', 'homepage_content', 'contact_information', 'navigation_footer',
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

create or replace function public.save_seasonal_arrangement(
  p_settings_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns table (arrangement_id uuid, settings_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arrangement_id uuid;
  v_version integer;
  v_requested_id uuid;
begin
  if not public.has_permission('prayer:write') or not public.has_aal2() then
    raise exception 'Prayer editing requires an authorised account with MFA.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
    or jsonb_typeof(coalesce(p_payload -> 'details', '{}'::jsonb)) <> 'object' then
    raise exception 'The seasonal arrangement payload is invalid.' using errcode = '22023';
  end if;

  update public.prayer_settings
  set updated_at = now()
  where id = p_settings_id and version = p_expected_version and status = 'draft'
  returning version into v_version;
  if not found then
    raise exception 'This draft changed or is no longer editable.' using errcode = '40001';
  end if;

  v_requested_id = nullif(p_payload ->> 'id', '')::uuid;
  if v_requested_id is null then
    insert into public.seasonal_arrangements (
      prayer_settings_id, kind, title, starts_on, ends_on, details, created_by
    ) values (
      p_settings_id,
      p_payload ->> 'kind',
      p_payload ->> 'title',
      (p_payload ->> 'starts_on')::date,
      (p_payload ->> 'ends_on')::date,
      coalesce(p_payload -> 'details', '{}'::jsonb),
      auth.uid()
    ) returning id into v_arrangement_id;
  else
    update public.seasonal_arrangements
    set
      kind = p_payload ->> 'kind',
      title = p_payload ->> 'title',
      starts_on = (p_payload ->> 'starts_on')::date,
      ends_on = (p_payload ->> 'ends_on')::date,
      details = coalesce(p_payload -> 'details', '{}'::jsonb)
    where id = v_requested_id and prayer_settings_id = p_settings_id
    returning id into v_arrangement_id;
    if not found then
      raise exception 'That seasonal arrangement no longer exists.' using errcode = 'P0002';
    end if;
  end if;

  return query select v_arrangement_id, v_version;
end;
$$;

create or replace function public.delete_seasonal_arrangement(
  p_settings_id uuid,
  p_expected_version integer,
  p_arrangement_id uuid
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
  delete from public.seasonal_arrangements
  where id = p_arrangement_id and prayer_settings_id = p_settings_id;
  if not found then
    raise exception 'That seasonal arrangement no longer exists.' using errcode = 'P0002';
  end if;
  return v_version;
end;
$$;

create or replace function public.seed_local_demo_data(
  p_actor_id uuid,
  p_marker text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb;
  v_prayer_id uuid;
  v_content_count integer;
  v_event_start timestamptz;
  v_event_end timestamptz;
begin
  begin
    v_claims = coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  exception when others then
    v_claims = '{}'::jsonb;
  end;
  if coalesce(v_claims ->> 'role', '') <> 'service_role' or p_marker <> 'LOCAL_DEMO_ONLY' then
    raise exception 'Local demonstration seeding is service-role only.' using errcode = '42501';
  end if;

  -- Refuse to operate anywhere except the clean local shape produced by
  -- `supabase db reset` followed by scripts/setup-local.mjs. This prevents a
  -- production service key from turning an established project into a demo.
  if (select count(*) from auth.users) <> 5
    or exists (
      select 1 from auth.users
      where coalesce(raw_user_meta_data ->> 'local_demo', '') <> 'true'
    )
    or (select count(*) from public.admin_profiles) <> 5
    or exists (select 1 from public.content_items)
    or exists (select 1 from public.prayer_settings)
    or (select count(*) from public.site_settings) <> 2
    or exists (
      select 1 from public.site_settings
      where key not in ('feature_flags', 'launch_readiness')
        or status <> 'draft'
        or demo_local_only
    ) then
    raise exception 'Local demonstration seeding requires a clean local reset.' using errcode = '42501';
  end if;

  perform public.establish_trusted_admin_actor(p_actor_id, 'content:write');
  if public.current_admin_role() <> 'super_admin' then
    raise exception 'A local super administrator is required.' using errcode = '42501';
  end if;

  insert into public.site_settings (key, value, status, demo_local_only)
  values
    ('site_identity', jsonb_build_object(
      'official_name', 'Muslim Association of Craigavon',
      'public_masjid_name', 'Craigavon Masjid',
      'short_name', 'MAC',
      'default_meta_description', 'Local demonstration of the Muslim Association of Craigavon website.'
    ), 'published', true),
    ('homepage_content', jsonb_build_object(
      'eyebrow', 'Local demonstration',
      'heading', 'Muslim Association of Craigavon',
      'introduction', 'This local copy uses clearly labelled sample information so every product workflow can be inspected before production configuration.',
      'primary_cta_label', 'View demonstration prayer times',
      'primary_cta_route', 'prayer-times',
      'secondary_cta_label', 'About the Association',
      'secondary_cta_route', 'about',
      'information_heading', 'Demonstration data only',
      'information_points', jsonb_build_array(
        'Prayer settings are examples for exercising the calculation engine.',
        'Events and programmes shown here do not represent real bookings.',
        'Replace all demonstration records before a production launch.'
      )
    ), 'published', true),
    ('navigation_footer', jsonb_build_object(
      'primary_navigation', jsonb_build_array('prayer-times','visit','services','education','news','new-muslims','about','contact'),
      'footer_navigation', jsonb_build_array('about','policies','accessibility','news','visit','contact'),
      'footer_note', 'Local demonstration: sample information is not committee approved.',
      'footer_legal_note', 'Development copy only — do not use for travel, prayer or Association contact decisions.'
    ), 'published', true),
    ('tv_display', '{"refresh_seconds":30,"notice_rotation_seconds":10,"prayer_hold_minutes":5,"show_hijri_date":true,"show_notices":true,"footer_message":"LOCAL DEMONSTRATION — sample prayer values"}'::jsonb, 'published', true),
    ('feature_flags', '{"public_enquiries":false,"donations":false,"education_registration":false,"event_registration":false,"analytics":false}'::jsonb, 'published', true),
    ('contact_information', '{"address_line_1":"","address_line_2":"","locality":"","county":"","postcode":"","public_email":"","public_phone":"","public_whatsapp":"","map_url":"","directions":"","access_information":"","parking_information":"","public_transport_information":""}'::jsonb, 'draft', true),
    ('enquiry_configuration', '{"privacy_notice_version":"","retention_days":null,"queue_owner_role":"","monitoring_schedule":"","fallback_procedure":"","route_tested_at":"","notification_mode":"admin_queue"}'::jsonb, 'draft', true)
  on conflict (key) do update
  set value = excluded.value, status = excluded.status, demo_local_only = true;

  v_event_start = ((current_date + 7)::timestamp + time '18:00') at time zone 'Europe/London';
  v_event_end = ((current_date + 7)::timestamp + time '20:00') at time zone 'Europe/London';

  insert into public.content_items (
    kind, slug, title, summary, seo_title, seo_description, body, category,
    status, featured, publish_at, expires_at, demo_local_only
  ) values
    ('announcement', 'local-demo-welcome', '[LOCAL DEMO] Website walkthrough notice',
      'Sample announcement for checking the publication workflow.', null, null,
      '{"version":2,"format":"notice","text":"This is demonstration content created only in the local Supabase environment. It is not an Association announcement.","action_label":"Review the local prayer timetable","action_url":"/prayer-times"}'::jsonb,
      'Local demonstration', 'published', true, now() - interval '1 minute', now() + interval '30 days', true),
    ('event', 'local-demo-event', '[LOCAL DEMO] Sample event record',
      'Not a real event. This record demonstrates event dates, location and expiry.', null, null,
      jsonb_build_object('version',2,'format','event','text','This event is fictional demonstration data and is not open for attendance.','starts_at',v_event_start,'ends_at',v_event_end,'location','Local development environment — not a real venue','event_url',null),
      'Local demonstration', 'published', false, now() - interval '1 minute', now() + interval '30 days', true),
    ('recurring_programme', 'local-demo-recurring-programme', '[LOCAL DEMO] Sample recurring programme',
      'Not a real programme. Used to inspect recurring programme presentation.', null, null,
      '{"version":2,"format":"education","text":"This recurring programme is sample data only.","audience":"Local testers","schedule":"Demonstration schedule only","registration_url":null,"safeguarding_note":"No registration or personal data is collected."}'::jsonb,
      'Local demonstration', 'published', false, now() - interval '1 minute', null, true),
    ('service', 'local-demo-service', '[LOCAL DEMO] Sample service listing',
      'Not a real service. Used to inspect service content fields.', null, null,
      '{"version":2,"format":"service","text":"This record demonstrates the service publishing layout.","audience":"Local testers","availability":"Demonstration only","access_instructions":"No real enquiry route is attached.","service_url":null}'::jsonb,
      'Local demonstration', 'published', false, now() - interval '1 minute', null, true),
    ('education', 'local-demo-learning', '[LOCAL DEMO] Sample learning listing',
      'Not a real class. Used to inspect learning content fields.', null, null,
      '{"version":2,"format":"education","text":"This learning record is sample data only.","audience":"Local testers","schedule":"Demonstration only","registration_url":null,"safeguarding_note":"No child or attendee data is collected."}'::jsonb,
      'Local demonstration', 'published', false, now() - interval '1 minute', null, true),
    ('faq', 'local-demo-faq', '[LOCAL DEMO] Is this information approved?',
      'A demonstration frequently asked question.', null, null,
      '{"version":2,"format":"faq","text":"No. Every record marked LOCAL DEMO exists only to exercise the local product."}'::jsonb,
      'Local demonstration', 'published', false, now() - interval '1 minute', null, true),
    ('announcement', 'local-demo-draft-announcement', '[LOCAL DEMO] Draft announcement',
      'Private sample draft for the editor workflow.', null, null,
      '{"version":2,"format":"notice","text":"This draft is visible only in administration.","action_label":null,"action_url":null}'::jsonb,
      'Local demonstration', 'draft', false, null, null, true),
    ('policy', 'local-demo-draft-policy', '[LOCAL DEMO] Draft policy shell',
      'Not adopted policy. Private draft used to inspect policy controls.', null, null,
      '{"version":2,"format":"policy","text":"This is not an adopted policy and must never be cited as one.","owner":null,"effective_on":null,"review_on":null,"download_url":null}'::jsonb,
      'Local demonstration', 'draft', false, null, null, true);
  get diagnostics v_content_count = row_count;

  insert into public.prayer_settings (
    name, status, effective_from, effective_to, timezone, latitude, longitude,
    calculation_method, madhab, high_latitude_rule, adjustments, congregation_rules,
    hijri_adjustment, source_name, source_reference, calculation_library,
    calculation_library_version, created_by, updated_by, demo_local_only
  ) values (
    '[LOCAL DEMO] Prayer calculation example', 'draft', current_date - 30, current_date + 334,
    'Europe/London', 54.45, -6.39, 'umm_al_qura', 'hanafi', 'middle_of_night',
    '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}'::jsonb,
    '{"fajr":{"type":"offset","minutes":30,"roundTo":5},"dhuhr":{"type":"offset","minutes":20,"roundTo":5},"asr":{"type":"offset","minutes":15,"roundTo":5},"maghrib":{"type":"offset","minutes":10,"roundTo":5},"isha":{"type":"offset","minutes":20,"roundTo":5}}'::jsonb,
    0, '[LOCAL DEMO] Calculated example — not approved prayer data',
    'Generated solely to exercise the local prayer engine.', 'adhan', '4.4.4', p_actor_id, p_actor_id, true
  ) returning id into v_prayer_id;

  insert into public.jumuah_sessions (
    prayer_settings_id, label, khutbah_time, prayer_time, display_order, notes
  ) values
    (v_prayer_id, '[LOCAL DEMO] Friday session', '13:50', '14:00', 1, 'Sample only; not a real Jumuah time.');

  insert into public.prayer_overrides (
    prayer_settings_id, prayer_date, prayer, unavailable, reason, created_by
  ) values (
    v_prayer_id, current_date + 1, 'maghrib', true,
    '[LOCAL DEMO] One-date unavailable override.', p_actor_id
  );

  insert into public.seasonal_arrangements (
    prayer_settings_id, kind, title, starts_on, ends_on, details, created_by
  ) values
    (v_prayer_id, 'other', '[LOCAL DEMO] Current seasonal arrangement', current_date, current_date + 6,
      '{"public_note":"Sample TV and public-page seasonal note; not a real arrangement.","congregation_rules":{"isha":{"type":"offset","minutes":25,"roundTo":5}}}'::jsonb, p_actor_id),
    (v_prayer_id, 'ramadan', '[LOCAL DEMO] Ramadan arrangement', current_date + 30, current_date + 59,
      '{"public_note":"Fictional dates for workflow testing only.","congregation_rules":{"fajr":{"type":"offset","minutes":20,"roundTo":5},"isha":{"type":"offset","minutes":30,"roundTo":5}}}'::jsonb, p_actor_id),
    (v_prayer_id, 'eid_al_fitr', '[LOCAL DEMO] Eid information', current_date + 60, current_date + 60,
      '{"public_note":"Sample Eid information record; no real time or venue is represented.","congregation_rules":{}}'::jsonb, p_actor_id);

  update public.prayer_settings
  set status = 'published',
      approval_note = 'LOCAL DEMONSTRATION ONLY — not committee-approved prayer or Jumuah values.',
      approved_by = p_actor_id,
      published_at = now()
  where id = v_prayer_id;

  return jsonb_build_object(
    'content_items', v_content_count,
    'prayer_settings_id', v_prayer_id,
    'mode', 'LOCAL_DEMO_ONLY'
  );
end;
$$;

revoke all on function public.save_seasonal_arrangement(uuid, integer, jsonb) from public;
revoke all on function public.delete_seasonal_arrangement(uuid, integer, uuid) from public;
revoke all on function public.seed_local_demo_data(uuid, text) from public;
grant execute on function public.save_seasonal_arrangement(uuid, integer, jsonb) to authenticated;
grant execute on function public.delete_seasonal_arrangement(uuid, integer, uuid) to authenticated;
grant execute on function public.seed_local_demo_data(uuid, text) to service_role;

-- Supabase grants application-schema functions and tables to API roles through
-- platform defaults. Clear those inherited capabilities explicitly, then grant
-- only the surface used by the server and the authenticated editor workflows.
-- RLS remains the row boundary; these grants are the independent capability
-- boundary and prevent server-only RPCs or hard-delete paths from being reached.
revoke all on all functions in schema public from public, anon, authenticated, service_role;

grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.has_aal2() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.register_media_asset(text, text, text, bigint, integer, integer, text, boolean, text, text, public.media_status) to authenticated;
grant execute on function public.update_media_asset_status(uuid, timestamptz, public.media_status) to authenticated;
grant execute on function public.save_prayer_draft(uuid, integer, jsonb, jsonb) to authenticated;
grant execute on function public.clone_prayer_settings_draft(uuid, bigint) to authenticated;
grant execute on function public.save_prayer_override(uuid, integer, jsonb) to authenticated;
grant execute on function public.delete_prayer_override(uuid, integer, uuid) to authenticated;
grant execute on function public.save_seasonal_arrangement(uuid, integer, jsonb) to authenticated;
grant execute on function public.delete_seasonal_arrangement(uuid, integer, uuid) to authenticated;

grant execute on function public.save_site_setting(uuid, text, integer, public.content_status, jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer, integer) to service_role;
grant execute on function public.purge_expired_operational_data() to service_role;
grant execute on function public.publish_prayer_settings(uuid, uuid, integer, text) to service_role;
grant execute on function public.withdraw_prayer_settings(uuid, uuid, integer, text, uuid, integer, text) to service_role;
grant execute on function public.seed_local_demo_data(uuid, text) to service_role;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select, insert, update on public.admin_profiles, public.admin_invites,
  public.content_items, public.enquiries, public.redirects
  to authenticated;
grant select on public.site_settings to authenticated;
grant select on public.media_assets, public.media_usage to authenticated;
grant select on public.prayer_settings, public.jumuah_sessions,
  public.prayer_overrides, public.seasonal_arrangements to authenticated;
grant delete on public.enquiries to authenticated;
grant select on public.content_revisions, public.prayer_settings_revisions,
  public.audit_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;
