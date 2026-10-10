revoke execute on function public.submit_report(text, public.report_kind, float8, float8, smallint, text, text, date, text, text) from authenticated;
revoke execute on function public.confirm_cluster(text, uuid, text, text) from authenticated;
delete from public.clusters;
