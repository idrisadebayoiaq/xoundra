import React from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyPalette, darkColors, lightColors, paletteFor } from '../theme';

const ThemeContext = React.createContext(null);
const STORAGE_KEY = 'xoundra-appearance';

function resolveScheme(preference, system) {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'light' ? 'light' : 'dark';
}

function paintWeb(colors) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.style.backgroundColor = colors.canvas;
  document.documentElement.style.colorScheme = colors.scheme;
  document.body.style.backgroundColor = colors.canvas;
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = React.useState('system');
  const [system, setSystem] = React.useState(() => Appearance.getColorScheme() || 'dark');
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!alive) return;
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme || 'dark');
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const scheme = resolveScheme(preference, system);
  const colors = React.useMemo(() => paletteFor(scheme), [scheme]);

  React.useEffect(() => {
    applyPalette(scheme);
    paintWeb(colors);
  }, [scheme, colors]);

  const setPreference = React.useCallback((value) => {
    const next = value === 'light' || value === 'dark' ? value : 'system';
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = React.useMemo(
    () => ({
      ready,
      preference,
      scheme,
      colors,
      isDark: scheme === 'dark',
      isLight: scheme === 'light',
      setPreference,
      setLight: () => setPreference('light'),
      setDark: () => setPreference('dark'),
      setSystem: () => setPreference('system'),
      darkColors,
      lightColors,
    }),
    [ready, preference, scheme, colors, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = React.useContext(ThemeContext);
  if (!value) {
    return {
      ready: true,
      preference: 'dark',
      scheme: 'dark',
      colors: darkColors,
      isDark: true,
      isLight: false,
      setPreference: () => {},
      setLight: () => {},
      setDark: () => {},
      setSystem: () => {},
      darkColors,
      lightColors,
    };
  }
  return value;
}
