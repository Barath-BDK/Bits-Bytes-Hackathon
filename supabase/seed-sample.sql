-- Theru sample reports: a small illustrative set so the map and the rules have something to show.
-- Every row is labelled demo (shown as "Demo data" in the UI). Real resident reports and all notices are left alone.
-- Locations are real Chennai roads, several beside construction mapped in OpenStreetMap; the reports are illustrative.
-- Photos: Wikimedia Commons (public/seed/credits.json). The power cut is timed "now": re-run within 6 hours of a demo.
delete from public.clusters where demo;

do $$
declare
  t text := (select value from private.app_secrets where name = 'rpc_token');
  s record; i int; r json;
begin
  for s in select * from (values
    -- kind, lat, lng, severity, reporters, photo, note, department, promised_end, days_ago
    ('pothole',      13.01720, 80.26050, 3, 4, 'seed/pothole-6.webp', 'Crater beside the metro barricades on RK Mutt Road, two-wheelers swerving into traffic.', null, null, 6),
    ('pothole',      13.05900, 80.25600, 2, 3, 'seed/pothole-1.webp', 'Broken slab beside the footpath on Anna Salai, next to the metro works.', null, null, 5),
    ('pothole',      12.94160, 80.23370, 3, 3, 'seed/pothole-5.webp', 'Series of potholes on the OMR service road at Thoraipakkam.', null, null, 9),
    ('pothole',      13.07720, 80.20450, 3, 2, 'seed/pothole-4.webp', 'Surface broken under the expressway works near Koyambedu.', null, null, 4),
    ('pothole',      13.00750, 80.20330, 2, 2, 'seed/pothole-2.webp', 'Pothole forming at the Alandur junction diversion.', null, null, 2),
    ('waterlogging', 12.98500, 80.23100, 3, 6, 'seed/waterlogging-5.webp', 'Waist-deep water on the Velachery-Taramani link road, autos stalling.', null, null, 2),
    ('waterlogging', 13.04000, 80.23300, 2, 3, 'seed/waterlogging-1.webp', 'Usman Road subway flooded to knee level.', null, null, 2),
    ('waterlogging', 12.96110, 80.20010, 2, 4, 'seed/waterlogging-4.webp', 'Madipakkam main road under water near the lake.', null, null, 3),
    ('worksite',     13.05250, 80.22900, 3, 2, 'seed/worksite-3.webp', 'Metro station box work, two lanes closed.', 'Chennai Metro Rail (CMRL) Phase 2', date '2026-09-30', 40),
    ('worksite',     12.97930, 80.21890, 2, 2, 'seed/worksite-6.webp', 'Sewer line trench along Velachery Main Road.', 'Chennai Metrowater', date '2026-11-15', 15),
    ('outage',       13.00400, 80.25650, 2, 4, null, 'Whole street dark since the morning; diggers working on the metro line nearby.', null, null, 0)
  ) as v(kind, lat, lng, severity, reporters, photo, note, department, promised_end, days_ago)
  loop
    for i in 1..s.reporters loop
      r := public.submit_report(
        t, s.kind::public.report_kind,
        s.lat + (random() - 0.5) * 0.00012, s.lng + (random() - 0.5) * 0.00012,
        greatest(1, s.severity - (i > 1 and random() < 0.4)::int)::smallint,
        case when i = 1 then s.note end, s.department, s.promised_end,
        case when i = 1 then s.photo end,
        encode(extensions.digest('sample-' || s.lat || '-' || i, 'sha256'), 'hex'));
      update public.reports set demo = true,
        created_at = case when s.kind = 'outage' then now() - make_interval(mins => 95 - i * 20)
                          else now() - make_interval(days => s.days_ago) + make_interval(hours => (i - 1) * 7) end
      where id = (r->>'report_id')::uuid;
      update public.clusters set demo = true where id = (r->>'cluster_id')::uuid;
    end loop;
  end loop;

  update public.clusters c set
    first_reported_at = (select min(created_at) from public.reports where cluster_id = c.id),
    last_reported_at  = (select max(created_at) from public.reports where cluster_id = c.id)
  where c.demo;
end $$;
