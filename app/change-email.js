import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { accountAction } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function ChangeEmailScreen() {
  const { email, refreshAccount } = useApp();
  const [next, setNext] = useState('');
  const [password, setPassword] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setError('');
    setBusy(true);
    const result = await accountAction('start-email-change', { email: next.trim(), current_password: password });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
    setNotice('Codes were sent to both addresses. Enter both.');
  }

  async function confirm() {
    setError('');
    setBusy(true);
    const result = await accountAction('confirm-email-change', {
      email: next.trim(),
      old_code: oldCode,
      new_code: newCode,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice('Email updated.');
    refreshAccount();
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Change email" back />
      <Text style={styles.lead}>Current address: {email}. A code goes to this address and to the new one.</Text>
      <Field label="New email" value={next} onChangeText={setNext} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Current password" value={password} onChangeText={setPassword} secureTextEntry />
      {sent ? (
        <>
          <Field label="Code from the current email" value={oldCode} onChangeText={setOldCode} keyboardType="number-pad" maxLength={6} />
          <Field label="Code from the new email" value={newCode} onChangeText={setNewCode} keyboardType="number-pad" maxLength={6} />
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable style={styles.button} onPress={sent ? confirm : send} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Working' : sent ? 'Confirm both codes' : 'Send codes'}</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} autoCorrect={false} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginHorizontal: 20, marginBottom: 16 },
  field: { marginHorizontal: 20, marginBottom: 14 },
  label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 6 },
  input: { height: 48, borderRadius: 14, backgroundColor: colors.card, color: colors.text, fontFamily: font.regular, fontSize: 16, paddingHorizontal: 14 },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20 },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20 },
  button: { marginHorizontal: 20, marginTop: 12, height: 50, borderRadius: 25, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
});
