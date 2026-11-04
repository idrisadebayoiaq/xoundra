import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { KeyboardScreen } from '../src/components/KeyboardScreen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { coverSource } from '../src/data/artwork';
import { imageExtension, uploadArtistFile } from '../src/lib/artistMedia';
import { drainNotices, supabase } from '../src/lib/supabase';
import { useMoments } from '../src/state/MomentsState';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

const MAX_SECONDS = 10 * 60;
const fallback = [
  ['rain', 'Rain'],
  ['ocean', 'Ocean'],
  ['forest', 'Forest'],
  ['nature', 'Nature'],
  ['ambient', 'Ambient'],
  ['focus', 'Focus'],
  ['meditation', 'Meditation'],
  ['sleep', 'Sleep'],
];

export default function ArtistRecordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const app = useApp();
  const { showMoment } = useMoments();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [uri, setUri] = useState('');
  const [seconds, setSeconds] = useState(0);
  const tick = useRef(null);
  const player = useAudioPlayer(uri || null);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('3');
  const [category, setCategory] = useState(fallback[0][0]);
  const [art, setArt] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const choices = app.categories.length
    ? app.categories.map((item) => [item.slug, item.title])
    : fallback;

  useEffect(() => () => {
    clearInterval(tick.current);
  }, []);

  if (!app.ready) return <View style={styles.screen} />;
  if (!app.isArtist) return <Redirect href="/artist" />;

  async function start() {
    setNotice('');
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setNotice('Allow microphone access to record a sound.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSeconds(0);
      clearInterval(tick.current);
      tick.current = setInterval(() => {
        setSeconds((n) => {
          if (n + 1 >= MAX_SECONDS) {
            clearInterval(tick.current);
            recorder.stop().then(() => {
              if (recorder.uri) setUri(recorder.uri);
            }).catch(() => {});
            return MAX_SECONDS;
          }
          return n + 1;
        });
      }, 1000);
    } catch {
      setNotice('Recording could not start on this device.');
    }
  }

  async function stop() {
    clearInterval(tick.current);
    try {
      await recorder.stop();
      if (recorder.uri) {
        setUri(recorder.uri);
        const mins = Math.max(1, Math.round(seconds / 60) || 1);
        setMinutes(String(mins));
      }
    } catch {
      setNotice('Recording could not be saved.');
    }
  }

  async function pickArt() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice('Allow photo access to add artwork.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) setArt(result.assets[0]);
  }

  async function publish() {
    if (title.trim().length < 2) return setNotice('Add a title.');
    if (!uri) return setNotice('Record a sound first.');
    if (!art) return setNotice('Add artwork for this sound.');
    setBusy(true);
    setNotice('');
    try {
      const audioAsset = {
        uri,
        mimeType: Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4',
        name: `field-${Date.now()}.${Platform.OS === 'web' ? 'webm' : 'm4a'}`,
      };
      const audioPath = await uploadArtistFile(
        'track-audio',
        app.userId,
        `${Date.now()}.${Platform.OS === 'web' ? 'webm' : 'm4a'}`,
        audioAsset,
        audioAsset.mimeType,
      );
      const artPath = await uploadArtistFile(
        'artwork',
        app.userId,
        `${Date.now()}.${imageExtension(art)}`,
        art,
        art.mimeType || 'image/jpeg',
      );
      const published = await supabase.rpc('publish_artist_track', {
        p_title: title.trim(),
        p_category: category,
        p_duration: Math.max(1, Math.round((Number(minutes) || Math.max(1, seconds / 60)) * 60)),
        p_audio_path: audioPath,
        p_artwork_path: artPath,
      });
      if (published.error) throw published.error;
      app.refreshCatalogue();
      drainNotices();
      showMoment('publish', {
        title: 'Sound published',
        body: 'Your field recording is in the catalogue.',
      });
      setTitle('');
      setUri('');
      setArt(null);
      setSeconds(0);
      setNotice('Published. Editing tools come later — for now this is the raw take.');
      setTimeout(() => router.replace('/artist-sounds'), 900);
    } catch {
      setNotice('The sound could not be published.');
    } finally {
      setBusy(false);
    }
  }

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <ScreenHeader title="Record sound" back />
      <Text style={styles.lead}>
        Capture a sound where you are — rain, room tone, night air — then publish it. Trim and polish come later.
        {Platform.OS === 'web' ? ' On web, use Chrome or Edge and allow the mic.' : ''}
      </Text>

      <SurfaceCard style={styles.recorder}>
        <Text style={styles.clock}>{clock}</Text>
        <Text style={styles.limit}>Up to 10 minutes</Text>
        <View style={styles.recRow}>
          {recorderState.isRecording ? (
            <Pressable style={styles.stop} onPress={stop} accessibilityLabel="Stop recording">
              <Ionicons name="stop" size={22} color={colors.mintInk} />
              <Text style={styles.stopText}>Stop</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.record} onPress={start} accessibilityLabel="Start recording">
              <Ionicons name="mic" size={22} color={colors.mintInk} />
              <Text style={styles.recordText}>{uri ? 'Record again' : 'Record'}</Text>
            </Pressable>
          )}
          {uri && !recorderState.isRecording ? (
            <Pressable
              style={styles.play}
              onPress={() => {
                try {
                  player.seekTo(0);
                  player.play();
                } catch {
                  setNotice('Playback failed.');
                }
              }}
              accessibilityLabel="Play recording"
            >
              <Ionicons name="play" size={18} color={colors.mint} />
              <Text style={styles.playText}>Play</Text>
            </Pressable>
          ) : null}
        </View>
        {uri ? <Text style={styles.ready}>Take ready — add a title and artwork to publish.</Text> : null}
      </SurfaceCard>

      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Sound title"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="Title"
      />
      <Text style={styles.fieldLabel}>Length in minutes</Text>
      <TextInput
        value={minutes}
        onChangeText={setMinutes}
        placeholder="3"
        keyboardType="number-pad"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="Length"
      />
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.chips}>
        {choices.map(([slug, label]) => (
          <Pressable
            key={slug}
            onPress={() => setCategory(slug)}
            style={[styles.chip, category === slug && styles.chipOn]}
            accessibilityLabel={label}
          >
            <Text style={[styles.chipText, category === slug && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={pickArt} style={styles.art} accessibilityLabel="Artwork">
        {art?.uri ? (
          <Image source={{ uri: art.uri }} style={styles.artImage} />
        ) : (
          <Image source={coverSource('rain')} style={styles.artImage} />
        )}
        <View style={styles.artCopy}>
          <Text style={styles.artLabel}>Artwork</Text>
          <Text style={styles.artHint}>{art ? 'Selected' : 'Choose a square image'}</Text>
        </View>
      </Pressable>
      <Pressable style={styles.publish} onPress={publish} disabled={busy} accessibilityLabel="Publish recording">
        <Text style={styles.publishText}>{busy ? 'Publishing' : 'Publish sound'}</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </KeyboardScreen>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 48, paddingHorizontal: 20 },
    lead: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 21, marginBottom: 16 },
    recorder: { alignItems: 'center', gap: 8, marginBottom: 18 },
    clock: { color: colors.text, fontFamily: font.bold, fontSize: 40, letterSpacing: -1 },
    limit: { color: colors.muted, fontFamily: font.regular, fontSize: 13 },
    recRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    record: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.mint,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    recordText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    stop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.danger,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    stopText: { color: '#fff', fontFamily: font.semibold, fontSize: 15 },
    play: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    playText: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
    ready: { color: colors.mint, fontFamily: font.medium, fontSize: 13, marginTop: 6 },
    fieldLabel: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 6 },
    input: {
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.card,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
    chipOn: { backgroundColor: colors.text, borderColor: colors.text },
    chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
    chipTextOn: { color: colors.mintInk },
    art: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: 14,
    },
    artImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.cardRaised },
    artCopy: { flex: 1 },
    artLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
    artHint: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 3 },
    publish: {
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    publishText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
    notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14, marginTop: 12 },
  });
}
