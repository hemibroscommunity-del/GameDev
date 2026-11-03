/* ═══ v2.3.4072: ONE DASHBOARD ON EVERY SCREEN, TO TRY (?oneband=1) ═══
 *
 * The owner, 2026-11-02: "unification of all different screen types (mobile
 * landscape, portrait) desktop, tablet, etc to use the same layout and just
 * scale differences to screen size ... I think having the same layout
 * maximizes simplicity consistency and fairness.  User attention is best
 * focused on the bottom portion of whatever screen for menus.  I like the 1/3
 * idea where the menu takes up that much of the bottom of the screen even in
 * layout orientation."  And the refinement he adopted: "One universal layout,
 * one interaction philosophy, and one underlying interface system -- with
 * responsive density rather than uniform scaling ... Use the available space
 * to determine the number of inventory slots ... Maintain minimum readable
 * text and touch-target sizes."
 *
 * THIS REVERSES EARLIER DECISIONS of his (sideways: "No I don't want an
 * overlay over the world", v2.3.2157; "You can actually remove that whole
 * bottom length bar now", v2.3.2168; a computer: "base desktop off the
 * landscape mode", v2.3.3687), so it ships OFF, behind this switch, for him to
 * try on a sideways phone and a computer before it becomes the default
 * (docs/specs/one-band.md).
 *
 * What the switch does, in two moves, both made where the layout already asks
 * its one question:
 *   - playIsLandscape() (playViewport.js) answers "no" and deskWideActive()
 *     (deskWide.js) answers "no", so every screen takes the UPRIGHT path --
 *     the band at the bottom, its nav row and fold pill, pages opening inside
 *     it, the controls above it -- exactly what an upright phone renders;
 *   - the band's height is min(the upright band, a third of the screen)
 *     (sheetGeometry.js barHeight), its contents laid out from the box they
 *     get (oneBandLayout, OneBandColumns.jsx), and a world wider than the
 *     world rule allows gets bars at its sides (bandFootprint's barW).
 * `html.bt-desk-wide` stays on a computer: it is what frees #root from the
 * upright phone's aspect lock (game.css), so the band can be the window's
 * width; with the switch nothing in the JS reads it as the side column.
 *
 * The choice is the DEVICE's (localStorage), not the tab's, unlike ?deskwide:
 * the owner tries it from the installed app on his phone, which has no
 * address bar to type ?oneband=1 into -- the Test panel's row sets it, and
 * ?oneband=0 (or the row again) clears it. */

const KEY = 'bt_oneband';
const CLS = 'bt-one-band';

export function oneBandWanted(search) {
  let q;
  try { q = new URLSearchParams(search != null ? search : (typeof location !== 'undefined' ? location.search : '')); } catch (e) { q = null; }
  const v = q ? q.get('oneband') : null;
  if (v === '1' || v === 'on' || v === 'true') {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* no storage: this load only */ }
    return true;
  }
  if (v === '0' || v === 'off' || v === 'false') {
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ }
    return false;
  }
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
}

/* Is the one band on right now.  A class read, as deskWideActive is: cheap,
   and the one thing every caller (JS geometry, game.css) agrees on. */
export function oneBandActive() {
  try {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains(CLS);
  } catch (e) { return false; }
}

/* main.jsx, BEFORE the render: the first layout reads the shape. */
export function applyOneBand() {
  if (typeof document === 'undefined') return false;
  const on = oneBandWanted();
  try { document.documentElement.classList.toggle(CLS, on); } catch (e) { /* no class: the layouts as they were */ }
  return on;
}

/* The Test panel's row: set the device's choice and reload into it.  The
   address's own ?oneband= is rewritten too, or a reload of a page opened with
   ?oneband=1 would turn it straight back on. */
export function setOneBand(on) {
  try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) { /* the address carries it */ }
  try {
    const u = new URL(location.href);
    u.searchParams.set('oneband', on ? '1' : '0');
    location.replace(u.toString());
  } catch (e) {
    try { location.reload(); } catch (e2) { /* nothing to do */ }
  }
}

/* the QA probe (mp-oneband): the switch, and the band's box as laid out */
if (typeof window !== 'undefined') {
  window.__btOneBand = function () {
    const cs = getComputedStyle(document.documentElement);
    const px = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
    const dash = document.querySelector('.bt-dashboard');
    const cols = document.querySelector('[data-one-band-cols]');
    const canvas = document.querySelector('.brotown-wrap canvas');
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    return {
      on: oneBandActive(),
      orient: document.documentElement.getAttribute('data-orient'),
      win: { w: window.innerWidth, h: window.innerHeight },
      dashH: px('--dash-h'), colsH: px('--cols-h'), playW: px('--play-w'), worldX: px('--world-x'),
      band: r(dash), cols: r(cols), canvas: r(canvas),
      layout: cols && cols.dataset.oneBandLayout ? JSON.parse(cols.dataset.oneBandLayout) : null,
    };
  };
}
