/* ═══ v2.3.5802 (card RV, PR 3): THE CHEST ON A RISE PAYS ONCE A CHARACTER, FOR GOOD ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding MD-1.  The chest's only record that
 * a character had opened it was its `oplog:risechest:<pid>:<rise>` stamp, and
 * the oplog prune (inbox.js _opPruneMaybe, hourly) deletes stamps 48 h old:
 * the same character opened it again every two days, 400 coins each time
 * (TRAPS §146: "the oplog is not the record").  Now the prune passes over
 * `risechest:` stamps (OP_PRUNE.KEEP) without reading them: the stamp the
 * payment already writes is the record, kept for good.  No new row.
 *
 *   1. opened once, a second ask is 'got';
 *   2. 49 h on and a whole sweep later: the stamp is on file, the chest
 *      answers 'got', nothing paid;
 *   3. the sweep still prunes the old stamps on either side of the range;
 *   4. the sweep never reads a kept stamp, and pages across the range with a
 *      small page;
 *   5. `risekeep: false`: pruned as before, and the chest pays again.
 *
 * Red on main before this change: 4 checks fail (2a, 2b, 4a, 4b).
 */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';
import { OP_PRUNE } from '../src/inbox.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_FACES } from '../src/wheelfaces.js';
import { RISE_CHEST } from '../src/risechest.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const H = 3600000;

const RISE = WHEEL_FACES.find((r) => r.chest);

async function climber(flags, seed) {
  const st = makeStorage(seed);
  /* every key a list hands back, so the sweep's reads can be seen */
  const seen = [];
  const list = st.storage.list.bind(st.storage);
  st.storage.list = async (o) => { const m = await list(o); for (const k of m.keys()) seen.push(k); return m; };
  const room = await openRoom(st, flags);
  const P = 'bp_rvclimb01';
  const ws = fakeWs('c');
  await join(room, ws, P, { loginTaken: true, data: { x: 1000, y: 1000, z: WHEEL_ZONE } });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = room.playerState[P];
  ps.x = (RISE.chest[0] + RISE.chest[2]) / 2; ps.y = RISE.chest[3] + 20 - RISE_CHEST.FEET_DY; ps.z = WHEEL_ZONE;
  const open = async () => {
    const n = ws.sent.length;
    await room.webSocketMessage(ws, JSON.stringify({ type: 'rise_chest_open', payload: { id: RISE.id } }));
    await settleN(2);
    return ws.sent.slice(n).filter((m) => m.type === 'rise_chest').map((m) => m.payload)[0] || null;
  };
  const sweep = async (now) => {
    room._lastOpPrune = 0; room._opPrune = null;
    for (let i = 0; i < 200; i++) { const more = await room._opPruneMaybe(now); await settle(); if (!more) break; }
  };
  return { st, room, P, ps, open, sweep, seen };
}

const stampKey = (P) => 'oplog:risechest:' + P + ':' + RISE.id;

/* ── 1 to 3 ── */
{
  const clock = seededClock().install();
  try {
    const { st, P, ps, open, sweep, seen } = await climber(null);
    const c0 = ps.coins;
    const a = await open();
    const b = await open();
    check('1. (setup) the chest pays once, a second ask is got', a && a.ok && b && b.why === 'got' && ps.coins === c0 + a.coins, { a, b, c0, now: ps.coins });
    const paid = ps.coins;
    /* old stamps on either side of the kept range, and a fresh one */
    await st.storage.put({ 'oplog:arenapot:old1': Date.now() - 50 * H, 'oplog:spinpot:old2': Date.now() - 50 * H, 'oplog:zz:fresh': Date.now() + 49 * H });
    await settleN(2);
    clock.advance(49 * H);
    seen.length = 0;
    await sweep(Date.now());
    check('2a. 49 h and a whole sweep on: the chest\'s stamp is still on file', st._store.has(stampKey(P)), [...st._store.keys()].filter((k) => k.startsWith('oplog:')));
    const c = await open();
    check('2b. ...the chest answers got, and pays nothing', c && c.why === 'got' && ps.coins === paid, { c, coins: ps.coins, paid });
    check('3. the sweep still prunes old stamps before and after the range, and keeps a fresh one',
      !st._store.has('oplog:arenapot:old1') && !st._store.has('oplog:spinpot:old2') && st._store.has('oplog:zz:fresh'),
      [...st._store.keys()].filter((k) => k.startsWith('oplog:')));
    check('4a. the sweep never reads a kept stamp', !seen.some((k) => k.startsWith('oplog:risechest:')), seen.filter((k) => k.startsWith('oplog:risechest:')));
  } finally { clock.restore(); }
}

/* ── 4b. pages across the range with a small page ── */
{
  const clock = seededClock().install();
  const page = OP_PRUNE.PAGE;
  try {
    OP_PRUNE.PAGE = 2;
    const old = Date.now() - 50 * H;
    const seed = new Map();
    for (const k of ['a1', 'a2', 'a3', 'b1']) seed.set('oplog:arena:' + k, old);
    for (const k of ['x:1', 'x:2', 'x:3']) seed.set('oplog:risechest:bp_other:' + k, old);
    for (const k of ['s1', 's2', 's3']) seed.set('oplog:spin:' + k, old);
    const { st, sweep } = await climber(null, seed);
    await sweep(Date.now());
    const left = [...st._store.keys()].filter((k) => k.startsWith('oplog:'));
    check('4b. a page of 2: every old stamp on either side pruned, the three kept stamps kept',
      left.filter((k) => k.startsWith('oplog:risechest:')).length === 3 && left.filter((k) => !k.startsWith('oplog:risechest:')).length === 0, left);
  } finally { OP_PRUNE.PAGE = page; clock.restore(); }
}

/* ── 5. the kill switch ── */
{
  const clock = seededClock().install();
  try {
    const { st, P, ps, open, sweep } = await climber({ risekeep: false });
    const a = await open();
    const paid = ps.coins;
    clock.advance(49 * H);
    await sweep(Date.now());
    const pruned = !st._store.has(stampKey(P));
    const c = await open();
    check('5. `risekeep: false`: pruned as before, and the chest pays again', !!(a && a.ok && pruned && c && c.ok && ps.coins === paid + c.coins), { a, c, pruned, coins: ps.coins, paid });
  } finally { clock.restore(); }
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
