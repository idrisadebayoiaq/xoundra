import { Alert, Platform, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useApp } from '../state/AppState';

export function DownloadMark({ track, size = 16 }) {
  const { isDownloaded, saveDownload, removeDownload } = useApp();
  if (!track?.id) return null;
  const saved = isDownloaded(track.id);

  function press(event) {
    event?.stopPropagation?.();
    if (!saved) {
      saveDownload(track);
      return;
    }
    const title = 'Remove download';
    const message = `Remove ${track.title} from downloads?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) removeDownload(track);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeDownload(track) },
    ]);
  }

  return (
    <Pressable onPress={press} hitSlop={8} accessibilityLabel={saved ? 'Remove download' : 'Download'} style={styles.hit}>
      <Ionicons name={saved ? 'download' : 'download-outline'} size={size} color={saved ? '#4C9AFF' : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { padding: 4 },
});
