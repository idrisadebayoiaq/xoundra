grant select on public.plan_prices to service_role;
grant select, insert, update, delete on public.purchases to service_role;
grant select, insert, update, delete on public.webhook_events to service_role;
grant select, insert, update, delete on public.entitlements to service_role;
grant select, insert, update, delete on public.lifetime_slots to service_role;
grant select, insert, update, delete on public.subscriptions to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'track_audio_public_read'
  ) then
    create policy track_audio_public_read on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'track-audio');
  end if;
end $$;
