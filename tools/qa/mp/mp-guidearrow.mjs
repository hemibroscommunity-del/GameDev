/* ═══ A BIG ARROW SHOWS WHERE TO GO, THE FIRST TIME (v2.3.3925) ═══
 *
 * The owner, 2026-11-02: "The first time you get handed a weapon put an arrow
 * pointing to either the bag dashboard button or the weapon if the dashboard
 * is already open. The flashing light isn't obvious enough."
 * (src/ui/guideArrow.js; the points half is mp-pointstips' steps 2-5.)
 *
 * In the world's BroTown, an upright phone (390 x 844, real fingers) and a
 * computer (wide, real clicks):
 *   1. a new character, no weapon handed over yet: no arrow;
 *   2. Mayor Bro's first quest taken, its sword and shield in the bag: the
 *      big arrow comes up and points at where the glow is (gearFlash's
 *      target: the fold handle, the Gear button or the weapon's tile) -- its
 *      tip at the element's edge, over its middle -- with words that say
 *      "tap" on the phone and "click" on the computer, inside the screen;
 *   3. following it with a finger (a click) on what it points at, it moves
 *      to each next step and ends on the weapon's tile;
 *   4. the sword and the shield worn: the arrow goes, and is marked done;
 *   5. a reload: no arrow again for this character;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/guidearrow-<view>-<step>.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEWS = [
  { id: 'phone', opts: { viewport: { width: 390, height: 844 }, touch: true } },
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true } },
];

const arrow = (P) => P.page.evaluate(() => {
  const g = window.__btGuideArrow;
  const el = document.querySelector('[data-guide-arrow]');
  if (!g) return null;
  return { lesson: g.lesson, sel: g.sel, side: g.side, rect: g.rect, target: g.target, n: g.n, done: g.done,
    el: !!el, words: el ? (el.textContent || '').trim() : null, events: el ? getComputedStyle(el).pointerEvents : null,
    /* its words inside the screen */
    wordsIn: (() => { const w = el && el.lastElementChild; if (!w) return null; const r = w.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })(),
    count: document.querySelectorAll('[data-guide-arrow]').length,
    all: Array.from(document.querySelectorAll('[data-guide-arrow]')).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), e.style.left, e.style.top, e.isConnected]; }),
    wordsBox: (() => { const w = el && el.lastElementChild; if (!w) return null; const r = w.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), innerWidth, innerHeight]; })() };
});
/* the element the arrow names, as drawn now */
const rectOf = (P, sel) => P.page.evaluate((s) => {
  for (const el of Array.from(document.querySelectorAll(s))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  return null;
}, sel);
/* the arrow's tip over the element's middle and at its edge (above: its
   bottom at the element's top; below: its top at the element's bottom) */
const pointsAt = (a, r) => {
  if (!a || !a.rect || !r) return false;
  const tipX = a.rect.left + a.rect.w / 2, cx = r.left + r.width / 2;
  const nearX = Math.abs(tipX - cx) <= Math.max(6, r.width / 2) || (a.rect.left <= 4 && cx < a.rect.w);
  const edge = a.side === 'above' ? Math.abs(a.rect.top + a.rect.h - r.top) : Math.abs(a.rect.top - (r.top + r.height));
  return nearX && edge <= 14;
};
async function waitArrow(P, want, ms = 12000) {
  let a = null;
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    a = await arrow(P);
    /* settled: read again after its 0.2 s glide to a new spot */
    if (want(a)) { await P.page.waitForTimeout(600); const b = await arrow(P); return want(b) ? b : a; }
    await P.page.waitForTimeout(250);
  }
  return a;
}
/* a real finger (or click) on the middle of what the arrow names */
async function press(P, sel, touch) {
  const at = await rectOf(P, sel);
  if (!at) return false;
  const x = Math.round(at.left + at.width / 2), y = Math.round(at.top + at.height / 2);
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(700);
  return true;
}
const TILE = /data-gear/;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  for (const V of VIEWS.filter((v) => !process.env.BT_GA_ONLY || v.id === process.env.BT_GA_ONLY)) {
    const touch = !!V.opts.touch;
    const P = await H.newPlayer(browser, { name: 'Arrow' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', ...V.opts });
    const shot = (name) => P.page.screenshot({ path: join(OUT, `guidearrow-${V.id}-${name}.png`) }).catch(() => {});
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });
      await H.pastWelcome(P).catch(() => {});
      /* the coach's cards out of the pictures (their rings are not the arrow) */
      await P.page.addStyleTag({ content: '[data-coach-card], [data-coach-ring], .bt-quest-banner { visibility: hidden !important; }' }).catch(() => {});
      await P.page.waitForTimeout(2500);

      /* 1. no weapon handed over: no arrow */
      const a1 = await arrow(P);
      rec.ok(`${V.id} 1. a new character, no weapon handed over yet: no arrow`, !!a1 && !a1.lesson && !a1.el, a1);

      /* 2. the first quest taken: its sword and shield in the bag */
      await P.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
      await H.waitFor(P, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1 taken' }).catch(() => null);
      await H.closeNpcDialogue(P).catch(() => {});
      const a2 = await waitArrow(P, (a) => !!a && a.lesson === 'weapon' && a.el);
      const r2 = a2 && a2.sel ? await rectOf(P, a2.sel) : null;
      await shot('2-weapon');
      const allowed = /data-dash-fold|data-land-fold|data-nav="dashboard"|data-gear/;
      rec.ok(`${V.id} 2. the sword and shield handed over: the arrow points at ${a2 && a2.sel} ("${a2 && a2.words}")`,
        !!a2 && a2.lesson === 'weapon' && allowed.test(a2.sel || '') && pointsAt(a2, r2) && a2.events === 'none'
          && (touch ? /^Tap/.test(a2.words || '') : /^Click/.test(a2.words || '')) && a2.wordsIn === true && a2.count === 1, { a2, r2 });

      /* 3. followed: each press moves it on, to the weapon's tile */
      const path = [a2 && a2.sel];
      let a3 = a2;
      for (let k = 0; k < 4 && a3 && a3.sel && !TILE.test(a3.sel); k++) {
        await press(P, a3.sel, touch);
        const before = a3.sel;
        a3 = await waitArrow(P, (a) => !!a && a.lesson === 'weapon' && !!a.sel && a.sel !== before, 6000);
        path.push(a3 && a3.sel);
      }
      const r3 = a3 && a3.sel ? await rectOf(P, a3.sel) : null;
      await shot('3-tile');
      rec.ok(`${V.id} 3. followed with a ${touch ? 'finger' : 'click'}, it moves on each step and ends on the weapon's tile (${path.join(' -> ')})`,
        !!a3 && TILE.test(a3.sel || '') && pointsAt(a3, r3) && a3.wordsIn === true && a3.count === 1, { path, a3, r3 });

      /* 4. the sword and the shield worn: gone, and done */
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee')   /* the first quest's is a greatsword */.catch(() => null);
      await P.page.evaluate(() => {
        const S = window._gameState.current, R = S && S.rpg;
        if (!R || R.shield || !Array.isArray(R.shieldStash) || !R.shieldStash.length) return;
        const sh = R.shieldStash.shift();
        R.shield = sh;
        if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
          const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid } : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
          try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* the next change reports it */ }
        }
      });
      const a4 = await waitArrow(P, (a) => !!a && !a.el && a.done && a.done.weapon === 1, 10000);
      await shot('4-worn');
      rec.ok(`${V.id} 4. the sword and the shield worn: the arrow is gone, and the lesson marked done`, !!a4 && !a4.el && !!a4.done && a4.done.weapon === 1, a4);

      /* 5. a reload: not again for this character */
      await P.page.reload();
      await H.enterWorld(P);
      await P.page.waitForTimeout(4000);
      const a5 = await arrow(P);
      rec.ok(`${V.id} 5. after a reload, no arrow again for this character`, !!a5 && !a5.el && !!a5.done && a5.done.weapon === 1, a5);
      rec.ok(`${V.id} 6. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
