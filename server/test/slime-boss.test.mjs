/* The Goo Grotto's giant slime splits (v2.3.3558, server/src/slimeboss.js,
 * docs/specs/slime-boss.md).  The owner: "a giant slime that explodes and
 * spawns small (normal size slimes) like 8-10 maybe but shrinks in size
 * afterwards ... 3 rounds of that before it finally just becomes a normal
 * slime then after you kill that you defeat the dungeon".  Checks:
 *   1. ARMED: a Goo Grotto boss has three splits, its first mark at 75% of its
 *      health, and no summon of its own; the Great Cave's boss has none.
 *   2. THE WIRE: `bs` (splits done) and `bn` (in all) beside `boss: 1`, on it
 *      alone, in the re-push and the zone snapshot; the phone's rule for the
 *      marks is the worker's.
 *   3. NO HIT SKIPS A SPLIT: a hit of ten times its health stops at the mark;
 *      at the mark it cannot be hurt; every place a monster loses health
 *      reads the floor.
 *   4. THE SWELL: at the mark it swells (split / telegraph), unhittable and
 *      still, casting nothing.
 *   5. EACH SPLIT: the blast as a blue slime's (a player inside it is hit,
 *      one outside is not), 10, 9 then 8 of the Grotto's own slimes round it,
 *      held while they land, a step smaller (bs), its next mark at 50% then
 *      25% then none; the re-push carries them all and split / execute names
 *      them.
 *   6. THE END: its last form dies as a blue slime does (it swells first);
 *      then every slime it threw out still alive pops -- unpaid -- except one
 *      already going off; and the run clears.
 *   7. THE KILL SWITCH: `slimeboss: false` -- one big boss again.
 *   8. THE PHONE: a re-push is not a new arrival (src/game/monsterCarry.js,
 *      TRAPS §245): same life or same death keeps the phone's own state; a
 *      boss that split since lets its swell go.
 *   9. THE SHINE: no pixel inside a living slime's picture is see-through
 *      (tools/mend_slime_shine.py) -- the floor showed through the giant's.
 */
import { GameRoom } from '../src/index.js';
import { readFileSync } from 'fs';
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';
import { WHEEL_DOORS } from '../src/wheelspawns.js';
import { SLIME_BOSS, splitShare, bossSplitWire } from '../src/slimeboss.js';
import { SLIME_BURST } from '../src/telegraph.js';
import { ZONES } from '../src/data.js';
import { bossSplitShare, bossSizeK } from '../../src/data/gameSystems.js';
import { carryMonsterState, CARRY_ALIVE, CARRY_DEAD } from '../../src/game/monsterCarry.js';
import { decodePNG } from '../../tools/world/png.mjs';

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
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  return room.playerState[id];
}
const put = (ps, z, x, y) => { ps.z = z; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false; };
const endRuns = () => { for (const inst of [...(room._dungeons || new Map()).values()]) room._dungeonCleanup(inst); };

const wsA = fakeWs('a');
const psA = await join(wsA, 'bp_sb_a');

/* A run at mouth `land` for a level-3 player, its waves killed: the boss up. */
async function runToBoss(land) {
  endRuns();
  const door = WHEEL_DOORS[land];
  put(psA, 'wheel', door.at[0], door.at[1]);
  psA.level = 3;
  wsA.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'dungeon_start', payload: { entrance: land } }));
  const s = msgsOfType(wsA, 'dungeon_started')[0];
  if (!s) return {};
  const zone = s.payload.zone;
  const inst = [...room._dungeons.values()].find((i) => i.zone === zone);
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 400, y: 600, z: zone }));
  for (let w = 1; w <= WHEEL_DUNGEON.WAVES; w++) {
    for (const m of room.monsters[zone]) { m.alive = false; m.hp = 0; }
    room._tickDungeons(Date.now());
  }
  const boss = room.monsters[zone].find((m) => m.alive && m._dungeonBoss);
  return { zone, inst, boss };
}

// ── 1. ARMED ───────────────────────────────────────────────────────────────
let R = await runToBoss('verdant');
{
  const { boss } = R;
  check('armed: the Goo Grotto\'s boss is the Verdant Wilds\' blue slime, with three splits to go',
    !!boss && boss.home === 'verdant' && boss.variant === 'blueSlime' && !!boss._split && boss._split.n === 0 && boss._split.of === SLIME_BOSS.SPLITS && SLIME_BOSS.SPLITS === 3,
    boss && { home: boss.home, variant: boss.variant, split: boss._split });
  check('armed: ...its first mark at 75% of its health (every quarter: (n - i) / (n + 1))',
    !!boss && boss._splitFloor === Math.floor(boss.maxHp * 0.75) && splitShare(0, 3) === 0.75 && splitShare(1, 3) === 0.5 && splitShare(2, 3) === 0.25,
    boss && { floor: boss._splitFloor, max: boss.maxHp });
  check('armed: ...and no summon: its slimes are its adds', !!boss && !boss._abilities.includes('summon'), boss && boss._abilities);
  check('armed: the owner\'s numbers: 10, 9 then 8 slimes ("like 8-10"), the blue slime\'s own swell',
    String(SLIME_BOSS.SPAWN) === '10,9,8' && SLIME_BOSS.SWELL_MS === SLIME_BURST.SWELL_MS, { spawn: SLIME_BOSS.SPAWN, swell: SLIME_BOSS.SWELL_MS });
}

// ── 2. THE WIRE ────────────────────────────────────────────────────────────
{
  const { zone, boss } = R;
  wsA.sent.length = 0;
  room._dungeonPushZoneState(zone);
  const zs = msgsOfType(wsA, 'zone_state').pop();
  const bw = zs && zs.monsters.find((x) => x.id === boss.id);
  check('wire: the re-push says `bs: 0, bn: 3` beside `boss: 1`, on the boss alone',
    !!bw && bw.boss === 1 && bw.bs === 0 && bw.bn === 3 && zs.monsters.filter((x) => 'bs' in x || 'bn' in x).length === 1, bw);
  const snap = room._zoneSnapshotWire(zone).monsters;
  const sw = snap.find((x) => x.id === boss.id);
  check('wire: ...and the zone snapshot a joiner gets (spawnscale.js monsterSnapWire)', !!sw && sw.bs === 0 && sw.bn === 3, sw);
  check('wire: ...and the join\'s own list (join.js) carries it',
    /\.\.\.\(m\._dungeonBoss \? \{ boss: 1, \.\.\.bossSplitWire\(m\) \} : \{\}\)/.test(readFileSync(new URL('../src/join.js', import.meta.url), 'utf8')));
  check('wire: nothing for any other monster', JSON.stringify(bossSplitWire({ id: 'x', alive: true })) === '{}');
  check('wire: the phone draws the marks by the worker\'s rule (gameSystems.js bossSplitShare)',
    [0, 1, 2].every((i) => bossSplitShare(i, 3) === splitShare(i, 3)) && bossSplitShare(0, 2) === splitShare(0, 2));
  const k = [0, 1, 2, 3].map((bs) => bossSizeK({ boss: 1, archetype: 'fodder', bs, bn: 3 }));
  check(`wire: ...and its size a step smaller each split, a normal slime's after the third (x${k.map((v) => v.toFixed(2)).join(', x')})`,
    k[0] > k[1] && k[1] > k[2] && k[2] > k[3] && Math.abs(k[3] - 1) < 1e-9 && Math.abs(k[0] - bossSizeK({ boss: 1, archetype: 'fodder' })) < 1e-9, k);
}

// ── 3. NO HIT SKIPS A SPLIT ────────────────────────────────────────────────
{
  const { zone, boss } = R;
  const floor0 = boss._splitFloor;
  const dealt = room._applyMonsterDot(zone, boss, boss.maxHp * 10, psA.id, 'burn');
  check(`floor: a hit of ten times its health stops at its mark (${boss.hp} = ${floor0}), it does not die`,
    boss.hp === floor0 && boss.alive && dealt === boss.maxHp - floor0, { hp: boss.hp, floor0, dealt });
  check('floor: ...and at the mark it cannot be hurt until it has split', !room._monsterDamageable(boss) && room._applyMonsterDot(zone, boss, 50, psA.id, 'burn') === 0 && boss.hp === floor0);
  /* every place a monster loses health reads the floor */
  const sites = [
    ['src/combat.js', 'const actualDmg = Math.min(rawDmg, Math.max(0, m.hp - this._monsterHpFloor(m)));'],
    ['src/combat.js', 'const colDmg = Math.min(col.dmg, Math.max(0, m.hp - this._monsterHpFloor(m)));'],
    ['src/abilities.js', 'const dmg = Math.min(raw, Math.max(0, m.hp - this._monsterHpFloor(m)));'],
    ['src/index.js', 'const dmg = Math.min(_rawRounded, Math.max(0, m.hp - this._monsterHpFloor(m)));'],
    ['src/hits.js', 'const reflect = Math.min(Math.max(0, m.hp - this._monsterHpFloor(m)),'],
  ];
  const missing = sites.filter(([f, line]) => !readFileSync(new URL('../' + f, import.meta.url), 'utf8').includes(line));
  check('floor: ...in every place a monster loses health (the swing and its collision, an ability, a damage-over-time tick, the thorns)', missing.length === 0, missing);
  const writes = [];
  for (const f of ['abilities.js', 'combat.js', 'hits.js', 'index.js', 'arrowblast.js', 'burst.js', 'pets.js', 'pvpextras.js', 'telegraph.js', 'dungeon.js', 'slimeboss.js']) {
    let src = '';
    try { src = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'); } catch (e) { continue; }
    const n = (src.match(/\bm\.hp -= /g) || []).length;
    if (n) writes.push(f + ':' + n);
  }
  check('floor: ...and there are no others (each `m.hp -=` is one of the five)', writes.sort().join(' ') === 'abilities.js:1 combat.js:2 hits.js:1 index.js:1', writes);
}

// ── 4. THE SWELL ───────────────────────────────────────────────────────────
const t0 = Date.now();
{
  const { zone, boss } = R;
  wsA.sent.length = 0;
  room._tickDungeons(t0);
  const tel = msgsOfType(wsA, 'dungeon_boss_ability').find((e) => e.payload.ability === 'split');
  check('swell: at the mark it swells -- split / telegraph, the blue slime\'s 1.6 s, scale 1.3, its first split',
    !!tel && tel.payload.phase === 'telegraph' && tel.payload.ms === SLIME_BOSS.SWELL_MS && tel.payload.scale === SLIME_BOSS.SWELL_SCALE && tel.payload.stage === 0 && tel.payload.of === 3,
    tel && tel.payload);
  check('swell: ...unhittable and still, its swing put off', !room._monsterDamageable(boss, t0 + 100) && boss._attackingUntil >= t0 + SLIME_BOSS.SWELL_MS && boss.atkCd >= t0 + SLIME_BOSS.SWELL_MS);
  wsA.sent.length = 0;
  room._tickDungeons(t0 + 500);
  check('swell: ...and it casts nothing while it swells (no other ability, no split yet)', msgsOfType(wsA, 'dungeon_boss_ability').length === 0 && room.monsters[zone].filter((m) => m.alive && !m._dungeonBoss).length === 0);
}

// ── 5. EACH SPLIT ──────────────────────────────────────────────────────────
{
  const { zone, inst, boss } = R;
  let t = t0;
  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      /* down to its next mark, then the swell */
      room._applyMonsterDot(zone, boss, boss.maxHp * 10, psA.id, 'burn');
      room._tickDungeons(t);
    }
    /* stand inside its blast for the first and outside for the second */
    const inside = i !== 1;
    const r = SLIME_BOSS.BLAST_R[i];
    put(psA, zone, boss.x + (inside ? r - 20 : r + 60), boss.y);
    psA.hp = psA.maxHp;
    /* the zone's entry grace runs on the real clock (movement.js), and this
       test's clock jumps; in play the boss is reached long after the way in */
    psA._zoneEntryGraceUntil = 0;
    const hp0 = psA.hp;
    const before = room.monsters[zone].length;
    wsA.sent.length = 0;
    t += SLIME_BOSS.SWELL_MS + 10;
    room._tickDungeons(t);
    const ex = msgsOfType(wsA, 'dungeon_boss_ability').find((e) => e.payload.ability === 'split' && e.payload.phase === 'execute');
    const fresh = room.monsters[zone].slice(before);
    const want = SLIME_BOSS.SPAWN[i];
    check(`split ${i + 1}: it goes off -- split / execute, ${want} slimes named, radius ${r}`,
      !!ex && ex.payload.stage === i + 1 && ex.payload.count === want && Array.isArray(ex.payload.ids) && ex.payload.ids.length === want && ex.payload.radius === r,
      ex && ex.payload);
    check(`split ${i + 1}: ...the blast as a blue slime's -- ${inside ? 'a player inside it is hit' : 'a player outside it is not'} (${hp0} -> ${psA.hp})`,
      inside ? psA.hp < hp0 : psA.hp === hp0, { hp0, hp: psA.hp });
    const land = ZONES.verdant.spawns[ZONES.verdant.spawns.length - 1];
    const T = room.TILE;
    check(`split ${i + 1}: ...${want} of the Grotto's own slimes, at the dungeon's level, inside the arena, held while they land`,
      fresh.length === want && fresh.every((m) => m.alive && m._splitSpawn && m.home === 'verdant' && m.arch === land.arch && m.variant === land.variant
        && m.level === inst.cfg.monsterLevel && m.noRespawn
        && m.x >= 2 * T && m.x <= (inst.cfg.width - 2) * T && m.y >= WHEEL_DUNGEON.TOP_ROW * T && m.y <= (inst.cfg.height - 2) * T
        && m._attackingUntil >= t + SLIME_BOSS.LAND_MS - 5 && m.atkCd >= t + SLIME_BOSS.FIRST_SWING_MS - 5)
        && fresh.every((m) => ex.payload.ids.includes(m.id)),
      fresh.map((m) => ({ id: m.id, lv: m.level, x: Math.round(m.x), y: Math.round(m.y) })));
    const ring = fresh.map((m) => Math.hypot(m.x - boss.x, m.y - boss.y));
    check(`split ${i + 1}: ...on a ring round it (${Math.round(Math.min(...ring))}-${Math.round(Math.max(...ring))} px out)`,
      ring.every((d) => d <= SLIME_BOSS.RING[1] + 1), ring.map(Math.round));
    const nextFloor = i < 2 ? Math.floor(boss.maxHp * splitShare(i + 1, 3)) : 0;
    check(`split ${i + 1}: ...a step smaller (bs ${i + 1}), its next mark ${nextFloor ? Math.round(splitShare(i + 1, 3) * 100) + '%' : 'none: it can die now'}, hittable again`,
      boss._split.n === i + 1 && boss._splitFloor === nextFloor && room._monsterDamageable(boss, t + 1), { n: boss._split.n, floor: boss._splitFloor });
    const zs = msgsOfType(wsA, 'zone_state').pop();
    check(`split ${i + 1}: ...the re-push carries the new slimes and its new size`,
      !!zs && fresh.every((m) => zs.monsters.some((x) => x.id === m.id && x.alive)) && zs.monsters.find((x) => x.id === boss.id).bs === i + 1,
      zs && zs.monsters.length);
    t += 100;
  }
  check('split: 27 slimes in all, as the owner put it ("3 rounds of that")', room.monsters[zone].filter((m) => m._splitSpawn).length === 27);
  check('split: its last quarter is one wave slime\'s health (the boss is four)', boss.hp === Math.floor(boss.maxHp * 0.25) && Math.abs(boss.hp - boss.maxHp / 4) <= 1, { hp: boss.hp, max: boss.maxHp });
  R.t = t;
}

// ── 6. THE END ─────────────────────────────────────────────────────────────
{
  const { zone, inst, boss } = R;
  let t = R.t + 10;
  const spawns = room.monsters[zone].filter((m) => m._splitSpawn);
  /* a few killed by the player; one of them still going off at the end */
  for (const m of spawns.slice(0, 3)) { m.alive = false; m.hp = 0; }
  const going = spawns[3];
  going.hp = 0;
  going._burstUntil = t + 60000;
  /* the player well clear of its own death blast (a run with nobody alive in
     it is the empty sweep's, not this) */
  put(psA, zone, boss.x + 400, boss.y);
  psA.hp = psA.maxHp;
  /* the boss's last form: a killing blow -- a blue slime swells before it dies */
  room._applyMonsterDot(zone, boss, boss.hp + 100, psA.id, 'burn');
  check('end: the killing blow lands on its last form (nothing holds it now) and it swells as a blue slime does',
    boss.hp === 0 && boss.alive && boss._burstUntil > 0, { hp: boss.hp, alive: boss.alive, burst: boss._burstUntil });
  room._tickDungeons(t);
  check('end: ...the slimes it threw out wait while it is still going off', spawns.slice(4).every((m) => m.alive));
  /* its burst resolves in the monster tick; then the dungeon tick sees it dead */
  const kills = [];
  const realKill = room._resolveMonsterKill;
  room._resolveMonsterKill = function (...a) { kills.push(a[1] && a[1].id); return realKill.apply(this, a); };
  room._resolveSlimeBurst(zone, boss, boss._burstUntil + 1);
  check('end: ...then it dies (its own blast and its kill)', !boss.alive && kills.includes(boss.id), kills);
  kills.length = 0;
  wsA.sent.length = 0;
  room._tickDungeons(t + 2000);
  const left = spawns.slice(4);
  check(`end: ...and every slime it threw out still alive pops (${left.length}), unpaid -- no kill resolved for any`,
    left.every((m) => !m.alive && m.hp === 0) && kills.length === 0, { kills, alive: left.filter((m) => m.alive).length });
  const pop = msgsOfType(wsA, 'dungeon_boss_ability').find((e) => e.payload.ability === 'split' && e.payload.phase === 'pop');
  check('end: ...and the phones are told which (split / pop), so they play one splat, not twenty',
    !!pop && pop.payload.count === left.length && left.every((m) => pop.payload.ids.includes(m.id)) && !pop.payload.ids.includes(going.id),
    pop && pop.payload.count);
  check('end: ...but one already going off (someone killed it) is left to go off and pay', going.alive && going._burstUntil > 0);
  check('end: ...and the run waits for it', inst.state === 'active' && !msgsOfType(wsA, 'dungeon_complete').length);
  going._burstUntil = 0; going.alive = false;
  room._resolveMonsterKill = realKill;
  wsA.sent.length = 0;
  room._tickDungeons(t + 2100);
  const done = msgsOfType(wsA, 'dungeon_complete')[0];
  check('end: ...then the run clears: killing its last form is the win', inst.state === 'done' && !!done && done.payload.boss === true, done && done.payload);
}

// ── 7. NOT THE OTHER DUNGEONS, AND THE KILL SWITCH ─────────────────────────
{
  const cave = await runToBoss('hollows');
  check('others: the Great Cave\'s boss does not split (one big boss)', !!cave.boss && !cave.boss._split && !(cave.boss._splitFloor > 0) && !room._monsterHpFloor(cave.boss));
  wsA.sent.length = 0;
  room._dungeonPushZoneState(cave.zone);
  const zs = msgsOfType(wsA, 'zone_state').pop();
  const bw = zs && zs.monsters.find((x) => x.id === cave.boss.id);
  check('others: ...and its wire is v2.3.3556\'s (`boss: 1`, no bs or bn)', !!bw && bw.boss === 1 && !('bs' in bw) && !('bn' in bw), bw);
  room._liveFlags = { slimeboss: false };
  const off = await runToBoss('verdant');
  check('switch: `slimeboss: false` -- the Goo Grotto\'s boss is one big boss again', !!off.boss && !off.boss._split && !(off.boss._splitFloor > 0));
  const dealt = room._applyMonsterDot(off.zone, off.boss, off.boss.maxHp * 10, psA.id, 'burn');
  check('switch: ...a big enough hit kills it outright', off.boss.hp === 0 && dealt === off.boss.maxHp);
  room._liveFlags = {};
  endRuns();
}

// ── 8. THE PHONE: A RE-PUSH IS NOT A NEW ARRIVAL (src/game/monsterCarry.js) ──
{
  /* the phone builds its list afresh from every re-push (wsClient.js); a
     monster it already holds keeps what it keeps of it, in the same life or
     the same death -- TRAPS §245 */
  const seen = { id: 'm1', alive: true, _fxWasAlive: true, _spawnFxAt: 0, renderX: 40, renderY: 50, _hitByMeAt: 9, _stuckArrows: [1] };
  const a = carryMonsterState({ id: 'm1', alive: true, x: 41, y: 52 }, seen);
  check('phone: a monster standing in both lists keeps its own state -- not met as a new arrival',
    a._fxWasAlive === true && a._spawnFxAt === 0 && a.renderX === 40 && a.renderY === 50 && a._hitByMeAt === 9 && a._stuckArrows.length === 1 && a.x === 41, a);
  const dead = { id: 'm2', alive: false, _fxWasAlive: false, _slimeDeathStart: 1234, _killMine: true };
  const d = carryMonsterState({ id: 'm2', alive: false }, dead);
  check('phone: ...one dead in both keeps its death -- it does not die again (splat and sound)',
    d._fxWasAlive === false && d._slimeDeathStart === 1234 && d._killMine === true, d);
  const back = carryMonsterState({ id: 'm2', alive: true }, dead);
  const died = carryMonsterState({ id: 'm1', alive: false }, seen);
  check('phone: ...one that came back or died since is met afresh',
    back._fxWasAlive === undefined && back._slimeDeathStart === undefined && died._fxWasAlive === undefined && died.renderX === undefined, { back, died });
  check('phone: ...and one the phone never held is new', carryMonsterState({ id: 'm3', alive: true }, undefined)._fxWasAlive === undefined);
  const swelling = { id: 'b', alive: true, boss: 1, bs: 0, bn: 3, _burstFrom: 1, _burstUntil: 2, _burstScale: 1.3, _fxWasAlive: true };
  const still = carryMonsterState({ id: 'b', alive: true, boss: 1, bs: 0, bn: 3 }, swelling);
  const split = carryMonsterState({ id: 'b', alive: true, boss: 1, bs: 1, bn: 3 }, swelling);
  check('phone: a boss mid-swell keeps its swell through a re-push of the same stage',
    still._burstUntil === 2 && still._burstFrom === 1 && still._burstScale === 1.3, still);
  check('phone: ...but one that has split since (bs moved) has finished it: never held swollen and untouchable for ever',
    split._burstUntil === undefined && split._burstFrom === undefined && split._burstScale === undefined && split._fxWasAlive === true, split);
  const slime = carryMonsterState({ id: 's', alive: true, hp: 0 }, { id: 's', alive: true, hp: 0, _burstFrom: 5, _burstUntil: 6, _burstScale: 3.5 });
  check('phone: ...and a blue slime mid-burst (no bs) keeps its swell, as it must', slime._burstUntil === 6 && slime._burstScale === 3.5, slime);
  check('phone: the two lists name only the phone\'s own fields (never one the wire sends)',
    [...CARRY_ALIVE, ...CARRY_DEAD].every((k) => typeof k === 'string' && (k[0] === '_' || k === 'renderX' || k === 'renderY')));
}

{
  /* 9. THE SHINE (tools/mend_slime_shine.py).  The owner, of the giant: "There's
     actually a transparent hole on the slime i don't think that came with the
     original art."  The slime was cut off its videos' near-white background by
     colour, and the pale shine on its top-left went with it -- a few pixels at
     a slime's own size, the floor showing through at x4.6.  So no pixel inside
     a living slime may be see-through: every pixel that is not fully opaque
     must reach its frame's edge through others like it (8-connected), as the
     outline's soft edge and the gaps round the drips do.  The blue slime is
     these pictures recoloured, alpha kept, so this covers it too. */
  const FRAME = 128;
  for (const name of ['slime-idle-v5', 'slime-shoot-v2', 'slime-hit-v1']) {
    const img = decodePNG(readFileSync(new URL(`../../public/sprites/monsters/${name}.png`, import.meta.url)));
    const frames = Math.floor(img.w / FRAME);
    const holes = [];
    for (let f = 0; f < frames; f++) {
      const a = (x, y) => img.data[(y * img.w + f * FRAME + x) * 4 + 3];
      const out = new Uint8Array(FRAME * FRAME);
      const q = [];
      for (let i = 0; i < FRAME; i++) {
        for (const [x, y] of [[i, 0], [i, FRAME - 1], [0, i], [FRAME - 1, i]]) {
          if (a(x, y) < 255 && !out[y * FRAME + x]) { out[y * FRAME + x] = 1; q.push(x, y); }
        }
      }
      while (q.length) {
        const y = q.pop(), x = q.pop();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= FRAME || ny >= FRAME || out[ny * FRAME + nx] || a(nx, ny) === 255) continue;
            out[ny * FRAME + nx] = 1; q.push(nx, ny);
          }
        }
      }
      for (let y = 0; y < FRAME; y++) {
        for (let x = 0; x < FRAME; x++) if (a(x, y) < 255 && !out[y * FRAME + x]) holes.push({ f, x, y, alpha: a(x, y) });
      }
    }
    check(`shine: ${name}'s ${frames} frames have no see-through pixel inside the slime`,
      img.h === FRAME && frames > 0 && holes.length === 0, { frames, holes: holes.length, first: holes.slice(0, 4) });
  }
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nslime-boss: all passed');
