import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Privacy policy" back />
      <Text style={styles.updated}>Last updated: 2 November 2026</Text>

      <Text style={styles.h}>1. Who we are</Text>
      <Text style={styles.body}>
        Xoundra (“we”, “us”) provides ambient sound for sleep, focus, and calm through the Xoundra mobile app and website. This policy explains what information we collect, how we use it, and the choices you have. Support: xoundra.support@gmail.com.
      </Text>

      <Text style={styles.h}>2. Information we collect</Text>
      <Text style={styles.body}>
        Account details you give us: first name, email address, country, and what you come to Xoundra for (for example sleep or focus). If you become an artist, we also store your artist name, bio, location, tagline, focus, website, social links, avatar, and banner.
      </Text>
      <Text style={styles.body}>
        Usage data: the sounds you play, save, like, download, and mix; playlists you create; listening history; sleep schedules; Guide conversations you start; and onboarding sound picks. We keep counts that help recommendations and artist analytics.
      </Text>
      <Text style={styles.body}>
        Device and delivery data: push notification tokens on phones where you allow notifications, network type for download settings, and basic app diagnostics needed to keep playback working.
      </Text>
      <Text style={styles.body}>
        Payments: card numbers and payment secrets are handled by Paystack. We store plan status, purchase references, and limited card metadata (such as last four digits) only as needed to renew or show your plan.
      </Text>

      <Text style={styles.h}>3. How we use information</Text>
      <Text style={styles.body}>
        We use your information to create and secure your account, play and personalise sounds, save your library, process Premium plans, send transactional email (codes, welcome, plan updates), and — if you leave check-in emails on — occasional Good morning / Good evening messages asking how Xoundra is helping you.
      </Text>
      <Text style={styles.body}>
        We use listening and preference data to recommend sounds, power the Guide within the catalogue you may hear, and show artists how their sounds are doing. We do not sell your personal information.
      </Text>

      <Text style={styles.h}>4. Sharing</Text>
      <Text style={styles.body}>
        We share data with service providers that help us run Xoundra: Supabase (database, auth, storage), Paystack (payments), OpenRouter (Guide replies, called only from our servers), email delivery for account and check-in messages, and Firebase / Expo for push on supported devices. Public artist pages show the details you publish. Public playlists can be found by other listeners; private playlists stay with you.
      </Text>

      <Text style={styles.h}>5. Retention</Text>
      <Text style={styles.body}>
        We keep account and library data while your account exists. Listening history and similar activity may be trimmed for performance. After you delete your account, we remove the profile and tied library data from active systems, subject to short backups and legal retention where required (for example payment records).
      </Text>

      <Text style={styles.h}>6. Your choices</Text>
      <Text style={styles.body}>
        In Settings you can change appearance, country, notification and check-in email preferences, clear listening history, delete AI chats, manage downloads, and open Privacy or Terms. You can update profile details from Edit profile, change email or password, and delete your account. You may email xoundra.support@gmail.com to ask questions about your data.
      </Text>

      <Text style={styles.h}>7. Security</Text>
      <Text style={styles.body}>
        We use industry-standard protections including encrypted transport (HTTPS), access controls on our database, and server-side handling of payment and AI keys. No method of transmission or storage is perfectly secure; please keep your password private.
      </Text>

      <Text style={styles.h}>8. Children</Text>
      <Text style={styles.body}>
        Xoundra is not directed at children under 13 (or the minimum age required in your country). We do not knowingly collect personal information from children. If you believe a child has created an account, contact us and we will take appropriate steps.
      </Text>

      <Text style={styles.h}>9. Changes</Text>
      <Text style={styles.body}>
        We may update this policy as Xoundra grows. We will revise the date above and, when changes are material, provide a reasonable notice in the app or by email.
      </Text>

      <Text style={styles.h}>10. Contact</Text>
      <Text style={styles.body}>
        Questions about privacy: xoundra.support@gmail.com.
      </Text>

      <Pressable onPress={() => router.push('/terms')} style={styles.row}>
        <Text style={styles.label}>Terms of service</Text>
        <Text style={styles.value}>Read</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/delete-account')} style={styles.row}>
        <Text style={styles.label}>Delete account</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 36, paddingHorizontal: 20, gap: 10 },
    updated: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginBottom: 6 },
    h: { color: colors.text, fontFamily: font.semibold, fontSize: 16, marginTop: 12 },
    body: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
    row: {
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    label: { color: colors.text, fontFamily: font.medium, fontSize: 16 },
    value: { color: colors.mint, fontFamily: font.medium, fontSize: 14 },
  });
}
