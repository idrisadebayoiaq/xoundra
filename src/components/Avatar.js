import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeState';
import { avatarUrl } from '../lib/supabase';

export function Avatar({ path, stamp, uri, size = 34 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const photo = uri || (path ? `${avatarUrl(path)}?v=${stamp || 0}` : '');
  const radius = size / 2;

  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: radius }]}>
      {photo ? (
        <Image
          source={{ uri: photo }}
          resizeMode="cover"
          style={{ width: size - 3, height: size - 3, borderRadius: radius }}
        />
      ) : (
        <Ionicons name="person" size={Math.max(12, Math.round(size * 0.46))} color={colors.text} />
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  ring: {
    borderWidth: 1.5,
    borderColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  });
}
