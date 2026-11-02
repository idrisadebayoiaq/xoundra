import { Platform } from 'react-native';

let deferred = null;

function webWindow() {
  if (Platform.OS !== 'web') return null;
  if (typeof globalThis === 'undefined' || typeof globalThis.window === 'undefined') return null;
  return globalThis.window;
}

const win = webWindow();
if (win && typeof win.addEventListener === 'function') {
  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
  });
}

export async function promptPwaInstall() {
  if (Platform.OS !== 'web') return 'unsupported';
  const browser = webWindow();
  if (!browser) return 'unsupported';
  if (deferred && typeof deferred.prompt === 'function') {
    deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    deferred = null;
    return choice?.outcome || 'dismissed';
  }
  if (typeof browser.alert === 'function') {
    browser.alert('Use your browser menu: Add to Home Screen / Install app.');
  }
  return 'manual';
}
