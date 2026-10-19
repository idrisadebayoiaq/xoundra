import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { colors, font } from '../../src/theme';
import { useApp } from '../../src/state/AppState';
import { Avatar } from '../../src/components/Avatar';

export default function ProfileScreen() {
  const { premium, firstName, isAdmin, isArtist, avatarPath, avatarStamp } = useApp();
  const rows = [
    { label: 'Edit profile', icon: 'create-outline', href: '/edit-profile' },
    { label: isArtist ? 'Artist dashboard' : 'Become an artist', icon: 'mic-outline', href: '/artist' },
    ...(isAdmin ? [{ label: 'Admin', icon: 'shield-checkmark-outline', href: '/admin' }] : []),
    { label: 'Downloads', icon: 'download-outline', href: '/downloads' },
    { label: 'Privacy', icon: 'lock-closed-outline', href: '/settings' },
    { label: 'Country', icon: 'globe-outline', href: '/country' },
    { label: 'Settings', icon: 'settings-outline', href: '/settings' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Profile" />
      <View style={styles.identity}>
        <Pressable onPress={() => router.push('/edit-profile')} accessibilityLabel="Edit profile photo">
          <Avatar path={avatarPath} stamp={avatarStamp} size={84} />
        </Pressable>
        <View style={styles.who}>
          <Text style={styles.name}>{firstName || 'You'}</Text>
          <View style={[styles.badge, !premium && styles.badgeFree]}>
            <Text style={[styles.badgeText, !premium && styles.badgeTextFree]}>
              {premium ? 'Premium' : 'Free'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.list}>
        {rows.map((row) => (
          <Pressable key={row.label} style={styles.row} onPress={() => router.push(row.href)}>
            <Ionicons name={row.icon} size={20} color={colors.muted} />
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  who: { gap: 8 },
  name: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeFree: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.mint,
  },
  badgeText: {
    color: colors.mintInk,
    fontFamily: font.semibold,
    fontSize: 13,
  },
  badgeTextFree: {
    color: colors.mint,
  },
  list: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
});
