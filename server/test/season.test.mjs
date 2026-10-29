/* Halloween week -- v2.3.3395 (src/game/season.js, docs/specs/halloween.md).
 *
 * The phone's calendar for the season's looks (the Zombie Shuffle's tile, the
 * pumpkin speech bubbles), read in node:
 *
 *   1. on from 18 October (the 24th until v2.3.3463) to 1 November, by the
 *      local calendar, any year;
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
check('1a the window is 18 October to 1 November', HALLOWEEN.FROM.month === 10 && HALLOWEEN.FROM.day === 18 && HALLOWEEN.TO.month === 11 && HALLOWEEN.TO.day === 1);
/* v2.3.3463: the 18th to the 23rd are in it now (the owner's "Start today") */
const cases = [[2026, 10, 17, false], [2026, 10, 18, true], [2026, 10, 23, true], [2026, 10, 24, true], [2026, 10, 31, true], [2026, 11, 1, true], [2026, 11, 2, false],
  [2026, 7, 4, false], [2027, 10, 18, true], [2027, 10, 17, false], [2027, 10, 30, true], [2025, 12, 31, false], [2026, 1, 1, false]];
for (const [y, m, d, want] of cases) {
  check('1b ' + y + '-' + m + '-' + d + ' is ' + (want ? 'Halloween week' : 'not'), halloweenOn(day(y, m, d)) === want);
}
check('1c the first and last minutes count', halloweenOn(new Date(2026, 9, 18, 0, 0, 1)) && halloweenOn(new Date(2026, 10, 1, 23, 59, 59)) && !halloweenOn(new Date(2026, 9, 17, 23, 59, 59)) && !halloweenOn(new Date(2026, 10, 2, 0, 0, 1)));
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

/* ── 5. v2.3.3522: whose bubble is whose (src/game/bubbleSkins.js) ──────────
   The owner: "Make Npc dialog boxes white. Keep players the darker color to
   differentiate."  A townsperson's line (the renderer's 'npc:<id>' key) is the
   white bubble always; a player's is dark always: Halloween's purple in its
   week, Lantern Slate's the rest of the year. */
{
  const { BUBBLE_SKINS, bubbleSkinFor } = await import('../../src/game/bubbleSkins.js');
  check('5a a townsperson\'s bubble is white, in Halloween week and out of it',
    bubbleSkinFor('npc:mayor_bro', true) === 'plain' && bubbleSkinFor('npc:diego', false) === 'plain');
  check('5b v2.3.3858: a player\'s is white too ("Make chat bubble background white and the chat font black"), in Halloween week and out of it',
    bubbleSkinFor('bp_abc123', true) === 'plain' && bubbleSkinFor('bp_abc123', false) === 'plain'
      && bubbleSkinFor('guest_9', false) === 'plain');
  check('5c any key at all is the white bubble', bubbleSkinFor('xnpc:1', true) === 'plain' && bubbleSkinFor('', false) === 'plain'
    && bubbleSkinFor(null, false) === 'plain' && bubbleSkinFor(undefined, true) === 'plain');
  const lum = (h) => { const v = parseInt(h.slice(1), 16); return 0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255); };
  const S = BUBBLE_SKINS;
  check('5d the white bubble is light with black words; both player skins dark with light words',
    S.plain.stops.every((c) => lum(c) > 200) && S.plain.text === '#000000'
      && ['halloween', 'player'].every((k) => S[k].stops.every((c) => lum(c) < 80) && lum(S[k].text) > 200),
    Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.stops.map(lum).map(Math.round)])));
  check('5e the everyday player skin is Lantern Slate (raised #2B3940 into the panel #202C32, text-1 #F7F2E7)',
    S.player.stops[0] === '#2B3940' && S.player.stops[2] === '#202C32' && S.player.text === '#F7F2E7' && S.player.strokeAlpha > 0 && S.player.strokeAlpha < 1);
  check('5f every skin has its three stops and an edge', Object.values(S).every((v) => v.stops.length === 3 && typeof v.stroke === 'number' && v.strokeAlpha > 0));
}

console.log(`\nseason: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
