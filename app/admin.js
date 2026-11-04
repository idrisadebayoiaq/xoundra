import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { KeyboardScreen } from '../src/components/KeyboardScreen';
import { accountAction, drainNotices, supabase } from '../src/lib/supabase';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAdmin, ready } = useApp();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifications, setVerifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketReplies, setTicketReplies] = useState({});
  const [rejectNotes, setRejectNotes] = useState({});
  const [grantEmail, setGrantEmail] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [artistStats, setArtistStats] = useState({});

  const loadAdminLists = useCallback(async () => {
    const [{ data: pending }, { data: openTickets }] = await Promise.all([
      supabase
        .from('artist_verification_requests')
        .select('id, artist_id, note, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('support_tickets')
        .select('id, user_id, subject, status, updated_at')
        .in('status', ['open', 'answered'])
        .order('updated_at', { ascending: false })
        .limit(30),
    ]);

    const artistIds = (pending || []).map((row) => row.artist_id);
    let profileMap = {};
    if (artistIds.length) {
      const [{ data: people }, { data: tracks }] = await Promise.all([
        supabase.from('profiles').select('id, artist_name, first_name, artist_bio').in('id', artistIds),
        supabase.from('tracks').select('artist_id, id, track_stats(plays, likes, favorites)').in('artist_id', artistIds).eq('status', 'published'),
      ]);
      profileMap = Object.fromEntries((people || []).map((row) => [row.id, row]));
      const map = {};
      (tracks || []).forEach((row) => {
        const stats = Array.isArray(row.track_stats) ? row.track_stats[0] : row.track_stats;
        if (!map[row.artist_id]) map[row.artist_id] = { tracks: 0, plays: 0, likes: 0 };
        map[row.artist_id].tracks += 1;
        map[row.artist_id].plays += Number(stats?.plays) || 0;
        map[row.artist_id].likes += Number(stats?.likes) || 0;
      });
      setArtistStats(map);
    } else {
      setArtistStats({});
    }
    setVerifications((pending || []).map((row) => ({ ...row, profiles: profileMap[row.artist_id] || null })));

    const userIds = [...new Set((openTickets || []).map((row) => row.user_id))];
    let userMap = {};
    if (userIds.length) {
      const { data: people } = await supabase.from('profiles').select('id, first_name').in('id', userIds);
      userMap = Object.fromEntries((people || []).map((row) => [row.id, row]));
    }
    const ids = (openTickets || []).map((row) => row.id);
    let grouped = {};
    if (ids.length) {
      const { data: messages } = await supabase
        .from('support_messages')
        .select('id, ticket_id, body, is_admin, created_at')
        .in('ticket_id', ids)
        .order('created_at', { ascending: true });
      (messages || []).forEach((msg) => {
        if (!grouped[msg.ticket_id]) grouped[msg.ticket_id] = [];
        grouped[msg.ticket_id].push(msg);
      });
      setTicketReplies((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          if (next[id] === undefined) next[id] = '';
        });
        return next;
      });
    }
    setTickets((openTickets || []).map((t) => ({
      ...t,
      profiles: userMap[t.user_id] || null,
      messages: grouped[t.id] || [],
    })));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    accountAction('admin-overview').then((result) => {
      if (!result.ok) setError(result.error);
      else setOverview(result.data);
    });
  }, [isAdmin]);

  useFocusEffect(useCallback(() => {
    if (!isAdmin) return;
    loadAdminLists();
  }, [isAdmin, loadAdminLists]));

  async function publish() {
    if (title.trim().length < 2 || body.trim().length < 2) {
      setNotice('Add a title and the announcement.');
      return;
    }
    setBusy(true);
    const { data, error: failed } = await supabase.rpc('publish_announcement', {
      p_title: title.trim(),
      p_body: body.trim(),
    });
    setBusy(false);
    if (failed || !data) {
      setNotice('The announcement could not be sent.');
      return;
    }
    setTitle('');
    setBody('');
    setNotice('The announcement is published.');
    drainNotices();
  }

  async function reviewVerification(id, approve) {
    setBusy(true);
    const { error: failed } = await supabase.rpc('admin_review_verification', {
      p_request: id,
      p_approve: approve,
      p_admin_note: rejectNotes[id] || '',
    });
    setBusy(false);
    if (failed) {
      setNotice(approve ? 'Could not approve.' : 'Could not reject.');
      return;
    }
    setNotice(approve ? 'Artist verified. They were notified.' : 'Request rejected. Artist was notified.');
    drainNotices();
    loadAdminLists();
  }

  async function grantPremium() {
    const email = grantEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      setNotice('Enter the user email.');
      return;
    }
    setBusy(true);
    const result = await accountAction('admin-grant-premium', {
      email,
      days: Math.max(1, Number(grantDays) || 30),
      plan: 'premium_monthly',
    });
    setBusy(false);
    if (!result.ok) {
      setNotice(result.error || 'Could not grant Premium.');
      return;
    }
    setGrantEmail('');
    setNotice('Premium granted. User was notified.');
    drainNotices();
  }

  async function replyTicket(ticketId) {
    const text = (ticketReplies[ticketId] || '').trim();
    if (text.length < 2) {
      setNotice('Write a reply first.');
      return;
    }
    setBusy(true);
    const { error: failed } = await supabase.rpc('admin_reply_support', {
      p_ticket: ticketId,
      p_body: text,
    });
    setBusy(false);
    if (failed) {
      setNotice('Reply could not be sent.');
      return;
    }
    setTicketReplies((prev) => ({ ...prev, [ticketId]: '' }));
    setNotice('Reply sent. User gets email and push.');
    drainNotices();
    loadAdminLists();
  }

  if (!ready) return <View style={styles.screen} />;
  if (!isAdmin) return <Redirect href="/profile" />;

  return (
    <KeyboardScreen contentContainerStyle={styles.content} extraPad={72}>
      <ScreenHeader title="Admin" back />
      <Text style={styles.lead}>Verification, Premium grants, support replies, and announcements.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {overview ? (
        <View style={styles.grid}>
          <Stat label="People" value={overview.people} />
          <Stat label="Premium" value={overview.premium} />
          <Stat label="Sounds" value={overview.tracks} />
          <Stat label="Lifetime left" value={overview.lifetime_remaining} />
        </View>
      ) : null}

      <Text style={styles.section}>Verification requests</Text>
      {verifications.length === 0 ? <Text style={styles.empty}>No pending requests.</Text> : null}
      {verifications.map((item) => {
        const name = item.profiles?.artist_name || item.profiles?.first_name || 'Artist';
        const stats = artistStats[item.artist_id] || { tracks: 0, plays: 0, likes: 0 };
        return (
          <SurfaceCard key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{name}</Text>
            <Text style={styles.meta}>{stats.tracks} sounds · {stats.plays} plays · {stats.likes} likes</Text>
            {item.note ? <Text style={styles.body}>{item.note}</Text> : null}
            {item.profiles?.artist_bio ? <Text style={styles.meta} numberOfLines={3}>{item.profiles.artist_bio}</Text> : null}
            <TextInput
              value={rejectNotes[item.id] || ''}
              onChangeText={(value) => setRejectNotes((prev) => ({ ...prev, [item.id]: value }))}
              placeholder="Rejection note (required if rejecting)"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
            />
            <View style={styles.actions}>
              <Pressable style={styles.button} disabled={busy} onPress={() => reviewVerification(item.id, true)}>
                <Text style={styles.buttonText}>Approve</Text>
              </Pressable>
              <Pressable style={styles.outline} disabled={busy} onPress={() => reviewVerification(item.id, false)}>
                <Text style={styles.outlineText}>Reject</Text>
              </Pressable>
            </View>
          </SurfaceCard>
        );
      })}

      <Text style={styles.section}>Grant Premium</Text>
      <Text style={styles.lead}>Make a free user Premium without Paystack. They get email + push.</Text>
      <TextInput
        value={grantEmail}
        onChangeText={setGrantEmail}
        placeholder="User email"
        placeholderTextColor={colors.muted}
        style={styles.inputWide}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        value={grantDays}
        onChangeText={setGrantDays}
        placeholder="Days (30)"
        placeholderTextColor={colors.muted}
        style={styles.inputWide}
        keyboardType="number-pad"
      />
      <Pressable style={styles.button} disabled={busy} onPress={grantPremium}>
        <Text style={styles.buttonText}>{busy ? 'Working' : 'Grant Premium'}</Text>
      </Pressable>

      <Text style={styles.section}>Support inbox</Text>
      {tickets.length === 0 ? <Text style={styles.empty}>No open tickets.</Text> : null}
      {tickets.map((ticket) => (
        <SurfaceCard key={ticket.id} style={styles.card}>
          <Text style={styles.cardTitle}>{ticket.subject}</Text>
          <Text style={styles.meta}>
            {ticket.profiles?.first_name || 'Listener'} · {ticket.status}
          </Text>
          {(ticket.messages || []).map((msg) => (
            <Text key={msg.id} style={[styles.body, msg.is_admin && styles.adminMsg]}>
              {msg.is_admin ? 'Admin: ' : 'User: '}{msg.body}
            </Text>
          ))}
          <TextInput
            value={ticketReplies[ticket.id] || ''}
            onChangeText={(value) => setTicketReplies((prev) => ({ ...prev, [ticket.id]: value }))}
            placeholder="Write a reply"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.button} disabled={busy} onPress={() => replyTicket(ticket.id)}>
            <Text style={styles.buttonText}>Send reply</Text>
          </Pressable>
        </SurfaceCard>
      ))}

      <Text style={styles.section}>Announcement</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.muted} style={styles.inputWide} />
      <TextInput value={body} onChangeText={setBody} placeholder="Write the announcement" placeholderTextColor={colors.muted} style={[styles.inputWide, styles.bodyInput]} multiline />
      <Pressable onPress={publish} disabled={busy} style={styles.button}>
        <Text style={styles.buttonText}>{busy ? 'Sending' : 'Publish announcement'}</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </KeyboardScreen>
  );
}

function Stat({ label, value }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    lead: { color: colors.muted, fontFamily: font.regular, fontSize: 15, marginHorizontal: 20, marginBottom: 16, lineHeight: 22 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
    stat: { width: '47%', backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line },
    value: { color: colors.text, fontFamily: font.bold, fontSize: 28 },
    label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginTop: 4 },
    section: { color: colors.text, fontFamily: font.bold, fontSize: 18, marginHorizontal: 20, marginTop: 22, marginBottom: 8 },
    empty: { color: colors.muted, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 8 },
    card: { marginHorizontal: 20, marginBottom: 12, gap: 8 },
    cardTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
    meta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
    body: { color: colors.text, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
    adminMsg: { color: colors.mint },
    input: {
      minHeight: 72,
      borderRadius: 12,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 15,
      padding: 12,
      textAlignVertical: 'top',
    },
    inputWide: {
      marginHorizontal: 20,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.card,
      color: colors.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
    },
    bodyInput: { minHeight: 120, textAlignVertical: 'top' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    button: {
      alignSelf: 'flex-start',
      backgroundColor: colors.mint,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 20,
      marginBottom: 10,
    },
    buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
    outline: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    outlineText: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
    notice: { color: colors.mint, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 10 },
    error: { color: colors.amber, fontFamily: font.regular, marginHorizontal: 20, marginBottom: 10 },
  });
}
