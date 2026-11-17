/* ═══ v2.3.5611: THE TEST PANEL'S RENAME ROWS (card OPS PR 12) ═══
 *
 * src/game/renameOwner.js is what the Test panel's rename rows
 * (src/ui/panels/RenameRow.jsx) send and say.  This holds:
 *
 *   1. the route is the room's admin route card MOD's #1907 adds
 *      (/api/admin/rename: where charname.js routes it, the path is that
 *      one), and its `why`s are the ones the row has words for;
 *   2. the body: the id and the name tidied at its ends; `force` only when
 *      asked, and only `true`;
 *   3. the words: the first tap's question; the reply (old name and new,
 *      online or not); each refusal (a refused name by its why, a character
 *      not on file); anything else left to the panel's status line;
 *   4. the panel: a row under each chat report, after its silence, with
 *      callOwner (the admin key); and one for the owner's own character in
 *      the Character section, `mine` (the Staff word chip: `force`).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-15:
 *   1. RENAME_PATH '/api/admin/renames'                  -> FAIL 1 (with #1907's charname.js)
 *   2. renameBody sending force: false when not asked     -> FAIL 2
 *   3. NAME_WHY without 'staff'                           -> FAIL 1
 *   4. the report's `<RenameRow` line out of DevPanel.jsx -> FAIL 4
 *
 * Run from the repository's root: node tools/guards/rename-owner.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { RENAME_PATH, RENAME_MAX, NAME_WHY, whyOf, refusedWords, renameBody, askRenameWords, renamedWords } from '../../src/game/renameOwner.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. the route ── */
{
  const cn = join(ROOT, 'server/src/charname.js');
  const here = existsSync(cn) ? readFileSync(cn, 'utf8') : '';
  const sub = RENAME_PATH.replace('/api/admin', '');
  check(`1: the route is under the room's admin routes (${RENAME_PATH})`, RENAME_PATH.startsWith('/api/admin/'));
  check(`1: where charname.js routes it, the path is the row's (${here ? 'on this worker' : 'not on this worker yet, #1907'})`,
    !here || here.includes("path !== '" + sub + "'") || here.includes("path === '" + sub + "'"), sub);
  /* every `why` the rule answers has its words here */
  const whys = here ? [...here.matchAll(/return \{ why: '([a-z]+)' \}/g)].map((m) => m[1]) : ['short', 'long', 'chars', 'staff'];
  check(`1: every why the rule answers has its words (${[...new Set(whys)].join(', ')})`,
    whys.length > 0 && whys.every((w) => typeof NAME_WHY[w] === 'string' && NAME_WHY[w].length > 0), { whys, have: Object.keys(NAME_WHY) });
  const max = /MAX: (\d+)/.exec(here);
  check('1: the row\'s longest name is the rule\'s', !max || Number(max[1]) === RENAME_MAX, { rule: max && max[1], row: RENAME_MAX });
}

/* ── 2. the body ── */
{
  const a = renameBody('bp_a', '  Ann Lee ', false);
  const b = renameBody('bp_a', 'Owner', true);
  check('2: the id and the name tidied at its ends, no force unless asked', JSON.stringify(a) === '{"playerId":"bp_a","name":"Ann Lee"}', a);
  check('2: force: true when asked', b.force === true && b.name === 'Owner', b);
  check('2: anything but true is not force', !('force' in renameBody('bp_a', 'x', 'yes')) && !('force' in renameBody('bp_a', 'x')));
}

/* ── 3. the words ── */
{
  check('3: the first tap says what the second does', /^Rename Ann to "Bo"\? Everyone sees the new name\. Tap Rename again to do it\.$/.test(askRenameWords('Ann', ' Bo ', false)), askRenameWords('Ann', ' Bo ', false));
  check('3: ...and a staff word when forced', /A staff word is allowed \(your own character only\)\./.test(askRenameWords('your character', 'Owner', true)));
  check('3: the reply, online', renamedWords('Ann', { ok: true, from: 'Ann', name: 'Bo', online: true }) === 'Renamed Ann to Bo. They see it now. The boards show it at their next update.');
  check('3: the reply, offline', /^Renamed Ann to Bo\. They see it the next time they play\./.test(renamedWords('Ann', { ok: true, from: 'Ann', name: 'Bo', online: false })));
  check('3: a refused name, by its why', whyOf({ error: 'name refused: staff' }) === 'staff' && refusedWords(400, { error: 'name refused: chars' }) === NAME_WHY.chars && refusedWords(400, { error: 'name refused: long' }) === NAME_WHY.long);
  check('3: a character not on file', /^No saved character has that id/.test(refusedWords(404, { ok: false, error: 'no such character' }) || ''));
  check('3: anything else is not named here (a 404 without the route: the panel asks its own route)', refusedWords(404, { ok: false, error: 'Not found' }) === null && refusedWords(500, {}) === null && whyOf(null) === null);
}

/* ── 4. the panel ── */
{
  const panel = readFileSync(join(ROOT, 'src/ui/panels/DevPanel.jsx'), 'utf8');
  const sil = panel.indexOf('<SilenceButtons ');
  const rep = panel.indexOf('<RenameRow targetId={r.target}');
  const end = panel.indexOf('WHAT PLAYERS DREW');
  check('4: a rename row in each chat report, after its silence', rep > sil && sil > 0 && rep < end, { sil, rep, end });
  check('4: ...with callOwner (the admin key)', /<RenameRow targetId=\{r\.target\}[^>]*callOwner=\{callOwner\}/.test(panel));
  const ch = panel.indexOf('<div style={label}>Character</div>');
  const mine = panel.indexOf('<RenameRow targetId={myId}');
  const ach = panel.indexOf('<div style={label}>Achievements</div>');
  check('4: the owner\'s own, `mine`, in the Character section', ch > 0 && mine > ch && mine < ach && /<RenameRow targetId=\{myId\}[^>]* mine [^>]*callOwner=\{callOwner\}/.test(panel), { ch, mine, ach });
  const row = readFileSync(join(ROOT, 'src/ui/panels/RenameRow.jsx'), 'utf8');
  check('4: only `mine` offers the Staff word (force)', /\{mine && \(\s*<button[^>]*data-rename-force/.test(row) && /renameBody\(targetId, n, f\)/.test(row) && /const f = !!\(mine && force\)/.test(row));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
