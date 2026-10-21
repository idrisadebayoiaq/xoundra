import { StyleSheet, Text } from 'react-native';
import { FontAwesome5, Fontisto, Ionicons } from '@expo/vector-icons';
import { platformById } from '../data/artistPlatforms';
import { colors, font } from '../theme';

export function PlatformIcon({ platform, size = 22, color = colors.text }) {
  const item = platformById(platform);
  if (!item) return null;
  if (item.icon.set === 'ion') return <Ionicons name={item.icon.name} size={size} color={color} />;
  if (item.icon.set === 'fa5') return <FontAwesome5 name={item.icon.name} brand size={size} color={color} />;
  if (item.icon.set === 'fontisto') return <Fontisto name={item.icon.name} size={size} color={color} />;
  return <Text style={[styles.mark, { color, fontSize: Math.round(size * 0.72) }]}>{item.icon.name}</Text>;
}

const styles = StyleSheet.create({
  mark: { fontFamily: font.bold },
});
