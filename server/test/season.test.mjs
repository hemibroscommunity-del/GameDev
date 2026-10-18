/* Halloween week -- v2.3.3395 (src/game/season.js, docs/specs/halloween.md).
 *
 * The phone's calendar for the season's looks (the Zombie Shuffle's tile, the
 * pumpkin speech bubbles), read in node:
 *
 *   1. on from 24 October to 1 November, by the local calendar, any year;
 *   2. `?halloween=1` / `?halloween=0` forces it either way for a tab;
 *   3. a move with no season is always on, an unknown season never;
 *   4. every season's move is a held pose the worker keeps any day (a look,
 *      never a rule: a phone with a wrong clock breaks nothing).
 */
import { halloweenOn, seasonOn, HALLOWEEN, _resetSeasonForTests } from '../../src/game/season.js';
import { EMOTE_MOVES, EMOTE_MOVE_IDS } from '../../src/game/emoteMoves.js';
import { POSE } from '../src/poses.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}

/* ── 1. the calendar ─────────────────────────────────────────────────────── */
_resetSeasonForTests(null);   /* no address override */
const day = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);
check('1a the window is 24 October to 1 November', HALLOWEEN.FROM.month === 10 && HALLOWEEN.FROM.day === 24 && HALLOWEEN.TO.month === 11 && HALLOWEEN.TO.day === 1);
const cases = [[2026, 10, 23, false], [2026, 10, 24, true], [2026, 10, 31, true], [2026, 11, 1, true], [2026, 11, 2, false],
  [2026, 7, 4, false], [2027, 10, 30, true], [2025, 12, 31, false], [2026, 1, 1, false]];
for (const [y, m, d, want] of cases) {
  check('1b ' + y + '-' + m + '-' + d + ' is ' + (want ? 'Halloween week' : 'not'), halloweenOn(day(y, m, d)) === want);
}
check('1c the first and last minutes count', halloweenOn(new Date(2026, 9, 24, 0, 0, 1)) && halloweenOn(new Date(2026, 10, 1, 23, 59, 59)) && !halloweenOn(new Date(2026, 9, 23, 23, 59, 59)));
check('1d a time as a number works too', halloweenOn(day(2026, 10, 30).getTime()) === true);

/* ── 2. the address override ─────────────────────────────────────────────── */
const realLoc = globalThis.location;
globalThis.location = { search: '?trial=wheel&halloween=1' };
_resetSeasonForTests(undefined);
check('2a ?halloween=1: on in July', halloweenOn(day(2026, 7, 4)) === true);
globalThis.location = { search: '?halloween=0' };
_resetSeasonForTests(undefined);
check('2b ?halloween=0: off on the 31st', halloweenOn(day(2026, 10, 31)) === false);
globalThis.location = { search: '?halloweenx=1' };
_resetSeasonForTests(undefined);
check('2c a near miss is no override', halloweenOn(day(2026, 7, 4)) === false && halloweenOn(day(2026, 10, 31)) === true);
globalThis.location = realLoc;
_resetSeasonForTests(null);

/* ── 3. seasons ──────────────────────────────────────────────────────────── */
check('3a no season: always on', seasonOn(undefined, day(2026, 7, 4)) && seasonOn(null) && seasonOn('', day(2026, 1, 1)));
check('3b halloween: by the calendar', seasonOn('halloween', day(2026, 10, 25)) && !seasonOn('halloween', day(2026, 3, 1)));
check('3c an unknown season: never', !seasonOn('easter', day(2026, 4, 5)) && !seasonOn('__proto__'));

/* ── 4. the season's moves ───────────────────────────────────────────────── */
const seasonal = EMOTE_MOVE_IDS.filter((id) => EMOTE_MOVES[id].season);
check('4a the Zombie Shuffle is Halloween\'s', seasonal.length === 1 && seasonal[0] === 'zombie' && EMOTE_MOVES.zombie.season === 'halloween', seasonal);
check('4b ...a held dance the worker keeps any day', seasonal.every((id) => EMOTE_MOVES[id].kind === 'hold' && EMOTE_MOVES[id].dance && POSE.IDS.includes(id)));

console.log(`\nseason: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
