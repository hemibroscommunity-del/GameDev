/* The quest journal's words -- v2.3.3944 (src/game/questJournal.js;
 * docs/specs/quest-journal.md).
 *
 * The owner, 2026-11-02: "Make the 'quest' button in the menu actually useful
 * ... clear which quest they are on, what's required, where to go, who was
 * talked to and what to do next, etc. show rewards preview, what was handed
 * during the quest too.  Also keep track of achievement points gained from
 * each quest."
 *
 * Drives the import-free rules module with the REAL quest table
 * (src/data/gameSystems.js QUEST_CHAINS), the real land names and the real
 * Wheel's lands (src/data/zones.js), the real givers' places (read from
 * src/game/tour.js's source: it imports through the '@/' alias node cannot
 * follow) and the real points a hand-in pays (src/data/items.js, held to the
 * worker by mirror-audit), then reads the page wiring's source.
 */
import fs from 'fs';
import { QUEST_CHAINS, QUEST_TOUR, questSteps, questCountText } from '../../src/data/gameSystems.js';
import { ZONES } from '../../src/data/zones.js';
import { QUEST_AP_REWARD } from '../../src/data/items.js';
import * as J from '../../src/game/questJournal.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');

/* tour.js's TOUR_MEET, read from its source (a frozen object of plain strings) */
const tourSrc = read('../../src/game/tour.js');
const meetSrc = (tourSrc.match(/export const TOUR_MEET = Object\.freeze\((\{[\s\S]*?\})\);/) || [])[1];
const MEET = meetSrc ? Function('return ' + meetSrc)() : {};
check('setup: TOUR_MEET read from tour.js (Mayor Bro at the Town Hall)', MEET['Mayor Bro'] === 'at the Town Hall', MEET);

/* the context the page hands the rules: land names and which way each lies */
const z = ZONES.wheel;
const c = (z.w * 32) / 2;
const landNames = {}, landDirs = {};
for (const id of Object.keys(ZONES)) if (ZONES[id] && typeof ZONES[id].name === 'string') landNames[id] = ZONES[id].name;
for (const id of Object.keys(z.lands)) landDirs[id] = J.compassWord(z.lands[id][0] - c, z.lands[id][1] - c);
const ctx = { home: z.name, landNames, landDirs, meet: MEET, canMap: true, roadTo: null };

// ── 1. the compass ──
{
  check('compass: east, south (y grows down), northwest, and nothing for no direction',
    J.compassWord(10, 0) === 'east' && J.compassWord(0, 10) === 'south' && J.compassWord(0, -10) === 'north'
      && J.compassWord(-10, -10) === 'northwest' && J.compassWord(0, 0) === '' && J.compassWord(NaN, 1) === '');
  const words = Object.values(landDirs);
  check(`compass: each of the world's ${words.length} lands lies a different way from BroTown (eight spokes, eight words)`,
    words.length === 8 && new Set(words).size === 8 && words.every(Boolean), landDirs);
  check('the world reads "BroTown" (never the code\'s name for it)', ctx.home === 'BroTown', ctx.home);
}

// ── 2. the counts ──
{
  const q = QUEST_CHAINS.tut_1;
  check('count: tut_1 with 3 Slime Remains in the bag is 3/4', JSON.stringify(J.journalCount(q, { inventory: { 'slime-remnants': 3 } })) === '{"have":3,"n":4}');
  check('count: ...never more than asked (9 -> 4/4), none in the bag is 0/4',
    J.journalCount(q, { inventory: { 'slime-remnants': 9 } }).have === 4 && J.journalCount(q, {}).have === 0 && J.journalCount(q, null).have === 0);
  check('count: a quest that counts nothing has no count (life_1, race_1)',
    J.journalCount(QUEST_CHAINS.life_1, {}) === null && J.journalCount(QUEST_CHAINS.race_1, {}) === null);
  const farm = QUEST_CHAINS.farm_1;
  check('count: a quest the worker counts reads rpg._questKills (farm_1: 2 of 3 carrots)',
    J.journalCount(farm, { _questKills: { farm_1: 2 } }).have === 2 && J.journalCount(farm, { _questKills: { farm_1: 2 } }).n === 3);
  check('count: a counter on the prototype is not a count', J.journalCount(q, { inventory: Object.create({ 'slime-remnants': 4 }) }).have === 0);
  /* the same number the log's old " (2/4)" said, for every quest that counts */
  const off = [];
  for (const [qid, quest] of Object.entries(QUEST_CHAINS)) {
    if (!quest.need) continue;
    for (const have of [0, 1, 3, 99]) {
      const rpg = { inventory: quest.need.key ? { [quest.need.key]: have } : {}, _questKills: { [qid]: have } };
      const n = J.journalCount(quest, rpg);
      if (' (' + n.have + '/' + n.n + ')' !== questCountText(quest, rpg)) off.push({ qid, have });
    }
  }
  check('count: every counting quest\'s count is questCountText\'s, at 0, 1, 3 and 99', off.length === 0, off);
  const nouns = Object.values(QUEST_CHAINS).filter((x) => x.need).map((x) => [x.id, J.countNoun(x)]);
  check('count: every counting quest names what it counts, from its own objective', nouns.every(([, w]) => !!w), nouns);
  check('count: tut_1 counts "Slime Remains" and the Mayor\'s errands all count Remains (never remnants)',
    J.countNoun(QUEST_CHAINS.tut_1) === 'Slime Remains'
      && ['tut_1', 'tut_2', 'tut_3', 'tut_4'].every((k) => /Remains$/.test(J.countNoun(QUEST_CHAINS[k]))), nouns);
  check('count: "0/4 Slime Remains"', J.countText(q, { have: 0, n: 4 }) === '0/4 Slime Remains');
}

// ── 3. the status, the focus, the order ──
{
  check('status: handed in is done, the worker\'s complete is ready, a met objective is ready, an offer is available',
    J.journalStatus('turnedIn') === 'done' && J.journalStatus('complete') === 'ready' && J.journalStatus('active', true) === 'ready'
      && J.journalStatus('active', false) === 'active' && J.journalStatus(undefined, false, true) === 'available'
      && J.journalStatus(undefined, false, false) === 'locked');
  check('focus: the tracked quest while it is in hand', J.focusQuestId(['tut_1', 'smith_1'], 'tut_1') === 'tut_1');
  check('focus: else the newest one in hand (the last taken)', J.focusQuestId(['tut_1', 'smith_1'], 'wood_1') === 'smith_1' && J.focusQuestId(['tut_1', 'smith_1'], null) === 'smith_1');
  check('focus: nothing in hand, nothing', J.focusQuestId([], 'tut_1') === null && J.focusQuestId(null, null) === null);
  const ord = J.activeOrder([{ id: 'a' }, { id: 'b', ready: true }, { id: 'c' }], 'c').map((r) => r.id).join(',');
  check('list: the tracked quest first, then the ready ones, then the rest', ord === 'c,b,a', ord);
  check('list: untracked, ready first, the rest in order', J.activeOrder([{ id: 'a' }, { id: 'b', ready: true }, { id: 'c' }], null).map((r) => r.id).join(',') === 'b,a,c');
}

// ── 4. the page: Into the Blue, just taken ──
const after1 = { npc: 'Blacksmith Bro', title: QUEST_CHAINS.smith_1.title, meet: MEET['Blacksmith Bro'], more: 4 };
{
  const p = J.journalPage({ quest: QUEST_CHAINS.tut_1, status: 'active', rpg: { inventory: {} }, steps: null, ap: QUEST_AP_REWARD, after: after1, ctx });
  check('tut_1 taken: NOW is the objective with 0/4 Slime Remains and an empty bar',
    p.now.text === QUEST_CHAINS.tut_1.desc && p.now.count && p.now.count.text === '0/4 Slime Remains' && p.now.frac === 0, p.now);
  check(`tut_1 taken: WHERE is "${p.where && p.where.text}", with Show on map`,
    !!p.where && /^Earth Forest, \w+ of BroTown$/.test(p.where.text) && p.where.map === true, p.where);
  check('tut_1 taken: WHO is Mayor Bro, "Talked to Mayor Bro ✓"', p.who.npc === 'Mayor Bro' && p.who.talked === 'Talked to Mayor Bro ✓' && !p.who.todo, p.who);
  check('tut_1 taken: GIVEN TO YOU still shows the sword and shield (it vanished once taken before)',
    !!p.given && p.given.items.map((i) => i.label).join('|') === 'Copper Great Sword|Pine Shield' && /gave you these/.test(p.given.note), p.given);
  check('tut_1 taken: REWARD is 25 gold, no XP, the bow and the staff, and +5 Achievement Points',
    p.reward.gold === 25 && p.reward.xp === 0 && p.reward.items.map((i) => i.label).join('|') === 'Pine Bow|Pine Staff'
      && p.reward.apText === '+' + QUEST_AP_REWARD + ' Achievement Points' && QUEST_AP_REWARD === 5, p.reward);
  check('tut_1 taken: NEXT says who comes after, and where ("Then: talk to Blacksmith Bro at the forge for “Heavy Metal”.")',
    p.next.text === 'Then: talk to Blacksmith Bro at the forge for “Heavy Metal”.' && p.next.more === 4, p.next);
  check('the "more" line: one and several', J.moreLine(1) === '1 more person has a quest: look for a gold ! on your map.'
    && /^4 more people/.test(J.moreLine(4)) && J.moreLine(0) === '');
  const rdy = J.journalPage({ quest: QUEST_CHAINS.tut_1, status: 'ready', rpg: { inventory: { 'slime-remnants': 4 } }, ap: 5, after: after1, ctx });
  check('tut_1 ready: NOW says hand it in (tap him to talk), 4/4 and a full bar; WHERE is Mayor Bro at the Town Hall',
    /hand it in to Mayor Bro/.test(rdy.now.text) && /^Tap Mayor Bro to talk/.test(rdy.now.goal) && rdy.now.count.text === '4/4 Slime Remains' && rdy.now.frac === 1
      && rdy.where.text === 'Mayor Bro, at the Town Hall' && rdy.who.handIn === 'Hand it in to Mayor Bro', rdy);
  const done = J.journalPage({ quest: QUEST_CHAINS.tut_1, status: 'done', rpg: {}, ap: 5, after: after1, ctx });
  check('tut_1 handed in: Done, "Handed in to Mayor Bro ✓", no WHERE, "You got", and the NEXT line says Next:',
    done.statusLabel === 'Done' && done.who.handIn === 'Handed in to Mayor Bro ✓' && done.where === null
      && /^You got these from Mayor Bro/.test(done.reward.note) && /^Next: talk to Blacksmith Bro at the forge/.test(done.next.text), done);
  const offer = J.journalPage({ quest: QUEST_CHAINS.tut_1, status: 'available', rpg: {}, ap: 5, after: after1, ctx: Object.assign({}, ctx, { roadTo: 'tut_1' }) });
  check('tut_1 on offer: talk to Mayor Bro to take it; he hands you the kit when you say yes; the road leads to him',
    /^Talk to Mayor Bro/.test(offer.now.text) && /hands you these when you say yes/.test(offer.given.note) && offer.who.todo === 'Talk to Mayor Bro to start it'
      && offer.where.map === true && offer.who.talked === null, offer);
  const offer2 = J.journalPage({ quest: QUEST_CHAINS.smith_1, status: 'available', rpg: {}, ap: 5, after: null, ctx: Object.assign({}, ctx, { roadTo: 'tut_1' }) });
  check('an offer the road does not lead to has no Show on map', offer2.where.map === false && offer2.where.text === 'Blacksmith Bro, at the forge', offer2.where);
  const noMap = J.journalPage({ quest: QUEST_CHAINS.tut_1, status: 'active', rpg: {}, ap: 5, ctx: Object.assign({}, ctx, { canMap: false }) });
  check('outside the world map\'s reach, no Show on map', noMap.where.map === false);
  check('nothing after: "Then: that is the last quest for now."', J.nextLine(QUEST_CHAINS.tut_4, 'active', null, ctx).text === 'Then: that is the last quest for now.');
  check('a quest still in hand comes next: "carry on with"', J.nextLine(QUEST_CHAINS.tut_1, 'done', { carryOn: 'Heavy Metal' }, ctx).text === 'Next: carry on with “Heavy Metal”.');
}

// ── 5. where each kind of quest leads ──
{
  const where = (qid, rpg) => {
    const q = QUEST_CHAINS[qid];
    const st = questSteps(q, rpg || {}, null);
    return J.whereLine(q, 'active', st, ctx);
  };
  check('where: a step at a resource (smith_1: mine copper) is the ore rocks outside BroTown', where('smith_1').text === 'Ore rocks, just outside BroTown');
  check('where: a door (smith_2) is the forge, in BroTown', where('smith_2').text === 'At the forge, in BroTown');
  check('where: beast_1 is the Woodworker, in BroTown', where('beast_1').text === 'At the Woodworker, in BroTown');
  check('where: farm_1\'s steps are at the Feed & Seed', where('farm_1').text === 'At the Feed & Seed, in BroTown');
  check('where: mayor_2 (kill 5 monsters) is out in the lands', /^Out in the lands/.test(where('mayor_2').text));
  check('where: Lil Bro\'s race is at Lil Bro, on the town square', where('race_1').text === 'Lil Bro, on the town square', where('race_1'));
  check('where: the dungeon (mayor_3) is in the Earth Forest', /^A dungeon in the Earth Forest, \w+ of BroTown$/.test(where('mayor_3').text), where('mayor_3'));
  check('where: Frost Ridge (tut_2) names its land and its way', /^Frost Ridge, \w+ of BroTown$/.test(where('tut_2').text));
  const fire = J.whereLine(QUEST_CHAINS.fish_1, 'active', [{ label: 'a', done: true }, { label: 'b', done: false, current: true }], ctx);
  check('where: a step done anywhere (light a fire) says so and has no road', fire.text === 'Wherever you are' && fire.map === false);
  const sm = J.journalPage({ quest: QUEST_CHAINS.smith_1, status: 'active', rpg: { inventory: { ore_copper_ore: 2 } },
    steps: questSteps(QUEST_CHAINS.smith_1, { inventory: { ore_copper_ore: 2 } }, null), ap: 5, ctx });
  check('a quest with steps: NOW is the current step, the objective under it; WHO lists each step with its tick',
    sm.now.text === sm.who.steps.find((s) => s.current).label && sm.now.goal === QUEST_CHAINS.smith_1.desc
      && sm.who.steps.length === 3 && sm.who.steps[0].done && !sm.who.steps[2].done && sm.now.count.text === '2/5 Copper Ore', sm);
}

// ── 6. every quest a player can meet, in every state: plain words only ──
{
  const bad = [];
  const ids = Array.from(new Set([...QUEST_TOUR, ...Object.keys(QUEST_CHAINS)]));
  for (const qid of ids) {
    const q = QUEST_CHAINS[qid];
    for (const status of ['available', 'active', 'ready', 'done', 'locked']) {
      const rpg = { inventory: {}, _questKills: {} };
      const steps = (status === 'active' || status === 'ready') ? questSteps(q, rpg, null) : null;
      const p = J.journalPage({ quest: q, status, rpg, steps, ap: 5, after: after1, ctx });
      const text = JSON.stringify(p);
      if (/Wheel|remnant|undefined|null,"text"|NaN|\[object/i.test(text.replace(/"icon":"[^"]*"/g, '').replace(/"(where|given|next)":null/g, ''))) bad.push({ qid, status, text: text.slice(0, 200) });
      if (!p.now || !p.now.text || !p.who || !p.reward || !p.next) bad.push({ qid, status, missing: true });
      if (!p.reward.apText) bad.push({ qid, status, ap: false });
    }
  }
  check(`every quest (${ids.length}) in every state builds a page in plain words: never "Wheel", never "remnants", no holes, and every one pays its +5 AP`, bad.length === 0, bad.slice(0, 4));
}

// ── 7. the points ──
{
  const qs = { tut_1: 'turnedIn', smith_1: 'turnedIn', smith_2: 'turnedIn', fish_1: 'turnedIn', tut_2: 'turnedIn', farm_1: 'turnedIn', wood_1: 'turnedIn', wood_2: 'turnedIn', farm_2: 'active', bogus: 'turnedIn' };
  check('points: eight quests handed in pay 40 (a stray id counts nothing, one in hand nothing)',
    J.questApTotal(qs, QUEST_AP_REWARD, QUEST_CHAINS) === 40 && J.questApTotal(qs, 5) === 45, J.questApTotal(qs, QUEST_AP_REWARD, QUEST_CHAINS));
  check('points: none handed in, 0; no record, 0', J.questApTotal({}, 5, QUEST_CHAINS) === 0 && J.questApTotal(null, 5) === 0);
  const proto = JSON.parse('{"__proto__":"turnedIn","tut_1":"turnedIn"}');
  check('points: a "__proto__" key is not a quest', J.questApTotal(proto, 5, QUEST_CHAINS) === 5);
  check('points: "Achievement Points from quests: 40"', J.apTotalText(40) === 'Achievement Points from quests: 40' && J.apTotalText(undefined) === 'Achievement Points from quests: 0');
  check('an offer\'s row says who has it and where', J.offerWhere(QUEST_CHAINS.farm_1, ctx) === 'Farmer Bro, at the Feed & Seed'
    && J.offerWhere(QUEST_CHAINS.tut_1, Object.assign({}, ctx, { meet: {} })) === 'Mayor Bro, in BroTown');
}

// ── 8. the module and the wiring ──
{
  const mod = read('../../src/game/questJournal.js');
  /* v2.3.4048: but the townsfolk's nicknames (data/folkNames.js), itself import-free */
  const imports = mod.match(/^\s*import\s.*$/gm) || [];
  check('questJournal.js has no imports but the import-free folkNames.js (node reads it as it is)',
    imports.every((l) => /from '\.\.\/data\/folkNames\.js'/.test(l)) && !/^\s*import\s/m.test(read('../../src/data/folkNames.js')), imports);
  check('the game\'s script is ASCII in its regular expressions (TRAPS §258)', !/new RegExp\([^)]*[^\x00-\xff]/.test(mod));
  const model = read('../../src/ui/mobile/sheet/questJournalModel.js');
  check('the page\'s points are the phone\'s QUEST_AP_REWARD (data/items.js, held to the worker by mirror-audit)',
    /import \{ QUEST_AP_REWARD \} from '\.\.\/\.\.\/\.\.\/data\/items\.js'/.test(model) && /ap: QUEST_AP_REWARD/.test(model));
  check('NEXT reads the giver\'s chain, then the tour (questRoute.js tourOffer), with this quest handed in',
    /tourOffer\(sim, S\)/.test(model) && /getNpcQuest\(sim, q\.npc\)/.test(model) && /\[qid\]: QUEST_STATUS\.turnedIn/.test(model));
  check('the lands\' ways are read from the world at run time, never written in (CLAUDE.md: no Wheel coordinate in code)',
    /z\.lands/.test(model) && !/\b1\d{4}\b|\b2\d{4}\b/.test(model));
  const list = read('../../src/ui/mobile/dash/QuestsPanel.jsx');
  check('the list: the points at the top, the page it opens on, Active rows (data-quest-row) with a Track star, Available, Done with +AP',
    /data-journal-ap=/.test(list) && /<QuestJournalPage page=\{focus\}/.test(list) && /data-quest-row=\{r\.id/.test(list)
      && /data-quest-row-track=/.test(list) && /data-quest-offer-row=/.test(list) && /data-quest-done-ap=/.test(list));
  check('the list keeps the daily rewards card and the quest path switch', /<DailyRewardsCard \/>/.test(list) && /GROUND_PATH && <PathSwitch \/>/.test(list));
  const detail = read('../../src/ui/mobile/dash/QuestDetailPanel.jsx');
  check('a quest\'s page keeps Track (data-quest-track, data-quest-track-note) and the questDetailBus',
    /data-quest-track=\{tracked \? 'on' : 'off'\}/.test(detail) && /data-quest-track-note=/.test(detail) && /questDetailBus\.selected\(\)/.test(detail));
  check('a quest\'s page has no Accept and no Turn In (owner, v2.3.1704 and v2.3.2195)', !/quest_accept|quest_turn_in|turnInQuest|acceptQuest/.test(detail + list));
  const page = read('../../src/ui/mobile/dash/QuestJournalPage.jsx');
  check('Show on map opens the world map through its own opener (WorldMapOverlay openWorldMap), the quest tracked first',
    /import \{ openWorldMap \} from '\.\.\/\.\.\/WorldMapOverlay\.jsx'/.test(page) && /setTrackedQuest\(page\.id\)/.test(page) && /return openWorldMap\(\)/.test(page));
  check('the page says "click" on a computer (deskWords on NOW, WHERE, the steps and NEXT)',
    (page.match(/deskWords\(/g) || []).length >= 5);
  check('the page is laid out from its own measured box (a ResizeObserver), never the window', /ResizeObserver/.test(page) && !/innerWidth/.test(page + list));
  check('a tap that replaces the page swallows the click that follows (TRAPS §247)', /swallowTapClick\(e\)/.test(page));
  const sizes = (page + list).match(/fontSize: (\d+(?:\.\d+)?)/g).map((s) => Number(s.split(': ')[1]));
  check(`readable on a phone: no text under 13 px on the journal (smallest ${Math.min(...sizes)})`, Math.min(...sizes) >= 13, sizes);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
