import { useEffect, useState } from 'react';

const headset = /airpod|bluetooth|headset|headphone|earbud|earpiece|buds|beats|bose|sony wh|jabra|galaxy buds/i;

export function useAudioOutput() {
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;
    const devices = globalThis.navigator?.mediaDevices;

    async function read() {
      if (!devices?.enumerateDevices) return;
      const list = await devices.enumerateDevices().catch(() => []);
      const match = list.find((item) => item.kind === 'audiooutput' && headset.test(item.label || ''));
      if (alive) setName(match?.label || '');
    }

    read();
    devices?.addEventListener?.('devicechange', read);
    const timer = setInterval(read, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
      devices?.removeEventListener?.('devicechange', read);
    };
  }, []);

  return name;
}
