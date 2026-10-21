import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { coverSource } from '../src/data/artwork';
import { imageExtension, uploadArtistFile } from '../src/lib/artistMedia';
import { drainNotices, supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

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

function blankSound() {
  return { key: `${Date.now()}-${Math.random()}`, title: '', minutes: '3', category: 'rain', audio: null, art: null };
}

async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { error: 'Allow photo access to add artwork.' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return { asset: null };
  return { asset: result.assets[0] };
}

async function pickAudio() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['audio/mpeg', 'audio/mp3', 'audio/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  return picked.assets[0];
}

export default function ArtistUploadScreen() {
  const app = useApp();
  const [extras, setExtras] = useState([]);
  const [custom, setCustom] = useState('');
  const official = app.categories.length ? app.categories.map((item) => [item.slug, item.title]) : fallback;
  const choices = [...official, ...extras.filter((item) => !official.some((row) => row[0] === item[0]))];
  const [mode, setMode] = useState('single');
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('3');
  const [category, setCategory] = useState(choices[0]?.[0] || 'rain');
  const [audio, setAudio] = useState(null);
  const [art, setArt] = useState(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArt, setAlbumArt] = useState(null);
  const [sounds, setSounds] = useState([blankSound(), blankSound()]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!app.userId) return;
    supabase.from('categories').select('slug, name').eq('artist_id', app.userId).then(({ data }) => {
      setExtras((data || []).map((row) => [row.slug, row.name]));
    });
  }, [app.userId]);

  async function addCategory() {
    const name = custom.trim();
    if (name.length < 2) {
      setNotice('Name the category with at least 2 characters.');
      return;
    }
    const created = await supabase.rpc('create_artist_category', { p_name: name });
    if (created.error || !created.data) {
      setNotice('That category could not be added.');
      return;
    }
    setExtras((items) => (items.some((item) => item[0] === created.data) ? items : [...items, [created.data, name]]));
    setCategory(created.data);
    setCustom('');
    setNotice('Category added. It is selected for a single, and available on each album sound.');
  }

  if (!app.ready) return <View style={styles.screen} />;
  if (!app.isArtist) return <Redirect href="/artist" />;

  function patchSound(key, patch) {
    setSounds((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function publishSingle() {
    if (title.trim().length < 2) return setNotice('Add a title.');
    if (!audio) return setNotice('Choose an mp3.');
    if (!art) return setNotice('Add artwork for this sound.');
    setBusy(true);
    setNotice('');
    try {
      const audioPath = await uploadArtistFile('track-audio', app.userId, `${Date.now()}.mp3`, audio, 'audio/mpeg');
      const artPath = await uploadArtistFile('artwork', app.userId, `${Date.now()}.${imageExtension(art)}`, art, art.mimeType || 'image/jpeg');
      const published = await supabase.rpc('publish_artist_track', {
        p_title: title.trim(),
        p_category: category,
        p_duration: Math.max(1, Math.round((Number(minutes) || 3) * 60)),
        p_audio_path: audioPath,
        p_artwork_path: artPath,
      });
      if (published.error) throw published.error;
      app.refreshCatalogue();
      drainNotices();
      setTitle('');
      setAudio(null);
      setArt(null);
      setNotice('The sound is published.');
    } catch {
      setNotice('The sound could not be uploaded.');
    } finally {
      setBusy(false);
    }
  }

  async function publishAlbum() {
    if (albumTitle.trim().length < 2) return setNotice('Add an album title.');
    if (!albumArt) return setNotice('Add artwork for the album.');
    if (sounds.length < 2) return setNotice('An album needs at least two sounds.');
    if (sounds.some((sound) => sound.title.trim().length < 2)) return setNotice('Every sound needs a title.');
    if (sounds.some((sound) => !sound.audio)) return setNotice('Every sound needs an mp3.');
    if (sounds.some((sound) => !sound.art)) return setNotice('Every sound needs its own artwork.');
    setBusy(true);
    setNotice('');
    try {
      const stamp = Date.now();
      const coverPath = await uploadArtistFile('artwork', app.userId, `album-${stamp}.${imageExtension(albumArt)}`, albumArt, albumArt.mimeType || 'image/jpeg');
      const payload = [];
      for (let index = 0; index < sounds.length; index += 1) {
        const sound = sounds[index];
        setNotice(`Uploading ${index + 1} of ${sounds.length}`);
        const audioPath = await uploadArtistFile('track-audio', app.userId, `${stamp}-${index}.mp3`, sound.audio, 'audio/mpeg');
        const artPath = await uploadArtistFile('artwork', app.userId, `${stamp}-${index}.${imageExtension(sound.art)}`, sound.art, sound.art.mimeType || 'image/jpeg');
        payload.push({
          title: sound.title.trim(),
          category: sound.category,
          duration: Math.max(1, Math.round((Number(sound.minutes) || 3) * 60)),
          audio_path: audioPath,
          artwork_path: artPath,
        });
      }
      const published = await supabase.rpc('publish_artist_album', {
        p_title: albumTitle.trim(),
        p_artwork_path: coverPath,
        p_tracks: payload,
      });
      if (published.error) throw published.error;
      app.refreshCatalogue();
      drainNotices();
      setAlbumTitle('');
      setAlbumArt(null);
      setSounds([blankSound(), blankSound()]);
      setNotice('The album is published.');
    } catch {
      setNotice('The album could not be uploaded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Upload sounds" back />
      <View style={styles.modes}>
        <Pressable onPress={() => setMode('single')} accessibilityLabel="Upload as single" style={[styles.mode, mode === 'single' && styles.modeOn]}>
          <Text style={[styles.modeText, mode === 'single' && styles.modeTextOn]}>Single</Text>
        </Pressable>
        <Pressable onPress={() => setMode('album')} accessibilityLabel="Upload as album" style={[styles.mode, mode === 'album' && styles.modeOn]}>
          <Text style={[styles.modeText, mode === 'album' && styles.modeTextOn]}>Album</Text>
        </Pressable>
      </View>
      <Text style={styles.fieldLabel}>Your category</Text>
      <View style={styles.customCategory}>
        <TextInput value={custom} onChangeText={setCustom} placeholder="Name a category" placeholderTextColor={colors.muted} style={[styles.input, styles.categoryInput]} accessibilityLabel="New category" />
        <Pressable onPress={addCategory} accessibilityLabel="Add category" style={styles.addCategory}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      {mode === 'single' ? (
        <View style={styles.block}>
          <Text style={styles.lead}>One sound, with its own artwork. Listeners can play it, like it, and save it.</Text>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Sound title" />
          <Field label="Length in minutes" value={minutes} onChangeText={setMinutes} placeholder="3" keyboardType="number-pad" />
          <Text style={styles.fieldLabel}>Category</Text>
          <Chips choices={choices} value={category} onChange={setCategory} />
          <ArtPicker label="Sound artwork" asset={art} onPress={async () => {
            const picked = await pickImage();
            if (picked.error) setNotice(picked.error);
            else if (picked.asset) setArt(picked.asset);
          }} />
          <FilePicker label={audio?.name || 'Choose an mp3'} onPress={async () => setAudio(await pickAudio())} />
          <Pressable onPress={publishSingle} disabled={busy} accessibilityLabel="Publish sound" style={styles.publish}>
            <Text style={styles.publishText}>{busy ? 'Uploading' : 'Publish sound'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.lead}>Several sounds in order. Each sound has its own artwork. The album has one cover, and listeners open it like a playlist.</Text>
          <Field label="Album title" value={albumTitle} onChangeText={setAlbumTitle} placeholder="Album title" />
          <ArtPicker label="Album artwork" asset={albumArt} onPress={async () => {
            const picked = await pickImage();
            if (picked.error) setNotice(picked.error);
            else if (picked.asset) setAlbumArt(picked.asset);
          }} />
          {sounds.map((sound, index) => (
            <View key={sound.key} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Sound {index + 1}</Text>
                {sounds.length > 2 ? (
                  <Pressable onPress={() => setSounds((items) => items.filter((item) => item.key !== sound.key))} accessibilityLabel="Remove sound">
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
              <Field label="Title" value={sound.title} onChangeText={(value) => patchSound(sound.key, { title: value })} placeholder="Sound title" />
              <Field label="Length in minutes" value={sound.minutes} onChangeText={(value) => patchSound(sound.key, { minutes: value })} placeholder="3" keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Category</Text>
              <Chips choices={choices} value={sound.category} onChange={(value) => patchSound(sound.key, { category: value })} />
              <ArtPicker label="Sound artwork" asset={sound.art} onPress={async () => {
                const picked = await pickImage();
                if (picked.error) setNotice(picked.error);
                else if (picked.asset) patchSound(sound.key, { art: picked.asset });
              }} />
              <FilePicker label={sound.audio?.name || 'Choose an mp3'} onPress={async () => patchSound(sound.key, { audio: await pickAudio() })} />
            </View>
          ))}
          <Pressable onPress={() => setSounds((items) => [...items, blankSound()])} accessibilityLabel="Add another sound" style={styles.add}>
            <Ionicons name="add" size={18} color={colors.mint} />
            <Text style={styles.addText}>Add another sound</Text>
          </Pressable>
          <Pressable onPress={publishAlbum} disabled={busy} accessibilityLabel="Publish album" style={styles.publish}>
            <Text style={styles.publishText}>{busy ? 'Uploading' : 'Publish album'}</Text>
          </Pressable>
        </View>
      )}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel={label} {...props} />
    </View>
  );
}

function Chips({ choices, value, onChange }) {
  return (
    <View style={styles.chips}>
      {choices.map(([slug, label]) => (
        <Pressable key={slug} onPress={() => onChange(slug)} accessibilityLabel={label} style={[styles.chip, value === slug && styles.chipOn]}>
          <Text style={[styles.chipText, value === slug && styles.chipTextOn]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ArtPicker({ label, asset, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={styles.art}>
      {asset?.uri ? <Image source={{ uri: asset.uri }} style={styles.artImage} /> : <Image source={coverSource('rain')} style={styles.artImage} />}
      <View style={styles.artCopy}>
        <Text style={styles.artLabel}>{label}</Text>
        <Text style={styles.artHint}>{asset ? 'Artwork selected' : 'Choose a square image'}</Text>
      </View>
    </Pressable>
  );
}

function FilePicker({ label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Choose audio" style={styles.file}>
      <Ionicons name="musical-note" size={16} color={colors.mint} />
      <Text style={styles.fileText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  modes: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mode: { flex: 1, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  modeText: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
  modeTextOn: { color: colors.mintInk },
  block: { gap: 12 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  fieldLabel: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 6 },
  input: { height: 48, borderRadius: 12, backgroundColor: colors.card, color: colors.text, fontFamily: font.regular, fontSize: 16, paddingHorizontal: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  chipTextOn: { color: colors.mintInk },
  art: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 10 },
  artImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#1C2430' },
  artCopy: { flex: 1 },
  artLabel: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
  artHint: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 3 },
  file: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  fileText: { color: colors.text, fontFamily: font.medium, fontSize: 14, flex: 1 },
  card: { backgroundColor: '#10151E', borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.line },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontFamily: font.bold, fontSize: 16 },
  customCategory: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  categoryInput: { flex: 1 },
  addCategory: { height: 48, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14, justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  addText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
  publish: { height: 50, borderRadius: 25, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  publishText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
  notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14, marginTop: 14 },
});
