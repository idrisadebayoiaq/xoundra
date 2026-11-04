import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { openNotice } from '../src/lib/openNotice';
import { supabase } from '../src/lib/supabase';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { notes, inbox, markNotesRead, markNoticeRead, notifyEnabled, play, tracks, refreshInbox, userId, isArtist } = useApp();
  const [busyInvite, setBusyInvite] = useState('');
  const [myBulletinId, setMyBulletinId] = useState('');

  useFocusEffect(useCallback(() => {
    refreshInbox?.();
    if (!userId || !isArtist) {
      setMyBulletinId('');
      return;
    }
    supabase
      .from('bulletins')
      .select('id')
      .eq('artist_id', userId)
      .is('archived_at', null)
      .maybeSingle()
      .then(({ data }) => setMyBulletinId(data?.id || ''));
  }, [refreshInbox, userId, isArtist]));

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

  async function respondInvite(item, accept) {
    const inviteId = item.target?.bulletin_invite_id;
    if (!inviteId) return;
    setBusyInvite(item.id);
    const { data, error } = await supabase.rpc('respond_bulletin_invite', {
      p_invite: inviteId,
      p_accept: accept,
    });
    setBusyInvite('');
    markNoticeRead(item.id);
    if (!error && accept && data && item.target?.bulletin_id) {
      router.push({ pathname: '/artist-bulletins/[id]', params: { id: item.target.bulletin_id } });
    } else if (!error && item.target?.bulletin_id && accept) {
      router.push({ pathname: '/artist-bulletins/[id]', params: { id: item.target.bulletin_id } });
    }
    refreshInbox?.();
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
              <View style={styles.icon}>
                <Ionicons name="notifications-outline" size={20} color={colors.mint} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              </View>
            </Pressable>
            {item.target?.kind === 'bulletin_invite' && item.target?.bulletin_invite_id ? (
              <View style={styles.inviteActions}>
                <Pressable
                  style={styles.accept}
                  disabled={busyInvite === item.id}
                  onPress={() => respondInvite(item, true)}
                  accessibilityLabel="Accept Bulletin invite"
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={styles.decline}
                  disabled={busyInvite === item.id}
                  onPress={() => respondInvite(item, false)}
                  accessibilityLabel="Decline Bulletin invite"
                >
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </View>
            ) : null}
            {(item.target?.kind === 'follow' || item.target?.kind === 'follow_bulletin')
            && (item.target?.bulletin_id || myBulletinId) ? (
              <Pressable
                onPress={() => {
                  markNoticeRead(item.id);
                  router.push({
                    pathname: '/artist-bulletins/[id]',
                    params: {
                      id: item.target.bulletin_id || myBulletinId,
                      invite: '1',
                    },
                  });
                }}
                style={styles.markOne}
                accessibilityLabel="Add to bulletin"
              >
                <Text style={styles.markOneText}>Add to bulletin</Text>
              </Pressable>
            ) : null}
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

function makeStyles(colors) {
  return StyleSheet.create({
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
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
  inviteActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  accept: {
    backgroundColor: colors.mint,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 13 },
  decline: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  declineText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  });
}
