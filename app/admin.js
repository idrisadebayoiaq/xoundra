import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { accountAction } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function AdminScreen() {
  const { isAdmin } = useApp();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    accountAction('admin-overview').then((result) => {
      if (!result.ok) setError(result.error);
      else setOverview(result.data);
    });
  }, [isAdmin]);

  if (!isAdmin) return <Redirect href="/profile" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Admin" back />
      <Text style={styles.lead}>Xoundra support. Premium is included on this account.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {overview ? (
        <View style={styles.grid}>
          <Stat label="People" value={overview.people} />
          <Stat label="Premium" value={overview.premium} />
          <Stat label="Sounds" value={overview.tracks} />
          <Stat label="Lifetime left" value={overview.lifetime_remaining} />
        </View>
      ) : null}
      <Text style={styles.section}>Recent purchases</Text>
      {(overview?.purchases || []).length === 0 ? <Text style={styles.empty}>No purchases yet.</Text> : null}
      {(overview?.purchases || []).map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.plan}>{item.plan_id}</Text>
          <Text style={styles.meta}>{item.status} · {(item.amount_minor / 100).toLocaleString()} {item.currency}</Text>
        </View>
      ))}
    </ScrollView>
  );
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
  content: { paddingBottom: 28 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, marginHorizontal: 20, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  stat: { width: '47%', backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  value: { color: colors.text, fontFamily: font.bold, fontSize: 28 },
  label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginTop: 4 },
  section: { color: colors.text, fontFamily: font.bold, fontSize: 18, marginHorizontal: 20, marginTop: 22, marginBottom: 8 },
  row: { marginHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  plan: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 2 },
  empty: { color: colors.muted, fontFamily: font.regular, marginHorizontal: 20 },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 10 },
});
