/* ═══ v2.3.6842: V17's GEOMETRY, MEASURED IN THE REAL GAME (card UI4, PR 3) ═══
 *
 * The owner, 2026-11-27, with the V17 menu handoff: "Validate these within
 * the actual game"; "Do not compromise readability, available screen space,
 * gameplay visibility or device fairness".  V17's part 2 (docs/design/v17/
 * MASTER-IMPLEMENTATION.md) gives a table of four sizes (the band, the
 * header, the page, the inner content) and its rules: "Minimum 44 x 44
 * interactive target; primary actions visible without scrolling", "No global
 * shrink-to-fit", "Use container measurements and test intermediate widths,
 * not just four hardcoded mockups".
 *
 * So this opens the card's first-slice screens -- the directory (the Menu's
 * root), Bro, the Combat hub, a weapon's page (Sword), Shared, Gear and an
 * item's summary (the worn sword's) -- at V17's four sizes AND the widths
 * between (upright 320, 360, 414, 430; sideways 667, 740, 932; a computer
 * 1024 and 1280), the way a player reaches them (H.dashOpen's taps), and
 * reads at each:
 *   - the band, the header (the nav row), the page and the inner content
 *     (the page's box less its pads and borders, and the box its content
 *     draws in), against V17's table where V17 has a row;
 *   - every control's box (a button, a role=button or tab, an input): 44 by
 *     44 at least;
 *   - the screen's MAIN ACTION (the doors, the attribute tiles, the cells,
 *     the summary's buttons) inside the band, inside every box that clips
 *     it, and on top (elementFromPoint), with nothing scrolled;
 *   - a word cut (its box clipped, an ellipsis, a line clamp) or two words
 *     over each other; two controls over each other.
 * It FAILS on a control under 44, a cut or overlapping word or a hidden main
 * action.  A number that only differs from V17's table is LISTED, never
 * failed (the band's heights are the game's, and the card's "What NEVER
 * changes").  What it finds in a screen is listed for that screen's PR (card
 * UI4 PR 4 Bro, PR 5 Combat, PR 6 Gear): mended there, not here.
 *
 * And `?v17wide` (game/v17Wide.js), card UI4 PR 3's other half: on a
 * computer the open band's block is 840 wide and centred (V17's Desktop
 * row), the world's canvas and the camera's scale the same as under
 * `?v17wide=0` (480) at the same window, the type no larger (the smallest
 * and largest word of each screen the same under both), and `=0` remembered.
 *
 * The page is measured from OUTSIDE the game: this test's evaluate, after the
 * page has settled, never a read the game makes (docs/specs/layout-reads.md
 * binds src/; this PR adds no read there).
 *
 * Writes docs/shots/v17fit-table.md (the table for the owner) and
 * docs/shots/v17fit-table.json; pictures of the band at V17's four sizes,
 * deviceScaleFactor 2: docs/shots/v17fit-<screen>-<size>.png, and the
 * computer under `?v17wide=0`: docs/shots/v17fit-<screen>-1440x900-480.png.
 * Knobs: BT_QA_V17FIT_SIZES=390x844,1440x900 (a share of the sizes, for a
 * helper session); BT_QA_V17FIT_SHOTS=0 (no pictures).
 */
import path from 'node:path';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = process.env.BT_QA_V17FIT_OUT ? path.resolve(process.env.BT_QA_V17FIT_OUT) : path.join(ROOT, 'docs', 'shots');

/* V17's table (MASTER-IMPLEMENTATION.md part 2): band w x h, header, page w x h, inner w x h */
const V17 = {
  '390x844': { band: [390, 243], head: 52, page: [390, 191], inner: [378, 179] },
  '375x667': { band: [375, 235], head: 48, page: [375, 187], inner: [363, 175] },
  '844x390': { band: [844, 130], head: 48, page: [844, 82], inner: [832, 72] },
  '1440x900': { band: [840, 243], head: 52, page: [840, 191], inner: [828, 179] },
};
const REF = new Set(Object.keys(V17));
/* the sizes: V17's four and the widths between (the card's list); a phone is ONE phone turned (TRAPS 175) */
const PHONE_UP = ['390x844', '375x667', '320x568', '360x780', '414x896', '430x932'];
const PHONE_SIDE = ['844x390', '667x375', '740x360', '932x430'];
const DESK = ['1440x900', '1024x768', '1280x800'];
const ONLY = (process.env.BT_QA_V17FIT_SIZES || '').split(',').map((s) => s.trim()).filter(Boolean);
const want = (s) => !ONLY.length || ONLY.includes(s);
const SHOOT = process.env.BT_QA_V17FIT_SHOTS !== '0';
/* v2.3.6845 (card UI4 PR 6): a sample while a screen's PR works (BT_QA_V17FIT_SCREENS=gear,item), a page switch on
   every player (BT_QA_V17FIT_QUERY=v17gear=0, the "before"), and the table and pictures written somewhere else
   (BT_QA_V17FIT_OUT, a folder): a sample never overwrites the whole run's table in docs/shots */
const ONLY_SCREENS = (process.env.BT_QA_V17FIT_SCREENS || '').split(',').map((s) => s.trim()).filter(Boolean);
const QUERY = process.env.BT_QA_V17FIT_QUERY || '';
const withQuery = (q) => [q, QUERY].filter(Boolean).join('&') || undefined;

/* the screens: how a player opens each, its root, and its main action (what must be in view unscrolled) */
const SCREENS = [
  { id: 'menu', name: 'Directory (the Menu)', root: '[data-dash-grid="menu"]', main: '[data-dash-grid="menu"] [data-dest]', pr: 'the directory (not this slice: Q3)' },
  { id: 'bro', name: 'Bro', root: '[data-bro-landing]', main: '[data-dash-grid="bro"] [data-dest]', pr: 'PR 4 (UI4-bro)' },
  { id: 'hub', name: 'Combat hub', root: '[data-combat-hub]', main: '[data-combat-door]', pr: 'PR 4/5 (UI4-bro, UI4-combat)' },
  { id: 'weapon', name: 'Weapon page (Sword)', root: '[data-weapon-page]', main: '[data-weapon-attr]', pr: 'PR 5 (UI4-combat)' },
  { id: 'shared', name: 'Shared', root: '[data-shared-page]', main: '[data-shared-attr]', pr: 'PR 5 (UI4-combat)' },
  { id: 'gear', name: 'Gear', root: '[data-band-box]:has([data-gear-cell])', main: '[data-gear-cell] [role="button"]', pr: 'PR 6 (UI4-gear)' },
  { id: 'item', name: 'Item summary (the worn sword)', root: '[data-gear-summary]', main: '[data-gear-summary] [data-gear-act], [data-gear-summary] [data-gear-details]', pr: 'PR 6 (UI4-gear)' },
];

/* ── the reading, in the page (planted as window.__v17fit) ── */
function measure(rootSel, mainSel) {
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const rnd = (b) => b && [Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h)];
  const band = document.querySelector('.bt-dashboard');
  const nav = document.querySelector('[data-band-box="nav"]');
  const root = document.querySelector(rootSel);
  /* the page's box: the band box that holds the screen (Gear draws in the resting columns' box, "cols") */
  const pageBox = root ? (root.matches('[data-band-box]') ? root : root.closest('[data-band-box]')) : null;
  if (!band || !pageBox || !root) return { missing: !band ? 'band' : !pageBox ? 'page' : 'root' };
  const B = R(band), PG = R(pageBox), NV = nav ? R(nav) : null;
  const vis = (e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
  const clips = (cs) => cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
  /* the visible part of a box: cut by every ancestor that clips, the band, the window */
  const shown = (e) => {
    let r = R(e); let L = r.x, T = r.y, Rt = r.r, Bt = r.b;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      if (!clips(getComputedStyle(a))) continue;
      const q = a.getBoundingClientRect();
      L = Math.max(L, q.left); T = Math.max(T, q.top); Rt = Math.min(Rt, q.right); Bt = Math.min(Bt, q.bottom);
    }
    L = Math.max(L, 0, B.x); T = Math.max(T, 0, B.y); Rt = Math.min(Rt, innerWidth, B.r); Bt = Math.min(Bt, innerHeight, B.b);
    return { r, L, T, Rt, Bt, whole: L <= r.x + 1 && T <= r.y + 1 && Rt >= r.r - 1 && Bt >= r.b - 1, any: Rt - L > 1 && Bt - T > 1 };
  };
  /* the inner content: the page's box less the pads and borders of the chain that holds it */
  let inner = PG, el = pageBox;
  for (let i = 0; i < 8 && el; i++) {
    const cs = getComputedStyle(el);
    const p = (k) => parseFloat(cs[k]) || 0;
    const r = R(el);
    const box = { x: r.x + p('paddingLeft') + p('borderLeftWidth'), y: r.y + p('paddingTop') + p('borderTopWidth') };
    box.w = r.w - p('paddingLeft') - p('paddingRight') - p('borderLeftWidth') - p('borderRightWidth');
    box.h = r.h - p('paddingTop') - p('paddingBottom') - p('borderTopWidth') - p('borderBottomWidth');
    inner = box;
    const kids = Array.from(el.children).filter(vis);
    if (kids.length !== 1) break;
    el = kids[0];
  }
  /* the box the screen's content draws in (its visible leaves' union) */
  let dL = 1e9, dT = 1e9, dR = -1e9, dB = -1e9;
  for (const e of root.querySelectorAll('*')) {
    if (e.children.length || !vis(e)) continue;
    const s = shown(e); if (!s.any) continue;
    dL = Math.min(dL, s.L); dT = Math.min(dT, s.T); dR = Math.max(dR, s.Rt); dB = Math.max(dB, s.Bt);
  }
  const drawn = dR > dL ? { x: dL, y: dT, w: dR - dL, h: dB - dT } : null;
  /* controls: the page's and the header's */
  const CTL = 'button, [role="button"], [role="tab"], a[href], input, select, textarea';
  const scopes = [root].concat(nav ? [nav] : []);
  const ctlEls = [];
  for (const s of scopes) for (const e of s.querySelectorAll(CTL)) if (vis(e) && !ctlEls.includes(e) && !(e.parentElement && e.parentElement.closest(CTL) && s.contains(e.parentElement.closest(CTL)))) ctlEls.push(e);
  const label = (e) => (e.getAttribute('aria-label') || e.getAttribute('data-dest') || e.getAttribute('data-dash-ctl') || e.getAttribute('data-combat-door') || e.getAttribute('data-weapon-attr') || e.getAttribute('data-shared-attr') || (e.closest('[data-gear-cell]') || { getAttribute: () => null }).getAttribute('data-gear-cell') || e.getAttribute('data-bag-key') || e.getAttribute('data-bro-fact') || e.textContent.trim().replace(/\s+/g, ' ').slice(0, 18) || e.tagName).slice(0, 24);
  /* the touch box: the control's own, or the kit's hit-extender's when it is bigger (.u2-hit::after, ui2.css:
     a 24 px header button touched over 44) */
  const hit = (e, r) => {
    let w = r.w, h = r.h;
    for (const ps of ['::before', '::after']) {
      const c = getComputedStyle(e, ps);
      if (!c || c.content === 'none' || c.position !== 'absolute' || c.display === 'none' || c.pointerEvents === 'none') continue;
      w = Math.max(w, parseFloat(c.width) || 0); h = Math.max(h, parseFloat(c.height) || 0);
    }
    return { w, h };
  };
  const controls = ctlEls.map((e) => { const s = shown(e); const t = hit(e, s.r); return { id: label(e), w: Math.round(t.w * 10) / 10, h: Math.round(t.h * 10) / 10, drawn: t.w !== s.r.w || t.h !== s.r.h ? `${Math.round(s.r.w)}x${Math.round(s.r.h)}` : null, inView: s.any, el: e }; });
  const grown = controls.filter((c) => c.inView && c.drawn).map((c) => `${c.id} drawn ${c.drawn}, touched ${c.w}x${c.h}`);
  const small = controls.filter((c) => c.inView && (c.w < 43.5 || c.h < 43.5)).map((c) => `${c.id} ${c.w}x${c.h}`);
  /* two controls over each other (neither inside the other) */
  const over = [];
  for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
    const a = controls[i], b = controls[j];
    if (!a.inView || !b.inView || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const p = a.el.getBoundingClientRect(), q = b.el.getBoundingClientRect();
    const ox = Math.min(p.right, q.right) - Math.max(p.left, q.left), oy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
    if (ox > 2 && oy > 2) over.push(`${a.id} / ${b.id}`);
  }
  /* words: cut (clipped by a box, an ellipsis, a clamp) or over each other */
  const words = [];
  for (const e of root.querySelectorAll('*')) {
    if (!vis(e)) continue;
    let txt = '';
    for (const n of e.childNodes) if (n.nodeType === 3) txt += n.textContent;
    txt = txt.trim();
    if (!txt) continue;
    words.push({ e, txt });
  }
  const cut = [];
  let minFont = 99, maxFont = 0;
  for (const { e, txt } of words) {
    const cs = getComputedStyle(e);
    minFont = Math.min(minFont, parseFloat(cs.fontSize)); maxFont = Math.max(maxFont, parseFloat(cs.fontSize));
    const s = shown(e);
    if (!s.any) continue;   /* scrolled out of a list: not cut, out of view */
    const t = txt.slice(0, 22);
    if (clips(cs) && e.scrollWidth > e.clientWidth + 1) { cut.push(`${t} (wider than its box)`); continue; }
    if (clips(cs) && e.scrollHeight > e.clientHeight + 2) { cut.push(`${t} (taller than its box)`); continue; }
    if (!s.whole) {
      /* the text's own glyphs, not its box: a range's rects */
      const rg = document.createRange(); rg.selectNodeContents(e);
      const tr = rg.getBoundingClientRect();
      if (tr.width > 0 && (tr.left < s.L - 1 || tr.right > s.Rt + 1 || tr.top < s.T - 1 || tr.bottom > s.Bt + 1)) cut.push(`${t} (clipped)`);
    }
  }
  const overlapWords = [];
  /* each word's ink, near enough: its glyph box less a fifth of its size top and bottom (a glyph's box is the
     font's whole ascent and descent, taller than its line: two lines set tight touch there and never in ink) */
  const wr = words.map(({ e, txt }) => {
    const rg = document.createRange(); rg.selectNodeContents(e);
    const g = rg.getBoundingClientRect(), f = parseFloat(getComputedStyle(e).fontSize) * 0.2;
    return { e, txt, r: { left: g.left + 1, right: g.right - 1, top: g.top + f, bottom: g.bottom - f, width: g.width } };
  }).filter((w) => w.r.width > 0);
  for (let i = 0; i < wr.length; i++) for (let j = i + 1; j < wr.length; j++) {
    const a = wr[i], b = wr[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ox > 1 && oy > 1) overlapWords.push(`${a.txt.slice(0, 14)} / ${b.txt.slice(0, 14)}`);
  }
  /* the main action: there, whole, on top, nothing scrolled */
  const mains = Array.from(document.querySelectorAll(mainSel)).filter(vis);
  const hidden = [];
  for (const m of mains) {
    const s = shown(m);
    const cx = (s.r.x + s.r.r) / 2, cy = (s.r.y + s.r.b) / 2;
    const top = document.elementFromPoint(cx, cy);
    const onTop = !!top && (m === top || m.contains(top) || top.contains(m));
    if (!s.whole || !onTop) hidden.push(`${label(m)}${!s.whole ? ' (not whole in view)' : ' (covered)'}`);
  }
  /* entries a row: the main actions on the first one's line (V17: a computer's room is for MORE entries) */
  const tops = mains.map((m) => m.getBoundingClientRect().top);
  const perRow = tops.length ? tops.filter((t) => Math.abs(t - Math.min(...tops)) <= 2).length : 0;
  const mainW = mains.length ? Math.round(mains[0].getBoundingClientRect().width) : 0;
  let scrolled = false;
  for (let a = root; a && a !== band; a = a.parentElement) if (a.scrollTop > 0 || a.scrollLeft > 0) scrolled = true;
  const canvas = document.querySelector('canvas');
  const view = window.__btWorldView ? window.__btWorldView('wheel') : null;
  const t = document.querySelector('[data-dash-title]');
  return {
    title: t ? t.getAttribute('data-dash-title') : null,
    band: rnd(B), head: NV ? Math.round(NV.h) : null, page: rnd(PG), inner: rnd(inner), drawn: rnd(drawn),
    controls: controls.length, small, grown, over, cut, overlapWords, mains: mains.length, perRow, mainW, hidden, scrolled,
    minFont, maxFont, canvas: canvas ? rnd(R(canvas)) : null, view,
  };
}

const BAND_SHOT = async (P, file) => {
  if (!SHOOT) return;
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  } catch (e) { /* no picture */ }
};
const sizeOf = (s) => { const [w, h] = s.split('x').map(Number); return { width: w, height: h }; };
const tap = async (P, sel, ms = 700) => {
  const el = P.page.locator(sel).first();
  const touch = await P.page.evaluate(() => navigator.maxTouchPoints > 0).catch(() => false);
  if (touch) await el.tap({ timeout: 12000 }); else await el.click({ timeout: 12000 });
  await P.page.waitForTimeout(ms);
};

async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  if (w) await P.page.evaluate(`window.__v17fit = ${measure.toString()}`);
  return !!w;
}
/* a character with something on every screen: Sword 12 and Bow 5 with points to spend (the worker's deal), a weapon in hand, rare armour and a few things in the bag */
async function seed(P, wsPort, rec, tag) {
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'combat', id, { skill: 'sword', level: 12 }).catch(() => null);
  await H.devOp(wsPort, 'combat', id, { skill: 'bow', level: 5, deal: true }).catch(() => null);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']).catch(() => null);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const r0 = await P.page.evaluate(() => !!(window._gameState.current.rpg || {}).weapon);
  if (!r0) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null); await P.page.waitForTimeout(1500); }
  await H.devOp(wsPort, 'kit', id, { what: 'armor', quality: 'rare' }).catch(() => null);
  await H.grant(wsPort, id, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => null);
  await H.grant(wsPort, id, 'item', { invKey: 'ore_copper_ore', count: 3 }).catch(() => null);
  await P.page.waitForTimeout(2500);
  const r = await P.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return { weapon: !!R.weapon, lv: R.prog3 && R.prog3.sk ? R.prog3.sk.sword.level : null }; });
  rec.ok(`${tag}: seeded (a weapon in hand, Sword 12)`, r.weapon && r.lv === 12, r);
}

/* open one screen the way a player does */
async function openScreen(P, id) {
  if (id === 'gear' || id === 'item') {
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
    await P.page.waitForTimeout(500);
    await H.dashOpen(P, 'dashboard');
    await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.reset(); });
    await P.page.waitForTimeout(600);
    if (id === 'item') await tap(P, '[data-gear-cell="sword"] [role="button"]', 900);
    return;
  }
  if (id === 'menu') { await H.dashOpen(P, 'more'); await P.page.waitForTimeout(500); return; }
  if (id === 'bro') { await H.dashOpen(P, 'hero'); await P.page.waitForTimeout(600); return; }
  if (id === 'hub' || id === 'shared') {
    await H.dashOpen(P, 'broCombat');
    await P.page.waitForTimeout(600);
    if (id === 'shared') await tap(P, '[data-combat-door="shared"]', 900);
    return;
  }
  if (id === 'weapon') { await H.dashOpen(P, 'broSword'); await P.page.waitForTimeout(800); }
}

const ROWS = [];
async function sweep(P, rec, size, form, suffix = '') {
  await P.page.setViewportSize(sizeOf(size));
  await P.page.waitForTimeout(1800);
  for (const sc of SCREENS) {
    if (ONLY_SCREENS.length && !ONLY_SCREENS.includes(sc.id)) continue;
    let m = null;
    try {
      await openScreen(P, sc.id);
      await P.page.waitForSelector(sc.root, { timeout: 8000 });
      await P.page.waitForTimeout(400);
      m = await P.page.evaluate(([a, b]) => window.__v17fit(a, b), [sc.root, sc.main]);
    } catch (e) { m = { missing: String(e).slice(0, 120) }; }
    const row = { size: size + suffix, form, screen: sc.id, name: sc.name, pr: sc.pr, ...m };
    ROWS.push(row);
    /* v2.3.6845: Gear's own box and columns as the page drew them (`?v17gear` writes them), for its PR's numbers */
    if (sc.id === 'gear' || sc.id === 'item') {
      row.gearBox = await P.page.evaluate(() => { const g = document.querySelector('[data-gear-ws]'); return g ? [g.getAttribute('data-gear-box'), g.getAttribute('data-gear-cols')].join(' / ') : null; }).catch(() => null);
      /* the bag's room at its two edges (the owner, 11-28: "Inventory slots are awkwardly spaced on the sides"): the
         panel's inner edges against the first column's left and the last column's right */
      row.bagEdges = await P.page.evaluate(() => {
        const pane = document.querySelector('[data-ws-side="left"] .u2-pane-body'), cells = Array.from(document.querySelectorAll('[data-gear-bag] .u2-grid-in > .u2-cell'));
        if (!pane || !cells.length) return null;
        const p = pane.getBoundingClientRect(), xs = cells.map((c) => c.getBoundingClientRect());
        const left = Math.min(...xs.map((r) => r.left)), right = Math.max(...xs.map((r) => r.right));
        return { left: Math.round(left - p.left), right: Math.round(p.right - right), cell: Math.round(xs[0].width) };
      }).catch(() => null);
    }
    const tag = `${size}${suffix} ${sc.name}`;
    if (m.missing) { rec.ok(`${tag}: opened (guard)`, false, m.missing); continue; }
    rec.ok(`${tag}: every control 44 x 44 or more`, m.small.length === 0, m.small);
    rec.ok(`${tag}: no word cut or over another`, m.cut.length === 0 && m.overlapWords.length === 0, { cut: m.cut, over: m.overlapWords });
    rec.ok(`${tag}: the main action in view, whole, on top, unscrolled (${m.mains})`, m.mains > 0 && m.hidden.length === 0 && !m.scrolled, m.hidden);
    if (form === 'computer' && sc.id === 'bro') {
      /* the keys list beside the block (the shell's own: v2.3.4263): its room kept, never over the block */
      const k = await P.page.evaluate(() => {
        const e = document.querySelector('.bt-band-keys'), pg = document.querySelector('[data-band-box="page"]');
        if (!e || !pg || getComputedStyle(e).display === 'none') return null;
        const a = e.getBoundingClientRect(), b = pg.getBoundingClientRect();
        return { w: Math.round(a.width), gap: Math.round(a.left - b.right) };
      });
      row.keys = k;
      rec.ok(`${tag}: the keys list beside the block keeps its room (220 px or more) and stands clear of it`, !k || (k.w >= 220 && k.gap >= 8), k);
    }
    if ((REF.has(size) || process.env.BT_QA_V17FIT_OUT) && !suffix) await BAND_SHOT(P, `v17fit-${sc.id}-${size}.png`);   /* v2.3.6845: a sample's every size */
    if (suffix === '-480' && size === '1440x900') await BAND_SHOT(P, `v17fit-${sc.id}-${size}-480.png`);
  }
}

/* ── the table for the owner ── */
const fmt = (b) => (b ? `${b[2]} x ${b[3]}` : '-');
function vs(row) {
  const v = V17[row.size];
  if (!v || row.missing) return [];
  const d = [];
  const bandW = row.form === 'computer' ? row.page[2] : row.band[2];
  if (bandW !== v.band[0] || row.band[3] !== v.band[1]) d.push(`band ${bandW} x ${row.band[3]} (V17 ${v.band[0]} x ${v.band[1]})`);
  if (row.head !== v.head) d.push(`header ${row.head} (V17 ${v.head})`);
  if (row.page[2] !== v.page[0] || row.page[3] !== v.page[1]) d.push(`page ${fmt(row.page)} (V17 ${v.page[0]} x ${v.page[1]})`);
  if (row.inner[2] !== v.inner[0] || row.inner[3] !== v.inner[1]) d.push(`inner ${fmt(row.inner)} (V17 ${v.inner[0]} x ${v.inner[1]})`);
  return d;
}
function writeTable() {
  mkdirSync(SHOTS, { recursive: true });
  /* a share of the sizes (BT_QA_V17FIT_SIZES): the other sizes' rows kept from the table on file */
  if (ONLY.length) {
    let old = [];
    try { old = JSON.parse(readFileSync(path.join(SHOTS, 'v17fit-table.json'), 'utf8')); } catch (e) { old = []; }
    const ran = new Set(ROWS.map((r) => r.size));
    const keep = old.filter((r) => !ran.has(r.size));
    const order = PHONE_UP.concat(PHONE_SIDE, DESK, ['1440x900-480']);
    ROWS.splice(0, ROWS.length, ...keep.concat(ROWS).sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size)));
  }
  const lines = [];
  lines.push('# V17 fit, measured in the game (mp-v17fit, card UI4 PR 3, v2.3.6842)', '');
  lines.push('Written by `node tools/qa/mp/run.mjs v17fit`. Sizes in CSS px. "band" is the band\'s box (on a computer its full width; the open block is "page"), "head" the nav row, "page" the page\'s box, "inner" the page less its pads and borders, "drawn" the box its content draws in. FAILS: a control under 44 x 44, a word cut or over another, the main action not whole in view. LISTED (never failed): a number unlike V17\'s table, two controls over each other.', '');
  lines.push('| size | screen | band | head | page | inner | drawn | controls | under 44 | drawn under 44, touched 44 (a hit-extender) | cut / overlapping words | entries a row (width of one) | main action hidden | controls over each other | words px | unlike V17 |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of ROWS) {
    if (r.missing) { lines.push(`| ${r.size} | ${r.name} | NOT OPENED: ${r.missing} |`); continue; }
    const cell = (a) => (a.length ? a.slice(0, 6).join('; ') + (a.length > 6 ? ` (+${a.length - 6})` : '') : '0');
    lines.push(`| ${r.size} | ${r.name} | ${fmt(r.band)} | ${r.head} | ${fmt(r.page)} | ${fmt(r.inner)} | ${fmt(r.drawn)} | ${r.controls} | ${cell(r.small)} | ${cell(r.grown || [])} | ${cell(r.cut.concat(r.overlapWords))} | ${r.perRow} (${r.mainW}) | ${cell(r.hidden)}${r.scrolled ? ' (scrolled)' : ''} | ${cell(r.over)} | ${r.minFont}-${r.maxFont} | ${vs(r).join('; ') || (V17[r.size] ? 'same' : '(no V17 row)')} |`);
  }
  writeFileSync(path.join(SHOTS, 'v17fit-table.md'), lines.join('\n') + '\n');
  writeFileSync(path.join(SHOTS, 'v17fit-table.json'), JSON.stringify(ROWS.map((r) => { const o = { ...r }; delete o.view; return o; }), null, 1) + '\n');
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* 1. a phone, upright then on its side (one phone turned: TRAPS 175) */
  if (PHONE_UP.concat(PHONE_SIDE).some(want)) {
    const P = await H.newPlayer(browser, { name: 'Fitphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2, query: withQuery() });
    try {
      if (await inWorld(P, rec, 'phone')) {
        await seed(P, wsPort, rec, 'phone');
        await H.unfoldBand(P).catch(() => null);
        for (const s of PHONE_UP) if (want(s)) await sweep(P, rec, s, 'upright');
        for (const s of PHONE_SIDE) if (want(s)) await sweep(P, rec, s, 'sideways');
      }
    } finally { await P.ctx?.close?.().catch(() => {}); }
  }
  /* 2. a computer, ?v17wide on (the default): 840, centred */
  const wide = {};
  if (DESK.some(want)) {
    const C = await H.newPlayer(browser, { name: 'Fitdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true, dpr: 2, query: withQuery() });
    try {
      if (await inWorld(C, rec, 'computer')) {
        await seed(C, wsPort, rec, 'computer');
        await H.unfoldBand(C).catch(() => null);
        for (const s of DESK) if (want(s)) await sweep(C, rec, s, 'computer');
        const w0 = ROWS.find((r) => r.size === '1440x900' && r.screen === 'bro');
        if (w0 && !w0.missing) {
          const centred = Math.abs((w0.page[0] + w0.page[2] / 2) - (w0.band[0] + w0.band[2] / 2)) <= 1;
          rec.ok('wide: at 1440 x 900 the open block is 840 wide and centred in the band (V17\'s Desktop row)', w0.page[2] === 840 && centred, { page: w0.page, band: w0.band });
        }
        await C.page.setViewportSize({ width: 1440, height: 900 });   /* the world read at 1440 x 900, as the 480 page's */
        await C.page.waitForTimeout(1800);
        wide.canvas = await C.page.evaluate(() => { const c = document.querySelector('canvas'); const r = c && c.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; });
        wide.view = await C.page.evaluate(() => (window.__btWorldView ? window.__btWorldView('wheel') : null));
      }
    } finally { await C.ctx?.close?.().catch(() => {}); }
  }
  /* 3. the same computer under ?v17wide=0: 480, and the world and the camera the same as under 840 */
  if (want('1440x900')) {
    const O = await H.newPlayer(browser, { name: 'Fitnarrow', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true, dpr: 2, query: withQuery('v17wide=0') });
    try {
      if (await inWorld(O, rec, 'computer, ?v17wide=0')) {
        await seed(O, wsPort, rec, 'computer, ?v17wide=0');
        await H.unfoldBand(O).catch(() => null);
        const stored = await O.page.evaluate(() => { try { return localStorage.getItem('bt_v17wide'); } catch (e) { return 'x'; } });
        rec.ok('narrow: ?v17wide=0 is remembered on the device (bt_v17wide "0")', stored === '0', stored);
        await sweep(O, rec, '1440x900', 'computer', '-480');
        const n0 = ROWS.find((r) => r.size === '1440x900-480' && r.screen === 'bro');
        if (!ONLY_SCREENS.length || ONLY_SCREENS.includes('bro')) rec.ok('narrow: the open block is 480 wide under ?v17wide=0', !!n0 && !n0.missing && n0.page[2] === 480, n0 && n0.page);
        const canvas = await O.page.evaluate(() => { const c = document.querySelector('canvas'); const r = c && c.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; });
        const view = await O.page.evaluate(() => (window.__btWorldView ? window.__btWorldView('wheel') : null));
        if (wide.canvas) {
          rec.ok('fair: the world\'s canvas is the same size under 840 and 480 (the world no wider)', JSON.stringify(canvas) === JSON.stringify(wide.canvas), { wide: wide.canvas, narrow: canvas });
          rec.ok('fair: the camera sees the same (worldViewport\'s scale, W and H the same under both)', !!view && !!wide.view && view.scale === wide.view.scale && view.W === wide.view.W && view.H === wide.view.H, { wide: wide.view, narrow: view });
        }
        /* the room used for more entries, never larger words: each screen's type the same under both */
        for (const sc of SCREENS) {
          const a = ROWS.find((r) => r.size === '1440x900' && r.screen === sc.id), b = ROWS.find((r) => r.size === '1440x900-480' && r.screen === sc.id);
          if (!a || !b || a.missing || b.missing) continue;
          rec.ok(`wide: ${sc.name}: no larger words at 840 than at 480 (largest ${a.maxFont} against ${b.maxFont}, smallest ${a.minFont} against ${b.minFont})`, a.maxFont <= b.maxFont && a.minFont <= b.minFont, null);
        }
        /* the room for MORE entries (V17:31): LISTED, the screens' own PRs (4, 5, 6) lay them out */
        for (const sc of SCREENS) {
          const a = ROWS.find((r) => r.size === '1440x900' && r.screen === sc.id), b = ROWS.find((r) => r.size === '1440x900-480' && r.screen === sc.id);
          if (!a || !b || a.missing || b.missing) continue;
          rec.ok(`LISTED wide: ${sc.name}: ${a.perRow} entries a row at 840 (each ${a.mainW} px) against ${b.perRow} at 480 (each ${b.mainW} px)${a.perRow > b.perRow ? '' : ': the room not yet used for more entries (' + sc.pr + ')'}`, true, null);
        }
        /* =1 forgets */
        await O.page.goto(O.page.url().replace('v17wide=0', 'v17wide=1')).catch(() => null);
        await O.page.waitForTimeout(1500);
        const after = await O.page.evaluate(() => { try { return localStorage.getItem('bt_v17wide'); } catch (e) { return 'x'; } });
        rec.ok('narrow: ?v17wide=1 forgets the stored off', after === null, after);
      }
    } finally { await O.ctx?.close?.().catch(() => {}); }
  }
  writeTable();
  /* the differences from V17's table, LISTED (never failed) */
  for (const r of ROWS) { const d = vs(r); if (d.length && r.screen === 'bro') rec.ok(`LISTED ${r.size}: unlike V17's table: ${d.join('; ')}`, true, null); }
}
