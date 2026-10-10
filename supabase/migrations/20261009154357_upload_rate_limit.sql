create table private.uploads (reporter_hash text not null, created_at timestamptz not null default now());
create index uploads_reporter_idx on private.uploads (reporter_hash, created_at);

-- Called by the API before storing a photo: max 15 uploads per reporter per hour.
create function public.note_upload(p_token text, p_reporter_hash text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_token(p_token);
  if (select count(*) from private.uploads where reporter_hash = p_reporter_hash
      and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into private.uploads (reporter_hash) values (p_reporter_hash);
end $$;
revoke execute on function public.note_upload(text, text) from public, authenticated;
grant execute on function public.note_upload(text, text) to anon;
