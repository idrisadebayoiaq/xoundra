import { useEffect, useRef } from 'react';
import { useApp } from '../state/AppState';
import { useRewards } from '../state/RewardsState';
import { publishWidgetSnapshot } from '../lib/androidWidget';

/** Accrues Quiet points for ~15 minutes of continuous playback. */
export function ListenRewardsTicker() {
  const { playing, mixPlaying, track } = useApp();
  const { earnListenBlock } = useRewards();
  const seconds = useRef(0);

  useEffect(() => {
    publishWidgetSnapshot({ title: track?.title, playing: playing || mixPlaying });
  }, [track?.title, playing, mixPlaying]);

  useEffect(() => {
    if (!playing && !mixPlaying) {
      seconds.current = 0;
      return undefined;
    }
    const timer = setInterval(() => {
      seconds.current += 1;
      if (seconds.current >= 15 * 60) {
        seconds.current = 0;
        earnListenBlock();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, mixPlaying, earnListenBlock]);

  return null;
}
