import React from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import localTracks from '../data/tracks.json';
import { audioFiles } from '../data/audioFiles';
import { fetchCategories, fetchPremium, fetchProfile, fetchPublishedTracks, supabase } from '../lib/supabase';
import { presentNotice } from '../lib/notices';
import { connectionOnline, downloadGate, readOnline, watchNetwork } from '../lib/network';

const AppContext = React.createContext(null);

function downloadFile(id) {
  return new File(Paths.document, 'downloads', `${id}.mp3`);
}

const webDownloadKey = 'xoundra-web-downloads';

async function readWebDownloads() {
  try {
    const raw = await AsyncStorage.getItem(webDownloadKey);
    const ids = JSON.parse(raw || '[]');
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

const starterNotes = [];

const emptyMix = [];

export function AppProvider({ children }) {
  const [queue, setQueue] = React.useState([]);
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [shuffle, setShuffle] = React.useState(false);
  const [repeat, setRepeat] = React.useState(false);
  const [sleepMinutes, setSleepMinutes] = React.useState(0);
  const [sleepLeft, setSleepLeft] = React.useState(0);
  const [favourites, setFavourites] = React.useState([]);
  const [likes, setLikes] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [resumeId, setResumeId] = React.useState(null);
  const [signals, setSignals] = React.useState([]);
  const [helped, setHelped] = React.useState([]);
  const [online, setOnline] = React.useState(true);
  const [playbackNote, setPlaybackNote] = React.useState('');
  const [isArtist, setIsArtist] = React.useState(false);
  const [onboardingDone, setOnboardingDone] = React.useState(false);
  const [picks, setPicks] = React.useState([]);
  const [avatarStamp, setAvatarStamp] = React.useState(0);
  const [artistName, setArtistName] = React.useState('');
  const [artistBio, setArtistBio] = React.useState('');
  const [artistLocation, setArtistLocation] = React.useState('');
  const [artistBanner, setArtistBanner] = React.useState('');
  const [continueHydrated, setContinueHydrated] = React.useState(false);
  const [country, setCountryState] = React.useState('NG');
  const [premium, setPremium] = React.useState(false);
  const [firstName, setFirstName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [emailConfirmed, setEmailConfirmed] = React.useState(false);
  const [avatarPath, setAvatarPath] = React.useState('');
  const [intention, setIntention] = React.useState('');
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [categories, setCategories] = React.useState([]);
  const [userId, setUserId] = React.useState(null);
  const [ready, setReady] = React.useState(false);
  const [tracks, setTracks] = React.useState(localTracks);
  const [downloads, setDownloads] = React.useState([]);
  const [downloadOnWifiOnly, setDownloadOnWifiOnlyState] = React.useState(false);
  const wifiOnlyRef = React.useRef(false);
  const waitIds = React.useRef([]);
  const flushRef = React.useRef(() => {});
  const [mixPlaying, setMixPlaying] = React.useState(false);
  const [notes, setNotes] = React.useState(starterNotes);
  const [notifyEnabled, setNotifyEnabled] = React.useState(true);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [mix, setMix] = React.useState(emptyMix);
  const mixRef = React.useRef(emptyMix);
  const [aiChats, setAiChats] = React.useState([]);

  const playback = React.useRef({});
  const playerRef = React.useRef(null);
  const userRef = React.useRef(null);
  const sessionUserRef = React.useRef(null);
  const tracksRef = React.useRef(localTracks);
  const premiumRef = React.useRef(false);
  const onlineRef = React.useRef(true);
  const notifyRef = React.useRef(true);
  const notedUser = React.useRef(null);
  const startRef = React.useRef(() => {});
  const endLock = React.useRef(false);
  const guideFollow = React.useRef(false);
  const collectionLock = React.useRef(false);
  const userHeld = React.useRef(false);
  const startedAt = React.useRef(0);
  const advanceRef = React.useRef(() => {});
  const mixPlayers = React.useRef([]);
  playback.current = { playing, track: queue[index] || null, queue, index, repeat, shuffle, sleepLeft, position, collection: collectionLock.current };
  mixRef.current = mix;
  userRef.current = userId;
  tracksRef.current = tracks;
  premiumRef.current = premium;
  notifyRef.current = notifyEnabled;
  wifiOnlyRef.current = downloadOnWifiOnly;

  function releaseMixPlayers() {
    mixPlayers.current.forEach((player) => {
      try {
        player.pause();
        player.remove();
      } catch {
        // already released
      }
    });
    mixPlayers.current = [];
  }

  function stopMix() {
    releaseMixPlayers();
    setMixPlaying(false);
  }

  React.useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
    let player;
    try {
      player = createAudioPlayer(null);
    } catch {
      return undefined;
    }
    playerRef.current = player;
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      setPosition(status.currentTime || 0);
      setPlaying(Boolean(status.playing));
      const duration = status.duration || playback.current.track?.duration || 0;
      const ended = status.didJustFinish || (duration > 1 && !status.playing && status.currentTime >= duration - 0.45);
      if (ended) advanceRef.current();
    });
    const watch = setInterval(() => {
      const current = playerRef.current;
      if (!current || current.loop) return;
      const duration = current.duration || playback.current.track?.duration || 0;
      const time = current.currentTime || 0;
      const nearEnd = duration > 1 && time >= duration - 0.45;
      const stopped = current.paused || !current.playing || time >= duration - 0.05;
      if (nearEnd && stopped) advanceRef.current();
    }, 500);
    return () => {
      clearInterval(watch);
      try {
        subscription.remove();
        player.remove();
      } catch {
        // player was already released
      }
      playerRef.current = null;
      stopMix();
    };
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const state = playback.current;
      if (!state.playing || !state.sleepLeft) return;
      if (state.sleepLeft <= 1) {
        guideFollow.current = false;
        userHeld.current = true;
        playerRef.current?.pause();
        setPlaying(false);
        setSleepMinutes(0);
        setSleepLeft(0);
        return;
      }
      setSleepLeft(state.sleepLeft - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (playerRef.current) playerRef.current.loop = guideFollow.current ? false : repeat;
  }, [repeat]);

  const loadAccount = React.useCallback(async (sessionUser) => {
    setUserId(sessionUser?.id ?? null);
    sessionUserRef.current = sessionUser ?? null;
    if (!sessionUser) {
      notedUser.current = null;
      setPremium(false);
      setFirstName('');
      setEmail('');
      setEmailConfirmed(false);
      setAvatarPath('');
      setIntention('');
      setIsAdmin(false);
      setFavourites([]);
      setLikes([]);
      setHistory([]);
      setHelped([]);
      setIsArtist(false);
      setArtistName('');
      setArtistBio('');
      setArtistLocation('');
      setArtistBanner('');
      setOnboardingDone(false);
      setPicks([]);
      return false;
    }
    const [profileResult, isPremium, saved, liked, played, role, notes, picked] = await Promise.all([
      fetchProfile(sessionUser.id),
      fetchPremium(sessionUser.id),
      supabase.from('favorites').select('track_id, created_at').eq('user_id', sessionUser.id),
      supabase.from('likes').select('track_id, created_at').eq('user_id', sessionUser.id),
      supabase.from('listening_history').select('track_id').eq('user_id', sessionUser.id).order('played_at', { ascending: false }).limit(40),
      supabase.from('user_roles').select('role').eq('user_id', sessionUser.id).eq('role', 'admin').maybeSingle(),
      supabase.from('track_comments').select('helped').eq('user_id', sessionUser.id),
      supabase.from('profile_picks').select('track_id').eq('user_id', sessionUser.id),
    ]);
    let profile = profileResult;
    if (!profile?.first_name) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      profile = (await fetchProfile(sessionUser.id)) || profile;
    }
    if (profile?.country_code) setCountryState(profile.country_code);
    setFirstName(profile?.first_name || '');
    setEmail(sessionUser.email || '');
    setEmailConfirmed(profile?.email_confirmed === true);
    setAvatarPath(profile?.avatar_path || '');
    setAvatarStamp(Date.now());
    setIntention(profile?.intention || '');
    setOnboardingDone(profile?.onboarding_done === true);
    setIsArtist(profile?.is_artist === true);
    setArtistName(profile?.artist_name || '');
    setArtistBio(profile?.artist_bio || '');
    setArtistLocation(profile?.artist_location || '');
    setArtistBanner(profile?.artist_banner_path || '');
    setIsAdmin(Boolean(role.data));
    setPremium(isPremium);
    if (notedUser.current !== sessionUser.id) {
      notedUser.current = sessionUser.id;
      setNotes((items) => [
        { id: `welcome-${sessionUser.id}`, title: 'Welcome back', body: 'Your sounds are ready.', read: false },
        ...items.filter((item) => item.id !== `welcome-${sessionUser.id}`),
      ].slice(0, 40));
      if (notifyRef.current) presentNotice('Welcome back', 'Your sounds are ready.');
    }
    const byId = (id) => tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id);
    const withAdded = (row) => {
      const track = byId(row.track_id);
      return track ? { ...track, addedAt: row.created_at || '' } : null;
    };
    setFavourites((saved.data || []).map(withAdded).filter(Boolean));
    setLikes((liked.data || []).map(withAdded).filter(Boolean));
    setPicks((picked.data || []).map((row) => row.track_id));
    setHelped((notes.data || []).map((row) => row.helped).filter(Boolean));
    const seen = new Set();
    setHistory((played.data || []).map((row) => byId(row.track_id)).filter((item) => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }));
    return profile?.onboarding_done === true;
  }, []);

  React.useEffect(() => {
    let alive = true;
    fetchPublishedTracks()
      .then((remote) => {
        if (!alive || !remote.tracks?.length) return;
        setTracks(remote.tracks);
        setSignals(remote.signals || []);
        AsyncStorage.setItem('xoundra-catalogue', JSON.stringify({ tracks: remote.tracks, signals: remote.signals || [] })).catch(() => {});
      })
      .catch(() => {
        AsyncStorage.getItem('xoundra-catalogue').then((raw) => {
          if (!alive || !raw) return;
          const cached = JSON.parse(raw);
          if (Array.isArray(cached?.tracks) && cached.tracks.length) {
            setTracks(cached.tracks);
            setSignals(cached.signals || []);
          }
        }).catch(() => {});
      });
    AsyncStorage.getItem('xoundra-continue').then((raw) => {
      if (!alive || !raw) return;
      const saved = JSON.parse(raw);
      if (saved?.pausedId) setResumeId(saved.pausedId);
      if (Array.isArray(saved?.historyIds) && saved.historyIds.length) {
        const byId = (id) => tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id);
        setHistory((items) => (items.length ? items : saved.historyIds.map(byId).filter(Boolean)));
      }
    }).finally(() => {
      if (alive) setContinueHydrated(true);
    });
    fetchCategories()
      .then((remote) => {
        if (alive && remote.length) setCategories(remote);
      })
      .catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      loadAccount(data.session?.user ?? null).finally(() => {
        if (alive) setReady(true);
      });
    });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        loadAccount(session?.user ?? null);
      }, 0);
    });
    return () => {
      alive = false;
      auth.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const adjustCount = React.useCallback((id, key, delta) => {
    const apply = (item) => (item?.id === id ? { ...item, [key]: Math.max(0, (item[key] || 0) + delta) } : item);
    setTracks((items) => items.map(apply));
    setQueue((items) => items.map(apply));
    setHistory((items) => items.map(apply));
    setDownloads((items) => items.map(apply));
    setFavourites((items) => items.map(apply));
    setLikes((items) => items.map(apply));
  }, []);

  const startSound = React.useCallback((track) => {
    const player = playerRef.current;
    if (!track || !player) return;
    const bundled = audioFiles[track.id];
    let source = null;
    try {
      const saved = downloadFile(track.id);
      if (saved.exists) source = saved.uri;
    } catch {
      source = null;
    }
    if (!source && bundled) source = bundled;
    if (!source && track.audioUrl && onlineRef.current) source = track.audioUrl;
    if (!source) {
      setPlaybackNote(onlineRef.current ? 'This sound is not on this device.' : 'Download this sound to play it offline.');
      return;
    }
    setPlaybackNote('');
    stopMix();
    endLock.current = false;
    startedAt.current = Date.now();
    try {
      player.loop = guideFollow.current ? false : playback.current.repeat;
      player.replace(source);
      player.play();
    } catch {
      setPlaybackNote('This sound could not be played.');
      return;
    }
    setPosition(0);
    setPlaying(true);
    setResumeId(track.id);
    adjustCount(track.id, 'plays', 1);
    if (userRef.current) {
      supabase.from('listening_history').insert({ user_id: userRef.current, track_id: track.id }).then(() => {});
    }
  }, [adjustCount]);
  startRef.current = startSound;

  const advanceQueue = React.useCallback(() => {
    if (endLock.current || Date.now() - startedAt.current < 800) return;
    endLock.current = true;
    if (userHeld.current) {
      userHeld.current = false;
      playerRef.current?.pause();
      setPlaying(false);
      return;
    }
    const state = playback.current;
    if (state.collection) {
      const nextIndex = state.index + 1;
      if (nextIndex < state.queue.length) {
        setIndex(nextIndex);
        startRef.current(state.queue[nextIndex]);
        return;
      }
      playerRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (guideFollow.current && state.queue.length) {
      const nextIndex = (state.index + 1) % state.queue.length;
      setIndex(nextIndex);
      startRef.current(state.queue[nextIndex]);
      return;
    }
    if (state.repeat) return;
    let nextIndex = state.index + 1;
    if (state.shuffle && state.queue.length > 1) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    }
    if (nextIndex >= 0 && nextIndex < state.queue.length) {
      setIndex(nextIndex);
      startRef.current(state.queue[nextIndex]);
      return;
    }
    playerRef.current?.pause();
    setPlaying(false);
  }, []);
  advanceRef.current = advanceQueue;

  const play = React.useCallback((track, list, options) => {
    if (track?.access === 'premium' && !premiumRef.current) {
      router.push('/plans');
      return;
    }
    const collection = Boolean(options?.collection);
    guideFollow.current = Boolean(options?.follow) && !collection;
    collectionLock.current = collection;
    userHeld.current = false;
    let nextQueue = list && list.length ? [...list] : [track];
    if (collection) {
      nextQueue = [track, ...nextQueue.filter((item) => item.id !== track.id)];
    }
    const nextIndex = collection ? 0 : Math.max(0, nextQueue.findIndex((item) => item.id === track.id));
    setQueue(nextQueue);
    setIndex(nextIndex);
    setHistory((items) => [track, ...items.filter((item) => item.id !== track.id)].slice(0, 30));
    startSound(track);
  }, [startSound]);

  const togglePlay = React.useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (playback.current.playing) {
      if (guideFollow.current) {
        guideFollow.current = false;
        userHeld.current = true;
      }
      player.pause();
    } else player.play();
  }, []);

  const seek = React.useCallback((seconds) => {
    const track = playback.current.track;
    if (!track) return;
    const next = Math.min(track.duration, Math.max(0, seconds));
    setPosition(next);
    playerRef.current?.seekTo(next);
  }, []);

  const skip = React.useCallback((direction) => {
    const state = playback.current;
    if (!state.queue.length) return;
    let next = state.index + direction;
    if (guideFollow.current) next = (next + state.queue.length) % state.queue.length;
    else if (next < 0 || next >= state.queue.length) return;
    const track = state.queue[next];
    setIndex(next);
    startSound(track);
  }, [startSound]);

  const toggleFavourite = React.useCallback((track) => {
    setFavourites((items) => {
      const exists = items.some((item) => item.id === track.id);
      if (userRef.current) {
        if (exists) {
          supabase.from('favorites').delete().eq('user_id', userRef.current).eq('track_id', track.id).then(() => {});
        } else {
          supabase.from('favorites').insert({ user_id: userRef.current, track_id: track.id }).then(() => {});
        }
      }
      adjustCount(track.id, 'favorites', exists ? -1 : 1);
      if (exists) return items.filter((item) => item.id !== track.id);
      return [track, ...items];
    });
  }, [adjustCount]);

  const toggleLike = React.useCallback((track) => {
    setLikes((items) => {
      const exists = items.some((item) => item.id === track.id);
      if (userRef.current) {
        if (exists) {
          supabase.from('likes').delete().eq('user_id', userRef.current).eq('track_id', track.id).then(() => {});
        } else {
          supabase.from('likes').insert({ user_id: userRef.current, track_id: track.id }).then(() => {});
        }
      }
      adjustCount(track.id, 'likes', exists ? -1 : 1);
      if (exists) return items.filter((item) => item.id !== track.id);
      return [track, ...items];
    });
  }, [adjustCount]);

  const cycleSleep = React.useCallback(() => {
    const order = [0, 15, 30, 45];
    const next = order[(order.indexOf(sleepMinutes) + 1) % order.length];
    setSleepMinutes(next);
    setSleepLeft(next * 60);
  }, [sleepMinutes]);

  const setLayerVolume = React.useCallback((id, volume) => {
    setMix((layers) => layers.map((layer) => (
      layer.id === id ? { ...layer, volume: Math.min(1, Math.max(0, volume)), muted: false } : layer
    )));
  }, []);

  const addLayer = React.useCallback((track) => {
    if (!track?.id) return false;
    let added = false;
    setMix((layers) => {
      if (layers.some((layer) => layer.id === track.id) || layers.length >= 6) return layers;
      added = true;
      return [...layers, { id: track.id, volume: 0.65, muted: false }];
    });
    return added;
  }, []);

  const removeLayer = React.useCallback((id) => {
    setMix((layers) => layers.filter((layer) => layer.id !== id));
  }, []);

  const toggleLayerMute = React.useCallback((id) => {
    setMix((layers) => layers.map((layer) => (layer.id === id ? { ...layer, muted: !layer.muted } : layer)));
  }, []);

  const openMix = React.useCallback((layers, playNow) => {
    const next = (layers || []).slice(0, 6).map((layer) => ({
      id: layer.track_id || layer.id,
      volume: Math.min(1, Math.max(0, Number(layer.gain ?? layer.volume ?? 0.65))),
      muted: Boolean(layer.muted),
    })).filter((layer) => layer.id);
    mixRef.current = next;
    setMix(next);
    if (!playNow) return true;
    if (!premiumRef.current) {
      router.push('/plans');
      return false;
    }
    if (!next.length) return false;
    endLock.current = true;
    playerRef.current?.pause();
    setPlaying(false);
    setMixPlaying(true);
    return true;
  }, []);

  const markNotesRead = React.useCallback(() => {
    setNotes((items) => items.map((item) => ({ ...item, read: true })));
  }, []);

  const addNote = React.useCallback((title, body) => {
    const text = (body || '').trim();
    const heading = (title || 'Xoundra').trim();
    if (!heading && !text) return;
    setNotes((items) => [
      { id: `${Date.now()}`, title: heading, body: text, read: false },
      ...items,
    ].slice(0, 40));
  }, []);

  const clearHistory = React.useCallback(() => {
    setHistory([]);
    if (userRef.current) {
      supabase.from('listening_history').delete().eq('user_id', userRef.current).then(() => {});
    }
  }, []);
  const clearAiChats = React.useCallback(() => setAiChats([]), []);

  const setCountry = React.useCallback((code) => {
    setCountryState(code);
    if (userRef.current) {
      supabase.from('profiles').update({ country_code: code }).eq('id', userRef.current).then(() => {});
    }
  }, []);

  const refreshPremium = React.useCallback(async () => {
    if (!userRef.current) return false;
    const active = await fetchPremium(userRef.current);
    setPremium(active);
    return active;
  }, []);

  const signOut = React.useCallback(async () => {
    playerRef.current?.pause();
    stopMix();
    await supabase.auth.signOut();
    setQueue([]);
    setPlaying(false);
    setPosition(0);
    setFavourites([]);
    setLikes([]);
    setHistory([]);
    setHelped([]);
    setDownloads([]);
    setIsArtist(false);
    setArtistName('');
    setArtistBio('');
    setArtistLocation('');
    setArtistBanner('');
    setOnboardingDone(false);
    setPicks([]);
    setPremium(false);
    setFirstName('');
    setEmail('');
    setEmailConfirmed(false);
    setAvatarPath('');
    setIntention('');
    setIsAdmin(false);
  }, []);

  const writeWait = React.useCallback((ids) => {
    waitIds.current = ids;
    AsyncStorage.setItem('xoundra-download-wait', JSON.stringify(ids)).catch(() => {});
  }, []);

  const saveDownloadNow = React.useCallback(async (track) => {
    try {
      const bundled = audioFiles[track.id];
      if (!bundled && !track.audioUrl) return 'missing';
      if (Platform.OS === 'web') {
        const ids = await readWebDownloads();
        if (!ids.includes(track.id)) {
          await AsyncStorage.setItem(webDownloadKey, JSON.stringify([track.id, ...ids]));
        }
      } else if (track.audioUrl && !audioFiles[track.id]) {
        const folder = new Directory(Paths.document, 'downloads');
        if (!folder.exists) folder.create();
        const destination = new File(folder, `${track.id}.mp3`);
        if (!destination.exists) await File.downloadFileAsync(track.audioUrl, destination);
      } else {
        const folder = new Directory(Paths.document, 'downloads');
        if (!folder.exists) folder.create();
        const asset = Asset.fromModule(bundled);
        await asset.downloadAsync();
        const destination = new File(folder, `${track.id}.mp3`);
        if (!destination.exists && asset.localUri) {
          await new File(asset.localUri).copy(destination);
        }
      }
      if (userRef.current) {
        supabase.from('downloads').insert({ user_id: userRef.current, track_id: track.id, status: 'ready' }).then(() => {});
      }
      setDownloads((items) => (items.some((item) => item.id === track.id) ? items : [track, ...items]));
      writeWait(waitIds.current.filter((id) => id !== track.id));
      return 'saved';
    } catch {
      return 'missing';
    }
  }, [writeWait]);

  const flushWaiting = React.useCallback(async () => {
    const gate = await downloadGate(wifiOnlyRef.current);
    if (gate !== 'ok' || !waitIds.current.length) return;
    const ids = [...waitIds.current];
    for (const id of ids) {
      const track = tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id);
      if (track) await saveDownloadNow(track);
    }
  }, [saveDownloadNow]);
  flushRef.current = flushWaiting;

  const saveDownload = React.useCallback(async (track) => {
    if (!premiumRef.current) {
      router.push('/plans');
      return 'premium';
    }
    const gate = await downloadGate(wifiOnlyRef.current);
    if (gate === 'offline') return 'offline';
    if (gate === 'wifi') {
      if (!waitIds.current.includes(track.id)) writeWait([...waitIds.current, track.id]);
      return 'wifi';
    }
    return saveDownloadNow(track);
  }, [saveDownloadNow, writeWait]);

  const setDownloadOnWifiOnly = React.useCallback((wifiOnly) => {
    wifiOnlyRef.current = wifiOnly;
    setDownloadOnWifiOnlyState(wifiOnly);
    AsyncStorage.setItem('xoundra-download-network', wifiOnly ? 'wifi' : 'any').catch(() => {});
    if (!wifiOnly) flushRef.current();
  }, []);

  React.useEffect(() => {
    AsyncStorage.getItem('xoundra-download-network').then((value) => {
      const wifiOnly = value === 'wifi';
      wifiOnlyRef.current = wifiOnly;
      setDownloadOnWifiOnlyState(wifiOnly);
    }).catch(() => {});
    AsyncStorage.getItem('xoundra-download-wait').then((value) => {
      try {
        const ids = JSON.parse(value || '[]');
        if (Array.isArray(ids)) waitIds.current = ids.filter((id) => typeof id === 'string');
      } catch {
        waitIds.current = [];
      }
      flushRef.current();
    }).catch(() => {});
    const markOnline = (state) => {
      const next = connectionOnline(state);
      onlineRef.current = next;
      setOnline(next);
    };
    readOnline().then((next) => {
      onlineRef.current = next;
      setOnline(next);
    }).catch(() => {});
    const stop = watchNetwork((state) => {
      markOnline(state);
      flushRef.current();
    });
    const timer = setInterval(() => flushRef.current(), 5000);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, []);

  const removeDownload = React.useCallback(async (track) => {
    if (Platform.OS === 'web') {
      const ids = (await readWebDownloads()).filter((id) => id !== track.id);
      await AsyncStorage.setItem(webDownloadKey, JSON.stringify(ids));
    } else {
      const file = downloadFile(track.id);
      if (file.exists) file.delete();
    }
    if (userRef.current) {
      await supabase.from('downloads').delete().eq('user_id', userRef.current).eq('track_id', track.id);
    }
    setDownloads((items) => items.filter((item) => item.id !== track.id));
  }, []);

  const mixShape = mix.map((layer) => layer.id).join('|');

  const playMix = React.useCallback(() => {
    if (!premiumRef.current) {
      router.push('/plans');
      return;
    }
    if (mixPlaying) {
      stopMix();
      return;
    }
    if (!mixRef.current.length) return;
    endLock.current = true;
    playerRef.current?.pause();
    setPlaying(false);
    setMixPlaying(true);
  }, [mixPlaying]);

  React.useEffect(() => {
    if (!mixPlaying) return undefined;
    releaseMixPlayers();
    mixRef.current.forEach((layer) => {
      const source = audioFiles[layer.id];
      if (!source) return;
      const player = createAudioPlayer(source);
      player.loop = true;
      player.volume = layer.muted ? 0 : layer.volume;
      player.play();
      mixPlayers.current.push(player);
    });
    if (!mixPlayers.current.length) setMixPlaying(false);
    return () => releaseMixPlayers();
  }, [mixPlaying, mixShape]);

  React.useEffect(() => {
    if (!mixPlaying) return;
    mix.forEach((layer, index) => {
      const player = mixPlayers.current[index];
      if (player) player.volume = layer.muted ? 0 : layer.volume;
    });
  }, [mix, mixPlaying]);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      readWebDownloads().then((saved) => {
        const found = saved
          .map((id) => tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id))
          .filter(Boolean);
        setDownloads((items) => {
          const fresh = new Map(found.map((item) => [item.id, item]));
          const ordered = [...found];
          for (const item of items) {
            if (!fresh.has(item.id)) ordered.push(item);
          }
          return ordered;
        });
      }).catch(() => {});
      return;
    }
    try {
      const folder = new Directory(Paths.document, 'downloads');
      if (!folder.exists) return;
      const saved = folder.list()
        .map((entry) => String(entry.uri || entry.name || '').split('/').pop().replace(/\.mp3$/, ''))
        .filter(Boolean);
      const found = saved
        .map((id) => tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id))
        .filter(Boolean);
      setDownloads(found);
    } catch {
      // documents folder is unavailable on this platform
    }
  }, [ready, tracks]);

  React.useEffect(() => {
    if (!continueHydrated) return;
    const currentId = queue[index]?.id || resumeId || null;
    AsyncStorage.setItem('xoundra-continue', JSON.stringify({
      pausedId: currentId,
      historyIds: history.map((item) => item.id),
    })).catch(() => {});
  }, [continueHydrated, queue, index, history, resumeId]);

  const noteHelped = React.useCallback((trackId, helpedValue) => {
    if (helpedValue) setHelped((items) => (items.includes(helpedValue) ? items : [...items, helpedValue]));
    if (trackId && helpedValue) {
      setSignals((items) => [...items, { track_id: trackId, helped: helpedValue, total: 1 }]);
    }
  }, []);

  const refreshCatalogue = React.useCallback(() => {
    fetchPublishedTracks().then((remote) => {
      if (!remote.tracks?.length) return;
      setTracks(remote.tracks);
      setSignals(remote.signals || []);
    }).catch(() => {});
  }, []);

  const value = {
    queue,
    index,
    track: queue[index] || null,
    playing,
    position,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    sleepMinutes,
    sleepLeft,
    favourites,
    likes,
    history,
    resumeId,
    signals,
    helped,
    online,
    playbackNote,
    isArtist,
    artistName,
    artistBio,
    artistLocation,
    artistBanner,
    downloads,
    downloadOnWifiOnly,
    setDownloadOnWifiOnly,
    country,
    setCountry,
    premium,
    refreshPremium,
    firstName,
    email,
    emailConfirmed,
    avatarPath,
    avatarStamp,
    onboardingDone,
    picks,
    intention,
    isAdmin,
    categories,
    userId,
    ready,
    tracks,
    notes,
    unread: notes.filter((item) => !item.read).length,
    notifyEnabled,
    setNotifyEnabled,
    reducedMotion,
    setReducedMotion,
    mix,
    mixPlaying,
    setLayerVolume,
    addLayer,
    removeLayer,
    toggleLayerMute,
    openMix,
    aiChats,
    setAiChats,
    play,
    playMix,
    togglePlay,
    seek,
    skip,
    toggleFavourite,
    toggleLike,
    noteHelped,
    refreshCatalogue,
    cycleSleep,
    markNotesRead,
    addNote,
    clearHistory,
    clearAiChats,
    signOut,
    refreshAccount: () => loadAccount(sessionUserRef.current),
    adoptSession: async () => {
      const { data } = await supabase.auth.getSession();
      return loadAccount(data.session?.user ?? null);
    },
    saveDownload,
    removeDownload,
    isFavourite: (id) => favourites.some((item) => item.id === id),
    isLiked: (id) => likes.some((item) => item.id === id),
    isDownloaded: (id) => downloads.some((item) => item.id === id),
    mixTracks: mix
      .map((layer) => {
        const track = tracks.find((item) => item.id === layer.id) || localTracks.find((item) => item.id === layer.id);
        return track ? { ...track, volume: layer.volume, muted: Boolean(layer.muted) } : null;
      })
      .filter(Boolean),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = React.useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
