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
 * v2.3.6684 (PR 2, Character, the passport: src/game/broHub.js broPassport,
 * titleActions; part 3):
 *   P1 the combat level worked out (the best weapon, or the sum) instead of
 *      read by the game's reader (prog3.js prog3CharLevel)
 *   P2 a title shown as equipped that is not earned
 *   P3 a clan name shown with no party
 *   P4 a value still on its way shown as 0
 *   P5 Equip (or any title action) offered on another player's title
 *   P6 unspent points shown on another player's page
 *   P7 your phone's own records (Journey) on another player's page
 *   P8 a title change asks for confirmation, or Equip is on for the title
 *      you already wear (its reason lost)
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
import { SAY as CSAY } from '../../src/data/say/charPage.js';
import { broPassport, titleActions, PASSPORT_DOORS, PASSPORT_WEAPONS } from '../../src/game/broHub.js';
import { screenActions } from '../../src/game/screenZones.js';
import { DASH_HUBS, MORE_ROADS } from '../../src/game/dashDests.js';

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

/* ── 3. v2.3.6684: Character, the passport ── */
console.log('3. the passport (broPassport, titleActions)');
/* the readings of a seeded character: the reader's combat level (17) is neither the best weapon
   (21) nor the sum (39), so a level worked out again cannot pass by luck */
const R0 = Object.freeze({
  name: 'Sunburn', combat: 17,
  weapons: { sword: { lvl: 21, unspent: 2 }, bow: { lvl: 9, unspent: 0 }, staff: { lvl: 9, unspent: 1 } },
  titleId: 'combat_10', earned: (id) => id === 'combat_10', titleText: (id) => (id === 'combat_10' ? 'Blooded' : id === 'first_blood' ? 'First Blood' : null),
  clanParty: true, party: { state: 'open', members: [1, 2, 3], ally: null }, oldClan: { tag: 'OLD', name: 'Old Clan' },
  ap: 415, quests: 12,
});
const OTHER = Object.freeze({ name: 'Sunburn' });
const sumOf = (P, id) => P.summary.find((x) => x.id === id) || {};
function passportSuite(I) {
  const out = [];
  const c = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  const me = I.passport(R0, null);
  c('P1 the combat level is the game\'s reader\'s, never worked out again (17, not 21 or 39)', me.combat === 17, me.combat);
  c('P1b the three weapons, Sword, Bow, Staff, each its level and a door to Combat',
    me.weapons.map((w) => w.cat + ':' + w.lvl).join(',') === 'sword:21,bow:9,staff:9' && me.weapons.every((w) => w.opens === PASSPORT_DOORS.weapon), me.weapons.map((w) => w.cat + ':' + w.lvl));
  c('P2 an earned title is shown', me.title && me.title.id === 'combat_10' && me.title.text === 'Blooded', JSON.stringify(me.title));
  const fake = I.passport({ ...R0, titleId: 'first_blood' }, null);
  c('P2 a title that is not earned is never shown as equipped', fake.title === null, JSON.stringify(fake.title));
  const alone = I.passport({ ...R0, party: null }, null);
  const al = sumOf(alone, 'clan');
  c('P3 no party: "No clan", no clan name (not an older worker\'s clan, not a party\'s)', al.none && al.key === 'charPage.noClan' && al.v == null, JSON.stringify(al));
  const pt = sumOf(me, 'clan');
  c('P3b a party with no tag: "Party of 3"; an alliance: its tag and name', pt.key === 'charPage.inParty' && pt.n === 3
    && sumOf(I.passport({ ...R0, party: { state: 'open', members: [1], ally: { on: true, tag: 'SUN', name: 'Sunburnt' } } }, null), 'clan').v === '[SUN] Sunburnt', JSON.stringify(pt));
  const wait = I.passport({ ...R0, ap: null, quests: null, combat: null }, null);
  const wa = sumOf(wait, 'ap'), wq = sumOf(wait, 'quests');
  c('P4 a value on its way is the placeholder, never 0 (AP, Quests done)', wa.loading && wa.v == null && wq.loading && wq.v == null && wait.combat === null, JSON.stringify([wa, wq, wait.combat]));
  c('P4b a real 0 is shown as 0', sumOf(I.passport({ ...R0, ap: 0, quests: 0 }, null), 'ap').v === 0 && !sumOf(I.passport({ ...R0, ap: 0 }, null), 'ap').loading);
  const acts = I.actions(OTHER, 'combat_10', null, R0.earned);
  c('P5 no title action on another player\'s page', Array.isArray(acts) && acts.length === 0, JSON.stringify(acts));
  const them = I.passport(R0, OTHER);
  c('P6 another player\'s page shows no unspent points', them.weapons.every((w) => !w.points), them.weapons.map((w) => w.points));
  c('P6b your page: a weapon\'s points waiting, on its door', me.weapons[0].points === 2 && me.weapons[2].points === 1 && me.weapons[1].points === 0);
  c('P7 Journey (your phone\'s records) on your page only; Titles on both', me.doors.map((d) => d.id).join(',') === 'titles,journey' && them.doors.map((d) => d.id).join(',') === 'titles', [me.doors.map((d) => d.id), them.doors.map((d) => d.id)]);
  c('P7b another player\'s page names its owner; yours is not labelled', me.whose === null && them.whose && them.whose.name === 'Sunburn');
  const mine = screenActions(I.actions(null, 'combat_10', 'combat_10', R0.earned));
  c('P8 a title change is routine (no confirmation); Equip on your worn title is off with its reason, Remove on',
    mine.length === 2 && mine.every((x) => x && !x.confirm) && !mine[0].on && mine[0].why === 'charPage.alreadyWorn' && CSAY[mine[0].why] && mine[1].on, JSON.stringify(mine));
  const pick = screenActions(I.actions(null, 'combat_10', null, R0.earned));
  c('P8b Equip on for an earned title you do not wear; Remove off with its reason when you wear none',
    pick[0].on && !pick[1].on && CSAY[pick[1].why], JSON.stringify(pick));
  return out;
}
const PREAL = { passport: broPassport, actions: titleActions };
for (const r of passportSuite(PREAL)) check('3. ' + r.name, r.ok, r.detail);

console.log('3b. what the page reads, and the tables it moved');
const CP = fs.readFileSync(path.join(ROOT, 'src/ui/mobile/sheet/CharacterPage.jsx'), 'utf8');
check('3b. the page reads the combat level by the game\'s reader (prog3CharLevel), nothing summed',
  /export function broCombatLevel\(R\)\s*\{[^}]*prog3CharLevel\(R\)/.test(CP) && /combat:\s*S && S\.rpg \? broCombatLevel\(R\)/.test(CP) && !/\.reduce\(|Math\.max\(\.\.\./.test(CP));
check('3b. a title is changed only through the game\'s own ask (sendAchvTitle: the action door)', /sendAchvTitle\(S, want\)/.test(CP) && !/\bact\(/.test(CP));
check('3b. the pending mark is pending.js\'s (one state, its one transition)', /pendingStep\(/.test(CP) && /pendingMark\(pend, 'title:equip'/.test(CP));
check('3b. every passport word is a row of the table', ['charPage.combatLv', 'charPage.noTitle', 'charPage.noClan', 'charPage.skillGuilds', 'charPage.notShared']
  .concat(PASSPORT_WEAPONS.map((w) => w.word)).every((k) => typeof CSAY[k] === 'string'));
check('3b. Journey left the Settings hub for the passport (one row), and More\'s road follows it',
  !DASH_HUBS.settingsHub.some((d) => d.id === 'journey') && MORE_ROADS.journey === 'bro:character' && PASSPORT_DOORS.journey === 'page:journey' && panelHas('journey'));
check('3b. Titles is a frame page of Bro\'s', Object.prototype.hasOwnProperty.call(FRAME_PAGES, 'broTitles') && isBroHubPage('broTitles') && PASSPORT_DOORS.titles === 'page:broTitles');
for (const [k, o] of Object.entries(PASSPORT_DOORS)) {
  const pg = o.slice(5);
  check(`3b. the passport's ${k} door opens a page the dashboard has (${o})`, Object.prototype.hasOwnProperty.call(FRAME_PAGES, pg) || panelHas(pg));
}

console.log('3c. each dodge, planted, turns its check red');
const pwrap = (patch) => Object.assign({}, PREAL, patch);
const withP = (fn) => (r, w) => fn(broPassport(r, w), r, w);
const PPLANTS = [
  ['P1 the best weapon as the level', 'P1', pwrap({ passport: withP((P, r) => ({ ...P, combat: Math.max(...Object.values(r.weapons).map((x) => x.lvl)) })) })],
  ['P1 the sum as the level', 'P1', pwrap({ passport: withP((P, r) => ({ ...P, combat: Object.values(r.weapons).reduce((n, x) => n + x.lvl, 0) })) })],
  ['P2 the worn id shown without asking if earned', 'P2', pwrap({ passport: withP((P, r) => ({ ...P, title: r.titleId ? { id: r.titleId, text: r.titleText(r.titleId) } : null })) })],
  ['P3 an older worker\'s clan shown with no party', 'P3', pwrap({ passport: withP((P, r) => ({ ...P, summary: P.summary.map((x) => (x.id === 'clan' && x.none && r.oldClan ? { ...x, none: false, key: undefined, v: r.oldClan.name } : x)) })) })],
  ['P4 AP on its way shown as 0', 'P4', pwrap({ passport: withP((P) => ({ ...P, summary: P.summary.map((x) => (x.loading ? { ...x, loading: false, v: 0 } : x)) })) })],
  ['P5 Equip on another player\'s title', 'P5', pwrap({ actions: (w, ...rest) => titleActions(null, ...rest) })],
  ['P6 points on another player\'s page', 'P6', pwrap({ passport: (r, w) => ({ ...broPassport(r, w), weapons: broPassport(r, null).weapons }) })],
  ['P7 Journey on another player\'s page', 'P7', pwrap({ passport: (r, w) => ({ ...broPassport(r, w), doors: broPassport(r, null).doors }) })],
  ['P8 a title change asks first', 'P8', pwrap({ actions: (...a) => titleActions(...a).map((x) => ({ ...x, cost: 'costly' })) })],
  ['P8 Equip on for the title you wear', 'P8', pwrap({ actions: (...a) => titleActions(...a).map((x) => (x.id === 'equip' ? { ...x, check: () => null } : x)) })],
];
for (const [name, want, impl] of PPLANTS) {
  let res;
  try { res = passportSuite(impl); } catch (e) { res = [{ name: want + ' (threw)', ok: false }]; }
  const red = res.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`3c. plant ${name}: turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
