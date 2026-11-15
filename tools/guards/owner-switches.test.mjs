/* ═══ v2.3.5602: THE SWITCHES THE TEST PANEL SETS (card OPS PR 3) ═══
 *
 * src/game/ownerSwitches.js is what the Test panel's "Set a switch" row
 * (src/ui/panels/SetSwitchRow.jsx) offers and how it reads what the owner
 * typed.  This guard holds:
 *
 *   1. every switch it offers is a worker row of the switch table
 *      (tools/guards/lib/switches.mjs): a renamed or retired switch is not
 *      offered with words that no longer say what happens;
 *   2. its name rule is the server's (liveops.js LIVEOPS.FLAG_NAME_RE): the
 *      row never refuses a name the server would take, nor sends one it
 *      would refuse;
 *   3. a value reads as on, off or a number, and nothing else is sent; an
 *      on/off switch takes no number and a number switch only a whole one in
 *      its range; the confirm names the switch, the value and what it does;
 *   4. the panel mounts the row in its flags section, after "Live flags".
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-15:
 *   1. `{ name: 'newersaves', ...}` in OWNER_SWITCHES          -> FAIL 1
 *   2. NAME_RE `/^[a-z0-9_]{1,24}$/`                           -> FAIL 2
 *   3. parseValue taking 'yes' as true                         -> FAIL 3
 *   4. the `<SetSwitchRow` line taken out of DevPanel.jsx       -> FAIL 4
 *
 * Run from the repository's root: node tools/guards/owner-switches.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { SWITCHES } from './lib/switches.mjs';
import { OWNER_SWITCHES, switchNameOk, ownerSwitch, parseValue, whyNot, confirmWords } from '../../src/game/ownerSwitches.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. every offered switch is a worker row ── */
{
  const worker = new Set(SWITCHES.filter((r) => r.side === 'worker').map((r) => r.name));
  const missing = OWNER_SWITCHES.map((s) => s.name).filter((n) => !worker.has(n));
  check(`1: every switch the row offers (${OWNER_SWITCHES.length}) is a worker row of the switch table`, missing.length === 0, missing);
  const bad = OWNER_SWITCHES.filter((s) => !(s.kind === 'onoff' ? (s.on && s.off) : (s.kind === 'number' && typeof s.number === 'function' && Number.isInteger(s.min) && Number.isInteger(s.max) && s.min <= s.max)));
  check('1: each says what it does (on and off, or for a number in its range)', bad.length === 0, bad.map((s) => s.name));
}

/* ── 2. the server's name rule ── */
{
  const src = readFileSync(join(ROOT, 'server/src/liveops.js'), 'utf8');
  const m = src.match(/FLAG_NAME_RE:\s*(\/[^\n]+?\/[a-z]*),/);
  const re = m ? new Function('return ' + m[1])() : null;
  const probes = ['newersave', 'max_players', 'a', 'x'.repeat(32), 'x'.repeat(33), 'Bad', 'with-dash', '', '__proto__', 'off_hd', '9lives', 'sp ace'];
  const differ = re ? probes.filter((p) => re.test(p) !== switchNameOk(p)) : ['FLAG_NAME_RE not found in liveops.js'];
  check('2: the row\'s name rule is the server\'s (liveops.js FLAG_NAME_RE), probe by probe', differ.length === 0, differ);
  check('2: a name that is not a string is refused', !switchNameOk(null) && !switchNameOk(7));
}

/* ── 3. values and words ── */
{
  const cases = [['on', true], ['OFF', false], [' true ', true], ['false', false], ['2', 2], ['0', 0], ['-1', -1], ['2.5', 2.5],
    ['yes', null], ['', null], ['1e9', null], ['two', null], [null, null], ['NaN', null]];
  const wrong = cases.filter(([t, want]) => parseValue(t) !== want);
  check('3: a value reads as on, off or a number; anything else is null (nothing sent)', wrong.length === 0, wrong.map(([t, w]) => [t, w, parseValue(t)]));
  check('3: an on/off switch takes no number', whyNot('newersave', 3) !== '' && whyNot('newersave', false) === '');
  check('3: a number switch takes only a whole number in its range', whyNot('max_players', 2) === '' && whyNot('max_players', 0) !== ''
    && whyNot('max_players', 121) !== '' && whyNot('max_players', 2.5) !== '' && whyNot('max_players', true) !== '');
  check('3: a typed name the row does not know is the server\'s to judge (any lower-case name and a value)', whyNot('some_switch', true) === '' && whyNot('Bad', true) !== '' && whyNot('ok_name', null) !== '');
  const w = confirmWords('newersave', false);
  check('3: the confirm names the switch, the value and what it does', /newersave/.test(w) && /\boff\b/.test(w) && w.includes((ownerSwitch('newersave') || {}).off || '\u0000'), w);
  check('3: ...for a number too', /max_players to 2\b/.test(confirmWords('max_players', 2)) && /at most 2 players/.test(confirmWords('max_players', 2)));
  check('3: ...and for a name it does not know, a plain warning', /everyone at once/.test(confirmWords('some_switch', true)));
}

/* ── 4. the panel mounts it ── */
{
  const panel = readFileSync(join(ROOT, 'src/ui/panels/DevPanel.jsx'), 'utf8');
  const at = panel.indexOf('<SetSwitchRow ');
  const flags = panel.indexOf('>Live flags<');
  check('4: the Test panel mounts the row, after its Live flags list', at > 0 && flags > 0 && at > flags, { at, flags });
  check('4: ...with its call (the admin key) and the flags list\'s setter', /<SetSwitchRow [^>]*call=\{call\}[^>]*onFlags=\{setFlags\}/.test(panel));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
