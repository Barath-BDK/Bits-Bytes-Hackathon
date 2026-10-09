-- Demo data for Chennai. Re-runnable: wipes clusters first.
-- Photos are openly licensed Wikimedia Commons images (see public/seed/credits.json);
-- locations are real Chennai roads, but the reports themselves are illustrative.
delete from public.clusters;

do $$
declare
  t text := (select value from private.app_secrets where name = 'rpc_token');
  -- kind, lat, lng, severity, reporters, photo, note, department, promised_end, days_ago
  s record;
  i int;
  r json;
begin
  for s in select * from (values
    ('pothole',      12.97910, 80.21860, 3, 5, 'seed/pothole-6.webp', 'Crater in the left lane near Vijayanagar bus stand, two-wheelers swerving into traffic.', null, null, 9),
    ('pothole',      13.05900, 80.25600, 2, 3, 'seed/pothole-1.webp', 'Broken slab beside the footpath on Anna Salai.', null, null, 5),
    ('pothole',      12.94160, 80.23370, 3, 4, 'seed/pothole-5.webp', 'Series of potholes on the OMR service road at Thoraipakkam.', null, null, 12),
    ('pothole',      13.05050, 80.21210, 2, 2, 'seed/pothole-5.webp', 'Patchwork repair failed after last week''s rain.', null, null, 3),
    ('pothole',      12.92000, 80.19200, 1, 1, 'seed/pothole-2.webp', 'Small pothole forming near Medavakkam junction.', null, null, 1),
    ('pothole',      12.95160, 80.14620, 3, 3, 'seed/pothole-4.webp', 'Road surface broken right next to the metro barricades on GST Road.', null, null, 7),
    ('pothole',      13.00120, 80.25650, 2, 2, null,                  'Pothole on LB Road near Adyar signal.', null, null, 14),
    ('waterlogging', 12.98500, 80.23100, 3, 6, 'seed/waterlogging-5.webp', 'Waist-deep water on the Velachery-Taramani link road, autos stalling.', null, null, 2),
    ('waterlogging', 13.04000, 80.23300, 2, 4, 'seed/waterlogging-1.webp', 'Usman Road subway flooded to knee level.', null, null, 2),
    ('waterlogging', 12.96400, 80.19900, 2, 3, 'seed/waterlogging-4.webp', 'Madipakkam main road under water near the lake.', null, null, 3),
    ('waterlogging', 12.93800, 80.21000, 1, 2, 'seed/waterlogging-6.webp', 'Ankle-deep water outside Pallikaranai marsh road shops.', null, null, 1),
    ('waterlogging', 13.03900, 80.19900, 1, 1, 'seed/waterlogging-2.webp', 'Water collecting at the KK Nagar bus depot entrance.', null, null, 1),
    ('waterlogging', 12.91500, 80.07000, 3, 2, 'seed/waterlogging-8.webp', 'Mudichur residential streets flooded, same spot as every monsoon.', null, null, 4),
    ('worksite',     12.95165, 80.14625, 3, 2, 'seed/worksite-3.webp', 'Metro pillar work, two lanes closed.', 'Chennai Metro Rail (CMRL) Phase 2', date '2026-09-30', 40),
    ('worksite',     12.97930, 80.21890, 2, 2, 'seed/worksite-6.webp', 'Sewer line trench along Velachery Main Road.', 'Chennai Metrowater', date '2026-11-15', 15),
    ('worksite',     13.05070, 80.21250, 2, 1, 'seed/worksite-4.webp', 'Arcot Road narrowed for metro viaduct.', 'Chennai Metro Rail (CMRL) Phase 2', date '2027-03-31', 60),
    ('worksite',     13.08700, 80.21000, 1, 1, 'seed/worksite-1.webp', 'Storm water drain excavation on 2nd Avenue.', 'Greater Chennai Corporation', date '2026-10-05', 25)
  ) as v(kind, lat, lng, severity, reporters, photo, note, department, promised_end, days_ago)
  loop
    for i in 1..s.reporters loop
      r := public.submit_report(
        t, s.kind::public.report_kind,
        s.lat + (random() - 0.5) * 0.00012, s.lng + (random() - 0.5) * 0.00012,  -- ~±7 m GPS jitter
        greatest(1, s.severity - (i > 1 and random() < 0.4)::int)::smallint,
        case when i = 1 then s.note end, s.department, s.promised_end,
        case when i = 1 then s.photo end,
        encode(extensions.digest('seed-' || s.lat || '-' || i, 'sha256'), 'hex'));
      -- spread reports over the days since the issue appeared
      update public.reports set created_at = now() - make_interval(days => s.days_ago) + make_interval(hours => (i - 1) * 7)
      where id = (r->>'report_id')::uuid;
    end loop;
  end loop;

  update public.clusters c set
    first_reported_at = (select min(created_at) from public.reports where cluster_id = c.id),
    last_reported_at  = (select max(created_at) from public.reports where cluster_id = c.id);

  -- Adyar pothole: fixed and confirmed by two neighbours
  perform public.confirm_cluster(t, id, 'fixed', encode(extensions.digest('seed-fix-' || n, 'sha256'), 'hex'))
  from public.clusters, generate_series(1, 2) n
  where kind = 'pothole' and st_dwithin(location, st_setsrid(st_makepoint(80.2565, 13.0012), 4326)::geography, 30);
end $$;
