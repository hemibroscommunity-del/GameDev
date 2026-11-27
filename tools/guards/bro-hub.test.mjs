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
 * v2.3.6782 (card UI3-bro: Bro and Character become ONE page for yourself,
 * six tiles, Combat, Equipment, Life Skills / Feats, Pets, Journey, and one
 * flat strip; the owner, 2026-11-26: "I'd turn the Bro menu into a unified
 * character management dashboard").  D1, D2, D3, D5, D7 and 1b, 3b's Journey
 * are rewritten to that; part 4 is THE DODGES of the one page, read off the
 * SYNTAX TREE (@babel/parser) of the files that draw it, never a pattern of
 * text, each planted (the way a tired programmer writes it) and seen red:
 *   B1 the portrait, the name or a combat-level reader drawn or imported by
 *      the one page (`<img src={portraitSrc(S)}>` kept "for now")
 *   B2 the three weapon doors back (PASSPORT_WEAPONS read by it)
 *   B3 a seventh tile (Titles or Character as a tile)
 *   B4 a strip entry given the raised form (u2-raised, Ui2Tile, Ui2Stat, the
 *      passport's PassDoor) or a border of its own
 *   B5 Titles unreachable for yourself (v2.3.6695: Feats' Titles door dropped, or the strip's title entry left)
 *   B6 a strip value on its way shown as 0
 *   B7 CharacterPage deleted, or unreachable for another player
 *   B8 your old passport drawn for yourself (`door === 'character'` with no
 *      test of `who`)
 *   B9 Journey listed twice for yourself (a tile and a hub tile, or a strip
 *      entry)
 *   B10 BroDoorPage's fallback still 'character' (`|| 'character'`)
 *
 * Run: node tools/guards/bro-hub.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  BRO_HUB_DOORS, BRO_HUB_PAGES, BRO_PROGRESS_ROADS, broHubDoors, broHubMarks, broHubOpen, broHubWhose, isBroHubPage,
} from '../../src/game/broHub.js';
import { BRO_DOORS } from '../../src/game/broPages.js';
import { MENU_DESTS, FRAME_PAGES, menuGridShape } from '../../src/game/dashDests.js';
import { SAY } from '../../src/data/say/dashFrame.js';
import { SAY as CSAY } from '../../src/data/say/charPage.js';
import { broPassport, titleActions, PASSPORT_DOORS, PASSPORT_WEAPONS, broStrip, BRO_STRIP, broSelfPage } from '../../src/game/broHub.js';
import { FEATS_DOORS } from '../../src/game/feats.js';   /* v2.3.6695 (card UI2-feats): Titles' home, Feats' door */
import { screenActions } from '../../src/game/screenZones.js';
import { DASH_HUBS, MORE_ROADS } from '../../src/game/dashDests.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -- ' + detail : '')); }
}

/* v2.3.6782 (card UI3-bro): the one page's six, Combat first, Journey last */
const WANT = ['combat', 'equipment', 'skills', 'feats', 'pets', 'journey'];
const WANT_WORDS = ['Combat', 'Equipment', 'Life Skills', 'Feats', 'Pets', 'Journey'];
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
  c('D2 six doors, in the order Combat, Equipment, Life Skills / Feats, Pets, Journey',
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
  const shut = I.doors({ achievements: false, petbook: true });   /* Feats shut (index 3), Pets open after it */
  c('D5 a locked door keeps its place', shut.length === 6 && shut.every((d, i) => d.id === WANT[i])
    && shut[3].locked && !shut[4].locked && !shut[0].locked, shut.map((d) => d.id + (d.locked ? '(locked)' : '')).join(', '));
  c('D6 a locked door says why (a word of the table)', shut.filter((d) => d.locked).every((d) => d.why && I.word(d.why)),
    shut.filter((d) => d.locked).map((d) => String(d.why)).join(', '));
  const open = I.doors({ achievements: true, petbook: true });
  c('D5b every door open when the worker offers its page', open.every((d) => !d.locked));
  const roadsOk = BRO_DOORS.every((d) => {
    const r = I.roads[d.id];
    if (!r) return false;
    const m = /^(bro|menu):([a-zA-Z]+)(\/[a-z]+)?$/.exec(r);
    if (!m) return false;
    /* v2.3.6782: bro:<tile>, bro:strip/<entry> (an entry of the one page's strip), menu:<door> */
    if (m[1] === 'bro' && m[2] === 'strip') return !!m[3] && BRO_STRIP.indexOf(m[3].slice(1)) >= 0;
    return m[1] === 'bro' ? WANT.indexOf(m[2]) >= 0 : MENU_DESTS.some((x) => x.id === m[2]);
  });
  c('D7 each of today\'s eight Progress doors keeps a road (a Bro tile, an entry of its strip, or a Menu tile)',
    BRO_DOORS.length === 8 && roadsOk, BRO_DOORS.map((d) => d.id + '=' + I.roads[d.id]).join(', '));
  const ids = self.map((d) => d.id);
  c('B3 no Titles or Character tile (Titles is the strip\'s, Character another player\'s page)',
    ids.indexOf('titles') < 0 && ids.indexOf('character') < 0 && !self.some((d) => /broCharacter|broTitles/.test(String(d.opens))), ids.join(', '));
  const strip = (I.strip || broStrip)(R_SEED, null);
  const journeys = self.filter((d) => d.id === 'journey' || d.opens === 'page:journey').length
    + strip.filter((x) => x.id === 'journey' || x.opens === 'page:journey').length
    + Object.values(I.hubs || DASH_HUBS).reduce((n, h) => n + h.filter((d) => d.id === 'journey' || d.page === 'journey').length, 0);
  c('B9 Journey once for yourself: a tile, no hub tile, no strip entry', journeys === 1 && ids.indexOf('journey') >= 0, 'journey doors: ' + journeys);
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

/* a seeded character's readings (part 3's R0, here before part 1 needs it) */
const R_SEED = Object.freeze({
  name: 'Sunburn', combat: 17,
  weapons: { sword: { lvl: 21, unspent: 2 }, bow: { lvl: 9, unspent: 0 }, staff: { lvl: 9, unspent: 1 } },
  titleId: 'combat_10', earned: (id) => id === 'combat_10', titleText: (id) => (id === 'combat_10' ? 'Blooded' : null),
  clanParty: true, party: { state: 'open', members: [1, 2, 3], ally: null }, oldClan: null, ap: 415, quests: 12,
});

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
const doorOf = (id) => BRO_HUB_DOORS.find((d) => d.id === id) || {};
/* v2.3.6782 (card UI3-bro): no tile and no strip entry opens broCharacter (yours is the one Bro page) */
check('1b. no tile and no strip entry opens broCharacter; Combat opens broCombat',
  !BRO_HUB_DOORS.some((d) => d.opens === 'page:broCharacter') && !broStrip(R_SEED, null).some((x) => x.opens === 'page:broCharacter')
  && broHubOpen(doorOf('combat').opens).page === 'broCombat');
/* v2.3.6689 (card UI2-gear PR 3): Equipment opens its showcase (the figure and the worn cells; Manage Gear is Gear's road) */
check('1b. Equipment opens its showcase, broEquip', broHubOpen(doorOf('equipment').opens).kind === 'page' && broHubOpen(doorOf('equipment').opens).page === 'broEquip');
check('1b. an unknown word opens nothing', broHubOpen('nowhere') === null && broHubOpen('page:') === null);
const g = menuGridShape(6, false), gs = menuGridShape(6, true);
check('1b. the grid: three across and two down upright, one row of six sideways', g.cols === 3 && g.rows === 2 && gs.cols === 6 && gs.rows === 1);
/* v2.3.6782: the landing's "no portrait, no banner" moved to part 4 (B1, read off the syntax tree) */

console.log('2. each dodge, planted, turns its check red');
const wrap = (patch) => Object.assign({}, REAL, patch);
const PLANTS = [
  ['D1 a seventh door (Character re-added)', 'D1', wrap({ doors: (c) => [...broHubDoors(c), { id: 'character', word: 'dashFrame.character', opens: 'page:broCharacter' }] })],
  ['D2 five doors', 'D2', wrap({ doors: (c) => broHubDoors(c).filter((d) => d.id !== 'pets') })],
  ['D3 "Accomplishments"', 'D3', wrap({ word: (k) => (k === 'dashFrame.feats' ? 'Accomplishments' : SAY[k]) })],
  ['D4 points on another player\'s page', 'D4', wrap({ marks: (p, l) => broHubMarks(p, l, null) })],
  ['D5 a locked door dropped', 'D5', wrap({ doors: (c) => broHubDoors(c).filter((d) => !d.locked) })],
  ['D5 a locked door moved to the end', 'D5', wrap({ doors: (c) => { const a = broHubDoors(c); return [...a.filter((d) => !d.locked), ...a.filter((d) => d.locked)]; } })],
  ['D6 a locked door with no reason', 'D6', wrap({ doors: (c) => broHubDoors(c).map((d) => ({ ...d, why: null })) })],
  ['D7 Points loses its road', 'D7', wrap({ roads: { ...BRO_PROGRESS_ROADS, points: undefined } })],
  ['D7 Titles\' road to a door that is not there', 'D7', wrap({ roads: { ...BRO_PROGRESS_ROADS, titles: 'bro:accomplishments' } })],
  ['D7 Titles left at the passport\'s door', 'D7', wrap({ roads: { ...BRO_PROGRESS_ROADS, titles: 'bro:character/titles' } })],
  ['D7 a strip road to an entry that is not there', 'D7', wrap({ roads: { ...BRO_PROGRESS_ROADS, clan: 'bro:strip/party' } })],
  ['B3 Titles as a seventh tile', 'B3', wrap({ doors: (c) => [...broHubDoors(c), { id: 'titles', word: 'dashFrame.titles', opens: 'page:broTitles' }] })],
  ['B3 Character back in Journey\'s place', 'B3', wrap({ doors: (c) => broHubDoors(c).map((d) => (d.id === 'journey' ? { id: 'character', word: 'dashFrame.character', opens: 'page:broCharacter' } : d)) })],
  ['B9 Journey back in the Settings hub too', 'B9', wrap({ hubs: { ...DASH_HUBS, settingsHub: [...DASH_HUBS.settingsHub, { id: 'journey', page: 'journey' }] } })],
  ['B9 Journey a strip entry too', 'B9', wrap({ strip: (r, w) => [...broStrip(r, w), { id: 'journey', opens: 'page:journey' }] })],
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
/* v2.3.6782 (card UI3-bro): Journey is a tile of the one Bro page; More's road is Bro's */
check('3b. Journey is a Bro tile opening page:journey, not in the Settings hub, and More\'s road is Bro\'s',
  !DASH_HUBS.settingsHub.some((d) => d.id === 'journey') && MORE_ROADS.journey === 'bro' && doorOf('journey').opens === 'page:journey' && panelHas('journey'));
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

/* ── 4. v2.3.6782 (card UI3-bro): THE ONE PAGE'S DODGES ── */
console.log('4. the one Bro page (broStrip, broSelfPage; the files that draw it, by their syntax tree)');
let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { /* the next */ }
}
check('4. @babel/parser and traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);
const tree = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SRC = Object.freeze({
  landing: readSrc('src/ui/mobile/sheet/BroLanding.jsx'),
  strip: readSrc('src/ui/mobile/sheet/BroStrip.jsx'),
  stripCss: readSrc('src/ui/mobile/sheet/broStrip.css'),
  card: readSrc('src/ui/mobile/sheet/BroCard.jsx'),
  charPage: readSrc('src/ui/mobile/sheet/CharacterPage.jsx'),
});
/* what a file's tree holds: every identifier and imported name, every JSX element's name, every string
   (literals and template parts; comments are not code), and each JSX element with its enclosing tests */
function facts(src) {
  const ids = new Set(), els = [], strs = [];
  B.traverse(tree(src), {
    Identifier(p) { ids.add(p.node.name); },
    ImportSpecifier(p) { ids.add(p.node.imported.name || p.node.imported.value); },
    StringLiteral(p) { strs.push(p.node.value); },
    TemplateElement(p) { strs.push(p.node.value.cooked || ''); },
    JSXElement(p) {
      const n = p.node.openingElement.name;
      const name = n.type === 'JSXIdentifier' ? n.name : n.type === 'JSXMemberExpression' ? n.property.name : '';
      const attrs = p.node.openingElement.attributes.filter((a) => a.type === 'JSXAttribute').map((a) => a.name.name);
      /* the tests above it: an if's, a ternary's, a && / ||'s left side; and the function it is in */
      const tests = [];
      let fn = null;
      for (let q = p.parentPath; q; q = q.parentPath) {
        const t = q.node;
        if ((t.type === 'IfStatement' || t.type === 'ConditionalExpression') && t.test) tests.push(t.test);
        if (t.type === 'LogicalExpression') tests.push(t.left);
        if (!fn && (t.type === 'FunctionDeclaration' || t.type === 'ArrowFunctionExpression' || t.type === 'FunctionExpression')) {
          fn = t.id ? t.id.name : (q.parentPath && q.parentPath.node.type === 'VariableDeclarator' && q.parentPath.node.id.name) || '';
        }
      }
      els.push({ name, attrs, tests, fn });
    },
  });
  return { ids, els, strs };
}
/* does an expression read `who` (or `whose`, its copy)? */
function readsWho(node) {
  let hit = false;
  const visit = (n) => {
    if (!n || typeof n !== 'object' || hit) return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    if (n.type === 'Identifier' && (n.name === 'who' || n.name === 'whose')) { hit = true; return; }
    for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'start' && k !== 'end' && n[k] && typeof n[k] === 'object') visit(n[k]);
  };
  visit(node);
  return hit;
}
/* a function's body as a tree: its string literals and the calls it makes */
function fnFacts(src, name) {
  const out = { found: false, strs: [], calls: new Set() };
  B.traverse(tree(src), {
    FunctionDeclaration(p) {
      if (p.node.id && p.node.id.name === name) {
        out.found = true;
        p.traverse({
          StringLiteral(q) { out.strs.push(q.node.value); },
          CallExpression(q) { if (q.node.callee.type === 'Identifier') out.calls.add(q.node.callee.name); },
        });
      }
    },
  });
  return out;
}
/* a stylesheet's rules on a strip entry (.u2-fact): a face is a border, a background or a shadow */
function cssFaces(css) {
  const bad = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim();
    if (!/\.u2-fact\b/.test(sel) || /:active|:focus|is-press|is-focus/.test(sel)) continue;
    for (const decl of m[2].split(';')) {
      const prop = decl.split(':')[0].trim().toLowerCase();
      const val = decl.slice(decl.indexOf(':') + 1).trim().toLowerCase();
      if (/^(border|background|box-shadow|outline)/.test(prop) && !/^(0|none|transparent)$/.test(val)) bad.push(sel + ' ' + prop);
    }
  }
  return bad;
}

const FACE_READERS = ['portraitSrc', 'prog3CharLevel', 'broCombatLevel', 'combatLevel', 'prog3Live', 'myName'];
const RAISED_FORMS = ['Ui2Tile', 'Ui2Stat', 'PassDoor', 'Ui2Group'];
function pageSuite(X) {
  const out = [];
  const c = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  const L = facts(X.landing), T = facts(X.strip), K = facts(X.card), C = facts(X.charPage);
  const both = [L, T];
  const read = FACE_READERS.filter((n) => both.some((f) => f.ids.has(n)));
  const imgs = both.reduce((n, f) => n + f.els.filter((e) => e.name === 'img').length, 0);
  const marks = both.flatMap((f) => f.els.flatMap((e) => e.attrs)).filter((a) => /^data-char-(portrait|name|combat)/.test(a));
  c('B1 the one page draws and imports no portrait, no name, no combat level', read.length === 0 && imgs === 0 && marks.length === 0,
    'readers: ' + read.join(',') + ' | <img>: ' + imgs + ' | marks: ' + marks.join(','));
  const weapons = both.some((f) => f.ids.has('PASSPORT_WEAPONS') || f.ids.has('BRO_WEAPONS') || f.ids.has('WEAPON_SKILLS'));
  c('B2 no weapon doors on the one page (PASSPORT_WEAPONS not read)', !weapons);
  const raised = RAISED_FORMS.filter((n) => T.els.some((e) => e.name === n));
  const raisedStr = T.strs.filter((x) => /\bu2-(raised|tile|stat|group|pass-door)\b/.test(x));
  const facesCss = cssFaces(X.stripCss);
  const entries = T.els.filter((e) => e.name === 'Ui2Fact').length;
  c('B4 every strip entry is the kit\'s flat fact (no raised form, no face of its own)',
    entries > 0 && raised.length === 0 && raisedStr.length === 0 && facesCss.length === 0 && T.els.some((e) => e.name === 'Ui2Facts'),
    'facts: ' + entries + ' | raised: ' + raised.concat(raisedStr).join(',') + ' | css faces: ' + facesCss.join(','));
  const charEls = K.els.filter((e) => e.name === 'CharacterPage');
  const exported = /export function CharacterPage\b/.test(X.charPage) && C.ids.has('CharacterPage');
  c('B7 CharacterPage kept, and BroCard draws it for another player', exported && charEls.length > 0 && I_SELF.page('broCharacter', { name: 'Sunburn' }) === 'character',
    'drawn: ' + charEls.length + ', exported: ' + exported);
  c('B8 your old passport never drawn for yourself (BroCard draws CharacterPage only under a test of who)',
    charEls.length > 0 && charEls.every((e) => e.tests.some(readsWho)) && I_SELF.page('broCharacter', null) === null,
    charEls.map((e) => e.tests.length + ' tests, who: ' + e.tests.some(readsWho)).join('; '));
  const dp = fnFacts(X.card, 'BroDoorPage');
  c('B10 BroDoorPage sends an unknown id and your Character to the one Bro page (broSelfPage; no \'character\' fallback)',
    dp.found && dp.calls.has('broSelfPage') && dp.strs.indexOf('character') < 0 && I_SELF.page('nowhere', null) === null && I_SELF.page('broCombat', null) === 'combat',
    'found: ' + dp.found + ', calls broSelfPage: ' + dp.calls.has('broSelfPage') + ', strings: ' + dp.strs.join(','));
  return out;
}
let I_SELF = { page: broSelfPage };
function stripSuite(I) {
  const out = [];
  const c = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  const me = I.strip(R_SEED, null);
  const ids = me.map((x) => x.id).join(',');
  /* v2.3.6695 (card UI2-feats): "Titles could live within Feats": Titles' one home for yourself is Feats'
     Titles door (src/game/feats.js FEATS_DOORS), and the strip's title entry is gone */
  const t = (I.featsDoors || FEATS_DOORS).find((x) => x.id === 'titles') || {};
  c('B5 Titles reachable for yourself: Feats\' Titles door opens broTitles (and the strip has no title entry)', t.opens === 'page:broTitles' && !me.some((x) => x.id === 'title'), ids + ' | ' + JSON.stringify(t));
  c('B5b the strip: AP, Quests, Clan, Guilds, in order, each a door of PASSPORT_DOORS', ids === BRO_STRIP.join(',') && ids === 'ap,quests,clan,guilds'
    && me.every((x) => Object.values(PASSPORT_DOORS).indexOf(x.opens) >= 0), ids);
  const none = I.strip({ ...R_SEED, titleId: null, party: null }, null);
  const nc = none.find((x) => x.id === 'clan') || {};
  c('B5c no party: "No clan"', nc.key === 'charPage.noClan', JSON.stringify([nc]));
  const wait = I.strip({ ...R_SEED, ap: null, quests: null }, null);
  const wa = wait.find((x) => x.id === 'ap') || {}, wq = wait.find((x) => x.id === 'quests') || {};
  c('B6 a strip value on its way is the placeholder, never 0', wa.loading && wa.v == null && wq.loading && wq.v == null, JSON.stringify([wa, wq]));
  const them = I.strip({ ...R_SEED, quests: null }, { name: 'Sunburn' });
  const tq = them.find((x) => x.id === 'quests') || {}, tt = them.find((x) => x.id === 'title') || {};
  c('B6b another player\'s strip: Quests "Not shared", no title door', tq.key === 'charPage.notShared' && !tq.opens && !tt.opens, JSON.stringify([tq, tt]));
  c('B6c every strip word is a row of the table', me.concat(none, them).every((x) => typeof CSAY[x.k] === 'string' && (!x.key || typeof CSAY[x.key] === 'string')));
  return out;
}
for (const r of pageSuite(SRC)) check('4. ' + r.name, r.ok, r.detail);
for (const r of stripSuite({ strip: broStrip })) check('4. ' + r.name, r.ok, r.detail);

console.log('4b. each dodge, planted, turns its check red');
const swap = (k, from, to) => {
  if (SRC[k].indexOf(from) < 0) return null;   /* the plant's anchor is gone: say so below */
  return { ...SRC, [k]: SRC[k].replace(from, to) };
};
const IMPORT_AT = "import React from 'react';";
const TPLANTS = [
  ['B1 the portrait kept "for now"', 'B1', swap('landing', IMPORT_AT, IMPORT_AT + "\nimport { portraitSrc } from './portraitStore.js';\nexport const Face = ({ S }) => <img src={portraitSrc(S)} alt=\"\" />;")],
  ['B1 the combat level read for a banner', 'B1', swap('strip', IMPORT_AT, IMPORT_AT + "\nimport { broCombatLevel } from './CharacterPage.jsx';\nexport const Lv = ({ R }) => <span>{broCombatLevel(R)}</span>;")],
  ['B1 the name drawn', 'B1', swap('landing', IMPORT_AT, IMPORT_AT + "\nexport const Nm = ({ S }) => <span data-char-name=\"\">{S.myName}</span>;")],
  ['B2 the three weapon doors back', 'B2', swap('landing', IMPORT_AT, IMPORT_AT + "\nimport { PASSPORT_WEAPONS } from '@/game/broHub.js';\nexport const Ws = () => PASSPORT_WEAPONS.map((w) => <button key={w.cat}>{w.cat}</button>);")],
  ['B4 a strip entry reusing the raised tile', 'B4', swap('strip', '<Ui2Fact key', '<Ui2Tile key')],
  ['B4 a strip entry given the raised class', 'B4', swap('strip', "className={icon ? 'is-icon' : undefined}", "className={icon ? 'is-icon' : 'u2-raised'}")],
  ['B4 a strip entry given a border of its own', 'B4', swap('stripCss', '.ui2 .u2-bro-strip .u2-fact {', '.ui2 .u2-bro-strip .u2-fact { border: 1px solid var(--ui2-border);')],
  ['B7 CharacterPage no longer drawn by BroCard', 'B7', swap('card', "who != null ? <CharacterPage S={S} who={who} onWeapon={onWeapon} /> : landing", 'landing')],
  ['B8 the passport drawn for anyone', 'B8', swap('card', "return who != null ? <CharacterPage S={S} who={who} onWeapon={onWeapon} /> : landing;", 'return <CharacterPage S={S} who={who == null ? null : who} onWeapon={onWeapon} />;')],
  ['B10 the fallback left at \'character\'', 'B10', swap('card', 'const door = broSelfPage(id, who);', "const door = BRO_HUB_PAGES[id] || 'character';")],
];
for (const [name, want, X] of TPLANTS) {
  if (!X) { check(`4b. plant ${name}: its anchor is in the file`, false, 'the plant\'s text is not in the file: write it again'); continue; }
  let res;
  try { res = pageSuite(X); } catch (e) { res = [{ name: want + ' (threw: ' + e.message + ')', ok: false }]; }
  const red = res.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`4b. plant ${name}: turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}
/* the rules' own plants: broSelfPage and broStrip, written the tired way */
const RPLANTS = [
  ['B7 Character never another player\'s', 'B7', () => { I_SELF = { page: (id, w) => (broSelfPage(id, null)) }; return pageSuite(SRC); }],
  ['B8 your Character drawn as the passport', 'B8', () => { I_SELF = { page: (id, w) => (id === 'broCharacter' ? 'character' : broSelfPage(id, w)) }; return pageSuite(SRC); }],
  ['B10 an unknown id falls to Character', 'B10', () => { I_SELF = { page: (id, w) => broSelfPage(id, w) || 'character' }; return pageSuite(SRC); }],
  ['B5 Feats\' Titles door dropped', 'B5', () => stripSuite({ strip: broStrip, featsDoors: FEATS_DOORS.filter((x) => x.id !== 'titles') })],
  ['B5 the strip\'s title entry left beside it', 'B5', () => stripSuite({ strip: (r, w) => [...broStrip(r, w), { id: 'title', k: 'charPage.title', v: 'Blooded', opens: PASSPORT_DOORS.titles }] })],
  ['B6 a value on its way shown as 0', 'B6', () => stripSuite({ strip: (r, w) => broStrip(r, w).map((x) => (x.loading ? { ...x, loading: false, v: 0 } : x)) })],
];
for (const [name, want, run] of RPLANTS) {
  let res;
  try { res = run(); } catch (e) { res = [{ name: want + ' (threw: ' + e.message + ')', ok: false }]; }
  I_SELF = { page: broSelfPage };
  const red = res.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`4b. plant ${name}: turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
