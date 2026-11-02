-- Check-in greeting emails (Good morning / Good evening)
alter table public.profiles
  add column if not exists check_in_emails boolean not null default true,
  add column if not exists last_check_in_at timestamptz;

comment on column public.profiles.check_in_emails is 'When true, Xoundra may send occasional morning/evening check-in emails.';
comment on column public.profiles.last_check_in_at is 'Last time a check-in email was sent to this profile.';
