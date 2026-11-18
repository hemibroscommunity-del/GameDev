/* ═══ v2.3.5907: STRIKES WITHOUT A START, COUNTED IN A WINDOW (botfp.js; card K4 PR 8) ═══
 *
 * Card LG's B6 (docs/specs/honest-trouble.md): the `strikes-without-start`
 * flag read a count kept for life, so an honest player on a flaky line (a
 * hidden tab's dropped socket, a second drop inside ten minutes mid-harvest)
 * reached it over weeks.  This holds:
 *   1. twenty in an hour flag (a script);
 *   2. twenty spread over twenty hours do not (an honest flaky line), and
 *      `counters.startless` still counts all twenty;
 *   3. the first within STARTLESS_JOIN_GRACE_MS of a join is not counted
 *      toward the flag (the dropped socket's own replay is one strike); the
 *      next one is.
 * Red on main (v2.3.5726): 2 and 3. */
import { makeStorage, openRoom, fakeWs, join } from './testroom.mjs';
import { BOTFP } from '../src/botfp.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
let T = 1_990_000_000_000;
const realNow = Date.now;
Date.now = () => T;
const PID = 'bp_startless';

async function setup() {
  const room = await openRoom(makeStorage());
  const ws = fakeWs('s');
  await join(room, ws, PID, { loginTaken: true });
  const session = room.sessions.get(ws);
  const flagged = () => { const r = room._botfp.get(PID); return !!(r && Array.isArray(r.flags) && r.flags.some((f) => f.reason === 'strikes-without-start' || f.kind === 'strikes-without-start' || JSON.stringify(f).includes('strikes-without-start'))); };
  const count = () => room._botfp.get(PID).counters.startless || 0;
  return { room, session, flagged, count };
}

/* ── 1. a script: twenty in an hour ── */
{
  const t = await setup();
  T += BOTFP.STARTLESS_JOIN_GRACE_MS + 1;
  for (let i = 0; i < BOTFP.STARTLESS_FLAG_AT; i++) { T += 1000; t.room._botfpOnStartless(t.session, 'no-start', T); }
  check('1. twenty startless strikes in a minute flag `strikes-without-start`', t.flagged(), t.room._botfp.get(PID).flags);
}

/* ── 2. an honest flaky line: twenty over twenty hours ── */
{
  const t = await setup();
  for (let i = 0; i < BOTFP.STARTLESS_FLAG_AT; i++) { T += 3600000; t.room._botfpOnStartless(t.session, 'no-start', T); }
  check('2. twenty spread an hour apart do not flag (the count was for life)', !t.flagged(), t.room._botfp.get(PID).flags);
  check('2. ...and the lifetime count still holds all twenty, for the admin view', t.count() === BOTFP.STARTLESS_FLAG_AT, t.count());
}

/* ── 3. the replay after a join ── */
{
  const t = await setup();
  T += 100;
  t.room._botfpOnStartless(t.session, 'no-start', T);
  const rec = t.room._botfp.get(PID);
  check('3. the first startless strike just after a join is counted but not toward the flag', t.count() === 1 && (rec.startlessWin || []).length === 0, { win: rec.startlessWin, count: t.count() });
  T += 100;
  t.room._botfpOnStartless(t.session, 'no-start', T);
  check('3. ...the second, still inside the grace, is (a script hammering after its join)', rec.startlessWin.length === 1, rec.startlessWin);
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
