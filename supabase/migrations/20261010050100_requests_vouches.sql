-- Community requests (with a category) and public vouching; parking hotspots; clearer distance wording in findings.

alter table public.clusters add column if not exists category text
  check (category is null or category in ('streetlight', 'garbage', 'drain', 'tree', 'animals', 'water', 'other'));
alter table public.reports add column if not exists category text
  check (category is null or category in ('streetlight', 'garbage', 'drain', 'tree', 'animals', 'water', 'other'));

-- A vouch: "I need this too". One per person per issue; it counts as a supporter in the reporter count.
alter table public.confirmations drop constraint confirmations_verdict_check;
alter table public.confirmations add constraint confirmations_verdict_check check (verdict in ('fixed', 'still_there', 'vouch'));

drop function public.submit_report(text, public.report_kind, float8, float8, smallint, text, text, date, text, text);
create function public.submit_report(
  p_token text, p_kind public.report_kind, p_lat float8, p_lng float8, p_severity smallint,
  p_note text, p_department text, p_promised_end date, p_photo_path text, p_reporter_hash text,
  p_category text default null
) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_point geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_radius int := case p_kind when 'pothole' then 25 when 'waterlogging' then 75 when 'outage' then 300 when 'parking' then 40 when 'request' then 40 else 50 end;
  v_category text := case when p_kind = 'request' then p_category end;
  v_cluster clusters;
  v_new_reporter boolean := true;
  v_joined boolean := false;
  v_report_id uuid;
begin
  perform private.check_token(p_token);
  if p_lat not between 6 and 37.5 or p_lng not between 68 and 97.5 then
    raise exception 'location outside India' using errcode = '22023';
  end if;
  if p_kind = 'request' and v_category is null then
    raise exception 'request needs a category' using errcode = 'P0422';
  end if;
  if (select count(*) from reports where reporter_hash = p_reporter_hash
      and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;

  perform pg_advisory_xact_lock(hashtext('cluster:' || p_kind::text));

  -- requests merge only with the same kind of request; power cuts only with recent ones
  select * into v_cluster from clusters
  where kind = p_kind and status = 'open' and st_dwithin(location, v_point, v_radius)
    and (p_kind <> 'outage' or last_reported_at > now() - interval '6 hours')
    and category is not distinct from v_category
  order by st_distance(location, v_point) limit 1;

  if found then
    v_joined := true;
    v_new_reporter := not exists (select 1 from reports where cluster_id = v_cluster.id and reporter_hash = p_reporter_hash)
                  and not exists (select 1 from confirmations where cluster_id = v_cluster.id and reporter_hash = p_reporter_hash and verdict = 'vouch');
  else
    insert into clusters (kind, location, category) values (p_kind, v_point, v_category) returning * into v_cluster;
  end if;

  insert into reports (cluster_id, kind, location, severity, note, department, promised_end, photo_path, reporter_hash, category)
  values (v_cluster.id, p_kind, v_point, p_severity, nullif(trim(p_note), ''), nullif(trim(p_department), ''),
          p_promised_end, p_photo_path, p_reporter_hash, v_category)
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

create function public.vouch_cluster(p_token text, p_cluster_id uuid, p_reporter_hash text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_inserted boolean; v_count int; v_status cluster_status;
begin
  perform private.check_token(p_token);
  select status into v_status from clusters where id = p_cluster_id;
  if not found then raise exception 'cluster not found' using errcode = 'P0002'; end if;
  if (select count(*) from confirmations where reporter_hash = p_reporter_hash and verdict = 'vouch'
      and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;

  insert into confirmations (cluster_id, verdict, reporter_hash) values (p_cluster_id, 'vouch', p_reporter_hash)
  on conflict (cluster_id, reporter_hash) do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_count > 0;

  -- someone who already reported it does not count twice
  update clusters set
    reporter_count = reporter_count + case when v_inserted and not exists (
      select 1 from reports where cluster_id = p_cluster_id and reporter_hash = p_reporter_hash) then 1 else 0 end,
    last_reported_at = case when v_inserted then now() else last_reported_at end
  where id = p_cluster_id returning reporter_count into v_count;

  return json_build_object('vouched', v_inserted, 'reporter_count', v_count,
    'vouches', (select count(*) from confirmations where cluster_id = p_cluster_id and verdict = 'vouch'));
end $$;

drop function public.get_clusters(float8, float8, float8, float8);
create function public.get_clusters(min_lng float8, min_lat float8, max_lng float8, max_lat float8)
returns table (
  id uuid, kind public.report_kind, status public.cluster_status, lat float8, lng float8,
  report_count int, reporter_count int, severity_max smallint, department text, promised_end date,
  first_reported_at timestamptz, last_reported_at timestamptz, near_worksite boolean, priority int, cover_photo text, demo boolean,
  category text, vouches int
)
language sql stable security definer set search_path = public, extensions as $$
  with box as (select st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography g),
  c as (
    select cl, exists (
      select 1 from clusters w
      where cl.kind not in ('worksite', 'outage', 'request') and w.kind = 'worksite' and w.status = 'open'
        and st_dwithin(w.location, cl.location, 60)
    ) as near_ws
    from clusters cl, box where st_intersects(cl.location, box.g)
  )
  select (c.cl).id, (c.cl).kind, (c.cl).status, st_y((c.cl).location::geometry), st_x((c.cl).location::geometry),
         (c.cl).report_count, (c.cl).reporter_count, (c.cl).severity_max, (c.cl).department, (c.cl).promised_end,
         (c.cl).first_reported_at, (c.cl).last_reported_at, c.near_ws, cluster_priority(c.cl, c.near_ws),
         (select r.photo_path from reports r where r.cluster_id = (c.cl).id and r.photo_path is not null order by r.created_at desc limit 1),
         (c.cl).demo, (c.cl).category,
         (select count(*)::int from confirmations v where v.cluster_id = (c.cl).id and v.verdict = 'vouch')
  from c
  order by (c.cl).status = 'resolved', 14 desc
  limit 500;
$$;

create or replace function public.get_cluster(p_id uuid) returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'cluster', (select row_to_json(x) from get_clusters(68, 6, 97.5, 37.5) x where x.id = p_id),
    'reports', coalesce((select json_agg(json_build_object(
        'id', r.id, 'severity', r.severity, 'note', r.note, 'department', r.department,
        'promised_end', r.promised_end, 'photo', r.photo_path, 'created_at', r.created_at)
        order by r.created_at desc) from reports r where r.cluster_id = p_id), '[]'::json),
    'confirmations', (select json_build_object(
        'fixed', count(*) filter (where verdict = 'fixed'),
        'still_there', count(*) filter (where verdict = 'still_there'),
        'vouch', count(*) filter (where verdict = 'vouch'))
      from confirmations where cluster_id = p_id),
    'nearby_works', coalesce((select json_agg(json_build_object(
        'id', w.id, 'department', w.department, 'promised_end', w.promised_end,
        'distance_m', round(st_distance(w.location, c.location)::numeric)))
      from clusters c join clusters w on w.kind = 'worksite' and w.status = 'open' and w.id <> c.id
        and st_dwithin(w.location, c.location, 60)
      where c.id = p_id and c.kind not in ('worksite', 'outage', 'request')), '[]'::json)
  );
$$;

revoke execute on all functions in schema public from public;
grant execute on function public.health() to anon, authenticated;
grant execute on function public.cluster_priority(public.clusters, boolean) to anon, authenticated;
grant execute on function public.get_clusters(float8, float8, float8, float8) to anon, authenticated;
grant execute on function public.get_cluster(uuid) to anon, authenticated;
grant execute on function public.get_notices() to anon, authenticated;
grant execute on function public.get_findings() to anon, authenticated;
grant execute on function public.get_street(float8, float8, int) to anon, authenticated;
grant execute on function public.submit_report(text, public.report_kind, float8, float8, smallint, text, text, date, text, text, text) to anon;
grant execute on function public.confirm_cluster(text, uuid, text, text) to anon;
grant execute on function public.note_upload(text, text) to anon;
grant execute on function public.vouch_cluster(text, uuid, text) to anon;
