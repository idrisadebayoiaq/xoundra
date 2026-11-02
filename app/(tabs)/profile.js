import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlatformIcon } from '../../src/components/PlatformIcon';
import { PointsSpendModal } from '../../src/components/PointsSpendModal';
import { cleanArtistLinks, platformById } from '../../src/data/artistPlatforms';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';
import { useRewards } from '../../src/state/RewardsState';
import { Avatar } from '../../src/components/Avatar';
import { avatarUrl } from '../../src/lib/supabase';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const app = useApp();
  const { points, streakDays, downloadCredits } = useRewards();
  const [spendOpen, setSpendOpen] = useState(false);
  const {
    premium,
    firstName,
    isArtist,
    avatarPath,
    avatarStamp,
    artistName,
    artistBio,
    artistLocation,
    artistTagline,
    artistFocus,
    artistWebsite,
    artistLinks,
    artistBanner,
    userId,
  } = app;

  const displayName = isArtist ? (artistName || firstName || 'Artist') : (firstName || 'You');
  const bannerUri = artistBanner ? `${avatarUrl(artistBanner)}?v=${avatarStamp}` : '';
  const links = cleanArtistLinks(artistLinks);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Profile</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel="Settings" style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {isArtist ? (
        <View style={styles.banner}>
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} resizeMode="cover" style={styles.bannerPhoto} />
          ) : (
            <Text style={styles.bannerText}>No banner yet</Text>
          )}
        </View>
      ) : null}

      <View style={styles.identity}>
        <Avatar path={avatarPath} stamp={avatarStamp} size={88} />
        <View style={styles.who}>
          <Text style={styles.name}>{displayName}</Text>
          {isArtist && artistTagline ? <Text style={styles.tagline}>{artistTagline}</Text> : null}
          <View style={[styles.badge, !premium && styles.badgeFree]}>
            <Text style={[styles.badgeText, !premium && styles.badgeTextFree]}>
              {premium ? 'Premium' : 'Free'}
            </Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.rewards} onPress={() => setSpendOpen(true)} accessibilityLabel="Quiet points">
        <Text style={styles.rewardsTitle}>{streakDays ? `${streakDays}-day streak` : 'No streak yet'}</Text>
        <Text style={styles.rewardsMeta}>
          {points} Quiet points{downloadCredits ? ` · ${downloadCredits} download credit${downloadCredits === 1 ? '' : 's'}` : ''}
        </Text>
        <Text style={styles.spendLink}>Spend points</Text>
      </Pressable>

      <Pressable style={styles.planRow} onPress={() => router.push('/plans')}>
        <Text style={styles.planLabel}>Plan</Text>
        <Text style={styles.planValue}>{premium ? 'Premium' : 'Free'} · Manage</Text>
      </Pressable>

      {isArtist ? (
        <View style={styles.preview}>
          {artistLocation ? <Text style={styles.meta}>{artistLocation}</Text> : null}
          {artistFocus ? <Text style={styles.meta}>{artistFocus}</Text> : null}
          {artistBio ? <Text style={styles.bio}>{artistBio}</Text> : null}
          {artistWebsite ? <Text style={styles.website}>{artistWebsite}</Text> : null}
          {links.length ? (
            <View style={styles.links}>
              {links.map((item) => (
                <View key={item.platform} style={styles.linkChip}>
                  <PlatformIcon platform={item.platform} color={colors.mint} size={16} />
                  <Text style={styles.linkLabel}>{platformById(item.platform)?.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            onPress={() => router.push({ pathname: '/artist-page', params: { id: userId } })}
            accessibilityLabel="Preview public page"
          >
            <Text style={styles.publicLink}>View public artist page</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable style={styles.editBtn} onPress={() => router.push('/edit-profile')} accessibilityLabel="Edit profile">
        <Ionicons name="create-outline" size={18} color={colors.mintInk} />
        <Text style={styles.editText}>Edit profile</Text>
      </Pressable>
      <PointsSpendModal open={spendOpen} onClose={() => setSpendOpen(false)} />
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 36 },
    topBar: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rewards: {
      marginHorizontal: 20,
      marginBottom: 14,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      gap: 4,
    },
    rewardsTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    rewardsMeta: { color: colors.muted, fontFamily: font.regular, fontSize: 13 },
    spendLink: { color: colors.mint, fontFamily: font.medium, fontSize: 14, marginTop: 6 },
    planRow: {
      marginHorizontal: 20,
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
    planValue: { color: colors.mint, fontFamily: font.medium, fontSize: 14 },
    screenTitle: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 32,
      letterSpacing: -0.8,
    },
    settingsBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    banner: {
      marginHorizontal: 20,
      height: 140,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    bannerPhoto: { width: '100%', height: 140 },
    bannerText: { color: colors.muted, fontFamily: font.medium, fontSize: 14 },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    who: { flex: 1, gap: 8 },
    name: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 26,
    },
    tagline: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
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
    preview: {
      paddingHorizontal: 20,
      gap: 8,
      marginBottom: 18,
    },
    meta: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
    },
    bio: {
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 4,
    },
    website: {
      color: colors.mint,
      fontFamily: font.medium,
      fontSize: 14,
    },
    links: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    linkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    linkLabel: {
      color: colors.text,
      fontFamily: font.medium,
      fontSize: 12,
    },
    publicLink: {
      color: colors.mint,
      fontFamily: font.medium,
      fontSize: 14,
      marginTop: 6,
    },
    editBtn: {
      marginHorizontal: 20,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mint,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    editText: {
      color: colors.mintInk,
      fontFamily: font.semibold,
      fontSize: 16,
    },
  });
}
