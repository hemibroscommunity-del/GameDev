/* ═══ v2.3.6693: THE CODEX AS A COLLECTION (card UI2-codex, the build's step 6) ═══
 *
 * The owner, 2026-11-25, with the master specification (part 8): "Codex is a
 * complete encyclopedia, not a knowledge-unlock or discovery-gated system";
 * Q73: "Use illustrated entity cards, with artwork as the dominant visual and
 * a small amount of essential information that depends on the entity type.
 * Avoid a dense database-style directory as the general collection layout."
 *
 * What the collection holds, read from the game's own tables:
 *   the kinds    Monsters (its nine), Items, Resources, Townsfolk, Lands, Pets.
 *                Every kind keeps its place: one with no pages yet says so
 *                (`empty`), and Pets carries one door, to the pet journal (the
 *                pets' own collection, never copied).  Mechanics and
 *                Furnishings are left out: the game has nothing of either;
 *   a card       a monster's picture (the caller draws it), its name, its
 *                element and its land, your kills, NEW while its page has
 *                something unread.  NOT MET (the game's rule, below): "???",
 *                "Not met yet" and its land, no element, no name.
 *
 * THE GAME'S RULE IS READ HERE AND ONLY HERE (codexMet): a page opens at
 * CODEX_OPEN_AT kills (src/data/monsterCodex.js, the owner's "I want all the
 * facts revealed after just 1 kill").  The specification's "complete, never
 * locked" is the owner's open question F4 (the master notes): their answer is
 * this one line.
 *
 * No React and no game state (node tests it: tools/guards/codex-view.test.mjs):
 * the caller hands in each kind's counts and its NEW marks. */
import { CODEX_KINDS, CODEX_ENTRIES, CODEX_ELEMENTS, CODEX_OPEN_AT } from '../data/monsterCodex.js';
import { ZONES } from '../data/zones.js';
import { say } from '../game/say.js';   /* spelt by its folder (guards/say.test reads the path) */
import { SAY } from '../data/say/codexPages.js';
import { SAY as SAY_CX } from '../data/say/monsterCodex.js';

/** The game's rule: is a kind with `n` kills met (its page open)? */
export function codexMet(n) {
  return Number(n) >= CODEX_OPEN_AT;
}

/** A land's name, the game's own (data/zones.js). */
export function codexLandName(home) {
  return (Object.prototype.hasOwnProperty.call(ZONES, home) && ZONES[home] && ZONES[home].name) || String(home || '');
}

/* the kinds, in the order the collection shows them */
const SHELF_IDS = Object.freeze(['monsters', 'items', 'resources', 'townsfolk', 'lands', 'pets']);
function shelfWord(id) {
  switch (id) {
    case 'monsters': return say(SAY, 'codexPages.shelfMonsters');
    case 'items': return say(SAY, 'codexPages.shelfItems');
    case 'resources': return say(SAY, 'codexPages.shelfResources');
    case 'townsfolk': return say(SAY, 'codexPages.shelfTownsfolk');
    case 'lands': return say(SAY, 'codexPages.shelfLands');
    default: return say(SAY, 'codexPages.shelfPets');
  }
}
/** The kinds: [{ id, word }], Monsters first (the one chosen on opening). */
export const CODEX_SHELVES = Object.freeze(SHELF_IDS.map((id) => Object.freeze({ id, word: shelfWord(id) })));

/** One monster's card.  `counts` [kills, kills past the first pass]; `fresh`
 *  its unread facts (codexFresh).  Null for a kind the Codex has no page for. */
export function codexCard(kind, counts, fresh) {
  const e = Object.prototype.hasOwnProperty.call(CODEX_ENTRIES, kind) ? CODEX_ENTRIES[kind] : null;
  if (!e) return null;
  const n = Math.max(0, Math.floor(Number(counts && counts[0]) || 0));
  const met = codexMet(n);
  const land = codexLandName(e.home);
  if (!met) {
    return Object.freeze({ kind, met: false, name: say(SAY_CX, 'monsterCodex.unknownName'), land, element: null, kills: 0,
      line: say(SAY_CX, 'monsterCodex.cardNotMet'), fresh: false });
  }
  const el = Object.prototype.hasOwnProperty.call(CODEX_ELEMENTS, e.element) ? CODEX_ELEMENTS[e.element] : null;
  return Object.freeze({
    kind, met: true, name: e.name, land,
    element: el ? Object.freeze({ id: e.element, name: el.name, icon: el.icon }) : null,
    kills: n,
    line: say(SAY_CX, 'monsterCodex.cardKills', { n }),
    fresh: Array.isArray(fresh) && fresh.length > 0,
  });
}

/**
 * The collection's model.  `opts`:
 *   shelf     the kind chosen (unknown: Monsters);
 *   countsOf  (kind) => [kills, kills past the first pass];
 *   freshOf   (kind) => its unread facts.
 * Returns { shelves, shelf, cards, met, total, empty }: `cards` the chosen
 * kind's (only Monsters has any), `empty` its honest line when it has none
 * ({ title, why, door: { page, word } | null }).
 */
export function codexView(opts) {
  const o = opts || {};
  const shelf = SHELF_IDS.includes(o.shelf) ? o.shelf : 'monsters';
  const countsOf = typeof o.countsOf === 'function' ? o.countsOf : () => [0, 0];
  const freshOf = typeof o.freshOf === 'function' ? o.freshOf : () => [];
  const all = CODEX_KINDS.map((k) => codexCard(k, countsOf(k), freshOf(k))).filter(Boolean);
  const met = all.filter((c) => c.met).length;
  const cards = shelf === 'monsters' ? all : [];
  let empty = null;
  if (!cards.length) {
    empty = shelf === 'pets'
      ? Object.freeze({ title: say(SAY, 'codexPages.emptyTitle'), why: say(SAY, 'codexPages.emptyPets'), door: Object.freeze({ page: 'petsAll', word: say(SAY, 'codexPages.petJournal') }) })   /* v2.3.6696: the pets' own collection (card UI2-pets) */
      : Object.freeze({ title: say(SAY, 'codexPages.emptyTitle'), why: say(SAY, 'codexPages.emptyWhy'), door: null });
  }
  return Object.freeze({
    shelves: CODEX_SHELVES,
    shelf,
    cards: Object.freeze(cards),
    met,
    total: all.length,
    metWords: say(SAY, 'codexPages.met', { met, total: all.length }),
    empty,
  });
}
