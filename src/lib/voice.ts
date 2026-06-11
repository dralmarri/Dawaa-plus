// Web Speech API helper for voice alerts (medication reminders)
// Gated by settings.voiceNotifications

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!isSpeechSupported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  // Prefer exact lang match, then prefix, then any
  return (
    voices.find(v => v.lang?.toLowerCase() === lang.toLowerCase()) ||
    voices.find(v => v.lang?.toLowerCase().startsWith(lang.split('-')[0].toLowerCase())) ||
    voices[0]
  );
}

export function speak(text: string, opts: { lang?: 'ar' | 'en'; rate?: number } = {}) {
  if (!isSpeechSupported() || !text) return;
  try {
    const lang = opts.lang === 'ar' ? 'ar-SA' : 'en-US';
    // Cancel any in-flight utterances so reminders don't pile up
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = opts.rate ?? 0.95;
    utter.volume = 1;
    const v = pickVoice(lang);
    if (v) utter.voice = v;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('[voice] speak failed:', e);
  }
}

// Some browsers load voices async; nudge the list on first import
if (isSpeechSupported()) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  } catch {
    /* noop */
  }
}
