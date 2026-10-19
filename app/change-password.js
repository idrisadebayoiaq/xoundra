import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { accountAction } from '../src/lib/supabase';
import { passwordProblems } from '../src/lib/password';
import { colors, font } from '../src/theme';

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    const problems = passwordProblems(next);
    if (!current || problems.length || next !== again) {
      setError(problems.length ? `Password needs: ${problems.join(', ')}.` : 'The new passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await accountAction('change-password', { current_password: current, password: next });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice('Password updated.');
    setCurrent('');
    setNext('');
    setAgain('');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Change password" back />
      <Text style={styles.lead}>Enter the current password. This stays available for 24 hours after you sign in.</Text>
      <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
      <Field label="New password" value={next} onChangeText={setNext} secureTextEntry />
      <Field label="Repeat new password" value={again} onChangeText={setAgain} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable style={styles.button} onPress={save} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Saving' : 'Update password'}</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} autoCapitalize="none" autoCorrect={false} placeholderTextColor={colors.muted} style={styles.input} />
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
