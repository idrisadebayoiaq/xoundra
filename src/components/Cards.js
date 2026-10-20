import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../theme';
import { coverSource } from '../data/artwork';
import { statLine } from '../data/shelves';
import { useApp } from '../state/AppState';
import { SoundMenuButton } from './SoundMenu';
import { ArtistLink } from './ArtistLink';
import { DownloadMark } from './DownloadMark';

export function PhotoTile({ track, onPress, style }) {
  return (
    <View style={[styles.tile, style]}>
      <Pressable onPress={onPress} style={[StyleSheet.absoluteFill, styles.tilePress]}>
        <Image source={coverSource(track.artwork)} style={StyleSheet.absoluteFill} />
        <View style={styles.scrim} />
        <Text style={styles.label} numberOfLines={2}>{track.title}</Text>
        <ArtistLink track={track} style={styles.tileArtist} />
      </Pressable>
      <View style={styles.tileMenu}>
        <SoundMenuButton track={track} />
      </View>
      <View style={styles.tileDownload}>
        <DownloadMark track={track} />
      </View>
    </View>
  );
}

export function AlbumCard({ track, onPress }) {
  return (
    <View style={styles.album}>
      <Pressable onPress={onPress} accessibilityLabel={track.title}>
        <Image source={coverSource(track.artwork)} style={styles.albumArt} />
      </Pressable>
      <View style={styles.albumMenu}>
        <SoundMenuButton track={track} />
      </View>
      <View style={styles.albumDownload}>
        <DownloadMark track={track} />
      </View>
      <Text style={styles.albumTitle} numberOfLines={2}>{track.title}</Text>
      <ArtistLink track={track} style={styles.albumArtist} />
      <Text style={styles.albumStats} numberOfLines={2}>{statLine(track)}</Text>
    </View>
  );
}

export function TrackRow({ track, onPress, subtitle }) {
  const { track: current, playing, isLiked } = useApp();
  const active = current?.id === track.id;
  const liked = isLiked(track.id);
  return (
    <View style={styles.row}>
      <Pressable onPress={onPress} style={styles.main}>
        <Image source={coverSource(track.artwork)} style={styles.thumb} />
        <View style={styles.copy}>
          <Text style={[styles.title, active && styles.active]} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.sub} numberOfLines={1}>{subtitle || track.category}</Text>
          <ArtistLink track={track} style={styles.subArtist} />
          <Text style={styles.sub} numberOfLines={1}>{statLine(track)}</Text>
        </View>
        {liked ? <Ionicons name="heart" size={14} color={colors.mint} /> : null}
        {active && playing ? <Ionicons name="volume-medium" size={16} color={colors.mint} /> : null}
      </Pressable>
      <DownloadMark track={track} />
      <SoundMenuButton track={track} />
    </View>
  );
}

export function PillButton({ label, icon, filled, onPress, style }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[styles.pill, filled ? styles.pillFilled : styles.pillOutline, style]}>
      <Ionicons name={icon} size={16} color={filled ? colors.mintInk : colors.text} />
      <Text style={[styles.pillText, filled && styles.pillTextFilled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    aspectRatio: 1.15,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    justifyContent: 'flex-end',
    padding: 12,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,8,13,0.28)',
  },
  label: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 15,
  },
  tileArtist: { fontSize: 12, marginTop: 2 },
  tilePress: {
    justifyContent: 'flex-end',
    padding: 12,
  },
  tileDownload: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  tileMenu: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(7,8,13,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  album: {
    width: 148,
    marginRight: 12,
  },
  albumDownload: {
    position: 'absolute',
    left: 4,
    bottom: 58,
  },
  albumMenu: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(7,8,13,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArt: {
    width: 148,
    height: 148,
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  albumTitle: {
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 13,
    marginTop: 8,
  },
  albumArtist: { fontSize: 12, marginTop: 2 },
  albumStats: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 11,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  active: {
    color: colors.mint,
  },
  sub: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
  },
  subArtist: { fontSize: 13 },
  pill: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pillFilled: {
    backgroundColor: colors.text,
  },
  pillOutline: {
    borderWidth: 1,
    borderColor: 'rgba(243,246,248,0.35)',
  },
  pillText: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 15,
  },
  pillTextFilled: {
    color: colors.mintInk,
  },
});
