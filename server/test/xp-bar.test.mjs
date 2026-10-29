/* v2.3.3695: the XP bar's rules (src/game/xpBar.js), run in node: the gain
 * between two of the worker's skill blobs, across levels; its words; which
 * skill's bar shows; one "+N" for a flurry; when it goes. */
import { skillXpGain, xpGainWords, noteProg3Xp, onXpBar, xpBarShown,
  XP_BAR_SHOW_MS, XP_GAIN_MS, XP_BAR_CATS,
  xpNumWords, xpToNextWords, xpFillSteps, XP_FILL_DELAY_MS, XP_FILL_MS, XP_WRAP_MS,
  xpEase, xpCountAt, xpShowMs, XP_BAR_UP_SHOW_MS } from '../../src/game/xpBar.js';
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
  check('3l: v2.3.3739: where the skill stood before the gain (the white bar\'s start)',
    bar3.fromLevel === 2 && Math.abs(bar3.fromFrac - 30 / req(2)) < 1e-9
      && bar5.fromLevel === 1 && Math.abs(bar5.fromFrac - 6 / req(1)) < 1e-9, [bar3, bar5]);
}

// §4 v2.3.3739: "45 / 120" on the bar (the owner: "show the number of xp needed for the next level")
check('4a: whole numbers from 10, rounded down (never "120 / 120" a hair early)',
  xpNumWords(45) === '45' && xpNumWords(119.9) === '119' && xpNumWords(10) === '10', [xpNumWords(119.9)]);
check('4b: one decimal where the XP is fractional below 10, none when whole',
  xpNumWords(1.44) === '1.4' && xpNumWords(9.99) === '9.9' && xpNumWords(3) === '3' && xpNumWords(0) === '0' && xpNumWords(0.2 * 3) === '0.6',
  [xpNumWords(1.44), xpNumWords(9.99), xpNumWords(0.6)]);
check('4c: a thousands separator from 1,000', xpNumWords(999) === '999' && xpNumWords(1000) === '1,000' && xpNumWords(12345.6) === '12,345');
check('4d: nothing odd from a bad number', xpNumWords(-5) === '0' && xpNumWords('x') === '0' && xpNumWords(null) === '0');
check('4e: "45 / 120", "1.4 / 280", "1,250 / 2,400"',
  xpToNextWords(45, 120) === '45 / 120' && xpToNextWords(1.44, req(1)) === '1.4 / 280' && xpToNextWords(1250, 2400) === '1,250 / 2,400',
  [xpToNextWords(45, 120), xpToNextWords(1.44, req(1)), xpToNextWords(1250, 2400)]);
check('4f: never "/ 0"', xpToNextWords(3, 0) === '3 / 1');

// §5 v2.3.3739: how the track moves (the white bar)
{
  const b = (o) => Object.assign({ cat: 'sword', level: 3, frac: 0.5, at: 10000, fromLevel: 3, fromFrac: 0.4 }, o);
  let p = xpFillSteps(null, b({}));
  check('5a: nothing drawn yet: fresh, the gold starts where the XP was before the gain', p.fresh && !p.wrap && p.from === 0.4, p);
  p = xpFillSteps({ cat: 'sword', level: 3, at: 9000 }, b({}));
  check('5b: a gain while the bar is up: the gold grows on from where it is (not fresh, no wrap)', !p.fresh && !p.wrap, p);
  p = xpFillSteps({ cat: 'sword', level: 3, at: 10000 - XP_BAR_SHOW_MS }, b({}));
  check('5c: the bar had gone: fresh again', p.fresh && !p.wrap && p.from === 0.4, p);
  p = xpFillSteps({ cat: 'bow', level: 3, at: 9900 }, b({}));
  check('5d: another skill: fresh', p.fresh, p);
  p = xpFillSteps({ cat: 'sword', level: 3, at: 9900 }, b({ level: 4, frac: 0.1, fromLevel: 3, fromFrac: 0.9 }));
  check('5e: a level crossed since the level drawn: wrap (white and gold to the end, then the new level)', !p.fresh && p.wrap, p);
  p = xpFillSteps(null, b({ level: 4, frac: 0.1, fromLevel: 3, fromFrac: 0.9 }));
  check('5f: a level-up on a fresh bar: wrap, the gold from the old level\'s place', p.fresh && p.wrap && p.from === 0.9, p);
  p = xpFillSteps({ cat: 'sword', level: 4, at: 9900 }, b({ level: 4, frac: 0.3, fromLevel: 4, fromFrac: 0.1 }));
  check('5g: the next gain after a level-up grows on (no second wrap)', !p.fresh && !p.wrap, p);
  p = xpFillSteps({ cat: 'sword', level: 5, at: 9900 }, b({}));
  check('5h: a fall in level (a respec) is drawn fresh, never a wrap', p.fresh && !p.wrap, p);
  check('5i: v2.3.3796: the white alone >= 0.5 s, the climb >= 1 s, the level-up\'s second step after the first has run',
    XP_FILL_DELAY_MS >= 500 && XP_FILL_MS >= 1000 && XP_FILL_MS <= 1500 && XP_FILL_DELAY_MS + XP_FILL_MS <= XP_WRAP_MS,
    [XP_FILL_DELAY_MS, XP_FILL_MS, XP_WRAP_MS]);
  check('5j: v2.3.3796: the whole show ends with time to read it (a gain 1 s, a level-up 1 s, inside its longer show)',
    XP_FILL_DELAY_MS + XP_FILL_MS + 1000 <= XP_BAR_SHOW_MS && XP_WRAP_MS + XP_FILL_DELAY_MS + XP_FILL_MS + 1000 <= XP_BAR_UP_SHOW_MS,
    [XP_BAR_SHOW_MS, XP_BAR_UP_SHOW_MS]);
  check('5k: v2.3.3796: a level-up\'s bar stays XP_BAR_UP_SHOW_MS, any other XP_BAR_SHOW_MS',
    xpShowMs({ up: true }) === XP_BAR_UP_SHOW_MS && xpShowMs({ up: false }) === XP_BAR_SHOW_MS && xpShowMs(null) === XP_BAR_SHOW_MS
      && xpBarShown({ at: 0, up: true }, XP_BAR_SHOW_MS + 100) && !xpBarShown({ at: 0, up: false }, XP_BAR_SHOW_MS + 100));
  p = xpFillSteps({ cat: 'sword', level: 3, at: 10000 - XP_BAR_SHOW_MS - 100, up: true }, b({}));
  check('5l: a level-up\'s bar is still up past XP_BAR_SHOW_MS: the next gain grows on, not fresh', !p.fresh, p);
}

// §6 v2.3.3796: the number counts (the owner: "instead of changing the whole xp number make it count up")
check('6a: the ease-out: 0 at the start, 1 at the end, past half by the middle (quick, then settling)',
  xpEase(0) === 0 && xpEase(1) === 1 && xpEase(0.5) > 0.8 && xpEase(-1) === 0 && xpEase(2) === 1, [xpEase(0.5)]);
check('6b: held at the old value while the white stands alone', xpCountAt(10, 30, 0) === 10 && xpCountAt(10, 30, XP_FILL_DELAY_MS) === 10);
{
  const mid = xpCountAt(10, 30, XP_FILL_DELAY_MS + XP_FILL_MS / 2);
  check('6c: between the two halfway through the climb, on the gold\'s curve', mid > 10 && mid < 30 && Math.abs(mid - (10 + 20 * xpEase(0.5))) < 1e-9, mid);
}
check('6d: the new value once the climb is done, and after', xpCountAt(10, 30, XP_FILL_DELAY_MS + XP_FILL_MS) === 30 && xpCountAt(10, 30, 99999) === 30);
check('6e: down as well as up (a count that falls)', xpCountAt(30, 10, XP_FILL_DELAY_MS + XP_FILL_MS / 2) < 30 && xpCountAt(30, 10, 99999) === 10);
{
  const S = {};
  noteProg3Xp(S, blob({ level: 2, xp: req(2) - 4 }, { level: 1, xp: 0 }, { level: 1, xp: 0 }), blob({ level: 3, xp: 6 }, { level: 1, xp: 0 }, { level: 1, xp: 0 }), req, 1000);
  check('6f: the bar knows the old level\'s XP and its end (the count runs to it before the new level)',
    S._xpBar.fromXp === req(2) - 4 && S._xpBar.fromNeed === req(2) && S._xpBar.up === true, S._xpBar);
}

console.log(`\n${pass + fail} checks, ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
