import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { accountAction } from '../src/lib/supabase';
import { colors, font } from '../src/theme';

export default function SupportScreen() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError('');
    const result = await accountAction('support', { message });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage('');
    setNotice('Sent to xoundra.support@gmail.com.');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Support" back />
      <Text style={styles.lead}>Write to Xoundra. Replies come from xoundra.support@gmail.com.</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        placeholder="What do you need?"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable style={styles.button} onPress={send} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Sending' : 'Send'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginHorizontal: 20, marginBottom: 16 },
  input: {
    marginHorizontal: 20,
    minHeight: 140,
    borderRadius: 16,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    padding: 14,
    textAlignVertical: 'top',
  },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginTop: 12 },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginTop: 12 },
  button: { marginHorizontal: 20, marginTop: 16, height: 50, borderRadius: 25, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
});
