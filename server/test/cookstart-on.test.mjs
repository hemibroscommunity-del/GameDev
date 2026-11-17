/* ═══ v2.3.5727: `cookstart` ON, AND A DROPPED RESULT KEEPS ITS PLAN (card K2 PR 8) ═══
 *
 * The owner, 2026-11-17: "Go recommended on all" -- the planning session
 * turned `cookstart` (cooking.js, v2.3.5553, card K PR 14) on by default,
 * beside `bowshot`.  And sitting 36's review, Found (c): `_cookStartTake`
 * spent the plan (or the session's one no-plan result) BEFORE the 900 ms
 * floor and the bag's fish check, so a result those dropped still spent it.
 * This holds:
 *
 *   1. the reader: on with no flag, off only with `cookstart: false`;
 *   2. on by default, a result sent at once on a fresh plan is dropped, the
 *      fish kept, the plan unspent; at the plan's quickest it cooks, once;
 *   3. a result the 900 ms floor drops does not spend its plan: the next
 *      one, past the floor, cooks on it;
 *   4. nor one the fish check drops (no fish in the bag): with the fish back,
 *      it cooks on the same plan;
 *   5. nor the session's one no-plan result (a restart mid-cook): a floor
 *      drop leaves it, the next cooks, and a second no-plan result is
 *      refused;
 *   6. `cookstart: false`: a result at once cooks, as before.
 *
 * Red on main (v2.3.5726): 1 and 2 (off by default), 3, 4 and 5 (spent
 * before the floor and the fish check). */
import { makeStorage, openRoom, fakeWs, join } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const PID = 'bp_cso';

async function setup(flags) {
  const room = await openRoom(makeStorage(), flags);
  const ws = fakeWs('c');
  await join(room, ws, PID, { loginTaken: true });
  const ps = room.playerState[PID];
  ps.inventory = { ...(ps.inventory || {}), fish_minnow: 5 };
  ps.lifeSkills = { cooking: { level: 1, xp: 0 } };
  ps._cookHistory = []; ps._lastCookAt = 0;
  const send = (type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  const session = room.sessions.get(ws);
  let seq = 0;
  const start = () => send('extraction_start', { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: ++seq });
  const cook = () => send('cook_request', { fishKey: 'fish_minnow', kind: 'cooked', taps: [] });
  /* the plan's rolledAt put back past its quickest (each hit's beat after
     the first, the honest cycle's floor): the time an honest page plays */
  const ripen = () => { if (ps._cookHits) ps._cookHits.rolledAt -= 60000; };
  const cooked = () => ps.inventory.cooked_fish_minnow || 0;
  /* a cooked fish clears its plan (ps._cookHits = null), so the result after
     it has none and could take the session's one no-plan result (a restart
     mid-cook): sections 2-4 spend that first, to read the plan alone; 5
     reads it */
  const noPlanSpent = () => { session._cookNoPlan = true; };
  return { room, ws, ps, session, send, start, cook, ripen, cooked, noPlanSpent };
}

/* ── 1. the reader ── */
{
  const a = await setup();
  const b = await setup({ cookstart: false });
  const c = await setup({ cookstart: true });
  check('1. `cookstart` is on with no flag (ON since v2.3.5727)', a.room._cookStartOn() === true);
  check('1. ...off with `cookstart: false`, on with `cookstart: true`', b.room._cookStartOn() === false && c.room._cookStartOn() === true);
}

/* ── 2. on by default: at once dropped, at the plan's quickest cooked ── */
{
  const t = await setup();
  t.noPlanSpent();
  await t.start();
  const plan = t.ps._cookHits;
  await t.cook();
  check('2. a result sent at once on a fresh plan is dropped: no fish cooked, the fish kept', t.cooked() === 0 && t.ps.inventory.fish_minnow === 5, t.ps.inventory);
  check('2. ...and the plan is not spent', !!plan && t.ps._cookHits === plan && !plan.used, plan);
  t.ripen();
  await t.cook();
  check('2. at the plan\'s quickest it cooks, once', t.cooked() === 1 && t.ps.inventory.fish_minnow === 4, t.ps.inventory);
  t.ps._lastCookAt = 0;
  await t.cook();
  check('2. ...and a second result on the same plan is dropped', t.cooked() === 1, t.ps.inventory);
}

/* ── 3. the 900 ms floor's drop keeps the plan (Found (c)) ── */
{
  const t = await setup({ cookstart: true });
  t.noPlanSpent();
  await t.start(); t.ripen();
  const plan = t.ps._cookHits;
  t.ps._lastCookAt = Date.now();   /* a cook a moment ago */
  await t.cook();
  check('3. a result inside the 900 ms floor is dropped', t.cooked() === 0, t.ps.inventory);
  check('3. ...without spending its plan', t.ps._cookHits === plan && !plan.used, plan);
  t.ps._lastCookAt = 0;
  await t.cook();
  check('3. the next result, past the floor, cooks on that plan', t.cooked() === 1, t.ps.inventory);
}

/* ── 4. the fish check's drop keeps the plan ── */
{
  const t = await setup({ cookstart: true });
  t.noPlanSpent();
  await t.start(); t.ripen();
  const plan = t.ps._cookHits;
  t.ps.inventory.fish_minnow = 0;
  await t.cook();
  check('4. a result with no fish in the bag is dropped', t.cooked() === 0, t.ps.inventory);
  check('4. ...without spending its plan', t.ps._cookHits === plan && !plan.used, plan);
  t.ps.inventory.fish_minnow = 1;
  await t.cook();
  check('4. with the fish back, it cooks on the same plan', t.cooked() === 1 && !t.ps.inventory.fish_minnow, t.ps.inventory);
}

/* ── 5. the session's one no-plan result ── */
{
  const t = await setup({ cookstart: true });
  t.ps._cookHits = null;   /* the worker restarted mid-cook */
  t.ps._lastCookAt = Date.now();
  await t.cook();
  check('5. a no-plan result inside the floor is dropped, the session\'s one no-plan result kept', t.cooked() === 0 && !t.session._cookNoPlan, { cooked: t.cooked(), noPlan: t.session._cookNoPlan });
  t.ps._lastCookAt = 0;
  await t.cook();
  check('5. the next, past the floor, cooks on it', t.cooked() === 1 && t.session._cookNoPlan === true, { cooked: t.cooked(), noPlan: t.session._cookNoPlan });
  t.ps._lastCookAt = 0;
  await t.cook();
  check('5. ...and a second no-plan result is refused', t.cooked() === 1, t.ps.inventory);
}

/* ── 6. the switch ── */
{
  const t = await setup({ cookstart: false });
  await t.start();
  await t.cook();
  check('6. `cookstart: false`: a result at once cooks, as before', t.cooked() === 1, t.ps.inventory);
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
