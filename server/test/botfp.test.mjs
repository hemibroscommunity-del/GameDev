/* Behavioral anti-bot test (v2.3.1146, docs/specs/anticheat-botfp.md).
 * Pins the FLAG-ONLY posture: behavioral signals count + score + flag,
 * and NEVER change grants; the only clamps are the forged-'perfect'
 * entropy cap and the §6 hourly caps.  Checks:
 *   1.  ent floor caps a claimed 'perfect' to 'ok' (forgery guard).
 *   2.  2-of-3 synthetic floors score and flag at threshold; a single
 *       tripped floor (the real-iPhone tv≈0 case) scores ZERO.
 *   3.  Replay-hash reuse counts; distinct hashes don't.
 *   4.  Variance collapse over 48+ near-identical gestures flags;
 *       naturally-varied gestures don't.
 *   5.  Old client (no fp): full grants, zero score (permissive pin).
 *   6.  Device fleet: 4 identities on one nonce, 3 harvesting heavily
 *       -> flag, and grants unchanged (flag-only pin).
 *   7.  Hourly cap: 271st harvest depletes the node but grants nothing;
 *       hour rollover restores grants.
 *   8.  Cook: fp accepted; tapless 'cooked' counted; over-cap cook
 *       drops WITHOUT consuming the fish.
 *   9.  Storage round-trip: close flushes botstat:; rejoin re-hydrates
 *       the hour window + replay ring (reconnect-cycling pin).
 *   10. /api/botstat is 404 without a configured+presented ADMIN_KEY.
 *   11. state_sync advertises caps.botfp. */
import { GameRoom } from '../src/index.js';
/* v2.3.1983: read the cap instead of hardcoding it — population-scaled
   node counts moved it (270 -> 810) and this suite is about the CLAMP
   behaviour, not the number. */
import { BOTFP } from '../src/botfp.js';

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
  ADMIN_KEY: 'test-admin-key',
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
async function join(ws, id, device) {
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town' } };
  if (device) msg.device = device;
  await room.webSocketMessage(ws, JSON.stringify(msg));
}
const send = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));

// A convincingly human fingerprint (varies per call).
let seq = 0;
const humanFp = () => {
  seq++;
  return { len: 780 + (seq % 13) * 9, n: 88 + (seq % 7), dur: 1450 + (seq % 11) * 23,
           ent: 0.11 + (seq % 9) * 0.017, tv: 35 + (seq % 6) * 8, vc: 0.24 + (seq % 5) * 0.04,
           h: 'h-' + seq };
};

// One valid in-window strike (extraction handshake + backdated window).
async function strike(ws, id, node, fp, accuracy = 'good') {
  node.alive = true; node.respawnAt = 0;
  const skill = room._harvestSkillName(node.nodeType);
  await send(ws, 'extraction_start', { nodeId: node.id, zone: 'meadow', skill });
  const ex = room.extractions[id];
  if (ex) ex.startedAt = Date.now() - ex.openDelayBase - 500;
  const payload = { id: node.id, zone: 'meadow', accuracy };
  if (fp) payload.swipeFp = fp;
  await send(ws, 'node_strike', payload);
}

const ws1 = fakeWs('a');
await join(ws1, 'bp_bot_a', { id: 'devnonce1', env: 'envhash1' });
const ps1 = room.playerState.bp_bot_a;
ps1.z = 'meadow';
const nodes = room._ensureZoneNodes('meadow');
const n0 = nodes[0];
ps1.x = n0.x; ps1.y = n0.y;
/* v2.3.1680: gathering is TOOL-GATED (owner: extraction hidden behind a Mayor
   Bro quest that hands over the equipment).  Every player in this suite
   harvests, and this suite is about BOT FINGERPRINTING, not the tool gate — so
   each bag starts stocked.  Left empty, every strike below would be refused
   before the fingerprint code ran, and the counters would read zero: the
   assertions would fail loudly here, but a laxer assertion elsewhere could
   just as easily have passed for the wrong reason. */
ps1.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 }; ps1.lifeSkills = {};
const skillName = room._harvestSkillName(n0.nodeType);
const invKey = room._harvestInvKey(n0.nodeType, n0.tierLvl);

// ── 11. caps advertisement ──
{
  const sync = msgsOfType(ws1, 'state_sync')[0];
  const caps = sync && (sync.caps || (sync.payload && sync.payload.caps));
  check('caps: state_sync advertises botfp', !!(caps && caps.botfp === true), caps);
}

// ── 1. entropy floor caps a forged 'perfect' ──
{
  const fp = humanFp();
  fp.ent = 0.01;                       // under the client's own perfect gate
  await strike(ws1, 'bp_bot_a', n0, fp, 'perfect');
  const rec = room._botfp.get('bp_bot_a');
  check('entFloor: forged perfect capped (counter bumped)', rec.counters.entFloorHits === 1, rec.counters);
  // yield 1 = the 'ok' multiplier, not the doubled perfect yield
  check('entFloor: yield granted at ok rate, not perfect', (ps1.inventory[invKey] || 0) === 1, ps1.inventory);
  check('entFloor: single floor scores nothing (tv/vc human)', rec.counters.syntheticStrikes === 0 && rec.score < 0.01,
    { synth: rec.counters.syntheticStrikes, score: rec.score });
}

// ── 3. replay ring ──
{
  const fp = humanFp();
  fp.h = 'replay-me';
  await strike(ws1, 'bp_bot_a', n0, fp);
  const fp2 = humanFp();
  fp2.h = 'replay-me';
  await strike(ws1, 'bp_bot_a', n0, fp2);
  const rec = room._botfp.get('bp_bot_a');
  check('replay: identical path hash counted once', rec.counters.replayHits === 1, rec.counters);
}

// ── 2. synthetic 2-of-3 floors score + flag; grants continue (flag-only) ──
{
  const ws2 = fakeWs('b');
  await join(ws2, 'bp_bot_b', { id: 'devnonce2', env: 'envhash1' });
  const ps2 = room.playerState.bp_bot_b;
  ps2.z = 'meadow'; ps2.x = n0.x; ps2.y = n0.y; ps2.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  for (let i = 0; i < 6; i++) {
    await strike(ws2, 'bp_bot_b', n0, { len: 400, n: 40, dur: 900, ent: 0.01, tv: 0, vc: 0.004, h: 'sb-' + i });
  }
  const rec = room._botfp.get('bp_bot_b');
  check('synthetic: 6 two-floor strikes counted + scored past threshold',
    rec.counters.syntheticStrikes === 6 && rec.score >= 10, { synth: rec.counters.syntheticStrikes, score: rec.score });
  check('synthetic: shadow flag written', rec.flags.length >= 1 && rec.flags[0].kind === 'suspicion-threshold', rec.flags);
  check('synthetic: grants NEVER withheld by behavior (flag-only pin)',
    (ps2.inventory[invKey] || 0) === 6, ps2.inventory);
  // single-floor control: fresh identity, only tv trips (the real-iPhone case)
  const ws3 = fakeWs('c');
  await join(ws3, 'bp_bot_c');
  const ps3 = room.playerState.bp_bot_c;
  ps3.z = 'meadow'; ps3.x = n0.x; ps3.y = n0.y; ps3.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  for (let i = 0; i < 5; i++) {
    const fp = humanFp();
    fp.tv = 0;                          // frame-locked iPhone timing
    await strike(ws3, 'bp_bot_c', n0, fp);
  }
  const rec3 = room._botfp.get('bp_bot_c');
  check('synthetic: single tripped floor scores ZERO (iPhone tv pin)',
    rec3.counters.syntheticStrikes === 0 && rec3.score < 0.01, { synth: rec3.counters.syntheticStrikes, score: rec3.score });
}

// ── 4. variance collapse ──
{
  const wsD = fakeWs('d');
  await join(wsD, 'bp_bot_d');
  const psD = room.playerState.bp_bot_d;
  psD.z = 'meadow'; psD.x = n0.x; psD.y = n0.y; psD.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  for (let i = 0; i < 50; i++) {
    // human-VALUED but machine-CONSTANT: no floor trips, variance ≈ 0
    await strike(wsD, 'bp_bot_d', n0, { len: 800, n: 90, dur: 1500, ent: 0.15, tv: 42, vc: 0.3, h: 'd-' + i });
  }
  const recD = room._botfp.get('bp_bot_d');
  check('collapse: 50 identical gestures flag variance-collapse',
    recD.flags.some((f) => f.kind === 'variance-collapse'), recD.flags.map((f) => f.kind));
  const wsE = fakeWs('e');
  await join(wsE, 'bp_bot_e');
  const psE = room.playerState.bp_bot_e;
  psE.z = 'meadow'; psE.x = n0.x; psE.y = n0.y; psE.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  for (let i = 0; i < 50; i++) {
    await strike(wsE, 'bp_bot_e', n0, humanFp());
  }
  const recE = room._botfp.get('bp_bot_e');
  check('collapse: naturally varied gestures never flag',
    !recE.flags.some((f) => f.kind === 'variance-collapse') && recE.counters.syntheticStrikes === 0,
    recE.flags.map((f) => f.kind));
}

// ── 5. old client: no fp, full grants, zero score ──
{
  const wsF = fakeWs('f');
  await join(wsF, 'bp_bot_f');
  const psF = room.playerState.bp_bot_f;
  psF.z = 'meadow'; psF.x = n0.x; psF.y = n0.y; psF.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  for (let i = 0; i < 20; i++) await strike(wsF, 'bp_bot_f', n0, null);
  const recF = room._botfp.get('bp_bot_f');
  check('legacy: 20 fp-less strikes fully granted, counted, unscored',
    (psF.inventory[invKey] || 0) === 20 && recF.counters.noFpStrikes === 20 && recF.score < 0.01,
    { inv: psF.inventory[invKey], noFp: recF.counters.noFpStrikes, score: recF.score });
}

// ── 6. device fleet ──
{
  const fleet = [];
  for (let i = 0; i < 4; i++) {
    const w = fakeWs('fl' + i);
    await join(w, 'bp_fleet_' + i, { id: 'shareddev', env: 'envhash9' });
    fleet.push(w);
  }
  const devStored = state._store.get('device:shareddev');
  check('fleet: device record holds all 4 identities',
    !!devStored && devStored.ids.length === 4, devStored && devStored.ids);
  // 3 of the 4 harvested heavily this hour
  for (let i = 0; i < 3; i++) {
    const rec = room._botfpRecord('bp_fleet_' + i, Date.now());
    rec.hour.bySkill.fishing = 35;
  }
  // trip the eval on fleet_0's next strike
  const rec0 = room._botfpRecord('bp_fleet_0', Date.now());
  rec0.strikeCount = 24;
  const psF0 = room.playerState.bp_fleet_0;
  psF0.z = 'meadow'; psF0.x = n0.x; psF0.y = n0.y; psF0.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  await strike(fleet[0], 'bp_fleet_0', n0, humanFp());
  check('fleet: many-identities-one-device flag written',
    rec0.flags.some((f) => f.kind === 'device-fleet'), rec0.flags.map((f) => f.kind));
  check('fleet: flag-only — the strike still granted',
    (psF0.inventory[invKey] || 0) === 1, psF0.inventory);
}

// ── 7. hourly cap ──
{
  const wsG = fakeWs('g');
  await join(wsG, 'bp_bot_g');
  const psG = room.playerState.bp_bot_g;
  psG.z = 'meadow'; psG.x = n0.x; psG.y = n0.y; psG.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  const recG = room._botfpRecord('bp_bot_g', Date.now());
  recG.hour.bySkill[skillName] = BOTFP.HARVEST_HOUR_CAP;
  await strike(wsG, 'bp_bot_g', n0, humanFp());
  check('hourcap: the over-cap harvest depletes the node but grants nothing',
    n0.alive === false && (psG.inventory[invKey] || 0) === 0 && recG.counters.capClamps === 1,
    { inv: psG.inventory, clamps: recG.counters.capClamps });
  recG.hour.hourStart = Date.now() - 3700000;   // lazy rollover
  await strike(wsG, 'bp_bot_g', n0, humanFp());
  check('hourcap: grants resume after the hour rolls over',
    (psG.inventory[invKey] || 0) === 1, psG.inventory);
}

// ── 8. cooking ──
{
  const wsH = fakeWs('h');
  await join(wsH, 'bp_bot_h');
  const psH = room.playerState.bp_bot_h;
  psH.inventory = { fish_minnow: 5 };
  await send(wsH, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked', taps: [], swipeFp: humanFp() });
  check('cook: fp-carrying cook accepted (fish consumed, cooked minted)',
    psH.inventory.fish_minnow === 4 && psH.inventory.cooked_fish_minnow === 1, psH.inventory);
  await send(wsH, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked', taps: [] });
  const recH = room._botfp.get('bp_bot_h');
  check('cook: tapless cooked counted for burn-in review', recH.counters.taplessCooks === 1, recH.counters);
  recH.hour.bySkill.cooking = 700;
  const fishBefore = psH.inventory.fish_minnow;
  await send(wsH, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked', taps: [], swipeFp: humanFp() });
  check('cook: over-cap cook dropped WITHOUT consuming the fish',
    psH.inventory.fish_minnow === fishBefore && recH.counters.capClamps === 1,
    { fish: psH.inventory.fish_minnow, clamps: recH.counters.capClamps });
}

// ── 9. storage round-trip (reconnect-cycling pin) ──
{
  const recB = room._botfp.get('bp_bot_b');
  recB.hour.bySkill[skillName] = 200;   // meaningful state to survive
  await room.webSocketClose(ws1 && [...room.sessions.keys()].find((w) => room.sessions.get(w).id === 'bp_bot_b'));
  const stored = state._store.get('botstat:bp_bot_b');
  check('storage: close flushed botstat with counters + flags',
    !!stored && stored.counters.syntheticStrikes === 6 && stored.flags.length >= 1, stored && stored.counters);
  // simulate deploy wipe: clear the live map, rejoin, expect hydration
  room._botfp.delete('bp_bot_b');
  const wsB2 = fakeWs('b2');
  await join(wsB2, 'bp_bot_b', { id: 'devnonce2', env: 'envhash1' });
  const recB2 = room._botfp.get('bp_bot_b');
  check('storage: rejoin hydrates hour window + replay ring + counters',
    recB2.hour.bySkill[skillName] === 200 && recB2.hRing.length > 0 && recB2.counters.syntheticStrikes === 6,
    { hour: recB2.hour.bySkill, hRing: recB2.hRing.length });
}

// ── 10. admin surface auth ──
{
  const mk = (headers) => new Request('http://x/api/botstat?id=bp_bot_b', { headers });
  const r1 = await room._botfpAdminFetch(mk({}));
  const r2 = await room._botfpAdminFetch(mk({ 'x-admin-key': 'wrong' }));
  const r3 = await room._botfpAdminFetch(mk({ 'x-admin-key': 'test-admin-key' }));
  const roomNoKey = new GameRoom(makeState(), { LEADERBOARD: mockEnv.LEADERBOARD });
  const r4 = await roomNoKey._botfpAdminFetch(mk({ 'x-admin-key': 'test-admin-key' }));
  const body = await r3.json();
  check('admin: no key -> 404', r1.status === 404);
  check('admin: wrong key -> 404', r2.status === 404);
  check('admin: unconfigured ADMIN_KEY -> 404 even with a key', r4.status === 404);
  check('admin: correct key -> evidence JSON', r3.status === 200 && body.id === 'bp_bot_b' && !!body.botstat, body);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
