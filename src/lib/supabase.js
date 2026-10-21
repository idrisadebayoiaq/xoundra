import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(url || 'https://example.supabase.co', anonKey || 'public-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function trackAudioUrl(path) {
  if (!path || !url) return '';
  const clean = String(path).replace(/^\/+/, '');
  return `${url}/storage/v1/object/public/track-audio/${clean}`;
}

export async function fetchPublishedTracks() {
  const [trackResult, statResult, signalResult] = await Promise.all([
    supabase
      .from('tracks')
      .select('id, title, category, duration_seconds, access_tier, shelf, artwork_path, audio_path, artist_id, artist_name, track_tags(tag)')
      .eq('status', 'published'),
    supabase.from('track_stats').select('track_id, plays, likes, favorites'),
    supabase.from('comment_signals').select('track_id, helped, total'),
  ]);
  if (trackResult.error) throw trackResult.error;
  const stats = new Map((statResult.data || []).map((row) => [row.track_id, row]));
  const tracks = (trackResult.data || []).map((row) => {
    const artwork = String(row.artwork_path || 'rain.jpg').replace(/\.jpg$/i, '');
    const duration = Number(row.duration_seconds) || 0;
    const count = stats.get(row.id) || {};
    return {
      id: row.id,
      title: row.title,
      category: String(row.category || '').replace(/^./, (letter) => letter.toUpperCase()),
      tags: (row.track_tags || []).map((item) => item.tag),
      shelf: row.shelf,
      access: row.access_tier,
      duration,
      durationLabel: formatClock(duration),
      artwork,
      audio: row.audio_path,
      audioUrl: trackAudioUrl(row.audio_path),
      artistId: row.artist_id || '',
      artistName: row.artist_name || '',
      plays: Number(count.plays) || 0,
      likes: Number(count.likes) || 0,
      favorites: Number(count.favorites) || 0,
    };
  });
  return {
    tracks,
    signals: signalResult.data || [],
  };
}

export async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, country_code, intention, avatar_path, email_confirmed, is_artist, artist_name, artist_bio, artist_location, artist_banner_path, onboarding_done')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function fetchCategories() {
  const artwork = {
    rain: 'rain',
    ocean: 'ocean',
    forest: 'forest',
    nature: 'river',
    ambient: 'wind',
    focus: 'storm',
    meditation: 'underwater',
    sleep: 'night',
  };
  const { data, error } = await supabase.from('categories').select('slug, name, sort_order').order('sort_order');
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.name,
    slug: row.slug,
    title: row.name,
    artwork: artwork[row.slug] || 'rain',
  }));
}

const accountErrors = {
  weak_password: 'Use 8 characters with uppercase, lowercase, a number, and a symbol.',
  already_registered: 'That email already has an account. Sign in.',
  already_confirmed: 'This email is already confirmed. Sign in.',
  invalid_code: 'That code is not valid.',
  rate_limited: 'Wait a little, then ask for a new code.',
  code_create_failed: 'The confirmation code could not be saved.',
  smtp_not_configured: 'Email is not ready yet. The support mailbox still needs its sending password.',
  signup_failed: 'The account could not be created.',
  wrong_password: 'The current password does not match.',
  sign_in_again: 'Sign in again. Password changes need a session from the last 24 hours.',
  email_taken: 'That email is already used.',
  invalid_email: 'Enter a different email address.',
  missing_details: 'Add the missing details.',
  not_admin: 'This screen is for the admin account.',
  not_premium: 'The guide is part of Premium.',
  request_failed: 'That could not be completed.',
};

export async function accountAction(action, body = {}) {
  const { data, error } = await supabase.functions.invoke('account', { body: { action, ...body } });
  let code = data?.error;
  if (error && !code) {
    try {
      code = (await error.context.json())?.error;
    } catch {
      code = 'request_failed';
    }
  }
  if (code) return { ok: false, error: accountErrors[code] || accountErrors.request_failed, code, data };
  return { ok: true, error: '', code: '', data };
}

export async function askGuide(text) {
  const { data, error } = await supabase.functions.invoke('guide', { body: { text } });
  let code = data?.error;
  if (error && !code) {
    try {
      code = (await error.context.json())?.error;
    } catch {
      code = 'request_failed';
    }
  }
  if (code || !data?.id) {
    const guideErrors = {
      rate_limited: 'The guide needs a short rest. Try again tomorrow.',
      not_premium: 'The guide is part of Premium.',
      sign_in_required: 'Sign in, then try the guide again.',
    };
    return { ok: false, error: guideErrors[code] || 'The guide could not choose a sound.', id: '', line: '', ids: [] };
  }
  return { ok: true, error: '', id: data.id, line: data.line || '', ids: Array.isArray(data.ids) ? data.ids : [] };
}

export function avatarUrl(path) {
  if (!path || !url) return '';
  return `${url}/storage/v1/object/public/avatars/${path}`;
}

export async function fetchPremium(userId) {
  const { data } = await supabase.rpc('has_active_premium', { p_user: userId });
  return data === true;
}

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}
