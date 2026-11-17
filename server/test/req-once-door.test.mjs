/* A REPEAT ACTS ONCE, AT THE DOOR -- v2.3.5195 (server/src/reqonce.js
 * _reqOnceDoor, called from wire/door.js _wireDoor; grand plan step 11.3,
 * step 2; card K PR 10; docs/specs/req-once.md).
 *
 * Every other value request a player may start (the table's socket rows whose
 * `doesWhat` holds `value-out` or `final`) carries its request id to the wire
 * door, which holds a repeat of an id the player sent before: it reaches no
 * handler and is answered the player's state again.
 *   1. A WEAPON SOLD TWICE with the same id: one weapon gone, the gold once;
 *      the repeat answered with the state.  A NEW id sells the next one.
 *   2. ITS REACH: another player's request with the same id acts for them.
 *   3. THE ROWS THAT KEEP THEIR OWN (the bank, the chest, ... REQ_OWN) are
 *      left to their handlers.
 *   4. THE TABLE: no row a player may start that moves value is `none`, but
 *      those left with their reason (LEFT).
 *   5. THE SWITCH: `reqonce: false` -- the repeat sells again, as before.
 * Break proof (tried by hand): _reqOnceDoor's call out of door.js -> 1 red. */
import { WIRE_IN } from '../src/wire/in.js';
import { WIRE_HTTP } from '../src/wire/http.js';
import { REQ_OWN, reqDoorTypes } from '../src/reqonce.js';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 400)); }
}
const axe = (n) => ({ name: 'Axe ' + n, tierMult: 1, dmg: 5 });
const msg = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await settle(); };

/* ── 1. a weapon sold twice ── */
{
  const room = await openRoom(makeStorage());
  const ws = fakeWs('a'); await join(room, ws, 'bp_rqd_a');
  const P = room.playerState['bp_rqd_a'];
  P.weaponStash = [axe(1), axe(2), axe(3)]; P.coins = 0;
  await msg(room, ws, 'sell_weapon', { stashIdx: 0, reqId: 'rq-sell-1' });
  const g1 = P.coins;
  ws.sent.length = 0;
  await msg(room, ws, 'sell_weapon', { stashIdx: 0, reqId: 'rq-sell-1' });
  check('1: a weapon sold twice with the same id: one weapon gone, the gold once', P.weaponStash.length === 2 && P.coins === g1 && g1 > 0, { stash: P.weaponStash.length, g1, coins: P.coins });
  check('1: ...the repeat is answered the state again', ws.sent.some((m) => m.type === 'player_state' || m.type === 'state_sync' || m.type === 'player_update'), ws.sent.map((m) => m.type));
  await msg(room, ws, 'sell_weapon', { stashIdx: 0, reqId: 'rq-sell-2' });
  check('1: a new id sells the next one', P.weaponStash.length === 1 && P.coins > g1, { stash: P.weaponStash.length });

  /* ── 2. the reach ── */
  const wb = fakeWs('b'); await join(room, wb, 'bp_rqd_b');
  const B = room.playerState['bp_rqd_b'];
  B.weaponStash = [axe(4)]; B.coins = 0;
  await msg(room, wb, 'sell_weapon', { stashIdx: 0, reqId: 'rq-sell-1' });
  check('2: another player\'s request with the same id acts for them', B.weaponStash.length === 0 && B.coins > 0, { stash: B.weaponStash.length });
}

/* ── 3. the rows that keep their own ── */
{
  const door = reqDoorTypes();
  check('3: the rows that keep their own record are left to their handlers', [...REQ_OWN].every((n) => !door.has(n)) && door.has('sell_weapon') && door.size >= 30, { size: door.size });
}

/* ── 4. the table ── */
const LEFT = Object.freeze({
  'http:/api/market/place': 'card K PR 9b (#1981) turns it, with the page\'s re-send behind its cap',
  'http:/api/store/list': 'card K PR 9b (#1981) turns it, the same way',
  'http:/api/account/reset': 'the route knows no player until it has read the phrase; the page asks twice before it sends, and a repeat resets the fresh character it made',
});
{
  const rows = [...WIRE_IN, ...WIRE_HTTP].filter((r) => r.dir === 'in' && (r.doesWhat || []).some((d) => d === 'value-out' || d === 'final') && !['system', 'owner', 'never'].includes(r.mayStart));
  const none = rows.filter((r) => r.reqId === 'none').map((r) => r.name);
  check('4: no row a player may start that moves value is `none`, but LEFT (each with its reason)', none.every((n) => LEFT[n]), none);
}

/* ── 5. the switch ── */
{
  const room = await openRoom(makeStorage(), { reqonce: false });
  const ws = fakeWs('c'); await join(room, ws, 'bp_rqd_c');
  const P = room.playerState['bp_rqd_c'];
  P.weaponStash = [axe(1), axe(2)];
  await msg(room, ws, 'sell_weapon', { stashIdx: 0, reqId: 'rq-sell-9' });
  await msg(room, ws, 'sell_weapon', { stashIdx: 0, reqId: 'rq-sell-9' });
  check('5: `reqonce: false`: the repeat sells again, as before', P.weaponStash.length === 0, P.weaponStash.length);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
