import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { supabase } from '../../src/lib/supabase';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';

function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ArtistBulletinsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [replies, setReplies] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const hasMine = rows.some((row) => row.mine);

  const load = useCallback(async () => {
    if (!app.userId) return;
    setLoading(true);
    const [{ data: owned, error: ownedError }, { data: memberships, error: memberError }] = await Promise.all([
      app.isArtist
        ? supabase
            .from('bulletins')
            .select('id, title, description, members_can_reply, created_at, artist_id')
            .eq('artist_id', app.userId)
            .is('archived_at', null)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('bulletin_members')
        .select('bulletin_id, role, bulletins(id, title, description, artist_id, members_can_reply, created_at)')
        .eq('user_id', app.userId),
    ]);
    if (ownedError || memberError) {
      setNotice('Could not load Bulletins.');
      setLoading(false);
      return;
    }

    const ids = [];
    if (owned?.id) ids.push(owned.id);
    (memberships || []).forEach((row) => {
      if (row.bulletins?.id) ids.push(row.bulletins.id);
    });
    const uniqueIds = [...new Set(ids)];
    let latest = {};
    if (uniqueIds.length) {
      const { data: posts } = await supabase
        .from('bulletin_posts')
        .select('bulletin_id, body, created_at')
        .in('bulletin_id', uniqueIds)
        .order('created_at', { ascending: false })
        .limit(80);
      (posts || []).forEach((post) => {
        if (!latest[post.bulletin_id]) latest[post.bulletin_id] = post;
      });
    }

    const list = [];
    if (owned) {
      list.push({
        id: owned.id,
        title: owned.title,
        mine: true,
        snippet: latest[owned.id]?.body || 'No messages yet',
        at: latest[owned.id]?.created_at || owned.created_at,
      });
    }
    (memberships || []).forEach((row) => {
      const board = row.bulletins;
      if (!board || board.artist_id === app.userId) return;
      list.push({
        id: board.id,
        title: board.title,
        mine: false,
        snippet: latest[board.id]?.body || 'No messages yet',
        at: latest[board.id]?.created_at || board.created_at,
      });
    });
    list.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    setRows(list);
    setNotice('');
    setLoading(false);
  }, [app.userId, app.isArtist]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  if (!app.ready) return <View style={styles.screen} />;
  if (!app.userId) return <Redirect href="/sign-in" />;

  async function create() {
    const name = title.trim();
    if (name.length < 2) {
      setNotice('Name your Bulletin.');
      return;
    }
    setBusy(true);
    setNotice('');
    const { data, error } = await supabase.rpc('create_bulletin', {
      p_title: name,
      p_description: '',
      p_members_can_reply: replies,
      p_cover: null,
    });
    setBusy(false);
    if (error) {
      if (/bulletin_exists/i.test(error.message || '')) {
        setNotice('You already have a Bulletin.');
        await load();
        const existing = rows.find((row) => row.mine) || null;
        if (existing?.id) {
          setCreateOpen(false);
          router.replace({ pathname: '/artist-bulletins/[id]', params: { id: existing.id } });
        } else {
          const { data: mine } = await supabase
            .from('bulletins')
            .select('id')
            .eq('artist_id', app.userId)
            .is('archived_at', null)
            .maybeSingle();
          if (mine?.id) {
            setCreateOpen(false);
            router.replace({ pathname: '/artist-bulletins/[id]', params: { id: mine.id } });
          }
        }
        return;
      }
      setNotice('Could not create.');
      return;
    }
    setCreateOpen(false);
    setTitle('');
    router.replace({ pathname: '/artist-bulletins/[id]', params: { id: data } });
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
        <ScreenHeader title="Bulletins" back />
        {app.isArtist && !hasMine ? (
          <Pressable
            style={styles.createBtn}
            onPress={() => setCreateOpen(true)}
            accessibilityLabel="Create Bulletin"
          >
            <Ionicons name="add" size={22} color={colors.mintInk} />
          </Pressable>
        ) : null}
      </View>

      {loading ? <Text style={styles.empty}>Loading…</Text> : null}
      {!loading && rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No Bulletins yet.</Text>
          {app.isArtist ? (
            <Pressable style={styles.emptyCta} onPress={() => setCreateOpen(true)} accessibilityLabel="Create Bulletin">
              <Text style={styles.emptyCtaText}>Create</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: '/artist-bulletins/[id]', params: { id: item.id } })}
            accessibilityLabel={item.title}
          >
            <View style={styles.avatar}>
              <Ionicons name="chatbubbles" size={22} color={colors.mint} />
            </View>
            <View style={styles.copy}>
              <View style={styles.rowTop}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.time}>{timeLabel(item.at)}</Text>
              </View>
              <Text style={styles.snippet} numberOfLines={1}>{item.snippet}</Text>
            </View>
          </Pressable>
        )}
      />

      {notice && !createOpen ? <Text style={styles.notice}>{notice}</Text> : null}

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.sheetScrim} onPress={() => setCreateOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.sheetTitle}>New Bulletin</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Bulletin name"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Members can reply</Text>
              <Switch value={replies} onValueChange={setReplies} trackColor={{ true: colors.mint }} />
            </View>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <Pressable style={styles.primary} onPress={create} disabled={busy} accessibilityLabel="Create">
              <Text style={styles.primaryText}>{busy ? 'Creating…' : 'Create'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    top: {
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    createBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    list: { paddingBottom: 40 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, gap: 4 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { flex: 1, color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    time: { color: colors.muted, fontFamily: font.regular, fontSize: 12 },
    snippet: { color: colors.muted, fontFamily: font.regular, fontSize: 14 },
    emptyWrap: { alignItems: 'center', marginTop: 48, gap: 14 },
    empty: { color: colors.muted, fontFamily: font.regular, fontSize: 15, textAlign: 'center', marginTop: 24 },
    emptyCta: {
      backgroundColor: colors.mint,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    emptyCtaText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    sheetScrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      gap: 12,
    },
    sheetTitle: { color: colors.text, fontFamily: font.bold, fontSize: 20 },
    input: {
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingHorizontal: 14,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { color: colors.text, fontFamily: font.medium, fontSize: 15 },
    primary: {
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    notice: { color: colors.amber, fontFamily: font.medium, fontSize: 14, marginHorizontal: 16, marginBottom: 8 },
  });
}
