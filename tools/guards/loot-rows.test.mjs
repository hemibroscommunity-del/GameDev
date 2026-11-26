/* ═══ v2.3.6693: A MONSTER'S LOOT AS PLAIN ROWS, ONE TRUE CHANCE EACH (card UI2-codex) ═══
 *
 * src/game/lootRows.js makes a monster's Loot rows FROM the one drop table
 * (src/data/codexDrops.js codexDropsFor, held to the worker by mirror-audit).
 * The owner (the master specification, Q75): "No dice-roll numbers,
 * probability progress bars"; "Do not ... round very small positive
 * probabilities to zero, or imply mutually exclusive drops unless the engine
 * works that way."  The checks, on the real files, every kind, the worker's
 * one roll on and off, shards cracked or not:
 *   L1  a row for each of the table's drops, in its order, nothing added;
 *   L2  ONE chance a row: the table's percent, or "Every kill";
 *   L3  never "0%" for a chance above nothing (the gold nugget's 0.01%);
 *   L4  no roll range, no dice, no bar: a row carries only its fields;
 *   L5  no rate written in lootRows.js: a row follows the table it is given,
 *       and the file's numbers are 0 and 1 only;
 *   L6  "common" is a weapon's base tier, never a grade: a graded piece says
 *       "rolls a grade"; the grades are the game's four words;
 *   L7  no raw gem row where shards are cracked (caps.shardcrack), and the
 *       page asks the worker's caps for both (MonsterShowcase.jsx dropOpts:
 *       killroll and shardcrack);
 *   L8  the roll's words are the engine's: "at most one" only under the one
 *       roll;
 *   L9  Found from: every monster that drops an item, with its land and its
 *       chance; one not met is "???";
 *   L10 the same sword from Gear and from the Codex: the Codex's item page
 *       names the iron greatsword by the bag's own reader (weaponDisplayName
 *       of the worker's MONSTER_IRON_WEAPON_DROP type and gearBase) and gives
 *       it the bag's kind word (a greatsword is a Sword);
 *   L11 no action on a Codex item: the one page's place `codex` offers none
 *       and the road hands none over; and no grade (src/game/itemInspect.js:
 *       the entry rolls one as it drops), every other place's unchanged.
 *
 * THE DODGES, each a one-line change planted in memory and seen red:
 *   R1 a 0.01% shown as "0%"       R2 the roll range on a row     R3 two chances on a row
 *   R4 a rate typed into lootRows  R5 "common" shown as a grade   R6 "at most one" when each rolls alone
 *   R7 an unmet monster named in Found from
 *   R8 the page's drops read without shardcrack (a raw gem row under it)
 *   R9 the Codex's sword named by the table, not the bag's reader
 *   R10 a Codex piece that rolls its grade shown with one ("Normal ★")
 *
 * Run: node tools/guards/loot-rows.test.mjs  (L5, L7, L10, L11 read the syntax
 * tree: @babel/parser and @babel/traverse, npm install in the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plantText, importAs } from './lib/plantImport.mjs';
import { loadBabel } from './lib/jsxMount.mjs';
import { CODEX_KINDS, CODEX_ENTRIES } from '../../src/data/monsterCodex.js';
import { codexDropsFor, codexPercent, CODEX_RAW_GEM_ELEMENTS } from '../../src/data/codexDrops.js';
import { inspectItem } from '../../src/game/itemInspect.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REL = 'src/game/lootRows.js';
const SHOW = 'src/ui/mobile/dash/MonsterShowcase.jsx';
const OPEN = 'src/ui/mobile/dash/itemPageOpen.js';
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 800))); }
}
const B = loadBabel(ROOT);
check('0. @babel/parser and @babel/traverse load', !!B);
if (!B) process.exit(1);
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const text = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const FIELDS = ['id', 'key', 'name', 'art', 'type', 'chance', 'every', 'note', 'graded', 'desc'].sort().join();
const chancesIn = (s) => (String(s).match(/\d+(?:\.\d+)?%|Every kill|1 in [\d,]+/g) || []).length;
const OPTS = [{ shared: true, crack: false }, { shared: true, crack: true }, { shared: false, crack: false }, { shared: false, crack: true }];

/* the numbers a file's code writes (comments and strings aside) */
function numbersIn(src) {
  const out = [];
  B.traverse(parse(src), { NumericLiteral(p) { out.push(p.node.value); } });
  return out;
}
/* the arrow `dropOpts` in MonsterShowcase.jsx reads both caps */
function dropOptsReads(src) {
  let body = '';
  B.traverse(parse(src), {
    VariableDeclarator(p) { if (p.node.id.name === 'dropOpts' && p.node.init) body = src.slice(p.node.init.start, p.node.init.end); },
  });
  return { killroll: /killRollLive\(\s*S\s*\)/.test(body), crack: /_serverCaps\s*&&\s*S\._serverCaps\.shardcrack/.test(body), body };
}
/* itemPageOpen.js: the Codex's sword, named as the bag names its own */
function codexSwordRoad(src) {
  const server = text('server/src/data.js');
  const m = server.match(/MONSTER_IRON_WEAPON_DROP = \{[^}]*type: '([a-z]+)', gearBase: '([a-z]+)'/);
  const g = src.match(/iron_greatsword: Object\.freeze\(\{ kind: '([a-z]+)', wpn: Object\.freeze\(\{ type: '([a-z]+)', gearBase: '([a-z]+)' \}\) \}\)/);
  let named = false, bagNamed = false, noActs = false;
  B.traverse(parse(src), {
    FunctionDeclaration(p) {
      const s = src.slice(p.node.start, p.node.end);
      if (p.node.id.name === 'codexItemName') named = /if \(g && g\.wpn\) return weaponDisplayName\(g\.wpn\);/.test(s);
      if (p.node.id.name === 'fromEntry') bagNamed = /weaponDisplayName\(o\)/.test(s) && /KIND_OF_FIELD\[weaponSlotFor\(o\.type\)\]/.test(s);
      if (p.node.id.name === 'fromCodex') noActs = /place: 'codex'/.test(s) && /actions: \[\],/.test(s) && !/itemActionList/.test(s);
    },
  });
  const slotOf = (t) => (t === 'bow' ? 'rangedWeapon' : t === 'staff' ? 'staffWeapon' : 'weapon');
  const kindOf = { weapon: 'sword', rangedWeapon: 'bow', staffWeapon: 'staff' };
  return { server: !!m, same: !!(m && g && g[2] === m[1] && g[3] === m[2]), kind: !!(g && g[1] === kindOf[slotOf(g[2])]), named, bagNamed, noActs };
}

function verdict(M, files) {
  const bad = new Set();
  const no = (id) => bad.add(id);
  for (const o of OPTS) {
    for (const kind of CODEX_KINDS) {
      const drops = codexDropsFor(kind, o) || [];
      let rows;
      try { rows = M.lootRows(drops); } catch (e) { no('L1'); continue; }
      /* L1 */
      if (rows.length !== drops.length || rows.some((r, i) => r.id !== drops[i].id || r.key !== drops[i].key || r.name !== drops[i].name
        || r.art !== (drops[i].icon || null) || r.type !== drops[i].type || r.desc !== (drops[i].desc || '') || r.graded !== !!drops[i].graded)) no('L1');
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i], d = drops[i];
        if (!d) continue;
        /* L2 */
        const want = d.chance >= 1 ? 'Every kill' : codexPercent(d.chance);
        if (r.chance !== want || r.every !== (d.chance >= 1) || chancesIn([r.name, r.type, r.chance, r.note].join(' ')) !== 1) no('L2');
        if (d.amount && r.note !== d.amount + ' gold') no('L2');
        /* L3 */
        if (d.chance > 0 && /^0%$/.test(r.chance)) no('L3');
        /* L4 */
        if (Object.keys(r).sort().join() !== FIELDS || /–/.test(r.chance) || /\d+ out of|\broll\b/.test(r.note)) no('L4');
        /* L6 */
        if (/common/i.test(JSON.stringify(r))) no('L6');
        if (d.graded && !/rolls a grade/.test(r.note)) no('L6');
      }
      /* L7 */
      const e = CODEX_ENTRIES[kind];
      const raw = rows.some((r) => r.id === 'rawgem');
      if (o.crack ? raw : (CODEX_RAW_GEM_ELEMENTS.includes(e.element) !== raw)) no('L7');
    }
  }
  /* L5: a row follows the table it is given */
  try {
    const fake = M.lootRows([{ id: 'x', key: 'k', name: 'N', icon: null, type: 'Gem', chance: 0.025 }, { id: 'shard', key: 's', name: 'S', type: 'Material', chance: 0.37 }]);
    if (fake[0].chance !== '2.5%' || fake[1].chance !== '37%') no('L5');
    /* a drop that cannot fall, or no drop at all, is no row */
    if (M.lootRows([null, { key: 'k', chance: 0.5 }, { id: 'z', key: 'z', name: 'Z', chance: 0 }]).length !== 0) no('L1');
    /* the item page's name when it has one, the table's when it does not */
    const named = M.lootRows([{ id: 'a', key: 'a', name: 'Table', chance: 0.5 }, { id: 'b', key: 'b', name: 'Table', chance: 0.5 }], { nameOf: (d) => (d.id === 'a' ? 'Page' : '') });
    if (named[0].name !== 'Page' || named[1].name !== 'Table') no('L10');
  } catch (e) { no('L5'); }
  if (numbersIn(files[REL]).some((n) => n !== 0 && n !== 1)) no('L5');
  const g = M.lootGrades();
  if (!(g.map((x) => x.word).join() === 'Normal,Rare,Elite,Godly' && g.every((x) => /%$/.test(x.pct) && x.pct !== '0%'))) no('L6');
  /* L7: the page reads both caps */
  const d = dropOptsReads(files[SHOW]);
  if (!d.killroll || !d.crack) no('L7');
  /* L8 */
  if (!(/at most one/.test(M.lootRollWords(true)) && !/at most one|only one|one of/.test(M.lootRollWords(false)) && /own/.test(M.lootRollWords(false)))) no('L8');
  /* L9 */
  try {
    const src = M.lootSources('iron_greatsword', { shared: true, metOf: (k) => k !== 'dewdrop' });
    const un = src.find((s) => s.kind === 'dewdrop');
    if (!(src.length === 9 && src.every((s) => s.land && s.chance === '0.2%') && un && un.name === '???' && !un.met
      && src.filter((s) => s.met).every((s) => s.name === CODEX_ENTRIES[s.kind].name) && M.lootSources('nothing', {}).length === 0
      && M.lootSources('iron_greatsword', {}).every((s) => s.met && s.name === CODEX_ENTRIES[s.kind].name))) no('L9');
  } catch (e) { no('L9'); }
  /* L10, L11 */
  const road = codexSwordRoad(files[OPEN]);
  if (!(road.server && road.same && road.kind && road.named && road.bagNamed)) no('L10');
  if (!road.noActs || inspectItem({ place: 'codex', kind: 'sword', name: 'x', actions: [{ id: 'equip', label: 'Equip', tone: 'primary' }] }).actions.length !== 0) no('L11');
  /* L11: and no grade: a Codex entry rolls one as it drops (the one page's "Normal ★" was false); every other place keeps its grade */
  const cx = inspectItem({ place: 'codex', kind: 'sword', name: 'x', quality: null, rolls: true });
  const bag = inspectItem({ place: 'bag', kind: 'sword', name: 'x', quality: 'rare' });
  if (cx.grade !== null || cx.gradeWord !== '' || cx.stars !== 0 || bag.gradeWord !== 'Rare' || bag.stars !== 2 || inspectItem({ place: 'other', name: 'x', rolls: true }).gradeWord !== 'Normal'
    || inspectItem({ place: 'codex', name: 'x' }).gradeWord !== 'Normal') no('L11');
  if (!/rolls: !!d\.graded/.test(files[OPEN])) no('L11');
  return [...bad];
}

const FILES = Object.freeze({ [REL]: text(REL), [SHOW]: text(SHOW), [OPEN]: text(OPEN) });
const real = await import('../../src/game/lootRows.js');
const bad = verdict(real, FILES);
for (const id of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11']) check(id + ' on the real files', !bad.includes(id), id);

const PLANTS = [
  ['R1', 'L3', 'a 0.01% shown as "0%"', "  return Number(p) >= 1 ? say(SAY, 'codexPages.everyKill') : codexPercent(Number(p));", "  return Number(p) >= 1 ? say(SAY, 'codexPages.everyKill') : Number(p) < 0.001 ? '0%' : codexPercent(Number(p));"],
  ['R2', 'L4', 'the roll range on a row', '      chance: lootChance(d.chance), every, note,', "      chance: lootChance(d.chance), range: d.from ? d.from + '–' + d.to : null, every, note,"],
  ['R3', 'L2', 'two chances on a row', "    const note = d.amount ?", "    const note = d.oneIn && d.chance < 1 ? d.oneIn : d.amount ?"],
  ['R4', 'L5', 'a rate typed into lootRows.js', '      chance: lootChance(d.chance), every, note,', "      chance: lootChance(d.id === 'shard' ? 0.1 : d.chance), every, note,"],
  ['R5', 'L6', '"common" shown as a grade', ": d.graded ? say(SAY, 'codexPages.rollsGrade') : '';", ": d.graded ? (d.tier || 'common') : '';"],
  ['R6', 'L8', '"at most one" said when the worker rolls each on its own', "  return shared ? say(SAY, 'codexPages.rollShared') : say(SAY, 'codexPages.rollEach');", "  return say(SAY, 'codexPages.rollShared');"],
  ['R7', 'L9', 'an unmet monster named in Found from', "name: met ? e.name : say(SAY_CX, 'monsterCodex.unknownName')", 'name: e.name'],
];
for (const [id, want, what, from, to] of PLANTS) {
  const t = plantText(ROOT, REL, from, to);
  if (t === null) { check(`${id} (${what}): its line is found once in lootRows.js`, false, 'the plant\'s line moved: update the plant'); continue; }
  const red = verdict(await importAs(ROOT, REL, t), { ...FILES, [REL]: t });
  check(`${id} plant (${what}) turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}
const FILE_PLANTS = [
  ['R8', 'L7', 'the page\'s drops read without shardcrack', SHOW, "crack: !!(S && S._serverCaps && S._serverCaps.shardcrack)", 'crack: false'],
  ['R9', 'L10', 'the Codex\'s sword named by the table, not the bag\'s reader', OPEN, '  if (g && g.wpn) return weaponDisplayName(g.wpn);\n', ''],
  ['R10', 'L11', 'a Codex piece that rolls its grade shown "Normal" (the road drops `rolls`)', OPEN, 'quality: null, rolls: !!d.graded, rows,', 'quality: null, rows,'],
];
for (const [id, want, what, rel, from, to] of FILE_PLANTS) {
  const t = plantText(ROOT, rel, from, to);
  if (t === null) { check(`${id} (${what}): its line is found once in ${path.basename(rel)}`, false, 'the plant\'s line moved: update the plant'); continue; }
  const red = verdict(real, { ...FILES, [rel]: t });
  check(`${id} plant (${what}) turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
