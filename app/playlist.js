import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/navigation';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { PillButton, TrackRow } from '../src/components/Cards';
import { supabase } from '../src/lib/supabase';
import { Dropdown } from '../src/components/Dropdown';
import { shuffleTracks, sortOptions, sortTracks } from '../src/data/order';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const playlistId = Array.isArray(id) ? id[0] : id;
  const { tracks, play } = useApp();
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState('');
  const [sortMode, setSortMode] = useState('saved');

  const load = useCallback(async () => {
    if (!playlistId) return;
    const [{ data: playlist }, { data: items }] = await Promise.all([
      supabase.from('playlists').select('id, title').eq('id', playlistId).maybeSingle(),
      supabase.from('playlist_tracks').select('track_id, position').eq('playlist_id', playlistId).order('position'),
    ]);
    setTitle(playlist?.title || 'Playlist');
    setDraft(playlist?.title || '');
    setRows(items || []);
  }, [playlistId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const queued = rows.map((row) => tracks.find((track) => track.id === row.track_id)).filter(Boolean);
  const ordered = sortMode === 'saved' ? queued : sortTracks(queued, sortMode);

  async function rename() {
    const next = draft.trim();
    if (!next || next === title) return;
    const { error } = await supabase.from('playlists').update({ title: next }).eq('id', playlistId);
    if (error) {
      setNotice('The name could not be changed.');
      return;
    }
    setTitle(next);
    setNotice('Name updated.');
  }

  async function applySort(mode) {
    setSortMode(mode);
    if (mode === 'saved') {
      load();
      return;
    }
    const next = sortTracks(queued, mode);
    setRows(next.map((track, index) => ({ track_id: track.id, position: index })));
    await Promise.all(next.map((track, index) => (
      supabase.from('playlist_tracks').update({ position: index }).eq('playlist_id', playlistId).eq('track_id', track.id)
    )));
  }

  async function removeTrack(trackId) {
    await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId).eq('track_id', trackId);
    setRows((items) => items.filter((row) => row.track_id !== trackId));
  }

  async function removePlaylist() {
    await supabase.from('playlists').delete().eq('id', playlistId);
    goBack();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title={title} back />
      <Text style={styles.count}>{queued.length} sounds</Text>
      <View style={styles.rename}>
        <TextInput value={draft} onChangeText={setDraft} style={styles.input} placeholder="Playlist name" placeholderTextColor={colors.muted} />
        <Pressable onPress={rename} style={styles.save}><Text style={styles.saveText}>Rename</Text></Pressable>
      </View>
      {ordered.length ? (
        <View style={styles.tools}>
          <Dropdown
            label="Sort by"
            value={sortMode}
            options={[{ value: 'saved', label: 'Saved order' }, ...sortOptions.filter((item) => item.value !== 'added')]}
            onChange={applySort}
          />
          <View style={styles.pills}>
            <PillButton filled icon="play" label="Play" onPress={() => play(ordered[0], ordered, { collection: true })} />
            <PillButton icon="shuffle" label="Shuffle" onPress={() => {
              const mixed = shuffleTracks(ordered);
              play(mixed[0], mixed, { collection: true });
            }} />
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>Add sounds with the plus button on any sound.</Text>
      )}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.list}>
        {ordered.map((track) => (
          <View key={track.id} style={styles.item}>
            <View style={styles.row}>
              <TrackRow track={track} onPress={() => play(track, ordered, { collection: true })} />
            </View>
            <Pressable onPress={() => removeTrack(track.id)} hitSlop={8} accessibilityLabel="Remove from playlist">
              <Ionicons name="remove-circle-outline" size={22} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable onPress={removePlaylist} style={styles.delete}>
        <Text style={styles.deleteText}>Delete playlist</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  count: { color: colors.muted, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 12 },
  tools: { marginHorizontal: 20, gap: 12, marginBottom: 8 },
  rename: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 14 },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    paddingHorizontal: 12,
  },
  save: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  saveText: { color: colors.mint, fontFamily: font.semibold },
  pills: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  empty: { color: colors.muted, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 12 },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 20 },
  item: { flexDirection: 'row', alignItems: 'center' },
  row: { flex: 1 },
  delete: { marginTop: 24, alignItems: 'center' },
  deleteText: { color: colors.amber, fontFamily: font.medium, fontSize: 15 },
});
