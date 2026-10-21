update public.tracks
set audio_path = 'catalogue/' || audio_path
where audio_path is not null
  and audio_path <> ''
  and position('/' in audio_path) = 0;

drop policy if exists track_audio_seed_insert on storage.objects;
