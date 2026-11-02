import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlbumCard, PhotoTile } from '../../src/components/Cards';
import { HomeMenu } from '../../src/components/HomeMenu';
import { Avatar } from '../../src/components/Avatar';
import { pickSleep, pickTonight, greeting } from '../../src/data/catalogue';
import { continuePlaying, forYou, mostPlayedFromHistory, recommended, trending } from '../../src/data/shelves';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';
import { avatarUrl } from '../../src/lib/supabase';

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    play,
    tracks,
    history,
    track,
    resumeId,
    helped,
    signals,
    picks,
    downloads,
    online,
    premium,
    playbackNote,
    followedArtists,
    unread,
    avatarPath,
    avatarStamp,
    intention,
  } = useApp();

  useEffect(() => {
    if (params.menu === '1') {
      setMenuOpen(true);
      router.setParams({ menu: undefined });
    }
  }, [params.menu]);

  const tonight = pickTonight(tracks);
  const forSleep = pickSleep(tracks);
  const current = track || tracks.find((item) => item.id === resumeId) || null;
  const mostPlayed = mostPlayedFromHistory(history, tracks);
  const intentionShelf = intentionShelfTracks(tracks, intention);
  const shelves = [
    ...(intentionShelf.length ? [[intentionShelfTitle(intention), intentionShelf]] : []),
    ['Continue playing', continuePlaying(history, current)],
    ['Recommended', recommended(tracks, history, helped, signals, picks)],
    ['Trending', trending(tracks)],
    ['For you', forYou(tracks)],
  ];
  if (!online && premium && downloads.length) shelves.unshift(['Downloaded', downloads]);

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} accessibilityLabel="Open menu" style={styles.iconBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{greeting()}</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bell} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {unread > 0 ? <View style={styles.dot} /> : null}
            </Pressable>
            <Pressable onPress={() => router.navigate('/(tabs)/profile')} hitSlop={8} accessibilityLabel="Profile">
              <Avatar path={avatarPath} stamp={avatarStamp} size={34} />
            </Pressable>
          </View>
        </View>

        {!online ? <Text style={styles.offline}>You're offline. Downloaded sounds still play. The guide needs a connection.</Text> : null}
        {playbackNote ? <Text style={styles.offline}>{playbackNote}</Text> : null}

        {followedArtists?.length ? (
          <View>
            <Text style={styles.section}>Artists you follow</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {followedArtists.map((artist) => (
                <Pressable
                  key={artist.id}
                  style={styles.artistCard}
                  onPress={() => router.push({ pathname: '/artist-page', params: { id: artist.id } })}
                  accessibilityLabel={artist.name}
                >
                  {artist.bannerPath ? (
                    <Image source={{ uri: `${avatarUrl(artist.bannerPath)}?v=1` }} style={styles.artistBanner} />
                  ) : (
                    <View style={[styles.artistBanner, styles.artistBannerEmpty]} />
                  )}
                  <View style={styles.artistAvatarWrap}>
                    <Avatar path={artist.avatarPath} size={44} />
                  </View>
                  <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                  {artist.tagline ? <Text style={styles.artistMeta} numberOfLines={1}>{artist.tagline}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {mostPlayed.length ? (
          <Shelf
            title="Most played sounds"
            list={mostPlayed}
            onPlay={play}
            subtitleFor={(item) => `${item.userPlays || item.playCount || 1} ${(item.userPlays || item.playCount || 1) === 1 ? 'play' : 'plays'} by you`}
          />
        ) : null}

        {shelves.map(([title, list]) => (
          <Shelf key={title} title={title} list={list} onPlay={play} />
        ))}

        <Text style={styles.section}>Tonight</Text>
        <View style={styles.grid}>
          {tonight.map((item) => (
            <PhotoTile key={item.id} track={item} onPress={() => play(item, tonight)} />
          ))}
        </View>

        <Text style={styles.section}>For sleep</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {forSleep.map((item) => (
            <AlbumCard key={item.id} track={item} onPress={() => play(item, forSleep)} />
          ))}
        </ScrollView>

        <Pressable style={styles.voice} onPress={() => router.navigate('/guide')}>
          <View style={styles.orb} />
          <View style={styles.voiceCopy}>
            <Text style={styles.voiceTitle}>Talk with Xoundra</Text>
            <Text style={styles.voiceBody}>{online ? 'Voice or typing. The guide answers out loud.' : 'The guide needs a connection.'}</Text>
          </View>
        </Pressable>
      </ScrollView>
      <HomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function intentionShelfTitle(intention) {
  const labels = {
    sleep: 'For your sleep',
    focus: 'For your focus',
    relax: 'For your calm',
    meditate: 'For meditation',
  };
  return labels[intention] || 'For you tonight';
}

function intentionShelfTracks(tracks, intention) {
  if (!intention) return [];
  const tags = {
    sleep: ['sleep'],
    focus: ['focus'],
    relax: ['relax', 'ambient'],
    meditate: ['meditate', 'meditation'],
  }[intention] || [];
  const category = String(intention || '').toLowerCase();
  return tracks
    .filter((track) => {
      const cat = String(track.category || '').toLowerCase();
      if (cat === category) return true;
      return (track.tags || []).some((tag) => tags.includes(String(tag).toLowerCase()));
    })
    .slice(0, 12);
}

function Shelf({ title, list, onPlay, subtitleFor }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!list.length) return null;
  return (
    <View>
      <Text style={styles.section}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {list.map((item) => (
          <View key={`${title}-${item.id}`}>
            <AlbumCard track={item} onPress={() => onPlay(item, list)} />
            {subtitleFor ? <Text style={styles.userPlays}>{subtitleFor(item)}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 28 },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 28,
      letterSpacing: -0.6,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bell: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      position: 'absolute',
      top: 1,
      right: 1,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.mint,
      borderWidth: 1.5,
      borderColor: colors.bg,
    },
    offline: {
      color: colors.amber,
      fontFamily: font.regular,
      fontSize: 13,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    section: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 20,
      marginHorizontal: 20,
      marginBottom: 12,
      marginTop: 6,
    },
    grid: {
      paddingHorizontal: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
      marginBottom: 22,
    },
    row: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    artistCard: {
      width: 148,
      marginRight: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      paddingBottom: 12,
    },
    artistBanner: {
      width: '100%',
      height: 64,
      backgroundColor: colors.cardRaised,
    },
    artistBannerEmpty: {
      backgroundColor: colors.line,
    },
    artistAvatarWrap: {
      marginTop: -22,
      marginLeft: 12,
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.card,
      overflow: 'hidden',
      backgroundColor: colors.bg,
    },
    artistName: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 14,
      marginHorizontal: 12,
      marginTop: 8,
    },
    artistMeta: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 12,
      marginHorizontal: 12,
      marginTop: 2,
    },
    userPlays: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 11,
      marginTop: -4,
      marginBottom: 8,
      maxWidth: 148,
    },
    voice: {
      marginHorizontal: 20,
      marginTop: 18,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    orb: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.lavender,
      borderWidth: 6,
      borderColor: colors.mint,
    },
    voiceCopy: { flex: 1, gap: 2 },
    voiceTitle: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 16,
    },
    voiceBody: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 13,
    },
  });
}
