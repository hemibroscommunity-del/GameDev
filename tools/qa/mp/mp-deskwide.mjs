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
 *      at the RIGHT edge, 156 px, and the world between them;
 *   2. the controls in four groups -- Move, Fight, Other, Menus -- every row on
 *      the screen, the list filling its column, and a key only while it works:
 *      no Q (Shield) without a shield, Q once one is worn; no R (Whirl) without
 *      a sword in hand;
 *   3. H folds the controls to the ⌨ and the world grows into the room; H again
 *      brings them back;
 *   4. I and P open and close the pages, and with the pages folded the world
 *      starts at the screen's edge;
 *   5. the chat bar lies over the world, not over either column;
 *   6. the Points tab is a list down the column: thirteen rows, every one on
 *      the screen, and a click on one opens its window;
 *   7. the same on a 1366 x 768 laptop: every key on the screen, the Points
 *      rows too;
 *   8. no page errors.
 */
import * as H from './harness.mjs';

const DESK = { width: 1440, height: 900 };
const LAPTOP = { width: 1366, height: 768 };
const SHEET_W = 390, KEYS_W = 156, FOLDED_W = 40;   /* src/ui/deskWide.js */

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
      return { k: (r.querySelector('kbd') || {}).textContent, w: (r.querySelector('span') || {}).textContent, t: Math.round(rr.top), b: Math.round(rr.bottom) };
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
    rec.ok('the pages at the left edge, an upright phone wide (390 px), the window\'s height',
      !!pages && pages.l <= 1 && Math.abs(pages.w - SHEET_W) <= 2 && pages.t <= 1 && pages.b >= DESK.height - 1, { pages, s0 });
    rec.ok('...the controls at the RIGHT edge of the screen, 156 px, the window\'s height',
      !!col && col.side === 'right' && col.state === 'open' && col.box.r >= DESK.width - 1 && Math.abs(col.box.w - KEYS_W) <= 2
        && col.box.t <= 1 && col.box.b >= DESK.height - 1, col && { side: col.side, state: col.state, box: col.box });
    rec.ok('...and the world between them',
      !!cv && !!pages && !!col && cv.l >= pages.r - 2 && cv.r <= col.box.l + 2 && cv.w >= DESK.width - SHEET_W - KEYS_W - 4, { cv, pages: pages && pages.r, keys: col && col.box.l });

    /* ── 2. THE GROUPS, AND ONLY WHAT WORKS ── */
    rec.ok('the controls in four groups under their headings: Move, Fight, Other, Menus',
      !!col && col.groups.map((g) => g.id).join() === 'move,fight,other,menus'
        && col.groups.map((g) => g.head.toLowerCase()).join() === 'move,fight,other,menus', col && col.groups.map((g) => [g.id, g.head]));
    const allRows = col ? col.groups.flatMap((g) => g.rows) : [];
    const want = ['WASD', 'Space', 'X', 'Click', 'F', 'Tab', '1-3', 'E', 'B', 'C', 'H', 'Esc', 'I', 'P', 'J', 'L', 'K', 'O', 'M'];
    rec.ok('...every key that always works listed, the menus\' letters too', want.every((k) => keysOf(col).includes(k)), keysOf(col));
    rec.ok('...every row on the screen, inside the column', !!col && onScreen(allRows, col.box.t, Math.min(col.box.b, DESK.height)),
      allRows.filter((r) => r.b > DESK.height || r.t < 0));
    const lastB = allRows.length ? Math.max(...allRows.map((r) => r.b)) : 0;
    rec.ok('...and the list fills its column: the last key within 60 px of the screen\'s foot', !!col && lastB >= DESK.height - 60, { lastB });
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
    rec.ok('I with the bag open folds the pages away: the world starts at the screen\'s edge, the controls stay',
      !!sI && sI.mode === 'bar' && !pagesI && !!cvI && cvI.l <= 1 && !!(await box(P, '.bt-desk-keys')), { sI, cvI });
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
