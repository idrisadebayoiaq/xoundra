import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../state/AppState';
import { useMoments } from '../state/MomentsState';

const PREMIUM_KEY = 'xoundra-moment-premium';
const VERIFIED_KEY = 'xoundra-moment-verified';

/** Watches account flags and fires calm celebrations once. */
export function MomentWatchers() {
  const { premium, artistVerified, ready, userId } = useApp();
  const { showMoment } = useMoments();
  const primed = useRef(false);

  useEffect(() => {
    if (!ready || !userId) {
      primed.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const [seenPremium, seenVerified] = await Promise.all([
        AsyncStorage.getItem(`${PREMIUM_KEY}:${userId}`),
        AsyncStorage.getItem(`${VERIFIED_KEY}:${userId}`),
      ]);
      if (cancelled) return;
      // First load only seeds flags so we don't celebrate existing state
      if (!primed.current) {
        primed.current = true;
        if (premium && !seenPremium) AsyncStorage.setItem(`${PREMIUM_KEY}:${userId}`, '1').catch(() => {});
        if (artistVerified && !seenVerified) AsyncStorage.setItem(`${VERIFIED_KEY}:${userId}`, '1').catch(() => {});
        return;
      }
      if (premium && !seenPremium) {
        AsyncStorage.setItem(`${PREMIUM_KEY}:${userId}`, '1').catch(() => {});
        showMoment('premium', {
          title: 'Premium is on',
          body: 'Mixes, downloads, sleep schedules, and the Guide.',
        });
      }
      if (artistVerified && !seenVerified) {
        AsyncStorage.setItem(`${VERIFIED_KEY}:${userId}`, '1').catch(() => {});
        showMoment('verified', {
          title: 'You are verified',
          body: 'Listeners will see your green check.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId, premium, artistVerified, showMoment]);

  return null;
}
