alter table public.push_tokens
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

grant select, insert, update, delete on public.push_tokens to service_role;
