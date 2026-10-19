import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { PillButton, TrackRow } from '../src/components/Cards';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function DownloadsScreen() {
  const { premium, downloads, play, removeDownload } = useApp();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Downloads" back />
      {premium ? (
        downloads.length ? (
          <View style={styles.list}>
            {downloads.map((track) => (
              <View key={track.id}>
                <TrackRow track={track} onPress={() => play(track, downloads)} />
                <Text style={styles.remove} onPress={() => removeDownload(track)}>Remove</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.body}>Nothing is saved on this device yet. Open the three dots on a sound and choose Download. Wi-Fi only waits for Wi-Fi. Wi-Fi and mobile data starts straight away. Saved sounds stay available while Premium is active.</Text>
        )
      ) : (
        <View style={styles.block}>
          <Text style={styles.body}>
            Offline downloads are part of Premium, including sounds that are otherwise free to stream.
          </Text>
          <PillButton filled icon="lock-closed" label="See plans" onPress={() => router.push('/plans')} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28, paddingHorizontal: 20 },
  block: { gap: 16 },
  list: { marginHorizontal: -20 },
  body: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  remove: {
    color: colors.amber,
    fontFamily: font.medium,
    fontSize: 13,
    marginLeft: 78,
    marginBottom: 8,
  },
});
