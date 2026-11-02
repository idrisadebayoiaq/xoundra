import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { useApp } from '../state/AppState';
import { openFromMenu } from '../lib/navigation';

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

  function go(href) {
    onClose?.();
    setTimeout(() => openFromMenu(href), 40);
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu">
        <Pressable style={[styles.sheet, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) }]} onPress={(event) => event.stopPropagation?.()}>
          <View style={styles.head}>
            <Text style={styles.title}>Menu</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

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
