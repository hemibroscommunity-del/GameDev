/* ═══ v2.3.5910: THE SCORE'S RISE, WRITTEN, SO A DEPLOY FORGETS NONE OF IT (botfp.js; card K4 PR 11) ═══
 *
 * Card LG's league (#2184, tools/league): the real page driven at machine
 * pace (rung 3) is flagged by botfp at every frame rate, but passed every
 * detector with a deploy halfway: botfp's score lived in memory between its
 * paced writes (PUT_MIN_MS, five minutes), so the first strike's 2 was on
 * file and the rest forgotten.  botfp.js _botfpScoreRose writes a rise of
 * the score under FLAG_AT with the strike or cook that made it.  This holds:
 *   1. a script's strikes, a deploy (a new room on the same storage, the
 *      player joining again) after three of them: the score is on file, and
 *      three more after the deploy flag `suspicion-threshold`;
 *   2. `botscoresave: false`: the five-minute pace alone -- the same deploy
 *      forgets the rises and the three after it do not flag (as on main);
 *   3. the cost: a person's strikes (no floor tripped, no path twice) write
 *      no more than the pace did; a script's past its flag write no more
 *      than the pace and its flags; never a write a move;
 *   4. a cook's replay (the same path twice) is written the same way.
 * Red on main (v2.3.5726): 1 and 4 (no rise is written). */
import { makeStorage, openRoom, fakeWs, join } from './testroom.mjs';
import { BOTFP } from '../src/botfp.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
let T = 1_995_000_000_000;
const realNow = Date.now;
Date.now = () => T;
const PID = 'bp_botdeploy';
const flush = () => new Promise((r) => setTimeout(r, 0));

/* a storage whose botstat writes are counted */
function counted() {
  const S = makeStorage();
  const put = S.storage.put.bind(S.storage);
  S.botPuts = 0;
  S.storage.put = async (k, v) => { if (typeof k === 'string' && k.startsWith('botstat:')) S.botPuts++; return put(k, v); };
  return S;
}
async function enter(S, flags) {
  const room = await openRoom(S, flags);
  const ws = fakeWs('d');
  await join(room, ws, PID, { loginTaken: true, data: {} });
  const session = room.sessions.get(ws);
  const ps = room.playerState[PID];
  let n = 0;
  /* two floors tripped (a script's gesture); `person`: none, a path of its own */
  const strike = (person) => {
    T += 20000;
    const fp = person ? { ent: 0.5, tv: 20, vc: 0.3, h: 'p' + (n++) + '_' + T } : { ent: 0, tv: 0, vc: 0.5, h: 's' + (n++) + '_' + T };
    return room._botfpOnStrike(session, ps, { accuracy: 'good', skill: 'mining', swipeFp: fp, now: T });
  };
  const rec = () => room._botfp.get(PID);
  const flagged = () => (rec().flags || []).some((f) => f.kind === 'suspicion-threshold');
  return { room, session, ps, strike, rec, flagged };
}
const FLAG_AT = BOTFP.FLAG_AT, SYNTH = BOTFP.SCORE_SYNTH;
const before = Math.ceil(FLAG_AT / SYNTH) - 2;   /* strikes before the deploy, and after it three: over the line with all of them (the score decays between), under it with the first alone */

/* ── 1. on: a deploy forgets none of the rise ── */
{
  const S = counted();
  const a = await enter(S);
  for (let i = 0; i < before; i++) a.strike();
  await flush();
  const onFile = S.storage.get('botstat:' + PID);
  const stored = await onFile;
  check(`1. ${before} scripted strikes: the score on file is all of it (${stored && stored.score})`, stored && stored.score >= before * SYNTH - 0.1, stored && { score: stored.score, live: a.rec().score });
  T += 5000;
  const b = await enter(S);   /* the deploy: a new room on the same storage, the player joins again */
  check('1. ...the room after the deploy reads it back', b.rec().score >= before * SYNTH - 0.2, b.rec().score);
  b.strike(); b.strike(); b.strike();
  check('1. ...and three more scripted strikes flag `suspicion-threshold` (the league\'s rung 3 through a deploy)', b.flagged(), { score: b.rec().score, flags: b.rec().flags });
}

/* ── 2. off: as on main ── */
{
  const S = counted();
  const a = await enter(S, { botscoresave: false });
  for (let i = 0; i < before; i++) a.strike();
  await flush();
  const stored = await S.storage.get('botstat:' + PID);
  check('2. `botscoresave: false`: only the first strike\'s score is on file (the pace)', stored && stored.score < 2 * SYNTH, stored && stored.score);
  T += 5000;
  const b = await enter(S, { botscoresave: false });
  b.strike(); b.strike(); b.strike();
  check('2. ...and the deploy lets the script through: no flag', !b.flagged(), b.rec().score);
}

/* ── 3. the cost ── */
{
  const S = counted();
  const a = await enter(S);
  const n0 = S.botPuts;
  for (let i = 0; i < 12; i++) a.strike(true);   /* four minutes of a person's strikes */
  await flush();
  check(`3. a person's 12 strikes in four minutes: ${S.botPuts - n0} botstat write(s), the pace's one`, S.botPuts - n0 === 1 && a.rec().score === 0, { puts: S.botPuts - n0, score: a.rec().score });
  T += BOTFP.PUT_MIN_MS;
  const S2 = counted();
  const c = await enter(S2);
  const m0 = S2.botPuts;
  let k = 0;
  while (!c.flagged() && k < 20) { c.strike(); k++; }
  await flush();
  const toFlag = S2.botPuts - m0;
  check(`3. a script: ${toFlag} writes for its ${k} strikes to the flag (at most one a strike, the flag's own included)`, c.flagged() && toFlag <= k, { toFlag, k });
  const m1 = S2.botPuts;
  for (let i = 0; i < 12; i++) c.strike();   /* four minutes more, past the line */
  await flush();
  check(`3. ...past the line, 12 more strikes in four minutes write ${S2.botPuts - m1} (the pace alone: at most one)`, S2.botPuts - m1 <= 1, S2.botPuts - m1);
}

/* ── 4. a cook's replay ── */
{
  const S = counted();
  const a = await enter(S);
  T += 1000;
  a.room._botfpOnCook(a.session, a.ps, { kind: 'cooked', swipeFp: { h: 'cook_same' } });
  await flush();
  const n0 = S.botPuts;
  T += 20000;
  a.room._botfpOnCook(a.session, a.ps, { kind: 'cooked', swipeFp: { h: 'cook_same' } });
  await flush();
  const stored = await S.storage.get('botstat:' + PID);
  check('4. a cook\'s path drawn twice: the replay\'s score is written with it', S.botPuts - n0 === 1 && stored && stored.score >= BOTFP.SCORE_REPLAY - 0.1, { puts: S.botPuts - n0, score: stored && stored.score });
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
