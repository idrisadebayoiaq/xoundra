import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coverSource } from '../src/data/artwork';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

function sample(tracks) {
  const groups = new Map();
  for (const track of tracks) {
    const key = track.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(track);
  }
  const picked = [];
  for (const list of groups.values()) picked.push(...list.slice(0, 2));
  return picked.slice(0, 24);
}

export default function SoundPicksScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, userId, refreshAccount } = useApp();
  const choices = useMemo(() => sample(tracks), [tracks]);
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(id) {
    setSelected((items) => {
      if (items.includes(id)) return items.filter((item) => item !== id);
      if (items.length >= 5) return items;
      return [...items, id];
    });
  }

  async function finish() {
    if (selected.length !== 5 || !userId || busy) return;
    setBusy(true);
    setNotice('');
    await supabase.from('profile_picks').delete().eq('user_id', userId);
    const { error } = await supabase.from('profile_picks').insert(selected.map((trackId) => ({
      user_id: userId,
      track_id: trackId,
    })));
    if (error) {
      setBusy(false);
      setNotice('Those picks could not be saved.');
      return;
    }
    await supabase.from('profiles').update({ onboarding_done: true }).eq('id', userId);
    await refreshAccount();
    router.replace('/');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}>
      <Text style={styles.title}>Pick 5 sounds</Text>
      <Text style={styles.lead}>Choose five you want to hear. They come from every kind of sound here, and they shape what we recommend.</Text>
      <Text style={styles.count}>{selected.length} of 5</Text>
      <View style={styles.grid}>
        {choices.map((track) => {
          const on = selected.includes(track.id);
          return (
            <Pressable key={track.id} onPress={() => toggle(track.id)} accessibilityLabel={track.title} style={[styles.card, on && styles.cardOn]}>
              <Image source={coverSource(track.artwork)} style={styles.art} />
              <Text style={styles.name} numberOfLines={2}>{track.title}</Text>
              <Text style={styles.meta}>{track.category}</Text>
            </Pressable>
          );
        })}
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable
        onPress={finish}
        disabled={selected.length !== 5 || busy}
        accessibilityLabel="Continue to home"
        style={[styles.button, selected.length !== 5 && styles.buttonOff]}
      >
        <Text style={styles.buttonText}>{busy ? 'Saving' : 'Continue'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20 },
  title: { color: colors.text, fontFamily: font.bold, fontSize: 32, letterSpacing: -0.6 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginTop: 8 },
  count: { color: colors.mint, fontFamily: font.semibold, fontSize: 14, marginTop: 16, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48%', backgroundColor: colors.card, borderRadius: 14, padding: 8 },
  cardOn: { borderWidth: 1.5, borderColor: colors.mint },
  art: { width: '100%', aspectRatio: 1.2, borderRadius: 10, backgroundColor: colors.bg },
  name: { color: colors.text, fontFamily: font.semibold, fontSize: 14, marginTop: 8 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  notice: { color: colors.amber, fontFamily: font.regular, marginTop: 12 },
  button: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOff: { opacity: 0.45 },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
});
