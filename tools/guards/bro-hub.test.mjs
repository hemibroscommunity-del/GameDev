/* ═══ v2.3.6683: BRO'S LANDING HOLDS (card UI2-bro, the build's step 3, PR 1) ═══
 *
 * src/game/broHub.js is Bro's six doors under the new frame (the owner,
 * 2026-11-25: "Six buttons only under contextual header. Character, Combat,
 * Equipment / Life Skills, Feats, Pets"), the marks on them, whose page it
 * is, and the road each of today's eight Progress doors takes now.  Here, not
 * in server/test (a file there deploys the worker).
 *
 * THE DODGES (the card's list, the ways a tired programmer writes them).  The
 * checks are played against the real rules (part 1) and against each PLANT,
 * a wrapper that writes the dodge; each plant must turn its own check red,
 * every run (part 2).  A plant that stays green fails the suite.
 *   D1 a seventh door
 *   D2 five doors
 *   D3 the door reads "Accomplishments"
 *   D4 unspent points shown on another player's page
 *   D5 a locked door loses its place (dropped, or moved to the end)
 *   D6 a locked door loses its reason
 *   D7 one of today's eight Progress doors loses its road
 *   D8 another player's page drawn with no owner named
 *
 * Run: node tools/guards/bro-hub.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRO_HUB_DOORS, BRO_HUB_PAGES, BRO_PROGRESS_ROADS, broHubDoors, broHubMarks, broHubOpen, broHubWhose, isBroHubPage,
} from '../../src/game/broHub.js';
import { BRO_DOORS } from '../../src/game/broPages.js';
import { MENU_DESTS, FRAME_PAGES, menuGridShape } from '../../src/game/dashDests.js';
import { SAY } from '../../src/data/say/dashFrame.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -- ' + detail : '')); }
}

const WANT = ['character', 'combat', 'equipment', 'skills', 'feats', 'pets'];
const WANT_WORDS = ['Character', 'Combat', 'Equipment', 'Life Skills', 'Feats', 'Pets'];
/* the pages a door may open: the frame's own, and today's PANELS that Bro's doors hung (read from
   the dashboard's table by its keys: an existence check, the behaviour is part 1's) */
const DASH_SRC = fs.readFileSync(path.join(ROOT, 'src/ui/mobile/BottomDashboard.jsx'), 'utf8');
const panelHas = (id) => new RegExp('^\\s{2}' + id + ':\\s+\\{', 'm').test(DASH_SRC);

/* The checks, against an implementation { doors(caps), word(key), marks(pts, lifeNew, who), whose(who), roads }.
   Each check's name starts with its dodge's number. */
function suite(I) {
  const out = [];
  const c = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  const self = I.doors(null);
  c('D1 no seventh door', self.length <= 6, 'doors: ' + self.length);
  c('D2 six doors, in the order Character, Combat, Equipment / Life Skills, Feats, Pets',
    self.length === 6 && self.every((d, i) => d.id === WANT[i]), self.map((d) => d.id).join(', '));
  const words = self.map((d) => I.word(d.word));
  c('D3 each door reads its word (Feats, never Accomplishments)',
    words.join('|') === WANT_WORDS.join('|') && !words.some((w) => /accomplish/i.test(String(w))), words.join(', '));
  const other = I.marks(7, true, { name: 'Sunburn' });
  const anyMark = Object.keys(other).some((k) => other[k] && (other[k].count || other[k].glow || other[k].dot));
  c('D4 another player\'s page shows none of the owner\'s marks (no unspent points)', !anyMark, JSON.stringify(other));
  const mine = I.marks(7, true, null);
  c('D4b your page: points glow on Combat with their count, Life Skills\' new on its tile',
    mine.combat && mine.combat.count === 7 && mine.combat.glow && mine.skills && mine.skills.dot, JSON.stringify(mine));
  const none = I.marks(0, false, null);
  c('D4c no points: no glow, no count', !(none.combat && (none.combat.glow || none.combat.count)), JSON.stringify(none));
  const shut = I.doors({ achievements: false, petbook: true });   /* Feats shut, Pets open after it */
  c('D5 a locked door keeps its place', shut.length === 6 && shut.every((d, i) => d.id === WANT[i])
    && shut[4].locked && !shut[5].locked && !shut[0].locked, shut.map((d) => d.id + (d.locked ? '(locked)' : '')).join(', '));
  c('D6 a locked door says why (a word of the table)', shut.filter((d) => d.locked).every((d) => d.why && I.word(d.why)),
    shut.filter((d) => d.locked).map((d) => String(d.why)).join(', '));
  const open = I.doors({ achievements: true, petbook: true });
  c('D5b every door open when the worker offers its page', open.every((d) => !d.locked));
  const roadsOk = BRO_DOORS.every((d) => {
    const r = I.roads[d.id];
    if (!r) return false;
    const m = /^(bro|menu):([a-zA-Z]+)(\/[a-z]+)?$/.exec(r);
    if (!m) return false;
    return m[1] === 'bro' ? WANT.indexOf(m[2]) >= 0 : MENU_DESTS.some((x) => x.id === m[2]);
  });
  c('D7 each of today\'s eight Progress doors keeps a road (a Bro door or a Menu tile)',
    BRO_DOORS.length === 8 && roadsOk, BRO_DOORS.map((d) => d.id + '=' + I.roads[d.id]).join(', '));
  const w1 = I.whose({ name: 'Sunburn' });
  const w2 = I.whose({ name: '' });
  c('D8 another player\'s page names its owner; yours is not labelled',
    I.whose(null) === null && w1 && w1.name === 'Sunburn' && I.word(w1.key).indexOf('{name}') >= 0
    && w2 && w2.key !== w1.key && I.word(w2.key), JSON.stringify([w1, w2]));
  return out;
}

const REAL = {
  doors: broHubDoors,
  word: (k) => SAY[k],
  marks: broHubMarks,
  whose: broHubWhose,
  roads: BRO_PROGRESS_ROADS,
};

console.log('1. the rules, as built');
for (const r of suite(REAL)) check('1. ' + r.name, r.ok, r.detail);

console.log('1b. the doors open what they say');
for (const d of BRO_HUB_DOORS) {
  const o = broHubOpen(d.opens);
  const ok = o && (o.kind === 'gear' || (o.kind === 'page' && (Object.prototype.hasOwnProperty.call(FRAME_PAGES, o.page) || panelHas(o.page))));
  check(`1b. ${d.id} opens a page the dashboard has (${d.opens})`, ok);
  check(`1b. ${d.id}'s picture is a file of the game (${d.art})`, fs.existsSync(path.join(ROOT, 'public', d.art)));
}
check('1b. Character and Combat are the frame\'s own pages', Object.keys(BRO_HUB_PAGES).every((p) => Object.prototype.hasOwnProperty.call(FRAME_PAGES, p) && isBroHubPage(p)));
check('1b. Character opens broCharacter, Combat broCombat', broHubOpen(BRO_HUB_DOORS[0].opens).page === 'broCharacter' && broHubOpen(BRO_HUB_DOORS[1].opens).page === 'broCombat');
check('1b. Equipment opens the Gear workspace', broHubOpen(BRO_HUB_DOORS[2].opens).kind === 'gear');
check('1b. an unknown word opens nothing', broHubOpen('nowhere') === null && broHubOpen('page:') === null);
const g = menuGridShape(6, false), gs = menuGridShape(6, true);
check('1b. the grid: three across and two down upright, one row of six sideways', g.cols === 3 && g.rows === 2 && gs.cols === 6 && gs.rows === 1);
const LAND = fs.readFileSync(path.join(ROOT, 'src/ui/mobile/sheet/BroLanding.jsx'), 'utf8');
check('1b. the landing draws no portrait and no banner (no image, no name of its own; the grid only)',
  !/<img\b/.test(LAND) && !/portrait/i.test(LAND.replace(/\/\*[\s\S]*?\*\//g, '')));

console.log('2. each dodge, planted, turns its check red');
const wrap = (patch) => Object.assign({}, REAL, patch);
const PLANTS = [
  ['D1 a seventh door', 'D1', wrap({ doors: (c) => [...broHubDoors(c), { id: 'journey', word: 'dashFrame.journey' }] })],
  ['D2 five doors', 'D2', wrap({ doors: (c) => broHubDoors(c).filter((d) => d.id !== 'pets') })],
  ['D3 "Accomplishments"', 'D3', wrap({ word: (k) => (k === 'dashFrame.feats' ? 'Accomplishments' : SAY[k]) })],
  ['D4 points on another player\'s page', 'D4', wrap({ marks: (p, l) => broHubMarks(p, l, null) })],
  ['D5 a locked door dropped', 'D5', wrap({ doors: (c) => broHubDoors(c).filter((d) => !d.locked) })],
  ['D5 a locked door moved to the end', 'D5', wrap({ doors: (c) => { const a = broHubDoors(c); return [...a.filter((d) => !d.locked), ...a.filter((d) => d.locked)]; } })],
  ['D6 a locked door with no reason', 'D6', wrap({ doors: (c) => broHubDoors(c).map((d) => ({ ...d, why: null })) })],
  ['D7 Points loses its road', 'D7', wrap({ roads: { ...BRO_PROGRESS_ROADS, points: undefined } })],
  ['D7 Titles\' road to a door that is not there', 'D7', wrap({ roads: { ...BRO_PROGRESS_ROADS, titles: 'bro:accomplishments' } })],
  ['D8 another player\'s page with no owner named', 'D8', wrap({ whose: () => null })],
];
for (const [name, want, impl] of PLANTS) {
  let res;
  try { res = suite(impl); } catch (e) { res = [{ name: want + ' (threw)', ok: false }]; }
  const red = res.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`2. plant ${name}: turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
