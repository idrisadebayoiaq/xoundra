/** Web stub — AdMob is native-only; AdSense handles web ads. */

export function adsConfigured() {
  return false;
}

export function bannerUnitId() {
  return '';
}

export function rewardedUnitId() {
  return '';
}

export function ensureMobileAds() {
  return Promise.resolve(false);
}

export async function showRewardedAd() {
  return false;
}
