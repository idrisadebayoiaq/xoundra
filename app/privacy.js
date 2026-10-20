import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, font } from '../src/theme';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Privacy" back />
      <Text style={styles.body}>
        Xoundra stores your name, country, and email, plus the sounds you save, like, and play, so the library can follow you. Payment card details stay with Paystack. Support messages go to xoundra.support@gmail.com.
      </Text>
      <Text style={styles.body}>
        A private playlist is visible only to you. A public playlist can be found by other listeners. Deleting the account removes the profile, favourites, playlists, and history tied to it.
      </Text>
      <Pressable onPress={() => router.push('/terms')} style={styles.row}>
        <Text style={styles.label}>Terms and privacy</Text>
        <Text style={styles.value}>Read</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/delete-account')} style={styles.row}>
        <Text style={styles.label}>Delete account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28, paddingHorizontal: 20, gap: 14 },
  body: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { color: colors.text, fontFamily: font.medium, fontSize: 16 },
  value: { color: colors.muted, fontFamily: font.regular, fontSize: 14 },
});
