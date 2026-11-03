/* The pinned quest card's words -- v2.3.3918 (src/game/questCard.js,
 * src/ui/QuestCard.jsx).
 *
 * The owner: "I'm not confident about the current quest objective of the top
 * left."  The adopted review: "The green checkmark next to 'Into the Wild'
 * makes the objective look completed, while the instruction below still says
 * to kill five monsters.  There's also no visible progress count."
 *
 *   1. a kill quest counts: mayor_2 carries its `need` (the worker's count);
 *   2. in progress: the title, "3/5", the objective; not ready;
 *   3. ready: "5/5" and "Done! Go back to Mayor Bro";
 *   4. a quest with steps shows its next step; a bag quest counts the bag;
 *   5. the card is wired: its own file, the check only when ready, a tap
 *      opens the quest's page, its top a variable a frame above can push.
 */
import fs from 'fs';
import { QUEST_CHAINS, questObjectiveDone, questSteps } from '../../src/data/gameSystems.js';
import { questCount, questCardWords } from '../../src/game/questCard.js';

let passed = 0, failed = 0;
const check = (name, ok, info) => {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); }
};
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

// ── 1. the kill quest counts ──
const m2 = QUEST_CHAINS.mayor_2;
check('1a mayor_2 counts the worker\'s kills toward 5', !!m2.need && m2.need.progress === true && m2.need.n === 5, m2.need);

// ── 2. in progress ──
{
  const rpg = { _questKills: { mayor_2: 3 }, inventory: {} };
  const done = questObjectiveDone(m2, { rpg }, rpg);
  const w = questCardWords(m2, { done, steps: questSteps(m2, rpg, { rpg }), rpg });
  check('2a three kills of five: not ready', done === false && w.ready === false, w);
  check('2b ...the title and "3/5"', w.title === m2.title && w.count === '3/5', w);
  check('2c ...and the objective, not "Done"', w.line === m2.desc && !/Done/.test(w.line), w);
  check('2d no kills yet reads 0/5', questCardWords(m2, { done: false, rpg: {} }).count === '0/5');
}

// ── 3. ready ──
{
  const rpg = { _questKills: { mayor_2: 7 }, inventory: {} };
  const done = questObjectiveDone(m2, { rpg }, rpg);
  const w = questCardWords(m2, { done, steps: null, rpg });
  check('3a five kills or more: ready', done === true && w.ready === true, w);
  check('3b ...the count never passes the number asked (5/5)', w.count === '5/5', w);
  check('3c ...and says to go back to the giver', w.line === 'Done! Go back to Mayor Bro', w);
}

// ── 4. steps, and the bag ──
{
  const fake = { id: 'x', title: 'X', npc: 'Chef Bro', desc: 'Cook it.' };
  const w = questCardWords(fake, { done: false, steps: [{ label: 'Light a fire', done: true }, { label: 'Cook a fish', current: true }] });
  check('4a a quest with steps shows its next step, and no count', w.line === 'Next: Cook a fish' && w.count === '', w);
  const t1 = QUEST_CHAINS.tut_1;
  check('4b a bag quest counts what the bag holds', !!t1.need && t1.need.key
    && questCount(t1, { inventory: { [t1.need.key]: 2 } }).have === 2 && questCount(t1, { inventory: {} }).have === 0);
  check('4c no quest: no card', questCardWords(null, {}) === null);
}

// ── 5. wired ──
{
  const qc = read('../../src/ui/QuestCard.jsx');
  const bt = read('../../src/ui/BroTown.jsx');
  check('5a BroTown mounts the card in one line; the old card body is gone',
    /React\.createElement\(QuestCard, \{ rpgState: rpgState, live: stateRef\.current \}\)/.test(bt)
      && !/var activeQuests = Object\.entries\(rpgState\._quests/.test(bt) && !/questHudFolded/.test(bt));
  check('5b the check only when ready', /src=\{done \? QUEST_ART\.check : '\/icons\/ui\/panel-quests\.webp'\}/.test(qc));
  check('5c a tap opens the quest\'s page', /onClick=\{\(e\) => \{ e\.stopPropagation\(\); openQuestPage\(q\.id\); \}\}/.test(qc)
    && /questDetailBus\.select\(qid\)/.test(qc) && /dashboardPanelBus\.push\('questDetail'\)/.test(qc));
  check('5d its top is var(--bt-hud-top, 56px)', /top: 'var\(--bt-hud-top, 56px\)'/.test(qc));
}

console.log(`\nquest-card: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
