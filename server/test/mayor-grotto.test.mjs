/* v2.3.3579: THE MAYOR POINTS AT THE GOO GROTTO, A PARTY'S JOB
 * (src/data/gameSystems.js grottoPartyAside, tut_1's hand-in).
 *
 * The owner: "Yes add mayors line pointing to grotto as a party challenge but
 * keep the wittiness of the new dialog."  Since v2.3.3573 the Grotto is level
 * 16 whoever comes in and its boss is sized for three; the slimes' hand-in now
 * names it as the one to come back to with friends -- only while the worker
 * plays it so.
 *
 *   1. no party row (an older worker, `partydungeon: false`): the hand-in is
 *      exactly the satire pass's six taps
 *   2. the row: one tap more, the fourth, between the warning that came too
 *      late and the bow and staff, its level and party the worker's own
 *   3. the row is the worker's (WHEEL_DUNGEON.PARTY), and a bad row says nothing
 *   4. the wiring: wsClient sets it from caps.partydungeon
 */
import { readFileSync } from 'node:fs';
import { QUEST_CHAINS, setGrottoParty, grottoPartyAside } from '../../src/data/gameSystems.js';
import { WHEEL_DUNGEON_PARTY } from '../../src/data/wheelDungeons.js';
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
/* NpcDialogue.jsx dialogueChunks, the tap split (a blank line) */
const chunks = (t) => (typeof t === 'string' ? t.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean) : []);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const tut1 = QUEST_CHAINS.tut_1;

// ── 1. No party row: as it was ──
setGrottoParty(null);
const plain = chunks(tut1.dialogue.complete);
check('1a. with no party Grotto the hand-in is the satire pass\'s six taps', plain.length === 6, plain.length);
check('1b. ...none of them names the Grotto', !plain.some((c) => /Grotto/.test(c)));
check('1c. ...the warning that came too late, then the bow and staff, in order',
  /swell up right before they die/.test(plain[1]) && /^\.\.\.And you're holding 4 Slime Remains/.test(plain[2])
    && /^Here, take a bow and a staff/.test(plain[3]), plain.slice(1, 4));

// ── 2. The party Grotto ──
setGrottoParty(WHEEL_DUNGEON_PARTY.verdant);
const said = chunks(tut1.dialogue.complete);
const aside = said[3] || '';
check('2a. with the party Grotto the hand-in has one tap more', said.length === 7, said.length);
check('2b. ...the fourth: after the warning that came too late, before the bow and staff',
  /^\.\.\.And you're holding/.test(said[2]) && /^Oh, and that cave/.test(aside) && /^Here, take a bow and a staff/.test(said[4]), said.slice(2, 5));
check('2c. ...it names the Goo Grotto and its level, the worker\'s 16',
  /The Goo Grotto/.test(aside) && new RegExp(`level ${WHEEL_DUNGEON.PARTY.verdant.level}\\b`).test(aside), aside);
check('2d. ...and the party it is for, 2 or 3 (the boss is sized for three)',
  new RegExp(`a party of ${WHEEL_DUNGEON.PARTY.verdant.size - 1}\u00a0or\u00a0${WHEEL_DUNGEON.PARTY.verdant.size}\\.$`).test(aside), aside);
check('2d2. ..."2 or 3" held together by no-break spaces, so "3." never wraps alone', /2\u00a0or\u00a03\./.test(aside), aside);
check('2e. ...says "Don\'t go in alone", and the splitting slime at the bottom',
  /Don't go in alone/.test(aside) && /giant slime at the bottom splits/.test(aside), aside);
check('2f. ...in the Mayor\'s voice: the town council, the funeral he would have to speak at',
  /like the town council/.test(aside) && /funeral I'd have to speak at/.test(aside), aside);
/* the game's longest tap is wood_2's hand-in, 297 characters: no longer */
const longest = Math.max(...Object.entries(QUEST_CHAINS).filter(([id]) => id !== 'tut_1')
  .flatMap(([, q]) => (q && q.dialogue ? ['start', 'progress', 'complete'].flatMap((k) => chunks(q.dialogue[k])) : []))
  .map((c) => c.length));
check(`2g. ...one tap: no blank line inside it, and no longer than the game's longest tap (${aside.length} of ${longest} characters)`,
  chunks(grottoPartyAside()).length === 1 && aside.length <= longest, { len: aside.length, longest });
check('2h. ...the other six taps are word for word as before',
  JSON.stringify(said.filter((c, i) => i !== 3)) === JSON.stringify(plain));
check('2i. the offer and the progress line never mention it (only the hand-in, where you stand near it)',
  !/Grotto/.test(tut1.dialogue.start) && !/Grotto/.test(tut1.dialogue.progress));
check('2j. "Remains", never "remnants", and no "Wheel" (CLAUDE.md)', !/remnant|Wheel/i.test(aside), aside);

// ── 3. The row ──
check('3a. the phone\'s row is the worker\'s (WHEEL_DUNGEON.PARTY.verdant)',
  JSON.stringify(WHEEL_DUNGEON_PARTY.verdant) === JSON.stringify(WHEEL_DUNGEON.PARTY.verdant), { cli: WHEEL_DUNGEON_PARTY.verdant, srv: WHEEL_DUNGEON.PARTY.verdant });
setGrottoParty({ level: 0, size: 3 });
check('3b. a row with no level says nothing', grottoPartyAside() === '');
setGrottoParty({ level: 16, size: 1 });
check('3c. ...nor one sized for one player', grottoPartyAside() === '');
setGrottoParty(undefined);
check('3d. ...nor none at all', grottoPartyAside() === '' && chunks(tut1.dialogue.complete).length === 6);

// ── 4. The wiring ──
const ws = read('../../src/networking/wsClient.js');
check('4a. wsClient sets it from caps.partydungeon (true only), the Grotto\'s row',
  /setGrottoParty\(S\._serverCaps && S\._serverCaps\.partydungeon === true \? WHEEL_DUNGEON_PARTY\.verdant : null\)/.test(ws));
const gs = read('../../src/data/gameSystems.js');
check('4b. tut_1\'s hand-in is a getter that asks grottoPartyAside()', /get complete\(\) \{ return "You're back!/.test(gs) && /\+ grottoPartyAside\(\)\n/.test(gs));

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nmayor-grotto: all checks passed');
