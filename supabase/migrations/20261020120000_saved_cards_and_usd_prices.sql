update public.plan_prices set amount_minor = 113 where plan_id = 'premium_monthly' and currency = 'USD';
update public.plan_prices set amount_minor = 901 where plan_id = 'premium_annual' and currency = 'USD';
update public.plan_prices set amount_minor = 2628 where plan_id = 'founding_lifetime' and currency = 'USD';

create table if not exists public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  authorization_code text not null,
  last4 text not null,
  brand text not null default '',
  exp_month text,
  exp_year text,
  reusable boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.renewals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  saved_card_id uuid references public.saved_cards (id) on delete set null,
  next_charge_at timestamptz,
  period_end timestamptz,
  status text not null default 'active',
  notice_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.saved_cards enable row level security;
alter table public.renewals enable row level security;
revoke all on public.saved_cards from anon, authenticated;
revoke all on public.renewals from anon, authenticated;
grant all on public.saved_cards to service_role;
grant all on public.renewals to service_role;
