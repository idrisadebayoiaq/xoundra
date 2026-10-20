import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function SavePlaylistScreen() {
  const { trackId } = useLocalSearchParams();
  const requestedId = Array.isArray(trackId) ? trackId[0] : trackId;
  const { userId, track, tracks } = useApp();
  const chosen = tracks.find((item) => item.id === requestedId) || track;
  const [lists, setLists] = useState([]);
  const [notice, setNotice] = useState('');

  async function load() {
    const { data } = await supabase.from('playlists').select('id, title').eq('user_id', userId).order('created_at', { ascending: false });
    setLists(data || []);
  }

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  async function add(list) {
    if (!chosen) return;
    const { data: rows } = await supabase.from('playlist_tracks').select('position').eq('playlist_id', list.id);
    const position = (rows || []).reduce((max, row) => Math.max(max, row.position), 0) + 1;
    const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: list.id, track_id: chosen.id, position });
    setNotice(error ? 'That sound is already in this playlist.' : `Added to ${list.title}.`);
    if (!error) setTimeout(() => router.back(), 500);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Add to playlist" back />
      <Text style={styles.lead}>{chosen ? chosen.title : 'Choose a sound first.'}</Text>
      <Pressable
        onPress={() => router.push({ pathname: '/new-playlist', params: chosen ? { trackId: chosen.id } : {} })}
        style={styles.newList}
        accessibilityLabel="New playlist"
      >
        <Text style={styles.addText}>New playlist</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {lists.map((list) => (
        <Pressable key={list.id} style={styles.row} onPress={() => add(list)}>
          <Text style={styles.name}>{list.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, marginHorizontal: 20, marginBottom: 14 },
  newList: {
    marginHorizontal: 20,
    marginBottom: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { flex: 1, height: 46, borderRadius: 14, backgroundColor: colors.card, color: colors.text, fontFamily: font.regular, paddingHorizontal: 12 },
  add: { backgroundColor: colors.mint, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  addText: { color: colors.mintInk, fontFamily: font.semibold },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 8 },
  row: { marginHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  name: { color: colors.text, fontFamily: font.medium, fontSize: 16 },
});
