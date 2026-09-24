/* The daily chest -- v2.3.2820.
 *
 * Owner: "I'd rather have a loot box that has a high chance of coins but a
 * small chance of other items like 10 cooked fish or rare gems or pieces of
 * armor that have a chance of rolling for rarity etc.  Instead of daily coin
 * reward."
 *
 *   1. The day's login pays ONE chest into the bag, not gold, once per day.
 *   2. Opening takes the chest and pays exactly one prize, of each kind:
 *      coins (never below the old daily gold), 10 cooked fish, a rare gem,
 *      a piece of armour with a rolled quality and a provenance id.
 *   3. It cannot be opened without a chest, with a junk key, or twice on a
 *      replayed opId.
 *   4. The odds table sums to 100 and coins are the large majority.
 *   5. caps.dailyChest is advertised; the kill switch pays gold and waits.
 */
import { GameRoom } from '../src/index.js';
import { CHEST } from '../src/dailychest.js';

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
const settle = () => new Promise((r) => setTimeout(r, 10));
const open = async (ws, extra) => {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'chest_open', payload: { invKey: 'daily_chest', ...(extra || {}) } }));
  await settle();   /* the router fires the handler without awaiting it (the cape_redeem shape) */
  return ws.sent.find((m) => m.type === 'chest_opened') || null;
};
/* Force the next rolls: the first value picks the prize, the rest feed
   the coin roll / the armour pick. */
const force = (...vals) => { let i = 0; room._chestRand = () => (i < vals.length ? vals[i++] : 0.5); };

// ── 4. The table ──
{
  const total = CHEST.PRIZES.reduce((s, p) => s + p.weight, 0);
  check('the odds table sums to 100', total === 100, total);
  check('coins are the large majority of chests', CHEST.PRIZES.find((p) => p.id === 'coins').weight >= 70);
}

// ── 1. The day pays a chest ──
let ws = fakeWs();
await join(ws, 'bp_chest_a');
const ps = room.playerState['bp_chest_a'];
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.dailyChest is advertised', !!sync && sync.caps.dailyChest === true);
  check('the first join of the day puts ONE chest in the bag', (ps.inventory || {}).daily_chest === 1, ps.inventory);
  const deliv = ws.sent.find((m) => m.type === 'inbox_delivered');
  const e = deliv && deliv.payload.entries.find((x) => x.source === 'daily');
  check('...announced as a daily item, not gold', !!e && e.kind === 'item' && e.payload.invKey === 'daily_chest' && /Daily chest/.test(e.note), e);
  const ws2 = fakeWs();
  await join(ws2, 'bp_chest_a');
  check('a second join the same day does not pay a second chest', room.playerState['bp_chest_a'].inventory.daily_chest === 1,
    room.playerState['bp_chest_a'].inventory);
  ws = ws2;   /* the second join superseded the first socket */
}

// ── 2. Each prize ──
const ps2 = () => room.playerState['bp_chest_a'];
const giveChest = () => { ps2().inventory.daily_chest = (ps2().inventory.daily_chest || 0) + 1; };
{
  const coins0 = ps2().coins || 0;
  force(0.10, 0.0);                               /* coins, lowest roll */
  const r = await open(ws);
  check('COINS: opening takes the chest', !ps2().inventory.daily_chest, ps2().inventory);
  check('...and pays at least the old daily gold (25 on day 1)', r && r.payload.prize.kind === 'coins'
    && r.payload.prize.coins >= 25 && (ps2().coins - coins0) === r.payload.prize.coins, { r: r && r.payload, got: ps2().coins - coins0 });

  giveChest(); force(0.10, 0.999);
  const hi = await open(ws);
  check('...the top coin roll is the old gold x1.6 (40 on day 1)', hi && hi.payload.prize.coins === 40, hi && hi.payload);

  giveChest(); force(0.80);                        /* 78..86 -> fish */
  const f0 = ps2().inventory.cooked_fish_minnow || 0;
  const fr = await open(ws);
  check('FISH: 10 cooked fish land in the bag', fr && fr.payload.prize.kind === 'fish'
    && (ps2().inventory.cooked_fish_minnow || 0) - f0 === 10, fr && fr.payload);

  giveChest(); force(0.90);                        /* 86..94 -> gem */
  const g0 = ps2().inventory.rare_gem || 0;
  const gr = await open(ws);
  check('GEM: a rare gem lands in the bag', gr && gr.payload.prize.kind === 'gem'
    && (ps2().inventory.rare_gem || 0) - g0 === 1, gr && gr.payload);

  giveChest(); force(0.97, 0.99);                  /* 94..100 -> armour, last row = Iron Greaves */
  const ar = await open(ws);
  const pc = ar && ar.payload.prize.piece;
  check('ARMOUR: a piece of armour, with a rolled quality',
    ar && ar.payload.prize.kind === 'armor' && pc && pc.name === 'Iron Greaves' && pc.slot === 'legsArmor'
    && ['normal', 'rare', 'elite', 'godly'].includes(pc.quality), ar && ar.payload);
  check('...minted into the provenance ledger (it carries a gid)', !!pc && typeof pc.gid === 'string' && pc.gid.length > 0, pc);
  check('...and every result is followed by a player_state carrying the new totals',
    ws.sent.some((m) => m.type === 'player_state'));
}

// ── 3. Refusals ──
{
  delete ps2().inventory.daily_chest;
  const coins0 = ps2().coins;
  const none = await open(ws);
  check('no chest in the bag: nothing opens', none === null && ps2().coins === coins0);

  giveChest();
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'chest_open', payload: { invKey: '__proto__' } }));
  await settle();
  check('a junk key opens nothing and leaves the chest', !ws.sent.some((m) => m.type === 'chest_opened') && ps2().inventory.daily_chest === 1);

  giveChest();                                    /* two chests */
  force(0.10, 0.5);
  const a = await open(ws, { opId: 'same-op' });
  const b = await open(ws, { opId: 'same-op' });
  check('a replayed opId opens only once', !!a && b === null && ps2().inventory.daily_chest === 1, ps2().inventory);
}

// ── 5. Kill switch ──
{
  room._liveFlags = { ...(room._liveFlags || {}), dailyChest: false };
  const before = ps2().inventory.daily_chest;
  const r = await open(ws);
  check('switched off: a chest in the bag waits (not opened, not lost)', r === null && ps2().inventory.daily_chest === before);

  const ws3 = fakeWs();
  await join(ws3, 'bp_chest_b');
  const psB = room.playerState['bp_chest_b'];
  const d = ws3.sent.find((m) => m.type === 'inbox_delivered');
  const e = d && d.payload.entries.find((x) => x.source === 'daily');
  check('switched off: the day pays plain gold again, no chest',
    !!e && e.kind === 'gold' && !(psB.inventory || {}).daily_chest, e);
  const sync = ws3.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told the chest is off', !!sync && sync.caps.dailyChest === false);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall dailychest checks passed');
process.exit(failures ? 1 : 0);
