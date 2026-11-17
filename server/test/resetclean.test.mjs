/* ═══ v2.3.5719: A CHARACTER RESTART STARTS FROM NOTHING (card SEC PR 20) ═══
 * (server/src/persistence.js "A CHARACTER RESTART STARTS FROM NOTHING")
 *
 * A restart left the market's listings and orders on file: list everything,
 * restart, cancel, and the goods came back to the new character.
 *   1. List, restart, cancel: the restart (in game and from the picker) is
 *      refused while an order or a listing names the player -- `market`,
 *      with its words -- and nothing is wiped.
 *   2. ...cancelled, the restart goes, and leaves nothing of the old
 *      character beside the new one: its record gone, and the login streak's
 *      row (`daily_rewards:`) with it.
 *   3. A store listing holds a restart the same way; another record held
 *      between players (a duel's wager) does not.
 *   4. `resetclean: false`: the old way (restarted with the order on file,
 *      the streak's row kept).
 *
 * BREAK PROOF (rule 8), tried by hand: main's persistence.js and account.js
 * -> FAIL 1, 2.
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
const ORDER = ['mkt_order:o_rc_1', { v: 1, id: 'o_rc_1', side: 'sell', pid: PID, item: 'wood_oak', qty: 30, price: 5 }];
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
  check('1. listed: the restart in game is refused, `market`, with its words', r && r.payload && r.payload.reason === 'market' && r.payload.message === RESET_REFUSED_WORDS.market, ws.sent.map((m) => m.type));
  check('1. ...and nothing is wiped (the record, the order, the streak)', st._store.has('rpg:' + PID) && st._store.has(ORDER[0]) && st._store.has('daily_rewards:' + PID));
  /* the picker's login check passed (its own suites hold it: login-keys,
     device-lock); this is what the restart does after it */
  const login0 = room._accountLogin;
  room._accountLogin = async () => ({ ok: true, settled: true, exists: true, id: PID, device: 'ok' });
  const pick = await room._accountReset('a-key', true, '203.0.113.9', undefined);
  room._accountLogin = login0;
  check('1. the picker\'s restart is refused the same way', pick && pick.ok === false && pick.reason === 'market' && st._store.has('rpg:' + PID), pick);
  st._store.delete(ORDER[0]);   /* the order cancelled */
  await restartInGame(room, ws);
  check('2. cancelled, the restart goes: the old record gone', !st._store.has('rpg:' + PID), [...st._store.keys()].filter((k) => k.includes(PID)));
  check('2. ...and the login streak\'s row with it (daily_rewards:)', !st._store.has('daily_rewards:' + PID));
  check('2. ...nothing of the old character beside the new one (no order, no listing names it)', ![...st._store.keys()].some((k) => /^(mkt_order|store_listing):/.test(k)));
}

/* 3. a listing holds it; a duel's wager does not */
{
  const LISTING = ['store_listing:l_rc_1', { v: 1, id: 'l_rc_1', seller: PID, goods: { wood_oak: 10 }, price: 50 }];
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
  check('4. ...and the streak\'s row kept, as before', st._store.has('daily_rewards:' + PID));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
