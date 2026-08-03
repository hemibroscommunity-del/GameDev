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
 *      forfeits the pot to the opponent.  v2.3.1175: both players away
 *      hold independent clocks (one rejoin can't erase the other's
 *      forfeit timer); both expired -> the first leaver loses.
 *   7. Stale-escrow sweep refunds both after a "deploy wipe", but never
 *      refunds on top of an already-paid pot.
 *   8. Zero-wager duels create no escrow and resolve cleanly.
 *   9. v2.3.1302 PvP resolution tuning: ranged/staff `kind` unlocks the
 *      projectile-scale range cap (the "only melee hurts in duels" bug),
 *      damage is 0.5x-scaled + def-mitigated (no one-shots), legacy
 *      payloads (no kind) keep the tight 250 melee clamp, and
 *      out-of-range hits of either kind are still rejected.
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
// v2.3.1616: ...and it must SURVIVE THE RESPAWN.  _tickPlayerRespawn wipes the
// inventory again five seconds later as defence-in-depth, and that second wipe
// was unconditional -- so a duel kill kept the bag for exactly the length of
// this assertion and then lost it.  Checking only the line above is why the
// suite stayed green while every real duel loser was robbed.
psB.respawnAt = Date.now() - 1;
room._tickPlayerRespawn();
check('a duel loser still has their bag AFTER respawning', psB.inventory.fish === 2, psB.inventory);
check('respawn cleared the one-shot exemption flag', psB._duelDeathKeepsBag === undefined, psB._duelDeathKeepsBag);
// An ORDINARY death still wipes on respawn -- the exemption is duel-only.
psB.inventory = { fish: 2 };
psB.hp = 0; psB.dying = false; psB.dead = false;
room._handlePlayerDeath(psB, 'bp_duel_b', 'monster:m1');
check('a monster death still wipes the bag at death', Object.keys(psB.inventory).length === 0, psB.inventory);
psB.inventory = { fish: 2 };            // re-seed to prove the respawn wipe still fires
psB.respawnAt = Date.now() - 1;
room._tickPlayerRespawn();
check('a monster death still wipes the bag on respawn', Object.keys(psB.inventory).length === 0, psB.inventory);
psB.hp = psB.maxHp || 100; psB.dying = false; psB.dead = false;
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
check('disconnect arms the grace window', duel6.away['bp_duel_b'] > Date.now());
room._duelOnRejoin('bp_duel_b');
check('rejoin inside grace keeps the duel', duel6.away['bp_duel_b'] === undefined && room._duelFor('bp_duel_a') === duel6);
// v2.3.1175: both players away tracks BOTH clocks (the old single-slot
// awayId let the second disconnect overwrite the first).
room._duelOnDisconnect('bp_duel_b');
room._duelOnDisconnect('bp_duel_a');
check('both disconnects hold independent clocks', duel6.away['bp_duel_a'] > Date.now() && duel6.away['bp_duel_b'] > Date.now(), duel6.away);
room._duelOnRejoin('bp_duel_a');
check('one rejoin leaves the other clock armed', duel6.away['bp_duel_a'] === undefined && duel6.away['bp_duel_b'] > Date.now(), duel6.away);
duel6.away['bp_duel_b'] = Date.now() - 1;
const coinsA6 = psA.coins;
room.eventBuffer.length = 0;
room._tickDuels(Date.now());
await new Promise((r) => setTimeout(r, 20));
check('grace expiry forfeits to the opponent', psA.coins === coinsA6 + 20 && room.eventBuffer.some((e) => e.type === 'duel_end' && e.payload.how === 'forfeit'), { coins: psA.coins });

// ── 6b. both clocks expired: the earlier deadline (first leaver) loses ──
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 10));
await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 10));
const duel6b = room._duelFor('bp_duel_a');
duel6b.away = { bp_duel_a: Date.now() - 5000, bp_duel_b: Date.now() - 1 }; // A left first
room.eventBuffer.length = 0;
room._tickDuels(Date.now());
await new Promise((r) => setTimeout(r, 20));
check('double-away forfeit goes against the first leaver', room.eventBuffer.some((e) => e.type === 'duel_end' && e.payload.how === 'forfeit' && e.payload.loser === 'bp_duel_a' && e.payload.winner === 'bp_duel_b'), room.eventBuffer.map((e) => e.payload));

// ── 6c. hostile join id: '__proto__' still gets a working forfeit clock ──
// away is null-prototype (see _makeDuel) -- on a plain {} this
// assignment would silently no-op via the inherited accessor, the
// clock would never arm, and the duel would stick forever.
room._duels.set('dproto', room._makeDuel({ id: 'dproto', a: '__proto__', b: 'bp_duel_a', wager: 0, startedAt: Date.now() }));
room._duelOnDisconnect('__proto__');
const dproto = room._duels.get('dproto');
check('null-proto away map arms a clock for a __proto__ id', typeof dproto.away['__proto__'] === 'number' && Object.keys(dproto.away).length === 1, Object.keys(dproto.away));
room._duels.delete('dproto');

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

// ── 9. PvP attack resolution: kind-aware range + scaled/mitigated damage (v2.3.1302) ──
// Fresh zero-wager duel to re-arm the consent pair after section 8 resolved it.
psB.dying = false; psB.dead = false; psB.hp = 100; psB.maxHp = 100;
await room._interceptDuel('bp_duel_a', { type: 'duel_request', payload: { target: 'bp_duel_b', fromName: 'A' } });
await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 0));
check('pvp: consent pair armed for resolution tests', room._pvpAllowed('bp_duel_a', 'bp_duel_b', 'town') === true);
// Deterministic setup: no crit (critChance 0), no dodge (agility 0, no
// defenseSpec), no grace window, def 100 -> mitigation exactly 0.5.
const sessA = { id: 'bp_duel_a', name: 'A', rtt: 0 };
psA.x = 0; psA.y = 0; psA.dying = false; psA.dead = false;
psB.x = 600; psB.y = 0; psB.z = psA.z;
psB.agility = 0; psB.dodging = false; psB.blocking = false;
psB._zoneEntryGraceUntil = 0; psB.def = 100;
room.stateHistory['bp_duel_b'] = []; // force current-state fallback
/* v2.3.1306: ranged/staff kind is honored only when the server knows
   the matching weapon; give A both so the §9 geometry checks still
   exercise the widened caps. */
psA.rangedWeapon = { type: 'bow', tierMult: 1 };
psA.staffWeapon = { type: 'staff', tierMult: 1 };
/* v2.3.1306: back-to-back resolves in these tests would trip the new
   per-pair cadence floor — clear the lanes before each landed hit. */
const freshLanes = () => { room._pvpHitLanes = new Map(); };
const pvpAtk = (over) => { freshLanes(); return { dmgBase: 20, critChance: 0, angle: 0, arc: 0.9, ...over }; };

// 9a. ranged kind at projectile distance (600px) lands — the exact case
// the flat 250 clamp used to reject silently.
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'ranged', range: 660 }));
const hit9a = room.eventBuffer.find((e) => e.type === 'pvp_hit');
check('ranged kind lands at 600px', !!hit9a, room.eventBuffer.map((e) => e.type));
// 9b. damage is 0.5x scaled AND def-mitigated: 20 * 0.5 * 100/(100+100) = 5.
check('pvp damage scaled + def-mitigated (20 -> 5 at def 100)', hit9a && hit9a.payload.dmgTaken === 5 && psB.hp === 95, hit9a && hit9a.payload);
// 9c. no one-shot at representative stats: a special+crit-sized dmgBase
// (200 raw, the old lethal case) leaves a 100-hp target alive.
psB.hp = 100;
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'ranged', range: 660, dmgBase: 200, special: true }));
check('old one-shot dmgBase no longer lethal', psB.hp > 0, psB.hp);
// 9d. legacy payload (no kind) keeps the tight melee clamp: same 600px
// distance is rejected.
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ range: 660 }));
check('legacy no-kind payload still clamped to melee 250', !room.eventBuffer.some((e) => e.type === 'pvp_hit'), room.eventBuffer.map((e) => e.type));
// 9e. legacy payload in melee reach still lands (byte-identical gate).
psB.x = 100; psB.hp = 100;
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ range: 250 }));
check('legacy payload lands in melee reach, scaled', room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload.dmgTaken === 5), room.eventBuffer.map((e) => e.payload));
// 9f. ranged kind beyond the 950 projectile cap is rejected (anticheat
// ceiling intact — kind widens the clamp, it doesn't remove it).
psB.x = 1200; psB.hp = 100;
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'ranged', range: 5000 }));
check('ranged kind still capped at 950', !room.eventBuffer.some((e) => e.type === 'pvp_hit'), room.eventBuffer.map((e) => e.type));
// 9g. zero def -> scale only: 20 * 0.5 = 10.
psB.x = 300; psB.hp = 100; psB.def = 0;
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'staff', range: 360 }));
check('def 0 takes scale-only damage (20 -> 10)', room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload.dmgTaken === 10), room.eventBuffer.map((e) => e.payload));

// ── 10. v2.3.1306 hardening (repo-review of v2.3.1302) ──
// 10a. spoofed def past DEF_CAP gains nothing: effDef 150 -> 20*0.5*(100/250)=4.
psB.x = 300; psB.hp = 100; psB.def = 1e9;
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'ranged', range: 360 }));
check('spoofed def clamped at DEF_CAP (1e9 -> same as 150)', room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload.dmgTaken === 4), room.eventBuffer.map((e) => e.payload));
psB.def = 0;
// 10b. kind:'ranged' without a server-known ranged weapon falls back to
// the melee clamp — the 600px forgery is rejected.
psB.x = 600;
const savedBow = psA.rangedWeapon; psA.rangedWeapon = null;
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'ranged', range: 660 }));
check('weaponless ranged kind clamped to melee 250', !room.eventBuffer.some((e) => e.type === 'pvp_hit'), room.eventBuffer.map((e) => e.type));
psA.rangedWeapon = savedBow;
// 10c. cadence floor: second normal hit inside 300ms on the same pair drops.
psB.x = 100; psB.hp = 100;
room.eventBuffer.length = 0;
freshLanes();
room._resolvePvPAttack(sessA, { dmgBase: 20, critChance: 0, angle: 0, arc: 0.9, range: 250 });
room._resolvePvPAttack(sessA, { dmgBase: 20, critChance: 0, angle: 0, arc: 0.9, range: 250 });
check('cadence floor drops the immediate second hit', room.eventBuffer.filter((e) => e.type === 'pvp_hit').length === 1, room.eventBuffer.map((e) => e.type));
// 10d. special lane allows a 3-bolt burst, drops the 4th.
psB.hp = 100;
room.eventBuffer.length = 0;
freshLanes();
for (let i = 0; i < 4; i++) room._resolvePvPAttack(sessA, { dmgBase: 20, critChance: 0, angle: 0, arc: 0.9, range: 360, kind: 'staff', special: true });
check('special lane: 3 bolts land, 4th drops', room.eventBuffer.filter((e) => e.type === 'pvp_hit').length === 3, room.eventBuffer.map((e) => e.type));
// 10e. declared single target skips a bystander inside the cone.
const wsC = fakeWs('c');
await join(wsC, 'bp_duel_c');
const psC = room.playerState['bp_duel_c'];
// lawless zone so the bystander is consent-eligible (worst case).
psA.z = psB.z = psC.z = 'meadow';
psC.x = 150; psC.y = 0; psC.hp = 100; psC.agility = 0; psC._zoneEntryGraceUntil = 0;
psB.x = 300; psB.hp = 100;
room.stateHistory['bp_duel_c'] = [];
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'ranged', range: 360, target: 'bp_duel_b' }));
const hits10e = room.eventBuffer.filter((e) => e.type === 'pvp_hit');
check('declared target hit, cone bystander skipped', hits10e.length === 1 && hits10e[0].payload.target === 'bp_duel_b' && psC.hp === 100, hits10e.map((e) => e.payload));
psA.z = psB.z = 'town';
// 10f. authoritative died flag rides pvp_hit.
psB.hp = 3;
room.eventBuffer.length = 0;
room._resolvePvPAttack(sessA, pvpAtk({ kind: 'ranged', range: 360 }));
const hit10f = room.eventBuffer.find((e) => e.type === 'pvp_hit');
check('lethal hit carries died:true', hit10f && hit10f.payload.died === true && psB.hp === 0, hit10f && hit10f.payload);
psB.hp = 100; psB.dying = false; psB.dead = false;

// ── 11. town HP regen is gated DURING a duel (v2.3.1613) ──
// Hub regen restores 10% of maxHp every ~670 ms, roughly 15 hp/s at maxHp
// 100, while a melee swing lands ~4 damage on a 300 ms cadence.  Ungated,
// healing beat damage by more than an order of magnitude and a duel in town
// could never move either health bar -- the exact failure the owner reported
// ("this was a duel in town").  The arena already had this gate for the same
// reason (v2.3.1126); duels were never added to it.
psA.z = psB.z = 'town';
psA.hp = 40; psA.maxHp = 100;
psB.hp = 40; psB.maxHp = 100;
delete psA._arenaMatch; delete psB._arenaMatch;
await room._interceptDuel('bp_duel_a', chalMsg('bp_duel_b', 0));
const accRegen = await room._interceptDuel('bp_duel_b', acceptMsg('bp_duel_a', 0));
check('duel started for the regen check', accRegen !== null && !!room._duelFor('bp_duel_a'));
room._tickPlayerRegen();
check('town HP regen gated for BOTH duellists', psA.hp === 40 && psB.hp === 40, { a: psA.hp, b: psB.hp });

// A bystander in the same town keeps healing -- the gate is per-duellist.
room.playerState['bp_duel_c'].z = 'town';
room.playerState['bp_duel_c'].hp = 40;
room.playerState['bp_duel_c'].maxHp = 100;
delete room.playerState['bp_duel_c']._arenaMatch;
room._tickPlayerRegen();
check('a bystander in town still regenerates', room.playerState['bp_duel_c'].hp > 40, room.playerState['bp_duel_c'].hp);

// And once the duel ends, the duellists heal again.
const dR = room._duelFor('bp_duel_a');
await room._resolveDuel(dR, 'bp_duel_a', 'bp_duel_b', 'kill');
check('duel cleared before the post-duel regen check', !room._duelFor('bp_duel_a'));
psA.hp = 40; psA.dying = false; psA.dead = false;
psB.hp = 40; psB.dying = false; psB.dead = false;
room._tickPlayerRegen();
check('regen resumes once the duel is over', psA.hp > 40, psA.hp);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
