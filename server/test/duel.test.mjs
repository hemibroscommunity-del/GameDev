/* Duel machine test (v2.3.1121, PR6 of the heavy-systems plan).
 * Checks:
 *   1. Handshake: wager challenge -> accept escrows BOTH wagers, records
 *      the persisted pot, registers the damage-gate pair, annotates the
 *      relayed accept (settled + authoritative wager).
 *   2. Forged/unmatched accepts are dropped; accept can't inflate the
 *      wager beyond the challenged number.
 *   3. Accepter who can't afford the wager -> decline both, challenger's
 *      already-taken wager refunded.
 *   4. Clean duel kill resolves: winner takes the pot, escrow record
 *      cleaned, consent pair cleared, duel_end emitted, and the death
 *      is flagged no-pile/no-wipe.
 *   5. Death to a MONSTER mid-duel resolves the pot to the opponent but
 *      is NOT protected (pile + wipe apply).
 *   6. Disconnect grace: rejoin inside 15s keeps the duel; grace expiry
 *      forfeits the pot to the opponent.  6b/6c (v2.3.1175): BOTH
 *      players away at once — each owns an independent grace clock,
 *      rejoin clears only the rejoiner's slot, and when both expire
 *      the earliest disconnect forfeits.
 *   7. Stale-escrow sweep refunds both after a "deploy wipe", but never
 *      refunds on top of an already-paid pot.
 *   8. Zero-wager duels create no escrow and resolve cleanly.
 */
import { GameRoom } from '../src/index.js';

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
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const chalMsg = (target, wager) => ({ type: 'duel_wager_request', payload: { target, fromName: 'A', wager } });
const acceptMsg = (target, wager) => ({ type: 'duel_accept', payload: { target, wager } });

const wsA = fakeWs('a'); const wsB = fakeWs('b');
await join(wsA, 'bp_duel_a');
await join(wsB, 'bp_duel_b');
const psA = room.playerState['bp_duel_a'];
const psB = room.playerState['bp_duel_b'];
psA.coins = 100; psB.coins = 100;
psA.inventory = { wood: 3 }; psB.inventory = { fish: 2 };

// ── 2 (first): forged accept with no challenge ──
const forged = await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 50));
check('forged accept dropped', forged === null);

// ── 1. handshake with wager ──
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 40));
const acc = await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 9999)); // accepter echoes an inflated number
check('accept relays settled with the CHALLENGED wager', acc && acc.payload.settled === true && acc.payload.wager === 40, acc && acc.payload);
check('both wagers escrowed', psA.coins === 60 && psB.coins === 60, { a: psA.coins, b: psB.coins });
const duel = room._duelFor('bp_duel_a');
check('duel active with persisted escrow record', duel && duel.wager === 40 && state._store.has('duelEscrow:' + duel.id), duel);
check('damage-gate pair registered', room._pvpAllowed('bp_duel_a', 'bp_duel_b', 'town') === true);

// ── 4. clean duel kill ──
room.eventBuffer.length = 0;
psB.hp = 0;
room._handlePlayerDeath(psB, 'bp_duel_b', 'pvp:bp_duel_a');
await new Promise((r) => setTimeout(r, 20)); // fire-and-forget pot settle
check('winner takes the pot', psA.coins === 60 + 80, psA.coins);
check('clean duel kill spawns no pile and keeps inventory', Object.keys(psB.inventory).length === 1 && psB.inventory.fish === 2, psB.inventory);
check('escrow record cleaned after settle', !state._store.has('duelEscrow:' + duel.id));
check('duel_end emitted', room.eventBuffer.some((e) => e.type === 'duel_end' && e.payload.winner === 'bp_duel_a' && e.payload.how === 'kill'), room.eventBuffer.map((e) => e.type));
check('consent pair cleared on resolution', room._pvpAllowed('bp_duel_a', 'bp_duel_b', 'town') === false);

// reset for next rounds
psB.dying = false; psB.dead = false; psB.hp = 100;

// ── 3. accepter can't afford ──
psB.coins = 5;
const coinsA3 = psA.coins;
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 50));
room.eventBuffer.length = 0;
const accPoor = await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 50));
await new Promise((r) => setTimeout(r, 10));
check('poor accepter declines both, challenger refunded', accPoor === null && psA.coins === coinsA3 && room.eventBuffer.filter((e) => e.type === 'duel_decline').length === 2, { coins: psA.coins, buf: room.eventBuffer.map((e) => e.type) });

// ── 5. monster death mid-duel: pot to opponent, NOT protected ──
psB.coins = 100;
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 10));
await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 10));
const coinsA5 = psA.coins;
room.eventBuffer.length = 0;
psB.hp = 0;
room._handlePlayerDeath(psB, 'bp_duel_b', 'monster:fodder');
await new Promise((r) => setTimeout(r, 20));
check('monster death mid-duel forfeits the pot', psA.coins === coinsA5 + 20, psA.coins);
check('monster death mid-duel is a normal death (inventory wiped)', Object.keys(psB.inventory).length === 0, psB.inventory);
psB.dying = false; psB.dead = false; psB.hp = 100;

// ── 6. disconnect grace ──
psB.coins = 100;
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 10));
await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 10));
const duel6 = room._duelFor('bp_duel_a');
room._duelOnDisconnect('bp_duel_b');
check('disconnect arms the grace window', duel6.away['bp_duel_b'] > Date.now(), duel6.away);
room._duelOnRejoin('bp_duel_b');
check('rejoin inside grace keeps the duel', !duel6.away['bp_duel_b'] && room._duelFor('bp_duel_a') === duel6);
room._duelOnDisconnect('bp_duel_b');
duel6.away['bp_duel_b'] = Date.now() - 1;
const coinsA6 = psA.coins;
room.eventBuffer.length = 0;
room._tickDuels(Date.now());
await new Promise((r) => setTimeout(r, 20));
check('grace expiry forfeits to the opponent', psA.coins === coinsA6 + 20 && room.eventBuffer.some((e) => e.type === 'duel_end' && e.payload.how === 'forfeit'), { coins: psA.coins });

// ── 6b. both players disconnect (v2.3.1175: per-player away map) ──
// The old single awayId/graceUntil slot let the second disconnect
// clobber the first player's forfeit clock, and the first player's
// rejoin no longer matched (awayId held the other id) so their consent
// pair was never re-registered.
psB.coins = 100;
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 10));
await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 10));
const duel6b = room._duelFor('bp_duel_a');
room._duelOnDisconnect('bp_duel_a');
const aGrace = duel6b.away['bp_duel_a'];
room._duelOnDisconnect('bp_duel_b');
check('second disconnect does not clobber the first grace clock', duel6b.away['bp_duel_a'] === aGrace && duel6b.away['bp_duel_b'] > Date.now(), duel6b.away);
if (room._pvpConsent) room._pvpConsent.delete(room._pvpPairKey('bp_duel_a', 'bp_duel_b')); // simulate webSocketClose's consent clear
room._duelOnRejoin('bp_duel_a');
check('rejoin clears only own slot and re-registers consent', !duel6b.away['bp_duel_a'] && duel6b.away['bp_duel_b'] > 0 && room._pvpAllowed('bp_duel_a', 'bp_duel_b', 'town') === true, duel6b.away);
duel6b.away['bp_duel_b'] = Date.now() - 1;
const coinsA6b = psA.coins;
room.eventBuffer.length = 0;
room._tickDuels(Date.now());
await new Promise((r) => setTimeout(r, 20));
check('remaining away player forfeits after own grace', psA.coins === coinsA6b + 20 && room.eventBuffer.some((e) => e.type === 'duel_end' && e.payload.loser === 'bp_duel_b' && e.payload.how === 'forfeit'), { coins: psA.coins, buf: room.eventBuffer.map((e) => e.type) });

// ── 6c. both graces expired: earliest disconnect forfeits ──
psB.coins = 100;
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 10));
await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 10));
const duel6c = room._duelFor('bp_duel_a');
duel6c.away = { 'bp_duel_a': Date.now() - 100, 'bp_duel_b': Date.now() - 50 };
const coinsB6c = psB.coins;
room.eventBuffer.length = 0;
room._tickDuels(Date.now());
await new Promise((r) => setTimeout(r, 20));
check('double-away: earliest expiry loses, opponent takes the pot', psB.coins === coinsB6c + 20 && room.eventBuffer.some((e) => e.type === 'duel_end' && e.payload.loser === 'bp_duel_a' && e.payload.how === 'forfeit'), { coins: psB.coins, buf: room.eventBuffer.map((e) => e.type) });

// ── 7. stale-escrow sweep ──
// Simulate a deploy: escrow record persisted, in-memory duel map gone.
state._store.set('duelEscrow:dead-duel', { a: 'bp_duel_a', b: 'bp_duel_b', wager: 15, startedAt: Date.now() - 999999 });
const coinsA7 = psA.coins; const coinsB7 = psB.coins;
room._lastDuelSweep = 0;
await room._duelEscrowSweep();
check('orphaned escrow refunds both', psA.coins === coinsA7 + 15 && psB.coins === coinsB7 + 15, { a: psA.coins, b: psB.coins });
check('orphaned record deleted', !state._store.has('duelEscrow:dead-duel'));
// Already-paid pot: stamp the pot opId, then plant a stale record.
await room._opStamp('duelpot:paid-duel');
state._store.set('duelEscrow:paid-duel', { a: 'bp_duel_a', b: 'bp_duel_b', wager: 500, startedAt: Date.now() - 999999 });
const coinsA7b = psA.coins;
room._lastDuelSweep = 0;
await room._duelEscrowSweep();
check('sweep never refunds a settled pot', psA.coins === coinsA7b && !state._store.has('duelEscrow:paid-duel'), psA.coins);

// ── 8. zero-wager duel ──
await room._interceptDuel('bp_duel_a', { type: 'duel_request', payload: { target: 'bp_duel_b', fromName: 'A' } });
const accFree = await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 0));
const duel8 = room._duelFor('bp_duel_a');
check('zero-wager duel activates with no escrow record', accFree && duel8 && duel8.wager === 0 && ![...state._store.keys()].some((k) => k === 'duelEscrow:' + duel8.id), duel8);
psB.hp = 0; psB.dying = false; psB.dead = false;
room._handlePlayerDeath(psB, 'bp_duel_b', 'pvp:bp_duel_a');
check('zero-wager duel resolves cleanly on kill', room._duelFor('bp_duel_a') === null);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
