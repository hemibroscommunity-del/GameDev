/* ═══ v2.3.6682: A PAGE GROWS OUT OF THE TILE TAPPED (card UI2-frame, the build's step 2, PR 2) ═══
 *
 * The card's reading 8: "A page GROWS out of the tile tapped and shrinks back
 * on Back; never a slide. CSS only (transform and opacity on the page's
 * container), about 220 ms (the band's own timing), from an origin the code
 * already knows (the tile's cell in its grid, else the tap's point, else the
 * centre): NOTHING is measured at a tap or in a frame. A change of workspace
 * or a jump to the Menu's root grows from nothing. `?dashgrow=0` and reduced
 * motion give none."
 *
 * This file says WHICH motion a step of the dashboard's one state makes
 * (src/game/dashNav.js) and from WHERE; the band draws it as a class on the
 * page's container (src/ui/mobile/dash/DashGrowBox.jsx, its keyframes in
 * dashGrow.css), and the class comes off at the animation's own end (an
 * event, never a timer: TRAPS §200 reads it as a state).
 *
 *   'grow'    a page pushed over the one up: out of its `from` (a tile's cell,
 *             else the tap's point), else the centre;
 *   'shrink'  Back: the page under comes back as the page on top shrinks
 *             into the place it grew from (the popped entry's `from`);
 *   'fresh'   grows from nothing, at the centre: the dashboard opened from
 *             play, a change of workspace (Gear and the Menu), the Menu
 *             shortcut to its root, Gear's root asked by a shop;
 *   null      nothing moves: closed, a kept scroll, a step that changes
 *             nothing on screen.
 *
 * WHERE, as CSS's transform-origin, from what the code already holds:
 *   { cell: [col, row], of: [cols, rows] }  the tile's cell (MenuGrid): its
 *        centre as a share of the grid, which fills the page;
 *   { pt: [dx, dy] }  the tap's point (the pointer's own event): dx px from
 *        the band's centre line (the band is centred: it holds at a wide
 *        screen's 1200 px), dy px up from the band's foot;
 *   anything else: the centre.
 *
 * NO IMPORTS: node tests it (tools/guards/dash-nav.test.mjs part 5). */

export const DASH_GROW_MS = 220;   /* the band's own timing (sheet/motion.js SHEET_TRANSITION) */

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

/** A `from` as CSS's transform-origin (the centre when it says nothing). */
export function dashGrowOrigin(from) {
  if (from && Array.isArray(from.cell) && Array.isArray(from.of)) {
    const [c, r] = from.cell, [cols, rows] = from.of;
    if (finite(c) && finite(r) && finite(cols) && finite(rows) && cols > 0 && rows > 0) {
      const x = Math.max(0, Math.min(100, ((c + 0.5) / cols) * 100));
      const y = Math.max(0, Math.min(100, ((r + 0.5) / rows) * 100));
      return `${+x.toFixed(2)}% ${+y.toFixed(2)}%`;
    }
  }
  if (from && Array.isArray(from.pt)) {
    const [dx, dy] = from.pt;
    if (finite(dx) && finite(dy)) {
      const x = Math.round(dx), y = Math.max(0, Math.round(dy));
      return `calc(50% + ${x}px) calc(100% - ${y}px)`;
    }
  }
  return '50% 50%';
}

/** The tap's point, as a `from`: the pointer's clientX / clientY and the kept
    window's size (never a box measured).  null when it says nothing. */
export function dashGrowTapFrom(x, y, vw, vh) {
  if (!finite(x) || !finite(y) || !finite(vw) || !finite(vh) || vw <= 0 || vh <= 0) return null;
  return { pt: [Math.round(x - vw / 2), Math.round(Math.max(0, vh - y))] };
}

const topOf = (stack) => (stack && stack.length ? stack[stack.length - 1] : null);

/**
 * The motion a step makes: `prev` and `next` dashNav states, `a` the step
 * asked.  Returns null or { kind, origin }.
 */
export function dashGrowOf(prev, next, a) {
  if (!prev || !next || prev === next || !a) return null;
  if (!next.shown || a.type === 'keep' || a.type === 'close') return null;
  const fresh = { kind: 'fresh', origin: '50% 50%' };
  if (!prev.shown || prev.ws !== next.ws) return fresh;
  if (a.type === 'menuRoot') return fresh;
  const ws = next.ws;
  const was = prev[ws] || [], now = next[ws] || [];
  const t0 = topOf(was), t1 = topOf(now);
  if (now.length > was.length) return { kind: 'grow', origin: dashGrowOrigin(t1 && t1.from) };
  if (now.length < was.length) {
    if (a.type === 'back' && now.length === was.length - 1) return { kind: 'shrink', origin: dashGrowOrigin(t0 && t0.from) };
    return fresh;
  }
  if (t0 && t1 && t0.key !== t1.key) return { kind: 'grow', origin: dashGrowOrigin(t1.from) };
  return null;
}
