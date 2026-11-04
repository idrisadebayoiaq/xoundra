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
  {
    href: '/artist-upload',
    label: 'Upload sounds',
    copy: 'Publish a file, or several as an album. Studio Assist can draft copy.',
    icon: 'cloud-upload-outline',
  },
  {
    href: '/artist-record',
    label: 'Record sound',
    copy: 'Capture a field take in the app, then publish. Editing comes later.',
    icon: 'mic-outline',
  },
  {
    href: '/artist-bulletins',
    label: 'Bulletin',
    copy: 'Updates for people who follow you.',
    icon: 'newspaper-outline',
  },
  {
    href: '/artist-sounds',
    label: 'My sounds',
    copy: 'Singles and albums you have published.',
    icon: 'musical-notes-outline',
  },
  {
    href: '/artist-analytics',
    label: 'Analytics',
    copy: 'Plays, likes, favorites, notes, and follows.',
    icon: 'stats-chart-outline',
  },
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
      if (/already_pending/i.test(error.message || '')) setNotice('Your request is already waiting for review.');
      else if (/already_verified/i.test(error.message || '')) setNotice('You are already verified.');
      else setNotice('Could not send the verification request.');
      return;
    }
    setVerifyStatus('pending');
    setNotice('Request sent. Admin will review your catalogue.');
    drainNotices();
  }

  if (!app.ready) return <View style={styles.screen} />;

  if (!app.isArtist) {
    return (
      <KeyboardScreen contentContainerStyle={styles.content}>
        <ScreenHeader title="Become an artist" back />
        <Text style={styles.lead}>Choose the name listeners should see. You can upload or record straight away.</Text>
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
      </KeyboardScreen>
    );
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <ScreenHeader title="Artist" back />
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Studio</Text>
        <Text style={styles.heroTitle}>{app.artistName || 'Your catalogue'}</Text>
        <Text style={styles.lead}>
          One job per tool — upload files, record in the field, run your Bulletin, then read how listeners respond.
        </Text>
        {app.artistVerified || verifyStatus === 'verified' ? (
          <View style={styles.verifiedPill}>
            <Ionicons name="checkmark-circle" size={16} color={colors.mintInk} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.section}>Create</Text>
      {tools.slice(0, 2).map((item) => (
        <SurfaceCard key={item.href} style={styles.row} onPress={() => router.push(item.href)} accessibilityLabel={item.label}>
          <View style={styles.icon}>
            <Ionicons name={item.icon} size={22} color={colors.mint} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.copyText}>{item.copy}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </SurfaceCard>
      ))}

      <Text style={styles.section}>Manage</Text>
      {tools.slice(2).map((item) => (
        <SurfaceCard key={item.href} style={styles.row} onPress={() => router.push(item.href)} accessibilityLabel={item.label}>
          <View style={styles.icon}>
            <Ionicons name={item.icon} size={22} color={colors.mint} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.copyText}>{item.copy}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </SurfaceCard>
      ))}

      <SurfaceCard style={styles.verifyCard}>
        <Text style={styles.label}>Verified green badge</Text>
        {app.artistVerified || verifyStatus === 'verified' ? (
          <Text style={styles.copyText}>Listeners see your green check on your public page.</Text>
        ) : verifyStatus === 'pending' ? (
          <Text style={styles.copyText}>Your free request is with admin for review.</Text>
        ) : (
          <>
            <Text style={styles.copyText}>Apply free. Admin reviews profile and analytics.</Text>
            {verifyStatus.startsWith('rejected:') ? (
              <Text style={styles.notice}>Last decision: {verifyStatus.slice('rejected:'.length) || 'Not approved yet.'}</Text>
            ) : null}
            <TextInput
              value={verifyNote}
              onChangeText={setVerifyNote}
              placeholder="Optional note for admin"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.area]}
              multiline
            />
            <Pressable onPress={applyVerify} disabled={busy} style={styles.button}>
              <Text style={styles.buttonText}>{busy ? 'Sending' : 'Apply for verification'}</Text>
            </Pressable>
          </>
        )}
      </SurfaceCard>

      <Pressable
        style={styles.public}
        onPress={() => router.push({ pathname: '/artist-page', params: { id: app.userId } })}
        accessibilityLabel="Open public page"
      >
        <Text style={styles.publicText}>Preview public page</Text>
      </Pressable>

      <Text style={styles.later}>Earning stays later. Quiet points stay in-app until payouts are ready.</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </KeyboardScreen>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 48, paddingHorizontal: 20 },
    hero: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: 18,
      gap: 6,
    },
    heroEyebrow: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    heroTitle: { color: colors.text, fontFamily: font.bold, fontSize: 26, letterSpacing: -0.6 },
    lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
    verifiedPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.mint,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: 6,
    },
    verifiedText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 12 },
    section: { color: colors.text, fontFamily: font.bold, fontSize: 18, marginBottom: 10, marginTop: 4 },
    input: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 8,
    },
    area: { minHeight: 88, textAlignVertical: 'top' },
    button: {
      alignSelf: 'flex-start',
      backgroundColor: colors.mint,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingVertical: 12,
      marginTop: 10,
    },
    buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1 },
    label: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    copyText: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
    verifyCard: { marginTop: 12, gap: 6 },
    public: { alignSelf: 'flex-start', marginTop: 14 },
    publicText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
    later: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 19, marginTop: 16 },
    notice: { color: colors.amber, fontFamily: font.regular, fontSize: 14, marginTop: 12 },
  });
}
