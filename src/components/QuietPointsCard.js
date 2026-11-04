import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { useRewards } from '../state/RewardsState';

/** Profile balance card — total points, streak, spend. Claiming lives in the menu. */
export function QuietPointsCard({ onSpend }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { points, streakDays, downloadCredits } = useRewards();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glow = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.48] }),
    transform: [{
      scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
    }],
  };

  return (
    <Pressable
      style={styles.card}
      onPress={onSpend}
      accessibilityLabel={`${points} Quiet points. Spend points`}
    >
      <Animated.View style={[styles.glow, glow]} pointerEvents="none" />
      <View style={styles.orb} pointerEvents="none">
        <Ionicons name="leaf" size={18} color={colors.mintInk} />
      </View>
      <Text style={styles.eyebrow}>Quiet points</Text>
      <Text style={styles.balance}>{points}</Text>
      <Text style={styles.unit}>pts ready to spend</Text>
      <View style={styles.chips}>
        <View style={styles.chip}>
          <Ionicons name="flame-outline" size={14} color={colors.amber} />
          <Text style={styles.chipText}>
            {streakDays ? `${streakDays}-day streak` : 'Start a streak'}
          </Text>
        </View>
        {downloadCredits > 0 ? (
          <View style={styles.chip}>
            <Ionicons name="download-outline" size={14} color={colors.mint} />
            <Text style={styles.chipText}>
              {downloadCredits} credit{downloadCredits === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.ctaRow}>
        <Text style={styles.cta}>Spend points</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.mint} />
      </View>
    </Pressable>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 20,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
      minHeight: 168,
    },
    glow: {
      position: 'absolute',
      top: -40,
      right: -30,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.mint,
    },
    orb: {
      position: 'absolute',
      top: 18,
      right: 18,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    balance: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 48,
      letterSpacing: -1.5,
      marginTop: 8,
    },
    unit: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
      marginTop: 2,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.bg,
    },
    chipText: {
      color: colors.text,
      fontFamily: font.medium,
      fontSize: 12,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 18,
    },
    cta: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 15,
    },
  });
}
