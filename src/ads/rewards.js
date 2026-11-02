export const AD_COSTS = {
  download: 3,
  premium24h: 7,
  sleep: 5,
  studio: 5,
};

export const AD_LABELS = {
  download: 'Download this sound',
  premium24h: 'Premium features for 24 hours',
  sleep: 'Sleep timer',
  studio: 'Studio',
  streak: 'Continue listening',
};

export const STREAK_LIMIT = 5;

export const STORAGE_KEY = 'xoundra-ad-unlocks';

export function emptyUnlocks() {
  return {
    premiumUntil: 0,
    sleepUntil: 0,
    studioUntil: 0,
    consecutivePlays: 0,
  };
}

export function isUnlockActive(until) {
  return Number(until || 0) > Date.now();
}

export function premiumWindowMs() {
  return 24 * 60 * 60 * 1000;
}

export function featureWindowMs() {
  return 24 * 60 * 60 * 1000;
}
