import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { FontAwesome5, Fontisto, Ionicons } from '@expo/vector-icons';
import { platformById } from '../data/artistPlatforms';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';

export function PlatformIcon({ platform, size = 22, color }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tint = color || colors.text;
  const item = platformById(platform);
  if (!item) return null;
  if (item.icon.set === 'ion') return <Ionicons name={item.icon.name} size={size} color={tint} />;
  if (item.icon.set === 'fa5') return <FontAwesome5 name={item.icon.name} brand size={size} color={tint} />;
  if (item.icon.set === 'fontisto') return <Fontisto name={item.icon.name} size={size} color={tint} />;
  return <Text style={[styles.mark, { color: tint, fontSize: Math.round(size * 0.72) }]}>{item.icon.name}</Text>;
}

function makeStyles(colors) {
  return StyleSheet.create({
  mark: { fontFamily: font.bold },
  });
}
