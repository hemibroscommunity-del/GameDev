/* ═══ v2.3.3877: "SWAP WEAPONS", SAID ONCE ═══
 *
 * The owner: "it might be good somehow to bring more attention to how to swap
 * weapons because I completely forgot about it and nothing said anything to me
 * about swapping weapons" (ui/SwapHint.jsx).  A new character in the world:
 *   computer (wide): handed a second weapon (the bow, as Mayor Bro's first
 *     hand-in does), the callout says "Swap weapons: 1 Melee, 2 Bow, 3 Staff"
 *     over the three weapons; 2 swaps, it goes ('swap') and never returns;
 *   phone upright: "Tap a weapon to swap" over the weapon chip; left alone it
 *     goes after about 8 s ('time') and never returns.
 * Pictures: tools/qa/mp/out/swaphint-{desk,phone}.png.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const look = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-swap-hint]');
  const r = el ? el.getBoundingClientRect() : null;
  const q = window.__btSwapHint || {};
  const at = (sel) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
  const anchors = ['[data-desk-foot] [data-rail-weapon]', '[data-dash-desk-combat]', '[data-rail-weapon]', '[data-weapon-chip]'].map(at).find((l) => l.length) || [];
  const top = anchors.length ? Math.min(...anchors.map((b) => b.top)) : null;
  const S = window._gameState.current;
  return { text: el ? el.textContent : null, box: r ? { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) } : null,
    anchorTop: top, shown: q.shown || 0, why: q.why || null, slot: S.rpg && S.rpg.activeSlot,
    told: (() => { try { return localStorage.getItem('bt_swaphint_' + S.myId); } catch (e) { return null; } })() };
});
async function setup(P) {
  await H.enterWorld(P);
  const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  if (!inW) return null;
  const id = await H.readState(P, (S) => S.myId);
  return id;
}
async function secondWeapon(P, wsPort, id) {
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => {});
  for (let i = 0; i < 20; i++) {
    await P.page.waitForTimeout(400);
    const n = await P.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return (R.rangedWeapon ? 1 : 0) + 1; });
    if (n >= 2) return true;
    await H.equipWeapon(P, 'bow', 'rangedWeapon', 'melee').catch(() => null);
  }
  return false;
}
async function waitHint(P, ms) {
  let v = await look(P);
  for (let t0 = Date.now(); !v.text && Date.now() - t0 < ms;) { await P.page.waitForTimeout(150); v = await look(P); }
  return v;
}
export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  /* the computer */
  const B = await H.newPlayer(browser, { name: 'DeskSwap', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true });
  try {
    const id = await setup(B);
    rec.ok('desk: in the world (guard)', !!id);
    if (!id) return;
    const pre = await look(B);
    rec.ok(`desk: one weapon, no callout (${pre.text})`, !pre.text, pre);
    const two = await secondWeapon(B, wsPort, id);
    const v1 = await waitHint(B, 6000);
    await B.page.screenshot({ path: join(OUT, 'swaphint-desk.png') }).catch(() => {});
    rec.ok(`desk: handed a second weapon (${two}), the callout "${v1.text}" stands over the weapons (its foot ${v1.box && v1.box.b}, theirs ${v1.anchorTop})`,
      two && /Swap weapons: 1 Melee, 2 Bow, 3 Staff/.test(v1.text || '') && !!v1.box && v1.anchorTop != null && v1.box.b <= v1.anchorTop, v1);
    await B.page.keyboard.press('2');
    await B.page.waitForTimeout(800);
    const v2 = await look(B);
    await B.page.waitForTimeout(9000);
    const v3 = await look(B);
    rec.ok(`desk: 2 swaps (${v2.slot}), the callout goes (${v2.why}) and never returns (${v3.text}, shown ${v3.shown}, saved ${v3.told})`,
      v2.slot === 'ranged' && !v2.text && v2.why === 'swap' && !v3.text && v3.shown === 1 && v3.told === '1', { v2, v3 });
  } finally { await B.ctx.close().catch(() => {}); }
  /* the phone, left alone */
  const A = await H.newPlayer(browser, { name: 'PhoneSwap', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    const id = await setup(A);
    rec.ok('phone: in the world (guard)', !!id);
    if (!id) return;
    const two = await secondWeapon(A, wsPort, id);
    const v1 = await waitHint(A, 6000);
    await A.page.screenshot({ path: join(OUT, 'swaphint-phone.png') }).catch(() => {});
    rec.ok(`phone: the callout "${v1.text}" stands over the weapon chip (its foot ${v1.box && v1.box.b}, the chip's top ${v1.anchorTop})`,
      two && /Tap a weapon to swap/.test(v1.text || '') && !!v1.box && v1.anchorTop != null && v1.box.b <= v1.anchorTop, v1);
    const t0 = Date.now();
    let v2 = await look(A);
    while (v2.text && Date.now() - t0 < 14000) { await A.page.waitForTimeout(250); v2 = await look(A); }
    const gone = Date.now() - t0;
    await A.page.waitForTimeout(4000);
    const v3 = await look(A);
    rec.ok(`phone: left alone it goes after about 8 s (${Math.round(gone / 100) / 10} s more, ${v2.why}) and never returns (${v3.text}, saved ${v3.told})`,
      !v2.text && v2.why === 'time' && gone < 10000 && !v3.text && v3.told === '1', { v2, v3, gone });
  } finally { await A.ctx.close().catch(() => {}); }
}
