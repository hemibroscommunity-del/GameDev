/* v2.3.3695: the XP bar's rules (src/game/xpBar.js), run in node: the gain
 * between two of the worker's skill blobs, across levels; its words; which
 * skill's bar shows; one "+N" for a flurry; when it goes. */
import { skillXpGain, xpGainWords, noteProg3Xp, onXpBar, xpBarShown,
  XP_BAR_SHOW_MS, XP_GAIN_MS, XP_BAR_CATS } from '../../src/game/xpBar.js';
import { prog3XpRequired } from '../src/prog3.js';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};
const req = prog3XpRequired;
const blob = (sword, bow, staff) => ({ sk: { sword, bow, staff } });

// §1 the gain
check('1a: within a level, the XP it rose by', skillXpGain({ level: 3, xp: 10 }, { level: 3, xp: 14.5 }, req) === 4.5);
check('1b: nothing moved, nothing gained', skillXpGain({ level: 3, xp: 10 }, { level: 3, xp: 10 }, req) === 0);
check('1c: a fall (a respec, a reload) is no gain', skillXpGain({ level: 4, xp: 10 }, { level: 3, xp: 50 }, req) === 0
  && skillXpGain({ level: 3, xp: 50 }, { level: 3, xp: 10 }, req) === 0);
{
  const g = skillXpGain({ level: 2, xp: req(2) - 5 }, { level: 3, xp: 7 }, req);
  check('1d: across one level, the rest of the old level plus the new XP', Math.abs(g - 12) < 1e-9, g);
  const g2 = skillXpGain({ level: 2, xp: req(2) - 5 }, { level: 4, xp: 7 }, req);
  check('1e: across two levels, the whole level between too', Math.abs(g2 - (5 + req(3) + 7)) < 1e-9, g2);
}
check('1f: nothing for a missing side or curve', skillXpGain(null, { level: 1, xp: 1 }, req) === 0
  && skillXpGain({ level: 1, xp: 1 }, null, req) === 0 && skillXpGain({ level: 1, xp: 0 }, { level: 1, xp: 1 }) === 0);
check('1g: the client and the worker share one curve (prog3XpRequired, mirror-audit)', req(1) === 280 && req(2) === 325, [req(1), req(2)]);

// §2 the words
check('2a: "+3 XP", "+1.4 XP", "+12 XP", "+1,250 XP"',
  xpGainWords(3) === '+3 XP' && xpGainWords(1.44) === '+1.4 XP' && xpGainWords(12.4) === '+12 XP' && xpGainWords(1250) === '+1,250 XP',
  [xpGainWords(3), xpGainWords(1.44), xpGainWords(12.4), xpGainWords(1250)]);
check('2b: nothing for no gain', xpGainWords(0) === '' && xpGainWords(-2) === '' && xpGainWords('x') === '');

// §3 the bar
{
  const S = {};
  check('3a: a first blob shows nothing', noteProg3Xp(S, null, blob({ level: 1, xp: 5 }), req, 1000) === null && !S._xpBar);
  const a = blob({ level: 5, xp: 100 }, { level: 2, xp: 0 }, { level: 1, xp: 0 });
  check('3b: no combat skill gained, no bar', noteProg3Xp(S, a, a, req, 1000) === null && !S._xpBar);
  let told = 0;
  const off = onXpBar(() => { told++; });
  const b = blob({ level: 5, xp: 100 }, { level: 2, xp: 9 }, { level: 1, xp: 0 });
  const bar = noteProg3Xp(S, a, b, req, 1000);
  check('3c: the bow gained, so the bow\'s bar: its level, its share of the next level, the gain',
    !!bar && bar.cat === 'bow' && bar.level === 2 && Math.abs(bar.frac - 9 / req(2)) < 1e-9 && bar.gain === 9 && bar.seq === 1 && told === 1, bar);
  const c = blob({ level: 5, xp: 103 }, { level: 2, xp: 30 }, { level: 1, xp: 0 });
  const bar2 = noteProg3Xp(S, b, c, req, 1400);
  check('3d: two skills gain at once: the one that gained the most', !!bar2 && bar2.cat === 'bow' && bar2.gain === 9 + 21, bar2);
  check('3e: ...and within XP_GAIN_MS of the pop it adds into the same "+N" (same seq)', bar2.seq === 1 && bar2.gainAt === 1000, bar2);
  const d = blob({ level: 5, xp: 103 }, { level: 2, xp: 40 }, { level: 1, xp: 0 });
  const bar3 = noteProg3Xp(S, c, d, req, 1000 + XP_GAIN_MS + 50);
  check('3f: past XP_GAIN_MS a new pop starts with the new gain alone', bar3.seq === 2 && bar3.gain === 10, bar3);
  const e = blob({ level: 5, xp: 103 }, { level: 2, xp: 40 }, { level: 1, xp: 6 });
  const bar4 = noteProg3Xp(S, d, e, req, 1000 + XP_GAIN_MS + 100);
  check('3g: another skill earning takes the bar at once, a new pop', bar4.cat === 'staff' && bar4.seq === 3 && bar4.gain === 6, bar4);
  const f = blob({ level: 5, xp: 103 }, { level: 2, xp: 40 }, { level: 2, xp: 3 });
  const bar5 = noteProg3Xp(S, e, f, req, 5000);
  check('3h: a level gained: the new level, the bar from its start, `up`', bar5.level === 2 && bar5.up === true && Math.abs(bar5.frac - 3 / req(2)) < 1e-9
    && Math.abs(bar5.gain - (req(1) - 6 + 3)) < 1e-9, bar5);
  off();
  noteProg3Xp(S, f, blob({ level: 5, xp: 110 }, { level: 2, xp: 40 }, { level: 2, xp: 3 }), req, 6000);
  check('3i: a listener taken off is not told again', told === 5, told);
  check('3j: shown until XP_BAR_SHOW_MS after the last gain, then gone',
    xpBarShown(S._xpBar, 6000 + XP_BAR_SHOW_MS - 1) && !xpBarShown(S._xpBar, 6000 + XP_BAR_SHOW_MS) && !xpBarShown(null, 0));
  check('3k: the three combat skills, the worker\'s keys', XP_BAR_CATS.join() === 'sword,bow,staff');
}

console.log(`\n${pass + fail} checks, ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
