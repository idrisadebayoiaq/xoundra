import { supabase } from './supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export const QUIET_ROOM_TAGS = [
  { id: '', label: 'None' },
  { id: 'recommend', label: 'Recommend' },
  { id: 'app_help', label: 'App help' },
  { id: 'night', label: 'Night' },
  { id: 'focus', label: 'Focus' },
  { id: 'scene', label: 'Scene idea' },
];

export function quietRoomImageUrl(path) {
  if (!path || !url) return '';
  const clean = String(path).replace(/^\/+/, '');
  return `${url}/storage/v1/object/public/quiet-room/${clean}`;
}

export function tagLabel(tag) {
  return QUIET_ROOM_TAGS.find((item) => item.id === tag)?.label || '';
}

export async function uploadQuietRoomImage(userId, asset, index = 0) {
  const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
  const mime = asset.mimeType || 'image/jpeg';
  const ext = /png/i.test(mime) ? 'png' : /webp/i.test(mime) ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${index}.${ext}`;
  const uploaded = await supabase.storage.from('quiet-room').upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (uploaded.error) throw uploaded.error;
  return path;
}

export function communityVoiceUrl(path) {
  if (!path || !url) return '';
  const clean = String(path).replace(/^\/+/, '');
  return `${url}/storage/v1/object/public/community-voice/${clean}`;
}

export async function uploadCommunityVoice(userId, asset) {
  const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
  const mime = asset.mimeType || 'audio/mp4';
  const ext = /webm/i.test(mime) ? 'webm' : /mpeg|mp3/i.test(mime) ? 'mp3' : 'm4a';
  const path = `${userId}/${Date.now()}.${ext}`;
  const uploaded = await supabase.storage.from('community-voice').upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (uploaded.error) throw uploaded.error;
  return path;
}
