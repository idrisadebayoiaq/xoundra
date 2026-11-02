import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coverSource } from '../src/data/artwork';
import { supabase } from '../src/lib/supabase';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { tracks, userId, refreshAccount } = useApp();
  const choices = useMemo(() => sample(tracks), [tracks]);
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = selected.length === 5;

  function toggle(id) {
    setSelected((items) => {
      if (items.includes(id)) return items.filter((item) => item !== id);
      if (items.length >= 5) return items;
      return [...items, id];
    });
  }

  async function finish() {
    if (!ready || !userId || busy) return;
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
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>XOUNDRA</Text>
        <Text style={styles.title}>Pick 5 sounds</Text>
        <Text style={styles.lead}>
          Choose five you want nearby. They shape what we recommend first.
        </Text>
        <View style={styles.meter}>
          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, { width: `${(selected.length / 5) * 100}%` }]} />
          </View>
          <Text style={styles.count}>{selected.length} of 5</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {choices.map((track) => {
          const on = selected.includes(track.id);
          return (
            <Pressable
              key={track.id}
              onPress={() => toggle(track.id)}
              accessibilityLabel={track.title}
              accessibilityState={{ selected: on }}
              style={[styles.card, on && styles.cardOn]}
            >
              <Image source={coverSource(track.artwork)} style={styles.art} />
              <View style={styles.cardBody}>
                <Text style={styles.name} numberOfLines={2}>{track.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>{track.category}</Text>
              </View>
              <View style={[styles.check, on && styles.checkOn]}>
                {on ? <Ionicons name="checkmark" size={14} color={colors.mintInk} /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Pressable
          onPress={finish}
          disabled={!ready || busy}
          accessibilityLabel="Continue to home"
          style={[styles.button, !ready && styles.buttonOff]}
        >
          <Text style={[styles.buttonText, !ready && styles.buttonTextOff]}>
            {busy ? 'Saving' : ready ? 'Continue' : `Pick ${5 - selected.length} more`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
    kicker: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 11,
      letterSpacing: 2.4,
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 28,
      letterSpacing: -0.5,
    },
    lead: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
    },
    meter: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    meterTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.line,
      overflow: 'hidden',
    },
    meterFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.mint,
    },
    count: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 13,
      minWidth: 48,
      textAlign: 'right',
    },
    grid: {
      paddingHorizontal: 16,
      paddingTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    card: {
      width: '48.5%',
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    cardOn: {
      borderColor: colors.mint,
      backgroundColor: colors.cardRaised,
    },
    art: {
      width: '100%',
      aspectRatio: 1.55,
      backgroundColor: colors.bg,
    },
    cardBody: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      paddingRight: 34,
      minHeight: 52,
    },
    name: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 13,
      lineHeight: 17,
    },
    meta: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 11,
      marginTop: 2,
    },
    check: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: {
      borderColor: colors.mint,
      backgroundColor: colors.mint,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: colors.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    notice: {
      color: colors.amber,
      fontFamily: font.regular,
      marginBottom: 8,
      fontSize: 13,
    },
    button: {
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonOff: {
      backgroundColor: colors.cardRaised,
    },
    buttonText: {
      color: colors.mintInk,
      fontFamily: font.semibold,
      fontSize: 16,
    },
    buttonTextOff: {
      color: colors.muted,
    },
  });
}
