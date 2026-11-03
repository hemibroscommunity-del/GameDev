/* v2.3.3991: the townsfolk's idle lines (src/game/townChatter.js), run in
 * node: only in town, only near, one town-wide every 20 s, each townsperson
 * 30-60 s; in town is the Wheel's safe ground. */
import { idleChatMay, idleChatTimer, inTownAt, IDLE_REACH, IDLE_GAP_MS,
  IDLE_TIMER_MIN_MS, IDLE_TIMER_MAX_MS } from '../../src/game/townChatter.js';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};

// §1 the owner's numbers
check('1a: 350 px, 20 s, 30-60 s', IDLE_REACH === 350 && IDLE_GAP_MS === 20000 && IDLE_TIMER_MIN_MS === 30000 && IDLE_TIMER_MAX_MS === 60000);
check('1b: a townsperson\'s timer runs 30-60 s', idleChatTimer(0) === 30000 && idleChatTimer(0.999) < 60000 && idleChatTimer(0.5) === 45000);

// §2 in town
const C = [1600, 1600];
check('2a: the Wheel\'s middle is town', inTownAt('wheel', C, 500, 1600, 1600));
check('2b: just inside the safe ground is town', inTownAt('wheel', C, 500, 1600 + 499, 1600));
check('2c: past it (out in a land) is not', !inTownAt('wheel', C, 500, 1600 + 501, 1600));
check('2d: no safe ground on file: not town (never chatter by mistake)', !inTownAt('wheel', null, 500, 0, 0) && !inTownAt('wheel', C, 0, 1600, 1600));
check('2e: a zone that is not the Wheel is all town', inTownAt('town', null, 0, 0, 0));

// §3 the gate
const S = {};
check('3a: out of town: no line', idleChatMay(S, 100, false, 1000) === false && S._idleChatAt == null);
check('3b: in town but 351 px off: no line', idleChatMay(S, 351, true, 1000) === false);
check('3c: in town, near: a line, and the town\'s clock starts', idleChatMay(S, 200, true, 1000) === true && S._idleChatAt === 1000);
check('3d: another townsperson 19 s later: none', idleChatMay(S, 50, true, 1000 + 19000) === false);
check('3e: 20 s on: one again', idleChatMay(S, 50, true, 1000 + IDLE_GAP_MS) === true);
check('3f: no distance: no line', idleChatMay({}, undefined, true, 1) === false);

// §4 over 60 s standing among the townsfolk, at most 3 lines (was ~80)
{
  const T = {};
  const folk = Array.from({ length: 21 }, (_, i) => ({ t: (i * 1777) % 30000 }));
  let lines = 0;
  for (let now = 0; now <= 60000; now += 100) {
    for (const f of folk) {
      f.t -= 100;
      if (f.t > 0) continue;
      if (idleChatMay(T, 120, true, now)) lines++;
      f.t = idleChatTimer(((now / 100) * 7 % 13) / 13);
    }
  }
  check('4a: 21 townsfolk round you for 60 s: at most 3 idle lines', lines >= 1 && lines <= 3, lines);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
