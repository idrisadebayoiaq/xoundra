alter table public.playlists
  add column if not exists is_public boolean not null default false;

drop policy if exists playlists_all on public.playlists;
drop policy if exists playlists_select on public.playlists;
drop policy if exists playlists_insert on public.playlists;
drop policy if exists playlists_update on public.playlists;
drop policy if exists playlists_delete on public.playlists;

create policy playlists_select on public.playlists
for select to authenticated
using (user_id = auth.uid() or is_public = true);

create policy playlists_insert on public.playlists
for insert to authenticated
with check (user_id = auth.uid());

create policy playlists_update on public.playlists
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy playlists_delete on public.playlists
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists playlist_tracks_all on public.playlist_tracks;
drop policy if exists playlist_tracks_select on public.playlist_tracks;
drop policy if exists playlist_tracks_insert on public.playlist_tracks;
drop policy if exists playlist_tracks_update on public.playlist_tracks;
drop policy if exists playlist_tracks_delete on public.playlist_tracks;

create policy playlist_tracks_select on public.playlist_tracks
for select to authenticated
using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.user_id = auth.uid() or p.is_public = true)
  )
);

create policy playlist_tracks_insert on public.playlist_tracks
for insert to authenticated
with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);

create policy playlist_tracks_update on public.playlist_tracks
for update to authenticated
using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
)
with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);

create policy playlist_tracks_delete on public.playlist_tracks
for delete to authenticated
using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);
