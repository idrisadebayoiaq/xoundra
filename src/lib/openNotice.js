import { router } from 'expo-router';
import { fetchPublishedTracks } from './supabase';

export async function openNotice(item, play, tracks) {
  if (!item) return;
  const trackId = item.track_id || item.trackId || '';
  const albumId = item.album_id || item.albumId || '';
  const announcementId = item.announcement_id || item.announcementId || '';
  if (trackId) {
    let track = (tracks || []).find((row) => row.id === trackId);
    if (!track) {
      const remote = await fetchPublishedTracks().catch(() => null);
      track = remote?.tracks?.find((row) => row.id === trackId);
    }
    if (track && play) play(track, [track]);
    if (track) router.push('/player');
    return;
  }
  if (albumId) {
    router.push({ pathname: '/album', params: { id: albumId } });
    return;
  }
  if (announcementId) {
    router.push({ pathname: '/announcement', params: { id: announcementId } });
  }
}
