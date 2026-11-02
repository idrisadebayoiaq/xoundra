import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';

export function ArtistLink({ track, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

function makeStyles(colors) {
  return StyleSheet.create({
    name: {
      color: colors.mint,
      fontFamily: font.medium,
      fontSize: 13,
    },
  });
}
