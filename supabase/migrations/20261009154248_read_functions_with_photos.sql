drop function public.get_cluster(uuid);
drop function public.get_clusters(float8, float8, float8, float8);

create function public.get_clusters(min_lng float8, min_lat float8, max_lng float8, max_lat float8)
returns table (
  id uuid, kind public.report_kind, status public.cluster_status, lat float8, lng float8,
  report_count int, reporter_count int, severity_max smallint, department text, promised_end date,
  first_reported_at timestamptz, last_reported_at timestamptz, near_worksite boolean, priority int, cover_photo text
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
         (c.cl).first_reported_at, (c.cl).last_reported_at, c.near_ws, cluster_priority(c.cl, c.near_ws),
         (select r.photo_path from reports r where r.cluster_id = (c.cl).id and r.photo_path is not null
          order by r.created_at desc limit 1)
  from c
  order by (c.cl).status = 'resolved', 14 desc
  limit 500;
$$;

create function public.get_cluster(p_id uuid) returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    -- India bbox: every report is constrained to it, and a world box breaks geography edges.
    'cluster', (select row_to_json(x) from get_clusters(68, 6, 97.5, 37.5) x where x.id = p_id),
    'reports', coalesce((select json_agg(json_build_object(
        'id', r.id, 'severity', r.severity, 'note', r.note, 'department', r.department,
        'promised_end', r.promised_end, 'photo', r.photo_path, 'created_at', r.created_at)
        order by r.created_at desc) from reports r where r.cluster_id = p_id), '[]'::json),
    'confirmations', (select json_build_object(
        'fixed', count(*) filter (where verdict = 'fixed'),
        'still_there', count(*) filter (where verdict = 'still_there'))
      from confirmations where cluster_id = p_id)
  );
$$;

revoke execute on function public.get_clusters(float8, float8, float8, float8) from public;
revoke execute on function public.get_cluster(uuid) from public;
grant execute on function public.get_clusters(float8, float8, float8, float8) to anon, authenticated;
grant execute on function public.get_cluster(uuid) to anon, authenticated;
