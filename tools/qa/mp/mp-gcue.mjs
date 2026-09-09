/* ═══ THE GESTURE CUE TEACHES, WITH NO THUMB ON THE GLASS (v2.3.2384) ═══
 *
 * Owner: "Add the old gesture cues on top of the right joystick when it's
 * time to extract the resource."
 *
 * ── WHAT WAS ACTUALLY BROKEN, AND WHY NOTHING CAUGHT IT ──
 * mp-harvest already asserts that the window opens, that the button reads
 * CHOP, and that the painted axe strip is on the button face.  All three were
 * green the whole time this was broken, because every one of them reads a
 * SINGLE FRAME.  The defect is not in any frame; it is that there is only
 * ever one:
 *
 *   ex.cueFrame01 is written in exactly one place -- ExtractionSwipeLayer's
 *   onPointerMove.  So with no thumb down, the phase is 0 forever: the tool
 *   strip sits on cell 0, the character freezes mid-swing, and the button
 *   teaches nothing at the one moment it is supposed to.  You had to already
 *   know the gesture for anything to move.
 *
 * So every assertion here is a DIFFERENCE BETWEEN FRAMES, sampled over time
 * with the page untouched.  A still-frame check cannot see this bug and a
 * still-frame check is what let it ship.
 *
 * ── AND THE OTHER HALF: IT HAS TO STAND DOWN ──
 * A demo that kept looping under a live gesture would fight the thing it is
 * teaching -- the player's own motion is supposed to own the phase while they
 * are making it.  That is what ex._gestureMovedAt was always for (stamped
 * since v2.3.2245, read by nothing until now), so the second half of this
 * file holds a thumb "down" and proves the loop stops.
 *
 * ── THE FIXTURE ──
 * Cooking, on a campfire at the player's own feet in town (mp-cooktap's
 * route), because it needs no zone travel, no tools and no monsters -- the
 * cheapest way to a real `ready` window this repo has.  The demo is
 * skill-agnostic (one function, one phase, four cadences), so proving it on
 * cooking proves the mechanism; the per-skill CURVES are pure arithmetic and
 * are checked directly against gestureCue01 at the end, with no browser
 * needed for them.
 *
 * The 3500ms window (EXTRACT_WINDOW_MS) is pushed out before sampling, and
 * that is a deliberate fixture decision rather than a dodge: the thing under
 * test is the phase animation, `windowClosesAt` is a client-side deadline that
 * has nothing to do with it, and 3500ms is two cook cycles -- too few samples
 * to tell a moving cue from a jittery one.
 */
import * as H from './harness.mjs';
import { gestureCue01, gestureDemo01, CUE_REACH } from '../../../src/game/gesturePose.js';

const PHONE = { width: 390, height: 844 };

/* One reading of everything the harvest face paints. */
const face = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const ex = S._extraction;
  const base = document.querySelector('.bt-rjoy-base');
  const tool = base && Array.from(base.querySelectorAll('div'))
    .find((d) => /gesture/.test(d.style.backgroundImage || ''));
  const hint = base && base.querySelector('svg[viewBox="0 0 100 100"]');
  const grp = hint && hint.querySelector('[data-cue="finger"]');
  const trk = hint && hint.querySelector('[data-cue="track"]');
  return {
    status: ex ? ex.status : null,
    posF: ex && ex._posF != null ? +ex._posF.toFixed(4) : null,
    cueFrame01: ex ? +(ex.cueFrame01 || 0).toFixed(4) : null,
    toolPos: tool ? tool.style.backgroundPosition : null,
    hintShown: !!(hint && hint.style.display === 'block'),
    hintTf: grp ? grp.getAttribute('transform') : null,
    hintTrack: trk ? trk.getAttribute('d') : null,
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

  /* ═══ THE MEASUREMENT: NOTHING IS TOUCHING THE SCREEN ═══
     14 samples 120ms apart spans ~1.7s -- a full cooking cycle (1600ms) and
     then some, so a working demo has to visit most of the strip. */
  const idle = await sample(P, 14, 120);
  console.log('    idle tool positions: ' + JSON.stringify(idle.map((r) => r.toolPos)));

  rec.ok('with NO thumb on the glass the tool strip animates (this was frozen on cell 0)',
    distinct(idle, 'toolPos') >= 3, { seen: idle.map((r) => r.toolPos) });
  rec.ok('...and the CHARACTER\'s harvest pose moves with it, not just the button',
    distinct(idle, 'posF') >= 3, { seen: idle.map((r) => r.posF) });
  rec.ok('...while the RAW gesture phase stays 0 -- nothing faked a thumb',
    idle.every((r) => r.cueFrame01 === 0), { seen: idle.map((r) => r.cueFrame01) });
  /* THE SECOND HALF OF THE SHEET.  A separate assertion from "it animates",
     because the two failed separately: `Math.min(3, Math.floor(f * 4))`
     arrived uncommented in 2deb56a and capped the strip at cell 3 of 8, and
     cells 4-7 are the tool coming DOWN -- so mining and woodcutting could
     never show the strike land.  Distinctness alone passes on a strip that
     only ever plays its first four cells; the cell INDEX is what catches it. */
  const cells = idle.map((r) => Math.round(parseFloat(r.toolPos) / (100 / 7)));
  rec.ok('...and the strip plays its second half too -- the tool coming DOWN',
    Math.max.apply(null, cells) >= 5, { cells, seen: idle.map((r) => r.toolPos) });

  /* ═══ THE FINGER ITSELF ═══ */
  rec.ok('the finger cue is on the button face', idle.every((r) => r.hintShown), idle[0]);
  rec.ok('...and it is MOVING, not parked', distinct(idle, 'hintTf') >= 3,
    { seen: idle.map((r) => r.hintTf) });
  rec.ok('...on the cook flip\'s own track', idle[0].hintTrack === 'M 50 30 L 50 60', idle[0]);
  /* The owner asked for a LOOK, so leave one behind: the button, cropped, at
     the moment the window is open with nothing touching the screen. */
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/gcue-button.png`,
    clip: { x: PHONE.width - 170, y: PHONE.height - 260, width: 170, height: 190 } })
    .catch((e) => console.log('    (no shot: ' + e.message + ')'));
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/gcue-screen.png` }).catch(() => {});

  /* ═══ AND IT STANDS DOWN FOR A LIVE GESTURE ═══
     Stamp _gestureMovedAt the way ExtractionSwipeLayer's onPointerMove does
     (performance.now(), its own clock -- the two epochs are not the same and
     mixing them is what would let the demo run straight through a real swipe),
     pin the raw phase, and watch the display settle onto it and STOP. */
  const thumb = await P.page.evaluate(() => {
    const ex = window._gameState.current._extraction;
    /* Exactly what ExtractionSwipeLayer's onPointerDown/onPointerMove leave
       behind: the thumb is on the button and the raw phase is where it put
       it.  Both fields, because the demo checks both. */
    ex._gestureDown = true;
    ex._gestureMovedAt = performance.now();
    ex.cueFrame01 = 0.5;
    return true;
  });
  rec.ok('a live gesture could be simulated (guard)', thumb === true, { thumb });
  /* WAIT FOR IT TO ARRIVE, do not sleep a fixed amount.  The display chases
     the thumb at a capped rate (one full cycle per 1600ms for cooking) and
     that cap is charged per FRAME with dt clamped at 100ms -- so in this
     harness, where the main thread stalls for over a second at a stretch, the
     chase runs at a fraction of wall-clock speed.  A fixed 2600ms sleep passed
     on a fast run and failed on a slow one for reasons that had nothing to do
     with the code under test. */
  const settled = await H.waitFor(P, (S) => {
    const e = S._extraction;
    return e && e._posF != null ? Math.abs(e._posF - 0.5) : 1;
  }, (d) => d < 0.02, { timeout: 25000, label: 'the display reaches the thumb' }).catch(() => null);
  rec.ok('the display walks to where the thumb is holding', settled != null && settled < 0.02, { settled });
  const live = await sample(P, 6, 90);
  await P.page.evaluate(() => {
    const ex = window._gameState.current._extraction;
    if (ex) ex._gestureDown = false;
  });
  console.log('    under a live gesture: ' + JSON.stringify(live.map((r) => r.posF)));
  rec.ok('under a live gesture the display follows the THUMB, not the demo loop',
    live.every((r) => Math.abs((r.posF ?? 0) - 0.5) < 0.02), { seen: live.map((r) => r.posF) });
  rec.ok('...so the demo is not fighting the player\'s own motion',
    distinct(live, 'posF') <= 2, { seen: live.map((r) => r.posF) });

  /* ═══ AND THE TIMER HALF, EXACTLY ═══
     The thumb-down flag covers a finger ON the glass; the HOLD covers the
     beat after it lifts.  That second branch cannot be measured in this
     harness -- the main thread stalls for over a second at a stretch here, so
     "600ms since the last move" is not a condition a scenario can hold still.
     It is arithmetic, so it is checked as arithmetic, against the same
     function the game calls. */
  const ready = (extra) => Object.assign({ status: 'ready', skill: 'mining' }, extra || {});
  const pnow = performance.now();
  rec.ok('an idle ready window gets a demo phase',
    typeof gestureDemo01(ready(), Date.now()) === 'number', {});
  rec.ok('...a thumb on the glass suppresses it however long the frame took',
    gestureDemo01(ready({ _gestureDown: true, _gestureMovedAt: pnow - 99999 }), Date.now()) === null, {});
  rec.ok('...a thumb that JUST lifted still holds the pose (the HOLD)',
    gestureDemo01(ready({ _gestureMovedAt: pnow }), Date.now()) === null, {});
  rec.ok('...and after a pause of stillness the demonstration comes back',
    typeof gestureDemo01(ready({ _gestureMovedAt: pnow - 5000 }), Date.now()) === 'number', {});
  rec.ok('...but never before the window opens (the wind-up keeps its own loop)',
    gestureDemo01(ready({ status: 'waiting' }), Date.now()) === null, {});
  /* The cadences are the caps already in the tree, so demo and result cannot
     disagree: one full cycle per 700 / 450 / 1600 ms. */
  const cyc = (skill, ms) => {
    const a = gestureDemo01(ready({ skill }), 0);
    const b = gestureDemo01(ready({ skill }), ms / 2);
    return Math.abs(a) < 1e-9 && Math.abs(b - 0.5) < 1e-9;
  };
  rec.ok('mining and chopping demo one swing per 700ms', cyc('mining', 700) && cyc('woodcutting', 700), {});
  rec.ok('fishing cranks one turn per 450ms', cyc('fishing', 450), {});
  rec.ok('cooking flips once per 1600ms', cyc('cooking', 1600), {});

  /* ═══ THE CURVES, DIRECTLY ═══
     Pure arithmetic, no browser: the four motions are the owner's own and each
     has to actually travel on its own axis.  A cue that renders but does not
     move on the axis the recogniser reads (ExtractionSwipeLayer: mining and
     cooking on y, woodcutting on x, fishing on the angle about the centre)
     would teach the wrong gesture. */
  const spanOf = (skill, key) => {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 64; i++) {
      const c = gestureCue01(skill, i / 64);
      lo = Math.min(lo, c[key]); hi = Math.max(hi, c[key]);
    }
    return +(hi - lo).toFixed(2);
  };
  const axes = {
    miningY: spanOf('mining', 'y'), miningX: spanOf('mining', 'x'),
    cookingY: spanOf('cooking', 'y'), cookingX: spanOf('cooking', 'x'),
    choppingX: spanOf('woodcutting', 'x'), choppingY: spanOf('woodcutting', 'y'),
    fishingX: spanOf('fishing', 'x'), fishingY: spanOf('fishing', 'y'),
  };
  console.log('    cue travel: ' + JSON.stringify(axes));
  rec.ok('the mine pump travels on the VERTICAL axis only', axes.miningY > 25 && axes.miningX === 0, axes);
  rec.ok('the cook flip travels on the VERTICAL axis only', axes.cookingY > 22 && axes.cookingX === 0, axes);
  rec.ok('the chop travels on the HORIZONTAL axis only', axes.choppingX > 22 && axes.choppingY === 0, axes);
  rec.ok('the reel travels on BOTH -- it is a circle', axes.fishingX > 30 && axes.fishingY > 30, axes);
  /* Every skill has to stay inside the disc, or the cue is drawn off the
     button it is meant to be on: r=40 is where the wind-up ring is drawn and
     r=50 is the rim itself. */
  /* THE WHOLE GLYPH, not its origin.  The first cut of this measured the
     fingertip alone and passed while a real capture showed a third of the
     finger hanging off the rim at ten o'clock -- the body runs back from the
     origin and the knuckle further back still.  CUE_REACH is that overhang,
     and r=40 is where the wind-up ring is drawn. */
  let worst = 0, worstAt = null;
  for (const skill of ['mining', 'woodcutting', 'fishing', 'cooking']) {
    for (let i = 0; i < 64; i++) {
      const c = gestureCue01(skill, i / 64);
      const r = Math.hypot(c.x - 50, c.y - 50) + CUE_REACH;
      if (r > worst) { worst = r; worstAt = { skill, p: +(i / 64).toFixed(3), x: +c.x.toFixed(1), y: +c.y.toFixed(1) }; }
    }
  }
  rec.ok('...and no part of the finger leaves the disc', worst <= 40,
    { worst: +worst.toFixed(2), reach: CUE_REACH, worstAt });
  rec.ok('a skill with no gesture draws nothing', gestureCue01('smithing', 0.5) === null, {});

  await P.ctx.close().catch(() => {});
}
