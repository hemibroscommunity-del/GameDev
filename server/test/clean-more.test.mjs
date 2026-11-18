/* ═══ v2.3.5814 (card RV, PR 14): THE CLEANER'S THREE MORE WAYS TO SAY NOTHING,
 * AND A NEW PET OR ALLIANCE NAME HELD TO THE NAME RULE ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md):
 *
 *   S6 (low).  The chat cleaner passed a line of braille blanks (a blank
 *   bubble), the interlinear annotation marks and loose Unicode tag
 *   characters.  Now taken out, or not counted as something to see; a flag
 *   made of tags is kept (`cleanmore`).
 *
 *   S7 (low; the owner's call, decided while away: "Go recommended on all").
 *   A pet's name, an alliance's name and its tag skipped the character name's
 *   rule: blank names, stacked marks, staff words.  Now a NEW one is held to
 *   it, with the refusal each already has; a name already given is never
 *   touched (`namestaff`).
 *
 *   1. a braille-blank line is nothing; annotations and loose tags go; a
 *      Scotland flag (tags after the black flag) is kept; an honest line is
 *      unchanged;
 *   2. a new pet name "Admin Team" or a Hangul-filler blank: refused
 *      (bad-name); "Biscuit": taken;
 *   3. a new alliance name "BroTown Staff", stacked marks, the tag "GM":
 *      refused; an honest name and tag: allowed by the rule;
 *   3e. (sitting 44's review) only a CHANGED name or tag: a stored one that
 *      now reads as staff keeps its name and may change its tag;
 *   4. the switches off: as before.
 *
 * Red on main before this change: 7 checks fail (1a, 1b, 1c, 2a, 2b, 3a, 3c).
 */
import { cleanChatText } from '../src/chatguard.js';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}
const cp = (s) => Array.from(s || '').map((c) => c.codePointAt(0).toString(16));

/* ── 1. the cleaner ── */
{
  const blank = '⠀⠀⠀';
  check('1a. a line of braille blanks is nothing', cleanChatText(blank) === '', cp(cleanChatText(blank)));
  const ann = 'a￹b￺c￻d';
  check('1b. the interlinear annotation marks are taken out', cleanChatText(ann) === 'abcd', cp(cleanChatText(ann)));
  const tags = 'hi\u{E0041}\u{E0042}\u{E0043} there';
  check('1c. loose tag characters are taken out', cleanChatText(tags) === 'hi there', cp(cleanChatText(tags)));
  const scotland = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}';
  check('1d. a flag made of tags (Scotland) is kept whole', cleanChatText('go ' + scotland) === 'go ' + scotland, cp(cleanChatText('go ' + scotland)));
  check('1e. an honest line is unchanged', cleanChatText('gg, nice fight!') === 'gg, nice fight!');
  check('4a. the cleaner with the additions off: as before (the blank line passes)', cleanChatText(blank, false) === blank);
}

/* ── 2 and 3. new names ── */
async function room(flags) {
  const st = makeStorage();
  const r = await openRoom(st, flags);
  await join(r, fakeWs('a'), 'bp_rvnames01', { loginTaken: true });
  if (r.tickInterval) { clearInterval(r.tickInterval); r.tickInterval = null; }
  return r;
}
/* the pet's naming rule, as _handlePetName asks it: the act's callback's answer */
async function petAnswer(r, name) {
  let answer = 'not-run';
  const real = r._petbookAct;
  r._petbookAct = (session, act, payload, fn) => { answer = fn({}, { id: 'p_rvtest01', name: 'Old' }); };
  try { r._handlePetName({ id: 'bp_rvnames01' }, { id: 'p_rvtest01', name }); } finally { r._petbookAct = real; }
  return answer;
}
{
  const r = await room(null);
  check('2a. a new pet name "Admin Team": refused (bad-name)', (await petAnswer(r, 'Admin Team')) === 'bad-name');
  check('2b. a new pet name of Hangul fillers (draws nothing): refused', (await petAnswer(r, 'ㅤㅤㅤ')) === 'bad-name');
  check('2c. a new pet name "Biscuit": taken', (await petAnswer(r, 'Biscuit')) === null);
  const off = await room({ namestaff: false });
  check('4b. `namestaff: false`: "Admin Team" taken, as before', (await petAnswer(off, 'Admin Team')) === null);
}
{
  /* the alliance rule, read where the alliance's naming asks it (an
     alliance needs 20 active members: the rule is held at its source) */
  const { nameReadsAsStaff } = await import('../src/reservednames.js');
  const src = (await import('node:fs')).readFileSync(new URL('../src/alliance.js', import.meta.url), 'utf8');
  const guarded = /_nameStaffOn\(\)[\s\S]{0,400}nameReadsAsStaff\(name\)[\s\S]{0,200}nameReadsAsStaff\(tag\)/.test(src);
  check('3a. the alliance\'s naming asks the staff rule of a new name and a new tag', guarded);
  check('3b. "BroTown Staff" and the tag "GM" read as staff', nameReadsAsStaff('BroTown Staff') && nameReadsAsStaff('GM'));
  check('3c. stacked marks and a blank filler are refused by the alliance rule\'s pattern', /\p{Default_Ignorable_Code_Point}|\p{M}{3,}/u.test('Ab́́́cd') && /\p{Default_Ignorable_Code_Point}|\p{M}{3,}/u.test('ㅤTeam') && guarded);
  check('3d. an honest alliance name and tag pass it', !nameReadsAsStaff('River Wolves') && !nameReadsAsStaff('RWLF'));
  /* sitting 44's review (decided for the owner while away): only a name or
     tag that CHANGES is held to it -- a stored "Team Bro" keeps its name and
     may change its tag -- and the marks are counted after NFC */
  const grand = /name !== a\.name && \([\s\S]{0,120}nameReadsAsStaff\(name\)/.test(src) && /tag !== a\.tag && nameReadsAsStaff\(tag\)/.test(src) && /normalize\('NFC'\)/.test(src);
  check('3e. only a changed name or tag is held to the rule (a stored one is grandfathered); marks counted after NFC', grand);
}

await settle();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
