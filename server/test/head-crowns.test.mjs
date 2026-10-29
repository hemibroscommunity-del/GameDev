/* v2.3.3880: the head's crown on the flinch facing north and north-east
 * (src/rendering/headCrowns.js, TRAPS §100): where body-tops' topmost pixel
 * is the raised fist, the head pieces sit on the head instead. */
import { readFileSync } from 'node:fs';
import { HEAD_CROWNS, headCrown } from '../../src/rendering/headCrowns.js';

let passed = 0, failed = 0;
const check = (name, ok, info) => { if (ok) { passed++; console.log('PASS ' + name); } else { failed++; console.log('FAIL ' + name, info === undefined ? '' : JSON.stringify(info)); } };

const tops = JSON.parse(readFileSync(new URL('../../public/sprites/player/body-tops.json', import.meta.url), 'utf8'));
const fixes = JSON.parse(readFileSync(new URL('../../tools/species-fixes/monkey.json', import.meta.url), 'utf8'));
const crownsIn = (o, out = {}) => {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if (/^hit-(north|northeast)$/.test(k)) for (const [f, e] of Object.entries(v)) { if (e && e.crown) out[k + '-' + f] = e.crown; }
    else crownsIn(v, out);
  }
  return out;
};
const measured = crownsIn(fixes);

check('1. every corrected frame is one the monkey\'s measured crown names, with the same crown',
  Object.keys(HEAD_CROWNS).length === 6 && Object.entries(HEAD_CROWNS).every(([k, v]) => measured[k] && measured[k][0] === v[0] && measured[k][1] === v[1]),
  { HEAD_CROWNS, measured });
check('2. each corrected frame is one where body-tops is far from the head (the fist): more than 20 px across',
  Object.entries(HEAD_CROWNS).every(([k, v]) => tops[k] && Math.abs(tops[k][0] - v[0]) > 20), Object.fromEntries(Object.keys(HEAD_CROWNS).map((k) => [k, tops[k]])));
check('3. a corrected frame answers the head\'s crown', headCrown(tops, 'hit', 'north', 3)[0] === 95);
check('4. any other frame answers body-tops as before', JSON.stringify(headCrown(tops, 'hit', 'north', 2)) === JSON.stringify(tops['hit-north-2'])
  && JSON.stringify(headCrown(tops, 'jog', 'north', 5)) === JSON.stringify(tops['jog-north-5']));
check('5. a frame body-tops lacks answers the standing frame, as before', JSON.stringify(headCrown(tops, 'nopose', 'north', 0)) === JSON.stringify(tops['stand-north-0']));
check('6. no body-tops yet: null (the piece waits), corrected frames aside', headCrown(null, 'jog', 'north', 0) === null);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
