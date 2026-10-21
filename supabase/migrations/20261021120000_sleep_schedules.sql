create table if not exists public.sleep_schedules (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  start_time text not null,
  stop_time text not null,
  track_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.sleep_schedules enable row level security;

drop policy if exists sleep_read on public.sleep_schedules;
create policy sleep_read on public.sleep_schedules
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists sleep_write on public.sleep_schedules;
create policy sleep_write on public.sleep_schedules
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_active_premium(auth.uid()));

drop policy if exists sleep_update on public.sleep_schedules;
create policy sleep_update on public.sleep_schedules
  for update to authenticated
  using (user_id = auth.uid() and public.has_active_premium(auth.uid()))
  with check (user_id = auth.uid() and public.has_active_premium(auth.uid()));

drop policy if exists sleep_delete on public.sleep_schedules;
create policy sleep_delete on public.sleep_schedules
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.sleep_schedules to authenticated;
