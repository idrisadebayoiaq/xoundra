import { Platform } from 'react-native';

/**
 * Home-screen widget bridge.
 * Expo preview builds do not ship a custom widget extension yet;
 * this module keeps a single lean hook so a native widget / App Shortcut
 * can call into “Tonight” without bloating the JS bundle.
 */
export function widgetSupported() {
  return Platform.OS === 'android';
}

export async function publishWidgetSnapshot({ title, playing }) {
  if (!widgetSupported()) return false;
  try {
    // Reserved for a future expo-widgets / native module. Persist a tiny payload
    // that a widget provider can read via shared preferences once wired.
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('xoundra-widget-snapshot', JSON.stringify({
      title: title || 'Xoundra',
      playing: Boolean(playing),
      at: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
}
