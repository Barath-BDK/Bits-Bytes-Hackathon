create type public.report_kind as enum ('pothole', 'waterlogging', 'worksite');
create type public.cluster_status as enum ('open', 'resolved');

create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  kind public.report_kind not null,
  location extensions.geography(Point, 4326) not null,
  status public.cluster_status not null default 'open',
  report_count int not null default 0,
  reporter_count int not null default 0,
  severity_max smallint not null default 1,
  department text,
  promised_end date,
  first_reported_at timestamptz not null default now(),
  last_reported_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index clusters_location_idx on public.clusters using gist (location);
create index clusters_kind_status_idx on public.clusters (kind, status);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.clusters (id) on delete cascade,
  kind public.report_kind not null,
  location extensions.geography(Point, 4326) not null,
  severity smallint not null check (severity between 1 and 3),
  note text check (char_length(note) <= 500),
  department text check (char_length(department) <= 120),
  promised_end date,
  photo_path text check (char_length(photo_path) <= 200),
  reporter_hash text not null check (char_length(reporter_hash) = 64),
  created_at timestamptz not null default now()
);
create index reports_cluster_idx on public.reports (cluster_id);
create index reports_reporter_idx on public.reports (reporter_hash, created_at);

create table public.confirmations (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.clusters (id) on delete cascade,
  verdict text not null check (verdict in ('fixed', 'still_there')),
  reporter_hash text not null check (char_length(reporter_hash) = 64),
  created_at timestamptz not null default now(),
  unique (cluster_id, reporter_hash)
);

-- Default-deny: RLS on, no write policies. All writes go through token-checked functions.
alter table public.clusters enable row level security;
alter table public.reports enable row level security;
alter table public.confirmations enable row level security;
create policy "clusters are public" on public.clusters for select to anon, authenticated using (true);

-- Shared secret between our API and the DB, invisible to anon/authenticated.
-- The token is generated inside the database; copy it into the DB_RPC_TOKEN env var (see README).
create schema private;
revoke all on schema private from public, anon, authenticated;
create table private.app_secrets (name text primary key, value text not null);
insert into private.app_secrets values ('rpc_token', encode(extensions.gen_random_bytes(32), 'hex'));

create function private.check_token(p_token text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_token is null or p_token <> (select value from private.app_secrets where name = 'rpc_token') then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end $$;

-- Transparent priority: severity, distinct reporters, age, and overlap with an active work site.
create function public.cluster_priority(c public.clusters, near_worksite boolean)
returns int language sql stable set search_path = '' as $$
  select (20 * c.severity_max
        + 8 * least(c.reporter_count, 10)
        + least(floor(extract(epoch from now() - c.first_reported_at) / 86400 * 3), 21)
        + case when near_worksite then 15 else 0 end)::int;
$$;

create function public.get_clusters(min_lng float8, min_lat float8, max_lng float8, max_lat float8)
returns table (
  id uuid, kind public.report_kind, status public.cluster_status, lat float8, lng float8,
  report_count int, reporter_count int, severity_max smallint, department text, promised_end date,
  first_reported_at timestamptz, last_reported_at timestamptz, near_worksite boolean, priority int
)
language sql stable security definer set search_path = public, extensions as $$
  with box as (select st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography g),
  c as (
    select cl, exists (
      select 1 from clusters w
      where cl.kind <> 'worksite' and w.kind = 'worksite' and w.status = 'open'
        and st_dwithin(w.location, cl.location, 60)
    ) as near_ws
    from clusters cl, box where st_intersects(cl.location, box.g)
  )
  select (c.cl).id, (c.cl).kind, (c.cl).status, st_y((c.cl).location::geometry), st_x((c.cl).location::geometry),
         (c.cl).report_count, (c.cl).reporter_count, (c.cl).severity_max, (c.cl).department, (c.cl).promised_end,
         (c.cl).first_reported_at, (c.cl).last_reported_at, c.near_ws, cluster_priority(c.cl, c.near_ws)
  from c order by 14 desc limit 500;
$$;

create function public.get_cluster(p_id uuid) returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'cluster', (select row_to_json(x) from get_clusters(-180, -90, 180, 90) x where x.id = p_id),
    'reports', coalesce((select json_agg(json_build_object(
        'id', r.id, 'severity', r.severity, 'note', r.note, 'department', r.department,
        'promised_end', r.promised_end, 'has_photo', r.photo_path is not null, 'created_at', r.created_at)
        order by r.created_at desc) from reports r where r.cluster_id = p_id), '[]'::json),
    'confirmations', (select json_build_object(
        'fixed', count(*) filter (where verdict = 'fixed'),
        'still_there', count(*) filter (where verdict = 'still_there'))
      from confirmations where cluster_id = p_id)
  );
$$;

create function public.submit_report(
  p_token text, p_kind public.report_kind, p_lat float8, p_lng float8, p_severity smallint,
  p_note text, p_department text, p_promised_end date, p_photo_path text, p_reporter_hash text
) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_point geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_radius int := case p_kind when 'pothole' then 25 when 'waterlogging' then 75 else 50 end;
  v_cluster clusters;
  v_new_reporter boolean := true;
  v_joined boolean := false;
  v_report_id uuid;
begin
  perform private.check_token(p_token);
  if p_lat not between 6 and 37.5 or p_lng not between 68 and 97.5 then
    raise exception 'location outside India' using errcode = '22023';
  end if;
  if (select count(*) from reports where reporter_hash = p_reporter_hash
      and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;

  -- Serialise per kind so two simultaneous reports of one pothole cannot create two clusters.
  perform pg_advisory_xact_lock(hashtext('cluster:' || p_kind::text));

  select * into v_cluster from clusters
  where kind = p_kind and status = 'open' and st_dwithin(location, v_point, v_radius)
  order by st_distance(location, v_point) limit 1;

  if found then
    v_joined := true;
    v_new_reporter := not exists (select 1 from reports where cluster_id = v_cluster.id and reporter_hash = p_reporter_hash);
  else
    insert into clusters (kind, location) values (p_kind, v_point) returning * into v_cluster;
  end if;

  insert into reports (cluster_id, kind, location, severity, note, department, promised_end, photo_path, reporter_hash)
  values (v_cluster.id, p_kind, v_point, p_severity, nullif(trim(p_note), ''), nullif(trim(p_department), ''),
          p_promised_end, p_photo_path, p_reporter_hash)
  returning id into v_report_id;

  update clusters set
    report_count = report_count + 1,
    reporter_count = reporter_count + case when v_new_reporter then 1 else 0 end,
    severity_max = greatest(severity_max, p_severity),
    last_reported_at = now(),
    department = coalesce(nullif(trim(p_department), ''), department),
    promised_end = coalesce(p_promised_end, promised_end),
    location = (select st_centroid(st_collect(location::geometry))::geography from reports where cluster_id = v_cluster.id)
  where id = v_cluster.id
  returning * into v_cluster;

  return json_build_object('cluster_id', v_cluster.id, 'report_id', v_report_id, 'joined_existing', v_joined,
                           'report_count', v_cluster.report_count, 'reporter_count', v_cluster.reporter_count);
end $$;

-- A fix closes only on 2+ "fixed" votes that outnumber "still there".
create function public.confirm_cluster(p_token text, p_cluster_id uuid, p_verdict text, p_reporter_hash text)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_fixed int; v_still int; v_status cluster_status;
begin
  perform private.check_token(p_token);
  insert into confirmations (cluster_id, verdict, reporter_hash) values (p_cluster_id, p_verdict, p_reporter_hash)
  on conflict (cluster_id, reporter_hash) do update set verdict = excluded.verdict, created_at = now();

  select count(*) filter (where verdict = 'fixed'), count(*) filter (where verdict = 'still_there')
  into v_fixed, v_still from confirmations where cluster_id = p_cluster_id;

  update clusters set
    status = case when v_fixed >= 2 and v_fixed > v_still then 'resolved'::cluster_status else 'open'::cluster_status end,
    resolved_at = case when v_fixed >= 2 and v_fixed > v_still then coalesce(resolved_at, now()) else null end
  where id = p_cluster_id returning status into v_status;
  if not found then raise exception 'cluster not found' using errcode = 'P0002'; end if;

  return json_build_object('status', v_status, 'fixed', v_fixed, 'still_there', v_still);
end $$;

revoke execute on all functions in schema public from public;
revoke execute on function private.check_token(text) from public;
grant execute on function public.health() to anon, authenticated;
grant execute on function public.get_clusters(float8, float8, float8, float8) to anon, authenticated;
grant execute on function public.get_cluster(uuid) to anon, authenticated;
grant execute on function public.cluster_priority(public.clusters, boolean) to anon, authenticated;
grant execute on function public.submit_report(text, public.report_kind, float8, float8, smallint, text, text, date, text, text) to anon;
grant execute on function public.confirm_cluster(text, uuid, text, text) to anon;
