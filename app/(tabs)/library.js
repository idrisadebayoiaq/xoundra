import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { PillButton, TrackRow } from '../../src/components/Cards';
import { colors, font } from '../../src/theme';
import { useApp } from '../../src/state/AppState';
import { supabase } from '../../src/lib/supabase';
import { Dropdown } from '../../src/components/Dropdown';
import { shuffleTracks, sortOptions, sortTracks } from '../../src/data/order';

const tabs = [
  ['liked', 'Liked'],
  ['favorites', 'Favorites'],
  ['playlists', 'Playlists'],
  ['mixes', 'Mixes'],
  ['history', 'History'],
];

export default function LibraryScreen() {
  const [tab, setTab] = useState('liked');
  const { favourites, likes, history, play, tracks, userId, openMix } = useApp();
  const [playlists, setPlaylists] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [sortMode, setSortMode] = useState('added');

  const refresh = useCallback(() => {
    if (!userId) return;
    supabase.from('playlists').select('id, title, playlist_tracks(track_id)').eq('user_id', userId).order('created_at', { ascending: false }).then(({ data }) => {
      setPlaylists((data || []).map((item) => ({
        id: item.id,
        title: item.title,
        count: (item.playlist_tracks || []).length,
      })));
    });
    supabase
      .from('soundscapes')
      .select('id, title, soundscape_layers(track_id, gain, muted, layer_order)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMixes(data || []));
  }, [userId]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  async function createPlaylist() {
    const name = title.trim();
    if (!name || !userId) return;
    const { error } = await supabase.from('playlists').insert({ user_id: userId, title: name });
    if (error) {
      setNotice('That playlist could not be created.');
      return;
    }
    setTitle('');
    setNotice(`Created ${name}.`);
    refresh();
  }

  const source = tab === 'liked' ? likes : tab === 'favorites' ? favourites : history;
  const list = tab === 'history' ? source : sortTracks(source, sortMode);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Library" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
        {tabs.map(([key, label]) => (
          <TabButton key={key} label={label} active={tab === key} onPress={() => setTab(key)} />
        ))}
      </ScrollView>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {tab === 'playlists' ? (
        <View style={styles.list}>
          <Text style={styles.playlistHint}>Make as many playlists as you want.</Text>
          <View style={styles.create}>
            <TextInput value={title} onChangeText={setTitle} placeholder="New playlist" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="New playlist" />
            <Pressable onPress={createPlaylist} style={styles.add} accessibilityLabel="Create playlist"><Text style={styles.addText}>Create</Text></Pressable>
          </View>
          {playlists.length === 0 ? (
            <Text style={styles.empty}>Create a playlist, then add sounds with the plus button.</Text>
          ) : (
            playlists.map((item) => (
              <Pressable key={item.id} onPress={() => router.push({ pathname: '/playlist', params: { id: item.id } })} style={styles.playlist} accessibilityLabel={item.title}>
                <View style={styles.playlistCopy}>
                  <Text style={styles.playlistTitle}>{item.title}</Text>
                  <Text style={styles.playlistMeta}>{item.count === 1 ? '1 sound' : `${item.count} sounds`}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
      {tab === 'mixes' ? (
        <View style={styles.list}>
          {mixes.length === 0 ? (
            <Text style={styles.empty}>Mixes you save in Studio stay on your account and show up here.</Text>
          ) : (
            mixes.map((item) => {
              const layers = [...(item.soundscape_layers || [])].sort((a, b) => a.layer_order - b.layer_order);
              return (
                <Pressable key={item.id} style={styles.playlist} onPress={() => openMix(layers, true)}>
                  <View style={styles.playlistCopy}>
                    <Text style={styles.playlistTitle}>{item.title}</Text>
                    <Text style={styles.playlistMeta}>{layers.length} sounds playing together</Text>
                  </View>
                  <Ionicons name="play" size={18} color={colors.mint} />
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
      {tab === 'liked' || tab === 'favorites' || tab === 'history' ? (
        list.length === 0 ? (
          <Text style={styles.empty}>
            {tab === 'liked'
              ? 'Tap the heart on a sound. Liked sounds stay in this library.'
              : tab === 'favorites'
                ? 'Add a sound to favorite from its menu. Favorites stay in this library.'
                : 'Sounds you play will show up here.'}
          </Text>
        ) : (
          <View style={styles.list}>
            {tab === 'liked' || tab === 'favorites' ? (
              <View style={styles.tools}>
                <Dropdown label="Sort by" value={sortMode} options={sortOptions} onChange={setSortMode} />
                <View style={styles.pills}>
                  <PillButton filled icon="play" label="Play" onPress={() => play(list[0], list, { collection: true })} />
                  <PillButton icon="shuffle" label="Shuffle" onPress={() => {
                    const mixed = shuffleTracks(list);
                    play(mixed[0], mixed, { collection: true });
                  }} />
                </View>
              </View>
            ) : null}
            {list.map((track) => (
              <TrackRow key={track.id} track={track} onPress={() => play(track, list, tab === 'history' ? undefined : { collection: true })} />
            ))}
          </View>
        )
      ) : null}
    </ScrollView>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  switcher: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.mint },
  tabLabel: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
  tabLabelActive: { color: colors.mintInk },
  list: { paddingHorizontal: 20 },
  tools: { gap: 12, marginBottom: 8 },
  pills: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  empty: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    marginHorizontal: 20,
    marginTop: 12,
  },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 8 },
  playlistHint: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginBottom: 10 },
  create: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    paddingHorizontal: 12,
  },
  add: { backgroundColor: colors.mint, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  addText: { color: colors.mintInk, fontFamily: font.semibold },
  playlist: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playlistCopy: { flex: 1 },
  playlistTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  playlistMeta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 2 },
});
