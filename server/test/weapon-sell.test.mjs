/* A weapon sale is drawn only when the worker will hear it, and a refused
 * one is taken back -- v2.3.4941 (lane 3, "the phone shows results before
 * the worker answers").
 *
 * The bag's Sell button added the gold and took the weapon off on the page
 * at once.  A sale the worker refuses is answered (gear.js v2.3.4883: the
 * coins and the weapon bag sent back); a sale the channel DROPPED reached no
 * worker and nothing ever took its gold back.  This plays the REAL
 * src/game/weaponSell.js against a REAL GameRoom:
 *   1. connected, the sale refused (no weapon at that place): the phone drew
 *      it, the worker's echo puts the coins and the bag back;
 *   2. connected, the sale paid: the worker's coins match the prediction;
 *   3. the channel drops it (`false`, or a throw): nothing is drawn;
 *   4. the wiring: InventoryPanel asks first and draws only when it went. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

let W = {};
try { W = await import('../../src/game/weaponSell.js'); } catch (e) { W = {}; }
check('0 weaponSell.js exports its rules', typeof W.askSellWeapon === 'function' && typeof W.drawWeaponSale === 'function', Object.keys(W));

if (typeof W.askSellWeapon === 'function') {
  const store = new Map();
  const state = {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const R = new GameRoom(state, env);
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  const ID = 'bp_weapon_sell';
  R.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await R.webSocketMessage(ws, JSON.stringify({ type: 'join', id: ID, name: 'Sell', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  const ps = R.playerState[ID];
  check('setup: a v2 player joined', !!ps);

  const sword = () => ({ name: 'Old Sword', type: 'sword', gearBase: 'bronze', tierMult: 1 });
  /* the phone's channel: the shim's direct path, sent straight to the room */
  const pending = [];
  const S = { channel: { send(msg) { pending.push(msg); } } };
  const flush = async () => { while (pending.length) await R.webSocketMessage(ws, JSON.stringify(pending.shift())); };
  const adopt = (phone) => {
    for (const m of ws.sent) {
      if (m.type !== 'player_state' || !m.payload) continue;
      if (typeof m.payload.coins === 'number') phone.coins = m.payload.coins;
      if (Array.isArray(m.payload.weaponStash)) phone.weaponStash = m.payload.weaponStash;
    }
  };

  /* 1. refused: the phone's bag has a weapon at place 1, the worker's does not */
  ps.coins = 50; ps.weaponStash = [sword()];
  R._sendPlayerState(ws, ID); ws.sent.length = 0;
  const phone = { coins: 50, weaponStash: [sword(), sword()], _compStats: { totalGoldEarned: 0 } };
  const went = W.askSellWeapon(S, 1);
  check('1 the ask went', went === true && pending.length === 1 && pending[0].type === 'sell_weapon' && pending[0].payload.stashIdx === 1, pending);
  W.drawWeaponSale(phone, 1, 15);
  check('1 the page drew the sale', phone.coins === 65 && phone.weaponStash.length === 1);
  await flush();
  adopt(phone);
  check('1 refused: the worker\'s echo takes the gold back', phone.coins === 50 && ps.coins === 50, { phone: phone.coins, worker: ps.coins });
  check('1 ...and puts the worker\'s bag back', phone.weaponStash.length === 1);

  /* 2. paid */
  ps.coins = 50; ps.weaponStash = [sword()];
  R._sendPlayerState(ws, ID); ws.sent.length = 0;
  const phone2 = { coins: 50, weaponStash: [sword()] };
  const val = R._weaponSellValue(sword());
  W.askSellWeapon(S, 0); W.drawWeaponSale(phone2, 0, val);
  await flush(); adopt(phone2);
  check('2 paid: the worker\'s coins are the prediction\'s', phone2.coins === 50 + val && ps.coins === 50 + val && ps.weaponStash.length === 0, { phone: phone2.coins, worker: ps.coins });

  /* 3. dropped: the shim answers false while the socket is down, or throws */
  const down = { channel: { send() { return false; } } };
  const broken = { channel: { send() { throw new Error('closed'); } } };
  check('3 a dropped ask says so', W.askSellWeapon(down, 0) === false && W.askSellWeapon(broken, 0) === false && W.askSellWeapon({}, 0) === false);
  check('3 a sale at an empty place draws nothing', W.drawWeaponSale({ coins: 5, weaponStash: [] }, 0, 15) === false);
}

/* 4. the wiring */
{
  const ip = src('src/ui/panels/InventoryPanel.jsx');
  const at = ip.indexOf('if (!askSellWeapon(stateRef.current, si))');
  check('4 InventoryPanel asks first, and returns when it was dropped', at > 0 && /if \(!askSellWeapon\(stateRef\.current, si\)\) \{[\s\S]{0,300}return;\s*\}\s*drawWeaponSale\(R, si, sellVal\);/.test(ip));
  check('4 ...and no longer draws the sale whatever the send did', !/R\.coins \+= sellVal;/.test(ip));
}

console.log(`\nweapon-sell: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
