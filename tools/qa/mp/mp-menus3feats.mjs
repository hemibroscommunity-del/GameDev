/* ═══ v2.3.6868: WORLD · FEATS IN THE NEW PANEL, PLAYED (card MN step 9) ═══
 *
 * The owner's Feats (docs/design/menus3/; the card's step "World · Feats"):
 * World's Feats tab opens the new panel on Feats; the AP line; the rail
 * Medals | Titles | Records from the game's REAL lists; a medal's page with
 * Back and Equip (today's `achv_title`); Equip and Remove on a title's row;
 * the records; the AP's page; Ranks opens today's leaderboards.
 *
 *   1. UPRIGHT (390 x 844, touch), a character whose medals are on the
 *      worker's file (the owner's lever, /dev/achv: First Blood and Blooded;
 *      it pays nothing, so the AP line says the total alone): World, then
 *      its Feats tab, opens the panel on Feats, Medals first; every medal of
 *      the table a row, the two earned marked; every tappable thing 44+; a
 *      medal's page (Back in the header), its Equip -> the worker's answer
 *      wears it -> Back to Medals; Titles: the worn one, Remove -> none worn;
 *      Records: the four counters; the AP line -> its page -> Back; Ranks ->
 *      today's leaderboards; F opens nothing new (no key: a computer's);
 *   2. SIDEWAYS (844 x 390): the drawer 40% on the right on Feats; a medal's
 *      page inside it; every tappable thing 44+;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer on Feats; Esc
 *      closes it; F is still the Element Burst's (no panel opens).
 *
 * Measured from OUTSIDE the game (this test's evaluate).  Pictures
 * (deviceScaleFactor 1): tools/qa/out/menus3feats-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');
const MEDALS = ['first_blood', 'combat_10'];

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const count = (P, sel) => P.page.evaluate((s) => document.querySelectorAll(s).length, sel);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, depth: s.nav ? s.nav.length : 0, page: t ? t.page : null, rail: t ? t.rail : null, arg: t ? t.arg : null }; });
const probe = (P) => P.page.evaluate(() => window.__btMenus3Feats || null);
const worn = (P) => H.readState(P, (S) => (S._achv && S._achv.t) || null);
const bandTop = (P) => P.page.evaluate(() => { try { const n = window.__broDashPanelBus.nav(); const st = n[n.ws] || []; return { shown: !!n.shown, top: st.length ? st[st.length - 1].id : null }; } catch (e) { return null; } });
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button, [data-menus3-panel] a')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));

async function tap(P, sel, touch) {
  await P.page.evaluate((s) => { const el = document.querySelector(s); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, sel).catch(() => {});
  await P.page.waitForTimeout(250);
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(600);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3feats-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(2000);
  return true;
}
/* the medals put on the worker's file (the owner's lever, /dev/achv), the phone told by its achv_state */
async function seed(P, wsPort, rec, who) {
  const me = await H.readState(P, (S) => S.myId);
  for (const id of MEDALS) await H.devOp(wsPort, 'achv', me, { id }).catch(() => null);
  const g = await H.waitFor(P, (S) => Object.keys((S._achv && S._achv.got) || {}).sort().join(), (v) => MEDALS.every((m) => v.split(',').includes(m)), { timeout: 15000, label: 'the medals on file' }).catch(() => null);
  rec.ok(`${who}: the medals on the worker's file (${g})`, !!g, g);
  return me;
}
async function openFeats(P, touch) {
  await tap(P, '[data-menus3-dock="world"]', touch);
  await P.page.waitForTimeout(500);
  await tap(P, '[data-menus3-tab="feats"]', touch);
  await P.page.waitForTimeout(700);
  return pstate(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Featphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      await seed(P, wsPort, rec, 'upright');
      let ps = await openFeats(P, true);
      rec.ok('upright: World\'s Feats tab opens the new panel on Feats, Medals first', ps.open && ps.menu === 'world' && ps.section === 'feats' && ps.page === 'root', ps);
      const pr = await probe(P);
      rec.ok('upright: the AP line (the lever pays nothing: the total alone, never a false split)', !!pr && pr.rail === 'medals' && (pr.ap === 'total' || pr.ap === 'split') && pr.earned === MEDALS.length && pr.of === ACHIEVEMENTS.length, pr);
      const rows = await count(P, '[data-m3f-medal]');
      const earned = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3f-medal][data-m3f-got="1"]')).map((el) => el.getAttribute('data-m3f-medal')).sort().join());
      rec.ok(`upright: every medal of the table a row (${rows}), the two earned marked`, rows === ACHIEVEMENTS.length && earned === MEDALS.slice().sort().join(), { rows, earned });
      const sm = await small(P);
      rec.ok('upright: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(P, 'upright-medals');
      /* a medal's page, its Equip (today's achv_title), Back */
      await tap(P, '[data-m3f-medal="first_blood"]', true);
      ps = await pstate(P);
      rec.ok('upright: a medal\'s row opens its page, Back in the header', ps.page === 'medal' && ps.arg === 'first_blood' && !!(await box(P, '[data-menus3-back]')), ps);
      await shot(P, 'upright-medal');
      await tap(P, '[data-m3f-title-act="equip"]', true);
      const w1 = await H.waitFor(P, (S) => (S._achv && S._achv.t) || null, (v) => v === 'first_blood', { timeout: 15000, label: 'worn' }).catch(() => null);
      rec.ok('upright: Equip on the medal\'s page: the worker wears it', w1 === 'first_blood', w1);
      await tap(P, '[data-menus3-back]', true);
      ps = await pstate(P);
      rec.ok('upright: Back to Medals', ps.page === 'root' && (await probe(P) || {}).rail === 'medals', ps);
      /* Titles: the worn one, Remove */
      await tap(P, '[data-m3f-rail="titles"]', true);
      const wornRow = await P.page.evaluate(() => { const el = document.querySelector('[data-m3f-title-worn="1"]'); return el ? el.getAttribute('data-m3f-title') : null; });
      const tRows = await count(P, '[data-m3f-title]');
      rec.ok(`upright: Titles lists the earned ones (${tRows} rows), the worn one marked`, wornRow === 'first_blood' && tRows >= MEDALS.length, { wornRow, tRows });
      await shot(P, 'upright-titles');
      await tap(P, '[data-m3f-title="first_blood"] [data-m3f-title-act="remove"]', true);
      const w2 = await H.waitFor(P, (S) => (S._achv && S._achv.t) || null, (v) => v == null, { timeout: 15000, label: 'none worn' }).catch(() => 'still');
      rec.ok('upright: Remove: none worn', w2 == null, w2);
      /* Records */
      await tap(P, '[data-m3f-rail="records"]', true);
      const recs = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3f-record]')).map((el) => el.getAttribute('data-m3f-record')).join());
      rec.ok('upright: Records: the four counters the game keeps', recs === 'kills,deaths,gold,xp', recs);
      rec.ok('upright: Records: the quests you finished', !!(await box(P, '[data-m3f-quests-done]')), null);
      await shot(P, 'upright-records');
      /* the AP line -> its page -> Back */
      await P.page.evaluate(() => { const b = document.querySelector('[data-menus3-body]'); if (b) b.scrollTop = 0; });
      await tap(P, '[data-m3f-ap-open]', true);
      ps = await pstate(P);
      rec.ok('upright: the AP line opens where the AP came from', ps.page === 'ap' && !!(await box(P, '[data-m3f-page="ap"]')), ps);
      await tap(P, '[data-menus3-back]', true);
      ps = await pstate(P);
      rec.ok('upright: ...Back to Feats on Records, as it was', ps.page === 'root' && (await probe(P) || {}).rail === 'records', ps);
      /* Ranks: today's leaderboards */
      await tap(P, '[data-m3f-ranks]', true);
      await P.page.waitForTimeout(800);
      const bt = await bandTop(P);
      ps = await pstate(P);
      rec.ok('upright: Ranks opens today\'s leaderboards (the panel shut behind it)', !ps.open && !!bt && bt.shown && bt.top === 'leaderboard', { bt, ps });
      await P.page.evaluate(() => { try { window.__broDashPanelBus.go({ type: 'close' }); } catch (e) { /* shut */ } });
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways ── */
  const S2 = await H.newPlayer(browser, { name: 'Featside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(S2, rec, 'sideways')) {
      await seed(S2, wsPort, rec, 'sideways');
      const ps = await openFeats(S2, true);
      const pb = await box(S2, '[data-menus3-panel]');
      rec.ok('sideways: the drawer, 40% wide on the right, on Feats', ps.open && ps.section === 'feats' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      const sm = await small(S2);
      rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(S2, 'sideways-feats');
      await tap(S2, '[data-m3f-medal="combat_10"]', true);
      const p2 = await pstate(S2);
      rec.ok('sideways: a medal\'s page inside the drawer', p2.page === 'medal' && !!(await box(S2, '[data-menus3-panel] [data-m3f-medal-page="combat_10"]')), p2);
      const sm2 = await small(S2);
      rec.ok('sideways: its tappable things 44 x 44 or more', sm2.length === 0, sm2);
      await shot(S2, 'sideways-medal');
    }
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Featdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await seed(D, wsPort, rec, 'computer');
      const ps = await openFeats(D, false);
      rec.ok('computer: the drawer on Feats', ps.open && ps.section === 'feats' && (await D.page.evaluate(() => document.querySelector('[data-menus3-panel]').getAttribute('data-menus3-panel'))) === 'drawer', ps);
      await shot(D, 'computer-feats');
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it', (await pstate(D)).open === false, null);
      await D.page.keyboard.press('f');
      await D.page.waitForTimeout(700);
      rec.ok('computer: F opens no menu (it is the Element Burst\'s: no key added)', (await pstate(D)).open === false, null);
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
