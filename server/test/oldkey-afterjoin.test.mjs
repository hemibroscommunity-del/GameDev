/* ═══ v2.3.5808 (card RV, PR 8): AN OLD KEY'S AFTER-JOIN CHECK HOLDS WHILE `oldkeyheld` DOES ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding SEC-F5 (card SEC's Found).  Card SEC
 * PR 17 (v2.3.5716) held an old login key to the character's own devices
 * whatever `devicelock` says (`oldkeyheld`): the join asks
 * devicelock.js _deviceLockJoin, which asks both.  But the check that runs
 * right after the join (loginkeys.js _keysAfterJoinNow: a device the owner
 * forgot, or a key taken back, while the join was running, puts it out)
 * asked `devicelock` alone: with `devicelock: false`, a device forgotten
 * meanwhile was let stay.  Now it asks either, as the join does.
 *
 *   1. `devicelock: false`, `oldkeyheld` on: an old-key session from a device
 *      no longer on the character's list is put out (`device`);
 *   2. ...one from a device still on it stays;
 *   3. `devicelock` on: put out, as before;
 *   4. both off (`oldkeyheld: false` too): stays, as before.
 *
 * Red on main before this change: check 1 fails.
 */
import { makeStorage, openRoom, fakeWs, baseSession, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}
const ID = 'bp_rvoldkey1';

async function afterJoin(flags, device) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  /* the character's record: an old key, and one device on its list (D9) */
  await st.storage.put('auth:' + ID, { h: 'x', devs: [{ d: 'd9devicex', at: Date.now() - 1000 }] });
  await settle();
  const ws = fakeWs('w');
  room.sessions.set(ws, { ...baseSession(), id: ID });
  await room._keysAfterJoinNow(ws, ID, { device, kv: 1 }, { via: 'old' });
  await settle();
  const rej = ws.sent.find((m) => m.type === 'join_rejected');
  return { out: !!rej, reason: rej && rej.reason, closed: ws.closed };
}

{
  const r = await afterJoin({ devicelock: false }, 'D1forgotten');
  check('1. `devicelock: false`, `oldkeyheld` on: a device not on the list is put out', r.out && r.reason === 'device', r);
}
{
  const r = await afterJoin({ devicelock: false }, 'D9devicex');
  check('2. ...a device on the list stays', !r.out, r);
}
{
  const r = await afterJoin({}, 'D1forgotten');
  check('3. `devicelock` on: put out, as before', r.out && r.reason === 'device', r);
}
{
  const r = await afterJoin({ devicelock: false, oldkeyheld: false }, 'D1forgotten');
  check('4. both off: stays, as before', !r.out, r);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
