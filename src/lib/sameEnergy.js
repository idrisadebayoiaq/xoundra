/** Pick similar catalogue tracks for continuous / same-energy play. */
export function similarTracks(seed, list = [], limit = 12) {
  if (!seed || !list.length) return [];
  const category = (seed.category || '').toLowerCase();
  const mood = (seed.mood || seed.intention || '').toLowerCase();
  const scored = list
    .filter((item) => item.id !== seed.id)
    .map((item) => {
      let score = 0;
      if (category && (item.category || '').toLowerCase() === category) score += 3;
      if (mood && `${item.category} ${item.title}`.toLowerCase().includes(mood)) score += 2;
      if (seed.artwork && item.artwork === seed.artwork) score += 1;
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || (b.item.playCount || 0) - (a.item.playCount || 0));
  const picked = scored.slice(0, limit).map((row) => row.item);
  if (picked.length >= 3) return picked;
  return list.filter((item) => item.id !== seed.id).slice(0, limit);
}

export function soundDna(history = [], tracks = [], limit = 8) {
  const counts = new Map();
  history.forEach((entry) => {
    const id = entry?.id || entry?.trackId;
    if (!id) return;
    counts.set(id, (counts.get(id) || 0) + (entry.plays || 1));
  });
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => tracks.find((track) => track.id === id))
    .filter(Boolean);
  if (ranked.length) return ranked.slice(0, limit);
  const byCategory = {};
  tracks.forEach((track) => {
    const key = track.category || 'Other';
    if (!byCategory[key]) byCategory[key] = track;
  });
  return Object.values(byCategory).slice(0, limit);
}
