import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { coverSource } from '../data/artwork';
import { studioPresets } from '../data/studioPresets';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { useApp } from '../state/AppState';

export function ScenesRail({ title = 'Scenes', list = studioPresets }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { openMix, playMix, tracks } = useApp();

  async function playScene(scene) {
    const layers = scene.layers
      .map((layer) => {
        const track = tracks.find((item) => item.id === layer.id);
        if (!track) return null;
        return { ...track, volume: layer.volume, muted: false };
      })
      .filter(Boolean);
    if (!layers.length) return;
    openMix(layers, false);
    await playMix();
  }

  function editScene(scene) {
    const layers = scene.layers
      .map((layer) => {
        const track = tracks.find((item) => item.id === layer.id);
        if (!track) return null;
        return { ...track, volume: layer.volume, muted: false };
      })
      .filter(Boolean);
    openMix(layers, false);
    router.push({ pathname: '/studio', params: { mode: 'edit' } });
  }

  if (!list.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {list.map((scene) => (
          <Pressable key={scene.id} style={styles.card} onPress={() => playScene(scene)} accessibilityLabel={`Play ${scene.title}`}>
            <Image source={coverSource(scene.artwork)} style={styles.art} resizeMode="cover" />
            <Text style={styles.name} numberOfLines={1}>{scene.title}</Text>
            <Text style={styles.blurb} numberOfLines={2}>{scene.blurb}</Text>
            <Pressable onPress={() => editScene(scene)} hitSlop={8} style={styles.edit}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    wrap: { marginBottom: 18 },
    title: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 18,
      marginHorizontal: 20,
      marginBottom: 10,
    },
    row: { paddingHorizontal: 20, gap: 12 },
    card: { width: 148 },
    art: {
      width: 148,
      height: 148,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    name: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 14,
      marginTop: 8,
    },
    blurb: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 12,
      marginTop: 2,
      minHeight: 32,
    },
    edit: { marginTop: 6 },
    editText: {
      color: colors.mint,
      fontFamily: font.medium,
      fontSize: 13,
    },
  });
}
