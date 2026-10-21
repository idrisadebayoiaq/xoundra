import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

const links = [
  { href: '/artist-upload', label: 'Upload sounds', copy: 'Publish one sound, or several together as an album.', icon: 'cloud-upload-outline' },
  { href: '/artist-sounds', label: 'My sounds', copy: 'Singles and albums you have published.', icon: 'musical-notes-outline' },
  { href: '/artist-analytics', label: 'Analytics', copy: 'Plays, likes, favorites, notes, and follows.', icon: 'stats-chart-outline' },
];

export default function ArtistScreen() {
  const app = useApp();
  const [name, setName] = useState(app.artistName || app.firstName || '');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function become() {
    const artist = name.trim();
    if (artist.length < 2) {
      setNotice('Add the name listeners should see.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('become_artist', { p_name: artist });
    setBusy(false);
    if (error) {
      setNotice('That artist name could not be saved.');
      return;
    }
    await app.refreshAccount();
    setNotice('');
  }

  if (!app.ready) return <View style={styles.screen} />;

  if (!app.isArtist) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Become an artist" back />
        <Text style={styles.lead}>Choose the name listeners should see. You can upload straight away. Earning opens later, after a separate check.</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Artist name"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Artist name"
        />
        <Pressable onPress={become} disabled={busy} accessibilityLabel="Become an artist" style={styles.button}>
          <Text style={styles.buttonText}>{busy ? 'Saving' : 'Become an artist'}</Text>
        </Pressable>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Artist dashboard" back />
      <Text style={styles.lead}>Upload, review what is published, and see how listeners respond.</Text>
      {links.map((item) => (
        <Pressable key={item.href} style={styles.row} onPress={() => router.push(item.href)} accessibilityLabel={item.label}>
          <View style={styles.icon}>
            <Ionicons name={item.icon} size={22} color={colors.mint} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.copyText}>{item.copy}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
      <Text style={styles.later}>Earning comes later. Uploading and these pages stay open before that.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  button: { alignSelf: 'flex-start', backgroundColor: colors.mint, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1C2430', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  label: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  copyText: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  later: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 19, marginTop: 12 },
  notice: { color: colors.amber, fontFamily: font.regular, fontSize: 14, marginTop: 14 },
});
