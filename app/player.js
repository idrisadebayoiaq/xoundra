import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LevelBar } from '../src/components/LevelBar';
import { coverSource } from '../src/data/artwork';
import { formatTime } from '../src/data/catalogue';
import { SoundMenuButton } from '../src/components/SoundMenu';
import { Comments } from '../src/components/Comments';
import { statLine } from '../src/data/shelves';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';
import { useAudioOutput } from '../src/lib/audioRoute';
import { ArtistLink } from '../src/components/ArtistLink';

function coverSize(width, height) {
  const side = Math.min(width, 480);
  const fromWidth = side - 120;
  const fromHeight = height - 460;
  return Math.max(168, Math.min(260, fromWidth, fromHeight));
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const {
    track,
    playing,
    position,
    togglePlay,
    seek,
    skip,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    sleepMinutes,
    cycleSleep,
    isFavourite,
    toggleFavourite,
    isLiked,
    toggleLike,
    queue,
    index,
    premium,
  } = useApp();
  const output = useAudioOutput();
  const { width, height } = useWindowDimensions();
  const art = coverSize(width, height);

  if (!track) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.missing}>Choose a sound from Home.</Text>
      </View>
    );
  }

  const saved = isFavourite(track.id);
  const liked = isLiked(track.id);

  return (
    <ScrollView style={[styles.screen, { paddingTop: insets.top + 8 }]} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
      <Pressable onPress={goBack} hitSlop={12} style={styles.close}>
        <Ionicons name="chevron-down" size={30} color={colors.text} />
      </Pressable>
      <Image source={coverSource(track.artwork)} style={[styles.art, { width: art, height: art }]} />
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.category}>{track.category}</Text>
          <ArtistLink track={track} style={styles.artist} />
          <Text style={styles.stats}>{statLine(track)}</Text>
          {output ? <Text style={styles.output}>{output}</Text> : null}
        </View>
        <Pressable onPress={() => toggleLike(track)} hitSlop={10} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? colors.mint : colors.text} />
        </Pressable>
        <Pressable onPress={() => toggleFavourite(track)} hitSlop={10} accessibilityLabel={saved ? 'Remove from favorite' : 'Add to favorite'}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? colors.amber : colors.text} />
        </Pressable>
        <SoundMenuButton track={track} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(position)}</Text>
        <Text style={styles.time}>{formatTime(track.duration)}</Text>
      </View>
      <LevelBar label="Position" value={track.duration ? position / track.duration : 0} onChange={(ratio) => seek(ratio * track.duration)} />
      <View style={styles.transport}>
        <Pressable onPress={() => setShuffle(!shuffle)} hitSlop={8}>
          <Ionicons name="shuffle" size={22} color={shuffle ? colors.mint : colors.text} />
        </Pressable>
        <Pressable onPress={() => skip(-1)} hitSlop={8} disabled={index === 0}>
          <Ionicons name="play-skip-back" size={28} color={index === 0 ? colors.muted : colors.text} />
        </Pressable>
        <Pressable style={styles.pause} onPress={togglePlay}>
          <Ionicons name={playing ? 'pause' : 'play'} size={28} color={colors.mintInk} />
        </Pressable>
        <Pressable onPress={() => skip(1)} hitSlop={8} disabled={index >= queue.length - 1}>
          <Ionicons name="play-skip-forward" size={28} color={index >= queue.length - 1 ? colors.muted : colors.text} />
        </Pressable>
        <Pressable onPress={() => setRepeat(!repeat)} hitSlop={8}>
          <Ionicons name="repeat" size={22} color={repeat ? colors.mint : colors.text} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => {
          if (!premium) {
            router.push('/plans');
            return;
          }
          cycleSleep();
        }}
        style={styles.sleep}
      >
        <Text style={styles.sleepText}>
          {sleepMinutes ? `Sleep ${sleepMinutes} min` : 'Sleep timer'}
        </Text>
      </Pressable>
      <Comments trackId={track.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
  close: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  missing: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 16,
    marginTop: 24,
  },
  art: {
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: colors.card,
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    gap: 12,
  },
  titles: { flex: 1 },
  title: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 26,
  },
  category: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    marginTop: 4,
  },
  artist: {
    color: colors.mint,
    fontFamily: font.medium,
  },
  stats: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 12,
    marginTop: 6,
  },
  output: {
    color: colors.mint,
    fontFamily: font.medium,
    fontSize: 13,
    marginTop: 6,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  time: {
    color: colors.muted,
    fontFamily: font.medium,
    fontSize: 12,
  },
  transport: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pause: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  action: {
    alignItems: 'center',
    gap: 6,
    minWidth: 72,
  },
  actionText: {
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 12,
  },
  sleep: {
    marginTop: 22,
    alignItems: 'center',
  },
  sleepText: {
    color: colors.amber,
    fontFamily: font.medium,
    fontSize: 15,
  },
});
