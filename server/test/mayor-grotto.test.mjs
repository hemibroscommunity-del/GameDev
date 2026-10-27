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
 *      one tap (v2.3.3591; the satire pass's six until then)
 *   2. the row: a sentence more at the end of that tap, its level and party
 *      the worker's own (v2.3.3591; a tap of its own until then)
 *   3. the row is the worker's (WHEEL_DUNGEON.PARTY), and a bad row says nothing
 *   4. the wiring: wsClient sets it from caps.partydungeon
 */
import { readFileSync } from 'node:fs';
import { QUEST_CHAINS, setGrottoParty, grottoPartyAside } from '../../src/data/gameSystems.js';
import { WHEEL_DUNGEON_PARTY, WHEEL_DUNGEON_REC } from '../../src/data/wheelDungeons.js';
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

// ── 1. No party row ──
/* v2.3.3591: the owner's "just one message": the hand-in is ONE tap now (it was
   the satire pass's six), the warning that came too late a sentence in it */
setGrottoParty(null);
const plain = chunks(tut1.dialogue.complete);
check('1a. with no party Grotto the hand-in is one tap', plain.length === 1, plain.length);
check('1b. ...it does not name the Grotto', !plain.some((c) => /Grotto/.test(c)));
check('1c. ...the warning that came too late, the bow and staff, and who to see first',
  /explode/.test(plain[0]) && /bow and a staff/.test(plain[0]) && /Blacksmith Bro and Diego/.test(plain[0]), plain[0]);

// ── 2. The party Grotto ──
setGrottoParty(WHEEL_DUNGEON_PARTY.verdant);
const said = chunks(tut1.dialogue.complete);
const aside = grottoPartyAside();
check('2a. with the party Grotto the hand-in is still one tap', said.length === 1, said.length);
check('2b. ...the Grotto\'s sentence ends it, after who to see first', said[0] === plain[0] + aside && /Diego\. The Goo Grotto/.test(said[0]), said[0]);
/* v2.3.3608: the level it is FOR (WHEEL_DUNGEON_REC, the owner's "recommended
   level ... lvl 10"), "level 10 and up" -- its monsters stay the worker's 16 */
check('2c. ...it names the Goo Grotto and the level it is for, 10 and up (its monsters stay the worker\'s 16)',
  /The Goo Grotto/.test(aside) && new RegExp(`for level ${WHEEL_DUNGEON_REC.verdant} and up\\b`).test(aside)
    && !/level 16/.test(aside) && WHEEL_DUNGEON.PARTY.verdant.level === 16, aside);
check('2d. ...and the party it is for, 2 or 3 friends (the boss is sized for three)',
  new RegExp(`take ${WHEEL_DUNGEON.PARTY.verdant.size - 1}\u00a0or\u00a0${WHEEL_DUNGEON.PARTY.verdant.size} friends\\.`).test(aside), aside);
check('2d2. ..."2 or 3" held together by no-break spaces, so "3" never wraps alone', /2\u00a0or\u00a03 friends/.test(aside), aside);
check(`2e. ...and the whole tap stays short (${said[0].length} of 300 characters; the old longest tap was 297)`, said[0].length <= 300, said[0].length);
check('2f. ...in the Mayor\'s dry voice: he is out of eulogies', /I'm out of eulogies\.$/.test(aside), aside);
check('2g. ...a sentence, never a tap of its own (no blank line in it)', !/\n/.test(aside), aside);
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
check('3d. ...nor none at all', grottoPartyAside() === '' && chunks(tut1.dialogue.complete).length === 1);

// ── 4. The wiring ──
const ws = read('../../src/networking/wsClient.js');
check('4a. wsClient sets it from caps.partydungeon (true only), the Grotto\'s row',
  /setGrottoParty\(S\._serverCaps && S\._serverCaps\.partydungeon === true \? WHEEL_DUNGEON_PARTY\.verdant : null\)/.test(ws));
const gs = read('../../src/data/gameSystems.js');
check('4b. tut_1\'s hand-in is a getter that asks grottoPartyAside()', /get complete\(\) \{ return "Four Slime Remains/.test(gs) && /\+ grottoPartyAside\(\); \}/.test(gs));

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nmayor-grotto: all checks passed');
