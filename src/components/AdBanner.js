import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';

/**
 * Ad placeholder until AdMob / AdSense unit IDs are configured.
 *
 * Mobile (Expo): use a custom/dev client with `react-native-google-mobile-ads`
 * and set EXPO_PUBLIC_ADMOB_BANNER_ID + app.json android/ios googleMobileAdsAppId.
 *
 * Web: load AdSense with EXPO_PUBLIC_ADSENSE_CLIENT + EXPO_PUBLIC_ADSENSE_SLOT
 * (or inject via Vercel/host HTML). Do not paste private AdSense login secrets in the app.
 *
 * Premium users should not see ads — gate with `premium` from useApp().
 */
export function AdBanner({ premium = false, label = 'Sponsored' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bannerId = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || '';
  const adsenseClient = process.env.EXPO_PUBLIC_ADSENSE_CLIENT || '';
  const adsenseSlot = process.env.EXPO_PUBLIC_ADSENSE_SLOT || '';

  if (premium) return null;

  // Web: needs publisher client. Slot optional until a Display unit is created in AdSense.
  if (Platform.OS === 'web') {
    if (!adsenseClient) return null;
    return (
      <View style={styles.slot} accessibilityLabel={label}>
        <Text style={styles.caption}>{label}</Text>
        <View
          // Script is loaded from app/+html.js; this marks the unit mount point.
          nativeID={adsenseSlot ? `adsense-${adsenseSlot}` : 'adsense-auto'}
          dataSet={{ adClient: adsenseClient, adSlot: adsenseSlot || '', adFormat: adsenseSlot ? 'auto' : 'auto' }}
          style={styles.box}
        />
      </View>
    );
  }

  if (!bannerId) return null;
  return (
    <View style={styles.slot} accessibilityLabel={label}>
      <Text style={styles.caption}>{label}</Text>
      <View style={styles.box}>
        <Text style={styles.pending}>AdMob unit {bannerId.slice(0, 12)}…</Text>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    slot: {
      marginHorizontal: 20,
      marginVertical: 10,
      gap: 6,
    },
    caption: {
      color: colors.muted,
      fontFamily: font.medium,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    box: {
      minHeight: 50,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    pending: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 12,
    },
  });
}
