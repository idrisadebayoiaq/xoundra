import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { accountAction } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function DeleteAccountScreen() {
  const { signOut } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    setError('');
    const result = await accountAction('delete-account', { current_password: password });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await signOut();
    router.replace('/welcome');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Delete account" back />
      <Text style={styles.lead}>This removes the profile, favourites, playlists, and history. Enter the current password. You need to have signed in during the last 24 hours.</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" style={styles.input} placeholder="Current password" placeholderTextColor={colors.muted} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={remove} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Deleting' : 'Delete account'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginHorizontal: 20, marginBottom: 16 },
  input: { marginHorizontal: 20, height: 48, borderRadius: 14, backgroundColor: colors.card, color: colors.text, fontFamily: font.regular, fontSize: 16, paddingHorizontal: 14 },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginTop: 12 },
  button: { marginHorizontal: 20, marginTop: 18, height: 50, borderRadius: 25, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#1C1608', fontFamily: font.semibold, fontSize: 16 },
});
