/**
 * The narrator. The original used TI's LPC-10 speech chip; the closest we get
 * in a browser is speech synthesis pushed slow and low, which lands somewhere
 * in the right monotone neighbourhood.
 */
const synth = window.speechSynthesis ?? null;

const ROBOT = { rate: 0.72, pitch: 0.45 };

let preferredVoice = null;
let resolved = false;

// Voices that sound least "warm" tend to read closest to the original.
const PREFERRED_NAMES = ['Fred', 'Albert', 'Zarvox', 'Ralph', 'Daniel', 'Google US English'];

const pickVoice = () => {
  if (!synth) return null;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  resolved = true;

  const byName = PREFERRED_NAMES.map((name) =>
    voices.find((voice) => voice.name.includes(name)),
  ).find(Boolean);
  const englishLocal = voices.find((v) => v.lang.startsWith('en') && v.localService);
  return byName ?? englishLocal ?? voices.find((v) => v.lang.startsWith('en')) ?? voices[0];
};

if (synth) {
  preferredVoice = pickVoice();
  synth.addEventListener('voiceschanged', () => {
    preferredVoice = pickVoice();
  });
}

export const isVoiceSupported = () => Boolean(synth);

let muted = false;
export const setMuted = (value) => {
  muted = value;
  if (muted) synth?.cancel();
};
export const isMuted = () => muted;

let lastSpoken = '';

const utter = (text, options = {}) =>
  new Promise((resolve) => {
    if (!synth || muted) {
      setTimeout(resolve, Math.min(1800, 300 + text.length * 45));
      return;
    }
    if (!resolved) preferredVoice = pickVoice();

    const utterance = new SpeechSynthesisUtterance(text);
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = options.rate ?? ROBOT.rate;
    utterance.pitch = options.pitch ?? ROBOT.pitch;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve();
    };
    const guard = setTimeout(finish, 2000 + text.length * 130);

    utterance.addEventListener('end', finish);
    utterance.addEventListener('error', finish);
    synth.speak(utterance);
  });

/** Speaks a phrase and remembers it, so REPEAT has something to replay. */
export const say = async (text, options) => {
  lastSpoken = text;
  await utter(text, options);
};

/** Reads a word one letter at a time, the way it recites a correct spelling. */
export const spellOut = async (word) => {
  lastSpoken = `${word} is spelled ${word.split('').join(', ')}`;
  for (const letter of word.toUpperCase()) {
    await utter(letter, { rate: 0.6 });
    await new Promise((r) => setTimeout(r, 90));
  }
};

export const repeatLast = async () => {
  if (lastSpoken) await utter(lastSpoken);
};

export const cancelSpeech = () => synth?.cancel();
