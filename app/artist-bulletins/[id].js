import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VoiceNote, VoicePlayButton } from '../../src/components/VoiceNote';
import { communityVoiceUrl, uploadCommunityVoice } from '../../src/lib/quietRoom';
import { supabase } from '../../src/lib/supabase';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';

const REACTIONS = [
  { id: 'heart', icon: 'heart', iconOff: 'heart-outline' },
  { id: 'thanks', icon: 'thumbs-up', iconOff: 'thumbs-up-outline' },
  { id: 'calm', icon: 'leaf', iconOff: 'leaf-outline' },
];

function clock(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BulletinChatScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id, invite } = useLocalSearchParams();
  const bulletinId = Array.isArray(id) ? id[0] : id;
  const openInvite = (Array.isArray(invite) ? invite[0] : invite) === '1';
  const app = useApp();
  const listRef = useRef(null);
  const [bulletin, setBulletin] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({});
  const [followers, setFollowers] = useState([]);
  const [draft, setDraft] = useState('');
  const [voice, setVoice] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const isOwner = bulletin?.artist_id === app.userId;

  const load = useCallback(async () => {
    if (!bulletinId) return;
    setLoading(true);
    setLoadError('');
    const [{ data: board, error: boardError }, { data: feed, error: feedError }, { data: reacts }] = await Promise.all([
      supabase
        .from('bulletins')
        .select('id, title, description, members_can_reply, artist_id, archived_at')
        .eq('id', bulletinId)
        .maybeSingle(),
      supabase
        .from('bulletin_posts')
        .select('id, body, author_id, parent_id, pinned, voice_path, created_at')
        .eq('bulletin_id', bulletinId)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase.from('bulletin_reactions').select('post_id, kind, user_id'),
    ]);
    if (boardError || feedError) {
      setLoadError('Could not open this Bulletin.');
      setBulletin(null);
      setLoading(false);
      return;
    }
    setBulletin(board);
    setPosts(feed || []);
    const map = {};
    (reacts || []).forEach((row) => {
      if (!map[row.post_id]) map[row.post_id] = { heart: 0, thanks: 0, calm: 0, mine: null };
      map[row.post_id][row.kind] += 1;
      if (row.user_id === app.userId) map[row.post_id].mine = row.kind;
    });
    setReactions(map);

    if (board?.artist_id === app.userId) {
      const [{ data: follows }, { data: members }] = await Promise.all([
        supabase.from('artist_follows').select('follower_id').eq('artist_id', app.userId).limit(60),
        supabase.from('bulletin_members').select('user_id').eq('bulletin_id', bulletinId),
      ]);
      const memberSet = new Set((members || []).map((row) => row.user_id));
      const pending = (follows || []).map((row) => row.follower_id).filter((fid) => !memberSet.has(fid));
      if (pending.length) {
        const { data: people } = await supabase.from('profiles').select('id, first_name').in('id', pending);
        const names = new Map((people || []).map((row) => [row.id, row.first_name || 'Listener']));
        setFollowers(pending.map((fid) => ({ id: fid, name: names.get(fid) || 'Listener' })));
      } else {
        setFollowers([]);
      }
    } else {
      setFollowers([]);
    }
    setLoading(false);
  }, [bulletinId, app.userId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useEffect(() => {
    if (openInvite && isOwner) setInviteOpen(true);
  }, [openInvite, isOwner]);

  useEffect(() => {
    if (!posts.length) return;
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 80);
  }, [posts.length, bulletinId]);

  async function post() {
    const text = draft.trim();
    if (!text && !(isOwner && voice)) {
      setNotice(isOwner ? 'Add a message.' : 'Write a reply.');
      return;
    }
    if (!isOwner && !replyTo) {
      setNotice('Only the artist starts threads.');
      return;
    }
    if (!isOwner && replyTo && !bulletin?.members_can_reply) {
      setNotice('Replies are off.');
      return;
    }
    let voicePath = null;
    if (isOwner && voice && !replyTo) {
      try {
        voicePath = await uploadCommunityVoice(app.userId, voice);
      } catch {
        setNotice('Voice could not upload.');
        return;
      }
    }
    const { error } = await supabase.from('bulletin_posts').insert({
      bulletin_id: bulletinId,
      author_id: app.userId,
      body: text || '',
      parent_id: replyTo,
      voice_path: voicePath,
    });
    if (error) {
      setNotice('Could not send.');
      return;
    }
    setDraft('');
    setVoice(null);
    setReplyTo(null);
    setNotice('');
    load();
  }

  async function react(postId, kind) {
    if (!app.userId) return;
    const current = reactions[postId]?.mine;
    if (current === kind) {
      await supabase.from('bulletin_reactions').delete().eq('post_id', postId).eq('user_id', app.userId);
    } else {
      await supabase.from('bulletin_reactions').upsert({
        post_id: postId,
        user_id: app.userId,
        kind,
      });
    }
    load();
  }

  async function invite(userId) {
    const { error } = await supabase.rpc('invite_to_bulletin', {
      p_bulletin: bulletinId,
      p_user: userId,
    });
    setNotice(error ? 'Invite failed.' : 'Invite sent.');
    if (!error) load();
  }

  async function leave() {
    await supabase.from('bulletin_members').delete().eq('bulletin_id', bulletinId).eq('user_id', app.userId);
    router.back();
  }

  async function toggleReplies(value) {
    if (!isOwner) return;
    await supabase.from('bulletins').update({ members_can_reply: value }).eq('id', bulletinId);
    setBulletin((row) => (row ? { ...row, members_can_reply: value } : row));
  }

  const canCompose = Boolean(bulletin) && (isOwner || (bulletin.members_can_reply && replyTo));
  const thread = useMemo(() => {
    const tops = posts.filter((p) => !p.parent_id);
    const out = [];
    tops.forEach((item) => {
      out.push({ ...item, kind: 'post' });
      posts
        .filter((p) => p.parent_id === item.id)
        .forEach((reply) => out.push({ ...reply, kind: 'reply', parent: item.id }));
    });
    return out;
  }, [posts]);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Bulletin</Text>
        </View>
        <Text style={styles.hint}>Loading…</Text>
      </View>
    );
  }

  if (!bulletin) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Bulletin</Text>
        </View>
        <Text style={styles.hint}>{loadError || 'This Bulletin is not available.'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>{bulletin.title}</Text>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} accessibilityLabel="Bulletin menu">
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={thread}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
        ListEmptyComponent={<Text style={styles.hint}>Say hello to your Bulletin.</Text>}
        renderItem={({ item }) => {
          const mine = item.author_id === app.userId;
          const bubbleStyle = [
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            item.kind === 'reply' && styles.bubbleReply,
          ];
          return (
            <View style={[styles.bubbleWrap, mine ? styles.alignEnd : styles.alignStart]}>
              <View style={bubbleStyle}>
                {item.body ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text> : null}
                {item.voice_path ? (
                  <VoicePlayButton uri={communityVoiceUrl(item.voice_path)} label="Voice" />
                ) : null}
                <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{clock(item.created_at)}</Text>
              </View>
              {item.kind === 'post' ? (
                <View style={styles.reactRow}>
                  {REACTIONS.map((r) => (
                    <Pressable key={r.id} onPress={() => react(item.id, r.id)} style={styles.react} accessibilityLabel={r.id}>
                      <Ionicons
                        name={reactions[item.id]?.mine === r.id ? r.icon : r.iconOff}
                        size={14}
                        color={colors.mint}
                      />
                      <Text style={styles.reactCount}>{reactions[item.id]?.[r.id] || 0}</Text>
                    </Pressable>
                  ))}
                  {bulletin.members_can_reply && !isOwner ? (
                    <Pressable onPress={() => setReplyTo(item.id)} accessibilityLabel="Reply">
                      <Text style={styles.replyCta}>Reply</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {canCompose ? (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {replyTo ? (
            <Pressable onPress={() => setReplyTo(null)} style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>Replying · tap to cancel</Text>
            </Pressable>
          ) : null}
          {isOwner && !replyTo ? <VoiceNote value={voice} onChange={setVoice} /> : null}
          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={replyTo ? 'Reply' : 'Message'}
              placeholderTextColor={colors.muted}
              style={styles.composerInput}
              multiline
              accessibilityLabel="Message"
            />
            <Pressable style={styles.send} onPress={post} accessibilityLabel="Send">
              <Ionicons name="send" size={18} color={colors.mintInk} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.composerLocked, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.hint}>
            {bulletin.members_can_reply ? 'Tap Reply on a message.' : 'Replies are off. You can react.'}
          </Text>
        </View>
      )}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuScrim} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            {isOwner ? (
              <>
                <View style={styles.menuRow}>
                  <Text style={styles.menuLabel}>Members can reply</Text>
                  <Switch value={bulletin.members_can_reply} onValueChange={toggleReplies} trackColor={{ true: colors.mint }} />
                </View>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    setInviteOpen(true);
                  }}
                >
                  <Text style={styles.menuItemText}>Invite followers</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  leave();
                }}
              >
                <Text style={[styles.menuItemText, { color: colors.danger }]}>Leave Bulletin</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <Pressable style={styles.menuScrim} onPress={() => setInviteOpen(false)}>
          <Pressable style={[styles.inviteSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.sheetTitle}>Add to bulletin</Text>
            {followers.length === 0 ? (
              <Text style={styles.hint}>No followers to invite.</Text>
            ) : (
              followers.map((person) => (
                <View key={person.id} style={styles.inviteRow}>
                  <Text style={styles.inviteName}>{person.name}</Text>
                  <Pressable onPress={() => invite(person.id)} accessibilityLabel={`Invite ${person.name}`}>
                    <Text style={styles.replyCta}>Invite</Text>
                  </Pressable>
                </View>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      backgroundColor: colors.card,
    },
    headerCopy: { flex: 1 },
    headerTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 17 },
    thread: { paddingHorizontal: 12, paddingVertical: 16, gap: 10, flexGrow: 1 },
    bubbleWrap: { marginBottom: 4, maxWidth: '86%' },
    alignEnd: { alignSelf: 'flex-end' },
    alignStart: { alignSelf: 'flex-start' },
    bubble: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
    },
    bubbleMine: {
      backgroundColor: colors.mint,
      borderBottomRightRadius: 4,
    },
    bubbleTheirs: {
      backgroundColor: colors.card,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.line,
    },
    bubbleReply: { opacity: 0.95, maxWidth: '100%' },
    bubbleText: { color: colors.text, fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
    bubbleTextMine: { color: colors.mintInk },
    bubbleTime: { color: colors.muted, fontFamily: font.regular, fontSize: 11, alignSelf: 'flex-end' },
    bubbleTimeMine: { color: colors.mintInk, opacity: 0.7 },
    reactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, paddingHorizontal: 4 },
    react: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    reactCount: { color: colors.muted, fontFamily: font.medium, fontSize: 11 },
    replyCta: { color: colors.mint, fontFamily: font.semibold, fontSize: 13 },
    composer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.card,
      paddingHorizontal: 10,
      paddingTop: 8,
      gap: 6,
    },
    composerLocked: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    replyBanner: { paddingHorizontal: 4 },
    replyBannerText: { color: colors.mint, fontFamily: font.medium, fontSize: 12 },
    composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    composerInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      borderRadius: 20,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    send: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: { color: colors.muted, fontFamily: font.regular, fontSize: 14, textAlign: 'center', marginTop: 20 },
    notice: { color: colors.amber, fontFamily: font.medium, fontSize: 13, textAlign: 'center', marginVertical: 4 },
    menuScrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    menu: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 16,
      gap: 4,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    menuLabel: { color: colors.text, fontFamily: font.medium, fontSize: 15 },
    menuItem: { paddingVertical: 14 },
    menuItemText: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    inviteSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 18,
      maxHeight: '70%',
    },
    sheetTitle: { color: colors.text, fontFamily: font.bold, fontSize: 18, marginBottom: 12 },
    inviteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    inviteName: { color: colors.text, fontFamily: font.medium, fontSize: 15 },
  });
}
