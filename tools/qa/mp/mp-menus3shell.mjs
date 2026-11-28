/* ═══ v2.3.6860: THE NEW MENUS' SHELL, PLAYED (card MN step 1) ═══
 *
 * The owner's menus (docs/design/menus3/), step 1's "Done when": on a phone
 * upright, sideways and on a computer the three dock buttons, the five
 * shortcuts and every close rule work; nothing a player could reach
 * yesterday is unreachable; `?menus3=0` is yesterday's game.
 *
 *   1. UPRIGHT (390 x 844, touch): the dock (Bro, World, People, each 44+
 *      tall) where the Gear and Menu buttons sat; the gear (44 x 44) left of
 *      the minimap; Bro opens the new panel on the Bag (v2.3.6861, card MN
 *      step 4: mp-menus3bag plays it), World the Quests, People the
 *      Social hub, the gear the Settings hub; the fight controls step aside
 *      while a menu is open and come back on its close; the closes: the X,
 *      a tap on the world, a swipe down on the header, a hit outside a safe
 *      place (and not inside one); the face, the weapon's bar and the
 *      minimap open what they did; the chat lines' road opens the chat box;
 *      the Menu's doors still one press from Gear's root; the panel's
 *      container (its probe) 48% of the height held to 318..410;
 *   2. SIDEWAYS (the same phone turned, 844 x 390): the dock compact in the
 *      middle of the row; the panel a right drawer 40% wide; the controls
 *      not hidden by the new rule;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the dock; Esc closes the band
 *      and the panel; the panel a right drawer 40% wide;
 *   4. `?menus3=0`: the old Gear and Menu buttons, no dock, no gear, no
 *      class, remembered; `?menus3=1` forgets it.
 *
 * The page is measured from OUTSIDE the game (this test's evaluate), never a
 * read the game makes.  Pictures (deviceScaleFactor 1, for the session):
 * tools/qa/out/menus3shell-*.png.  The harness pins every OTHER scenario to
 * `menus3=0`; this one names `menus3=1`. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const nav = (P) => P.page.evaluate(() => { try { const n = window.__broDashPanelBus.nav(); const st = n[n.ws] || []; const t = st.length ? st[st.length - 1] : null; return { shown: !!n.shown, ws: n.ws, top: t ? t.id : null }; } catch (e) { return { err: String(e) }; } });
const topId = (P) => P.page.evaluate(() => { try { const b = window.__broDashPanelBus; return b.current(); } catch (e) { return 'err'; } });
const shown = (P) => P.page.evaluate(() => { try { return !!window.__broDashPanelBus.nav().shown; } catch (e) { return null; } });
/* v2.3.6863: either menu open (World opens the new panel now, card MN step 7) */
const anyOpen = (P) => P.page.evaluate(() => { try { return !!window.__btMenus3.open(); } catch (e) { return null; } });
const why = (P) => P.page.evaluate(() => (window.__btMenus3 ? window.__btMenus3.why() : 'no-probe'));
const hidCtl = (P) => P.page.evaluate(() => document.documentElement.classList.contains('bt-menus3-hide-ctl'));
const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
const boxes = (P, sel) => P.page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((el) => { const r = el.getBoundingClientRect(); return { id: el.getAttribute('data-menus3-dock'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((r) => r.w > 0), sel);

async function press(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(500);
  return true;
}
async function closeBand(P) {
  await P.page.evaluate(() => { try { window.__broDashPanelBus.go({ type: 'close' }); } catch (e) { /* none */ } });
  await P.page.waitForTimeout(300);
}
async function swipe(P, x, y0, y1) {
  const c = await P.page.context().newCDPSession(P.page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 4; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 4 }] });
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach().catch(() => {});
  await P.page.waitForTimeout(500);
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__broDashPanelBus), null, { timeout: 30000 }).catch(() => {});
  await P.page.waitForTimeout(2500);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3shell-' + name + '.png') }); } catch (e) { /* a picture only */ }
}

/* the panel's container, by its probe (no section opens it in step 1) */
async function panelCheck(P, rec, who, shape, vw, vh, touch) {
  await P.page.evaluate(() => window.__btMenus3.panel('bro', 'bag'));
  await P.page.waitForTimeout(500);
  const pb = await box(P, `[data-menus3-panel="${shape}"]`);
  rec.ok(`${who}: the panel's container is the ${shape}`, !!pb, pb);
  if (pb && shape === 'upright') {
    const want = Math.min(410, Math.max(318, Math.round(vh * 0.48)));
    rec.ok(`${who}: upright 48% of ${vh}, held to 318..410 (${want})`, Math.abs(pb.h - want) <= 2 && Math.abs(pb.w - vw) <= 2, pb);
    rec.ok(`${who}: the controls step aside under the panel`, await hidCtl(P), null);
  }
  if (pb && shape === 'drawer') {
    rec.ok(`${who}: the drawer 40% wide on the right`, Math.abs(pb.w - Math.round(vw * 0.4)) <= 3 && Math.abs(pb.x + pb.w - vw) <= 3 && pb.y <= 1, { pb, vw });
    rec.ok(`${who}: the controls not hidden by the drawer's rule`, !(await hidCtl(P)), null);
  }
  const tabs = await boxes(P, '[data-menus3-tab]');
  const x = await box(P, '[data-menus3-x]');
  rec.ok(`${who}: the panel's three sections and its X, each 44+`, tabs.length === 3 && !!x && x.w >= 44 && x.h >= 44, { tabs: tabs.length, x });
  await shot(P, who + '-panel');
  if (touch) await press(P, '[data-menus3-x]', true);
  else { await P.page.keyboard.press('Escape'); await P.page.waitForTimeout(400); }
  const st = await P.page.evaluate(() => window.__btMenus3.panelState().open);
  rec.ok(`${who}: the panel closes (${touch ? 'its X' : 'Esc'})`, st === false, st);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright, then 2. the same phone on its side ── */
  const P = await H.newPlayer(browser, { name: 'Dockphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      const on = await P.page.evaluate(() => window.__btMenus3.on());
      rec.ok('upright: the new menus are on', on === true, on);
      const dock = await boxes(P, '[data-menus3-dock]');
      rec.ok('upright: the dock, Bro World People, each 44+ tall', dock.map((d) => d.id).join() === 'bro,world,people' && dock.every((d) => d.h >= 44), dock);
      rec.ok('upright: the old Gear and Menu buttons are not on the resting row', !(await box(P, '[data-dash-frame="closed"] [data-dash-ctl="gear"]')), null);
      rec.ok('upright: the band rests on the dock', (await shown(P)) === false, await nav(P));
      const g = await box(P, '[data-menus3-gear]'), mm = await box(P, '[data-world-map-open]');
      const plate = await P.page.evaluate(() => (window.__btWheelPlate ? Math.round(window.__btWheelPlate.top) : null));
      rec.ok('upright: the gear, 44 x 44, left of the minimap, its foot 2 px past the map\'s', !!g && !!mm && g.w === 44 && g.h === 44 && g.x + g.w <= mm.x && plate != null && Math.abs((g.y + g.h) - (plate + 2)) <= 1, { g, mm, plate });
      const hud = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-hudart-face], [data-hudart-badge], [data-xp-bar], [data-hudart-pill], [data-quest-card], .bt-quest-card, [data-coach-card]')).map((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }).filter((r) => r.r > r.x));
      const hits = g ? hud.filter((r) => r.x < g.x + g.w && r.r > g.x && r.y < g.y + g.h && r.b > g.y) : [];
      rec.ok('upright: the gear covers nothing drawn of the HUD or the first lesson\'s card', !!g && hits.length === 0, hits.slice(0, 3));
      const tapBox = await box(P, '[data-hudart-bar]');
      rec.ok('LISTED upright: the weapon bar\'s tap box ' + JSON.stringify(tapBox) + ' (its name row and padding) and the gear ' + JSON.stringify(g), true, null);
      await shot(P, 'upright-rest');

      /* the dock's three */
      /* v2.3.6861 (card MN step 4): Bro opens the new panel on the Bag */
      await press(P, '[data-menus3-dock="bro"]', true);
      const ps = await P.page.evaluate(() => window.__btMenus3.panelState());
      rec.ok('upright: Bro opens the new panel on the Bag', ps.open && ps.menu === 'bro' && ps.section === 'bag' && (await shown(P)) === false, ps);
      rec.ok('upright: the fight controls step aside while it is open', await hidCtl(P), null);
      const ctlVis = await P.page.evaluate(() => { const el = document.querySelector('[data-joyzone]'); return el ? getComputedStyle(el).visibility : 'none'; });
      rec.ok('upright: a stick zone is hidden', ctlVis === 'hidden' || ctlVis === 'none', ctlVis);
      await shot(P, 'upright-bro');
      await press(P, '[data-menus3-x]', true);
      rec.ok('upright: the X closes it', (await P.page.evaluate(() => window.__btMenus3.panelState().open)) === false, null);
      rec.ok('upright: the controls come back', !(await hidCtl(P)), null);

      await press(P, '[data-menus3-dock="world"]', true);
      /* v2.3.6863 (card MN step 7): World opens the NEW panel on Quests (mp-menus3quests plays it) */
      const wps = await P.page.evaluate(() => window.__btMenus3.panelState());
      rec.ok('upright: World opens the new panel on Quests', wps.open && wps.menu === 'world' && wps.section === 'quests' && (await shown(P)) === false, wps);
      rec.ok('upright: its tabs Quests, Codex, Feats', (await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-tab]')).map((e) => e.getAttribute('data-menus3-tab')).join())) === 'quests,codex,feats', null);
      /* a tap on the world closes */
      const at = await P.page.evaluate(() => { const x = 195, y = 260; const el = document.elementFromPoint(x, y); return { x, y, tag: el ? el.tagName : null }; });
      if (at.tag === 'CANVAS') {
        await P.page.touchscreen.tap(at.x, at.y);
        await P.page.waitForTimeout(600);
        rec.ok('upright: a tap on the world closes it', (await shown(P)) === false && (await P.page.evaluate(() => window.__btMenus3.panelState().open)) === false && (await why(P)) === 'world', { why: await why(P), nav: await nav(P) });
      } else {
        rec.ok(`LISTED upright: the world tap not played: ${at.tag} at ${at.x},${at.y}`, true, null);
        await closeBand(P);
      }

      await press(P, '[data-menus3-dock="people"]', true);
      rec.ok('upright: People opens the Roster (today\'s Social hub)', (await topId(P)) === 'socialHub', await nav(P));
      /* a swipe down on the header closes */
      const hd = await box(P, '[data-dash-frame="page"]');
      if (hd) {
        await swipe(P, hd.x + Math.round(hd.w / 2), hd.y + Math.round(hd.h / 2), hd.y + Math.round(hd.h / 2) + 90);
        rec.ok('upright: a swipe down on the header closes it', (await shown(P)) === false && (await why(P)) === 'swipe', { why: await why(P), nav: await nav(P) });
      } else rec.ok('upright: the open page\'s header found', false, await nav(P));
      await closeBand(P);

      await press(P, '[data-menus3-gear]', true);
      rec.ok('upright: the gear opens Settings (today\'s hub)', (await topId(P)) === 'settingsHub', await nav(P));
      await closeBand(P);

      /* a hit: inside the safe ground nothing; outside, it closes */
      await press(P, '[data-menus3-dock="world"]', true);
      await H.readState(P, (S) => { S.lastDamageTaken = Date.now(); return 1; });
      await P.page.waitForTimeout(1200);
      rec.ok('upright: a hit on safe ground leaves it open', (await anyOpen(P)) === true, await why(P));
      let hit = false;
      for (let i = 0; i < 3 && !hit; i++) {
        await H.readState(P, (S) => { S.player.x += 4000; S.player.y += 4000; S.lastDamageTaken = Date.now(); return 1; });
        await P.page.waitForTimeout(1500);
        hit = (await anyOpen(P)) === false && (await why(P)) === 'hit';
      }
      rec.ok('upright: a hit outside a safe place closes it', hit, { why: await why(P), nav: await nav(P) });
      await closeBand(P);

      /* the shortcuts that were there: the face, the weapon's bar, the minimap */
      if (await press(P, '[data-hudart-face]', true)) rec.ok('upright: the face opens Bro (Power)', (await topId(P)) === 'hero', await nav(P));
      else rec.ok('LISTED upright: no face on the HUD (hudart off)', true, null);
      await closeBand(P);
      if (await press(P, '[data-hudart-bar]', true)) {
        const t = await topId(P);
        rec.ok('upright: the weapon\'s bar opens its weapon\'s page', /^bro(Sword|Bow|Staff)$/.test(String(t)), t);
      } else rec.ok('LISTED upright: no weapon bar on the HUD', true, null);
      await closeBand(P);
      await press(P, '[data-world-map-open]', true);
      const mapOpen = !!(await box(P, '[data-world-map-close]'));
      rec.ok('upright: the minimap opens the world map', mapOpen, null);
      if (mapOpen) await press(P, '[data-world-map-close]', true);
      /* the chat lines' road: the chat box (the feed's own tap needs lines in the feed) */
      await P.page.evaluate(() => window.__btMenus3.go('hud.chatLines'));
      await P.page.waitForTimeout(700);
      const r = await P.page.evaluate(() => window.__btMenus3.route());
      const chatBox = await P.page.evaluate(() => !!document.querySelector('textarea, input[type="text"][maxlength], [data-chat-input], .bt-chat-input'));
      rec.ok('upright: the chat lines\' road opens the chat box', r && r.road === 'chat' && chatBox, { r, chatBox });
      await P.page.keyboard.press('Escape').catch(() => {});
      await P.page.waitForTimeout(400);

      await panelCheck(P, rec, 'upright', 'upright', 390, 844, true);

      /* ── 2. sideways ── */
      await P.page.setViewportSize({ width: 844, height: 390 });
      await P.page.waitForTimeout(2500);
      const sd = await boxes(P, '[data-menus3-dock]');
      const row = await box(P, '[data-menus3-dockrow="side"]');
      const mid = sd.length === 3 ? (sd[0].x + sd[2].x + sd[2].w) / 2 : -1;
      rec.ok('sideways: the dock compact in the middle of the row', !!row && sd.length === 3 && Math.abs(mid - 422) <= 12 && (sd[2].x + sd[2].w - sd[0].x) <= 320 && sd.every((d) => d.h >= 44), { sd, row });
      const ctl = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-joyzone], [data-jump], [data-shield], [data-special]')).map((el) => { const r = el.getBoundingClientRect(); return { k: el.getAttribute('data-joyzone') || el.getAttributeNames().find((a) => a.startsWith('data-')), x: Math.round(r.left), w: Math.round(r.width), y: Math.round(r.top), h: Math.round(r.height) }; }).filter((r) => r.w > 0));
      rec.ok('LISTED sideways: the dock ' + JSON.stringify(sd.map((d) => [d.x, d.x + d.w])) + ', the controls ' + JSON.stringify(ctl.slice(0, 8)), true, null);
      await shot(P, 'sideways-rest');
      await panelCheck(P, rec, 'sideways', 'drawer', 844, 390, true);
    }
  } finally { await P.ctx?.close?.().catch(() => {}); }

  /* ── 3. a computer ── */
  const C = await H.newPlayer(browser, { name: 'Dockdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(C, rec, 'computer')) {
      const dock = await boxes(C, '[data-menus3-dock]');
      rec.ok('computer: the dock', dock.map((d) => d.id).join() === 'bro,world,people' && dock.every((d) => d.h >= 44), dock);
      rec.ok('computer: the gear by the minimap', !!(await box(C, '[data-menus3-gear]')), null);
      await shot(C, 'computer-rest');
      await press(C, '[data-menus3-dock="world"]', false);
      rec.ok('computer: World opens the new panel on Quests', (await C.page.evaluate(() => { const s = window.__btMenus3.panelState(); return s.open && s.section === 'quests'; })), await nav(C));   /* v2.3.6863 */
      await C.page.keyboard.press('Escape');
      await C.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it', (await shown(C)) === false && (await C.page.evaluate(() => window.__btMenus3.panelState().open)) === false, await nav(C));
      await panelCheck(C, rec, 'computer', 'drawer', 1280, 800, false);

      /* ── 4. ?menus3=0: yesterday's game, remembered; =1 forgets ── */
      await C.page.goto(C.page.url().replace('menus3=1', 'menus3=0'));
      await C.page.waitForFunction(() => !!window.__broDashPanelBus, null, { timeout: 60000 }).catch(() => {});
      await C.page.waitForTimeout(4000);
      const off = await C.page.evaluate(() => ({
        dock: !!document.querySelector('[data-menus3-dock]'),
        gear: !!document.querySelector('[data-menus3-gear]'),
        cls: document.documentElement.classList.contains('bt-menus3'),
        probe: !!window.__btMenus3,
        oldGear: !!document.querySelector('[data-dash-ctl="gear"], [data-dash-frame]'),
        kept: (() => { try { return localStorage.getItem('bt_menus3'); } catch (e) { return 'x'; } })(),
      }));
      rec.ok('=0: no dock, no gear, no class, no probe; the old band', !off.dock && !off.gear && !off.cls && !off.probe && off.oldGear, off);
      rec.ok('=0: remembered on the device', off.kept === '0', off.kept);
      await C.page.goto(C.page.url().replace('menus3=0', 'menus3=1'));
      await C.page.waitForTimeout(3000);
      const kept = await C.page.evaluate(() => { try { return localStorage.getItem('bt_menus3'); } catch (e) { return 'x'; } });
      rec.ok('=1: forgets the stored off', kept === null, kept);
    }
  } finally { await C.ctx?.close?.().catch(() => {}); }
}
