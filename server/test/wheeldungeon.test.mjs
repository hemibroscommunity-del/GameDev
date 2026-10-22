/* The Wheel's dungeons (v2.3.3016, server/src/wheeldungeon.js).  A land's
 * landmark -- the Great Cave, the Foundry Dome, the Buried City -- is the way
 * into a private instance of that land's own monsters.  Checks:
 *   1. THE SWITCH: caps.wheeldungeons advertised; `wheeldungeons: false` in
 *      liveflags un-advertises it and closes every mouth.
 *   2. THE MOUTHS: baked from the plan's landmarks (WHEEL_DOORS) for every
 *      land in LANDS, each with its tier's levels and a way back out.
 *   3. WHO MAY START: an unknown mouth, '__proto__', a player far from it or
 *      outside the Wheel -- refused; the client's config is never read.
 *   4. A START: dungeon_started with `back` and the config's `home`; the level
 *      the place's top but never above the player's own; wave 1 the land's
 *      whole spawn list, built as the land builds it (home, variant, stats at
 *      that level), staying dead.
 *   5. THE WIRE: the instance's zone_state re-push carries home and variant,
 *      as the Wheel's own snapshot does.
 *   6. THE RUN: three waves, then the boss -- the land's last kind, at the
 *      dungeon's level (v2.3.3540; five levels up until then), scaled as any
 *      dungeon boss, with its kit -- then the clear, paid by the dungeon
 *      formula; a kill counts for the land.
 *   7. THE PARTY: a member near the mouth comes in, one across the Wheel does
 *      not.
 *   8. THE WORKSHOP'S dungeons are as they were.
 *   9. THE DEV OP clearwave ends the wave you stand in (QA, admin-gated).
 *  10. THE STARTER DUNGEON (v2.3.3540): the Goo Grotto, the Verdant Wilds'
 *      landmark, baked on both Wheels on their first stretch (levels 1-5),
 *      about half a minute's walk from town; a run there is the Verdant
 *      Wilds' slimes at levels 1-5, never above yours, its boss at the
 *      dungeon's level.
 *  11. v2.3.3556 (docs/specs/dungeon-fixes.md): ONE LEVEL, A REAL BOSS,
 *      STRAIGHT BACK IN -- every wave monster at the dungeon's level (no
 *      +0..2), the boss four wave monsters of health and said on the wire
 *      (`boss: 1`), and a start with your last run empty ending it at once;
 *      someone still inside keeps it running.
 *  12. v2.3.3556: A DEATH IN A DUNGEON KEEPS THE BAG (the owner: "Keep your
 *      bag in dungeons") -- no pile, the bag whole at the death and after the
 *      respawn, `keptBag` on player_died; a death in the world as before; the
 *      kill switch `dungeonbag: false`; a red skull's loss still No man's
 *      land's.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { readFileSync } from 'fs';   /* v2.3.3556: the join's monster list, read */
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';
import { WHEEL_DOORS, WHEEL_CENTRE, WHEEL_SPAWNS } from '../src/wheelspawns.js';
import * as SHORT from '../src/wheelspawns1.js';   /* v2.3.3540: the starter dungeon on the short Wheel too */
import { DUNGEONS } from '../src/dungeon.js';
import { ZONES, monsterHpFlat } from '../src/data.js';
import { QUEST_CHAINS } from '../../src/data/gameSystems.js';   /* v2.3.3540: the Mayor's "Clear any dungeon" reads the clear */

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
const startAt = (ws, entrance, extra) => room.webSocketMessage(ws, JSON.stringify({ type: 'dungeon_start', payload: Object.assign({ entrance }, extra || {}) }));
const startWorkshop = (ws, config) => room.webSocketMessage(ws, JSON.stringify({ type: 'dungeon_start', payload: { config } }));
const put = (ps, z, x, y) => { ps.z = z; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false; };
const endRun = (ps) => { for (const inst of [...(room._dungeons || new Map()).values()]) if (inst.ownerId === ps.id || true) room._dungeonCleanup(inst); };

const wsA = fakeWs('a');
const psA = await join(wsA, 'bp_wd_a');
psA.id = 'bp_wd_a';

// ── 1. THE SWITCH ──────────────────────────────────────────────────────────
{
  const sync = msgsOfType(wsA, 'state_sync')[0];
  check('switch: state_sync advertises caps.wheeldungeons', !!sync && !!sync.caps && sync.caps.wheeldungeons === true, sync && sync.caps && sync.caps.wheeldungeons);
  /* v2.3.3540: and how many of the mouths, in order -- the phone offers the
     Goo Grotto only against a worker that counts it (TRAPS §9) */
  check('switch: ...and caps.dungeonLands, how many of WHEEL_DUNGEON.LANDS it opens (4: the Grotto counted, last)',
    !!sync && sync.caps.dungeonLands === 4 && Object.keys(WHEEL_DUNGEON.LANDS)[3] === 'verdant', sync && sync.caps.dungeonLands);
  room._liveFlags = { wheeldungeons: false };
  const wsK = fakeWs('k');
  await join(wsK, 'bp_wd_k');
  const ks = msgsOfType(wsK, 'state_sync')[0];
  check('switch: `wheeldungeons: false` un-advertises it', !!ks && ks.caps.wheeldungeons === false, ks && ks.caps.wheeldungeons);
  const door = WHEEL_DOORS.hollows;
  put(psA, 'wheel', door.at[0], door.at[1]);
  psA.level = 10;
  wsA.sent.length = 0;
  await startAt(wsA, 'hollows');
  const e = msgsOfType(wsA, 'dungeon_error')[0];
  check('switch: ...and closes every mouth', !!e && e.payload.code === 'closed' && !msgsOfType(wsA, 'dungeon_started').length, e && e.payload);
  room._liveFlags = {};
}

// ── 2. THE MOUTHS ──────────────────────────────────────────────────────────
{
  const lands = Object.keys(WHEEL_DUNGEON.LANDS);
  check(`mouths: one baked for each land in LANDS (${lands.join(', ')})`, lands.every((id) => !!room._wheelDoor(id)), Object.keys(WHEEL_DOORS));
  check('mouths: the Great Cave, the Foundry Dome, the Buried City and (v2.3.3540) the Goo Grotto, by name',
    WHEEL_DOORS.hollows.name === 'the Great Cave' && WHEEL_DOORS.thunder.name === 'the Foundry Dome' && WHEEL_DOORS.sky.name === 'the Buried City'
      && WHEEL_DOORS.verdant.name === 'the Goo Grotto',
    Object.fromEntries(Object.entries(WHEEL_DOORS).map(([k, d]) => [k, d.name])));
  check('mouths: each at its tier\'s levels (the Cave and the Dome 26-30, the City 41-45, the Grotto 1-5)',
    String(WHEEL_DOORS.hollows.levels) === '26,30' && String(WHEEL_DOORS.thunder.levels) === '26,30' && String(WHEEL_DOORS.sky.levels) === '41,45'
      && String(WHEEL_DOORS.verdant.levels) === '1,5',
    Object.fromEntries(Object.entries(WHEEL_DOORS).map(([k, d]) => [k, d.levels])));
  check('mouths: each way back out is a step from its mouth (100-260 px)',
    lands.every((id) => { const d = WHEEL_DOORS[id]; const r = Math.hypot(d.back[0] - d.at[0], d.back[1] - d.at[1]); return r >= 100 && r <= 260; }),
    Object.fromEntries(lands.map((id) => [id, Math.round(Math.hypot(WHEEL_DOORS[id].back[0] - WHEEL_DOORS[id].at[0], WHEEL_DOORS[id].back[1] - WHEEL_DOORS[id].at[1]))])));
  check('mouths: no land without a landmark tier is a dungeon (the commons)', !room._wheelDoor('commons') && !room._wheelDoor('frost'));
}

// ── 3. WHO MAY START ───────────────────────────────────────────────────────
{
  const door = WHEEL_DOORS.hollows;
  psA.level = 10;
  const tryStart = async (entrance, z, x, y, extra) => {
    put(psA, z, x, y);
    wsA.sent.length = 0;
    await startAt(wsA, entrance, extra);
    const e = msgsOfType(wsA, 'dungeon_error')[0];
    return { started: msgsOfType(wsA, 'dungeon_started').length, code: e && e.payload.code };
  };
  const unk = await tryStart('volcano', 'wheel', door.at[0], door.at[1]);
  check('who: an unknown mouth is refused', !unk.started && unk.code === 'not-here', unk);
  const proto = await tryStart('__proto__', 'wheel', door.at[0], door.at[1]);
  check('who: \'__proto__\' is refused', !proto.started && proto.code === 'not-here', proto);
  const far = await tryStart('hollows', 'wheel', door.at[0] + WHEEL_DUNGEON.DOOR_R + 40, door.at[1]);
  check(`who: ${WHEEL_DUNGEON.DOOR_R + 40} px from the mouth is too far`, !far.started && far.code === 'not-here', far);
  const out = await tryStart('hollows', 'town', door.at[0], door.at[1]);
  check('who: the same coordinates in another zone are refused', !out.started && out.code === 'not-here', out);
  const forged = await tryStart('hollows', 'wheel', door.at[0] + 120, door.at[1], { config: { waves: 10, monsterLevel: 100, bossMultiplier: 8 } });
  const cfg = forged.started ? msgsOfType(wsA, 'dungeon_started')[0].payload.cfg : null;
  check('who: within reach it starts, and a config sent with the mouth is never read (3 waves, the worker\'s level and boss)',
    !!cfg && cfg.waves === WHEEL_DUNGEON.WAVES && cfg.monsterLevel === 10 && cfg.bossMultiplier === WHEEL_DUNGEON.BOSS_MULT, cfg);
  endRun(psA);
}

// ── 4. A START ─────────────────────────────────────────────────────────────
let run = null;
{
  const door = WHEEL_DOORS.hollows;
  const lvlFor = async (level, id = 'hollows') => {
    const d = WHEEL_DOORS[id];
    put(psA, 'wheel', d.at[0], d.at[1]);
    psA.level = level;
    wsA.sent.length = 0;
    await startAt(wsA, id);
    const s = msgsOfType(wsA, 'dungeon_started')[0];
    const lv = s ? s.payload.cfg.monsterLevel : null;
    endRun(psA);
    return lv;
  };
  const l8 = await lvlFor(8), l45 = await lvlFor(45), l50 = await lvlFor(50, 'sky'), l1 = await lvlFor(1);
  check(`start: the level is the place's top, never above yours (lvl 8 -> ${l8}, 45 -> ${l45} at the Cave; 50 -> ${l50} at the City; 1 -> ${l1})`,
    l8 === 8 && l45 === 30 && l50 === 45 && l1 === 1, { l8, l45, l50, l1 });

  put(psA, 'wheel', door.at[0], door.at[1]);
  psA.level = 12;
  wsA.sent.length = 0;
  await startAt(wsA, 'hollows');
  const s = msgsOfType(wsA, 'dungeon_started')[0];
  check('start: dungeon_started, private, to a dungeon: zone', !!s && /^dungeon:/.test(s.payload.zone), s && s.payload);
  const p = s.payload;
  check('start: it says the way back out -- the baked step from the mouth, in the Wheel',
    !!p.back && p.back.z === 'wheel' && p.back.x === door.back[0] && p.back.y === door.back[1], p.back);
  check('start: the config names its land and its name', p.cfg.home === 'hollows' && p.cfg.name === 'the Great Cave' && p.cfg.monsterLevel === 12 && p.cfg.hasBoss === true, p.cfg);
  const inst = [...room._dungeons.values()].find((i) => i.zone === p.zone);
  run = { zone: p.zone, inst };
  const wave = room.monsters[p.zone] || [];
  const zone = ZONES.hollows;
  const want = zone.spawns.reduce((t, sp) => t + (sp.count || 0), 0);
  check(`start: wave 1 is the land's whole spawn list (${wave.length} of ${want})`, wave.length === want && want > 0, wave.map((m) => m.arch));
  /* v2.3.3556: AT the run's level -- it rolled +0..2, so the dungeon said one
     level and fought three */
  check('start: ...each of the land, its own look, at the run\'s level exactly (v2.3.3556: no +0..2), staying dead once dead',
    wave.every((m) => m.home === 'hollows' && m.noRespawn === true && m.respawnAt === 0 && m.alive && m.level === 12),
    wave.map((m) => ({ home: m.home, v: m.variant, lv: m.level })));
  const ref = room._makeZoneMonster('hollows', zone, zone.spawns[0], 'ref', 0, 0, wave[0].level);
  const w0 = wave.find((m) => m.arch === zone.spawns[0].arch && m.level === wave[0].level) || wave[0];
  check('start: ...built by the land\'s own math (the same variant, HP, damage and XP as the land builds at that level)',
    w0.variant === ref.variant && w0.maxHp === ref.maxHp && w0.dmg === ref.dmg && w0.xp === ref.xp, { got: [w0.variant, w0.maxHp, w0.dmg, w0.xp], want: [ref.variant, ref.maxHp, ref.dmg, ref.xp] });
  check('start: ...inside the arena\'s upper half, below the rows the top bar covers', wave.every((m) => m.x > 0 && m.x < WHEEL_DUNGEON.WIDTH * room.TILE && m.y >= WHEEL_DUNGEON.TOP_ROW * room.TILE && m.y < WHEEL_DUNGEON.HEIGHT / 2 * room.TILE));
  /* one run each while someone is in it (v2.3.3556: an EMPTY run is ended by
     a new start -- check 11); inside for this check only, the real way in is
     check 5's move */
  psA.z = p.zone;
  wsA.sent.length = 0;
  await startAt(wsA, 'hollows');
  const e = msgsOfType(wsA, 'dungeon_error')[0];
  check('start: one run each while you are in it, as any dungeon (already-running)', !!e && e.payload.code === 'already-running' && !msgsOfType(wsA, 'dungeon_started').length, e && e.payload);
  put(psA, 'wheel', door.at[0], door.at[1]);
}

// ── 5. THE WIRE ────────────────────────────────────────────────────────────
{
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 400, y: 600, z: run.zone }));
  wsA.sent.length = 0;
  room._dungeonPushZoneState(run.zone);
  const zs = msgsOfType(wsA, 'zone_state')[0];
  check('wire: the re-push carries each monster\'s home and variant (the Wheel\'s own snapshot shape)',
    !!zs && zs.monsters.length > 0 && zs.monsters.every((m) => m.home === 'hollows' && 'variant' in m), zs && zs.monsters.slice(0, 2));
  const snap = room._zoneSnapshotWire(run.zone).monsters;
  check('wire: ...and the move\'s zone snapshot does too', snap.length > 0 && snap.every((m) => m.home === 'hollows'), snap.slice(0, 1));
}

// ── 6. THE RUN ─────────────────────────────────────────────────────────────
{
  const killAll = () => { for (const m of room.monsters[run.zone]) { m.alive = false; m.hp = 0; } };
  const coins0 = psA.coins || 0;
  for (let w = 2; w <= WHEEL_DUNGEON.WAVES; w++) {
    killAll();
    wsA.sent.length = 0;
    room._tickDungeons(Date.now());
    const ev = msgsOfType(wsA, 'dungeon_wave')[0];
    check(`run: wave ${w} of ${WHEEL_DUNGEON.WAVES} comes, the land's monsters again`,
      !!ev && ev.payload.wave === w && room.monsters[run.zone].filter((m) => m.alive).every((m) => m.home === 'hollows'), ev && ev.payload);
  }
  killAll();
  wsA.sent.length = 0;
  room._tickDungeons(Date.now());
  const bossEv = msgsOfType(wsA, 'dungeon_boss')[0];
  const boss = room.monsters[run.zone].find((m) => m.alive && m._dungeonBoss);
  const zone = ZONES.hollows, last = zone.spawns[zone.spawns.length - 1];
  check('run: then the boss -- the land\'s last kind, at the dungeon\'s level (v2.3.3540; it was five up), its own look', !!bossEv && !!boss && boss.arch === last.arch && boss.level === run.inst.cfg.monsterLevel && boss.home === 'hollows', boss && { arch: boss.arch, lv: boss.level, home: boss.home });
  const plain = room._makeZoneMonster('hollows', zone, last, 'ref', 0, 0, boss.level);
  /* v2.3.3556: its WHOLE health x BOSS_MULT -- the level's flat (most of a
     monster's health since v2.3.3055) was left out of the multiplying, so the
     boss had about a wave monster's health, and less in two of the four */
  check('run: ...scaled as any dungeon boss (its WHOLE HP x BOSS_MULT for one, damage x1.5) with its kit (v2.3.3556)',
    boss.maxHp === Math.ceil(plain.maxHp * WHEEL_DUNGEON.BOSS_MULT * DUNGEONS.PARTY_HP_SCALE[0])
      && boss.dmg === Math.ceil(plain.dmg * 1.5) && Array.isArray(boss._abilities) && boss._abilities.length >= 2,
    { hp: boss.maxHp, plain: plain.maxHp, dmg: boss.dmg, kit: boss._abilities });
  const waveTop = Math.max(...room.monsters[run.zone].filter((m) => !m._dungeonBoss).map((m) => m.maxHp));
  check(`run: ...so the boss is ${WHEEL_DUNGEON.BOSS_MULT} wave monsters of health (${boss.maxHp} against the biggest wave monster's ${waveTop}) (v2.3.3556)`,
    boss.maxHp >= WHEEL_DUNGEON.BOSS_MULT * waveTop, { boss: boss.maxHp, waveTop, flat: monsterHpFlat(boss.level) });
  const zs = msgsOfType(wsA, 'zone_state').pop();
  const bw = zs && zs.monsters.find((x) => x.id === boss.id);
  check('run: ...and the wire says which one it is -- `boss: 1` on it alone, beside its home and look (v2.3.3556)',
    !!bw && bw.boss === 1 && bw.home === 'hollows' && zs.monsters.filter((x) => x.boss).length === 1, zs && zs.monsters.map((x) => [x.id, x.boss]));
  const snapB = room._zoneSnapshotWire(run.zone).monsters;
  check('run: ...in the zone snapshot a joiner gets too (spawnscale.js monsterSnapWire)',
    snapB.filter((x) => x.boss === 1).length === 1 && snapB.find((x) => x.boss === 1).id === boss.id, snapB.map((x) => [x.id, x.boss]));
  {
    /* ...and the join's own list (state_sync), the third mapping of a whole
       monster: read, as a join inside a run is a reconnect's corner */
    const js = readFileSync(new URL('../src/join.js', import.meta.url), 'utf8');
    const at = js.indexOf('monsters: zoneMonsters.map(m => ({');
    const block = at > 0 ? js.slice(at, js.indexOf('})),', at)) : '';
    /* v2.3.3558: ...with a splitting boss's splits beside it (slimeboss.js) */
    check('run: ...and in the join\'s state_sync list (join.js), on it alone', /\.\.\.\(m\._dungeonBoss \? \{ boss: 1(, \.\.\.bossSplitWire\(m\))? \} : \{\}\)/.test(block), block.length);
  }
  check('run: a kill in it counts for its land (its shard, its quests)', room._rewardZone(run.zone, boss) === 'hollows');
  boss.alive = false; boss.hp = 0;
  wsA.sent.length = 0;
  room._tickDungeons(Date.now());
  const done = msgsOfType(wsA, 'dungeon_complete')[0];
  const lvl = run.inst.cfg.monsterLevel;
  /* v2.3.3565: and the boss's chest beside it, its gold its own (the
     dungeon-reward suite checks what it holds) */
  check(`run: the clear pays the dungeon formula (${30 * WHEEL_DUNGEON.WAVES + lvl * 2} gold, ${80 * WHEEL_DUNGEON.WAVES + lvl * 5} XP), and the boss's chest its own gold`,
    !!done && done.payload.gold === 30 * WHEEL_DUNGEON.WAVES + lvl * 2 && done.payload.xp === 80 * WHEEL_DUNGEON.WAVES + lvl * 5
      && !!done.payload.chest && psA.coins === coins0 + done.payload.gold + done.payload.chest.gold,
    done && done.payload);
  /* v2.3.3540: ...and is recorded, so the Mayor's "Clear any dungeon" is
     ready (the game's own check reads it) */
  const clears = psA.lifeSkills && psA.lifeSkills.dungeonClears;
  check('run: the clear is recorded (lifeSkills.dungeonClears.wheel_hollows), and the Mayor\'s "Clear any dungeon" reads it as done (v2.3.3540)',
    !!clears && clears.wheel_hollows === true && QUEST_CHAINS.mayor_3.check({ lifeSkills: psA.lifeSkills }) === true
      && QUEST_CHAINS.mayor_3.check({ lifeSkills: { dungeonClears: {} } }) === false, clears);
  endRun(psA);
}

// ── 7. THE PARTY ───────────────────────────────────────────────────────────
{
  const door = WHEEL_DOORS.thunder;
  const wsB = fakeWs('b'), wsC = fakeWs('c');
  const psB = await join(wsB, 'bp_wd_b');
  const psC = await join(wsC, 'bp_wd_c');
  put(psA, 'wheel', door.at[0], door.at[1]);
  put(psB, 'wheel', door.at[0] + 200, door.at[1] + 100);
  put(psC, 'wheel', door.at[0] + 3000, door.at[1]);
  psA.level = psB.level = psC.level = 20;
  room._partyOf = (pid) => (['bp_wd_a', 'bp_wd_b', 'bp_wd_c'].includes(pid) ? { leader: 'bp_wd_a', members: ['bp_wd_a', 'bp_wd_b', 'bp_wd_c'] } : null);
  wsA.sent.length = 0; wsB.sent.length = 0; wsC.sent.length = 0;
  await startAt(wsA, 'thunder');
  const a = msgsOfType(wsA, 'dungeon_started')[0], b = msgsOfType(wsB, 'dungeon_started')[0], c = msgsOfType(wsC, 'dungeon_started')[0];
  check('party: a member beside the mouth comes in too, with the same way back out',
    !!a && !!b && b.payload.zone === a.payload.zone && !!b.payload.back && b.payload.back.x === door.back[0], { a: !!a, b: b && b.payload.back });
  check(`party: ...one ${3000} px away across the Wheel does not`, !c);
  delete room._partyOf;
  endRun(psA);
}

// ── 8. THE WORKSHOP ────────────────────────────────────────────────────────
{
  put(psA, 'farm_home', 300, 300);
  psA.level = 5;
  wsA.sent.length = 0;
  await startWorkshop(wsA, { waves: 2, monsterLevel: 3, monsters: [{ archetype: 'fodder', count: 3 }] });
  const s = msgsOfType(wsA, 'dungeon_started')[0];
  const wave = s ? room.monsters[s.payload.zone] : [];
  check('workshop: a Workshop dungeon starts as before -- no home, no way back, archetype monsters',
    !!s && !s.payload.back && !s.payload.cfg.home && wave.length === 3 && wave.every((m) => !m.home && m.arch === 'fodder'), s && s.payload);
  endRun(psA);
}

// ── 9. THE DEV OP ──────────────────────────────────────────────────────────
{
  const door = WHEEL_DOORS.sky;
  put(psA, 'wheel', door.at[0], door.at[1]);
  psA.level = 15;
  wsA.sent.length = 0;
  await startAt(wsA, 'sky');
  const s = msgsOfType(wsA, 'dungeon_started')[0];
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 400, y: 600, z: s.payload.zone }));
  const r = room._devClearWave('bp_wd_a');
  check('dev: clearwave ends the wave you stand in', r.ok === true && r.cleared > 0 && room.monsters[s.payload.zone].every((m) => !m.alive), r);
  const away = room._devClearWave('bp_wd_k');
  check('dev: ...and nothing for a player in no dungeon', away.ok === false, away);
  check('dev: the dungeon events stay server-only (PRIVILEGED_EVENTS)', ['dungeon_started', 'dungeon_wave', 'dungeon_boss', 'dungeon_complete', 'dungeon_error'].every((t) => PRIVILEGED_EVENTS.has ? PRIVILEGED_EVENTS.has(t) : PRIVILEGED_EVENTS.includes(t)));
  endRun(psA);
}

// ── 10. THE STARTER DUNGEON (v2.3.3540) ────────────────────────────────────
{
  const g = WHEEL_DOORS.verdant, g1 = SHORT.WHEEL_DOORS.verdant;
  check('starter: the Goo Grotto, the Verdant Wilds\' landmark, is baked on both Wheels at tier 1 (levels 1-5) and opened by the worker (LANDS)',
    !!g && !!g1 && g.name === 'the Goo Grotto' && g1.name === g.name && g.tier === 1 && g1.tier === 1
      && String(g.levels) === '1,5' && String(g1.levels) === '1,5' && WHEEL_DUNGEON.LANDS.verdant === 'toxic_swamp' && !!room._wheelDoor('verdant'), { g, g1 });
  /* where: on the Verdant Wilds' first stretch, west of town, a short walk
     (150 px a second) from where you arrive -- on both Wheels */
  const where = (T, d) => {
    const C = T.WHEEL_CENTRE, band = T.WHEEL_SPAWNS.verdant.band;
    return { r: Math.hypot(d.at[0] - C[0], d.at[1] - C[1]), band, west: d.at[0] < C[0], walkS: Math.hypot(d.at[0] - C[0], d.at[1] - (C[1] + 288)) / 150 };
  };
  const L = where({ WHEEL_CENTRE, WHEEL_SPAWNS }, g), S1 = where(SHORT, g1);
  check(`starter: ...on the Verdant Wilds' first stretch, west of town: ${Math.round(L.walkS)} s at a walk from where you arrive (the short Wheel ${Math.round(S1.walkS)} s)`,
    [L, S1].every((w) => w.r > w.band[0] && w.r < w.band[1] && w.west) && L.walkS > 20 && L.walkS < 60 && S1.walkS > 10 && S1.walkS < 60, { L, S1 });
  check('starter: ...its way back out a step from the mouth',
    Math.hypot(g.back[0] - g.at[0], g.back[1] - g.at[1]) >= 100 && Math.hypot(g.back[0] - g.at[0], g.back[1] - g.at[1]) <= 260);
  /* the landmark is its own clearing: no monster's place on it */
  const near = WHEEL_SPAWNS.verdant.points.reduce((m, p) => Math.min(m, Math.hypot(p[0] - g.at[0], p[1] - g.at[1])), Infinity);
  check(`starter: ...no monster stands at its mouth (the nearest place ${Math.round(near)} px off)`, near >= 200, near);

  const startGoo = async (level, dx = 0) => {
    put(psA, 'wheel', g.at[0] + dx, g.at[1]);
    psA.level = level;
    wsA.sent.length = 0;
    await startAt(wsA, 'verdant');
    const s = msgsOfType(wsA, 'dungeon_started')[0];
    const e = msgsOfType(wsA, 'dungeon_error')[0];
    return { s, e };
  };
  /* v2.3.3570: the Goo Grotto is a party dungeon now -- level 16 whoever
     comes in, its boss sized for three (wheeldungeon.js WHEEL_DUNGEON.PARTY;
     grotto-party.test.mjs).  These checks are the dungeon rule it had, and
     that every other world dungeon keeps, under the kill switch that brings
     it back (`partydungeon: false`). */
  room._liveFlags = { partydungeon: false };
  const { s } = await startGoo(3);
  const p = s && s.payload;
  check('starter (partydungeon: false): a level-3 player walks into a level-3 Goo Grotto: the Verdant Wilds\' monsters, the way back out at its mouth',
    !!p && p.cfg.name === 'the Goo Grotto' && p.cfg.home === 'verdant' && p.cfg.terrain === 'toxic_swamp' && p.cfg.monsterLevel === 3
      && String(p.cfg.levels) === '1,5' && !!p.back && p.back.x === g.back[0] && p.back.y === g.back[1], p);
  const wave = p ? room.monsters[p.zone] || [] : [];
  const want = ZONES.verdant.spawns.reduce((t, sp) => t + (sp.count || 0), 0);
  check(`starter: ...wave 1 the Verdant Wilds' whole spawn list (${wave.length} of ${want}: its slimes), at level 3 (v2.3.3556: no +0..2)`,
    wave.length === want && wave.every((m) => m.home === 'verdant' && m.level === 3), wave.map((m) => [m.home, m.level]));
  const inst = p ? [...room._dungeons.values()].find((i) => i.zone === p.zone) : null;
  /* in it: a run moves on only with someone inside (as the phone steps in) */
  if (p) await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 400, y: 600, z: p.zone }));
  for (let w = 2; inst && w <= WHEEL_DUNGEON.WAVES + 1; w++) {
    for (const m of room.monsters[p.zone]) { m.alive = false; m.hp = 0; }
    room._tickDungeons(Date.now());
  }
  const boss = p ? room.monsters[p.zone].find((m) => m.alive && m._dungeonBoss) : null;
  const last = ZONES.verdant.spawns[ZONES.verdant.spawns.length - 1];
  check(`starter: ...and its boss the Verdant Wilds' last kind at the dungeon's level (Lv ${boss && boss.level})`,
    !!boss && boss.arch === last.arch && boss.home === 'verdant' && boss.level === 3, boss && { arch: boss.arch, lv: boss.level });
  endRun(psA);
  const low = await startGoo(1);
  check('starter (partydungeon: false): a level-1 player meets level 1', !!low.s && low.s.payload.cfg.monsterLevel === 1, low.s && low.s.payload.cfg);
  endRun(psA);
  const high = await startGoo(40);
  check('starter (partydungeon: false): a level-40 player meets its top, level 5', !!high.s && high.s.payload.cfg.monsterLevel === 5, high.s && high.s.payload.cfg);
  endRun(psA);
  const far = await startGoo(3, WHEEL_DUNGEON.DOOR_R + 40);
  check('starter: ...and from too far off it is refused', !far.s && !!far.e && far.e.payload.code === 'not-here', far.e && far.e.payload);
  endRun(psA);
  room._liveFlags = {};
}

// ── 11. STRAIGHT BACK IN (v2.3.3556) ───────────────────────────────────────
{
  const d = WHEEL_DOORS.thunder;
  put(psA, 'wheel', d.at[0], d.at[1]);
  psA.level = 28;
  wsA.sent.length = 0;
  await startAt(wsA, 'thunder');
  const first = msgsOfType(wsA, 'dungeon_started')[0];
  const z1 = first && first.payload.zone;
  check('back in: a level-28 player opens a level-28 Foundry Dome, the top bar\'s one level (cfg.monsterLevel 28)',
    !!first && first.payload.cfg.monsterLevel === 28, first && first.payload.cfg);
  /* in, then out by its way out, and back to the mouth: the run is empty */
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 400, y: 600, z: z1 }));
  check('back in: (inside it)', psA.z === z1, psA.z);
  put(psA, 'wheel', d.at[0], d.at[1]);
  wsA.sent.length = 0;
  await startAt(wsA, 'thunder');
  const second = msgsOfType(wsA, 'dungeon_started')[0];
  const z2 = second && second.payload.zone;
  const mine = () => [...room._dungeons.values()].filter((i) => i.ownerId === 'bp_wd_a');
  check('back in: your last run EMPTY, the door ends it and opens another -- no "already running" (it said so for a minute)',
    !!z2 && z2 !== z1 && room.monsters[z1] === undefined && mine().length === 1 && mine()[0].zone === z2 && !msgsOfType(wsA, 'dungeon_error').length,
    { z1, z2, mine: mine().map((i) => i.zone), errs: msgsOfType(wsA, 'dungeon_error').map((e) => e.payload) });
  /* someone still inside keeps it running */
  const wsD = fakeWs('d');
  const psD = await join(wsD, 'bp_wd_d');
  put(psD, z2, 400, 600);
  wsA.sent.length = 0;
  await startAt(wsA, 'thunder');
  const e = msgsOfType(wsA, 'dungeon_error')[0];
  check('back in: ...but with someone still in it (your party) it keeps running: already-running',
    !!e && e.payload.code === 'already-running' && !msgsOfType(wsA, 'dungeon_started').length && mine().length === 1 && mine()[0].zone === z2,
    e && e.payload);
  /* a run of someone else's with nobody in it is never yours to end */
  put(psD, 'wheel', d.at[0] + 50, d.at[1]);
  const otherInst = { id: 'zzother', zone: 'dungeon:zzother', ownerId: 'bp_wd_d', cfg: run.inst.cfg, wave: 1, state: 'active', bossSpawned: false, createdAt: Date.now(), emptySince: 0, doneAt: 0 };
  room._dungeons.set('zzother', otherInst);
  room.monsters['dungeon:zzother'] = [];
  wsA.sent.length = 0;
  await startAt(wsA, 'thunder');
  check('back in: ...and another player\'s empty run is left alone',
    room._dungeons.has('zzother') && msgsOfType(wsA, 'dungeon_started').length === 1, [...room._dungeons.keys()]);
  room._dungeonCleanup(otherInst);
  endRun(psA);
}

// ── 12. A DEATH IN A DUNGEON KEEPS THE BAG (v2.3.3556) ─────────────────────
{
  const d = WHEEL_DOORS.verdant;
  const BAG = () => ({ bar_copper: 5, crop_carrot: 3, ore_copper_ore: 2 });
  const piles = (z) => (room.loot[z] || []).filter((l) => /^dd-bp_wd_a-/.test(l.lootId || ''));
  const died = () => msgsOfType(wsA, 'player_died').pop();
  const respawn = () => { psA.respawnAt = Date.now() - 1; room._tickPlayerRespawn(); };
  const dieIn = async (inDungeon) => {
    let z = 'wheel';
    put(psA, 'wheel', d.at[0], d.at[1]);
    psA.level = 3;
    if (inDungeon) {
      wsA.sent.length = 0;
      await startAt(wsA, 'verdant');
      z = msgsOfType(wsA, 'dungeon_started')[0].payload.zone;
      await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 400, y: 600, z }));
    } else {
      put(psA, 'wheel', d.at[0] + 600, d.at[1]);
    }
    psA.inventory = BAG();
    psA.hp = 0;
    wsA.sent.length = 0;
    room._handlePlayerDeath(psA, 'bp_wd_a', 'monster:dm-test');
    return z;
  };
  /* in the Goo Grotto */
  const zIn = await dieIn(true);
  const inv0 = Object.assign({}, psA.inventory), msg0 = died();
  check('bag: a death in a dungeon drops no pile and empties nothing (copper bars 5, carrots 3, ore 2)',
    /^dungeon:/.test(zIn) && piles(zIn).length === 0 && inv0.bar_copper === 5 && inv0.crop_carrot === 3 && inv0.ore_copper_ore === 2, { zIn, inv0, piles: piles(zIn).length });
  check('bag: ...and the worker says so (player_died keptBag 1)', !!msg0 && msg0.payload.keptBag === 1, msg0 && msg0.payload);
  respawn();
  check('bag: ...and the respawn five seconds on keeps it too (it wiped a second time, as it did a duel loser\'s)',
    psA.z === 'town' && psA.inventory.bar_copper === 5 && psA.inventory.crop_carrot === 3 && psA.inventory.ore_copper_ore === 2 && psA._deathKeepsBag === undefined,
    { z: psA.z, inv: psA.inventory });
  endRun(psA);
  /* in the world: as before */
  const zOut = await dieIn(false);
  const inv1 = Object.assign({}, psA.inventory), msg1 = died(), p1 = piles(zOut)[0];
  check('bag: a death in the world drops the bag as before (the pile holds the bars and carrots; the ore, a quest\'s, is kept), no keptBag',
    !!p1 && !inv1.bar_copper && !inv1.crop_carrot && inv1.ore_copper_ore === 2 && !!msg1 && !msg1.payload.keptBag,
    { inv1, pile: p1 && p1.items, msg: msg1 && msg1.payload });
  respawn();
  room.loot.wheel = (room.loot.wheel || []).filter((l) => !/^dd-bp_wd_a-/.test(l.lootId || ''));
  /* the kill switch */
  room._liveFlags = { dungeonbag: false };
  const zOff = await dieIn(true);
  const inv2 = Object.assign({}, psA.inventory);
  check('bag: `dungeonbag: false` in the live flags puts it back -- a pile in the run, the bag emptied',
    piles(zOff).length === 1 && !inv2.bar_copper && !inv2.crop_carrot, { inv2, piles: piles(zOff).length });
  respawn();
  room._liveFlags = {};
  endRun(psA);
  /* a red skull: No man's land's own rule for an outlaw killed "by a monster" */
  psA._nml = { red: Date.now() + 600000, white: 0, redMs: 600000 };
  const zRed = await dieIn(true);
  const inv3 = Object.assign({}, psA.inventory), msg3 = died();
  check('bag: a red skull\'s loss is still No man\'s land\'s, in a dungeon too (the bars and carrots gone, no keptBag)',
    !inv3.bar_copper && !inv3.crop_carrot && !!msg3 && !msg3.payload.keptBag, { inv3, msg: msg3 && msg3.payload, red: psA._nml });
  respawn();
  psA._nml = null;
  endRun(psA);
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nwheeldungeon: all passed');
