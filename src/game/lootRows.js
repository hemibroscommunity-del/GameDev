/* ═══ v2.3.6693: A MONSTER'S LOOT AS PLAIN ROWS (card UI2-codex, the build's step 6) ═══
 *
 * The owner, 2026-11-25 (the master specification, Q75): "Show item artwork,
 * explicit item name, rarity and exact drop probability together. Selecting
 * an item opens universal item inspection. No dice-roll numbers, probability
 * progress bars or unnecessary drill-down by rarity."  "Do not assign
 * illustrative percentages to actual items, round very small positive
 * probabilities to zero, or imply mutually exclusive drops unless the engine
 * works that way."
 *
 * The rows are made FROM the one drop table (src/data/codexDrops.js
 * codexDropsFor, which mirror-audit holds to the worker), never beside it: no
 * rate is written here.  A row: its picture, its name, its type in the game's
 * word, and ONE chance (codexPercent, which never says "0%" for a chance above
 * nothing; "Every kill" for what every kill gives, gold with its amount).  A
 * piece that rolls a grade says so; the grades and their shares are said once,
 * under the table, as the roll's own words are: "One roll a kill: at most one
 * of the drops with a chance" where the worker rolls once a kill
 * (caps.killroll, `shared`), "Each drop rolls on its own" where it does not.
 * A row's `tier: 'common'` is a weapon's base tier, never a grade: it is not
 * read.
 *
 * lootSources(key) turns the table round: every monster that drops an item,
 * with its land and its chance (the item page's "Found from").
 *
 * No React and no game state (node tests it: tools/guards/loot-rows.test.mjs). */
import { codexDropsFor, codexPercent, codexGrades, codexGradePercent } from '../data/codexDrops.js';
import { CODEX_KINDS, CODEX_ENTRIES } from '../data/monsterCodex.js';
import { QUALITY_LABEL } from '../ui/mobile/dash/common.js';
import { codexLandName } from './codexView.js';
import { say } from '../game/say.js';   /* spelt by its folder (guards/say.test reads the path) */
import { SAY } from '../data/say/codexPages.js';
import { SAY as SAY_CX } from '../data/say/monsterCodex.js';

/** One row's chance, in words: "Every kill", or the table's own percent. */
export function lootChance(p) {
  return Number(p) >= 1 ? say(SAY, 'codexPages.everyKill') : codexPercent(Number(p));
}

/**
 * The rows of a drop table (codexDropsFor's answer).  `opts.nameOf(drop)`:
 * the name the item's own page reads (so a piece is named the same from the
 * Codex and from the bag); its fallback the table's.
 * Returns [{ id, key, name, art, type, chance, every, note, graded, desc }].
 */
export function lootRows(drops, opts) {
  const nameOf = opts && typeof opts.nameOf === 'function' ? opts.nameOf : null;
  const out = [];
  for (const d of Array.isArray(drops) ? drops : []) {
    if (!d || !d.id || !(Number(d.chance) > 0)) continue;   /* a drop the table says cannot fall is not a row */
    const every = Number(d.chance) >= 1;
    let name = '';
    if (nameOf) { try { name = nameOf(d) || ''; } catch (e) { name = ''; } }
    const note = d.amount ? say(SAY, 'codexPages.goldAmount', { amount: d.amount }) : d.graded ? say(SAY, 'codexPages.rollsGrade') : '';
    out.push(Object.freeze({
      id: d.id, key: d.key, name: name || d.name, art: d.icon || null, type: d.type,
      chance: lootChance(d.chance), every, note, graded: !!d.graded, desc: d.desc || '',
    }));
  }
  return Object.freeze(out);
}

/** The roll's true words, once under the table. */
export function lootRollWords(shared) {
  return shared ? say(SAY, 'codexPages.rollShared') : say(SAY, 'codexPages.rollEach');
}

/** The grades a dropped piece rolls, with their shares, in the game's words:
 *  [{ q, word, pct }]. */
export function lootGrades() {
  return Object.freeze(codexGrades().map((g) => Object.freeze({ q: g.q, word: QUALITY_LABEL[g.q] || g.q, pct: codexGradePercent(g.p) })));
}

/** Every monster that drops `key`, with its land and its chance, in the
 *  Codex's order: [{ kind, name, land, chance, met }].  `opts` as
 *  codexDropsFor's, and `metOf(kind)`: a monster not met yet is "???" here as
 *  on its card (its land and the chance are the item's, so they stay). */
export function lootSources(key, opts) {
  const metOf = opts && typeof opts.metOf === 'function' ? opts.metOf : () => true;
  const out = [];
  for (const kind of CODEX_KINDS) {
    const rows = codexDropsFor(kind, opts) || [];
    const d = rows.find((r) => r && r.key === key && Number(r.chance) > 0);
    if (!d) continue;
    const e = CODEX_ENTRIES[kind];
    const met = !!metOf(kind);
    out.push(Object.freeze({ kind, name: met ? e.name : say(SAY_CX, 'monsterCodex.unknownName'), land: codexLandName(e.home), chance: lootChance(d.chance), met }));
  }
  return Object.freeze(out);
}
