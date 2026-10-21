create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  artwork_path text,
  created_at timestamptz not null default now()
);

alter table public.tracks
  add column if not exists album_id uuid references public.albums (id) on delete set null,
  add column if not exists album_position integer;

create index if not exists albums_artist_idx on public.albums (artist_id);
create index if not exists tracks_album_idx on public.tracks (album_id);

alter table public.albums enable row level security;

drop policy if exists albums_read on public.albums;
create policy albums_read on public.albums
  for select to anon, authenticated
  using (true);

grant select on public.albums to anon, authenticated;

drop function if exists public.publish_artist_track(text, text, numeric, text);

create or replace function public.publish_artist_track(
  p_title text,
  p_category text,
  p_duration numeric,
  p_audio_path text,
  p_artwork_path text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id text;
  v_art text;
  v_seconds numeric;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  select artist_name into v_name
  from public.profiles
  where id = auth.uid() and is_artist;
  if v_name is null then
    raise exception 'not_artist';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'missing_details';
  end if;
  if not exists (select 1 from public.categories where slug = p_category) then
    raise exception 'missing_details';
  end if;
  if p_audio_path is null or p_audio_path not like auth.uid()::text || '/%.mp3' then
    raise exception 'missing_audio';
  end if;
  if p_artwork_path is not null and (
    p_artwork_path not like auth.uid()::text || '/%'
    or p_artwork_path !~* '\.(jpg|jpeg|png|webp)$'
  ) then
    raise exception 'missing_artwork';
  end if;
  v_seconds := greatest(1, coalesce(p_duration, 180));
  v_id := trim(both '-' from regexp_replace(lower(btrim(p_title)), '[^a-z0-9]+', '-', 'g'));
  if v_id = '' then
    v_id := 'sound';
  end if;
  v_id := v_id || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  v_art := coalesce(p_artwork_path, case p_category
    when 'nature' then 'river.jpg'
    when 'ambient' then 'wind.jpg'
    when 'focus' then 'storm.jpg'
    when 'meditation' then 'underwater.jpg'
    when 'sleep' then 'night.jpg'
    else p_category || '.jpg'
  end);
  insert into public.tracks (
    id, title, category, duration_seconds, access_tier, status, shelf, loop_ok,
    name_source, artwork_path, audio_path, rights_status, downloads_require_premium,
    artist_id, artist_name
  ) values (
    v_id, btrim(p_title), p_category, v_seconds, 'free', 'published', 'explore', true,
    'artist', v_art, p_audio_path, 'artist', true,
    auth.uid(), v_name
  );
  return v_id;
end;
$$;

create or replace function public.publish_artist_album(
  p_title text,
  p_artwork_path text,
  p_tracks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_album uuid;
  v_item jsonb;
  v_index integer := 0;
  v_title text;
  v_category text;
  v_audio text;
  v_art text;
  v_id text;
  v_seconds numeric;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  select artist_name into v_name
  from public.profiles
  where id = auth.uid() and is_artist;
  if v_name is null then
    raise exception 'not_artist';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'missing_details';
  end if;
  if p_artwork_path is null
     or p_artwork_path not like auth.uid()::text || '/%'
     or p_artwork_path !~* '\.(jpg|jpeg|png|webp)$' then
    raise exception 'missing_artwork';
  end if;
  if jsonb_typeof(p_tracks) <> 'array'
     or jsonb_array_length(p_tracks) < 2
     or jsonb_array_length(p_tracks) > 24 then
    raise exception 'missing_details';
  end if;

  insert into public.albums (artist_id, title, artwork_path)
  values (auth.uid(), btrim(p_title), p_artwork_path)
  returning id into v_album;

  for v_item in select value from jsonb_array_elements(p_tracks)
  loop
    v_title := btrim(coalesce(v_item->>'title', ''));
    v_category := v_item->>'category';
    v_audio := v_item->>'audio_path';
    v_art := v_item->>'artwork_path';
    v_seconds := greatest(1, coalesce((v_item->>'duration')::numeric, 180));
    if char_length(v_title) < 2 then
      raise exception 'missing_details';
    end if;
    if not exists (select 1 from public.categories where slug = v_category) then
      raise exception 'missing_details';
    end if;
    if v_audio is null or v_audio not like auth.uid()::text || '/%.mp3' then
      raise exception 'missing_audio';
    end if;
    if v_art is null
       or v_art not like auth.uid()::text || '/%'
       or v_art !~* '\.(jpg|jpeg|png|webp)$' then
      raise exception 'missing_artwork';
    end if;
    v_id := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
    if v_id = '' then
      v_id := 'sound';
    end if;
    v_id := v_id || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    insert into public.tracks (
      id, title, category, duration_seconds, access_tier, status, shelf, loop_ok,
      name_source, artwork_path, audio_path, rights_status, downloads_require_premium,
      artist_id, artist_name, album_id, album_position
    ) values (
      v_id, v_title, v_category, v_seconds, 'free', 'published', 'explore', true,
      'artist', v_art, v_audio, 'artist', true,
      auth.uid(), v_name, v_album, v_index
    );
    v_index := v_index + 1;
  end loop;
  return v_album;
end;
$$;

grant execute on function public.publish_artist_track(text, text, numeric, text, text) to authenticated;
grant execute on function public.publish_artist_album(text, text, jsonb) to authenticated;

drop policy if exists artist_artwork_insert on storage.objects;
create policy artist_artwork_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_artist)
  );

drop policy if exists artist_artwork_update on storage.objects;
create policy artist_artwork_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_artist)
  )
  with check (
    bucket_id = 'artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
