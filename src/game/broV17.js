/* ═══ v2.3.6843: BRO LEADS WITH THE THREE WEAPONS (card UI4 PR 4, the owner's V17) ═══
 *
 * The owner's V17 (docs/design/v17/MASTER-IMPLEMENTATION.md line 55): "HUD
 * carries identity, do not repeat portrait and combat level unnecessarily.
 * Bro presents recognizable Sword/Bow/Staff artwork, levels/progress and
 * available points first, then Character stats and Pets, with active weapon
 * damage and health afterward. Distinguish equipped weapon from in-hand
 * weapon."  And the card's purpose, in the owner's words: "Do not compromise
 * readability, available screen space, gameplay visibility or device
 * fairness to accommodate a design. Flag unresolved requirements rather than
 * inventing solutions."
 *
 * So with `?v17bro` on (the default; `=0` remembered gives the six tiles and
 * the strip of v2.3.6782, untouched: sheet/BroLanding.jsx) the Menu's Bro
 * door opens ONE page (sheet/BroV17.jsx draws what this file says):
 *   1. Sword, Bow, Staff: the game's own pictures (combatHub.js COMBAT_DOORS),
 *      the level, the XP bar, and the points to spend ONLY while there are
 *      some (a cue, never a plus that does nothing at zero); a tap opens that
 *      weapon's page (one tap: today Bro, Combat, the weapon is two).  The
 *      weapon in your hand is marked apart, in words AND a frame (V17: "never
 *      color alone"; Gear's `is-hand` is the model), from one merely worn;
 *      a lane with nothing worn says so.
 *   2. The Shared page's door ("Character stats" in V17; the game's own word,
 *      "Shared Attributes", stays: flag Q13) with ITS points, and Pets.
 *   3. Quieter: the held weapon's DPS (the weapon page's own headline,
 *      broStats.js) and Max HP (the health bar's, toDisplayHp).  The game's
 *      real numbers; never an "effective health" (V17: "Do not fabricate").
 *   4. NOTHING LOST: every door that left Bro's first row (Equipment, Life
 *      Skills, Feats, Journey) and the strip's entries (AP, Quests, Clan or
 *      Party, Guilds) are ONE quiet strip below (BRO_V17_STRIP), which pages
 *      by whole entries where the width does not hold them all (broV17Strip):
 *      never a word cut at an edge.  The Combat hub keeps its old roads (the
 *      HUD's weapon bar, BroCard's other player's Character, `?v17bro=0`).
 * No portrait, name or combat level (the HUD has them).
 *
 * THE ROOM (the card's facts, measured by PR 3's mp-v17fit): Bro's page is
 * 390 x 191 at 390 x 844 (the other screens' inner 382 x 183), 375 x 187 at
 * 375 x 667, 844 x 82 sideways (its content 67 tall), 840 x 191 on a computer
 * under `?v17wide`.  broV17Shape says which of three layouts the room takes:
 *   upright  the weapons' row on top (what the rows under it leave), the two
 *            doors' row (44), the strip (44);
 *   wide     a computer's or a tablet's block (600 px or more, not short):
 *            the weapons, the two doors and the facts in ONE row, the strip
 *            whole under it: MORE entries a row, never larger tiles or words
 *            (V17:31);
 *   side     a phone on its side: ONE row (V17:31, "72 high cannot fit two
 *            stacked 44 controls"), the strip in what the row leaves.
 * The facts sit in the doors' row where it holds them (FACTS_ROW_MIN), else
 * they lead the strip.
 *
 * NO IMPORTS but the switch reader and the two rule modules it builds on:
 * node tests it (tools/guards/bro-v17.test.mjs). */
import { readerFor, swValue } from './switches.js';
import { combatHubDoors } from './combatHub.js';
import { BRO_HUB_DOORS, broHubDoors } from './broHub.js';

/* ── the switch ── */
/* its memory on this device (`?v17bro=0` remembered; `?v17bro=1` forgets) */
export const V17_BRO_KEY = 'bt_v17bro';

/** Is V17's Bro wanted on this device?  `search` and `store` are for tests; the page's address is read
 *  through the one reader (switches.js).  On unless `=0` was asked here (CLAUDE.md section 7: a trial is
 *  everyone's default, with its switch). */
export function v17BroWanted(search, store) {
  const v = search == null ? swValue('v17bro') : readerFor(search).swValue('v17bro');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(V17_BRO_KEY, '0'); else ls.removeItem(V17_BRO_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(V17_BRO_KEY) === '0'); } catch (e) { return true; }
}

/* ── 1. the three weapons ── */
/* the rpg's activeSlot that means each lane (broStats.js BRO_WEAPONS' `slot`) */
export const HAND_SLOT = Object.freeze({ sword: 'melee', bow: 'ranged', staff: 'staff' });

/**
 * The weapon a hand holds, and each lane's state:
 *   held  the lane in your hand AND something worn in it: 'held'
 *   worn  something worn in the lane, not in your hand: 'worn'
 *   none  nothing worn in the lane: 'none' (the tile still opens its page: its points are the lane's)
 * `worn` { sword, bow, staff } booleans (the page reads broStats.js broDpsInputs' `wpn`); `held` the
 * activeSlot's lane (prog3ActiveCat).  Another player's page carries no hand (`who`).
 */
export function handOf(cat, held, worn, who) {
  if (who != null) return null;
  const has = !!(worn && worn[cat]);
  if (!has) return 'none';
  return cat === held ? 'held' : 'worn';
}

/**
 * The three weapon tiles, in V17's order (Sword, Bow, Staff): combatHub.js's doors (the pools as the worker
 * holds them, the level and XP from progression.js), with the hand and the points' cue.
 *   rpg S.rpg;  chan caps.prog3Chan;  who whose page (null: yours);  hand { held, worn }
 */
export function broV17Weapons(rpg, chan, who, hand) {
  const h = hand || {};
  return combatHubDoors(rpg, chan, who == null ? null : who).filter((d) => d.cat).map((d) => Object.freeze({
    id: d.id, cat: d.cat, word: d.word, art: d.art, opens: d.opens,
    progress: d.progress, points: d.points, pointsWords: d.pointsWords,
    /* the cue only while there are points (the owner, 2026-11-26: "only show available points prominently
       when there are points to spend"; V17: "Available points deserve a priority cue but not commit-style
       gold"): at 0 nothing is drawn, and nothing pressable is added (the tile itself is the one door) */
    cue: d.pointsShown === true,
    hand: handOf(d.cat, h.held, h.worn, who),
  }));
}

/* ── 2. the two doors: the Shared page (V17's "Character stats") and Pets ── */
export const BRO_V17_DOORS = Object.freeze([
  Object.freeze({ id: 'shared', word: 'combatHub.shared', opens: 'page:broShared' }),
  Object.freeze({ id: 'pets', word: 'dashFrame.pets', opens: 'page:pets', cap: 'petbook' }),
]);

/**
 * The two doors with what each shows: Shared its points (the same rule as a weapon's: drawn only while
 * there are some), Pets locked without the worker's cap (its tile keeps its place and says why, as
 * broHubDoors does).  Shared's picture is the Combat hub's (COMBAT_DOORS' shared), Pets' Bro's own.
 */
export function broV17Doors(rpg, chan, caps, who) {
  const hub = combatHubDoors(rpg, chan, who == null ? null : who).find((d) => d.id === 'shared');
  const pets = broHubDoors(caps).find((d) => d.id === 'pets');
  return BRO_V17_DOORS.map((d) => {
    if (d.id === 'shared') {
      return Object.freeze({ ...d, art: hub ? hub.art : null, points: hub ? hub.points : null, pointsWords: hub ? hub.pointsWords : null, cue: !!(hub && hub.pointsShown), locked: false });
    }
    return Object.freeze({ ...d, art: pets ? pets.art : null, points: null, pointsWords: null, cue: false, locked: !!(pets && pets.locked) });
  });
}

/* ── 3. the quieter facts: the held weapon's DPS and Max HP ── */
export const BRO_V17_FACTS = Object.freeze(['dps', 'hp']);

/* ── 4. the strip: every door that left Bro's first row, then the strip's entries ── */
/* the doors of BroLanding's six that are not on this page's first rows (Combat's weapons ARE the first row;
   Pets is a door of row 2): broHub.js's own rows, so a door added there is a door here (the guard holds it) */
export const BRO_V17_LEFT = Object.freeze(BRO_HUB_DOORS.filter((d) => d.id !== 'combat' && d.id !== 'pets').map((d) => d.id));
/* the strip's own entries (broHub.js BRO_STRIP: AP, Quests, Clan or Party, Guilds) follow them */
export const BRO_V17_STRIP_FACTS = Object.freeze(['ap', 'quests', 'clan', 'guilds']);

/**
 * The strip's entries in order: Pets where the row cannot hold it (`petsInStrip`), the facts where the doors'
 * row does not hold them (`factsInStrip`), then the doors that left the first row, then the strip's own.
 * Each { kind: 'pets'|'fact'|'door'|'have', id }.
 */
export function broV17Strip(factsInStrip, petsInStrip) {
  const out = [];
  if (petsInStrip) out.push(Object.freeze({ kind: 'pets', id: 'pets' }));
  if (factsInStrip) for (const id of BRO_V17_FACTS) out.push(Object.freeze({ kind: 'fact', id }));
  for (const id of BRO_V17_LEFT) out.push(Object.freeze({ kind: 'door', id }));
  for (const id of BRO_V17_STRIP_FACTS) out.push(Object.freeze({ kind: 'have', id }));
  return Object.freeze(out);
}

/* ── THE ROOM ── */
/* the sizes the layouts are built from (CSS px).  ENTRY_MIN: a strip entry's least width (its picture and
   "Life Skills" at 11 px, or a label over its value: 72 holds the longest at Bro's 11 px smallest word);
   PAGER_W: the strip's "more" control, 44 (V17's least target); FACTS_W: the two facts' column ("Staff DPS
   188.4" at 12 px); FACTS_ROW_MIN: the least doors' row that holds the two doors AND that column without
   wrapping a word; WIDE_MIN: a block wide enough for one row of the weapons, the doors and the facts;
   SIDE_PRIMARY: the one sideways row's weapons (3 x 114: "Sword Lv 12" beside its picture), Shared (108),
   Pets (76) and their gaps; SIDE_NARROW: a sideways page under it moves Pets to the strip's head;
   WIDE_ROW: a computer's first row, no taller than an upright phone's weapons (95 at 390 x 844). */
export const BRO_V17_ROOM = Object.freeze({ ENTRY_MIN: 72, PAGER_W: 44, GAP: 4, FACTS_W: 96, FACTS_ROW_MIN: 340, WIDE_MIN: 600, ROW: 44, WEAPON_MIN: 52, SIDE_PRIMARY: 538, SIDE_NARROW: 760, WIDE_ROW: 96 });

/** Which layout the page's box takes: 'upright' | 'wide' | 'side'.  `short` the page's own reading (useRoom:
 *  under 110 px tall, a phone on its side). */
export function broV17Shape(w, h, short) {
  if (short) return 'side';
  return Number(w) >= BRO_V17_ROOM.WIDE_MIN ? 'wide' : 'upright';
}

/** Do the facts sit in the doors' row (true) or lead the strip (false)?  Upright: the row holds them from
 *  FACTS_ROW_MIN; wide: always (the row has room); sideways: where the one row, after the weapons and the
 *  two doors (SIDE_PRIMARY, their least widths) and the facts, still leaves the strip two whole entries
 *  beside its pager (834 px: wider than any phone the test plays, so sideways they lead the strip). */
export function broV17FactsInRow(shape, w) {
  const R = BRO_V17_ROOM;
  if (shape === 'wide') return true;
  if (shape === 'upright') return Number(w) >= R.FACTS_ROW_MIN;
  const left = Number(w) - R.SIDE_PRIMARY - R.GAP;
  return left - R.FACTS_W - R.GAP >= R.PAGER_W + 2 * R.ENTRY_MIN + R.GAP;
}

/** Is Pets a door of the first rows (true) or the strip's first entry (false)?  Only on the narrowest phone
 *  on its side (under SIDE_NARROW: 667 x 375's 646, 740 x 360's 712), where the one row cannot hold the three
 *  weapons, Shared, Pets AND a strip of one whole entry; it keeps V17's reading order (Pets straight after
 *  Character stats) as the strip's first entry, in view unscrolled. */
export function broV17PetsInRow(shape, w) {
  return !(shape === 'side' && Number(w) < BRO_V17_ROOM.SIDE_NARROW);
}

/**
 * The strip's pages: how many WHOLE entries a page holds, and their width, so no entry is ever cut at the
 * strip's edge (mp-v17fit fails a cut word).  `n` entries; `w` the strip's width.
 *   - all fit (n entries of ENTRY_MIN and their gaps): one page, each (w - gaps) / n wide, no pager;
 *   - else k = whole entries beside the pager (44), each (w - pager - gaps) / k wide; pages = ceil(n / k).
 * Returns { per, pages, entryW, pager }; a strip under one entry and the pager holds one entry a page.
 */
export function broV17StripPages(n, w) {
  const R = BRO_V17_ROOM;
  const N = Math.max(0, Math.floor(Number(n) || 0));
  const W = Math.max(0, Math.floor(Number(w) || 0));
  if (N === 0) return Object.freeze({ per: 0, pages: 0, entryW: 0, pager: false });
  if (N * R.ENTRY_MIN + (N - 1) * R.GAP <= W) return Object.freeze({ per: N, pages: 1, entryW: Math.floor((W - (N - 1) * R.GAP) / N), pager: false });
  const room = W - R.PAGER_W - R.GAP;
  const k = Math.max(1, Math.floor((room + R.GAP) / (R.ENTRY_MIN + R.GAP)));
  return Object.freeze({ per: k, pages: Math.ceil(N / k), entryW: Math.max(R.ENTRY_MIN, Math.floor((room - (k - 1) * R.GAP) / k)), pager: true });
}

/** The entries page `p` shows (it wraps: the page after the last is the first). */
export function broV17StripPage(entries, per, p) {
  const list = Array.isArray(entries) ? entries : [];
  const k = Math.max(1, Math.floor(Number(per) || 1));
  const pages = Math.max(1, Math.ceil(list.length / k));
  const i = ((Math.floor(Number(p) || 0) % pages) + pages) % pages;
  return Object.freeze({ page: i, pages, entries: Object.freeze(list.slice(i * k, i * k + k)) });
}
