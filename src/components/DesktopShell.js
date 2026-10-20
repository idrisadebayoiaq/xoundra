import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';
import { useApp } from '../state/AppState';
import { useShell } from '../state/ShellState';
import { coverSource } from '../data/artwork';
import { formatTime } from '../data/catalogue';
import { supabase } from '../lib/supabase';
import { Avatar } from './Avatar';
import { ArtistLink } from './ArtistLink';
import { DownloadAppButton } from './DownloadAppButton';
import { DownloadProgress } from './DownloadProgress';
import { LevelBar } from './LevelBar';
import { PlaylistCover } from './PlaylistCover';

const nav = [
  { href: '/', label: 'Home', icon: 'home', match: (path) => path === '/' },
  { href: '/explore', label: 'Explore', icon: 'compass', match: (path) => path === '/explore' || path === '/browse' },
  { href: '/studio', label: 'Studio', icon: 'layers', match: (path) => path === '/studio' },
  { href: '/guide', label: 'Guide', icon: 'mic', match: (path) => path === '/guide' || path === '/ai' },
  { href: '/library', label: 'Library', icon: 'albums', match: (path) => path === '/library' || path === '/downloads' || path === '/playlist' || path === '/new-playlist' },
];

export function WebDeck({ children }) {
  const { desktop, sidebar, panel } = useShell();
  const { track, mixPlaying } = useApp();
  const { width } = useWindowDimensions();
  const showPanel = desktop && panel && Boolean(track || mixPlaying);
  const overlay = showPanel && width < 1200;

  if (!desktop) return children;

  return (
    <View style={styles.deck}>
      <TopBar />
      <View style={styles.body}>
        {sidebar ? <Sidebar /> : null}
        <View style={styles.main}>{children}</View>
        {showPanel && !overlay ? <NowPanel /> : null}
        {showPanel && overlay ? (
          <View style={styles.overlay}>
            <NowPanel />
          </View>
        ) : null}
      </View>
      <Transport />
    </View>
  );
}

function TopBar() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { sidebar, toggleSidebar, search, setSearch } = useShell();
  const { unread, avatarPath, avatarStamp } = useApp();
  return (
    <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={toggleSidebar} hitSlop={8} accessibilityLabel={sidebar ? 'Close sidebar' : 'Open sidebar'} style={styles.iconBtn}>
        <Ionicons name={sidebar ? 'chevron-back' : 'menu'} size={22} color={colors.text} />
      </Pressable>
      <Image source={require('../../assets/icon.png')} style={styles.mark} />
      {nav.map((item) => {
        const active = item.match(path);
        return (
          <Pressable
            key={item.href}
            onPress={() => router.navigate(item.href)}
            accessibilityLabel={item.label}
            style={[styles.navBtn, active && styles.navBtnOn]}
          >
            <Ionicons name={active ? item.icon : `${item.icon}-outline`} size={18} color={active ? colors.mintInk : colors.text} />
          </Pressable>
        );
      })}
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search sounds"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <DownloadAppButton compact />
      <Pressable onPress={() => router.push('/notifications')} hitSlop={8} accessibilityLabel="Notifications" style={styles.iconBtn}>
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
        {unread > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
      <Pressable onPress={() => router.navigate('/profile')} hitSlop={8} accessibilityLabel="Profile">
        <Avatar path={avatarPath} stamp={avatarStamp} size={32} />
      </Pressable>
    </View>
  );
}

function Sidebar() {
  const params = useGlobalSearchParams();
  const path = usePathname();
  const { likes, downloads, play, userId, track, tracks } = useApp();
  const [filter, setFilter] = useState(params.tab === 'downloads' ? 'downloads' : 'playlists');
  const [query, setQuery] = useState('');
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (params.tab === 'downloads') setFilter('downloads');
  }, [params.tab]);

  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    supabase.from('playlists').select('id, title, is_public, playlist_tracks(track_id, position)').eq('user_id', userId).order('created_at', { ascending: false }).then(({ data }) => {
      if (!alive) return;
      setPlaylists((data || []).map((item) => {
        const ordered = [...(item.playlist_tracks || [])].sort((a, b) => a.position - b.position);
        return {
          id: item.id,
          title: item.title,
          isPublic: item.is_public === true,
          count: ordered.length,
          sounds: ordered.map((row) => tracks.find((sound) => sound.id === row.track_id)).filter(Boolean),
        };
      }));
    });
    return () => {
      alive = false;
    };
  }, [tracks, userId]);

  const needle = query.trim().toLowerCase();
  const chips = [
    ['playlists', 'Playlists'],
    ['liked', 'Liked'],
    ['downloads', 'Downloads'],
  ];

  return (
    <View style={styles.side}>
      <Pressable onPress={() => router.navigate('/guide')} style={[styles.guideEntry, path === '/guide' && styles.libRowOn]} accessibilityLabel="Guide">
        <Ionicons name={path === '/guide' ? 'mic' : 'mic-outline'} size={20} color={path === '/guide' ? colors.mint : colors.text} />
        <Text style={styles.guideLabel}>Guide</Text>
      </Pressable>
      <View style={styles.sideHead}>
        <Text style={styles.sideTitle}>Your library</Text>
        <Pressable onPress={() => router.push('/new-playlist')} hitSlop={8} accessibilityLabel="New playlist">
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.chips}>
        {chips.map(([key, label]) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={[styles.chip, filter === key && styles.chipOn]}>
            <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sideSearch}>
        <Ionicons name="search" size={14} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search library"
          placeholderTextColor={colors.muted}
          style={styles.sideSearchInput}
        />
      </View>
      <DownloadProgress style={styles.sideProgress} />
      <ScrollView style={styles.sideScroll} contentContainerStyle={styles.sideList} showsVerticalScrollIndicator={false}>
        {filter === 'playlists' ? (
          playlists.filter((item) => item.title.toLowerCase().includes(needle)).map((item) => (
            <Pressable key={item.id} style={styles.libRow} onPress={() => router.push({ pathname: '/playlist', params: { id: item.id } })}>
              <PlaylistCover tracks={item.sounds} size={46} />
              <View style={styles.libCopy}>
                <Text style={styles.libTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.libMeta} numberOfLines={1}>{item.isPublic ? 'Public' : 'Private'} · {item.count === 1 ? '1 sound' : `${item.count} sounds`}</Text>
              </View>
            </Pressable>
          ))
        ) : null}
        {filter === 'liked' ? likedRows(likes, needle, track, play) : null}
        {filter === 'downloads' ? likedRows(downloads, needle, track, play) : null}
        {filter === 'playlists' && playlists.length === 0 ? <Text style={styles.sideEmpty}>Playlists you create show up here.</Text> : null}
        {filter === 'liked' && likes.length === 0 ? <Text style={styles.sideEmpty}>Liked sounds show up here.</Text> : null}
        {filter === 'downloads' && downloads.length === 0 ? <Text style={styles.sideEmpty}>Downloaded sounds show up here.</Text> : null}
      </ScrollView>
    </View>
  );
}

function likedRows(list, needle, current, play) {
  return list
    .filter((item) => item.title.toLowerCase().includes(needle))
    .map((item) => (
      <Pressable key={item.id} style={[styles.libRow, current?.id === item.id && styles.libRowOn]} onPress={() => play(item, list)}>
        <Image source={coverSource(item.artwork)} style={styles.libArt} />
        <View style={styles.libCopy}>
          <Text style={styles.libTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.libMeta} numberOfLines={1}>{item.artistName || item.category}</Text>
        </View>
      </Pressable>
    ));
}

function NowPanel() {
  const { closePanel } = useShell();
  const {
    track, mixPlaying, mixTracks, playing, isLiked, toggleLike, closePlayback,
  } = useApp();
  const shown = mixPlaying && mixTracks.length ? mixTracks[0] : track;
  if (!shown) return null;
  const title = mixPlaying ? mixTracks.map((layer) => layer.title).join(' · ') : shown.title;
  const liked = !mixPlaying && isLiked(shown.id);

  return (
    <View style={styles.now}>
      <View style={styles.nowTools}>
        <Pressable onPress={closePanel} hitSlop={8} accessibilityLabel="Minimize playback">
          <Ionicons name="chevron-down" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => {
            closePlayback();
            closePanel();
          }}
          hitSlop={8}
          accessibilityLabel="Close playback"
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>
      <Image source={coverSource(shown.artwork)} style={styles.nowArt} resizeMode="cover" />
      <View style={styles.nowTitleRow}>
        <View style={styles.nowCopy}>
          <Text style={styles.nowTitle} numberOfLines={2}>{title}</Text>
          {mixPlaying ? <Text style={styles.nowMeta}>Mix</Text> : <ArtistLink track={shown} style={styles.nowMeta} />}
        </View>
        {mixPlaying ? null : (
          <Pressable onPress={() => toggleLike(shown)} hitSlop={8} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.mint : colors.text} />
          </Pressable>
        )}
      </View>
      <Text style={styles.nowState}>{playing || mixPlaying ? 'Playing' : 'Paused'}</Text>
    </View>
  );
}

function Transport() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { panel, openPanel, closePanel } = useShell();
  const {
    track, playing, position, togglePlay, seek, skip, shuffle, setShuffle, repeat, setRepeat,
    queue, index, isLiked, toggleLike, closePlayback, mixPlaying, mixTracks, playMix,
  } = useApp();
  const compact = width < 1040;
  const active = mixPlaying && mixTracks.length ? mixTracks[0] : track;
  if (!active) return <View style={{ height: Math.max(insets.bottom, 8) }} />;
  const title = mixPlaying ? mixTracks.map((layer) => layer.title).join(' · ') : active.title;
  const progress = !mixPlaying && active.duration ? position / active.duration : 0;
  const liked = !mixPlaying && isLiked(active.id);

  return (
    <View style={[styles.transport, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.transportSide}>
        <Pressable onPress={openPanel} accessibilityLabel={`Now playing ${title}`}>
          <Image source={coverSource(active.artwork)} style={styles.transportArt} />
        </Pressable>
        <View style={styles.transportCopy}>
          <Text style={styles.transportTitle} numberOfLines={1}>{title}</Text>
          {mixPlaying ? null : <ArtistLink track={active} style={styles.transportArtist} />}
        </View>
        {mixPlaying ? null : (
          <Pressable onPress={() => toggleLike(active)} hitSlop={8} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.mint : colors.muted} />
          </Pressable>
        )}
      </View>
      <View style={styles.transportMid}>
        <View style={styles.transportButtons}>
          {compact || mixPlaying ? null : (
            <Pressable onPress={() => setShuffle(!shuffle)} hitSlop={6} accessibilityLabel="Shuffle">
              <Ionicons name="shuffle" size={18} color={shuffle ? colors.mint : colors.text} />
            </Pressable>
          )}
          <Pressable onPress={() => skip(-1)} hitSlop={6} disabled={mixPlaying || index === 0} accessibilityLabel="Previous">
            <Ionicons name="play-skip-back" size={20} color={mixPlaying || index === 0 ? colors.muted : colors.text} />
          </Pressable>
          <Pressable style={styles.play} onPress={mixPlaying ? playMix : togglePlay} accessibilityLabel={playing || mixPlaying ? 'Pause' : 'Play'}>
            <Ionicons name={playing || mixPlaying ? 'pause' : 'play'} size={20} color={colors.mintInk} />
          </Pressable>
          <Pressable onPress={() => skip(1)} hitSlop={6} disabled={mixPlaying || index >= queue.length - 1} accessibilityLabel="Next">
            <Ionicons name="play-skip-forward" size={20} color={mixPlaying || index >= queue.length - 1 ? colors.muted : colors.text} />
          </Pressable>
          {compact || mixPlaying ? null : (
            <Pressable onPress={() => setRepeat(!repeat)} hitSlop={6} accessibilityLabel="Repeat">
              <Ionicons name="repeat" size={18} color={repeat ? colors.mint : colors.text} />
            </Pressable>
          )}
        </View>
        {mixPlaying ? null : (
          <View style={styles.seekRow}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <View style={styles.seek}>
              <LevelBar label="Position" value={progress} onChange={(ratio) => seek(ratio * (active.duration || 0))} />
            </View>
            <Text style={styles.time}>{formatTime(active.duration)}</Text>
          </View>
        )}
      </View>
      <View style={styles.transportEnd}>
        <Pressable onPress={panel ? closePanel : openPanel} hitSlop={8} accessibilityLabel={panel ? 'Minimize playback' : 'Expand playback'} style={styles.iconBtn}>
          <Ionicons name={panel ? 'chevron-down' : 'chevron-up'} size={18} color={colors.text} />
        </Pressable>
        <Pressable onPress={closePlayback} hitSlop={8} accessibilityLabel="Close playback" style={styles.iconBtn}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    backgroundColor: '#000000',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    paddingHorizontal: 8,
    gap: 8,
  },
  main: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    marginBottom: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 8,
    bottom: 8,
    width: 320,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#000000',
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181B22',
  },
  navBtnOn: {
    backgroundColor: colors.mint,
  },
  search: {
    flex: 1,
    minWidth: 120,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#181B22',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 14,
    height: 40,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint,
  },
  guideEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  guideLabel: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 15,
  },
  side: {
    width: 280,
    backgroundColor: '#12141A',
    borderRadius: 12,
    marginBottom: 8,
    paddingTop: 14,
  },
  sideHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sideTitle: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1C2028',
  },
  chipOn: {
    backgroundColor: colors.text,
  },
  chipText: {
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 13,
  },
  chipTextOn: {
    color: '#101218',
  },
  sideProgress: {
    marginHorizontal: 12,
  },
  sideSearch: {
    marginHorizontal: 16,
    marginBottom: 8,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1C2028',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  sideSearchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 13,
    height: 36,
  },
  sideScroll: {
    flex: 1,
  },
  sideList: {
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  sideEmpty: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
  },
  libRowOn: {
    backgroundColor: 'rgba(139,225,207,0.12)',
  },
  libArt: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: colors.card,
  },
  libFallback: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: '#1C2028',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libCopy: {
    flex: 1,
  },
  libTitle: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 14,
  },
  libMeta: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 12,
    marginTop: 2,
  },
  now: {
    width: 320,
    backgroundColor: '#12141A',
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    overflow: 'hidden',
  },
  nowTools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nowArt: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  nowTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  nowCopy: {
    flex: 1,
  },
  nowTitle: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 22,
  },
  nowMeta: {
    color: colors.mint,
    fontFamily: font.medium,
    fontSize: 14,
    marginTop: 4,
  },
  nowState: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    marginTop: 10,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0C0E13',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  transportSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  transportArt: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  transportCopy: {
    flex: 1,
    minWidth: 0,
  },
  transportTitle: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 14,
  },
  transportArtist: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 12,
  },
  transportMid: {
    flex: 1.2,
    minWidth: 180,
    alignItems: 'center',
    gap: 4,
  },
  transportButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  seek: {
    flex: 1,
  },
  time: {
    color: colors.muted,
    fontFamily: font.medium,
    fontSize: 11,
    width: 36,
    textAlign: 'center',
  },
  transportEnd: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
