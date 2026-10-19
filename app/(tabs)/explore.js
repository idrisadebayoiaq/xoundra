import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TrackRow } from '../../src/components/Cards';
import { moods, searchTracks } from '../../src/data/catalogue';
import { coverSource } from '../../src/data/artwork';
import { colors, font } from '../../src/theme';
import { useApp } from '../../src/state/AppState';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const { play, tracks, categories } = useApp();
  const shelf = categories.length ? categories : moods;
  const results = searchTracks(query, tracks);
  const featured = shelf.slice(0, 4);
  const more = shelf.slice(4);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Explore" />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sounds"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      {query.trim() ? (
        <View style={styles.list}>
          {results.length === 0 ? (
            <Text style={styles.empty}>No sounds match that search.</Text>
          ) : (
            results.map((track) => (
              <TrackRow key={track.id} track={track} onPress={() => play(track, results)} />
            ))
          )}
        </View>
      ) : (
        <>
          <Text style={styles.section}>Moods</Text>
          <View style={styles.grid}>
            {featured.map((mood) => (
              <Pressable
                key={mood.id}
                style={styles.mood}
                onPress={() => router.push({ pathname: '/browse', params: { mood: mood.id } })}
              >
                <Image source={coverSource(mood.artwork)} style={StyleSheet.absoluteFill} />
                <View style={styles.scrim} />
                <Text style={styles.moodTitle}>{mood.title}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.section}>More</Text>
          <View style={styles.list}>
            {more.map((mood) => (
              <Pressable
                key={mood.id}
                style={styles.moreRow}
                onPress={() => router.push({ pathname: '/browse', params: { mood: mood.id } })}
              >
                <Image source={coverSource(mood.artwork)} style={styles.moreArt} />
                <Text style={styles.moreTitle}>{mood.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  search: {
    marginHorizontal: 20,
    marginBottom: 18,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
  },
  section: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 20,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  grid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 22,
  },
  mood: {
    width: '48.5%',
    aspectRatio: 1.05,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: colors.card,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,8,13,0.25)',
  },
  moodTitle: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 18,
  },
  list: {
    paddingHorizontal: 20,
    gap: 4,
  },
  empty: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    marginTop: 12,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  moreArt: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  moreTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 16,
  },
});
