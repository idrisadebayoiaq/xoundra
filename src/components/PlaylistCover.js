import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { coverSource } from '../data/artwork';
import { colors } from '../theme';

export function PlaylistCover({ tracks = [], size = 56, radius = 8 }) {
  const arts = tracks.filter((track) => track?.artwork).slice(0, 4);
  if (arts.length < 4) {
    if (!arts[0]) {
      return (
        <View style={[styles.empty, { width: size, height: size, borderRadius: radius }]}>
          <Ionicons name="musical-notes" size={Math.max(16, size * 0.36)} color={colors.mint} />
        </View>
      );
    }
    return <Image source={coverSource(arts[0].artwork)} resizeMode="cover" style={{ width: size, height: size, borderRadius: radius }} />;
  }
  const half = size / 2;
  return (
    <View style={[styles.grid, { width: size, height: size, borderRadius: radius }]}>
      {arts.map((track) => (
        <Image key={track.id} source={coverSource(track.artwork)} resizeMode="cover" style={{ width: half, height: half }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
});
