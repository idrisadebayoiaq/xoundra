import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';
import { useApp } from '../state/AppState';

export function DownloadProgress({ style }) {
  const { downloadProgress } = useApp();
  if (!downloadProgress) return null;
  const amount = Math.max(0, Math.min(1, downloadProgress.percent || 0));
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.title}>{downloadProgress.title}</Text>
      <Text style={styles.body} numberOfLines={2}>{downloadProgress.body}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(amount * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 14,
  },
  body: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2E36',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: colors.mint,
  },
});
