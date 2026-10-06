/* ═══ BESIDE A PROP, A TAP JUMPS AND A HOLD ATTACKS (v2.3.3105) ═══
 *
 * The owner, on #821: "it needs priority near props instead of attack. If
 * players want to attack props they can still hold the right joystick
 * towards it but a tap should jump."
 *
 * On a phone (390 x 844, 2x) in the Wheel's Brotown, sword in hand, standing
 * square in front of a barrel (or a crate, a bench ...) within a swing of it:
 *   1. a quick tap on the right stick's zone jumps -- no swing, no blow on the
 *      barrel -- and so does a slower one, past the 200 ms the first swing used
 *      to wait (with `?tapms=` stretching the window for this slow page);
 *   2. a tap on the right stick's DISC (the button over it) jumps too;
 *   3. a tap ON the barrel jumps (a prop is not a thing a tap picks);
 *   4. holding the stick toward the barrel swings at it and lands blows;
 *   5. the stick shows the owner's JUMP arrow, see-through over the disc, while
 *      a tap would jump, and the weapon while one would attack;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/tapprop-{stick,air}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const AIR_MS = 1400;
/* ?tapms=: this page's timers run late, so a press meant to last 250 ms lasts
   400-600; the window is stretched to keep "past the old 200, short of the
   tap window" a thing the test can make */
const TAP_MS = 1200;
const WOODEN = ['barrel', 'crate', 'bench', 'trough', 'hitch', 'cart', 'haybale', 'signpost', 'noticeboard'];

const targets = (P, ids, r = 1600) => P.page.evaluate(({ ids, r }) => {
  const S = window._gameState.current, W = window.__btWheelObjects;
  const boxes = W.blockers();
  const out = [];
  for (const o of W.near(S.player.x, S.player.y, r)) {
    if (ids.indexOf(o.id) < 0 || !o.ready) continue;
    const box = boxes.find((b) => b.oi === o.i);
    if (!box) continue;
    out.push({ oi: o.i, id: o.id, x: o.x, y: o.y, box, d: Math.hypot(o.x - S.player.x, o.y - S.player.y) });
  }
  return out.sort((a, b) => a.d - b.d);
}, { ids, r });

/* the facts a tap or a hold changes */
const state = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, j = window.__btJumpBtn ? window.__btJumpBtn() : {};
  const d = document.querySelector('.bt-rjoy-base');
  return { jumps: j.count || 0, tapJumps: j.tapJumps || 0, air: !!j.air, swing: S.swingTimer || 0,
    hits: window.__btWheelBreak ? window.__btWheelBreak.stats.hits : 0,
    icon: d ? d.getAttribute('data-ricon') : null, disc: d ? d.style.pointerEvents : null };
});

/* touches from inside the page on `sel`, at a client point; `hold` keeps the
   finger down that long, dragging `dy` px (up is negative) on the way */
const touch = (P, o) => P.page.evaluate(async (o) => {
  const box = document.querySelector(o.sel);
  if (!box) return false;
  const b = box.getBoundingClientRect();
  const x = o.x != null ? o.x : b.left + b.width / 2, y = o.y != null ? o.y : b.top + b.height / 2;
  /* where a real finger lands: whatever takes touches at that point (a
     dispatch on an element straight ignores hit-testing -- TRAPS §41) */
  const el = document.elementFromPoint(x, y) || box;
  const mk = (t, cx, cy) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: o.id, target: el, clientX: cx, clientY: cy })],
    changedTouches: [new Touch({ identifier: o.id, target: el, clientX: cx, clientY: cy })] });
  const t0 = performance.now();
  el.dispatchEvent(mk('touchstart', x, y));
  if (o.hold) {
    const steps = o.steps || 6;
    for (let k = 1; k <= steps; k++) {
      await new Promise((r) => setTimeout(r, o.hold / steps));
      el.dispatchEvent(mk('touchmove', x, y + ((o.dy || 0) * k) / steps));
    }
  }
  el.dispatchEvent(mk('touchend', x, y + (o.dy || 0)));
  const ms = Math.round(performance.now() - t0);
  const S = window._gameState.current;
  if (!o.keep) { S.autoAttack = false; S._aiming = false; }
  return { ms };
}, o);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Propbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: `jumpms=${AIR_MS}&tapms=${TAP_MS}` });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await H.waitFor(P, () => !!(window.__btWheelObjects && window.__btWheelObjects.blockers().length), (v) => v, { timeout: 30000, label: 'objects' }).catch(() => null);
    await P.page.waitForTimeout(1500);
    const t = (await targets(P, WOODEN))[0];
    rec.ok(`a wooden prop near town (guard)`, !!t, t ? { id: t.id, oi: t.oi } : null);
    if (!t) return;
    /* square in front of it, just south of its footprint: inside a sword's swing */
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g ? g.y - S.player.y : 52; });
    await H.hopTo(P, (t.box.x0 + t.box.x1) / 2, t.box.y1 + 8 - dy, { tries: 60 });
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S.rpg.weapon = { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 };
      S.rpg.activeSlot = 'melee';
      S.lockedTarget = null; S._facing = 'up';
    });
    await P.page.waitForTimeout(1200);
    const down = () => H.waitFor(P, () => window.__btJumpBtn().air, (v) => v === false, { timeout: AIR_MS + 4000, label: 'down' }).catch(() => null);

    /* ── 5a. the picture while a tap would jump ── */
    const s0 = await state(P);
    /* the owner's arrow over the disc as it is ("a semi transparent overlay on
       the existing disc"): the disc's skin still drawn, at its 0.5 rest, the
       arrow see-through over it */
    const paint = await P.page.evaluate(() => {
      const d = document.querySelector('.bt-rjoy-base');
      const j = d && d.querySelector('.bt-rjoy-icon[data-ricon-img="jump"]');
      const skin = d && d.querySelector('.bt-skin');
      let op = 1; for (let e = d; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
      return { op: +op.toFixed(2), jump: j ? getComputedStyle(j).display : null, jumpOp: j ? +getComputedStyle(j).opacity : null,
        skin: skin ? getComputedStyle(skin).visibility : null, pe: d ? d.style.pointerEvents : null };
    });
    rec.ok(`the stick shows the JUMP arrow while a tap would jump (data-ricon ${s0.icon}), see-through over the disc as it is (disc ${paint.op}, arrow ${paint.jumpOp}, skin ${paint.skin}), not taking touches itself (${paint.pe})`,
      s0.icon === 'jump' && paint.jump === 'block' && paint.skin === 'visible' && paint.op > 0.4 && paint.op < 0.9
        && paint.jumpOp > 0.4 && paint.jumpOp < 1 && paint.pe === 'none', { s0, paint });
    const disc = await P.page.evaluate(() => { const b = document.querySelector('.bt-rjoy-base').getBoundingClientRect(); return { x: b.left, y: Math.max(0, b.top - 40), width: b.width, height: b.height + 80 }; });
    await P.page.screenshot({ path: join(OUT, 'tapprop-stick.png'), clip: { x: Math.max(0, disc.x - 30), y: disc.y, width: Math.min(PHONE.width - Math.max(0, disc.x - 30), disc.width + 60), height: disc.height } }).catch(() => {});

    /* ── 1. a tap on the zone, beside the barrel ── */
    const zone = await P.page.evaluate(() => { const b = document.querySelector('[data-joyzone="R"]').getBoundingClientRect(); return { x: b.left + b.width * 0.6, y: b.top + b.height * 0.35 }; });
    const a0 = await state(P);
    await touch(P, { sel: '[data-joyzone="R"]', id: 71, x: zone.x, y: zone.y });
    const a1 = await state(P);
    await P.page.waitForTimeout(700);
    const a2 = await state(P);
    rec.ok(`beside the ${t.id}, a tap on the right stick jumps (jumps ${a0.jumps} -> ${a1.jumps})`, a1.jumps === a0.jumps + 1 && a1.air, { a0, a1 });
    rec.ok('...and does not swing or hit it', a2.swing === a0.swing && a2.hits === a0.hits, { a0, a2 });
    await P.page.screenshot({ path: join(OUT, 'tapprop-air.png'), clip: { x: 95, y: 220, width: 200, height: 360 } }).catch(() => {});
    await down();
    await P.page.waitForTimeout(400);

    /* ── 1b. a relaxed thumb's tap, 260 ms: longer than the 200 ms the first
          swing used to wait, so before v2.3.3105 it chopped the prop ── */
    /* one wait, not a stream of moves: this page's timers run late, and a
       press that really lasts past TAP_JUMP_MAX_MS is a hold (it swings) */
    let r0, r1, r2, held = null;
    for (let tries = 0; tries < 4; tries++) {
      r0 = await state(P);
      held = await touch(P, { sel: '[data-joyzone="R"]', id: 75 + tries * 10, x: zone.x, y: zone.y, hold: 320, steps: 2 });
      r1 = await state(P);
      await P.page.waitForTimeout(700);
      r2 = await state(P);
      if (held.ms > 260 && held.ms < TAP_MS - 150) break;
      await down(); await P.page.waitForTimeout(400);
    }
    rec.ok(`a slower tap (${held.ms} ms, past the old 200, inside the tap window) jumps too (jumps ${r0.jumps} -> ${r1.jumps}), no swing, no blow`,
      held.ms > 260 && held.ms < TAP_MS - 150 && r1.jumps === r0.jumps + 1 && r2.swing === r0.swing && r2.hits === r0.hits, { r0, r1, r2, held });
    await down();
    await P.page.waitForTimeout(400);

    /* ── 2. a tap on the disc ── */
    const b0 = await state(P);
    await touch(P, { sel: '.bt-rjoy-base', id: 72 });
    const b1 = await state(P);
    await P.page.waitForTimeout(700);
    const b2 = await state(P);
    rec.ok(`a tap on the stick's disc jumps too (jumps ${b0.jumps} -> ${b1.jumps})`, b1.jumps === b0.jumps + 1, { b0, b1 });
    rec.ok('...and does not swing or hit it', b2.swing === b0.swing && b2.hits === b0.hits, { b0, b2 });
    await down();
    await P.page.waitForTimeout(400);

    /* ── 3. a tap on the barrel itself, from a step back: right against it a
          tap on it is a tap on your own bro, which opens chat (and its box
          would then cover the stick) ── */
    await H.hopTo(P, (t.box.x0 + t.box.x1) / 2, t.box.y1 + 150 - dy, { tries: 60 });
    await P.page.waitForTimeout(900);
    const at = await P.page.evaluate((t) => {
      const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
      return { x: rc.left + ((t.box.x0 + t.box.x1) / 2 - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (t.box.y0 - 12 - S.camera.y) * (S._worldScaleY || 1) };
    }, t);
    const c0 = await state(P);
    await touch(P, { sel: '[data-joyzone="R"]', id: 73, x: Math.max(at.x, PHONE.width / 2 + 4), y: at.y });
    const c1 = await state(P);
    await P.page.waitForTimeout(700);
    const c2 = await state(P);
    rec.ok(`a tap on the ${t.id} itself jumps (jumps ${c0.jumps} -> ${c1.jumps})`, c1.jumps === c0.jumps + 1 && c2.hits === c0.hits && c2.swing === c0.swing, { c0, c1, c2, at });
    await down();
    await P.page.waitForTimeout(400);

    /* ── 4. a hold toward it attacks it, from right against it again ── */
    await H.hopTo(P, (t.box.x0 + t.box.x1) / 2, t.box.y1 + 8 - dy, { tries: 60 });
    await P.page.evaluate(() => { const S = window._gameState.current; S._facing = 'up'; });
    await P.page.waitForTimeout(900);
    const d0 = await state(P);
    await touch(P, { sel: '[data-joyzone="R"]', id: 74, x: zone.x, y: zone.y, hold: 1600, dy: -40 });
    await P.page.waitForTimeout(500);
    const d1 = await state(P);
    rec.ok(`holding the stick toward the ${t.id} swings and lands blows on it (${d1.hits - d0.hits} blows, no jump)`,
      d1.swing > d0.swing && d1.hits > d0.hits && d1.jumps === d0.jumps, { d0, d1 });

    /* ── 5b. the weapon while a tap would attack: the stick with a job (a
          monster in the perimeter stamps this each frame; a made-up lock with
          no monster behind it is dropped by targeting within a frame) ── */
    const busyIcon = await P.page.evaluate(async () => {
      const S = window._gameState.current;
      S._rBtnPressUntil = Date.now() + 3000;
      await new Promise((r) => setTimeout(r, 600));
      const icon = document.querySelector('.bt-rjoy-base').getAttribute('data-ricon');
      S._rBtnPressUntil = 0;
      return icon;
    });
    rec.ok(`with a job on the stick (a monster to fight) it shows the weapon again (data-ricon ${busyIcon})`, /^w-sword/.test(String(busyIcon)), busyIcon);   /* v2.3.3105: the sword in hand, its bag picture */

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
