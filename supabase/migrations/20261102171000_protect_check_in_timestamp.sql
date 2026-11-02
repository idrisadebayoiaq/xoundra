create or replace function public.protect_profile_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('xoundra.confirm_email', true), '') = 'on' then
    return new;
  end if;
  if coalesce(auth.role(), '') <> 'service_role' then
    new.email_confirmed := old.email_confirmed;
    new.last_check_in_at := old.last_check_in_at;
  end if;
  if coalesce(current_setting('xoundra.artist', true), '') <> 'on'
     and coalesce(auth.role(), '') <> 'service_role' then
    new.is_artist := old.is_artist;
    new.artist_name := old.artist_name;
  end if;
  return new;
end;
$$;
