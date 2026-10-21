import React from 'react';
import { Image, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, createAudioPlaylist, setAudioModeAsync } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import localTracks from '../data/tracks.json';
import { coverSource } from '../data/artwork';
import { drainNotices, fetchCategories, fetchPremium, fetchProfile, fetchPublishedTracks, supabase, trackAudioUrl } from '../lib/supabase';
import { presentNotice } from '../lib/notices';
import { publishDownloadProgress } from '../lib/downloadNotice';
import { connectionOnline, downloadGate, readOnline, watchNetwork } from '../lib/network';

const AppContext = React.createContext(null);

function downloadFile(userId, id) {
  if (!userId || !id) return null;
  return new File(Paths.document, 'downloads', userId, `${id}.mp3`);
}

function ensureDownloadFile(userId, id) {
  const root = new Directory(Paths.document, 'downloads');
  if (!root.exists) root.create();
  const folder = new Directory(root, userId);
  if (!folder.exists) folder.create();
  return new File(folder, `${id}.mp3`);
}

function playerSource(source) {
  if (!source) return null;
  if (typeof source === 'string') return { uri: source };
  if (typeof source === 'object' && source.uri) return { uri: source.uri };
  return null;
}

function clockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function insideWindow(start, stop, now) {
  if (start == null || stop == null || start === stop) return false;
  if (start < stop) return now >= start && now < stop;
  return now >= start || now < stop;
}

function windowStamp(start, now) {
  const day = new Date();
  if (now < start) day.setDate(day.getDate() - 1);
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}-${start}`;
}

function lockMetadata(track) {
  const art = track?.artwork ? Image.resolveAssetSource(coverSource(track.artwork)) : null;
  const artworkUrl = art?.uri && /^(https?:|file:)/.test(art.uri) ? art.uri : undefined;
  return {
    title: track?.title || 'Xoundra',
    artist: track?.artistName || 'Xoundra',
    albumTitle: 'Xoundra',
    ...(artworkUrl ? { artworkUrl } : {}),
  };
}

function showLock(player, track, allowSkip = true) {
  if (Platform.OS === 'web' || !player?.setActiveForLockScreen || !track) return;
  try {
    player.setActiveForLockScreen(true, lockMetadata(track), {
      showSeekForward: false,
      showSeekBackward: false,
      showNextTrack: allowSkip,
      showPreviousTrack: allowSkip,
    });
  } catch {
    // lock screen controls are unavailable in this build
  }
}

function hideLock(player) {
  try {
    player?.clearLockScreenControls?.();
  } catch {
    // already cleared
  }
}

function webDownloadKey(userId) {
  return userId ? `xoundra-web-downloads:${userId}` : '';
}
const sessionKey = 'sb-mmgezkeemyjxluxcshaz-auth-token';

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function storedUser() {
  try {
    const raw = await AsyncStorage.getItem(sessionKey);
    const saved = JSON.parse(raw || 'null');
    return saved?.user || saved?.currentSession?.user || null;
  } catch {
    return null;
  }
}

async function readWebDownloads(userId) {
  const key = webDownloadKey(userId);
  if (!key) return [];
  try {
    const raw = await AsyncStorage.getItem(key);
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
  const [onlineKnown, setOnlineKnown] = React.useState(false);
  const [playbackNote, setPlaybackNote] = React.useState('');
  const [isArtist, setIsArtist] = React.useState(false);
  const [onboardingDone, setOnboardingDone] = React.useState(false);
  const [picks, setPicks] = React.useState([]);
  const [avatarStamp, setAvatarStamp] = React.useState(0);
  const [artistName, setArtistName] = React.useState('');
  const [artistBio, setArtistBio] = React.useState('');
  const [artistLocation, setArtistLocation] = React.useState('');
  const [artistTagline, setArtistTagline] = React.useState('');
  const [artistFocus, setArtistFocus] = React.useState('');
  const [artistWebsite, setArtistWebsite] = React.useState('');
  const [artistLinks, setArtistLinks] = React.useState([]);
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
  const [downloadProgress, setDownloadProgress] = React.useState(null);
  const batchRef = React.useRef(null);
  const progressAt = React.useRef(0);
  const [downloadOnWifiOnly, setDownloadOnWifiOnlyState] = React.useState(false);
  const wifiOnlyRef = React.useRef(false);
  const waitIds = React.useRef([]);
  const flushRef = React.useRef(() => {});
  const [mixPlaying, setMixPlaying] = React.useState(false);
  const [notes, setNotes] = React.useState(starterNotes);
  const [inbox, setInbox] = React.useState([]);
  const [notifyEnabled, setNotifyEnabled] = React.useState(true);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [mix, setMix] = React.useState(emptyMix);
  const mixRef = React.useRef(emptyMix);
  const [aiChats, setAiChats] = React.useState([]);

  const playback = React.useRef({});
  const playerRef = React.useRef(null);
  const userRef = React.useRef(null);
  const inboxReady = React.useRef(false);
  const seenNotices = React.useRef(new Set());
  const sessionUserRef = React.useRef(null);
  const tracksRef = React.useRef(localTracks);
  const premiumRef = React.useRef(false);
  const onlineRef = React.useRef(true);
  const notifyRef = React.useRef(true);
  const notedUser = React.useRef(null);
  const renewed = React.useRef(false);
  const startRef = React.useRef(() => {});
  const endLock = React.useRef(false);
  const guideFollow = React.useRef(false);
  const collectionLock = React.useRef(false);
  const userHeld = React.useRef(false);
  const startedAt = React.useRef(0);
  const advanceRef = React.useRef(() => {});
  const adjustRef = React.useRef(() => {});
  const queueKey = React.useRef('');
  const playableIds = React.useRef([]);
  const suppressUntil = React.useRef(0);
  const [sleepPlan, setSleepPlan] = React.useState(null);
  const sleepPlanRef = React.useRef(null);
  const sleepWindow = React.useRef('');
  const playRef = React.useRef(() => {});
  sleepPlanRef.current = sleepPlan;
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
      interruptionMode: 'doNotMixPersistent',
    }).catch(() => {});
    if (Platform.OS === 'android') {
      import('expo-notifications').then((Notifications) => {
        Notifications.requestPermissionsAsync().catch(() => {});
      }).catch(() => {});
    }
    const nativeQueue = Platform.OS !== 'web';
    let player;
    try {
      player = nativeQueue ? createAudioPlaylist({ loop: 'none' }) : createAudioPlayer(null);
    } catch {
      return undefined;
    }
    playerRef.current = player;
    const onStatus = (status) => {
      setPosition(status.currentTime || 0);
      setPlaying(Boolean(status.playing));
      if (nativeQueue) return;
      const duration = status.duration || playback.current.track?.duration || 0;
      const ended = status.didJustFinish || (duration > 1 && !status.playing && status.currentTime >= duration - 0.45);
      if (ended) advanceRef.current();
    };
    const subscription = player.addListener(nativeQueue ? 'playlistStatusUpdate' : 'playbackStatusUpdate', onStatus);
    const trackSubscription = nativeQueue ? player.addListener('trackChanged', ({ currentIndex }) => {
      if (Date.now() < suppressUntil.current) return;
      const id = playableIds.current[currentIndex];
      const queue = playback.current.queue;
      const nextIndex = queue.findIndex((item) => item.id === id);
      const next = queue[nextIndex];
      if (!next) return;
      setIndex(nextIndex);
      setPosition(0);
      setPlaying(true);
      adjustRef.current(next.id, 'plays', 1);
      if (userRef.current) {
        supabase.from('listening_history').insert({ user_id: userRef.current, track_id: next.id }).then(() => {});
      }
      showLock(player, next);
    }) : null;
    const watch = nativeQueue ? null : setInterval(() => {
      const current = playerRef.current;
      if (!current || current.loop) return;
      const duration = current.duration || playback.current.track?.duration || 0;
      const time = current.currentTime || 0;
      const nearEnd = duration > 1 && time >= duration - 0.45;
      const stopped = current.paused || !current.playing || time >= duration - 0.05;
      if (nearEnd && stopped) advanceRef.current();
    }, 500);
    return () => {
      if (watch) clearInterval(watch);
      try {
        subscription.remove();
        trackSubscription?.remove();
        hideLock(player);
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
    const player = playerRef.current;
    if (!player) return;
    player.loop = Platform.OS === 'web'
      ? (guideFollow.current ? false : repeat)
      : (guideFollow.current ? 'all' : (repeat ? 'single' : 'none'));
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
      setArtistTagline('');
      setArtistFocus('');
      setArtistWebsite('');
      setArtistLinks([]);
      setArtistBanner('');
      setOnboardingDone(false);
      setPicks([]);
      return false;
    }
    let profileResult = null;
    let isPremium = false;
    let saved = { data: [] };
    let liked = { data: [] };
    let played = { data: [] };
    let role = { data: null };
    let notes = { data: [] };
    let picked = { data: [] };
    let accountFailed = false;
    try {
      [profileResult, isPremium, saved, liked, played, role, notes, picked] = await withTimeout(Promise.all([
        fetchProfile(sessionUser.id),
        fetchPremium(sessionUser.id),
        supabase.from('favorites').select('track_id, created_at').eq('user_id', sessionUser.id),
        supabase.from('likes').select('track_id, created_at').eq('user_id', sessionUser.id),
        supabase.from('listening_history').select('track_id').eq('user_id', sessionUser.id).order('played_at', { ascending: false }).limit(40),
        supabase.from('user_roles').select('role').eq('user_id', sessionUser.id).eq('role', 'admin').maybeSingle(),
        supabase.from('track_comments').select('helped').eq('user_id', sessionUser.id),
        supabase.from('profile_picks').select('track_id').eq('user_id', sessionUser.id),
      ]), 8000);
    } catch {
      accountFailed = true;
      try {
        const cached = JSON.parse(await AsyncStorage.getItem('xoundra-account') || 'null');
        if (cached?.id === sessionUser.id) {
          profileResult = cached.profile;
          isPremium = cached.premium === true;
        }
      } catch {
        profileResult = null;
      }
    }
    let profile = profileResult;
    if (!accountFailed && !profile?.first_name) {
      profile = (await fetchProfile(sessionUser.id).catch(() => null)) || profile;
    }
    if (profile?.country_code) setCountryState(profile.country_code);
    setFirstName(profile?.first_name || '');
    setEmail(sessionUser.email || '');
    const authConfirmed = Boolean(sessionUser.email_confirmed_at || sessionUser.confirmed_at);
    setEmailConfirmed(authConfirmed || profile?.email_confirmed === true || accountFailed);
    setAvatarPath(profile?.avatar_path || '');
    setAvatarStamp(Date.now());
    setIntention(profile?.intention || '');
    setOnboardingDone(accountFailed ? profile?.onboarding_done !== false : profile?.onboarding_done === true);
    if (!accountFailed) {
      AsyncStorage.setItem('xoundra-account', JSON.stringify({
        id: sessionUser.id,
        profile,
        premium: isPremium,
      })).catch(() => {});
      if (!renewed.current) {
        renewed.current = true;
        supabase.functions.invoke('billing', { body: { action: 'renew_mine' } }).catch(() => {});
      }
    }
    setIsArtist(profile?.is_artist === true);
    setArtistName(profile?.artist_name || '');
    setArtistBio(profile?.artist_bio || '');
    setArtistLocation(profile?.artist_location || '');
    setArtistTagline(profile?.artist_tagline || '');
    setArtistFocus(profile?.artist_focus || '');
    setArtistWebsite(profile?.artist_website || '');
    setArtistLinks(Array.isArray(profile?.artist_links) ? profile.artist_links : []);
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
    AsyncStorage.getItem('xoundra-catalogue').then((raw) => {
      if (!alive || !raw) return;
      const cached = JSON.parse(raw);
      if (Array.isArray(cached?.tracks) && cached.tracks.length) {
        setTracks(cached.tracks);
        setSignals(cached.signals || []);
      }
    }).catch(() => {});
    readOnline().then((next) => {
      onlineRef.current = next;
      if (alive) setOnline(next);
    }).catch(() => {
      onlineRef.current = false;
    });
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
    const openTimer = setTimeout(() => {
      if (alive) setReady(true);
    }, 2500);
    storedUser().then((cachedUser) => {
      if (!alive || !cachedUser) return;
      loadAccount(cachedUser).finally(() => {
        if (alive) setReady(true);
      });
    }).catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      clearTimeout(openTimer);
      const user = data.session?.user ?? null;
      if (!user && sessionUserRef.current && !onlineRef.current) {
        setReady(true);
        return;
      }
      loadAccount(user).finally(() => {
        if (alive) setReady(true);
      });
    }).catch(() => {
      if (alive) setReady(true);
    });
    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_OUT' || !session) && !onlineRef.current && sessionUserRef.current) return;
      setTimeout(() => {
        loadAccount(session?.user ?? null).finally(() => setReady(true));
      }, 0);
    });
    return () => {
      alive = false;
      clearTimeout(openTimer);
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

  const soundSource = React.useCallback((id) => {
    const owner = userRef.current;
    try {
      const saved = downloadFile(owner, id);
      if (saved?.exists) return saved.uri;
    } catch {
      // web has no on-device file
    }
    const track = tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id);
    const remote = track?.audioUrl || (localTracks.some((item) => item.id === id) ? trackAudioUrl(`catalogue/${id}.mp3`) : '');
    if (remote && onlineRef.current) return remote;
    return null;
  }, []);
  adjustRef.current = adjustCount;

  const startSound = React.useCallback((track) => {
    const player = playerRef.current;
    if (!track || !player) return;
    const source = soundSource(track.id);
    if (!source) {
      setPlaybackNote(onlineRef.current ? 'This sound is not on this device.' : 'Download this sound to play it offline.');
      return;
    }
    setPlaybackNote('');
    stopMix();
    endLock.current = false;
    startedAt.current = Date.now();
    try {
      if (Platform.OS !== 'web' && player.clear) {
        const queue = playback.current.queue.length ? playback.current.queue : [track];
        const key = `${userRef.current || ''}:${queue.map((item) => item.id).join('|')}`;
        if (queueKey.current !== key) {
          player.clear();
          const loaded = [];
          queue.forEach((item) => {
            const itemSource = playerSource(soundSource(item.id) || item.audioUrl);
            if (!itemSource) return;
            try {
              player.add(itemSource);
              loaded.push(item.id);
            } catch {
              // skip a sound the player cannot open
            }
          });
          playableIds.current = loaded;
          queueKey.current = key;
        }
        player.loop = guideFollow.current ? 'all' : (playback.current.repeat ? 'single' : 'none');
        const loadedIndex = playableIds.current.indexOf(track.id);
        suppressUntil.current = Date.now() + 700;
        if (loadedIndex < 0 || !player.trackCount) {
          setPlaybackNote('This sound could not be played.');
          return;
        }
        player.skipTo(Math.min(loadedIndex, player.trackCount - 1));
        player.play();
        showLock(player, track);
      } else {
        player.loop = guideFollow.current ? false : playback.current.repeat;
        player.replace(playerSource(source) || source);
        player.play();
      }
    } catch {
      setPlaybackNote('This sound could not be played.');
      return;
    }
    setPosition(0);
    setPlaying(true);
    setResumeId(track.id);
    adjustCount(track.id, 'plays', 1);
    if (userRef.current) {
      supabase.from('listening_history').insert({ user_id: userRef.current, track_id: track.id }).then(() => {
        drainNotices();
      });
    }
  }, [adjustCount, soundSource]);
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
    const ordered = Boolean(options?.ordered);
    const collection = Boolean(options?.collection) || ordered;
    guideFollow.current = Boolean(options?.follow) && !collection;
    collectionLock.current = collection;
    userHeld.current = false;
    let nextQueue = list && list.length ? [...list] : [track];
    if (ordered) nextQueue = [...nextQueue];
    else if (collection) nextQueue = [track, ...nextQueue.filter((item) => item.id !== track.id)];
    const nextIndex = ordered || collection ? 0 : Math.max(0, nextQueue.findIndex((item) => item.id === track.id));
    playback.current = { ...playback.current, queue: nextQueue, index: nextIndex, collection };
    setQueue(nextQueue);
    setIndex(nextIndex);
    setHistory((items) => [track, ...items.filter((item) => item.id !== track.id)].slice(0, 30));
    startSound(track);
  }, [startSound]);
  playRef.current = play;

  const togglePlay = React.useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (playback.current.playing) {
      if (guideFollow.current) {
        guideFollow.current = false;
        userHeld.current = true;
      }
      player.pause();
    } else {
      player.play();
      showLock(player, playback.current.track);
    }
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
          supabase.from('favorites').insert({ user_id: userRef.current, track_id: track.id }).then(() => drainNotices());
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
          supabase.from('likes').insert({ user_id: userRef.current, track_id: track.id }).then(() => drainNotices());
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

  const refreshInbox = React.useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    const { data } = await supabase
      .from('user_notifications')
      .select('id, kind, title, body, track_id, album_id, announcement_id, created_at, read_at')
      .eq('user_id', user)
      .order('created_at', { ascending: false })
      .limit(80);
    const rows = data || [];
    if (inboxReady.current && Platform.OS === 'web' && notifyRef.current) {
      rows.filter((item) => !seenNotices.current.has(item.id) && !item.read_at).forEach((item) => {
        presentNotice(item.title, item.body, item);
      });
    }
    seenNotices.current = new Set(rows.map((item) => item.id));
    inboxReady.current = true;
    setInbox(rows);
  }, []);

  const markNotesRead = React.useCallback(() => {
    setNotes((items) => items.map((item) => ({ ...item, read: true })));
    setInbox((items) => items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    if (userRef.current) supabase.rpc('mark_notices_read').then(() => {});
  }, []);

  const markNoticeRead = React.useCallback((id) => {
    if (!id) return;
    const stamp = new Date().toISOString();
    setNotes((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setInbox((items) => items.map((item) => (item.id === id ? { ...item, read_at: item.read_at || stamp } : item)));
    if (userRef.current && /^[0-9a-f-]{36}$/i.test(String(id))) {
      supabase.rpc('mark_notice_read', { p_id: id }).then(() => {});
    }
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

  const closePlayback = React.useCallback(() => {
    endLock.current = true;
    stopMix();
    playerRef.current?.pause();
    hideLock(playerRef.current);
    queueKey.current = '';
    setQueue([]);
    setIndex(0);
    setPlaying(false);
    setPosition(0);
    setPlaybackNote('');
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
    setUserId(null);
    waitIds.current = [];
    setIsArtist(false);
    setArtistName('');
    setArtistBio('');
    setArtistLocation('');
    setArtistTagline('');
    setArtistFocus('');
    setArtistWebsite('');
    setArtistLinks([]);
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
    const owner = userRef.current;
    if (!owner) return;
    AsyncStorage.setItem(`xoundra-download-wait:${owner}`, JSON.stringify(ids)).catch(() => {});
  }, []);

  const emitDownload = React.useCallback((payload) => {
    const now = Date.now();
    if (!payload.done && now - progressAt.current < 400) return;
    progressAt.current = now;
    setDownloadProgress(payload);
    publishDownloadProgress(payload).catch(() => {});
    if (payload.done) {
      setTimeout(() => setDownloadProgress((current) => (current?.done ? null : current)), 4500);
    }
  }, []);

  const noteDownload = React.useCallback((track, fraction, done = false) => {
    const batch = batchRef.current;
    const index = batch?.index || 1;
    const total = batch?.total || 1;
    const title = done
      ? 'Download complete'
      : total > 1
        ? `Downloading ${index} of ${total}`
        : 'Downloading';
    const percent = done ? 1 : ((index - 1) + Math.max(0, Math.min(1, fraction))) / total;
    emitDownload({
      title,
      body: done && total > 1 ? `${batch?.saved || 1} sounds saved on this device` : track.title,
      percent,
      done,
    });
  }, [emitDownload]);

  const saveDownloadNow = React.useCallback(async (track) => {
    if (batchRef.current) {
      batchRef.current.index += 1;
      batchRef.current.title = track.title;
    } else {
      batchRef.current = { total: 1, index: 1, title: track.title, saved: 0, own: true };
    }
    noteDownload(track, 0);
    const owner = userRef.current;
    if (!owner) return 'missing';
    const remote = track.audioUrl || soundSource(track.id);
    try {
      if (!remote) return 'missing';
      if (Platform.OS === 'web') {
        noteDownload(track, 0.45);
        const ids = await readWebDownloads(owner);
        if (!ids.includes(track.id)) {
          await AsyncStorage.setItem(webDownloadKey(owner), JSON.stringify([track.id, ...ids]));
        }
        noteDownload(track, 1);
      } else {
        const destination = ensureDownloadFile(owner, track.id);
        if (!destination.exists) {
          await File.downloadFileAsync(remote, destination, {
            onProgress: ({ bytesWritten, totalBytes }) => {
              noteDownload(track, totalBytes > 0 ? bytesWritten / totalBytes : 0.5);
            },
          });
        }
        noteDownload(track, 1);
      }
      if (userRef.current) {
        supabase.from('downloads').insert({ user_id: userRef.current, track_id: track.id, status: 'ready' }).then(() => {});
      }
      setDownloads((items) => (items.some((item) => item.id === track.id) ? items : [track, ...items]));
      writeWait(waitIds.current.filter((id) => id !== track.id));
      if (batchRef.current) batchRef.current.saved += 1;
      return 'saved';
    } catch {
      return 'missing';
    }
  }, [noteDownload, soundSource, writeWait]);

  const finishDownloadBatch = React.useCallback((title) => {
    const batch = batchRef.current;
    const saved = batch?.saved || 0;
    const total = batch?.total || 1;
    if (batch?.own) batchRef.current = null;
    if (!saved) {
      emitDownload({ title: 'Download stopped', body: `${title} could not be saved`, percent: 0, done: true });
      return;
    }
    emitDownload({
      title: 'Download complete',
      body: total > 1 ? `${saved} sounds saved on this device` : `${title} saved on this device`,
      percent: 1,
      done: true,
    });
  }, [emitDownload]);

  const flushWaiting = React.useCallback(async () => {
    const gate = await downloadGate(wifiOnlyRef.current);
    if (gate !== 'ok' || !waitIds.current.length) return;
    const ids = [...waitIds.current];
    const queued = ids
      .map((id) => tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id))
      .filter(Boolean);
    if (!queued.length) return;
    batchRef.current = { total: queued.length, index: 0, title: '', saved: 0, own: false };
    for (const track of queued) {
      await saveDownloadNow(track);
    }
    const saved = batchRef.current?.saved || 0;
    const label = queued[queued.length - 1]?.title || 'Sounds';
    batchRef.current = null;
    if (!saved) {
      emitDownload({ title: 'Download stopped', body: 'Those sounds could not be saved', percent: 0, done: true });
      return;
    }
    emitDownload({
      title: 'Download complete',
      body: queued.length > 1 ? `${saved} sounds saved on this device` : `${label} saved on this device`,
      percent: 1,
      done: true,
    });
  }, [emitDownload, saveDownloadNow]);
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
    const result = await saveDownloadNow(track);
    finishDownloadBatch(track.title);
    return result;
  }, [finishDownloadBatch, saveDownloadNow, writeWait]);

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
    if (userRef.current) {
      AsyncStorage.getItem(`xoundra-download-wait:${userRef.current}`).then((value) => {
        try {
          const ids = JSON.parse(value || '[]');
          if (Array.isArray(ids)) waitIds.current = ids.filter((id) => typeof id === 'string');
        } catch {
          waitIds.current = [];
        }
        flushRef.current();
      }).catch(() => {});
    }
    const markOnline = (state) => {
      const next = connectionOnline(state);
      onlineRef.current = next;
      setOnline(next);
      setOnlineKnown(true);
    };
    readOnline().then((next) => {
      onlineRef.current = next;
      setOnline(next);
    }).catch(() => {}).finally(() => setOnlineKnown(true));
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
    const owner = userRef.current;
    if (Platform.OS === 'web') {
      const ids = (await readWebDownloads(owner)).filter((id) => id !== track.id);
      if (owner) await AsyncStorage.setItem(webDownloadKey(owner), JSON.stringify(ids));
    } else {
      const file = downloadFile(owner, track.id);
      if (file?.exists) file.delete();
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
    mixRef.current.forEach((layer, index) => {
      const source = soundSource(layer.id);
      if (!source) return;
      const player = createAudioPlayer(source);
      player.loop = true;
      player.volume = layer.muted ? 0 : layer.volume;
      player.play();
      mixPlayers.current.push(player);
      if (index === 0) {
        const track = tracksRef.current.find((item) => item.id === layer.id);
        showLock(player, track || { title: 'Mix', artistName: 'Xoundra', artwork: track?.artwork }, false);
      }
    });
    if (!mixPlayers.current.length) setMixPlaying(false);
    return () => {
      releaseMixPlayers();
      const current = playback.current.track;
      if (current) showLock(playerRef.current, current);
    };
  }, [mixPlaying, mixShape, soundSource]);

  React.useEffect(() => {
    if (!mixPlaying) return;
    mix.forEach((layer, index) => {
      const player = mixPlayers.current[index];
      if (player) player.volume = layer.muted ? 0 : layer.volume;
    });
  }, [mix, mixPlaying]);

  React.useEffect(() => {
    if (!userId) {
      setDownloads([]);
      return undefined;
    }
    let alive = true;
    const apply = (ids) => {
      if (!alive) return;
      const found = ids
        .map((id) => tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id))
        .filter(Boolean);
      setDownloads(found);
    };
    if (Platform.OS === 'web') {
      readWebDownloads(userId).then(apply).catch(() => {});
      return () => {
        alive = false;
      };
    }
    try {
      const folder = new Directory(Paths.document, 'downloads', userId);
      if (!folder.exists) {
        setDownloads([]);
        return undefined;
      }
      const saved = folder.list()
        .map((entry) => String(entry.name || entry.uri || '').split('/').pop().replace(/\.mp3$/, ''))
        .filter((id) => id && !id.includes('/'));
      apply(saved);
    } catch {
      setDownloads([]);
    }
    return () => {
      alive = false;
    };
  }, [userId, tracks]);

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

  const saveSleep = React.useCallback(async (plan) => {
    const next = {
      enabled: Boolean(plan?.enabled),
      start: plan?.start || '22:00',
      stop: plan?.stop || '06:00',
      trackIds: Array.isArray(plan?.trackIds) ? plan.trackIds.filter((id) => typeof id === 'string') : [],
    };
    sleepPlanRef.current = next;
    sleepWindow.current = '';
    setSleepPlan(next);
    const owner = userRef.current;
    if (!owner) return next;
    await AsyncStorage.setItem(`xoundra-sleep:${owner}`, JSON.stringify(next)).catch(() => {});
    await supabase.from('sleep_schedules').upsert({
      user_id: owner,
      enabled: next.enabled,
      start_time: next.start,
      stop_time: next.stop,
      track_ids: next.trackIds,
      updated_at: new Date().toISOString(),
    });
    return next;
  }, []);

  React.useEffect(() => {
    if (!userId) {
      sleepPlanRef.current = null;
      setSleepPlan(null);
      return undefined;
    }
    let alive = true;
    async function load() {
      let plan = null;
      const { data } = await supabase.from('sleep_schedules').select('enabled, start_time, stop_time, track_ids').eq('user_id', userId).maybeSingle();
      if (data) {
        plan = { enabled: data.enabled, start: data.start_time, stop: data.stop_time, trackIds: data.track_ids || [] };
      } else {
        const raw = await AsyncStorage.getItem(`xoundra-sleep:${userId}`).catch(() => null);
        try {
          plan = raw ? JSON.parse(raw) : null;
        } catch {
          plan = null;
        }
      }
      if (!alive || !plan) return;
      sleepPlanRef.current = plan;
      setSleepPlan(plan);
    }
    load().catch(() => {});
    const timer = setInterval(() => {
      const plan = sleepPlanRef.current;
      if (!plan?.enabled || !premiumRef.current) return;
      const start = clockMinutes(plan.start);
      const stop = clockMinutes(plan.stop);
      const minute = new Date().getHours() * 60 + new Date().getMinutes();
      const open = insideWindow(start, stop, minute);
      const stamp = windowStamp(start, minute);
      if (open && sleepWindow.current !== stamp) {
        const chosen = (plan.trackIds || [])
          .map((id) => tracksRef.current.find((item) => item.id === id) || localTracks.find((item) => item.id === id))
          .filter(Boolean);
        if (!chosen.length) return;
        sleepWindow.current = stamp;
        playRef.current(chosen[0], chosen, { ordered: true });
        return;
      }
      if (!open && sleepWindow.current) {
        sleepWindow.current = '';
        userHeld.current = true;
        playerRef.current?.pause();
        setPlaying(false);
      }
    }, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [userId]);

  React.useEffect(() => {
    if (!userId) {
      inboxReady.current = false;
      setInbox([]);
      return;
    }
    refreshInbox();
    drainNotices();
    const timer = setInterval(() => {
      refreshInbox();
      drainNotices();
    }, 45000);
    return () => clearInterval(timer);
  }, [userId, refreshInbox]);

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
    sleepPlan,
    saveSleep,
    favourites,
    likes,
    history,
    resumeId,
    signals,
    helped,
    online,
    onlineKnown,
    playbackNote,
    isArtist,
    artistName,
    artistBio,
    artistLocation,
    artistTagline,
    artistFocus,
    artistWebsite,
    artistLinks,
    artistBanner,
    downloads,
    downloadProgress,
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
    inbox,
    unread: notes.filter((item) => !item.read).length + inbox.filter((item) => !item.read_at).length,
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
    markNoticeRead,
    refreshInbox,
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
    closePlayback,
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
