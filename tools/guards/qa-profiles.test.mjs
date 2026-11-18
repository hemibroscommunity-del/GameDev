/* ═══ v2.3.5860: THE TWO SLOW PROFILES HOLD (card O2 PR 1; the grand plan's 1.5) ═══
 *
 * tools/qa/profiles.mjs names two slow machines in knobs that exist
 * (BT_QA_CPU_THROTTLE, the harness's thin line BT_QA_SLOW, the lane), and
 * `BT_QA_PROFILE=<name>` sets them all (the harness, when it loads).  This
 * holds:
 *   1. the table: exactly budget-android and hotel-laptop, each with a
 *      processor slowed (> 1), a thin line in the harness's own form, a lane
 *      of the lanes' table, and words;
 *   2. applyProfile: sets both knobs; an unknown name throws, naming the
 *      table; a knob set by hand to another value throws; the same value, or
 *      no profile, changes nothing;
 *   3. the harness: reads BT_QA_PROFILE through applyProfile BEFORE it reads
 *      BT_QA_SLOW or BT_QA_CPU_THROTTLE, and puts the profile's lane on the
 *      scenario's (profileLane, in setScenario and the default);
 *   4. profileLane: the profile's lane, else the scenario's.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   - `cpu: 4` -> `cpu: 1` in budget-android                         -> FAIL 1
 *   - `throw new Error(...)` in profileOf taken out                   -> FAIL 2 (unknown name)
 *   - harness's `export const PROFILE = applyProfile(process.env);`
 *     moved below `let _slow = ...`                                   -> FAIL 3
 *   - setScenario's `profileLane(...)` as the bare scenario lane       -> FAIL 3
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFILES, PROFILE_NAMES, PROFILE_KNOBS, LINE_FORM, profileOf, applyProfile } from '../qa/profiles.mjs';
import { profileLane, TEST_LANE } from '../qa/lane.mjs';
import { LANE_NAMES } from '../../src/game/drawLanes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 700))); }
}
const throws = (f) => { try { f(); return null; } catch (e) { return String(e && e.message || e); } };

/* 1. the table */
{
  check('1. the profiles are exactly budget-android and hotel-laptop', JSON.stringify(PROFILE_NAMES) === JSON.stringify(['budget-android', 'hotel-laptop']), PROFILE_NAMES);
  const bad = [];
  for (const n of PROFILE_NAMES) {
    const p = PROFILES[n];
    if (!(Number.isFinite(p.cpu) && p.cpu > 1)) bad.push(`${n}: cpu ${p.cpu} (a slowed processor is > 1)`);
    const m = LINE_FORM.exec(p.line || '');
    if (!m || !(Number(m[2]) > 0)) bad.push(`${n}: line '${p.line}' (the harness's form /<prefix>:<KB a second>[:<ms>])`);
    if (!LANE_NAMES.includes(p.lane)) bad.push(`${n}: lane '${p.lane}' (not in ${LANE_NAMES.join(', ')})`);
    if (!(typeof p.say === 'string' && p.say.length > 20)) bad.push(`${n}: no words`);
    const extra = Object.keys(p).filter((k) => !['say', 'cpu', 'line', 'lane'].includes(k));
    if (extra.length) bad.push(`${n}: a knob no harness reads: ${extra.join(', ')}`);
  }
  check('1. each slows the processor, has a thin line in the harness\'s form, plays a lane of the table, and says what it is', bad.length === 0, bad);
  check('1. the knobs are the harness\'s own variables', PROFILE_KNOBS.cpu === 'BT_QA_CPU_THROTTLE' && PROFILE_KNOBS.line === 'BT_QA_SLOW', PROFILE_KNOBS);
  const harness = readFileSync(join(ROOT, 'tools/qa/mp/harness.mjs'), 'utf8');
  const form = /const _slowOf = \(spec\) => \{\s*const m = (\/.*\/)\.exec/.exec(harness);
  check('1. LINE_FORM is the harness\'s own reading of BT_QA_SLOW', !!form && form[1] === String(LINE_FORM), form && form[1]);
}

/* 2. applyProfile */
{
  for (const n of PROFILE_NAMES) {
    const env = { BT_QA_PROFILE: n };
    const got = applyProfile(env);
    check(`2. ${n} sets both knobs`, env.BT_QA_CPU_THROTTLE === String(PROFILES[n].cpu) && env.BT_QA_SLOW === PROFILES[n].line && got && got.name === n && got.lane === PROFILES[n].lane, env);
    const same = { BT_QA_PROFILE: n, BT_QA_CPU_THROTTLE: String(PROFILES[n].cpu) };
    check(`2. ${n}: a knob set by hand to the profile's own value is fine`, throws(() => applyProfile(same)) === null);
    const clash = throws(() => applyProfile({ BT_QA_PROFILE: n, BT_QA_SLOW: '/x/:1' }));
    check(`2. ${n}: a knob set by hand to another value fails loudly`, !!clash && /BT_QA_SLOW/.test(clash), clash);
  }
  const unknown = throws(() => applyProfile({ BT_QA_PROFILE: 'fast-phone' }));
  check('2. an unknown name fails loudly, naming the table', !!unknown && PROFILE_NAMES.every((n) => unknown.includes(n)), unknown);
  check('2. ...and a name off the object\'s prototype is unknown too', !!throws(() => profileOf('toString')) && !!throws(() => profileOf('__proto__')));
  const none = { BT_QA_CPU_THROTTLE: '3' };
  check('2. no profile changes nothing', applyProfile(none) === null && JSON.stringify(none) === '{"BT_QA_CPU_THROTTLE":"3"}' && profileOf('') === null, none);
}

/* 3. the harness reads it first, and plays its lane */
{
  const h = readFileSync(join(ROOT, 'tools/qa/mp/harness.mjs'), 'utf8');
  const at = h.indexOf('export const PROFILE = applyProfile(process.env);');
  const firstRead = Math.min(...['process.env.BT_QA_SLOW', 'process.env.BT_QA_CPU_THROTTLE'].map((k) => { const j = h.indexOf(k); return j >= 0 ? j : Infinity; }));
  const slowInit = h.indexOf('let _slow = ');
  check('3. the harness applies BT_QA_PROFILE before it reads either knob', at > 0 && at < firstRead && at < slowInit, { at, firstRead, slowInit });
  const laneLines = h.split('\n').filter((l) => /^\s*(let\s+)?_lane\s*=/.test(l));
  check('3. every place the harness sets the page\'s lane puts the profile\'s on it (profileLane)', laneLines.length >= 2 && laneLines.every((l) => /profileLane\(/.test(l) && /PROFILE\)/.test(l)), laneLines);
}

/* 4. profileLane */
{
  check('4. profileLane: the profile\'s lane, else the scenario\'s',
    profileLane('full', PROFILES['hotel-laptop']) === 'light' && profileLane('thirty', null) === 'thirty' && profileLane(TEST_LANE, undefined) === TEST_LANE);
}

console.log(failed ? `\n${failed} FAILED` : '\nqa-profiles: all ok');
process.exit(failed ? 1 : 0);
