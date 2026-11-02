let deferred = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
  });
}

export async function promptPwaInstall() {
  if (typeof window === 'undefined') return 'unsupported';
  if (deferred) {
    deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    deferred = null;
    return choice?.outcome || 'dismissed';
  }
  // Fallback copy for browsers without beforeinstallprompt.
  if (typeof window.alert === 'function') {
    window.alert('Use your browser menu: Add to Home Screen / Install app.');
  }
  return 'manual';
}
