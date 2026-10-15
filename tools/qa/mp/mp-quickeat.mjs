/* ═══ QUICK EAT, ON A PHONE (v2.3.3258, docs/specs/pvp-fights.md "Quick eat") ═══
 *
 * Owner: "The idea is that fishing becomes a valuable skill because they can
 * use it during "no man's land" combat ..." -- eating from the bag took four
 * to six seconds of taps, longer than most fights.  One button over the
 * movement stick eats the right fish in one tap (src/game/quickEat.js,
 * src/ui/panels/QuickEatButton.jsx).  A real phone, a real worker:
 *
 *   1. with fish in the bag and a full bar, no button;
 *   2. hurt by 50: the button, over the movement stick in the left cluster's
 *      second place, inside the left half, above the dashboard and clear of
 *      every other control; the MINNOW (it fills the 50), the bag's picture,
 *      how many;
 *   3. a tap: the WORKER heals 100 and takes one minnow; full again, the
 *      button goes;
 *   4. hurt to 1 HP: the minnow cannot fill it, so the TROUT;
 *   5. in a fight with a player (the page's own record of a hit, as a pvp_hit
 *      writes it), hurt by 50: a bite heals a quarter, so the trout (57), not
 *      the minnow (25); after a bite the one-bite rule's wait rides on it as
 *      its ring;
 *   6. V on a keyboard eats too;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/quickeat-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const btn = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-quickeat-btn');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const img = el.querySelector('img');
  const n = el.querySelector('[data-quickeat-count]');
  return { key: el.getAttribute('data-quickeat'), wait: +el.getAttribute('data-wait') || 0,
    l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width,
    img: img ? img.getAttribute('src') : null, count: n ? n.textContent : null,
    state: (el.querySelector('.bt-skin') || {}).getAttribute ? el.querySelector('.bt-skin').getAttribute('data-state') : null };
});
const serverHp = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id);
  /* the admin view's `live` has no maxHp: the saved blob's is the worker's */
  return { hp: a && a.live ? a.live.hp : null, max: a && a.rpg ? a.rpg.maxHp : null, inv: (a && a.rpg && a.rpg.inventory) || {} };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Angler', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1 });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  const id = await H.readState(P, (S) => S.myId);
  let alive = true;
  const keep = (async () => { while (alive) { await P.page.keyboard.press('Control').catch(() => {}); await P.page.waitForTimeout(20000); } })();
  const done = async () => { alive = false; await keep.catch(() => {}); await P.ctx.close().catch(() => {}); };
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, caps: !!(S._serverCaps && S._serverCaps.fishheal) }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel, and the worker advertises caps.fishheal (guard)', !!inWheel && inWheel.caps, inWheel);
  if (!inWheel) { await done(); return; }
  await H.devOp(wsPort, 'quests', id);
  await H.grant(wsPort, id, 'item', { invKey: 'cooked_fish_minnow', count: 3 });
  await H.grant(wsPort, id, 'item', { invKey: 'cooked_fish_trout', count: 2 });
  await H.devOp(wsPort, 'vitals', id, { heal: true });
  await P.page.waitForTimeout(2000);

  /* ── 1. full: nothing to eat for ── */
  const full = await btn(P);
  const bag = await H.readState(P, (S) => ({ m: (S.rpg.inventory || {}).cooked_fish_minnow || 0, t: (S.rpg.inventory || {}).cooked_fish_trout || 0, hp: S.rpg.hp, max: S.rpg.maxHp }));
  rec.ok(`1. fish in the bag (${bag.m} minnows, ${bag.t} trout) and a full bar: no button`, !full && bag.m === 3 && bag.t === 2 && bag.hp >= bag.max, { full, bag });

  /* ── 2. hurt by 50: the minnow ── */
  const s0 = await serverHp(wsPort, id);
  await H.devOp(wsPort, 'vitals', id, { heal: false, hp: s0.max - 50 });
  const b2 = await H.waitFor(P, () => {
    const el = document.querySelector('.bt-quickeat-btn');
    return el ? el.getAttribute('data-quickeat') : null;
  }, (k) => !!k, { timeout: 8000, label: 'the button' }).catch(() => null);
  const B2 = await btn(P);
  const why2 = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg || {};
    return { hp: R.hp, max: R.maxHp, m: (R.inventory || {}).cooked_fish_minnow, t: (R.inventory || {}).cooked_fish_trout,
      probe: typeof window.__btQuickEat, view: window.__btQuickEat ? window.__btQuickEat() : 'no probe',
      touch: !!document.querySelector('.bt-sprint-btn'), desktopHide: getComputedStyle(document.body).getPropertyValue('--x') };
  });
  rec.ok(`2. hurt by 50: the button, and it offers the MINNOW (fills the 50) -- ${B2 && B2.key}`, b2 === 'cooked_fish_minnow' && !!B2, { B2, why2 });
  if (!B2) { await done(); return; }
  rec.ok('2. ...its bag picture and how many you carry', !!B2 && /cooked-minnow/.test(B2.img || '') && B2.count === '3', B2);
  const L = await P.page.evaluate(() => {
    const band = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet-h')) || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 0;
    const boxes = [...document.querySelectorAll('.bt-sprint-btn, .bt-burst-btn, .bt-jump-btn, .bt-rjoy-base, [data-disc], [data-nml-badge], .bt-ability-btn, .bt-special-btn')]
      .map((e) => { const r = e.getBoundingClientRect(); return { c: e.className || e.getAttribute('data-disc'), l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width }; })
      .filter((x) => x.w > 0);
    return { band, vh: innerHeight, vw: innerWidth, boxes };
  });
  const overlaps = B2 ? L.boxes.filter((x) => x.l < B2.r && x.r > B2.l && x.t < B2.b && x.b > B2.t) : [];
  rec.ok(`2. ...over the movement stick: inside the left half (${B2 && Math.round(B2.l)}-${B2 && Math.round(B2.r)} of ${L.vw}), above the dashboard, ${B2 && Math.round(B2.w)} px`,
    !!B2 && B2.r <= L.vw / 2 && B2.b <= L.vh - L.band && B2.w >= 44, { B2, band: L.band });
  rec.ok(`2. ...clear of every other control (${overlaps.length} overlap)`, overlaps.length === 0, overlaps);
  await P.page.screenshot({ path: join(OUT, 'quickeat-2-minnow.png') });

  /* ── 3. a tap: the worker eats it ── */
  const before = await serverHp(wsPort, id);
  await P.page.touchscreen.tap((B2.l + B2.r) / 2, (B2.t + B2.b) / 2);
  let after = before;
  for (let i = 0; i < 16; i++) { await P.page.waitForTimeout(300); after = await serverHp(wsPort, id); if ((after.inv.cooked_fish_minnow || 0) < (before.inv.cooked_fish_minnow || 0)) break; }
  rec.ok(`3. a tap: the WORKER heals (${before.hp} -> ${after.hp}) and takes one minnow (${before.inv.cooked_fish_minnow} -> ${after.inv.cooked_fish_minnow})`,
    after.hp > before.hp && (after.inv.cooked_fish_minnow || 0) === (before.inv.cooked_fish_minnow || 0) - 1, { before, after });
  await P.page.waitForTimeout(600);
  rec.ok('3. ...full again, the button goes', !(await btn(P)), await btn(P));

  /* ── 4. hurt to 1: nothing small fills it, so the trout ── */
  await H.devOp(wsPort, 'vitals', id, { heal: false, hp: 1 });
  const b4 = await H.waitFor(P, () => { const el = document.querySelector('.bt-quickeat-btn'); return el ? el.getAttribute('data-quickeat') : null; },
    (k) => !!k, { timeout: 8000, label: 'the button again' }).catch(() => null);
  const s4 = await serverHp(wsPort, id);
  rec.ok(`4. at 1 HP of ${s4.max} the minnow (100) cannot fill it: the TROUT -- ${b4}`, b4 === 'cooked_fish_trout', { b4, s4 });
  await P.page.screenshot({ path: join(OUT, 'quickeat-4-trout.png') });

  /* ── 5. in a fight with a player: a quarter heal ── */
  await H.devOp(wsPort, 'vitals', id, { heal: false, hp: s4.max - 50 });
  await P.page.waitForTimeout(1200);
  const pick5 = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._pvpAt = Date.now();   /* as a pvp_hit for this player writes it (fightFood.js notePvpHit) */
    return window.__btQuickEat ? window.__btQuickEat() : null;
  });
  await P.page.waitForTimeout(400);
  const B5 = await btn(P);
  rec.ok(`5. in a fight with a player, hurt by 50: a bite heals a quarter, so the TROUT (${pick5 && pick5.heal}), not the minnow (25) -- ${B5 && B5.key}`,
    !!pick5 && pick5.key === 'cooked_fish_trout' && pick5.heal === 57 && !!B5 && B5.key === 'cooked_fish_trout', { pick5, B5 });
  await P.page.evaluate(() => { const S = window._gameState.current; S._pvpAt = Date.now(); S._instantHealAt = Date.now(); });
  await P.page.waitForTimeout(500);
  const B5w = await btn(P);
  rec.ok(`5. ...after a bite the one-bite rule's wait rides on it: its ring, ${B5w && B5w.wait} s`,
    !!B5w && B5w.wait >= 13 && B5w.wait <= 15 && B5w.state === 'cooldown', B5w);
  await P.page.screenshot({ path: join(OUT, 'quickeat-5-wait.png') });
  await P.page.evaluate(() => { const S = window._gameState.current; S._pvpAt = 0; S._instantHealAt = 0; });

  /* ── 6. V on a keyboard ── */
  await P.page.waitForTimeout(600);
  const b6 = await serverHp(wsPort, id);
  await P.page.keyboard.press('v');
  let a6 = b6;
  for (let i = 0; i < 16; i++) { await P.page.waitForTimeout(300); a6 = await serverHp(wsPort, id); if (a6.hp > b6.hp) break; }
  rec.ok(`6. V eats too (${b6.hp} -> ${a6.hp})`, a6.hp > b6.hp, { b6, a6 });

  rec.ok('7. no page errors', errors.length === 0, errors);
  await done();
}
