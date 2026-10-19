export function sortTracks(list, mode) {
  const items = [...list];
  if (mode === 'name') items.sort((a, b) => a.title.localeCompare(b.title));
  if (mode === 'name-desc') items.sort((a, b) => b.title.localeCompare(a.title));
  if (mode === 'short') items.sort((a, b) => (a.duration || 0) - (b.duration || 0));
  if (mode === 'long') items.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  if (mode === 'played') items.sort((a, b) => (b.plays || 0) - (a.plays || 0));
  if (mode === 'added') items.sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
  return items;
}

export function shuffleTracks(list) {
  const items = [...list];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    items[index] = items[swap];
    items[swap] = current;
  }
  return items;
}

export const sortOptions = [
  { value: 'added', label: 'Recently added' },
  { value: 'name', label: 'Name, A to Z' },
  { value: 'name-desc', label: 'Name, Z to A' },
  { value: 'short', label: 'Shortest' },
  { value: 'long', label: 'Longest' },
  { value: 'played', label: 'Most played' },
];
