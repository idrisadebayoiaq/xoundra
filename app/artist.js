import { useEffect, useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { KeyboardScreen } from '../src/components/KeyboardScreen';
import { drainNotices, supabase } from '../src/lib/supabase';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

const tools = [
  { href: '/artist-upload', label: 'Upload', icon: 'cloud-upload-outline' },
  { href: '/artist-record', label: 'Record', icon: 'mic-outline' },
  { href: '/artist-bulletins', label: 'Bulletin', icon: 'chatbubbles-outline' },
  { href: '/artist-sounds', label: 'My sounds', icon: 'musical-notes-outline' },
  { href: '/artist-analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { href: '/edit-profile', label: 'Artist page', icon: 'person-outline' },
];

export default function ArtistScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const app = useApp();
  const [name, setName] = useState(app.artistName || app.firstName || '');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifyStatus, setVerifyStatus] = useState('');

  async function become() {
    const artist = name.trim();
    if (artist.length < 2) {
      setNotice('Add an artist name.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('become_artist', { p_name: artist });
    setBusy(false);
    if (error) {
      setNotice('Could not save that name.');
      return;
    }
    await app.refreshAccount();
    setNotice('');
  }

  useEffect(() => {
    if (!app.userId || !app.isArtist) return;
    if (app.artistVerified) {
      setVerifyStatus('verified');
      return;
    }
    supabase
      .from('artist_verification_requests')
      .select('status, admin_note')
      .eq('artist_id', app.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setVerifyStatus('');
        else if (data.status === 'pending') setVerifyStatus('pending');
        else if (data.status === 'rejected') setVerifyStatus(`rejected:${data.admin_note || ''}`);
        else if (data.status === 'approved') setVerifyStatus('verified');
      });
  }, [app.userId, app.isArtist, app.artistVerified]);

  async function applyVerify() {
    setBusy(true);
    const { error } = await supabase.rpc('apply_artist_verification', { p_note: verifyNote.trim() });
    setBusy(false);
    if (error) {
      if (/already_pending/i.test(error.message || '')) setNotice('Already waiting for review.');
      else if (/already_verified/i.test(error.message || '')) setNotice('Already verified.');
      else setNotice('Could not send request.');
      return;
    }
    setVerifyStatus('pending');
    setNotice('Request sent.');
    drainNotices();
  }

  if (!app.ready) return <View style={styles.screen} />;

  if (!app.isArtist) {
    return (
      <KeyboardScreen contentContainerStyle={styles.content}>
        <ScreenHeader title="Become an artist" back />
        <SurfaceCard style={styles.becomeCard}>
          <Text style={styles.becomeTitle}>Your artist name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name listeners see"
            placeholderTextColor={colors.muted}
            style={styles.input}
            accessibilityLabel="Artist name"
          />
          <Pressable onPress={become} disabled={busy} accessibilityLabel="Become an artist" style={styles.button}>
            <Text style={styles.buttonText}>{busy ? 'Saving' : 'Continue'}</Text>
          </Pressable>
        </SurfaceCard>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </KeyboardScreen>
    );
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <ScreenHeader title="Artist tools" back />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{app.artistName || 'Artist'}</Text>
        {app.artistVerified || verifyStatus === 'verified' ? (
          <View style={styles.verifiedPill}>
            <Ionicons name="checkmark-circle" size={16} color={colors.mintInk} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        {tools.map((item) => (
          <SurfaceCard key={item.href} style={styles.tool} onPress={() => router.push(item.href)} accessibilityLabel={item.label}>
            <View style={styles.icon}>
              <Ionicons name={item.icon} size={22} color={colors.mint} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </SurfaceCard>
        ))}
      </View>

      <SurfaceCard style={styles.verifyCard}>
        <Text style={styles.label}>Verification</Text>
        {app.artistVerified || verifyStatus === 'verified' ? (
          <Text style={styles.meta}>Green badge is live.</Text>
        ) : verifyStatus === 'pending' ? (
          <Text style={styles.meta}>Pending review.</Text>
        ) : (
          <>
            {verifyStatus.startsWith('rejected:') ? (
              <Text style={styles.notice}>{verifyStatus.slice('rejected:'.length) || 'Not approved yet.'}</Text>
            ) : null}
            <TextInput
              value={verifyNote}
              onChangeText={setVerifyNote}
              placeholder="Note for admin"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.area]}
              multiline
            />
            <Pressable onPress={applyVerify} disabled={busy} style={styles.button}>
              <Text style={styles.buttonText}>{busy ? 'Sending' : 'Apply'}</Text>
            </Pressable>
          </>
        )}
      </SurfaceCard>

      <Pressable
        style={styles.preview}
        onPress={() => router.push({ pathname: '/artist-page', params: { id: app.userId } })}
        accessibilityLabel="Preview public page"
      >
        <Text style={styles.previewText}>Preview public page</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.mint} />
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </KeyboardScreen>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40, paddingHorizontal: 20 },
    becomeCard: { marginTop: 8, gap: 12 },
    becomeTitle: { color: colors.text, fontFamily: font.bold, fontSize: 22 },
    hero: { marginBottom: 16, gap: 8 },
    heroTitle: { color: colors.text, fontFamily: font.bold, fontSize: 28 },
    verifiedPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.mint,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    verifiedText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    tool: { width: '47%', minHeight: 108, justifyContent: 'space-between', flexGrow: 1 },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    label: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    meta: { color: colors.muted, fontFamily: font.regular, fontSize: 14, marginTop: 6 },
    verifyCard: { marginBottom: 12, gap: 8 },
    input: {
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingHorizontal: 14,
    },
    area: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
    button: {
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    previewText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
    notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14, marginTop: 10 },
  });
}
