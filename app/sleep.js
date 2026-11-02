import { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';
import { useAds } from '../src/state/AdState';
import { useRewards } from '../src/state/RewardsState';
import { AD_COSTS } from '../src/ads/rewards';
import { coverSource } from '../src/data/artwork';
import { studioPresets } from '../src/data/studioPresets';
import { useKeyboardPad } from '../src/hooks/useKeyboardPad';

function cleanTime(value) {
  const digits = value.replace(/[^\d]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function SleepScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { tracks, sleepPlan, saveSleep, openMix, playMix, cycleSleep } = useApp();
  const { hasSleepAccess, requestUnlock } = useAds();
  const { earnRitual } = useRewards();
  const keyboardPad = useKeyboardPad(12);
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('22:00');
  const [stop, setStop] = useState('06:00');
  const [picked, setPicked] = useState([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [ritualMinutes, setRitualMinutes] = useState(30);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [focusUntil, setFocusUntil] = useState('');

  useEffect(() => {
    if (!sleepPlan) return;
    setEnabled(Boolean(sleepPlan.enabled));
    setStart(sleepPlan.start || '22:00');
    setStop(sleepPlan.stop || '06:00');
    setPicked(Array.isArray(sleepPlan.trackIds) ? sleepPlan.trackIds : []);
  }, [sleepPlan]);

  const chosen = picked.map((id) => tracks.find((item) => item.id === id)).filter(Boolean);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 1) return [];
    return tracks
      .filter((item) => !picked.includes(item.id) && (`${item.title} ${item.artistName || ''} ${item.category}`).toLowerCase().includes(needle))
      .slice(0, 8);
  }, [picked, query, tracks]);

  function move(index, direction) {
    const next = [...picked];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setPicked(next);
  }

  async function ensureAccess() {
    if (hasSleepAccess) return true;
    return requestUnlock('sleep');
  }

  async function save(overrides = {}) {
    if (!(await ensureAccess())) {
      setNotice(`Watch ${AD_COSTS.sleep} ads to use Sleep timer, or see plans.`);
      return;
    }
    const nextStart = overrides.start || start;
    const nextStop = overrides.stop || stop;
    const nextEnabled = overrides.enabled ?? enabled;
    if (!validTime(nextStart) || !validTime(nextStop)) {
      setNotice('Use a time like 22:00 and 06:00.');
      return;
    }
    if (nextStart === nextStop) {
      setNotice('The start and stop times need to be different.');
      return;
    }
    if (nextEnabled && !picked.length) {
      setNotice('Pick at least one sound.');
      return;
    }
    setBusy(true);
    setNotice('');
    setStart(nextStart);
    setStop(nextStop);
    setEnabled(nextEnabled);
    await saveSleep({ enabled: nextEnabled, start: nextStart, stop: nextStop, trackIds: picked });
    setBusy(false);
    setNotice(nextEnabled ? 'The sleep timer is on.' : 'The sleep timer is saved and turned off.');
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + keyboardPad }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <ScreenHeader title="Evening" back />
      <Text style={styles.lead}>
        Start a ritual now, or schedule the sleep timer for later.
      </Text>
      <Text style={styles.section}>Start tonight</Text>
      <View style={styles.ritualRow}>
        {[15, 30, 45, 60].map((mins) => (
          <Pressable
            key={mins}
            style={[styles.chip, ritualMinutes === mins && styles.chipOn]}
            onPress={() => setRitualMinutes(mins)}
          >
            <Text style={[styles.chipText, ritualMinutes === mins && styles.chipTextOn]}>{mins}m</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ritualScenes}>
        {studioPresets.slice(0, 4).map((scene) => (
          <Pressable
            key={scene.id}
            style={styles.ritualCard}
            onPress={async () => {
              if (!(await ensureAccess())) {
                setNotice(`Watch ${AD_COSTS.sleep} ads for Evening, or see plans.`);
                return;
              }
              const layers = scene.layers
                .map((layer) => {
                  const track = tracks.find((item) => item.id === layer.id);
                  return track ? { track_id: track.id, gain: layer.volume, muted: false } : null;
                })
                .filter(Boolean);
              if (!layers.length) return;
              openMix(layers, false);
              await playMix();
              // Approximate sleep timer minutes via cycleSleep steps if available
              if (typeof cycleSleep === 'function') {
                for (let i = 0; i < Math.ceil(ritualMinutes / 15); i += 1) cycleSleep();
              }
              earnRitual();
              setNotice(`${scene.title} · about ${ritualMinutes} minutes. Streak updated.`);
              router.push('/player');
            }}
          >
            <Image source={coverSource(scene.artwork)} style={styles.ritualArt} />
            <Text style={styles.ritualTitle} numberOfLines={1}>{scene.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[styles.section, { marginTop: 22 }]}>Scheduled sleep timer</Text>
      <Text style={styles.lead}>
        Pick the sounds and the times. They play in order when the start time arrives, and they stop at the stop time.
      </Text>
      {hasSleepAccess ? null : (
        <View style={styles.gate}>
          <Pressable style={styles.plans} onPress={() => requestUnlock('sleep')} accessibilityLabel="Watch ads for sleep timer">
            <Text style={styles.plansText}>Watch {AD_COSTS.sleep} ads to unlock Sleep timer</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/plans')} accessibilityLabel="See plans">
            <Text style={styles.alt}>Or see Premium plans</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        style={styles.switchRow}
        onPress={async () => {
          if (!(await ensureAccess())) return;
          setEnabled((value) => !value);
        }}
        accessibilityLabel={enabled ? 'Turn sleep timer off' : 'Turn sleep timer on'}
      >
        <Text style={styles.switchLabel}>{enabled ? 'On' : 'Off'}</Text>
        <View style={[styles.switch, enabled && styles.switchOn]}>
          <View style={[styles.knob, enabled && styles.knobOn]} />
        </View>
      </Pressable>
      <View style={styles.times}>
        <View style={styles.time}>
          <Text style={styles.timeLabel}>Starts</Text>
          <TextInput
            value={start}
            onChangeText={(value) => setStart(cleanTime(value))}
            placeholder="22:00"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
            accessibilityLabel="Start time"
          />
        </View>
        <View style={styles.time}>
          <Text style={styles.timeLabel}>Stops</Text>
          <TextInput
            value={stop}
            onChangeText={(value) => setStop(cleanTime(value))}
            placeholder="06:00"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
            accessibilityLabel="Stop time"
          />
        </View>
      </View>
      <Text style={styles.section}>Sounds, in order</Text>
      {chosen.map((track, index) => (
        <View key={track.id} style={styles.row}>
          <Image source={coverSource(track.artwork)} style={styles.art} />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{track.artistName || track.category}</Text>
          </View>
          <Pressable onPress={() => move(index, -1)} hitSlop={6} accessibilityLabel="Move earlier">
            <Ionicons name="chevron-up" size={18} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => move(index, 1)} hitSlop={6} accessibilityLabel="Move later">
            <Ionicons name="chevron-down" size={18} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setPicked((items) => items.filter((id) => id !== track.id))} hitSlop={6} accessibilityLabel="Remove sound">
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      {chosen.length === 0 ? <Text style={styles.empty}>No sounds picked yet.</Text> : null}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Find a sound to add"
        placeholderTextColor={colors.muted}
        style={styles.search}
        accessibilityLabel="Find a sound"
      />
      {results.map((track) => (
        <Pressable key={track.id} style={styles.row} onPress={() => { setPicked((items) => [...items, track.id]); setQuery(''); }}>
          <Image source={coverSource(track.artwork)} style={styles.art} />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{track.artistName || track.category}</Text>
          </View>
          <Ionicons name="add" size={20} color={colors.mint} />
        </Pressable>
      ))}
      <Text style={[styles.section, { marginTop: 22 }]}>Focus until</Text>
      <Text style={styles.lead}>Optional end clock (HH:MM). Saved with the sleep plan as the stop time when set.</Text>
      <TextInput
        value={focusUntil}
        onChangeText={(value) => setFocusUntil(cleanTime(value))}
        placeholder="11:30"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="Focus until"
      />
      <Pressable
        style={[styles.switchRow, { marginTop: 16 }]}
        onPress={() => setWakeEnabled((value) => !value)}
        accessibilityLabel="Gentle wake"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Gentle wake</Text>
          <Text style={styles.meta}>Rise through your first sleep sound at wake time.</Text>
        </View>
        <View style={[styles.switch, wakeEnabled && styles.switchOn]}>
          <View style={[styles.knob, wakeEnabled && styles.knobOn]} />
        </View>
      </Pressable>
      {wakeEnabled ? (
        <TextInput
          value={wakeTime}
          onChangeText={(value) => setWakeTime(cleanTime(value))}
          placeholder="07:00"
          placeholderTextColor={colors.muted}
          style={[styles.input, { marginTop: 8 }]}
          accessibilityLabel="Wake time"
        />
      ) : null}
      <Pressable
        style={styles.save}
        onPress={async () => {
          const overrides = {};
          if (focusUntil && validTime(focusUntil)) overrides.stop = focusUntil;
          if (wakeEnabled && validTime(wakeTime)) {
            const [h, m] = wakeTime.split(':').map(Number);
            const end = new Date(2000, 0, 1, h, m + 45);
            overrides.start = wakeTime;
            overrides.stop = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
            overrides.enabled = true;
          }
          await save(overrides);
        }}
        disabled={busy}
        accessibilityLabel="Save sleep timer"
      >
        <Text style={styles.saveText}>{busy ? 'Saving' : 'Save sleep timer'}</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  gate: { gap: 10, marginBottom: 16 },
  plans: { borderWidth: 1, borderColor: colors.mint, borderRadius: 14, padding: 14 },
  plansText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
  alt: { color: colors.muted, fontFamily: font.medium, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  switchLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.switchOff, padding: 3 },
  switchOn: { backgroundColor: colors.mint },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text },
  knobOn: { alignSelf: 'flex-end', backgroundColor: colors.mintInk },
  times: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  time: { flex: 1 },
  timeLabel: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 6 },
  input: { height: 48, borderRadius: 12, backgroundColor: colors.card, color: colors.text, fontFamily: font.semibold, fontSize: 18, paddingHorizontal: 14 },
  section: { color: colors.text, fontFamily: font.bold, fontSize: 18, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  art: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.card },
  copy: { flex: 1 },
  title: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, fontFamily: font.regular, fontSize: 14, marginBottom: 8 },
  search: { height: 46, borderRadius: 12, backgroundColor: colors.card, color: colors.text, fontFamily: font.regular, fontSize: 15, paddingHorizontal: 14, marginTop: 8, marginBottom: 8 },
  save: { height: 50, borderRadius: 25, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
  notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14, marginTop: 12 },
  ritualRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  chipTextOn: { color: colors.mintInk },
  ritualScenes: { gap: 10, paddingBottom: 4 },
  ritualCard: { width: 120, marginRight: 4 },
  ritualArt: { width: 120, height: 120, borderRadius: 12, backgroundColor: colors.card },
  ritualTitle: { color: colors.text, fontFamily: font.medium, fontSize: 13, marginTop: 6 },
  });
}
