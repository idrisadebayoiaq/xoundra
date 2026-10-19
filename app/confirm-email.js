import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { accountAction, supabase } from '../src/lib/supabase';
import { clearPendingAuth, passwordFor } from '../src/lib/pendingAuth';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function ConfirmEmailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { email: signedInEmail, signOut, adoptSession } = useApp();
  const paramEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const email = paramEmail || signedInEmail;
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function enterApp(tokenHash) {
    if (tokenHash) {
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
      if (!otpError) {
        const done = await adoptSession();
        clearPendingAuth();
        setBusy(false);
        router.replace(done ? '/' : '/listen-tip');
        return true;
      }
    }
    const password = passwordFor(email);
    if (!password) return false;
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return false;
    const done = await adoptSession();
    clearPendingAuth();
    setBusy(false);
    router.replace(done ? '/' : '/listen-tip');
    return true;
  }

  async function submit() {
    setError('');
    setNotice('');
    setBusy(true);
    const result = await accountAction('verify-signup', { email, code });
    if (result.ok) {
      const entered = await enterApp(result.data?.token_hash);
      if (entered) return;
      setBusy(false);
      setNotice('Email confirmed. Sign in with your password.');
      setTimeout(() => router.replace('/sign-in'), 700);
      return;
    }
    if (result.code === 'already_confirmed') {
      const entered = await enterApp('');
      if (entered) return;
      setBusy(false);
      setNotice(result.error);
      setTimeout(() => router.replace('/sign-in'), 700);
      return;
    }
    setBusy(false);
    setError(result.error);
  }

  async function resend() {
    setError('');
    const result = await accountAction('resend-signup', { email });
    setNotice(result.ok ? 'A new code is on its way.' : result.error);
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 20 }]}>
      <ScreenHeader title="Confirm email" />
      <Text style={styles.lead}>Enter the 6-digit code sent to {email || 'your email'} from Xoundra.</Text>
      <TextInput
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.code}
        placeholder="000000"
        placeholderTextColor={colors.muted}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable style={styles.button} onPress={submit} disabled={busy || code.length !== 6}>
        <Text style={styles.buttonText}>{busy ? 'Checking' : 'Confirm'}</Text>
      </Pressable>
      <Pressable onPress={resend}><Text style={styles.link}>Send a new code</Text></Pressable>
      <Pressable onPress={async () => { await signOut(); router.replace('/welcome'); }}><Text style={styles.link}>Use a different account</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginHorizontal: 20, marginBottom: 16 },
  code: {
    marginHorizontal: 20,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.card,
    color: colors.mint,
    fontFamily: font.bold,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginTop: 12 },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginTop: 12 },
  button: {
    marginHorizontal: 20,
    marginTop: 18,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
  link: { color: colors.mint, fontFamily: font.medium, textAlign: 'center', marginTop: 16 },
});
