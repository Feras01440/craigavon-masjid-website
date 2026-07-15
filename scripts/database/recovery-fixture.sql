\set ON_ERROR_STOP on

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'recovery-super@example.test',
    crypt('Recovery-only-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'recovery-invite@example.test',
    crypt('Recovery-only-password', gen_salt('bf')), null,
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2","email":"recovery-super@example.test"}',
  true
);

insert into public.admin_profiles (id, display_name, role, status, mfa_required)
values (
  '91000000-0000-0000-0000-000000000001',
  'Recovery super administrator',
  'super_admin',
  'active',
  true
);

insert into public.admin_profiles (
  id, display_name, role, status, mfa_required, invited_by
)
values (
  '91000000-0000-0000-0000-000000000002',
  'Recovery invited reviewer',
  'reviewer',
  'invited',
  true,
  '91000000-0000-0000-0000-000000000001'
);

insert into public.admin_invites (email, role, invited_by, expires_at)
values (
  'recovery-invite@example.test',
  'reviewer',
  '91000000-0000-0000-0000-000000000001',
  now() + interval '7 days'
);

insert into public.site_settings (key, value, status)
values (
  'recovery_fixture',
  '{"contact":"028 0000 0000","enabled":true,"note":"release-candidate recovery probe"}',
  'published'
);

insert into public.content_items (
  id, kind, slug, title, summary, body, status, expires_at
)
values (
  '92000000-0000-0000-0000-000000000001',
  'announcement',
  'recovery-announcement',
  'Recovery announcement draft',
  'Realistic content used only during the isolated restore rehearsal.',
  '{"blocks":[{"type":"paragraph","text":"Backup and restore verification content."}]}',
  'draft',
  '2099-02-01T00:00:00Z'
);

update public.content_items
set status = 'published', title = 'Recovery announcement'
where id = '92000000-0000-0000-0000-000000000001';

insert into public.prayer_settings (
  id, name, status, effective_from, effective_to, timezone, latitude, longitude,
  calculation_method, madhab, high_latitude_rule, adjustments, congregation_rules,
  hijri_adjustment, source_name, source_reference, calculation_library,
  calculation_library_version, created_by, updated_by
)
values (
  '93000000-0000-0000-0000-000000000001',
  'Recovery prayer timetable',
  'draft',
  '2099-01-01',
  '2099-01-31',
  'Europe/London',
  54.45,
  -6.39,
  'MoonsightingCommittee',
  'hanafi',
  'seventh_of_night',
  '{}',
  '{"fajr":{"mode":"fixed","minutes":20}}',
  0,
  'Release-candidate recovery fixture',
  'P1 backup rehearsal',
  'adhan',
  '4.4.4',
  '91000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001'
);

insert into public.jumuah_sessions (
  prayer_settings_id, label, khutbah_time, prayer_time, display_order
)
values (
  '93000000-0000-0000-0000-000000000001',
  'First Jumuah',
  '13:00',
  '13:15',
  1
);

update public.prayer_settings
set
  status = 'published',
  approval_note = 'Committee-approved recovery fixture',
  approved_by = '91000000-0000-0000-0000-000000000001',
  published_at = now()
where id = '93000000-0000-0000-0000-000000000001';

insert into public.enquiries (
  id, kind, name, email, phone, message, privacy_notice_version,
  source_fingerprint, retention_until
)
values (
  '94000000-0000-0000-0000-000000000001',
  'visit',
  'Recovery visitor',
  'visitor@example.test',
  '+44 28 0000 0000',
  'I would like to arrange a realistic sample visit for the recovery rehearsal.',
  'privacy-v1',
  'non-reversible-fixture-hash',
  '2099-03-01'
);

update public.enquiries
set
  status = 'in_progress',
  assigned_to = '91000000-0000-0000-0000-000000000001'
where id = '94000000-0000-0000-0000-000000000001';

commit;
