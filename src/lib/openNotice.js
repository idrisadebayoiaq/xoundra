import { router } from 'expo-router';
import { fetchPublishedTracks } from './supabase';

export async function openNotice(item, play, tracks) {
  if (!item) return;
  const trackId = item.track_id || item.trackId || '';
  const albumId = item.album_id || item.albumId || '';
  const announcementId = item.announcement_id || item.announcementId || '';
  const quietRoomPostId = item.quiet_room_post_id || item.quietRoomPostId || '';
  const bulletinId = item.bulletin_id || item.bulletinId || '';
  const kind = item.kind || '';
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
    return;
  }
  if (quietRoomPostId) {
    router.push({ pathname: '/quiet-room/[id]', params: { id: quietRoomPostId } });
    return;
  }
  if (kind === 'bulletin_invite' || kind === 'follow_bulletin' || bulletinId) {
    if (bulletinId) router.push({ pathname: '/artist-bulletins/[id]', params: { id: bulletinId } });
    else router.push('/artist-bulletins');
    return;
  }
  if (kind === 'support_reply' || kind === 'support_ticket') {
    router.push('/support');
    return;
  }
  if (kind === 'verification_request' || kind === 'verification_approved' || kind === 'verification_rejected') {
    if (kind === 'verification_request') router.push('/admin');
    else router.push('/artist');
  }
}
