/* ═══ v2.3.6696: PETS AS BRO'S DOOR: THE COMPANION, OWNED, A PET, ALL (card UI2-pets, the build's step 6) ═══
 *
 * The owner, 2026-11-25, the master specification part 4.6: "Active companion
 * dominates the overview, with actual appearance, identity and relevant
 * supported stats. Secondary destinations: Owned Pets and All Pets. All Pets
 * should reuse the Codex pet collection when available, not duplicate
 * encyclopedia data. No active companion produces an informative empty
 * state. Owner management and other-player inspection use the same
 * underlying components with permissions. Pet leveling/XP, sample species
 * and stats shown in prior wireframes were examples, not confirmed
 * mechanics."  And "Yeah my game content over the mockup stuff".
 *
 * What each page of Pets says, read from the GAME's own tables and rules
 * (src/data/trapping.js, the worker's copies; the record is the worker's,
 * pets_state -> S._petBook), so a page's "why" is the same rule that would
 * refuse:
 *   petsLanding   the page `pets`: the pet out with you (its name, its kind
 *                 and stage when it is named, Golden, Big, the level it works
 *                 at with the held note, its XP, its ward), the doors Owned
 *                 ("n of 30") and All ("k of 18 caught"), one action, Put
 *                 away; with none out, or none at all, or the record not
 *                 ready, its honest empty state (both doors still there);
 *   petsOwned     the page `petsOwned`: a card a pet ("With you" on the one
 *                 out), the Pet House's More room (petHousePrice; full at
 *                 its most, PET_HOUSE.CAP_MAX);
 *   petsOne       the page `petsOne`: one pet, and its actions with their
 *                 cost (Take out or Put away and Rename routine, Release for
 *                 good, Sell only where the store sells pets, off with
 *                 petTradeView's own words beside it);
 *   petsJournal   the page `petsAll`: the journal's 18 (nine kinds at two
 *                 stages), from the record's `journal` and never from the list;
 *   petsOther     another player's: only the pet out with them reaches the
 *                 phone (their tick record's `pw`: no name), read-only.
 *
 * NO STAT IS ADDED TO A PET (the card's reading 6): kind, stage, name, level,
 * XP, ward, Golden, Big, land.  The game has no pet rarity, attack, health or
 * ability, so none is ever shown.
 *
 * SEEING IT AT ONCE (the specification's Q84): a press holds its control
 * (src/game/pending.js) until the record moves (S._petBookRev): every answer
 * of the worker's, yes or no, is a pets_state (server/src/petbook.js
 * _petbookAct: its refusals go out through _petbookSend too), so the rev
 * moving settles it; past its window it reads "not confirmed yet" and stays
 * held until a pets_state comes.
 *
 * No React and no game state (node tests it: tools/guards/pet-pages.test.mjs):
 * the caller hands in the record, the Trapping level and the caps. */
import {
  PET_KINDS, PET_BIG_AT, PET_HOUSE, petKindName, petDisplayName, petEffectiveLevel, petXpView, petWardView,
  petHousePrice, petTradeView, petKindOfOld, parsePetWire, worldSafeText,
} from '../data/trapping.js';
import { ZONES } from '../data/zones.js';
import { pendingStep, pendingHolds } from './pending.js';
import { say } from '../game/say.js';   /* spelt by its folder (guards/say.test reads the path) */
import { SAY } from '../data/say/pets.js';

/* the pages of Pets beside its landing (each a PANELS row in BottomDashboard.jsx) */
export const PETS_PAGES = Object.freeze(['petsOwned', 'petsOne', 'petsAll']);
export const isPetsPage = (id) => PETS_PAGES.includes(id);

/* the journal's two stages, and its kinds in the game's order */
export const PET_STAGES = Object.freeze([1, 2]);
const KINDS = Object.freeze(Object.keys(PET_KINDS));
export const PET_JOURNAL_TOTAL = KINDS.length * PET_STAGES.length;   /* 18 */

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const int = (v, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : d; };

/** A land's name, the game's own (data/zones.js). */
export function petLandName(home) {
  return (has(ZONES, home) && ZONES[home] && ZONES[home].name) || '';
}

/**
 * One pet as every page shows it.  `p` a pet of the record (or an old pet);
 * `T` your Trapping level; `o`: { out (it is the one with you), levels
 * (caps.petlevels), wards (caps.petwards), live (caps.petbook) }.
 */
export function petView(p, T, o) {
  if (!p) return null;
  const f = o || {};
  const kind = p.kind || petKindOfOld(p);
  const pp = p.kind ? p : { ...p, kind, lv: p.level };
  const own = Math.max(1, int(pp.lv, 1));
  const shown = petEffectiveLevel(pp, T);
  const held = own > shown;
  const live = !!f.live && !!p.kind;
  const name = worldSafeText(petDisplayName(pp));
  return Object.freeze({
    id: p.id == null ? null : String(p.id),
    kind,
    stage: int(pp.stage, 1) >= 2 ? 2 : 1,
    pet: pp,
    name,
    /* the kind and stage, said when the pet has a name of its own (its name is the kind's otherwise) */
    kindWord: p.name ? petKindName(kind, pp.stage) : null,
    gold: !!p.gold,
    big: Number(p.size) >= PET_BIG_AT,
    out: !!f.out,
    level: Object.freeze({
      shown, own, held,
      words: held ? say(SAY, 'pets.levelHeld', { lv: shown, own }) : say(SAY, 'pets.level', { lv: shown }),
      note: held ? say(SAY, 'pets.heldNote', { lv: shown, own }) : null,
    }),
    xp: live && f.levels ? petXpView(pp, T) : null,
    ward: live && f.wards ? petWardView(pp, T) : null,
    land: petLandName(has(PET_KINDS, kind) ? PET_KINDS[kind].home : ''),
  });
}

/** The badges under a pet's name, in order (words only). */
export function petBadges(v) {
  if (!v) return [];
  const out = [];
  if (v.out) out.push(say(SAY, 'pets.badgeOut'));
  if (v.gold) out.push(say(SAY, 'pets.badgeGolden'));
  if (v.big) out.push(say(SAY, 'pets.badgeBig'));
  return out;
}

/** The journal: { cells: { [stage]: [{ kind, stage, caught, tried, n, tries, gold, big, name, land }] },
    caught, total, words }.  Read from the record's `journal` alone. */
export function petsJournal(book) {
  const journal = book && book.journal && typeof book.journal === 'object' ? book.journal : {};
  let caught = 0;
  const cells = Object.create(null);
  for (const st of PET_STAGES) {
    cells[st] = KINDS.map((kind) => {
      const key = kind + '.' + st;
      const j = has(journal, key) && journal[key] && typeof journal[key] === 'object' ? journal[key] : null;
      const n = Math.max(0, int(j && j.n, 0));
      const tries = Math.max(0, int(j && j.tries, 0));
      if (n > 0) caught++;
      return Object.freeze({
        kind, stage: st, caught: n > 0, tried: tries > 0, n, tries,
        gold: Math.max(0, int(j && j.gold, 0)),
        big: n > 0 && Number(j && j.big) > 0 ? Math.round(Number(j.big) * 100) : 0,
        name: petKindName(kind, st),
        land: petLandName(PET_KINDS[kind].home),
      });
    });
  }
  return Object.freeze({
    cells, caught, total: PET_JOURNAL_TOTAL,
    words: say(SAY, 'pets.journalCount', { caught, total: PET_JOURNAL_TOTAL }),
  });
}

/* the two doors of the landing, each with what is behind it */
function petsDoors(list, cap, journal) {
  return Object.freeze([
    Object.freeze({ id: 'owned', page: 'petsOwned', label: say(SAY, 'pets.doorOwned'), summary: say(SAY, 'pets.ownedSum', { n: list.length, cap }) }),
    Object.freeze({ id: 'all', page: 'petsAll', label: say(SAY, 'pets.doorAll'), summary: journal.words }),
  ]);
}

/* the record as a page reads it */
function readBook(o) {
  const f = o || {};
  const book = f.book || null;
  const list = Array.isArray(f.list) ? f.list.filter(Boolean) : [];
  const cap = Math.max(0, int(book && book.cap, PET_HOUSE.CAP)) || PET_HOUSE.CAP;
  return { f, book, list, cap, T: Math.max(1, int(f.T, 1)) };
}

/**
 * The landing.  `o`: { live (caps.petbook), book (S._petBook), list
 * (petBook.js petList), active (petBook.js activePet: null while a pet is
 * still in the trap that caught it), T, levels, wards, who, wire }.
 * Returns { state, pet, doors, actions, empty }:
 *   state  'loading' (no record yet: never "no pets" said as the truth),
 *          'notReady' (the worker could not load it), 'empty' (no pets),
 *          'none' (pets, none out), 'pet' (one out), and for another
 *          player 'other' / 'otherNone';
 *   pet    the one out (petView), or null;
 *   doors  Owned and All (none for another player);
 *   actions  [Put away] when one is out with you.
 */
export function petsLanding(o) {
  const { f, book, list, cap, T } = readBook(o);
  if (f.who != null) return petsOther(f.wire);
  if (f.live && !book) return Object.freeze({ state: 'loading', pet: null, doors: [], actions: [], empty: null });
  if (book && book.unavailable) {
    return Object.freeze({ state: 'notReady', pet: null, doors: [], actions: [],
      empty: Object.freeze({ kind: 'absent', title: say(SAY, 'pets.notReady'), why: null, how: null }) });
  }
  const journal = petsJournal(book);
  const doors = petsDoors(list, cap, journal);
  if (!list.length) {
    return Object.freeze({ state: 'empty', pet: null, doors, actions: [],
      empty: Object.freeze({ kind: 'absent', title: say(SAY, 'pets.emptyTitle'), why: null, how: 'pets.emptySteps' }) });
  }
  const out = f.active && list.find((p) => p && f.active && p.id === f.active.id) ? f.active : null;
  if (!out) {
    return Object.freeze({ state: 'none', pet: null, doors, actions: [],
      empty: Object.freeze({ kind: 'absent', title: say(SAY, 'pets.noneOut'), why: say(SAY, 'pets.noneOutWhy'), how: null }) });
  }
  const pet = petView(out, T, { out: true, levels: f.levels, wards: f.wards, live: f.live });
  const actions = f.live ? [Object.freeze({ id: 'away', slot: 0, cost: 'routine', check: () => null })] : [];
  return Object.freeze({ state: 'pet', pet, doors, actions: Object.freeze(actions), empty: null });
}

/** Another player's: only the pet out with them, from their record's `pw`
    ('kind.stage.gold.size.lv'; no name on the wire): its kind's name, read-only. */
export function petsOther(wire) {
  const w = parsePetWire(wire);
  const note = say(SAY, 'pets.otherShared');
  if (!w) {
    return Object.freeze({ state: 'otherNone', pet: null, doors: [], actions: [],
      empty: Object.freeze({ kind: 'absent', title: say(SAY, 'pets.otherNone'), why: note, how: null }) });
  }
  /* the wire's level is the one it shows (their Trapping level is not on the wire): no held note, no XP, no ward */
  const pet = petView({ kind: w.kind, stage: w.stage, gold: w.gold, size: w.size, lv: w.lv }, w.lv, { out: true });
  return Object.freeze({ state: 'other', pet, doors: [], actions: [], note, empty: null });
}

/**
 * Owned.  `o` as the landing's, and { house (caps.pethouse), coins }.
 * Returns { cards, head, house }: a card a pet (its view and its badges),
 * the head "n of cap", and the Pet House's More room:
 *   null (no pethouse cap, or the record not live), { state: 'full', words },
 *   or { state: 'offer', cap, price, can, have }.
 */
export function petsOwned(o) {
  const { f, book, list, cap, T } = readBook(o);
  const outId = f.active && f.active.id != null ? f.active.id : null;
  const cards = list.map((p) => {
    const v = petView(p, T, { out: outId != null && p.id === outId, levels: f.levels, wards: f.wards, live: f.live });
    return Object.freeze({ ...v, badges: Object.freeze(petBadges(v)) });
  });
  let house = null;
  if (f.live && f.house && book && !book.unavailable) {
    const price = petHousePrice(cap);
    if (!(price > 0)) house = Object.freeze({ state: 'full', words: say(SAY, 'pets.houseFull', { max: PET_HOUSE.CAP_MAX }) });
    else {
      const coins = Math.max(0, int(f.coins, 0));
      house = Object.freeze({ state: 'offer', cap, price, can: coins >= price, have: coins < price ? coins : null });
    }
  }
  return Object.freeze({ cards: Object.freeze(cards), head: say(SAY, 'pets.ownedSum', { n: list.length, cap }), house });
}

/**
 * One pet's page.  `o` as Owned's, and { id, sellOn (the store sells pets),
 * now }.  Returns { pet, actions, trade } or null when the pet is not yours
 * (released, sold, or another player's: no action is ever offered on
 * another player's pet).  Each action: { id, slot, cost, check } (src/game/
 * screenZones.js), `check` the game's own rule:
 *   active   Take out, or Put away the one out (routine);
 *   rename   routine;
 *   release  irreversible: the kit asks first, as today asked twice;
 *   sell     only where the store sells pets (as today), off with
 *            petTradeView's own words ("Put it away to trade or sell it",
 *            "Tradeable in ...").
 */
export function petsOne(o) {
  const { f, book, list, T } = readBook(o);
  if (f.who != null || !f.live || !book || book.unavailable) return null;
  const p = list.find((q) => q && q.id != null && String(q.id) === String(f.id));
  if (!p) return null;
  const isOut = !!(f.active && f.active.id === p.id);
  const pet = petView(p, T, { out: isOut, levels: f.levels, wards: f.wards, live: f.live });
  const trade = p.kind ? petTradeView(p, book.active, Number(f.now) || Date.now()) : null;
  const actions = [
    Object.freeze({ id: 'active', slot: 0, cost: 'routine', check: () => null, away: isOut }),
    Object.freeze({ id: 'rename', slot: 1, cost: 'routine', check: () => null }),
    Object.freeze({ id: 'release', slot: 2, cost: 'irreversible', check: () => null }),
  ];
  if (f.sellOn && trade) actions.push(Object.freeze({ id: 'sell', slot: 3, cost: 'routine', check: () => (trade.ok ? null : trade.words) }));
  return Object.freeze({ pet: Object.freeze({ ...pet, badges: Object.freeze(petBadges(pet)) }), actions: Object.freeze(actions), trade });
}

/* ═══ A PRESS, HELD UNTIL THE RECORD MOVES (pending.js) ═══
   A request's id carries the record's rev when it went ('pet:active@12'), so
   a pets_state (the rev moving) settles every request sent before it. */
export const PET_HOLDS = Object.freeze({
  active: 'pet:active',
  house: 'pet:house',
  name: (id) => 'pet:name:' + id,
  release: (id) => 'pet:release:' + id,
});

/** A press: { pend, go }.  `go` false (and the state unchanged) while the
    control is held by a press still out: a second press never goes out, and
    `send` (the request, through the action door) is not even called.  A
    `send` that gives back false (no connection) holds nothing. */
export function petsPress(pend, control, rev, now, send) {
  const c = String(control);
  if (pendingHolds(pend, c)) return { pend, go: false };
  if (typeof send === 'function' && !send()) return { pend, go: false };
  const next = pendingStep(pend, { type: 'send', id: c + '@' + int(rev, 0), holds: [c], now });
  return { pend: next, go: next !== pend };
}

/** The record moved to `rev`: every press sent before it is settled. */
export function petsSettle(pend, rev) {
  let next = pend;
  const r = String(int(rev, 0));
  for (const id of Object.keys(pend || {})) {
    if (id.slice(id.lastIndexOf('@') + 1) !== r) next = pendingStep(next, { type: 'settle', id });
  }
  return next;
}
