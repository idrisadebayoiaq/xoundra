import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { countries } from '../src/data/catalogue';
import { Dropdown } from '../src/components/Dropdown';
import { accountAction } from '../src/lib/supabase';
import { passwordProblems } from '../src/lib/password';
import { rememberSignIn } from '../src/lib/pendingAuth';
import { colors, font } from '../src/theme';

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('NG');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setNotice('');
    const problems = passwordProblems(password);
    if (!firstName.trim() || !email.trim() || problems.length) {
      setError(problems.length ? `Password needs: ${problems.join(', ')}.` : 'Add your name and email.');
      return;
    }
    setBusy(true);
    const result = await accountAction('signup', {
      email: email.trim(),
      password,
      first_name: firstName.trim(),
      country_code: country,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    rememberSignIn(email, password);
    router.replace({ pathname: '/confirm-email', params: { email: email.trim() } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Create account" back />
      <Field label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Text style={styles.hint}>8 characters, with uppercase, lowercase, a number, and a symbol.</Text>
      <View style={styles.country}>
        <Dropdown
          label="Country"
          value={country}
          options={countries.map((item) => ({ value: item.code, label: item.name }))}
          onChange={setCountry}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Creating account' : 'Create account'}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/sign-in')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        autoCorrect={false}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
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
  country: { marginHorizontal: 20, marginBottom: 16 },
  countries: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 20, marginBottom: 16 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  chipTextOn: { color: colors.mintInk },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 10 },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 10 },
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
  hint: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginHorizontal: 20, marginTop: -6, marginBottom: 12 },
});
