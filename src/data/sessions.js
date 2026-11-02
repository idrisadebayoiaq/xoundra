/** Hand-authored listening sessions (chapters = track ids in order). */
export const listeningSessions = [
  {
    id: 'wind-down-40',
    title: 'Wind down',
    blurb: 'Forty quiet minutes into sleep.',
    artwork: 'night',
    minutes: 40,
    chapters: ['steady-rain', 'deep-sea', 'soft-shore', 'all-night-rain'],
  },
  {
    id: 'focus-sprint-25',
    title: 'Focus sprint',
    blurb: 'Twenty-five minutes of steady water and air.',
    artwork: 'river',
    minutes: 25,
    chapters: ['river-rapids', 'little-stream', 'forest-air', 'long-wind'],
  },
];

export function sessionById(id) {
  return listeningSessions.find((item) => item.id === id) || null;
}
