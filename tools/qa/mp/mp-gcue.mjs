/* ═══ THE CUE GESTURE, AS THE OWNER DESCRIBED IT (v2.3.2760) ═══
 *
 * Owner: "... the character is supposed to stop animating until you perform
 * the correct gesture on the right joystick ... before the player performs the
 * gesture the starting spot of the cue should be static but flash.  An effect
 * should show you which way the cue should move ... As you perform the gesture
 * the character's frames should animate at the speed you perform the gesture,
 * but require about 3 seconds of performing the gesture at a quick pace ...
 * the cue was a mini sprite of the tool being used."
 *
 * This file used to pin the OPPOSITE of the first half of that (v2.3.2384: a
 * demo loop that animated the character with no thumb down).  Every assertion
 * that matters is still a DIFFERENCE BETWEEN FRAMES, sampled with the page
 * untouched -- a single-frame check could not tell a frozen cue from a
 * flashing one, or a held pose from a looping one:
 *
 *   IDLE  the character's pose does NOT move; the mini tool does NOT move;
 *         the tool's opacity DOES (the flash); the comet DOES (the direction);
 *         the bar over the head is full and flashing.
 *   LIVE  real PointerEvents through the real listeners on window: the phase
 *         runs FORWARD with the strokes, the tool rides it, a resting thumb
 *         holds the pose, a second finger lifting cannot end the stroke, and
 *         the meter wants ~6s of quick work -- never under the 4.8s floor
 *         (v2.3.2761: doubled from 3s / 2.4s at the owner's word).
 *
 * The fixture is a cook on a campfire at the player's own feet in town
 * (mp-cooktap's route): no zone travel, no tools, no monsters.  The per-skill
 * geometry (four tracks, four sprites) is pure arithmetic and is checked
 * directly against gestureCueFace at the end.
 */
import * as H from './harness.mjs';
import {
  gestureCueFace, gestureIdle, gesturePose01, GESTURE_STROKE, CUE_TOOL_SIZE,
  GESTURE_TARGET_MS, GESTURE_FLOOR_MS, GESTURE_QUICK_CYCLE_MS, gestureTargetCycles, GESTURE_CUE_SPRITES,
} from '../../../src/game/gesturePose.js';

const PHONE = { width: 390, height: 844 };

/* One reading of everything the harvest face paints, and the pose. */
const face = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const ex = S._extraction;
  const base = document.querySelector('.bt-rjoy-base');
  const strip = base && Array.from(base.querySelectorAll('div'))
    .find((d) => /gesture/.test(d.style.backgroundImage || ''));
  const hint = base && base.querySelector('svg[viewBox="0 0 100 100"]');
  const tool = hint && hint.querySelector('[data-cue="tool"]');
  const glow = hint && hint.querySelector('[data-cue="glow"]');
  const sprite = hint && hint.querySelector('[data-cue="sprite"]');
  const img = sprite && sprite.firstChild;
  const comet = hint && hint.querySelector('[data-cue="comet"]');
  const head = comet && comet.firstChild;
  const arrows = hint && hint.querySelector('[data-cue="arrows"]');
  const trk = hint && hint.querySelector('[data-cue="track"]');
  const bar = window.__btWindupBar || null;
  return {
    status: ex ? ex.status : null,
    posF: ex && ex._posF != null ? +ex._posF.toFixed(4) : null,
    cueFrame01: ex ? +(ex.cueFrame01 || 0).toFixed(4) : null,
    stripShown: !!(strip && strip.style.display !== 'none'),
    hintShown: !!(hint && hint.style.display === 'block'),
    toolTf: tool ? tool.getAttribute('transform') : null,
    toolOp: tool ? tool.getAttribute('opacity') : null,
    glowOp: glow ? glow.getAttribute('opacity') : null,
    spriteHref: img ? img.getAttribute('href') : null,
    spriteVb: sprite ? sprite.getAttribute('viewBox') : null,
    comet: head ? (head.getAttribute('cx') + ',' + head.getAttribute('cy')) : null,
    cometOp: head ? head.getAttribute('opacity') : null,
    arrows: arrows ? arrows.getAttribute('d') : null,
    track: trk ? trk.getAttribute('d') : null,
    bar: bar ? { bar01: bar.bar01, ready: bar.ready, idle: bar.idle, skill: bar.skill } : null,
    fx: (S._fxBursts || []).map((b) => b.kind).join(','),
    smoke: window.__btCookSmoke ? window.__btCookSmoke().live : 0,
  };
});

/* Sample the face N times, `gap` ms apart, WITHOUT touching the page. */
const sample = async (P, n, gap) => {
  const out = [];
  for (let i = 0; i < n; i++) { out.push(await face(P)); await P.page.waitForTimeout(gap); }
  return out;
};
const distinct = (rows, key) => new Set(rows.map((r) => r[key])).size;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Cue', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const myId = await H.readState(P, (S) => S.myId);

  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 2 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
  await H.waitFor(P, (S) => (S.rpg?.inventory || {}).fish_minnow || 0, (n) => n >= 1,
    { timeout: 20000, label: 'the log and the fish reach the bag' }).catch(() => {});

  await P.page.evaluate(() => {
    const bus = window._itemDetailBus;
    const S = window._gameState && window._gameState.current;
    if (bus && S && S.rpg) {
      bus.open({ kind: 'inventory', key: 'wood_pine_log', count: (S.rpg.inventory || {}).wood_pine_log || 0 });
    }
  });
  await P.page.waitForTimeout(600);
  await H.clickText(P, 'Light fire').catch(() => {});
  /* v2.3.2761: a look at the fire-lighter mid-animation -- the log was the
     pipeline's magenta key and is pine bark now (toolRecolor.js). */
  await P.page.waitForTimeout(1200);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/gcue-firemaking.png` }).catch(() => {});
  await H.waitFor(P, (S) => !!S._campfire, (v) => v === true,
    { timeout: 20000, label: 'the campfire appears' }).catch(() => {});
  /* Put the bag away.  The item card that lit the fire is a full-screen
     popup and the dashboard sheet is under it: with either up, the fire (and
     the button this whole file is about) is behind a menu, the tap lands on
     the popup, and any screenshot is of the inventory.  This is fixture
     hygiene, not part of what is being measured. */
  await P.page.evaluate(() => {
    try { window._itemDetailBus.close(); } catch (e) { /* not open */ }
  });
  const bagAway = await H.closeDest(P);
  rec.ok('the bag is put away, so the button is not behind a menu (guard)', bagAway === true, { bagAway });

  const at = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = S._campfire;
    if (!n) return null;
    const cv = document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    return { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1),
      y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
  });
  rec.ok('a campfire is lit and on screen (guard)', !!at, at);
  if (!at) { await P.ctx.close().catch(() => {}); return; }
  /* Tap until it takes.  mp-cooktap proves ONE real tap starts a cook and is
     the right place to guard that; here the cook is only the fixture, and a
     tap that lands a frame before the fire's sprite settles (or on a townsman
     who wandered across it) costs this file its whole run.  The retry re-reads
     the fire's screen position each time -- the camera drifts. */
  let started = null;
  for (let i = 0; i < 4 && started !== 'cooking'; i++) {
    const now = await P.page.evaluate(() => {
      const S = window._gameState.current, n = S._campfire, cv = document.querySelector('canvas');
      if (!n || !cv) return null;
      const r = cv.getBoundingClientRect();
      return { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1),
        y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
    });
    if (!now) break;
    await P.page.touchscreen.tap(now.x, now.y);
    await P.page.waitForTimeout(900);
    started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
  }
  rec.ok('the tap started a cook (guard)', started === 'cooking', { started });
  const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null),
    (v) => v === 'ready', { timeout: 20000, label: 'the gesture window opens' }).catch(() => null);
  rec.ok('the cook\'s gesture window opens (guard)', opened === 'ready', { opened });
  if (opened !== 'ready') { await P.ctx.close().catch(() => {}); return; }

  /* Hold the window open for the measurement.  See the header: the deadline
     is not what is under test, and two cycles is not enough samples. */
  await P.page.evaluate(() => {
    const ex = window._gameState.current._extraction;
    if (ex) ex.windowClosesAt = Date.now() + 60000;
  });

  /* ═══ IDLE: NOTHING IS TOUCHING THE SCREEN ═══
     14 samples 120ms apart (~1.7s): long enough for a flash cycle (~0.9s) and
     a full comet run (1.2s for cooking) to show up as distinct values. */
  const idle = await sample(P, 14, 120);
  console.log('    idle: ' + JSON.stringify(idle.map((r) => [r.posF, r.toolOp, r.comet])));
  rec.ok('with no thumb down the CHARACTER holds still (owner: stop animating until the gesture)',
    distinct(idle, 'posF') === 1, { seen: idle.map((r) => r.posF) });
  rec.ok('...on the ready pose, phase 0 -- nothing faked a thumb',
    idle.every((r) => (r.posF || 0) === 0 && r.cueFrame01 === 0), { seen: idle.map((r) => [r.posF, r.cueFrame01]) });
  rec.ok('the cue is on the button face', idle.every((r) => r.hintShown), idle[0]);
  rec.ok('...and it is a mini sprite of the TOOL -- the pan, cut from its strip',
    /pan-gesture/.test(idle[0].spriteHref || '') && idle[0].spriteVb === GESTURE_CUE_SPRITES.cooking.vb, idle[0]);
  rec.ok('...the old painted strip is no longer played on the button', idle.every((r) => !r.stripShown), idle[0]);
  rec.ok('...sitting STILL at the start of its track (the "static" half)',
    distinct(idle, 'toolTf') === 1, { seen: idle.map((r) => r.toolTf) });
  rec.ok('...and FLASHING (the tool\'s opacity pulses)',
    distinct(idle, 'toolOp') >= 3, { seen: idle.map((r) => r.toolOp) });
  rec.ok('...with a glow behind it that pulses too', distinct(idle, 'glowOp') >= 3, { seen: idle.map((r) => r.glowOp) });
  rec.ok('a comet of light runs the motion along the track (the "which way" effect)',
    distinct(idle, 'comet') >= 3 && idle.every((r) => parseFloat(r.cometOp) > 0), { seen: idle.map((r) => r.comet) });
  rec.ok('...on the cook flip\'s own track, with chevrons on it',
    idle[0].track === gestureCueFace('cooking', 0, true, 0).track && !!idle[0].arrows, idle[0]);
  /* The pan is still, so nothing comes off it: no grease pops (they are
     constant through the WIND-UP only) and no smoke.  The last samples only --
     a burst from the wind-up can outlive `ready` by its 600ms. */
  const late = idle.slice(-6);
  rec.ok('...and nothing comes off the still pan -- no grease, no smoke',
    late.every((r) => !/grease/.test(r.fx) && r.smoke === 0), { seen: late.map((r) => [r.fx, r.smoke]) });
  rec.ok('the bar over the head is FULL and flashing while it waits',
    !!idle[0].bar && idle[0].bar.ready === true && idle[0].bar.idle === true && idle[0].bar.skill === 'cooking',
    idle[0].bar);
  /* The owner asked for a LOOK, so leave one behind. */
  /* Clipped to the button's OWN rect (it moved; a fixed clip had been
     photographing the bag sheet under it). */
  const btnRect = await P.page.evaluate(() => {
    const b = document.querySelector('.bt-rjoy-base');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: Math.max(0, r.left - 14), y: Math.max(0, r.top - 14), width: r.width + 28, height: r.height + 28 };
  });
  if (btnRect) await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/gcue-button.png`, clip: btnRect })
    .catch((e) => console.log('    (no shot: ' + e.message + ')'));
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/gcue-screen.png` }).catch(() => {});

  /* ═══ LIVE: THE REAL POINTER PATH ═══
   * Real PointerEvents through ExtractionSwipeLayer's listeners on window, two
   * independent pointer ids, and a press that straddles a state change -- so
   * they are dispatched rather than driven through Playwright's touchscreen.
   *
   * v2.3.2514's two regressions stay pinned: the finger that started the cook
   * is down BEFORE the window opens (its pointerdown fires while there is no
   * ready extraction) and must be adopted on its first move; and a second
   * finger lifting must not end the stroke. */
  const RP_MAIN = 41, RP_OTHER = 42;
  const rpProbe = () => P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest() : null));
  const rpDispatch = (type, id, x, y) => P.page.evaluate(([t, pid, cx, cy]) => {
    window.dispatchEvent(new PointerEvent(t, { pointerId: pid, clientX: cx, clientY: cy,
      pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: pid === 41 }));
  }, [type, id, x, y]);

  const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
  rec.ok('the layer can say where the button is (guard)', !!(cue && cue.r), cue);
  if (cue && cue.r) {
    const pressedEarly = await P.page.evaluate(([pid, cx, cy]) => {
      const ex = window._gameState.current._extraction;
      if (ex) { ex.status = 'waiting'; ex._gesture = null; ex._gestureDown = false; ex.cueFrame01 = 0; ex.progress = 0; ex.reps = 0; ex._posF = null; }
      window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: pid, clientX: cx, clientY: cy,
        pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
      return window.__btHarvest ? window.__btHarvest() : null;
    }, [RP_MAIN, cue.x, cue.y]);
    rec.ok('pressing before the window opens starts no gesture (as designed)',
      !!pressedEarly && pressedEarly.pressed === false, pressedEarly);
    const reopened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null),
      (v) => v === 'ready', { timeout: 8000, label: 'the window opens again' }).catch(() => null);
    rec.ok('the window opens again with the finger still down (guard)', reopened === 'ready', { reopened });
    await rpDispatch('pointermove', RP_MAIN, cue.x, cue.y - 12);
    const adopted = await rpProbe();
    rec.ok('the thumb held through the wind-up is adopted when the window opens',
      !!adopted && adopted.pressed === true && adopted.gestureDown === true, adopted);
    rec.ok('...and the layer knows which finger owns it', !!adopted && adopted.pointerId === RP_MAIN, adopted);

    /* A few quick flips (up is the cook's power stroke), sampled after every
       move: the raw phase must only ever go FORWARD round the loop. */
    const flips = [];
    /* sampled MID-stroke too: at the ends of strokes the phase is always the
       blow (0.5) or the ready pose (0), which says nothing about the frames
       in between */
    const PATH = [-13, -26, -13, 0, 13, 26, 13, 0, -13, -26, -13, 0, 13, 26];
    for (let i = 0; i < PATH.length; i++) {
      await rpDispatch('pointermove', RP_MAIN, cue.x, cue.y + PATH[i]);
      await P.page.waitForTimeout(50);
      flips.push(await rpProbe());
    }
    const phases = flips.map((r) => (r && r.frame01) || 0);
    let backwards = 0;
    for (let i = 1; i < phases.length; i++) {
      const d = ((phases[i] - phases[i - 1]) % 1 + 1) % 1;
      if (d > 0.5) backwards++;   /* a step "forward" of more than half a loop is a rewind */
    }
    console.log('    flip phases: ' + JSON.stringify(phases) + ' reps ' + JSON.stringify(flips.map((r) => r && r.cycles)));
    rec.ok('the strokes drive the phase', new Set(phases).size >= 3, { phases });
    rec.ok('...and only FORWARD -- the return stroke no longer plays the flip backwards',
      backwards === 0, { phases });
    const mid = flips[flips.length - 1];
    rec.ok('...and they count toward the meter', !!mid && mid.cycles > 0, mid);
    rec.ok('...which a few flips come nowhere near filling (it wants ~6s of work)',
      !!mid && mid.progress < 0.6, mid);
    const liveFace = await face(P);
    rec.ok('while the thumb is down the cue stops teaching: no comet, the tool solid',
      liveFace.cometOp === '0' && liveFace.toolOp === '1.00', liveFace);

    /* A resting thumb holds the pose: finger still on the glass, no moves. */
    await P.page.waitForTimeout(700);
    const rest = await sample(P, 5, 120);
    rec.ok('a thumb resting on the button HOLDS the pose (no drift, no loop)',
      distinct(rest, 'posF') === 1, { seen: rest.map((r) => r.posF) });

    /* ── A SECOND FINGER LIFTING MUST NOT END IT ── */
    await rpDispatch('pointerdown', RP_OTHER, 40, PHONE.height - 120);
    await rpDispatch('pointerup', RP_OTHER, 40, PHONE.height - 120);
    const survived = await rpProbe();
    rec.ok('another finger lifting does not end the stroke in progress',
      !!survived && survived.pressed === true && survived.gestureDown === true && survived.pointerId === RP_MAIN, survived);

    /* ── ABOUT THREE SECONDS AT A QUICK PACE ──
       From an EMPTY meter: lift, clear the attempt's gesture, press again and
       flip continuously from inside the page (a round-trip per move would put
       >200ms gaps in the motion, which the active clock rightly ignores).
       Wall time in this harness is not a phone's -- the main thread stalls
       and a setTimeout(18) can take several times that -- so the assertion is
       about the PACING, not a stopwatch: the stroke rate the page actually
       achieved is measured, and the meter must have filled when that rate
       says ~target cycles were done (or the floor was reached), not after a
       handful of flips and not long after. */
    await rpDispatch('pointerup', RP_MAIN, cue.x, cue.y);
    /* A picture of the flip in progress -- smoke and grease off the pan --
       taken from outside while the in-page loop below is running. */
    const midShot = P.page.waitForTimeout(1600).then(() => P.page.screenshot({
      path: `${H.REPO}/tools/qa/mp/out/gcue-flipping.png` }).catch(() => {}));
    const quick = await P.page.evaluate(async ([pid, cx, cy]) => {
      const S = window._gameState.current;
      const ex0 = S._extraction;
      if (ex0) { ex0._gesture = null; ex0.progress = 0; ex0.reps = 0; }
      const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: pid,
        clientX: x, clientY: y, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      ev('pointerdown', cx, cy);
      const t0 = performance.now();
      let halves = 0, lastEx = null, smokeMax = 0;
      const kinds = new Set();
      for (let s = 0; s < 400; s++) {
        const up = s % 2 === 0;
        for (let k = 1; k <= 6; k++) {
          const y = cy + (up ? 26 - 52 * k / 6 : -26 + 52 * k / 6);
          ev('pointermove', cx + Math.sin(s * 1.3 + k) * 5, y);
          await sleep(18);
        }
        halves++;
        smokeMax = Math.max(smokeMax, window.__btCookSmoke ? window.__btCookSmoke().live : 0);
        for (const b of (S._fxBursts || [])) kinds.add(b.kind);
        const ex = S._extraction;
        if (ex && ex._gesture) lastEx = { cycles: ex._gesture.cycles, activeMs: ex._gesture.activeMs, progress: ex.progress, target: ex.repsTarget };
        if (!ex || ex.status !== 'ready') break;
        if (performance.now() - t0 > 60000) break;
      }
      ev('pointerup', cx, cy);
      return { ms: Math.round(performance.now() - t0), halves, done: !S._extraction, last: lastEx, smokeMax, fx: [...kinds] };
    }, [RP_MAIN, cue.x, cue.y]);
    const cyclesDone = quick.halves / 2;
    const target = gestureTargetCycles('cooking');
    console.log('    quick flipping: ' + JSON.stringify(quick) + ' -> ' + cyclesDone + ' cycles for a target of ' + target.toFixed(2));
    await midShot;
    rec.ok('quick flipping finishes the cook', quick.done === true, quick);
    /* Owner: "smoke for cooking" -- and the grease pops with the flick. */
    rec.ok('...with SMOKE rising off the pan while you flip', quick.smokeMax > 0, quick);
    rec.ok('...and grease popping with the flicks', quick.fx.includes('grease'), quick);
    rec.ok(`...after about the target's worth of flips (${cyclesDone} cycles vs ${target.toFixed(2)}), not a handful`,
      cyclesDone >= target - 1.5 && cyclesDone <= target + 1.5, { quick, target });
    rec.ok(`...and never before the floor of real motion (${GESTURE_FLOOR_MS}ms)`, quick.ms >= GESTURE_FLOOR_MS - 100, quick);
  }

  /* ═══ THE RULES, AS ARITHMETIC ═══
     No browser needed: the same functions the game calls. */
  const ready = (extra) => Object.assign({ status: 'ready', skill: 'mining' }, extra || {});
  const pnow = performance.now();
  rec.ok('an untouched ready window is idle (the cue teaches)', gestureIdle(ready()) === true, {});
  rec.ok('...a thumb on the glass is not, however long the frame took',
    gestureIdle(ready({ _gestureDown: true, _gestureMovedAt: pnow - 99999 })) === false, {});
  rec.ok('...a thumb that JUST lifted holds for a beat', gestureIdle(ready({ _gestureMovedAt: pnow })) === false, {});
  rec.ok('...after a pause the cue comes back', gestureIdle(ready({ _gestureMovedAt: pnow - 5000 })) === true, {});
  rec.ok('...and never during the wind-up', gestureIdle(ready({ status: 'waiting' })) === false, {});

  /* The body's phase: holds at 0 untouched, holds when still, never rewinds. */
  const ex = ready();
  const p0 = gesturePose01(ex, 1000);
  ex.cueFrame01 = 0.5; gesturePose01(ex, 1100); gesturePose01(ex, 1200); gesturePose01(ex, 1300);
  const pHeld = gesturePose01(ex, 1400);
  ex.cueFrame01 = 0.45;
  const pBack = gesturePose01(ex, 1500);
  rec.ok('the body shows the ready pose until the first stroke', p0 === 0, { p0 });
  rec.ok('...reaches the thumb\'s phase, and holds there', Math.abs(pHeld - 0.5) < 1e-6, { pHeld });
  rec.ok('...and a small step back is jitter, not a rewind', Math.abs(pBack - 0.5) < 1e-6, { pBack });
  rec.ok('...and no leisurely cap: a whole swing can play in a quarter second',
    (() => {
      /* the thumb sweeps a whole swing in 240ms; the display keeps up */
      const e = ready(); gesturePose01(e, 1000); let v = 0;
      for (let t = 1016; t <= 1272; t += 16) { e.cueFrame01 = Math.min(0.99, (t - 1000) / 240); v = gesturePose01(e, t); }
      return v > 0.93;
    })(), {});

  /* About three seconds at a quick pace, per skill. */
  for (const skill of ['mining', 'woodcutting', 'fishing', 'cooking']) {
    const ms = gestureTargetCycles(skill) * GESTURE_QUICK_CYCLE_MS[skill];
    rec.ok(`${skill}: the meter is ${GESTURE_TARGET_MS}ms of quick ${skill}`, Math.abs(ms - GESTURE_TARGET_MS) < 1, { ms });
  }

  /* The cue geometry: the idle tool sits at the START of its track whatever
     the time, the live tool rides the phase on the right axis, the power
     stroke's far end is the blow, and nothing leaves the disc. */
  const inDisc = (x, y) => Math.hypot(x - 50, y - 50) + (CUE_TOOL_SIZE / 2) * Math.SQRT2 <= 47;
  for (const skill of ['mining', 'woodcutting', 'fishing', 'cooking']) {
    const a = gestureCueFace(skill, 0, true, 0), b = gestureCueFace(skill, 0, true, 777);
    rec.ok(`${skill}: idle tool is static at the start`, a.tool.x === b.tool.x && a.tool.y === b.tool.y, { a: a.tool, b: b.tool });
    rec.ok(`${skill}: ...flashes`, a.tool.op !== b.tool.op || a.glow !== b.glow, { a: a.tool.op, b: b.tool.op });
    rec.ok(`${skill}: ...and the comet moves`, a.comet[0].x !== b.comet[0].x || a.comet[0].y !== b.comet[0].y, {});
    rec.ok(`${skill}: chevrons say which way`, typeof a.arrows === 'string' && a.arrows.length > 10, {});
    let xs = new Set(), ys = new Set(), out = null;
    for (let i = 0; i < 64; i++) {
      const f = gestureCueFace(skill, i / 64, false, 0);
      xs.add(f.tool.x.toFixed(2)); ys.add(f.tool.y.toFixed(2));
      if (!inDisc(f.tool.x, f.tool.y)) out = { p: i / 64, x: f.tool.x, y: f.tool.y };
    }
    const vert = skill === 'mining' || skill === 'cooking';
    rec.ok(`${skill}: the tool travels on the gesture's axis`,
      skill === 'fishing' ? (xs.size > 10 && ys.size > 10) : vert ? (xs.size === 1 && ys.size > 10) : (ys.size === 1 && xs.size > 10),
      { xs: xs.size, ys: ys.size });
    rec.ok(`${skill}: ...and never leaves the disc`, out === null, out || {});
  }
  const mTop = gestureCueFace('mining', 0, false, 0).tool, mHit = gestureCueFace('mining', GESTURE_STROKE.mining.split, false, 0).tool;
  rec.ok('mining: the pick starts raised (top) and the blow lands at the bottom of the down-stroke', mTop.y < mHit.y, { mTop, mHit });
  const kLow = gestureCueFace('cooking', 0, false, 0).tool, kUp = gestureCueFace('cooking', GESTURE_STROKE.cooking.split, false, 0).tool;
  rec.ok('cooking: the pan starts low and the flick ends high', kLow.y > kUp.y, { kLow, kUp });
  rec.ok('a skill with no gesture draws nothing', gestureCueFace('smithing', 0.5, true, 0) === null, {});

  await P.ctx.close().catch(() => {});
}
