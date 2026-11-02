import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { AD_LABELS } from './rewards';
import { adsConfigured, showRewardedAd } from './mobileAds';

const AD_SECONDS = 5;

/**
 * Free-user unlock flow only. Paid Premium never opens this modal (AdState gates).
 * Native: real AdMob rewarded units. Web / missing SDK: short placeholder so unlocks stay testable.
 */
export function AdRewardModal({ open, purpose, required = 1, onComplete, onCancel }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(AD_SECONDS);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const timer = useRef(null);
  const useNative = Platform.OS !== 'web' && adsConfigured();

  useEffect(() => {
    if (!open) {
      clearInterval(timer.current);
      setIndex(0);
      setSecondsLeft(AD_SECONDS);
      setPlaying(false);
      setBusy(false);
      setNotice('');
      return undefined;
    }
    setIndex(0);
    setSecondsLeft(AD_SECONDS);
    setPlaying(false);
    setBusy(false);
    setNotice('');
    return () => clearInterval(timer.current);
  }, [open, purpose, required]);

  const advanceAfterReward = () => {
    const next = index + 1;
    setPlaying(false);
    setBusy(false);
    if (next >= required) {
      onComplete?.();
      return;
    }
    setIndex(next);
    setSecondsLeft(AD_SECONDS);
    setNotice('');
  };

  useEffect(() => {
    if (!open || !playing || useNative) return undefined;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          clearInterval(timer.current);
          advanceAfterReward();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [open, playing, useNative, required]);

  async function watch() {
    if (busy || playing) return;
    setNotice('');
    if (useNative) {
      setBusy(true);
      const earned = await showRewardedAd();
      if (!earned) {
        setBusy(false);
        setNotice('The ad did not finish. Try again, or Not now.');
        return;
      }
      advanceAfterReward();
      return;
    }
    setSecondsLeft(AD_SECONDS);
    setPlaying(true);
  }

  if (!open) return null;
  const label = AD_LABELS[purpose] || 'Continue';
  const unitHint = useNative
    ? 'AdMob rewarded ad'
    : Platform.OS === 'web'
      ? 'Web unlock preview — install the app for live ads'
      : 'AdMob not ready — preview countdown';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={busy || playing ? undefined : onCancel}>
      <View style={[styles.scrim, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Watch to unlock</Text>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.lead}>
            Free plan · ad {Math.min(index + 1, required)} of {required}
          </Text>

          <View style={styles.stage}>
            {playing || busy ? (
              <>
                {!useNative && playing ? <Text style={styles.countdown}>{secondsLeft}</Text> : null}
                <Text style={styles.stageHint}>{busy ? 'Opening ad…' : 'Ad playing…'}</Text>
              </>
            ) : (
              <>
                <Ionicons name="play-circle" size={42} color={colors.mint} />
                <Text style={styles.stageHint}>{unitHint}</Text>
              </>
            )}
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Pressable
            style={[styles.primary, (busy || playing) && styles.primaryOff]}
            disabled={busy || playing}
            onPress={watch}
            accessibilityLabel={busy || playing ? 'Ad playing' : 'Watch ad'}
          >
            <Text style={styles.primaryText}>
              {busy || playing ? 'Watching…' : index === 0 ? 'Watch ad' : 'Watch next ad'}
            </Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel} disabled={busy || playing} accessibilityLabel="Cancel">
            <Text style={[styles.cancelText, (busy || playing) && styles.cancelOff]}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.bg,
      borderRadius: 22,
      padding: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      gap: 10,
    },
    kicker: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 24,
    },
    lead: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
      marginBottom: 6,
    },
    stage: {
      minHeight: 140,
      borderRadius: 16,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginVertical: 8,
    },
    countdown: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 40,
    },
    stageHint: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    notice: {
      color: colors.amber,
      fontFamily: font.regular,
      fontSize: 13,
    },
    primary: {
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryOff: { opacity: 0.7 },
    primaryText: {
      color: colors.mintInk,
      fontFamily: font.semibold,
      fontSize: 16,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    cancelText: {
      color: colors.muted,
      fontFamily: font.medium,
      fontSize: 14,
    },
    cancelOff: { opacity: 0.4 },
  });
}
