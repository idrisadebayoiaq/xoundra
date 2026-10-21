import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Avatar } from '../src/components/Avatar';
import { PlatformIcon } from '../src/components/PlatformIcon';
import { cleanArtistLinks, platformById } from '../src/data/artistPlatforms';
import { TrackRow } from '../src/components/Cards';
import { coverSource } from '../src/data/artwork';
import { avatarUrl, drainNotices, supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function ArtistPageScreen() {
  const { id } = useLocalSearchParams();
  const artistId = Array.isArray(id) ? id[0] : id;
  const { userId, tracks, play, avatarStamp } = useApp();
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
      supabase.from('artists').select('id, artist_name, artist_bio, artist_location, artist_tagline, artist_focus, artist_website, artist_links, avatar_path, artist_banner_path, followers, monthly_listeners, plays').eq('id', artistId).maybeSingle(),
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
    if (next) drainNotices();
  }

  const bannerUri = card?.artist_banner_path ? `${avatarUrl(card.artist_banner_path)}?v=${avatarStamp}` : '';
  const followers = card?.followers || 0;
  const listeners = card?.monthly_listeners || 0;
  const plays = card?.plays || 0;
  const links = cleanArtistLinks(card?.artist_links);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title={card?.artist_name || 'Artist'} back />
      <View style={styles.banner}>
        {bannerUri ? <Image source={{ uri: bannerUri }} resizeMode="cover" style={styles.bannerPhoto} /> : null}
      </View>
      <View style={styles.identity}>
        <Avatar path={card?.avatar_path} stamp={avatarStamp} size={72} />
        <View style={styles.who}>
          <Text style={styles.name}>{card?.artist_name || 'Artist'}</Text>
          {card?.artist_tagline ? <Text style={styles.tagline}>{card.artist_tagline}</Text> : null}
          {card?.artist_location ? <Text style={styles.meta}>{card.artist_location}</Text> : null}
          {card?.artist_focus ? <Text style={styles.meta}>{card.artist_focus}</Text> : null}
        </View>
      </View>
      <View style={styles.stats}>
        <Stat label="Followers" value={followers} />
        <Stat label="Monthly listeners" value={listeners} />
        <Stat label="Streams" value={plays} />
        <Stat label="Sounds" value={sounds.length} />
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
          <Text style={styles.website}>Website</Text>
        </Pressable>
      ) : null}
      {mine ? (
        <Text style={styles.mine}>This is your page. Listeners use Follow from here.</Text>
      ) : (
        <Pressable onPress={toggleFollow} disabled={busy} accessibilityLabel={following ? 'Unfollow' : 'Follow'} style={[styles.follow, following && styles.followOn]}>
          <Text style={[styles.followText, following && styles.followTextOn]}>{following ? 'Following' : 'Follow'}</Text>
        </Pressable>
      )}
      <Text style={styles.section}>Albums</Text>
      <View style={styles.list}>
        {albums.length === 0 ? (
          <Text style={styles.empty}>No albums yet.</Text>
        ) : (
          albums.map((album) => (
            <Pressable key={album.id} style={styles.album} onPress={() => router.push({ pathname: '/album', params: { id: album.id } })} accessibilityLabel={album.title}>
              <Image source={coverSource(album.artwork_path)} style={styles.albumCover} />
              <View style={styles.albumCopy}>
                <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                <Text style={styles.albumMeta}>{album.trackIds.length === 1 ? '1 sound' : `${album.trackIds.length} sounds`}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
      <Text style={styles.section}>Sounds</Text>
      <View style={styles.list}>
        {sounds.length === 0 ? (
          <Text style={styles.empty}>No sounds published yet.</Text>
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
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 36 },
  banner: {
    marginHorizontal: 20,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  bannerPhoto: { width: '100%', height: 150 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginTop: -28,
  },
  who: { flex: 1, paddingTop: 28 },
  name: { color: colors.text, fontFamily: font.bold, fontSize: 24 },
  tagline: { color: colors.text, fontFamily: font.regular, fontSize: 15, marginTop: 4 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 14, marginTop: 2 },
  website: { color: colors.mint, fontFamily: font.medium, fontSize: 15, marginHorizontal: 20, marginTop: 12 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20, marginTop: 16 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 18,
  },
  stat: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statValue: { color: colors.text, fontFamily: font.bold, fontSize: 20 },
  statLabel: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  album: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 12 },
  albumCover: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.card },
  albumCopy: { flex: 1 },
  albumTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  albumMeta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 3 },
  section: { color: colors.text, fontFamily: font.semibold, fontSize: 18, marginHorizontal: 20, marginTop: 22 },
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
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.mint,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  followOn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.mint },
  followText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 14 },
  followTextOn: { color: colors.mint },
  mine: { color: colors.muted, fontFamily: font.regular, fontSize: 14, marginHorizontal: 20, marginTop: 16 },
  list: { marginTop: 18, paddingHorizontal: 20 },
  empty: { color: colors.muted, fontFamily: font.regular, fontSize: 15 },
});
