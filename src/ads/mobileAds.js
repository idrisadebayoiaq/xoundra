import { Platform } from 'react-native';

const ANDROID_APP_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-9287775024440500~8194705195';
const REWARDED_UNIT = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || 'ca-app-pub-9287775024440500/5587676974';
const BANNER_UNIT = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || 'ca-app-pub-9287775024440500/2961513637';

let ready = false;
let initPromise = null;

export function adsConfigured() {
  return Platform.OS !== 'web' && Boolean(ANDROID_APP_ID && REWARDED_UNIT);
}

export function bannerUnitId() {
  return BANNER_UNIT;
}

export function rewardedUnitId() {
  return REWARDED_UNIT;
}

/** Initialize the native Mobile Ads SDK once (no-op on web / missing config). */
export function ensureMobileAds() {
  if (Platform.OS === 'web') return Promise.resolve(false);
  if (ready) return Promise.resolve(true);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const mobileAds = (await import('react-native-google-mobile-ads')).default;
      await mobileAds().initialize();
      ready = true;
      return true;
    } catch {
      ready = false;
      return false;
    }
  })();
  return initPromise;
}

/**
 * Shows one rewarded unit. Resolves true only when the user earns the reward.
 * Falls back to false if the SDK/unit is unavailable (caller may use placeholder).
 */
export async function showRewardedAd() {
  if (Platform.OS === 'web' || !REWARDED_UNIT) return false;
  const ok = await ensureMobileAds();
  if (!ok) return false;

  const { RewardedAd, RewardedAdEventType, AdEventType } = await import('react-native-google-mobile-ads');

  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      try { unsubLoad(); } catch { /* */ }
      try { unsubEarn(); } catch { /* */ }
      try { unsubClose(); } catch { /* */ }
      try { unsubError(); } catch { /* */ }
      resolve(value);
    };

    const rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['music', 'ambient', 'sleep', 'focus'],
    });

    const unsubLoad = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show().catch(() => finish(false));
    });
    const unsubEarn = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClose = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      finish(earned);
    });
    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
      finish(false);
    });

    rewarded.load();
    setTimeout(() => finish(false), 45000);
  });
}
