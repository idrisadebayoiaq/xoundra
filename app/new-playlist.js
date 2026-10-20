import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function NewPlaylistScreen() {
  const { trackId } = useLocalSearchParams();
  const soundId = Array.isArray(trackId) ? trackId[0] : trackId;
  const { userId } = useApp();
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    const title = name.trim();
    if (!title || !userId || busy) return;
    setBusy(true);
    setNotice('');
    const { data, error } = await supabase.from('playlists').insert({
      user_id: userId,
      title,
      is_public: isPublic,
    }).select('id').single();
    if (error || !data) {
      setBusy(false);
      setNotice('That playlist could not be created.');
      return;
    }
    if (soundId) {
      await supabase.from('playlist_tracks').insert({ playlist_id: data.id, track_id: soundId, position: 1 });
    }
    router.replace({ pathname: '/playlist', params: { id: data.id } });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New playlist" back />
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Playlist name"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="Playlist name"
      />
      <Text style={styles.label}>Who can find it</Text>
      <Choice
        title="Private"
        body="Only you can see and play it."
        selected={!isPublic}
        onPress={() => setIsPublic(false)}
      />
      <Choice
        title="Public"
        body="Any listener can find this playlist."
        selected={isPublic}
        onPress={() => setIsPublic(true)}
      />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable onPress={create} disabled={busy || name.trim().length < 1} style={styles.button} accessibilityLabel="Create playlist">
        <Text style={styles.buttonText}>{busy ? 'Creating' : 'Create playlist'}</Text>
      </Pressable>
    </View>
  );
}

function Choice({ title, body, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceOn]} accessibilityLabel={title}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceBody}>{body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  label: {
    color: colors.muted,
    fontFamily: font.medium,
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 18,
  },
  choice: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  choiceOn: { borderColor: colors.mint },
  choiceTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
  choiceBody: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 4 },
  notice: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginTop: 4 },
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
});
