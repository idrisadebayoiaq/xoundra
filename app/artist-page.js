import { useCallback, useState, useMemo } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Avatar } from '../src/components/Avatar';
import { PlatformIcon } from '../src/components/PlatformIcon';
import { cleanArtistLinks, platformById } from '../src/data/artistPlatforms';
import { TrackRow } from '../src/components/Cards';
import { coverSource } from '../src/data/artwork';
import { avatarUrl, drainNotices, supabase } from '../src/lib/supabase';
import { useMoments } from '../src/state/MomentsState';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

export default function ArtistPageScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const artistId = Array.isArray(id) ? id[0] : id;
  const { userId, tracks, play, avatarStamp } = useApp();
  const { showMoment } = useMoments();
  const [card, setCard] = useState(null);
  const [following, setFollowing] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [busy, setBusy] = useState(false);
  const mine = artistId && artistId === userId;
  const albumTrackIds = new Set(albums.flatMap((album) => album.trackIds));
  const sounds = tracks.filter((track) => track.artistId === artistId && !track.albumId && !albumTrackIds.has(track.id));

  const load = useCallback(async () => {
    if (!artistId) return;
    const [{ data }, follow, albumRows] = await Promise.all([
      supabase.from('artists').select('id, artist_name, artist_bio, artist_location, artist_tagline, artist_focus, artist_website, artist_links, avatar_path, artist_banner_path, artist_verified, followers, monthly_listeners, plays').eq('id', artistId).maybeSingle(),
      userId
        ? supabase.from('artist_follows').select('artist_id').eq('follower_id', userId).eq('artist_id', artistId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('albums').select('id, title, artwork_path').eq('artist_id', artistId).order('created_at', { ascending: false }),
    ]);
    const albumIds = (albumRows.data || []).map((album) => album.id);
    const members = albumIds.length
      ? (await supabase.from('tracks').select('id, album_id').in('album_id', albumIds).eq('status', 'published')).data || []
      : [];
    setAlbums((albumRows.data || []).map((album) => ({
      ...album,
      trackIds: members.filter((row) => row.album_id === album.id).map((row) => row.id),
    })));
    setCard(data || null);
    setFollowing(Boolean(follow.data));
  }, [artistId, userId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  async function toggleFollow() {
    if (!artistId || mine || busy) return;
    setBusy(true);
    const next = !following;
    const { data, error } = await supabase.rpc('set_artist_follow', { p_artist: artistId, p_on: next });
    setBusy(false);
    if (error) return;
    setFollowing(next);
    setCard((item) => (item ? { ...item, followers: Number(data) || 0 } : item));
    if (next) {
      drainNotices();
      showMoment('playful', {
        title: 'Following',
        body: `${card?.artist_name || 'Artist'} is on your list.`,
      });
    }
  }

  const bannerUri = card?.artist_banner_path ? `${avatarUrl(card.artist_banner_path)}?v=${avatarStamp}` : '';
  const followers = card?.followers || 0;
  const listeners = card?.monthly_listeners || 0;
  const plays = card?.plays || 0;
  const links = cleanArtistLinks(card?.artist_links);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <ScreenHeader title={card?.artist_name || 'Artist'} back />
      </View>

      <View style={styles.hero}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} resizeMode="cover" style={styles.bannerPhoto} />
        ) : (
          <View style={[styles.bannerPhoto, { backgroundColor: colors.card }]} />
        )}
        <View style={styles.heroScrim} />
      </View>

      <View style={styles.identity}>
        <Avatar path={card?.avatar_path} stamp={avatarStamp} size={88} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{card?.artist_name || 'Artist'}</Text>
          {card?.artist_verified ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.mint} accessibilityLabel="Verified artist" />
          ) : null}
        </View>
        {card?.artist_tagline ? <Text style={styles.tagline}>{card.artist_tagline}</Text> : null}
        <View style={styles.metaRow}>
          {card?.artist_location ? <Text style={styles.meta}>{card.artist_location}</Text> : null}
          {card?.artist_focus ? <Text style={styles.meta}>{card.artist_focus}</Text> : null}
        </View>

        {mine ? (
          <Text style={styles.mine}>This is your public page. Listeners follow from here.</Text>
        ) : (
          <Pressable
            onPress={toggleFollow}
            disabled={busy}
            accessibilityLabel={following ? 'Unfollow' : 'Follow'}
            style={[styles.follow, following && styles.followOn]}
          >
            <Text style={[styles.followText, following && styles.followTextOn]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Followers" value={followers} />
        <Stat label="Monthly" value={listeners} />
        <Stat label="Plays" value={plays} />
        <Stat label="Sounds" value={sounds.length + albums.reduce((n, a) => n + a.trackIds.length, 0)} />
      </View>

      {links.length ? (
        <View style={styles.icons}>
          {links.map((item) => (
            <Pressable
              key={item.platform}
              onPress={() => Linking.openURL(item.url)}
              accessibilityLabel={platformById(item.platform)?.label || 'Link'}
              style={styles.iconButton}
            >
              <PlatformIcon platform={item.platform} color={colors.mint} size={20} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {card?.artist_bio ? <Text style={styles.bio}>{card.artist_bio}</Text> : null}
      {card?.artist_website ? (
        <Pressable onPress={() => Linking.openURL(card.artist_website)} accessibilityLabel="Website">
          <Text style={styles.website}>{card.artist_website.replace(/^https?:\/\//, '')}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.section}>Albums</Text>
      {albums.length === 0 ? (
        <Text style={styles.empty}>No albums yet.</Text>
      ) : (
        albums.map((album) => (
          <Pressable
            key={album.id}
            style={styles.album}
            onPress={() => router.push({ pathname: '/album', params: { id: album.id } })}
            accessibilityLabel={album.title}
          >
            <Image source={coverSource(album.artwork_path)} style={styles.albumCover} />
            <View style={styles.albumCopy}>
              <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
              <Text style={styles.albumMeta}>
                {album.trackIds.length === 1 ? '1 sound' : `${album.trackIds.length} sounds`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))
      )}

      <Text style={styles.section}>Sounds</Text>
      <View style={styles.list}>
        {sounds.length === 0 ? (
          <Text style={styles.empty}>No singles published yet.</Text>
        ) : (
          sounds.map((track) => (
            <TrackRow key={track.id} track={track} onPress={() => play(track, sounds, { collection: true })} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    top: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
    hero: {
      height: 220,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    bannerPhoto: { width: '100%', height: 220 },
    heroScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scheme === 'light' ? 'rgba(244,246,248,0.15)' : 'rgba(7,8,13,0.35)',
    },
    identity: {
      marginTop: -44,
      paddingHorizontal: 20,
      alignItems: 'flex-start',
      gap: 8,
    },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    name: { color: colors.text, fontFamily: font.bold, fontSize: 30, letterSpacing: -0.8, flexShrink: 1 },
    tagline: { color: colors.text, fontFamily: font.regular, fontSize: 16, lineHeight: 22 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    meta: { color: colors.muted, fontFamily: font.regular, fontSize: 14 },
    website: { color: colors.mint, fontFamily: font.medium, fontSize: 15, marginHorizontal: 20, marginTop: 12 },
    icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20, marginTop: 16 },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 20,
    },
    stat: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.line,
    },
    statValue: { color: colors.text, fontFamily: font.bold, fontSize: 22 },
    statLabel: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
    album: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 10,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
    },
    albumCover: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.bg },
    albumCopy: { flex: 1 },
    albumTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    albumMeta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 3 },
    section: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 20,
      marginHorizontal: 20,
      marginTop: 26,
      letterSpacing: -0.3,
    },
    bio: {
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 22,
      marginHorizontal: 20,
      marginTop: 16,
    },
    follow: {
      alignSelf: 'flex-start',
      marginTop: 8,
      backgroundColor: colors.mint,
      borderRadius: 22,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    followOn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.mint },
    followText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    followTextOn: { color: colors.mint },
    mine: { color: colors.muted, fontFamily: font.regular, fontSize: 14, marginTop: 6 },
    list: { marginTop: 12, paddingHorizontal: 20 },
    empty: { color: colors.muted, fontFamily: font.regular, fontSize: 15, marginHorizontal: 20, marginTop: 10 },
  });
}
