/* ═══ v2.3.6681: THE DASHBOARD'S FRAME ON A PHONE AND A COMPUTER (card UI2-frame, the build's step 2) ═══
 *
 * The new frame lands ON (`?ui2=0` the one way back): Gear and Menu, the one
 * header, Back by the journey, each workspace remembered.  A phone in the
 * world (upright 390 x 844, then 375 x 667 and sideways 844 x 390), a
 * computer playing wide, and a phone with `?ui2=0`:
 *
 *   1. closed, the slim row holds Gear and Menu (each 44 x 44 or more);
 *   2. Gear's root: [Close] Gear [Menu ›]; the band 243 px tall, as today;
 *   3. the Menu's root: eight equal tiles four by two, Back says "Gear";
 *   4. each tile opens its page under its name, Back says "Menu" and goes
 *      there; the Map tile opens the World map; the hubs' tiles open theirs
 *      (Back says the hub's name);
 *   5. Close then Menu resumes the page and its scroll;
 *   6. the Menu button on a deep page lands on the root; Back from there is
 *      Gear (not the pages before);
 *   7. Gear's own page survives a visit to the Menu;
 *   8. a page reached from the world (the quest card's open then push) goes
 *      Back to the world, its Back saying "World";
 *   9. the band's height to the pixel at 375 x 667, sideways and on a
 *      computer; nothing of the frame outside the band; the grid one row of
 *      eight sideways;
 *  10. a computer: I, O, P, Esc; a tile wears its key;
 *  11. `?ui2=0` gives today's row of CLOSE and six buttons, remembered; and
 *      `?ui2=1` brings the frame back.
 * Pictures (deviceScaleFactor 2): docs/shots/ui2-frame-*.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');

/* the frame's reading, in the page */
function frame() {
  const f = document.querySelector('[data-dash-frame]');
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const txt = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
  const ctls = Array.from(document.querySelectorAll('[data-dash-frame] [data-dash-ctl], [data-dash-grid] [data-dest]')).map((e) => {
    const r = e.getBoundingClientRect();
    return { k: e.getAttribute('data-dash-ctl') || e.getAttribute('data-dest'), w: Math.round(r.width), h: Math.round(r.height), out: !!B && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5) };
  });
  const bus = window.__broDashPanelBus;
  const nv = bus && bus.nav ? bus.nav() : null;
  return {
    kind: f ? f.getAttribute('data-dash-frame') : null,
    title: txt('[data-dash-frame] [data-u2="title"]'),
    back: txt('[data-dash-frame] [data-dash-ctl="back"]'),
    backTo: (() => { const e = document.querySelector('[data-dash-frame] [data-dash-ctl="back"]'); return e ? e.getAttribute('data-back-to') : null; })(),
    page: (() => { const e = document.querySelector('[data-dash-title]'); return e ? e.getAttribute('data-dash-title') : null; })(),
    grid: (() => { const g = document.querySelector('[data-dash-grid]'); return g ? { id: g.getAttribute('data-dash-grid'), rows: +g.getAttribute('data-grid-rows'), doors: Array.from(g.querySelectorAll('[data-dest]')).map((d) => d.getAttribute('data-dest')), keys: Array.from(g.querySelectorAll('[data-dest]')).map((d) => d.getAttribute('data-key') || '') } : null; })(),
    band: B ? [Math.round(B.width), Math.round(B.height)] : null,
    ctls,
    small: ctls.filter((c) => c.w < 44 || c.h < 44),
    outside: ctls.filter((c) => c.out),
    rail: document.querySelectorAll('.bt-navrail [data-nav]').length,
    nav: nv ? { ws: nv.ws, shown: nv.shown, menu: nv.menu.map((e) => e.id), gear: nv.gear.map((e) => e.id) } : null,
    map: !!(window.__btWorldMap && window.__btWorldMap.open),
  };
}
const read = (P) => P.page.evaluate(frame);

/* v2.3.6682 (card UI2-frame PR 2): THE MOTION, READ AS A STATE (TRAPS §200).
   The page's container wears [data-dash-grow] (and its transform-origin) from
   the step until the animation's own end.  A MutationObserver logs every kind
   and origin it wears, and a press notes whether a motion was on at that
   moment; the test then waits for the attribute to be gone (off by its end,
   at whatever pace this box draws), never a window of ms. */
async function growWatch(P) {
  await P.page.evaluate(() => {
    const w = window.__u2grow = window.__u2grow || { log: [], taps: [] };
    w.log.length = 0; w.taps.length = 0;
    if (w.obs) w.obs.disconnect();
    const seen = (el) => { const k = el.getAttribute('data-dash-grow'); if (k) w.log.push({ k, o: el.style.transformOrigin, box: el.getAttribute('data-band-box') }); };
    w.obs = new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'attributes') { if (m.target.hasAttribute('data-dash-grow')) seen(m.target); continue; }
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.hasAttribute('data-dash-grow')) seen(n);
          n.querySelectorAll('[data-dash-grow]').forEach(seen);
        }
      }
    });
    w.obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-dash-grow'] });
    if (!w.tapOn) { w.tapOn = true; window.addEventListener('pointerdown', () => w.taps.push(!!document.querySelector('[data-dash-grow]')), true); }
  });
}
const growOff = (P) => P.page.waitForFunction(() => !document.querySelector('[data-dash-grow]'), null, { timeout: 15000 }).then(() => true).catch(() => false);
const growLog = (P) => P.page.evaluate(() => ({ log: window.__u2grow.log.slice(), taps: window.__u2grow.taps.slice() }));
const tap = async (P, sel, ms = 450) => { await P.page.locator(sel).first().tap({ timeout: 6000 }); await P.page.waitForTimeout(ms); };
const click = async (P, sel, ms = 450) => { await P.page.locator(sel).first().click({ timeout: 6000 }); await P.page.waitForTimeout(ms); };
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: Math.max(0, b.top - 120), w: b.width, h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top - 120) }; });
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

const DOORS = [
  ['hero', 'hero'], ['quests', 'quests'], ['social', 'socialHub'], ['leaderboard', 'leaderboard'],
  ['encyclopedia', 'encyclopedia'], ['homestead', 'homestead'], ['settings', 'settingsHub'],
];

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Framebro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, 'phone'))) return;
    /* 1. closed */
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'close' }); });
    await P.page.waitForTimeout(500);
    let F = await read(P);
    rec.ok('1. closed: the slim row holds Gear and Menu, each 44 x 44 or more', F.kind === 'closed' && F.ctls.map((c) => c.k).join(',') === 'gear,menu' && F.small.length === 0, F);
    await bandShot(P, 'ui2-frame-closed.png');
    /* 2. Gear's root */
    await tap(P, '[data-dash-ctl="gear"]', 700);
    F = await read(P);
    rec.ok('2a. Gear: [Close] Gear [Menu ›]', F.kind === 'gear-root' && F.title === 'Gear' && F.ctls.slice(0, 2).map((c) => c.k).join(',') === 'close,menu', F);
    rec.ok('2b. the band at 390 x 844 is 390 x 243, as today', F.band && F.band[0] === 390 && F.band[1] === 243, F.band);
    await bandShot(P, 'ui2-frame-gear.png');
    /* 3. the Menu's root */
    await tap(P, '[data-dash-ctl="menu"]', 700);
    F = await read(P);
    rec.ok('3a. the Menu\'s root: eight tiles, four by two, in the agreed order', F.kind === 'menu-root' && F.grid && F.grid.rows === 2 && F.grid.doors.join(',') === 'hero,quests,social,leaderboard,encyclopedia,homestead,map,settings', F.grid);
    rec.ok('3b. its Back says Gear; every control 44 x 44 or more; nothing outside the band', F.back && /Gear/.test(F.back) && F.small.length === 0 && F.outside.length === 0, { back: F.back, small: F.small, outside: F.outside });
    const sizes = F.ctls.filter((c) => c.k !== 'back' && c.k !== 'close').map((c) => c.w + 'x' + c.h);
    rec.ok('3c. no tile larger than another', new Set(sizes).size === 1, sizes);
    await bandShot(P, 'ui2-frame-menu.png');
    /* 4. each tile opens its page; Back says Menu and goes there */
    const opened = [];
    for (const [door, page] of DOORS) {
      await tap(P, `[data-dash-grid="menu"] [data-dest="${door}"]`, 900);
      const G = await read(P);
      opened.push({ door, page: G.page, back: G.back, kind: G.kind, menu: G.ctls.some((c) => c.k === 'menu') });
      await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 600);
    }
    rec.ok('4a. each tile opens its page, under its name, Back saying Menu (and no second Menu beside it)', opened.every((o, i) => o.kind === 'page' && o.page === DOORS[i][1] && /Menu/.test(o.back || '') && !o.menu), opened);
    F = await read(P);
    rec.ok('4b. ...and Back lands on the Menu\'s root again', F.kind === 'menu-root', F.kind);
    await tap(P, '[data-dash-grid="menu"] [data-dest="map"]', 1200);
    F = await read(P);
    rec.ok('4c. the Map tile opens the World map over the game', F.map, F.map);
    await P.page.evaluate(() => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); });
    await P.page.waitForTimeout(600);
    /* the hubs */
    const hubs = [];
    for (const [door, hub, tiles] of [['social', 'socialHub', ['social', 'clan', 'guild']], ['settings', 'settingsHub', ['settings', 'notifications', 'account', 'feedback', 'about', 'journey']]]) {
      await H.dashMenuRoot(P);
      await tap(P, `[data-dash-grid="menu"] [data-dest="${door}"]`, 700);
      const Hh = await read(P);
      const seen = [];
      for (const t of tiles) {
        await tap(P, `[data-dash-grid="${hub}"] [data-dest="${t}"]`, 900);
        const G = await read(P);
        seen.push({ t, page: G.page, back: G.back });
        await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 600);
      }
      hubs.push({ hub, doors: Hh.grid && Hh.grid.doors, seen });
    }
    rec.ok('4d. the hubs: Social (Friends, Party, Guilds), Settings (Settings, Notifications, Account, Feedback, About, Journey); each its page, Back saying the hub', hubs.every((h, i) => h.seen.every((x) => x.page === x.t && /(Social|Settings)/.test(x.back || '')) && h.doors.join(',') === [['social', 'clan', 'guild'], ['settings', 'notifications', 'account', 'feedback', 'about', 'journey']][i].join(',')), hubs);
    /* 5. Close then Menu resumes the page and its scroll (Settings scrolls) */
    await H.dashMenuRoot(P);
    await tap(P, '[data-dash-grid="menu"] [data-dest="settings"]', 600);
    await tap(P, '[data-dash-grid="settingsHub"] [data-dest="settings"]', 1000);
    const scrolled = await P.page.evaluate(() => {
      const box = document.querySelector('[data-band-box="page"]');
      const all = box ? Array.from(box.querySelectorAll('*')) : [];
      const sc = all.find((e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      if (!sc) return null;
      sc.scrollTop = 60;
      sc.dispatchEvent(new Event('scroll'));
      return sc.scrollTop;
    });
    await P.page.waitForTimeout(800);
    await tap(P, '[data-dash-frame] [data-dash-ctl="close"]', 700);
    F = await read(P);
    const closedOk = F.kind === 'closed';
    await tap(P, '[data-dash-ctl="menu"]', 1500);
    F = await read(P);
    const back = await P.page.evaluate(() => {
      const box = document.querySelector('[data-band-box="page"]');
      const all = box ? Array.from(box.querySelectorAll('*')) : [];
      const sc = all.find((e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      return sc ? sc.scrollTop : null;
    });
    rec.ok('5. Close, then Menu: the Settings page again, scrolled where it was', closedOk && F.kind === 'page' && F.page === 'settings' && scrolled > 20 && Math.abs(back - scrolled) < 3, { closedOk, page: F.page, scrolled, back });
    await bandShot(P, 'ui2-frame-page.png');
    /* 6. the Menu button on a deep page: the root; Back from there is Gear */
    await tap(P, '[data-dash-frame] [data-dash-ctl="menu"]', 700);
    F = await read(P);
    const atRoot = F.kind === 'menu-root' && F.nav && F.nav.menu.length === 0;
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
    const G6 = await read(P);
    rec.ok('6. Menu on a deep page lands on the root, nothing under it; Back from there is Gear', atRoot && G6.kind === 'gear-root', { atRoot, after: G6.kind, nav: G6.nav });
    /* 7. Gear's own page survives a visit to the Menu */
    await P.page.evaluate(() => window.__broDashPanelBus.go({ type: 'push', id: 'stats' }));
    await P.page.waitForTimeout(600);
    await tap(P, '[data-dash-frame] [data-dash-ctl="menu"]', 700);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
    F = await read(P);
    rec.ok('7. Gear\'s page (Stats, under Gear) is still there after the Menu', F.kind === 'page' && F.page === 'stats' && F.nav.ws === 'gear', F.nav);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 600);
    /* 8. a page from the world: its Back is the world */
    await tap(P, '[data-dash-frame] [data-dash-ctl="close"]', 600);
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; b.open('quests'); b.push('questDetail'); });
    await P.page.waitForTimeout(800);
    F = await read(P);
    const word = F.back;
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
    const G8 = await read(P);
    rec.ok('8. the quest card\'s road (its page hands the quest to the Quests tab, which takes its place): Back says World and closes the dashboard again', F.page === 'quests' && /World/.test(word || '') && G8.kind === 'closed' && G8.nav.menu.indexOf('quests') < 0 && G8.nav.menu.indexOf('questDetail') < 0, { page: F.page, word, after: G8.kind, nav: G8.nav });
    /* a page from the world on its own (a fish's weigh-in card opens the Ranks) */
    await P.page.evaluate(() => window.__broDashPanelBus.open('leaderboard'));
    await P.page.waitForTimeout(800);
    const F8 = await read(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 700);
    const G8b = await read(P);
    rec.ok('8b. a page opened from the world alone: Back says World and closes again', F8.page === 'leaderboard' && /World/.test(F8.back || '') && G8b.kind === 'closed', { page: F8.page, back: F8.back, after: G8b.kind });
    /* 12. THE MOTION (v2.3.6682, PR 2): a page grows out of the tile tapped, shrinks back on Back */
    await H.dashMenuRoot(P);
    await growOff(P);
    await growWatch(P);
    await tap(P, '[data-dash-grid="menu"] [data-dest="quests"]', 0);
    const offA = await growOff(P);
    const A12 = await growLog(P);
    const G12 = await read(P);
    rec.ok('12a. the Quests tile: its page grows out of the tile\'s cell (37.5% 25%), and the class comes off at the animation\'s end',
      G12.page === 'quests' && A12.log.some((x) => x.k === 'grow' && x.o === '37.5% 25%' && x.box === 'page') && offA, { page: G12.page, log: A12.log, off: offA });
    await growWatch(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 0);
    const offB = await growOff(P);
    const B12 = await growLog(P);
    rec.ok('12b. Back: the Menu\'s root comes back as the page shrinks into its tile (the same origin), and the class comes off',
      (await read(P)).kind === 'menu-root' && B12.log.some((x) => x.k === 'shrink' && x.o === '37.5% 25%') && offB, { log: B12.log, off: offB });
    /* taps while it grows: a hub's tile tapped at once, inside the growing page (force: Playwright would wait for it to stop moving) */
    /* the page's animations played at a tenth of their pace (the browser's own clock, not a wait), so the
       second press surely lands while the first page still grows on this box, however fast it draws */
    const cdp = await P.page.context().newCDPSession(P.page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
    await growWatch(P);
    await tap(P, '[data-dash-grid="menu"] [data-dest="social"]', 0);
    await P.page.locator('[data-dash-grid="socialHub"] [data-dest="social"]').first().tap({ timeout: 6000, force: true });
    await growOff(P);
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
    await cdp.detach().catch(() => {});
    const C12 = await growLog(P);
    const G12c = await read(P);
    rec.ok('12c. taps during it are not lost: Social, then Friends at once inside the growing page, opens Friends (a press made while the motion was on)',
      G12c.page === 'social' && C12.taps.length >= 2 && C12.taps.slice(1).some(Boolean), { page: G12c.page, taps: C12.taps, log: C12.log });
    /* a change of workspace, and the Menu's root by its shortcut: from nothing */
    await growWatch(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="menu"]', 0);
    await growOff(P);
    const D12 = await growLog(P);
    rec.ok('12d. the Menu shortcut on a deep page: its root grows from nothing (the centre)', D12.log.some((x) => x.k === 'fresh' && x.o === '50% 50%'), D12.log);
    await growWatch(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 0);
    await growOff(P);
    const E12 = await growLog(P);
    rec.ok('12e. Back from the Menu\'s root to Gear (a change of workspace): from nothing', (await read(P)).kind === 'gear-root' && E12.log.some((x) => x.k === 'fresh' && x.box === 'cols'), E12.log);
    /* the phone's reduced motion: none */
    await P.page.emulateMedia({ reducedMotion: 'reduce' });
    await growWatch(P);
    await tap(P, '[data-dash-frame] [data-dash-ctl="menu"]', 500);
    await tap(P, '[data-dash-grid="menu"] [data-dest="hero"]', 700);
    const F12 = await growLog(P);
    rec.ok('12f. reduced motion: the page opens, no motion worn', (await read(P)).page === 'hero' && F12.log.length === 0, F12.log);
    await P.page.emulateMedia({ reducedMotion: 'no-preference' });
    /* 13. LEFTOVER A (v2.3.6682): the band's handle hides and keeps BOTH workspaces */
    await H.dashOpen(P, 'dashboard');
    await P.page.evaluate(() => window.__broDashPanelBus.go({ type: 'push', id: 'stats' }));
    await P.page.waitForTimeout(600);
    await H.dashMenuRoot(P);
    await tap(P, '[data-dash-grid="menu"] [data-dest="quests"]', 900);
    await tap(P, '[data-dash-fold]', 900);
    const H13 = await read(P);
    await tap(P, '[data-dash-frame="closed"] [data-dash-ctl="gear"]', 900);
    const G13 = await read(P);
    await tap(P, '[data-dash-fold]', 900);
    await tap(P, '[data-dash-frame="closed"] [data-dash-ctl="menu"]', 900);
    const M13 = await read(P);
    rec.ok('13. the handle folds the band and keeps both: Gear comes back on its Stats page, the Menu on Quests',
      H13.kind === 'closed' && G13.page === 'stats' && G13.nav.ws === 'gear' && M13.page === 'quests' && M13.nav.ws === 'menu',
      { folded: H13.kind, gear: [G13.page, G13.nav], menu: [M13.page, M13.nav] });
    await tap(P, '[data-dash-frame] [data-dash-ctl="close"]', 600);
    /* 9. the other shapes */
    for (const s of [{ w: 375, h: 667, band: 235, rows: 2, tag: '375x667' }, { w: 844, h: 390, band: 130, rows: 1, tag: '844x390' }]) {
      await P.page.setViewportSize({ width: s.w, height: s.h });
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'dashboard');
      const g = await read(P);
      await H.dashMenuRoot(P);
      await P.page.waitForTimeout(800);
      const m = await read(P);
      rec.ok(`9. ${s.tag}: the band ${s.w} x ${s.band} as today; the grid ${s.rows === 1 ? 'one row of eight' : 'four by two'}; every control 44 x 44 or more, inside the band`,
        g.band && g.band[1] === s.band && m.band && m.band[1] === s.band && m.grid && m.grid.rows === s.rows && m.small.length === 0 && m.outside.length === 0,
        { gear: g.band, menu: m.band, rows: m.grid && m.grid.rows, small: m.small, outside: m.outside });
      if (s.tag === '844x390') {
        await bandShot(P, 'ui2-frame-menu-sideways.png');
        await tap(P, '[data-dash-grid="menu"] [data-dest="quests"]', 900);
        await bandShot(P, 'ui2-frame-page-sideways.png');
      }
    }
    /* 12g. ?dashgrow=0: none (the switch's row) */
    await P.page.setViewportSize({ width: 390, height: 844 });
    await P.page.evaluate(() => { try { history.replaceState(null, '', location.pathname + (location.search ? location.search + '&' : '?') + 'dashgrow=0'); } catch (e) { /* */ } });
    await P.page.reload();
    if (await inWorld(P, rec, 'dashgrow=0')) {
      await H.dashMenuRoot(P);
      await growWatch(P);
      await tap(P, '[data-dash-grid="menu"] [data-dest="quests"]', 900);
      const Z = await growLog(P);
      rec.ok('12g. ?dashgrow=0: the page opens, no motion worn', (await read(P)).page === 'quests' && Z.log.length === 0, Z.log);
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* 10. a computer */
  const D = await H.newPlayer(browser, { name: 'Framedesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true });
  try {
    if (await inWorld(D, rec, 'computer')) {
      const key = async (k) => { await D.page.keyboard.press(k); await D.page.waitForTimeout(600); return read(D); };
      await D.page.mouse.click(640, 200);
      const i1 = await key('KeyI');
      const ii = i1.kind === 'gear-root' ? i1 : await key('KeyI');
      const o = await key('KeyO');
      const p1 = await key('KeyP');
      const p2 = await key('KeyP');
      const i2 = await key('KeyI');
      const esc = await key('Escape');
      rec.ok('10a. I Gear; O the Menu; P Bro, P again closes; I Gear; Esc closes', ii.kind === 'gear-root' && (o.kind === 'menu-root' || o.kind === 'page') && p1.page === 'hero' && p2.kind === 'closed' && i2.kind === 'gear-root' && esc.kind === 'closed',
        { i: ii.kind, o: o.kind, p1: p1.page, p2: p2.kind, i2: i2.kind, esc: esc.kind });
      await H.dashOpen(D, 'dashboard');
      const g = await read(D);
      await H.dashMenuRoot(D);
      const m = await read(D);
      rec.ok('10b. the band as today (243 px), the grid four by two; the tiles wear their keys (Bro P, Quests J, Ranks U, Codex K, Map M)',
        g.band && g.band[1] === 243 && m.grid && m.grid.rows === 2 && m.grid.keys.join(',') === 'P,J,,U,K,,M,', { band: g.band, grid: m.grid });
      await bandShot(D, 'ui2-frame-menu-computer.png');
      await click(D, '[data-dash-grid="menu"] [data-dest="hero"]', 900);
      await bandShot(D, 'ui2-frame-page-computer.png');
    }
  } finally {
    await D.ctx.close().catch(() => {});
  }

  /* 11. ?ui2=0: today's row, remembered; ?ui2=1 the frame again */
  const O = await H.newPlayer(browser, { name: 'Framebak', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0' });
  try {
    if (await inWorld(O, rec, 'ui2=0')) {
      await H.unfoldBand(O);
      const a = await read(O);
      rec.ok('11a. ?ui2=0: today\'s row of six buttons, no frame; the band 243 px', !a.kind && a.rail === 6 && a.band && a.band[1] === 243, { kind: a.kind, rail: a.rail, band: a.band });
      const kept = await O.page.evaluate(() => { try { return localStorage.getItem('bt_ui2'); } catch (e) { return 'n/a'; } });
      rec.ok('11b. ...remembered on the phone (bt_ui2 = "0")', kept === '0', kept);
      await O.page.evaluate(() => { try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])ui2=0/, '$1ui2=1')); } catch (e) { /* */ } });
      await O.page.reload();
      await O.page.waitForTimeout(4000);
      const back = await O.page.evaluate(() => { try { return localStorage.getItem('bt_ui2'); } catch (e) { return 'n/a'; } });
      rec.ok('11c. ?ui2=1 clears it (the frame comes back on the next load)', back === null, back);
    }
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
