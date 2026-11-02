import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdRewardModal } from '../ads/AdRewardModal';
import { ensureMobileAds } from '../ads/mobileAds';
import {
  AD_COSTS,
  STORAGE_KEY,
  emptyUnlocks,
  featureWindowMs,
  isUnlockActive,
  premiumWindowMs,
} from '../ads/rewards';
import { setStreakAdWaiter } from '../ads/streakGate';
import {
  setPremiumAccessChecker,
  setSleepAccessChecker,
  setStudioAccessChecker,
  setUnlockRequester,
} from '../ads/unlockGate';

const AdContext = React.createContext(null);

export function AdProvider({ children, isPaidPremium = false }) {
  const [unlocks, setUnlocks] = React.useState(emptyUnlocks);
  const [session, setSession] = React.useState(null);
  const unlocksRef = React.useRef(unlocks);
  const paidRef = React.useRef(isPaidPremium);
  const pendingRef = React.useRef(null);
  unlocksRef.current = unlocks;
  paidRef.current = isPaidPremium;

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      try {
        const parsed = JSON.parse(raw || '{}');
        setUnlocks({ ...emptyUnlocks(), ...parsed });
      } catch {
        setUnlocks(emptyUnlocks());
      }
    }).catch(() => {});
    ensureMobileAds().catch(() => {});
  }, []);

  const persist = React.useCallback((next) => {
    setUnlocks(next);
    unlocksRef.current = next;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const hasPremiumAccess = React.useCallback(() => (
    paidRef.current || isUnlockActive(unlocksRef.current.premiumUntil)
  ), []);

  const hasSleepAccess = React.useCallback(() => (
    paidRef.current
    || isUnlockActive(unlocksRef.current.premiumUntil)
    || isUnlockActive(unlocksRef.current.sleepUntil)
  ), []);

  const hasStudioAccess = React.useCallback(() => (
    paidRef.current
    || isUnlockActive(unlocksRef.current.premiumUntil)
    || isUnlockActive(unlocksRef.current.studioUntil)
  ), []);

  const beginUnlock = React.useCallback((purpose) => new Promise((resolve) => {
    if (paidRef.current) {
      resolve(true);
      return;
    }
    if (purpose === 'premium24h' && isUnlockActive(unlocksRef.current.premiumUntil)) {
      resolve(true);
      return;
    }
    if (purpose === 'sleep' && hasSleepAccess()) {
      resolve(true);
      return;
    }
    if (purpose === 'studio' && hasStudioAccess()) {
      resolve(true);
      return;
    }
    const required = purpose === 'streak' ? 1 : (AD_COSTS[purpose] || 1);
    pendingRef.current = { resolve, purpose };
    setSession({ purpose, required });
  }), [hasSleepAccess, hasStudioAccess]);

  React.useEffect(() => {
    setUnlockRequester((purpose) => beginUnlock(purpose));
    setPremiumAccessChecker(() => hasPremiumAccess());
    setSleepAccessChecker(() => hasSleepAccess());
    setStudioAccessChecker(() => hasStudioAccess());
    setStreakAdWaiter(() => beginUnlock('streak'));
    return () => {
      setUnlockRequester(null);
      setPremiumAccessChecker(null);
      setSleepAccessChecker(null);
      setStudioAccessChecker(null);
      setStreakAdWaiter(null);
    };
  }, [beginUnlock, hasPremiumAccess, hasSleepAccess, hasStudioAccess]);

  const finishSession = React.useCallback((ok) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setSession(null);
    if (!ok) {
      pending?.resolve(false);
      return;
    }
    const purpose = pending?.purpose;
    const now = Date.now();
    if (purpose === 'premium24h') {
      persist({ ...unlocksRef.current, premiumUntil: now + premiumWindowMs() });
    } else if (purpose === 'sleep') {
      persist({ ...unlocksRef.current, sleepUntil: now + featureWindowMs() });
    } else if (purpose === 'studio') {
      persist({ ...unlocksRef.current, studioUntil: now + featureWindowMs() });
    } else if (purpose === 'streak') {
      persist({ ...unlocksRef.current, consecutivePlays: 0 });
    }
    pending?.resolve(true);
  }, [persist]);

  const value = {
    unlocks,
    premiumUntil: unlocks.premiumUntil,
    sleepUntil: unlocks.sleepUntil,
    studioUntil: unlocks.studioUntil,
    hasPremiumAccess: hasPremiumAccess(),
    hasSleepAccess: hasSleepAccess(),
    hasStudioAccess: hasStudioAccess(),
    requestUnlock: beginUnlock,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
      <AdRewardModal
        open={Boolean(session)}
        purpose={session?.purpose || 'streak'}
        required={session?.required || 1}
        onComplete={() => finishSession(true)}
        onCancel={() => finishSession(false)}
      />
    </AdContext.Provider>
  );
}

export function useAds() {
  const value = React.useContext(AdContext);
  if (!value) throw new Error('useAds must be used inside AdProvider');
  return value;
}
