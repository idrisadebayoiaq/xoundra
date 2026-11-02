export const font = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
};

export const darkColors = {
  scheme: 'dark',
  bg: '#07080D',
  canvas: '#000000',
  card: '#14171E',
  cardRaised: '#1C2028',
  text: '#F3F6F8',
  muted: '#8E98A3',
  mint: '#8BE1CF',
  mintInk: '#10211C',
  lavender: '#B8A9F5',
  amber: '#F2C879',
  line: 'rgba(243,246,248,0.10)',
  scrim: 'rgba(7,8,13,0.55)',
  overlay: 'rgba(7,8,13,0.72)',
  switchOff: '#2A2E36',
  danger: '#F07178',
  statusBar: 'light',
};

export const lightColors = {
  scheme: 'light',
  bg: '#F4F6F8',
  canvas: '#E8ECF0',
  card: '#FFFFFF',
  cardRaised: '#FFFFFF',
  text: '#12161C',
  muted: '#5C6672',
  mint: '#1F9B84',
  mintInk: '#FFFFFF',
  lavender: '#6B5CC4',
  amber: '#A86B12',
  line: 'rgba(18,22,28,0.10)',
  scrim: 'rgba(18,22,28,0.35)',
  overlay: 'rgba(18,22,28,0.62)',
  switchOff: '#C9D0D8',
  danger: '#C43B44',
  statusBar: 'dark',
};

/** @deprecated Prefer useTheme().colors — kept for gradual migration. */
export let colors = { ...darkColors };

export function paletteFor(scheme) {
  return scheme === 'light' ? lightColors : darkColors;
}

export function applyPalette(scheme) {
  const next = paletteFor(scheme);
  Object.keys(colors).forEach((key) => {
    delete colors[key];
  });
  Object.assign(colors, next);
  return colors;
}
