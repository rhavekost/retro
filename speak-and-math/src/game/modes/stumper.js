/**
 * NUMBER STUMPER — the equation is shown with one operand missing.
 */
import { makeStumper } from '../../data/problems.js';

const ROUND_LENGTH = 10;

export const createStumperMode = (io, { level, rng = Math.random }) => {
  let puzzle = null;
  let asked = 0;
  let attempts = 0;
  let score = 0;
  let buffer = '';

  const ask = async () => {
    puzzle = makeStumper({ rng, level });
    attempts = 0;
    buffer = '';
    asked += 1;
    await io.announce(puzzle.display, { speech: puzzle.spoken });
    io.showTyping('');
  };

  const finish = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${ROUND_LENGTH}`);
    await io.show('STUMPER OR GO');
  };

  const submit = async () => {
    if (buffer.length === 0) return;
    if (Number.parseInt(buffer, 10) === puzzle.answer) {
      score += 1;
      await io.correct('THAT IS CORRECT');
      if (asked >= ROUND_LENGTH) return finish();
      return ask();
    }

    attempts += 1;
    buffer = '';
    if (attempts < 2) {
      await io.wrong('TRY AGAIN');
      io.showTyping('');
      return undefined;
    }

    await io.wrong('THAT IS INCORRECT');
    await io.announce(`${puzzle.display.replace('?', puzzle.answer)}`, { speech: `The missing number is ${puzzle.answer}` });
    await io.wait(500);
    if (asked >= ROUND_LENGTH) return finish();
    return ask();
  };

  return {
    id: 'STUMPER',

    async start() {
      asked = 0;
      score = 0;
      await io.announce('NUMBER STUMPER', { speech: 'Number stumper.' });
      await ask();
    },

    async replay() {
      await this.start();
    },

    handleInput(code) {
      if (/^[0-9]$/.test(code)) {
        if (buffer.length < 6) {
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
      if (code === 'REPEAT' || code === 'SAYIT') {
        await io.say(puzzle.spoken);
      }
    },
  };
};
