import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { TrackRow } from '../src/components/Cards';
import { coverSource } from '../src/data/artwork';
import { loadArtistWorks } from '../src/lib/artistMedia';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function ArtistSoundsScreen() {
  const app = useApp();
  const [albums, setAlbums] = useState([]);
  const [singles, setSingles] = useState([]);

  const load = useCallback(async () => {
    if (!app.userId) return;
    const works = await loadArtistWorks(app.userId);
    setAlbums(works.albums);
    setSingles(works.singles);
  }, [app.userId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  if (!app.ready) return <View style={styles.screen} />;
  if (!app.isArtist) return <Redirect href="/artist" />;

  function playSound(sound, list) {
    const queue = list.map((item) => playable(item, app)).filter(Boolean);
    const track = playable(sound, app);
    if (track) app.play(track, queue.length ? queue : [track], { collection: true, ordered: Boolean(sound.albumId) });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="My sounds" back />
      <Text style={styles.section}>Albums</Text>
      {albums.length === 0 ? <Text style={styles.empty}>No albums yet.</Text> : albums.map((album) => (
        <Pressable key={album.id} style={styles.album} onPress={() => router.push({ pathname: '/album', params: { id: album.id } })} accessibilityLabel={album.title}>
          <Image source={coverSource(album.artwork_path)} style={styles.cover} />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>{album.title}</Text>
            <Text style={styles.meta}>{album.sounds.length === 1 ? '1 sound' : `${album.sounds.length} sounds`}</Text>
          </View>
        </Pressable>
      ))}
      <Text style={styles.section}>Singles</Text>
      {singles.length === 0 ? <Text style={styles.empty}>No singles yet.</Text> : singles.map((sound) => (
        <TrackRow
          key={sound.id}
          track={playable(sound, app)}
          subtitle={sound.category}
          onPress={() => playSound(sound, singles)}
        />
      ))}
    </ScrollView>
  );
}

function playable(sound, app) {
  return app.tracks.find((item) => item.id === sound.id) || {
    ...sound,
    artistId: app.userId,
    artistName: app.artistName,
    access: 'free',
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40, paddingHorizontal: 12 },
  section: { color: colors.text, fontFamily: font.bold, fontSize: 18, marginHorizontal: 8, marginTop: 8, marginBottom: 8 },
  empty: { color: colors.muted, fontFamily: font.regular, fontSize: 14, marginHorizontal: 8, marginBottom: 12 },
  album: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 8 },
  cover: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.card },
  copy: { flex: 1 },
  title: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 3 },
});
