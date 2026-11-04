import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { useApp } from '../state/AppState';
import { useRewards } from '../state/RewardsState';
import { openFromMenu } from '../lib/navigation';
import { PointsSpendModal } from './PointsSpendModal';

const links = [
  { label: 'Evening', icon: 'moon-outline', href: '/sleep' },
  { label: 'Guide', icon: 'mic-outline', href: '/guide' },
  { label: 'Support', icon: 'help-circle-outline', href: '/support' },
];

export function HomeMenu({ open, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { premium } = useApp();
  const { points, dailyClaimed, earn, claimDailySignIn } = useRewards();
  const [spendOpen, setSpendOpen] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open || dailyClaimed) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dailyClaimed, open, pulse]);

  useEffect(() => {
    if (!open) setJustClaimed(false);
  }, [open]);

  function go(href) {
    onClose?.();
    setTimeout(() => openFromMenu(href), 40);
  }

  function claim() {
    if (dailyClaimed) return;
    if (claimDailySignIn()) setJustClaimed(true);
  }

  const claimScale = {
    transform: [{
      scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }),
    }],
  };
  const claimGlow = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
  };

  return (
    <>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu">
          <Pressable
            style={[styles.sheet, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) }]}
            onPress={(event) => event.stopPropagation?.()}
          >
            <View style={styles.head}>
              <Text style={styles.title}>Menu</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {dailyClaimed ? (
              <View style={styles.claimDone}>
                <View style={styles.claimDoneIcon}>
                  <Ionicons name="checkmark" size={18} color={colors.mint} />
                </View>
                <View style={styles.claimCopy}>
                  <Text style={styles.claimDoneTitle}>
                    {justClaimed ? `+${earn.dailySignIn} claimed` : "Today's check-in done"}
                  </Text>
                  <Text style={styles.claimHint}>{points} Quiet points · back tomorrow</Text>
                </View>
              </View>
            ) : (
              <Animated.View style={claimScale}>
                <Pressable
                  style={styles.claim}
                  onPress={claim}
                  accessibilityLabel={`Claim today's ${earn.dailySignIn} Quiet points`}
                >
                  <Animated.View style={[styles.claimAura, claimGlow]} pointerEvents="none" />
                  <View style={styles.claimIcon}>
                    <Ionicons name="gift-outline" size={22} color={colors.mintInk} />
                  </View>
                  <View style={styles.claimCopy}>
                    <Text style={styles.claimTitle}>Daily check-in</Text>
                    <Text style={styles.claimHint}>Tap to claim today's Quiet points</Text>
                  </View>
                  <Text style={styles.claimPts}>+{earn.dailySignIn}</Text>
                </Pressable>
              </Animated.View>
            )}

            <Pressable
              style={styles.spendRow}
              onPress={() => setSpendOpen(true)}
              accessibilityLabel="Spend Quiet points"
            >
              <Ionicons name="leaf-outline" size={20} color={colors.mint} />
              <Text style={styles.spendLabel}>Spend Quiet points</Text>
              <Text style={styles.spendPts}>{points}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            <Pressable style={styles.tier} onPress={() => go('/plans')} accessibilityLabel="Subscription">
              <View style={[styles.badge, !premium && styles.badgeFree]}>
                <Text style={[styles.badgeText, !premium && styles.badgeTextFree]}>
                  {premium ? 'Premium' : 'Free'}
                </Text>
              </View>
              <View style={styles.tierCopy}>
                <Text style={styles.tierLabel}>Subscription</Text>
                <Text style={styles.tierHint}>{premium ? 'Manage your plan' : 'Upgrade for mixes, downloads, and more'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            {links.map((item) => (
              <Pressable key={item.href} style={styles.row} onPress={() => go(item.href)} accessibilityLabel={item.label}>
                <Ionicons name={item.icon} size={22} color={colors.mint} />
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
      <PointsSpendModal open={spendOpen} onClose={() => setSpendOpen(false)} />
    </>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'flex-start',
    },
    sheet: {
      width: '86%',
      maxWidth: 360,
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 18,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.line,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    title: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 24,
    },
    claim: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.mint,
      marginBottom: 10,
      overflow: 'hidden',
    },
    claimAura: {
      position: 'absolute',
      top: -20,
      right: -10,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.mint,
    },
    claimIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    claimCopy: { flex: 1 },
    claimTitle: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 16,
    },
    claimHint: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 12,
      marginTop: 2,
    },
    claimPts: {
      color: colors.mint,
      fontFamily: font.bold,
      fontSize: 22,
    },
    claimDone: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.card,
      marginBottom: 10,
    },
    claimDoneIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.line,
    },
    claimDoneTitle: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 15,
    },
    spendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      marginBottom: 4,
    },
    spendLabel: {
      flex: 1,
      color: colors.text,
      fontFamily: font.medium,
      fontSize: 15,
    },
    spendPts: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 15,
    },
    tier: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      marginBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    badge: {
      minWidth: 64,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.mint,
      alignItems: 'center',
    },
    badgeFree: { backgroundColor: colors.card },
    badgeText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 12 },
    badgeTextFree: { color: colors.text },
    tierCopy: { flex: 1 },
    tierLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
    tierHint: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
    },
    rowLabel: {
      flex: 1,
      color: colors.text,
      fontFamily: font.medium,
      fontSize: 16,
    },
  });
}
