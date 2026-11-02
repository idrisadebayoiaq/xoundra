import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';

/** Web banner slot — AdSense only; never touch AdMob. */
export function AdBanner({ premium = false, label = 'Sponsored' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (premium) return null;

  const adsenseClient = process.env.EXPO_PUBLIC_ADSENSE_CLIENT || '';
  const adsenseSlot = process.env.EXPO_PUBLIC_ADSENSE_SLOT || '';
  if (!adsenseClient) return null;

  return (
    <View style={styles.slot} accessibilityLabel={label}>
      <Text style={styles.caption}>{label}</Text>
      <View
        nativeID={adsenseSlot ? `adsense-${adsenseSlot}` : 'adsense-auto'}
        dataSet={{ adClient: adsenseClient, adSlot: adsenseSlot || '' }}
        style={styles.box}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    slot: {
      marginHorizontal: 20,
      marginVertical: 10,
      gap: 6,
      alignItems: 'center',
    },
    caption: {
      color: colors.muted,
      fontFamily: font.medium,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      alignSelf: 'flex-start',
    },
    box: {
      minHeight: 50,
      width: '100%',
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      overflow: 'hidden',
    },
  });
}
