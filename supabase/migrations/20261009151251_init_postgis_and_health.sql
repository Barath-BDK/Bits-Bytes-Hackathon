create extension if not exists postgis with schema extensions;

-- Hello-world round trip: returns only DB status and server time, no data.
create or replace function public.health()
returns json
language sql
stable
security invoker
set search_path = ''
as $$
  select json_build_object('db', 'ok', 'time', now(), 'postgis', extensions.postgis_lib_version());
$$;

revoke all on function public.health() from public;
grant execute on function public.health() to anon, authenticated;
