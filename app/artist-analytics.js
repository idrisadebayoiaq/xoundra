import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { loadArtistWorks } from '../src/lib/artistMedia';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function ArtistAnalyticsScreen() {
  const app = useApp();
  const [followers, setFollowers] = useState(0);
  const [listeners, setListeners] = useState(0);
  const [sounds, setSounds] = useState([]);
  const [days, setDays] = useState(30);
  const [draftDays, setDraftDays] = useState('30');
  const [series, setSeries] = useState([]);

  const load = useCallback(async () => {
    if (!app.userId) return;
    const [works, card, performance] = await Promise.all([
      loadArtistWorks(app.userId),
      supabase.from('artists').select('followers, monthly_listeners').eq('id', app.userId).maybeSingle(),
      supabase.rpc('artist_performance', { p_days: days }),
    ]);
    setSounds(works.sounds);
    setFollowers(card.data?.followers || 0);
    setListeners(card.data?.monthly_listeners || 0);
    setSeries(performance.data || []);
  }, [app.userId, days]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  if (!app.ready) return <View style={styles.screen} />;
  if (!app.isArtist) return <Redirect href="/artist" />;

  const totals = sounds.reduce((sum, sound) => ({
    plays: sum.plays + sound.plays,
    likes: sum.likes + sound.likes,
    favorites: sum.favorites + sound.favorites,
    comments: sum.comments + sound.comments,
  }), { plays: 0, likes: 0, favorites: 0, comments: 0 });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Analytics" back />
      <Text style={styles.lead}>How listeners respond to your account and to each sound.</Text>
      <Text style={styles.section}>Progress</Text>
      <Text style={styles.lead}>Plays across the days you choose. The last 30 days are shown first.</Text>
      <View style={styles.filters}>
        {[7, 30, 90].map((value) => (
          <Pressable key={value} onPress={() => { setDays(value); setDraftDays(String(value)); }} accessibilityLabel={`Last ${value} days`} style={[styles.filter, days === value && styles.filterOn]}>
            <Text style={[styles.filterText, days === value && styles.filterTextOn]}>{value} days</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.custom}>
        <TextInput
          value={draftDays}
          onChangeText={setDraftDays}
          keyboardType="number-pad"
          placeholder="Days"
          placeholderTextColor={colors.muted}
          style={styles.dayInput}
          accessibilityLabel="Number of days"
        />
        <Pressable
          onPress={() => {
            const next = Math.min(180, Math.max(1, Math.round(Number(draftDays) || 30)));
            setDays(next);
            setDraftDays(String(next));
          }}
          accessibilityLabel="Show these days"
          style={styles.show}
        >
          <Text style={styles.showText}>Show</Text>
        </Pressable>
      </View>
      <PerformanceChart rows={series} />
      <View style={styles.grid}>
        <Stat label="Plays" value={totals.plays} />
        <Stat label="Likes" value={totals.likes} />
        <Stat label="Favorites" value={totals.favorites} />
        <Stat label="Notes" value={totals.comments} />
        <Stat label="Followers" value={followers} />
        <Stat label="Monthly listeners" value={listeners} />
      </View>
      <Text style={styles.section}>Each sound</Text>
      {sounds.length === 0 ? <Text style={styles.empty}>Published sounds show their plays, likes, favorites, and notes here.</Text> : null}
      {sounds.map((sound) => (
        <View key={sound.id} style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{sound.title}</Text>
          <Text style={styles.meta}>
            {count(sound.plays, 'play')} · {count(sound.likes, 'like')} · {count(sound.favorites, 'favorite')} · {count(sound.comments, 'note')}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function PerformanceChart({ rows }) {
  const plays = rows.reduce((sum, row) => sum + Number(row.plays || 0), 0);
  const likes = rows.reduce((sum, row) => sum + Number(row.likes || 0), 0);
  const favorites = rows.reduce((sum, row) => sum + Number(row.favorites || 0), 0);
  const notes = rows.reduce((sum, row) => sum + Number(row.notes || 0), 0);
  const follows = rows.reduce((sum, row) => sum + Number(row.follows || 0), 0);
  const peak = Math.max(1, ...rows.map((row) => Number(row.plays || 0)));
  const first = rows[0]?.day ? labelDay(rows[0].day) : '';
  const last = rows[rows.length - 1]?.day ? labelDay(rows[rows.length - 1].day) : '';
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartSummary}>
        {plays} plays · {likes} likes · {favorites} favorites · {notes} notes · {follows} follows
      </Text>
      <View style={styles.chart}>
        {rows.map((row) => {
          const height = Math.max(4, Math.round((Number(row.plays || 0) / peak) * 120));
          return <View key={row.day} style={[styles.bar, { height }]} />;
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{first}</Text>
        <Text style={styles.axisText}>{last}</Text>
      </View>
    </View>
  );
}

function labelDay(value) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function count(value, word) {
  return value === 1 ? `1 ${word}` : `${value} ${word}s`;
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '31%', backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10 },
  value: { color: colors.text, fontFamily: font.bold, fontSize: 22 },
  label: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 3 },
  section: { color: colors.text, fontFamily: font.bold, fontSize: 18, marginTop: 22, marginBottom: 8 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filter: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
  filterOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  filterText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  filterTextOn: { color: colors.mintInk },
  custom: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayInput: { width: 88, height: 42, borderRadius: 12, backgroundColor: colors.card, color: colors.text, fontFamily: font.regular, fontSize: 16, paddingHorizontal: 12 },
  show: { height: 42, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14, justifyContent: 'center' },
  showText: { color: colors.mint, fontFamily: font.semibold, fontSize: 14 },
  chartCard: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 8 },
  chartSummary: { color: colors.muted, fontFamily: font.regular, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  chart: { height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, backgroundColor: colors.mint, borderRadius: 3, minWidth: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisText: { color: colors.muted, fontFamily: font.regular, fontSize: 11 },
  empty: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  title: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 4 },
});
