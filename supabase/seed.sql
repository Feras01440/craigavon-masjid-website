-- No public announcements, events, services, contact details or prayer times are seeded.
-- The committee must confirm and publish them through the dashboard.

insert into public.site_settings (key, value, status)
values
  (
    'feature_flags',
    '{
      "public_enquiries": false,
      "donations": false,
      "education_registration": false,
      "event_registration": false,
      "analytics": false
    }'::jsonb,
    'draft'
  ),
  (
    'launch_readiness',
    '{
      "official_logo_confirmed": false,
      "contact_details_confirmed": false,
      "prayer_configuration_confirmed": false,
      "policies_adopted": false
    }'::jsonb,
    'draft'
  )
on conflict (key) do nothing;
