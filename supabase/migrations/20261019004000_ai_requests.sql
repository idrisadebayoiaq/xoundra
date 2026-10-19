create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from anon, authenticated;
grant all on table public.ai_requests to service_role;
grant select on public.tracks, public.track_tags to service_role;
