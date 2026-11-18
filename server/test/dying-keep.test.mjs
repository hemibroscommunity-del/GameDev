/* ═══ v2.3.5803 (card RV, PR 4): GOODS THAT LAND IN THE DYING SECONDS ARE KEPT ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding MS-3.  A player is a live recipient
 * in the five seconds between a death and the respawn, and the respawn runs
 * the second wipe of the bag: whatever a credit put there then was taken out
 * again.  A trade window both sides had readied, confirmed by the other side
 * after a death to a monster, took the dead side's gold and wiped the goods
 * it paid for.  Now goods credited then join the death's shield, which the
 * respawn wipe keeps, capped at what the bag still holds (`dyingkeep`).
 *
 *   1. the trade: paid 1000 for 50 shards, died, the other side confirms,
 *      the respawn: the 50 shards kept, live and on file;
 *   2. a credit straight to a dying player (an Auction House or market leg):
 *      kept;
 *   3. what the bag held BEFORE the death is still wiped (only the credited
 *      part is shielded), and what left the bag in the dying seconds does not
 *      come back (the shield's cap);
 *   4. a credit to a living player shields nothing;
 *   5. `dyingkeep: false`: wiped at the respawn, as before.
 *
 * Red on main before this change: checks 1, 2a, 2b and 3a fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';
import { bagTake } from '../src/bag.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : 0);

async function pair(flags) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const A = 'bp_rvdying01', B = 'bp_rvtrade01';
  const wa = fakeWs('a'), wb = fakeWs('b');
  await join(room, wa, A, { loginTaken: true, data: { x: 100, y: 100, z: 'town' } });
  await join(room, wb, B, { loginTaken: true, data: { x: 100, y: 100, z: 'town' } });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const pa = room.playerState[A], pb = room.playerState[B];
  room._goldSet(pa, 1000, 'restore'); room._goldSet(pb, 0, 'restore');
  pb.inventory = { shard_ember: 50 };
  room._saveRpg(A, pa); room._saveRpg(B, pb); await settleN(2);
  const cmd = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };
  return { st, room, A, B, wa, wb, pa, pb, cmd };
}
const respawn = async (room, clock) => { clock.advance(6000); room._tickPlayerRespawn(); await settleN(3); };

/* ── 1. the trade ── */
async function tradeCase(flags) {
  const clock = seededClock().install();
  try {
    const { st, room, A, wa, wb, pa, cmd } = await pair(flags);
    await cmd(wa, 'trade2_open', { target: 'bp_rvtrade01' });
    await cmd(wb, 'trade2_open', { target: A });
    await cmd(wa, 'trade2_set', { offer: { _gold: 1000 } });
    await cmd(wb, 'trade2_set', { offer: { shard_ember: 50 } });
    await cmd(wa, 'trade2_ready', { ready: true }); await cmd(wb, 'trade2_ready', { ready: true });
    clock.advance(3000);
    await cmd(wa, 'trade2_confirm', {});
    room._handlePlayerDeath(pa, A, 'monster:slime');
    await settle();
    await cmd(wb, 'trade2_confirm', {});
    await settleN(2);
    const paid = room.playerState[A].coins;
    await respawn(room, clock);
    const live = own(room.playerState[A].inventory, 'shard_ember');
    const disk = own((st._store.get('rpg:' + A) || {}).inventory, 'shard_ember');
    return { paid, live, disk, alive: !room.playerState[A].dying };
  } finally { clock.restore(); }
}
{
  const r = await tradeCase(null);
  check('1. the trade confirmed after a death: paid 1000, the 50 shards kept through the respawn, live and on file', r.paid === 0 && r.alive && r.live === 50 && r.disk === 50, r);
}

/* ── 2 to 4. credits straight to a player ── */
async function creditCase(flags, opts) {
  const clock = seededClock().install();
  try {
    const { st, room, A, pa } = await pair(flags);
    pa.inventory = { shard_ember: 5, ore_iron: 3 };
    if (opts.alive) {
      await room._creditPlayer(A, { opId: 'rvtest:alive', source: 'market', kind: 'item', payload: { invKey: 'shard_ember', count: 7 }, note: 'test' });
      return { shield: pa._deathShield || null, shards: own(pa.inventory, 'shard_ember') };
    }
    room._handlePlayerDeath(pa, A, 'monster:slime');
    await settle();
    await room._creditPlayer(A, { opId: 'rvtest:leg', source: 'store', kind: 'item', payload: { invKey: 'shard_ember', count: 40 }, note: 'test' });
    await settleN(2);
    if (opts.spend) { bagTake(room.playerState[A].inventory, 'shard_ember', opts.spend, 'shop_sell'); }
    await respawn(room, clock);
    const inv = room.playerState[A].inventory;
    return { shards: own(inv, 'shard_ember'), disk: own((st._store.get('rpg:' + A) || {}).inventory, 'shard_ember') };
  } finally { clock.restore(); }
}
{
  const r = await creditCase(null, {});
  check('2a. 40 shards credited in the dying seconds are kept through the respawn', r.shards === 40, r);
  check('2b. ...and on file', r.disk === 40, r);
}
{
  const r = await creditCase(null, { spend: 15 });
  check('3a. 15 of them gone in the dying seconds: 25 kept, never the 40 back', r.shards === 25, r);
}
{
  const r = await creditCase(null, { alive: true });
  check('4. a credit to a living player shields nothing', r.shield === null && r.shards === 12, r);
}
{
  const r = await creditCase({ dyingkeep: false }, {});
  check('5. `dyingkeep: false`: wiped at the respawn, as before', r.shards === 0, r);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
