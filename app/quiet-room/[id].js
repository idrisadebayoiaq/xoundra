import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { VoicePlayButton } from '../../src/components/VoiceNote';
import { KeyboardScreen } from '../../src/components/KeyboardScreen';
import { communityVoiceUrl, quietRoomImageUrl, tagLabel } from '../../src/lib/quietRoom';
import { supabase } from '../../src/lib/supabase';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';

export default function QuietRoomPost() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams();
  const postId = Array.isArray(id) ? id[0] : id;
  const { userId, tracks, play } = useApp();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!postId) return;
    const [{ data: row }, { data: notes }, likesRes, mine] = await Promise.all([
      supabase
        .from('quiet_room_posts')
        .select('id, body, author_name, tag, track_id, image_paths, voice_path, created_at, user_id, status')
        .eq('id', postId)
        .maybeSingle(),
      supabase
        .from('quiet_room_comments')
        .select('id, body, author_name, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      supabase.from('quiet_room_likes').select('user_id', { count: 'exact' }).eq('post_id', postId),
      userId
        ? supabase.from('quiet_room_likes').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setPost(row);
    setComments(notes || []);
    setLikeCount(likesRes.count || 0);
    setLiked(Boolean(mine.data));
  }, [postId, userId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  async function toggleLike() {
    if (!userId || !postId) return;
    const on = liked;
    setLiked(!on);
    setLikeCount((n) => Math.max(0, n + (on ? -1 : 1)));
    if (on) await supabase.from('quiet_room_likes').delete().eq('post_id', postId).eq('user_id', userId);
    else await supabase.from('quiet_room_likes').insert({ post_id: postId, user_id: userId });
  }

  async function sendComment() {
    const text = draft.trim();
    if (text.length < 2) return;
    setDraft('');
    const { error } = await supabase.from('quiet_room_comments').insert({ post_id: postId, body: text });
    if (error) {
      setNotice('Comment could not be posted.');
      setDraft(text);
      return;
    }
    setNotice('');
    load();
  }

  async function report() {
    if (!userId || !postId) return;
    const { error } = await supabase.from('quiet_room_reports').insert({
      post_id: postId,
      reporter_id: userId,
      reason: 'other',
    });
    setNotice(error ? 'Already reported, or report failed.' : 'Thanks. We will review this post.');
  }

  if (!post) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Post" back />
        <Text style={styles.lead}>This post is quiet or gone.</Text>
      </View>
    );
  }

  const track = post.track_id ? (tracks || []).find((row) => row.id === post.track_id) : null;
  const tag = tagLabel(post.tag);

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <ScreenHeader title="Post" back />
      <SurfaceCard>
        <Text style={styles.author}>{post.author_name}</Text>
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        {post.body ? <Text style={styles.body}>{post.body}</Text> : null}
        {post.voice_path ? <VoicePlayButton uri={communityVoiceUrl(post.voice_path)} /> : null}
        {(post.image_paths || []).length ? (
          <View style={styles.images}>
            {post.image_paths.map((path) => (
              <Image key={path} source={{ uri: quietRoomImageUrl(path) }} style={styles.thumb} />
            ))}
          </View>
        ) : null}
        {track ? (
          <Pressable
            style={styles.sound}
            onPress={() => {
              play?.(track, [track]);
              router.push('/player');
            }}
          >
            <Ionicons name="play-circle" size={20} color={colors.mint} />
            <Text style={styles.soundText}>{track.title}</Text>
          </Pressable>
        ) : null}
        <View style={styles.actions}>
          <Pressable onPress={toggleLike} style={styles.action} accessibilityLabel="Like">
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={colors.mint} />
            <Text style={styles.actionText}>{likeCount}</Text>
          </Pressable>
          <Pressable onPress={report} style={styles.action} accessibilityLabel="Report post">
            <Ionicons name="flag-outline" size={17} color={colors.muted} />
            <Text style={styles.actionText}>Report</Text>
          </Pressable>
        </View>
      </SurfaceCard>

      <Text style={styles.section}>Comments</Text>
      {comments.length === 0 ? (
        <Text style={styles.lead}>No comments yet. Keep it calm.</Text>
      ) : (
        comments.map((item) => (
          <SurfaceCard key={item.id} style={styles.comment}>
            <Text style={styles.author}>{item.author_name}</Text>
            <Text style={styles.commentBody}>{item.body}</Text>
          </SurfaceCard>
        ))
      )}

      <SurfaceCard style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment"
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={280}
          accessibilityLabel="Comment"
        />
        <Pressable onPress={sendComment} style={styles.send} accessibilityLabel="Send comment">
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </SurfaceCard>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </KeyboardScreen>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40, paddingHorizontal: 20, gap: 12 },
    lead: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 20, marginBottom: 4 },
    author: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
    tag: { color: colors.mint, fontFamily: font.medium, fontSize: 12, marginTop: 6 },
    body: { color: colors.text, fontFamily: font.regular, fontSize: 16, lineHeight: 24, marginTop: 10 },
    images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: colors.bg },
    sound: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.bg,
    },
    soundText: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
    actions: { flexDirection: 'row', gap: 18, marginTop: 14 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionText: { color: colors.muted, fontFamily: font.medium, fontSize: 13 },
    section: { color: colors.text, fontFamily: font.bold, fontSize: 20, marginTop: 8 },
    comment: { paddingVertical: 12 },
    commentBody: { color: colors.text, fontFamily: font.regular, fontSize: 14, lineHeight: 20, marginTop: 6 },
    composer: { gap: 10 },
    input: {
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    send: {
      alignSelf: 'flex-end',
      backgroundColor: colors.mint,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sendText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 14 },
    notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14 },
  });
}
