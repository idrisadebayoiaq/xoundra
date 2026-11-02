import { useEffect, useState, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TrackRow } from '../../src/components/Cards';
import { moods, searchTracks } from '../../src/data/catalogue';
import { coverSource } from '../../src/data/artwork';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';
import { supabase } from '../../src/lib/supabase';
import { PlaylistCover } from '../../src/components/PlaylistCover';
import { useShell } from '../../src/state/ShellState';

export default function ExploreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [localQuery, setLocalQuery] = useState('');
  const { desktop, search, setSearch } = useShell();
  const query = desktop ? search : localQuery;
  const setQuery = desktop ? setSearch : setLocalQuery;
  const { play, tracks, categories } = useApp();
  const [publicLists, setPublicLists] = useState([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const shelf = categories.length ? categories : moods;
  const filteredTracks = freeOnly ? tracks.filter((item) => item.access !== 'premium') : tracks;
  const results = searchTracks(query, filteredTracks);
  const featured = shelf.slice(0, 4);
  const more = shelf.slice(4);
  const foundLists = publicLists.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    supabase.from('playlists').select('id, title, playlist_tracks(track_id, position)').eq('is_public', true).order('updated_at', { ascending: false }).limit(12).then(({ data }) => {
      setPublicLists((data || []).map((item) => {
        const ordered = [...(item.playlist_tracks || [])].sort((a, b) => a.position - b.position);
        return {
          id: item.id,
          title: item.title,
          count: ordered.length,
          sounds: ordered.map((row) => tracks.find((sound) => sound.id === row.track_id)).filter(Boolean),
        };
      }));
    });
  }, [tracks]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Explore" />
      {desktop ? null : <View style={styles.search}>
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
      </View>}
      <Pressable
        onPress={() => setFreeOnly((value) => !value)}
        style={[styles.filter, freeOnly && styles.filterOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: freeOnly }}
        accessibilityLabel="Show free sounds only"
      >
        <Ionicons name={freeOnly ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={freeOnly ? colors.mint : colors.muted} />
        <Text style={[styles.filterText, freeOnly && styles.filterTextOn]}>Free only</Text>
      </Pressable>
      {query.trim() ? (
        <View style={styles.list}>
          {foundLists.map((item) => (
            <PlaylistResult key={item.id} item={item} />
          ))}
          {results.length === 0 && foundLists.length === 0 ? (
            <Text style={styles.empty}>No sounds match that search.</Text>
          ) : (
            results.map((track) => (
              <TrackRow key={track.id} track={track} onPress={() => play(track, results)} />
            ))
          )}
        </View>
      ) : (
        <>
          {publicLists.length ? (
            <>
              <Text style={styles.section}>Public playlists</Text>
              <View style={styles.list}>
                {publicLists.map((item) => (
                  <PlaylistResult key={item.id} item={item} />
                ))}
              </View>
            </>
          ) : null}
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

function PlaylistResult({ item }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.moreRow} onPress={() => router.push({ pathname: '/playlist', params: { id: item.id } })} accessibilityLabel={item.title}>
      <PlaylistCover tracks={item.sounds} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={styles.moreTitle}>{item.title}</Text>
        <Text style={styles.empty}>{item.count === 1 ? 'Public · 1 sound' : `Public · ${item.count} sounds`}</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  search: {
    marginHorizontal: 20,
    marginBottom: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  filter: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  filterOn: { borderColor: colors.mint },
  filterText: { color: colors.muted, fontFamily: font.medium, fontSize: 13 },
  filterTextOn: { color: colors.mint },
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
}
