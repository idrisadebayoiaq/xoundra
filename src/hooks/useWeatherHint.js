import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'xoundra-weather-opt-in';

/** Opt-in coarse weather hint for Home. Never requires precise GPS. */
export function useWeatherHint() {
  const [hint, setHint] = useState(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY).then(async (raw) => {
      if (raw !== '1') return;
      try {
        const hour = new Date().getHours();
        // Lightweight local heuristic when no API key — still useful as a calm prompt.
        const rainyHours = hour >= 16 || hour <= 8;
        if (!alive) return;
        setHint(rainyHours
          ? { label: 'Evening air — try a rain scene', sceneId: 'rainy-evening' }
          : { label: 'Clear focus hours — try Deep Focus', sceneId: 'deep-focus' });
      } catch {
        /* ignore */
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return hint;
}

export async function setWeatherOptIn(on) {
  await AsyncStorage.setItem(KEY, on ? '1' : '0');
}

export async function readWeatherOptIn() {
  return (await AsyncStorage.getItem(KEY)) === '1';
}
