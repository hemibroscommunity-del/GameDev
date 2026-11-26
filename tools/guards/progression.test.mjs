/* ═══ v2.3.6685: A SKILL'S PROGRESS HOLDS (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * src/game/progression.js: a level and its XP as a screen draws them
 * (progressOf), a weapon's as the game holds them (weaponProgress), and the
 * one true line of what a weapon's level gives (weaponRoadmap).  Reused by
 * step 6 for a life skill.  Here, not in server/test (a file there deploys
 * the worker).
 *
 * THE DODGES (each planted below; each plant must turn its own check red,
 * every run; a plant that stays green fails the suite):
 *   G1 the XP shown past what the level needs (a bar over full)
 *   G2 XP numbers shown at the cap (there is nothing to earn toward)
 *   G3 a level past the cap, or under 1
 *   G4 the weapon's XP read from somewhere other than the game's record
 *      (rpg.prog3.sk[cat].xp) or its need from another curve than
 *      prog3XpRequired
 *   G5 the roadmap promising SHARED points with a weapon's level (the
 *      document's rule, not the game's), or a milestone the game does not have
 *   G6 the bar's fraction not the XP over the need
 *
 * Run: node tools/guards/progression.test.mjs
 */
import { progressOf, weaponProgress, weaponRoadmap } from '../../src/game/progression.js';
import { PROG3, prog3XpRequired } from '../../src/data/prog3.js';
import { SAY } from '../../src/data/say/combatHub.js';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -- ' + detail : '')); }
}

const R = { prog3: { sk: { sword: { level: 6, xp: 120 }, bow: { level: 3, xp: 99999 }, staff: { level: 100, xp: 50 } } } };

/* the checks, each a function of the rules it holds, so a plant can be played through it */
const CHECKS = {
  G1: (P) => { const p = P.progressOf(4, 900, 500, 100); return p.xpNow === 500 && p.xpNeed === 500 && p.frac === 1; },
  G1b: (P) => { const p = P.progressOf(4, -5, 500, 100); return p.xpNow === 0 && p.frac === 0; },
  G2: (P) => { const p = P.progressOf(100, 10, 500, 100); return p.max === true && p.xpNow === null && p.xpNeed === null && p.level === 100 && p.frac === 1; },
  G2b: (P) => { const p = P.progressOf(99, 10, 500, 100); return p.max === false && p.xpNow === 10; },
  G3: (P) => P.progressOf(140, 0, 500, 100).level === 100 && P.progressOf(0, 0, 500, 100).level === 1 && P.progressOf(7, 0, 500, null).max === false,
  G4: (P) => {
    const s = P.weaponProgress(R, 'sword');
    const b = P.weaponProgress(R, 'bow');
    const t = P.weaponProgress(R, 'staff');
    return s.level === 6 && s.xpNow === 120 && s.xpNeed === prog3XpRequired(6) && s.cap === PROG3.LEVEL_CAP
      && b.xpNow === prog3XpRequired(3) && t.max === true
      && P.weaponProgress({}, 'bow').level === 1 && P.weaponProgress({}, 'bow').xpNow === 0;
  },
  G5: (P) => {
    const rows = P.weaponRoadmap('bow');
    const words = rows.map((r) => String(SAY[r.key] || '')).join(' ');
    return rows.length === 1 && rows[0].n === PROG3.POINTS_PER_LEVEL && rows[0].cat === 'bow' && !/shared/i.test(words) && /\{w\} points/.test(words);
  },
  G6: (P) => { const p = P.progressOf(4, 125, 500, 100); return p.frac === 0.25 && P.progressOf(4, 0, 0, 100).xpNeed === 1; },
};
const REAL = { progressOf, weaponProgress, weaponRoadmap };

console.log('progression: part 1, the rules');
for (const [id, fn] of Object.entries(CHECKS)) check(id, (() => { try { return fn(REAL); } catch (e) { return false; } })());

/* part 2: the plants, each the dodge a tired programmer writes */
const PLANTS = [
  ['G1', { ...REAL, progressOf: (l, x, n, c) => ({ ...progressOf(l, x, n, c), xpNow: Math.max(0, Math.floor(x)) }) }],
  ['G1b', { ...REAL, progressOf: (l, x, n, c) => { const p = progressOf(l, x, n, c); return { ...p, xpNow: Math.floor(x), frac: x / n }; } }],
  ['G2', { ...REAL, progressOf: (l, x, n, c) => ({ ...progressOf(Math.min(l, c - 1), x, n, c), level: l }) }],
  ['G2b', { ...REAL, progressOf: (l, x, n, c) => progressOf(l, x, n, c == null ? null : c - 1) }],
  ['G3', { ...REAL, progressOf: (l, x, n, c) => ({ ...progressOf(l, x, n, c), level: Math.floor(l) }) }],
  ['G4', { ...REAL, weaponProgress: (r, c) => progressOf(r.prog3 ? r.prog3.sk[c].level : 1, 0, prog3XpRequired(1), 100) }],
  ['G4', { ...REAL, weaponProgress: (r, c) => { const p = weaponProgress(r, c); return { ...p, xpNeed: p.max ? null : 280 }; } }],
  ['G5', { ...REAL, weaponRoadmap: (c) => [...weaponRoadmap(c), { key: 'combatHub.shared', n: PROG3.SHARED_POINTS_PER_LEVEL, cat: c }] }],
  ['G5', { ...REAL, weaponRoadmap: (c) => [{ key: 'combatHub.levelGives', n: 6, cat: c }] }],
  ['G6', { ...REAL, progressOf: (l, x, n, c) => ({ ...progressOf(l, x, n, c), frac: 0.5 }) }],
];
console.log('progression: part 2, each plant seen red');
for (const [id, planted] of PLANTS) {
  let ok = true;
  try { ok = CHECKS[id](planted); } catch (e) { ok = false; }
  check('plant ' + id + ' turns its check red', !ok);
}

if (failed) { console.log(`progression: ${failed} FAILED`); process.exit(1); }
console.log('progression: all held');
