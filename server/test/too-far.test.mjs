/* v2.3.3900: the "Too far away" word over a resource tapped out of reach
 * (src/game/tooFar.js), run in node: its words, phone and computer; once a
 * second a resource; each resource its own clock; the cap on the stamps; where
 * it sits. */
import { tooFarWord, tooFarPlace, TOO_FAR_WORD, TOO_FAR_WORD_DESK, TOO_FAR_GAP_MS } from '../../src/game/tooFar.js';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};
const pushed = [];
const push = (S, x, y, text, color) => pushed.push({ x, y, text, color });

// §1 the words
const S = {};
check('1a: a phone reads "Too far away"', tooFarWord(S, 'r1', 10, 20, 1000, { push, computer: false }) && pushed[0].text === TOO_FAR_WORD && TOO_FAR_WORD === 'Too far away');
check('1b: at the place given', pushed[0].x === 10 && pushed[0].y === 20);
const S2 = {};
tooFarWord(S2, 'r1', 0, 0, 1000, { push, computer: true });
check('1c: a computer reads "Too far away: walk closer"', pushed[1].text === TOO_FAR_WORD_DESK && TOO_FAR_WORD_DESK === 'Too far away: walk closer');

// §2 once a second a resource
check('2a: the same resource again at once: nothing', tooFarWord(S, 'r1', 10, 20, 1500, { push }) === false && pushed.length === 2);
check('2b: another resource has its own clock', tooFarWord(S, 'r2', 10, 20, 1500, { push }) === true && pushed.length === 3);
check('2c: a second on, the first says it again', tooFarWord(S, 'r1', 10, 20, 1000 + TOO_FAR_GAP_MS, { push }) === true && TOO_FAR_GAP_MS === 1000);
check('2d: a key that is a number works (a bed)', tooFarWord(S, 3, 0, 0, 5000, { push }) === true && tooFarWord(S, '3', 0, 0, 5100, { push }) === false);

// §3 the stamps have a cap
const S3 = {};
for (let i = 0; i < 200; i++) tooFarWord(S3, 'n' + i, 0, 0, 1000, { push });
check('3a: never more than 64 stamps held', S3._tooFarAt.size <= 64, S3._tooFarAt.size);
check('3b: a "__proto__" id is a resource like any other', tooFarWord({}, '__proto__', 0, 0, 1, { push }) === true);

// §4 nothing to say without what it needs
check('4a: no popup helper: nothing, no throw', tooFarWord({}, 'x', 0, 0, 1, {}) === false);
check('4b: no key: nothing', tooFarWord({}, null, 0, 0, 1, { push }) === false);

// §5 where it sits
const p = tooFarPlace({ l: 100, r: 200, t: 50, b: 150 }, { x: 0, y: 0 });
check('5a: over the middle of the picture, just above its top', p.x === 150 && p.y === 42, p);
const q = tooFarPlace(null, { x: 30, y: 300 });
check('5b: no picture: over its anchor', q.x === 30 && q.y === 260, q);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
