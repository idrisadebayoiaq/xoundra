import { Platform } from 'react-native';

let deferred = null;
let listening = false;

function webWindow() {
  if (Platform.OS !== 'web') return null;
  if (typeof globalThis === 'undefined' || typeof globalThis.window === 'undefined') return null;
  return globalThis.window;
}

function ensureListener() {
  if (listening || Platform.OS !== 'web') return;
  const win = webWindow();
  if (!win || typeof win.addEventListener !== 'function') return;
  listening = true;
  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
  });
}

export async function promptPwaInstall() {
  if (Platform.OS !== 'web') return 'unsupported';
  ensureListener();
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
