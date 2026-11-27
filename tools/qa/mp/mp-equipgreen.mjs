/* ═══ v2.3.6698: GEAR'S EQUIPPED PANEL IN PALE GREEN, ITS PICTURES FILLING THEIR SLOTS (card UI2-equipgreen) ═══
 *
 * The owner, 2026-11-27, on an iPhone: "Also on equipped page might the
 * background color a pale green color and make the thumbnail icons fill each
 * slot better like the inventory icons do".  In the Wheel's BroTown, a
 * character with the dev kit's weapons worn (a greatsword, a bow, a staff)
 * (the tutorial's Pine Shield, asked for too, lands in the bag on this run), the
 * other six cells empty (their ghosts, unchanged):
 *
 *   375 x 667 upright (touch), the new look (no switch):
 *     1. Gear: the root wears data-equip-look; the Equipped panel's computed
 *        ground is the token's green (gearPanels.css --u2-gp-equip-ground);
 *        its label row's words at 4.5 to 1 or better on it; the Bag panel
 *        and its label row as under ?equiplook=0 (the green on one panel);
 *        every filled worn picture 94% of its slot (within a pixel), inside
 *        its slot's border;
 *     2. sideways (667 x 375): the same ground and pictures;
 *     3. Bro's Equipment showcase: its worn pictures 94%, its own ground
 *        (no green: the owner named the Gear page);
 *   ?equiplook=0 (yesterday's), 375 x 667 and sideways:
 *     4. no data-equip-look, the Equipped panel's ground the kit's well (not
 *        the green), the pictures 72%; the Bag panel the same as the new
 *        look's.
 *
 * Pictures (deviceScaleFactor 2) in docs/shots/: equipgreen-after.png,
 * equipgreen-after-sideways.png, equipgreen-showcase.png,
 * equipgreen-before.png, equipgreen-before-sideways.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
import { EQUIP_FILL, EQUIP_FILL_WAS, EQUIP_MIN_CONTRAST } from '../../../src/game/equipLook.js';

export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
/* the token, read from its sheet (one source) */
const GROUND = (/--u2-gp-equip-ground:\s*(#[0-9A-Fa-f]{6})/.exec(fs.readFileSync(path.join(ROOT, 'src/ui/mobile/dash/gearPanels.css'), 'utf8')) || [])[1] || null;
const rgbOf = (h) => (h ? `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})` : 'none');

/* where a thing is, waited for (the page held seconds at a time on this box: TRAPS §200) */
const centre = async (P, sel) => {
  let at = null;
  for (const t0 = Date.now(); !at && Date.now() - t0 < 15000;) {
    at = await P.page.evaluate((q) => { const el = document.querySelector(q); if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel).catch(() => null);
    if (!at) await P.page.waitForTimeout(250);
  }
  if (!at) throw new Error('no ' + sel);
  return at;
};
const tap = async (P, sel, ms = 600) => { const at = await centre(P, sel); await P.page.touchscreen.tap(at.x, at.y); await P.page.waitForTimeout(ms); };
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: Math.max(0, b.top - 60), w: b.width, h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top - 60) }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
/* the weapons worn; the Pine Shield asked for (devtools.js kit 'shield'), wherever it lands */
async function seed(P, wsPort, rec, tag) {
  const id = await H.readState(P, (S) => S.myId);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']).catch(() => null);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const r0 = await P.page.evaluate(() => !!(window._gameState.current.rpg || {}).weapon);
  if (!r0) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null); await P.page.waitForTimeout(1500); }
  await H.devOp(wsPort, 'kit', id, { what: 'shield' }).catch(() => null);
  await P.page.waitForTimeout(2500);
  const r = await P.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return { weapon: !!R.weapon, shield: !!R.shield }; });
  rec.ok(`${tag}: seeded (a weapon in hand)`, r.weapon, r);
}
const toGear = async (P) => {
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(500);
  await H.dashOpen(P, 'dashboard');
  await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.reset(); });
  await H.waitFor(P, () => !document.querySelector('[data-dash-grow]') && !!document.querySelector('[data-gear-ws] [data-gear-cell]'), (v) => v === true, { timeout: 15000, label: 'Gear drawn' }).catch(() => null);
  await P.page.waitForTimeout(800);
};
async function toShowcase(P) {
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; b.open('more'); b.go({ type: 'push', id: 'hero' }); });
  const settled = () => H.waitFor(P, () => !document.querySelector('[data-dash-grow]'), (v) => v === true, { timeout: 15000, label: 'the growing motion ends' }).catch(() => null);
  await settled();
  await tap(P, '[data-dash-grid="bro"] [data-dest="equipment"]', 1200);
  await H.waitFor(P, () => !!document.querySelector('[data-gear-showcase] [data-gear-cell]'), (v) => !!v, { timeout: 15000, label: 'the showcase' }).catch(() => null);
  await P.page.waitForTimeout(800);
  await settled();
}

/* in the page: the panels' grounds, the label rows' ink, and each filled worn picture against its slot */
function lookRead(rootSel) {
  const root = document.querySelector(rootSel);
  if (!root) return { there: false };
  const cs = (e) => (e ? getComputedStyle(e) : null);
  const pane = (w) => root.querySelector(`[data-ws-side="${w}"]`);
  const L = pane('left'), Rt = pane('right');
  const ground = (e) => { const s = cs(e); return s ? (s.backgroundImage + ' | ' + s.backgroundColor) : null; };
  const headInk = (e) => { const h = e && e.querySelector('.u2-pane-head'); return h ? cs(h).color : null; };
  const pics = Array.from(root.querySelectorAll('[data-gear-cell] .u2-slot')).map((sl) => {
    const img = sl.querySelector('img.u2-slot-art');
    if (!img) return null;
    const S = sl.getBoundingClientRect(), I = img.getBoundingClientRect();
    const bw = parseFloat(cs(sl).borderLeftWidth) || 0;
    const inner = { l: S.left + bw, t: S.top + bw, r: S.right - bw, b: S.bottom - bw };
    return {
      id: sl.closest('[data-gear-cell]').getAttribute('data-gear-cell'),
      fx: I.width / sl.clientWidth, iw: Math.round(I.width * 10) / 10, sw: sl.clientWidth,
      inside: I.left >= inner.l - 0.5 && I.right <= inner.r + 0.5 && I.top >= inner.t - 0.5 && I.bottom <= inner.b + 0.5,
      loaded: img.complete && img.naturalWidth > 0,
    };
  }).filter(Boolean);
  return {
    there: true, mark: root.getAttribute('data-equip-look'), short: root.getAttribute('data-gear-short') === '1',
    rootGround: ground(root), left: ground(L), right: ground(Rt), leftInk: headInk(L), rightInk: headInk(Rt), pics,
  };
}
const read = (P, sel = '[data-gear-ws]') => P.page.evaluate(lookRead, sel);
/* the contrast of two computed `rgb(...)` colours (WCAG) */
const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(String(c || '')); return m ? m[1].split(',').slice(0, 3).map((x) => Number(x.trim())) : null; };
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const A = parse(a), B = parse(b); if (!A || !B) return 0; const la = lum(A), lb = lum(B); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
/* each picture at `f` of its slot within a pixel (the slot's inner box), inside its border */
const picsAt = (s, f) => s.pics.length >= 3 && s.pics.every((p) => p.loaded && Math.abs(p.iw - f * p.sw) <= 1 && p.inside);
const picsWhy = (s) => s.pics.map((p) => ({ id: p.id, iw: p.iw, slot: p.sw, f: Math.round(p.fx * 1000) / 1000, inside: p.inside, loaded: p.loaded }));
const GREEN = rgbOf(GROUND);
const greenOn = (g) => !!g && g.includes(GREEN);

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  rec.ok('0. the token is in gearPanels.css (guard)', !!GROUND, { GROUND });
  let newLeft = null;

  /* ══ the new look ══ */
  const P = await H.newPlayer(browser, { name: 'Greenbro', wsPort, webPort, world: 'wheel', viewport: { width: 375, height: 667 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, 'new'))) return;
    await seed(P, wsPort, rec, 'new');
    await H.unfoldBand(P).catch(() => null);
    await toGear(P);
    const a = await read(P);
    newLeft = a.left;
    await bandShot(P, 'equipgreen-after.png');
    const k = contrast(a.rightInk, GREEN);
    rec.ok(`1a. 375x667: Gear's root wears data-equip-look; the Equipped panel's ground is the green (${GROUND}), the Bag panel's is not`,
      a.there && a.mark === '1' && greenOn(a.right) && !greenOn(a.left) && !greenOn(a.rootGround), { mark: a.mark, right: a.right, left: a.left });
    rec.ok(`1b. 375x667: the Equipped label row's words ${k.toFixed(2)} to 1 on the green (>= ${EQUIP_MIN_CONTRAST})`, k >= EQUIP_MIN_CONTRAST, { ink: a.rightInk, k });
    rec.ok(`1c. 375x667: every filled worn picture ${EQUIP_FILL * 100}% of its slot (within a pixel), inside its border`, picsAt(a, EQUIP_FILL), picsWhy(a));

    await P.page.setViewportSize({ width: 667, height: 375 });
    await P.page.waitForTimeout(1500);
    await toGear(P);
    const b = await read(P);
    await bandShot(P, 'equipgreen-after-sideways.png');
    rec.ok('2. 667x375 sideways: the green on the Equipped panel only, the pictures 94%', b.there && b.short && greenOn(b.right) && !greenOn(b.left) && picsAt(b, EQUIP_FILL),
      { short: b.short, right: b.right, left: b.left, pics: picsWhy(b) });

    await P.page.setViewportSize({ width: 375, height: 667 });
    await P.page.waitForTimeout(1500);
    await toShowcase(P);
    const c = await read(P, '[data-gear-showcase]');
    await bandShot(P, 'equipgreen-showcase.png');
    rec.ok('3. Bro\'s Equipment showcase: its worn pictures 94% (WornCell, shared), its own ground (no green, no mark)',
      c.there && picsAt(c, EQUIP_FILL) && !c.mark && !greenOn(c.rootGround), { mark: c.mark, ground: c.rootGround, pics: picsWhy(c) });
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ══ ?equiplook=0: yesterday's ══ */
  const O = await H.newPlayer(browser, { name: 'Greenold', wsPort, webPort, world: 'wheel', viewport: { width: 375, height: 667 }, touch: true, dpr: 2, query: 'equiplook=0' });
  try {
    if (!(await inWorld(O, rec, 'equiplook=0'))) return;
    await seed(O, wsPort, rec, 'equiplook=0');
    await H.unfoldBand(O).catch(() => null);
    await toGear(O);
    const o = await read(O);
    await bandShot(O, 'equipgreen-before.png');
    rec.ok('4a. ?equiplook=0, 375x667: no mark, the Equipped panel\'s ground the kit\'s well (not the green), the pictures 72%',
      o.there && !o.mark && !greenOn(o.right) && picsAt(o, EQUIP_FILL_WAS), { mark: o.mark, right: o.right, pics: picsWhy(o) });
    rec.ok('4b. ?equiplook=0: the Bag panel the same as under the new look (the switch changes the Equipped panel only)', !!newLeft && o.left === newLeft, { old: o.left, now: newLeft });
    await O.page.setViewportSize({ width: 667, height: 375 });
    await O.page.waitForTimeout(1500);
    await toGear(O);
    const o2 = await read(O);
    await bandShot(O, 'equipgreen-before-sideways.png');
    rec.ok('4c. ?equiplook=0, 667x375 sideways: no green, the pictures 72%', o2.there && !greenOn(o2.right) && picsAt(o2, EQUIP_FILL_WAS), { right: o2.right, pics: picsWhy(o2) });
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
