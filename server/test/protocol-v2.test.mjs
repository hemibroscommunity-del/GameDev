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
import { ZONES } from '../src/data.js';

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
// v2.3.1110: spread the monsters out -- the tick's new pairwise
// separation pass (22 px min) would dirty any randomly-overlapping
// spawn pair and break the per-entity narrowing assertions below.
// Same spirit as the wander freeze above: deterministic dirty sets.
meadowMonsters.forEach((m, i) => {
  m.x = 200 + i * 100; m.y = 200;
  m.spawnX = m.x; m.spawnY = m.y; // keep inside the wander leash: the
  // leash pull-back (WANDER_LEASH) ignores the pause and would walk a
  // displaced monster home, dirtying it.
});
const target = meadowMonsters[0];
/* v2.3.1628: _handleMonsterDamage now enforces the attacker gates every
   sibling handler already had (same zone, alive, in range -- the melee
   clamp is the 250 px the client itself calls "the server's clamp" in
   monsterCombat.js).  This suite joins at (-100000,-100000) ON PURPOSE,
   to keep monster AI idle so the dirty sets stay deterministic, so the
   attack is legitimately 100k px out of range.  Stand p1 on the target
   for the swing and put it straight back -- the delta assertions below
   are about protocol-v2 narrowing, not about combat range, and the
   idle-AI determinism the far spawn buys must survive. */
const _p1 = room.playerState.p1;
const _p1Home = { x: _p1.x, y: _p1.y };
_p1.x = target.x; _p1.y = target.y;
await room.webSocketMessage(ws1, JSON.stringify({ type: 'monster_damage', payload: { monsterId: target.id, zone: 'meadow', dmg: 3 } }));
_p1.x = _p1Home.x; _p1.y = _p1Home.y;
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

    /* v2.3.1680: gathering is TOOL-GATED now (owner: extraction hidden behind
       a Mayor Bro quest that hands over the equipment).  Prove the gate first
       — an unarmed strike must credit nothing — then hand over the pole and
       let the original stance/window regression assertion run.  Without the
       pole this whole section silently passed as "no fish credited", which is
       the right behaviour for the wrong reason. */
    if (!ps.inventory) ps.inventory = {};
    delete ps.inventory.fishing_pole;
    const noToolBefore = ps.inventory[fishKey] || 0;
    await room.webSocketMessage(ws1, JSON.stringify({ type: 'extraction_start', payload: { nodeId: node.id, zone: 'meadow', skill: 'fishing' } }));
    await room.webSocketMessage(ws1, JSON.stringify({ type: 'node_strike', payload: { id: node.id, zone: 'meadow', accuracy: 'perfect' } }));
    check('fishing without a pole credits NOTHING (tool gate)',
      ((ps.inventory && ps.inventory[fishKey]) || 0) === noToolBefore,
      { fishKey, before: noToolBefore, after: ps.inventory && ps.inventory[fishKey] });
    check('...and the node survives the refused attempt', node.alive === true, node.alive);

    ps.inventory.fishing_pole = 1;
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

// v2.3.1140: zone bands UNPINNED (BF-1 fixed; BALANCE-PLAN §10 phase 6).
// The old [1,1] pin -- and this test's "everything is level 1" guard --
// existed only because mid-band kill times failed the sim gates.  Now
// guards the real contract: the depth lerp keeps every spawn inside the
// zone's declared band (frost is [8,25] per docs/MAP-REDESIGN.md).
const frostBand = ZONES.frost.level;
const frostLevels = zs[0].monsters.map((m) => m.level);
check('monsters spawn within the zone level band',
  frostLevels.length > 0 && frostLevels.every((l) => l >= frostBand[0] && l <= frostBand[1]),
  { frostLevels, frostBand });

// Safe-zone change: v2 should get one zone_state with empty lists.
ws2.sent.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'move', x: 1, y: 1, z: 'town' }));
const zsTown = msgsOfType(ws2, 'zone_state');
check('v2 safe-zone change sends empty zone_state', zsTown.length === 1 && zsTown[0].zone === 'town'
  && zsTown[0].monsters.length === 0 && zsTown[0].nodes.length === 0 && zsTown[0].loot.length === 0);

// ── v2.3.1342: combat level = total T2 points PLACED (cap 1000), and
// maxHp keeps the flat 2.5/combat-level term (owner directive
// 2026-07-16: every point spent = +1 level = a felt power gain) ──
{
  const ps = room.playerState.p2;
  /* v2.3.1659 (prog3): this block and the ones below pin the LEGACY
     level/damage-channel math — still live for any blob whose v10
     migration fail-opens — so the fixture opts out of the respec.
     prog3.test.mjs covers the new path. */
  delete ps.prog3;
  ps.armor = null;
  ps.power = 10; ps.vitality = 8; ps.endurance = 0; ps.agility = 4; ps.mind = 3;
  // 25 points placed across three grids -> level 25 (stat levels no
  // longer count; only allocation does).
  ps.weaponSpecs = { sword: { edge: 10, tempo: 5 } };
  ps.defenseSpec = { ironskin: 6 };
  ps.hpSpec = { recovery: 4 }; // NOT vigor — it would multiply the maxHp assert below
  room._recomputeMaxes(ps);
  check('v2.3.1342 combat level = 1 + T2 points placed', ps.level === 26, ps.level);
  // floor(100 + (26-1)*2.5 + 8*10) = floor(242.5) = 242 (level 26 = 1 + 25 placed)
  check('v2.3.910 maxHp uses flat 2.5/level term', ps.maxHp === 242, ps.maxHp);
  check('v2.3.910 _calcMaxHp(100,0) == 347', room._calcMaxHp(100, 0) === 347, room._calcMaxHp(100, 0));
  // Stat levels alone no longer move the level; a maxed 30-channel
  // build (per-channel clamp 100) lands exactly at the 1000 cap.
  ps.power = 600;
  room._recomputeMaxes(ps);
  check('v2.3.1342 stat levels do not raise level', ps.level === 26, ps.level);
  ps.weaponSpecs = {
    sword: { edge: 999, precision: 100, executioner: 100, tempo: 100, cleave: 100 },
    bow:   { drawPower: 100, marksmanship: 100, headshot: 100, piercing: 100, longshot: 100 },
    staff: { spellPower: 100, overload: 100, detonation: 100, attunement: 100, focus: 100 },
  };
  ps.defenseSpec = { bulwark: 100, ironskin: 100, thorns: 100, secondwind: 100, poise: 100 };
  ps.hpSpec = { vigor: 100, recovery: 100, lifeblood: 100, resilience: 100, laststand: 100 };
  ps.enduranceSpec = { stamina: 100, conditioning: 100, swiftness: 100, evasion: 100, reflexes: 100 };
  room._recomputeMaxes(ps);
  check('v2.3.1342 combat level caps at 1000 (30 channels x 100, over-cap channel clamped)', ps.level === 1000, ps.level);
  // restore the small build for the tests below
  ps.weaponSpecs = {}; ps.defenseSpec = {}; ps.hpSpec = {}; ps.enduranceSpec = {};
  ps.power = 10;
  room._recomputeMaxes(ps);
}

// ── v2.3.912: weapon build CHANNELS reach the authoritative damage roll ──
{
  const ps = room.playerState.p2;
  ps.weapon = { type: 'sword', tierMult: 1 };
  ps.rangedWeapon = null; ps.staffWeapon = null;
  ps.power = 0;
  ps.weaponSpecs = {};
  ps.weaponSpecs = { sword: { edge: 10, precision: 20 } };
  check('v2.3.912 _wpnDmgChannel reads edge points (raw pts since the v2.3.1153 reprice)', room._wpnDmgChannel(ps, 'sword') === 10, room._wpnDmgChannel(ps, 'sword'));
  check('v2.3.912 _wpnCritPts reads precision points', room._wpnCritPts(ps, 'sword') === 20, room._wpnCritPts(ps, 'sword'));
  check('v2.3.912 greatsword shares the sword/melee category', room._wpnCat('greatsword') === 'sword', room._wpnCat('greatsword'));
  // v2.3.1451 (bench-locked): the cap reads the attacker's ACTUAL
  // banked damage flat (server-owned ps.t2Flat) — the exact number
  // _computeAttackDamage adds, so roll and ceiling are lockstep by
  // construction (replaces the v2.3.1345 "assume maxed t2Accel"
  // posture; safe to tighten because the client never supplies the
  // accumulator).
  ps.t2Flat = { sword: { edge: 460 } };
  const capNormal = room._maxWeaponDmg(ps, false);
  check('v2.3.1451 normal-swing cap adds the banked damage flat',
    Math.abs(capNormal - (6.67 + 460)) < 0.001, capNormal);
  ps.weaponSpecs = {};
  check('v2.3.1451 cap is point-count independent (the banked flat is the source)',
    Math.abs(room._maxWeaponDmg(ps, false) - capNormal) < 0.001, room._maxWeaponDmg(ps, false));
  ps.weaponSpecs = { sword: { edge: 10, precision: 20 } };
  // Specials ignore the damage channel (mirror client calcSpecialDmg).
  ps.mind = 0;
  check('v2.3.912 specials are channel-free',
    Math.abs(room._maxWeaponDmg(ps, true) - 6.67) < 0.001, room._maxWeaponDmg(ps, true));
  delete ps.t2Flat; // don't leak the fixture into later blocks

  // v2.3.1133: crit-DMG channel keys resolve per category, and the
  // stats_update clamp holds them to [0,99] like every other channel.
  ps.weaponSpecs = { sword: { executioner: 40 }, bow: { headshot: 7 }, staff: { focus: 3 } };
  check('v2.3.1133 _wpnCritDmgPts resolves executioner/headshot/focus',
    room._wpnCritDmgPts(ps, 'greatsword') === 40 && room._wpnCritDmgPts(ps, 'bow') === 7
    && room._wpnCritDmgPts(ps, 'staff') === 3, ps.weaponSpecs);
  room._handleStatsUpdate(room.sessions.get(ws2), { weaponSpecs: { sword: { executioner: 150 } } });
  check('v2.3.1133 stats_update clamps executioner 150 -> 100 (v2.3.1156 uniform cap)',
    ps.weaponSpecs.sword.executioner === 100, ps.weaponSpecs.sword);
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
  check('stats_update stores weaponSkills (level clamped [0,100] per v2.3.1156, xp floored at 0)',
    ps.weaponSkills.sword.level === 7 && ps.weaponSkills.sword.xp === 123
    && ps.weaponSkills.bow.level === 100 && ps.weaponSkills.bow.xp === 0, ps.weaponSkills);
  // v2.3.1158: pools are DERIVED — when skill/spec fields arrive the
  // handler recomputes canonical earned-minus-spent, so the forged
  // bow: 99999 lands at 2×100 − 7 spent (headshot, set above) = 193
  // and sword at max(0, 2×7 − 100 executioner spent) = 0.  The old
  // [0,999] verbatim clamp only survives pool-only payloads.
  check('stats_update derives weaponUnspent canonically (forged pool overridden)',
    ps.weaponUnspent.sword === 0 && ps.weaponUnspent.bow === 193 && ps.weaponUnspent.staff === 0,
    ps.weaponUnspent);
  check('stats_update stores defenseSkill, clamps defenseSpec to the uniform [0,100], drops unknown keys',
    ps.defenseSkill.level === 4 && ps.defenseSpec.bulwark === 5
    && ps.defenseSpec.ironskin === 100 && ps.defenseSpec.bogus === undefined,
    { defenseSkill: ps.defenseSkill, defenseSpec: ps.defenseSpec });

  // v2.3.1138 asserted defenseSkill.level ADDED to combat level (25+4=29).
  // v2.3.1342 inverts it: skill levels no longer feed the level at all —
  // only placed T2 points do — so raising the skill must leave it flat.
  ps.power = 10; ps.vitality = 8; ps.endurance = 0; ps.agility = 4; ps.mind = 3;
  room._recomputeMaxes(ps);
  const lvlBeforeSkill = ps.level;
  ps.defenseSkill = { level: 50, xp: 12 };
  room._recomputeMaxes(ps);
  check('v2.3.1342 defenseSkill.level no longer moves combat level',
    ps.level === lvlBeforeSkill, { before: lvlBeforeSkill, after: ps.level });
  ps.defenseSkill = { level: 4, xp: 12 }; // restore for the echo/_saveRpg asserts below
  room._recomputeMaxes(ps);

  // player_state echoes the track (unregistered ws => full, non-delta payload).
  const ws3 = fakeWs('echo');
  room._sendPlayerState(ws3, 'p2');
  const echo = msgsOfType(ws3, 'player_state').pop();
  check('player_state echoes weapon/defense skill track',
    echo && echo.payload.weaponSkills && echo.payload.weaponSkills.sword.level === 7
    && echo.payload.weaponUnspent.sword === 0 && echo.payload.defenseSkill.level === 4
    && echo.payload.defenseUnspent === 0 && echo.payload.defenseSpec.bulwark === 5,
    echo && Object.keys(echo.payload));

  // _saveRpg persists the track (capture the storage.put bundle).
  let saved = null;
  const origPut = room.state.storage.put;
  room.state.storage.put = async (k, v) => { if (k === 'rpg:p2') saved = v; };
  await room._saveRpg('p2', ps);
  room.state.storage.put = origPut;
  check('_saveRpg persists the weapon/defense skill track',
    saved && saved.weaponSkills && saved.weaponSkills.sword.level === 7
    && saved.weaponUnspent.sword === 0 && saved.defenseSkill.level === 4
    && saved.defenseUnspent === 0 && saved.defenseSpec.bulwark === 5, saved && Object.keys(saved));

  // v2.3.1451: the bench-locked accumulator rides both the echo (the
  // client's drift corrector) and the save field list — omitting
  // either silently resets banked point values on reconnect.
  ps.t2Flat = { sword: { edge: 123 }, hp: { vigor: 45 } };
  const ws4 = fakeWs('echo-t2');
  room._sendPlayerState(ws4, 'p2');
  const echoT2 = msgsOfType(ws4, 'player_state').pop();
  check('v2.3.1451 player_state echoes t2Flat',
    echoT2 && echoT2.payload.t2Flat && echoT2.payload.t2Flat.sword.edge === 123
    && echoT2.payload.t2Flat.hp.vigor === 45, echoT2 && echoT2.payload.t2Flat);
  let saved2 = null;
  room.state.storage.put = async (k, v) => { if (k === 'rpg:p2') saved2 = v; };
  await room._saveRpg('p2', ps);
  room.state.storage.put = origPut;
  check('v2.3.1451 _saveRpg persists t2Flat',
    saved2 && saved2.t2Flat && saved2.t2Flat.sword.edge === 123, saved2 && saved2.t2Flat);
  ps.t2Flat = undefined;
}

// ── v2.3.1092: harvest-activity (ex) relay ──
// A stationary gatherer broadcasts an `ex` code on its move; the server stores
// it and relays it in the tick `players` delta so peers can render the
// activity.
//
// v2.3.1575 (interest management): this relay is ZONE-SCOPED now.  The
// peer who can actually RENDER the activity -- one standing in the same
// zone -- still gets it at the full 45Hz tick rate.  A peer in another
// zone (whose renderer skips the entity entirely, entityRenderer.js)
// rides the 1 Hz presence roster instead.  Both paths are asserted: p2
// has been sitting in 'town' since the zone-change block above, so it
// exercises the roster; p2b joins into 'meadow' for the same-zone path.
{
  // Same-position move (no teleport -> accepted) carrying ex='chop'.
  const p1 = room.playerState.p1;
  const ws2b = fakeWs('v2-samezone');
  room.sessions.set(ws2b, baseSession());
  await room.webSocketMessage(ws2b, JSON.stringify({
    type: 'join', id: 'p2b', name: 'V2same', protocolVersion: 2, data: { ...joinData },
  }));
  check('same-zone v2 peer is in meadow, p2 is not',
    room.playerState.p2b.z === 'meadow' && room.playerState.p2.z !== 'meadow',
    { p2b: room.playerState.p2b.z, p2: room.playerState.p2.z });

  await room.webSocketMessage(ws1, JSON.stringify({ type: 'move', x: p1.x, y: p1.y, z: 'meadow', ex: 'chop' }));
  check('move stores harvest activity on playerState', room.playerState.p1.ex === 'chop', room.playerState.p1.ex);

  const findP1 = (w) => msgsOfType(w, 'tick').find((t) => t.players && t.players.p1);

  ws1.sent.length = 0; ws2b.sent.length = 0;
  room.startTickLoop();
  await new Promise((r) => setTimeout(r, 80));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const exTick1 = findP1(ws1);
  const exTick2b = findP1(ws2b);
  check('v1 tick relays harvest activity', !!exTick1 && exTick1.players.p1.ex === 'chop',
    exTick1 && exTick1.players.p1 && exTick1.players.p1.ex);
  check('v2 tick relays harvest activity to a same-zone peer',
    !!exTick2b && exTick2b.players.p1.ex === 'chop',
    exTick2b && exTick2b.players.p1 && exTick2b.players.p1.ex);

  /* v2.3.1575: the OUT-OF-ZONE peer must still receive the player, or
     the client's 10 s ghost-sweep deletes it and the "N online" count
     collapses to your own zone.  It arrives on the presence roster --
     tickSeq 0 is a presence tick, so one short run covers it. */
  ws2.sent.length = 0;
  room.tickSeq = 0;
  room.startTickLoop();
  await new Promise((r) => setTimeout(r, 80));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const rosterTick = findP1(ws2);
  check('v2.3.1575 out-of-zone peer still arrives via the presence roster',
    !!rosterTick && rosterTick.players.p1.ex === 'chop',
    rosterTick && rosterTick.players.p1);

  // Clearing it (ex:null) relays the cleared value so peers stop the stand-in.
  await room.webSocketMessage(ws1, JSON.stringify({ type: 'move', x: p1.x, y: p1.y, z: 'meadow', ex: null }));
  check('move clears harvest activity', room.playerState.p1.ex === null, room.playerState.p1.ex);

  room.sessions.delete(ws2b);
  delete room.playerState.p2b;
}

// ── v2.3.1177: join must NOT fall through into the move handler ──
// The v2.3.1173 hoist dropped the break after case 'join'; every join
// then ran _handleMove on the same message.  A crafted join carrying
// numeric TOP-LEVEL x/y (the move message's fields) rode the
// first-move bypass (no lastMoveAt yet) and stamped an arbitrary
// position past the anti-teleport cap.
{
  const wsJ = fakeWs('join-fallthrough');
  room.sessions.set(wsJ, baseSession());
  await room.webSocketMessage(wsJ, JSON.stringify({
    type: 'join', id: 'p_jft', name: 'JF',
    x: 123456, y: 654321, // move-shaped payload smuggled on the join
    data: { x: -100000, y: -100000, z: 'meadow' },
  }));
  const psJ = room.playerState.p_jft;
  check('join does not fall through into move (position from data only)',
    psJ && psJ.x === -100000 && psJ.y === -100000, psJ && { x: psJ.x, y: psJ.y });
  check('join leaves no move-handler residue (lastMoveAt unset)',
    psJ && typeof psJ.lastMoveAt !== 'number', psJ && psJ.lastMoveAt);
  room.sessions.delete(wsJ);
  delete room.playerState.p_jft;
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
