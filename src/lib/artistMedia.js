import { supabase, trackAudioUrl } from './supabase';

export function imageExtension(asset) {
  const type = `${asset?.mimeType || ''} ${asset?.name || ''} ${asset?.uri || ''}`;
  if (/png/i.test(type)) return 'png';
  if (/webp/i.test(type)) return 'webp';
  return 'jpg';
}

export async function uploadArtistFile(bucket, userId, filename, asset, contentType) {
  const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
  const path = `${userId}/${filename}`;
  const uploaded = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: bucket === 'artwork',
  });
  if (uploaded.error) throw uploaded.error;
  return path;
}

export async function loadArtistWorks(userId) {
  const [{ data: albums }, { data: rows }, notes] = await Promise.all([
    supabase.from('albums').select('id, title, artwork_path, created_at').eq('artist_id', userId).order('created_at', { ascending: false }),
    supabase.from('tracks').select('id, title, category, artwork_path, audio_path, album_id, album_position, duration_seconds, track_stats(plays, likes, favorites)').eq('artist_id', userId).eq('status', 'published'),
    supabase.from('track_comment_counts').select('track_id, comments'),
  ]);
  const noteMap = new Map((notes.data || []).map((row) => [row.track_id, row.comments]));
  const sounds = (rows || []).map((row) => {
    const stats = Array.isArray(row.track_stats) ? row.track_stats[0] : row.track_stats;
    return {
      id: row.id,
      title: row.title,
      category: String(row.category || ''),
      artwork: row.artwork_path || 'rain.jpg',
      audioUrl: trackAudioUrl(row.audio_path),
      albumId: row.album_id || '',
      position: Number(row.album_position) || 0,
      duration: Number(row.duration_seconds) || 0,
      plays: Number(stats?.plays) || 0,
      likes: Number(stats?.likes) || 0,
      favorites: Number(stats?.favorites) || 0,
      comments: Number(noteMap.get(row.id)) || 0,
    };
  });
  return {
    albums: (albums || []).map((album) => ({
      ...album,
      sounds: sounds.filter((sound) => sound.albumId === album.id).sort((a, b) => a.position - b.position),
    })),
    singles: sounds.filter((sound) => !sound.albumId),
    sounds,
  };
}
