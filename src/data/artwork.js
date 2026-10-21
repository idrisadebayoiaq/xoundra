export const artwork = {
  rain: require('../../catalog/artwork/rain.jpg'),
  storm: require('../../catalog/artwork/storm.jpg'),
  ocean: require('../../catalog/artwork/ocean.jpg'),
  underwater: require('../../catalog/artwork/underwater.jpg'),
  forest: require('../../catalog/artwork/forest.jpg'),
  night: require('../../catalog/artwork/night.jpg'),
  river: require('../../catalog/artwork/river.jpg'),
  wind: require('../../catalog/artwork/wind.jpg'),
  birds: require('../../catalog/artwork/birds.jpg'),
  garden: require('../../catalog/artwork/garden.jpg'),
};

export function coverSource(name) {
  if (!name) return artwork.rain;
  const value = String(name);
  if (/^https?:/i.test(value)) return { uri: value };
  if (value.includes('/')) {
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const path = value.replace(/^\/+/, '');
    return base ? { uri: `${base}/storage/v1/object/public/artwork/${path}` } : artwork.rain;
  }
  const key = value.replace(/\.(jpe?g|png|webp)$/i, '');
  return artwork[key] || artwork.rain;
}
