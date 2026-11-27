/* ═══ v2.3.6693: A CODEX ENTRY'S SHOWCASE (card UI2-codex, the build's step 6) ═══
 *
 * The owner, 2026-11-25 (the master specification, Q74): "In the monster
 * example, the actual animated monster sprite, name, short description,
 * level/element and essential combat stats are visible on the first screen.
 * Subject destinations summarize their own contents and expand into
 * dedicated detail views."
 *
 * ONE model a kind of entry: who it is, its essentials and its doors, each
 * door with the summary of what is behind it (a door with nothing behind it
 * is not made).  A monster first, the only kind the game has pages for:
 *   identity     its name, element (icon and word) and land;
 *   essentials   its levels (the land's: no monster has levels of its own),
 *                its element, its type, your kills, and its strength "By
 *                level": NO health or damage number, for the game has none
 *                for a monster apart from its level (server/src: a land's
 *                monster scales with its level);
 *   doors        Combat (what it does, its element's effect, its special and
 *                the tip, with today's stage), Loot (its rows' count),
 *                Habitat (its land, both stages' levels, the way from BroTown,
 *                its dungeon), Story (its tale and its elder form); each
 *                summary one short line (a door is about 110 px wide on a
 *                phone): the special's name, the count, the land, the elder
 *                form's name.
 * A monster not met (src/game/codexView.js codexMet, the game's rule) has no
 * name, no doors and no facts: the locked page ("???", "Defeat one to open
 * its page.", its land).
 *
 * The helpers today's Codex drew its Locations with (a land's levels, the
 * first pass, the way there) live here now, and dash/MonsterCodex.jsx calls
 * them, so the two Codexes say one thing.
 *
 * No React and no game state (node tests it: tools/guards/entity-inspect.test.mjs). */
import { CODEX_ENTRIES, CODEX_ELEMENTS, CODEX_ROADS } from '../data/monsterCodex.js';
import { WHEEL_LAND_LEVELS, WHEEL_GATE_ROADS, landLevelsText } from '../data/wheelSignposts.js';
import { landLook } from '../data/wheelLands.js';
import { codexMet, codexLandName } from './codexView.js';
import { say } from '../game/say.js';   /* spelt by its folder (guards/say.test reads the path) */
import { SAY } from '../data/say/codexPages.js';
import { SAY as SAY_CX } from '../data/say/monsterCodex.js';

const entryOf = (kind) => (typeof kind === 'string' && Object.prototype.hasOwnProperty.call(CODEX_ENTRIES, kind) ? CODEX_ENTRIES[kind] : null);

/** "Lv 41" or "Lv 1–20" */
export function levelsText(levels) {
  return levels[0] === levels[1] ? say(SAY_CX, 'monsterCodex.levelsOne', { lo: levels[0] }) : say(SAY_CX, 'monsterCodex.levelsRange', { lo: levels[0], hi: levels[1] });
}

/** The first stage's levels and the elder form's, from the world's own range
    (petStageOf: 20 levels a stage). */
export function stageBands() {
  const [lo, hi] = WHEEL_LAND_LEVELS;
  const cut = Math.min(hi, 20);
  return { first: [lo, cut], elder: hi > cut ? [cut + 1, hi] : null };
}

/** How to get to land `home` from BroTown, by the signposts' own table. */
export function wayThere(home) {
  for (const gate of Object.keys(WHEEL_GATE_ROADS)) {
    const [straight, fork] = WHEEL_GATE_ROADS[gate];
    if (home === straight) return say(SAY_CX, 'monsterCodex.wayStraight', { gate, road: CODEX_ROADS[home] });
    if (home === fork) return say(SAY_CX, 'monsterCodex.wayFork', { gate, road: CODEX_ROADS[straight], fork: CODEX_ROADS[home] });
  }
  return null;
}

/** Combat's page: what it does, its element, its special and the tip. */
export function monsterCombat(kind) {
  const e = entryOf(kind);
  if (!e) return null;
  const el = Object.prototype.hasOwnProperty.call(CODEX_ELEMENTS, e.element) ? CODEX_ELEMENTS[e.element] : null;
  return Object.freeze({
    what: e.what,
    element: el ? Object.freeze({ id: e.element, name: el.name, status: el.status, effect: el.effect, icon: el.icon,
      pet: say(SAY_CX, 'monsterCodex.factPet', { land: codexLandName(e.home) }) }) : null,
    special: Object.freeze({ name: e.special.name, text: e.special.text, tip: e.special.tip }),
  });
}

/** Habitat's page: its rows, each { id, title, text } (and `stage` for a
    portrait of a stage). */
export function monsterHabitat(kind) {
  const e = entryOf(kind);
  if (!e) return null;
  const bands = stageBands();
  const land = codexLandName(e.home);
  const rows = [{ id: 'land', title: say(SAY_CX, 'monsterCodex.locLand'), text: say(SAY_CX, 'monsterCodex.locLandText', { land, levels: landLevelsText() }) },
    { id: 'levels', stage: 1, title: say(SAY_CX, 'monsterCodex.locFirst'), text: say(SAY_CX, 'monsterCodex.locFirstText', { name: e.name, levels: levelsText(bands.first) }) }];
  if (bands.elder && e.elder) rows.push({ id: 'elder', stage: 2, title: say(SAY_CX, 'monsterCodex.locElder'), text: say(SAY_CX, 'monsterCodex.locElderText', { name: e.elder.name, levels: levelsText(bands.elder) }) });
  const road = wayThere(e.home);
  if (road) rows.push({ id: 'road', title: say(SAY_CX, 'monsterCodex.locRoad'), text: road });
  if (e.dungeon) {
    rows.push({ id: 'dungeon', title: say(SAY_CX, 'monsterCodex.locDungeon'),
      text: say(SAY_CX, 'monsterCodex.locDungeonText', { dungeon: e.dungeon.charAt(0).toUpperCase() + e.dungeon.slice(1), land, levels: levelsText(e.dungeonLevels) }) });
  }
  return Object.freeze({ land, icon: (landLook(e.home) || {}).icon || null, rows: Object.freeze(rows.map((r) => Object.freeze(r))) });
}

/** Story's page: its tale and its elder form. */
export function monsterStory(kind) {
  const e = entryOf(kind);
  if (!e) return null;
  return Object.freeze({ story: Object.freeze(e.story.slice()), elder: e.elder ? Object.freeze({ name: e.elder.name, text: e.elder.text }) : null });
}

/**
 * A monster's showcase.  `opts`: counts [kills, kills past the first pass];
 * loot, its rows (src/game/lootRows.js lootRows: the Loot door counts THEM).
 * Returns null for a kind the Codex has no page for; else
 *   { kind, met: false, title, land, why, home }   not met; or
 *   { kind, met: true, title, identity: { name, element, land }, essentials:
 *     [{ id, k, v }], doors: [{ id, page, label, summary }] }.
 */
export function monsterShowcase(kind, opts) {
  const e = entryOf(kind);
  if (!e) return null;
  const o = opts || {};
  const n = Math.max(0, Math.floor(Number(o.counts && o.counts[0]) || 0));
  const land = codexLandName(e.home);
  if (!codexMet(n)) {
    return Object.freeze({ kind, met: false, title: say(SAY_CX, 'monsterCodex.unknownName'), land,
      why: say(SAY_CX, 'monsterCodex.lockedHint'), home: say(SAY_CX, 'monsterCodex.lockedHome', { land }) });
  }
  const el = Object.prototype.hasOwnProperty.call(CODEX_ELEMENTS, e.element) ? CODEX_ELEMENTS[e.element] : null;
  const essentials = [
    { id: 'levels', k: say(SAY, 'codexPages.factLevels'), v: landLevelsText() },
    { id: 'element', k: say(SAY, 'codexPages.factElement'), v: el ? el.name : '' },
    { id: 'type', k: say(SAY, 'codexPages.factType'), v: e.type },
    { id: 'kills', k: say(SAY, 'codexPages.factKills'), v: String(n) },
    { id: 'strength', k: say(SAY, 'codexPages.factStrength'), v: say(SAY, 'codexPages.byLevel') },
  ].filter((f) => f.v);
  const loot = Array.isArray(o.loot) ? o.loot : [];
  const doors = [
    { id: 'combat', page: 'codexCombat', label: say(SAY, 'codexPages.doorCombat'), summary: e.special.name },
    { id: 'loot', page: 'codexLoot', label: say(SAY, 'codexPages.doorLoot'), summary: loot.length ? say(SAY, 'codexPages.lootCount', { n: loot.length }) : '' },
    { id: 'habitat', page: 'codexHabitat', label: say(SAY, 'codexPages.doorHabitat'), summary: land },
    { id: 'story', page: 'codexStory', label: say(SAY, 'codexPages.doorStory'),
      summary: e.story && e.story.length ? (e.elder ? say(SAY, 'codexPages.storyElder', { elder: e.elder.name }) : say(SAY, 'codexPages.storyOnly')) : '' },
  ].filter((d) => d.summary);   /* a door with nothing behind it is not a door */
  return Object.freeze({
    kind, met: true, title: e.name,
    identity: Object.freeze({ name: e.name, land, element: el ? Object.freeze({ id: e.element, name: el.name, icon: el.icon }) : null }),
    essentials: Object.freeze(essentials.map((f) => Object.freeze(f))),
    doors: Object.freeze(doors.map((d) => Object.freeze(d))),
  });
}
