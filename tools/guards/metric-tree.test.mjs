/* ═══ v2.3.6686: THE STAT TREE AND THE SHARED PAGE (card UI2-combat, the build's step 4, PR 2) ═══
 *
 * DPS taken down to its reasons, one layer at a time (src/game/metricTree.js
 * dpsTree, src/ui/mobile/sheet/StatTree.jsx), from the game's own lines
 * (gameSystems.js calcDisplayDps' optional `out`, filled by the lines it
 * returns its total from); and the Shared page (sheet/SharedPage.jsx).  It lives here, not in
 * server/test/, because it tests the page's code: a new file there deploys
 * the worker (TRAPS §277).
 *
 *   T1  THE ROOT IS THE HEADLINE: for every fixture and weapon the tree's
 *       root is calcDisplayDps to the last bit, and the formula as it stood
 *       before this PR (copied below: today's callers get the same number);
 *       every layer, joined again by its operator, gives its own value
 *       (treeMismatches empty; evalNode from the leaves gives the root); the
 *       root reads as the page's DPS row reads it (toFixed(1));
 *   T1b the walker sees a wrong tree (its own break proof);
 *   T2  a bare character (no weapon in hand): no tree, calcDisplayDps 0,
 *       no parts filled;
 *   T3  the rows that are there only sometimes are exercised and join right:
 *       the flat part (an old worker's), the flat crit part, the staff's cast;
 *   T4  each layer's operator is the game's (an ALLOW list by node): a
 *       branch that is added where the game multiplies is red;
 *   T5  the tree's nodes are an ALLOW list: Element is NO part of DPS (no
 *       node, no word); the page has a word for every node and a "how" line
 *       for every layer;
 *   T6  a leaf names its source (a rule, placed points, a weapon's level,
 *       the worn weapon), and the points it names are the game's;
 *   T7  every layer has its frame page (TREE_PAGES), titled DPS (the header's
 *       word, MenuGrid.jsx doorWord, so it never falls to "Page"), and the
 *       deepest branch fits in them; the Shared page titled too;
 *   T8  Back from the deepest layer returns layer by layer to the weapon's
 *       page (dashNav's one transition), and the page pushes the next layer,
 *       never replaces it; the weapon page's DPS opens layer 0;
 *   T9  NO EFFECTIVE-HEALTH NUMBER: the Shared page's headline is Max HP
 *       (first) and Defense, the game's own (an ALLOW list), and no file of
 *       this card's names one;
 *   T10 the Shared page's count is the worker's (combatPools' shared), never
 *       worked out; the hub's Shared door opens the Shared page;
 *   T11 a Spend from the Shared page draws on the pool it named (shared);
 *   T12 another player's page (`who`): the preview reads only, no stepper;
 *   T13 the passport's weapon counts are the hub's (combatPools), so the two
 *       screens agree (PR 1's flag);
 *   T14 the numbers' words: nodeText's forms.
 * Each check is a function of what it holds, and each PLANT below is played
 * through it and must turn it red.
 *
 * Run: node tools/guards/metric-tree.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { filesOf } from './lib/filesOf.mjs';
import {
  setProg3Enabled, setProg3XEnabled, setProg3ElemEnabled, setProg3SharedEnabled, setProg3RelEnabled,
  prog3Live, prog3CritPct, prog3CritMult, prog3CritFlat, prog3CatFor, prog3AtkPts,
} from '../../src/data/prog3.js';
import { setOneLevelEnabled } from '../../src/data/oneFormula.js';
import { OPS, SOURCES, dpsTree, dpsPartsFrom, evalNode, treeMismatches, treeNodes, nodeAt, nodeText } from '../../src/game/metricTree.js';
import { TREE_PAGES, treeDepthOf, treeSel, treeSelRead, SHARED_PAGE, COMBAT_DOORS, combatPools } from '../../src/game/combatHub.js';
import { FRAME_PAGES } from '../../src/game/dashDests.js';
import { BRO_HUB_PAGES } from '../../src/game/broHub.js';
import { dashNavInit, dashNavStep, dashNavView } from '../../src/game/dashNav.js';
import { SAY as TSAY } from '../../src/data/say/statTree.js';
import { SAY as HSAY } from '../../src/data/say/combatHub.js';
import { SAY as FSAY } from '../../src/data/say/dashFrame.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* the game's big table of rules, found by its system (tests-by-system: no suite names a big file by its path) */
const GS_FILE = filesOf('data').find((f) => path.basename(f) === 'gameSystems.js');
const {
  calcDisplayDps, calcCombatDmgRange, calcCritChance, calcCritMult, weaponCritStatFor, weaponCritFlatFor,
  CRIT_ANCHOR_MULT, DISPLAY_SCALE_K, setGearQEnabled, swingCooldownMultFor, weaponSwingMult,
} = await import(pathToFileURL(path.isAbsolute(GS_FILE) ? GS_FILE : path.join(ROOT, GS_FILE)).href);
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -- ' + detail : '')); }
}
const safe = (fn) => { try { return !!fn(); } catch (e) { return false; } };

const FILES = {
  tree: 'src/ui/mobile/sheet/StatTree.jsx',
  shared: 'src/ui/mobile/sheet/SharedPage.jsx',
  page: 'src/ui/mobile/sheet/WeaponPage.jsx',
  passport: 'src/ui/mobile/sheet/CharacterPage.jsx',
  rule: 'src/game/metricTree.js',
  tsay: 'src/data/say/statTree.js',
  hsay: 'src/data/say/combatHub.js',
  grid: 'src/ui/mobile/dash/MenuGrid.jsx',
};
const SRC = {};
for (const [k, f] of Object.entries(FILES)) SRC[k] = read(f);

/* ── the workers' settings each fixture is played under (module switches: set, then put back) ── */
const MODES = {
  live: () => { setGearQEnabled(true); setProg3Enabled(true); setProg3XEnabled(true); setProg3ElemEnabled(true); setProg3SharedEnabled(true); setProg3RelEnabled(true); setOneLevelEnabled(true); },
  linear: () => { setGearQEnabled(false); setProg3Enabled(true); setProg3XEnabled(true); setProg3ElemEnabled(true); setProg3SharedEnabled(true); setProg3RelEnabled(false); setOneLevelEnabled(true); },
  oldWorker: () => { setProg3Enabled(true); setProg3XEnabled(false); setProg3ElemEnabled(false); setProg3SharedEnabled(false); setProg3RelEnabled(false); },
  legacy: () => { setProg3Enabled(false); setProg3XEnabled(false); setProg3SharedEnabled(false); setProg3RelEnabled(false); },
};
const SWORD = { type: 'sword', name: 'Iron Sword', tierMult: 1.37, quality: 'elite', hardness: 2 };
const BOW = { type: 'bow', name: 'Ash Bow', tierMult: 1.2 };
const STAFF = { type: 'staff', name: 'Oak Staff' };
const p3 = (atk, lv) => ({ v: 3, sk: { sword: { level: lv || 6 }, bow: { level: 3 }, staff: { level: 1 } }, pool: 0, poolBy: {}, shared: 0, alloc: {}, atk });
/* [name, mode, rpg]: a fresh character, a built one, an old worker's crit flat, a legacy flat */
const FIXTURES = [
  ['fresh', 'live', { prog3: p3({ sword: {}, bow: {}, staff: {} }, 1), weapon: { type: 'sword', name: 'Wooden Sword' } }],
  ['built', 'live', { prog3: p3({ sword: { dmg: 12, luck: 9, aspd: 6 }, bow: { luck: 4 }, staff: { dmg: 3 } }, 24), weapon: SWORD, rangedWeapon: BOW, staffWeapon: STAFF }],
  ['linear', 'linear', { prog3: p3({ sword: { dmg: 5, luck: 30, aspd: 10 }, bow: {}, staff: {} }, 12), weapon: SWORD, rangedWeapon: BOW, staffWeapon: STAFF }],
  ['oldWorker', 'oldWorker', { prog3: p3({ sword: { critDmg: 3, crit: 5 }, bow: {}, staff: {} }, 8), weapon: SWORD, staffWeapon: STAFF }],
  ['legacy', 'legacy', { power: 10, weaponSpecs: { sword: { edge: 50 } }, t2Flat: { sword: { edge: 777 } }, weapon: { type: 'sword', tierMult: 1 } }],
];
const WEAPONS_OF = (R) => [R.weapon, R.rangedWeapon, R.staffWeapon].filter(Boolean);

/* calcDisplayDps as it stood before v2.3.6686 (v2.3.2520's lines): today's callers must get this number */
function OLD_DPS(rpg, wpn) {
  var r = calcCombatDmgRange(rpg, wpn);
  if (!r) return 0;
  var critChance = prog3Live(rpg) ? prog3CritPct(rpg, prog3CatFor(wpn.type)) : calcCritChance((rpg && rpg.power) || 0, weaponCritStatFor(rpg, wpn.type));
  var critMult = prog3Live(rpg) ? prog3CritMult(rpg, prog3CatFor(wpn.type)) : calcCritMult((rpg && rpg.power) || 0);
  var critFlat = prog3Live(rpg) ? prog3CritFlat(rpg, prog3CatFor(wpn.type)) : weaponCritFlatFor(rpg, wpn.type);
  var avg = (r.min + r.max) / 2;
  var critHit = Math.max(avg * critMult, r.max * CRIT_ANCHOR_MULT) + critFlat;
  return ((avg + critChance * (critHit - avg)) / (r.cdMs / 1000)) / DISPLAY_SCALE_K;
}
const catOf = (w) => (w.type === 'bow' ? 'bow' : w.type === 'staff' ? 'staff' : 'sword');
const infoOf = (R, w) => ({ cat: catOf(w), slot: null, level: 0, pts: { dmg: prog3AtkPts(R, catOf(w), 'dmg'), luck: prog3AtkPts(R, catOf(w), 'luck'), aspd: prog3AtkPts(R, catOf(w), 'aspd') } });

/* every fixture's trees, built through X (so a plant reaches every check) */
function trees(X) {
  const out = [];
  for (const [name, mode, R] of FIXTURES) {
    MODES[mode]();
    for (const w of WEAPONS_OF(R)) {
      const parts = X.parts(R, w);
      out.push({ name: name + ':' + w.type, mode, R, w, parts, tree: X.tree(parts, infoOf(R, w)), game: X.game(R, w), old: OLD_DPS(R, w),
        speed: swingCooldownMultFor(R, w.type), pace: weaponSwingMult(w.type) });
    }
  }
  MODES.live();
  return out;
}

const EXPECT_OP = Object.freeze({
  dps: 'quotient', perSwing: 'sum', avg: 'mean', least: 'roundHit', most: 'roundHit', hitBase: 'hitBase',
  critAdd: 'critAdd', critHit: 'critHit', secs: 'swing',
});
const LEAF_IDS = Object.freeze(['scale', 'weaponBase', 'levelDmg', 'power', 'tier', 'grade', 'spreadLow', 'spreadHigh', 'flat',
  'critChance', 'critMult', 'anchor', 'critFlat', 'swingBase', 'speed', 'pace', 'cast']);
const ITEM_LEAVES = Object.freeze(['weaponBase', 'tier', 'grade']);
const POINT_STATS = Object.freeze({ power: 'dmg', critChance: 'luck', critMult: 'luck', speed: 'aspd', flat: 'flat', critFlat: 'critDmg' });

/* the parts as the page reads them (StatTree.jsx weaponDpsTree) */
const PARTS = (r, w) => { const out = {}; return dpsPartsFrom(out, calcDisplayDps(r, w, out)); };
const REAL = {
  parts: PARTS, game: calcDisplayDps, tree: dpsTree, mismatches: treeMismatches, evalNode, OPS, nodeText,
  pages: TREE_PAGES, frame: FRAME_PAGES, bro: BRO_HUB_PAGES, doors: COMBAT_DOORS, SRC,
};

const CHECKS = {
  T1: (X) => {
    const all = trees(X);
    return all.length >= 9 && all.every((t) => t.tree && t.tree.value === t.game && t.game === t.old
      && X.mismatches(t.tree).length === 0 && X.evalNode(t.tree) === t.game
      && X.nodeText(t.tree) === (Number(t.game) || 0).toFixed(1));
  },
  T1b: (X) => {
    const t = trees(REAL)[1].tree;
    const bent = { ...t, kids: [t.kids[0], { ...t.kids[1], value: t.kids[1].value * 1.0001 }, t.kids[2]] };
    return X.mismatches(bent).some((m) => m.id === 'dps') && X.mismatches(t).length === 0
      && Number.isNaN(X.evalNode({ id: 'x', value: 1, op: 'nope', kids: [t.kids[2]] }))
      && nodeAt(t, ['scale', 'x']) === null && nodeAt(t, ['nope']) === null && nodeAt(t, []) === t;
  },
  T2: (X) => X.parts({}, null) === null && X.game({}, null) === 0 && X.tree(X.parts({}, null), {}) === null
    && X.parts({ weapon: { type: 'nope' } }, { type: 'nope' }) === null,
  T3: (X) => {
    const all = trees(X);
    const by = (n) => all.find((t) => t.name === n);
    const kidsOf = (t, p) => (nodeAt(t.tree, p) || {}).kids || [];
    const lg = by('legacy:sword'), ow = by('oldWorker:sword'), st = by('built:staff'), sw = by('built:sword');
    return kidsOf(lg, ['perSwing', 'avg', 'least']).some((k) => k.id === 'flat') && lg.parts.range.parts.flat === 777
      && kidsOf(ow, ['perSwing', 'critAdd', 'critHit']).some((k) => k.id === 'critFlat') && ow.parts.critFlat === 6
      && kidsOf(st, ['secs']).some((k) => k.id === 'cast')
      && !kidsOf(sw, ['secs']).some((k) => k.id === 'cast') && !kidsOf(sw, ['perSwing', 'avg', 'least']).some((k) => k.id === 'flat')
      && [lg, ow, st].every((t) => X.mismatches(t.tree).length === 0 && t.tree.value === t.game);
  },
  T4: (X) => trees(X).every((t) => treeNodes(t.tree).every(({ node }) => (node.kids
    ? EXPECT_OP[node.id] === node.op && Object.prototype.hasOwnProperty.call(X.OPS, node.op)
    : !node.op && LEAF_IDS.includes(node.id)))),
  T5: (X) => {
    const ids = new Set();
    for (const t of trees(X)) for (const { node } of treeNodes(t.tree)) ids.add(node.id);
    const allowed = new Set([...Object.keys(EXPECT_OP), ...LEAF_IDS]);
    if (![...ids].every((i) => allowed.has(i) && !/elem/i.test(i))) return false;
    if (/elem/i.test(Object.values(TSAY).map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' '))) return false;
    /* the page's words: one for every node, a "how" for every layer, each a key of the table */
    for (const i of allowed) {
      if (!new RegExp('\\b' + i + ": \\(\\) => say\\(SAY, 'statTree\\." + i + "'\\)").test(X.SRC.tree)) return false;
      if (!Object.prototype.hasOwnProperty.call(TSAY, 'statTree.' + i)) return false;
    }
    for (const i of Object.keys(EXPECT_OP)) if (!new RegExp('\\n  ' + i + ': \\(n?\\) =>').test(X.SRC.tree)) return false;
    return true;
  },
  T6: (X) => trees(X).every((t) => treeNodes(t.tree).every(({ node }) => {
    if (node.kids) return !node.source;
    const s = node.source;
    if (!s || !SOURCES.includes(s.kind)) return false;
    if (ITEM_LEAVES.includes(node.id) !== (s.kind === 'item')) return false;
    if (node.id === 'levelDmg') return s.kind === 'level';
    /* the swing's two factors are each its own reader's (a swap multiplies out nearly the same) */
    if (node.id === 'speed' && node.value !== t.speed) return false;
    if (node.id === 'pace') return s.kind === 'base' && node.value === t.pace;
    if (Object.prototype.hasOwnProperty.call(POINT_STATS, node.id)) {
      if (s.kind !== 'points' || s.stat !== POINT_STATS[node.id]) return false;
      const want = s.stat === 'flat' || s.stat === 'critDmg' ? null : prog3AtkPts(t.R, catOf(t.w), s.stat);
      return want == null || s.n === want;
    }
    return s.kind === 'base' || s.kind === 'item';
  })),
  T7: (X) => {
    let deepest = 0;
    for (const t of trees(REAL)) for (const { path: p, node } of treeNodes(t.tree)) if (node.kids) deepest = Math.max(deepest, p.length);
    return new Set(X.pages).size === X.pages.length && deepest <= X.pages.length - 1 && deepest === 6
      && X.pages.every((id, i) => X.frame[id] === 'dashFrame.dps' && X.bro[id] === 'tree' && treeDepthOf(id) === i)
      && FSAY['dashFrame.dps'] === 'DPS' && X.frame[SHARED_PAGE] === 'dashFrame.sharedAttributes' && X.bro[SHARED_PAGE] === 'shared'
      && ['dashFrame.dps', 'dashFrame.sharedAttributes'].every((k) => X.SRC.grid.includes(`case '${k}': return say(SAY, '${k}');`));
  },
  T8: (X) => {
    /* the journey: the hub, the Sword page, then every layer down to the deepest, then Back */
    let s = dashNavStep(dashNavInit(true), { type: 'menu' });
    for (const id of ['broCombat', 'broSword']) s = dashNavStep(s, { type: 'push', id });
    const path = ['perSwing', 'critAdd', 'critHit', 'avg', 'least', 'hitBase'];
    for (let d = 0; d < X.pages.length; d++) s = dashNavStep(s, { type: 'push', id: X.pages[d], sel: treeSel('sword', path.slice(0, d)) });
    const seen = [];
    for (let i = 0; i < X.pages.length + 1; i++) {
      const v = dashNavView(s); seen.push(v.top.id + '@' + JSON.stringify(treeSelRead(v.top.sel)));
      s = dashNavStep(s, { type: 'back' });
    }
    const want = [];
    for (let d = X.pages.length - 1; d >= 0; d--) want.push(X.pages[d] + '@' + JSON.stringify({ cat: 'sword', path: path.slice(0, d) }));
    want.push('broSword@null');
    if (seen.join(',') !== want.join(',')) return false;
    if (treeSelRead('nope|perSwing') !== null || treeSelRead('sword') !== null || treeSelRead(null) !== null
      || JSON.stringify(treeSelRead('bow|')) !== '{"cat":"bow","path":[]}') return false;
    /* the page pushes the NEXT layer and never replaces one; the weapon page's DPS opens layer 0 */
    return /const id = TREE_PAGES\[depth \+ 1\];/.test(X.SRC.tree)
      && /dashboardPanelBus\.go\(\{ type: 'push', id, sel: treeSel\(cat, path\.concat\(k\.id\)\) \}\)/.test(X.SRC.tree)
      && !/replace/.test(X.SRC.tree.split('const open = (k)')[1].split('};')[0])
      && /dashboardPanelBus\.go\(\{ type: 'push', id: TREE_PAGES\[0\], sel: treeSel\(cat, \[\]\)/.test(X.SRC.page);
  },
  T9: (X) => {
    /* the headline: Max HP first, Defense beside it, nothing else (an ALLOW list) */
    const ok = /export function sharedHeadline\(R\) \{[\s\S]*?return \{ hp, def \};\n\}/.test(X.SRC.shared)
      && /<div className="u2-wp-row is-sum">\{hp\}\{def\}<\/div>/.test(X.SRC.shared)
      && /\{short \? \([\s\S]*?\{hp\}\{def\}/.test(X.SRC.shared)
      && /hp = String\(toDisplayHp\(Number\(r\.maxHp\) \|\| 100\)\)/.test(X.SRC.shared)
      && /\.rows\.find\(\(x\) => x\.key === 'def'\)\.value/.test(X.SRC.shared)
      && HSAY['combatHub.maxHp'] === 'Max HP';
    if (!ok) return false;
    /* no effective-health number: no name, word or key in this card's files */
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    return Object.keys(X.SRC).every((k) => !/\behp\b|effective[\s_-]*health|effectiveHp|\bEHP\b/i.test(strip(X.SRC[k])));
  },
  T10: (X) => /const pools = combatPools\(R, chanOf\(S\)\);/.test(X.SRC.shared) && /const avail = self \? pools\.shared : null;/.test(X.SRC.shared)
    && /sharedAvail: pools\.shared,/.test(X.SRC.shared) && /pointsWords\(avail\)/.test(X.SRC.shared)
    && !/POINTS_PER_LEVEL|prog3Shared|prog3Pool|\bpoolBy\b/.test(X.SRC.shared)
    && X.doors.find((d) => d.id === 'shared').opens === 'page:' + SHARED_PAGE,
  T11: (X) => /const lane = spendPool\(key, null\);[^\n]*\n\s*if \(lane !== 'shared'\) return;\n\s*win\.openStatInfo\(st, lane, self \? win\.spendFor\(st, lane\) : null\);/.test(X.SRC.shared)
    && /const st = \{ \.\.\.m \};/.test(X.SRC.shared) && /for \(const m of prog3BodyMeta\(\)\) metaOf\[m\.key\] = m;/.test(X.SRC.shared),
  T12: (X) => /readOnly: !self,/.test(X.SRC.shared) && /const self = who == null;/.test(X.SRC.shared)
    && /stayCheckRef\.current = self \? win\.stayCheck : null;/.test(X.SRC.shared) && /const avail = self \?/.test(X.SRC.shared),
  T13: (X) => /const pools = combatPools\(R, !!\(S && S\._serverCaps && S\._serverCaps\.prog3Chan\)\);/.test(X.SRC.passport)
    && /unspent: Number\(pools\[BRO_WEAPONS\[i\]\.cat\]\) \|\| 0/.test(X.SRC.passport) && !/unspent: k\.unspent/.test(X.SRC.passport),
  T14: (X) => {
    const n = (value, fmt) => X.nodeText({ value, fmt });
    return n(16.4919, 'dps') === '16.5' && n(0.19, 'pct') === '19%' && n(0.0125, 'pct') === '1.3%' && n(1.3636, 'x') === '×1.364'
      && n(2, 'x') === '×2' && n(0.4566, 's') === '0.457 s' && n(600, 'ms') === '600 ms' && n(27.4, 'int') === '27'
      && n(36.3125, 'dmg') === '36.31' && n(36, 'dmg') === '36' && n(NaN, 'dmg') === '—';
  },
};

for (const [id, fn] of Object.entries(CHECKS)) check(id + ' holds', safe(() => fn(REAL)));

/* ── THE DODGES, each planted and seen red ── */
const OPS_BENT = (k, f) => ({ ...OPS, [k]: f });
const treeWith = (patch) => (p, info) => { const t = dpsTree(p, info); return t ? patch(t) : t; };
const PLANTS = [
  /* the root differs from the game by the least amount */
  ['T1', { ...REAL, tree: treeWith((t) => ({ ...t, value: t.value * (1 + 1e-15) || 1e-300 })) }],
  /* calcDisplayDps hands back a number no caller had before (the scale left out) */
  ['T1', { ...REAL, game: (r, w) => { const p = PARTS(r, w); return p ? p.perSwing / p.secs : 0; } }],
  /* a branch ADDED where the game multiplies (the hit base's Power) */
  ['T1', { ...REAL, OPS: OPS_BENT('hitBase', (v) => v[0] + v[1] + v[2] + v[3] + v[4]), mismatches: (t) => {
    const out = []; for (const { node } of treeNodes(t)) if (node.kids && node.id === 'hitBase' && (node.kids.reduce((a, k) => a + k.value, 0) !== node.value)) out.push(node.id); return out; } }],
  /* the joins re-ordered (DPS = damage / (seconds x scale): a different number) */
  ['T1', { ...REAL, evalNode: (n) => n.kids[0].value / (n.kids[1].value * n.kids[2].value) }],
  /* the walker that sees nothing */
  ['T1b', { ...REAL, mismatches: () => [] }],
  /* no weapon reads a tree */
  ['T2', { ...REAL, parts: (r, w) => PARTS(r, w) || { dps: 0 } }],
  /* the optional rows dropped: an old worker's flat crit part folded away */
  ['T3', { ...REAL, tree: treeWith((t) => t) , parts: (r, w) => { const p = PARTS(r, w); return p ? { ...p, critFlat: 0 } : p; } }],
  /* a branch that is added where the game multiplies, named so */
  ['T4', { ...REAL, tree: treeWith((t) => ({ ...t, kids: t.kids.map((k) => (k.id === 'perSwing' ? { ...k, op: 'quotient' } : k)) })) }],
  /* Element shown as a part of DPS */
  ['T5', { ...REAL, tree: treeWith((t) => ({ ...t, kids: [...t.kids, { id: 'elem', value: 0, fmt: 'dmg', source: { kind: 'points', stat: 'elem', n: 0 } }] })) }],
  /* a node with no word on the page */
  ['T5', { ...REAL, SRC: { ...SRC, tree: SRC.tree.replace("  anchor: () => say(SAY, 'statTree.anchor'),\n", '') } }],
  /* a leaf that names the wrong points */
  ['T6', { ...REAL, tree: treeWith((t) => {
    const bend = (n) => (n.id === 'power' ? { ...n, source: { ...n.source, n: n.source.n + 1 } } : n.kids ? { ...n, kids: n.kids.map(bend) } : n);
    return bend(t);
  }) }],
  /* an item leaf that does not open the item */
  ['T6', { ...REAL, tree: treeWith((t) => {
    const bend = (n) => (n.id === 'tier' ? { ...n, source: { kind: 'base' } } : n.kids ? { ...n, kids: n.kids.map(bend) } : n);
    return bend(t);
  }) }],
  /* a layer with no page of its own */
  ['T7', { ...REAL, pages: TREE_PAGES.slice(0, 6) }],
  ['T7', { ...REAL, frame: { ...FRAME_PAGES, broTree3: 'dashFrame.sword' } }],
  /* the header falling to "Page" (the word with no case in doorWord) */
  ['T7', { ...REAL, SRC: { ...SRC, grid: SRC.grid.replace("    case 'dashFrame.dps': return say(SAY, 'dashFrame.dps');", '') } }],
  /* a layer that replaces the one under it, so Back skips layers */
  ['T8', { ...REAL, SRC: { ...SRC, tree: SRC.tree.replace("dashboardPanelBus.go({ type: 'push', id, sel: treeSel(cat, path.concat(k.id)) })", "dashboardPanelBus.go({ type: 'push', id, replace: true, sel: treeSel(cat, path.concat(k.id)) })") } }],
  ['T8', { ...REAL, pages: ['broTree0', 'broTree0', 'broTree2', 'broTree3', 'broTree4', 'broTree5', 'broTree6'] }],
  /* the weapon page's DPS opening the explainer again */
  ['T8', { ...REAL, SRC: { ...SRC, page: SRC.page.replace("id: TREE_PAGES[0], sel: treeSel(cat, [])", "id: 'hero'") } }],
  /* an effective-health number on the Shared page */
  ['T9', { ...REAL, SRC: { ...SRC, shared: SRC.shared.replace('return { hp, def };', 'const ehp = hp; return { hp, def, ehp };') } }],
  ['T9', { ...REAL, SRC: { ...SRC, hsay: SRC.hsay.replace("'combatHub.maxHp': 'Max HP',", "'combatHub.maxHp': 'Max HP',\n  'combatHub.ehp': 'Effective health',") } }],
  /* Defense leading, Max HP after it */
  ['T9', { ...REAL, SRC: { ...SRC, shared: SRC.shared.replace('<div className="u2-wp-row is-sum">{hp}{def}</div>', '<div className="u2-wp-row is-sum">{def}{hp}</div>') } }],
  /* the shared count worked out on the page (3 a weapon level) */
  ['T10', { ...REAL, SRC: { ...SRC, shared: SRC.shared.replace('const avail = self ? pools.shared : null;', 'const avail = self ? (R.prog3 && R.prog3.sk ? 3 * 3 : 0) : null;') } }],
  /* the hub's Shared door opening the Points window again */
  ['T10', { ...REAL, doors: COMBAT_DOORS.map((d) => (d.id === 'shared' ? { ...d, opens: 'points:shared' } : d)) }],
  /* a Spend from the Shared page drawing on a weapon's pool */
  ['T11', { ...REAL, SRC: { ...SRC, shared: SRC.shared.replace("win.openStatInfo(st, lane, self ? win.spendFor(st, lane) : null);", "win.openStatInfo(st, lane, self ? win.spendFor({ ...st, atk: true }, 'sword') : null);") } }],
  /* the preview with a stepper on another player's page */
  ['T12', { ...REAL, SRC: { ...SRC, shared: SRC.shared.replace('readOnly: !self,', 'readOnly: false,') } }],
  /* the passport's counts back on one lane */
  ['T13', { ...REAL, SRC: { ...SRC, passport: SRC.passport.replace('unspent: Number(pools[BRO_WEAPONS[i].cat]) || 0', 'unspent: k.unspent') } }],
  /* a number in a form the page does not use */
  ['T14', { ...REAL, nodeText: (n) => String(n.value) }],
];
for (const [id, planted] of PLANTS) check('plant ' + id + ' turns its check red', !safe(() => CHECKS[id](planted)));
for (const [id, planted] of PLANTS) {
  if (planted.SRC === SRC) continue;
  check('plant ' + id + ' changed its file', Object.keys(SRC).some((k) => planted.SRC[k] !== SRC[k]));
}

if (failed) { console.log(`metric-tree: ${failed} FAILED`); process.exit(1); }
console.log('metric-tree: all held');
