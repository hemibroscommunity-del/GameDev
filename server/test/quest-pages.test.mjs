/* ═══ v2.3.6620: THE QUESTS TAB IN PAGES, ITS RULES (card QP) ═══
 *
 * src/game/questPages.js decides what the Quests tab shows (ONE field,
 * `view`, changed by ONE function), which quest it is about, the steps of a
 * quest's journey and the state of each, the reward tiles, and when the three
 * pages stand side by side.  This drives it with the journal's REAL pages
 * (game/questJournal.js journalPage over the real quest table), so the steps
 * it draws are the words the phone draws.
 *
 *   1. the one transition: every tap from every view, and what it leaves;
 *   2. which quest: picked by hand while it stays where it was picked, else
 *      the quest you are on;
 *   3. what is drawn: a page needs a quest, Daily needs the daily rewards;
 *      the lit tab; the marks; side by side from 600 px;
 *   4. the journey of Into the Blue taken, ready, handed in, and on offer;
 *      of a quest with steps; where it opens;
 *   5. the reward tiles in the mockup's order; the picker's count;
 *   6. the source: one field, one transition, no imports; the page draws
 *      from it and keeps the old page behind `?questpages=0`.
 *
 * MUTATION PASS (v2.3.6620, 2026-11-25): every comparison, && and ||, true
 * and false, number, quoted word, `!`, null, `.length` and the middle of
 * every `? :` of questPages.js's code lines was changed one at a time (258
 * mutants) and this suite run against each: all 258 are killed, none
 * survives (the first pass left 18; the checks marked "every step", "with
 * steps", "a reward of 1", "one quest done" and "wins over a done one" are
 * theirs).
 */
import fs from 'fs';
import { QUEST_AP_REWARD } from '../../src/data/items.js';
import * as J from '../../src/game/questJournal.js';
import * as Q from '../../src/game/questPages.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const step = (at, tap) => Q.questPagesStep(at, tap);

/* ── 1. the one transition ── */
{
  const start = Q.questPagesStart();
  check('it starts on page 1 with nothing picked', eq(start, { view: 'quest', pick: null }), start);
  check('the lists: three pages, six views, three tabs, side by side from 600',
    eq(Q.PAGES, ['quest', 'journey', 'rewards']) && eq(Q.VIEWS, ['quest', 'journey', 'rewards', 'pick', 'daily', 'done']) && eq(Q.TABS, ['active', 'daily', 'done']) && Q.SIDE_BY_SIDE_W === 600);
  check('the lists cannot be changed', Object.isFrozen(Q.PAGES) && Object.isFrozen(Q.VIEWS) && Object.isFrozen(Q.TABS));

  const picked = { view: 'rewards', pick: { id: 'beast_1', group: 'active' } };
  const done = { view: 'done', pick: { id: 'tut_1', group: 'done' } };
  check('open: page 1, a quest picked by hand kept', eq(step(picked, { kind: 'open' }), { view: 'quest', pick: { id: 'beast_1', group: 'active' } }));
  check('open: a done quest picked is dropped (the tab opens on your quest)', eq(step(done, { kind: 'open' }), { view: 'quest', pick: null }));
  check('open: nothing picked stays nothing', eq(step({ view: 'daily', pick: null }, { kind: 'open' }), { view: 'quest', pick: null }));
  check('a road that names a quest: its page 1, with its group', eq(step(picked, { kind: 'quest', id: 'tut_1', group: 'active' }), { view: 'quest', pick: { id: 'tut_1', group: 'active' } }));
  check('a road with no group: the group left unknown (null)', eq(step(start, { kind: 'quest', id: 'tut_1' }), { view: 'quest', pick: { id: 'tut_1', group: null } }));
  check('a road with no id, or an empty one, changes nothing',
    step(picked, { kind: 'quest' }) === picked && step(picked, { kind: 'quest', id: '' }) === picked && step(picked, { kind: 'choose', id: 7 }) === picked);
  check('choose: a quest from the picker or Completed opens on page 1', eq(step({ view: 'pick', pick: null }, { kind: 'choose', id: 'mayor_2', group: 'available' }), { view: 'quest', pick: { id: 'mayor_2', group: 'available' } }));
  check('tab Daily and tab Completed keep what is picked', eq(step(picked, { kind: 'tab', tab: 'daily' }), { view: 'daily', pick: picked.pick }) && eq(step(picked, { kind: 'tab', tab: 'done' }), { view: 'done', pick: picked.pick }));
  check('tab Active: page 1, the quest picked kept', eq(step(picked, { kind: 'tab', tab: 'active' }), { view: 'quest', pick: picked.pick }));
  check('tab Active from a done quest: your quest, not the done one', eq(step(done, { kind: 'tab', tab: 'active' }), { view: 'quest', pick: null }));
  check('tab Active with nothing picked', eq(step({ view: 'done', pick: null }, { kind: 'tab', tab: 'active' }), { view: 'quest', pick: null }));
  check('an unknown tab changes nothing', step(picked, { kind: 'tab', tab: 'nope' }) === picked);
  for (const p of Q.PAGES) check(`the mark of ${p} opens it`, eq(step(picked, { kind: 'mark', page: p }), { view: p, pick: picked.pick }));
  check('a mark of no page changes nothing', step(picked, { kind: 'mark', page: 'pick' }) === picked && step(picked, { kind: 'mark', page: 'daily' }) === picked);
  check('what to do now opens the journey', eq(step({ view: 'quest', pick: null }, { kind: 'now' }), { view: 'journey', pick: null }));
  check('the rewards row opens page 3', eq(step({ view: 'quest', pick: picked.pick }, { kind: 'rewards' }), { view: 'rewards', pick: picked.pick }));
  check('the head opens the picker when there is more than one quest', eq(step(picked, { kind: 'head', choices: 2 }), { view: 'pick', pick: picked.pick }));
  check('the head with one quest (or none) does nothing', step(picked, { kind: 'head', choices: 1 }) === picked && step(picked, { kind: 'head' }) === picked);
  check('back from the picker: page 1', eq(step({ view: 'pick', pick: picked.pick }, { kind: 'back' }), { view: 'quest', pick: picked.pick }));
  check('back from a done quest\'s page: Completed, nothing picked', eq(step({ view: 'journey', pick: { id: 'tut_1', group: 'done' } }, { kind: 'back' }), { view: 'done', pick: null }));
  check('back anywhere else changes nothing', step(picked, { kind: 'back' }) === picked && step({ view: 'quest', pick: null }, { kind: 'back' }).view === 'quest');
  check('an unknown tap, or none, changes nothing', step(picked, { kind: 'swipe' }) === picked && step(picked, null) === picked);
  check('a view that is not one starts again', eq(step({ view: 'map', pick: null }, { kind: 'nope' }), Q.questPagesStart()) && eq(step(null, { kind: 'nope' }), Q.questPagesStart()));
  const before = JSON.stringify(picked);
  step(picked, { kind: 'mark', page: 'quest' }); step(picked, { kind: 'open' });
  check('it never changes what it is handed', JSON.stringify(picked) === before);
}

/* ── 2. which quest ── */
{
  const groups = { tut_1: 'active', beast_1: 'active', mayor_2: 'available', old: 'done' };
  const g = (id) => groups[id] || null;
  check('picked and still where it was: that one', eq(Q.shownQuest({ pick: { id: 'beast_1', group: 'active' } }, g, 'tut_1'), { id: 'beast_1', group: 'active' }));
  check('picked but it changed hands: the quest you are on', eq(Q.shownQuest({ pick: { id: 'mayor_2', group: 'active' } }, g, 'tut_1'), { id: 'tut_1', group: 'active' }));
  check('nothing picked: the quest you are on, with its group', eq(Q.shownQuest({ pick: null }, g, 'mayor_2'), { id: 'mayor_2', group: 'available' }));
  check('nothing at all: none', Q.shownQuest({ pick: null }, g, null) === null && Q.shownQuest(null, g, '') === null);
  check('a pick with no id is not one', eq(Q.shownQuest({ pick: { id: 5, group: null } }, () => null, 'tut_1'), { id: 'tut_1', group: null }));
  check('no group finder: the quest you are on, group unknown', eq(Q.shownQuest({ pick: { id: 'x', group: null } }, null, 'tut_1'), { id: 'x', group: null }));
}

/* ── 3. what is drawn ── */
{
  const quest = { id: 'tut_1', group: 'active' };
  for (const v of ['quest', 'journey', 'rewards', 'pick']) check(`${v} with a quest: ${v}`, Q.shownView({ view: v }, { quest }) === v);
  check('a page with no quest: Completed when something is done, else none',
    Q.shownView({ view: 'journey' }, { quest: null, doneCount: 2 }) === 'done' && Q.shownView({ view: 'quest' }, { quest: null, doneCount: 0 }) === 'none');
  check('Daily with the daily rewards: Daily', Q.shownView({ view: 'daily' }, { quest, dailyOn: true }) === 'daily');
  check('Daily without them: page 1, or none', Q.shownView({ view: 'daily' }, { quest, dailyOn: false }) === 'quest' && Q.shownView({ view: 'daily' }, { quest: null, dailyOn: false }) === 'none');
  check('one quest done is enough for Completed', Q.shownView({ view: 'quest' }, { quest: null, doneCount: 1 }) === 'done');
  check('Completed: always', Q.shownView({ view: 'done' }, { quest: null }) === 'done');
  check('no view, or a wrong one: page 1', Q.shownView(null, { quest }) === 'quest' && Q.shownView({ view: 'map' }, { quest }) === 'quest' && Q.shownView({ view: 'quest' }) === 'none');
  check('the lit tab', Q.litTab('daily', 'active') === 'daily' && Q.litTab('done', null) === 'done' && Q.litTab('journey', 'done') === 'done'
    && Q.litTab('quest', 'active') === 'active' && Q.litTab('pick', 'done') === 'active' && Q.litTab('rewards', 'available') === 'active');
  check('side by side from 600 px of the page\'s own box (0: not measured yet)', Q.pagesSideBySide(600) && !Q.pagesSideBySide(599) && !Q.pagesSideBySide(0) && !Q.pagesSideBySide(undefined));
  check('the marks: the three pages, the open one lit', eq(Q.pageMarks('journey'), [{ page: 'quest', lit: false }, { page: 'journey', lit: true }, { page: 'rewards', lit: false }]));
  check('no mark lit off the pages', Q.pageMarks('done').every((m) => !m.lit));
}

/* ── 4. the journey, from the journal's real page ── */
const ctx = { home: 'BroTown', landNames: { verdant: 'Earth Forest' }, landDirs: { verdant: 'west' }, meet: { 'Mayor Bro': 'at the Town Hall' }, canMap: true, roadTo: null };
/* Into the Blue (tut_1) as the quest table writes it (the suites read code by system, never the big
   table by its path: tools/guards/tests-by-system); mp-questpages plays the real one */
const tut = {
  id: 'tut_1', npc: 'Mayor Bro', title: 'Into the Blue', zone: 'verdant',
  desc: 'Bring 4 Slime Remains from the Earth Forest.', need: { key: 'slime-remnants', n: 4 },
  reward: { gold: 25, xp: 0 }, next: null,
  gives: [
    { when: 'accept', icon: '/icons/items/great-sword-copper.webp', label: 'Copper Great Sword' },
    { when: 'accept', icon: '/icons/items/shield.webp', label: 'Pine Shield' },
    { when: 'complete', icon: '/icons/items/bow.webp', label: 'Pine Bow' },
    { when: 'complete', icon: '/icons/items/staff.webp', label: 'Pine Staff' },
  ],
};
const pageOf = (status, rpg, steps, quest = tut) => J.journalPage({ quest, status, rpg: rpg || {}, steps: steps || null, ap: QUEST_AP_REWARD, after: null, ctx });
{
  const p = pageOf('active', { inventory: { 'slime-remnants': 1 } });
  const s = Q.journeySteps(p, tut.desc);
  check(`Into the Blue taken: three steps (${s.map((x) => x.kind + ':' + x.state).join(', ')})`, eq(s.map((x) => x.kind + ':' + x.state), ['talk:done', 'step:current', 'handin:todo']), s);
  check(`  the giver talked to, with what he handed over ("${s[0].text}", ${s[0].items.map((i) => i.label).join(' and ')})`,
    /Talked to Mayor Bro ✓/.test(s[0].text) && s[0].items.some((i) => /Copper Great Sword/.test(i.label)) && s[0].items.some((i) => /Pine Shield/.test(i.label)) && /gave you these/.test(s[0].sub || ''), s[0]);
  check(`  the step in hand: the objective, its place and count ("${s[1].text}", "${s[1].where}", "${s[1].count}")`,
    s[1].text === tut.desc && /Earth Forest, west of BroTown/.test(s[1].where) && s[1].count === '1/4 Slime Remains', s[1]);
  check('  the hand-in still ahead: no words of the journal\'s (the page says "Hand it in to Mayor Bro"), no place', s[2].text === null && s[2].where === null && s[2].sub === null);
  check('  the journey opens on the step in hand', Q.journeyFocus(s) === 1);

  const r = Q.journeySteps(pageOf('ready', { inventory: { 'slime-remnants': 4 } }), tut.desc);
  check(`ready: the objective done, the hand-in in hand (${r.map((x) => x.state).join(', ')})`, eq(r.map((x) => x.state), ['done', 'done', 'current']), r);
  check(`  the hand-in says to whom, how, and where ("${r[2].text}"; "${r[2].sub}")`, /Hand it in to Mayor Bro/.test(r[2].text) && /Tap Mayor Bro to talk/.test(r[2].sub) && /Mayor Bro, at the Town Hall/.test(r[2].where || ''), r[2]);
  check('  a step done carries no count or place', r[1].count === null && r[1].where === null);
  check('  it opens on the hand-in', Q.journeyFocus(r) === 2);

  const d = Q.journeySteps(pageOf('done', {}), tut.desc);
  check(`handed in: every step done (${d.map((x) => x.state).join(', ')})`, eq(d.map((x) => x.state), ['done', 'done', 'done']) && /Handed in to Mayor Bro ✓/.test(d[2].text), d);
  check('  it opens on the last step', Q.journeyFocus(d) === 2);

  const a = Q.journeySteps(pageOf('available', {}), tut.desc);
  check(`on offer: talk to him first, the rest ahead (${a.map((x) => x.state).join(', ')})`, eq(a.map((x) => x.state), ['current', 'todo', 'todo']) && /Talk to Mayor Bro/.test(a[0].text), a);
  check('  what he will hand over is shown before you say yes', a[0].items.length === 2 && /hands you these/.test(a[0].sub));
  const l = Q.journeySteps(pageOf('locked', {}), tut.desc);
  check(`not open yet: nothing in hand (${l.map((x) => x.state).join(', ')})`, eq(l.map((x) => x.state), ['todo', 'todo', 'todo']), l);
  check('a step with no desc reads empty words, never a crash', Q.journeySteps(pageOf('locked', {}), undefined)[1].text === '');

  const steps = [{ label: 'Make a box trap', done: true }, { label: 'Set it', current: true }, { label: 'Catch a beast' }];
  const m = Q.journeySteps(pageOf('active', {}, steps), 'x');
  check(`a quest with steps: each its own, the one in hand gold (${m.map((x) => x.state).join(', ')})`,
    eq(m.map((x) => x.kind + ':' + x.state), ['talk:done', 'step:done', 'step:current', 'step:todo', 'handin:todo']) && m[2].text === 'Set it', m);
  check('  only the step in hand carries the place', m[1].where === null && m[2].where !== null && m[3].where === null);
  check('  ready: every step done', Q.journeySteps(pageOf('ready', {}, steps), 'x').slice(1, 4).every((x) => x.state === 'done'));
  check('no page, no steps', eq(Q.journeySteps(null), []) && eq(Q.journeySteps({}), []) && Q.journeyFocus([]) === -1 && Q.journeyFocus(null) === -1);
  check('  every step: a talk carries no count or place, a step no sub, a hand-in no count',
    s[0].count === null && s[0].where === null && s[1].sub === null && s[2].count === null && m[1].sub === null && m[2].sub === null);
  check('  with steps, only the step in hand carries the count', m[1].count === null && m[2].count === '0/4 Slime Remains' && m[3].count === null && m[4].count === null);
  check('  on offer, the journey opens on talking to him (the first step)', Q.journeyFocus(a) === 0);
  const bare = { status: 'active', who: { talked: 'Talked to X ✓', steps: [] }, given: null, now: { text: 'Do it', count: null }, where: null };
  const b = Q.journeySteps(bare, 'Do it');
  check('a quest that hands nothing over, counts nothing and names no place: no sub, no items, no count, no place',
    b[0].sub === null && eq(b[0].items, []) && b[1].count === null && b[1].where === null, b);
  check('the step in hand wins over a done one, wherever it stands', Q.journeyFocus([{ state: 'current' }, { state: 'done' }]) === 0);
  check('no step in hand and none done: the first', Q.journeyFocus([{ state: 'todo' }, { state: 'todo' }]) === 0);
}

/* ── 5. the tiles and the picker ── */
{
  const p = pageOf('active', {});
  const t = Q.rewardTiles(p.reward);
  check(`Into the Blue's rewards in the mockup's order (${t.map((x) => x.kind + (x.n || x.label)).join(', ')})`,
    eq(t.map((x) => x.kind), ['gold', 'ap', 'item', 'item']) && t[0].n === 25 && t[1].n === QUEST_AP_REWARD && /Pine Bow/.test(t[2].label) && /Pine Staff/.test(t[3].label) && !!t[2].icon, t);
  const x = Q.rewardTiles({ gold: 0, xp: 40, ap: 5, items: [{ icon: null, label: 'A' }, null, { icon: null, label: '' }], itemText: 'pickaxe' });
  check('XP after gold, before the points; a reward named with no picture last; empty items dropped',
    eq(x, [{ kind: 'xp', n: 40 }, { kind: 'ap', n: 5 }, { kind: 'item', icon: null, label: 'A' }, { kind: 'item', icon: null, label: 'pickaxe' }]), x);
  check('a reward of 1 is a tile (gold, XP, points)', eq(Q.rewardTiles({ gold: 1, xp: 1, ap: 1, items: [] }).map((x) => x.kind), ['gold', 'xp', 'ap']));
  check('no reward, no tiles', eq(Q.rewardTiles(null), []) && eq(Q.rewardTiles({ gold: 0, xp: 0, ap: 0 }), []));
  check('the picker counts the quests in hand and on offer', Q.pickChoices({ active: [1, 2], available: [3] }) === 3 && Q.pickChoices({ active: [1] }) === 1 && Q.pickChoices({ available: [1] }) === 1 && Q.pickChoices(null) === 0);
}

/* ── 6. the source ── */
{
  const src = read('../../src/game/questPages.js');
  check('the rules module has no imports (node runs it)', !/^\s*import\s/m.test(src));
  check('what is shown is one field changed by one function', (src.match(/view:/g) || []).length >= 10 && (src.match(/export function questPagesStep/g) || []).length === 1);
  const page = read('../../src/ui/mobile/dash/QuestPages.jsx');
  check('the page changes its view only through the transition', /questPagesStep\(lastAt, t\)/.test(page) && !/view:\s*'/.test(page.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('the page reads the switch, and the old page stays behind it',
    /sw\('questpages'\)/.test(page) && /QUEST_PAGES \? <QuestPages getS=\{getState\} \/> : <OldQuestsPanel/.test(read('../../src/ui/mobile/dash/QuestsPanel.jsx'))
    && /QUEST_PAGES \? QuestDetailToPages : OldQuestDetailPanel/.test(read('../../src/ui/mobile/dash/QuestDetailPanel.jsx')));
  check('a quest\'s pages have no Accept and no Turn In (owner, v2.3.1704 and v2.3.2195)', !/quest_accept|quest_turn_in|turnInQuest|acceptQuest/.test(page));
  check('every control is touch-action: manipulation, and taps swallow the click that follows (useJournalTap)',
    (page.match(/<button/g) || []).length <= (page.match(/touchAction: 'manipulation'|\.\.\.CARD|pillHit\(/g) || []).length
    && page.slice(page.indexOf('const CARD = {'), page.indexOf('};', page.indexOf('const CARD = {'))).includes("touchAction: 'manipulation'") && /useJournalTap\(\)/.test(page));
  const sizes = page.match(/fontSize: (\d+(?:\.\d+)?)/g).map((s) => Number(s.split(': ')[1]));
  check(`readable on a phone: no text under 13 px (smallest ${Math.min(...sizes)})`, Math.min(...sizes) >= 13, sizes);
  check('laid out from its own box (railKit useBoxSize), never the window', /useBoxSize\(\)/.test(page) && !/innerWidth|innerHeight|getBoundingClientRect/.test(page));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
