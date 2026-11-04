import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LevelBar } from '../src/components/LevelBar';
import { coverSource } from '../src/data/artwork';
import { formatTime } from '../src/data/catalogue';
import { SoundMenuButton } from '../src/components/SoundMenu';
import { statLine } from '../src/data/shelves';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';
import { useAudioOutput } from '../src/lib/audioRoute';
import { ArtistLink } from '../src/components/ArtistLink';
import { shareListeningCard } from '../src/lib/shareCard';
import { similarTracks } from '../src/lib/sameEnergy';
import { useRewards } from '../src/state/RewardsState';

function coverSize(width, height) {
  const side = Math.min(width, 520);
  const fromWidth = side - 72;
  const fromHeight = height - 340;
  return Math.max(220, Math.min(340, fromWidth, fromHeight));
}

export default function PlayerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
    closePlayback,
    play,
    tracks,
  } = useApp();
  const { bumpStreak } = useRewards();
  const output = useAudioOutput();
  const { width, height } = useWindowDimensions();
  const art = coverSize(width, height);
  const [breathOn, setBreathOn] = useState(false);
  const breath = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!breathOn) {
      breath.setValue(0.35);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 0.85, duration: 4000, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0.35, duration: 4000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, breathOn]);

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
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topActions}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityLabel="Minimize playback">
          <Ionicons name="chevron-down" size={30} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => {
            closePlayback();
            goBack();
          }}
          hitSlop={12}
          accessibilityLabel="Close playback"
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.artStage}>
        <Image source={coverSource(track.artwork)} style={[styles.art, { width: art, height: art }]} />
      </View>
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
      <View style={styles.bottomBlock}>
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
        <View style={styles.chips}>
          <Pressable
            onPress={() => {
              if (!premium) {
                router.push('/plans');
                return;
              }
              cycleSleep();
            }}
            style={styles.chip}
          >
            <Text style={styles.chipText}>
              {sleepMinutes ? `Sleep ${sleepMinutes} min` : 'Sleep'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.chip}
            onPress={async () => {
              const result = await shareListeningCard(track);
              if (result === 'shared') bumpStreak();
            }}
          >
            <Text style={styles.chipText}>Share</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => setBreathOn((value) => !value)}>
            <Text style={styles.chipText}>{breathOn ? 'Breath on' : 'Breath'}</Text>
          </Pressable>
          <Pressable
            style={styles.chip}
            onPress={() => {
              const next = similarTracks(track, tracks, 12);
              if (next.length) play(next[0], [track, ...next]);
            }}
          >
            <Text style={styles.chipText}>Same energy</Text>
          </Pressable>
        </View>
      </View>
      {breathOn ? (
        <Animated.View style={[styles.breath, { opacity: breath }]} pointerEvents="none" />
      ) : null}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  missing: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 16,
    marginTop: 24,
  },
  artStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  art: {
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  bottomBlock: {
    marginTop: 10,
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
  chips: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.amber,
    fontFamily: font.medium,
    fontSize: 14,
  },
  breath: {
    position: 'absolute',
    alignSelf: 'center',
    top: '28%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.mint,
  },
  });
}
