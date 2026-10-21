import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { openNotice } from '../src/lib/openNotice';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function NotificationsScreen() {
  const { notes, inbox, markNotesRead, markNoticeRead, notifyEnabled, play, tracks, refreshInbox } = useApp();

  useFocusEffect(useCallback(() => {
    refreshInbox?.();
  }, [refreshInbox]));

  const server = (inbox || []).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    read: Boolean(item.read_at),
    target: item,
  }));
  const local = notes.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    read: item.read === true,
    target: null,
  }));
  const items = [...server, ...local.filter((item) => !server.some((row) => row.id === item.id))];
  const unread = items.some((item) => !item.read);

  function open(item) {
    if (!item.read) markNoticeRead(item.id);
    if (item.target) openNotice(item.target, play, tracks);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Notifications" back />
      {!notifyEnabled ? (
        <Text style={styles.note}>Notifications are off in Settings. These stay on the list until you clear them.</Text>
      ) : null}
      {unread ? (
        <Pressable onPress={markNotesRead} accessibilityLabel="Mark all as read" style={styles.markAll}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </Pressable>
      ) : null}
      <View style={styles.list}>
        {items.length === 0 ? (
          <Text style={styles.note}>Nothing new. Notes from Xoundra will gather here.</Text>
        ) : items.map((item) => (
          <View key={item.id} style={[styles.card, !item.read && styles.cardUnread]}>
            <Pressable style={styles.main} onPress={() => open(item)} accessibilityLabel={item.title}>
              <Image source={require('../assets/icon.png')} style={styles.icon} />
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              </View>
            </Pressable>
            {!item.read ? (
              <Pressable onPress={() => markNoticeRead(item.id)} accessibilityLabel={`Mark ${item.title} as read`} hitSlop={8} style={styles.markOne}>
                <Text style={styles.markOneText}>Mark as read</Text>
              </Pressable>
            ) : (
              <Text style={styles.readLabel}>Read</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  note: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  markAll: { alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 14 },
  markAllText: { color: colors.mint, fontFamily: font.semibold, fontSize: 15 },
  list: { paddingHorizontal: 20, gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardUnread: { borderWidth: 1, borderColor: 'rgba(139,225,207,0.35)' },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  body: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  markOne: { alignSelf: 'flex-start', marginTop: 4 },
  markOneText: { color: colors.mint, fontFamily: font.medium, fontSize: 13 },
  readLabel: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 4 },
});
