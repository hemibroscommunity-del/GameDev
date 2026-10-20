/* The town opens after the Mayor's first quest, and its quest pins are on the
 * maps -- v2.3.3525 (src/game/questPins.js, src/data/gameSystems.js
 * getNpcQuest / questAfterMet / QUEST_TOUR).  docs/specs/demo-quest-line.md.
 *
 * The owner: "Maybe mayor bro is the only quest available for the first quest
 * then after completing that other NPCs begin having quest icons appear above
 * their head", and "Make the quest icons appear on the minimap and map too".
 * The worker's side of the open town is the tour suite's (tour.test.mjs §1-2,
 * _questBarred); this is the PAGE's side, which decides the pins:
 *
 *   1. who offers what (getNpcQuest): a new player only the Mayor; with his
 *      first quest in, all six townsfolk at once and the Mayor nothing; the
 *      Farmer's Zoom Juice once Diego's fish are in too; the Mayor's finale
 *      once the whole town is, and not one quest before.
 *   2. questAfterMet: one quest or a list, every one handed in; junk is not.
 *   3. the pins (questPins.js): each head mark's picture, nothing for junk,
 *      a dead or unplaced townsperson none, the one to hand in drawn last;
 *      a picture for every state (data/ownerIcons.js QUEST_PIN).
 */
import { getNpcQuest, QUEST_TOUR, QUEST_CHAINS, questAfterMet } from '../../src/data/gameSystems.js';
import { questPinState, questPinsOf, PIN_OF_MARK, MAP_PIN } from '../../src/game/questPins.js';
import { QUEST_PIN } from '../../src/data/ownerIcons.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const TOWN = ['Farmer Bro', 'Blacksmith Bro', 'Woodworker Bro', 'Diego', 'Lil Bro', 'Beastmaster Bro'];
const offers = (quests, who) => {
  const r = getNpcQuest({ _quests: quests }, who);
  return r && r.status === 'available' ? r.quest.id : null;
};
const done = (...ids) => { const q = Object.create(null); for (const id of ids) q[id] = 'turnedIn'; return q; };

// ── 1. who offers what ──
{
  check('a new player is offered the Mayor\'s first quest, and nobody else\'s',
    offers({}, 'Mayor Bro') === 'tut_1' && TOWN.every((n) => offers({}, n) === null), TOWN.map((n) => [n, offers({}, n)]));
  const one = done('tut_1');
  const firsts = TOWN.map((n) => offers(one, n));
  check('with it handed in, all six townsfolk offer their first quest at once', firsts.join() === 'farm_1,smith_1,wood_1,fish_1,race_1,beast_1', firsts);
  check('...and the Mayor offers nothing (his snowmen wait for the town)', offers(one, 'Mayor Bro') === null, offers(one, 'Mayor Bro'));
  check('the Farmer\'s Zoom Juice waits for Diego\'s fish too', offers(done('tut_1', 'farm_1'), 'Farmer Bro') === null
    && offers(done('tut_1', 'farm_1', 'fish_1'), 'Farmer Bro') === 'farm_2');
  check('a giver\'s second step follows his first', offers(done('tut_1', 'smith_1'), 'Blacksmith Bro') === 'smith_2'
    && offers(done('tut_1', 'wood_1'), 'Woodworker Bro') === 'wood_2' && offers(done('tut_1', 'beast_1'), 'Beastmaster Bro') === 'beast_2');
  const town = QUEST_TOUR.slice(0, -1);
  /* each giver's LAST step left undone (an earlier one undone with its last
     done is no state a player can be in: the last waits on it) */
  const ends = QUEST_CHAINS.tut_2.after;
  const short = ends.filter((q) => offers(done(...town.filter((x) => x !== q)), 'Mayor Bro') !== null);
  check('the Mayor\'s finale is not offered while any one of the six givers\' last steps is left', ends.length === 6 && short.length === 0, { ends, short });
  check('...and is once they are all in', offers(done(...town), 'Mayor Bro') === 'tut_2', offers(done(...town), 'Mayor Bro'));
  check('the suggested order is the page\'s tour steps, the Mayor first and last',
    QUEST_TOUR[0] === 'tut_1' && QUEST_TOUR[QUEST_TOUR.length - 1] === 'tut_2' && QUEST_TOUR.slice(1).every((q) => QUEST_CHAINS[q] && QUEST_CHAINS[q].tour), QUEST_TOUR);
}

// ── 2. questAfterMet ──
{
  const q = done('a', 'b');
  check('questAfterMet: one quest, or every one of a list', questAfterMet(q, 'a') && questAfterMet(q, ['a', 'b']) && !questAfterMet(q, ['a', 'c']) && !questAfterMet(q, 'c'));
  check('...an empty list, or junk in one, asks nothing', questAfterMet(q, []) && questAfterMet(q, [null, 5, '']) && questAfterMet(null, []));
  check('...and a quest merely taken is not handed in', !questAfterMet({ a: 'active' }, 'a') && !questAfterMet({ a: 'available' }, ['a']));
}

// ── 3. the pins ──
{
  check('each head mark has its picture: ❗ offer, ❔ waiting, ❓ ready',
    questPinState('❗') === 'offer' && questPinState('❔') === 'waiting' && questPinState('❓') === 'ready');
  check('...and nothing else is a pin', ['', null, undefined, '✅', '!', '__proto__', 'constructor', 5, {}].every((m) => questPinState(m) === null));
  check('a picture for every state (data/ownerIcons.js QUEST_PIN)', Object.values(PIN_OF_MARK).every((k) => typeof QUEST_PIN[k] === 'string' && QUEST_PIN[k].length > 0), QUEST_PIN);
  const S = { npcs: [
    { name: 'Mayor Bro', x: 10, y: 20, alive: true, _questMarker: '❓' },
    { name: 'Diego', x: 30, y: 40, alive: true, _questMarker: '❗' },
    { name: 'Ace', x: 50, y: 60, alive: true, _questMarker: null },
    { name: 'Lil Bro', x: 70, y: 80, alive: false, _questMarker: '❗' },
    { name: 'Farmer Bro', x: 'x', y: 1, alive: true, _questMarker: '❗' },
    { name: 'Blacksmith Bro', x: 90, y: 100, _questMarker: '❔' },
    null,
  ] };
  const pins = questPinsOf(S);
  check('questPinsOf: the townsfolk wearing a pin, the one to hand in last (drawn on top)',
    pins.map((p) => p.name + ':' + p.state).join() === 'Blacksmith Bro:waiting,Diego:offer,Mayor Bro:ready', pins);
  check('...where they stand', pins[1].x === 30 && pins[1].y === 40, pins[1]);
  check('...none with no townsfolk', questPinsOf({}).length === 0 && questPinsOf(null).length === 0 && questPinsOf({ npcs: 5 }).length === 0);
  check('the pins keep the head pin\'s shape (72 x 86), a little narrower than tall',
    [['MINI_W', 'MINI_H'], ['EDGE_W', 'EDGE_H'], ['WORLD_W', 'WORLD_H'], ['TOWN_W', 'TOWN_H']].every(([w, h]) => Math.abs(MAP_PIN[w] / MAP_PIN[h] - 72 / 86) < 0.04)
      && MAP_PIN.EDGE_H < MAP_PIN.MINI_H && MAP_PIN.EDGE_R > 0, MAP_PIN);
}

console.log(failures ? `\n${failures} QUEST PIN FAILURE(S)` : '\nquest-pins: ALL PASS');
process.exit(failures ? 1 : 0);
