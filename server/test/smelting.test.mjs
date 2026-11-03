/* Smelting -- v2.3.2822.
 *
 * Owner: "Make one bar require 5 copper ore.  You get xp for each time you
 * smelt it into a bar."
 *
 *   1. caps.smelting is advertised.
 *   2. One smelt takes exactly 1 copper ore (v2.3.3912; was 5), gives one Copper Bar and pays
 *      Smithing XP, and answers smelt_result + player_state.
 *   3. "Smelt all" smelts only what the ore pays for, and pays XP per bar.
 *   4. Refusals: short of ore, a junk / inherited key, a forged huge count.
 *   5. A bar sells to the vendor for more than the ore it cost (v2.3.3912;
 *      was five), and buying his ore to sell him bars loses.
 *   6. The kill switch refuses and un-advertises.
 *   7. v2.3.3912: ONE ORE A BAR (the owner: "I just want 5 raw to turn into 5
 *      processed").  caps.onetoone is advertised; `onetoone: false` brings
 *      back five ore a bar, the old XP and the old bar price, and takes the
 *      cap back; an old phone that still counts five ore a bar is given the
 *      bars it asked for and no more.
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
/* v2.3.3912: one ore (the owner's "5 raw to turn into 5 processed"), and a
   fifth of the old bar's 400 XP, so Smithing levels at the same pace per ore */
check('a copper bar costs 1 copper ore (the owner\'s one-to-one) and pays 80 Smithing XP', R.oreCost === 1 && R.ore === 'ore_copper_ore' && R.xp === 80, R);

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
  check('one smelt takes exactly 1 copper ore', ps().inventory.ore_copper_ore === 6, ps().inventory);
  check('...and puts one Copper Bar in the bag', ps().inventory.bar_copper === 1, ps().inventory);
  check('...and pays Smithing XP', (smith().level > lvl0) || (smith().xp - xp0) === R.xp, smith());
  check('...announced in smelt_result', !!r && r.payload.count === 1 && r.payload.xp === R.xp && r.payload.barKey === 'bar_copper', r && r.payload);
  check('...followed by a player_state with the new bag', ws.sent.some((m) => m.type === 'player_state'));
}

// ── 3. Smelt all ──
{
  ps().inventory.ore_copper_ore = 20;          /* v2.3.3912: 20 bars, no ore left (was 23 ore -> 4 bars) */
  delete ps().inventory.bar_copper;
  ps().lifeSkills.blacksmithing = { level: 1, xp: 0 };
  const r = await smelt(ws, { barKey: 'bar_copper', count: 50 });
  check('smelt-all makes only the bars the ore pays for (20 ore -> 20 bars, asked for 50)',
    ps().inventory.bar_copper === 20 && !ps().inventory.ore_copper_ore, ps().inventory);
  check('...and pays XP for EACH bar (20 x ' + R.xp + ')', !!r && r.payload.xp === 20 * R.xp, r && r.payload);
  /* 1600 XP from level 1: 1000 to reach 2 (v2.3.3090: every life-skill level
     costs twice the XP; it was 500 to 2 and 540 to 3, level 3 + 560) -> level 2 + 600 */
  check('...which levels Smithing (level 1 -> 2 on 1,600 XP)', smith().level === 2 && smith().xp === 600 && r.payload.leveled === true
    && r.payload.fromLevel === 1 && r.payload.newLevel === 2, { s: smith(), p: r && r.payload });
}

// ── 4. Refusals ──
{
  delete ps().inventory.ore_copper_ore;
  const bars0 = ps().inventory.bar_copper;
  const r = await smelt(ws, { barKey: 'bar_copper' });
  check('no ore: nothing smelts, nothing is taken', r === null && !ps().inventory.ore_copper_ore && ps().inventory.bar_copper === bars0);

  ps().inventory.ore_copper_ore = 50;
  for (const bad of ['__proto__', 'constructor', 'toString', 'bar_mythril', 'ore_copper_ore', 42, null]) {
    const x = await smelt(ws, { barKey: bad });
    check('a junk key (' + String(bad) + ') smelts nothing', x === null && ps().inventory.ore_copper_ore === 50);
  }

  ps().inventory.ore_copper_ore = 10;
  delete ps().inventory.bar_copper;
  const big = await smelt(ws, { barKey: 'bar_copper', count: 1e9 });
  check('a forged huge count still smelts only what the ore pays for', !!big && big.payload.count === 10
    && ps().inventory.bar_copper === 10 && !ps().inventory.ore_copper_ore, ps().inventory);
  ps().inventory.ore_copper_ore = 80;
  delete ps().inventory.bar_copper;
  const many = await smelt(ws, { barKey: 'bar_copper', count: 1e9 });
  check('...and never more than ' + SMELT.MAX_PER_REQUEST + ' bars a request (80 ore: 50 bars, 30 ore left)', !!many && many.payload.count === SMELT.MAX_PER_REQUEST
    && ps().inventory.bar_copper === SMELT.MAX_PER_REQUEST && ps().inventory.ore_copper_ore === 30, ps().inventory);
  ps().inventory.ore_copper_ore = 10;
  const neg = await smelt(ws, { barKey: 'bar_copper', count: -5 });
  check('a negative count is read as one', !!neg && neg.payload.count === 1 && ps().inventory.ore_copper_ore === 9, ps().inventory);
}

// ── 5. The vendor ──
{
  const bar = room._shopBaseValue('bar_copper');
  const ore = room._shopBaseValue('ore_copper_ore');
  check('a bar is worth more to the vendor than the ore it cost', bar > ore * R.oreCost, { bar, ore });
  /* v2.3.3912: and not so much more that buying his ore to sell him bars
     pays: he sells at the base and buys at half of it (SHOP.BUY_RATE) */
  check('...but his offer for a bar is under what he asks for its ore (no buying ore to sell bars): 48 vs 40',
    bar === 48 && room._shopBuyPrice('bar_copper', 0) < room._shopSellPrice('ore_copper_ore') * R.oreCost, { bar, ore, offer: room._shopBuyPrice('bar_copper', 0) });
}

// ── 5b. v2.3.3092: iron and black steel, the armor forge's other metals ──
{
  const I = SMELT.RECIPES.bar_iron, B = SMELT.RECIPES.bar_black_steel;
  check('iron and black steel bars: one of their own ore each (v2.3.3912), Smithing 5 and 10, 120 and 160 XP',
    !!I && !!B && I.ore === 'ore_iron_ore' && B.ore === 'ore_black_steel_ore' && I.oreCost === 1 && B.oreCost === 1
    && I.minLvl === 5 && B.minLvl === 10 && I.xp === 120 && B.xp === 160, { I, B });
  ps().lifeSkills.blacksmithing = { level: 4, xp: 0 };
  ps().inventory.ore_iron_ore = 10;
  let r = await smelt(ws, { barKey: 'bar_iron' });
  check('...iron at Smithing 4: nothing smelts', r === null && ps().inventory.ore_iron_ore === 10);
  ps().lifeSkills.blacksmithing = { level: 5, xp: 0 };
  r = await smelt(ws, { barKey: 'bar_iron', count: 2 });
  check('...at 5: two iron bars from two of the ten ore, ' + I.xp + ' XP each', !!r && r.payload.count === 2 && r.payload.xp === 2 * I.xp
    && ps().inventory.bar_iron === 2 && ps().inventory.ore_iron_ore === 8, r && r.payload);
  ps().lifeSkills.blacksmithing = { level: 10, xp: 0 };
  ps().inventory.ore_black_steel_ore = 6;
  r = await smelt(ws, { barKey: 'bar_black_steel', count: 5 });
  check('...black steel at 10: five bars from six ore (one ore left), ' + B.xp + ' XP each', !!r && r.payload.count === 5 && r.payload.xp === 5 * B.xp
    && ps().inventory.bar_black_steel === 5 && ps().inventory.ore_black_steel_ore === 1, r && r.payload);
  check('...and both bars sell to the vendor as bars', room._shopBaseValue('bar_iron') === room._shopBaseValue('bar_copper')
    && room._shopBaseValue('bar_black_steel') === room._shopBaseValue('bar_copper'));
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

// ── 7. v2.3.3912: one ore a bar, and its switch ──
{
  room._liveFlags = {};
  const ws3 = fakeWs();
  await join(ws3, 'bp_smelt_c');
  const sync = ws3.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.onetoone is advertised', !!sync && sync.caps.onetoone === true, sync && sync.caps.onetoone);
  const p3 = () => room.playerState['bp_smelt_c'];
  /* the XP pace: forty copper ore make as much Smithing XP as they did as
     eight bars (40 x 80 = 8 x 400) */
  check('the same Smithing XP an ore as before (80 x 5 = 400, 120 x 5 = 600, 160 x 5 = 800)',
    Object.keys(SMELT.RECIPES).every((k) => SMELT.RECIPES[k].xp * SMELT.FIVE[k].oreCost === SMELT.FIVE[k].xp * SMELT.RECIPES[k].oreCost));
  /* an OLD phone still counts five ore a bar: with 12 ore its "All (2)" asks
     for two -- and is given two, for two ore, never more than it asked */
  p3().inventory.ore_copper_ore = 12;
  const old = await smelt(ws3, { barKey: 'bar_copper', count: 2 });
  check('an old phone\'s "All (2)" for 12 ore: two bars for two ore (the worker settles, from its own table)', !!old && old.payload.count === 2
    && p3().inventory.bar_copper === 2 && p3().inventory.ore_copper_ore === 10 && old.payload.xp === 2 * R.xp, { inv: p3().inventory, p: old && old.payload });

  /* the switch off: five ore a bar again, the old XP and price, the cap taken back */
  room._liveFlags = { onetoone: false };
  check('`onetoone: false` switches it off, and nothing set leaves it on',
    room._oneToOneOff() === true && (() => { const w = room._liveFlags; room._liveFlags = {}; const on = room._oneToOneOff(); room._liveFlags = w; return on === false; })());
  const r5 = room._smeltRecipe('bar_copper');
  check('...the recipe is five ore and 400 XP again (iron 600, black steel 800)', r5.oreCost === 5 && r5.xp === 400 && r5.minLvl === 1 && r5.ore === 'ore_copper_ore'
    && room._smeltRecipe('bar_iron').xp === 600 && room._smeltRecipe('bar_black_steel').xp === 800 && room._smeltRecipe('__proto__') === null, r5);
  check('...without touching the table (RECIPES still one ore)', SMELT.RECIPES.bar_copper.oreCost === 1 && SMELT.RECIPES.bar_copper.xp === 80);
  p3().inventory.ore_copper_ore = 12;
  delete p3().inventory.bar_copper;
  p3().lifeSkills = { ...(p3().lifeSkills || {}), blacksmithing: { level: 1, xp: 0 } };
  const off = await smelt(ws3, { barKey: 'bar_copper', count: 50 });
  check('...smelt-all on 12 ore makes two bars, two ore left, 400 XP each', !!off && off.payload.count === 2 && off.payload.xp === 800
    && p3().inventory.bar_copper === 2 && p3().inventory.ore_copper_ore === 2, { inv: p3().inventory, p: off && off.payload });
  check('...and Diego prices a bar at 240 again', room._shopBaseValue('bar_iron') === 240 && room._shopBaseValue('ore_copper_ore') === 40);
  const ws4 = fakeWs();
  await join(ws4, 'bp_smelt_d');
  const sync4 = ws4.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is not told onetoone (the game draws five ore a bar)', !!sync4 && sync4.caps.onetoone === false && sync4.caps.smelting === true, sync4 && sync4.caps.onetoone);
  room._liveFlags = {};
  check('switched back on: one ore and 48 again', room._smeltRecipe('bar_copper').oreCost === 1 && room._shopBaseValue('bar_copper') === 48);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall smelting checks passed');
process.exit(failures ? 1 : 0);
