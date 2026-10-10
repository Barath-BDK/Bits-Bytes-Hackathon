# Theru (தெரு)

**Every street in Chennai has a record.** Theru puts one street's public works on a single page: who is digging it, what goes off in the next 48 hours, power cuts that start beside a trench, what the official records leave out, and who answers for it.

Live: **https://theru.vercel.app**

Built for the CivicTech hackathon theme *Improving Transparency and Coordination in Public Works Projects*.

---

## The problem

Chennai's streets are dug, restored and dug again by different agencies: Greater Chennai Corporation (GCC), Chennai Metrowater (CMWSSB), the power utility TNPDCL, Chennai Metro Rail (CMRL) and telecom companies. Each publishes, if at all, in its own place and format:

- Planned power shutdowns appear as daily lists of locality names in newspapers. TNPDCL's own page sits behind a captcha.
- Water suspensions are announced a day or two ahead in press notes.
- Road-cut permissions, completions and restorations are rarely published in a form a resident can check.
- When a trench cuts a cable, residents see a power cut and a trench but no link between them.

A resident who wants to know "what is happening on my street, and who do I ask?" has to search five sources and still not know which office is responsible.

## What Theru does

| Feature | What it gives a resident |
| --- | --- |
| **Street record** (`/street`) | Everything within 500 m of a point: works, shutdowns, suspensions, resident reports and findings, as one timeline with a source tag on every item. |
| **Next 48 hours** | An hour-by-hour grid with power, water, road and rain rows, built from published shutdown and suspension notices plus the Open-Meteo rain forecast. Waterlogging risk rises where waterlogging has been reported before. |
| **Possible cable strike** | A power cut reported in the last 6 hours within 150 m of an active excavation that began before it is flagged *Requires verification*. It is a correlation, never presented as a cause. |
| **Evidence gaps** (`/records`) | A rules engine over the records: completion record not found, a possible match that needs a person to confirm it, digging soon after resurfacing, two agencies digging close together, damage near works, a promised date that has passed. Labels stay neutral and every rule is explained on the Method page. |
| **Who answers here** | The location is matched to its GCC zone and region, the departments for the issue, and a Day 0, 3, 7 and 15 escalation ladder. A Right to Information request can be copied in one click. Each contact is tagged *Official page* or *Verify before use*. |
| **Resident reports** (`/map`) | Report a pothole, waterlogging, a work site or a power cut, with a photo from the camera or the gallery. Reports of the same thing merge (25 m potholes, 75 m waterlogging, 50 m work sites, 300 m power cuts). Priority is a formula anyone can read (below). A fix closes only when two or more residents confirm it. |
| **Community requests** (`/requests`) | Ask for a streetlight, garbage clearance, a drain, a fallen tree, stray-animal help or water, in public. Neighbours **vouch** ("I need this too") instead of filing the same complaint again; each vouch counts as one more resident and raises priority. A request shows Raised, Supported and Resolved, and closes only when two neighbours confirm it was done. No account and no phone number, unlike complaint apps that pass the complainant's number to field staff. |
| **Parking hotspots** | Mark a spot that keeps getting blocked (footpath, lane, junction or gate). Repeated reports build a hotspot routed to the traffic police. It marks places, not people: the form asks for no number plates or faces, and points to the GCTP Citizen Services app for a specific vehicle. |
| **Map key** | Live power cuts are shaded on the map, and a key explains every shape on it. |

**Priority score** (computed in the database): `20 × severity + 8 × distinct reporters (max 10) + 3 per day open (max 21) + 15 if within 60 m of an active work site`.

### What was already out there

Before building we checked existing work. Civic complaint trackers (for example interns.city, FixMyCity-style apps and Smart India Hackathon projects) cover reporting, clustering and routing. Outage trackers exist separately. We found none that links power cuts to nearby excavations, gives a combined street-level 48-hour outlook, or audits public works records for gaps. Those are the parts Theru adds.

## Data and honesty

Every record carries its provenance, shown as a tag wherever it appears:

| Tag | Meaning |
| --- | --- |
| Official record | Published by the agency, with a source link and import date. |
| News report | Taken from a published news report, with a link to the article. |
| OpenStreetMap | Mapped by OpenStreetMap contributors, with a link to the map way. |
| Resident reports | Submitted on Theru. |
| Demo data | Synthetic or illustrative, labelled wherever it appears and never presented as real. |

**Real records loaded now** (`supabase/seed-real.sql`, generated from `scripts/real-records.json`):

- 34 TNPDCL planned maintenance shutdowns, 3 to 11 October 2026, by sub-station area (DT Next).
- The CMWSSB 24-hour water suspension from 10 October 2026, 9 am, across 18 localities in the Adyar, Perungudi and Sholinganallur zones (DT Next).
- Incidents: a 33 kV feeder damaged by gas pipeline works in Avadi; power cables left exposed after stormwater drain works on Paper Mills Road, Perambur; road restoration pending on about 28 Pulianthope streets after Metro Water works.
- GCC restorations near Tidel Park and on the Vadapalani to Arumbakkam service road.

**Construction mapped in OpenStreetMap** (`supabase/seed-osm-works.sql`, generated by `scripts/build-osm-works.py`): 132 stretches of about 800 m along Chennai Metro Phase 2 Lines 3, 4 and 5, the Chennai Port to Maduravoyal expressway, the Teynampet to Saidapet flyover and other roads mapped as under construction, each linked to its OpenStreetMap way. They count as active works for the cable-strike and damage rules. A line named as a proposal is left out even where it is tagged as construction.

**Limits we state openly:**

- Locations of notices are approximate: the centre of the named locality (placed with OpenStreetMap Nominatim) plus a radius.
- Road-cut permissions and completions are not published as open data, so the permission-matching rules run only when such records are added.
- The zone lookup uses the nearest GCC zone office, not official ward boundaries. Zonal phone numbers come from a public directory.
- Real resident reports are still few, so 11 illustrative sample reports (`supabase/seed-sample.sql`, Wikimedia Commons photos) sit beside the real works to show the rules working. Each is labelled *Demo data* wherever it appears, and so is every finding that depends on one. The sample power cut is timed to the moment the script runs, so re-run it shortly before a demo.
- OpenStreetMap shows that works exist, not when they started or will end, so mapped works appear as ongoing.
- A finding says what the records show. "Completion record not found" describes the record, not the road.

### Refreshing the real records

```bash
python -I scripts/build-real-seed.py
```

Add new notices to `scripts/real-records.json` (each with its source URL), run the script, then run `supabase/seed-real.sql` in the Supabase SQL editor. The script respects Nominatim's one request per second limit and caches results in `scripts/.geocode-cache.json`.

## How it works

```
Browser ──► Next.js on Vercel (pages + /api route handlers)
              │  reads: cached RPC calls (get_clusters, get_notices, get_findings, get_street)
              │  writes: /api/reports, /api/photos  (validated, origin-checked, size-capped)
              ▼
            Supabase Postgres + PostGIS
              RLS default-deny on every table
              writes only through SECURITY DEFINER functions that check a server-held token
              rules engine (get_findings) and clustering run in SQL
Photos ──► sharp re-encode (strips EXIF and GPS) ──► Vercel Blob
Map ─────► MapLibre GL with OpenFreeMap tiles
Search ──► /api/geocode merges Photon and Nominatim, ranked by distance to Chennai
Rain ────► Open-Meteo hourly forecast (no key)
```

Pages are statically generated and refreshed every 60 seconds; every write invalidates the cache so a reporter sees their pin immediately.

## Security

Security was a first-class requirement. What is in place:

- **No secrets in the browser.** The only public values are the Supabase URL and publishable key, which can do nothing that RLS does not allow. `DB_RPC_TOKEN`, `REPORTER_SALT` and `BLOB_READ_WRITE_TOKEN` exist only as server environment variables.
- **Default-deny database.** RLS is on for every table, and there are no insert, update or delete policies. Writes go through `submit_report`, `confirm_cluster` and `note_upload`, which reject any call without the server's token.
- **Input validation** with Zod on every route: enums for kinds, coordinates bounded to India, lengths capped, photo URLs accepted only from our own Blob store.
- **Abuse limits.** 10 reports and 15 photo uploads per reporter per hour, enforced in the database. Reporters are identified by a salted SHA-256 hash of their IP. Raw IPs are never stored, and Vercel overwrites client-supplied forwarding headers, so the hash cannot be spoofed.
- **Uploads** are identified by their decoded bytes, not the filename or MIME type, then re-encoded to WebP, which strips metadata and any embedded payload.
- **Cross-site writes rejected** by an Origin check; bodies over 8 KB rejected before parsing.
- **Headers:** HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a permissions policy. `X-Powered-By` is removed.
- **Errors** never return raw database messages.

**Re-test, 10 October 2026** (against the live site and database):

| Test | Result |
| --- | --- |
| Invalid kind, out-of-range coordinates, severity 99, 5,000-character note, non-JSON body | 400 |
| Photo URL from another host, or a lookalike host | 400 |
| Cross-site Origin | 403 |
| 20 KB body | 413 |
| Script disguised as a JPEG | 400 (unsupported image type) |
| SQL injection in the cluster id | 404 |
| HTML injection in the street name | Escaped |
| Insert, update or delete on any table with the public key | Blocked by RLS |
| Reading reporter hashes or the private schema | Blocked |
| Calling write functions without the token | `unauthorized` |
| Client JavaScript scanned for secrets | None found |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Unbounded radius on `get_street` | **Found and fixed**: now clamped to 50 to 2,000 m |

Known, accepted: Supabase's advisor warns that the read functions are callable anonymously. That is intended, because the data is public.

## Running it yourself

**You need:** Node.js 20+, a free Supabase project, and a free Vercel account (for hosting and Blob storage).

1. **Clone and install**
   ```bash
   git clone https://github.com/Barath-BDK/Bits-Bytes-Hackathon.git
   cd Bits-Bytes-Hackathon
   npm install
   ```

2. **Database.** In the Supabase SQL editor, run every file in `supabase/migrations/` in name order. Then copy the generated token:
   ```sql
   select value from private.app_secrets where name = 'rpc_token';
   ```

3. **Environment.** Copy `.env.example` to `.env.local` and fill in:
   | Variable | Where it comes from |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings, API |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project settings, API keys (publishable) |
   | `DB_RPC_TOKEN` | The token from step 2 |
   | `REPORTER_SALT` | Any long random string, for example `openssl rand -hex 32` |
   | `BLOB_READ_WRITE_TOKEN` | Vercel, Storage, Blob store (only needed for photo uploads) |

   Never commit `.env.local`. It is in `.gitignore`.

4. **Data (optional).** Run `supabase/seed-real.sql` for the real notices, `supabase/seed-osm-works.sql` for mapped construction and `supabase/seed-sample.sql` for the labelled sample reports.

5. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Production build: `npm run build && npm start`.

6. **Deploy.** Import the repository in Vercel, add the same environment variables (mark the three server values as Sensitive), and deploy. Pushes to `main` deploy automatically.

## Demo video

[Watch the demo (4 min 55 s)](demo/theru-demo.mp4): searching a street, reporting a problem, vouching for a request, where each record comes from, and how residents are kept private. The file is in the repository at `demo/theru-demo.mp4`.

## Data sources and APIs

Every external service the site or its scripts call, and what for. None needs a key or costs anything.

| Service | Called from | Used for | Terms |
| --- | --- | --- | --- |
| [Supabase](https://supabase.com) (PostgreSQL, PostGIS) | Server routes | The database: reports, notices, findings, vouches | Free tier |
| [OpenFreeMap](https://openfreemap.org) | Browser (map) | Map tiles and styles | Free, attribution to OpenStreetMap |
| [Photon](https://photon.komoot.io) (komoot) | `/api/geocode` | Place search as you type | OSM data, ODbL, fair use |
| [Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap) | `/api/geocode`, `scripts/build-real-seed.py` | Place search; placing notices on the map | ODbL, 1 request per second |
| [Overpass API](https://overpass-api.de) (OpenStreetMap) | `scripts/build-osm-works.py` | Roads and rail lines mapped as under construction | ODbL |
| [Open-Meteo](https://open-meteo.com) | Server (street pages) | Hourly rain forecast for the 48-hour outlook | CC BY 4.0 |
| [Vercel Blob](https://vercel.com/storage/blob) | `/api/photos` | Storing residents' photos | Free tier |
| [DT Next](https://www.dtnext.in), [Urban Acres](https://urbanacres.in) | Read by hand into `scripts/real-records.json` | Published shutdown, suspension and incident notices | Linked on every record, not copied |
| [Wikimedia Commons](https://commons.wikimedia.org) | Downloaded once into `public/seed` | Photos for the sample reports (credits below) | Licences as listed |

## Photo credits

All photos are from Wikimedia Commons and are credited on the site (Method page) and here.

| File | Title | Author | Licence |
| --- | --- | --- | --- |
| `pothole-1.webp` | [Broken Roads in India's Capital New Delhi](https://commons.wikimedia.org/wiki/File:Broken_Roads_in_India%27s_Capital_New_Delhi.webp) | Rrthakur22 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `pothole-2.webp` | [Driving through potholes](https://commons.wikimedia.org/wiki/File:Driving_through_potholes.webp) | KEmel49 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `pothole-4.webp` | [Potholes on road](https://commons.wikimedia.org/wiki/File:Potholes_on_road.webp) | KEmel49 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `pothole-5.webp` | [Roads deformed T munnekollala Bengaluru](https://commons.wikimedia.org/wiki/File:Roads_deformed_T_munnekollala_Bengaluru.webp) | Gangaasoonu | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `pothole-6.webp` | [Roads deformed T munnekollala Bengaluru 2](https://commons.wikimedia.org/wiki/File:Roads_deformed_T_munnekollala_Bengaluru_2.webp) | Gangaasoonu | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `waterlogging-1.webp` | [Chennai flood water logging near ofice nandanam4](https://commons.wikimedia.org/wiki/File:Chennai_flood_water_logging_near_ofice_nandanam4.webp) | Vijayingarsal | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `waterlogging-2.webp` | [Chennai flood water logging near ofice nandanam5](https://commons.wikimedia.org/wiki/File:Chennai_flood_water_logging_near_ofice_nandanam5.webp) | Vijayingarsal | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `waterlogging-3.webp` | [Chennai flood water logging near ofice nandanam6](https://commons.wikimedia.org/wiki/File:Chennai_flood_water_logging_near_ofice_nandanam6.webp) | Vijayingarsal | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `waterlogging-4.webp` | [India - Chennai - Monsoon - 02 (3059047958)](https://commons.wikimedia.org/wiki/File:India_-_Chennai_-_Monsoon_-_02_(3059047958).webp) | McKay Savage from London, UK | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `waterlogging-5.webp` | [India - Chennai - Monsoon - 03 (3058213357)](https://commons.wikimedia.org/wiki/File:India_-_Chennai_-_Monsoon_-_03_(3058213357).webp) | McKay Savage from London, UK | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `waterlogging-6.webp` | [India - Chennai - Monsoon - 04 (3058215637)](https://commons.wikimedia.org/wiki/File:India_-_Chennai_-_Monsoon_-_04_(3058215637).webp) | McKay Savage from London, UK | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `waterlogging-7.webp` | [India - Chennai - Monsoon - 05 (3058218683)](https://commons.wikimedia.org/wiki/File:India_-_Chennai_-_Monsoon_-_05_(3058218683).webp) | McKay Savage from London, UK | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `waterlogging-8.webp` | [Inundation of Chennai in 2017-1](https://commons.wikimedia.org/wiki/File:Inundation_of_Chennai_in_2017-1.webp) | Kaitha Poo Manam | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `waterlogging-10.webp` | [Inundation of Chennai in 2017-5](https://commons.wikimedia.org/wiki/File:Inundation_of_Chennai_in_2017-5.webp) | Kaitha Poo Manam | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| `worksite-1.webp` | [Road construction India](https://commons.wikimedia.org/wiki/File:Road_construction_India.webp) | Shyamal | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `worksite-3.webp` | [Road construction work](https://commons.wikimedia.org/wiki/File:Road_construction_work.webp) | Siyaulhaque | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `worksite-4.webp` | [Road construction work 2](https://commons.wikimedia.org/wiki/File:Road_construction_work_2.webp) | Siyaulhaque | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `worksite-6.webp` | [Road Repairs Pump](https://commons.wikimedia.org/wiki/File:Road_Repairs_Pump.JPG) | Drmarathe | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |

## Open-source libraries, APIs and data

| Name | Use | Licence or terms |
| --- | --- | --- |
| [Next.js](https://nextjs.org) | Framework, pages and API routes | MIT |
| [React](https://react.dev) | UI | MIT |
| [Supabase](https://supabase.com) (Postgres, [PostGIS](https://postgis.net)) | Database, geospatial queries | Apache-2.0, GPL-2.0 |
| [MapLibre GL JS](https://maplibre.org) | Map rendering | BSD-3-Clause |
| [OpenFreeMap](https://openfreemap.org) and [OpenStreetMap](https://www.openstreetmap.org/copyright) | Map tiles and map data | ODbL |
| [Photon](https://photon.komoot.io) and [Nominatim](https://nominatim.org) | Place search and geocoding of notices | ODbL data, fair-use policies |
| [Open-Meteo](https://open-meteo.com) | Hourly rain forecast | CC BY 4.0 |
| [Lenis](https://lenis.dev) | Smooth scrolling | MIT |
| [Motion](https://motion.dev) | Animation | MIT |
| [Magic UI](https://magicui.design) AnimatedBeam | Coordination diagram (vendored) | MIT |
| [Tailwind CSS](https://tailwindcss.com) | Styling | MIT |
| [Zod](https://zod.dev) | Input validation | MIT |
| [sharp](https://sharp.pixelplumbing.com) | Photo re-encoding | Apache-2.0 |
| [Vercel Blob](https://vercel.com/storage/blob) | Photo storage | Hosted service |
| Archivo, Instrument Sans, Instrument Serif, Fragment Mono ([Google Fonts](https://fonts.google.com)) | Typography | SIL OFL 1.1 |
| [Wikimedia Commons](https://commons.wikimedia.org) | Demo photos (credits on the Method page and in `public/seed/credits.json`) | CC licences as listed |
| [DT Next](https://www.dtnext.in), [Urban Acres](https://urbanacres.in) | News sources for real notices, linked on every record | Linked, not copied |

No paid APIs and no AI APIs are used. The project runs entirely on free tiers.

## Project layout

```
src/app/            pages (/, /street, /map, /records, /c/[id], /about) and /api routes
src/components/     UI: header, hero street plan, street picker, outlook grid, map view, report sheet
src/lib/            data access, rules and labels, jurisdiction and escalation, forecast, outlook
supabase/migrations database schema, RLS, functions and rules engine
supabase/*.sql      seeds: illustrative reports, demo notices, real notices
scripts/            real-records.json and the generator for seed-real.sql
```
