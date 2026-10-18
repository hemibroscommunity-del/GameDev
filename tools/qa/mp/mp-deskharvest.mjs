/* ═══ A COMPUTER CAN FINISH A HARVEST; A SIDEWAYS PHONE STILL DOES (v2.3.3399) ═══
 *
 * Owner, 2026-10-18: "Make sure all actions/buttons can be completed in
 * landscape mode and on the computer.  For instance I don't think you can
 * harvest lifeskills right now on the computer.  Make a fix for that."
 *
 * Measured before the fix (1280 x 800, a mouse): E started the harvest, the
 * hits landed, the window opened -- and the gesture that ends a harvest was
 * asked for on the right button, which game.css hides on a computer, or else
 * at a point worked out without the canvas's offset, in the black margin left
 * of the game's column (x 218 of a column at 422..858).  No press could land
 * there, and since v2.3.1416 a harvest has no time-out: it waited at its full
 * bar for ever.  (gesturePose.js DESK_GESTURE_HINT has the whole story.)
 *
 * On a computer (1280 x 800, a mouse, the keyboard), in the Wheel's commons:
 *   1. a tree, by E HELD: the press starts the harvest, a second press during
 *      the wind-up does not start it over (it did: startExtraction dropped the
 *      attempt in flight), and the held E waits through the wind-up and works
 *      the gesture to the end -- the worker pays one log (a key draws no
 *      path: never 'perfect');
 *   2. a copper vein, by the MOUSE ON THE WORLD: E tapped, then a real press
 *      on the world (the canvas answers there) dragged up and down -- the
 *      worker pays the ore; the press never armed an attack, and the click it
 *      ends with is swallowed (no lock, no new harvest);
 *   3. a minnow spot, by the mouse CIRCLING away from the button (its heading
 *      turns, wherever it is drawn) -- paid;
 *   4. at a tree's window the right button is on the computer's screen, in
 *      the game's column, with "Drag <-> or hold E" over it; and the fallback
 *      anchor (the button hidden) lies on the figure, inside the column --
 *      not in the margin;
 * and on a phone held SIDEWAYS (844 x 390, touch), unchanged:
 *   5. a tree started by a real tap on the HARVEST button; at the window the
 *      computer's line is not shown; a finger pressed on the world (not the
 *      button) does not start the gesture; a finger chopping on the button
 *      finishes it and the worker pays.
 */
import * as H from './harness.mjs';

const DESK = { width: 1280, height: 800 };
const LAND = { width: 844, height: 390 };
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };
const RES = { oreVein: 'ore_', tree: 'wood_', fishSpot: 'fish_' };

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};
const sumPrefix = (inv, pre) => Object.keys(inv || {}).filter((k) => k.indexOf(pre) === 0).reduce((n, k) => n + (inv[k] || 0), 0);
const paidSince = async (P, wsPort, myId, pre, before) => {
  let got = 0;
  for (let i = 0; i < 30 && got <= 0; i++) {
    got = sumPrefix(await srvInv(wsPort, myId), pre) - before;
    if (got <= 0) await P.page.waitForTimeout(400);
  }
  return got;
};

async function nearest(P, type, used) {
  return P.page.evaluate(([t, sk]) => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1 || sk.includes(n.id)) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
    }
    return best;
  }, [type, used]);
}

async function arrive(P, wsPort) {
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
    (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 150000, label: 'into the Wheel, its nodes in' }).catch(() => null);
  for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
    (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
  /* the review is of the harvest: the tutorial's cards and banners stand aside */
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  return { myId, inW };
}

const ready = (P) => H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready' || v == null,
  { timeout: 90000, label: 'the window opens' }).catch(() => 'timeout');

/* what a computer's screen shows at the window: the right button's box and
   the line over it */
const deskLook = (P) => P.page.evaluate(() => {
  const z = document.querySelector('.bt-rjoy-zone'), h = document.querySelector('.bt-rjoy-deskhint');
  const zr = z ? z.getBoundingClientRect() : null;
  const root = document.getElementById('root').getBoundingClientRect();
  return {
    zone: zr ? { shown: getComputedStyle(z).display !== 'none' && z.style.opacity === '1', x: Math.round(zr.x), w: Math.round(zr.width),
      inColumn: zr.left >= root.left - 1 && zr.right <= root.right + 1 } : null,
    hint: h ? { shown: getComputedStyle(h).display !== 'none', text: h.textContent } : null,
  };
});

/* a gesture, in the page (this box draws a few frames a second, and a real
   mouse's moves would come too far apart for the active clock): moves every
   16 ms from (x, y), the way `skill` wants, on `target` */
const gestureIn = (P, { skill, x, y, pointerType, onCanvas, ms = 9000, offX = 0, pointerId = null }) => P.page.evaluate(async (o) => {
  const S = window._gameState.current;
  const tgt = o.onCanvas ? document.querySelector('canvas.brotown-canvas') : window;
  const pid = o.pointerId != null ? o.pointerId : (o.pointerType === 'mouse' ? 1 : 9);   /* the real press's own id when there was one */
  const fire = (t, px, py) => tgt.dispatchEvent(new PointerEvent(t, { pointerId: pid, clientX: px, clientY: py,
    pointerType: o.pointerType, bubbles: true, cancelable: true, isPrimary: true, buttons: t === 'pointerup' ? 0 : 1 }));
  const t0 = performance.now();
  let step = 0, next = t0, armed = false, maxProg = 0;
  while (performance.now() - t0 < o.ms) {
    while (performance.now() < next) { /* 16 ms */ }
    next += 16;
    let px = o.x, py = o.y;
    if (o.skill === 'fishing') { const a = step * (Math.PI / 8); px = o.x + o.offX + Math.cos(a) * 40; py = o.y + Math.sin(a) * 40; }
    else {
      const k = step % 12, v = k < 6 ? -30 + 60 * k / 6 : 30 - 60 * (k - 6) / 6;
      if (o.skill === 'woodcutting') { px = o.x + v; py = o.y + Math.sin(step) * 3; } else { py = o.y + v; px = o.x + Math.sin(step) * 3; }
    }
    fire('pointermove', px, py);
    step++;
    if (S.autoAttack) armed = true;
    const ex = S._extraction;
    if (ex) maxProg = Math.max(maxProg, ex.progress || 0);
    if (!ex || ex.status !== 'ready') break;
  }
  return { steps: step, armed, maxProg: +maxProg.toFixed(2), after: S._extraction ? S._extraction.status : 'gone' };
}, { skill, x, y, pointerType, onCanvas, ms, offX, pointerId });

export async function run({ browser, wsPort, webPort, rec }) {
  /* ═══ A COMPUTER ═══ */
  const P = await H.newPlayer(browser, { name: 'Deskhand', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  const used = [];
  try {
    const { myId, inW } = await arrive(P, wsPort);
    rec.ok('a computer is in the Wheel with its tools (guard)', !!inW && await P.page.evaluate(() => matchMedia('(pointer:fine)').matches), inW);

    /* ── 1. a tree, by E held ── */
    {
      const node = await nearest(P, 'tree', used);
      used.push(node && node.id);
      await H.hopTo(P, node.x + STAND.tree[0], node.y + STAND.tree[1]);
      await P.page.waitForTimeout(1500);
      const before = sumPrefix(await srvInv(wsPort, myId), RES.tree);
      await P.page.keyboard.down('e');
      const st0 = await H.readState(P, (S) => (S._extraction ? { skill: S._extraction.skill, at: S._extraction.startedAt, seq: S._extraction.hits && S._extraction.hits.seq } : null));
      /* a second press in the wind-up -- the keyup and keydown of a fresh tap */
      await P.page.waitForTimeout(400);
      await P.page.keyboard.up('e');
      await P.page.keyboard.down('e');
      const st1 = await H.readState(P, (S) => (S._extraction ? { at: S._extraction.startedAt, seq: S._extraction.hits && S._extraction.hits.seq, status: S._extraction.status } : null));
      rec.ok('1. E starts chopping, and a second press in the wind-up does not start it over (same attempt, same hits)',
        !!st0 && st0.skill === 'woodcutting' && !!st1 && st1.at === st0.at && st1.seq === st0.seq, { st0, st1 });
      /* E is still held: through the wind-up, and then it works the gesture
         to the end the moment the window opens */
      const sawReady = await P.page.evaluate(async () => {
        const S = window._gameState.current;
        for (let i = 0; i < 1200; i++) {
          const ex = S._extraction;
          if (!ex) return false;
          if (ex.status === 'ready') return true;
          await new Promise((res) => setTimeout(res, 50));
        }
        return false;
      });
      const done = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : 'gone'), (v) => v === 'gone',
        { timeout: 40000, label: 'held E finishes it' }).catch(() => 'timeout');
      await P.page.keyboard.up('e');
      const got = await paidSince(P, wsPort, myId, RES.tree, before);
      rec.ok(`1. the held E waits through the wind-up, works the gesture to the end and the worker pays the log (+${got})`, sawReady && done === 'gone' && got === 1, { sawReady, done, got });
    }

    /* ── 2. a copper vein, by the mouse on the world ── */
    {
      const node = await nearest(P, 'oreVein', used);
      used.push(node && node.id);
      await H.hopTo(P, node.x + STAND.oreVein[0], node.y + STAND.oreVein[1]);
      await P.page.waitForTimeout(1500);
      const before = sumPrefix(await srvInv(wsPort, myId), RES.oreVein);
      await P.page.keyboard.press('e');
      const r = await ready(P);
      const look = r === 'ready' ? await deskLook(P) : null;
      rec.ok('2. a tap of E starts mining; at the window the line reads "Drag ↕ or hold E"', r === 'ready' && !!look && look.hint && look.hint.shown && look.hint.text === 'Drag ↕ or hold E', { r, look });
      /* a REAL press on the world, beside the figure and well away from the button */
      const at = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        const x = cv.left + (S.player.x - S.camera.x) * S._worldScaleX - 70;
        const y = cv.top + (S.player.y - S.camera.y) * S._worldScaleY - 30;
        const top = document.elementFromPoint(x, y);
        return { x: Math.round(x), y: Math.round(y), top: top ? top.tagName + '.' + top.className : null };
      });
      await P.page.evaluate(() => { window.__dhArmed = false; const S = window._gameState.current; S._touchHandledAt = 0; });
      await P.page.mouse.move(at.x, at.y);
      await P.page.mouse.down();
      const h0 = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest() : null));
      const g = await gestureIn(P, { skill: 'mining', x: at.x, y: at.y, pointerType: 'mouse', onCanvas: true, pointerId: h0 ? h0.pointerId : null });
      await P.page.mouse.up();
      await P.page.waitForTimeout(500);
      const afterUp = await H.readState(P, (S) => ({ ex: S._extraction ? S._extraction.status : null, auto: !!S.autoAttack,
        lock: !!(S.lockedTarget && S.lockedTarget.ref), handled: S._touchHandledAt ? Date.now() - S._touchHandledAt : null }));
      const got = await paidSince(P, wsPort, myId, RES.oreVein, before);
      rec.ok(`2. a real mouse press on the world (it lands on ${at.top}) takes the gesture as a mouse's, anywhere`,
        /^CANVAS/.test(at.top || '') && !!h0 && h0.pressed && h0.free === true, { at, h0 });
      rec.ok(`2. dragged up and down it finishes the mining and the worker pays the ore (+${got})`, g.after === 'gone' && got >= 1, { g, got });
      rec.ok('2. the press never armed an attack, and the click it ended with was swallowed (no lock, no new harvest)',
        g.armed === false && !afterUp.auto && !afterUp.lock && afterUp.ex == null && afterUp.handled != null && afterUp.handled < 3000, { g, afterUp });
    }

    /* ── 3. a minnow spot, by the mouse circling away from the button ── */
    {
      const node = await nearest(P, 'fishSpot', used);
      used.push(node && node.id);
      await H.hopTo(P, node.x + STAND.fishSpot[0], node.y + STAND.fishSpot[1]);
      await P.page.waitForTimeout(1500);
      const before = sumPrefix(await srvInv(wsPort, myId), RES.fishSpot);
      await P.page.keyboard.press('e');
      const r = await ready(P);
      const look = r === 'ready' ? await deskLook(P) : null;
      const at = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        return { x: Math.round(cv.left + (S.player.x - S.camera.x) * S._worldScaleX - 90), y: Math.round(cv.top + (S.player.y - S.camera.y) * S._worldScaleY - 60) };
      });
      await P.page.mouse.move(at.x, at.y);
      await P.page.mouse.down();
      const h3 = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest() : null));
      const g = await gestureIn(P, { skill: 'fishing', x: at.x, y: at.y, pointerType: 'mouse', onCanvas: true, offX: 50, pointerId: h3 ? h3.pointerId : null });
      await P.page.mouse.up();
      const got = await paidSince(P, wsPort, myId, RES.fishSpot, before);
      rec.ok(`3. fishing: "Circle ↻ or hold E", and the mouse circling on the world, away from the button, reels it in (+${got})`,
        r === 'ready' && !!look && look.hint && look.hint.text === 'Circle ↻ or hold E' && g.after === 'gone' && got >= 1, { r, look, g, got });
    }

    /* ── 4. the fallback anchor ── */
    {
      const node = await nearest(P, 'tree', used);
      used.push(node && node.id);
      await H.hopTo(P, node.x + STAND.tree[0], node.y + STAND.tree[1]);
      await P.page.waitForTimeout(1500);
      await P.page.keyboard.press('e');
      const r = await ready(P);
      const look = r === 'ready' ? await deskLook(P) : null;
      rec.ok('4. at a tree\'s window the right button is on the computer\'s screen, in the game\'s column, with "Drag ↔ or hold E" over it',
        r === 'ready' && !!look && !!look.zone && look.zone.shown && look.zone.inColumn && !!look.hint && look.hint.shown && look.hint.text === 'Drag ↔ or hold E',
        { r, look });
      /* v2.3.3399: on a laptop's 419 px column the keys strip's rows lay over
         the button's left half ("X Jump" on CHOP, the UI review's laptop
         view): it stands aside while a harvest's button is up */
      const clear = await P.page.evaluate(() => {
        const z = document.querySelector('.bt-rjoy-zone[data-harvest="1"]');
        const strip = document.querySelector('.bt-kb-hints');
        if (!z) return null;
        const b = z.getBoundingClientRect();
        const hits = [0.25, 0.5, 0.75].map((f) => {
          const el = document.elementFromPoint(b.left + b.width * f, b.top + b.height / 2);
          return !!(el && z.contains(el));
        });
        return { strip: strip ? getComputedStyle(strip).display : 'gone', hits };
      });
      rec.ok('4. ...and the keys strip stands aside while it is up: a click anywhere across the button reaches it',
        !!clear && (clear.strip === 'none' || clear.strip === 'gone') && clear.hits.every(Boolean), clear);
      const fb = await P.page.evaluate(async () => {
        const st = document.createElement('style');
        st.textContent = 'html body .bt-rjoy-zone[data-harvest]{display:none!important}';   /* out-ranks game.css's own [data-harvest] rule */
        document.head.appendChild(st);
        await new Promise((res) => requestAnimationFrame(() => res()));
        const S = window._gameState.current;
        const cue = window.__btHarvest ? window.__btHarvest().cue : null;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        const px = cv.left + (S.player.x - S.camera.x) * S._worldScaleX;
        st.remove();
        return { cue, cv: { l: Math.round(cv.left), r: Math.round(cv.right) }, px: Math.round(px) };
      });
      rec.ok(`4. with the button hidden the gesture's anchor is the figure, inside the game's column (x ${fb.cue && Math.round(fb.cue.x)} in ${fb.cv.l}..${fb.cv.r}), not the margin`,
        r === 'ready' && !!fb.cue && fb.cue.on === 'player' && fb.cue.x > fb.cv.l && fb.cue.x < fb.cv.r && Math.abs(fb.cue.x - fb.px) < 2, fb);
      await P.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
    }
    rec.ok('the computer: no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* ═══ 5. A PHONE HELD SIDEWAYS, UNCHANGED ═══ */
  const L = await H.newPlayer(browser, { name: 'Sidehand', wsPort, webPort, viewport: LAND, touch: true, world: 'wheel' });
  const lerr = [];
  L.page.on('pageerror', (e) => lerr.push(String((e && e.message) || e).slice(0, 200)));
  const stopL = H.keepAlive(L, 15000);
  try {
    const { myId } = await arrive(L, wsPort);
    const node = await nearest(L, 'tree', []);
    await H.hopTo(L, node.x + STAND.tree[0], node.y + STAND.tree[1]);
    await L.page.waitForTimeout(2500);
    const before = sumPrefix(await srvInv(wsPort, myId), RES.tree);
    const disc = await L.page.evaluate(() => {
      const el = document.querySelector('.bt-rjoy-base');
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, onTop: !!(top && (top === el || el.contains(top))),
        label: (document.querySelector('.bt-rjoy-label') || {}).textContent };
    });
    await L.page.touchscreen.tap(disc.x, disc.y);
    await L.page.waitForTimeout(600);
    const started = await H.readState(L, (S) => (S._extraction ? S._extraction.skill : null));
    rec.ok(`5. sideways: a real tap on the ${disc.label} button (${Math.round(disc.w)} px, on top) starts chopping`, disc.onTop && started === 'woodcutting', { disc, started });
    const r = await ready(L);
    const hint = await L.page.evaluate(() => { const h = document.querySelector('.bt-rjoy-deskhint'); return h ? getComputedStyle(h).display : 'missing'; });
    rec.ok('5. at the window the computer\'s line is not shown on a phone', r === 'ready' && hint === 'none', { r, hint });
    /* a finger on the WORLD, away from the button: not the gesture (the phone's rule: on the button) */
    const off = await L.page.evaluate(() => {
      const S = window._gameState.current;
      const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
      return { x: Math.round(cv.left + (S.player.x - S.camera.x) * S._worldScaleX - 80), y: Math.round(cv.top + (S.player.y - S.camera.y) * S._worldScaleY) };
    });
    await L.page.evaluate(([x, y]) => document.querySelector('canvas.brotown-canvas').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: x, clientY: y, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true })), [off.x, off.y]);
    const g0 = await gestureIn(L, { skill: 'woodcutting', x: off.x, y: off.y, pointerType: 'touch', onCanvas: true, ms: 1500 });
    await L.page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, clientX: x, clientY: y, pointerType: 'touch', bubbles: true })), [off.x, off.y]);
    rec.ok('5. a finger chopping on the world, not the button, does not work the gesture on a phone', g0.maxProg === 0 && g0.after === 'ready', g0);
    await L.page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: x, clientY: y, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true })), [disc.x, disc.y]);
    const g = await gestureIn(L, { skill: 'woodcutting', x: disc.x, y: disc.y, pointerType: 'touch', onCanvas: false });
    await L.page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, clientX: x, clientY: y, pointerType: 'touch', bubbles: true })), [disc.x, disc.y]);
    const got = await paidSince(L, wsPort, myId, RES.tree, before);
    rec.ok(`5. a finger chopping on the button finishes it and the worker pays (+${got})`, g.after === 'gone' && got >= 1, { g, got });
    rec.ok('sideways: no page errors', lerr.length === 0, lerr.slice(0, 4));
  } finally {
    stopL();
    await L.ctx.close().catch(() => {});
  }
}
