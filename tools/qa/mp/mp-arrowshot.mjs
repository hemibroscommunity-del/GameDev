/* ═══ WHAT THE TARGET ARROWS ACTUALLY LOOK LIKE (v2.3.2253) ═══
 *
 * Owner: "add the arrow above the monster head ... the red circle is a bit
 * hard to see.  I also think the arrow should be yellow if you're merely
 * within combat distance and turn red when you're attacking."
 *
 * A CAMERA, not an assertion scenario -- the same shape as mp-zoomshot.  Every
 * previous round of this indicator was argued about rather than looked at, and
 * twice the argument lost (the 220px rings that read as haze; the ground marks
 * the owner could not see).  So this stands three monsters at known distances
 * and shoots the field in both states, yellow and red, from the same camera.
 */
import * as H from './harness.mjs';

const SPOT = { x: 830, y: 980 };

/* The touch helpers are installed per-scenario (mp-rbutton does the same):
   dispatching a real TouchEvent is the only way to drive the attack button,
   and a synthetic click does not reach its touchstart handler. */
const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
    }));
  };
  window.__centre = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { el, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  };
});

const seed = (P, list) => P.page.evaluate((ms) => {
  const S = window._gameState.current;
  S._serverMonsters = false;
  S.monsters = ms.map(([id, dx, dy]) => ({
    id, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + dx, y: S.player.y + dy,
    renderX: S.player.x + dx, renderY: S.player.y + dy,
    spawnX: S.player.x + dx, spawnY: S.player.y + dy,
    targetX: S.player.x + dx, targetY: S.player.y + dy,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0,
    spd: 0, vx: 0, vy: 0, alive: true, statuses: {},
    _hitThisSwing: false, _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  }));
}, list);

export async function run({ browser, wsPort, webPort, rec }) {
  const out = process.env.BT_ARROW_OUT || `${H.REPO}/tools/qa/mp/out/arrows`;
  const P = await H.newPlayer(browser, {
    name: 'Arrows', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await installTouch(P);
  await P.page.evaluate((s) => {
    const S = window._gameState.current;
    S.player.x = s.x; S.player.y = s.y; S._facing = 'down';
  }, SPOT);
  /* Three at different distances so the distance ramp on the ground ring is
     visible in the same frame as the arrows. */
  await seed(P, [['near', 70, 10], ['mid', -110, -40], ['far', 40, -150]]);
  await P.page.waitForTimeout(900);

  const cold = await P.page.evaluate(() => (window.__btAtkMark ? window.__btAtkMark() : []));
  rec.ok('three monsters in the perimeter are all marked', cold.length === 3, cold);
  rec.ok('...exactly one of them is the target', cold.filter((m) => m.target).length === 1, cold);
  rec.ok('...and with no attack running, none is hot (yellow)',
    cold.every((m) => m.hot === false), cold);
  /* Crop from the marks the renderer actually reported, not from coordinates
     typed in here: a hand-picked box is how the first render of this missed
     the arrows entirely and "proved" they were invisible. */
  const markBox = async () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = (window.__btAtkMark ? window.__btAtkMark() : []) || [];
    if (!ms.length) return null;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
    /* Frame the TARGET: its arrow (the mark) at the top of the window and its
       body below, so one crop shows the arrow, the monster it belongs to, and
       the ground ring under it.  A box spanning all three monsters put the
       arrows on the crop's own edge and showed scenery instead -- the failure
       this camera exists to catch, caught twice. */
    const tgt = ms.find((m) => m.target) || ms[0];
    const mon = (S.monsters || []).find((mm) => mm.id === tgt.id);
    if (!mon) return null;
    const ax = r.left + (tgt.x - S.camera.x) * kx;
    const ay = r.top + (tgt.y - S.camera.y) * ky;
    const by = r.top + ((mon.renderY != null ? mon.renderY : mon.y) - S.camera.y) * ky;
    const cx = ax, top = ay - 26, bot = by + 34;
    const halfW = Math.max(60, (bot - top) * 0.62);
    const x = Math.max(0, Math.floor(cx - halfW));
    const y = Math.max(0, Math.floor(top));
    const w = Math.min(innerWidth - x, Math.ceil(halfW * 2));
    const h = Math.min(innerHeight - y, Math.ceil(bot - top));
    return (w > 20 && h > 20) ? { x, y, width: w, height: h } : null;
  });
  await P.page.screenshot({ path: `${out}/arrows-yellow.png` });
  const boxY = await markBox();
  rec.ok('the marks resolve to an on-screen box (so the crop frames them)', !!boxY, boxY);
  if (boxY) await P.page.screenshot({ path: `${out}/crop-yellow.png`, clip: boxY });

  /* Now attack: the whole set must go red together. */
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchstart', c.x, c.y, 90); });
  await P.page.waitForTimeout(400);
  const hot = await P.page.evaluate(() => (window.__btAtkMark ? window.__btAtkMark() : []));
  rec.ok('attacking turns EVERY nearby monster hot, not just the target',
    hot.length === 3 && hot.every((m) => m.hot === true), hot);
  rec.ok('...and the target is still the target', hot.filter((m) => m.target).length === 1, hot);
  await P.page.screenshot({ path: `${out}/arrows-red.png` });

  /* ═══ HOW BIG IS IT, IN PIXELS THE OWNER'S EYE GETS (v2.3.2255) ═══
     Every assertion above says the arrows are DRAWN, which is not the claim
     that matters and never was.  The owner reported the marks hard to see
     TWICE, and measuring the second report's native screenshot said why: the
     target's arrow rendered 9.3 x 3.7 CSS px, because its geometry was in
     WORLD units and the world had zoomed out under it (v2.3.2255 divides it by
     the world scale, so 22 x 10 CSS px now, at any zoom).

     THE CONTROL IS "MOVE THE MONSTER OUT OF RANGE", and it took four tries to
     find one that isolates the arrow instead of repainting the crop:
       - `_zoneLoading`, the switch the renderer's own guard names, ALSO raises
         the per-zone loading overlay -- the control frame was a grey sheet and
         the diff filled the crop, 90 CSS px "wide";
       - `_burstUntil`, mp-engage's intangibility control, plays a burst
         animation where the monster is -- saturated again;
       - suppressing nothing and diffing two frames a half bob-period apart:
         the camera and the scene move too, so a 40px crop came back 40px.
     Shoving the monster 4000px away drops it out of the candidate list and off
     the crop, and leaves the ground exactly as it was.  The diff is then the
     arrow and nothing else -- verified by eye on the dumped map (BT_ARROW_DUMP=1
     prints it), which shows a clean downward chevron.

     Measured through the CENTRE column, because the mark is centred on the
     monster and the crop is centred on the mark: whatever else changes at the
     crop's edges cannot be the arrow.  The number is printed and the crops are saved; the size
     is verified by looking at crop-yellow.png, which is what this file is for
     (its own header: "A CAMERA, not an assertion scenario").  If you want this
     gated, the honest version freezes the camera and the scene first. */
  const caretPx = async () => {
    const box = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const ms = (window.__btAtkMark ? window.__btAtkMark() : []) || [];
      const tgt = ms.find((m) => m.target) || ms[0];
      if (!tgt) return null;
      const r = document.querySelector('canvas').getBoundingClientRect();
      const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
      const ax = r.left + (tgt.x - S.camera.x) * kx;
      const ay = r.top + (tgt.y - S.camera.y) * ky;
      /* +/-17 CSS px.  Wider than the 15px arrow with room to prove it is not
         clipped, and narrow enough to exclude the monster's own furniture: at
         +/-24 something ~24px left of the mark joined the x-projection and the
         run-through-centre bridged to it, reporting 32px. */
      return { x: Math.max(0, Math.round(ax - 17)), y: Math.max(0, Math.round(ay - 7)), width: 34, height: 26 };
    });
    if (!box) return null;
    const a = await H.screenshotPixels(P, box);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      (S.monsters || []).forEach((m) => { m.x += 4000; m.renderX += 4000; });
    });
    await P.page.waitForTimeout(420);
    const gone = await P.page.evaluate(() => ((window.__btAtkMark ? window.__btAtkMark() : []) || []).length);
    const b = await H.screenshotPixels(P, box);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      (S.monsters || []).forEach((m) => { m.x -= 4000; m.renderX -= 4000; });
    });
    await P.page.waitForTimeout(420);
    if (gone !== 0) return { changed: -1, gone };
    if (a.width !== b.width || a.height !== b.height) return null;
    const dpr = await P.page.evaluate(() => window.devicePixelRatio || 1);
    /* PER ROW, not on the x-projection.  The arrow is widest across its two
       arms, and a projection down the whole crop lets a stray one-pixel column
       in some OTHER row bridge into the arrow's run -- which is what turned a
       17px arrow into a "25px" one.  A single row cannot do that: the gap
       between the arrow and anything else is real in that row or it is not. */
    const mid = Math.floor(a.width / 2);
    const GAP = Math.max(2, Math.round(3 * dpr));
    const hot = (x, y) => {
      const p = a.at(x, y), q = b.at(x, y);
      return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 40;
    };
    let n = 0, wide = 0;
    for (let y = 0; y < a.height; y++) {
      let rowHot = false;
      for (let x = 0; x < a.width; x++) if (hot(x, y)) { n++; rowHot = true; }
      if (!rowHot) continue;
      let lo = mid, hi = mid, blank = 0;
      while (lo > 0) { if (hot(lo - 1, y)) { blank = 0; lo--; } else if (++blank <= GAP) lo--; else break; }
      lo += blank; blank = 0;
      while (hi < a.width - 1) { if (hot(hi + 1, y)) { blank = 0; hi++; } else if (++blank <= GAP) hi++; else break; }
      hi -= blank;
      if (hot(mid, y) || hi > lo) wide = Math.max(wide, hi - lo + 1);
    }
    const cssW = wide / dpr;
    if (process.env.BT_ARROW_DUMP) {
      for (let y = 0; y < a.height; y++) {
        let line = '';
        for (let x = 0; x < a.width; x++) {
          const p = a.at(x, y), q = b.at(x, y);
          const d = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
          line += d > 40 ? '#' : (d > 12 ? '+' : '.');
        }
        console.log('    ' + String(y).padStart(3) + ' ' + line);
      }
    }
    return { changed: n, cssW, ofPx: a.width * a.height, cropW: box.width, dpr };
  };
  /* ONE monster, so the crop that gets saved for the eye holds one arrow. */
  await seed(P, [['solo', 70, 10]]);
  await P.page.waitForTimeout(900);
  const sz = await caretPx();
  console.log('    target arrow crop (LOOK at crop-solo.png): ' + JSON.stringify(sz));
  const boxS = await markBox();
  if (boxS) await P.page.screenshot({ path: `${out}/crop-solo.png`, clip: boxS });
  rec.ok('the lone monster still gets its arrow, and the crop framed it',
    !!sz && sz.changed > 8 && !!boxS, { sz: sz, boxS: boxS });
  if (sz && sz.changed > 8) {
    /* This monster is a CANDIDATE, not a tapped target, so it draws the smaller
       of the two arrows: 15 CSS px across by construction (7.5 either side of
       the mark, counter-scaled).  On the build the owner photographed the same
       arrow was 6 CSS px.  12 is the floor between them, with room for the
       keyline and antialiasing. */
    rec.ok(`the arrow is big enough to see (${sz.cssW.toFixed(1)} CSS px across, floor 12)`,
      sz.cssW >= 12, sz);
    /* ...and it is an ARROW, not a saturated crop.  Three earlier controls all
       "passed" by diffing the whole box; a measurement that cannot fail high
       cannot be trusted low either. */
    rec.ok(`...and it is an arrow, not a repainted crop (${sz.cssW.toFixed(1)} of a ${sz.cropW}px crop)`,
      sz.cssW <= 24, sz);
  }
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchend', c.x, c.y, 90); });
  await P.page.waitForTimeout(700);
  const cooled = await P.page.evaluate(() => (window.__btAtkMark ? window.__btAtkMark() : []));
  rec.ok('...and it cools back to yellow when you stop', cooled.every((m) => m.hot === false), cooled);

  await P.ctx.close().catch(() => {});
}
