-- Quiet Room + Bulletins (+ image bucket)

insert into storage.buckets (id, name, public)
values ('quiet-room', 'quiet-room', true)
on conflict (id) do nothing;

drop policy if exists quiet_room_read on storage.objects;
create policy quiet_room_read on storage.objects
for select to public
using (bucket_id = 'quiet-room');

drop policy if exists quiet_room_insert on storage.objects;
create policy quiet_room_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'quiet-room'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists quiet_room_update on storage.objects;
create policy quiet_room_update on storage.objects
for update to authenticated
using (
  bucket_id = 'quiet-room'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists quiet_room_delete on storage.objects;
create policy quiet_room_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'quiet-room'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create table if not exists public.quiet_room_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  author_name text not null default 'Listener',
  tag text not null default '',
  track_id text,
  image_paths text[] not null default '{}',
  status text not null default 'visible',
  created_at timestamptz not null default now(),
  constraint quiet_room_posts_body check (char_length(btrim(body)) between 2 and 500),
  constraint quiet_room_posts_tag check (tag = '' or tag in ('recommend', 'app_help', 'night', 'focus', 'scene')),
  constraint quiet_room_posts_status check (status in ('visible', 'hidden', 'removed')),
  constraint quiet_room_posts_images check (cardinality(image_paths) between 0 and 4)
);

create index if not exists quiet_room_posts_feed_idx
  on public.quiet_room_posts (created_at desc)
  where status = 'visible';

create table if not exists public.quiet_room_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.quiet_room_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.quiet_room_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.quiet_room_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  author_name text not null default 'Listener',
  created_at timestamptz not null default now(),
  constraint quiet_room_comments_body check (char_length(btrim(body)) between 2 and 280)
);

create index if not exists quiet_room_comments_post_idx
  on public.quiet_room_comments (post_id, created_at desc);

create table if not exists public.quiet_room_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.quiet_room_posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default 'other',
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id),
  constraint quiet_room_reports_reason check (char_length(btrim(reason)) between 2 and 120)
);

create table if not exists public.bulletins (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  cover_path text,
  members_can_reply boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bulletins_title check (char_length(btrim(title)) between 2 and 80),
  constraint bulletins_description check (char_length(description) <= 400)
);

create unique index if not exists bulletins_one_active_per_artist
  on public.bulletins (artist_id)
  where archived_at is null;

create table if not exists public.bulletin_members (
  bulletin_id uuid not null references public.bulletins (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (bulletin_id, user_id),
  constraint bulletin_members_role check (role in ('member', 'owner'))
);

create table if not exists public.bulletin_invites (
  id uuid primary key default gen_random_uuid(),
  bulletin_id uuid not null references public.bulletins (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responds_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  unique (bulletin_id, invited_user_id),
  constraint bulletin_invites_status check (status in ('pending', 'accepted', 'declined', 'expired'))
);

create table if not exists public.bulletin_posts (
  id uuid primary key default gen_random_uuid(),
  bulletin_id uuid not null references public.bulletins (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  parent_id uuid references public.bulletin_posts (id) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint bulletin_posts_body check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists bulletin_posts_feed_idx
  on public.bulletin_posts (bulletin_id, created_at desc);

create table if not exists public.bulletin_reactions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.bulletin_posts (id) on delete cascade,
  kind text not null default 'heart',
  created_at timestamptz not null default now(),
  primary key (user_id, post_id),
  constraint bulletin_reactions_kind check (kind in ('heart', 'thanks', 'calm'))
);

alter table public.user_notifications
  add column if not exists quiet_room_post_id uuid references public.quiet_room_posts (id) on delete cascade,
  add column if not exists bulletin_id uuid references public.bulletins (id) on delete cascade,
  add column if not exists bulletin_invite_id uuid references public.bulletin_invites (id) on delete cascade;

alter table public.notification_outbox
  add column if not exists quiet_room_post_id uuid,
  add column if not exists bulletin_id uuid,
  add column if not exists bulletin_invite_id uuid;

alter table public.quiet_room_posts enable row level security;
alter table public.quiet_room_likes enable row level security;
alter table public.quiet_room_comments enable row level security;
alter table public.quiet_room_reports enable row level security;
alter table public.bulletins enable row level security;
alter table public.bulletin_members enable row level security;
alter table public.bulletin_invites enable row level security;
alter table public.bulletin_posts enable row level security;
alter table public.bulletin_reactions enable row level security;

create or replace function public.stamp_quiet_room_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(btrim(first_name), ''), 'Listener') into new.author_name
  from public.profiles where id = auth.uid();
  return new;
end;
$$;

drop trigger if exists quiet_room_posts_stamp on public.quiet_room_posts;
create trigger quiet_room_posts_stamp
before insert on public.quiet_room_posts
for each row execute function public.stamp_quiet_room_post();

create or replace function public.stamp_quiet_room_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(btrim(first_name), ''), 'Listener') into new.author_name
  from public.profiles where id = auth.uid();
  return new;
end;
$$;

drop trigger if exists quiet_room_comments_stamp on public.quiet_room_comments;
create trigger quiet_room_comments_stamp
before insert on public.quiet_room_comments
for each row execute function public.stamp_quiet_room_comment();

drop policy if exists quiet_room_posts_read on public.quiet_room_posts;
create policy quiet_room_posts_read on public.quiet_room_posts
for select to authenticated
using (status = 'visible' or user_id = auth.uid());

drop policy if exists quiet_room_posts_insert on public.quiet_room_posts;
create policy quiet_room_posts_insert on public.quiet_room_posts
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists quiet_room_posts_update on public.quiet_room_posts;
create policy quiet_room_posts_update on public.quiet_room_posts
for update to authenticated
using (user_id = auth.uid());

drop policy if exists quiet_room_posts_delete on public.quiet_room_posts;
create policy quiet_room_posts_delete on public.quiet_room_posts
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists quiet_room_likes_all on public.quiet_room_likes;
create policy quiet_room_likes_all on public.quiet_room_likes
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists quiet_room_likes_read on public.quiet_room_likes;
create policy quiet_room_likes_read on public.quiet_room_likes
for select to authenticated
using (true);

drop policy if exists quiet_room_comments_read on public.quiet_room_comments;
create policy quiet_room_comments_read on public.quiet_room_comments
for select to authenticated
using (true);

drop policy if exists quiet_room_comments_insert on public.quiet_room_comments;
create policy quiet_room_comments_insert on public.quiet_room_comments
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists quiet_room_comments_delete on public.quiet_room_comments;
create policy quiet_room_comments_delete on public.quiet_room_comments
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists quiet_room_reports_insert on public.quiet_room_reports;
create policy quiet_room_reports_insert on public.quiet_room_reports
for insert to authenticated
with check (reporter_id = auth.uid());

create or replace function public.quiet_room_daily_post_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.quiet_room_posts
  where user_id = auth.uid()
    and created_at >= date_trunc('day', now());
$$;

create or replace function public.create_quiet_room_post(
  p_body text,
  p_tag text default '',
  p_track text default null,
  p_images text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_tag text := coalesce(p_tag, '');
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  if public.quiet_room_daily_post_count() >= 8 then
    raise exception 'rate_limited';
  end if;
  if v_tag not in ('', 'recommend', 'app_help', 'night', 'focus', 'scene') then
    v_tag := '';
  end if;
  insert into public.quiet_room_posts (body, tag, track_id, image_paths)
  values (btrim(p_body), v_tag, nullif(p_track, ''), coalesce(p_images, '{}'))
  returning id into v_id;
  return v_id;
end;
$$;

drop policy if exists bulletins_read on public.bulletins;
create policy bulletins_read on public.bulletins
for select to authenticated
using (
  artist_id = auth.uid()
  or exists (
    select 1 from public.bulletin_members m
    where m.bulletin_id = bulletins.id and m.user_id = auth.uid()
  )
);

drop policy if exists bulletins_write on public.bulletins;
create policy bulletins_write on public.bulletins
for all to authenticated
using (
  artist_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_artist)
)
with check (
  artist_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_artist)
);

drop policy if exists bulletin_members_read on public.bulletin_members;
create policy bulletin_members_read on public.bulletin_members
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.bulletins b
    where b.id = bulletin_members.bulletin_id and b.artist_id = auth.uid()
  )
);

drop policy if exists bulletin_members_self_delete on public.bulletin_members;
create policy bulletin_members_self_delete on public.bulletin_members
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists bulletin_invites_read on public.bulletin_invites;
create policy bulletin_invites_read on public.bulletin_invites
for select to authenticated
using (invited_user_id = auth.uid() or invited_by = auth.uid());

drop policy if exists bulletin_posts_read on public.bulletin_posts;
create policy bulletin_posts_read on public.bulletin_posts
for select to authenticated
using (
  exists (
    select 1 from public.bulletin_members m
    where m.bulletin_id = bulletin_posts.bulletin_id and m.user_id = auth.uid()
  )
  or exists (
    select 1 from public.bulletins b
    where b.id = bulletin_posts.bulletin_id and b.artist_id = auth.uid()
  )
);

drop policy if exists bulletin_posts_insert on public.bulletin_posts;
create policy bulletin_posts_insert on public.bulletin_posts
for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    exists (
      select 1 from public.bulletins b
      where b.id = bulletin_id and b.artist_id = auth.uid() and parent_id is null
    )
    or (
      parent_id is not null
      and exists (
        select 1 from public.bulletins b
        join public.bulletin_members m on m.bulletin_id = b.id
        where b.id = bulletin_id
          and m.user_id = auth.uid()
          and b.members_can_reply = true
      )
    )
  )
);

drop policy if exists bulletin_reactions_all on public.bulletin_reactions;
create policy bulletin_reactions_all on public.bulletin_reactions
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.bulletin_posts p
    join public.bulletin_members m on m.bulletin_id = p.bulletin_id
    where p.id = post_id and m.user_id = auth.uid()
  )
);

create or replace function public.create_bulletin(
  p_title text,
  p_description text default '',
  p_members_can_reply boolean default false,
  p_cover text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_artist boolean;
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  select is_artist into v_artist from public.profiles where id = auth.uid();
  if coalesce(v_artist, false) is not true then raise exception 'not_artist'; end if;
  if exists (select 1 from public.bulletins where artist_id = auth.uid() and archived_at is null) then
    raise exception 'bulletin_exists';
  end if;
  insert into public.bulletins (artist_id, title, description, members_can_reply, cover_path)
  values (auth.uid(), btrim(p_title), coalesce(p_description, ''), coalesce(p_members_can_reply, false), p_cover)
  returning id into v_id;
  insert into public.bulletin_members (bulletin_id, user_id, role)
  values (v_id, auth.uid(), 'owner');
  return v_id;
end;
$$;

create or replace function public.invite_to_bulletin(p_bulletin uuid, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist uuid;
  v_id uuid;
  v_follows boolean;
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  select artist_id into v_artist from public.bulletins where id = p_bulletin and archived_at is null;
  if v_artist is null or v_artist <> auth.uid() then raise exception 'not_allowed'; end if;
  if p_user = auth.uid() then raise exception 'not_allowed'; end if;
  select exists (
    select 1 from public.artist_follows
    where artist_id = v_artist and follower_id = p_user
  ) into v_follows;
  if not v_follows then raise exception 'not_follower'; end if;
  if exists (select 1 from public.bulletin_members where bulletin_id = p_bulletin and user_id = p_user) then
    raise exception 'already_member';
  end if;
  insert into public.bulletin_invites (bulletin_id, invited_user_id, invited_by)
  values (p_bulletin, p_user, auth.uid())
  on conflict (bulletin_id, invited_user_id) do update
    set status = 'pending',
        invited_by = excluded.invited_by,
        created_at = now(),
        expires_at = now() + interval '14 days',
        responds_at = null
  returning id into v_id;
  perform public.queue_notice(
    p_user,
    'bulletin_invite',
    'Bulletin invite',
    'An artist invited you to their Bulletin.',
    null,
    null,
    null
  );
  update public.user_notifications n
  set bulletin_id = p_bulletin, bulletin_invite_id = v_id
  from (
    select id from public.user_notifications
    where user_id = p_user and kind = 'bulletin_invite'
    order by created_at desc
    limit 1
  ) latest
  where n.id = latest.id;
  return v_id;
end;
$$;

create or replace function public.respond_bulletin_invite(p_invite uuid, p_accept boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bulletin_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  select * into v_row from public.bulletin_invites where id = p_invite;
  if v_row.id is null or v_row.invited_user_id <> auth.uid() then raise exception 'not_allowed'; end if;
  if v_row.status <> 'pending' or v_row.expires_at < now() then
    update public.bulletin_invites set status = 'expired', responds_at = now() where id = p_invite;
    return false;
  end if;
  if p_accept then
    insert into public.bulletin_members (bulletin_id, user_id, role)
    values (v_row.bulletin_id, auth.uid(), 'member')
    on conflict do nothing;
    update public.bulletin_invites set status = 'accepted', responds_at = now() where id = p_invite;
    return true;
  end if;
  update public.bulletin_invites set status = 'declined', responds_at = now() where id = p_invite;
  return false;
end;
$$;

create or replace function public.notify_artist_follow_bulletin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bulletin uuid;
  v_name text;
begin
  select id into v_bulletin from public.bulletins
  where artist_id = new.artist_id and archived_at is null
  limit 1;
  if v_bulletin is null then
    return new;
  end if;
  select coalesce(nullif(btrim(first_name), ''), 'Someone') into v_name
  from public.profiles where id = new.follower_id;
  perform public.queue_notice(
    new.artist_id,
    'follow_bulletin',
    'New follower',
    v_name || ' followed you. Invite them to your Bulletin.',
    null,
    null,
    null
  );
  update public.user_notifications n
  set bulletin_id = v_bulletin
  from (
    select id from public.user_notifications
    where user_id = new.artist_id and kind = 'follow_bulletin'
    order by created_at desc
    limit 1
  ) latest
  where n.id = latest.id;
  return new;
end;
$$;

drop trigger if exists artist_follows_bulletin_notice on public.artist_follows;
create trigger artist_follows_bulletin_notice
after insert on public.artist_follows
for each row execute function public.notify_artist_follow_bulletin();

grant select, insert, update, delete on public.quiet_room_posts to authenticated;
grant select, insert, delete on public.quiet_room_likes to authenticated;
grant select, insert, delete on public.quiet_room_comments to authenticated;
grant insert on public.quiet_room_reports to authenticated;
grant select, insert, update, delete on public.bulletins to authenticated;
grant select, delete on public.bulletin_members to authenticated;
grant select on public.bulletin_invites to authenticated;
grant select, insert on public.bulletin_posts to authenticated;
grant select, insert, delete on public.bulletin_reactions to authenticated;

revoke all on function public.create_quiet_room_post(text, text, text, text[]) from public, anon;
grant execute on function public.create_quiet_room_post(text, text, text, text[]) to authenticated;
revoke all on function public.create_bulletin(text, text, boolean, text) from public, anon;
grant execute on function public.create_bulletin(text, text, boolean, text) to authenticated;
revoke all on function public.invite_to_bulletin(uuid, uuid) from public, anon;
grant execute on function public.invite_to_bulletin(uuid, uuid) to authenticated;
revoke all on function public.respond_bulletin_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_bulletin_invite(uuid, boolean) to authenticated;
revoke all on function public.quiet_room_daily_post_count() from public, anon;
grant execute on function public.quiet_room_daily_post_count() to authenticated;
