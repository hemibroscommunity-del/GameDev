/* ═══ v2.3.5904: THE BOW'S PATH (bowshot.js THE PATH; card K4 PR 5) ═══
 *
 * Grand plan step 4.2, a sword's claim labelled a bow's (TRAPS §329): what
 * was left of the bow's gain with `bowreach` was a claim naming its monster
 * when it lands.  `bowpath` (OFF as merged at v2.3.5904; ON by default since
 * v2.3.5906, `bowpath: false` its kill switch) holds a claim on
 * an arrow seen to the arrow's line (its relay's x, y and angle) and its
 * flight time.  This holds:
 *
 *   1. the reader: on with no flag (v2.3.5906) and with `true`, off with
 *      `bowpath: false`, and off with
 *      `bowshot: false` (it judges bowshot's arrows);
 *   2. on: a claim on the monster down the arrow's line, after the arrow
 *      could have flown there: lands;
 *   3. on: ...the same claim sooner than the arrow could have flown: the
 *      arrow does not fit (the claim falls to the no-arrow allowance);
 *   4. on: a monster well off the line does not fit the arrow, even late;
 *   5. on: a relay whose x, y is far from the worker's copy of the archer is
 *      measured from the copy;
 *   6. off (`bowpath: false`): the line and the time are not read -- the early,
 *      off-line claim lands on the arrow, as before;
 *   7. (v2.3.5905) on: the side is measured to the monster's body, its feet
 *      up 130 px (a boss's 260): a boss hit up its body fits the arrow.
 *
 * Red on main (v2.3.5726): every check but 6 (no `bowpath`). */
import { makeStorage, openRoom, fakeWs, join } from './testroom.mjs';
import { BOW_SHOT } from '../src/bowshot.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const PID = 'bp_bpath';
let T = 1_985_000_000_000;
const realNow = Date.now;
Date.now = () => T;

async function setup(flags) {
  const room = await openRoom(makeStorage(), flags);
  const ws = fakeWs('p');
  await join(room, ws, PID, { loginTaken: true, data: { x: 0, y: 0, z: WHEEL_ZONE } });
  const ps = room.playerState[PID];
  ps.z = WHEEL_ZONE; ps.x = 0; ps.y = 0;
  ps.rangedWeapon = { type: 'bow', tier: 'common', tierMult: 1, name: 'pine bow' };
  const mons = room.monsters[WHEEL_ZONE] = [{ id: 'm_a', x: 600, y: 0, alive: true, hp: 50 }, { id: 'm_b', x: 0, y: 600, alive: true, hp: 50 }];
  const session = room.sessions.get(ws);
  const relay = (p) => room._bowShotSeen(session, { x: ps.x, y: ps.y, ang: 0, isStaff: false, ...(p || {}) }, T);
  const drop = (id) => room._bowShotDrop(ps, undefined, id, T);
  const lost = () => room._bowShotState(ps).lost;
  /* the time the arrow takes to fly `d` px, as the judge reads it */
  const flight = (d) => (Math.max(0, d - BOW_SHOT.PATH_BACK_PX) / (BOW_SHOT.ARROW_PX_S * room._hitRangeMult(ps, 'bow'))) * 1000;
  return { room, ps, mons, relay, drop, lost, flight };
}

/* ── 1. the reader ── */
{
  const a = await setup(), b = await setup({ bowpath: true }), c = await setup({ bowpath: true, bowshot: false }), d = await setup({ bowpath: false });
  check('1. `bowpath` is on with no flag (v2.3.5906) and with `true`, off with `bowpath: false` and with `bowshot: false`', a.room._bowPathOn() === true && b.room._bowPathOn() === true && c.room._bowPathOn() === false && d.room._bowPathOn() === false);
}

/* ── 2, 3. on: the line and the time ── */
{
  const t = await setup({ bowpath: true });
  t.relay();
  T += Math.ceil(t.flight(600));
  const l0 = t.lost();
  check('2. on: the monster down the arrow\'s line, after its flight: lands on the arrow', t.drop('m_a') === false && t.lost() === l0, { lost: t.lost() });
  T += 1000;
  t.relay();
  T += 1;   /* a claim 1 ms after the relay: no arrow flies 600 px that fast */
  const s = t.room._bowShotState(t.ps);
  const before = s.lost;
  t.drop('m_a');
  check('3. on: the same claim sooner than the arrow could have flown does not fit it (the no-arrow allowance spent)', s.lost <= before - 1 + 1e-9, { before, after: s.lost });
}

/* ── 4. on: off the line ── */
{
  const t = await setup({ bowpath: true });
  t.relay();   /* aimed east, at m_a */
  T += 2000;
  const s = t.room._bowShotState(t.ps);
  const before = s.lost;
  t.drop('m_b');   /* m_b stands due south, 600 px off the line */
  check('4. on: a monster well off the arrow\'s line does not fit it, even late', s.lost <= before - 1 + 1e-9 && s.q.some((x) => x.p && !x.ids), { before, after: s.lost });
}

/* ── 5. on: a far relay is measured from the worker's copy ── */
{
  const t = await setup({ bowpath: true });
  t.relay({ x: 5000, y: 5000 });
  const shot = t.room._bowShotState(t.ps).q[0];
  check('5. on: a relay\'s x, y far from the worker\'s copy of the archer: the line starts at the copy', !!shot.p && shot.p.x === 0 && shot.p.y === 0, shot.p);
  const u = await setup({ bowpath: true });
  u.relay({ x: 30, y: -20 });
  const shot2 = u.room._bowShotState(u.ps).q[0];
  check('5. ...one near it (a phone a move ahead): the relay\'s own', shot2.p.x === 30 && shot2.p.y === -20, shot2.p);
}

/* ── 7. on: the side is measured to the monster's body (v2.3.5905) ── */
{
  const t = await setup({ bowpath: true });
  t.mons[0].x = 300; t.mons[0].y = 250; t.mons[0]._dungeonBoss = true;   /* a boss 250 px below the line (y grows down): its body rises across it */
  t.relay();
  T += 2000;
  const s = t.room._bowShotState(t.ps);
  const before = s.lost;
  check('7. on: a boss whose body crosses the arrow\'s line, its feet 250 px off it: the arrow fits (its body is hit, not its feet)', t.drop('m_a') === false && s.lost === before, { before, after: s.lost });
  const u = await setup({ bowpath: true });
  u.mons[0].x = 300; u.mons[0].y = 400;   /* an ordinary monster: its body 400 to 270 px off the line */
  u.relay();
  T += 2000;
  const su = u.room._bowShotState(u.ps);
  const b2 = su.lost;
  u.drop('m_a');
  check('7. ...an ordinary monster whose body stays 270 px off the line does not fit it', su.lost <= b2 - 1 + 1e-9, { before: b2, after: su.lost });
}

/* ── 6. off: as before ── */
{
  const t = await setup({ bowpath: false });
  t.relay();
  T += 1;
  const s = t.room._bowShotState(t.ps);
  const before = s.lost;
  check('6. off (`bowpath: false`): an early claim off the line lands on the arrow, the no-arrow allowance untouched', t.drop('m_b') === false && s.lost === before && !s.q[0].p, { before, after: s.lost });
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
