/* Hardened wood -- v2.3.3139.
 *
 * The owner: "Maybe 5 logs of the raw material can make one 'hardened (name)
 * wood' raw material so it mirrors the same structure.  Also for the number
 * required and gold too" (hardenedwood.js; the hardening it pays for is the
 * hardening suite's §8c).
 *
 *   1. caps.hardenedwood is advertised; the table is five woods, five logs
 *      each, smelting's levels and XP carried on.
 *   2. One make takes exactly 1 Pine Log (v2.3.3912; was 5), gives one Hardened Pine Wood and
 *      pays Woodworking XP, and answers hardened_wood_result + player_state.
 *   3. "All" makes only what the logs pay for, and pays XP per piece.
 *   4. Refusals, each with a reason and nothing taken: short of logs, below
 *      the wood's Woodworking level, a junk / inherited key, a forged count.
 *   5. The keys are never logs: no `wood_` key, so the campfire, the bag's
 *      log rules and the log price never reach them.
 *   6. It sells to the vendor for more than the log it cost (v2.3.3912; was
 *      five), and buying his logs to sell it back loses.
 *   7. The kill switch refuses and un-advertises.
 *   8. v2.3.3912: ONE LOG A PIECE (the owner: "still wood to hardened wood
 *      but only require 5 instead of 25").  caps.onetoone is advertised;
 *      `onetoone: false` brings back five logs a piece, the old XP and the old
 *      price, and takes the cap back.
 */
import { GameRoom } from '../src/index.js';
import { HARDENED_WOOD } from '../src/hardenedwood.js';
import { WOODWORKING_TIERS } from '../src/data.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const make = async (ws, payload) => {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'make_hardened_wood', payload }));
  return ws.sent.find((m) => m.type === 'hardened_wood_result') || null;
};

const RC = HARDENED_WOOD.RECIPES;
const R = RC.hardened_pine;

// ── 1. caps and the table ──
const ws = fakeWs();
await join(ws, 'bp_hw_a');
const ps = () => room.playerState['bp_hw_a'];
const ww = () => (ps().lifeSkills && ps().lifeSkills.woodworking) || { level: 1, xp: 0 };
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.hardenedwood is advertised', !!sync && sync.caps.hardenedwood === true);
  check('five woods, one log each (v2.3.3912: the owner\'s one-to-one), each from its own tree\'s log',
    Object.keys(RC).join() === 'hardened_pine,hardened_softwood,hardened_hardwood,hardened_cedar,hardened_maple'
      && Object.values(RC).every((r) => r.logCost === 1)
      && Object.values(RC).map((r) => r.log).join() === 'wood_pine_log,wood_softwood,wood_hardwood,wood_cedar_wood,wood_maple_wood', RC);
  check('...each the hardening material of its own WOODWORKING_TIERS wood, in that table\'s order',
    Object.values(RC).every((r) => Object.prototype.hasOwnProperty.call(WOODWORKING_TIERS, r.tier) && 'wood_' + WOODWORKING_TIERS[r.tier].wood === r.log)
      && Object.values(RC).map((r) => Object.keys(WOODWORKING_TIERS).indexOf(r.tier)).join() === '0,1,2,3,4');
  check('...at the bars\' levels and XP carried on (Woodworking 1/5/10/15/20, 80 to 240 XP: v2.3.3912, a fifth of 400 to 1,200)',
    Object.values(RC).map((r) => r.minLvl).join() === '1,5,10,15,20' && Object.values(RC).map((r) => r.xp).join() === '80,120,160,200,240');
  check('...named "hardened (name) wood", the tree\'s own name in the middle',
    Object.values(RC).map((r) => r.name).join() === 'Hardened Pine Wood,Hardened Softwood,Hardened Hardwood,Hardened Cedar Wood,Hardened Maple Wood');
}

// ── 2. One make ──
{
  ps().inventory.wood_pine_log = 7;
  ps().lifeSkills = ps().lifeSkills || {};
  ps().lifeSkills.woodworking = { level: 1, xp: 0 };
  const r = await make(ws, { key: 'hardened_pine' });
  check('one make takes exactly 1 Pine Log', ps().inventory.wood_pine_log === 6, ps().inventory);
  check('...and puts one Hardened Pine Wood in the bag', ps().inventory.hardened_pine === 1, ps().inventory);
  check('...and pays ' + R.xp + ' Woodworking XP', ww().level === 1 && ww().xp === R.xp, ww());
  check('...announced in hardened_wood_result', !!r && r.payload.count === 1 && r.payload.xp === R.xp && r.payload.key === 'hardened_pine' && r.payload.have === 1, r && r.payload);
  check('...followed by a player_state with the new bag', ws.sent.some((m) => m.type === 'player_state'));
}

// ── 3. All ──
{
  ps().inventory.wood_pine_log = 20;          /* v2.3.3912: 20 pieces, no log left (was 23 logs -> 4) */
  delete ps().inventory.hardened_pine;
  ps().lifeSkills.woodworking = { level: 1, xp: 0 };
  const r = await make(ws, { key: 'hardened_pine', count: 50 });
  check('"All" makes only what the logs pay for (20 logs -> 20, asked for 50)',
    ps().inventory.hardened_pine === 20 && !ps().inventory.wood_pine_log, ps().inventory);
  check('...and pays XP for EACH piece (20 x ' + R.xp + ')', !!r && r.payload.xp === 20 * R.xp, r && r.payload);
  /* 1,600 XP from level 1: 1,000 to reach 2 -> level 2 + 600 (smelting's own arithmetic) */
  check('...which levels Woodworking (1 -> 2 on 1,600 XP)', ww().level === 2 && ww().xp === 600 && r.payload.leveled === true
    && r.payload.fromLevel === 1 && r.payload.newLevel === 2, { s: ww(), p: r && r.payload });
}

// ── 4. Refusals ──
{
  delete ps().inventory.wood_pine_log;
  const have0 = ps().inventory.hardened_pine;
  let r = await make(ws, { key: 'hardened_pine' });
  check('no logs: refused ("no-logs", need 1, have 0), nothing taken',
    !!r && r.payload.error === 'no-logs' && r.payload.need === 1 && r.payload.have === 0 && !ps().inventory.wood_pine_log && ps().inventory.hardened_pine === have0, r && r.payload);

  ps().inventory.wood_softwood = 20;
  ps().lifeSkills.woodworking = { level: 4, xp: 0 };
  r = await make(ws, { key: 'hardened_softwood' });
  check('softwood at Woodworking 4: refused ("skill", needs 5), nothing taken',
    !!r && r.payload.error === 'skill' && r.payload.need === 5 && ps().inventory.wood_softwood === 20 && !ps().inventory.hardened_softwood, r && r.payload);
  ps().lifeSkills.woodworking = { level: 5, xp: 0 };
  r = await make(ws, { key: 'hardened_softwood', count: 2 });
  check('...at 5: two Hardened Softwood from two logs, ' + RC.hardened_softwood.xp + ' XP each',
    !!r && r.payload.count === 2 && r.payload.xp === 2 * RC.hardened_softwood.xp && ps().inventory.hardened_softwood === 2 && ps().inventory.wood_softwood === 18, r && r.payload);

  ps().inventory.wood_pine_log = 50;
  for (const bad of ['__proto__', 'constructor', 'toString', 'hardened_ironbark', 'wood_pine_log', 'bar_copper', 42, null]) {
    const x = await make(ws, { key: bad });
    check('a junk key (' + String(bad) + ') makes nothing', !!x && x.payload.error === 'bad-key' && ps().inventory.wood_pine_log === 50);
  }

  ps().lifeSkills.woodworking = { level: 1, xp: 0 };
  ps().inventory.wood_pine_log = 10;
  delete ps().inventory.hardened_pine;
  const big = await make(ws, { key: 'hardened_pine', count: 1e9 });
  check('a forged huge count still makes only what the logs pay for', !!big && big.payload.count === 10
    && ps().inventory.hardened_pine === 10 && !ps().inventory.wood_pine_log, ps().inventory);
  ps().inventory.wood_pine_log = 80;
  delete ps().inventory.hardened_pine;
  const many = await make(ws, { key: 'hardened_pine', count: 1e9 });
  check('...and never more than ' + HARDENED_WOOD.MAX_PER_REQUEST + ' a request (80 logs: 50, 30 left)', !!many && many.payload.count === HARDENED_WOOD.MAX_PER_REQUEST
    && ps().inventory.hardened_pine === HARDENED_WOOD.MAX_PER_REQUEST && ps().inventory.wood_pine_log === 30, ps().inventory);
  ps().inventory.wood_pine_log = 10;
  const neg = await make(ws, { key: 'hardened_pine', count: -5 });
  check('a negative count is read as one', !!neg && neg.payload.count === 1 && ps().inventory.wood_pine_log === 9, ps().inventory);
}

// ── 5. Never a log ──
{
  check('no hardened wood key is a `wood_` key (the campfire, the bag and the shop take those for logs)',
    Object.keys(RC).every((k) => k.indexOf('wood_') !== 0 && k.indexOf('hardened_') === 0));
}

// ── 6. The vendor ──
{
  const hw = room._shopBaseValue('hardened_pine');
  const log = room._shopBaseValue('wood_pine_log');
  check('hardened wood is worth more to the vendor than the log it cost', hw > log * R.logCost, { hw, log });
  /* v2.3.3912: and not so much more that buying his logs to sell him
     hardened wood pays (he buys at half his price) */
  check('...but his offer for it is under what he asks for its log (no buying logs to sell hardened wood): 29 vs 24',
    hw === 29 && room._shopBuyPrice('hardened_pine', 0) < room._shopSellPrice('wood_pine_log') * R.logCost, { hw, log, offer: room._shopBuyPrice('hardened_pine', 0) });
  check('...every wood alike, by its family', Object.keys(RC).every((k) => room._shopBaseValue(k) === hw),
    Object.keys(RC).map((k) => room._shopBaseValue(k)));
}

// ── 7. Kill switch ──
{
  room._liveFlags = { ...(room._liveFlags || {}), hardenedwood: false };
  ps().inventory.wood_pine_log = 10;
  const r = await make(ws, { key: 'hardened_pine' });
  check('switched off: refused ("off"), nothing made', !!r && r.payload.error === 'off' && ps().inventory.wood_pine_log === 10);
  const ws2 = fakeWs();
  await join(ws2, 'bp_hw_b');
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told hardened wood is off', !!sync && sync.caps.hardenedwood === false);
  room._liveFlags = {};
}

// ── 8. v2.3.3912: one log a piece, and its switch ──
{
  room._liveFlags = {};
  const ws3 = fakeWs();
  await join(ws3, 'bp_hw_c');
  const sync = ws3.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.onetoone is advertised', !!sync && sync.caps.onetoone === true);
  check('the same Woodworking XP a log as before (80 x 5 = 400 ... 240 x 5 = 1,200)',
    Object.keys(RC).every((k) => RC[k].xp * HARDENED_WOOD.FIVE[k].logCost === HARDENED_WOOD.FIVE[k].xp * RC[k].logCost)
      && Object.keys(HARDENED_WOOD.FIVE).join() === Object.keys(RC).join());
  const p3 = () => room.playerState['bp_hw_c'];
  room._liveFlags = { onetoone: false };
  const r5 = room._hardenedWoodRecipe('hardened_pine');
  check('`onetoone: false`: five logs and 400 XP again (maple 1,200), the table untouched',
    r5.logCost === 5 && r5.xp === 400 && r5.log === 'wood_pine_log' && room._hardenedWoodRecipe('hardened_maple').xp === 1200
      && room._hardenedWoodRecipe('constructor') === null && RC.hardened_pine.logCost === 1, r5);
  p3().inventory.wood_pine_log = 4;
  let r = await make(ws3, { key: 'hardened_pine' });
  check('...4 logs is not enough: refused ("no-logs", need 5, have 4), nothing taken',
    !!r && r.payload.error === 'no-logs' && r.payload.need === 5 && r.payload.have === 4 && p3().inventory.wood_pine_log === 4, r && r.payload);
  p3().inventory.wood_pine_log = 12;
  p3().lifeSkills = { ...(p3().lifeSkills || {}), woodworking: { level: 1, xp: 0 } };
  r = await make(ws3, { key: 'hardened_pine', count: 50 });
  check('...12 logs make two, two left, 400 XP each', !!r && r.payload.count === 2 && r.payload.xp === 800
    && p3().inventory.hardened_pine === 2 && p3().inventory.wood_pine_log === 2, { inv: p3().inventory, p: r && r.payload });
  check('...Diego prices it at 144 again', room._shopBaseValue('hardened_cedar') === 144 && room._shopBaseValue('wood_pine_log') === 24);
  const ws4 = fakeWs();
  await join(ws4, 'bp_hw_d');
  const sync4 = ws4.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is not told onetoone', !!sync4 && sync4.caps.onetoone === false && sync4.caps.hardenedwood === true);
  room._liveFlags = {};
  check('switched back on: one log and 29 again', room._hardenedWoodRecipe('hardened_pine').logCost === 1 && room._shopBaseValue('hardened_pine') === 29);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall hardened wood checks passed');
process.exit(failures ? 1 : 0);
