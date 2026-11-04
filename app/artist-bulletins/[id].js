import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { VoiceNote, VoicePlayButton } from '../../src/components/VoiceNote';
import { KeyboardScreen } from '../../src/components/KeyboardScreen';
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

export default function BulletinDetail() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams();
  const bulletinId = Array.isArray(id) ? id[0] : id;
  const app = useApp();
  const [bulletin, setBulletin] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({});
  const [followers, setFollowers] = useState([]);
  const [draft, setDraft] = useState('');
  const [voice, setVoice] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [notice, setNotice] = useState('');
  const isOwner = bulletin?.artist_id === app.userId;

  const load = useCallback(async () => {
    if (!bulletinId) return;
    const [{ data: board }, { data: feed }, { data: reacts }] = await Promise.all([
      supabase
        .from('bulletins')
        .select('id, title, description, members_can_reply, artist_id, archived_at')
        .eq('id', bulletinId)
        .maybeSingle(),
      supabase
        .from('bulletin_posts')
        .select('id, body, author_id, parent_id, pinned, voice_path, created_at')
        .eq('bulletin_id', bulletinId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(80),
      supabase.from('bulletin_reactions').select('post_id, kind, user_id'),
    ]);
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
        supabase.from('artist_follows').select('follower_id').eq('artist_id', app.userId).limit(40),
        supabase.from('bulletin_members').select('user_id').eq('bulletin_id', bulletinId),
      ]);
      const memberSet = new Set((members || []).map((row) => row.user_id));
      const pending = (follows || []).map((row) => row.follower_id).filter((id) => !memberSet.has(id));
      if (pending.length) {
        const { data: people } = await supabase.from('profiles').select('id, first_name').in('id', pending);
        const names = new Map((people || []).map((row) => [row.id, row.first_name || 'Listener']));
        setFollowers(pending.map((id) => ({ id, name: names.get(id) || 'Listener' })));
      } else {
        setFollowers([]);
      }
    } else {
      setFollowers([]);
    }
  }, [bulletinId, app.userId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  async function post() {
    const text = draft.trim();
    if (!text && !(isOwner && voice)) {
      setNotice(isOwner ? 'Add text or a voice message.' : 'Write a reply.');
      return;
    }
    if (!isOwner && !replyTo) {
      setNotice('Only the artist starts posts. You can reply when replies are on.');
      return;
    }
    if (!isOwner && replyTo && !bulletin?.members_can_reply) {
      setNotice('Replies are off for this Bulletin.');
      return;
    }
    let voicePath = null;
    if (isOwner && voice && !replyTo) {
      try {
        voicePath = await uploadCommunityVoice(app.userId, voice);
      } catch {
        setNotice('Voice message could not upload.');
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
      setNotice('Could not post.');
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
    setNotice(error ? 'Invite failed (must be a follower).' : 'Invite sent.');
    if (!error) load();
  }

  async function leave() {
    await supabase.from('bulletin_members').delete().eq('bulletin_id', bulletinId).eq('user_id', app.userId);
    setNotice('You left this Bulletin.');
  }

  async function toggleReplies(value) {
    if (!isOwner) return;
    await supabase.from('bulletins').update({ members_can_reply: value }).eq('id', bulletinId);
    setBulletin((row) => (row ? { ...row, members_can_reply: value } : row));
  }

  if (!bulletin) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Bulletin" back />
        <Text style={styles.lead}>This Bulletin is not available.</Text>
      </View>
    );
  }

  const topLevel = posts.filter((p) => !p.parent_id);
  const repliesOf = (parentId) => posts.filter((p) => p.parent_id === parentId);
  const canCompose = isOwner || (bulletin.members_can_reply && replyTo);

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <ScreenHeader title={bulletin.title} back />
      <Text style={styles.lead}>
        {bulletin.description || 'Updates for people who follow this artist.'}
      </Text>

      {isOwner ? (
        <SurfaceCard style={styles.block}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Members can reply</Text>
            <Switch value={bulletin.members_can_reply} onValueChange={toggleReplies} trackColor={{ true: colors.mint }} />
          </View>
          {followers.length ? (
            <>
              <Text style={styles.section}>Invite followers</Text>
              {followers.slice(0, 12).map((person) => (
                <View key={person.id} style={styles.inviteRow}>
                  <Text style={styles.inviteName}>{person.name}</Text>
                  <Pressable onPress={() => invite(person.id)} accessibilityLabel={`Invite ${person.name}`}>
                    <Text style={styles.inviteCta}>Invite</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.meta}>New followers can be invited from here.</Text>
          )}
        </SurfaceCard>
      ) : (
        <Pressable onPress={leave} accessibilityLabel="Leave Bulletin">
          <Text style={styles.leave}>Leave Bulletin</Text>
        </Pressable>
      )}

      {topLevel.map((item) => (
        <SurfaceCard key={item.id} style={styles.block}>
          {item.pinned ? <Text style={styles.pin}>Pinned</Text> : null}
          {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
          {item.voice_path ? <VoicePlayButton uri={communityVoiceUrl(item.voice_path)} label="Play voice message" /> : null}
          <View style={styles.reactRow}>
            {REACTIONS.map((r) => (
              <Pressable key={r.id} onPress={() => react(item.id, r.id)} style={styles.react} accessibilityLabel={r.id}>
                <Ionicons
                  name={reactions[item.id]?.mine === r.id ? r.icon : r.iconOff}
                  size={16}
                  color={colors.mint}
                />
                <Text style={styles.reactCount}>{reactions[item.id]?.[r.id] || 0}</Text>
              </Pressable>
            ))}
            {bulletin.members_can_reply && !isOwner ? (
              <Pressable onPress={() => setReplyTo(item.id)} accessibilityLabel="Reply">
                <Text style={styles.inviteCta}>Reply</Text>
              </Pressable>
            ) : null}
          </View>
          {repliesOf(item.id).map((reply) => (
            <View key={reply.id} style={styles.reply}>
              <Text style={styles.replyBody}>{reply.body}</Text>
            </View>
          ))}
        </SurfaceCard>
      ))}

      {!topLevel.length ? <Text style={styles.lead}>No updates yet.</Text> : null}

      {canCompose ? (
        <SurfaceCard style={styles.block}>
          <Text style={styles.section}>{replyTo ? 'Reply' : 'New update'}</Text>
          {replyTo ? (
            <Pressable onPress={() => setReplyTo(null)}>
              <Text style={styles.meta}>Cancel reply</Text>
            </Pressable>
          ) : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={isOwner && !replyTo ? 'Write an update (optional with voice)' : 'Write a reply'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            accessibilityLabel="Bulletin post"
          />
          {isOwner && !replyTo ? <VoiceNote value={voice} onChange={setVoice} /> : null}
          <Pressable style={styles.send} onPress={post} accessibilityLabel="Post">
            <Text style={styles.sendText}>Post</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </KeyboardScreen>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 48, paddingHorizontal: 20, gap: 12 },
    lead: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
    block: { marginBottom: 0 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { color: colors.text, fontFamily: font.medium, fontSize: 15 },
    section: { color: colors.text, fontFamily: font.semibold, fontSize: 15, marginTop: 4, marginBottom: 8 },
    inviteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    inviteName: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
    inviteCta: { color: colors.mint, fontFamily: font.semibold, fontSize: 14 },
    meta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginBottom: 8 },
    leave: { color: colors.danger, fontFamily: font.medium, fontSize: 14, marginBottom: 4 },
    input: {
      minHeight: 88,
      borderRadius: 12,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 15,
      padding: 12,
      textAlignVertical: 'top',
    },
    send: {
      alignSelf: 'flex-end',
      backgroundColor: colors.mint,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginTop: 10,
    },
    sendText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 14 },
    pin: { color: colors.amber, fontFamily: font.medium, fontSize: 12, marginBottom: 6 },
    body: { color: colors.text, fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
    reactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
    react: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reactCount: { color: colors.muted, fontFamily: font.medium, fontSize: 12 },
    reply: {
      marginTop: 10,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: colors.line,
    },
    replyBody: { color: colors.text, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
    notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14 },
  });
}
