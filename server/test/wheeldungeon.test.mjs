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
 *   6. THE RUN: three waves, then the boss -- the land's last kind, five
 *      levels up, scaled as any dungeon boss, with its kit -- then the clear,
 *      paid by the dungeon formula; a kill counts for the land.
 *   7. THE PARTY: a member near the mouth comes in, one across the Wheel does
 *      not.
 *   8. THE WORKSHOP'S dungeons are as they were.
 *   9. THE DEV OP clearwave ends the wave you stand in (QA, admin-gated).
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';
import { WHEEL_DOORS } from '../src/wheelspawns.js';
import { DUNGEONS } from '../src/dungeon.js';
import { ZONES, monsterHpFlat } from '../src/data.js';

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
  check('mouths: the Great Cave, the Foundry Dome and the Buried City, by name',
    WHEEL_DOORS.hollows.name === 'the Great Cave' && WHEEL_DOORS.thunder.name === 'the Foundry Dome' && WHEEL_DOORS.sky.name === 'the Buried City',
    Object.fromEntries(Object.entries(WHEEL_DOORS).map(([k, d]) => [k, d.name])));
  check('mouths: each at its tier\'s levels (the Cave and the Dome 26-30, the City 41-45)',
    String(WHEEL_DOORS.hollows.levels) === '26,30' && String(WHEEL_DOORS.thunder.levels) === '26,30' && String(WHEEL_DOORS.sky.levels) === '41,45',
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
  check('start: ...each of the land, its own look, at the run\'s level (+0..2), staying dead once dead',
    wave.every((m) => m.home === 'hollows' && m.noRespawn === true && m.respawnAt === 0 && m.alive && m.level >= 12 && m.level <= 14),
    wave.map((m) => ({ home: m.home, v: m.variant, lv: m.level })));
  const ref = room._makeZoneMonster('hollows', zone, zone.spawns[0], 'ref', 0, 0, wave[0].level);
  const w0 = wave.find((m) => m.arch === zone.spawns[0].arch && m.level === wave[0].level) || wave[0];
  check('start: ...built by the land\'s own math (the same variant, HP, damage and XP as the land builds at that level)',
    w0.variant === ref.variant && w0.maxHp === ref.maxHp && w0.dmg === ref.dmg && w0.xp === ref.xp, { got: [w0.variant, w0.maxHp, w0.dmg, w0.xp], want: [ref.variant, ref.maxHp, ref.dmg, ref.xp] });
  check('start: ...inside the arena\'s upper half, below the rows the top bar covers', wave.every((m) => m.x > 0 && m.x < WHEEL_DUNGEON.WIDTH * room.TILE && m.y >= WHEEL_DUNGEON.TOP_ROW * room.TILE && m.y < WHEEL_DUNGEON.HEIGHT / 2 * room.TILE));
  wsA.sent.length = 0;
  await startAt(wsA, 'hollows');
  const e = msgsOfType(wsA, 'dungeon_error')[0];
  check('start: one run each, as any dungeon (already-running)', !!e && e.payload.code === 'already-running', e && e.payload);
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
  check('run: then the boss -- the land\'s last kind, five levels up, its own look', !!bossEv && !!boss && boss.arch === last.arch && boss.level === run.inst.cfg.monsterLevel + 5 && boss.home === 'hollows', boss && { arch: boss.arch, lv: boss.level, home: boss.home });
  const plain = room._makeZoneMonster('hollows', zone, last, 'ref', 0, 0, boss.level);
  const flat = monsterHpFlat(boss.level);
  check('run: ...scaled as any dungeon boss (HP x BOSS_MULT for one, damage x1.5) with its kit',
    boss.maxHp === Math.ceil((plain.maxHp - flat) * WHEEL_DUNGEON.BOSS_MULT * DUNGEONS.PARTY_HP_SCALE[0]) + flat
      && boss.dmg === Math.ceil(plain.dmg * 1.5) && Array.isArray(boss._abilities) && boss._abilities.length >= 2,
    { hp: boss.maxHp, plain: plain.maxHp, dmg: boss.dmg, kit: boss._abilities });
  check('run: a kill in it counts for its land (its shard, its quests)', room._rewardZone(run.zone, boss) === 'hollows');
  boss.alive = false; boss.hp = 0;
  wsA.sent.length = 0;
  room._tickDungeons(Date.now());
  const done = msgsOfType(wsA, 'dungeon_complete')[0];
  const lvl = run.inst.cfg.monsterLevel;
  check(`run: the clear pays the dungeon formula (${30 * WHEEL_DUNGEON.WAVES + lvl * 2} gold, ${80 * WHEEL_DUNGEON.WAVES + lvl * 5} XP)`,
    !!done && done.payload.gold === 30 * WHEEL_DUNGEON.WAVES + lvl * 2 && done.payload.xp === 80 * WHEEL_DUNGEON.WAVES + lvl * 5 && psA.coins === coins0 + done.payload.gold,
    done && done.payload);
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

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nwheeldungeon: all passed');
