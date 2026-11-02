/** Starter Studio mixes built from loop_ok catalogue tracks. */
export const studioPresets = [
  {
    id: 'rainy-evening',
    title: 'Rainy Evening',
    blurb: 'Soft rain with a distant storm bed.',
    layers: [
      { id: 'steady-rain', volume: 0.85 },
      { id: 'distant-rumble', volume: 0.45 },
      { id: 'all-night-rain', volume: 0.35 },
    ],
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus',
    blurb: 'Steady water and low wind for deep work.',
    layers: [
      { id: 'river-rapids', volume: 0.7 },
      { id: 'long-wind', volume: 0.4 },
      { id: 'little-stream', volume: 0.55 },
    ],
  },
  {
    id: 'forest-calm',
    title: 'Forest Calm',
    blurb: 'Dawn air and birds for an easy reset.',
    layers: [
      { id: 'forest-air', volume: 0.75 },
      { id: 'west-african-dawn', volume: 0.5 },
      { id: 'bright-birdsong', volume: 0.35 },
    ],
  },
  {
    id: 'night-ocean',
    title: 'Night Ocean',
    blurb: 'Surf and deep water for late hours.',
    layers: [
      { id: 'cape-surf', volume: 0.8 },
      { id: 'deep-sea', volume: 0.55 },
      { id: 'soft-shore', volume: 0.4 },
    ],
  },
];
