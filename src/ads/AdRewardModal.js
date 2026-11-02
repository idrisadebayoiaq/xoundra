import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { AD_LABELS } from './rewards';

const AD_SECONDS = 5;

/**
 * Plays a sequence of rewarded units for free-user unlocks.
 * When AdMob/AdSense unit IDs exist, swap the placeholder player for the real SDK.
 * Until then, a short countdown stands in so the unlock flow can be tested end-to-end.
 */
export function AdRewardModal({ open, purpose, required = 1, onComplete, onCancel }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(AD_SECONDS);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!open) {
      clearInterval(timer.current);
      setIndex(0);
      setSecondsLeft(AD_SECONDS);
      setPlaying(false);
      return undefined;
    }
    setIndex(0);
    setSecondsLeft(AD_SECONDS);
    setPlaying(false);
    return () => clearInterval(timer.current);
  }, [open, purpose, required]);

  useEffect(() => {
    if (!open || !playing) return undefined;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          clearInterval(timer.current);
          const next = index + 1;
          if (next >= required) {
            setPlaying(false);
            onComplete?.();
            return 0;
          }
          setIndex(next);
          setPlaying(false);
          return AD_SECONDS;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [open, playing, index, required, onComplete]);

  if (!open) return null;
  const label = AD_LABELS[purpose] || 'Continue';
  const unitHint = Platform.OS === 'web'
    ? (process.env.EXPO_PUBLIC_ADSENSE_SLOT ? 'AdSense slot ready' : 'AdSense unit pending — placeholder ad')
    : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ? 'AdMob rewarded ready' : 'AdMob unit pending — placeholder ad');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Watch to unlock</Text>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.lead}>
            Free plan · ad {Math.min(index + 1, required)} of {required}
          </Text>

          <View style={styles.stage}>
            {playing ? (
              <>
                <Text style={styles.countdown}>{secondsLeft}</Text>
                <Text style={styles.stageHint}>Ad playing…</Text>
              </>
            ) : (
              <>
                <Ionicons name="play-circle" size={42} color={colors.mint} />
                <Text style={styles.stageHint}>{unitHint}</Text>
              </>
            )}
          </View>

          <Pressable
            style={[styles.primary, playing && styles.primaryOff]}
            disabled={playing}
            onPress={() => {
              setSecondsLeft(AD_SECONDS);
              setPlaying(true);
            }}
            accessibilityLabel={playing ? 'Ad playing' : 'Watch ad'}
          >
            <Text style={styles.primaryText}>{playing ? 'Watching…' : index === 0 ? 'Watch ad' : 'Watch next ad'}</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel} disabled={playing} accessibilityLabel="Cancel">
            <Text style={[styles.cancelText, playing && styles.cancelOff]}>Not now</Text>
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
