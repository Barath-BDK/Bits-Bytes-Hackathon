create or replace function public.get_cluster(p_id uuid) returns json
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
      from confirmations where cluster_id = p_id),
    -- Active work sites within 60 m: the coordination link (who dug here, and when they promised to finish).
    'nearby_works', coalesce((select json_agg(json_build_object(
        'id', w.id, 'department', w.department, 'promised_end', w.promised_end,
        'distance_m', round(st_distance(w.location, c.location)::numeric)))
      from clusters c join clusters w on w.kind = 'worksite' and w.status = 'open' and w.id <> c.id
        and st_dwithin(w.location, c.location, 60)
      where c.id = p_id and c.kind <> 'worksite'), '[]'::json)
  );
$$;
