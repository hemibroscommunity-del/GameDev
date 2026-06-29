/* Protocol v2 integration test — runs the modified GameRoom with mocked
 * Durable Object state and two fake sessions (one v1, one v2) and checks:
 *   1. v2 join gets a full player_state; later emits are field deltas;
 *      no-change emits are skipped entirely.  v1 always gets full.
 *   2. tick monster deltas: v1 gets every monster in the dirty zone,
 *      v2 gets only the entities marked dirty.
 *   3. tick node deltas: same per-entity narrowing for v2.
 *   4. zone change: v2 gets one merged zone_state; v1 gets the legacy
 *      zone_monsters + zone_nodes + zone_loot trio.
 */
import { GameRoom } from '../src/index.js';

const mockState = {
  storage: {
    get: async () => undefined,
    put: async () => {},
    list: async () => new Map(),
    delete: async () => {},
  },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
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

const room = new GameRoom(mockState, mockEnv);

const ws1 = fakeWs('v1');
const ws2 = fakeWs('v2');
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
room.sessions.set(ws1, baseSession());
room.sessions.set(ws2, baseSession());

// Join far from any spawn so monster AI stays idle (no aggro / wander),
// keeping the dirty sets deterministic for the tick assertions.
const joinData = { x: -100000, y: -100000, z: 'meadow' };
await room.webSocketMessage(ws1, JSON.stringify({ type: 'join', id: 'p1', name: 'V1', data: { ...joinData } }));
await room.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'p2', name: 'V2', protocolVersion: 2, data: { ...joinData } }));

check('session p1 negotiated v1', room.sessions.get(ws1).protocolVersion === 1);
check('session p2 negotiated v2', room.sessions.get(ws2).protocolVersion === 2);

// ── 1. player_state deltas ──
const ps2first = msgsOfType(ws2, 'player_state');
check('v2 join player_state is full', ps2first.length >= 1 && Object.keys(ps2first[0].payload).length >= 20,
  ps2first.length && Object.keys(ps2first[0].payload).length);

const before2 = ws2.sent.length;
room._sendPlayerState(ws2, 'p2');
check('v2 no-change emit skipped', ws2.sent.length === before2);

const before1 = ws1.sent.length;
room._sendPlayerState(ws1, 'p1');
const ps1again = ws1.sent[ws1.sent.length - 1];
check('v1 repeat emit still full', ws1.sent.length === before1 + 1 && Object.keys(ps1again.payload).length >= 20);

room.playerState.p2.coins = 4242;
room._sendPlayerState(ws2, 'p2');
const ps2delta = ws2.sent[ws2.sent.length - 1];
check('v2 delta carries only changed field', ps2delta.type === 'player_state'
  && Object.keys(ps2delta.payload).length === 1 && ps2delta.payload.coins === 4242, ps2delta.payload);

// ── 2 + 3. tick entity deltas ──
// Drain the join-time spawn marks first (in production the tick loop is
// already running when a zone lazy-spawns, so these flush immediately).
room.startTickLoop();
await new Promise((r) => setTimeout(r, 80));
clearInterval(room.tickInterval); room.tickInterval = null;

// Damage one meadow monster, and force one meadow node into a due
// respawn so _tickNodes marks it dirty on the next tick.  Freeze the
// idle-wander AI first -- the real server keeps idle monsters genuinely
// roaming (they'd all be legitimately dirty), which would mask the
// per-entity narrowing this block asserts.
const meadowMonsters = room.monsters['meadow'];
for (const m of meadowMonsters) m._wanderPausedUntil = Date.now() + 60000;
const target = meadowMonsters[0];
await room.webSocketMessage(ws1, JSON.stringify({ type: 'monster_damage', payload: { monsterId: target.id, zone: 'meadow', dmg: 3 } }));
const meadowNodes = room._ensureZoneNodes('meadow');
meadowNodes[2].alive = false;
meadowNodes[2].respawnAt = Date.now() - 1;

ws1.sent.length = 0; ws2.sent.length = 0;
room.startTickLoop();
await new Promise((r) => setTimeout(r, 80));
clearInterval(room.tickInterval); room.tickInterval = null;

const tick1 = msgsOfType(ws1, 'tick').find((t) => t.monsters && t.monsters.meadow);
const tick2 = msgsOfType(ws2, 'tick').find((t) => t.monsters && t.monsters.meadow);
check('v1 tick carries full zone monster list', !!tick1 && tick1.monsters.meadow.length === meadowMonsters.length,
  tick1 && tick1.monsters.meadow.length);
check('v2 tick carries only the damaged monster', !!tick2 && tick2.monsters.meadow.length === 1
  && tick2.monsters.meadow[0].id === target.id, tick2 && tick2.monsters.meadow.map((m) => m.id));

const ntick1 = msgsOfType(ws1, 'tick').find((t) => t.nodes && t.nodes.meadow);
const ntick2 = msgsOfType(ws2, 'tick').find((t) => t.nodes && t.nodes.meadow);
check('v1 tick carries full zone node list', !!ntick1 && ntick1.nodes.meadow.length === meadowNodes.length,
  ntick1 && ntick1.nodes.meadow.length);
check('v2 tick carries only the respawned node', !!ntick2 && ntick2.nodes.meadow.length === 1
  && ntick2.nodes.meadow[0].id === meadowNodes[2].id, ntick2 && ntick2.nodes.meadow.map((n) => n.id));

// ── 3b. fishing node_strike: stance + window credit, and one-fish yield ──
// Regression for v2.3.846: the fishing reel seats the player ~67 px from the
// pond (> the old 60 px LOOT_PICKUP_RANGE gate) and the sustained gesture can
// take up to the client's 3500 ms window (> the old 1500 ms server window).
// Both bugs silently dropped the strike -> node consumed, no resource credited.
// v2.3.853: a fishSpot yields exactly ONE fish even on a 'perfect' reel
// (owner), so a perfect strike must credit the fish key by 1, not 2.
{
  const mNodes = room._ensureZoneNodes('meadow');
  const node = mNodes.find((n) => n.nodeType === 'fishSpot');
  check('meadow has a fishSpot to test', !!node);
  if (node) {
    node.alive = true; node.respawnAt = 0;
    const ps = room.playerState.p1;
    ps.z = 'meadow'; ps.dead = false; ps.disconnected = false;
    ps.x = node.x + 52; ps.y = node.y - 43;          // ~67 px stance (snap offset)
    const fishKey = room._harvestInvKey(node.nodeType, node.tierLvl);
    const before = (ps.inventory && ps.inventory[fishKey]) || 0;
    await room.webSocketMessage(ws1, JSON.stringify({ type: 'extraction_start', payload: { nodeId: node.id, zone: 'meadow', skill: 'fishing' } }));
    const ex = room.extractions.p1;
    // Land the strike at elapsed = openDelayBase + 3000 ms: inside the 3500 ms
    // window (credit) but past the old 1500 ms one (would coerce to 'miss').
    if (ex) ex.startedAt = Date.now() - (ex.openDelayBase + 3000);
    // Claim 'perfect' -- the yield cap must hold it to one fish anyway.
    await room.webSocketMessage(ws1, JSON.stringify({ type: 'node_strike', payload: { id: node.id, zone: 'meadow', accuracy: 'perfect' } }));
    const after = (ps.inventory && ps.inventory[fishKey]) || 0;
    check('fishing perfect strike credits exactly one fish (stance+window OK)', after - before === 1,
      { fishKey, before, after });
  }
}

// ── 4. merged zone_state on zone change ──
ws1.sent.length = 0; ws2.sent.length = 0;
await room.webSocketMessage(ws1, JSON.stringify({ type: 'move', x: 1, y: 1, z: 'frost' }));
await room.webSocketMessage(ws2, JSON.stringify({ type: 'move', x: 1, y: 1, z: 'frost' }));

check('v1 zone change sends legacy trio', msgsOfType(ws1, 'zone_monsters').length === 1
  && msgsOfType(ws1, 'zone_nodes').length === 1 && msgsOfType(ws1, 'zone_loot').length === 1
  && msgsOfType(ws1, 'zone_state').length === 0);
const zs = msgsOfType(ws2, 'zone_state');
check('v2 zone change sends one zone_state', zs.length === 1 && msgsOfType(ws2, 'zone_monsters').length === 0
  && msgsOfType(ws2, 'zone_nodes').length === 0 && msgsOfType(ws2, 'zone_loot').length === 0);
check('zone_state carries all three lists', zs.length === 1 && zs[0].zone === 'frost'
  && Array.isArray(zs[0].monsters) && zs[0].monsters.length > 0
  && Array.isArray(zs[0].nodes) && zs[0].nodes.length > 0
  && Array.isArray(zs[0].loot));

// Owner directive: ALL monsters are level 1 (zone level bands set to [1,1]).
// Guards that the spawn lerp produces level 1 everywhere and nothing scales it.
const frostLevels = zs[0].monsters.map((m) => m.level);
check('all monsters spawn at level 1',
  frostLevels.length > 0 && frostLevels.every((l) => l === 1),
  frostLevels);

// Safe-zone change: v2 should get one zone_state with empty lists.
ws2.sent.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'move', x: 1, y: 1, z: 'town' }));
const zsTown = msgsOfType(ws2, 'zone_state');
check('v2 safe-zone change sends empty zone_state', zsTown.length === 1 && zsTown[0].zone === 'town'
  && zsTown[0].monsters.length === 0 && zsTown[0].nodes.length === 0 && zsTown[0].loot.length === 0);

// ── v2.3.910: combat level is the SUM of the five build-skill levels, and
// maxHp uses the retuned flat 2.5/combat-level term ──
{
  const ps = room.playerState.p2;
  ps.armor = null;
  ps.power = 10; ps.vitality = 8; ps.endurance = 0; ps.agility = 4; ps.mind = 3; // sum 25
  room._recomputeMaxes(ps);
  check('v2.3.910 combat level = sum of build-skill stats', ps.level === 25, ps.level);
  // floor(100 + (25-1)*2.5 + 8*10) = 100 + 60 + 80 = 240
  check('v2.3.910 maxHp uses flat 2.5/level term', ps.maxHp === 240, ps.maxHp);
  check('v2.3.910 _calcMaxHp(100,0) == 347', room._calcMaxHp(100, 0) === 347, room._calcMaxHp(100, 0));
  // Over-cap stat sum clamps combat level to 500.
  ps.power = 600; ps.vitality = 0; ps.agility = 0; ps.mind = 0; ps.endurance = 0;
  room._recomputeMaxes(ps);
  check('v2.3.910 combat level clamps at 500', ps.level === 500, ps.level);
}

// ── v2.3.912: weapon build CHANNELS reach the authoritative damage roll ──
{
  const ps = room.playerState.p2;
  ps.weapon = { type: 'sword', tierMult: 1 };
  ps.rangedWeapon = null; ps.staffWeapon = null;
  ps.power = 0;
  ps.weaponSpecs = {};
  const capNoSpec = room._maxWeaponDmg(ps, false);            // 6.67 + 0 + 0
  ps.weaponSpecs = { sword: { edge: 10, precision: 20 } };
  check('v2.3.912 _wpnDmgChannel reads edge points (perPt 1.0)', room._wpnDmgChannel(ps, 'sword') === 10, room._wpnDmgChannel(ps, 'sword'));
  check('v2.3.912 _wpnCritPts reads precision points', room._wpnCritPts(ps, 'sword') === 20, room._wpnCritPts(ps, 'sword'));
  check('v2.3.912 greatsword shares the sword/melee category', room._wpnCat('greatsword') === 'sword', room._wpnCat('greatsword'));
  const capWithSpec = room._maxWeaponDmg(ps, false);          // +10 from edge
  check('v2.3.912 damage channel raises the weapon damage cap by +10',
    Math.abs((capWithSpec - capNoSpec) - 10) < 0.001, [capNoSpec, capWithSpec]);
  // Specials ignore the damage channel (mirror client calcSpecialDmg).
  ps.mind = 0;
  check('v2.3.912 specials are channel-free',
    Math.abs(room._maxWeaponDmg(ps, true) - capNoSpec) < 0.001, room._maxWeaponDmg(ps, true));
}

// ── v2.3.1021: weapon/defense SKILL-TRACK persistence (level/xp/points/specs) ──
// Previously these lived only in the browser; now the worker stores + echoes
// them so they survive reconnect.  Assert: stats_update accepts + clamps,
// player_state echoes, _saveRpg persists.
{
  const ps = room.playerState.p2;
  room._handleStatsUpdate(room.sessions.get(ws2), {
    weaponSkills: { sword: { level: 7, xp: 123 }, bow: { level: 999, xp: -5 } },
    weaponUnspent: { sword: 3, bow: 99999 },
    defenseSkill: { level: 4, xp: 12 },
    defenseUnspent: 2,
    defenseSpec: { bulwark: 5, ironskin: 9999, bogus: 7 },
  });
  check('stats_update stores weaponSkills (level clamped [0,99], xp floored at 0)',
    ps.weaponSkills.sword.level === 7 && ps.weaponSkills.sword.xp === 123
    && ps.weaponSkills.bow.level === 99 && ps.weaponSkills.bow.xp === 0, ps.weaponSkills);
  check('stats_update clamps weaponUnspent to [0,999]',
    ps.weaponUnspent.sword === 3 && ps.weaponUnspent.bow === 999, ps.weaponUnspent);
  check('stats_update stores defenseSkill, clamps defenseSpec [0,50], drops unknown keys',
    ps.defenseSkill.level === 4 && ps.defenseSpec.bulwark === 5
    && ps.defenseSpec.ironskin === 50 && ps.defenseSpec.bogus === undefined,
    { defenseSkill: ps.defenseSkill, defenseSpec: ps.defenseSpec });

  // player_state echoes the track (unregistered ws => full, non-delta payload).
  const ws3 = fakeWs('echo');
  room._sendPlayerState(ws3, 'p2');
  const echo = msgsOfType(ws3, 'player_state').pop();
  check('player_state echoes weapon/defense skill track',
    echo && echo.payload.weaponSkills && echo.payload.weaponSkills.sword.level === 7
    && echo.payload.weaponUnspent.sword === 3 && echo.payload.defenseSkill.level === 4
    && echo.payload.defenseUnspent === 2 && echo.payload.defenseSpec.bulwark === 5,
    echo && Object.keys(echo.payload));

  // _saveRpg persists the track (capture the storage.put bundle).
  let saved = null;
  const origPut = room.state.storage.put;
  room.state.storage.put = async (k, v) => { if (k === 'rpg:p2') saved = v; };
  await room._saveRpg('p2', ps);
  room.state.storage.put = origPut;
  check('_saveRpg persists the weapon/defense skill track',
    saved && saved.weaponSkills && saved.weaponSkills.sword.level === 7
    && saved.weaponUnspent.sword === 3 && saved.defenseSkill.level === 4
    && saved.defenseUnspent === 2 && saved.defenseSpec.bulwark === 5, saved && Object.keys(saved));
}

// ── v2.3.1092: harvest-activity (ex) relay ──
// A stationary gatherer broadcasts an `ex` code on its move; the server stores
// it and relays it in the tick `players` delta so peers can render the
// activity.  Same store path covers v1 + v2 (one shared players object).
{
  // Same-position move (no teleport -> accepted) carrying ex='chop'.
  const p1 = room.playerState.p1;
  await room.webSocketMessage(ws1, JSON.stringify({ type: 'move', x: p1.x, y: p1.y, z: 'meadow', ex: 'chop' }));
  check('move stores harvest activity on playerState', room.playerState.p1.ex === 'chop', room.playerState.p1.ex);

  ws1.sent.length = 0; ws2.sent.length = 0;
  room.startTickLoop();
  await new Promise((r) => setTimeout(r, 80));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const exTick1 = msgsOfType(ws1, 'tick').find((t) => t.players && t.players.p1);
  const exTick2 = msgsOfType(ws2, 'tick').find((t) => t.players && t.players.p1);
  check('v1 tick relays harvest activity', !!exTick1 && exTick1.players.p1.ex === 'chop',
    exTick1 && exTick1.players.p1 && exTick1.players.p1.ex);
  check('v2 tick relays harvest activity', !!exTick2 && exTick2.players.p1.ex === 'chop',
    exTick2 && exTick2.players.p1 && exTick2.players.p1.ex);

  // Clearing it (ex:null) relays the cleared value so peers stop the stand-in.
  await room.webSocketMessage(ws1, JSON.stringify({ type: 'move', x: p1.x, y: p1.y, z: 'meadow', ex: null }));
  check('move clears harvest activity', room.playerState.p1.ex === null, room.playerState.p1.ex);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
