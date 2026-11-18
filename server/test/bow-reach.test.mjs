/* ═══ v2.3.5901: THE BOW'S REACH, FROM WHERE THE ARROW LEFT (bowshot.js; card K4 PR 2) ═══
 *
 * Grand plan step 4.2, a sword's claim labelled a bow's (TRAPS §329): with
 * `bowshot` an ordinary `ranged` claim lands only on an arrow the worker saw
 * leave, but the hit test's reach (hitproof.js _hitReach) is measured from
 * where the archer stands NOW, with a second of the fastest run on top:
 * 1,490 px for a new character.  `bowreach` (ON; `bowreach: false` its kill
 * switch) holds a claim on an arrow seen to the arrow's own flight from where
 * the archer stood at its relay (_hitArrowReach), and gives a claim with no
 * arrow seen a small allowance of its own.  This holds:
 *
 *   1. the reader: on with no flag, off with `bowreach: false`, and off with
 *      `bowshot: false` (it judges bowshot's arrows); the numbers;
 *   2. a claim on an arrow seen, the monster within its flight of where the
 *      archer stood at the relay: lands -- even with the archer since run
 *      far away (the arrow does not move with them);
 *   3. ...the monster past that flight: the arrow does not fit, and the
 *      claim falls to the no-arrow allowance;
 *   4. claims with no arrow seen: LOST_BURST land, the next is dropped, one
 *      more after LOST_MS;
 *   5. `bowreach: false`: the arrow's origin is not read and claims with no
 *      arrow seen take only bowshot's allowance, as before;
 *   6. a paid retreat's arrow (no origin kept) still fits anywhere.
 *
 * Red on main (v2.3.5726): every check (no `bowreach`). */
import { makeStorage, openRoom, fakeWs, join } from './testroom.mjs';
import { BOW_SHOT } from '../src/bowshot.js';
import { HIT_PROOF } from '../src/hitproof.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const PID = 'bp_breach';
let T = 1_980_000_000_000;
const realNow = Date.now;
Date.now = () => T;

async function setup(flags) {
  const room = await openRoom(makeStorage(), flags);
  const ws = fakeWs('b');
  await join(room, ws, PID, { loginTaken: true, data: { x: 0, y: 0, z: WHEEL_ZONE } });
  const ps = room.playerState[PID];
  ps.z = WHEEL_ZONE; ps.x = 0; ps.y = 0;
  ps.rangedWeapon = { type: 'bow', tier: 'common', tierMult: 1, name: 'pine bow' };
  /* two monsters of the room's own, placed where each check needs them */
  const mons = room.monsters[WHEEL_ZONE] = [{ id: 'm_a', x: 0, y: 0, alive: true, hp: 50 }, { id: 'm_b', x: 0, y: 0, alive: true, hp: 50 }];
  const session = room.sessions.get(ws);
  const relay = () => room._bowShotSeen(session, { x: ps.x, y: ps.y, ang: 0, isStaff: false }, T);
  const drop = (id) => room._bowShotDrop(ps, undefined, id, T);
  return { room, ps, mons, relay, drop };
}

/* ── 1. the reader, the numbers ── */
{
  const a = await setup(), b = await setup({ bowreach: false }), c = await setup({ bowshot: false });
  check('1. `bowreach` is on with no flag, off with `bowreach: false`, and off with `bowshot: false`', a.room._bowReachOn() === true && b.room._bowReachOn() === false && c.room._bowReachOn() === false);
  const r = a.room._hitArrowReach(a.ps);
  const full = a.room._hitReach(a.ps, 'ranged', T);
  check('1. a new character\'s arrow: 675 px x its Range, +150 +250 of slack, under the hit test\'s reach (a second of the run on top)',
    r === HIT_PROOF.ARROW_PX * a.room._hitRangeMult(a.ps, 'bow') + HIT_PROOF.ARROW_SLACK_PX + HIT_PROOF.ARROW_ORIGIN_SLACK_PX && r < full, { r, full });
}

/* ── 2, 3. an arrow seen: from where it left ── */
{
  const t = await setup();
  const reach = t.room._hitArrowReach(t.ps);
  t.mons[0].x = reach - 5;
  t.relay();
  t.ps.x = -3000;   /* the archer has since run off: the arrow does not move with them */
  check('2. a claim on an arrow seen, the monster within its flight of where the archer stood: lands, the archer since far away', t.drop('m_a') === false);
  T += 2000;
  t.ps.x = 0;
  t.relay();
  t.mons[1].x = reach + 5;
  const s = t.room._bowShotState(t.ps);
  s.lost = BOW_SHOT.LOST_BURST; s.lostT = T;   /* v2.3.5904: full and refilled now, so the read is the spend alone (whatever the claims before spent) */
  const lost0 = s.lost;
  check('3. the monster past that flight: the arrow does not fit, the claim falls to the no-arrow allowance (one spent)', t.drop('m_b') === false && s.lost <= lost0 - 1 + 1e-9, { lost0, lost: s.lost });
  check('3. ...the arrow seen keeps its target left for a monster it reaches', s.q.some((x) => x.o && !x.ids));
}

/* ── 4. claims with no arrow seen: their own allowance ── */
{
  const t = await setup();
  t.mons[0].x = 300;
  const landed = [];
  for (let i = 0; i < BOW_SHOT.LOST_BURST + 1; i++) { T += 500; landed.push(!t.drop(i % 2 ? 'm_a' : 'm_b')); }
  /* each 500 ms apart: the bow's allowance refills (its cycle is shorter),
     the lost one a sixth */
  check('4. claims with no arrow seen: the first land, then one is dropped (LOST_BURST, one back every LOST_MS)', landed.slice(0, BOW_SHOT.LOST_BURST).every(Boolean) && landed[BOW_SHOT.LOST_BURST] === false, landed);
  T += BOW_SHOT.LOST_MS;
  check('4. ...one more after LOST_MS', t.drop('m_a') === false);
}

/* ── 5. `bowreach: false`: as before ── */
{
  const t = await setup({ bowreach: false });
  const reach = t.room._hitArrowReach(t.ps);
  t.mons[0].x = reach + 200;
  t.relay();
  check('5. `bowreach: false`: no origin kept, the arrow fits the far monster', t.drop('m_a') === false && !t.room._bowShotState(t.ps).q[0].o);
  const landed = [];
  for (let i = 0; i < BOW_SHOT.LOST_BURST + 2; i++) { T += 1000; landed.push(!t.drop(i % 2 ? 'm_a' : 'm_b')); }
  check('5. ...and claims with no arrow seen take only bowshot\'s allowance', landed.every(Boolean), landed);
}

/* ── 6. a paid retreat's arrow ── */
{
  const t = await setup();
  t.mons[0].x = 3000;
  t.ps._rollKind = 'retreat'; t.ps._rollUntil = T + 400;
  t.room._bowShotSeen(t.room.sessions.values().next().value, { retreat: 1, isStaff: false, ang: 0 }, T);
  const q = t.room._bowShotState(t.ps).q;
  check('6. a paid retreat\'s arrow keeps no origin, and fits a monster anywhere', q.length === 1 && !q[0].o && t.drop('m_a') === false, q);
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
