import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { VoicePlayButton } from '../../src/components/VoiceNote';
import { communityVoiceUrl, quietRoomImageUrl, tagLabel } from '../../src/lib/quietRoom';
import { supabase } from '../../src/lib/supabase';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';

export default function QuietRoomFeed() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { userId, tracks, play } = useApp();
  const [posts, setPosts] = useState([]);
  const [liked, setLiked] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { data: likes }] = await Promise.all([
      supabase
        .from('quiet_room_posts')
        .select('id, body, author_name, tag, track_id, image_paths, voice_path, created_at, user_id')
        .eq('status', 'visible')
        .order('created_at', { ascending: false })
        .limit(60),
      userId
        ? supabase.from('quiet_room_likes').select('post_id').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
    ]);
    setPosts(rows || []);
    setLiked(new Set((likes || []).map((row) => row.post_id)));
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  async function toggleLike(postId) {
    if (!userId) return;
    const on = liked.has(postId);
    setLiked((prev) => {
      const next = new Set(prev);
      if (on) next.delete(postId);
      else next.add(postId);
      return next;
    });
    if (on) {
      await supabase.from('quiet_room_likes').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await supabase.from('quiet_room_likes').insert({ post_id: postId, user_id: userId });
    }
  }

  function playLinked(trackId) {
    const track = (tracks || []).find((item) => item.id === trackId);
    if (track && play) {
      play(track, [track]);
      router.push('/player');
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Quiet Room" back />
      <Text style={styles.lead}>Shared notes about sounds and the app.</Text>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>The room is quiet. Share a sound you like, or a small note about listening.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const images = item.image_paths || [];
          const tag = tagLabel(item.tag);
          const track = item.track_id ? (tracks || []).find((row) => row.id === item.track_id) : null;
          return (
            <SurfaceCard style={styles.post}>
              <Pressable onPress={() => router.push({ pathname: '/quiet-room/[id]', params: { id: item.id } })}>
                <Text style={styles.author}>{item.author_name}</Text>
                {tag ? <Text style={styles.tag}>{tag}</Text> : null}
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              </Pressable>
              {item.voice_path ? <VoicePlayButton uri={communityVoiceUrl(item.voice_path)} /> : null}
              {images.length ? (
                <View style={styles.images}>
                  {images.slice(0, 4).map((path) => (
                    <Image key={path} source={{ uri: quietRoomImageUrl(path) }} style={styles.thumb} />
                  ))}
                </View>
              ) : null}
              {track ? (
                <Pressable style={styles.sound} onPress={() => playLinked(track.id)} accessibilityLabel={`Play ${track.title}`}>
                  <Ionicons name="play-circle" size={20} color={colors.mint} />
                  <Text style={styles.soundText} numberOfLines={1}>{track.title}</Text>
                </Pressable>
              ) : null}
              <View style={styles.actions}>
                <Pressable onPress={() => toggleLike(item.id)} style={styles.action} accessibilityLabel="Like">
                  <Ionicons name={liked.has(item.id) ? 'heart' : 'heart-outline'} size={18} color={colors.mint} />
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: '/quiet-room/[id]', params: { id: item.id } })}
                  style={styles.action}
                  accessibilityLabel="Comments"
                >
                  <Ionicons name="chatbubble-outline" size={17} color={colors.muted} />
                </Pressable>
              </View>
            </SurfaceCard>
          );
        }}
      />
      <Pressable
        style={styles.compose}
        onPress={() => router.push('/quiet-room/compose')}
        accessibilityLabel="New Quiet Room post"
      >
        <Ionicons name="create-outline" size={22} color={colors.mintInk} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    lead: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 20,
      marginHorizontal: 20,
      marginBottom: 10,
    },
    list: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
    empty: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 24,
    },
    post: { marginBottom: 0 },
    author: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
    tag: {
      alignSelf: 'flex-start',
      marginTop: 6,
      color: colors.mint,
      fontFamily: font.medium,
      fontSize: 12,
    },
    body: {
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
    },
    images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.cardRaised },
    sound: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.bg,
    },
    soundText: { flex: 1, color: colors.text, fontFamily: font.medium, fontSize: 14 },
    actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
    action: { padding: 4 },
    compose: {
      position: 'absolute',
      right: 20,
      bottom: 28,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
