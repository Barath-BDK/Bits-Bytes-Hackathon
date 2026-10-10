-- Supabase default privileges grant new functions to authenticated; writes stay anon-only (token-gated, via our API).
revoke execute on function public.submit_report(text, public.report_kind, float8, float8, smallint, text, text, date, text, text, text) from authenticated;
revoke execute on function public.vouch_cluster(text, uuid, text) from authenticated;
revoke execute on function public.confirm_cluster(text, uuid, text, text) from authenticated;
revoke execute on function public.note_upload(text, text) from authenticated;
