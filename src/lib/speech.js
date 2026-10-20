import * as Speech from 'expo-speech';

export function listenOnce(ms = 8000) {
  const Ctor = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (!Ctor) return Promise.reject(new Error('unavailable'));

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('timeout')), ms);
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      finish(resolve, text.trim());
    };
    recognition.onerror = (event) => finish(reject, new Error(event.error || 'speech'));
    recognition.onend = () => finish(reject, new Error('empty'));
    recognition.start();
  });
}

export function speakLine(line) {
  if (!line) return;
  Speech.stop();
  Speech.speak(line, { rate: 0.92, language: 'en-US' });
}

export function stopSpeaking() {
  Speech.stop();
}
