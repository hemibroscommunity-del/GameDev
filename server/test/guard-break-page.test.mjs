/* guard-break-page (v2.3.6554, card CT part 20): THE PHONE'S SHIELD FOLLOWS
 * THE WORKER'S GUARD BREAK (src/game/guardBreak.js).
 *
 * The owner, 2026-11-25: "shield isn't working correctly during combat it
 * stays like it's showing up even when the energy has been exhausted and you
 * take damage."  The worker broke the guard at 0 stamina (3 s latch); the
 * phone, whose own drop sits behind BroTown's BLOCK_COSTS_STAMINA (false on
 * purpose), kept the shield drawn and the button lit.
 *
 *   1. the rule: the worker's stamina at 0 (or below) with the phone's shield
 *      up is a break; up with stamina left, down at 0, no number (the worker
 *      said nothing), or no state: none;
 *   2. followWorkerGuard drops through the door it is given, with the why
 *      'stamina', and holds the button for the worker's latch
 *      (`_shieldCdUntil` = now + GUARD_BREAK_MS); no break: nothing written,
 *      nothing dropped;
 *   2b. poolsLand writes each pool the worker named (null: the page's kept),
 *      THEN follows the stamina it named (the landed bar is the worker's);
 *   3. the mirror: the phone's GUARD_BREAK_MS is the worker's
 *      (index.js `this.GUARD_BREAK_MS = N`), and the button's cooldown arc
 *      is it (ShieldButton.jsx SHIELD_CD_MS);
 *   4. the wiring: the wire's files (filesOf: wsClient's player_state) call
 *      poolsLand once, with the worker's pools and dropShield, and write the
 *      pools nowhere else.
 *
 * Mutants, tried by hand (each turns a check red):
 *   `stamina <= 0` -> `stamina < 0` ......................... FAIL 1 (at 0)
 *   `!!S._shieldUp &&` removed ............................... FAIL 1 (down)
 *   `typeof stamina === 'number' &&` removed ................. FAIL 1 (null)
 *   `S._shieldCdUntil = now + GUARD_BREAK_MS` removed ........ FAIL 2 (cd)
 *   poolsLand's pool write removed, or its `!== null` dropped  FAIL 2b
 *   `drop(S, 'stamina')` removed ............................. FAIL 2 (drop)
 *   GUARD_BREAK_MS 3000 -> 2000 .............................. FAIL 3
 *   SHIELD_CD_MS back to 2000 ................................ FAIL 3
 *   the wsClient call removed, or the old loop put back ....... FAIL 4
 */
import { readFileSync } from 'node:fs';
import { GUARD_BREAK_MS, workerGuardBroke, followWorkerGuard, poolsLand } from '../../src/game/guardBreak.js';
import { findIn } from '../../tools/guards/lib/filesOf.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const read = (rel) => readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

/* 1. the rule */
{
  check('1. up, the worker\'s stamina 0: a break', workerGuardBroke({ _shieldUp: true }, 0) === true);
  check('1. up, below 0: a break', workerGuardBroke({ _shieldUp: true }, -1) === true);
  check('1. up, stamina left: none', workerGuardBroke({ _shieldUp: true }, 0.5) === false && workerGuardBroke({ _shieldUp: true }, 40) === false);
  check('1. down at 0 (a sprint ran dry): none', workerGuardBroke({ _shieldUp: false }, 0) === false && workerGuardBroke({}, 0) === false);
  check('1. the worker named no stamina: none', workerGuardBroke({ _shieldUp: true }, null) === false
    && workerGuardBroke({ _shieldUp: true }, undefined) === false && workerGuardBroke({ _shieldUp: true }, '0') === false);
  check('1. no state: none', workerGuardBroke(null, 0) === false);
}

/* 2. what it writes */
{
  const calls = [];
  const drop = (S, why) => { calls.push(why); S._shieldUp = false; return true; };
  const S = { _shieldUp: true };
  const r = followWorkerGuard(S, 0, 10000, drop);
  check('2. a break: true, dropped once through the door, why stamina (drop)', r === true && calls.length === 1 && calls[0] === 'stamina' && S._shieldUp === false, calls);
  check('2. ...the button held for the worker\'s latch (cd)', S._shieldCdUntil === 10000 + GUARD_BREAK_MS, S._shieldCdUntil);
  const S2 = { _shieldUp: true };
  const r2 = followWorkerGuard(S2, 25, 10000, drop);
  check('2. no break: false, nothing dropped or written', r2 === false && calls.length === 1 && S2._shieldUp === true
    && S2._shieldCdUntil === undefined, S2);
  const S3 = { _shieldUp: false };
  check('2. down at 0: false, no cooldown', followWorkerGuard(S3, 0, 10000, drop) === false && S3._shieldCdUntil === undefined && calls.length === 1);
}

/* 2b. the pools land, then the guard follows */
{
  const calls = [];
  const drop = (S, why) => { calls.push(why); S._shieldUp = false; return true; };
  const S = { _shieldUp: true, rpg: { hp: 50, stamina: 40, mana: 9 } };
  const r = poolsLand(S, { hp: 80, stamina: 0, mana: null }, 500, drop);
  check('2b. each pool the worker named lands, a null keeps the page\'s', S.rpg.hp === 80 && S.rpg.stamina === 0 && S.rpg.mana === 9, S.rpg);
  check('2b. ...then the stamina it named breaks the guard', r === true && calls.length === 1 && S._shieldCdUntil === 500 + GUARD_BREAK_MS);
  const S2 = { _shieldUp: true, rpg: { stamina: 0 } };
  check('2b. stamina not named (null): the page\'s 0 is no word of the worker\'s, no drop', poolsLand(S2, { stamina: null, hp: 5 }, 500, drop) === false && calls.length === 1 && S2._shieldUp === true && S2.rpg.hp === 5);
  check('2b. no rpg or no pools: nothing', poolsLand({ _shieldUp: true }, { stamina: 0 }, 1, drop) === false && poolsLand(S2, null, 1, drop) === false && calls.length === 1);
}

/* 3. the mirror */
{
  const idx = read('server/src/index.js');
  const m = idx.match(/this\.GUARD_BREAK_MS\s*=\s*(\d+)\s*;/);
  check('3. the worker\'s latch is still parseable (guard)', !!m, null);
  check(`3. the phone's GUARD_BREAK_MS (${GUARD_BREAK_MS}) is the worker's (${m && m[1]})`, !!m && Number(m[1]) === GUARD_BREAK_MS);
  const btn = read('src/ui/panels/ShieldButton.jsx');
  check('3. the button\'s cooldown arc is the worker\'s latch (SHIELD_CD_MS = GUARD_BREAK_MS, imported from guardBreak.js)',
    /const SHIELD_CD_MS\s*=\s*GUARD_BREAK_MS\s*;/.test(btn) && /import\s*\{\s*GUARD_BREAK_MS\s*\}\s*from\s*'@\/game\/guardBreak\.js'/.test(btn));
}

/* 4. the wiring (the wire's files: wsClient.js's player_state) */
{
  const call = findIn('wire', /poolsLand\(S, _poolsFromServer, Date\.now\(\), dropShield\)/);
  const imp = findIn('wire', /import\s*\{\s*poolsLand\s*\}\s*from\s*'@\/game\/guardBreak\.js'/);
  const loop = findIn('wire', /S\.rpg\[_pk\]\s*=\s*_poolsFromServer\[_pk\]/);
  check('4. the wire imports poolsLand from guardBreak.js', imp.length === 1, imp);
  check('4. the worker\'s pools land through poolsLand, once', call.length === 1, call);
  check('4. ...and no second landing of the pools beside it', loop.length === 0, loop);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
