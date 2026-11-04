-- Fix push dispatch grants, bulletin RLS recursion, follow+bulletin notice payload

grant select, insert, update, delete on public.notification_outbox to service_role;
grant select, insert, update, delete on public.push_tokens to service_role;

create schema if not exists xoundra;

create or replace function xoundra.is_bulletin_member(p_bulletin uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bulletin_members m
    where m.bulletin_id = p_bulletin
      and m.user_id = auth.uid()
  );
$$;

create or replace function xoundra.owns_bulletin(p_bulletin uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bulletins b
    where b.id = p_bulletin
      and b.artist_id = auth.uid()
      and b.archived_at is null
  );
$$;

create or replace function xoundra.can_reply_bulletin(p_bulletin uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bulletins b
    join public.bulletin_members m on m.bulletin_id = b.id
    where b.id = p_bulletin
      and m.user_id = auth.uid()
      and b.members_can_reply = true
      and b.archived_at is null
  );
$$;

revoke all on function xoundra.is_bulletin_member(uuid) from public, anon;
revoke all on function xoundra.owns_bulletin(uuid) from public, anon;
revoke all on function xoundra.can_reply_bulletin(uuid) from public, anon;
grant execute on function xoundra.is_bulletin_member(uuid) to authenticated, service_role;
grant execute on function xoundra.owns_bulletin(uuid) to authenticated, service_role;
grant execute on function xoundra.can_reply_bulletin(uuid) to authenticated, service_role;

drop policy if exists bulletins_read on public.bulletins;
create policy bulletins_read on public.bulletins
for select to authenticated
using (
  artist_id = auth.uid()
  or xoundra.is_bulletin_member(id)
);

drop policy if exists bulletin_members_read on public.bulletin_members;
create policy bulletin_members_read on public.bulletin_members
for select to authenticated
using (
  user_id = auth.uid()
  or xoundra.owns_bulletin(bulletin_id)
);

drop policy if exists bulletin_posts_read on public.bulletin_posts;
create policy bulletin_posts_read on public.bulletin_posts
for select to authenticated
using (
  xoundra.is_bulletin_member(bulletin_id)
  or xoundra.owns_bulletin(bulletin_id)
);

drop policy if exists bulletin_posts_insert on public.bulletin_posts;
create policy bulletin_posts_insert on public.bulletin_posts
for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    (parent_id is null and xoundra.owns_bulletin(bulletin_id))
    or (parent_id is not null and xoundra.can_reply_bulletin(bulletin_id))
  )
);

drop policy if exists bulletin_reactions_all on public.bulletin_reactions;
create policy bulletin_reactions_all on public.bulletin_reactions
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bulletin_posts p
    where p.id = post_id
      and (
        xoundra.is_bulletin_member(p.bulletin_id)
        or xoundra.owns_bulletin(p.bulletin_id)
      )
  )
);

-- One follow notice: attach bulletin_id when the artist already has a Bulletin
create or replace function public.notice_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := public.notice_person(new.follower_id);
  v_bulletin uuid;
  v_notice uuid;
begin
  select id into v_bulletin
  from public.bulletins
  where artist_id = new.artist_id
    and archived_at is null
  limit 1;

  perform public.queue_notice(
    new.artist_id,
    case when v_bulletin is null then 'follow' else 'follow_bulletin' end,
    v_name || ' followed you',
    case
      when v_bulletin is null then ''
      else 'Invite them to your Bulletin.'
    end
  );

  if v_bulletin is not null then
    select id into v_notice
    from public.user_notifications
    where user_id = new.artist_id
      and kind = 'follow_bulletin'
    order by created_at desc
    limit 1;

    if v_notice is not null then
      update public.user_notifications
      set bulletin_id = v_bulletin
      where id = v_notice;

      update public.notification_outbox
      set bulletin_id = v_bulletin
      where notification_id = v_notice;
    end if;
  end if;

  return new;
end;
$$;

-- Avoid duplicate follow_bulletin notices from the older trigger
create or replace function public.notify_artist_follow_bulletin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;
