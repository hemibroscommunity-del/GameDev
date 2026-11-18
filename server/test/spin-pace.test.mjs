/* ═══ v2.3.6024: THE DAILY SPIN'S PACE OUTLIVES A REJOIN (card RV; TRAPS §276) ═══
 *
 * Card V3's #2128 (pacekeep.js, `pacekeep`) kept eight request paces in the
 * room across a rejoin, and left the ninth, the daily spin's
 * (`_lastDailySpinAt`, dailyrewards.js _handleDailySpin), to card RV.  It was
 * a stamp on `ps` alone, so a script that closed and reopened its socket
 * between asks was not held to SPIN.COOLDOWN_MS: each ask past the pace
 * reads the player's rewards record from storage and answers.  Now:
 *
 *   1. through the real message: a spin, a REJOIN (a new socket, a new `ps`),
 *      a spin inside the pace: still paced (no answer); past the pace:
 *      answered;
 *   2. `pacekeep: false`: the rejoin forgets the pace, as before;
 *   3. the keep is memory only: nothing new written to storage.
 *
 * Red on main before this change: check 1's "still paced" fails. */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { DAILY } from '../src/dailyrewards.js';
const SPIN = DAILY.SPIN;

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
/* the clock stands still unless a test moves it */
const realNow = Date.now;
let NOW = realNow();
Date.now = () => NOW;

async function setup(flags) {
  const storage = makeStorage();
  const room = await openRoom(storage, flags);
  room._drNow = () => NOW;
  const PID = 'bp_spinpace';
  const P = { room, PID, storage, ws: null, ps: null };
  P.rejoin = async () => {
    P.ws = fakeWs('p');
    await join(room, P.ws, PID, { loginTaken: true });
    if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
    P.ps = room.playerState[PID];
    return P.ps;
  };
  P.spin = async () => {
    P.ws.sent.length = 0;
    await room.webSocketMessage(P.ws, JSON.stringify({ type: 'daily_spin', payload: { act: 'collect' } }));
    await settle(); await settle();
    return P.ws.sent.some((m) => m.type === 'rewards_state');
  };
  await P.rejoin();
  return P;
}

// ── 1. across a real rejoin ──
{
  const P = await setup();
  check('1. the first ask is answered', await P.spin(), P.ws.sent.map((m) => m.type));
  const before = P.ps;
  NOW += 1;
  await P.rejoin();
  check('1. ...a rejoin rebuilds ps, the stamp unset on it', P.ps !== before && P.ps._lastDailySpinAt === undefined, P.ps._lastDailySpinAt);
  const putsBefore = [...P.storage._store.keys()].length;
  check('1. a rejoin inside the pace is still paced (no answer)', !(await P.spin()), P.ws.sent.map((m) => m.type));
  check('3. the paced ask wrote nothing', [...P.storage._store.keys()].length === putsBefore);
  NOW += SPIN.COOLDOWN_MS + 1;
  check('1. past the pace, answered again', await P.spin(), P.ws.sent.map((m) => m.type));
}

// ── 2. `pacekeep: false`: as before ──
{
  const Q = await setup({ pacekeep: false });
  const first = await Q.spin();
  NOW += 1;
  await Q.rejoin();
  check('2. `pacekeep: false`: a rejoin forgets the spin\'s pace, as before', first && (await Q.spin()) && !Q.room._paceKeep);
}

Date.now = realNow;
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
