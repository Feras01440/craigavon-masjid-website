\set ON_ERROR_STOP on

set session_replication_role = replica;
delete from public.audit_log
where actor_id in (
  '91000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000002'
)
or entity_id in (
  '92000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
    '94000000-0000-0000-0000-000000000001'
  );
-- session_replication_role = replica suppresses both audit triggers and foreign-key
-- cascade triggers, so remove generated child rows explicitly before their parents.
delete from public.content_revisions
where content_item_id = '92000000-0000-0000-0000-000000000001';
delete from public.jumuah_sessions
where prayer_settings_id = '93000000-0000-0000-0000-000000000001';
delete from public.prayer_overrides
where prayer_settings_id = '93000000-0000-0000-0000-000000000001';
delete from public.seasonal_arrangements
where prayer_settings_id = '93000000-0000-0000-0000-000000000001';
delete from public.prayer_settings_revisions
where prayer_settings_id = '93000000-0000-0000-0000-000000000001';
delete from public.enquiries where id = '94000000-0000-0000-0000-000000000001';
delete from public.prayer_settings where id = '93000000-0000-0000-0000-000000000001';
delete from public.content_items where id = '92000000-0000-0000-0000-000000000001';
delete from public.site_settings where key = 'recovery_fixture';
delete from public.admin_invites where email = 'recovery-invite@example.test';
delete from public.admin_profiles where id in (
  '91000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000002'
);
delete from auth.users where id in (
  '91000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000002'
);
set session_replication_role = origin;
