/* Smelting -- v2.3.2822.
 *
 * Owner: "Make one bar require 5 copper ore.  You get xp for each time you
 * smelt it into a bar."
 *
 *   1. caps.smelting is advertised.
 *   2. One smelt takes exactly 5 copper ore, gives one Copper Bar and pays
 *      Smithing XP, and answers smelt_result + player_state.
 *   3. "Smelt all" smelts only what the ore pays for, and pays XP per bar.
 *   4. Refusals: short of ore, a junk / inherited key, a forged huge count.
 *   5. A bar sells to the vendor for more than the five ore it cost.
 *   6. The kill switch refuses and un-advertises.
 */
import { GameRoom } from '../src/index.js';
import { SMELT } from '../src/smelting.js';

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
const smelt = async (ws, payload) => {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'smelt_bar', payload }));
  return ws.sent.find((m) => m.type === 'smelt_result') || null;
};

const R = SMELT.RECIPES.bar_copper;
check('a copper bar costs 5 copper ore (the owner\'s number)', R.oreCost === 5 && R.ore === 'ore_copper_ore', R);

const ws = fakeWs();
await join(ws, 'bp_smelt_a');
const ps = () => room.playerState['bp_smelt_a'];
const smith = () => (ps().lifeSkills && ps().lifeSkills.blacksmithing) || { level: 1, xp: 0 };

// ── 1. caps ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.smelting is advertised', !!sync && sync.caps.smelting === true);
}

// ── 2. One smelt ──
{
  ps().inventory.ore_copper_ore = 7;
  const lvl0 = smith().level || 1, xp0 = smith().xp || 0;
  const r = await smelt(ws, { barKey: 'bar_copper' });
  check('one smelt takes exactly 5 copper ore', ps().inventory.ore_copper_ore === 2, ps().inventory);
  check('...and puts one Copper Bar in the bag', ps().inventory.bar_copper === 1, ps().inventory);
  check('...and pays Smithing XP', (smith().level > lvl0) || (smith().xp - xp0) === R.xp, smith());
  check('...announced in smelt_result', !!r && r.payload.count === 1 && r.payload.xp === R.xp && r.payload.barKey === 'bar_copper', r && r.payload);
  check('...followed by a player_state with the new bag', ws.sent.some((m) => m.type === 'player_state'));
}

// ── 3. Smelt all ──
{
  ps().inventory.ore_copper_ore = 23;          /* 4 bars, 3 ore left over */
  delete ps().inventory.bar_copper;
  ps().lifeSkills.blacksmithing = { level: 1, xp: 0 };
  const r = await smelt(ws, { barKey: 'bar_copper', count: 50 });
  check('smelt-all makes only the bars the ore pays for (23 ore -> 4 bars)',
    ps().inventory.bar_copper === 4 && ps().inventory.ore_copper_ore === 3, ps().inventory);
  check('...and pays XP for EACH bar (4 x ' + R.xp + ')', !!r && r.payload.xp === 4 * R.xp, r && r.payload);
  /* 1600 XP from level 1: 500 to reach 2, 540 to reach 3 -> level 3 + 560 */
  check('...which levels Smithing (level 1 -> 3 on 1,600 XP)', smith().level === 3 && smith().xp === 560 && r.payload.leveled === true
    && r.payload.fromLevel === 1 && r.payload.newLevel === 3, { s: smith(), p: r && r.payload });
}

// ── 4. Refusals ──
{
  ps().inventory.ore_copper_ore = 4;
  const bars0 = ps().inventory.bar_copper;
  const r = await smelt(ws, { barKey: 'bar_copper' });
  check('4 ore is not enough: nothing smelts, nothing is taken', r === null && ps().inventory.ore_copper_ore === 4 && ps().inventory.bar_copper === bars0);

  ps().inventory.ore_copper_ore = 50;
  for (const bad of ['__proto__', 'constructor', 'toString', 'bar_mythril', 'ore_copper_ore', 42, null]) {
    const x = await smelt(ws, { barKey: bad });
    check('a junk key (' + String(bad) + ') smelts nothing', x === null && ps().inventory.ore_copper_ore === 50);
  }

  ps().inventory.ore_copper_ore = 10;
  delete ps().inventory.bar_copper;
  const big = await smelt(ws, { barKey: 'bar_copper', count: 1e9 });
  check('a forged huge count still smelts only what the ore pays for', !!big && big.payload.count === 2
    && ps().inventory.bar_copper === 2 && !ps().inventory.ore_copper_ore, ps().inventory);
  ps().inventory.ore_copper_ore = 10;
  const neg = await smelt(ws, { barKey: 'bar_copper', count: -5 });
  check('a negative count is read as one', !!neg && neg.payload.count === 1 && ps().inventory.ore_copper_ore === 5, ps().inventory);
}

// ── 5. The vendor ──
{
  const bar = room._shopBaseValue('bar_copper');
  const ore = room._shopBaseValue('ore_copper_ore');
  check('a bar is worth more to the vendor than the five ore it cost', bar > ore * R.oreCost, { bar, ore });
}

// ── 6. Kill switch ──
{
  room._liveFlags = { ...(room._liveFlags || {}), smelting: false };
  ps().inventory.ore_copper_ore = 10;
  const r = await smelt(ws, { barKey: 'bar_copper' });
  check('switched off: nothing smelts', r === null && ps().inventory.ore_copper_ore === 10);
  const ws2 = fakeWs();
  await join(ws2, 'bp_smelt_b');
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told smelting is off', !!sync && sync.caps.smelting === false);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall smelting checks passed');
process.exit(failures ? 1 : 0);
