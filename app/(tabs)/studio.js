import { useCallback, useState, useMemo } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { LevelBar } from '../../src/components/LevelBar';
import { PillButton } from '../../src/components/Cards';
import { SoundMenuButton } from '../../src/components/SoundMenu';
import { coverSource } from '../../src/data/artwork';
import { studioPresets } from '../../src/data/studioPresets';
import { supabase } from '../../src/lib/supabase';
import { goBack } from '../../src/lib/navigation';
import { useKeyboardPad } from '../../src/hooks/useKeyboardPad';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';
import { useAds } from '../../src/state/AdState';
import { AD_COSTS } from '../../src/ads/rewards';
export default function StudioScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const fromMenu = params.from === 'menu';
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
    tracks,
  } = useApp();
  const { hasStudioAccess, requestUnlock } = useAds();
  const keyboardPad = useKeyboardPad(12);
  const [mode, setMode] = useState(params.mode === 'edit' || mixTracks.length ? 'edit' : 'gallery');
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState([]);
  const [notice, setNotice] = useState('');
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
    if (params.mode === 'edit') setMode('edit');
  }, [refreshSaved, params.mode]));

  async function ensureStudio() {
    if (hasStudioAccess || premium) return true;
    const ok = await requestUnlock('studio');
    if (!ok) setNotice(`Watch ${AD_COSTS.studio} ads to unlock Studio, or see plans.`);
    return ok;
  }

  function layersFromScene(scene) {
    return scene.layers
      .map((layer) => {
        const track = tracks.find((item) => item.id === layer.id);
        return track ? { track_id: track.id, gain: layer.volume, muted: false } : null;
      })
      .filter(Boolean);
  }

  async function playScene(scene) {
    if (!(await ensureStudio())) return;
    const layers = layersFromScene(scene);
    if (!layers.length) {
      setNotice('That scene needs sounds that are still in the catalogue.');
      return;
    }
    openMix(layers, false);
    setName(scene.title);
    await playMix();
  }

  async function editScene(scene) {
    if (!(await ensureStudio())) return;
    const layers = layersFromScene(scene);
    openMix(layers, false);
    setName(scene.title);
    setMode('edit');
  }

  async function saveMix() {
    const title = name.trim();
    if (!userId) {
      setNotice('Sign in to save a mix.');
      return;
    }
    if (!(await ensureStudio())) return;
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

  async function shareMixCode() {
    if (!mixTracks.length) {
      setNotice('Add sounds before sharing a collab code.');
      return;
    }
    const payload = {
      v: 1,
      title: name.trim() || 'Shared scene',
      layers: mixTracks.map((layer) => ({ id: layer.id, volume: layer.volume, muted: Boolean(layer.muted) })),
    };
    const code = `xoundra-scene:${encodeURIComponent(JSON.stringify(payload))}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        setNotice('Collab code copied. Friends can paste it on Join scene.');
        return;
      }
    } catch { /* fall through */ }
    setNotice(`Share this code:\n${code}`);
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

  if (mode === 'gallery') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ScreenHeader title="Studio" back={fromMenu} onBack={() => goBack({ from: 'menu' })} />
        <Text style={styles.lead}>Start from a scene. Edit when you want your own mix.</Text>
        {hasStudioAccess || premium ? null : (
          <View style={styles.gate}>
            <Pressable style={styles.unlock} onPress={() => requestUnlock('studio')} accessibilityLabel="Watch ads for Studio">
              <Text style={styles.unlockText}>Watch {AD_COSTS.studio} ads to unlock Studio</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/plans')} accessibilityLabel="See plans">
              <Text style={styles.alt}>Or see Premium plans</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.sceneGrid}>
          {studioPresets.map((scene) => (
            <View key={scene.id} style={styles.sceneCard}>
              <Pressable onPress={() => playScene(scene)} accessibilityLabel={`Play ${scene.title}`}>
                <Image source={coverSource(scene.artwork)} style={styles.sceneArt} />
                <Text style={styles.sceneTitle}>{scene.title}</Text>
                <Text style={styles.sceneBlurb}>{scene.blurb}</Text>
              </Pressable>
              <Pressable onPress={() => editScene(scene)} style={styles.editLink}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable style={styles.custom} onPress={() => setMode('edit')}>
          <Text style={styles.customText}>Custom mix</Text>
        </Pressable>
        <Pressable style={styles.custom} onPress={() => router.push('/join-scene')}>
          <Text style={styles.customText}>Join a shared scene</Text>
        </Pressable>
        {saved.length ? <Text style={styles.section}>Your mixes</Text> : null}
        {saved.map((item) => (
          <View key={item.id} style={styles.saved}>
            <Pressable style={styles.savedCopy} onPress={() => { openMix(layersOf(item), true); setMode('edit'); }}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{layersOf(item).length} sounds</Text>
            </Pressable>
            <Pressable onPress={() => removeSaved(item)} hitSlop={8} accessibilityLabel="Delete mix">
              <Ionicons name="trash-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + keyboardPad }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <ScreenHeader title="Edit mix" back onBack={() => setMode('gallery')} />
      <Text style={styles.lead}>Adjust volumes, then play or save. Start from a scene if this is empty.</Text>
      {mixTracks.length === 0 ? (
        <Pressable onPress={() => setMode('gallery')} style={styles.custom}>
          <Text style={styles.customText}>Start from a scene</Text>
        </Pressable>
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
          onPress={async () => {
            if (mixPlaying) {
              playMix();
              return;
            }
            if (!(await ensureStudio())) return;
            playMix();
          }}
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
      <Pressable onPress={shareMixCode} style={styles.custom}>
        <Text style={styles.customText}>Copy collab code</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  gate: { marginHorizontal: 20, marginBottom: 14, gap: 8 },
  unlock: {
    borderWidth: 1,
    borderColor: colors.mint,
    borderRadius: 14,
    padding: 14,
  },
  unlockText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
  alt: { color: colors.muted, fontFamily: font.medium, fontSize: 14 },
  lead: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sceneGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  sceneCard: { width: '48%' },
  sceneArt: { width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: colors.card },
  sceneTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 15, marginTop: 8 },
  sceneBlurb: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2, minHeight: 32 },
  editLink: { marginTop: 6 },
  editText: { color: colors.mint, fontFamily: font.medium, fontSize: 13 },
  custom: { marginHorizontal: 20, marginTop: 18 },
  customText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
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
}
