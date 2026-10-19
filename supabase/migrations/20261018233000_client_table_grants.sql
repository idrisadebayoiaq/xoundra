grant select on public.countries, public.categories, public.tracks, public.track_tags, public.plans, public.plan_prices, public.lifetime_offers to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.playlist_tracks to authenticated;
grant select, insert, delete on public.listening_history to authenticated;
grant select, insert, delete on public.downloads to authenticated;
grant select, insert, update, delete on public.soundscapes to authenticated;
grant select, insert, update, delete on public.soundscape_layers to authenticated;
