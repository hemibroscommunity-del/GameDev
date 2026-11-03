/* v2.3.3591: ONE MESSAGE BEFORE A QUEST, A DRY LINE AND THE JOB
 * (src/data/gameSystems.js QUEST_CHAINS, lilBroRaceLine, grottoPartyAside).
 *
 * The owner: "I want just one message of dialog before the next quest
 * triggers.  npc messages are too long.  I also still think the dialog is
 * pretty corny so just a dry wisecrack while telling the character to do a
 * quest task is better."
 *
 * v2.3.4030: the owner, "Just make the characters (all of them all dialog) a
 * simple and easy to understand personality and directions.  No cryptic
 * jokes or anything that could confuse someone."  §2c and §5 now hold that:
 * Lil Bro says plainly that he won, each giver's first offer says who he is,
 * and none of the old zingers' slang comes back (docs/specs/plain-words.md).
 *
 *   1. every quest a townsperson offers says its offer, its progress line and
 *      its hand-in in ONE tap each (NpcDialogue's dialogueChunks splits on a
 *      blank line), and none of them runs long
 *   2. Lil Bro's line after a lost race is one tap too, however many he won
 *   3. the Mayor's first hand-in with the Goo Grotto's sentence is still one
 *      tap, and still short
 *   4. the words a player reads: "Remains", never "remnants"; no "Wheel"; and
 *      no line sends you to a "gold !" (the quest markers are the map's)
 *   5. (v2.3.3611) the zingers came back -- the owner: "add back the clever
 *      zingers in the Npc dialog but still keep it to just one message before
 *      the next call to action.  You should understand the npc's specific
 *      personality from just one message" -- and the call to action is still
 *      in that one message: every offer and progress line names its count
 *   6. (v2.3.3924) the questline's order, said: Diego's hand-in sends you to
 *      Farmer Bro, Farmer Bro's back to the Mayor (farming before the
 *      snowmen); Diego says plainly who he is and what to do; the Mayor's
 *      dungeon says "[Lv 10+ recommended]" and the town's quests first,
 *      starting with Woodworker Bro -- and his first hand-in still says no
 *      level (the owner had it taken off, v2.3.3869); the tour's and the
 *      Mayor's lines are ASCII
 */
import { QUEST_CHAINS, lilBroRaceLine, setGrottoParty, GROTTO_REC_LEVEL, QUEST_TOUR } from '../../src/data/gameSystems.js';
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
/* v2.3.3611: "GG EZ! I wasn't even trying." -- the brag first, then the excuse.
   v2.3.4030: plainly, "I won!" and how to try again */
check('2c. ...and says plainly that he won', /^I won!/.test(lil[1]) && /^I won again!/.test(lil[2]) && /That's 7 wins for me/.test(lil[4]), [lil[1], lil[2], lil[4]]);

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

// ── 5. v2.3.3611: the zingers, and the job still in the one message ──
{
  const miss = [];
  let n5 = 0;
  for (const [id, q] of Object.entries(QUEST_CHAINS)) {
    if (!q || !q.dialogue || q.retired) continue;
    const n = q.need && q.need.n;
    if (typeof n !== 'number') continue;
    n5++;
    const names = (t) => typeof t === 'string' && new RegExp('\\b' + n + '\\b').test(t);
    if (!names(q.dialogue.start)) miss.push(id + '.start (' + n + ')');
    if (typeof q.dialogue.progress === 'string' && !names(q.dialogue.progress)) miss.push(id + '.progress (' + n + ')');
  }
  check(`5a. every offer and progress line with a count (${n5} quests) still names it: the call to action is in the one message`, n5 >= 9 && miss.length === 0, miss);
  /* v2.3.4030: no zinger now -- the owner, "a simple and easy to understand
     personality and directions": each giver's first offer says who he is,
     by name, before the job */
  const bare = ['tut_1', 'smith_1', 'wood_1', 'fish_1', 'farm_1', 'race_1', 'beast_1']
    .filter((id) => !String(QUEST_CHAINS[id].dialogue.start || '').includes("I'm " + QUEST_CHAINS[id].npc));
  check('5b. each giver\'s first offer says who he is ("I\'m <name>") before the job', bare.length === 0, bare);
  /* v2.3.4030: "No cryptic jokes or anything that could confuse someone" --
     the old zingers' slang and in-jokes, none of them back */
  const SLANG = /\baura\b|skill issue|\bGG\b|\bEZ\b|\blag\b|hacker|montage|grandpa|passive income|protein|tourism board|city council|eulog|insurance|grudge|danger zone|stay frosty|sawdust|research wall|\bdummy\b/i;
  const slang = [...lines.map((l) => [`${l.id}.${l.k}`, String(l.t || '')]), ...lil.map((t, i) => ['lil' + i, t])]
    .filter(([id, t]) => /^(tut_|mayor_|smith_|wood_|fish_|farm_|race_|beast_|lil)/.test(id) && SLANG.test(t)).map(([id]) => id);
  check('5c. no slang or in-joke from the old zingers in any townsperson\'s line', slang.length === 0, slang);
}

// ── 6. v2.3.3924: the order, said; Diego plainly; the dungeon's level ──
{
  const D = (id) => QUEST_CHAINS[id].dialogue;
  const at = (id) => QUEST_TOUR.indexOf(id);
  check('6a the tour goes Diego, Farmer Bro\'s carrots, then the Mayor\'s snowmen', at('farm_1') === at('fish_1') + 1 && at('tut_2') === at('farm_1') + 1, QUEST_TOUR);
  check('6b Diego\'s hand-in sends you to Farmer Bro at the Feed & Seed', /Next, go see Farmer Bro at the Feed & Seed\./.test(D('fish_1').complete), D('fish_1').complete);
  check('6c Farmer Bro\'s hand-in sends you back to Mayor Bro', /go see Mayor Bro at the Town Hall/.test(D('farm_1').complete) && !/Diego/.test(D('farm_1').complete), D('farm_1').complete);
  check('6d Diego says who he is, then exactly what to do: catch 2 fish, cook them on a campfire, bring them to him',
    /^Hi, I'm Diego!/.test(D('fish_1').start) && /Catch 2 fish at a fishing spot, cook them on a campfire, and bring them to me\./.test(D('fish_1').start)
      && /tap a log in your Bag/.test(D('fish_1').start), D('fish_1').start);
  const tag = '[Lv ' + GROTTO_REC_LEVEL + '+ recommended]';
  const m3 = QUEST_CHAINS.mayor_3;
  check(`6e the Mayor's dungeon says "${tag}" on its quest and its offer and progress lines`,
    GROTTO_REC_LEVEL === 10 && m3.desc.includes(tag) && D('mayor_3').start.includes(tag) && D('mayor_3').progress.includes(tag), [m3.desc, D('mayor_3').start]);
  check('6f ...and sends a lower level to the town\'s quests first, starting with Woodworker Bro',
    ['start', 'progress'].every((k) => /Not level 10 yet\? Do the town's quests first, starting with Woodworker Bro/.test(D('mayor_3')[k])), D('mayor_3').progress);
  setGrottoParty(null);
  check('6g ...and the Mayor\'s first hand-in still says no level (v2.3.3869)', !/\blevel\b|\bLv\b/i.test(D('tut_1').complete), D('tut_1').complete);
  /* the tour's and the Mayor's (the dormant givers' old lines are not read) */
  const live = new Set([...QUEST_TOUR, 'tut_3', 'tut_4', 'mayor_2', 'mayor_3']);
  const nonAscii = lines.filter((l) => live.has(l.id) && /[^\x00-\x7f]/.test(String(l.t || ''))).map((l) => `${l.id}.${l.k}`);
  check('6h the tour\'s and the Mayor\'s lines are ASCII (CLAUDE.md: the game\'s script is ASCII)', nonAscii.length === 0, nonAscii);
}

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nquest-lines: all checks passed');
