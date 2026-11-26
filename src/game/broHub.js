/* ═══ v2.3.6683: BRO'S LANDING, SIX DOORS (card UI2-bro, the build's step 3, PR 1) ═══
 *
 * The owner, 2026-11-25, with the master specification: "Bro landing: Six
 * buttons only under contextual header. Character, Combat, Equipment / Life
 * Skills, Feats, Pets. Remove the redundant player/tap banner."  Its part 4:
 * "Feats is the approved replacement for Accomplishments. No player portrait
 * or tap banner above the Bro landing grid. For another player, identify the
 * inspected owner in the header or a compact contextual label without adding
 * a large banner."
 *
 * So Bro's page under the new frame (`?ui2=0` the one way back) is six equal
 * kit tiles, three across and two down (one row of six on a phone on its
 * side), each its picture and one word, and nothing else
 * (src/ui/mobile/sheet/BroLanding.jsx draws what these tables say).  Built
 * from src/game/broPages.js (card BRO, v2.3.6600): today's three pages are
 * what Character and Combat open until their own steps, and today's eight
 * doors of the Progress page each keep a road (BRO_PROGRESS_ROADS).
 *
 * A door's `opens` (the same words as broPages.js's doors):
 *   page:<id>  a page pushed under Bro, the header's Back returning here;
 *   gear       the Gear workspace (BroCard openGear: Equipment until step 5).
 * Character's and Combat's pages are the frame's own (dashDests.js
 * FRAME_PAGES broCharacter, broCombat): today's pages under the header until
 * PR 2 (the passport) and step 4 (the combat hub) replace them.
 *
 * Whose page (the card's reading 6): every reader takes a `who` (the frame's
 * stack entry; null is yours).  Yours is not labelled; another player's names
 * its owner and shows none of the owner's marks (no unspent points, no "new"):
 * the specification's "ownership affects available management actions and
 * private data access".  Nothing opens another player's Bro yet (step 9).
 *
 * NO IMPORTS: node tests it (tools/guards/bro-hub.test.mjs). */

/* the six doors, in the specification's order (3 x 2: Character, Combat,
   Equipment / Life Skills, Feats, Pets).  `word` a key of
   src/data/say/dashFrame.js; `art` the picture the game's door has today (the
   card's facts: Combat has no door picture of its own, so the sword of the
   melee lane, `combat-melee.webp`: `panel-weapons.webp` is an anvil, which
   reads as smithing at a tile's size); `cap` the worker's cap the page needs
   (BottomDashboard CAP_PAGES): without it the tile keeps its place, locked,
   and says why; `key` a computer's letter (deskKeys.js NAV_KEYS). */
export const BRO_HUB_DOORS = Object.freeze([
  Object.freeze({ id: 'character', word: 'dashFrame.character', art: '/icons/ui/panel-self.webp', opens: 'page:broCharacter' }),
  Object.freeze({ id: 'combat', word: 'dashFrame.combat', art: '/icons/ui/combat-melee.webp', opens: 'page:broCombat' }),
  Object.freeze({ id: 'equipment', word: 'dashFrame.equipment', art: '/icons/ui/panel-loadout.webp', opens: 'gear' }),
  Object.freeze({ id: 'skills', word: 'dashFrame.lifeSkills', art: '/icons/ui/nav-lifeskills.webp', opens: 'page:skills', key: 'L' }),
  Object.freeze({ id: 'feats', word: 'dashFrame.feats', art: '/icons/achievements/achievements.webp', opens: 'page:achievements', cap: 'achievements' }),
  Object.freeze({ id: 'pets', word: 'dashFrame.pets', art: '/icons/ui/pets-paw.webp', opens: 'page:pets', cap: 'petbook' }),
]);

/* the frame's own pages Character and Combat open (dashDests.js FRAME_PAGES) */
export const BRO_HUB_PAGES = Object.freeze({ broCharacter: 'character', broCombat: 'combat' });

/** Is this one of Bro's own frame pages (Character, Combat)? */
export function isBroHubPage(id) {
  return Object.prototype.hasOwnProperty.call(BRO_HUB_PAGES, String(id));
}

/** What an `opens` word asks for: { kind: 'page', page } | { kind: 'gear' } | null. */
export function broHubOpen(opens) {
  const s = String(opens || '');
  if (s.indexOf('page:') === 0) {
    const page = s.slice(5);
    return page ? { kind: 'page', page } : null;
  }
  return s === 'gear' ? { kind: 'gear' } : null;
}

/**
 * The doors as drawn, for `who` (null: yours).  `caps` the worker's caps (null:
 * not known yet, every door open, as BottomDashboard's offers read them).
 * Each: the door's row, and `locked` with its `why` (a say key of
 * src/data/say/dashFrame.js) when the worker does not offer its page.  A
 * locked door KEEPS ITS PLACE (the specification's 1.2.1: "stable locations
 * and informative empty states").
 */
export function broHubDoors(caps) {
  return BRO_HUB_DOORS.map((d) => {
    const locked = !!(d.cap && caps && !caps[d.cap]);
    return Object.freeze({ ...d, locked, why: locked ? 'dashFrame.notOffered' : null });
  });
}

/**
 * The marks on the six tiles (the counts the game already shows, never a new
 * counter): the unspent points glow on Combat (where Points is reached; the
 * same glow climbs to Bro's tile and the Menu button: dashDests.js
 * frameMarks), Life Skills' "new" on Life Skills.  Another player's page shows
 * none of them: their points are theirs to spend, and private.
 */
export function broHubMarks(points, lifeNew, who) {
  if (who != null) return Object.freeze({});
  const n = Number(points) > 0 ? Math.floor(Number(points)) : 0;
  return Object.freeze({
    combat: Object.freeze({ count: n, glow: n > 0 }),
    skills: Object.freeze({ dot: !!lifeNew }),
  });
}

/**
 * Whose page, for the header or a compact label: null for yours (the
 * specification's "Self is the implicit default; do not clutter
 * self-inspection with repetitive ownership labels"), else { key, name }
 * (`dashFrame.whose`: "<name>'s Bro").  A name that is missing reads
 * "Another player", never blank and never yours.
 */
export function broHubWhose(who) {
  if (who == null) return null;
  const name = who && typeof who === 'object' ? who.name : who;
  const s = String(name == null ? '' : name).trim();
  return Object.freeze({ key: s ? 'dashFrame.whose' : 'dashFrame.whoseUnknown', name: s });
}

/* ═══ NOTHING OF TODAY'S BRO IS LOST ═══
   The eight doors of today's Progress page (broPages.js BRO_DOORS) and the
   road each takes under the new frame (the card's reading 3).  A road:
     bro:<door>        one of the six tiles above;
     bro:<door>/<what> inside that door's page (Character's today's pages until
                       the passport, PR 2: its title line, its Clan door);
     menu:<door>       a tile of the Menu (dashDests.js MENU_DESTS). */
export const BRO_PROGRESS_ROADS = Object.freeze({
  skills: 'bro:skills',
  titles: 'bro:character/titles',
  homestead: 'menu:homestead',
  pet: 'bro:pets',
  clan: 'bro:character/clan',
  points: 'bro:combat/points',
  achievements: 'bro:feats',
  equipment: 'bro:equipment',
});
