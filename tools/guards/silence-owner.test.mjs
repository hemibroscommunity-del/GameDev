/* ═══ v2.3.5605: THE TEST PANEL'S SILENCE BUTTONS (card OPS PR 6) ═══
 *
 * src/game/silenceOwner.js is what a chat report's silence buttons
 * (src/ui/panels/SilenceButtons.jsx) send and say.  This holds:
 *
 *   1. the route is the room's admin route card MOD's #1897 adds
 *      (/api/admin/silence: where admin.js already hands it to
 *      silence.js, the path is that one);
 *   2. the four choices send 1, 60 and 1,440 minutes and 0 (until lifted),
 *      in that order, each with its words;
 *   3. a silence's end in words: until you lift it, a time today in UTC,
 *      or a day and a time; the replies to a silence and a lift; the
 *      running list read as a map (0 kept: until lifted);
 *   4. the panel puts the buttons under each chat report, beside its
 *      Freeze, with callOwner (the admin key) and the running list.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-15:
 *   1. SILENCE_PATH '/api/admin/silences'                -> FAIL 1 (with #1897's admin.js)
 *   2. the day's choice sending 1400                     -> FAIL 2
 *   3. untilWords without the day for another day's end  -> FAIL 3
 *   4. the `<SilenceButtons` line out of DevPanel.jsx      -> FAIL 4
 *
 * Run from the repository's root: node tools/guards/silence-owner.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { SILENCE_PATH, SILENCE_CHOICES, untilWords, askWords, silencedWords, liftedWords, silenceMap } from '../../src/game/silenceOwner.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. the route ── */
{
  const sil = join(ROOT, 'server/src/silence.js');
  const here = existsSync(sil) ? readFileSync(sil, 'utf8') : '';
  const sub = SILENCE_PATH.replace('/api/admin', '');
  check(`1: the route is under the room's admin routes (${SILENCE_PATH})`, SILENCE_PATH.startsWith('/api/admin/'));
  check(`1: where silence.js routes it, the path is the row's (${here ? 'on this worker' : 'not on this worker yet, #1897'})`,
    !here || here.includes("path !== '" + sub + "'") || here.includes("path === '" + sub + "'"), sub);
}

/* ── 2. the choices ── */
check('2: a minute, an hour, a day, until lifted: 1, 60, 1440 and 0 minutes, in that order',
  JSON.stringify(SILENCE_CHOICES.map((c) => c.minutes)) === '[1,60,1440,0]' && SILENCE_CHOICES.every((c) => c.label && c.words && c.key),
  SILENCE_CHOICES.map((c) => c.minutes));

/* ── 3. the words ── */
{
  const now = Date.UTC(2026, 10, 15, 1, 0, 0);
  check('3: until you lift it, for 0', untilWords(0, now) === 'until you lift it');
  check('3: a time today, in UTC', untilWords(now + 90 * 60000, now) === 'until 02:30 UTC', untilWords(now + 90 * 60000, now));
  check('3: another day, with its day', untilWords(now + 86400000, now) === 'until Nov 16, 01:00 UTC', untilWords(now + 86400000, now));
  check('3: the first tap says what the second does', /^Silence Ann for an hour\? Their chat reaches nobody; they still play\./.test(askWords('Ann', SILENCE_CHOICES[1])));
  check('3: the reply to a silence, and whether they are told', silencedWords('Ann', { until: now + 60000, online: true }, now) === 'Silenced Ann until 01:01 UTC. They are online and are told once a minute.'
    && silencedWords('Ann', { until: 0, online: false }, now) === 'Silenced Ann until you lift it.');
  check('3: the reply to a lift', liftedWords('Ann', { ok: true, was: true }) === "Lifted Ann's silence: they can chat again." && liftedWords('Ann', { ok: true, was: false }) === 'Ann was not silenced.');
  const m = silenceMap({ ok: true, silenced: [{ playerId: 'bp_a', until: 0 }, { playerId: 'bp_b', until: now }, { nope: 1 }] });
  check('3: the running list as a map, until lifted kept as 0', m.bp_a === 0 && m.bp_b === now && Object.keys(m).length === 2 && silenceMap(null) && Object.keys(silenceMap(null)).length === 0);
}

/* ── 4. the panel ── */
{
  const panel = readFileSync(join(ROOT, 'src/ui/panels/DevPanel.jsx'), 'utf8');
  const at = panel.indexOf('<SilenceButtons ');
  const freeze = panel.indexOf('data-report-act="freeze"');
  const end = panel.indexOf('WHAT PLAYERS DREW');
  check('4: the buttons sit in each chat report, after its Freeze', at > freeze && freeze > 0 && at < end, { at, freeze, end });
  check('4: ...with callOwner (the admin key), the running list, and its reload', /<SilenceButtons [^>]*until=\{silences \? silences\[r\.target\] : undefined\}[^>]*callOwner=\{callOwner\}[^>]*onChanged=\{loadSilences\}/.test(panel));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
