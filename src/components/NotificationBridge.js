import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as Notifications from 'expo-notifications';
import { useApp } from '../state/AppState';
import { setNoticePresenter } from '../lib/notices';
import { openNotice } from '../lib/openNotice';
import { supabase } from '../lib/supabase';

const icon = require('../../assets/icon.png');
const noticeOpener = { open: async () => {} };

export function NotificationBridge() {
  const { addNote, notifyEnabled, userId, play, tracks, refreshInbox } = useApp();
  const enabled = useRef(notifyEnabled);
  const playRef = useRef(play);
  const tracksRef = useRef(tracks);
  const refreshRef = useRef(refreshInbox);
  enabled.current = notifyEnabled;
  noticeOpener.open = (data) => openNotice(data, playRef.current, tracksRef.current);
  playRef.current = play;
  tracksRef.current = tracks;
  refreshRef.current = refreshInbox;

  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: enabled.current,
          shouldShowList: true,
          shouldPlaySound: enabled.current,
          shouldSetBadge: false,
        }),
      });
    } catch {
      // Notifications are optional. A missing channel must not close the app.
    }
  }, [notifyEnabled]);

  useEffect(() => {
    setNoticePresenter(async (title, body, data) => {
      if (!enabled.current) return;
      if (Platform.OS === 'web') {
        await showWebNotice(title, body, data);
        return;
      }
      const pushed = await pushToThisAccount(title, body);
      if (pushed) return;
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { local: true } },
        trigger: null,
      }).catch(() => {});
    });
    return () => setNoticePresenter(async () => {});
  }, []);

  useEffect(() => {
    if (userId) registerForPush().catch(() => {});
    const received = Notifications.addNotificationReceivedListener((event) => {
      if (event.request.content.data?.local) return;
      refreshRef.current?.();
    });
    const opened = Notifications.addNotificationResponseReceivedListener((event) => {
      openNotice(event.notification.request.content.data, playRef.current, tracksRef.current);
    });
    Notifications.getLastNotificationResponseAsync?.().then((event) => {
      if (!event) return;
      openNotice(event.notification.request.content.data, playRef.current, tracksRef.current);
    }).catch(() => {});
    return () => {
      received?.remove();
      opened?.remove();
    };
  }, [addNote, userId]);

  return null;
}

async function showWebNotice(title, body, data) {
  if (typeof Notification === 'undefined') return;
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  const asset = Asset.fromModule(icon);
  if (!asset.downloaded) await asset.downloadAsync().catch(() => {});
  const notice = new Notification(title, { body, icon: asset.uri || undefined });
  notice.onclick = () => {
    notice.close();
    if (typeof window !== 'undefined') window.focus();
    if (data) noticeOpener.open(data);
  };
}

async function registerForPush() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Xoundra',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#8BE1CF',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  const device = await Notifications.getDevicePushTokenAsync();
  const token = typeof device.data === 'string' ? device.data : '';
  if (!token) return;
  await supabase.functions.invoke('register-push', {
    body: { token, platform: Platform.OS },
  });
}

async function pushToThisAccount(title, body) {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: { action: 'self', title, body },
  });
  return !error && Number(data?.sent || 0) > 0;
}
