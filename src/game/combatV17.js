/* ═══ v2.3.6844: A WEAPON'S PAGE AND SHARED LEAD WITH THE UPGRADES (card UI4 PR 5, the owner's V17) ═══
 *
 * The owner, 02:10 UTC 2026-11-28, after trying the look's preview: "Don't
 * like combat menu or primary skill/shared attribute menus. Too confusing for
 * first time player and doesn't use visuals first."  And V17:55 (docs/design/
 * v17/MASTER-IMPLEMENTATION.md line 55): "Tap weapon to see actionable
 * upgrades and available points first, then level/progress and actual weapon
 * damage. ... Shared ...: upgrade choices and available points first,
 * supporting current strength below in portrait or to the right in
 * landscape. ... When no points, still inspect explanation; don't show
 * actionable plus."
 *
 * The rules of the three pages under `?v17combat` (no DOM, so node can test
 * them: tools/guards/combat-v17.test.mjs):
 *   - the switch (on unless `=0` was asked on this device; remembered);
 *   - the ORDER of a page's rows (V17_ORDER: what leads, what follows);
 *   - the room: how the rows share a page's height, upright and sideways
 *     (combatPage.css holds the same numbers), and when the supporting facts
 *     fit beside the level and the DPS or become one "All stats" door;
 *   - the words of the game's truth about shared points: they follow the
 *     BEST weapon's level (server/src/prog3.js 26-33, `onelevel` on), or
 *     every weapon's level under the old sum (`onelevel: false`), never
 *     V17's "three a weapon level" told blindly (flag Q1: the worker's, the
 *     owner's call; nothing here changes it);
 *   - the hub's tiles under the switch: Bro's own pieces (the weapons with
 *     their hand, the Shared door with the seven upgrades' pictures).
 * The pages draw these (sheet/WeaponPage.jsx, SharedPage.jsx, CombatHub.jsx
 * through the ONE template sheet/attrTemplate.jsx); `?v17combat=0` draws
 * today's, untouched. */
import { readerFor, swValue } from './switches.js';
import { PROG3 } from '../data/prog3.js';

/* ── the switch ── */
/* its memory on this device (`?v17combat=0` remembered; `?v17combat=1` forgets) */
export const V17_COMBAT_KEY = 'bt_v17combat';

/** Is V17's order wanted on this device?  `search` and `store` are for tests; the page's address is
 *  read through the one reader (switches.js).  On unless `=0` was asked here (CLAUDE.md section 7: a
 *  trial is everyone's default, with its switch). */
export function v17CombatWanted(search, store) {
  const v = search == null ? swValue('v17combat') : readerFor(search).swValue('v17combat');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(V17_COMBAT_KEY, '0'); else ls.removeItem(V17_COMBAT_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(V17_COMBAT_KEY) === '0'); } catch (e) { return true; }
}

/* ── the order (V17:55) ── */
/* A page's rows, first to last.  `upgrades` the attributes and their points; `progress` the level and
   its XP; `damage` the weapon's DPS (the stat that opens the seven-page tree) with its supporting facts;
   `strength` Shared's current Max HP and Defense. */
export const V17_ORDER = Object.freeze({
  weapon: Object.freeze(['upgrades', 'progress', 'damage']),
  shared: Object.freeze(['upgrades', 'strength']),
});
/* today's (`=0`), for the guard's comparison: the level first, the numbers, then the attributes */
export const TODAY_ORDER = Object.freeze({
  weapon: Object.freeze(['progress', 'damage', 'upgrades']),
  shared: Object.freeze(['strength', 'upgrades']),
});

/* ── the room ── */
/* Upright, three bands (combatPage.css holds the same numbers): the points' line 14, the upgrades (two
   rows, each at least a 44 px press), the row under them 44 (the level, DPS, the facts or one door),
   and two gaps of 4.  A page lower than LINE + GRID_MIN + FOOT + 2 * GAP folds the line onto the
   grid's own top (never a smaller word, never a scroll). */
export const V17_ROOM = Object.freeze({ LINE: 14, GRID_MIN: 90, FOOT: 44, GAP: 4, TOUCH: 44 });
export const V17_ROOM_MIN = V17_ROOM.LINE + V17_ROOM.GRID_MIN + V17_ROOM.FOOT + 2 * V17_ROOM.GAP;

/** How a page lays out: 'side' (a phone on its side: one row, the upgrades first, the rest to their
    right) or 'up' (the upgrades over the row under them).  `short` is the frame's own word (useRoom). */
export function v17Shape(short) {
  return short ? 'side' : 'up';
}

/** The upgrades' grid height upright, px: what the line, the row under it and the gaps leave of the
    page's own height `h` (0, not measured: the least).  Never under two 44 px rows and their gap. */
export function v17GridH(h) {
  const v = Number(h);
  const R = V17_ROOM;
  if (!(Number.isFinite(v) && v > 0)) return R.GRID_MIN;
  return Math.max(R.GRID_MIN, Math.floor(v - R.LINE - R.FOOT - 2 * R.GAP));
}

/* a tile's words under its picture, px: its pads (1 + 1), the gap (1), the name (13) and the value (12)
   (combatPage.css .u2-cv-up holds the same numbers) */
export const V17_TILE_WORDS = 28;

/** A tile's picture, px.  Upright: as large as its row leaves once its words are under it (the grid's two
    rows and their gap; V17_TILE_WORDS): 12 at the least (a 320 x 568 phone), 30 at the most (V17:31:
    room is for more entries, never larger art on a computer).  Sideways (`side`): 16 where the row is
    58 px or more (the line 13 over a 44 px tile that holds 16 + 28), else none (the words stay). */
export function v17TileArt(h, side) {
  if (side) { const v = Number(h); return Number.isFinite(v) && v >= 58 ? 16 : 0; }
  const row = (v17GridH(h) - V17_ROOM.GAP) / 2;
  return Math.max(12, Math.min(30, Math.floor(row - V17_TILE_WORDS)));
}

/* The weapon page's supporting facts (Damage, Attack speed, Crit chance, Range) need this much of the
   row under the upgrades beside the level and DPS; narrower, ONE door, "All stats" (today's door: the
   facts in a window), never smaller words.  Sideways the row is shared with the six. */
export const V17_FACTS_W = Object.freeze({ up: 560, side: 1100 });

/** Whether the four facts are drawn beside the level and DPS (else the one "All stats" door). */
export function v17FactsInRow(shape, w) {
  const v = Number(w);
  if (!(Number.isFinite(v) && v > 0)) return false;
  return v >= (shape === 'side' ? V17_FACTS_W.side : V17_FACTS_W.up);
}

/* Shared's quiet line of where its points come from (the game's truth, below): beside Max HP and
   Defense upright where the page is this wide; sideways where the row has room after the seven. */
export const V17_RULE_W = Object.freeze({ up: 360, side: 1000 });

/** Whether Shared's rule is drawn as a fact beside its strength (else in the points line's words and
    the page's label only: nothing lost, the count is always drawn). */
export function v17RuleInRow(shape, w) {
  const v = Number(w);
  if (!(Number.isFinite(v) && v > 0)) return false;
  return v >= (shape === 'side' ? V17_RULE_W.side : V17_RULE_W.up);
}

/* ── the game's truth about shared points (flag Q1) ── */
/* src/data/prog3.js PROG3.SHARED_POINTS_PER_LEVEL: 3 (server/src/prog3.js 159); while `onelevel` is on
   (the default since v2.3.3538) they come with the CHARACTER level, the best weapon's; with it off, with
   every weapon's level-up (the old sum).  V17 and the 2026-11-25 baseline both say "three a weapon
   level": the menu says the game's rule and the difference is the owner's question. */
export const SHARED_PER_LEVEL = PROG3.SHARED_POINTS_PER_LEVEL;   /* the game's own number, read once here (combat-hub.test C9: a page never works a count out) */

/** The words' key and their numbers for where shared points come from.
    oneLevel  isOneLevelEnabled() (caps.onelevel; the worker's rule);  n  the points a level. */
export function sharedPointsRule(oneLevel, n) {
  const per = Number.isFinite(Number(n)) && Number(n) > 0 ? Math.floor(Number(n)) : SHARED_PER_LEVEL;
  return Object.freeze({ key: oneLevel === false ? 'combatV17.ruleEvery' : 'combatV17.ruleBest', n: per });
}

/* ── the hub under the switch ── */
/** The Shared door's pictures: the seven upgrades it opens, in the page's order (a picture says what a
    tap opens before a word does).  `attrs` sharedAttributes(rpg) (combatHub.js). */
export function sharedDoorArt(attrs) {
  return (Array.isArray(attrs) ? attrs : []).filter((a) => a && a.art).map((a) => Object.freeze({ key: a.key, art: a.art }));
}

/** How many of the seven pictures the Shared door draws in `w` px of door (18 px each and a 2 px gap,
    on the line under its name, after its picture, pads and count: `taken`); none under three (a cut
    row says nothing). */
export function sharedDoorArtFits(w, taken, n) {
  const v = Number(w) - (Number(taken) || 0);
  const all = Math.max(0, Math.floor(Number(n) || 0));
  if (!(Number.isFinite(v) && v > 0)) return 0;
  const fit = Math.floor((v + 2) / 20);
  return fit >= all ? all : fit >= 3 ? fit : 0;
}

/** What the Shared door's own parts take of its width before its pictures, px: its pads (8 + 8), its
    picture and the gap after it (6), and the count beside the pictures with its margin (6 + 64) while
    there are points. */
export function sharedDoorTaken(artPx, pointsShown) {
  return 16 + (Number(artPx) || 0) + 6 + (pointsShown ? 70 : 0);
}
