/* The townsfolk go by nicknames -- v2.3.4048 (src/data/folkNames.js).
 * v2.3.4088: NO LONGER.  The owner, 2026-11-03: "Revert the nicknames and go
 * back to the other names, I liked them better other way."  The map is empty
 * and every townsperson shows his own name; the screens keep asking the
 * helper (one door for a shown name).  What this suite holds now:
 *   1. the map is empty: everyone shows his own name, and the names are unique;
 *   2-3. as below;
 *   4. the screens ask the helper, and so read the OLD names
 *      ("Talk to Gavel Greg").
 *
 * As it was written for v2.3.4048:
 * The owner: "Instead of names like 'gavel Greg' it would be more humorous to
 * just have them go by nicknames. I didn't mean to remake all the NPCs to be
 * like gavel Greg. The way their appearance looks now is fine."
 *
 *   1. the map: every key is a real NPC_DATA name; the eight are as the owner
 *      was shown them; everyone else shows his own name; the shown names are
 *      unique (no nickname is someone else's name) and plain ASCII;
 *   2. the helper: a non-string or empty name comes back as it was (a
 *      caller's `|| 'its giver'` fallback still works);
 *   3. only what a player reads changed: the keys every table reads (NPC_DATA
 *      `name`, WHEEL_KEEPERS, WHEEL_TOWNSFOLK, npcLookByName) are the old
 *      names still, and the looks are untouched;
 *   4. the screens ask it: the plate, the dialogue's title, the map pin's
 *      label, the quest card and journal, the computer's "Talk to".
 */
import fs from 'fs';
import { FOLK_NICKNAMES, folkDisplayName } from '../../src/data/folkNames.js';
import { NPC_DATA } from '../../src/data/gameDisplay.js';
import { WHEEL_TOWNSFOLK, WHEEL_KEEPERS } from '../../src/data/wheelBuildingDoors.js';
import { npcLookByName } from '../../src/data/npcLooks.js';
import { whoLines, nowLine, offerWhere, JOURNAL_STATUS } from '../../src/game/questJournal.js';
import { questCardWords } from '../../src/game/questCard.js';

let passed = 0, failed = 0;
const check = (name, ok, info) => {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
};
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

const OWNER = {
  'Gavel Greg': 'Going-Going',
  'Old Man Reel': 'Fish Tales',
  'Tourist Terry': 'Selfie',
  'Sheriff Buck': 'Badge',
  'Guildmaster Gary': 'Tryhard',
  'Deed Dave': 'Swampy',
  'Postmaster Pete': 'Snail Mail',
  'Chef Blaze': 'Sizzle',
};
const KEEP = ['Mayor Bro', 'Farmer Bro', 'Blacksmith Bro', 'Woodworker Bro', 'Beastmaster Bro', 'Lil Bro',
  'Diego', 'Ace', 'Sterling', 'Slim', 'Glint', 'Bean', 'Benny'];
const names = NPC_DATA.map((r) => r.name);

// ── 1. the map (v2.3.4088: empty, the owner's names back) ──
{
  check('1a the map is empty and frozen: no nicknames (the owner: "go back to the other names")',
    Object.keys(FOLK_NICKNAMES).length === 0 && Object.isFrozen(FOLK_NICKNAMES), FOLK_NICKNAMES);
  const moved = Object.keys(OWNER).concat(KEEP).filter((n) => names.indexOf(n) < 0 || folkDisplayName(n) !== n);
  check(`1b the eight and everyone else (${KEEP.length}) show their own names`, moved.length === 0, moved);
  const rest = names.filter((n) => folkDisplayName(n) !== n);
  check(`1c ...and so does every NPC_DATA row (${names.length} in all)`, rest.length === 0, rest);
  const shown = names.map(folkDisplayName);
  check('1d the names a player reads are unique', new Set(shown).size === shown.length, shown);
}

// ── 2. the helper ──
{
  check('2a a name not in the map is itself', folkDisplayName('Someone New') === 'Someone New');
  check('2b empty, null and undefined come back as they were (the caller\'s fallback still reads)',
    folkDisplayName('') === '' && folkDisplayName(null) === null && folkDisplayName(undefined) === undefined
      && (folkDisplayName(undefined) || 'its giver') === 'its giver');
  check('2c a prototype name is no nickname (hasOwnProperty, not `in`)', folkDisplayName('__proto__') === '__proto__' && folkDisplayName('toString') === 'toString');
}

// ── 3. the keys stay ──
{
  const cast = Object.keys(OWNER);
  const rows = cast.filter((n) => !NPC_DATA.find((r) => r.name === n));
  check('3a NPC_DATA still keys each of the eight on his old name', rows.length === 0, rows);
  const placed = cast.filter((n) => !WHEEL_TOWNSFOLK.find((f) => f.name === n));
  check('3b WHEEL_TOWNSFOLK places each on his old name', placed.length === 0, placed);
  const keepers = ['Chef Blaze', 'Postmaster Pete', 'Deed Dave', 'Guildmaster Gary', 'Sheriff Buck', 'Gavel Greg'];
  check('3c WHEEL_KEEPERS keys the six keepers on their old names', keepers.every((n) => Object.prototype.hasOwnProperty.call(WHEEL_KEEPERS, n)));
  const looks = cast.filter((n) => !npcLookByName(n));
  check('3d each still finds his look by his old name (the looks untouched)', looks.length === 0, looks);
  const nick = Object.values(OWNER).filter((v) => npcLookByName(v) || NPC_DATA.find((r) => r.name === v));
  check('3e no table is keyed on a nickname', nick.length === 0, nick);
}

// ── 4. the screens ask it ──
{
  const q = { id: 'x_1', title: 'A test', npc: 'Gavel Greg', desc: 'Do the thing.' };
  const who = whoLines(q, JOURNAL_STATUS.available, null);
  check('4a the journal names a giver by his own name again ("Talk to Gavel Greg")', who.npc === 'Gavel Greg' && /^Talk to Gavel Greg /.test(who.todo), who);
  const now = nowLine(q, JOURNAL_STATUS.ready, null, null);
  check('4b ...hand-ins too', /hand it in to Gavel Greg/.test(now.text) && /^Tap Gavel Greg /.test(now.goal), now);
  check('4c ...and the offer\'s "who and where"',
    offerWhere(q, { meet: { 'Gavel Greg': 'at the Auction House' } }) === 'Gavel Greg, at the Auction House');
  const card = questCardWords(q, { done: true });
  check('4d the pinned card says "Go back to Gavel Greg"', card && /Go back to Gavel Greg/.test(card.line), card);
  const er = read('../../src/rendering/systems/entityRenderer.js');
  check('4e his name plate asks the helper (his own name now)', /_updateNamePill\(display, folkDisplayName\(npc\.name\), '', true, null\)/.test(er));
  check('4f ...and the QA probe says what the plate reads (__btNpcSprites plate.name)', /name: display\._pillName \? display\._pillName\.text : null/.test(er));
  const nd = read('../../src/ui/panels/NpcDialogue.jsx');
  check('4g the dialogue\'s title reads it (its portrait still found by the key)',
    /bt-npcdlg-name">\{folkDisplayName\(npcName\)\}/.test(nd) && /const art = npcArt\(npcName\)/.test(nd));
  const wm = read('../../src/ui/WorldMapOverlay.jsx');
  check('4h the world map\'s quest pin is labelled with it', /\[folkDisplayName\(p\.name\)\]/.test(wm));
  const bt = read('../../src/ui/BroTown.jsx');
  check('4i the computer\'s "Talk to" and the "has nothing for you" line read it',
    /"Talk to ", folkDisplayName\(deskTalkPick\)/.test(bt) && /folkDisplayName\(npc\.name\) \+ ' has nothing for you right now'/.test(bt));
  const qc = read('../../src/ui/QuestCard.jsx');
  check('4j the tour card\'s "Talk to" reads it', /'Talk to ' \+ folkDisplayName\(to\.npc\)/.test(qc));
}

console.log(`\nfolk-names: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
