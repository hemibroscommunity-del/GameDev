/* v2.3.3591: ONE MESSAGE BEFORE A QUEST, A DRY LINE AND THE JOB
 * (src/data/gameSystems.js QUEST_CHAINS, lilBroRaceLine, grottoPartyAside).
 *
 * The owner: "I want just one message of dialog before the next quest
 * triggers.  npc messages are too long.  I also still think the dialog is
 * pretty corny so just a dry wisecrack while telling the character to do a
 * quest task is better."
 *
 *   1. every quest a townsperson offers says its offer, its progress line and
 *      its hand-in in ONE tap each (NpcDialogue's dialogueChunks splits on a
 *      blank line), and none of them runs long
 *   2. Lil Bro's line after a lost race is one tap too, however many he won
 *   3. the Mayor's first hand-in with the Goo Grotto's sentence is still one
 *      tap, and still short
 *   4. the words a player reads: "Remains", never "remnants"; no "Wheel"; and
 *      no line sends you to a "gold !" (the quest markers are the map's)
 */
import { QUEST_CHAINS, lilBroRaceLine, setGrottoParty } from '../../src/data/gameSystems.js';
import { WHEEL_DUNGEON_PARTY } from '../../src/data/wheelDungeons.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
/* NpcDialogue.jsx dialogueChunks, the tap split (a blank line) */
const chunks = (t) => (typeof t === 'string' ? t.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean) : []);
/* the longest one message may run: the old longest TAP was wood_2's 297 */
const MAX = 300;

const lines = [];
for (const [id, q] of Object.entries(QUEST_CHAINS)) {
  if (!q || !q.dialogue || q.retired) continue;
  for (const k of ['start', 'progress', 'complete']) lines.push({ id, k, t: q.dialogue[k] });
}

// ── 1. Every quest ──
check(`1a. the quests' lines are read (${lines.length})`, lines.length >= 54, lines.length);
const many = lines.filter((l) => chunks(l.t).length > 1).map((l) => `${l.id}.${l.k}`);
check('1b. every offer, progress line and hand-in is one tap', many.length === 0, many);
const long = lines.filter((l) => String(l.t || '').length > MAX).map((l) => `${l.id}.${l.k} ${String(l.t).length}`);
check(`1c. ...and none runs past ${MAX} characters`, long.length === 0, long);
const empty = lines.filter((l) => !String(l.t || '').trim()).map((l) => `${l.id}.${l.k}`);
check('1d. ...and none is empty', empty.length === 0, empty);

// ── 2. Lil Bro after a lost race ──
const lil = [0, 1, 2, 3, 7].map((n) => lilBroRaceLine(n));
check('2a. his line is one tap for 0, 1, 2, 3 and 7 losses', lil.every((t) => chunks(t).length === 1), lil);
check('2b. ...each still sends you to Race!', lil.every((t) => /Tap Race!/.test(t)), lil);
check('2c. ...and owns up after a loss', /^I wasn't even trying\./.test(lil[1]) && /That's 7 wins for me/.test(lil[4]), [lil[1], lil[4]]);

// ── 3. The Mayor's first hand-in with the Grotto's sentence ──
setGrottoParty(WHEEL_DUNGEON_PARTY.verdant);
const withGrotto = QUEST_CHAINS.tut_1.dialogue.complete;
setGrottoParty(null);
check(`3a. with the party Grotto, tut_1's hand-in is still one tap of at most ${MAX} (${withGrotto.length})`,
  chunks(withGrotto).length === 1 && withGrotto.length <= MAX, withGrotto);

// ── 4. The words ──
const all = [...lines.map((l) => String(l.t || '')), ...lil, withGrotto];
check('4a. "Remains", never "remnants"', !all.some((t) => /remnant/i.test(t)));
check('4b. no "Wheel" (players never read it: CLAUDE.md)', !all.some((t) => /\bWheel\b/.test(t)));
check('4c. no line sends you to a "gold !"', !all.some((t) => /gold !/.test(t)));

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nquest-lines: all checks passed');
