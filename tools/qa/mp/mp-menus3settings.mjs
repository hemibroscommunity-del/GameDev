/* ═══ v2.3.6869: SETTINGS IN THE NEW PANEL, PLAYED (card MN step 12) ═══
 *
 * The owner's Settings (docs/design/menus3/; decided 9): the gear left of the
 * minimap opens the new panel on Settings, always on Sound; the rail of five
 * (Sound, Screen, Alerts, Account, Help) holds every control of today's
 * Settings hub, each writing what today's writes.
 *
 *   1. UPRIGHT (390 x 844, touch; a new character, the worker's defaults:
 *      Settings reads nothing of it): the gear opens the panel on Settings,
 *      its title and X, no dock tabs; the rail's five in order; every
 *      tappable thing 44 x 44 or more and the sliders 44 tall (the
 *      wireframe's 16 mended); Sound's switch writes today's key
 *      (brotown_audio_off) and a slider its level (brotown_vol_music);
 *      Screen's menu side its chip; Alerts' silence and the chat on screen
 *      (bt_worldchat_shut); "Chat and news" opens TODAY's Notifications page
 *      and its Back gives the panel back on Alerts; Account is today's
 *      Account (Log out's confirm opened and cancelled, never left; the
 *      Login Key; continue another character) and Restart's confirm screen
 *      (Keep playing); Help's Feedback opens today's page, its Back the panel
 *      on Help; the gear again closes it; a tap on the world closes it;
 *   2. SIDEWAYS (844 x 390): the drawer 40% on the right; the gear stands
 *      aside while it is open (the mends, #2445); the X closes; the gear
 *      opens it again; every tappable thing 44+;
 *   3. A COMPUTER (1280 x 800, `wide: true`): a click on the gear opens the
 *      drawer; Esc closes it; the gear is back.
 *
 * Pictures (deviceScaleFactor 1): tools/qa/out/menus3settings-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 && getComputedStyle(el).visibility !== 'hidden' ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const attrs = (P, sel, a) => P.page.evaluate(([s, n]) => Array.from(document.querySelectorAll(s)).map((el) => el.getAttribute(n)), [sel, a]);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, page: t ? t.page : null, rail: t ? t.rail : null }; });
const probe = (P) => P.page.evaluate(() => window.__btMenus3Settings || null);
const store = (P, k) => P.page.evaluate((key) => { try { return localStorage.getItem(key); } catch (e) { return 'n/a'; } }, k);
const pressed = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); return el ? el.getAttribute('aria-pressed') : null; }, sel);
const bandTop = (P) => P.page.evaluate(() => { try { const n = window.__broDashPanelBus.nav(); const st = n[n.ws] || []; return { shown: !!n.shown, top: st.length ? st[st.length - 1].id : null }; } catch (e) { return null; } });
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button, [data-menus3-panel] input[type=range]')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));

async function tap(P, sel, touch) {
  /* a row under a long page (Restart under today's Account) is scrolled to first */
  await P.page.evaluate((s) => { const el = document.querySelector(s); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, sel).catch(() => {});
  await P.page.waitForTimeout(150);
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(600);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3settings-' + name + '.png') }); } catch (e) { /* a picture only */ }
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
/* the gear, then its lazy page */
async function openSettings(P, touch) {
  await tap(P, '[data-menus3-gear]', touch);
  await P.page.waitForFunction(() => !!document.querySelector('[data-m3-settings]'), null, { timeout: 15000 }).catch(() => {});
  await P.page.waitForTimeout(400);
  return pstate(P);
}
const rail = async (P, id, touch) => { await tap(P, `[data-m3-srail="${id}"]`, touch); return probe(P); };

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Setphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      let ps = await openSettings(P, true);
      rec.ok('upright: the gear opens the new panel on Settings, Sound', ps.open && ps.section === 'settings' && ps.menu === null && (await probe(P) || {}).rail === 'sound', ps);
      const title = await P.page.evaluate(() => { const t = document.querySelector('[data-menus3-title]'); return t ? t.textContent : null; });
      rec.ok('upright: its header the title Settings and the X, no dock tabs', title === 'Settings' && !!(await box(P, '[data-menus3-x]')) && (await attrs(P, '[data-menus3-tab]', 'data-menus3-tab')).length === 0, title);
      const r5 = await attrs(P, '[data-m3-srail]', 'data-m3-srail');
      rec.ok('upright: the rail of five, in order', r5.join() === 'sound,screen,alerts,account,help', r5);
      let sm = await small(P);
      rec.ok('upright: every tappable thing and both sliders 44 or more (the wireframe\'s 16 mended)', sm.length === 0, sm);
      await shot(P, 'upright-sound');

      /* Sound: today's keys */
      const a0 = await store(P, 'brotown_audio_off');
      await tap(P, '[data-m3-set-ctl="audio"]', true);
      const a1 = await store(P, 'brotown_audio_off');
      await tap(P, '[data-m3-set-ctl="audio"]', true);
      const a2 = await store(P, 'brotown_audio_off');
      rec.ok('upright: Sound\'s switch writes today\'s key, both ways', a1 === '1' && a2 === '0', { a0, a1, a2 });
      const v0 = await store(P, 'brotown_vol_music');
      const sb = await box(P, 'input[data-m3-set-ctl="music"]');
      if (sb) { await P.page.touchscreen.tap(sb.x + Math.round(sb.w * 0.25), sb.y + Math.round(sb.h / 2)); await P.page.waitForTimeout(500); }
      const v1 = await store(P, 'brotown_vol_music');
      rec.ok('upright: the music slider writes today\'s level', !!sb && v1 != null && v1 !== v0 && Number(v1) < 0.5, { v0, v1, sb });

      /* Screen */
      let pr = await rail(P, 'screen', true);
      rec.ok('upright: Screen holds the menu side and the controls lesson', !!pr && pr.rail === 'screen' && pr.rows.includes('menuSide') && pr.rows.includes('controls'), pr);
      await tap(P, '[data-m3-set-ctl="dashside"][data-m3-set-val="left"]', true);
      const sideL = await pressed(P, '[data-m3-set-ctl="dashside"][data-m3-set-val="left"]');
      await tap(P, '[data-m3-set-ctl="dashside"][data-m3-set-val="auto"]', true);
      rec.ok('upright: the menu side\'s chip lights (and back to Auto)', sideL === 'true' && (await pressed(P, '[data-m3-set-ctl="dashside"][data-m3-set-val="auto"]')) === 'true', sideL);
      sm = await small(P);
      rec.ok('upright: Screen\'s tappable things 44+', sm.length === 0, sm);

      /* Alerts */
      pr = await rail(P, 'alerts', true);
      rec.ok('upright: Alerts holds the silence, the chat on screen and the news', !!pr && pr.rows.join() === 'silence,onScreen,news', pr);
      const s0 = await pressed(P, '[data-m3-set-ctl="silence"]');
      await tap(P, '[data-m3-set-ctl="silence"]', true);
      const s1 = await pressed(P, '[data-m3-set-ctl="silence"]');
      await tap(P, '[data-m3-set-ctl="silence"]', true);
      rec.ok('upright: the alerts silenced and back', s0 === 'true' && s1 === 'false' && (await pressed(P, '[data-m3-set-ctl="silence"]')) === 'true', { s0, s1 });
      const f0 = await store(P, 'bt_worldchat_shut');
      await tap(P, '[data-m3-set-ctl="onScreen"]', true);
      const f1 = await store(P, 'bt_worldchat_shut');
      await tap(P, '[data-m3-set-ctl="onScreen"]', true);
      rec.ok('upright: the chat on screen writes today\'s key, both ways', f1 != null && f1 !== f0 && (await store(P, 'bt_worldchat_shut')) !== f1, { f0, f1 });
      await shot(P, 'upright-alerts');
      await tap(P, '[data-m3-set-ctl="news"]', true);
      await P.page.waitForTimeout(800);
      let bt = await bandTop(P);
      rec.ok('upright: Chat and news opens today\'s Notifications page', !!bt && bt.shown && bt.top === 'notifications' && (await pstate(P)).open === false, bt);
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', true);
      await P.page.waitForTimeout(800);
      ps = await pstate(P);
      rec.ok('upright: its Back: the panel again, on Alerts', ps.open && ps.section === 'settings' && ps.rail === 'alerts', { ps, bt: await bandTop(P) });

      /* Account: today's Account page, Log out's confirm (cancelled), the restart's screen */
      pr = await rail(P, 'account', true);
      rec.ok('upright: Account holds today\'s Account (Log out, the key, continue) and Restart', !!pr && pr.rail === 'account' && !!(await box(P, '[data-menus3-panel] [data-account-door]')) && !!(await box(P, '[data-m3-set-ctl="restart"]')), pr);
      await tap(P, '[data-menus3-panel] [data-account-door]', true);
      const conf = await box(P, '[data-account-confirm]');
      rec.ok('upright: Log out opens today\'s confirm', !!conf, conf);
      await shot(P, 'upright-logout');
      await tap(P, '[data-account-confirm] [data-esc]', true);
      rec.ok('upright: ...Cancel shuts it, still in the world', !(await box(P, '[data-account-confirm]')) && (await H.readState(P, (S) => S.currentZone)) === 'wheel', null);
      await tap(P, '[data-m3-set-ctl="restart"]', true);
      rec.ok('upright: Restart opens today\'s confirm screen', !!(await box(P, '[data-m3-set="restartScreen"]')), null);
      await shot(P, 'upright-restart');
      await P.page.evaluate(() => { const b = document.querySelector('[data-m3-set="restartScreen"] button'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
      await P.page.waitForTimeout(500);
      rec.ok('upright: ...Keep playing: Account again', !(await box(P, '[data-m3-set="restartScreen"]')) && !!(await box(P, '[data-m3-set-ctl="restart"]')), null);

      /* Help */
      pr = await rail(P, 'help', true);
      rec.ok('upright: Help holds Feedback and About', !!pr && pr.rows.join() === 'feedback,about', pr);
      await tap(P, '[data-m3-set-ctl="feedback"]', true);
      await P.page.waitForTimeout(800);
      bt = await bandTop(P);
      rec.ok('upright: Feedback opens today\'s page', !!bt && bt.shown && bt.top === 'feedback', bt);
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', true);
      await P.page.waitForTimeout(800);
      ps = await pstate(P);
      rec.ok('upright: its Back: the panel again, on Help', ps.open && ps.section === 'settings' && ps.rail === 'help', ps);
      await tap(P, '[data-m3-set-ctl="about"]', true);
      await P.page.waitForTimeout(800);
      bt = await bandTop(P);
      rec.ok('upright: About opens today\'s page', !!bt && bt.shown && bt.top === 'about', bt);
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', true);
      await P.page.waitForTimeout(800);

      /* the gear toggles; every open starts on Sound; a tap on the world closes */
      await tap(P, '[data-menus3-gear]', true);
      rec.ok('upright: the gear again closes it', (await pstate(P)).open === false, await pstate(P));
      ps = await openSettings(P, true);
      rec.ok('upright: opened again: Sound, always', ps.open && (await probe(P) || {}).rail === 'sound', ps);
      await P.page.touchscreen.tap(195, 260);
      await P.page.waitForTimeout(700);
      rec.ok('upright: a tap on the world closes it', (await pstate(P)).open === false && (await P.page.evaluate(() => window.__btMenus3.why())) === 'world', await P.page.evaluate(() => window.__btMenus3.why()));
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways ── */
  const S2 = await H.newPlayer(browser, { name: 'Setside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(S2, rec, 'sideways')) {
      const ps = await openSettings(S2, true);
      const pb = await box(S2, '[data-menus3-panel]');
      rec.ok('sideways: the gear opens the drawer, 40% wide on the right, on Settings', ps.open && ps.section === 'settings' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      rec.ok('sideways: the gear stands aside while it is open (the mends)', !(await box(S2, '[data-menus3-gear]')), null);
      for (const id of ['sound', 'screen', 'alerts', 'account', 'help']) {
        await rail(S2, id, true);
        const sm = await small(S2);
        rec.ok(`sideways: ${id}'s tappable things 44 x 44 or more`, sm.length === 0, sm);
        if (id === 'sound' || id === 'account') await shot(S2, 'sideways-' + id);
      }
      await tap(S2, '[data-menus3-x]', true);
      rec.ok('sideways: the X closes it; the gear is back', (await pstate(S2)).open === false && !!(await box(S2, '[data-menus3-gear]')), null);
      const again = await openSettings(S2, true);
      rec.ok('sideways: the gear opens it again', again.open && again.section === 'settings', again);
    }
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Setdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      const ps = await openSettings(D, false);
      rec.ok('computer: a click on the gear opens the drawer on Settings', ps.open && ps.section === 'settings' && (await D.page.evaluate(() => document.querySelector('[data-menus3-panel]').getAttribute('data-menus3-panel'))) === 'drawer', ps);
      await shot(D, 'computer-sound');
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it; the gear is back', (await pstate(D)).open === false && !!(await box(D, '[data-menus3-gear]')), null);
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
