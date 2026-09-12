\set ON_ERROR_STOP on

do $$
declare
  application_table record;
begin
  for application_table in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  loop
    execute format(
      'alter table %I.%I enable trigger user',
      application_table.schemaname,
      application_table.tablename
    );
  end loop;
end;
$$;
