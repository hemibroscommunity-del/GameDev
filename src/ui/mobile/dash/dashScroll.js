/* ═══ v2.3.6681: A PAGE'S SCROLL, KEPT AND GIVEN BACK (card UI2-frame) ═══
 * The specification: "Back follows the actual navigation history ...
 * Preserve scroll, selections and relevant context on returning from
 * drill-downs"; the card: "Close then Menu resumes the page and its scroll".
 * Each visit of a page (a dashNav entry, its `key`) keeps its own scroll.
 *
 * READ AND WRITTEN ONLY AT THE TOP OF THE GAME'S FRAME (docs/specs/
 * layout-reads.md, way 3: `beforeDraw`), never in the scroll event or a tap:
 * the page box (BottomDashboard's `data-band-box="page"`) listens for its
 * pages' scroll in the capture phase (a scroll event does not bubble), and
 * asks the next frame's top to read the scroller's place, once a frame.  The
 * scroller is remembered by its path of child places under the box (no
 * search of the page); the place goes to the entry by dashNav's 'keep', which
 * draws nothing.  On a page's return the same path is found at the next
 * frame's top and its place written back, tried for a few frames while the
 * page's rows arrive. */
import { beforeDraw } from '@/game/framePacer.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';

const PATHS = new Map();   /* entry key -> the scroller's path under the box (capped below) */
const PATHS_CAP = 64;
let _box = null;
let _asked = null;         /* { el, key } waiting for the frame's top */
let _back = null;          /* { key, scroll, tries } waiting to be given back */

function pathUnder(box, el) {
  const p = [];
  let n = el;
  while (n && n !== box) {
    const up = n.parentNode;
    if (!up || !up.children) return null;
    p.unshift(Array.prototype.indexOf.call(up.children, n));
    n = up;
  }
  return n === box ? p : null;
}
function atPath(box, p) {
  let n = box;
  for (const i of p) { n = n && n.children ? n.children[i] : null; if (!n) return null; }
  return n;
}
function topKey() {
  try { const t = dashNavView(dashboardPanelBus.nav()).top; return t ? t.key : null; } catch (e) { return null; }
}

/* the frame's top: read the scroller's place */
function readDashScroll() {
  const a = _asked;
  _asked = null;
  if (!a || !_box || !a.el || !a.el.isConnected) return;
  const p = pathUnder(_box, a.el);
  if (!p) return;
  if (PATHS.size >= PATHS_CAP) PATHS.delete(PATHS.keys().next().value);
  PATHS.set(a.key, p);
  dashboardPanelBus.go({ type: 'keep', key: a.key, scroll: a.el.scrollTop });
}

/* the frame's top: give a page its place back */
function giveDashScroll() {
  const b = _back;
  if (!b || !_box || topKey() !== b.key) { _back = null; return; }
  const p = PATHS.get(b.key);
  const el = p ? atPath(_box, p) : null;
  if (el) {
    el.scrollTop = b.scroll;
    if (Math.abs(el.scrollTop - b.scroll) < 2) { _back = null; return; }
  }
  if (++b.tries < 12) beforeDraw(giveDashScroll);
  else _back = null;
}

function onScroll(e) {
  const key = topKey();
  if (key == null || !e || !e.target || e.target === document) return;
  if (_back && _back.key === key) return;   /* our own write, not the player's */
  const first = !_asked;
  _asked = { el: e.target, key };
  if (first) beforeDraw(readDashScroll);
}

/** The page box's ref (a callback ref): listen while it is on the page. */
export function dashScrollBox(el) {
  if (_box === el) return;
  if (_box) { try { _box.removeEventListener('scroll', onScroll, true); } catch (e) { /* gone */ } }
  _box = el || null;
  if (_box) { try { _box.addEventListener('scroll', onScroll, { capture: true, passive: true }); } catch (e) { /* no listener */ } }
}

/** A page is up (its entry's key): give its kept scroll back. */
export function dashScrollShown(key, scroll) {
  if (key == null || !(scroll > 0)) { _back = null; return; }
  _back = { key, scroll, tries: 0 };
  beforeDraw(giveDashScroll);
}
