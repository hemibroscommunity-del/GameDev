/* ═══ v2.3.6021 (card RV; V4's Found): THE DAILY CHEST'S STAMP AND SAVE, ONE WRITE ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), routed by the planning session from card
 * V4: `_handleChestOpen` awaited the open's stamp, then saved the record
 * (the key taken, the prize given) in a later write.  A restart between left
 * the stamp saying "opened" over a record that never was: a re-sent open was
 * a 'dup', answered with nothing (the MD-2 family; its switch `paidmark`).
 *
 *   1. an open cut at each write: never the stamp on file beside a record
 *      that still holds the key;
 *   2. uncut: the key taken once, the stamp written;
 *   3. `paidmark: false`: the old two writes (a cut between leaves it).
 *
 * Red on main before this change: check 1 fails.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const P = 'bp_rvchest001';
const ECON = { v: 1, g: { m: 0, b: 0 }, i: {} };

async function openCut(flags, cut) {
  const st = makeStorage(new Map([['rpg:' + P, { _v: RPG_SCHEMA_VERSION, coins: 10, inventory: { daily_chest: 1 }, level: 5, hp: 100, maxHp: 100, _econ: ECON }]]));
  const room = await openRoom(st, flags);
  const ws = fakeWs('a');
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  try { await join(room, ws, P, { loginTaken: true }); } finally { [console.warn, console.error] = back; }
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  await settleN(4);
  st.crashAt(st.batches() + cut);
  try { await room.webSocketMessage(ws, JSON.stringify({ type: 'chest_open', payload: { invKey: 'daily_chest', opId: 'rv-chest-op-1' } })); } catch (e) { /* a crashed write */ }
  await settleN(6);
  const rec = st._store.get('rpg:' + P);
  return { stamp: st._store.has('oplog:chestop:rv-chest-op-1'), keyOnFile: ((rec && rec.inventory && rec.inventory.daily_chest) || 0) };
}

{
  const bad = [];
  for (let cut = 0; cut <= 3; cut++) { const r = await openCut(null, cut); if (r.stamp && r.keyOnFile > 0) bad.push({ cut, ...r }); }
  check('1. an open cut at each write: never the stamp beside a record still holding the key', bad.length === 0, bad);
  const whole = await openCut(null, 99);
  check('2. uncut: the key taken once and the stamp written', whole.stamp && whole.keyOnFile === 0, whole);
}
{
  let left = false;
  for (let cut = 0; cut <= 3 && !left; cut++) { const r = await openCut({ paidmark: false }, cut); if (r.stamp && r.keyOnFile > 0) left = true; }
  check('3. `paidmark: false`: the old two writes (a cut between leaves the stamp beside the key)', left);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
