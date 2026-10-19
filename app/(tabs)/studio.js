import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { LevelBar } from '../../src/components/LevelBar';
import { PillButton } from '../../src/components/Cards';
import { SoundMenuButton } from '../../src/components/SoundMenu';
import { coverSource } from '../../src/data/artwork';
import { supabase } from '../../src/lib/supabase';
import { colors, font } from '../../src/theme';
import { useApp } from '../../src/state/AppState';

export default function StudioScreen() {
  const {
    mixTracks,
    setLayerVolume,
    addLayer,
    removeLayer,
    toggleLayerMute,
    playMix,
    mixPlaying,
    openMix,
    premium,
    userId,
  } = useApp();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState([]);
  const [notice, setNotice] = useState('');
  const { tracks } = useApp();
  const chosen = new Set(mixTracks.map((layer) => layer.id));
  const results = tracks.filter((track) => {
    const said = query.trim().toLowerCase();
    if (!said) return true;
    return `${track.title} ${track.category}`.toLowerCase().includes(said);
  });

  const refreshSaved = useCallback(() => {
    if (!userId) {
      setSaved([]);
      return;
    }
    supabase
      .from('soundscapes')
      .select('id, title, soundscape_layers(track_id, gain, muted, layer_order)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSaved(data || []));
  }, [userId]);

  useFocusEffect(useCallback(() => {
    refreshSaved();
  }, [refreshSaved]));

  async function saveMix() {
    const title = name.trim();
    if (!userId) {
      setNotice('Sign in to save a mix.');
      return;
    }
    if (!premium) {
      setNotice('Saving a mix is part of Premium.');
      return;
    }
    if (!title || !mixTracks.length) {
      setNotice('Name the mix and add at least one sound.');
      return;
    }
    const { data, error } = await supabase.from('soundscapes').insert({ user_id: userId, title }).select('id').single();
    if (error || !data) {
      setNotice('The mix could not be saved.');
      return;
    }
    const layers = mixTracks.map((layer, index) => ({
      soundscape_id: data.id,
      track_id: layer.id,
      layer_order: index,
      gain: Number(layer.volume.toFixed(3)),
      muted: Boolean(layer.muted),
      loop_ok: true,
    }));
    const savedLayers = await supabase.from('soundscape_layers').insert(layers);
    if (savedLayers.error) {
      await supabase.from('soundscapes').delete().eq('id', data.id);
      setNotice('The mix could not be saved.');
      return;
    }
    setName('');
    setNotice('Saved on your account. Find it here and in Library, under Mixes.');
    refreshSaved();
  }

  async function removeSaved(item) {
    await supabase.from('soundscapes').delete().eq('id', item.id);
    setSaved((items) => items.filter((row) => row.id !== item.id));
  }

  function layersOf(item) {
    return [...(item.soundscape_layers || [])].sort((a, b) => a.layer_order - b.layer_order);
  }

  if (picking) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Add a sound" />
        <Pressable onPress={() => setPicking(false)} style={styles.done} accessibilityLabel="Done">
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sounds"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        {results.map((track) => {
          const already = chosen.has(track.id);
          return (
            <View key={track.id} style={styles.pick}>
              <Pressable
                style={styles.pickMain}
                accessibilityLabel={already ? `${track.title} added` : `Add ${track.title}`}
                onPress={() => {
                  if (mixTracks.length >= 6 && !already) {
                    setNotice('A mix holds up to 6 sounds.');
                    setPicking(false);
                    return;
                  }
                  addLayer(track);
                }}
              >
                <Image source={coverSource(track.artwork)} style={styles.pickArt} />
                <View style={styles.copy}>
                  <Text style={styles.name}>{track.title}</Text>
                  <Text style={styles.meta}>{track.category}</Text>
                </View>
                <Ionicons name={already ? 'checkmark' : 'add'} size={22} color={already ? colors.mint : colors.text} />
              </Pressable>
              <SoundMenuButton track={track} />
            </View>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Studio" />
      <Text style={styles.lead}>
        Choose sounds and set each volume. They play together. A saved mix keeps those choices on your account.
      </Text>
      {mixTracks.length === 0 ? (
        <Text style={styles.empty}>No sounds in this mix yet.</Text>
      ) : (
        <View style={styles.layers}>
          {mixTracks.map((layer) => (
            <View key={layer.id} style={styles.layer}>
              <Image source={coverSource(layer.artwork)} style={styles.art} />
              <View style={styles.copy}>
                <Text style={styles.name} numberOfLines={1}>{layer.title}</Text>
                <LevelBar value={layer.muted ? 0 : layer.volume} onChange={(volume) => setLayerVolume(layer.id, volume)} />
              </View>
              <Pressable onPress={() => toggleLayerMute(layer.id)} hitSlop={8} accessibilityLabel={layer.muted ? 'Unmute' : 'Mute'}>
                <Ionicons name={layer.muted ? 'volume-mute' : 'volume-medium'} size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => removeLayer(layer.id)} hitSlop={8} accessibilityLabel="Remove sound">
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <PillButton icon="add" label="Add sound" onPress={() => setPicking(true)} />
        <PillButton
          filled
          label={mixPlaying ? 'Pause mix' : 'Play mix'}
          icon={mixPlaying ? 'pause' : 'play'}
          onPress={playMix}
        />
      </View>
      <View style={styles.saveRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name this mix"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Pressable onPress={saveMix} style={styles.save} accessibilityLabel="Save mix">
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.section}>Saved mixes</Text>
      {saved.length === 0 ? (
        <Text style={styles.empty}>Saved mixes show up here and in Library.</Text>
      ) : (
        saved.map((item) => (
          <View key={item.id} style={styles.saved}>
            <Pressable style={styles.savedCopy} onPress={() => openMix(layersOf(item), true)}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{layersOf(item).length} sounds</Text>
            </Pressable>
            <Pressable onPress={() => removeSaved(item)} hitSlop={8} accessibilityLabel="Delete mix">
              <Ionicons name="trash-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  lead: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  empty: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  layers: { paddingHorizontal: 20, gap: 18 },
  layer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  art: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.card },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 22 },
  saveRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 16 },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    paddingHorizontal: 14,
  },
  save: {
    backgroundColor: colors.mint,
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveText: { color: colors.mintInk, fontFamily: font.semibold },
  notice: {
    color: colors.mint,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 20,
    marginTop: 10,
  },
  section: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 18,
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 8,
  },
  saved: {
    marginHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedCopy: { flex: 1 },
  done: { marginHorizontal: 20, marginBottom: 10 },
  doneText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
  search: {
    marginHorizontal: 20,
    marginBottom: 8,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    paddingHorizontal: 14,
  },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  pickMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  pickArt: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.card },
});
