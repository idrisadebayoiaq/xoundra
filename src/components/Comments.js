import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { drainNotices, supabase } from '../lib/supabase';
import { colors, font } from '../theme';
import { useApp } from '../state/AppState';

const helpedOptions = [
  ['sleep', 'Sleep'],
  ['focus', 'Focus'],
  ['relax', 'Relax'],
  ['meditate', 'Meditate'],
];

export function Comments({ trackId }) {
  const { userId, noteHelped } = useApp();
  const [items, setItems] = useState([]);
  const [body, setBody] = useState('');
  const [helped, setHelped] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    if (!trackId) return;
    supabase
      .from('track_comments')
      .select('id, user_id, body, helped, author_name, created_at')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setItems(data || []));
  }, [trackId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  async function post() {
    const text = body.trim();
    if (!userId || text.length < 2) return;
    const { error } = await supabase.from('track_comments').insert({
      user_id: userId,
      track_id: trackId,
      body: text,
      helped: helped || null,
    });
    if (error) {
      setNotice('That note could not be shared.');
      return;
    }
    setBody('');
    drainNotices();
    setNotice('Shared. Notes like this also shape recommendations.');
    noteHelped(trackId, helped);
    setHelped('');
    load();
  }

  async function remove(id) {
    await supabase.from('track_comments').delete().eq('id', id);
    setItems((rows) => rows.filter((row) => row.id !== id));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>How this sound helped</Text>
      <Text style={styles.lead}>Share a note. It stays with this sound, including sounds from artists, and helps recommendations.</Text>
      <View style={styles.chips}>
        {helpedOptions.map(([key, label]) => (
          <Pressable key={key} onPress={() => setHelped(helped === key ? '' : key)} accessibilityLabel={label} style={[styles.chip, helped === key && styles.chipOn]}>
            <Text style={[styles.chipText, helped === key && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="How did this sound help you?"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="How did this sound help you?"
      />
      <Pressable onPress={post} accessibilityLabel="Share note" style={styles.send}>
        <Text style={styles.sendText}>Share</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {items.map((item) => (
        <View key={item.id} style={styles.note}>
          <Text style={styles.author}>{item.author_name}{item.helped ? ` · ${item.helped}` : ''}</Text>
          <Text style={styles.body}>{item.body}</Text>
          {item.user_id === userId ? (
            <Pressable onPress={() => remove(item.id)} accessibilityLabel="Remove note">
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28, gap: 10 },
  heading: { color: colors.text, fontFamily: font.bold, fontSize: 18 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  chipTextOn: { color: colors.mintInk },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  send: { alignSelf: 'flex-start', backgroundColor: colors.text, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 },
  sendText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 14 },
  notice: { color: colors.amber, fontFamily: font.regular, fontSize: 13 },
  note: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, gap: 4 },
  author: { color: colors.muted, fontFamily: font.medium, fontSize: 12 },
  body: { color: colors.text, fontFamily: font.regular, fontSize: 15 },
  remove: { color: colors.amber, fontFamily: font.medium, fontSize: 12 },
});
