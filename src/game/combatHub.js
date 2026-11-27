/* ═══ v2.3.6685: COMBAT'S HUB, ITS FOUR DOORS AND ITS POOLS (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * The owner, 2026-11-25: "Combat: Three independent weapon channels plus
 * shared attributes. Dedicated weapon screen with level/XP, DPS, supporting
 * stats and six attributes ... Existing allocation preview opens on
 * selection, not a permanent panel."  The specification's 4.2: "Each weapon
 * opens a dedicated screen (not a persistent weapon selector). Return to the
 * Combat hub to switch." ... "Point availability must clearly distinguish
 * weapon-specific and global pools. Allocation must not accidentally spend
 * from another channel or another player's account."
 *
 * THE POINTS RULE IS THE GAME'S, NOT THE DOCUMENT'S (the builder's notes,
 * table 1, line 1).  The pools as the worker holds them (src/data/prog3.js
 * :714-782; the spend itself server/src/prog3.js _handleProg3Allocate):
 *   poolBy[cat]  what that weapon's levels earned: spent only on that
 *                weapon's six (an OFFENSE spend draws the named weapon's own
 *                points, then the free ones);
 *   shared       minted with the CHARACTER level (the best weapon's: one
 *                level, v2.3.3538), spent only on the seven shared (a BODY
 *                spend draws the shared pool, then the free ones: "never a
 *                lane's points", server/src/prog3.js:1420-1426);
 *   the rest of `pool` past the three channels: points banked before
 *                channels existed, spendable anywhere -- so they are in
 *                every count (prog3PoolAny), and `free` names them.
 * So each count here is what a Spend from that door can draw on, read by the
 * game's readers, never worked out from a level ("3 shared a weapon level"
 * is the document's rule, not the game's).  Against a worker without the
 * channels (no caps.prog3Chan) every lane reads the whole total, as the
 * Points window always has (HeroExpanded's laneAvail / sharedAvail now read
 * this, one rule for both screens).
 *
 * The words for a count come from ONE rule (pointsWords): "n points", 0
 * included; nothing on the hub says how points are earned.  ONE vocabulary:
 * Sword, Bow, Staff (the builder's notes, line 9).  Another player's page
 * (`who`) shows no count of theirs and offers no Spend. */
import {
  PROG3, prog3Pool, prog3Shared, prog3PoolFor, prog3PoolShared, prog3PoolAny, prog3CharLevel,
  isProg3SharedEnabled, prog3AtkMeta, prog3AtkPts, prog3StatCap, isStatCapFree,
  prog3BodyMeta, prog3Pts,   /* v2.3.6686: the Shared page's seven */
} from '../data/prog3.js';
import { weaponProgress } from './progression.js';
import { POINTS_ART_DIR, POINTS_ART_V } from '../data/pointsHeadArt.js';
import { assetUrl } from './assetUrl.js';   /* v2.3.6743: an icon built from parts gets its file's version (card KEEP PR 3b) */

/* the frame's page of each door (src/game/dashDests.js FRAME_PAGES; src/game/broHub.js BRO_HUB_PAGES) */
export const COMBAT_PAGES = Object.freeze({ sword: 'broSword', bow: 'broBow', staff: 'broStaff' });
/* v2.3.6686 (card UI2-combat PR 2): the Shared page, the hub's fourth door (sheet/SharedPage.jsx) */
export const SHARED_PAGE = 'broShared';
/* v2.3.6686: the stat tree's layers, one frame page a depth (sheet/StatTree.jsx): DPS is layer 0;
   a row that opens pushes the next layer's page, so the header's Back returns layer by layer to
   the weapon's page.  The deepest branch of src/game/metricTree.js dpsTree is layer 6
   (DPS > damage a swing > crits add > a critical hit > average hit > least hit > hit base); the
   guard (tools/guards/metric-tree.test.mjs) holds every branch inside this list. */
export const TREE_PAGES = Object.freeze(['broTree0', 'broTree1', 'broTree2', 'broTree3', 'broTree4', 'broTree5', 'broTree6']);
/** The layer of a tree page (0..6), or -1. */
export function treeDepthOf(id) { return TREE_PAGES.indexOf(String(id)); }
/** What a tree page's entry keeps (dashNav's `sel`): the weapon and the path of node ids. */
export function treeSel(cat, path) {
  return String(cat || '') + '|' + (Array.isArray(path) ? path.join('/') : '');
}
/** { cat, path } read back from a `sel` (null: not a tree page's). */
export function treeSelRead(sel) {
  const s = typeof sel === 'string' ? sel : '';
  const i = s.indexOf('|');
  if (i < 0) return null;
  const cat = s.slice(0, i);
  if (!Object.prototype.hasOwnProperty.call(COMBAT_PAGES, cat)) return null;
  const rest = s.slice(i + 1);
  return { cat, path: rest ? rest.split('/') : [] };
}

/* the four doors, in the hub's order: three weapons in a row, Shared under them.  The pictures are
   the game's own (the passport's weapons; Shared: the Points tab's gold bust, POINTS_ICONS.shared):
   Combat and Shared have no door picture of their own yet (missing art, the card says). */
export const COMBAT_DOORS = Object.freeze([
  Object.freeze({ id: 'sword', cat: 'sword', word: 'combatHub.sword', art: '/icons/ui/combat-melee.webp', opens: 'page:' + COMBAT_PAGES.sword }),
  Object.freeze({ id: 'bow', cat: 'bow', word: 'combatHub.bow', art: '/icons/ui/combat-bow.webp', opens: 'page:' + COMBAT_PAGES.bow }),
  Object.freeze({ id: 'staff', cat: 'staff', word: 'combatHub.staff', art: '/icons/ui/combat-magic.webp', opens: 'page:' + COMBAT_PAGES.staff }),
  /* v2.3.6686 (PR 2): its own page, the Shared page (v2.3.6685 opened the Points window on its Shared column) */
  Object.freeze({ id: 'shared', cat: null, word: 'combatHub.shared', art: assetUrl(`${POINTS_ART_DIR}character.png?v=${POINTS_ART_V}`), opens: 'page:' + SHARED_PAGE }),
]);

const WEAPON_OF = Object.freeze({ broSword: 'sword', broBow: 'bow', broStaff: 'staff' });
/** The weapon of a frame page (null: not a weapon's page). */
export function weaponOfPage(id) {
  return Object.prototype.hasOwnProperty.call(WEAPON_OF, String(id)) ? WEAPON_OF[String(id)] : null;
}

/**
 * The counts a Spend can draw on, by door: { sword, bow, staff, shared, free }.
 * rpg   S.rpg
 * chan  the worker's channels (S._serverCaps.prog3Chan)
 */
export function combatPools(rpg, chan) {
  const total = prog3Pool(rpg) + prog3Shared(rpg);
  const lane = (c) => (chan ? prog3PoolFor(rpg, c) : total);
  const shared = isProg3SharedEnabled() || chan ? prog3PoolShared(rpg) : total;
  return Object.freeze({ sword: lane('sword'), bow: lane('bow'), staff: lane('staff'), shared, free: chan ? prog3PoolAny(rpg) : 0 });
}

/** The words of a count: the one rule ("n points", 0 included). */
export function pointsWords(n) {
  const v = Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : 0;
  return Object.freeze({ key: v === 1 ? 'combatHub.point' : 'combatHub.points', n: v });
}

/** The combat level: the game's reader (the best weapon's while `onelevel` is on). */
export function combatLevel(rpg) {
  return prog3CharLevel(rpg);
}

/**
 * The hub's four doors with what each shows.
 * rpg   S.rpg;  chan  caps.prog3Chan;  who  whose page (null: yours)
 */
export function combatHubDoors(rpg, chan, who) {
  const self = who == null;
  const pools = combatPools(rpg, chan);
  return COMBAT_DOORS.map((d) => {
    const pts = self ? pools[d.id] : null;
    return Object.freeze({
      ...d,
      progress: d.cat ? weaponProgress(rpg, d.cat) : null,
      points: pts,
      pointsWords: self ? pointsWords(pts) : null,
      glow: self && pts > 0,
      /* v2.3.6783 (card UI3-combat; the owner, 2026-11-26: "only show available points prominently when
         there are points to spend"): the count is DRAWN only while there are some; at 0 nothing is drawn
         (the count stays in the door's data and its words for a screen reader) */
      pointsShown: self && pts > 0,
    });
  });
}

/* ═══ v2.3.6783: THE ONE TEMPLATE'S RULES (card UI3-combat) ═══
 * The owner, 2026-11-26: "Eliminate the left-side Attributes column, consolidate the combat statistics
 * into one summary strip, and give the six attributes a full-width three-by-two grid ... When points
 * become available, the attributes can receive a small gold plus indicator and the available points
 * counter can become gold."  The pages (sheet/WeaponPage.jsx, SharedPage.jsx, through
 * sheet/attrTemplate.jsx) ask these; they work nothing out themselves. */

/** A count's tone: 'gold' while there are points to spend, 'quiet' (muted) at none. */
export function pointsTone(n) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 1 ? 'gold' : 'quiet';
}

/** Whether an attribute's tile wears the small gold "+": only on your own page, only while its pool
    has a point to spend (never on another player's page, never at 0). */
export function attrPlus(n, self) {
  return self === true && pointsTone(n) === 'gold';
}

/* A weapon's page upright, its four bands with 44 px presses (combatPage.css holds the same numbers):
   the level 18, the strip 44, the Attributes line 14, the six 44 + 2 + 44, three gaps of 2. */
export const WEAPON_PAGE_BANDS = Object.freeze({ level: 18, strip: 44, line: 14, grid: 90, gaps: 6 });
export const WEAPON_PAGE_ROOM = WEAPON_PAGE_BANDS.level + WEAPON_PAGE_BANDS.strip + WEAPON_PAGE_BANDS.line + WEAPON_PAGE_BANDS.grid + WEAPON_PAGE_BANDS.gaps;

/** Whether a weapon's page folds its Attributes line onto the level row: under the four bands' room
    (172 px: 390 x 844 holds it; 375 x 667's 168 does not).  `h` the page's own height (useRoom, a
    ResizeObserver); 0 (not measured yet) does not fold. */
export function weaponPageFold(h) {
  const v = Number(h);
  return Number.isFinite(v) && v > 0 && v < WEAPON_PAGE_ROOM;
}

/** The hub's picture size, px, from the hub's own height (the card's arithmetic, reading 2):
    upright the weapons' row is what Shared's 44 px and a 6 px gap leave, less the words, the 24 px
    level, the bar and the count's room (74): 48 at 390 x 844, 44 at 375 x 667, the same with or
    without points.  Sideways (under 110 px) the picture sits beside the words: the row less 18.
    Unmeasured (0): today's sizes. */
export function hubArtSize(h, short) {
  const v = Number(h);
  if (!(Number.isFinite(v) && v > 0)) return short ? 26 : 32;
  const px = short ? v - 18 : v - 44 - 6 - 74;
  return Math.max(short ? 26 : 32, Math.min(short ? 48 : 64, Math.round(px)));
}

/**
 * Which pool a Spend from a page draws on, named before the press: a weapon's
 * own six draw on that weapon's count; a shared stat on the shared count.
 * stat   a stat's key;  pageCat  the weapon the page is (null: the shared page)
 */
export function spendPool(stat, pageCat) {
  const k = String(stat || '');
  const atk = Object.prototype.hasOwnProperty.call(PROG3.ATK || {}, k);
  if (atk) return Object.prototype.hasOwnProperty.call(COMBAT_PAGES, String(pageCat)) ? String(pageCat) : null;
  return Object.prototype.hasOwnProperty.call(PROG3.BODY || {}, k) ? 'shared' : null;
}

/** A weapon's six attributes as tiles: the game's names and the points each holds of its cap
    (cap null with no per-stat cap, caps.nostatcap: the 999 storage bound is no number to show,
    as the Points window's ptsOf says, v2.3.3578). */
export function weaponAttributes(rpg, cat) {
  return prog3AtkMeta().map((m) => Object.freeze({
    key: m.key, label: m.label, art: m.iconSrc, pts: prog3AtkPts(rpg, cat, m.key), cap: isStatCapFree() ? null : prog3StatCap(rpg, m.key),
  }));
}

/** v2.3.6686: the seven shared attributes as tiles, the same shape as a weapon's six: the game's
    names (PROG3_BODY_META) and the points each holds of its cap. */
export function sharedAttributes(rpg) {
  return prog3BodyMeta().map((m) => Object.freeze({
    key: m.key, label: m.label, art: m.iconSrc, pts: prog3Pts(rpg, m.key), cap: isStatCapFree() ? null : prog3StatCap(rpg, m.key),
  }));
}
