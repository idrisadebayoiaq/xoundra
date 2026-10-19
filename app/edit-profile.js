import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { countries } from '../src/data/catalogue';
import { intentions } from '../src/data/intentions';
import { Dropdown } from '../src/components/Dropdown';
import { avatarUrl, supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function EditProfileScreen() {
  const app = useApp();
  const [name, setName] = useState(app.firstName);
  const [intention, setIntention] = useState(app.intention || 'sleep');
  const [country, setCountry] = useState(app.country);
  const [preview, setPreview] = useState(avatarUrl(app.avatarPath));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    setError('');
    const asset = result.assets[0];
    const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
    const path = `${app.userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, bytes, {
      upsert: true,
      contentType: asset.mimeType || 'image/jpeg',
    });
    if (uploadError) {
      setBusy(false);
      setError('The photo could not be saved.');
      return;
    }
    const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', app.userId);
    setBusy(false);
    if (updateError) {
      setError('The photo could not be saved.');
      return;
    }
    setPreview(`${avatarUrl(path)}?t=${Date.now()}`);
    app.refreshAccount();
  }

  async function save() {
    if (!name.trim()) {
      setError('Add your name.');
      return;
    }
    setBusy(true);
    setError('');
    setSaved(false);
    const { error: updateError } = await supabase.from('profiles').update({
      first_name: name.trim(),
      intention,
      country_code: country,
    }).eq('id', app.userId);
    setBusy(false);
    if (updateError) {
      setError('The profile could not be saved.');
      return;
    }
    setSaved(true);
    app.refreshAccount();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Edit profile" back />
      <Pressable onPress={choosePhoto} style={styles.avatar}>
        {preview ? <Image source={{ uri: preview }} resizeMode="cover" style={styles.photo} /> : <Text style={styles.avatarText}>Add photo</Text>}
      </Pressable>
      <Text style={styles.label}>First name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.muted} />
      <Text style={styles.label}>Email</Text>
      <Text style={styles.locked}>{app.email}</Text>
      <View style={styles.drop}>
        <Dropdown
          label="What you come here for"
          value={intention}
          options={intentions.map((item) => ({ value: item.id, label: item.label }))}
          onChange={setIntention}
        />
      </View>
      <View style={styles.drop}>
        <Dropdown
          label="Country"
          value={country}
          options={countries.map((item) => ({ value: item.code, label: item.name }))}
          onChange={setCountry}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.notice}>Saved.</Text> : null}
      <Pressable style={styles.button} onPress={save} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Saving' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.mint,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: colors.card,
  },
  photo: { width: 92, height: 92, borderRadius: 46 },
  avatarText: { color: colors.mint, fontFamily: font.medium, fontSize: 13 },
  drop: { marginHorizontal: 20, marginTop: 16 },
  label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginHorizontal: 20, marginBottom: 6 },
  input: {
    marginHorizontal: 20,
    marginBottom: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  locked: { color: colors.text, fontFamily: font.regular, fontSize: 16, marginHorizontal: 20, marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 20, marginBottom: 16 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  chipTextOn: { color: colors.mintInk },
  error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20 },
  notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20 },
  button: {
    marginHorizontal: 20,
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
});
