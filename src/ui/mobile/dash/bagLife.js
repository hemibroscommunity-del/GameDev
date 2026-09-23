/* ═══ v2.3.2755: THE BAG'S SMALL MOTIONS ═══
 *
 * Owner: "I'm looking for a liveness pass.  Basically making things move a
 * little in a way that makes sense for whatever object it is ... this
 * includes items in the player inventory and the inventory itself."
 *
 * Each thing in the bag moves the way IT would:
 *   potions      slosh (the bottle rocks on its base and settles)
 *   raw fish     flop
 *   herbs        sway on the stem
 *   food         a small hop
 *   metal, gems, coins, gear
 *                catch the light -- a four-point glint crosses the corner
 *   logs, bones, cloth
 *                lie still, as logs do
 * and the bag itself answers what happens to it: a NEW item pops into its
 * slot with a brass ring, a stack that grows bumps its count, a tapped tile
 * gives under the finger (CSS :active, game.css).
 *
 * ── WHY IT IS SHAPED LIKE THIS (the design law) ──
 * LANTERN-SLATE-SPEC's motion rules allow no ALWAYS-ON animation in the UI
 * except the Godly sheen, and bt-xp-breathe's note says why: "something that
 * never stops moving stops being noticed."  So nothing here loops.  ONE
 * scheduler picks ONE tile every couple of seconds and plays ONE short
 * one-shot on it; the rest of the bag is still.  Across a full bag each item
 * moves perhaps twice a minute -- alive, never busy.
 *
 * ── RULES IT KEEPS ──
 *  - transform and opacity only, on CHILDREN of a tile (the art, and an
 *    empty fx span) -- never the tile's own box, so no layout, no paint of
 *    the grid, and no test that reads a tile's rect sees anything move.  No
 *    filter, no drop-shadow, no background-clip: the bag sits over the live
 *    WebGL canvas, which is the iOS grain trap (TRAPS §42).
 *  - Driven by a DATA ATTRIBUTE set straight on the DOM node, not by React
 *    state: a React render per step is exactly what game.css's
 *    bt-quest-rise note warns against.  React never manages these
 *    attributes, so it never fights them.
 *  - Off under prefers-reduced-motion (the OS setting) and under the QA
 *    harness's calm switch (window.__btAmbienceOff), which also stamps
 *    `bt-calm` on <html> so the CSS-only press feedback goes quiet in tests.
 *  - Paused while the page is hidden.
 */
import { prefersReducedMotion } from '../sheet/motion.js';

const GLINTY = /gem|ore|ingot|bar_|crystal|shard|coin|gold|silver|ticket|ruby|sapphire|emerald|diamond|amethyst|topaz|pearl|key|ring|amulet|whetstone|manashard/;
const FISHY = /fish|salmon|cod|trout|minnow|carp|bass|pike|eel|perch|tuna|koi/;
const LEAFY = /herb|leaf|flower|plant|mushroom|seed|berry|wheat|swiftdraught|antidote|moss/;
const TASTY = /cooked|meat|bread|pie|stew|apple|cheese|egg|meal|roast|jerky/;

/** How a bag item comes alive, or null for things that lie still.  `cat` is
 *  the bag's own category for it (InventoryPanel's classify, which knows the
 *  shop's potions by key) -- passed in rather than imported, so this module
 *  and the panel that imports it do not import each other. */
export function lifeKindFor(key, cat) {
  const k = String(key || '').toLowerCase();
  if (!k) return null;
  if (TASTY.test(k)) return 'hop';
  if (FISHY.test(k)) return 'flop';
  if (cat === 'potion') return 'slosh';
  if (LEAFY.test(k)) return 'sway';
  if (GLINTY.test(k)) return 'glint';
  if (cat === 'weapon' || cat === 'armor') return 'glint';
  return null;
}

/** Gear in the stash: metal catches the light, a cloth shirt does not. */
export function lifeKindForGear(kind, obj) {
  if (kind === 'stashGear' && obj && obj.gearId === 'tshirt') return null;
  return 'glint';
}

const LIFE_MS = { glint: 760, slosh: 960, flop: 680, sway: 1450, hop: 560 };

export function calm() {
  if (typeof window === 'undefined') return true;
  return window.__btAmbienceOff === true || prefersReducedMotion();
}
/* The QA harness's switch alone.  Under the OS's reduced-motion setting a new
   item still ARRIVES -- game.css turns its pop into a plain fade there, which
   the spec allows (it removes shimmer, overshoot and nudge, not a fade) --
   but nothing moves by itself. */
function qaCalm() {
  return typeof window === 'undefined' || window.__btAmbienceOff === true;
}

function syncCalmClass() {
  if (typeof document === 'undefined') return;
  const on = typeof window !== 'undefined' && window.__btAmbienceOff === true;
  const root = document.documentElement;
  if (root.classList.contains('bt-calm') !== on) root.classList.toggle('bt-calm', on);
}

/* A tile is worth moving only if the player can actually see it: on screen
   AND not scrolled out behind the bag's own clip or covered by a sheet. */
function visible(el) {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
  const hit = document.elementFromPoint(cx, cy);
  const tile = el.closest('[data-bag-key]') || el.parentElement;
  return !!(hit && tile && (tile === hit || tile.contains(hit)));
}

function play(tile, attr, value, ms) {
  if (!tile) return;
  /* restart cleanly if it is already playing: drop, reflow, set */
  if (tile.getAttribute(attr) != null) {
    tile.removeAttribute(attr);
    void tile.offsetWidth;
  }
  tile.setAttribute(attr, value);
  const stamp = String(Date.now());
  tile.setAttribute(attr + '-t', stamp);
  setTimeout(() => {
    if (tile.getAttribute(attr + '-t') === stamp) { tile.removeAttribute(attr); tile.removeAttribute(attr + '-t'); }
  }, ms + 80);
}

const stats = { idle: 0, arrive: 0, bump: 0, last: null };

function tick() {
  syncCalmClass();
  if (typeof document === 'undefined' || document.hidden || calm()) return;
  const arts = document.querySelectorAll('.bt-bag-art[data-life]');
  if (!arts.length) return;
  /* the open item card, when there is one, has the stage to itself half the time */
  const card = document.querySelector('.bt-card-art[data-life]');
  let pick = null;
  if (card && Math.random() < 0.5 && visible(card)) pick = card;
  for (let tries = 0; !pick && tries < 6; tries++) {
    const el = arts[(Math.random() * arts.length) | 0];
    if (el.closest('[data-life-now],[data-life-new]')) continue;
    /* better gear shows off a little more often */
    const q = el.getAttribute('data-life-q');
    if (!q && Math.random() < 0.25) continue;
    if (visible(el)) pick = el;
  }
  if (!pick) return;
  const kind = pick.getAttribute('data-life');
  const tile = pick.closest('[data-bag-key]') || pick.parentElement;
  play(tile, 'data-life-now', kind, LIFE_MS[kind] || 800);
  stats.idle++;
  stats.last = { kind, key: tile && tile.getAttribute('data-bag-key') };
}

let _timer = null;
let _users = 0;
function loop() {
  _timer = setTimeout(() => {
    try { tick(); } catch (e) { /* a missed glint is not an error */ }
    if (_users > 0) loop();
  }, 1300 + Math.random() * 1300);
}

/** Start the scheduler (ref-counted; returns the stop function). */
export function startBagLife() {
  _users++;
  syncCalmClass();
  if (!_timer) loop();
  return () => {
    _users = Math.max(0, _users - 1);
    if (!_users && _timer) { clearTimeout(_timer); _timer = null; }
  };
}

function tileFor(bagKey) {
  if (typeof document === 'undefined' || !bagKey) return null;
  const sel = '[data-bag-key="' + String(bagKey).replace(/["\\]/g, '\\$&') + '"]';
  return document.querySelector(sel);
}

/* The new tile may not be rendered yet when the watcher sees the key (the
   bag renders off its own timer), so look again for a moment. */
function whenTile(bagKey, fn, tries = 6) {
  const el = tileFor(bagKey);
  if (el) { fn(el); return; }
  if (tries > 0) setTimeout(() => whenTile(bagKey, fn, tries - 1), 120);
}

export const bagLife = {
  /** A key the bag did not hold a moment ago: pop it in. */
  arrive(bagKey) {
    if (qaCalm()) return;
    whenTile(bagKey, (el) => { play(el, 'data-life-new', '1', 760); stats.arrive++; });
  },
  /** A stack that just grew: bump its count. */
  bump(bagKey) {
    if (qaCalm()) return;
    whenTile(bagKey, (el) => { play(el, 'data-life-bump', '1', 420); stats.bump++; });
  },
  stats() { return { ...stats, running: !!_timer, calm: calm() }; },
  /** QA: play one idle motion now, on a given key. */
  poke(bagKey, kind) {
    const el = tileFor(bagKey);
    if (!el) return false;
    const art = el.querySelector('.bt-bag-art');
    const k = kind || (art && art.getAttribute('data-life'));
    if (!k) return false;
    play(el, 'data-life-now', k, LIFE_MS[k] || 800);
    return true;
  },
};

if (typeof window !== 'undefined') window.__btBagLife = bagLife;
