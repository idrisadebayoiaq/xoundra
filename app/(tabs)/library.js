import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrackRow } from '../../src/components/Cards';
import { Avatar } from '../../src/components/Avatar';
import { DownloadProgress } from '../../src/components/DownloadProgress';
import { PlaylistCover } from '../../src/components/PlaylistCover';
import { LikedCover } from '../../src/components/LikedCover';
import { DownloadMark } from '../../src/components/DownloadMark';
import { coverSource } from '../../src/data/artwork';
import { avatarUrl, supabase } from '../../src/lib/supabase';
import { colors, font } from '../../src/theme';
import { useApp } from '../../src/state/AppState';
import { useShell } from '../../src/state/ShellState';

const chips = [
  ['playlists', 'Playlists'],
  ['artists', 'Artists'],
  ['liked', 'Liked'],
  ['downloads', 'Downloads'],
  ['mixes', 'Mixes'],
  ['favorites', 'Favorites'],
  ['history', 'History'],
];

export default function LibraryScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { desktop } = useShell();
  const {
    favourites, likes, history, play, tracks, userId, openMix, downloads, premium,
    firstName, avatarPath, avatarStamp,
  } = useApp();
  const [playlists, setPlaylists] = useState([]);
  const [artists, setArtists] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [filter, setFilter] = useState(params.tab === 'downloads' ? 'downloads' : '');
  const [sortMode, setSortMode] = useState('recent');
  const [grid, setGrid] = useState(true);
  const [span, setSpan] = useState(desktop ? 480 : width);

  const refresh = useCallback(() => {
    if (!userId) return;
    supabase.from('playlists').select('id, title, is_public, created_at, playlist_tracks(track_id, position)').eq('user_id', userId).order('created_at', { ascending: false }).then(({ data }) => {
      setPlaylists((data || []).map((item) => {
        const ordered = [...(item.playlist_tracks || [])].sort((a, b) => a.position - b.position);
        return {
          id: item.id,
          title: item.title,
          isPublic: item.is_public === true,
          createdAt: item.created_at || '',
          count: ordered.length,
          sounds: ordered.map((row) => tracks.find((track) => track.id === row.track_id)).filter(Boolean),
        };
      }));
    });
    supabase.from('artist_follows').select('artist_id, created_at').eq('follower_id', userId).order('created_at', { ascending: false }).then(async ({ data }) => {
      const rows = data || [];
      if (!rows.length) {
        setArtists([]);
        return;
      }
      const { data: people } = await supabase.from('artists').select('id, artist_name, avatar_path').in('id', rows.map((row) => row.artist_id));
      const byId = new Map((people || []).map((person) => [person.id, person]));
      setArtists(rows.map((row) => {
        const person = byId.get(row.artist_id);
        if (!person) return null;
        return {
          id: person.id,
          name: person.artist_name || 'Artist',
          avatarPath: person.avatar_path || '',
          followedAt: row.created_at || '',
        };
      }).filter(Boolean));
    });
    supabase
      .from('soundscapes')
      .select('id, title, created_at, soundscape_layers(track_id, gain, muted, layer_order)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMixes(data || []));
  }, [tracks, userId]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  useEffect(() => {
    if (params.tab === 'downloads') setFilter('downloads');
  }, [params.tab]);

  const owner = firstName || 'You';
  const gap = 14;
  const columns = span >= 760 ? Math.max(3, Math.floor((span - 32) / 168)) : 3;
  const cardWidth = Math.max(96, Math.floor((span - 32 - gap * (columns - 1)) / columns));
  const tiles = buildTiles({ filter, sortMode, playlists, artists, likes, downloads, favourites, history, mixes, tracks, owner });

  function openLiked() {
    router.push('/liked');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onLayout={(event) => setSpan(event.nativeEvent.layout.width)}
    >
      <View style={[styles.head, { paddingTop: desktop ? 16 : insets.top + 8 }]}>
        <View style={styles.titleSide}>
          {desktop ? null : (
            <Pressable onPress={() => router.navigate('/profile')} accessibilityLabel="Profile">
              <Avatar path={avatarPath} stamp={avatarStamp} size={32} />
            </Pressable>
          )}
          <Text style={styles.title}>Your Library</Text>
        </View>
        <View style={styles.actions}>
          {desktop ? null : (
            <Pressable onPress={() => router.navigate('/explore')} hitSlop={8} accessibilityLabel="Search" style={styles.iconBtn}>
              <Ionicons name="search" size={22} color={colors.text} />
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/new-playlist')} hitSlop={8} accessibilityLabel="New playlist" style={styles.iconBtn}>
            <Ionicons name="add" size={26} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <DownloadProgress style={styles.progress} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter((current) => (current === key ? '' : key))}
            accessibilityLabel={label}
            style={[styles.chip, filter === key && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <Pressable
          onPress={() => setSortMode((mode) => (mode === 'recent' ? 'name' : 'recent'))}
          style={styles.sort}
          accessibilityLabel="Sort"
        >
          <Ionicons name="swap-vertical" size={16} color={colors.text} />
          <Text style={styles.sortText}>{sortMode === 'name' ? 'Name' : 'Recents'}</Text>
        </Pressable>
        <Pressable onPress={() => setGrid((value) => !value)} hitSlop={8} accessibilityLabel={grid ? 'Show as a list' : 'Show as a grid'}>
          <Ionicons name={grid ? 'list' : 'grid'} size={20} color={colors.text} />
        </Pressable>
      </View>
      {tiles.length === 0 && filter !== '' ? <Text style={styles.empty}>{emptyCopy(filter, premium)}</Text> : null}
      {grid ? (
        <View style={[styles.grid, { gap }]}>
          {filter === '' ? (
            <Pressable onPress={openLiked} style={{ width: cardWidth }} accessibilityLabel="Liked sounds">
              <LikedCover size={cardWidth} />
              <Text style={styles.cardTitle} numberOfLines={2}>Liked sounds</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>Playlist · {owner}</Text>
            </Pressable>
          ) : null}
          {tiles.map((tile) => (
            <LibraryCard
              key={`${tile.kind}-${tile.id}`}
              tile={tile}
              size={cardWidth}
              onPress={() => openTile(tile, { play, openMix, likes, downloads, favourites, history })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {filter === '' ? (
            <Pressable onPress={openLiked} style={styles.row} accessibilityLabel="Liked sounds">
              <LikedCover size={52} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle} numberOfLines={1}>Liked sounds</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>Playlist · {owner}</Text>
              </View>
            </Pressable>
          ) : null}
          {tiles.map((tile) => (
            tile.track ? (
              <View key={`${tile.kind}-${tile.id}`}>
                <TrackRow track={tile.track} onPress={() => openTile(tile, { play, openMix, likes, downloads, favourites, history })} />
              </View>
            ) : (
              <Pressable key={`${tile.kind}-${tile.id}`} style={styles.row} onPress={() => openTile(tile, { play, openMix, likes, downloads, favourites, history })} accessibilityLabel={tile.title}>
                <TileArt tile={tile} size={52} />
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{tile.title}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>{tile.meta}</Text>
                </View>
              </Pressable>
            )
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function buildTiles({ filter, sortMode, playlists, artists, likes, downloads, favourites, history, mixes, tracks, owner }) {
  const byName = (left, right) => left.title.localeCompare(right.title);
  const byRecent = (left, right) => String(right.at || '').localeCompare(String(left.at || ''));
  if (filter === 'playlists' || filter === '') {
    const playlistTiles = playlists.map((item) => ({
      kind: 'playlist',
      id: item.id,
      title: item.title,
      meta: `Playlist · ${owner}`,
      at: item.createdAt,
      playlist: item,
    }));
    const artistTiles = (filter === '' || filter === 'artists') && filter !== 'playlists'
      ? artists.map((item) => ({
        kind: 'artist',
        id: item.id,
        title: item.name,
        meta: 'Artist',
        at: item.followedAt,
        artist: item,
      }))
      : [];
    if (filter === 'playlists') return sortMode === 'name' ? [...playlistTiles].sort(byName) : playlistTiles;
    const mixed = [...playlistTiles, ...artistTiles];
    return sortMode === 'name' ? mixed.sort(byName) : mixed.sort(byRecent);
  }
  if (filter === 'artists') {
    const tiles = artists.map((item) => ({
      kind: 'artist',
      id: item.id,
      title: item.name,
      meta: 'Artist',
      at: item.followedAt,
      artist: item,
    }));
    return sortMode === 'name' ? [...tiles].sort(byName) : tiles;
  }
  if (filter === 'mixes') {
    return mixes.map((item) => {
      const layers = [...(item.soundscape_layers || [])].sort((a, b) => a.layer_order - b.layer_order);
      const sounds = layers.map((layer) => tracks.find((track) => track.id === layer.track_id)).filter(Boolean);
      return {
        kind: 'mix',
        id: item.id,
        title: item.title,
        meta: layers.length === 1 ? '1 sound' : `${layers.length} sounds`,
        at: item.created_at,
        layers,
        sounds,
      };
    });
  }
  const source = filter === 'downloads' ? downloads : filter === 'favorites' ? favourites : filter === 'history' ? history : likes;
  const sounds = [...source].sort((left, right) => (
    sortMode === 'name' ? left.title.localeCompare(right.title) : 0
  ));
  return sounds.map((track) => ({
    kind: filter === 'downloads' ? 'download' : filter === 'favorites' ? 'favorite' : filter === 'history' ? 'history' : 'sound',
    id: track.id,
    title: track.title,
    meta: track.artistName || track.category || 'Sound',
    track,
  }));
}

function openTile(tile, { play, openMix, likes, downloads, favourites, history }) {
  if (tile.kind === 'playlist') {
    router.push({ pathname: '/playlist', params: { id: tile.id } });
    return;
  }
  if (tile.kind === 'artist') {
    router.push({ pathname: '/artist-page', params: { id: tile.id } });
    return;
  }
  if (tile.kind === 'mix') {
    openMix(tile.layers, true);
    return;
  }
  const queue = tile.kind === 'download' ? downloads : tile.kind === 'favorite' ? favourites : tile.kind === 'history' ? history : likes;
  play(tile.track, queue, tile.kind === 'history' ? undefined : { collection: true });
}

function emptyCopy(filter, premium) {
  if (filter === 'playlists') return 'Tap + to name a playlist and choose who can find it.';
  if (filter === 'artists') return 'Artists you follow show up here.';
  if (filter === 'downloads') {
    return premium
      ? 'Nothing is saved on this device yet. Open the three dots on a sound and choose Download.'
      : 'Offline downloads are part of Premium, including sounds that are otherwise free to stream.';
  }
  if (filter === 'mixes') return 'Mixes you save in Studio stay on your account and show up here.';
  if (filter === 'favorites') return 'Add a sound to favorite from its menu. Favorites stay in this library.';
  if (filter === 'history') return 'Sounds you play will show up here.';
  if (filter === 'liked') return 'Tap the heart on a sound. Liked sounds stay in this library.';
  return 'Playlists you create and artists you follow show up here.';
}

function LibraryCard({ tile, size, onPress }) {
  return (
    <View style={{ width: size }}>
      <Pressable onPress={onPress} accessibilityLabel={tile.title}>
        <TileArt tile={tile} size={size} />
        <Text style={styles.cardTitle} numberOfLines={2}>{tile.title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{tile.meta}</Text>
      </Pressable>
      {tile.track ? (
        <View style={[styles.cardDownload, { top: size - 30 }]}>
          <DownloadMark track={tile.track} />
        </View>
      ) : null}
    </View>
  );
}

function TileArt({ tile, size }) {
  const radius = tile.kind === 'artist' ? size / 2 : 8;
  if (tile.kind === 'artist') {
    const uri = tile.artist.avatarPath ? `${avatarUrl(tile.artist.avatarPath)}?v=1` : '';
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius }]}>
        {uri ? (
          <Image source={{ uri }} resizeMode="cover" style={{ width: size, height: size }} />
        ) : (
          <Ionicons name="person" size={Math.round(size * 0.4)} color={colors.text} />
        )}
      </View>
    );
  }
  if (tile.kind === 'playlist' || tile.kind === 'mix') {
    return <PlaylistCover tracks={tile.sounds || tile.playlist?.sounds || []} size={size} radius={radius} />;
  }
  return (
    <Image source={coverSource(tile.track.artwork)} resizeMode="cover" style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.card }} />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  head: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: colors.text, fontFamily: font.bold, fontSize: 24, letterSpacing: -0.4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progress: { marginHorizontal: 16 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1C2028',
  },
  chipOn: { backgroundColor: colors.text },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  chipTextOn: { color: '#111318' },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortText: { color: colors.text, fontFamily: font.semibold, fontSize: 14 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 22,
    paddingHorizontal: 16,
  },
  cardDownload: { position: 'absolute', left: 2 },
  cardTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 13, marginTop: 8 },
  cardMeta: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  circle: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  list: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
  rowMeta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 2 },
  empty: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  remove: {
    color: colors.amber,
    fontFamily: font.medium,
    fontSize: 13,
    marginLeft: 64,
    marginBottom: 8,
  },
  removeCard: {
    color: colors.amber,
    fontFamily: font.medium,
    fontSize: 12,
    marginTop: 4,
  },
});
