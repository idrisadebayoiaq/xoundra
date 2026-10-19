import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { colors, font } from '../theme';

export function ArtistLink({ track, style }) {
  if (!track?.artistName) return null;
  const textStyle = [styles.name, style];
  if (!track.artistId) return <Text style={textStyle} numberOfLines={1}>{track.artistName}</Text>;
  return (
    <Pressable
      onPress={(event) => {
        event?.stopPropagation?.();
        router.push({ pathname: '/artist-page', params: { id: track.artistId } });
      }}
      hitSlop={8}
      accessibilityLabel={`Artist ${track.artistName}`}
    >
      <Text style={textStyle} numberOfLines={1}>{track.artistName}</Text>
    </Pressable>
  );
}

const styles = {
  name: {
    color: colors.mint,
    fontFamily: font.medium,
    fontSize: 13,
  },
};
