import tracks from './tracks.json';

export const allTracks = tracks;

const tonightOrder = [
  'steady-rain',
  'cape-surf',
  'west-african-night',
  'long-wind',
  'deep-sea',
  'forest-air',
];

export function trackById(id) {
  return tracks.find((track) => track.id === id) || null;
}

export function pickTonight(list) {
  return tonightOrder.map((id) => list.find((track) => track.id === id)).filter(Boolean);
}

export function pickSleep(list) {
  return list.filter((track) => track.shelf === 'home' && (track.tags || []).includes('sleep')).slice(0, 8);
}

export const tonight = pickTonight(tracks);
export const forSleep = pickSleep(tracks);

export const moods = [
  { id: 'Rain', title: 'Rain', artwork: 'rain' },
  { id: 'Ocean', title: 'Ocean', artwork: 'ocean' },
  { id: 'Forest', title: 'Forest', artwork: 'forest' },
  { id: 'Night', title: 'Night', artwork: 'night' },
  { id: 'Nature', title: 'Nature', artwork: 'river' },
  { id: 'Ambient', title: 'Ambient', artwork: 'wind' },
  { id: 'Focus', title: 'Focus', artwork: 'storm' },
  { id: 'Meditation', title: 'Meditation', artwork: 'underwater' },
];

export function tracksForMood(id, list = tracks) {
  if (id === 'Night') {
    return list.filter(
      (track) => track.artwork === 'night' || /night/i.test(track.title) || (track.tags || []).includes('night'),
    );
  }
  if (String(id).toLowerCase() === 'sleep') {
    return list.filter((track) => String(track.category).toLowerCase() === 'sleep' || (track.tags || []).includes('sleep'));
  }
  return list.filter((track) => String(track.category).toLowerCase() === String(id).toLowerCase());
}

export function searchTracks(query, list = tracks) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return list.filter((track) => {
    const haystack = [track.title, track.category, ...(track.tags || [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const countries = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'AR', name: 'Argentina', currency: 'USD' },
  { code: 'AU', name: 'Australia', currency: 'USD' },
  { code: 'AT', name: 'Austria', currency: 'USD' },
  { code: 'BE', name: 'Belgium', currency: 'USD' },
  { code: 'BW', name: 'Botswana', currency: 'USD' },
  { code: 'BR', name: 'Brazil', currency: 'USD' },
  { code: 'CM', name: 'Cameroon', currency: 'USD' },
  { code: 'CA', name: 'Canada', currency: 'USD' },
  { code: 'CL', name: 'Chile', currency: 'USD' },
  { code: 'CN', name: 'China', currency: 'USD' },
  { code: 'CO', name: 'Colombia', currency: 'USD' },
  { code: 'CI', name: "Cote d'Ivoire", currency: 'USD' },
  { code: 'DK', name: 'Denmark', currency: 'USD' },
  { code: 'EG', name: 'Egypt', currency: 'USD' },
  { code: 'ET', name: 'Ethiopia', currency: 'USD' },
  { code: 'FI', name: 'Finland', currency: 'USD' },
  { code: 'FR', name: 'France', currency: 'USD' },
  { code: 'DE', name: 'Germany', currency: 'USD' },
  { code: 'GH', name: 'Ghana', currency: 'USD' },
  { code: 'GR', name: 'Greece', currency: 'USD' },
  { code: 'IN', name: 'India', currency: 'USD' },
  { code: 'ID', name: 'Indonesia', currency: 'USD' },
  { code: 'IE', name: 'Ireland', currency: 'USD' },
  { code: 'IT', name: 'Italy', currency: 'USD' },
  { code: 'JM', name: 'Jamaica', currency: 'USD' },
  { code: 'JP', name: 'Japan', currency: 'USD' },
  { code: 'KE', name: 'Kenya', currency: 'USD' },
  { code: 'MY', name: 'Malaysia', currency: 'USD' },
  { code: 'MX', name: 'Mexico', currency: 'USD' },
  { code: 'MA', name: 'Morocco', currency: 'USD' },
  { code: 'NL', name: 'Netherlands', currency: 'USD' },
  { code: 'NZ', name: 'New Zealand', currency: 'USD' },
  { code: 'NO', name: 'Norway', currency: 'USD' },
  { code: 'PH', name: 'Philippines', currency: 'USD' },
  { code: 'PL', name: 'Poland', currency: 'USD' },
  { code: 'PT', name: 'Portugal', currency: 'USD' },
  { code: 'QA', name: 'Qatar', currency: 'USD' },
  { code: 'RO', name: 'Romania', currency: 'USD' },
  { code: 'RW', name: 'Rwanda', currency: 'USD' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'USD' },
  { code: 'SN', name: 'Senegal', currency: 'USD' },
  { code: 'SG', name: 'Singapore', currency: 'USD' },
  { code: 'ZA', name: 'South Africa', currency: 'USD' },
  { code: 'KR', name: 'South Korea', currency: 'USD' },
  { code: 'ES', name: 'Spain', currency: 'USD' },
  { code: 'SE', name: 'Sweden', currency: 'USD' },
  { code: 'CH', name: 'Switzerland', currency: 'USD' },
  { code: 'TZ', name: 'Tanzania', currency: 'USD' },
  { code: 'TH', name: 'Thailand', currency: 'USD' },
  { code: 'TN', name: 'Tunisia', currency: 'USD' },
  { code: 'TR', name: 'Turkey', currency: 'USD' },
  { code: 'UG', name: 'Uganda', currency: 'USD' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'USD' },
  { code: 'US', name: 'United States', currency: 'USD' },
];

export const plans = [
  {
    id: 'premium_monthly',
    name: 'Monthly',
    ngn: 'NGN 1,500',
    usd: '$1.99',
    period: 'per month',
    charge: 'NGN 1,500',
  },
  {
    id: 'premium_annual',
    name: 'Annual',
    ngn: 'NGN 12,000',
    usd: '$10.99',
    period: 'per year',
    charge: 'NGN 12,000',
  },
  {
    id: 'founding_lifetime',
    name: 'Lifetime',
    ngn: 'NGN 35,000',
    usd: '$34.99',
    period: 'once, first 50',
    charge: 'NGN 35,000',
  },
];
