import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';

export default function TermsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Terms of service" back />
      <Text style={styles.updated}>Last updated: 2 November 2026</Text>

      <Text style={styles.h}>1. Agreement</Text>
      <Text style={styles.body}>
        These Terms of Service (“Terms”) govern your use of Xoundra’s apps, website, and related services (“Xoundra”). By creating an account or using Xoundra, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the service.
      </Text>

      <Text style={styles.h}>2. The service</Text>
      <Text style={styles.body}>
        Xoundra offers ambient and nature sounds for sleep, focus, relaxation, and calm. Features may include browsing and playback, playlists, favourites, an AI Guide constrained to our catalogue, Studio mixes, sleep timers, offline downloads, artist tools, and Premium plans. We may change, add, or remove features as we improve the product.
      </Text>

      <Text style={styles.h}>3. Accounts</Text>
      <Text style={styles.body}>
        You must provide accurate information and keep your password confidential. You are responsible for activity on your account. Notify us at xoundra.support@gmail.com if you believe someone else has access. We may suspend or close accounts that break these Terms, abuse the service, or put other users at risk.
      </Text>

      <Text style={styles.h}>4. Free and Premium</Text>
      <Text style={styles.body}>
        Free listeners can use the core catalogue within Free access rules. Premium unlocks features described in the app (such as Studio mixes, offline downloads, scheduled listening, and expanded Guide use) for as long as your plan stays active. Prices and plan names are shown on the Plans screen and may vary by country. Founding Lifetime and other limited offers, when available, follow the terms stated at purchase.
      </Text>

      <Text style={styles.h}>5. Payments and renewals</Text>
      <Text style={styles.body}>
        Payments are processed by Paystack. By buying a plan you authorise charges in the currency and amount shown at checkout. Subscription plans renew unless cancelled or a saved card is removed before renewal. Lifetime purchases do not renew. Taxes or bank fees may apply depending on your provider. Refund requests are handled according to applicable law and our support process.
      </Text>

      <Text style={styles.h}>6. Acceptable use</Text>
      <Text style={styles.body}>
        You may use Xoundra for personal, non-commercial listening unless you are an approved artist using creator tools. You must not reverse engineer the service, scrape content at scale, bypass paywalls or access controls, upload unlawful or infringing audio, harass others, or use the Guide as a medical, legal, or crisis service. The Guide is a sound companion, not a therapist or clinician.
      </Text>

      <Text style={styles.h}>7. Artists and uploads</Text>
      <Text style={styles.body}>
        If you publish sounds as an artist, you confirm you have the rights to the audio and artwork you upload, and you grant Xoundra a worldwide licence to host, stream, display, and promote that content inside the service. You remain the owner of your content. We may remove material that infringes rights, breaks law, or harms the product. Payouts, if offered later, will follow separate artist terms.
      </Text>

      <Text style={styles.h}>8. Intellectual property</Text>
      <Text style={styles.body}>
        Xoundra’s brand, software, design, and catalogue packaging are owned by us or our licensors. Sounds in the catalogue are licensed for streaming and, where Premium allows, offline listening inside the app — not for redistribution, public performance outside Xoundra, or training unrelated AI systems without permission.
      </Text>

      <Text style={styles.h}>9. Availability</Text>
      <Text style={styles.body}>
        We aim for reliable playback but do not guarantee uninterrupted service. Network conditions, device limits, store policies, and maintenance can affect features. Scheduled listening on Android may not start if the app was force-stopped by the system or user.
      </Text>

      <Text style={styles.h}>10. Disclaimers</Text>
      <Text style={styles.body}>
        Xoundra is provided “as is” to the fullest extent permitted by law. We do not warrant that the service will meet every personal wellness goal or that Guide replies will always be perfect. Sounds and suggestions are for comfort and focus, not medical treatment.
      </Text>

      <Text style={styles.h}>11. Limitation of liability</Text>
      <Text style={styles.body}>
        To the maximum extent allowed by law, Xoundra and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill arising from your use of the service. Our total liability for any claim relating to Xoundra is limited to the greater of (a) the amounts you paid us for Premium in the three months before the claim or (b) twenty US dollars (or local equivalent).
      </Text>

      <Text style={styles.h}>12. Termination</Text>
      <Text style={styles.body}>
        You may stop using Xoundra and delete your account in Settings. We may end or restrict access if you violate these Terms. Provisions that should survive (including intellectual property, disclaimers, and limitations) remain in effect.
      </Text>

      <Text style={styles.h}>13. Changes to these Terms</Text>
      <Text style={styles.body}>
        We may update these Terms. Continued use after an update means you accept the revised Terms, except where local law requires a different process. The date at the top shows the latest revision.
      </Text>

      <Text style={styles.h}>14. Contact</Text>
      <Text style={styles.body}>
        Questions about these Terms: xoundra.support@gmail.com.
      </Text>
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
  });
}
