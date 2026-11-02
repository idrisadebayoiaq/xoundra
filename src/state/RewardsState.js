import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POINT_CAPS, POINT_COSTS, POINT_EARN, REWARDS_STORAGE_KEY } from '../rewards/costs';
import { featureWindowMs } from '../ads/rewards';
import { setDownloadCreditConsumer } from '../rewards/downloadCreditGate';
import { presentNotice } from '../lib/notices';
import { writeRewardsNote } from '../rewards/notifyGate';

const RewardsContext = React.createContext(null);

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function emptyRewards() {
  return {
    points: 0,
    streakDays: 0,
    streakDayKey: '',
    listenDayKey: '',
    ritualCount: 0,
    listenBlocks: 0,
    downloadCredits: 0,
    weekMilestoneKey: '',
  };
}

function notify(title, body) {
  writeRewardsNote(title, body);
  presentNotice(title, body, { kind: 'rewards' }).catch(() => {});
}

export function RewardsProvider({ children, grantStudioUntil }) {
  const [state, setState] = React.useState(emptyRewards);
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const grantStudioRef = React.useRef(grantStudioUntil);
  grantStudioRef.current = grantStudioUntil;

  React.useEffect(() => {
    AsyncStorage.getItem(REWARDS_STORAGE_KEY).then((raw) => {
      try {
        setState({ ...emptyRewards(), ...JSON.parse(raw || '{}') });
      } catch {
        setState(emptyRewards());
      }
    }).catch(() => {});
  }, []);

  const persist = React.useCallback((next) => {
    setState(next);
    stateRef.current = next;
    AsyncStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const bumpStreak = React.useCallback(() => {
    const today = dayKey();
    const cur = stateRef.current;
    if (cur.streakDayKey === today) return cur;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cont = cur.streakDayKey === dayKey(yesterday);
    let next = {
      ...cur,
      streakDays: cont ? cur.streakDays + 1 : 1,
      streakDayKey: today,
    };
    const weekKey = `${today.split('-').slice(0, 2).join('-')}-w${Math.ceil(new Date().getDate() / 7)}`;
    if (next.streakDays >= 7 && next.weekMilestoneKey !== weekKey) {
      next = {
        ...next,
        points: next.points + POINT_EARN.streakWeek,
        weekMilestoneKey: weekKey,
      };
      notify('Quiet points', `+${POINT_EARN.streakWeek} for a 7-day streak.`);
    } else if (next.streakDays === 1 || next.streakDays % 3 === 0) {
      notify('Streak', `${next.streakDays}-day streak.`);
    }
    persist(next);
    return next;
  }, [persist]);

  const earnRitual = React.useCallback(() => {
    const today = dayKey();
    let cur = stateRef.current;
    if (cur.listenDayKey !== today) {
      cur = { ...cur, listenDayKey: today, ritualCount: 0, listenBlocks: 0 };
    }
    if (cur.ritualCount >= POINT_CAPS.ritualPerDay) {
      bumpStreak();
      return false;
    }
    const next = {
      ...cur,
      points: cur.points + POINT_EARN.ritual,
      ritualCount: cur.ritualCount + 1,
    };
    persist(next);
    notify('Quiet points', `+${POINT_EARN.ritual} from your evening ritual.`);
    bumpStreak();
    return true;
  }, [bumpStreak, persist]);

  const earnListenBlock = React.useCallback(() => {
    const today = dayKey();
    let cur = stateRef.current;
    if (cur.listenDayKey !== today) {
      cur = { ...cur, listenDayKey: today, ritualCount: 0, listenBlocks: 0 };
    }
    if (cur.listenBlocks >= POINT_CAPS.listenBlocksPerDay) {
      bumpStreak();
      return false;
    }
    const next = {
      ...cur,
      points: cur.points + POINT_EARN.listenBlock,
      listenBlocks: cur.listenBlocks + 1,
    };
    persist(next);
    notify('Quiet points', `+${POINT_EARN.listenBlock} for listening.`);
    bumpStreak();
    return true;
  }, [bumpStreak, persist]);

  const buyDownloadCredit = React.useCallback(() => {
    const cur = stateRef.current;
    if (cur.points < POINT_COSTS.download) return false;
    persist({
      ...cur,
      points: cur.points - POINT_COSTS.download,
      downloadCredits: cur.downloadCredits + 1,
    });
    notify('Download credit', 'Ready to save one sound.');
    return true;
  }, [persist]);

  const spendStudio24h = React.useCallback(() => {
    const cur = stateRef.current;
    if (cur.points < POINT_COSTS.studio24h) return false;
    persist({ ...cur, points: cur.points - POINT_COSTS.studio24h });
    grantStudioRef.current?.(Date.now() + featureWindowMs());
    notify('Studio unlocked', 'Open for the next 24 hours.');
    return true;
  }, [persist]);

  const consumeDownloadCredit = React.useCallback(() => {
    const cur = stateRef.current;
    if (cur.downloadCredits < 1) return false;
    persist({ ...cur, downloadCredits: cur.downloadCredits - 1 });
    return true;
  }, [persist]);

  React.useEffect(() => {
    setDownloadCreditConsumer(() => consumeDownloadCredit());
    return () => setDownloadCreditConsumer(null);
  }, [consumeDownloadCredit]);

  const value = {
    points: state.points,
    streakDays: state.streakDays,
    downloadCredits: state.downloadCredits,
    costs: POINT_COSTS,
    earnRitual,
    earnListenBlock,
    bumpStreak,
    buyDownloadCredit,
    spendStudio24h,
    consumeDownloadCredit,
  };

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards() {
  const value = React.useContext(RewardsContext);
  if (!value) throw new Error('useRewards must be used inside RewardsProvider');
  return value;
}
