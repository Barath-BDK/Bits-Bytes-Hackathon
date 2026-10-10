-- Construction mapped in OpenStreetMap: a notice kind for works in progress, and its own provenance.
alter type public.notice_kind add value if not exists 'works';
alter type public.provenance add value if not exists 'osm';
