import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { bannerUnitId } from '../ads/mobileAds';

/** Native AdMob banner — fails soft so a missing/failed ad never crashes the screen. */
export function AdBanner({ premium = false, label = 'Sponsored' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const unit = bannerUnitId();

  if (premium || !unit) return null;

  return (
    <View style={styles.slot} accessibilityLabel={label}>
      <Text style={styles.caption}>{label}</Text>
      <NativeBanner unit={unit} fallbackStyle={styles.box} />
    </View>
  );
}

function NativeBanner({ unit, fallbackStyle }) {
  const [sdk, setSdk] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    try {
      const mod = require('react-native-google-mobile-ads');
      if (alive) setSdk(mod);
    } catch {
      if (alive) setFailed(true);
    }
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;
  if (!sdk?.BannerAd || !sdk?.BannerAdSize) {
    return <View style={fallbackStyle} />;
  }

  const { BannerAd, BannerAdSize } = sdk;
  return (
    <BannerAd
      unitId={unit}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdFailedToLoad={() => setFailed(true)}
    />
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
