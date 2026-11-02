import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeState';

export function LikedCover({ size = 168 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.liked, { width: size, height: size }]}>
      <View style={styles.mint} />
      <View style={styles.night} />
      <Ionicons name="heart" size={Math.round(size * 0.38)} color={colors.text} />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  liked: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mint: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: 999,
    backgroundColor: colors.mint,
    right: '-18%',
    bottom: '-28%',
  },
  night: {
    position: 'absolute',
    width: '78%',
    height: '78%',
    borderRadius: 999,
    backgroundColor: '#24356E',
    left: '-18%',
    top: '-20%',
    opacity: 0.72,
  },
  });
}
