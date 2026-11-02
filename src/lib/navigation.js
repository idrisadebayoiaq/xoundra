import { router } from 'expo-router';

export function goBack(options = {}) {
  if (options.from === 'menu') {
    router.replace({ pathname: '/', params: { menu: '1' } });
    return;
  }
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}

export function openFromMenu(href) {
  const path = typeof href === 'string' ? href : href?.pathname || '/';
  const params = typeof href === 'object' && href?.params ? { ...href.params } : {};
  router.push({ pathname: path, params: { ...params, from: 'menu' } });
}
