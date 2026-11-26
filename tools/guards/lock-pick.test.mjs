/* ═══ v2.3.6820: THE LOCK TAKES THE NEAREST, AND THE STICK CHOOSES BETWEEN CLOSE ONES (card LOCK) ═══
 *
 * What src/game/lockPick.js DOES, by scenes (the player at 0,0, world space,
 * y down; a frame every 16 ms unless a scene says otherwise):
 *   1. inside reach, a rival 5% nearer takes the lock after the dwell
 *      (120 ms on the clock) and not before, at 60, 120 and 4 frames a second;
 *   2. two monsters trading places every frame (or every third) do not flip
 *      the lock faster than the dwell;
 *   3. outside reach a rival 5% or 10% nearer does not take it, one 15%
 *      nearer does, at once;
 *   4. a push toward the farther of two near-ties gives it the lock at once;
 *      a push toward one 30% or 40% farther does not; a push inside the dead
 *      zone's edge (0.1) does not; up is up (y down, world space);
 *   5. the stick at rest never switches;
 *   6. a held lock at 500 px (past the ring, inside the 550 hold) yields to
 *      one arriving inside reach at once (reading 4);
 *   7. the held lock gone (dead, or past 550: the caller hands no `held`)
 *      gives the nearest at once;
 *   8. the push's pick holds while the stick is pushed; the thumb lifted,
 *      the nearest takes the lock back after the dwell (no keep: the census
 *      found a keep held every walk's accidental choice);
 *   4b. a push never chooses one BEHIND it (every tie behind the walk: the
 *      nearest, as at rest);
 *   9. `?locknear=0` (near: false) is today's rule on the same scenes;
 *  10. the reach: the swing's sum to the body centre plus the lunge's 48,
 *      held equal to gameSystems' LUNGE_DASH_FRAMES x LUNGE_DASH_PX_PER_FRAME.
 * THE DODGES (the card's, planted in a copy of the module and each seen
 * red here, every run): the step kept inside reach; the dwell counted in
 * frames; the push compared with a y-flipped (screen-space) bearing; the 25%
 * taken of the farther one's distance; squared distances with an unsquared
 * margin; the push read below the dead zone's edge.  And the other mutants of
 * the module's lines, each killed or listed with why it lives.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LUNGE_DASH_FRAMES, LUNGE_DASH_PX_PER_FRAME, GS_OUTER_RADIUS } from '../../src/data/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOD = join(HERE, '../../src/game/lockPick.js');

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}

/* ── the scenes: each returns [name, ok, detail] rows for a module ── */
const RING = 440, HOLD = 550;

/* one fight on the module: `frames` is [{ t, mons: [{ key, x, y, inReach }], push }];
   the held lock is the caller's (targeting.js): kept while within HOLD */
function drive(L, frames, opt) {
  const o = opt || {};
  const mem = { rival: null, since: 0, last: 0 };
  let lock = o.start != null ? o.start : null;
  const seq = [];
  for (const f of frames) {
    const ms = f.mons;
    const cands = ms.filter((m) => !m.dead && m.x * m.x + m.y * m.y <= RING * RING)
      .map((m) => ({ key: m.key, x: m.x, y: m.y, d2: m.x * m.x + m.y * m.y, inReach: !!m.inReach }))
      .sort((a, b) => a.d2 - b.d2);
    const hm = ms.find((m) => m.key === lock);
    const held = hm && hm.x * hm.x + hm.y * hm.y <= HOLD * HOLD && !hm.dead
      ? { key: hm.key, d2: hm.x * hm.x + hm.y * hm.y, inReach: !!hm.inReach } : null;
    if (!held) lock = null;
    const out = L.lockPick({ cands, held, push: f.push || null, px: 0, py: 0, now: f.t, mem, near: o.near !== false }, {});
    if (out.take) lock = out.take.key;
    seq.push({ t: f.t, lock, rule: out.rule });
  }
  return seq;
}
const lockAt = (seq, t) => { let l = null; for (const s of seq) { if (s.t <= t) l = s.lock; } return l; };
function frames(ms, dt, until, fn) { const out = []; for (let t = 0; t <= until; t += dt) out.push(Object.assign({ t }, fn(t))); return out; }
const flips = (seq) => { const at = []; for (let i = 1; i < seq.length; i++) if (seq[i].lock !== seq[i - 1].lock) at.push(seq[i].t); return at; };

function scenes(L) {
  const R = [];
  const row = (n, ok, d) => R.push([n, !!ok, d]);
  const near = (o) => o;   /* readability */

  /* 1. inside reach, a rival 5% nearer: after the dwell and not before (60, 120, 4 fps) */
  for (const dt of [16, 8, 250]) {
    const s = drive(L, frames(0, dt, 1000, () => ({ mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: 95, inReach: true }] })), { start: 'A' });
    const t1 = (flips(s)[0]);
    row(`1 inside reach, a rival 5% nearer takes the lock after the dwell and not before (a frame every ${dt} ms: at ${t1} ms)`,
      lockAt(s, 1000) === 'B' && t1 >= L.LOCK_PICK.DWELL_MS && t1 < L.LOCK_PICK.DWELL_MS + dt + 1, JSON.stringify(s.slice(0, 12)));
  }
  /* 2. trading places every frame / every third frame: never faster than the dwell */
  for (const every of [1, 3]) {
    const s = drive(L, frames(0, 16, 3000, (t) => {
      const swap = Math.floor(t / 16 / every) % 2 === 1;
      return { mons: [{ key: 'A', x: swap ? 104 : 96, y: 0, inReach: true }, { key: 'B', x: 0, y: swap ? 96 : 104, inReach: true }] };
    }), { start: 'A' });
    const f = flips(s);
    let minGap = Infinity;
    for (let i = 1; i < f.length; i++) minGap = Math.min(minGap, f[i] - f[i - 1]);
    row(`2 two monsters trading places every ${every} frame(s) do not flip the lock faster than the dwell (${f.length} flips in 3 s)`,
      f.length <= Math.floor(3000 / L.LOCK_PICK.DWELL_MS) && (f.length < 2 || minGap >= L.LOCK_PICK.DWELL_MS), f.slice(0, 10).join(','));
  }
  /* 2b. the dwell is one unbroken stint: a rival's earlier stint does not count */
  {
    const s = drive(L, frames(0, 16, 800, (t) => {
      const bNear = t < 100 || t >= 320;
      return { mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: bNear ? 95 : 105, inReach: true }] };
    }), { start: 'A' });
    const t1 = flips(s)[0];
    row(`2 the dwell starts again when the held one is nearest again (B nearer 0-100 ms, then from 320: took at ${t1} ms)`,
      t1 >= 320 + L.LOCK_PICK.DWELL_MS, flips(s).join(','));
  }
  /* 2c. a gap in the asks (nothing in the ring: the caller skips the pick) ends the stint */
  {
    const both = [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: 95, inReach: true }];
    const fr = [{ t: 0, mons: both }, { t: 16, mons: both }, { t: 2000, mons: both }, { t: 2016, mons: both }, { t: 2140, mons: both }];
    const s = drive(L, fr, { start: 'A' });
    row('2 a rival\'s wait does not survive a gap of two seconds in the asks (it waits again when it comes back)', lockAt(s, 2016) === 'A' && lockAt(s, 2140) === 'B', JSON.stringify(s));
  }
  /* 3. outside reach: 5% and 10% nearer keep it; 15% nearer takes it at once */
  for (const [k, want] of [[0.95, 'A'], [0.90, 'A'], [0.85, 'B']]) {
    const s = drive(L, frames(0, 16, 1000, () => ({ mons: [{ key: 'A', x: 300, y: 0 }, { key: 'B', x: 0, y: 300 * k }] })), { start: 'A' });
    row(`3 outside reach, a rival ${Math.round((1 - k) * 100)}% nearer ${want === 'A' ? 'does not take the lock' : 'takes it at once'}`,
      lockAt(s, 1000) === want && (want === 'A' || lockAt(s, 0) === 'B'), JSON.stringify(s.slice(0, 3)));
  }
  /* 4. the push */
  {
    const m = [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: -110, inReach: true }];
    const s = drive(L, [{ t: 0, mons: m, push: { x: 0, y: -1 } }], { start: 'A' });
    row('4 a push toward the farther of two near-ties (10% farther, up) gives it the lock at once', s[0].lock === 'B' && s[0].rule === 'push', JSON.stringify(s));
    const s2 = drive(L, [{ t: 0, mons: m, push: { x: 0, y: 1 } }], { start: 'A' });
    row('4 a push the other way (down) keeps the nearer: up is up (y down, world space)', s2[0].lock === 'A', JSON.stringify(s2));
    const sd = drive(L, frames(0, 16, 500, () => ({ mons: m, push: { x: 0, y: -0.1 } })), { start: 'A' });
    row('4 a push inside the dead zone\'s edge (0.1 of the travel) chooses nothing', lockAt(sd, 500) === 'A', JSON.stringify(sd.slice(0, 3)));
    for (const far of [1.3, 1.4]) {
      const s3 = drive(L, frames(0, 16, 500, () => ({ mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'C', x: 0, y: -100 * far, inReach: true }], push: { x: 0, y: -1 } })), { start: 'A' });
      row(`4 a push toward one ${Math.round((far - 1) * 100)}% farther does not take it`, lockAt(s3, 500) === 'A', JSON.stringify(s3.slice(0, 3)));
    }
    const s7 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: 110, inReach: true }, { key: 'C', x: 0, y: -200 }], push: { x: 0, y: -1 } }], { start: 'A' });
    row('4 a push toward one past the tie (200) while two others tie picks between the two, never it', s7[0].lock === 'A', JSON.stringify(s7));
    const s8 = drive(L, frames(0, 16, 400, () => ({ mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: -70, y: 0, inReach: true }], push: { x: -1, y: 0 } })), { start: 'A' });
    row('4 with the stick pushed, a plainly nearer rival (30% nearer, no tie) still waits the dwell', lockAt(s8, 0) === 'A' && lockAt(s8, 400) === 'B' && flips(s8)[0] >= L.LOCK_PICK.DWELL_MS, flips(s8).join(','));
    const sb1 = drive(L, frames(0, 16, 500, () => ({ mons: [{ key: 'A', x: 100, y: 10, inReach: true }, { key: 'B', x: 70, y: -80, inReach: true }], push: { x: -1, y: 0 } })), { start: 'A' });
    const sb2 = drive(L, frames(0, 16, 500, () => ({ mons: [{ key: 'A', x: 100, y: 10, inReach: true }, { key: 'B', x: 70, y: -80, inReach: true }], push: { x: -1, y: 0 } })));
    row('4b a push away from every near-tie (walking away from the pack) chooses nothing: the nearest keeps it, or is taken', lockAt(sb1, 500) === 'A' && lockAt(sb2, 500) === 'A', JSON.stringify([sb1.slice(0, 2), sb2.slice(0, 2)]));
    const sb3 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: -10, y: -110, inReach: true }], push: { x: -1, y: -0.2 } }], { start: 'A' });
    row('4b ...and a push past 90 degrees of the nearer still picks the one in front of it', sb3[0].lock === 'B', JSON.stringify(sb3));
    const sf = drive(L, [{ t: 0, mons: [{ key: 'A', x: 90, y: -40, inReach: true }, { key: 'B', x: 30, y: -105, inReach: true }], push: { x: 0, y: -1 } }], { start: 'A' });
    row('4 of two ties both in front of the push, the one nearer its line takes the lock', sf[0].lock === 'B', JSON.stringify(sf));
    const s4 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 300, y: 0 }, { key: 'B', x: -320, y: 0 }], push: { x: -1, y: 0 } }], { start: 'A' });
    row('4 the push chooses outside reach too (inside the ring)', s4[0].lock === 'B', JSON.stringify(s4));
    const s5 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 400, y: 0 }, { key: 'B', x: -460, y: 0 }], push: { x: -1, y: 0 } }], { start: 'A' });
    row('4 and never one outside the ring (460 > 440)', s5[0].lock === 'A', JSON.stringify(s5));
    const s6 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: -110, inReach: true }], push: { x: 0, y: -1 } }]);
    row('4 with nothing held, the push picks among the ties', s6[0].lock === 'B', JSON.stringify(s6));
  }
  /* 5. the stick at rest */
  {
    const s = drive(L, frames(0, 16, 2000, () => ({ mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: -105, inReach: true }], push: { x: 0, y: 0 } })), { start: 'A' });
    row('5 the stick at rest never switches (2 s)', flips(s).length === 0 && lockAt(s, 2000) === 'A', flips(s).join(','));
  }
  /* 6. a held lock at 500 yields to one arriving inside reach, at once */
  {
    const s = drive(L, [{ t: 0, mons: [{ key: 'A', x: 500, y: 0 }] }, { t: 16, mons: [{ key: 'A', x: 500, y: 0 }, { key: 'B', x: 0, y: 120, inReach: true }] }], { start: 'A' });
    /* and the near rule's own case: a held lock INSIDE the ring but outside reach (200) yields to one inside reach only 5% nearer (190), where the step would keep it */
    const sb = drive(L, [{ t: 0, mons: [{ key: 'A', x: 200, y: 0 }, { key: 'B', x: 0, y: 190, inReach: true }] }], { start: 'A' });
    row('6 a held lock outside reach yields at once to one inside reach only 5% nearer (no step, no dwell)', sb[0].lock === 'B', JSON.stringify(sb));
    row('6 a held lock at 500 px yields at once to one arriving inside reach', s[0].lock === 'A' && s[1].lock === 'B', JSON.stringify(s));
  }
  /* 7. the held lock gone */
  {
    const s = drive(L, [{ t: 0, mons: [{ key: 'A', x: 600, y: 0 }, { key: 'B', x: 0, y: 300 }, { key: 'C', x: 0, y: -350 }] }], { start: 'A' });
    const s2 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 90, y: 0, dead: true, inReach: true }, { key: 'B', x: 0, y: 130, inReach: true }] }], { start: 'A' });
    row('7 the held lock past 550, or dead, gives the nearest at once', s[0].lock === 'B' && s2[0].lock === 'B', JSON.stringify([s, s2]));
  }
  /* 8. the push's pick stays when the thumb lifts, while it is a near-tie */
  {
    const fr = frames(0, 16, 2000, (t) => ({
      mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: -110, inReach: true }],
      push: t < 50 ? { x: 0, y: -1 } : null }));
    const s = drive(L, fr, { start: 'A' });
    row('8 the push\'s pick holds while pushed, and the thumb lifted the nearest takes it back after the dwell (no keep: the census)',
      lockAt(s, 0) === 'B' && lockAt(s, 48) === 'B' && lockAt(s, 2000) === 'A' && flips(s).length === 1 && flips(s)[0] >= 64 + L.LOCK_PICK.DWELL_MS && flips(s)[0] < 64 + L.LOCK_PICK.DWELL_MS + 17, flips(s).join(','));
  }
  /* 9. ?locknear=0: today's rule on the same scenes */
  {
    const off = { near: false };
    const s1 = drive(L, frames(0, 16, 1000, () => ({ mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: 95, inReach: true }] })), Object.assign({ start: 'A' }, off));
    const s3 = drive(L, frames(0, 16, 300, () => ({ mons: [{ key: 'A', x: 300, y: 0 }, { key: 'B', x: 0, y: 255 }] })), Object.assign({ start: 'A' }, off));
    const s4 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 100, y: 0, inReach: true }, { key: 'B', x: 0, y: -110, inReach: true }], push: { x: 0, y: -1 } }], Object.assign({ start: 'A' }, off));
    const s6 = drive(L, [{ t: 0, mons: [{ key: 'A', x: 470, y: 0 }] }, { t: 16, mons: [{ key: 'A', x: 470, y: 0 }, { key: 'B', x: 0, y: 125, inReach: true }, { key: 'C', x: 0, y: -430 }] }], Object.assign({ start: 'A' }, off));
    const s6n = drive(L, [{ t: 0, mons: [{ key: 'A', x: 470, y: 0 }] }, { t: 16, mons: [{ key: 'A', x: 470, y: 0 }, { key: 'C', x: 0, y: -430 }] }], Object.assign({ start: 'A' }));
    const s7 = drive(L, [{ t: 0, mons: [{ key: 'B', x: 0, y: 300 }] }], off);
    row('9 ?locknear=0: a rival 5% nearer inside reach never takes it', lockAt(s1, 1000) === 'A', JSON.stringify(s1.slice(-2)));
    row('9 ?locknear=0: 15% nearer takes it at once', s3[0].lock === 'B');
    row('9 ?locknear=0: the push chooses nothing', s4[0].lock === 'A');
    row('9 ?locknear=0: a held lock at 470 yields to one inside reach (125: by the step, 12% nearer)', s6[1].lock === 'B', JSON.stringify(s6));
    row('6/9 a held lock at 470 keeps against one only 9% nearer outside reach (430), both rules', s6n[1].lock === 'A', JSON.stringify(s6n));
    row('9 ?locknear=0: nothing held, the nearest at once', s7[0].lock === 'B');
  }
  /* 10. the reach */
  {
    const sword = GS_OUTER_RADIUS;
    row('10 the lunge is gameSystems\' dash (8 x 6 = 48)', L.LOCK_PICK.LUNGE_PX === LUNGE_DASH_FRAMES * LUNGE_DASH_PX_PER_FRAME, L.LOCK_PICK.LUNGE_PX);
    row('10 reach: a fodder\'s body 23 up, 24 round: feet at 167 below is in, 169 out (to the body centre, 72 + 24 + 48)',
      L.reachHas(0, 0, 0, 167, 23, sword, 24) && !L.reachHas(0, 0, 0, 169, 23, sword, 24));
    row('10 reach: measured to the body centre, not the feet (a monster above: feet 190 up, body 213 up, is out)',
      !L.reachHas(0, 0, 0, -190, 23, sword, 24) && L.reachHas(0, 0, 0, -120, 23, sword, 24));
  }
  return R;
}

/* ── the real module ── */
const real = await import(pathToFileURL(MOD).href);
for (const [n, ok, d] of scenes(real)) check(n, ok, d);
{
  const T = real.LOCK_PICK;
  check('the numbers live in ONE frozen table', Object.isFrozen(T) && T.DWELL_MS === 120 && T.FAR_STEP === 0.88 && T.TIE === 1.25 && T.PUSH_MIN === 0.2 && T.PUSH_FRONT === 0 && T.STINT_GAP_MS === 1000, JSON.stringify(T));
}

/* ── the dodges and the mutants, planted in a copy ── */
const SRC = readFileSync(MOD, 'utf8');
const DODGES = [
  ['dodge: the step kept inside reach', 'if (best.inReach) {', 'if (best.inReach && bestD <= Math.sqrt(held.d2) * LOCK_PICK.FAR_STEP) {'],
  ['dodge: the dwell counted in frames', ['mem.since = c.now;', 'c.now - mem.since >= LOCK_PICK.DWELL_MS'], ['mem.since = 0;', '++mem.since >= 8']],
  ['dodge: the push against a y-flipped (screen-space) bearing', 'const bx = q.x - c.px, by = q.y - c.py;', 'const bx = q.x - c.px, by = c.py - q.y;'],
  ['dodge: the 25% taken of the farther one\'s distance', 'const tieD = bestD * LOCK_PICK.TIE;', 'const tieD = bestD / (2 - LOCK_PICK.TIE);'],
  ['dodge: squared distances with an unsquared margin', 'if (bestD <= Math.sqrt(held.d2) * LOCK_PICK.FAR_STEP)', 'if (best.d2 <= held.d2 * LOCK_PICK.FAR_STEP)'],
  ['dodge: the push read below the dead zone\'s edge', 'if (pl > LOCK_PICK.PUSH_MIN &&', 'if (pl > 0 &&'],
];
const MUTANTS = [
  ['no dwell: a rival inside reach takes at once', 'if (!same(mem.rival, best.key)) {', 'if (false) {'],
  ['the dwell never resets when the held one is nearest again', "if (same(held.key, best.key)) { mem.rival = null; out.rule = 'nearest'; return out; }", "if (same(held.key, best.key)) { out.rule = 'nearest'; return out; }"],
  ['the dwell\'s >= as >', 'c.now - mem.since >= LOCK_PICK.DWELL_MS', 'c.now - mem.since > LOCK_PICK.DWELL_MS + 16'],
  ['a far held lock waits the dwell too', 'if (!held.inReach) { mem.rival = null; out.take = best;', 'if (false) { mem.rival = null; out.take = best;'],
  ['the push chooses behind it', 'if (cos > LOCK_PICK.PUSH_FRONT && cos > pickCos)', 'if (cos > pickCos)'],
  ['the push needs half a turn in front', 'if (cos > LOCK_PICK.PUSH_FRONT && cos > pickCos)', 'if (cos > 0.5 && cos > pickCos)'],
  ['the push picks the farthest-from-push', 'cos > LOCK_PICK.PUSH_FRONT && cos > pickCos) { pickCos = cos;', 'cos > LOCK_PICK.PUSH_FRONT && (cos < pickCos || pickCos === -2)) { pickCos = cos;'],
  ['the band never ends', 'if (Math.sqrt(q.d2) > tieD) break;', 'if (false) break;'],
  ['the push needs no near-tie', '&& cands.length > 1 && Math.sqrt(cands[1].d2) <= tieD', ''],
  ['near: false ignored', 'if (c.near === false) {', 'if (false) {'],
  ['today\'s rule without its step', 'best.d2 > held.d2 * LOCK_PICK.FAR_STEP * LOCK_PICK.FAR_STEP', 'false'],
  ['the outside step at once dropped', "if (bestD <= Math.sqrt(held.d2) * LOCK_PICK.FAR_STEP) { out.take = best; out.rule = 'step'; return out; }", ''],
  ['a gap does not end the stint', 'if (mem.rival != null && !(c.now - mem.last <= LOCK_PICK.STINT_GAP_MS)) mem.rival = null;', ''],
  ['the gap is the dwell (a slow phone never switches)', 'c.now - mem.last <= LOCK_PICK.STINT_GAP_MS', 'c.now - mem.last <= LOCK_PICK.DWELL_MS'],
  ['nothing held takes nothing', "if (!held) { mem.rival = null; out.take = best;", "if (!held) { mem.rival = null; out.take = null;"],
  ['the reach without the lunge', 'const r = swordPx + hitR + LOCK_PICK.LUNGE_PX;', 'const r = swordPx + hitR;'],
  ['the reach to the feet', 'dy = (fy - bodyUp) - py;', 'dy = fy - py;'],
];
const dir = mkdtempSync(join(tmpdir(), 'lockpick-'));
try {
  let n = 0;
  async function plant(name, from, to) {
    const froms = Array.isArray(from) ? from : [from], tos = Array.isArray(to) ? to : [to];
    let src = SRC;
    for (let i = 0; i < froms.length; i++) {
      if (src.indexOf(froms[i]) < 0) return { stale: true };
      src = src.replace(froms[i], tos[i]);
    }
    const f = join(dir, `m${n++}.mjs`);
    writeFileSync(f, src);
    const L = await import(pathToFileURL(f).href);
    const red = scenes(L).filter((r) => !r[1]).map((r) => r[0]);
    return { red };
  }
  for (const [name, from, to] of DODGES) {
    const r = await plant(name, from, to);
    check(`${name}: planted, seen red${r.red ? ' (' + r.red.length + ': ' + (r.red[0] || '') + ')' : ''}`, !r.stale && r.red.length > 0, r.stale ? 'the line to plant it on is gone: update the dodge' : 'every scene still passes');
  }
  for (const [name, from, to] of MUTANTS) {
    const r = await plant(name, from, to);
    check(`mutant killed: ${name}${r.red ? ' (' + r.red.length + ')' : ''}`, !r.stale && r.red.length > 0, r.stale ? 'the line is gone: update the mutant' : 'every scene still passes');
  }
} finally { rmSync(dir, { recursive: true, force: true }); }

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
