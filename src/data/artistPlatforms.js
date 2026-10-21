export const artistPlatforms = [
  { id: 'instagram', label: 'Instagram', hosts: ['instagram.com'], icon: { set: 'ion', name: 'logo-instagram' } },
  { id: 'x', label: 'X', hosts: ['x.com', 'twitter.com'], icon: { set: 'ion', name: 'logo-x' } },
  { id: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'], icon: { set: 'ion', name: 'logo-tiktok' } },
  { id: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be', 'music.youtube.com'], icon: { set: 'ion', name: 'logo-youtube' } },
  { id: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.watch'], icon: { set: 'ion', name: 'logo-facebook' } },
  { id: 'spotify', label: 'Spotify', hosts: ['open.spotify.com', 'spotify.com', 'spotify.link'], icon: { set: 'fa5', name: 'spotify' } },
  { id: 'apple', label: 'Apple Music', hosts: ['music.apple.com'], icon: { set: 'fontisto', name: 'applemusic' } },
  { id: 'soundcloud', label: 'SoundCloud', hosts: ['soundcloud.com', 'on.soundcloud.com'], icon: { set: 'fa5', name: 'soundcloud' } },
  { id: 'bandcamp', label: 'Bandcamp', hosts: ['bandcamp.com'], icon: { set: 'fa5', name: 'bandcamp' } },
  { id: 'audiomack', label: 'Audiomack', hosts: ['audiomack.com'], icon: { set: 'mark', name: 'A' } },
];

export function platformById(id) {
  return artistPlatforms.find((item) => item.id === id) || null;
}

function hostMatches(hostname, hosts) {
  const host = String(hostname || '').replace(/^www\./, '').toLowerCase();
  return hosts.some((item) => host === item || host.endsWith(`.${item}`));
}

export function normalizePlatformLink(platformId, value) {
  const platform = platformById(platformId);
  const text = String(value || '').trim();
  if (!platform || !text) return '';
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    if (url.username || url.password) return '';
    if (!hostMatches(url.hostname, platform.hosts)) return '';
    url.protocol = 'https:';
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return '';
  }
}

export function cleanArtistLinks(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const links = [];
  value.forEach((item) => {
    const platform = item?.platform;
    const url = normalizePlatformLink(platform, item?.url);
    if (!url || seen.has(platform) || links.length >= artistPlatforms.length) return;
    seen.add(platform);
    links.push({ platform, url });
  });
  return links;
}
