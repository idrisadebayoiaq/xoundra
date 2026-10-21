import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { accountAction, drainNotices, supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function AdminScreen() {
  const { isAdmin, ready } = useApp();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    accountAction('admin-overview').then((result) => {
      if (!result.ok) setError(result.error);
      else setOverview(result.data);
    });
  }, [isAdmin]);

  async function publish() {
    if (title.trim().length < 2 || body.trim().length < 2) {
      setNotice('Add a title and the announcement.');
      return;
    }
    setBusy(true);
    const { data, error: failed } = await supabase.rpc('publish_announcement', {
      p_title: title.trim(),
      p_body: body.trim(),
    });
    setBusy(false);
    if (failed || !data) {
      setNotice('The announcement could not be sent.');
      return;
    }
    setTitle('');
    setBody('');
    setNotice('The announcement is published.');
    drainNotices();
  }

  if (!ready) return <View style={styles.screen} />;
  if (!isAdmin) return <Redirect href="/profile" />;

  return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
      <Text style={styles.section}>Announcement</Text>
      <Text style={styles.lead}>Everyone with an account gets this, on the phone and on the web. They can open it for the full text.</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Announcement title" />
      <TextInput value={body} onChangeText={setBody} placeholder="Write the announcement" placeholderTextColor={colors.muted} style={[styles.input, styles.bodyInput]} multiline accessibilityLabel="Announcement" />
      <Pressable onPress={publish} disabled={busy} accessibilityLabel="Publish announcement" style={styles.button}>
        <Text style={styles.buttonText}>{busy ? 'Sending' : 'Publish announcement'}</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
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
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  bodyInput: { minHeight: 120, textAlignVertical: 'top' },
  button: { alignSelf: 'flex-start', backgroundColor: colors.mint, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 20, marginBottom: 10 },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 10 },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
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
