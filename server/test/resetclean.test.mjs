/* ═══ v2.3.5719: A CHARACTER RESTART STARTS FROM NOTHING (card SEC PR 20) ═══
 * (server/src/persistence.js "A CHARACTER RESTART STARTS FROM NOTHING")
 *
 * A restart left the market's listings and orders on file: list everything,
 * restart, cancel, and the goods came back to the new character.
 *   1. List, restart, cancel: the restart (in game and from the picker) is
 *      refused while an order or a listing holds the player -- `market`,
 *      with its words -- and nothing is wiped.
 *   2. ...cancelled, the restart goes, and leaves nothing of the old
 *      character beside the new one: its record gone, and the daily rewards'
 *      row (`daily_rewards:`) with it.
 *   3. A store listing holds a restart the same way; another record held
 *      between players (a duel's wager) does not.
 *   4. `resetclean: false`: the old way (restarted with the order on file,
 *      the daily rewards' row kept).
 *   5. Gatekeeper Z40's probe: 201 other players' listings, then the
 *      player's own -- past one page of the list -- still holds the restart.
 *   6. The top bid or an open offer on someone else's listing holds it too
 *      (its gold is escrowed, and a refund would pay the new character).
 *   7. Z40's second probe: a dirty cached daily record is not written back
 *      by the restart's own leave.
 *
 * BREAK PROOF (rule 8), tried by hand: main's persistence.js and account.js
 * -> FAIL 1, 2.  The first build (betweenOf's one page, no forget) -> FAIL
 * 5 and 7.
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';
import * as PERSIST from '../src/persistence.js';
const RESET_REFUSED_WORDS = PERSIST.RESET_REFUSED_WORDS || {};

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const PID = 'bp_rc_lister';
const ECON = { v: 1, g: { m: 0, b: 0 }, i: {} };
const record = () => ({ _v: RPG_SCHEMA_VERSION, coins: 500, inventory: { wood_oak: 30 }, level: 12, hp: 100, maxHp: 100, _econ: ECON });
const ORDER_REC = { id: 'o_rc_1', type: 'sell', playerId: PID, category: 'material', subtype: 'wood', tierKey: 'oak', item: 'wood_oak', qty: 30, price: 5 };
const ORDER = ['mkt_order:o_rc_1', ORDER_REC];
const listing = (id, sellerId, extra) => ['store_listing:' + id, { id, sellerId, kind: 'goods', goods: { wood_oak: 10 }, askPrice: 50, createdAt: 1, ...(extra || {}) }];
async function world(flags, extra) {
  const st = makeStorage(new Map([['rpg:' + PID, record()], ['daily_rewards:' + PID, { streak: 4, at: 1 }], ...(extra || [])]));
  const room = await openRoom(st, flags);
  const ws = fakeWs('p');
  await join(room, ws, PID, { loginTaken: true });
  return { st, room, ws };
}
const restartInGame = async (room, ws) => { ws.sent.length = 0; await room.webSocketMessage(ws, JSON.stringify({ type: 'character_reset', payload: { confirm: true } })); await settle(); await settle(); };
const refusedWith = (ws) => ws.sent.find((m) => m.type === 'character_reset_refused');

/* 1 + 2: list, restart, cancel */
{
  const { st, room, ws } = await world(null, [ORDER]);
  await restartInGame(room, ws);
  const r = refusedWith(ws);
  check('1. every refusal\'s words fit the phone\'s 120 characters (wsClient.js shows the fight\'s past that)', Object.values(RESET_REFUSED_WORDS).length === 2 && Object.values(RESET_REFUSED_WORDS).every((w) => typeof w === 'string' && w.length > 0 && w.length <= 120), Object.values(RESET_REFUSED_WORDS).map((w) => w.length));
  check('1. listed: the restart in game is refused, `market`, with its words', r && r.payload && r.payload.reason === 'market' && r.payload.message === RESET_REFUSED_WORDS.market, ws.sent.map((m) => m.type));
  check('1. ...and nothing is wiped (the record, the order, the streak)', st._store.has('rpg:' + PID) && st._store.has(ORDER[0]) && st._store.has('daily_rewards:' + PID));
  /* the picker's login check passed (its own suites hold it: login-keys,
     device-lock); this is what the restart does after it */
  const login0 = room._accountLogin;
  room._accountLogin = async () => ({ ok: true, settled: true, exists: true, id: PID, device: 'ok' });
  const pick = await room._accountReset('a-key', true, '203.0.113.9', undefined);
  room._accountLogin = login0;
  check('1. the picker\'s restart is refused the same way', pick && pick.ok === false && pick.reason === 'market' && st._store.has('rpg:' + PID), pick);
  st._store.delete(ORDER[0]); if (room._mktIndex) room._mktRemoveFromIndex(ORDER_REC);   /* the order cancelled: its record and its place in the book */
  await restartInGame(room, ws);
  check('2. cancelled, the restart goes: the old record gone', !st._store.has('rpg:' + PID), [...st._store.keys()].filter((k) => k.includes(PID)));
  check('2. ...and the daily rewards\' row with it (daily_rewards:)', !st._store.has('daily_rewards:' + PID));
  check('2. ...nothing of the old character beside the new one (no order, no listing names it)', ![...st._store.keys()].some((k) => /^(mkt_order|store_listing):/.test(k)));
}

/* 3. a listing holds it; a duel's wager does not */
{
  const LISTING = listing('l_rc_1', PID);
  const a = await world(null, [LISTING]);
  await restartInGame(a.room, a.ws);
  check('3. a store listing holds the restart too', refusedWith(a.ws) && refusedWith(a.ws).payload.reason === 'market' && a.st._store.has('rpg:' + PID));
  const DUEL = ['duelEscrow:d_rc_1', { a: PID, b: 'bp_rc_other', wager: 10 }];
  const b = await world(null, [DUEL]);
  await restartInGame(b.room, b.ws);
  check('3. a duel\'s wager does not (the card names listings and orders)', !refusedWith(b.ws) && !b.st._store.has('rpg:' + PID), b.ws.sent.map((m) => m.type));
}

/* 4. the switch */
{
  const { st, room, ws } = await world({ resetclean: false }, [ORDER]);
  await restartInGame(room, ws);
  check('4. resetclean: false: restarted with the order on file, as before', !refusedWith(ws) && !st._store.has('rpg:' + PID) && st._store.has(ORDER[0]));
  check('4. ...and the daily rewards\' row kept, as before', st._store.has('daily_rewards:' + PID));
}

/* 5. Z40's probe: the player's own listing past one page of the shelf */
{
  const others = [];
  for (let i = 0; i <= 200; i++) others.push(listing('a_' + String(i).padStart(4, '0'), 'bp_rc_seller' + i));
  const { st, room, ws } = await world(null, [...others, listing('zz_own', PID)]);
  await restartInGame(room, ws);
  check('5. 201 other listings, then the player\'s own: the restart is still refused', refusedWith(ws) && refusedWith(ws).payload.reason === 'market' && st._store.has('rpg:' + PID), ws.sent.map((m) => m.type));
}

/* 6. the top bid on someone else's listing */
{
  const { st, room, ws } = await world(null, [listing('l_rc_bid', 'bp_rc_seller', { topBid: { bidderId: PID, bidderName: 'L', amount: 20, at: 1, seq: 1 } })]);
  await restartInGame(room, ws);
  check('6. the top bidder on another\'s listing is held too', refusedWith(ws) && refusedWith(ws).payload.reason === 'market' && st._store.has('rpg:' + PID), ws.sent.map((m) => m.type));
  const o = await world(null, [listing('l_rc_offer', 'bp_rc_seller', { offers: { [PID]: { gold: 15, at: 1, name: 'L', seq: 1 } } })]);
  await restartInGame(o.room, o.ws);
  check('6. ...and so is an open offer (its gold is escrowed as a bid\'s)', refusedWith(o.ws) && refusedWith(o.ws).payload.reason === 'market' && o.st._store.has('rpg:' + PID), o.ws.sent.map((m) => m.type));
}

/* 7. Z40's second probe: a dirty cached daily record */
{
  const { st, room, ws } = await world(null);
  room._drMap().set(PID, { _v: 1, sp: { day: 1, pot: 999 } });
  room._drMarkDirty(PID);
  await restartInGame(room, ws);
  check('7. restarted with a dirty daily record cached: the old row is not written back', !st._store.has('rpg:' + PID) && !st._store.has('daily_rewards:' + PID), st._store.get('daily_rewards:' + PID));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
