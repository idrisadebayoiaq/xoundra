function byCategory(tracks) {
  const groups = new Map();
  for (const track of tracks) {
    const key = track.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(track);
  }
  return groups;
}

function mixCategories(tracks, offset, limit = 12) {
  const groups = byCategory(tracks);
  const keys = [...groups.keys()];
  const picked = [];
  let row = 0;
  while (picked.length < limit) {
    let added = false;
    for (const key of keys) {
      const item = groups.get(key)[row + offset];
      if (!item) continue;
      picked.push(item);
      added = true;
      if (picked.length >= limit) break;
    }
    if (!added) break;
    row += 1;
  }
  return picked;
}

export function continuePlaying(history, current) {
  const picked = [];
  if (current) picked.push(current);
  for (const track of history || []) {
    if (!picked.some((item) => item.id === track.id)) picked.push(track);
  }
  return picked.slice(0, 12);
}

const helpTags = {
  sleep: ['sleep'],
  focus: ['focus'],
  relax: ['relax', 'ambient'],
  meditate: ['meditate', 'meditation'],
};

function tasteScore(track, weights, signals) {
  let score = 0;
  const category = String(track.category || '').toLowerCase();
  score += weights[category] || 0;
  for (const tag of track.tags || []) score += weights[tag] || 0;
  for (const signal of signals || []) {
    if (signal.track_id !== track.id) continue;
    const tags = helpTags[signal.helped] || [];
    if (tags.some((tag) => weights[tag] || category === tag)) score += (signal.total || 1) * 2;
  }
  return score;
}

export function recommended(tracks, history, helped, signals, picks) {
  const played = history || [];
  const chosen = (picks || []).map((id) => tracks.find((item) => item.id === id)).filter(Boolean);
  if (played.length < 6) {
    const rest = mixCategories(tracks.filter((item) => !chosen.some((pick) => pick.id === item.id)), 1, 12);
    return [...chosen, ...rest.filter((item) => !chosen.some((pick) => pick.id === item.id))].slice(0, 12);
  }
  const weights = {};
  for (const track of played) {
    const category = String(track.category || '').toLowerCase();
    weights[category] = (weights[category] || 0) + 2;
    for (const tag of track.tags || []) weights[tag] = (weights[tag] || 0) + 1;
  }
  for (const value of helped || []) {
    weights[value] = (weights[value] || 0) + 3;
    for (const tag of helpTags[value] || []) weights[tag] = (weights[tag] || 0) + 2;
  }
  for (const pick of chosen) {
    const category = String(pick.category || '').toLowerCase();
    weights[category] = (weights[category] || 0) + 4;
    for (const tag of pick.tags || []) weights[tag] = (weights[tag] || 0) + 2;
  }
  const recent = new Set(played.slice(0, 4).map((track) => track.id));
  const ranked = [...tracks].sort((a, b) => tasteScore(b, weights, signals) - tasteScore(a, weights, signals));
  const fresh = ranked.filter((track) => !recent.has(track.id));
  return (fresh.length >= 6 ? fresh : ranked).slice(0, 12);
}

export function trending(tracks) {
  return [...tracks].sort((a, b) => {
    const plays = (b.plays || 0) - (a.plays || 0);
    if (plays) return plays;
    const likes = (b.likes || 0) - (a.likes || 0);
    if (likes) return likes;
    return (b.favorites || 0) - (a.favorites || 0);
  }).slice(0, 12);
}

export function forYou(tracks) {
  return mixCategories(tracks, 0);
}

export function statLine(track) {
  const plays = Number(track?.plays) || 0;
  const likes = Number(track?.likes) || 0;
  const favorites = Number(track?.favorites) || 0;
  return `${plays} ${plays === 1 ? 'play' : 'plays'} · ${likes} ${likes === 1 ? 'like' : 'likes'} · ${favorites} ${favorites === 1 ? 'favorite' : 'favorites'}`;
}
