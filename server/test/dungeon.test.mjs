/* Instanced-dungeon test (v2.3.1127, PR12).
 * Dungeons used to be 100% client theatre: the client spawned monsters
 * from a config it chose and self-credited completion gold/XP.  The
 * worker now owns the instance ('dungeon:<id>' zone ids riding the
 * normal combat stack -- see src/dungeon.js).  Checks:
 *   1.  caps.dungeon advertised in state_sync.
 *   2.  Forged config fully clamped (waves/level/size/counts/groups/
 *       bossMultiplier/archetype/element) -- monsterLevel capped at the
 *       OWNER's level (GDD §36).
 *   3.  dungeon_started is private, zone is 'dungeon:'-prefixed, wave 1
 *       pre-populated with noRespawn monsters.
 *   4.  One active instance per owner.
 *   5.  Zone-changing into the instance delivers the wave via the
 *       normal zone_state path.
 *   6.  noRespawn guard: killed dungeon monsters stay dead (respawnAt
 *       0) while world monsters still schedule a respawn.
 *   7.  All-dead advances the wave (spawn + zone_state re-push +
 *       dungeon_wave event); _tickMonsters tolerates the instance zone.
 *   8.  Boss spawn: hp x bossMultiplier x party scale (1.6 with two
 *       players inside), dmg x1.5, dungeon_boss event.
 *   9.  Completion pays gold/XP to players INSIDE the instance only
 *       (boss formula 30w+2L / 80w+5L), private dungeon_complete.
 *   10. Done instances are swept; no-boss completion uses 20w/50w.
 *   11. Empty instances are swept after EMPTY_SWEEP_MS.
 *   12. Room-wide instance cap; dead players can't start; forged
 *       dungeon_started is not rebroadcast (deny-list).
 */
import { GameRoom } from '../src/index.js';
import { DUNGEONS } from '../src/dungeon.js';
import { MONSTER_HP_CURVE } from '../src/data.js';

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
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
}
const start = (ws, config) => room.webSocketMessage(ws, JSON.stringify({ type: 'dungeon_start', payload: { config } }));
const move = (ws, z) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: 100, y: 100, z }));
const killAll = (zone) => { for (const m of room.monsters[zone]) m.alive = false; };

const wsA = fakeWs('a');
await join(wsA, 'bp_dg_a');
const psA = room.playerState['bp_dg_a'];
psA.level = 5;
psA.coins = 0;

// ── 1. caps ──
const sync = wsA.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.dungeon', sync && sync.caps && sync.caps.dungeon === true, sync && sync.caps);

// ── 2+3. forged config clamped; wave 1 pre-populated ──
wsA.sent.length = 0;
await start(wsA, {
  name: 'x'.repeat(99), waves: 99, monsterLevel: 50, width: 999, height: 1,
  bossMultiplier: 100, hasBoss: true, bossArchetype: 'dragon_god', element: 'nuclear',
  monsters: Array.from({ length: 10 }, () => ({ archetype: 'god_slayer', count: 50, element: 'nuclear' })),
});
let started = msgsOfType(wsA, 'dungeon_started');
check('dungeon_started sent privately', started.length === 1, wsA.sent.map((m) => m.type));
const cfg = started[0].payload.cfg;
const zone = started[0].payload.zone;
check('zone id is dungeon:-prefixed', typeof zone === 'string' && zone.startsWith('dungeon:'), zone);
check('waves clamped to 10', cfg.waves === 10, cfg.waves);
check('monsterLevel capped at OWNER level (GDD §36)', cfg.monsterLevel === 5, cfg.monsterLevel);
check('arena size clamped', cfg.width === 40 && cfg.height === 15, { w: cfg.width, h: cfg.height });
check('bossMultiplier clamped to 8', cfg.bossMultiplier === 8, cfg.bossMultiplier);
check('unknown boss archetype collapses to fodder', cfg.bossArchetype === 'fodder', cfg.bossArchetype);
check('invalid element nulled', cfg.element === null, cfg.element);
check('groups clamped to 4x8 fodder', cfg.monsters.length === 4 && cfg.monsters.every((g) => g.archetype === 'fodder' && g.count === 8 && g.element === null), cfg.monsters);
check('name truncated', cfg.name.length === 24, cfg.name.length);
const wave1 = room.monsters[zone];
check('wave 1 pre-populated (4 groups x 8)', Array.isArray(wave1) && wave1.length === 32, wave1 && wave1.length);
check('dungeon monsters flagged noRespawn, respawnAt 0, alive', wave1.every((m) => m.noRespawn === true && m.respawnAt === 0 && m.alive === true && m.id.startsWith('dm-')));
check('monster level jitter stays in [lvl, lvl+2]', wave1.every((m) => m.level >= 5 && m.level <= 7), wave1.map((m) => m.level).slice(0, 5));

// ── 4. one active instance per owner ──
wsA.sent.length = 0;
await start(wsA, { waves: 1 });
let errs = msgsOfType(wsA, 'dungeon_error');
check('second start rejected (already-running)', errs.length === 1 && errs[0].payload.code === 'already-running', errs.map((e) => e.payload));

// ── 5. zone change delivers the wave via zone_state ──
wsA.sent.length = 0;
await move(wsA, zone);
const zstates = msgsOfType(wsA, 'zone_state');
check('zone_state on entry carries the pre-populated wave', zstates.length === 1 && zstates[0].monsters.length === 32 && zstates[0].zone === zone, zstates.length && zstates[0].monsters.length);
check('ps.z now the instance zone', psA.z === zone, psA.z);
check('_activeZones includes the instance', room._activeZones().has(zone));
let tickCrash = null;
try { room._tickMonsters(); } catch (e) { tickCrash = e; }
check('_tickMonsters tolerates the instance zone', tickCrash === null, tickCrash && tickCrash.message);

// ── 6. noRespawn guard regression ──
const m0 = wave1[0];
m0.dmgByPlayer = { bp_dg_a: m0.maxHp };
m0.hp = 0;
let killCrash = null;
try { room._resolveMonsterKill(zone, m0, 'bp_dg_a', psA, 'sword'); } catch (e) { killCrash = e; }
check('_resolveMonsterKill works in the instance zone', killCrash === null, killCrash && killCrash.message);
check('killed dungeon monster stays dead (respawnAt 0)', m0.alive === false && m0.respawnAt === 0, m0.respawnAt);
const meadow = room._ensureZoneMonsters('meadow');
const wm = meadow[0];
wm.dmgByPlayer = { bp_dg_a: wm.maxHp };
wm.hp = 0;
room._resolveMonsterKill('meadow', wm, 'bp_dg_a', psA, 'sword');
check('world monster still schedules a respawn', wm.alive === false && wm.respawnAt > Date.now(), wm.respawnAt);

// ── 7. all-dead advances the wave ──
killAll(zone);
wsA.sent.length = 0;
room._tickDungeons(Date.now());
let waveEvts = msgsOfType(wsA, 'dungeon_wave');
check('dungeon_wave 2/10 emitted', waveEvts.length === 1 && waveEvts[0].payload.wave === 2 && waveEvts[0].payload.total === 10, waveEvts.map((e) => e.payload));
check('wave 2 spawned (32 fresh alive)', room.monsters[zone].filter((m) => m.alive).length === 32, room.monsters[zone].length);
let push = msgsOfType(wsA, 'zone_state');
check('zone_state re-pushed on wave spawn', push.length === 1 && push[0].monsters.filter((m) => m.alive).length === 32, push.length);

// ── 8. boss spawn with party scaling ──
const wsB = fakeWs('b');
await join(wsB, 'bp_dg_b');
const psB = room.playerState['bp_dg_b'];
psB.coins = 0;
await move(wsB, zone);
const inst = room._dungeons.get(zone.slice('dungeon:'.length));
inst.wave = inst.cfg.waves; // skip the middle waves
killAll(zone);
wsA.sent.length = 0;
wsB.sent.length = 0;
room._tickDungeons(Date.now());
const boss = room.monsters[zone].find((m) => m.id.endsWith('-boss'));
check('boss spawned after final wave', !!boss && boss.alive && inst.bossSpawned === true, boss && boss.id);
// Expected hp: fodder base at lvl cfg.monsterLevel+5, x mult 8, x 1.6 (two players inside)
// v2.3.1140: HP curve imported (was a hardcoded copy of the pre-BF-1 ramp).
const baseHp = Math.ceil(room._monsterStat(MONSTER_HP_CURVE.base, cfg.monsterLevel + 5, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame) * 0.6);
const baseDmg = Math.ceil(room._monsterStat(12, cfg.monsterLevel + 5, 1.045, 1.025, 1.018) * 0.8);
check('boss hp = base x mult x party scale 1.6', boss.hp === Math.ceil(baseHp * 8 * 1.6), { hp: boss.hp, expected: Math.ceil(baseHp * 8 * 1.6) });
check('boss dmg = base x 1.5', boss.dmg === Math.ceil(baseDmg * 1.5), { dmg: boss.dmg, expected: Math.ceil(baseDmg * 1.5) });
check('dungeon_boss emitted to both players', msgsOfType(wsA, 'dungeon_boss').length === 1 && msgsOfType(wsB, 'dungeon_boss').length === 1);

// ── 9. completion pays only players inside ──
const wsC = fakeWs('c');
await join(wsC, 'bp_dg_c'); // stays in town
const psC = room.playerState['bp_dg_c'];
psC.coins = 0;
boss.alive = false;
wsA.sent.length = 0; wsB.sent.length = 0; wsC.sent.length = 0;
const xpA = psA.xp || 0, xpB = psB.xp || 0;
room._tickDungeons(Date.now());
const expGold = 30 * cfg.waves + cfg.monsterLevel * 2;
const expXp = 80 * cfg.waves + cfg.monsterLevel * 5;
check('boss-route gold paid to both insiders', psA.coins === expGold && psB.coins === expGold, { a: psA.coins, b: psB.coins, expGold });
check('boss-route xp accumulated', (psA.xp || 0) - xpA === expXp && (psB.xp || 0) - xpB === expXp, { dxpA: (psA.xp || 0) - xpA, expXp });
check('outsider not paid', psC.coins === 0, psC.coins);
check('dungeon_complete private to insiders only', msgsOfType(wsA, 'dungeon_complete').length === 1 && msgsOfType(wsB, 'dungeon_complete').length === 1 && msgsOfType(wsC, 'dungeon_complete').length === 0);
check('completion event carries the totals', msgsOfType(wsA, 'dungeon_complete')[0].payload.gold === expGold && msgsOfType(wsA, 'dungeon_complete')[0].payload.boss === true);
check('instance marked done', inst.state === 'done');

// ── 10. done sweep + no-boss completion formula ──
room._tickDungeons(Date.now() + 301000); // past the hard done-linger cap
check('done instance swept (monsters + record)', room.monsters[zone] === undefined && room._dungeons.size === 0, room._dungeons.size);
wsA.sent.length = 0;
await start(wsA, { waves: 2, hasBoss: false, monsters: [{ archetype: 'fodder', count: 1 }] });
const zone2 = msgsOfType(wsA, 'dungeon_started')[0].payload.zone;
await move(wsA, zone2);
killAll(zone2);
room._tickDungeons(Date.now()); // -> wave 2
killAll(zone2);
psA.coins = 0;
wsA.sent.length = 0;
room._tickDungeons(Date.now()); // -> complete
const nb = msgsOfType(wsA, 'dungeon_complete');
check('no-boss completion pays 20w gold / 50w xp', nb.length === 1 && nb[0].payload.gold === 40 && nb[0].payload.xp === 100 && nb[0].payload.boss === false && psA.coins === 40, nb.map((e) => e.payload));
room._tickDungeons(Date.now() + 301000); // sweep it
await move(wsA, 'town');

// ── 11. empty-instance sweep ──
wsB.sent.length = 0;
await move(wsB, 'town');
await start(wsB, { waves: 1, monsters: [{ archetype: 'fodder', count: 1 }] });
const zone3 = msgsOfType(wsB, 'dungeon_started')[0].payload.zone;
const now0 = Date.now();
room._tickDungeons(now0); // starts the empty clock (owner never entered)
check('empty instance survives inside the grace window', room._dungeons.size === 1);
room._tickDungeons(now0 + DUNGEONS.EMPTY_SWEEP_MS + 1000);
check('empty instance swept after EMPTY_SWEEP_MS', room._dungeons.size === 0 && room.monsters[zone3] === undefined, room._dungeons.size);

// ── 12. room cap, dead-player gate, deny-list ──
for (let i = 0; i < DUNGEONS.MAX_INSTANCES; i++) {
  room._dungeons.set('fake' + i, { id: 'fake' + i, zone: 'dungeon:fake' + i, ownerId: 'x' + i, state: 'active', cfg: { waves: 1, monsters: [] }, createdAt: Date.now(), emptySince: Date.now() });
}
wsA.sent.length = 0;
await start(wsA, { waves: 1 });
errs = msgsOfType(wsA, 'dungeon_error');
check('room-wide instance cap enforced', errs.length === 1 && errs[0].payload.code === 'room-full', errs.map((e) => e.payload));
for (let i = 0; i < DUNGEONS.MAX_INSTANCES; i++) room._dungeons.delete('fake' + i);

psA.dying = true;
wsA.sent.length = 0;
await start(wsA, { waves: 1 });
errs = msgsOfType(wsA, 'dungeon_error');
check('dying player cannot start', errs.length === 1 && errs[0].payload.code === 'not-now', errs.map((e) => e.payload));
psA.dying = false;

room.eventBuffer.length = 0;
await room.webSocketMessage(wsC, JSON.stringify({ type: 'dungeon_started', payload: { zone: 'dungeon:forged', cfg: {} } }));
check('forged dungeon_started dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'dungeon_started').length === 0, room.eventBuffer.map((e) => e.type));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
