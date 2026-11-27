/* ═══ v2.3.6693: A MONSTER'S SHOWCASE: ITS ESSENTIALS AND ITS DOORS (card UI2-codex) ═══
 *
 * src/game/entityInspect.js makes a monster's showcase (who it is, its
 * essentials, four doors each with the summary of what is behind it) and the
 * pages behind the doors (Combat, Habitat, Story).  The checks, on the real
 * module, for every kind:
 *   E1  met: its name, element and land; the doors Combat, Loot, Habitat,
 *       Story, in that order, each a Codex page (a PANELS row in
 *       BottomDashboard.jsx) with a summary;
 *   E2  not met: "???", why and where it lives, and NO name, doors or facts;
 *   E3  no health or damage number: its strength is "By level" (no monster
 *       has a number of its own: its level is its land's);
 *   E4  the Loot door's count is its rows' (lootRows of codexDropsFor);
 *   E5  a door with nothing behind it is not made (no rows: no Loot door);
 *   E6  Habitat: its land, both stages' levels, the way from BroTown, a
 *       dungeon only where the monster has one;
 *   E7  Combat and Story are the entry's own words (what it does, its
 *       element's effect, its special and the tip; its tale, its elder form);
 *   E8  never "Wheel" on screen;
 *   E9  the essentials: the land's levels, its element, its type, your kills.
 *
 * THE DODGES, each a one-line change to entityInspect.js planted in memory
 * (lib/plantImport.mjs) and seen red:
 *   Q1 a not-met monster's doors shown      Q2 a health number for a monster
 *   Q3 the Loot door's count unlike its rows Q4 a door with nothing behind it
 *   Q5 a second threshold (met at 0 kills)  Q6 "Wheel" on screen
 *
 * Run: node tools/guards/entity-inspect.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plantText, importAs } from './lib/plantImport.mjs';
import { CODEX_KINDS, CODEX_ENTRIES, CODEX_ELEMENTS, CODEX_ROADS } from '../../src/data/monsterCodex.js';
import { landLook } from '../../src/data/wheelLands.js';
import { WHEEL_GATE_ROADS } from '../../src/data/wheelSignposts.js';
import { codexDropsFor } from '../../src/data/codexDrops.js';
import { landLevelsText } from '../../src/data/wheelSignposts.js';
import { lootRows } from '../../src/game/lootRows.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REL = 'src/game/entityInspect.js';
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 800))); }
}

/* the Codex's pages, as BottomDashboard's PANELS rows name them */
const DASH = fs.readFileSync(path.join(ROOT, 'src/ui/mobile/BottomDashboard.jsx'), 'utf8');
const panelRow = (id) => new RegExp('^\\s*' + id + ':\\s*\\{', 'm').test(DASH);
const DOORS = ['combat', 'loot', 'habitat', 'story'];

function verdict(M) {
  const bad = new Set();
  const no = (id) => bad.add(id);
  for (const kind of CODEX_KINDS) {
    const e = CODEX_ENTRIES[kind];
    const loot = lootRows(codexDropsFor(kind, { shared: true }) || []);
    let m, z, bare;
    try {
      m = M.monsterShowcase(kind, { counts: [3, 0], loot });
      z = M.monsterShowcase(kind, { counts: [0, 0], loot });
      bare = M.monsterShowcase(kind, { counts: [3, 0], loot: [] });
    } catch (err) { no('E1'); continue; }
    /* E1 */
    if (!(m && m.met && m.title === e.name && m.identity.name === e.name && m.identity.element && m.identity.element.name === CODEX_ELEMENTS[e.element].name
      && m.identity.land && m.doors.map((d) => d.id).join() === DOORS.join() && m.doors.every((d) => d.label && d.summary && /^codex[A-Z]/.test(d.page) && panelRow(d.page)))) no('E1');
    /* E2 */
    if (!(z && !z.met && z.title === '???' && z.why && z.home && z.land && !z.doors && !z.essentials && !z.identity && !JSON.stringify(z).includes(e.name))) no('E2');
    /* E3 */
    const ess = (m && m.essentials) || [];
    if (ess.some((f) => /health|\bhp\b|damage|dps|attack/i.test(f.k) && /\d/.test(f.v)) || !ess.some((f) => f.id === 'strength' && /By level/.test(f.v))
      || ess.some((f) => f.id !== 'levels' && f.id !== 'kills' && /\d/.test(f.v))) no('E3');
    /* E4 */
    const ld = m && m.doors ? m.doors.find((d) => d.id === 'loot') : null;
    if (!ld || !new RegExp('^' + loot.length + ' drops?$').test(ld.summary)) no('E4');
    /* E5 */
    if (!bare || bare.doors.some((d) => d.id === 'loot') || bare.doors.some((d) => !d.summary)) no('E5');
    /* E6 */
    const h = M.monsterHabitat(kind);
    const ids = h ? h.rows.map((r) => r.id) : [];
    if (!(h && ids[0] === 'land' && ids.includes('levels') && (e.elder ? ids.includes('elder') : true) && ids.includes('road')
      && ids.includes('dungeon') === !!e.dungeon && h.rows.every((r) => r.title && r.text)
      && h.rows.find((r) => r.id === 'road').text.includes(CODEX_ROADS[e.home]) && h.icon === ((landLook(e.home) || {}).icon || null)
      && h.rows.find((r) => r.id === 'levels').text.includes('Lv 1–20') && (!e.elder || h.rows.find((r) => r.id === 'elder').text.includes('Lv 21–40'))
      && (!e.dungeon || h.rows.find((r) => r.id === 'dungeon').text.includes('Lv ' + e.dungeonLevels[0] + '–' + e.dungeonLevels[1])))) no('E6');
    /* E7 */
    const c = M.monsterCombat(kind), s = M.monsterStory(kind);
    if (!(c && c.what === e.what && c.special.name === e.special.name && c.special.text === e.special.text && c.special.tip === e.special.tip
      && c.element && c.element.effect === CODEX_ELEMENTS[e.element].effect && s && s.story.join('|') === e.story.join('|')
      && (e.elder ? s.elder && s.elder.name === e.elder.name : s.elder === null))) no('E7');
    /* E8 */
    if (/\bwheel\b/i.test(JSON.stringify([m, z, h, c, s]))) no('E8');
    /* E9 */
    const val = (id) => (ess.find((f) => f.id === id) || {}).v;
    if (!(val('levels') === landLevelsText() && val('element') === CODEX_ELEMENTS[e.element].name && val('type') === e.type && val('kills') === '3')) no('E9');
  }
  /* E6: the way there names the land's own gate, and a fork's road off the straight one */
  for (const gate of Object.keys(WHEEL_GATE_ROADS)) {
    const [straight, fork] = WHEEL_GATE_ROADS[gate];
    const a = M.wayThere(straight), b = M.wayThere(fork);
    if (!(a && a.includes(gate) && a.includes(CODEX_ROADS[straight]) && !/fork/.test(a))) no('E6');
    if (fork && !(b && b.includes(gate) && b.includes(CODEX_ROADS[straight]) && b.includes(CODEX_ROADS[fork]) && /fork/.test(b))) no('E6');
  }
  /* E6: a level band of one level reads as one */
  if (!(M.levelsText([41, 41]) === 'Lv 41' && M.levelsText([1, 20]) === 'Lv 1–20')) no('E6');
  return [...bad];
}

const real = await import('../../src/game/entityInspect.js');
const bad = verdict(real);
for (const id of ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9']) check(id + ' on the real entityInspect.js, every kind', !bad.includes(id), id);
check('the unknown kind has no showcase', real.monsterShowcase('nope', {}) === null && real.monsterCombat('nope') === null && real.monsterHabitat('nope') === null);

const PLANTS = [
  ['Q1', 'E2', 'a not-met monster\'s doors shown', '  if (!codexMet(n)) {', '  if (false) {'],
  ['Q2', 'E3', 'a health number for a monster', "    { id: 'kills', k: say(SAY, 'codexPages.factKills'), v: String(n) },", "    { id: 'kills', k: say(SAY, 'codexPages.factKills'), v: String(n) },\n    { id: 'hp', k: 'Health', v: String(40 * n) },"],
  ['Q3', 'E4', 'the Loot door\'s count unlike its rows', "say(SAY, 'codexPages.lootCount', { n: loot.length })", "say(SAY, 'codexPages.lootCount', { n: loot.length + 1 })"],
  ['Q4', 'E5', 'a door with nothing behind it', '  ].filter((d) => d.summary);   /* a door with nothing behind it is not a door */', '  ];'],
  ['Q5', 'E2', 'a second threshold beside CODEX_OPEN_AT', '  if (!codexMet(n)) {', '  if (n < 0) {'],
  ['Q6', 'E8', '"Wheel" on screen', "label: say(SAY, 'codexPages.doorHabitat'), summary: land },", "label: say(SAY, 'codexPages.doorHabitat'), summary: land + ' on the Wheel' },"],
];
for (const [id, want, what, from, to] of PLANTS) {
  const text = plantText(ROOT, REL, from, to);
  if (text === null) { check(`${id} (${what}): its line is found once in entityInspect.js`, false, 'the plant\'s line moved: update the plant'); continue; }
  const red = verdict(await importAs(ROOT, REL, text));
  check(`${id} plant (${what}) turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
