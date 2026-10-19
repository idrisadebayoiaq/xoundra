import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { PillButton, TrackRow } from '../src/components/Cards';
import { tracksForMood } from '../src/data/catalogue';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function BrowseScreen() {
  const { mood } = useLocalSearchParams();
  const name = Array.isArray(mood) ? mood[0] : mood || 'Sounds';
  const { play, tracks } = useApp();
  const list = tracksForMood(name, tracks);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title={name} back />
      <Text style={styles.count}>{list.length} sounds</Text>
      {list.length > 0 ? (
        <View style={styles.pills}>
          <PillButton filled icon="play" label="Play" onPress={() => play(list[0], list)} />
          <PillButton icon="shuffle" label="Shuffle" onPress={() => play(list[list.length - 1], [...list].reverse())} />
        </View>
      ) : (
        <Text style={styles.empty}>Nothing is on this shelf yet.</Text>
      )}
      <View style={styles.list}>
        {list.map((track) => (
          <TrackRow key={track.id} track={track} subtitle={track.durationLabel} onPress={() => play(track, list)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  count: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    marginHorizontal: 20,
    marginTop: -8,
    marginBottom: 14,
  },
  pills: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  list: { paddingHorizontal: 20 },
  empty: {
    color: colors.muted,
    fontFamily: font.regular,
    marginHorizontal: 20,
  },
});
