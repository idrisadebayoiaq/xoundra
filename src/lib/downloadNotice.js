import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const noticeId = 'xoundra-download';
let lastAt = 0;
let lastPct = -1;
let webNote = null;
let channelReady = false;
let permissionAsked = false;

function bar(percent) {
  const steps = 12;
  const filled = Math.round(Math.max(0, Math.min(1, percent)) * steps);
  return `${'█'.repeat(filled)}${'░'.repeat(steps - filled)}  ${Math.round(percent * 100)}%`;
}

async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  channelReady = true;
  await Notifications.setNotificationChannelAsync('downloads', {
    name: 'Downloads',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: null,
    sound: null,
    lightColor: '#8BE1CF',
  }).catch(() => {});
}

async function allowed() {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied' || permissionAsked) return false;
    permissionAsked = true;
    const result = await Notification.requestPermission().catch(() => 'denied');
    return result === 'granted';
  }
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionAsked) return false;
    permissionAsked = true;
    const next = await Notifications.requestPermissionsAsync();
    return Boolean(next.granted);
  } catch {
    return false;
  }
}

export async function publishDownloadProgress({ title, body, percent, done = false }) {
  const pct = Math.round((percent || 0) * 100);
  const now = Date.now();
  if (!done && now - lastAt < 450 && Math.abs(pct - lastPct) < 4) return;
  lastAt = now;
  lastPct = pct;
  const text = `${body}\n${bar(percent || 0)}`;
  if (!(await allowed())) return;
  if (Platform.OS === 'web') {
    try {
      webNote?.close();
      webNote = new Notification(title, { body: text, tag: noticeId, silent: true });
      if (done) {
        const note = webNote;
        setTimeout(() => note.close(), 4000);
      }
    } catch {
      webNote = null;
    }
    return;
  }
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: noticeId,
    content: {
      title,
      body: text,
      sticky: !done,
      autoDismiss: done,
      sound: false,
      color: '#8BE1CF',
      data: { local: true, download: true },
    },
    trigger: { channelId: 'downloads' },
  }).catch(() => {});
  if (done) {
    setTimeout(() => {
      Notifications.dismissNotificationAsync(noticeId).catch(() => {});
    }, 4000);
  }
}
