import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { supabase } from '../src/lib/supabase';
import { rememberSignIn } from '../src/lib/pendingAuth';
import { colors, font } from '../src/theme';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    const address = email.trim();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    rememberSignIn(address, password);
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 20 }]}>
      <ScreenHeader title="Sign in" back />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Signing in' : 'Sign in'}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/sign-up')}>
        <Text style={styles.link}>Create an account</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  field: { marginHorizontal: 20, marginBottom: 14 },
  label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 10 },
  button: {
    marginHorizontal: 20,
    marginTop: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
  link: { color: colors.mint, fontFamily: font.medium, textAlign: 'center', marginTop: 18 },
});
