/**
 * GREATER THAN — two numbers, pick the relation. Answered with the three
 * relation keys rather than typed digits.
 */
import { makeComparison } from '../../data/problems.js';

const ROUND_LENGTH = 10;
const RELATION_KEYS = { LT: '<', GT: '>', EQ: '=' };
// The shared 14-segment font can't draw '<' or '>' (see shared/display/segments.js),
// so the display half of the wrong-answer feedback spells the relation out.
const RELATION_WORD = { '<': 'LESS THAN', '>': 'MORE THAN', '=': 'EQUAL TO' };

export const createCompareMode = (io, { level, rng = Math.random }) => {
  let pair = null;
  let asked = 0;
  let score = 0;

  const ask = async () => {
    pair = makeComparison({ rng, level });
    asked += 1;
    await io.announce(`${pair.left}  ${pair.right}`, {
      speech: `Is ${pair.left} greater than, less than, or equal to ${pair.right}?`,
    });
  };

  const finish = async () => {
    await io.celebrate(`YOU GOT ${score} RIGHT OUT OF ${ROUND_LENGTH}`);
    await io.show('COMPARE OR GO');
  };

  return {
    id: 'COMPARE',

    async start() {
      asked = 0;
      score = 0;
      await io.announce('GREATER OR LESS', { speech: 'Greater than or less than.' });
      await ask();
    },

    async replay() {
      await this.start();
    },

    async handleKey(code) {
      const chosen = RELATION_KEYS[code];
      if (!chosen) {
        if (code === 'REPEAT' || code === 'SAYIT') {
          await io.say(`Is ${pair.left} greater than, less than, or equal to ${pair.right}?`);
        }
        return;
      }

      if (chosen === pair.relation) {
        score += 1;
        await io.correct('THAT IS CORRECT');
      } else {
        await io.wrong('NO');
        await io.announce(`${pair.left} ${RELATION_WORD[pair.relation]} ${pair.right}`, {
          speech: `${pair.left} is ${
            pair.relation === '=' ? 'equal to' : pair.relation === '<' ? 'less than' : 'greater than'
          } ${pair.right}`,
        });
      }

      if (asked >= ROUND_LENGTH) {
        await finish();
        return;
      }
      await ask();
    },
  };
};
