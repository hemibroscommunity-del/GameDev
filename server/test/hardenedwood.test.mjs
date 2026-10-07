/* Hardened wood -- v2.3.3139.
 *
 * The owner: "Maybe 5 logs of the raw material can make one 'hardened (name)
 * wood' raw material so it mirrors the same structure.  Also for the number
 * required and gold too" (hardenedwood.js; the hardening it pays for is the
 * hardening suite's §8c).
 *
 *   1. caps.hardenedwood is advertised; the table is five woods, five logs
 *      each, smelting's levels and XP carried on.
 *   2. One make takes exactly 5 Pine Logs, gives one Hardened Pine Wood and
 *      pays Woodworking XP, and answers hardened_wood_result + player_state.
 *   3. "All" makes only what the logs pay for, and pays XP per piece.
 *   4. Refusals, each with a reason and nothing taken: short of logs, below
 *      the wood's Woodworking level, a junk / inherited key, a forged count.
 *   5. The keys are never logs: no `wood_` key, so the campfire, the bag's
 *      log rules and the log price never reach them.
 *   6. It sells to the vendor for more than the five logs it cost.
 *   7. The kill switch refuses and un-advertises.
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
  check('five woods, five logs each (the owner\'s number), each from its own tree\'s log',
    Object.keys(RC).join() === 'hardened_pine,hardened_softwood,hardened_hardwood,hardened_cedar,hardened_maple'
      && Object.values(RC).every((r) => r.logCost === 5)
      && Object.values(RC).map((r) => r.log).join() === 'wood_pine_log,wood_softwood,wood_hardwood,wood_cedar_wood,wood_maple_wood', RC);
  check('...each the hardening material of its own WOODWORKING_TIERS wood, in that table\'s order',
    Object.values(RC).every((r) => Object.prototype.hasOwnProperty.call(WOODWORKING_TIERS, r.tier) && 'wood_' + WOODWORKING_TIERS[r.tier].wood === r.log)
      && Object.values(RC).map((r) => Object.keys(WOODWORKING_TIERS).indexOf(r.tier)).join() === '0,1,2,3,4');
  check('...at the bars\' levels and XP carried on (Woodworking 1/5/10/15/20, 400 to 1,200 XP)',
    Object.values(RC).map((r) => r.minLvl).join() === '1,5,10,15,20' && Object.values(RC).map((r) => r.xp).join() === '400,600,800,1000,1200');
  check('...named "hardened (name) wood", the tree\'s own name in the middle',
    Object.values(RC).map((r) => r.name).join() === 'Hardened Pine Wood,Hardened Softwood,Hardened Hardwood,Hardened Cedar Wood,Hardened Maple Wood');
}

// ── 2. One make ──
{
  ps().inventory.wood_pine_log = 7;
  ps().lifeSkills = ps().lifeSkills || {};
  ps().lifeSkills.woodworking = { level: 1, xp: 0 };
  const r = await make(ws, { key: 'hardened_pine' });
  check('one make takes exactly 5 Pine Logs', ps().inventory.wood_pine_log === 2, ps().inventory);
  check('...and puts one Hardened Pine Wood in the bag', ps().inventory.hardened_pine === 1, ps().inventory);
  check('...and pays ' + R.xp + ' Woodworking XP', ww().level === 1 && ww().xp === R.xp, ww());
  check('...announced in hardened_wood_result', !!r && r.payload.count === 1 && r.payload.xp === R.xp && r.payload.key === 'hardened_pine' && r.payload.have === 1, r && r.payload);
  check('...followed by a player_state with the new bag', ws.sent.some((m) => m.type === 'player_state'));
}

// ── 3. All ──
{
  ps().inventory.wood_pine_log = 23;          /* 4 pieces, 3 logs left over */
  delete ps().inventory.hardened_pine;
  ps().lifeSkills.woodworking = { level: 1, xp: 0 };
  const r = await make(ws, { key: 'hardened_pine', count: 50 });
  check('"All" makes only what the logs pay for (23 logs -> 4)',
    ps().inventory.hardened_pine === 4 && ps().inventory.wood_pine_log === 3, ps().inventory);
  check('...and pays XP for EACH piece (4 x ' + R.xp + ')', !!r && r.payload.xp === 4 * R.xp, r && r.payload);
  /* 1,600 XP from level 1: 1,000 to reach 2 -> level 2 + 600 (smelting's own arithmetic) */
  check('...which levels Woodworking (1 -> 2 on 1,600 XP)', ww().level === 2 && ww().xp === 600 && r.payload.leveled === true
    && r.payload.fromLevel === 1 && r.payload.newLevel === 2, { s: ww(), p: r && r.payload });
}

// ── 4. Refusals ──
{
  ps().inventory.wood_pine_log = 4;
  const have0 = ps().inventory.hardened_pine;
  let r = await make(ws, { key: 'hardened_pine' });
  check('4 logs is not enough: refused ("no-logs", need 5, have 4), nothing taken',
    !!r && r.payload.error === 'no-logs' && r.payload.need === 5 && r.payload.have === 4 && ps().inventory.wood_pine_log === 4 && ps().inventory.hardened_pine === have0, r && r.payload);

  ps().inventory.wood_softwood = 20;
  ps().lifeSkills.woodworking = { level: 4, xp: 0 };
  r = await make(ws, { key: 'hardened_softwood' });
  check('softwood at Woodworking 4: refused ("skill", needs 5), nothing taken',
    !!r && r.payload.error === 'skill' && r.payload.need === 5 && ps().inventory.wood_softwood === 20 && !ps().inventory.hardened_softwood, r && r.payload);
  ps().lifeSkills.woodworking = { level: 5, xp: 0 };
  r = await make(ws, { key: 'hardened_softwood', count: 2 });
  check('...at 5: two Hardened Softwood from ten logs, ' + RC.hardened_softwood.xp + ' XP each',
    !!r && r.payload.count === 2 && r.payload.xp === 2 * RC.hardened_softwood.xp && ps().inventory.hardened_softwood === 2 && ps().inventory.wood_softwood === 10, r && r.payload);

  ps().inventory.wood_pine_log = 50;
  for (const bad of ['__proto__', 'constructor', 'toString', 'hardened_ironbark', 'wood_pine_log', 'bar_copper', 42, null]) {
    const x = await make(ws, { key: bad });
    check('a junk key (' + String(bad) + ') makes nothing', !!x && x.payload.error === 'bad-key' && ps().inventory.wood_pine_log === 50);
  }

  ps().lifeSkills.woodworking = { level: 1, xp: 0 };
  ps().inventory.wood_pine_log = 10;
  delete ps().inventory.hardened_pine;
  const big = await make(ws, { key: 'hardened_pine', count: 1e9 });
  check('a forged huge count still makes only what the logs pay for', !!big && big.payload.count === 2
    && ps().inventory.hardened_pine === 2 && !ps().inventory.wood_pine_log, ps().inventory);
  ps().inventory.wood_pine_log = 10;
  const neg = await make(ws, { key: 'hardened_pine', count: -5 });
  check('a negative count is read as one', !!neg && neg.payload.count === 1 && ps().inventory.wood_pine_log === 5, ps().inventory);
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
  check('hardened wood is worth more to the vendor than the five logs it cost', hw > log * R.logCost, { hw, log });
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

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall hardened wood checks passed');
process.exit(failures ? 1 : 0);
