-- Bulk import of a committee-approved timetable into a draft configuration.
--
-- A full calendar year of six daily start times is roughly 2,200 dated
-- entries, which the single-row save_prayer_override path cannot carry
-- practically. This RPC writes an entire validated import in one
-- transaction: either every row lands or none do. The optional replace mode
-- clears the draft's existing dated entries first, so a re-import can never
-- leave a mixture of old and new rows behind, and an insert failure rolls
-- the deletion back with everything else.

create or replace function public.import_prayer_overrides(
  p_settings_id uuid,
  p_expected_version integer,
  p_overrides jsonb,
  p_replace_existing boolean default false
)
returns table (settings_version integer, imported_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_incoming integer;
  v_total integer;
begin
  if not public.has_permission('prayer:write') or not public.has_aal2() then
    raise exception 'Prayer editing requires an authorised account with MFA.' using errcode = '42501';
  end if;
  if p_overrides is null or jsonb_typeof(p_overrides) <> 'array' then
    raise exception 'The import payload must be an array of dated entries.' using errcode = '22023';
  end if;
  v_incoming := jsonb_array_length(p_overrides);
  if v_incoming < 1 or v_incoming > 2600 then
    raise exception 'An import must contain between 1 and 2,600 dated entries.' using errcode = '22023';
  end if;

  update public.prayer_settings
  set updated_at = now()
  where id = p_settings_id and version = p_expected_version and status = 'draft'
  returning version into v_version;
  if not found then
    raise exception 'This draft changed or is no longer editable.' using errcode = '40001';
  end if;

  if p_replace_existing then
    delete from public.prayer_overrides where prayer_settings_id = p_settings_id;
  end if;

  insert into public.prayer_overrides (
    prayer_settings_id, prayer_date, prayer, begins_at, congregation_at,
    unavailable, reason, created_by
  ) select
    p_settings_id,
    (item ->> 'prayer_date')::date,
    (item ->> 'prayer')::public.prayer_key,
    (item ->> 'begins_at')::time,
    (item ->> 'congregation_at')::time,
    coalesce((item ->> 'unavailable')::boolean, false),
    item ->> 'reason',
    auth.uid()
  from jsonb_array_elements(p_overrides) item
  on conflict (prayer_settings_id, prayer_date, prayer)
  do update set
    begins_at = excluded.begins_at,
    congregation_at = excluded.congregation_at,
    unavailable = excluded.unavailable,
    reason = excluded.reason;

  select count(*)::integer into v_total
  from public.prayer_overrides
  where prayer_settings_id = p_settings_id;
  if v_total > 2600 then
    raise exception 'This draft would hold % dated entries; the maximum is 2,600.', v_total
      using errcode = '22023';
  end if;

  return query select v_version, v_incoming;
end;
$$;

revoke all on function public.import_prayer_overrides(uuid, integer, jsonb, boolean) from public;
grant execute on function public.import_prayer_overrides(uuid, integer, jsonb, boolean) to authenticated;
