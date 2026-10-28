/* ═══ A COMPUTER PLAYS THE SIDEWAYS LAYOUT (v2.3.3687) ═══
 *
 * The owner, 2026-10-28: "Yes base desktop off the landscape mode but fix the
 * menu sizes.  Also find a good place to keep a list of all the controls",
 * "Keyboard instructions need to be dynamic since "whirl" doesn't work if you
 * don't have your sword equipped", "If you split the keyboard shortcuts on its
 * own strip to the right and kept the inventory on the left it might look
 * better", "I meant the right side of the screen consists of the black strip
 * with the shortcuts", and "Every menu needs to look like it fits the space."
 *
 * src/ui/deskWide.js takes the computer's aspect lock off (`html.bt-desk-wide`),
 * so the game lays itself out as a phone on its side does.  Proven here on a
 * real page, by real key presses, as players get it (`wide: true`):
 *   1. three columns, the window's height: the pages at the left edge, 390 px
 *      (an upright phone's width, the width they were drawn for), the controls
 *      at the RIGHT edge, 156 px, and the world between them; down the pages,
 *      the owner's order ("the dashboard buttons need to be at the top of that
 *      black bar section", and "change the 3 primary combat level row back
 *      to the bottom"): the buttons, the filters, the bag, the weapons; the
 *      buttons' pictures nearly twice a phone's 24 px ("almost twice as large
 *      as they are now"), and the chip that folds the pages says CLOSE
 *      ("just have a "close" button that says close");
 *   2. the controls in four groups -- Move, Fight, Other, Menus -- every row on
 *      the screen, each group's rows PACKED with a gap between the groups
 *      ("in chunks without spaces within chunks but space between chunks"),
 *      the words 15 px or more ("more readable"), and a key only while it
 *      works: no Q (Shield) without a shield, Q once one is worn; no R (Whirl)
 *      without a sword in hand;
 *   3. H folds the controls to the ⌨ and the world grows into the room; H again
 *      brings them back;
 *   4. I and P open and close the pages, and with the pages folded the world
 *      starts after a strip just wide enough for the fold chip, the chip at
 *      its top, saying OPEN;
 *   5. the chat bar lies over the world, not over either column;
 *   6. the Points tab is a list down the column: thirteen rows, every one on
 *      the screen, and a click on one opens its window;
 *   7. the same on a 1366 x 768 laptop: every key on the screen, the Points
 *      rows too;
 *   8. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DESK = { width: 1440, height: 900 };
const LAPTOP = { width: 1366, height: 768 };
const SHEET_W = 390, KEYS_W = 156, FOLDED_W = 40;   /* src/ui/deskWide.js */
const FOLD_STRIP_W = 80;   /* src/ui/mobile/sheet/sheetGeometry.js DESK_FOLD_STRIP_W (the chip's 64 + 4 gaps) */
const NAV_ICON = 42;       /* ...DESK_NAV_ICON: a phone's 24, nearly twice */

const box = (P, sel) => P.page.evaluate((s) => {
  const n = document.querySelector(s);
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return r.width > 0 ? { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) } : null;
}, sel);
const keysCol = (P) => P.page.evaluate(() => {
  const s = document.querySelector('.bt-desk-keys');
  if (!s) return null;
  const sr = s.getBoundingClientRect();
  const groups = [...s.querySelectorAll('[data-desk-keys-group]')].map((g) => ({
    id: g.getAttribute('data-desk-keys-group'),
    head: ((g.querySelector('.bt-desk-keys-group-head') || {}).textContent || '').trim(),
    rows: [...g.querySelectorAll('.bt-desk-key')].map((r) => {
      const rr = r.getBoundingClientRect();
      const sp = r.querySelector('span');
      return { k: (r.querySelector('kbd') || {}).textContent, w: (sp || {}).textContent, t: Math.round(rr.top), b: Math.round(rr.bottom),
        fs: sp ? parseFloat(getComputedStyle(sp).fontSize) : 0, cut: sp ? sp.scrollWidth > sp.clientWidth + 1 : true };
    }),
  }));
  return { state: s.getAttribute('data-desk-keys'), side: s.getAttribute('data-desk-keys-side'),
    box: { l: Math.round(sr.left), r: Math.round(sr.right), t: Math.round(sr.top), b: Math.round(sr.bottom), w: Math.round(sr.width) }, groups };
});
const keysOf = (col) => (col ? col.groups.flatMap((g) => g.rows.map((r) => r.k)) : []);
const sheet = (P) => P.page.evaluate(() => {
  const b = window.__broDashPanelBus;
  return b ? { mode: b.state.mode, root: b.state.stack[0] || null } : null;
});
const key = async (P, k, ms = 650) => { await P.page.keyboard.press(k); await P.page.waitForTimeout(ms); };
const onScreen = (rows, top, bottom) => rows.every((r) => r.t >= top - 1 && r.b <= bottom + 1);
/* pictures of each layout, for the PR (tools/qa/mp/out/deskwide-*.png) */
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `deskwide-${name}.png`) }); } catch (e) { /* a picture only */ } };

async function intoWorld(browser, wsPort, webPort, name, viewport) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, viewport, world: 'wheel', wide: true });
  await H.enterWorld(P);
  await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
  await P.page.waitForTimeout(2000);
  await H.closeNpcDialogue(P).catch(() => {});
  await H.leaveNpc(P, 'mayor_bro').catch(() => {});
  await P.page.waitForTimeout(800);
  return P;
}

/* the Points tab, open; its rows' boxes */
async function pointsRows(P) {
  const s = await sheet(P);
  if (!s || s.mode !== 'expanded' || s.root !== 'hero') await key(P, 'p', 900);
  /* the tab answers a press, through scrollTap: a real click on it */
  const tab = await box(P, '[data-section="Build"]');
  if (tab) await P.page.mouse.click((tab.l + tab.r) / 2, (tab.t + tab.b) / 2);
  await P.page.waitForTimeout(900);
  return P.page.evaluate(() => {
    const g = document.querySelector('[data-prog3-grid="desk"]');
    const rows = g ? [...g.querySelectorAll('[data-prog3-row]')].map((n) => {
      const r = n.getBoundingClientRect();
      return { id: n.getAttribute('data-prog3-row'), t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) };
    }) : [];
    return { list: !!g, rows, heads: g ? g.querySelectorAll('[data-points-row]').length : 0 };
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await intoWorld(browser, wsPort, webPort, 'Deskwide', DESK);
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    const dw = await P.page.evaluate(() => (window.__btDeskWide ? window.__btDeskWide() : null));
    const orient = await P.page.evaluate(() => document.documentElement.getAttribute('data-orient'));
    rec.ok('a computer playing wide, in the Wheel: the shell the window, the layout sideways (guard)',
      !!dw && dw.active && dw.root && dw.root.w >= DESK.width - 2 && orient === 'landscape', { dw, orient });

    /* ── 1. THREE COLUMNS ── */
    let s0 = await sheet(P);
    if (!s0 || s0.mode !== 'expanded') { await key(P, 'i', 900); s0 = await sheet(P); }
    const pages = await box(P, '.bt-land-sheet');
    let col = await keysCol(P);
    const cv = await box(P, 'canvas');
    await shot(P, '1-home');
    rec.ok('the pages at the left edge, an upright phone wide (390 px), the window\'s height',
      !!pages && pages.l <= 1 && Math.abs(pages.w - SHEET_W) <= 2 && pages.t <= 1 && pages.b >= DESK.height - 1, { pages, s0 });
    rec.ok('...the controls at the RIGHT edge of the screen, 156 px, the window\'s height',
      !!col && col.side === 'right' && col.state === 'open' && col.box.r >= DESK.width - 1 && Math.abs(col.box.w - KEYS_W) <= 2
        && col.box.t <= 1 && col.box.b >= DESK.height - 1, col && { side: col.side, state: col.state, box: col.box });
    rec.ok('...and the world between them',
      !!cv && !!pages && !!col && cv.l >= pages.r - 2 && cv.r <= col.box.l + 2 && cv.w >= DESK.width - SHEET_W - KEYS_W - 4, { cv, pages: pages && pages.r, keys: col && col.box.l });
    /* the column's order, top to bottom */
    const dock = await box(P, '.bt-land-navdock');
    const combat = await box(P, '[data-dash-desk-combat]');
    const filters = await P.page.evaluate(() => {
      const c = [...document.querySelectorAll('[data-dash-desk] .bt-bagchip')].map((n) => n.getBoundingClientRect());
      return c.length ? { n: c.length, t: Math.round(Math.min(...c.map((r) => r.top))), b: Math.round(Math.max(...c.map((r) => r.bottom))) } : null;
    });
    const bag = await box(P, '[data-dash-desk-bag]');
    rec.ok('down the pages: the dashboard\'s buttons the top row, then the bag\'s filters, then the bag, and the three weapons at the foot',
      !!dock && !!combat && !!filters && !!bag && dock.t <= 8 && dock.l <= 8
        && filters.t >= dock.b - 1 && filters.t - dock.b <= 16 && bag.t >= filters.b - 1 && combat.t >= bag.b - 1
        && combat.b <= DESK.height && DESK.height - combat.b <= 16 && filters.n === 5,
      { dock, combat, filters, bag });
    /* the buttons' pictures, and the chip's word */
    const nav = await P.page.evaluate(() => {
      const imgs = [...document.querySelectorAll('.bt-land-navdock .bt-navrail img')].map((n) => n.getBoundingClientRect());
      const btns = [...document.querySelectorAll('.bt-land-navdock .bt-navrail > *')].map((n) => n.getBoundingClientRect());
      const chip = document.querySelector('[data-land-fold]');
      const cr = chip && chip.getBoundingClientRect();
      return { icons: imgs.map((r) => Math.round(r.width)), n: btns.length,
        inside: btns.every((r) => r.left >= 0 && r.right <= 392),
        chip: chip ? { text: chip.textContent.trim(), w: Math.round(cr.width), h: Math.round(cr.height), cut: chip.scrollWidth > chip.clientWidth + 1 } : null };
    });
    rec.ok(`the buttons' pictures nearly twice a phone's 24 px (${nav.icons.join(', ')}), all six buttons in the column`,
      nav.icons.length === 6 && nav.icons.every((w) => w >= NAV_ICON - 1) && nav.n === 6 && nav.inside, nav);
    rec.ok(`...and the chip that folds the pages says CLOSE ("${nav.chip && nav.chip.text}"), not an arrow, its word whole`,
      !!nav.chip && nav.chip.text === 'CLOSE' && !nav.chip.cut && nav.chip.h >= 44, nav.chip);

    /* ── 2. THE GROUPS, AND ONLY WHAT WORKS ── */
    rec.ok('the controls in four groups under their headings: Move, Fight, Other, Menus',
      !!col && col.groups.map((g) => g.id).join() === 'move,fight,other,menus'
        && col.groups.map((g) => g.head.toLowerCase()).join() === 'move,fight,other,menus', col && col.groups.map((g) => [g.id, g.head]));
    const allRows = col ? col.groups.flatMap((g) => g.rows) : [];
    const want = ['WASD', 'Space', 'X', 'Click', 'F', 'Tab', '1-3', 'E', 'B', 'C', 'H', 'Esc', 'I', 'P', 'J', 'L', 'K', 'O', 'M'];
    rec.ok('...every key that always works listed, the menus\' letters too', want.every((k) => keysOf(col).includes(k)), keysOf(col));
    rec.ok('...every row on the screen, inside the column', !!col && onScreen(allRows, col.box.t, Math.min(col.box.b, DESK.height)),
      allRows.filter((r) => r.b > DESK.height || r.t < 0));
    /* the owner: "don't space out the controls evenly make them in chunks
       without spaces within chunks but space between chunks" */
    const chunks = col ? col.groups.map((g) => ({
      id: g.id,
      within: g.rows.slice(1).map((r, i) => r.t - g.rows[i].b),
      h: g.rows.map((r) => r.b - r.t),
      top: g.rows.length ? g.rows[0].t : 0, bot: g.rows.length ? g.rows[g.rows.length - 1].b : 0,
    })) : [];
    const between = chunks.slice(1).map((c, i) => c.top - chunks[i].bot);
    rec.ok('...each group\'s rows packed (no gap within a group), a clear gap between groups, every row 21-28 px',
      chunks.length === 4 && chunks.every((c) => c.within.every((d) => Math.abs(d) <= 1) && c.h.every((h) => h >= 20 && h <= 29))
        && between.every((d) => d >= 24), { chunks, between });
    const fs = allRows.map((r) => r.fs);
    rec.ok('...the words 15 px or more, none cut short', allRows.length > 0 && fs.every((f) => f >= 15) && allRows.every((r) => !r.cut),
      { fs: [...new Set(fs)], cut: allRows.filter((r) => r.cut).map((r) => r.w) });
    let dk = await P.page.evaluate(() => (window.__btDeskKeys ? window.__btDeskKeys() : null));
    rec.ok('no shield worn: no Q (Shield, Bash); no sword in hand: no R (Whirl)',
      !!dk && !dk.have.shield && !dk.have.whirl && !keysOf(col).includes('Q') && !keysOf(col).includes('Q+E') && !keysOf(col).includes('R'), { dk, keys: keysOf(col) });
    /* the list reads the page's own copy (R.shield), as the shield's touch
       button does: a shield on the arm there is what is asked about */
    await P.page.evaluate(() => {
      const R = window._gameState.current.rpg;
      R.shield = { name: 'Pine Shield', type: 'shield', gearBase: 'wood', tierMult: 1, def: 1 };
    });
    await P.page.waitForTimeout(1600);
    col = await keysCol(P);
    dk = await P.page.evaluate(() => (window.__btDeskKeys ? window.__btDeskKeys() : null));
    rec.ok('a shield worn: Q (Shield) listed under Fight, within a second or two', !!dk && dk.have.shield
      && !!col && (col.groups.find((g) => g.id === 'fight') || { rows: [] }).rows.some((r) => r.k === 'Q' && /shield/i.test(r.w)), { dk, keys: keysOf(col) });

    /* ── 3. H FOLDS THE CONTROLS, AND THE WORLD TAKES THE ROOM ── */
    const cv0 = await box(P, 'canvas');
    await key(P, 'h', 900);
    const colH = await keysCol(P);
    const cvH = await box(P, 'canvas');
    rec.ok('H folds the controls to the ⌨ alone (40 px), and the world grows into the room',
      !!colH && colH.state === 'folded' && Math.abs(colH.box.w - FOLDED_W) <= 2 && colH.box.r >= DESK.width - 1
        && !!cvH && !!cv0 && cvH.w >= cv0.w + (KEYS_W - FOLDED_W) - 4 && cvH.r <= colH.box.l + 2, { colH: colH && colH.box, cv0, cvH });
    await key(P, 'h', 900);
    const colH2 = await keysCol(P);
    const cvH2 = await box(P, 'canvas');
    rec.ok('...and H again brings them back, the world as it was', !!colH2 && colH2.state === 'open' && Math.abs(colH2.box.w - KEYS_W) <= 2
      && !!cvH2 && !!cv0 && Math.abs(cvH2.w - cv0.w) <= 3, { colH2: colH2 && colH2.box, cvH2 });

    /* ── 4. I AND P ── */
    await key(P, 'i', 900);
    const sI = await sheet(P);
    const cvI = await box(P, 'canvas');
    const pagesI = await box(P, '.bt-land-sheet');
    const stripI = await box(P, '[data-desk-foldstrip]');
    const chipI = await box(P, '[data-land-fold]');
    const chipWord = await P.page.evaluate(() => { const c = document.querySelector('[data-land-fold]'); return c ? c.textContent.trim() : null; });
    await shot(P, '4-folded');
    rec.ok('I with the bag open folds the pages away: the world starts after the fold chip\'s strip, the chip at its top saying OPEN, the controls stay',
      !!sI && sI.mode === 'bar' && !pagesI && !!cvI && !!stripI && !!chipI
        && stripI.l <= 1 && Math.abs(stripI.w - FOLD_STRIP_W) <= 2 && stripI.t <= 1 && stripI.b >= DESK.height - 1
        && Math.abs(cvI.l - FOLD_STRIP_W) <= 2 && chipI.l >= stripI.l && chipI.r <= stripI.r && chipI.t <= 10
        && chipWord === 'OPEN' && !!(await box(P, '.bt-desk-keys')), { sI, cvI, stripI, chipI, chipWord });
    await key(P, 'p', 900);
    const sP = await sheet(P);
    const pagesP = await box(P, '.bt-land-sheet');
    rec.ok('P opens the Character page in the column', !!sP && sP.mode === 'expanded' && sP.root === 'hero' && !!pagesP && pagesP.l <= 1, { sP, pagesP });
    await key(P, 'p', 900);
    const sP2 = await sheet(P);
    rec.ok('...and P again shuts it', !!sP2 && sP2.mode === 'bar', sP2);
    await key(P, 'i', 900);
    const sI2 = await sheet(P);
    rec.ok('I brings the bag back', !!sI2 && sI2.mode === 'expanded' && sI2.root === 'dashboard', sI2);

    /* ── 5. THE CHAT BAR OVER THE WORLD ── */
    await key(P, 'c', 900);
    const chat = await P.page.evaluate(() => {
      const i = document.querySelector('[data-chat-input]');
      if (!i) return null;
      let n = i;
      while (n && n.parentElement && getComputedStyle(n).position !== 'fixed') n = n.parentElement;
      const r = n.getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(r.right) };
    });
    const pagesC = await box(P, '.bt-land-sheet');
    const colC = await keysCol(P);
    rec.ok('the chat bar lies over the world, clear of the pages and the controls',
      !!chat && !!colC && chat.r <= colC.box.l && (!pagesC || chat.l >= pagesC.r), { chat, pages: pagesC && pagesC.r, keys: colC && colC.box.l });
    await key(P, 'Escape', 700);

    /* ── 6. THE POINTS LIST ── */
    const pts = await pointsRows(P);
    const pagesPts = await box(P, '.bt-land-sheet');
    await shot(P, '6-points');
    rec.ok('the Points tab is a list down the column: thirteen rows, under the three weapons',
      pts.list && pts.rows.length === 13 && pts.heads === 3, { list: pts.list, n: pts.rows.length, heads: pts.heads });
    rec.ok('...every row on the screen, inside the column', pts.rows.length > 0 && !!pagesPts
      && pts.rows.every((r) => r.t >= 0 && r.b <= DESK.height && r.l >= pagesPts.l && r.r <= pagesPts.r + 1),
      pts.rows.filter((r) => r.b > DESK.height));
    const first = pts.rows[0];
    if (first) {
      await P.page.mouse.click((first.l + first.r) / 2, (first.t + first.b) / 2);
      await P.page.waitForTimeout(900);
    }
    const win = await P.page.evaluate(() => { const n = document.querySelector('[data-infopopup]'); return n ? n.getAttribute('data-infopopup') : null; });
    rec.ok('...and a click on one opens its window', !!win, { first, win });
    await key(P, 'Escape', 600);
    await key(P, 'Escape', 600);

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── 7. A LAPTOP ── */
  const L = await intoWorld(browser, wsPort, webPort, 'Deskwidelap', LAPTOP);
  const lerr = [];
  L.page.on('pageerror', (e) => lerr.push(String((e && e.message) || e).slice(0, 200)));
  try {
    const s = await sheet(L);
    if (!s || s.mode !== 'expanded') await key(L, 'i', 900);
    const col = await keysCol(L);
    await shot(L, '7-laptop');
    const rows = col ? col.groups.flatMap((g) => g.rows) : [];
    rec.ok('a 1366 x 768 laptop: the controls at the right edge, every key on the screen',
      !!col && col.box.r >= LAPTOP.width - 1 && rows.length >= 20 && onScreen(rows, 0, LAPTOP.height), { box: col && col.box, n: rows.length, off: rows.filter((r) => r.b > LAPTOP.height) });
    const pts = await pointsRows(L);
    rec.ok('...and every Points row on the screen', pts.rows.length === 13 && pts.rows.every((r) => r.t >= 0 && r.b <= LAPTOP.height),
      pts.rows.filter((r) => r.b > LAPTOP.height));
    rec.ok('...no page errors', lerr.length === 0, lerr.slice(0, 5));
  } finally {
    await L.ctx.close().catch(() => {});
  }
}
