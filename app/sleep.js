import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';
import { coverSource } from '../src/data/artwork';

function cleanTime(value) {
  const digits = value.replace(/[^\d]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function SleepScreen() {
  const { premium, tracks, sleepPlan, saveSleep } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('22:00');
  const [stop, setStop] = useState('06:00');
  const [picked, setPicked] = useState([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function save() {
    if (!premium) {
      router.push('/plans');
      return;
    }
    if (!validTime(start) || !validTime(stop)) {
      setNotice('Use a time like 22:00 and 06:00.');
      return;
    }
    if (start === stop) {
      setNotice('The start and stop times need to be different.');
      return;
    }
    if (enabled && !picked.length) {
      setNotice('Pick at least one sound.');
      return;
    }
    setBusy(true);
    setNotice('');
    await saveSleep({ enabled, start, stop, trackIds: picked });
    setBusy(false);
    setNotice(enabled ? 'The sleep timer is on.' : 'The sleep timer is saved and turned off.');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Sleep timer" back />
      <Text style={styles.lead}>
        Pick the sounds and the times. They play in order when the start time arrives, and they stop at the stop time.
      </Text>
      {premium ? null : (
        <Pressable style={styles.plans} onPress={() => router.push('/plans')} accessibilityLabel="See plans">
          <Text style={styles.plansText}>Sleep timer is part of Premium. See plans</Text>
        </Pressable>
      )}
      <Pressable
        style={styles.switchRow}
        onPress={() => premium && setEnabled((value) => !value)}
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
      <Pressable style={styles.save} onPress={save} disabled={busy} accessibilityLabel="Save sleep timer">
        <Text style={styles.saveText}>{busy ? 'Saving' : 'Save sleep timer'}</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  plans: { borderWidth: 1, borderColor: colors.mint, borderRadius: 14, padding: 14, marginBottom: 16 },
  plansText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  switchLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#2A3140', padding: 3 },
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
});
