-- Security re-test: the radius was caller-controlled and unbounded (whole-dataset dumps, expensive scans). Clamp to 50-2000 m.
create or replace function public.get_street(p_lat double precision, p_lng double precision, p_radius integer default 500)
returns json language sql stable security definer set search_path to 'public', 'extensions' as $function$
  with pt as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography g,
                     least(greatest(coalesce(p_radius, 500), 50), 2000) r)
  select json_build_object(
    'clusters', coalesce((select json_agg(x) from get_clusters(68, 6, 97.5, 37.5) x, pt
                where st_dwithin(st_setsrid(st_makepoint(x.lng, x.lat), 4326)::geography, pt.g, pt.r)), '[]'::json),
    'notices', coalesce((select json_agg(n order by n.starts_at desc) from get_notices() n, pt
                where st_dwithin(st_setsrid(st_makepoint(n.lng, n.lat), 4326)::geography, pt.g, pt.r + n.radius_m)), '[]'::json),
    'findings', coalesce((select json_agg(f) from get_findings() f, pt
                where st_dwithin(st_setsrid(st_makepoint(f.lng, f.lat), 4326)::geography, pt.g, pt.r)), '[]'::json),
    'waterlogging_history', (select count(*) from clusters c, pt where c.kind = 'waterlogging'
                and st_dwithin(c.location, pt.g, 600))
  );
$function$;
