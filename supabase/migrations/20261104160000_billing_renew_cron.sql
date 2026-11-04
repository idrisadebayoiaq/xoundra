insert into private.app_secrets(name, value)
select 'BILLING_CRON_SECRET', value
from private.app_secrets
where name = 'CHECK_IN_CRON_SECRET'
on conflict (name) do update set value = excluded.value, updated_at = now();

create or replace function public.invoke_billing_renew()
returns void
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  secret text;
  endpoint text := 'https://mmgezkeemyjxluxcshaz.supabase.co/functions/v1/billing';
begin
  secret := private.get_app_secret('BILLING_CRON_SECRET');
  if secret is null or length(secret) < 8 then
    secret := private.get_app_secret('CHECK_IN_CRON_SECRET');
  end if;
  if secret is null or length(secret) < 8 then
    return;
  end if;
  perform net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-billing-cron', secret
    ),
    body := jsonb_build_object('action', 'renew_due')
  );
end;
$$;

revoke all on function public.invoke_billing_renew() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'xoundra-billing-renew';

select cron.schedule(
  'xoundra-billing-renew',
  '20 * * * *',
  $$select public.invoke_billing_renew()$$
);
