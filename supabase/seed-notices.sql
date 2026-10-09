-- Theru demo layer: notices, outages and demo labels. Re-runnable; leaves real (non-demo) reports alone.
-- Dates are relative to now(), so re-run before a demo to keep "tomorrow" in the future.
-- Everything here is provenance 'demo' except one sourced news incident.

-- 1. Label the original seeded reports as demo, matched by their seed fingerprints.
with seedlats(lat) as (values
  ('12.97910'), ('13.05900'), ('12.94160'), ('13.05050'), ('12.92000'), ('12.95160'), ('13.00120'),
  ('12.98500'), ('13.04000'), ('12.96400'), ('12.93800'), ('13.03900'), ('12.91500'),
  ('12.95165'), ('12.97930'), ('13.05070'), ('13.08700')),
hashes as (select encode(extensions.digest('seed-' || lat || '-' || i, 'sha256'), 'hex') h from seedlats, generate_series(1, 6) i)
update public.reports set demo = true where reporter_hash in (select h from hashes);

-- 2. Reset previous demo notices, news items and demo outages.
delete from public.notices where provenance in ('demo', 'news');
delete from public.clusters where kind = 'outage' and demo;

-- 3. Notices. IST helper: tomorrow 09:00 IST etc.
do $$
declare
  d0 timestamptz := (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata';
  demo_src text := 'Demo record (synthetic, for demonstration)';
begin
  insert into public.notices (kind, agency, title, area_text, location, radius_m, starts_at, ends_at, reference, source_name, source_url, provenance) values
  ('road_permit', 'Chennai Metrowater (CMWSSB)', 'Sewer trench along Velachery Main Road', 'Velachery Main Road near Vijayanagar bus stand',
     st_setsrid(st_makepoint(80.21890, 12.97930), 4326)::geography, 120, now() - interval '15 days', now() + interval '20 days', 'CMWSSB/RC/2026/0412', demo_src, null, 'demo'),
  ('road_permit', 'TNPDCL (Chennai South)', 'HT cable relaying, Velachery Main Road', 'Velachery Main Road, Tansi Nagar side',
     st_setsrid(st_makepoint(80.21950, 12.97985), 4326)::geography, 120, now() + interval '12 days', now() + interval '26 days', 'TNPDCL/CEDC-S/2026/118', demo_src, null, 'demo'),
  ('resurfacing', 'Greater Chennai Corporation (Bus Route Roads)', 'Arcot Road resurfaced', 'Arcot Road, Vadapalani',
     st_setsrid(st_makepoint(80.21210, 13.05050), 4326)::geography, 200, now() - interval '42 days', now() - interval '40 days', 'GCC/BRR/Z10/2026/031', demo_src, null, 'demo'),
  ('road_permit', 'Chennai Metro Rail (CMRL)', 'Utility shifting for viaduct piers', 'Arcot Road, Vadapalani',
     st_setsrid(st_makepoint(80.21240, 13.05075), 4326)::geography, 150, now() - interval '9 days', now() + interval '50 days', 'CMRL/UTL/2026/207', demo_src, null, 'demo'),
  ('road_permit', 'BSNL', 'Optical fibre laying, 2nd Avenue', 'Anna Nagar 2nd Avenue',
     st_setsrid(st_makepoint(80.21030, 13.08720), 4326)::geography, 150, now() - interval '75 days', now() - interval '21 days', 'GCC/RC/Z8/2026/221', demo_src, null, 'demo'),
  ('road_permit', 'TNPDCL (Chennai South)', 'Cable joint replacement, LB Road', 'LB Road near Adyar signal',
     st_setsrid(st_makepoint(80.25630, 13.00140), 4326)::geography, 80, now() - interval '52 days', now() - interval '31 days', 'TNPDCL/CEDC-S/2026/087', demo_src, null, 'demo'),
  ('completion', 'TNPDCL (Chennai South)', 'Work completed and trench restored', 'LB Road near Adyar signal',
     st_setsrid(st_makepoint(80.25628, 13.00142), 4326)::geography, 80, now() - interval '29 days', null, 'TNPDCL/CEDC-S/2026/087', demo_src, null, 'demo'),
  ('road_permit', 'Chennai Metrowater (CMWSSB)', 'House service connections', 'KK Nagar, near the bus depot',
     st_setsrid(st_makepoint(80.19920, 13.03920), 4326)::geography, 120, now() - interval '40 days', now() - interval '12 days', 'CMWSSB/RC/2026/0377', demo_src, null, 'demo'),
  ('completion', 'Chennai Metrowater (CMWSSB)', 'Work reported complete (no permission reference given)', 'KK Nagar',
     st_setsrid(st_makepoint(80.19905, 13.03945), 4326)::geography, 120, now() - interval '14 days', null, null, demo_src, null, 'demo'),
  ('power_shutdown', 'TNPDCL (Chennai South)', 'Planned maintenance shutdown', 'Velachery Main Road, Vijayanagar, Tansi Nagar, Bhuvaneswari Nagar',
     st_setsrid(st_makepoint(80.22000, 12.98000), 4326)::geography, 1600, d0 + interval '1 day 9 hours', d0 + interval '1 day 14 hours', null, demo_src, null, 'demo'),
  ('power_shutdown', 'TNPDCL (Chennai South)', 'Planned maintenance shutdown', 'Adyar, Thiruvanmiyur, Kottur Gardens',
     st_setsrid(st_makepoint(80.25800, 13.00100), 4326)::geography, 1500, d0 + interval '2 days 9 hours', d0 + interval '2 days 14 hours', null, demo_src, null, 'demo'),
  ('water_suspension', 'Chennai Metrowater (CMWSSB)', 'Piped supply suspended for plant maintenance', 'Perungudi and Sholinganallur zones, parts of Velachery',
     st_setsrid(st_makepoint(80.24000, 12.96500), 4326)::geography, 3500, d0 + interval '1 day 9 hours', d0 + interval '2 days 9 hours', null, demo_src, null, 'demo'),
  -- A real, sourced incident: the pattern the dig-strike rule looks for.
  ('incident', 'TNPDCL (CEDC West Chennai)', '33 kV underground feeder damaged by gas pipeline works; police case registered', 'Paruthipattu, Avadi (approximate location)',
     st_setsrid(st_makepoint(80.0915, 13.1105), 4326)::geography, 300, timestamptz '2026-09-06 12:00+05:30', null, null, 'DT Next',
     'https://www.dtnext.in/news/chennai/avadi-police-book-torrent-gas-agent-contractor-and-driver-over-power-cable-damage', 'news');
end $$;

-- 4. Demo power cuts: one beside the Velachery trench (should raise a dig-strike finding), one elsewhere.
do $$
declare
  t text := (select value from private.app_secrets where name = 'rpc_token');
  s record; i int; r json;
begin
  for s in select * from (values
    (12.97955, 80.21920, 4, 50, 'Power went off suddenly on our street; the trench crew was working nearby.'),
    (13.03300, 80.26800, 2, 20, 'No power in this lane since evening.')
  ) as v(lat, lng, n, minutes_ago, note)
  loop
    for i in 1..s.n loop
      r := public.submit_report(t, 'outage', s.lat + (random() - 0.5) * 0.0004, s.lng + (random() - 0.5) * 0.0004,
             (case when i = 1 then 2 else 2 + (random() < 0.3)::int end)::smallint,
             case when i = 1 then s.note end, null, null, null,
             encode(extensions.digest('seed-outage-' || s.lat || '-' || i, 'sha256'), 'hex'));
      update public.reports set demo = true, created_at = now() - make_interval(mins => s.minutes_ago - (i - 1) * 6)
      where id = (r->>'report_id')::uuid;
    end loop;
  end loop;
end $$;

-- 5. Clusters made only of demo reports are demo; keep cluster times in step with their reports.
update public.clusters c set demo = true
where exists (select 1 from public.reports r where r.cluster_id = c.id and r.demo)
  and not exists (select 1 from public.reports r where r.cluster_id = c.id and not r.demo);
update public.clusters c set
  first_reported_at = (select min(created_at) from public.reports where cluster_id = c.id),
  last_reported_at = (select max(created_at) from public.reports where cluster_id = c.id)
where c.kind = 'outage' and c.demo;
