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
  const boxR = await markBox();
  if (boxR) await P.page.screenshot({ path: `${out}/crop-red.png`, clip: boxR });
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchend', c.x, c.y, 90); });
  await P.page.waitForTimeout(700);
  const cooled = await P.page.evaluate(() => (window.__btAtkMark ? window.__btAtkMark() : []));
  rec.ok('...and it cools back to yellow when you stop', cooled.every((m) => m.hot === false), cooled);

  await P.ctx.close().catch(() => {});
}
