import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

export default function JoinSceneScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { openMix, tracks } = useApp();
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');

  function join() {
    const raw = code.trim();
    const body = raw.startsWith('xoundra-scene:') ? raw.slice('xoundra-scene:'.length) : raw;
    try {
      const payload = JSON.parse(decodeURIComponent(body));
      const layers = (payload.layers || [])
        .map((layer) => {
          const track = tracks.find((item) => item.id === layer.id);
          if (!track) return null;
          return { track_id: track.id, gain: layer.volume ?? 0.7, muted: Boolean(layer.muted) };
        })
        .filter(Boolean);
      if (!layers.length) {
        setNotice('None of those sounds are in your catalogue.');
        return;
      }
      openMix(layers, false);
      router.replace({ pathname: '/studio', params: { mode: 'edit' } });
    } catch {
      setNotice('That collab code could not be read.');
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Join scene" back />
      <Text style={styles.lead}>Paste a collab code.</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="xoundra-scene:..."
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />
      <Pressable style={styles.button} onPress={join}>
        <Text style={styles.buttonText}>Open in Studio</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    lead: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
      marginHorizontal: 20,
      marginBottom: 14,
      lineHeight: 20,
    },
    input: {
      marginHorizontal: 20,
      minHeight: 96,
      borderRadius: 14,
      backgroundColor: colors.card,
      color: colors.text,
      fontFamily: font.regular,
      padding: 14,
      textAlignVertical: 'top',
    },
    button: {
      marginHorizontal: 20,
      marginTop: 16,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
    notice: {
      color: colors.amber,
      fontFamily: font.regular,
      marginHorizontal: 20,
      marginTop: 12,
      lineHeight: 20,
    },
  });
}
