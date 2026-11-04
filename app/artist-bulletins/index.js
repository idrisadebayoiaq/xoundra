import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { KeyboardScreen } from '../../src/components/KeyboardScreen';
import { supabase } from '../../src/lib/supabase';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';

export default function ArtistBulletinsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const app = useApp();
  const [mine, setMine] = useState(null);
  const [joined, setJoined] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [replies, setReplies] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!app.userId) return;
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      app.isArtist
        ? supabase
            .from('bulletins')
            .select('id, title, description, members_can_reply, created_at')
            .eq('artist_id', app.userId)
            .is('archived_at', null)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('bulletin_members')
        .select('bulletin_id, role, bulletins(id, title, description, artist_id, members_can_reply)')
        .eq('user_id', app.userId),
    ]);
    setMine(owned);
    setJoined(
      (memberships || [])
        .map((row) => row.bulletins)
        .filter(Boolean)
        .filter((b) => b.artist_id !== app.userId),
    );
  }, [app.userId, app.isArtist]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  if (!app.ready) return <View style={styles.screen} />;
  if (!app.userId) return <Redirect href="/sign-in" />;

  async function create() {
    const name = title.trim();
    if (name.length < 2) {
      setNotice('Name your Bulletin.');
      return;
    }
    setBusy(true);
    setNotice('');
    const { data, error } = await supabase.rpc('create_bulletin', {
      p_title: name,
      p_description: description.trim(),
      p_members_can_reply: replies,
      p_cover: null,
    });
    setBusy(false);
    if (error) {
      if (/bulletin_exists/i.test(error.message || '')) setNotice('You already have an active Bulletin.');
      else if (/not_artist/i.test(error.message || '')) setNotice('Only verified artists can create a Bulletin.');
      else setNotice('Bulletin could not be created.');
      return;
    }
    router.push({ pathname: '/artist-bulletins/[id]', params: { id: data } });
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <ScreenHeader title="Bulletins" back />
      <Text style={styles.lead}>Updates for people who follow you — a calm, owned space. Not a social feed.</Text>

      {app.isArtist ? (
        mine ? (
          <SurfaceCard
            onPress={() => router.push({ pathname: '/artist-bulletins/[id]', params: { id: mine.id } })}
            accessibilityLabel={mine.title}
            style={styles.cardGap}
          >
            <Text style={styles.eyebrow}>Your Bulletin</Text>
            <Text style={styles.title}>{mine.title}</Text>
            {mine.description ? <Text style={styles.copy}>{mine.description}</Text> : null}
            <Text style={styles.meta}>{mine.members_can_reply ? 'Members can reply' : 'Replies off · react and read'}</Text>
            <View style={styles.ctaRow}>
              <Text style={styles.cta}>Open</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.mint} />
            </View>
          </SurfaceCard>
        ) : (
          <SurfaceCard style={styles.cardGap}>
            <Text style={styles.eyebrow}>Create</Text>
            <Text style={styles.title}>Start your Bulletin</Text>
            <Text style={styles.copy}>One active Bulletin per artist. Invite followers when they join you.</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Bulletin name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Bulletin name"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Optional subtitle"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.area]}
              multiline
              accessibilityLabel="Bulletin description"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Members can reply</Text>
              <Switch value={replies} onValueChange={setReplies} trackColor={{ true: colors.mint }} />
            </View>
            <Pressable style={styles.button} onPress={create} disabled={busy} accessibilityLabel="Create Bulletin">
              <Text style={styles.buttonText}>{busy ? 'Creating' : 'Create Bulletin'}</Text>
            </Pressable>
          </SurfaceCard>
        )
      ) : null}

      <Text style={styles.section}>Joined</Text>
      {joined.length === 0 ? (
        <Text style={styles.copy}>Bulletins you accept from artists will show here.</Text>
      ) : (
        joined.map((item) => (
          <SurfaceCard
            key={item.id}
            onPress={() => router.push({ pathname: '/artist-bulletins/[id]', params: { id: item.id } })}
            accessibilityLabel={item.title}
            style={styles.cardGap}
          >
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? <Text style={styles.copy}>{item.description}</Text> : null}
          </SurfaceCard>
        ))
      )}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </KeyboardScreen>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40, paddingHorizontal: 20 },
    lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginBottom: 16 },
    cardGap: { marginBottom: 12 },
    eyebrow: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: { color: colors.text, fontFamily: font.bold, fontSize: 20 },
    copy: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 20, marginTop: 6 },
    meta: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginTop: 10 },
    ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
    cta: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
    input: {
      marginTop: 12,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingHorizontal: 14,
    },
    area: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    switchLabel: { color: colors.text, fontFamily: font.medium, fontSize: 15 },
    button: {
      marginTop: 16,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    section: { color: colors.text, fontFamily: font.bold, fontSize: 20, marginTop: 12, marginBottom: 10 },
    notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14, marginTop: 12 },
  });
}
