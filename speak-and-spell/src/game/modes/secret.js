/**
 * SECRET CODE — a two-player game. One player types a word, the toy shows it
 * shifted through the alphabet, and the next player decodes it.
 */
const SHIFT = 3;

const shiftLetter = (letter, by) => {
  if (!/[A-Z]/.test(letter)) return letter;
  const base = 'A'.charCodeAt(0);
  return String.fromCharCode(((letter.charCodeAt(0) - base + by + 26) % 26) + base);
};

export const encode = (word) =>
  word.toUpperCase().split('').map((letter) => shiftLetter(letter, SHIFT)).join('');

export const decode = (word) =>
  word.toUpperCase().split('').map((letter) => shiftLetter(letter, -SHIFT)).join('');

export const createSecretMode = (io) => {
  // 'writing' collects the secret word; 'solving' collects the decode attempt.
  let phase = 'writing';
  let secret = '';
  let buffer = '';

  const askForWord = async () => {
    phase = 'writing';
    secret = '';
    buffer = '';
    await io.announce('TYPE A WORD', { speech: 'Type a secret word, then press enter.' });
    io.showTyping('');
  };

  const presentCode = async () => {
    phase = 'solving';
    buffer = '';
    const coded = encode(secret);
    await io.announce('HERE IS THE CODE', { speech: 'Here is the code. Pass it on.' });
    await io.show(coded, { hold: 600 });
    await io.announce('DECODE IT', { speech: 'Decode it, then press enter.' });
    io.showTyping('');
  };

  const check = async () => {
    if (buffer.toUpperCase() === secret.toUpperCase()) {
      await io.correct('CODE BROKEN');
      await io.wait(300);
      await askForWord();
      return;
    }
    await io.wrong('NOT THE CODE');
    buffer = '';
    io.showTyping('');
  };

  return {
    id: 'SECRET',

    async start() {
      await io.announce('SECRET CODE', { speech: 'Secret code.' });
      await askForWord();
    },

    replay: askForWord,

    /** Synchronous so rapid typing is never dropped. */
    handleInput(code) {
      // The secret stays masked while its author is typing it in.
      const render = () =>
        io.showTyping(phase === 'writing' ? '*'.repeat(buffer.length) : buffer);

      if (/^[A-Z'-]$/.test(code)) {
        if (buffer.length < 16) {
          buffer += code;
          render();
        }
        return true;
      }
      if (code === 'ERASE') {
        buffer = buffer.slice(0, -1);
        render();
        return true;
      }
      return false;
    },

    async handleKey(code) {
      if (code === 'ENTER') {
        if (phase === 'writing') {
          if (buffer.length === 0) return;
          secret = buffer;
          await presentCode();
        } else {
          await check();
        }
        return;
      }

      if (code === 'CLUE' && phase === 'solving') {
        await io.announce(`STARTS WITH ${secret[0].toUpperCase()}`, {
          speech: `It starts with ${secret[0]}`,
        });
        io.showTyping(buffer);
        return;
      }

      if (code === 'SAYIT' && phase === 'solving') {
        await io.show(encode(secret));
      }
    },
  };
};
