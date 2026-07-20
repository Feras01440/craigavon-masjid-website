-- The 2026 public redesign renamed the homepage identity to "Craigavon Masjid"
-- and simplified navigation (visit and new-muslims folded into contact and
-- services). The local demonstration seed must produce the same shape so the
-- acceptance walkthrough exercises what production shows.

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
      'default_meta_description', 'Local demonstration of the Craigavon Masjid website.'
    ), 'published', true),
    ('homepage_content', jsonb_build_object(
      'eyebrow', 'Local demonstration',
      'heading', 'Craigavon Masjid',
      'introduction', 'This local copy uses clearly labelled sample information so every product workflow can be inspected before production configuration.',
      'primary_cta_label', 'View demonstration prayer times',
      'primary_cta_route', 'prayer-times',
      'secondary_cta_label', '',
      'secondary_cta_route', '',
      'information_heading', '',
      'information_points', jsonb_build_array()
    ), 'published', true),
    ('navigation_footer', jsonb_build_object(
      'primary_navigation', jsonb_build_array('prayer-times','about','services','education','news','contact'),
      'footer_navigation', jsonb_build_array('prayer-times','about','services','education','news','policies','accessibility','contact'),
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
    -- The structural arrangement mirrors the masjid's real practice
    -- (Moonsighting Committee, standard Asr, seventh-of-the-night, Isha
    -- prayed jointly with Maghrib, Jumuah 13:00) so local previews and the
    -- acceptance suite exercise the configuration that production will use;
    -- the values remain demo-marked and are not committee approvals.
    'Europe/London', 54.4478, -6.3712, 'moonsighting_committee', 'standard', 'seventh_of_night',
    '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}'::jsonb,
    '{"fajr":{"type":"offset","minutes":60,"roundTo":5},"dhuhr":{"type":"offset","minutes":25,"roundTo":5},"asr":{"type":"offset","minutes":5,"roundTo":1},"maghrib":{"type":"offset","minutes":5,"roundTo":1},"isha":{"type":"joined","with":"maghrib"}}'::jsonb,
    0, '[LOCAL DEMO] Calculated example — not approved prayer data',
    'Generated solely to exercise the local prayer engine.', 'adhan', '4.4.4', p_actor_id, p_actor_id, true
  ) returning id into v_prayer_id;

  insert into public.jumuah_sessions (
    prayer_settings_id, label, khutbah_time, prayer_time, display_order, notes
  ) values
    (v_prayer_id, '[LOCAL DEMO] Jumuʿah', '13:00', null, 1, 'Sample only; not a committee approval.');

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
