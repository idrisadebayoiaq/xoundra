import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, font } from '../theme';
import { coverSource } from '../data/artwork';
import { useApp } from '../state/AppState';
import { useAudioOutput } from '../lib/audioRoute';
import { ArtistLink } from './ArtistLink';

export function MiniPlayer() {
  const { track, playing, position, togglePlay, mixPlaying, mixTracks, playMix } = useApp();
  const output = useAudioOutput();
  if (mixPlaying && mixTracks.length) {
    return (
      <Pressable style={styles.bar} onPress={() => router.push('/studio')}>
        <Image source={coverSource(mixTracks[0].artwork)} style={styles.art} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{mixTracks.map((layer) => layer.title).join(' · ')}</Text>
        {output ? <Text style={styles.device} numberOfLines={1}>{output}</Text> : null}
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation?.();
            playMix();
          }}
          hitSlop={10}
          style={styles.play}
          accessibilityLabel="Pause mix"
        >
          <Ionicons name="pause" size={22} color={colors.mint} />
        </Pressable>
      </Pressable>
    );
  }
  if (!track) return null;
  const progress = track.duration ? Math.min(1, position / track.duration) : 0;

  return (
    <Pressable style={styles.bar} onPress={() => router.push('/player')} accessibilityLabel={`Now playing ${track.title}`}>
      <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      <Image source={coverSource(track.artwork)} style={styles.art} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        <ArtistLink track={track} style={styles.device} />
        {output ? <Text style={styles.device} numberOfLines={1}>{output}</Text> : null}
      </View>
      <Pressable onPress={togglePlay} hitSlop={10} style={styles.play}>
        <Ionicons name={playing ? 'pause' : 'play'} size={22} color={colors.mint} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 68,
    marginHorizontal: 10,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: '#12151B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
    gap: 10,
  },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    backgroundColor: colors.mint,
  },
  art: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  copy: {
    flex: 1,
  },
  device: {
    color: colors.mint,
    fontFamily: font.regular,
    fontSize: 11,
  },
  title: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 14,
  },
  play: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
