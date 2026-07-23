/**
 * SPELL — the headline game. Ten words; two attempts each; the toy recites
 * the correct spelling when you run out of tries, then scores you at the end.
 */
import { buildRound, WORDS_PER_ROUND } from '../../data/words.js';

export const createSpellMode = (io, { level, onRoundEnd }) => {
  let words = buildRound(level);
  let index = 0;
  let attempts = 0;
  let score = 0;
  let buffer = '';
  let cluesUsed = 0;

  const currentWord = () => words[index] ?? '';

  const promptWord = async () => {
    buffer = '';
    attempts = 0;
    cluesUsed = 0;
    await io.announce(`SPELL ${currentWord().toUpperCase()}`, {
      speech: `Spell. ${currentWord()}`,
    });
    io.showTyping('');
  };

  const finishRound = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${WORDS_PER_ROUND}`);
    if (score === WORDS_PER_ROUND) {
      await io.announce('PERFECT SCORE', { speech: 'Perfect score. You are a good speller.' });
    }
    await io.show('SPELL OR GO');
    onRoundEnd?.(score);
  };

  const advance = async () => {
    index += 1;
    if (index >= words.length) {
      await finishRound();
      return;
    }
    await promptWord();
  };

  const submit = async () => {
    const guess = buffer.toLowerCase();
    if (guess.length === 0) return;

    if (guess === currentWord()) {
      score += cluesUsed > 0 ? 0 : 1; // A clue costs you the point.
      await io.correct(cluesUsed > 0 ? 'CORRECT WITH A CLUE' : 'THAT IS CORRECT');
      await advance();
      return;
    }

    attempts += 1;
    buffer = '';
    if (attempts < 2) {
      await io.wrong();
      io.showTyping('');
      return;
    }

    await io.wrong('THAT IS INCORRECT');
    await io.announce(`${currentWord().toUpperCase()} IS SPELLED`, {
      speech: `The correct spelling of ${currentWord()} is`,
    });
    await io.spellOut(currentWord());
    await io.wait(400);
    await advance();
  };

  const giveClue = async () => {
    const word = currentWord();
    if (!word) return;
    cluesUsed += 1;
    const revealed = word.slice(0, Math.min(cluesUsed, word.length - 1)).toUpperCase();
    const masked = revealed.padEnd(word.length, '-');
    await io.announce(masked, {
      speech: `The word has ${word.length} letters and starts with ${revealed.split('').join(', ')}`,
    });
    io.showTyping(buffer);
  };

  return {
    id: 'SPELL',

    async start() {
      words = buildRound(level);
      index = 0;
      score = 0;
      await io.announce('SPELL IT', { speech: 'Spell it.' });
      await promptWord();
    },

    /** Restarts the same ten words in the same order. */
    async replay() {
      index = 0;
      score = 0;
      await io.announce('REPLAY', { speech: 'Replay.' });
      await promptWord();
    },

    /**
     * Letters and ERASE are handled synchronously so that fast typing never
     * collides with the device's one-action-at-a-time lock.
     */
    handleInput(code) {
      if (/^[A-Z'-]$/.test(code)) {
        if (buffer.length < 16) {
          buffer += code;
          io.showTyping(buffer);
        }
        return true;
      }
      if (code === 'ERASE') {
        buffer = buffer.slice(0, -1);
        io.showTyping(buffer);
        return true;
      }
      return false;
    },

    async handleKey(code) {
      if (code === 'ENTER') {
        await submit();
        return;
      }
      if (code === 'SAYIT') {
        await io.say(currentWord());
        return;
      }
      if (code === 'CLUE') {
        await giveClue();
      }
    },
  };
};
