import { ScrollView, StyleSheet, Text } from 'react-native';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, font } from '../src/theme';

export default function TermsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Terms and privacy" back />
      <Text style={styles.body}>
        Xoundra plays sounds for sleep, focus, and calm. An account is yours. Keep the password private. Premium features stay available while the plan is active. Deleting the account removes the profile, favourites, playlists, and history tied to it.
      </Text>
      <Text style={styles.body}>
        We store your name, country, email, and the sounds you save or play so the library can follow you. Payment details are handled by Paystack, not stored in the app. Support messages go to xoundra.support@gmail.com.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28, paddingHorizontal: 20, gap: 14 },
  body: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
});
