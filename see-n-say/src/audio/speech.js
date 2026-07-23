/**
 * The narrator ("The cow says…"), via the Web Speech API. Voice lists load
 * asynchronously in most browsers, so we resolve them lazily and cache.
 */
const synth = window.speechSynthesis ?? null;

let preferredVoice = null;
let voicesResolved = false;

const PREFERRED_NAMES = ['Samantha', 'Karen', 'Moira', 'Google US English', 'Microsoft Aria'];

const pickVoice = () => {
  if (!synth) return null;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;

  const byName = PREFERRED_NAMES.map((name) =>
    voices.find((voice) => voice.name.includes(name)),
  ).find(Boolean);

  const englishLocal = voices.find((voice) => voice.lang.startsWith('en') && voice.localService);
  const english = voices.find((voice) => voice.lang.startsWith('en'));

  voicesResolved = true;
  return byName ?? englishLocal ?? english ?? voices[0];
};

if (synth) {
  preferredVoice = pickVoice();
  synth.addEventListener('voiceschanged', () => {
    preferredVoice = pickVoice();
  });
}

export const isSpeechSupported = () => Boolean(synth);

/**
 * Speaks a line and resolves when it ends. A timeout guard keeps the toy
 * moving if the browser never fires `end` (a known quirk on some platforms).
 */
export const speak = (text, { rate = 0.85, pitch = 1.15 } = {}) =>
  new Promise((resolve) => {
    if (!synth) {
      setTimeout(resolve, 700);
      return;
    }

    if (!voicesResolved) preferredVoice = pickVoice();

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve();
    };

    // ~90ms per character is a generous ceiling for the slowest voices.
    const guard = setTimeout(finish, 1200 + text.length * 90);
    utterance.addEventListener('end', finish);
    utterance.addEventListener('error', finish);
    synth.speak(utterance);
  });

export const cancelSpeech = () => synth?.cancel();
