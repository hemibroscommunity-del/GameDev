/* Threat-machine test (v2.3.1129, PR13, handoff item C).  The threat
 * system was interim + broken end-to-end: consent required a field the
 * client never sent, the countdown had a ms/seconds mismatch, and
 * "Call Guards" (10% fine + 30-min gear lock) was pure button copy.
 * Checks:
 *   1. pvp_threat relays with a SERVER-stamped countdown: 2min +
 *      2min/level-above, capped at 10min; server cooldown blocks a
 *      second threat; self/bogus targets dropped.
 *   2. threat_response with no pending threat is dropped (forged).
 *   3. action 'ignored' grants the undirected consent pair (town PvP
 *      allowed both ways); countdown expiry does the same via the tick
 *      with threat_expired to both sides.
 *   4. action 'guards' fines the threatener exactly 10% (0 for broke
 *      attackers -- still locked), writes gearlock:<pid> to STORAGE,
 *      sends private threat_penalty, and grants NO consent.
 *   5. Gear-lock gates: equip_request / unequip_request / stats_update
 *      armor swap / forge_weapon all reject while locked (gear_locked
 *      sent); the same equip succeeds after expiry.
 *   6. The lock survives a rejoin (storage-backed -- reload can't shed
 *      the punishment).
 *   7. Forged threat_penalty / gear_locked are not rebroadcast.
 *
 * v2.3.1211 (item C, threat bounty pool): the Call-Guards fine escrows
 * onto the threatener's head instead of evaporating, paid to whoever
 * kills them.  Checks:
 *   8. Guards escrows the fine into bounty:<pid> (accumulating across
 *      repeat calls); a legit server-observed PvP kill pays the killer
 *      the pool + clears it; self / non-PvP / consensual-duel /
 *      same-clan kills pay nobody and leave the bounty in place; the
 *      _handlePlayerDeath choke point routes the payout; a re-fired
 *      death can't double-pay; the join-path sweep deletes stale
 *      bounties but spares fresh ones.
 */
import { GameRoom } from '../src/index.js';
import { THREAT } from '../src/threat.js';

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
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

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
const P = (n) => 'bp_th_' + n;
const threat = (ws, target) => room.webSocketMessage(ws, JSON.stringify({ type: 'pvp_threat', payload: { target, from: room.sessions.get(ws).id, fromName: 'X', fromLevel: 99 } }));
const respond = (ws, target, action) => room.webSocketMessage(ws, JSON.stringify({ type: 'threat_response', payload: { target, from: room.sessions.get(ws).id, action } }));
const relayed = (type) => room.eventBuffer.filter((e) => e.type === type);

const wss = {};
for (const n of ['a', 'b', 'c', 't', 'x']) {
  wss[n] = fakeWs(n);
  await join(wss[n], P(n));
  room.playerState[P(n)].coins = 1000;
}

// ── 1. countdown formula + cap, cooldown, bogus targets ──
room.playerState[P('a')].level = 3;  // 2 above the target
room.playerState[P('t')].level = 1;
room.eventBuffer.length = 0;
await threat(wss.a, P('t'));
let rel = relayed('pvp_threat');
check('threat relays with server countdown 2min + 2min/level-above', rel.length === 1 && rel[0].payload.countdown === THREAT.BASE_MS + 2 * THREAT.PER_LEVEL_MS && rel[0].payload.settled === true, rel.map((r) => r.payload));
room.eventBuffer.length = 0;
await threat(wss.a, P('x'));
check('server cooldown blocks a second threat', relayed('pvp_threat').length === 0);
room.playerState[P('b')].level = 99; // way above -> cap
room.eventBuffer.length = 0;
await threat(wss.b, P('t'));
rel = relayed('pvp_threat');
check('countdown capped at 10 min', rel.length === 1 && rel[0].payload.countdown === THREAT.MAX_MS, rel.map((r) => r.payload));
room.playerState[P('c')]._threatCdUntil = 0;
room.eventBuffer.length = 0;
await room.webSocketMessage(wss.c, JSON.stringify({ type: 'pvp_threat', payload: { target: P('c') } }));
check('self-threat dropped', relayed('pvp_threat').length === 0);

// ── 2. forged response dropped ──
room.eventBuffer.length = 0;
await respond(wss.x, P('c'), 'ignored'); // no pending c>x threat
check('forged threat_response dropped (not relayed)', relayed('threat_response').length === 0 && room._pvpAllowed(P('c'), P('x'), 'town') === false);

// ── 3. ignore grants the pair ──
room.eventBuffer.length = 0;
await respond(wss.t, P('a'), 'ignored'); // answers a's pending threat
check('ignore relays with settled and grants town PvP both ways', relayed('threat_response').length === 1 && room._pvpAllowed(P('a'), P('t'), 'town') === true && room._pvpAllowed(P('t'), P('a'), 'town') === true);

// ── 4. guards: levy + storage lock, no consent ──
wss.b.sent.length = 0;
room.eventBuffer.length = 0;
await respond(wss.t, P('b'), 'guards'); // answers b's pending threat
const psB = room.playerState[P('b')];
const pen = msgsOfType(wss.b, 'threat_penalty');
check('guards fines exactly 10%', psB.coins === 900 && pen.length === 1 && pen[0].payload.levy === 100, { coins: psB.coins, pen: pen.map((p) => p.payload) });
check('gear lock stamped + storage-backed', psB._gearLockUntil > Date.now() && state._store.get('gearlock:' + P('b')) === psB._gearLockUntil);
check('guards grants NO consent', room._pvpAllowed(P('b'), P('t'), 'town') === false);
check('response relayed with the levy for the popup', relayed('threat_response').length === 1 && relayed('threat_response')[0].payload.levy === 100);

// broke attacker: levy 0, still locked
room.playerState[P('c')].coins = 0;
room.playerState[P('c')]._threatCdUntil = 0;
await threat(wss.c, P('t'));
await respond(wss.t, P('c'), 'guards');
check('broke attacker: levy 0 but still gear-locked', room.playerState[P('c')].coins === 0 && room.playerState[P('c')]._gearLockUntil > Date.now());

// ── 5. gear-lock gates ──
psB.weaponStash = [{ type: 'sword', tier: 'common', tierMult: 1, name: 'stash sword', gearBase: 'iron' }];
const wpnBefore = psB.weapon ? JSON.stringify(psB.weapon) : 'null';
wss.b.sent.length = 0;
await room.webSocketMessage(wss.b, JSON.stringify({ type: 'equip_request', payload: { stashIdx: 0, slot: 'weapon' } }));
check('equip_request rejected while locked (+gear_locked notice)', (psB.weapon ? JSON.stringify(psB.weapon) : 'null') === wpnBefore && psB.weaponStash.length === 1 && msgsOfType(wss.b, 'gear_locked').length === 1, psB.weapon);
psB.armor = { name: 'Old Plate', tierMult: 2 };
psB._gearLockNotifAt = 0; // reset the notice rate limit between gates
await room.webSocketMessage(wss.b, JSON.stringify({ type: 'stats_update', payload: { armor: { name: 'New Plate', tierMult: 3 } } }));
check('armor swap rejected while locked', psB.armor && psB.armor.name === 'Old Plate', psB.armor);
psB._gearLockNotifAt = 0;
await room.webSocketMessage(wss.b, JSON.stringify({ type: 'unequip_request', payload: { slot: 'armor' } }));
check('unequip rejected while locked', psB.armor && psB.armor.name === 'Old Plate');
psB._gearLockNotifAt = 0;
psB.inventory = { ore_iron_ore: 99 };
psB.lifeSkills = { blacksmithing: { level: 99, xp: 0 } };
const coinsPreForge = psB.coins;
await room.webSocketMessage(wss.b, JSON.stringify({ type: 'forge_weapon', payload: { weaponType: 'sword', tierKey: 'iron', isWoodwork: false } }));
check('forge rejected while locked (no mint, no spend)', psB.coins === coinsPreForge && psB.weaponStash.length === 1);

// expiry restores equips
psB._gearLockUntil = Date.now() - 1000;
await room.webSocketMessage(wss.b, JSON.stringify({ type: 'equip_request', payload: { stashIdx: 0, slot: 'weapon' } }));
check('equip works after lock expiry', psB.weapon && psB.weapon.name === 'stash sword', psB.weapon);

// ── 6. lock survives a rejoin ──
const lockUntil = Date.now() + 600000;
await state.storage.put('gearlock:' + P('c'), lockUntil);
const wsC2 = fakeWs('c2');
await join(wsC2, P('c')); // fresh session, same identity
check('gear lock reloaded from storage on rejoin', room.playerState[P('c')]._gearLockUntil === lockUntil, room.playerState[P('c')]._gearLockUntil);

// ── 3b. expiry via tick = ignore ──
room.playerState[P('x')]._threatCdUntil = 0;
room.playerState[P('x')].level = 1;
await threat(wss.x, P('a'));
const key = P('x') + '>' + P('a');
room._threats.get(key).deadline = Date.now() - 1;
wss.x.sent.length = 0; wss.a.sent.length = 0;
room._tickThreats(Date.now());
check('expired threat grants the pair via the tick', room._pvpAllowed(P('x'), P('a'), 'town') === true && !room._threats.has(key));
check('threat_expired sent to both sides', msgsOfType(wss.x, 'threat_expired').length === 1 && msgsOfType(wss.a, 'threat_expired').length === 1);

// ── 7. forged privileged events denied ──
room.eventBuffer.length = 0;
await room.webSocketMessage(wss.x, JSON.stringify({ type: 'threat_penalty', payload: { levy: 99999 } }));
await room.webSocketMessage(wss.x, JSON.stringify({ type: 'gear_locked', payload: { until: 0 } }));
check('forged threat_penalty / gear_locked dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'threat_penalty' || e.type === 'gear_locked').length === 0, room.eventBuffer.map((e) => e.type));

// ── 8. v2.3.1211 threat bounty pool (item C): the guard fine escrows
// onto the threatener's head and pays their killer ──
{
  for (const n of ['grf', 'hunt', 'tgt']) {
    wss[n] = fakeWs(n);
    await join(wss[n], P(n));
    room.playerState[P(n)].coins = 1000;
  }
  const G = P('grf'), H = P('hunt'), TG = P('tgt');
  const guardFine = async () => { // grf threatens tgt, tgt calls guards
    room.playerState[G]._threatCdUntil = 0;
    await threat(wss.grf, TG);
    await respond(wss.tgt, G, 'guards');
  };

  await guardFine(); // 1000 -> fined 100
  let b = state._store.get('bounty:' + G);
  check('call guards escrows the fine into a bounty on the threatener',
    b && b.amount === 100 && room.playerState[G].coins === 900, { bounty: b, coins: room.playerState[G].coins });

  await guardFine(); // 900 -> fined 90, accumulates
  b = state._store.get('bounty:' + G);
  check('repeat guard-calls accumulate the same head\'s bounty', b && b.amount === 190, b);

  // non-PvP death (monster) pays nobody and keeps the bounty on the head
  await room._bountyOnDeath(G, 'monster:m1');
  check('a non-PvP death pays nobody + leaves the bounty', (state._store.get('bounty:' + G) || {}).amount === 190);

  // self-attributed cause can't claim
  await room._bountyOnDeath(G, 'pvp:' + G);
  check('a self kill cannot claim the bounty', !!state._store.get('bounty:' + G));

  // same-clan kill can't farm the pot (record persists)
  room._clans = room._clans || new Map();
  room._clanByPlayer = room._clanByPlayer || new Map();
  room._clans.set('cl1', { id: 'cl1' });
  room._clanByPlayer.set(G, 'cl1');
  room._clanByPlayer.set(H, 'cl1');
  const hStart = room.playerState[H].coins;
  await room._bountyOnDeath(G, 'pvp:' + H);
  check('a same-clan kill cannot farm the bounty (persists, no pay)',
    !!state._store.get('bounty:' + G) && room.playerState[H].coins === hStart, { bounty: state._store.get('bounty:' + G), h: room.playerState[H].coins });

  // consensual duel kill excluded (stub _duelFor to report an active duel)
  const _origDuelFor = room._duelFor;
  room._clanByPlayer.delete(H); // not clanmates now
  room._duelFor = (id) => (id === H ? { a: H, b: G } : null);
  await room._bountyOnDeath(G, 'pvp:' + H);
  check('a consensual duel kill does not claim the bounty',
    !!state._store.get('bounty:' + G) && room.playerState[H].coins === hStart, room.playerState[H].coins);
  room._duelFor = _origDuelFor;

  // legit non-clan open-world PvP kill: pays the killer + clears the record
  await room._bountyOnDeath(G, 'pvp:' + H);
  check('a legit PvP kill pays the killer the pooled bounty + clears it',
    room.playerState[H].coins === hStart + 190 && !state._store.get('bounty:' + G), { h: room.playerState[H].coins, bounty: state._store.get('bounty:' + G) });

  // a re-fired death can't double-pay (record gone; opId stamp also guards)
  await room._bountyOnDeath(G, 'pvp:' + H);
  check('a re-fired death cannot double-pay', room.playerState[H].coins === hStart + 190);

  // integration: the real _handlePlayerDeath choke point routes the payout
  await guardFine(); // fresh bounty (810 -> 81)
  const bInt = state._store.get('bounty:' + G).amount;
  const hBefore = room.playerState[H].coins;
  room.playerState[G].dying = false; room.playerState[G].dead = false;
  room._handlePlayerDeath(room.playerState[G], G, 'pvp:' + H);
  await new Promise((r) => setTimeout(r, 20)); // fire-and-forget hook
  check('_handlePlayerDeath routes a PvP kill to the bounty payout',
    room.playerState[H].coins === hBefore + bInt && !state._store.get('bounty:' + G), { h: room.playerState[H].coins, paid: bInt });

  // sweep: a fresh bounty survives; a stale one is deleted
  room.playerState[G].dying = false; room.playerState[G].dead = false; // died in the integration step above
  await guardFine(); // fresh bounty on G
  room._lastBountySweep = 0;
  await room._bountySweep();
  check('the sweep leaves a fresh bounty alone', !!state._store.get('bounty:' + G));
  const bs = state._store.get('bounty:' + G);
  bs.ts = Date.now() - THREAT.BOUNTY_STALE_MS - 1000;
  state._store.set('bounty:' + G, bs);
  room._lastBountySweep = 0;
  await room._bountySweep();
  check('the orphan sweep deletes a stale bounty', !state._store.get('bounty:' + G));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
