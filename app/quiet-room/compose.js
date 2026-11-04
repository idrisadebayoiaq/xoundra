import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { VoiceNote } from '../../src/components/VoiceNote';
import { KeyboardScreen } from '../../src/components/KeyboardScreen';
import { QUIET_ROOM_TAGS, uploadCommunityVoice, uploadQuietRoomImage } from '../../src/lib/quietRoom';
import { supabase } from '../../src/lib/supabase';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';
import { useMoments } from '../../src/state/MomentsState';

export default function QuietRoomCompose() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { userId, tracks } = useApp();
  const { showMoment } = useMoments();
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [trackId, setTrackId] = useState('');
  const [images, setImages] = useState([]);
  const [voice, setVoice] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const picks = (tracks || []).slice(0, 24);

  async function addImage() {
    if (images.length >= 4) {
      setNotice('Up to four images.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice('Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setImages((items) => [...items, result.assets[0]].slice(0, 4));
  }

  async function publish() {
    const text = body.trim();
    if (text.length < 2 && images.length === 0 && !voice) {
      setNotice('Add text, an image, or a voice note.');
      return;
    }
    if (!userId) {
      setNotice('Sign in to post.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const paths = [];
      for (let i = 0; i < images.length; i += 1) {
        paths.push(await uploadQuietRoomImage(userId, images[i], i));
      }
      const voicePath = voice ? await uploadCommunityVoice(userId, voice) : null;
      const { data, error } = await supabase.rpc('create_quiet_room_post', {
        p_body: text,
        p_tag: tag,
        p_track: trackId || null,
        p_images: paths,
        p_voice: voicePath,
      });
      if (error) {
        if (/rate_limited/i.test(error.message || '')) setNotice('You have posted enough for today. Come back tomorrow.');
        else setNotice('That post could not be saved.');
        return;
      }
      showMoment('publish', {
        title: 'In the Quiet Room',
        body: 'Your note is with the other listeners.',
      });
      router.replace({ pathname: '/quiet-room/[id]', params: { id: data } });
    } catch {
      setNotice('That post could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <ScreenHeader title="New post" back />
      <SurfaceCard>
        <Text style={styles.hint}>Text, voice, images — alone or together. Keep it about sounds and the calm of the app.</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Optional text note"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          maxLength={500}
          accessibilityLabel="Post body"
        />
        <Text style={styles.label}>Voice</Text>
        <VoiceNote value={voice} onChange={setVoice} />
        <Text style={styles.label}>Tag</Text>
        <View style={styles.chips}>
          {QUIET_ROOM_TAGS.map((item) => (
            <Pressable
              key={item.id || 'none'}
              onPress={() => setTag(item.id)}
              style={[styles.chip, tag === item.id && styles.chipOn]}
              accessibilityLabel={item.label}
            >
              <Text style={[styles.chipText, tag === item.id && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Link a sound (optional)</Text>
        <View style={styles.trackRow}>
          <Pressable onPress={() => setTrackId('')} style={[styles.trackChip, !trackId && styles.chipOn]}>
            <Text style={[styles.chipText, !trackId && styles.chipTextOn]}>None</Text>
          </Pressable>
          {picks.map((track) => (
            <Pressable
              key={track.id}
              onPress={() => setTrackId(track.id)}
              style={[styles.trackChip, trackId === track.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, trackId === track.id && styles.chipTextOn]} numberOfLines={1}>
                {track.title}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Images</Text>
        <View style={styles.images}>
          {images.map((asset) => (
            <View key={asset.uri} style={styles.thumbWrap}>
              <Image source={{ uri: asset.uri }} style={styles.thumb} />
              <Pressable
                style={styles.remove}
                onPress={() => setImages((items) => items.filter((item) => item.uri !== asset.uri))}
                accessibilityLabel="Remove image"
              >
                <Ionicons name="close" size={14} color={colors.text} />
              </Pressable>
            </View>
          ))}
          {images.length < 4 ? (
            <Pressable style={styles.addImage} onPress={addImage} accessibilityLabel="Add image">
              <Ionicons name="image-outline" size={22} color={colors.mint} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.publish} onPress={publish} disabled={busy} accessibilityLabel="Post to Quiet Room">
          <Text style={styles.publishText}>{busy ? 'Posting' : 'Post'}</Text>
        </Pressable>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </SurfaceCard>
    </KeyboardScreen>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    content: { paddingBottom: 40, paddingHorizontal: 20 },
    hint: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 20, marginBottom: 12 },
    input: {
      minHeight: 100,
      borderRadius: 14,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      padding: 14,
      textAlignVertical: 'top',
    },
    label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginTop: 16, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipOn: { backgroundColor: colors.mint, borderColor: colors.mint },
    chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
    chipTextOn: { color: colors.mintInk },
    trackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    trackChip: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 6,
      maxWidth: 160,
    },
    images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    thumbWrap: { position: 'relative' },
    thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.bg },
    remove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.cardRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addImage: {
      width: 72,
      height: 72,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    publish: {
      marginTop: 20,
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
