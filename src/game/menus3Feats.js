/* ═══ v2.3.6868: WORLD · FEATS -- THE AP LINE, THE RAIL, THE MEDALS, THE TITLES, THE RECORDS (card MN step 9) ═══
 *
 * The owner's Feats (docs/design/menus3/SPEC.md: "Feats (medals by tier,
 * AP): World · Feats", "AP source breakdown: World · Feats (AP header
 * line)", "Equipped title: World · Feats · Titles", "Lifetime records ...:
 * World · Feats · Records"; the wireframe v4.4: an AP bar, a rail Medals |
 * Titles | Records over the rows, Equip on a title's row) from the game's
 * REAL lists: the achievements table (src/data/achievements.js, 33 rows in
 * four tiers), the worker's achv_state (S._achv: what is earned, when, the
 * worn title, the title ask out), today's Feats readers (src/game/feats.js:
 * featsAp, apTree, featsMedal, TITLE_FAMILIES, careerRows) -- never counted
 * again here.
 *
 * THE GAME'S TRUTH, NOT THE SAMPLE'S:
 *   - the AP line is the worker's total and its split as far as the game
 *     knows it (featsAp: from achievements, and quests + guild rungs + the
 *     arena TOGETHER: the worker keeps one total); the wireframe's "next
 *     feat" bar is sample content: the game picks no "next" feat (flagged);
 *   - NO claim and NO dot: an achievement pays its AP the moment the worker
 *     grants it (server achievements.js); no button in today's game lights
 *     for a feat's reward, so the owner's Decided 7 dot has nothing to say
 *     (flagged);
 *   - a medal row says Earned, its short progress where the game has some
 *     (achvProgressShort: a best level, "4/9"), or nothing: never "0 of 1";
 *   - titles are earned achievements' names (server _achvTitle): the earned
 *     ones, newest first, each with Equip (or Remove on the worn one) --
 *     today's request (`achv_title`, achievements.js sendAchvTitle, through
 *     the action door); the one family (Blooded, Veteran, Centurion) shows
 *     its next and locked rungs as words, as today's Titles page does;
 *   - Records are the counters the game keeps (careerRows: kills, deaths,
 *     lifetime gold, lifetime XP); Duels Won and Deepest Zone have no writer
 *     (feats.js CAREER_UNCOUNTED) and stay off as under today's Feats.
 *
 * The panel's pages (src/game/menus3Nav.js): 'root' the rail, 'ap' where the
 * AP came from, 'medal' a medal's page (arg its id).
 * Pure: node's suite reads it (server/test/menus3-feats.test.mjs). */
import { ACHIEVEMENTS, ACHV_TIERS, achvAp, achvById } from '../data/achievements.js';
import { achvProgressShort } from './achievements.js';
import { featsAp, FEATS_TIERS, TITLE_FAMILIES, careerRows } from './feats.js';

const has = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

/* the owner's rail, in the wireframe's order */
export const MENUS3_FEATS_RAIL = Object.freeze(['medals', 'titles', 'records']);
export const MENUS3_FEATS_PAGES = Object.freeze(['root', 'ap', 'medal']);
/** A rail's id, a forged one Medals (the first). */
export function featsRailId(x) { return MENUS3_FEATS_RAIL.indexOf(x) >= 0 ? x : 'medals'; }

const known = (S) => !!(S && S._achv && S._achv.known && !S._achv.unavailable);
const earned = (S, id) => known(S) && has(S._achv.got, id);

/**
 * The AP line: { kind, total, achv, rest, earned, of }.
 * kind 'off' (the worker grants no achievements: caps.achievements off), 'loading' (its answer
 * not in: never 0), 'split' (the parts add up: achv + rest = total), 'total' (they do not: a row
 * the test lever lit pays nothing; the total alone, never a split that is false).
 */
export function featsHead(S, live) {
  if (!live) return Object.freeze({ kind: 'off', total: null, achv: null, rest: null, earned: null, of: ACHIEVEMENTS.length });
  const ap = featsAp(S);
  if (ap.loading) return Object.freeze({ kind: 'loading', total: null, achv: null, rest: null, earned: null, of: ap.of });
  return Object.freeze({ kind: ap.known ? 'split' : 'total', total: ap.total, achv: ap.known ? ap.achv : null, rest: ap.known ? ap.rest : null,
    earned: ap.earned, of: ap.of });
}

/**
 * The medals, a group a tier in the table's order:
 *   [{ tier, ring, n, of, pts, max, rows: [{ id, name, got, at, progress }] }]
 * `n` and every `got` only from what the worker sent; `progress` achvProgressShort's words
 * ('' where the game has none) only while not earned; `pts` of `max` each row's OWN points
 * (achvAp: the fish rows pay their own).
 */
export function featsMedalGroups(S) {
  const ready = known(S);
  return Object.freeze(FEATS_TIERS.map((t) => {
    const defs = ACHIEVEMENTS.filter((d) => d.tier === t);
    const rows = defs.map((d) => {
      const got = ready && has(S._achv.got, d.id);
      let progress = '';
      if (ready && !got) { try { progress = achvProgressShort(S, d.id) || ''; } catch (e) { progress = ''; } }
      return Object.freeze({ id: d.id, name: d.name, got, at: got ? Number(S._achv.got[d.id]) || 0 : 0, progress });
    });
    return Object.freeze({
      tier: t, ring: ACHV_TIERS[t].color,
      n: ready ? rows.filter((r) => r.got).length : null, of: defs.length,
      pts: rows.filter((r) => r.got).reduce((n, r) => n + achvAp(r.id), 0),
      max: defs.reduce((n, d) => n + achvAp(d.id), 0),
      rows: Object.freeze(rows),
    });
  }));
}

/**
 * The titles: [{ id, name, clue, state, worn }] -- the earned ones newest first ('got'), then
 * the one family's rungs not earned ('next', then 'locked') when any of its rungs is earned, as
 * today's Titles page (CharacterPage.jsx TitlesPage, sheet/TitleFamily.jsx) draws them.  Empty
 * until the worker's answer is in.
 */
export function featsTitleRows(S) {
  if (!known(S)) return Object.freeze([]);
  const a = S._achv;
  const worn = typeof a.t === 'string' && has(a.got, a.t) ? a.t : null;
  const got = [];
  for (const d of ACHIEVEMENTS) if (has(a.got, d.id)) got.push({ id: d.id, name: d.name, clue: d.clue || d.how || '', at: Number(a.got[d.id]) || 0 });
  got.sort((x, y) => y.at - x.at);
  const out = got.map((t) => Object.freeze({ id: t.id, name: t.name, clue: t.clue, state: 'got', worn: t.id === worn }));
  for (const f of TITLE_FAMILIES) {
    if (!f.ids.some((id) => has(a.got, id))) continue;
    let next = false;
    for (const id of f.ids) {
      if (has(a.got, id)) continue;
      const d = achvById(id);
      out.push(Object.freeze({ id, name: d ? d.name : id, clue: d ? d.how || '' : '', state: next ? 'locked' : 'next', worn: false }));
      next = true;
    }
  }
  return Object.freeze(out);
}

/**
 * A title row's one button: { kind: 'equip' | 'remove', id, held } or null (a rung not earned
 * has none).  `ask` the title ask out (achievements.js achvTitleWaiting): every button is HELD
 * while it is out, so a second press never goes before the worker answers.
 */
export function titleButton(row, ask) {
  if (!row || row.state !== 'got') return null;
  const held = !!ask;
  return Object.freeze(row.worn ? { kind: 'remove', id: null, held } : { kind: 'equip', id: row.id, held });
}

/** A medal page's one action, for an earned medal (its name is a title): Equip, Remove, or null. */
export function medalButton(S, id, ask) {
  if (!earned(S, id)) return null;
  return titleButton({ id, state: 'got', worn: S._achv.t === id }, ask);
}

/** Records: the counters the game keeps (feats.js careerRows), [{ id, k, v }]. */
export function featsRecords(R) {
  return Object.freeze(careerRows(R).map((r) => Object.freeze({ id: r.id, k: r.k, v: r.v })));
}


