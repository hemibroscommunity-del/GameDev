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

/* the frame's own pages Character and Combat open (dashDests.js FRAME_PAGES); v2.3.6684: and
   Titles, the passport's door (the title's Equip, with its pending mark) */
export const BRO_HUB_PAGES = Object.freeze({ broCharacter: 'character', broCombat: 'combat', broTitles: 'titles' });

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
     bro:<door>/<what> inside that door's page (v2.3.6684: the passport's
                       Titles door and its Clan line, PASSPORT_DOORS below);
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

/* ═══ v2.3.6684: CHARACTER, THE PASSPORT (card UI2-bro, the build's step 3, PR 2) ═══
 *
 * The owner, 2026-11-25: "Character: RPG passport; large portrait and
 * adjacent combat level, name/title, supporting summaries. Not a combat-stat
 * dump."  The master specification's 4.1: "Prominent portrait, name, equipped
 * title and combat level. Supporting content: Sword, Bow, Staff levels; clan
 * and guild affiliations; achievement points; quest completion count; titles
 * ... Link to the detailed destinations rather than duplicating all their
 * content."  And the owner's standing rule: "keep my game content over the
 * mockup stuff".
 *
 * broPassport(r, who) says WHAT the page shows, from readings the page takes
 * with the game's own readers (sheet/CharacterPage.jsx readPassport):
 *   r.name     the player's name
 *   r.combat   the combat level BY THE GAME'S READER (src/data/prog3.js
 *              prog3CharLevel: the best weapon's while `onelevel` is on, the
 *              sum to 300 when it is off): shown as it is, never worked out
 *              again here from the weapons
 *   r.weapons  { sword, bow, staff: { lvl, unspent } }
 *   r.titleId  the worker's equipped title (S._achv.t); r.earned(id) whether
 *              it is earned (S._achv.got); r.titleText(id) its name (the
 *              achievement's: there is no list of titles apart from them)
 *   r.clanParty  the worker says clans are parties (caps clanparty + partykeep)
 *   r.party    S._party (the worker's party_state), null when in none
 *   r.oldClan  { tag, name } a clan of an older worker (S._clanData), or null
 *   r.ap       the worker's total of achievement points, null while unknown
 *   r.quests   quests completed (your phone's count), null while unknown
 * Each line is the game's value, or an honest line where it has none, or the
 * kit's loading placeholder while it has not arrived (never a 0).  The two
 * worked-out labels ("Sword Specialist") are NOT shown: their rules are the
 * owner's (the master notes' F5).
 *
 * Another player's page (`who`; nothing opens it until step 9): the same
 * public lines, named as theirs, with none of the owner's marks (no unspent
 * points), no Journey (your phone's own records) and no Equip. */

/* the three weapons, in the game's one vocabulary (the master notes' table 1,
   line 9): `p3` the prog3 skill (prog3.js SKILLS), `art` the touch control's
   picture (the master notes' part 4) */
export const PASSPORT_WEAPONS = Object.freeze([
  Object.freeze({ cat: 'sword', word: 'charPage.sword', art: '/icons/ui/combat-melee.webp' }),
  Object.freeze({ cat: 'bow', word: 'charPage.bow', art: '/icons/ui/combat-bow.webp' }),
  Object.freeze({ cat: 'staff', word: 'charPage.staff', art: '/icons/ui/combat-magic.webp' }),
]);

/* the passport's doors (a door is what opens something; a fact that opens
   nothing is recessed): `opens` the same words as Bro's doors */
export const PASSPORT_DOORS = Object.freeze({
  weapon: 'page:broCombat',      /* today's Combat page on that weapon, until step 4 */
  clan: 'page:clan',             /* the Party page (clans are parties now) */
  guilds: 'page:guild',          /* today's Guilds page: the ten skill guilds */
  ap: 'page:achievements',       /* Feats */
  quests: 'page:quests',         /* the Quests page */
  titles: 'page:broTitles',      /* the titles you have earned, and Equip */
  journey: 'page:journey',       /* lifetime records (moved here from the Settings hub) */
});

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.floor(Number(v))));

/** The Clan line: { v } the game's own name, or { key, n } words, with `none`. */
export function passportClan(r) {
  const R = r || {};
  if (R.clanParty) {
    const p = R.party && typeof R.party === 'object' && R.party.state === 'open' ? R.party : null;
    if (!p) return Object.freeze({ key: 'charPage.noClan', none: true });
    const a = p.ally && typeof p.ally === 'object' ? p.ally : null;
    const tag = a && (a.on || a.clan) && typeof a.tag === 'string' && /^[A-Z0-9]{1,4}$/.test(a.tag) ? a.tag : null;
    if (tag) return Object.freeze({ v: '[' + tag + ']' + (a.name ? ' ' + String(a.name) : ''), none: false });
    const n = Array.isArray(p.members) ? p.members.length : 0;
    return Object.freeze({ key: 'charPage.inParty', n, none: false });
  }
  const c = R.oldClan && typeof R.oldClan === 'object' && R.oldClan.tag ? R.oldClan : null;
  if (!c) return Object.freeze({ key: 'charPage.noClan', none: true });
  return Object.freeze({ v: (c.name || c.tag) + ' [' + c.tag + ']', none: false });
}

/**
 * The passport for `who` (null: yours).  Gives back:
 *   whose     null (yours) or broHubWhose's label
 *   name, combat (the reader's, or null)
 *   title     { id, text } only when it is EARNED, else null ("No title equipped")
 *   weapons   [{ cat, word, art, lvl, points, opens }]  (points: yours only)
 *   summary   [{ id, k, v | key+n, none, loading, opens }]  Clan, Guilds, AP, Quests
 *   doors     [{ id, k, opens }]  Titles, and Journey (yours only)
 */
export function broPassport(r, who) {
  const R = r || {};
  const self = who == null;
  const earned = typeof R.earned === 'function' ? R.earned : () => false;
  const tid = typeof R.titleId === 'string' && R.titleId ? R.titleId : null;
  let title = null;
  if (tid && earned(tid)) {
    const text = typeof R.titleText === 'function' ? R.titleText(tid) : null;
    if (text) title = Object.freeze({ id: tid, text: String(text) });
  }
  const W = R.weapons || {};
  const weapons = PASSPORT_WEAPONS.map((w) => {
    const k = W[w.cat] || {};
    const lvl = num(k.lvl);
    const pts = self ? (num(k.unspent) || 0) : 0;
    return Object.freeze({ cat: w.cat, word: w.word, art: w.art, lvl, points: pts, opens: PASSPORT_DOORS.weapon });
  });
  const clan = passportClan(R);
  const ap = num(R.ap);
  const quests = num(R.quests);
  const summary = [
    Object.freeze({ id: 'clan', k: 'charPage.clan', ...clan, loading: false, opens: PASSPORT_DOORS.clan }),
    Object.freeze({ id: 'guilds', k: 'charPage.guilds', key: 'charPage.skillGuilds', none: false, loading: false, opens: PASSPORT_DOORS.guilds }),
    Object.freeze({ id: 'ap', k: 'charPage.ap', v: ap, none: false, loading: ap == null, opens: PASSPORT_DOORS.ap }),
    /* another player's quests are their phone's count, which the worker does not keep: an honest line */
    Object.freeze(quests == null && !self
      ? { id: 'quests', k: 'charPage.quests', key: 'charPage.notShared', none: true, loading: false, opens: null }
      : { id: 'quests', k: 'charPage.quests', v: quests, none: false, loading: quests == null, opens: PASSPORT_DOORS.quests }),
  ];
  const doors = [Object.freeze({ id: 'titles', k: 'charPage.titles', opens: PASSPORT_DOORS.titles })];
  if (self) doors.push(Object.freeze({ id: 'journey', k: 'charPage.journey', opens: PASSPORT_DOORS.journey }));
  const c = num(R.combat);
  return Object.freeze({
    whose: broHubWhose(who),
    self,
    name: String(R.name == null ? '' : R.name).trim(),
    combat: c == null ? null : Math.max(1, c),
    title,
    weapons: Object.freeze(weapons),
    summary: Object.freeze(summary),
    doors: Object.freeze(doors),
  });
}

/* the controls a title change holds while it is out (src/game/pending.js) */
export const TITLE_HOLDS = Object.freeze(['title:equip', 'title:remove']);

/**
 * The Titles page's row of actions (src/game/screenZones.js's actions): Equip
 * (slot 0) and Remove title (slot 1), each ROUTINE (a title is changed back
 * as easily: no confirmation), each `check` the same rule the worker keeps
 * (server achievements.js _achvTitle: an id you have earned, or none).
 * Another player's page has NO actions: the owner's alone.
 *   who       null: yours
 *   picked    the title picked in the list (an id) or null
 *   worn      the title you wear (an id) or null
 *   earned(id)
 */
export function titleActions(who, picked, worn, earned) {
  if (who != null) return [];
  const has = typeof earned === 'function' ? earned : () => false;
  return [
    {
      id: 'equip', slot: 0, cost: 'routine',
      check: () => (!picked ? 'charPage.pickTitle' : !has(picked) ? 'charPage.notEarned' : picked === worn ? 'charPage.alreadyWorn' : null),
    },
    { id: 'remove', slot: 1, cost: 'routine', check: () => (worn ? null : 'charPage.noTitleWorn') },
  ];
}
