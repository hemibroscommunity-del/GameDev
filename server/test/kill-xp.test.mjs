/* v2.3.3893: a kill's XP flight (src/game/killXp.js), run in node: it flies
 * the worker's gain the bar took for the killing blow -- at the kill when the
 * gain came first (the worker sends it a tick before the kill), on the gain
 * when the kill came first, never twice for one gain, never a stale one; the
 * kill's drop lines wait behind it; the bar's "+N" is held only while a label
 * is really in the air (a failsafe for one that never mounts); and ?xpfly=0
 * turns it off. */
import { killXpOnKill, killXpOnGain, killXpOn, KILL_XP_FRESH_MS, KILL_XP_WAIT_MS, KILL_XP_LINES_AFTER_MS,
  killXpInbound, KILL_XP_HOLD_MARGIN_MS } from '../../src/game/killXp.js';
import { noteLootDrop } from '../../src/game/dropLines.js';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};
const bar = (at, gain, cat = 'sword') => ({ cat, at, gain, level: 1, xp: 10, need: 280, frac: 0.03 });
const kill = { x: 100, y: 200, monsterId: 'wm-frost-1' };

// §1 the gain came first (the usual order)
{
  const S = { _xpBar: bar(1000, 1.8) };
  const f = killXpOnKill(S, kill, 1025);
  check('1a: the gain a tick before the kill flies at the kill, from where it fell', !!f && f.gain === 1.8 && f.cat === 'sword' && f.x === 100 && f.y === 200, f);
  check('1b: ...and no kill is left waiting', S._killXpWait === null, S._killXpWait);
  check('1c: a second kill on the same gain does not fly it again (it waits for its own)', killXpOnKill(S, kill, 1030) === null && !!S._killXpWait);
}
// §2 the kill came first
{
  const S = { _xpBar: bar(1000, 2.2) };
  check('2a: a gain older than KILL_XP_FRESH_MS is not this kill\'s', killXpOnKill(S, kill, 1000 + KILL_XP_FRESH_MS + 1) === null && !!S._killXpWait);
  const b = bar(1000 + KILL_XP_FRESH_MS + 40, 1.6, 'bow');
  S._xpBar = b;
  const f = killXpOnGain(S, b, b.at);
  check('2b: its gain, when it lands, flies from where it fell', !!f && f.gain === 1.6 && f.cat === 'bow' && f.x === 100, f);
  check('2c: ...once', killXpOnGain(S, b, b.at + 10) === null);
}
{
  const S = {};
  killXpOnKill(S, kill, 5000);
  check('2d: a gain past KILL_XP_WAIT_MS is not the kill\'s', killXpOnGain(S, bar(5000 + KILL_XP_WAIT_MS + 1, 3), 5000 + KILL_XP_WAIT_MS + 1) === null && S._killXpWait === null);
}
// §3 no gain, no flight
{
  const S = {};
  check('3a: no bar, nothing flies at the kill', killXpOnKill(S, kill, 10) === null);
  check('3b: a gain of nothing flies nothing', killXpOnGain(S, bar(20, 0), 20) === null);
  check('3c: a gain with no kill waiting flies nothing', killXpOnGain({}, bar(20, 4), 20) === null);
}
// §4 the drop lines ("Coins x5", game/dropLines.js) start after the XP
{
  const S = { monsters: [{ id: 'wm-frost-3', home: 'frost', x: 100, y: 200, _popupTopOff: -150 }], myId: 'me', _xpBar: bar(1000, 2) };
  killXpOnKill(S, { x: 100, y: 200 }, 1010);
  check('4a: a kill holds its drop lines back KILL_XP_LINES_AFTER_MS', S._dropLinesAt === 1010 + KILL_XP_LINES_AFTER_MS, S._dropLinesAt);
  const g = noteLootDrop(S, { lootId: 'mk-wm-frost-3-1', recipients: ['me'], coins: 5, skull: 'snowman', x: 100, y: 200 }, 'me', 1012);
  check('4b: its pile\'s lines (the same tick) start then', !!g && g.ts === 1010 + KILL_XP_LINES_AFTER_MS, g && g.ts);
  const g2 = noteLootDrop(S, { lootId: 'mk-wm-frost-3-2', recipients: ['me'], coins: 5, skull: 'snowman', x: 100, y: 200 }, 'me', 9000);
  check('4c: a later pile is not held back', !!g2 && g2.ts === 9000, g2 && g2.ts);
}
// §5 the off-ramp
check('5a: on by default', killXpOn('') && killXpOn('?guest=1'));
check('5b: off with ?xpfly=0', !killXpOn('?xpfly=0') && !killXpOn('?guest=1&xpfly=0&x=1'));
check('5c: ?xpfly=01 is not the off-ramp', killXpOn('?xpfly=01'));

// §6 the hold on the bar's "+N" (killXpInbound), on a fake clock
{
  let clock = 0, held = false, lands = 0;
  const timers = new Map(); let nextId = 1;
  const env = { set: (on) => { held = on; }, land: () => { lands++; },
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout: (id) => { timers.delete(id); } };
  const run = (to) => { clock = to; for (const [id, t] of [...timers]) if (t.at <= clock) { timers.delete(id); t.fn(); } };
  const H = killXpInbound(env);
  const FLY = 1040;
  const a = H.begin(FLY);
  check('6a: a flight holds the bar\'s "+N"', held && H.count() === 1);
  H.end(a, true);
  check('6b: its landing lets it go and pulses the bar, once', !held && lands === 1 && H.count() === 0);
  H.end(a, false); H.end(a, true);
  check('6c: a second release of the same token does nothing (no double count, no second pulse)', !held && lands === 1 && H.count() === 0);
  /* a label that never mounts: nothing ever lands it or unmounts it */
  H.begin(FLY);
  run(FLY + KILL_XP_HOLD_MARGIN_MS - 1);
  check('6d: a flight that never mounts still holds until the flight and its margin', held && H.count() === 1);
  run(FLY + KILL_XP_HOLD_MARGIN_MS + 1);
  check('6e: ...then its failsafe lets go: no data-xp-inbound left for good', !held && H.count() === 0 && lands === 0 + 1);
  /* two in the air: the first to land does not let the second's go */
  clock = 0;
  const b = H.begin(FLY), c = H.begin(FLY);
  H.end(b, true);
  check('6f: two in the air, one landed: still held for the other', held && H.count() === 1);
  run(FLY + KILL_XP_HOLD_MARGIN_MS + 1);
  check('6g: ...and the landed one\'s failsafe never fires (its timer cleared); the other\'s does', !held && H.count() === 0);
  H.end(c, true);
  check('6h: a landing after its failsafe changes nothing', !held && H.count() === 0);
  H.begin(FLY); H.begin(FLY);
  H.reset();
  check('6i: reset (no kill label left anywhere) lets everything go', !held && H.count() === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
