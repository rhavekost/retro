/**
 * MYSTERY WORD — hangman. The word shows as dashes; guess a letter at a time.
 * Six misses and the toy tells you what it was.
 */
import { randomWord } from '../../data/words.js';

const MAX_MISSES = 6;

export const createMysteryMode = (io, { level }) => {
  let word = '';
  let found = new Set();
  let missed = new Set();

  const masked = () =>
    word
      .toUpperCase()
      .split('')
      .map((letter) => (found.has(letter) ? letter : '-'))
      .join('');

  const solved = () => word.toUpperCase().split('').every((letter) => found.has(letter));

  const newWord = async () => {
    word = randomWord(level);
    found = new Set();
    missed = new Set();
    await io.announce('GUESS A LETTER', { speech: 'Guess a letter.' });
    await io.show(masked());
  };

  const guess = async (letter) => {
    if (found.has(letter) || missed.has(letter)) {
      await io.announce('ALREADY TRIED', { speech: 'You already tried that one.' });
      await io.show(masked());
      return;
    }

    if (word.toUpperCase().includes(letter)) {
      found.add(letter);
      if (solved()) {
        await io.show(word.toUpperCase());
        await io.correct('YOU GOT IT');
        await io.wait(300);
        await newWord();
        return;
      }
      await io.announce(masked(), { speech: `Yes. ${letter}` });
      return;
    }

    missed.add(letter);
    const left = MAX_MISSES - missed.size;
    if (left <= 0) {
      await io.wrong('OUT OF TRIES');
      await io.announce(`THE WORD WAS ${word.toUpperCase()}`, {
        speech: `The word was ${word}.`,
      });
      await io.spellOut(word);
      await io.wait(400);
      await newWord();
      return;
    }

    await io.wrong(`NO - ${left} LEFT`);
    await io.show(masked());
  };

  return {
    id: 'MYSTERY',

    async start() {
      await io.announce('MYSTERY WORD', { speech: 'Mystery word.' });
      await newWord();
    },

    replay: newWord,

    async handleKey(code) {
      if (/^[A-Z]$/.test(code)) {
        await guess(code);
        return;
      }
      if (code === 'CLUE') {
        const hidden = word
          .toUpperCase()
          .split('')
          .filter((letter) => !found.has(letter));
        if (hidden.length > 1) {
          found.add(hidden[0]);
          await io.announce(masked(), { speech: `Here is a letter. ${hidden[0]}` });
        }
        return;
      }
      if (code === 'SAYIT' || code === 'ENTER') {
        await io.show(masked());
      }
    },
  };
};
