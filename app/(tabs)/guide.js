import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askGuide } from '../../src/lib/supabase';
import { listenOnce, speakLine, stopSpeaking } from '../../src/lib/speech';
import { goBack } from '../../src/lib/navigation';
import { useKeyboardPad } from '../../src/hooks/useKeyboardPad';
import { font } from '../../src/theme';
import { useTheme } from '../../src/state/ThemeState';
import { useApp } from '../../src/state/AppState';
import { useAds } from '../../src/state/AdState';
import { AD_COSTS } from '../../src/ads/rewards';

const greeting = 'Hello. How are you feeling, or what kind of sound would you like?';

function relatedTracks(choice, catalogue, ids) {
  const picked = (ids || []).map((id) => catalogue.find((item) => item.id === id)).filter(Boolean);
  const alike = catalogue.filter((item) => item.id !== choice.id && (
    item.category === choice.category || (item.tags || []).some((tag) => (choice.tags || []).includes(tag))
  ));
  const queue = [choice];
  for (const item of [...picked, ...alike]) {
    if (!queue.some((existing) => existing.id === item.id)) queue.push(item);
  }
  return queue.slice(0, 12);
}

export default function GuideScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPad(8);
  const params = useLocalSearchParams();
  const fromMenu = params.from === 'menu';
  const voiceReady = Platform.OS === 'web';
  const { play, playing, togglePlay, skip, reducedMotion, setAiChats, track, tracks, online } = useApp();
  const { hasPremiumAccess, requestUnlock } = useAds();
  const [phase, setPhase] = useState('ready');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const glow = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useFocusEffect(useCallback(() => {
    if (!hasPremiumAccess || !online) return undefined;
    if (phaseRef.current !== 'ready') return undefined;
    speakLine(greeting);
    return () => stopSpeaking();
  }, [online, hasPremiumAccess]));

  useEffect(() => {
    if (reducedMotion || phase === 'ready' || phase === 'playing') {
      glow.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.55, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, phase, reducedMotion]);

  async function ensureAccess() {
    if (hasPremiumAccess) return true;
    const ok = await requestUnlock('premium24h');
    if (!ok) {
      setNotice(`Watch ${AD_COSTS.premium24h} ads for 24 hours of Premium, or see plans.`);
    }
    return ok;
  }

  async function ask(text) {
    const said = String(text || '').replace(/\s+/g, ' ').trim();
    if (!(await ensureAccess())) return;
    if (!online) {
      setNotice('The guide needs a connection.');
      return;
    }
    if (busy.current || said.length < 2) return;
    stopSpeaking();
    busy.current = true;
    setDraft('');
    setNotice('');
    setPhase('choosing');
    try {
      const result = await askGuide(said);
      if (!result.ok) {
        setPhase('ready');
        setNotice(result.error);
        return;
      }
      const choice = tracks.find((item) => item.id === result.id);
      if (!choice) throw new Error('empty');
      const queue = relatedTracks(choice, tracks, result.ids);
      setPhase('playing');
      setAiChats((items) => [{ id: String(Date.now()), title: said }, ...items].slice(0, 20));
      play(choice, queue, { follow: true });
      speakLine(result.line);
    } catch {
      setPhase('ready');
      setNotice('The guide could not choose a sound. Try again.');
    } finally {
      busy.current = false;
    }
  }

  async function listen() {
    if (!(await ensureAccess())) return;
    if (!online) {
      setNotice('The guide needs a connection.');
      return;
    }
    if (busy.current) return;
    stopSpeaking();
    busy.current = true;
    setNotice('');
    setPhase('listening');
    try {
      const heard = await listenOnce();
      busy.current = false;
      if (!heard || heard.trim().length < 2) throw new Error('empty');
      await ask(heard);
    } catch (error) {
      busy.current = false;
      setPhase('ready');
      const reason = error instanceof Error ? error.message : '';
      if (reason === 'not-allowed') setNotice('Allow the microphone, then tap again.');
      else if (reason === 'unavailable') {
        setNotice(Platform.OS === 'web'
          ? 'This browser cannot hear you yet. Type a request instead.'
          : 'Voice input works in the web app for now. Type a request here.');
      }
      else if (reason === 'timeout' || reason === 'empty' || reason === 'no-speech') setNotice('Nothing came through. Type a request, or tap the mic again.');
      else setNotice('The guide could not hear that. Type a request, or tap the mic again.');
    }
  }

  const caption = !hasPremiumAccess
    ? 'Guide unlocks with Premium or ads'
    : phase === 'listening'
      ? 'Listening'
      : phase === 'choosing'
        ? 'Choosing a sound'
        : phase === 'playing'
          ? (playing ? 'Playing' : 'Paused')
          : '';

  const bottomPad = Math.max(insets.bottom, 12) + 18 + keyboardPad;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {fromMenu ? (
        <Pressable onPress={() => goBack({ from: 'menu' })} hitSlop={10} style={styles.back} accessibilityLabel="Back to menu">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.center}>
        <Animated.View style={[styles.glow, { opacity: glow }]}>
          <View style={styles.orb} />
        </Animated.View>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        {phase === 'playing' && track ? <Text style={styles.track}>{track.title}</Text> : null}
        {notice ? <Text style={styles.track}>{notice}</Text> : null}
        {!hasPremiumAccess ? (
          <View style={styles.unlockRow}>
            <Pressable style={styles.unlock} onPress={() => requestUnlock('premium24h')} accessibilityLabel="Watch ads for Premium">
              <Text style={styles.unlockText}>Watch {AD_COSTS.premium24h} ads · 24h Premium</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/plans')} accessibilityLabel="See plans">
              <Text style={styles.plansLink}>See plans</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={[styles.bottom, { paddingBottom: bottomPad }]}>
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={voiceReady ? 'Type a sound, or tap the mic' : 'Type the sound you want'}
            placeholderTextColor={colors.muted}
            style={[styles.input, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
            returnKeyType="send"
            onSubmitEditing={() => ask(draft)}
            editable={phase !== 'listening' && phase !== 'choosing'}
            accessibilityLabel="Type a request"
          />
          <Pressable
            style={[styles.send, draft.trim().length < 2 && styles.sendQuiet]}
            onPress={() => ask(draft)}
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={20} color={colors.mintInk} />
          </Pressable>
        </View>
        <View style={styles.transport}>
          <Pressable onPress={() => skip(-1)} hitSlop={8} accessibilityLabel="Previous sound">
            <Ionicons name="play-skip-back" size={26} color={colors.text} />
          </Pressable>
          <Pressable style={styles.pause} onPress={togglePlay} disabled={!track} accessibilityLabel={playing ? 'Pause' : 'Play'}>
            <Ionicons name={playing ? 'pause' : 'play'} size={26} color={colors.mintInk} />
          </Pressable>
          <Pressable onPress={() => skip(1)} hitSlop={8} accessibilityLabel="Next sound">
            <Ionicons name="play-skip-forward" size={26} color={colors.text} />
          </Pressable>
          {voiceReady ? (
            <Pressable style={styles.mic} onPress={listen} accessibilityLabel="Speak">
              <Ionicons name="mic" size={22} color={colors.mintInk} />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.mic, styles.micOff]}
              onPress={() => setNotice('Voice input works in the web app for now. Type a request here.')}
              accessibilityLabel="Voice unavailable"
            >
              <Ionicons name="mic-off" size={22} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.card,
    paddingHorizontal: 24,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(139,225,207,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: colors.mint,
    borderWidth: 18,
    borderColor: colors.mint,
    shadowColor: colors.lavender,
    shadowOpacity: 0.9,
    shadowRadius: 24,
  },
  caption: {
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 18,
    marginTop: 28,
  },
  track: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  unlockRow: {
    marginTop: 18,
    alignItems: 'center',
    gap: 10,
  },
  unlock: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockText: {
    color: colors.mintInk,
    fontFamily: font.semibold,
    fontSize: 14,
  },
  plansLink: {
    color: colors.muted,
    fontFamily: font.medium,
    fontSize: 14,
  },
  bottom: { gap: 22 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingVertical: 14,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendQuiet: { opacity: 0.45 },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pause: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOff: {
    backgroundColor: colors.cardRaised,
  },
  });
}
