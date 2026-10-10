create type public.notice_kind as enum ('road_permit', 'completion', 'resurfacing', 'power_shutdown', 'water_suspension', 'incident');
create type public.provenance as enum ('official', 'news', 'community', 'demo');

-- Published or recorded items: permissions, completions, schedules, incidents. Each keeps its source.
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  kind public.notice_kind not null,
  agency text not null check (char_length(agency) <= 120),
  title text not null check (char_length(title) <= 200),
  area_text text check (char_length(area_text) <= 300),
  location extensions.geography(Point, 4326) not null,
  radius_m int not null default 150 check (radius_m between 10 and 6000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  reference text check (char_length(reference) <= 80),
  source_name text not null check (char_length(source_name) <= 120),
  source_url text check (source_url is null or source_url ~ '^https://'),
  provenance public.provenance not null,
  imported_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index notices_location_idx on public.notices using gist (location);
create index notices_kind_idx on public.notices (kind, starts_at);
alter table public.notices enable row level security;
create policy "notices are public" on public.notices for select to anon, authenticated using (true);

-- Seeded demonstration data is labelled, never passed off as real.
alter table public.clusters add column demo boolean not null default false;
alter table public.reports add column demo boolean not null default false;

-- Outages cluster over 300 m and only join a report from the last 6 hours.
create or replace function public.submit_report(
  p_token text, p_kind public.report_kind, p_lat float8, p_lng float8, p_severity smallint,
  p_note text, p_department text, p_promised_end date, p_photo_path text, p_reporter_hash text
) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_point geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_radius int := case p_kind when 'pothole' then 25 when 'waterlogging' then 75 when 'outage' then 300 else 50 end;
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

  perform pg_advisory_xact_lock(hashtext('cluster:' || p_kind::text));

  select * into v_cluster from clusters
  where kind = p_kind and status = 'open' and st_dwithin(location, v_point, v_radius)
    and (p_kind <> 'outage' or last_reported_at > now() - interval '6 hours')
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

drop function public.get_cluster(uuid);
drop function public.get_clusters(float8, float8, float8, float8);

create function public.get_clusters(min_lng float8, min_lat float8, max_lng float8, max_lat float8)
returns table (
  id uuid, kind public.report_kind, status public.cluster_status, lat float8, lng float8,
  report_count int, reporter_count int, severity_max smallint, department text, promised_end date,
  first_reported_at timestamptz, last_reported_at timestamptz, near_worksite boolean, priority int, cover_photo text, demo boolean
)
language sql stable security definer set search_path = public, extensions as $$
  with box as (select st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography g),
  c as (
    select cl, exists (
      select 1 from clusters w
      where cl.kind not in ('worksite', 'outage') and w.kind = 'worksite' and w.status = 'open'
        and st_dwithin(w.location, cl.location, 60)
    ) as near_ws
    from clusters cl, box where st_intersects(cl.location, box.g)
  )
  select (c.cl).id, (c.cl).kind, (c.cl).status, st_y((c.cl).location::geometry), st_x((c.cl).location::geometry),
         (c.cl).report_count, (c.cl).reporter_count, (c.cl).severity_max, (c.cl).department, (c.cl).promised_end,
         (c.cl).first_reported_at, (c.cl).last_reported_at, c.near_ws, cluster_priority(c.cl, c.near_ws),
         (select r.photo_path from reports r where r.cluster_id = (c.cl).id and r.photo_path is not null order by r.created_at desc limit 1),
         (c.cl).demo
  from c
  order by (c.cl).status = 'resolved', 14 desc
  limit 500;
$$;

create function public.get_cluster(p_id uuid) returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'cluster', (select row_to_json(x) from get_clusters(68, 6, 97.5, 37.5) x where x.id = p_id),
    'reports', coalesce((select json_agg(json_build_object(
        'id', r.id, 'severity', r.severity, 'note', r.note, 'department', r.department,
        'promised_end', r.promised_end, 'photo', r.photo_path, 'created_at', r.created_at)
        order by r.created_at desc) from reports r where r.cluster_id = p_id), '[]'::json),
    'confirmations', (select json_build_object(
        'fixed', count(*) filter (where verdict = 'fixed'),
        'still_there', count(*) filter (where verdict = 'still_there'))
      from confirmations where cluster_id = p_id),
    'nearby_works', coalesce((select json_agg(json_build_object(
        'id', w.id, 'department', w.department, 'promised_end', w.promised_end,
        'distance_m', round(st_distance(w.location, c.location)::numeric)))
      from clusters c join clusters w on w.kind = 'worksite' and w.status = 'open' and w.id <> c.id
        and st_dwithin(w.location, c.location, 60)
      where c.id = p_id and c.kind not in ('worksite', 'outage')), '[]'::json)
  );
$$;

create function public.get_notices() returns table (
  id uuid, kind public.notice_kind, agency text, title text, area_text text, lat float8, lng float8, radius_m int,
  starts_at timestamptz, ends_at timestamptz, reference text, source_name text, source_url text, provenance public.provenance, imported_at timestamptz
)
language sql stable security definer set search_path = public, extensions as $$
  select n.id, n.kind, n.agency, n.title, n.area_text, st_y(n.location::geometry), st_x(n.location::geometry), n.radius_m,
         n.starts_at, n.ends_at, n.reference, n.source_name, n.source_url, n.provenance, n.imported_at
  from notices n order by n.starts_at desc limit 1000;
$$;

-- Evidence findings. Every rule states what the records show and what they do not; none asserts a failure.
create function public.get_findings() returns table (
  id text, type text, label text, title text, explanation text, lat float8, lng float8, refs json, detected_at timestamptz, demo boolean
)
language sql stable security definer set search_path = public, extensions as $$
with
works as (
  select 'cluster:' || c.id as ref, coalesce(c.department, 'An agency') as agency, c.location, c.first_reported_at as since,
         null::timestamptz as until, c.demo, 'community work-site report'::text as basis
  from clusters c where c.kind = 'worksite' and c.status = 'open'
  union all
  select 'notice:' || n.id, n.agency, n.location, n.starts_at, n.ends_at, n.provenance = 'demo',
         'road-cutting permission ' || coalesce(n.reference, 'without a reference')
  from notices n where n.kind = 'road_permit'
),
outages as (
  select c.* from clusters c where c.kind = 'outage' and c.status = 'open' and c.last_reported_at > now() - interval '6 hours'
),
r1 as (
  select distinct on (o.id) ('strike:' || o.id)::text as id, 'possible_cable_strike'::text as type, 'Requires verification'::text as label,
    'Power cut beside an active excavation'::text as title,
    format('%s %s reported a power cut from %s IST. %s was recorded working %s m away (%s). Digging near the start of an outage can indicate a damaged underground cable. This is a correlation in the records, not a confirmed cause.',
      o.reporter_count, case when o.reporter_count = 1 then 'resident' else 'residents' end,
      to_char(o.first_reported_at at time zone 'Asia/Kolkata', 'HH24:MI, DD Mon'), w.agency,
      round(st_distance(o.location, w.location)::numeric), w.basis)::text as explanation,
    st_y(o.location::geometry) as lat, st_x(o.location::geometry) as lng,
    json_build_object('outage', o.id, 'works', w.ref, 'agency', w.agency, 'distance_m', round(st_distance(o.location, w.location)::numeric)) as refs,
    o.last_reported_at as detected_at, (o.demo or w.demo) as demo
  from outages o join works w on st_dwithin(o.location, w.location, 150)
    and w.since <= o.first_reported_at + interval '1 hour'
    and (w.until is null or w.until >= o.first_reported_at - interval '1 day')
  order by o.id, st_distance(o.location, w.location)
),
permits as (select * from notices where kind = 'road_permit'),
completions as (select * from notices where kind = 'completion'),
matches as (
  select distinct on (p.id) p.id as permit_id, c.id as completion_id,
    case when p.reference is not null and c.reference = p.reference then 'reference' else 'proximity' end as method,
    (case when p.reference is not null and c.reference = p.reference then 100 else 0 end)
      + (case when lower(c.agency) = lower(p.agency) then 40 else 0 end)
      + (case when st_dwithin(c.location, p.location, 50) then 30 when st_dwithin(c.location, p.location, 150) then 15 else 0 end)
      + (case when c.starts_at between p.starts_at and coalesce(p.ends_at, p.starts_at) + interval '60 days' then 30 else 0 end) as score
  from permits p join completions c on (p.reference is not null and c.reference = p.reference) or st_dwithin(c.location, p.location, 150)
  order by p.id, score desc
),
r2 as (
  select ('nocompletion:' || p.id)::text, 'completion_not_found'::text, 'Completion record not found'::text, 'Permission period has ended'::text,
    format('Road-cutting permission %s for %s ended on %s. No matching completion record was found in the sources checked. This does not show the work is unfinished; it shows the record is incomplete.',
      coalesce(p.reference, 'without a reference'), p.agency, to_char(p.ends_at at time zone 'Asia/Kolkata', 'DD Mon YYYY'))::text,
    st_y(p.location::geometry), st_x(p.location::geometry),
    json_build_object('permit', p.id, 'reference', p.reference, 'agency', p.agency, 'source', p.source_url),
    p.ends_at, p.provenance = 'demo'
  from permits p where p.ends_at < now() and not exists (select 1 from matches m where m.permit_id = p.id and m.score >= 70)
),
r3 as (
  select ('possiblematch:' || m.permit_id)::text, 'possible_record_match'::text, 'Possible record match'::text, 'A completion may belong to this permission'::text,
    format('A completion record from %s nearby (score %s of 200: agency, distance and date, but no shared reference) may correspond to permission %s. It needs manual review before it is treated as the same work.',
      c.agency, m.score, coalesce(p.reference, 'without a reference'))::text,
    st_y(p.location::geometry), st_x(p.location::geometry),
    json_build_object('permit', p.id, 'completion', c.id, 'score', m.score, 'method', m.method),
    c.starts_at, (p.provenance = 'demo' or c.provenance = 'demo')
  from matches m join permits p on p.id = m.permit_id join completions c on c.id = m.completion_id
  where m.method = 'proximity' and m.score between 40 and 199
),
r4 as (
  select distinct on (p.id) ('digonce:' || p.id)::text, 'dug_after_resurfacing'::text, 'Dig-once conflict'::text, 'Excavation soon after resurfacing'::text,
    format('%s was permitted to dig here %s days after %s resurfaced this stretch (%s m apart). Coordinating the two could have avoided cutting a new surface.',
      p.agency, extract(day from p.starts_at - r.starts_at)::int, r.agency, round(st_distance(p.location, r.location)::numeric))::text,
    st_y(p.location::geometry), st_x(p.location::geometry),
    json_build_object('permit', p.id, 'resurfacing', r.id, 'days', extract(day from p.starts_at - r.starts_at)::int),
    p.starts_at, (p.provenance = 'demo' or r.provenance = 'demo')
  from permits p join notices r on r.kind = 'resurfacing' and st_dwithin(p.location, r.location, 80)
    and p.starts_at > r.starts_at and p.starts_at <= r.starts_at + interval '180 days'
  order by p.id, p.starts_at - r.starts_at
),
r5 as (
  select ('joint:' || a.id || ':' || b.id)::text, 'joint_works_possible'::text, 'Coordination opportunity'::text, 'Two agencies plan to dig the same stretch'::text,
    format('%s (from %s) and %s (from %s) hold permissions %s m apart, starting within 60 days of each other. One excavation could serve both.',
      a.agency, to_char(a.starts_at at time zone 'Asia/Kolkata', 'DD Mon'), b.agency, to_char(b.starts_at at time zone 'Asia/Kolkata', 'DD Mon'),
      round(st_distance(a.location, b.location)::numeric))::text,
    st_y(a.location::geometry), st_x(a.location::geometry),
    json_build_object('permits', json_build_array(a.id, b.id)),
    greatest(a.imported_at, b.imported_at), (a.provenance = 'demo' or b.provenance = 'demo')
  from permits a join permits b on a.id < b.id and lower(a.agency) <> lower(b.agency) and st_dwithin(a.location, b.location, 100)
    and abs(extract(epoch from a.starts_at - b.starts_at)) <= 60 * 86400
    and coalesce(a.ends_at, a.starts_at + interval '30 days') > now() - interval '7 days'
),
r6 as (
  select distinct on (c.id) ('damage:' || c.id)::text, 'damage_near_works'::text, 'Restoration responsibility unclear'::text, 'Damage beside active works'::text,
    format('A %s reported here sits %s m from works by %s. Whether restoring it falls to that agency depends on its permission conditions, which should be checked.',
      c.kind, round(st_distance(c.location, w.location)::numeric), w.agency)::text,
    st_y(c.location::geometry), st_x(c.location::geometry),
    json_build_object('cluster', c.id, 'works', w.ref, 'agency', w.agency),
    c.last_reported_at, (c.demo or w.demo)
  from clusters c join works w on st_dwithin(c.location, w.location, 60) and (w.until is null or w.until > now() - interval '30 days')
  where c.kind in ('pothole', 'waterlogging') and c.status = 'open'
  order by c.id, st_distance(c.location, w.location)
),
r7 as (
  select ('overdue:' || c.id)::text, 'promised_date_passed'::text, 'Completion not confirmed'::text, 'Promised completion date has passed'::text,
    format('The signboard reported for this %s site gave %s as the completion date. No completion has been confirmed since.',
      coalesce(c.department, 'work'), to_char(c.promised_end, 'DD Mon YYYY'))::text,
    st_y(c.location::geometry), st_x(c.location::geometry),
    json_build_object('cluster', c.id, 'promised_end', c.promised_end),
    c.promised_end::timestamptz, c.demo
  from clusters c where c.kind = 'worksite' and c.status = 'open' and c.promised_end < current_date
)
select * from r1 union all select * from r2 union all select * from r3 union all select * from r4
union all select * from r5 union all select * from r6 union all select * from r7
order by 9 desc;
$$;

-- Everything known around one point: the street dossier.
create function public.get_street(p_lat float8, p_lng float8, p_radius int default 500) returns json
language sql stable security definer set search_path = public, extensions as $$
  with pt as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography g)
  select json_build_object(
    'clusters', coalesce((select json_agg(x) from get_clusters(68, 6, 97.5, 37.5) x, pt
                where st_dwithin(st_setsrid(st_makepoint(x.lng, x.lat), 4326)::geography, pt.g, p_radius)), '[]'::json),
    'notices', coalesce((select json_agg(n order by n.starts_at desc) from get_notices() n, pt
                where st_dwithin(st_setsrid(st_makepoint(n.lng, n.lat), 4326)::geography, pt.g, p_radius + n.radius_m)), '[]'::json),
    'findings', coalesce((select json_agg(f) from get_findings() f, pt
                where st_dwithin(st_setsrid(st_makepoint(f.lng, f.lat), 4326)::geography, pt.g, p_radius)), '[]'::json),
    'waterlogging_history', (select count(*) from clusters c, pt where c.kind = 'waterlogging'
                and st_dwithin(c.location, pt.g, 600))
  );
$$;

revoke execute on function public.get_clusters(float8, float8, float8, float8) from public;
revoke execute on function public.get_cluster(uuid) from public;
revoke execute on function public.get_notices() from public;
revoke execute on function public.get_findings() from public;
revoke execute on function public.get_street(float8, float8, int) from public;
grant execute on function public.get_clusters(float8, float8, float8, float8) to anon, authenticated;
grant execute on function public.get_cluster(uuid) to anon, authenticated;
grant execute on function public.get_notices() to anon, authenticated;
grant execute on function public.get_findings() to anon, authenticated;
grant execute on function public.get_street(float8, float8, int) to anon, authenticated;
revoke execute on function public.submit_report(text, public.report_kind, float8, float8, smallint, text, text, date, text, text) from authenticated;
