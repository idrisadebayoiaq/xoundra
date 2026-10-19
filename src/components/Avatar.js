import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { avatarUrl } from '../lib/supabase';

export function Avatar({ path, stamp, uri, size = 34 }) {
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

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1.5,
    borderColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#12161C',
  },
});
