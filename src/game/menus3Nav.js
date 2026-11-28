/* ═══ v2.3.6861: THE NEW MENUS' BACK -- ONE LEVEL, WITH ITS HISTORY (card MN step 4, Bro · Bag) ═══
 *
 * The card's "Decided" 7 (docs/design/menus3/DECISIONS.md): "A one-level
 * 'Back' with its history on every page opened by a deep link; the scroll and
 * the rail's place restored."  The shared piece every section of the new
 * panel uses (the Bag first; the Codex, the Counter and the Player page open
 * the same Item page later): ONE Back button in the panel's header, which
 * goes back ONE page; the pages behind it are kept, so Back again goes one
 * more, to the section's own page.
 *
 * A page is { section, page, arg, rail, scroll }: `page` 'root' is the
 * section's own page (the Bag's grid), anything else a page opened inside the
 * panel ('item', 'slot', 'pet'); `arg` what it shows (an item's key, a slot's
 * id); `rail` the filter the page had lit and `scroll` how far it was
 * scrolled, written into the page as it is LEFT, handed back when Back
 * returns to it.  Every entry (a dock button, a shortcut, a header tab)
 * starts the history again at its section's own page: the owner's rule 1,
 * the same place every time, never "where you left it".
 *
 * Pure and frozen: every verb returns a new history, so the page keeps one
 * value and React draws it.  No imports: node's suite reads this
 * (server/test/menus3-nav.test.mjs). */

export const MENUS3_NAV = Object.freeze({
  DEPTH: 8,   /* pages kept behind the one showing; past it the oldest go (the root never) */
});

const page = (section, p, arg, rail, scroll) => Object.freeze({
  section: String(section || ''),
  page: String(p || 'root'),
  arg: arg == null ? null : arg,
  rail: rail == null ? null : String(rail),
  scroll: Math.max(0, Math.round(Number(scroll) || 0)),
});

/** A section's history from its own page: what every entry opens. */
export function navStart(section, rail) {
  return Object.freeze([page(section, 'root', null, rail == null ? null : rail, 0)]);
}

/** The page showing. */
export function navTop(h) {
  return Array.isArray(h) && h.length ? h[h.length - 1] : null;
}

/** Can Back go anywhere (a page is open over the section's own). */
export function navCanBack(h) {
  return Array.isArray(h) && h.length > 1;
}

/** Open `p` (with `arg`) over the page showing, keeping that page's rail
 *  and scroll as it is left (`keep`: { rail, scroll }).  Opening the page
 *  that is already showing with the same arg changes nothing. */
export function navPush(h, p, arg, keep) {
  const top = navTop(h);
  if (!top) return h;
  if (top.page === p && top.arg === (arg == null ? null : arg)) return h;
  const k = keep || {};
  const left = page(top.section, top.page, top.arg, k.rail !== undefined ? k.rail : top.rail, k.scroll !== undefined ? k.scroll : top.scroll);
  let out = h.slice(0, -1).concat([left, page(top.section, p, arg, null, 0)]);
  /* the depth: the oldest page above the root goes first */
  while (out.length > MENUS3_NAV.DEPTH + 1) out = [out[0]].concat(out.slice(2));
  return Object.freeze(out);
}

/** Back one page: the page under it, its rail and scroll as it was left.
 *  On the section's own page Back changes nothing. */
export function navBack(h) {
  if (!navCanBack(h)) return h;
  return Object.freeze(h.slice(0, -1));
}

/** The page showing changed its rail (a filter lit) or scroll: kept on it,
 *  so Back to it later and a redraw find it the same. */
export function navKeep(h, keep) {
  const top = navTop(h);
  if (!top || !keep) return h;
  const rail = keep.rail !== undefined ? keep.rail : top.rail;
  const scroll = keep.scroll !== undefined ? keep.scroll : top.scroll;
  if (rail === top.rail && Math.round(Number(scroll) || 0) === top.scroll) return h;
  return Object.freeze(h.slice(0, -1).concat([page(top.section, top.page, top.arg, rail, scroll)]));
}

/** Drop every page above the section's own whose thing is gone (an item
 *  sold, eaten, dropped elsewhere): `alive(page)` says which still are. */
export function navPrune(h, alive) {
  if (!Array.isArray(h) || h.length < 2 || typeof alive !== 'function') return h;
  const out = [h[0]];
  for (let i = 1; i < h.length; i++) {
    let ok = true;
    try { ok = !!alive(h[i]); } catch (e) { ok = false; }
    if (!ok) break;   /* a page over a gone one was opened from it: it goes too */
    out.push(h[i]);
  }
  return out.length === h.length ? h : Object.freeze(out);
}
