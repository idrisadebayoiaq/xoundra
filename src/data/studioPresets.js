/** Signature Scenes — one-tap Studio mixes from catalogue loop tracks. */
export const studioPresets = [
  {
    id: 'rainy-evening',
    title: 'Rainy Evening',
    blurb: 'Soft rain with a distant storm bed.',
    artwork: 'rain',
    mood: 'sleep',
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
    artwork: 'river',
    mood: 'focus',
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
    artwork: 'forest',
    mood: 'relax',
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
    artwork: 'ocean',
    mood: 'sleep',
    layers: [
      { id: 'cape-surf', volume: 0.8 },
      { id: 'deep-sea', volume: 0.55 },
      { id: 'soft-shore', volume: 0.4 },
    ],
  },
  {
    id: 'storm-room',
    title: 'Storm Room',
    blurb: 'Close thunder and heavy rain for deep cover.',
    artwork: 'storm',
    mood: 'sleep',
    layers: [
      { id: 'distant-rumble', volume: 0.7 },
      { id: 'steady-rain', volume: 0.8 },
      { id: 'long-wind', volume: 0.35 },
    ],
  },
  {
    id: 'garden-morning',
    title: 'Garden Morning',
    blurb: 'Soft garden air and birds to start the day.',
    artwork: 'garden',
    mood: 'focus',
    layers: [
      { id: 'bright-birdsong', volume: 0.55 },
      { id: 'forest-air', volume: 0.45 },
      { id: 'little-stream', volume: 0.4 },
    ],
  },
];

/** @deprecated use studioPresets — alias for scenes */
export const scenes = studioPresets;

export function sceneById(id) {
  return studioPresets.find((item) => item.id === id) || null;
}
