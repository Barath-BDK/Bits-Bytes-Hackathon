-- Rules engine: mapped construction (kind 'works') counts as active works; distances run to the edge of a works area.
create or replace function public.get_findings() returns table (
  id text, type text, label text, title text, explanation text, lat float8, lng float8, refs json, detected_at timestamptz, demo boolean
)
language sql stable security definer set search_path = public, extensions as $$
with
works as (
  select 'cluster:' || c.id as ref, coalesce(c.department, 'An agency') as agency, c.location, c.first_reported_at as since,
         null::timestamptz as until, c.demo, 'community work-site report'::text as basis, 0 as radius
  from clusters c where c.kind = 'worksite' and c.status = 'open'
  union all
  select 'notice:' || n.id, n.agency, n.location, n.starts_at, n.ends_at, n.provenance = 'demo',
         'road-cutting permission ' || coalesce(n.reference, 'without a reference'), n.radius_m
  from notices n where n.kind = 'road_permit'
  union all
  -- construction mapped on OpenStreetMap: a stretch of works, so distances are measured from its edge
  select 'notice:' || n.id, n.agency, n.location, n.starts_at, n.ends_at, n.provenance = 'demo',
         'construction mapped on OpenStreetMap', n.radius_m
  from notices n where n.kind = 'works'
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
      greatest(0, round(st_distance(o.location, w.location)::numeric) - w.radius), w.basis)::text as explanation,
    st_y(o.location::geometry) as lat, st_x(o.location::geometry) as lng,
    json_build_object('outage', o.id, 'works', w.ref, 'agency', w.agency, 'distance_m', greatest(0, round(st_distance(o.location, w.location)::numeric) - w.radius)) as refs,
    o.last_reported_at as detected_at, (o.demo or w.demo) as demo
  from outages o join works w on st_dwithin(o.location, w.location, 150 + w.radius)
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
      c.kind, greatest(0, round(st_distance(c.location, w.location)::numeric) - w.radius), w.agency)::text,
    st_y(c.location::geometry), st_x(c.location::geometry),
    json_build_object('cluster', c.id, 'works', w.ref, 'agency', w.agency),
    c.last_reported_at, (c.demo or w.demo)
  from clusters c join works w on st_dwithin(c.location, w.location, 60 + w.radius) and (w.until is null or w.until > now() - interval '30 days')
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
