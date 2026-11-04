import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
} from 'expo-audio';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';

/** Record / clear a short voice note for Quiet Room or Bulletin posts. */
export function VoiceNote({ value, onChange }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [error, setError] = useState('');
  const player = useAudioPlayer(value?.uri || null);

  async function start() {
    setError('');
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setError('Allow microphone access to leave a voice note.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError('Recording could not start.');
    }
  }

  async function stop() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) onChange?.({ uri, mimeType: 'audio/mp4', name: `voice-${Date.now()}.m4a` });
    } catch {
      setError('Recording could not be saved.');
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {recorderState.isRecording ? (
          <Pressable style={styles.btnDanger} onPress={stop} accessibilityLabel="Stop recording">
            <Ionicons name="stop" size={18} color={colors.mintInk} />
            <Text style={styles.btnDangerText}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={start} accessibilityLabel="Record voice note">
            <Ionicons name="mic-outline" size={18} color={colors.mint} />
            <Text style={styles.btnText}>{value ? 'Re-record' : 'Voice note'}</Text>
          </Pressable>
        )}
        {value?.uri ? (
          <>
            <Pressable
              style={styles.btn}
              onPress={() => {
                try {
                  player.play();
                } catch {
                  setError('Playback failed.');
                }
              }}
              accessibilityLabel="Play voice note"
            >
              <Ionicons name="play-outline" size={18} color={colors.mint} />
              <Text style={styles.btnText}>Play</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => onChange?.(null)} accessibilityLabel="Clear voice note">
              <Ionicons name="trash-outline" size={16} color={colors.muted} />
              <Text style={styles.btnText}>Clear</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      {recorderState.isRecording ? <Text style={styles.live}>Recording…</Text> : null}
      {value?.uri && !recorderState.isRecording ? <Text style={styles.ready}>Voice note attached</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function VoicePlayButton({ uri, label = 'Play voice' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const player = useAudioPlayer(uri || null);
  if (!uri) return null;
  return (
    <Pressable
      style={styles.playRow}
      onPress={() => {
        try {
          player.seekTo(0);
          player.play();
        } catch {
          /* ignore */
        }
      }}
      accessibilityLabel={label}
    >
      <Ionicons name="play-circle" size={22} color={colors.mint} />
      <Text style={styles.playText}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    btnText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
    btnDanger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.mint,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    btnDangerText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 13 },
    live: { color: colors.amber, fontFamily: font.medium, fontSize: 13 },
    ready: { color: colors.mint, fontFamily: font.medium, fontSize: 13 },
    error: { color: colors.amber, fontFamily: font.regular, fontSize: 13 },
    playRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.bg,
    },
    playText: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
  });
}
