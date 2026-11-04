import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlatformIcon } from '../../src/components/PlatformIcon';
import { PointsSpendModal } from '../../src/components/PointsSpendModal';
import { QuietPointsCard } from '../../src/components/QuietPointsCard';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { cleanArtistLinks, platformById } from '../../src/data/artistPlatforms';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';
import { Avatar } from '../../src/components/Avatar';
import { avatarUrl } from '../../src/lib/supabase';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [spendOpen, setSpendOpen] = useState(false);
  const {
    premium,
    firstName,
    isArtist,
    artistVerified,
    avatarPath,
    avatarStamp,
    artistName,
    artistBio,
    artistLocation,
    artistTagline,
    artistFocus,
    artistLinks,
    artistBanner,
    userId,
  } = app;

  const displayName = isArtist ? (artistName || firstName || 'Artist') : (firstName || 'You');
  const bannerUri = artistBanner ? `${avatarUrl(artistBanner)}?v=${avatarStamp}` : '';
  const links = cleanArtistLinks(artistLinks);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <View style={styles.atmosphere} pointerEvents="none">
        <View style={[styles.glow, { backgroundColor: colors.mint }]} />
      </View>

      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>Xoundra</Text>
          <Text style={styles.screenTitle}>You</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel="Settings" style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        {isArtist && bannerUri ? (
          <Image source={{ uri: bannerUri }} style={styles.heroBanner} resizeMode="cover" />
        ) : (
          <View style={[styles.heroBanner, styles.heroFallback, { backgroundColor: colors.card }]} />
        )}
        <View style={styles.heroScrim} />
        <View style={styles.heroIdentity}>
          <Avatar path={avatarPath} stamp={avatarStamp} size={84} />
          <View style={styles.who}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {isArtist && artistVerified ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.mint} accessibilityLabel="Verified artist" />
              ) : null}
            </View>
            {isArtist && artistTagline ? (
              <Text style={styles.tagline} numberOfLines={2}>{artistTagline}</Text>
            ) : (
              <Text style={styles.tagline}>Find your quiet</Text>
            )}
            <View style={[styles.badge, !premium && styles.badgeFree]}>
              <Text style={[styles.badgeText, !premium && styles.badgeTextFree]}>
                {premium ? 'Premium' : 'Free'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <QuietPointsCard onSpend={() => setSpendOpen(true)} />

      <Text style={styles.section}>Spaces</Text>
      <SurfaceCard style={styles.entryCard} onPress={() => router.push('/quiet-room')} accessibilityLabel="Open Quiet Room">
        <View style={[styles.entryIcon, { backgroundColor: colors.bg }]}>
          <Ionicons name="moon-outline" size={20} color={colors.mint} />
        </View>
        <View style={styles.entryCopy}>
          <Text style={styles.entryTitle}>Quiet Room</Text>
          <Text style={styles.entryBody}>Shared notes about sounds and the app.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </SurfaceCard>

      <SurfaceCard
        style={styles.entryCard}
        onPress={() => router.push('/artist-bulletins')}
        accessibilityLabel={isArtist ? 'Open Bulletin' : 'Open Bulletins'}
      >
        <View style={[styles.entryIcon, { backgroundColor: colors.bg }]}>
          <Ionicons name="newspaper-outline" size={20} color={colors.mint} />
        </View>
        <View style={styles.entryCopy}>
          <Text style={styles.entryTitle}>{isArtist ? 'Bulletin' : 'Bulletins'}</Text>
          <Text style={styles.entryBody}>
            {isArtist ? 'Updates for people who follow you.' : 'Artist updates you have joined.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </SurfaceCard>

      {isArtist ? (
        <SurfaceCard style={styles.entryCard} onPress={() => router.push('/artist')} accessibilityLabel="Artist dashboard">
          <View style={[styles.entryIcon, { backgroundColor: colors.bg }]}>
            <Ionicons name="disc-outline" size={20} color={colors.mint} />
          </View>
          <View style={styles.entryCopy}>
            <Text style={styles.entryTitle}>Artist tools</Text>
            <Text style={styles.entryBody}>Upload, record, Bulletin, analytics.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.planCard} onPress={() => router.push('/plans')} accessibilityLabel="Manage plan">
        <View>
          <Text style={styles.planLabel}>Plan</Text>
          <Text style={styles.planHint}>{premium ? 'Premium is active' : 'Free listening · upgrade anytime'}</Text>
        </View>
        <Text style={styles.planValue}>Manage</Text>
      </SurfaceCard>

      {isArtist ? (
        <SurfaceCard style={styles.artistMeta} raised>
          {artistLocation ? <Text style={styles.meta}>{artistLocation}</Text> : null}
          {artistFocus ? <Text style={styles.meta}>{artistFocus}</Text> : null}
          {artistBio ? <Text style={styles.bio} numberOfLines={4}>{artistBio}</Text> : null}
          {links.length ? (
            <View style={styles.links}>
              {links.map((item) => (
                <View key={item.platform} style={styles.linkChip}>
                  <PlatformIcon platform={item.platform} color={colors.mint} size={14} />
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
        </SurfaceCard>
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
    content: { paddingBottom: 40 },
    atmosphere: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    glow: {
      position: 'absolute',
      top: -80,
      right: -60,
      width: 220,
      height: 220,
      borderRadius: 110,
      opacity: 0.12,
    },
    topBar: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    eyebrow: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    screenTitle: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 34,
      letterSpacing: -1,
    },
    settingsBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      minHeight: 168,
    },
    heroBanner: { ...StyleSheet.absoluteFillObject, height: 168 },
    heroFallback: {},
    heroScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scheme === 'light' ? 'rgba(244,246,248,0.55)' : 'rgba(7,8,13,0.55)',
    },
    heroIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 18,
      marginTop: 24,
    },
    who: { flex: 1, gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { color: colors.text, fontFamily: font.bold, fontSize: 24, flexShrink: 1 },
    tagline: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 19 },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.mint,
      borderRadius: 14,
      paddingHorizontal: 11,
      paddingVertical: 4,
      marginTop: 2,
    },
    badgeFree: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.mint },
    badgeText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 12 },
    badgeTextFree: { color: colors.mint },
    section: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 18,
      marginHorizontal: 20,
      marginBottom: 10,
      marginTop: 4,
    },
    entryCard: {
      marginHorizontal: 20,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    entryIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryCopy: { flex: 1, gap: 2 },
    entryTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    entryBody: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
    planCard: {
      marginHorizontal: 20,
      marginTop: 6,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    planLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    planHint: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 2 },
    planValue: { color: colors.mint, fontFamily: font.semibold, fontSize: 14 },
    artistMeta: { marginHorizontal: 20, marginBottom: 14, gap: 6 },
    meta: { color: colors.muted, fontFamily: font.regular, fontSize: 14 },
    bio: { color: colors.text, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginTop: 2 },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    linkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.bg,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    linkLabel: { color: colors.text, fontFamily: font.medium, fontSize: 12 },
    publicLink: { color: colors.mint, fontFamily: font.medium, fontSize: 14, marginTop: 8 },
    editBtn: {
      marginHorizontal: 20,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.mint,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    editText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
  });
}
