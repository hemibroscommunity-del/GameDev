/* ═══ THE DOUBLE JUMP: A FLIP, TIMED FOR DISTANCE (v2.3.3682) ═══
 *
 * The owner, 2026-10-27: "You press jump then press jump again to do a
 * little flip for a little more of a bounce.  You have to time it right to
 * get maximum horizontal distance and the jump effect will be greater if
 * you're sprinting into the jump.  See if you can use the roll or part of
 * the roll for the double jump effect" (game/jump.js startFlip,
 * game/jumpActions.js triggerFlip).
 *
 * Two phones in the world's BroTown against a real worker: the Flipper
 * (390 x 844), walking south with the jump drawn out to ?jumpms=3000 (this
 * box draws a few frames a second), and a Watcher beside him.  The jump
 * button pressed as a thumb does (touchstart on [data-jump]):
 *   1. a plain jump: how far it carries him and how long he is in the air;
 *   2. a second press near the sweet spot (70-85% of the jump: a timer here
 *      can be late by a slow frame, so the press is made again until it lands
 *      there, up to five times) flips: in the air
 *      longer, NO "Perfect!" over him (v2.3.3732: the owner, "You can remove
 *      the 'perfect!' after a well timed jump"), and it carries him much further (more than
 *      1.5x the plain jump); drawn with the ROLL's somersault -- the dodge
 *      pose, its tumble frames (2-6), lifted;
 *   3. a third press in the air does nothing ("flipped");
 *   4. a press too soon after take-off is refused ("early"), and a later one
 *      still flips;
 *   5. a flip right after take-off (20%) carries him less far than the sweet
 *      spot's, and is no "Perfect!";
 *   6. sprinting into the jump, the sweet flip is bigger: more boost, higher;
 *   7. the Watcher sees the flip: their copy of him is drawn in the roll's
 *      somersault, lifted; and after it the two agree where he is (the
 *      worker took the faster steps);
 *   3b. v2.3.3712: a TAP ON THE RIGHT STICK at the sweet spot does not flip
 *      and is no jump: the double jump is the JUMP button's alone (the owner:
 *      "the contextual jump button gives the jumps only to the jump button");
 *   8. no page errors.
 * Picture: tools/qa/mp/out/doublejump-flip.png (mid-flip).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FLIP_FRAMES } from '../../../src/game/jump.js';

const PHONE = { width: 390, height: 844 };
const AIR_MS = 3000;   /* ?jumpms= (mp-jump's: a few frames a second here) */

/* one jump from the button, pressed again at each of `flips` (phases of the
   first jump), sampled until it lands; returns what the game recorded.
   v2.3.3712: a `{ stick: phase }` taps the right stick there instead */
const jumpRun = (P, flips) => P.page.evaluate(async ({ flips }) => {
  const S = window._gameState.current;
  const btn = document.querySelector('[data-jump]');
  if (!btn) return { ok: false, why: 'no button' };
  const tapStick = () => {
    const z = document.querySelector('[data-joyzone="R"]');
    const r = z.getBoundingClientRect();
    const t = new Touch({ identifier: 72, target: z, clientX: r.left + r.width * 0.6, clientY: r.top + r.height * 0.3 });
    z.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], changedTouches: [t] }));
    z.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [t] }));
  };
  const press = () => {
    const r = btn.getBoundingClientRect();
    const t = new Touch({ identifier: 71, target: btn, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    btn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], changedTouches: [t] }));
    btn.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [t] }));
  };
  S._lastJumpRun = null;
  const f0 = S._flipCount || 0;
  const pops0 = (S.dmgNumbers || []).length;
  press();
  const j = S._jump;
  if (!j) return { ok: false, why: S._jumpWhy };
  const t0 = j.t0, dur = j.dur;
  const why = [];
  const at = [];   /* the phase each press really landed at (a timer here can be late by a slow frame) */
  const poses = [];
  let flipSeenAt = 0;
  const sample = () => {
    const fx = window.__btJumpFx ? window.__btJumpFx().self : null;
    /* a frame DRAWN as the flip (the probe is the last frame's) */
    if (fx && fx.flip) { poses.push({ pose: fx.pose, frame: fx.frame, lift: fx.lift }); if (!flipSeenAt) flipSeenAt = Date.now(); }
  };
  for (const f of flips) {
    const ph = typeof f === 'number' ? f : f.stick;
    for (;;) {
      const wait = t0 + ph * dur - Date.now();
      if (wait <= 0) break;
      sample();
      await new Promise((r) => setTimeout(r, Math.min(60, wait)));
    }
    at.push(+((Date.now() - t0) / dur).toFixed(3));
    if (typeof f === 'number') { press(); why.push(S._jumpWhy || 'ok'); continue; }
    const c0 = S._jumpCount || 0;
    tapStick();
    why.push('stick:' + ((S._jumpCount || 0) - c0) + ':' + (S._tapAtkWhy || '-'));
  }
  const perfect = (S.dmgNumbers || []).slice(pops0).some((p) => p && p.text === 'Perfect!');
  const lastFlip = S._lastFlip ? { ...S._lastFlip } : null;
  const t1 = Date.now();
  while (S._jump && Date.now() - t1 < 20000) {
    sample();
    await new Promise((r) => setTimeout(r, 60));
  }
  return { ok: true, why, at, poses, perfect, flips: (S._flipCount || 0) - f0, lastFlip, run: S._lastJumpRun ? { ...S._lastJumpRun } : null, t0, dur };
}, { flips });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Flipper', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: 'jumpms=' + AIR_MS });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: 'jumpms=' + AIR_MS });
  A.page.on('pageerror', (e) => errors.push('A: ' + String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  B.page.on('pageerror', (e) => errors.push('B: ' + String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    const inW = async (P) => H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    const ok = (await inW(A)) && (await inW(B));
    rec.ok('both in the world (guard)', !!ok, ok);
    if (!ok) return;
    const idA = await H.readState(A, (S) => S.myId);
    const idB = await H.readState(B, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', idA, { heal: true, god: true, godMinutes: 30 });
    for (const P of [A, B]) await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* the Watcher only watches: the harness's keep-alive key keeps the
       2-minute idle logout off it (mp-wheeldoors' way) -- logged out, it
       hears nothing more of the Flipper */
    (async () => {
      while (!stopAlive && !B.page.isClosed()) {
        await B.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await B.page.waitForTimeout(500).catch(() => {});
      }
    })();

    /* the Watcher stands a little east of the start, facing it */
    const start = await H.readState(A, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    await H.hopTo(B, start.x + 180, start.y + 60, { tries: 40 });

    /* each run: back to the start, walking south (held), then the jump --
       made again (up to 5 times) when a press landed more than 0.08 of the
       jump from its aim: this box draws a few frames a second and a page's
       timer waits for the frame in hand (the attempts are reported) */
    const attempts = {};
    const runFrom = async (flips, opts = {}) => {
      let r = null;
      for (let k = 0; k < 5; k++) {
        r = await runOnce(flips, opts);
        attempts[opts.tag || flips.join('+') || 'plain'] = k + 1;
        /* `accept`: [lo, hi] the one press must land in (a timer here is
           late, never early, so the aim sits low in it) */
        if (!r.ok || !opts.accept || (r.at[0] >= opts.accept[0] && r.at[0] <= opts.accept[1] && (!opts.sprint || (r.lastFlip && r.lastFlip.sprint)))) break;
      }
      return r;
    };
    const runOnce = async (flips, opts = {}) => {
      await A.page.keyboard.up('s').catch(() => {});
      await A.page.keyboard.up('Shift').catch(() => {});
      await H.hopTo(A, start.x, start.y, { tries: 40 });
      /* a full bar of stamina for a sprint (each try burns ~70 of it) */
      if (opts.sprint) await H.devOp(wsPort, 'vitals', idA, { heal: true });
      await A.page.waitForTimeout(800);
      if (opts.sprint) await A.page.keyboard.down('Shift');
      await A.page.keyboard.down('s');
      await A.page.waitForTimeout(1200);
      const pr = jumpRun(A, flips);
      if (opts.during) await opts.during().catch(() => {});
      const r = await pr;
      await A.page.keyboard.up('s');
      if (opts.sprint) await A.page.keyboard.up('Shift');
      return r;
    };

    /* BT_DJ_ONLY=watch: the plain jump and the watched flip only (to iterate) */
    const ONLY = process.env.BT_DJ_ONLY || '';
    /* 1. a plain jump */
    const r0 = await runFrom([]);
    rec.ok(`1. a plain jump carries him ${r0.run && Math.round(r0.run.dist)} px in ${r0.run && r0.run.airMs} ms of air (no flip)`,
      r0.ok && !!r0.run && r0.run.dist > 5 && !r0.run.flip && r0.flips === 0, r0);

    const watchRun = () => B.page.evaluate(async (id) => {
      const out = { saw: false, flips: [], jumps: [], pos: [], until: Date.now() + 45000 };
      let lastJ = null;
      while (Date.now() < out.until) {
        const S = window._gameState.current, o = S.others && S.others[id];
        const fx = window.__btJumpFx ? window.__btJumpFx() : null;
        const now = !!(o && o._jump && o._jump.flip);
        if (o && o._jump && o._jump !== lastJ) { lastJ = o._jump; out.jumps.push({ flip: !!o._jump.flip, dur: Math.round(o._jump.dur), at: Date.now() }); }
        if (o && out.pos.length < 400) out.pos.push([Date.now() % 100000, Math.round(o.x), Math.round(o.y)]);
        if (out.saw && !now && out.flips.length) break;   /* seen, and over */
        if (now) out.saw = true;
        if (fx && fx.peerFlips) for (const f of fx.peerFlips) if (f.id === id) out.flips.push(f);
        await new Promise((r) => setTimeout(r, 60));
      }
      return out;
    }, idA);
    if (ONLY !== 'watch') {
      /* 2. the sweet spot */
      const r1 = await runFrom([0.72], { tag: 'sweet', accept: [0.68, 0.86] });
      const dodgePoses = r1.poses.filter((p) => p.pose === 'dodge');
      const tumble = dodgePoses.filter((p) => FLIP_FRAMES.includes(p.frame) && p.lift > 0);
      rec.ok(`2. a second press at the sweet spot (${r1.at.join(',')} of the jump, attempt ${attempts.sweet}) flips (${r1.why.join(',')}): graded ${r1.lastFlip && r1.lastFlip.grade.toFixed(2)}, no "Perfect!" (${r1.perfect ? 'said' : 'none'}), in the air ${r1.run && r1.run.airMs} ms (plain ${r0.run && r0.run.airMs})`,
        r1.ok && r1.why[0] === 'ok' && r1.flips === 1 && !!r1.lastFlip && r1.lastFlip.grade >= 0.8 && !r1.perfect && !!r1.run && r1.run.flip && r1.run.airMs > 1.3 * r0.run.airMs, { ...r1, attempts: attempts.sweet });
      rec.ok(`2. ...and carries him ${r1.run && Math.round(r1.run.dist)} px, ${r1.run && r0.run ? (r1.run.dist / r0.run.dist).toFixed(2) : '?'}x the plain jump's`,
        !!r1.run && !!r0.run && r1.run.dist > 1.5 * r0.run.dist, { r1: r1.run, r0: r0.run });
      rec.ok(`2. ...drawn with the roll's somersault: ${dodgePoses.length} of ${r1.poses.length} flip samples in the dodge pose, ${tumble.length} on its tumble frames (${[...new Set(tumble.map((p) => p.frame))].join(',')}), lifted`,
        r1.poses.length >= 2 && dodgePoses.length === r1.poses.length && tumble.length >= 1, r1.poses.slice(0, 12));

      /* 3. a third press: nothing */
      const r3 = await runFrom([0.6, 0.75]);
      rec.ok(`3. a third press in the air does nothing (${r3.why.join(', ')})`, r3.ok && r3.why[0] === 'ok' && r3.why[1] === 'flip-flipped' && r3.flips === 1, r3.why);

      /* 3b. v2.3.3712: the right stick's tap at the sweet spot: no flip */
      const r3b = await runFrom([{ stick: 0.72 }], { tag: 'stick' });
      rec.ok(`3b. a tap on the right stick at the sweet spot (${r3b.at.join(',')}) does not flip and is no jump: the double jump is the button's (${r3b.why.join(', ')})`,
        r3b.ok && r3b.flips === 0 && /^stick:0:/.test(r3b.why[0] || '') && !!r3b.run && !r3b.run.flip, { why: r3b.why, at: r3b.at, flips: r3b.flips, run: r3b.run });

      /* 4. too soon, then in time */
      const r4 = await runFrom([0, 0.5]);   /* the second press straight after the first (a timer here can be late by a whole slow frame) */
      rec.ok(`4. a press too soon after take-off is refused, and a later one still flips (${r4.why.join(', ')})`, r4.ok && r4.why[0] === 'flip-early' && r4.why[1] === 'ok' && r4.flips === 1, r4.why);

      /* 5. a flip right after take-off */
      const r5 = await runFrom([0.18], { tag: 'early', accept: [0.15, 0.34] });
      rec.ok(`5. a flip right after take-off (graded ${r5.lastFlip && r5.lastFlip.grade.toFixed(2)}) carries him ${r5.run && Math.round(r5.run.dist)} px, less than the sweet spot's ${r1.run && Math.round(r1.run.dist)}, and is no "Perfect!"`,
        r5.ok && r5.flips === 1 && !!r5.run && !!r1.run && r5.run.dist < r1.run.dist * 0.85 && !r5.perfect && r5.lastFlip.grade < 0.35, { r5: r5.run, grade: r5.lastFlip, r1: r1.run, attempts: attempts.early });

      /* 6. sprinting into it */
      const r6 = await runFrom([0.72], { sprint: true, tag: 'sprint', accept: [0.68, 0.86] });
      /* the rise above where each flip started (the two presses land at
         slightly different heights, so the tops alone do not compare) */
      const rise = (f) => (f ? f.peak - f.h0 : 0);
      rec.ok(`6. sprinting into the jump, the sweet flip is bigger: boost ${r6.lastFlip && r6.lastFlip.boost.toFixed(2)} (walking ${r1.lastFlip && r1.lastFlip.boost.toFixed(2)}), rising ${Math.round(rise(r6.lastFlip))} px over where it began (walking ${Math.round(rise(r1.lastFlip))})`,
        r6.ok && !!r6.lastFlip && r6.lastFlip.sprint === true && !!r1.lastFlip && r6.lastFlip.boost > r1.lastFlip.boost * 1.15 && rise(r6.lastFlip) > rise(r1.lastFlip) * 1.3, { r6: r6.lastFlip, r1: r1.lastFlip, attempts: attempts.sprint });

    }
    /* 7. the Watcher, on a run of its own (and the picture, mid-flip) */
    const watch = watchRun();
    const rW = await runFrom([0.6], { tag: 'watched', during: async () => {
      /* the picture the moment a frame is drawn as the flip, round him */
      for (let i = 0; i < 120; i++) {
        /* the tuck going round (frames 3-4), the flip's most telling frames */
        const fx = await A.page.evaluate(() => { const f = window.__btJumpFx ? window.__btJumpFx().self : null; return f && f.flip && (f.frame === 3 || f.frame === 4) ? f : null; }).catch(() => null);
        if (fx) {
          /* a screenshot here lands seconds after it is asked for, the flip
             long over: the page's clock is held still for it (the jump reads
             Date.now), and let go after */
          const c = await A.page.evaluate(() => {
            const S = window._gameState.current, r = document.querySelector('canvas').getBoundingClientRect();
            const t = Date.now();
            window.__qaRealNow = Date.now;
            Date.now = () => t;
            return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
          });
          await A.page.waitForTimeout(1200);
          await A.page.screenshot({ path: join(OUT, 'doublejump-flip.png'), clip: { x: Math.max(0, c.x - 140), y: Math.max(0, c.y - 220), width: 280, height: 320 } }).catch(() => {});
          await A.page.evaluate(() => { if (window.__qaRealNow) Date.now = window.__qaRealNow; });
          break;
        }
        await A.page.waitForTimeout(60);
      }
    } });
    const seen = await watch;
    const peerTumble = seen.flips.filter((f) => FLIP_FRAMES.includes(f.frame) && f.lift > 0);
    rec.ok(`7. the Watcher sees the flip: their copy of him flips (${seen.saw}), drawn in the roll's somersault (${peerTumble.length} of ${seen.flips.length} samples on its tumble frames, lifted)`,
      seen.saw && peerTumble.length >= 1, { saw: seen.saw, flips: seen.flips.slice(0, 10), jumps: seen.jumps, run: rW && { why: rW.why, at: rW.at, flips: rW.flips }, pos: seen.pos.filter((_, i) => i % 8 === 0).slice(0, 40) });
    await A.page.waitForTimeout(2500);
    const where = {
      a: await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y })),
      b: await B.page.evaluate((id) => { const S = window._gameState.current, o = S.others && S.others[id]; return o ? { x: o.x, y: o.y } : null; }, idA),
    };
    const gap = where.b ? Math.hypot(where.a.x - where.b.x, where.a.y - where.b.y) : null;
    rec.ok(`7. ...and after it the two agree where he is (${gap == null ? 'not seen' : Math.round(gap) + ' px apart'}): the worker took the flip's faster steps`, gap != null && gap < 24, where);
    rec.ok('8. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
