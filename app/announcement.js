import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';

export default function AnnouncementScreen() {
  const { id } = useLocalSearchParams();
  const announcementId = Array.isArray(id) ? id[0] : id;
  const [card, setCard] = useState(null);

  const load = useCallback(async () => {
    if (!announcementId) return;
    const { data } = await supabase.from('announcements').select('id, title, body, created_at').eq('id', announcementId).maybeSingle();
    setCard(data || null);
  }, [announcementId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const when = card?.created_at ? new Date(card.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Announcement" back />
      {!card ? <Text style={styles.missing}>This announcement is not available.</Text> : (
        <View style={styles.card}>
          <Text style={styles.title}>{card.title}</Text>
          {when ? <Text style={styles.when}>{when}</Text> : null}
          <Text style={styles.body}>{card.body}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  title: { color: colors.text, fontFamily: font.bold, fontSize: 24, lineHeight: 30 },
  when: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginTop: 8 },
  body: { color: colors.text, fontFamily: font.regular, fontSize: 16, lineHeight: 24, marginTop: 16 },
  missing: { color: colors.muted, fontFamily: font.regular, fontSize: 15 },
});
