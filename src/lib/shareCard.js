import { Platform, Share } from 'react-native';

export async function shareListeningCard(track, { sceneTitle } = {}) {
  const title = sceneTitle || track?.title || 'Xoundra';
  const line = sceneTitle
    ? `Listening to “${sceneTitle}” on Xoundra`
    : `Listening to “${title}” on Xoundra`;
  const url = 'https://xoundra.vercel.app';
  const message = `${line}\n${url}`;
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Xoundra', text: line, url });
      return 'shared';
    }
    const result = await Share.share(
      Platform.OS === 'ios' ? { message, url } : { message, title: 'Xoundra' },
    );
    if (result.action === Share.sharedAction) return 'shared';
    return 'dismissed';
  } catch {
    return 'failed';
  }
}
