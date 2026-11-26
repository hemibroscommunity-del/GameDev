/* ═══ v2.3.6685: COMBAT'S HUB AND A WEAPON'S PAGE HOLD (card UI2-combat, the build's step 4, PR 1) ═══
 *
 * src/game/combatHub.js is Combat's four doors (Sword, Bow, Staff, Shared
 * Attributes), the counts a Spend can draw on as the worker holds them, the
 * words of a count, the combat level, and the pool a Spend from a page draws
 * on; sheet/WeaponPage.jsx and sheet/CombatHub.jsx draw them, and the
 * preview they open is sheet/statWindow.jsx (moved whole from the Points
 * window, HeroExpanded.jsx).  Here, not in server/test (a file there deploys
 * the worker).
 *
 * THE DODGES (the card's, the ways a tired programmer writes them).  Part 1
 * plays each check against the real rules and the real files; part 2 plays
 * it against a PLANT that writes the dodge: each plant must turn its own
 * check red, every run (a plant that stays green fails the suite).
 *   C1 the shared count shown as 3 a weapon level (or 3 a character level),
 *      worked out instead of read from the pools
 *   C2 one lane's points shown under another
 *   C3 a Spend drawing on a pool other than the one the page named
 *   C4 the combat level as a sum
 *   C5 another player's counts shown on their page
 *   C6 Element shown as a part of DPS (among DPS's supporting stats)
 *   C7 an effective-health number anywhere in this card's files
 *   C8 the preview reachable with a stepper (Spend) on another player's page
 *   C9 a page working out a count itself (reading the pools' fields, or a
 *      points-per-level number) instead of through combatHub.js
 *   C10 the Points window and the pages reading the pools by two rules
 *   C11 two vocabularies (Melee or Magic on the new screens)
 *   C12 a weapon's page missing from the frame (no header, no Back to the hub)
 * The reads of a file are off its syntax tree (@babel/parser), an ALLOW list:
 * what may appear, never a pattern that must not.
 *
 * Run: node tools/guards/combat-hub.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  COMBAT_DOORS, COMBAT_PAGES, combatHubDoors, combatPools, combatLevel, pointsWords, spendPool, weaponAttributes, weaponOfPage,
} from '../../src/game/combatHub.js';
import {
  PROG3, prog3PoolFor, prog3PoolShared, setProg3XEnabled, setProg3ElemEnabled, setProg3SharedEnabled,
} from '../../src/data/prog3.js';
import { setOneLevelEnabled } from '../../src/data/oneFormula.js';
import { FRAME_PAGES } from '../../src/game/dashDests.js';
import { BRO_HUB_PAGES, isBroHubPage } from '../../src/game/broHub.js';
import { SAY } from '../../src/data/say/combatHub.js';
import { SAY as FSAY } from '../../src/data/say/dashFrame.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -- ' + detail : '')); }
}
const safe = (fn) => { try { return !!fn(); } catch (e) { return false; } };

/* the game as the live worker runs it (its caps: the six a weapon, the shared pool, one level) */
setProg3XEnabled(true); setProg3ElemEnabled(true); setProg3SharedEnabled(true); setOneLevelEnabled(true);

/* a seeded character: the free remainder is 3 (pool 9 less the channels' 6); the pools read
   sword 7, bow 5, staff 3, shared 8.  "3 shared a weapon level" would be 21, "3 a character
   level" 15; the combat level is 6 (the sum would be 10). */
const R = { prog3: {
  sk: { sword: { level: 6, xp: 120 }, bow: { level: 3, xp: 10 }, staff: { level: 1, xp: 0 } },
  pool: 9, poolBy: { sword: 4, bow: 2, staff: 0 }, shared: 5, alloc: { hp: 2 }, atk: { sword: { dmg: 2 }, bow: { luck: 1 }, staff: {} },
} };

/* ── the syntax tree ── */
let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr, gen: req('@babel/generator') }; break; } catch (e) { /* the next */ }
}
check('0. @babel/parser, traverse and generator load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const gen = (n) => (B.gen.default || B.gen)(n, { comments: false }).code.replace(/\s+/g, ' ');
function walk(src, visit) { B.traverse(parse(src), visit); }
/* every string a player could read: literals, template parts, JSX text (comments are not shown) */
function strings(src) {
  const out = [];
  walk(src, {
    StringLiteral(p) { out.push(p.node.value); },
    TemplateElement(p) { out.push(p.node.value.cooked || ''); },
    JSXText(p) { out.push(p.node.value); },
  });
  return out;
}
/* the names a file imports, by module */
function imports(src) {
  const out = [];
  walk(src, { ImportDeclaration(p) { for (const s of p.node.specifiers) out.push([p.node.source.value, s.local.name]); } });
  return out;
}
/* every identifier and member name a file uses */
function names(src) {
  const out = new Set();
  walk(src, { Identifier(p) { out.add(p.node.name); } });
  return out;
}

const FILES = {
  hub: 'src/ui/mobile/sheet/CombatHub.jsx',
  page: 'src/ui/mobile/sheet/WeaponPage.jsx',
  win: 'src/ui/mobile/sheet/statWindow.jsx',
  rule: 'src/game/combatHub.js',
  prog: 'src/game/progression.js',
  say: 'src/data/say/combatHub.js',
  popup: 'src/ui/mobile/InfoPopup.jsx',
  hero: 'src/ui/mobile/sheet/HeroExpanded.jsx',
};
const SRC = {};
for (const [k, f] of Object.entries(FILES)) SRC[k] = read(f);

const REAL = { combatHubDoors, combatPools, combatLevel, pointsWords, spendPool, SRC, SUPPORT: null };

/* the page's supporting stats, off its tree: the array WEAPON_SUPPORT is declared with */
function supportOf(src) {
  let arr = null;
  walk(src, { VariableDeclarator(p) { if (p.node.id.name === 'WEAPON_SUPPORT') { const a = p.node.init && p.node.init.arguments ? p.node.init.arguments[0] : p.node.init; arr = a && a.elements ? a.elements.map((e) => e.value) : null; } } });
  return arr;
}

/* ── the checks: each a function of what it holds, so a plant is played through the same lines ── */
const CHECKS = {
  C1: (X) => {
    const sh = X.combatHubDoors(R, true, null).find((d) => d.id === 'shared');
    return sh.points === prog3PoolShared(R) && sh.points === 8 && X.combatPools(R, true).shared === 8;
  },
  C2: (X) => {
    const d = X.combatHubDoors(R, true, null);
    const by = Object.create(null);
    for (const x of d) by[x.id] = x.points;
    return by.sword === prog3PoolFor(R, 'sword') && by.bow === prog3PoolFor(R, 'bow') && by.staff === prog3PoolFor(R, 'staff')
      && by.sword === 7 && by.bow === 5 && by.staff === 3 && X.combatPools(R, true).free === 3
      /* against a worker with no channels every lane reads the whole total, as the Points window always has */
      && X.combatPools(R, false).sword === 14 && X.combatPools(R, false).bow === 14;
  },
  C3: (X) => X.spendPool('dmg', 'bow') === 'bow' && X.spendPool('luck', 'staff') === 'staff' && X.spendPool('elem', 'sword') === 'sword'
    && X.spendPool('hp', 'bow') === 'shared' && X.spendPool('move', null) === 'shared'
    && X.spendPool('dmg', null) === null && X.spendPool('dmg', 'shared') === null && X.spendPool('nope', 'bow') === null
    && X.spendPool('dmg', '__proto__') === null,
  /* ...and the page asks it: every open of the preview names `lane`, and `lane` is spendPool's word */
  C3b: (X) => {
    let lane = null; const calls = [];
    walk(X.SRC.page, {
      VariableDeclarator(p) { if (p.node.id.name === 'lane') lane = gen(p.node.init); },
      CallExpression(p) {
        const c = p.node.callee;
        if (c.type === 'MemberExpression' && c.object.name === 'win' && ['openStatInfo', 'spendFor'].includes(c.property.name)) calls.push(gen(p.node));
      },
    });
    return lane === 'spendPool(key, cat)' && calls.length >= 2
      && calls.every((c) => /^win\.openStatInfo\(st, lane, /.test(c) || c === 'win.spendFor(st, lane)');
  },
  C4: (X) => X.combatLevel(R) === 6,
  C5: (X) => X.combatHubDoors(R, true, { id: 'p_x', name: 'Ann' }).every((d) => d.points === null && d.pointsWords === null && !d.glow),
  C6: (X) => { const s = X.SUPPORT || supportOf(X.SRC.page); return Array.isArray(s) && s.join(',') === 'damage,aspd,crit,range'; },
  C7: (X) => {
    const all = [];
    for (const k of ['hub', 'page', 'win', 'rule', 'prog', 'say']) all.push(...strings(X.SRC[k]));
    for (const v of Object.values(SAY)) all.push(v);
    return all.length > 20 && !all.some((s) => /effective\s*health|\behp\b/i.test(s));
  },
  /* the page hands the window readOnly for another's page, and a Spend only on yours; the window
     drops its action and lanes when readOnly; InfoPopup's stepper, lanes and action each need !ro */
  C8: (X) => {
    let ro = null; let third = null;
    walk(X.SRC.page, {
      CallExpression(p) {
        const c = p.node.callee;
        if (c.type === 'Identifier' && c.name === 'statWindow') {
          const prop = p.node.arguments[0].properties.find((q) => q.key && q.key.name === 'readOnly');
          ro = prop ? gen(prop.value) : null;
        }
        if (c.type === 'MemberExpression' && c.object.name === 'win' && c.property.name === 'openStatInfo') third = gen(p.node.arguments[2]);
      },
    });
    let popRo = null; let step = null;
    walk(X.SRC.popup, {
      VariableDeclarator(p) {
        if (p.node.id.name === 'ro') popRo = gen(p.node.init);
        if (p.node.id.name === 'stepMax') step = gen(p.node.init);
      },
    });
    const popup = gen(parse(X.SRC.popup).program);
    return ro === '!self' && third === 'self ? win.spendFor(st, lane) : null'
      && /if \(readOnly\) \{ payload\.readOnly = true; payload\.action = undefined;/.test(gen(parse(X.SRC.win).program))
      && popRo === '!!cur.readOnly' && /^!ro && cur\.action && !cur\.action\.blocked/.test(step)
      && popup.includes('!ro && cur.lanes && cur.lanes.options') && popup.includes('cur.action && !ro &&')
      && popup.includes('if (ro || !cur.action || cur.action.blocked) return;');
  },
  /* the pages read counts only through combatHub.js: an ALLOW list of what they import from
     the game's data, and no name of a pool's field or a points-per-level number */
  C9: (X) => {
    const ALLOW = {
      hub: new Set(['@/game/combatHub.js:combatHubDoors', '@/game/combatHub.js:combatPools', '@/game/combatHub.js:combatLevel']),
      page: new Set(['@/game/combatHub.js:combatPools', '@/game/combatHub.js:pointsWords', '@/game/combatHub.js:spendPool', '@/game/combatHub.js:weaponAttributes', '../../../data/prog3.js:prog3AtkMeta',
        /* v2.3.6686: DPS opens the stat tree's layer 0 (a page id and its entry's words, no count) */
        '@/game/combatHub.js:TREE_PAGES', '@/game/combatHub.js:treeSel']),
    };
    const FORBID = ['POINTS_PER_LEVEL', 'SHARED_POINTS_PER_LEVEL', 'poolBy', 'shared_', 'prog3Pool', 'prog3PoolBy', 'prog3PoolAny', 'prog3PoolFor', 'prog3PoolShared', 'prog3Shared', 'unspentPointsTotal', 'buildSkillUnspent', 'prog3CharLevel', 'prog3SkillLevel'];
    for (const k of ['hub', 'page']) {
      const game = imports(X.SRC[k]).filter(([m]) => /game\/combatHub|data\/prog3|data\/gameSystems|heroModel/.test(m)).map(([m, n]) => m + ':' + n);
      if (!game.every((g) => ALLOW[k].has(g))) return false;
      const used = names(X.SRC[k]);
      if (FORBID.some((f) => used.has(f))) return false;
    }
    return true;
  },
  /* the Points window's lanes read the same rule (HeroExpanded: pools = combatPools(R, chanCaps)) */
  C10: (X) => {
    const decl = Object.create(null);
    walk(X.SRC.hero, { VariableDeclarator(p) { if (['pools', 'laneAvail', 'sharedAvail'].includes(p.node.id.name)) decl[p.node.id.name] = gen(p.node.init); } });
    return decl.pools === 'combatPools(R, chanCaps)' && decl.laneAvail === 'cat => Number(pools[cat]) || 0' && decl.sharedAvail === 'pools.shared';
  },
  C11: (X) => {
    const words = COMBAT_DOORS.map((d) => SAY[d.word]).join(',');
    const all = Object.values(SAY).join(' ');
    return words === 'Sword,Bow,Staff,Shared Attributes' && !/\bMelee\b|\bMagic\b/.test(all)
      && ['broSword', 'broBow', 'broStaff'].map((p) => FSAY[FRAME_PAGES[p]]).join(',') === 'Sword,Bow,Staff';
  },
  C12: () => ['sword', 'bow', 'staff'].every((c) => {
    const page = COMBAT_PAGES[c];
    return Object.prototype.hasOwnProperty.call(FRAME_PAGES, page) && isBroHubPage(page) && BRO_HUB_PAGES[page] === c && weaponOfPage(page) === c
      && COMBAT_DOORS.find((d) => d.id === c).opens === 'page:' + page;
  }) && weaponOfPage('__proto__') === null && weaponOfPage('broCombat') === null,
};

console.log('combat-hub: part 1, the rules and the files');
for (const [id, fn] of Object.entries(CHECKS)) check(id, safe(() => fn(REAL)));

/* the hub's words: "n points", 0 included; one point is "1 point" (the one rule) */
check('words. a count is "n points", 0 included', SAY[pointsWords(0).key].replace('{n}', pointsWords(0).n) === '0 points'
  && SAY[pointsWords(1).key].replace('{n}', 1) === '1 point' && pointsWords(-3).n === 0 && pointsWords('7').n === 7 && pointsWords(2.9).n === 2);
check('doors. each weapon door carries its level and XP (progression.js); Shared none', (() => {
  const d = combatHubDoors(R, true, null);
  return d.map((x) => x.id).join(',') === 'sword,bow,staff,shared' && d[0].progress.level === 6 && d[0].progress.xpNow === 120
    && d[3].progress === null && d[0].glow && !combatHubDoors({ prog3: { sk: {}, pool: 0, poolBy: {}, shared: 0 } }, true, null).some((x) => x.glow);
})());
check('attributes. the six a weapon, their points read from that weapon only', (() => {
  const a = weaponAttributes(R, 'sword');
  const b = weaponAttributes(R, 'bow');
  return a.map((x) => x.key).join(',') === 'range,dmg,aspd,luck,special,elem' && a.find((x) => x.key === 'dmg').pts === 2
    && b.find((x) => x.key === 'dmg').pts === 0 && b.find((x) => x.key === 'luck').pts === 1 && a.every((x) => x.cap >= 1);
})());

/* ── part 2: the plants ── */
const sumLv = (r) => ['sword', 'bow', 'staff'].reduce((n, c) => n + (r.prog3.sk[c].level - 1), 0);
const bestLv = (r) => Math.max(...['sword', 'bow', 'staff'].map((c) => r.prog3.sk[c].level));
const withShared = (fn) => (r, ch, who) => combatHubDoors(r, ch, who).map((d) => (d.id === 'shared' ? { ...d, points: fn(r) } : d));
const swap = (r, ch, who) => { const d = combatHubDoors(r, ch, who); return [{ ...d[0], points: d[1].points }, { ...d[1], points: d[0].points }, d[2], d[3]]; };
const PLANTS = [
  ['C1', { ...REAL, combatHubDoors: withShared((r) => PROG3.SHARED_POINTS_PER_LEVEL * sumLv(r)) }],
  ['C1', { ...REAL, combatHubDoors: withShared((r) => PROG3.SHARED_POINTS_PER_LEVEL * (bestLv(r) - 1)) }],
  ['C1', { ...REAL, combatPools: (r, ch) => ({ ...combatPools(r, ch), shared: r.prog3.shared }) }],
  ['C2', { ...REAL, combatHubDoors: swap }],
  ['C2', { ...REAL, combatPools: (r, ch) => ({ ...combatPools(r, ch), sword: r.prog3.poolBy.sword }) }],
  ['C3', { ...REAL, spendPool: (s, c) => (PROG3.ATK[s] ? 'sword' : spendPool(s, c)) }],
  ['C3', { ...REAL, spendPool: (s, c) => (PROG3.BODY[s] ? c : spendPool(s, c)) }],
  ['C3b', { ...REAL, SRC: { ...SRC, page: SRC.page.replace('win.openStatInfo(st, lane, self ? win.spendFor(st, lane) : null)', 'win.openStatInfo(st, cat, self ? win.spendFor(st, cat) : null)') } }],
  ['C3b', { ...REAL, SRC: { ...SRC, page: SRC.page.replace('const lane = spendPool(key, cat);', "const lane = 'shared';") } }],
  ['C4', { ...REAL, combatLevel: (r) => ['sword', 'bow', 'staff'].reduce((n, c) => n + r.prog3.sk[c].level, 0) }],
  ['C5', { ...REAL, combatHubDoors: (r, ch) => combatHubDoors(r, ch, null) }],
  ['C6', { ...REAL, SUPPORT: ['damage', 'aspd', 'crit', 'range', 'elem'] }],
  ['C6', { ...REAL, SRC: { ...SRC, page: SRC.page.replace("['damage', 'aspd', 'crit', 'range']", "['damage', 'elem', 'crit', 'range']") } }],
  ['C7', { ...REAL, SRC: { ...SRC, page: SRC.page.replace("const ww = ", "const ehp = 'Effective health ' + 1;\n  const ww = ") } }],
  ['C7', { ...REAL, SRC: { ...SRC, hub: SRC.hub.replace('<span className="u2-cb-name">{w}</span>', '<span className="u2-cb-name">{w} EHP</span>') } }],
  ['C8', { ...REAL, SRC: { ...SRC, page: SRC.page.replace('readOnly: !self,', 'readOnly: false,') } }],
  ['C8', { ...REAL, SRC: { ...SRC, page: SRC.page.replace('win.openStatInfo(st, lane, self ? win.spendFor(st, lane) : null)', 'win.openStatInfo(st, lane, win.spendFor(st, lane))') } }],
  ['C8', { ...REAL, SRC: { ...SRC, popup: SRC.popup.replace('const stepMax = (!ro && cur.action', 'const stepMax = (cur.action') } }],
  ['C8', { ...REAL, SRC: { ...SRC, win: SRC.win.replace('payload.readOnly = true; payload.action = undefined;', 'payload.readOnly = true;') } }],
  ['C9', { ...REAL, SRC: { ...SRC, hub: SRC.hub.replace("import { ui2RootClass }", "import { PROG3 } from '../../../data/prog3.js';\nimport { ui2RootClass }") } }],
  ['C9', { ...REAL, SRC: { ...SRC, page: SRC.page.replace('const avail = self ? pools[cat] : null;', 'const avail = self ? R.prog3.poolBy[cat] : null;') } }],
  ['C10', { ...REAL, SRC: { ...SRC, hero: SRC.hero.replace('const sharedAvail = pools.shared;', 'const sharedAvail = sharedCaps ? prog3PoolShared(R) : totalUnspent;') } }],
];
console.log('combat-hub: part 2, each plant seen red');
for (const [id, planted] of PLANTS) check('plant ' + id + ' turns its check red', !safe(() => CHECKS[id](planted)));
/* a plant whose text did not land would stay green for the wrong reason: each must change its file */
for (const [id, planted] of PLANTS) {
  if (planted.SRC === SRC) continue;
  const changed = Object.keys(SRC).some((k) => planted.SRC[k] !== SRC[k]);
  check('plant ' + id + ' changed its file', changed);
}

if (failed) { console.log(`combat-hub: ${failed} FAILED`); process.exit(1); }
console.log('combat-hub: all held');
