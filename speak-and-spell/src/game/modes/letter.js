/**
 * SAY IT / LETTER — the toy calls out a letter, you find it on the keypad.
 * Ten of them, then a score.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROUNDS = 10;

export const createLetterMode = (io) => {
  let target = 'A';
  let asked = 0;
  let score = 0;

  const nextLetter = async () => {
    target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    asked += 1;
    await io.announce('FIND IT', { speech: `Find the letter ${target}` });
    io.showTyping('');
  };

  const finish = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${ROUNDS}`);
    await io.show('SPELL OR GO');
  };

  return {
    id: 'LETTER',

    async start() {
      asked = 0;
      score = 0;
      await io.announce('LETTER GAME', { speech: 'Letter game.' });
      await nextLetter();
    },

    async replay() {
      await this.start();
    },

    async handleKey(code) {
      if (!/^[A-Z]$/.test(code)) {
        if (code === 'REPEAT' || code === 'SAYIT') await io.say(`Find the letter ${target}`);
        return;
      }

      if (code === target) {
        score += 1;
        await io.show(target);
        await io.correct('THAT IS RIGHT');
      } else {
        await io.wrong(`NO - THAT IS ${code}`);
        await io.say(`That is ${code}. Find the letter ${target}`);
        return;
      }

      if (asked >= ROUNDS) {
        await finish();
        return;
      }
      await nextLetter();
    },
  };
};
