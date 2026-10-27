/* The Goo Grotto, a dungeon built for a party (v2.3.3573, server/src/
 * wheeldungeon.js WHEEL_DUNGEON.PARTY, docs/specs/grotto-party.md).  The
 * owner: "I want the goo grotto dungeon to be very difficult without a party
 * of 2-3 people.  I'm assuming most people will be around lvl 10 and have iron
 * equipment ... with all stat points allocated before they attempt it."
 * Checks:
 *   1. THE LEVEL: the Grotto is level 16 whoever comes in -- a level-1, a
 *      level-10 and a level-40 player alike -- every wave monster and the boss
 *      with it, and the run says so (`levels` [16, 16], `partySize` 3).
 *   2. THE BOSS SIZED FOR THREE: one or two players inside meet the
 *      three-player boss (PARTY_HP_SCALE's 2.2); four, the four-player one.
 *   3. EVERY OTHER DUNGEON AS IT WAS: the Great Cave is the place's top and
 *      never above yours, its boss sized by who is inside.
 *   4. THE KILL SWITCH: caps.partydungeon advertised; `partydungeon: false`
 *      un-advertises it and plays the Grotto of v2.3.3540.
 *   5. THE WALL (found by the dungeon simulator, tools/dungeon-sim): a shove
 *      keeps a monster inside a dungeon's arena -- a hit's knockback, a bash,
 *      the whirlwind's pull, a burrow, the boss's charge and the splits'
 *      landing all read one box (dungeon.js _monsterBox); an ordinary zone's
 *      box is the one each clamp always had; the Wheel has none.
 *   6. THE PHONE'S WORDS: the world map's line and the one at the mouth.
 */
import { GameRoom } from '../src/index.js';
import { readFileSync } from 'fs';
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';
import { WHEEL_DOORS } from '../src/wheelspawns.js';
import { DUNGEONS } from '../src/dungeon.js';
import { ZONES } from '../src/data.js';
import { SLIME_BOSS } from '../src/slimeboss.js';
import { WHEEL_DUNGEON_PARTY, WHEEL_DUNGEON_REC, dungeonLevelsLine, dungeonDoorLine } from '../../src/data/wheelDungeons.js';

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
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  return room.playerState[id];
}
const put = (ps, z, x, y) => { ps.z = z; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false; };
const endRuns = () => { for (const inst of [...(room._dungeons || new Map()).values()]) room._dungeonCleanup(inst); };
const T = room.TILE;

const wsA = fakeWs('a');
const psA = await join(wsA, 'bp_gp_a');
const firstSync = msgsOfType(wsA, 'state_sync')[0];   /* the join's caps, read in §4 */
const others = [];
for (const id of ['bp_gp_b', 'bp_gp_c', 'bp_gp_d']) { const ws = fakeWs(id); others.push({ ws, ps: await join(ws, id), id }); }

/* A run at mouth `land` for a player of `level`: { s (dungeon_started), e
   (dungeon_error), zone, inst } */
async function start(land, level) {
  endRuns();
  const door = WHEEL_DOORS[land];
  put(psA, 'wheel', door.at[0], door.at[1]);
  psA.level = level;
  wsA.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'dungeon_start', payload: { entrance: land } }));
  const s = msgsOfType(wsA, 'dungeon_started')[0];
  const e = msgsOfType(wsA, 'dungeon_error')[0];
  const zone = s && s.payload.zone;
  const inst = zone ? [...room._dungeons.values()].find((i) => i.zone === zone) : null;
  return { s, e, zone, inst };
}
/* ...and its waves killed with `inside` players in it: the boss */
async function toBoss(land, level, inside) {
  const r = await start(land, level);
  if (!r.inst) return r;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 400, y: 600, z: r.zone }));
  for (const o of others) put(o.ps, 'town', 0, 0);
  for (const o of others.slice(0, inside - 1)) put(o.ps, r.zone, 500, 700);
  for (let w = 1; w <= WHEEL_DUNGEON.WAVES; w++) {
    for (const m of room.monsters[r.zone]) { m.alive = false; m.hp = 0; }
    room._tickDungeons(Date.now());
  }
  r.boss = room.monsters[r.zone].find((m) => m.alive && m._dungeonBoss);
  return r;
}
/* a level-`lvl` monster of the land's last kind, as a boss's body is made */
const lastKind = (land) => ZONES[land].spawns[ZONES[land].spawns.length - 1];
const bodyHp = (land, lvl) => room._makeZoneMonster(land, ZONES[land], lastKind(land), 'probe', 0, 0, lvl).maxHp;

// ── 1. THE LEVEL ───────────────────────────────────────────────────────────
{
  check('level: the Goo Grotto is a party dungeon, level 16, built for three (WHEEL_DUNGEON.PARTY)',
    !!WHEEL_DUNGEON.PARTY.verdant && WHEEL_DUNGEON.PARTY.verdant.level === 16 && WHEEL_DUNGEON.PARTY.verdant.size === 3
      && Object.keys(WHEEL_DUNGEON.PARTY).every((k) => Object.prototype.hasOwnProperty.call(WHEEL_DUNGEON.LANDS, k)),
    WHEEL_DUNGEON.PARTY);
  for (const lvl of [1, 10, 40]) {
    const { s, zone } = await start('verdant', lvl);
    const cfg = s && s.payload.cfg;
    const wave = zone ? room.monsters[zone] || [] : [];
    check(`level: a level-${lvl} player meets a level-16 Goo Grotto (levels [16, 16], built for three), every wave monster level 16`,
      !!cfg && cfg.monsterLevel === 16 && String(cfg.levels) === '16,16' && cfg.partySize === 3
        && wave.length === ZONES.verdant.spawns.reduce((t, sp) => t + (sp.count || 0), 0) && wave.every((m) => m.level === 16 && m.home === 'verdant'),
      cfg && { lvl: cfg.monsterLevel, levels: cfg.levels, size: cfg.partySize, wave: wave.map((m) => m.level) });
  }
  const r = await toBoss('verdant', 10, 1);
  check('level: ...and its boss, the Verdant Wilds\' last kind, at level 16 (every boss at its dungeon\'s level)',
    !!r.boss && r.boss.level === 16 && r.boss.arch === lastKind('verdant').arch, r.boss && { lv: r.boss.level, arch: r.boss.arch });
}

// ── 2. THE BOSS SIZED FOR THREE ────────────────────────────────────────────
{
  const base = bodyHp('verdant', 16);
  const want = (k) => Math.ceil(base * WHEEL_DUNGEON.BOSS_MULT * DUNGEONS.PARTY_HP_SCALE[k - 1]);
  for (const [inside, sized] of [[1, 3], [2, 3], [3, 3], [4, 4]]) {
    const r = await toBoss('verdant', 10, inside);
    check(`boss: ${inside} inside -> the ${sized}-player boss (${want(sized)} health: a level-16 slime's ${base} x ${WHEEL_DUNGEON.BOSS_MULT} x ${DUNGEONS.PARTY_HP_SCALE[sized - 1]})`,
      !!r.boss && r.boss.maxHp === want(sized) && r.boss.hp === want(sized), r.boss && { max: r.boss.maxHp, want: want(sized) });
  }
}

// ── 3. EVERY OTHER DUNGEON AS IT WAS ───────────────────────────────────────
{
  const top = WHEEL_DOORS.hollows.levels[1];
  const a = await start('hollows', 8);
  check('others: the Great Cave for a level-8 player is level 8 (the place\'s top, never above yours), no party size',
    !!a.s && a.s.payload.cfg.monsterLevel === 8 && a.s.payload.cfg.partySize === 0 && String(a.s.payload.cfg.levels) === `${WHEEL_DOORS.hollows.levels[0]},${top}`,
    a.s && a.s.payload.cfg);
  const b = await start('hollows', 60);
  check(`others: ...for a level-60 player its top, ${top}`, !!b.s && b.s.payload.cfg.monsterLevel === top, b.s && b.s.payload.cfg.monsterLevel);
  const r = await toBoss('hollows', 8, 1);
  const want = Math.ceil(bodyHp('hollows', 8) * WHEEL_DUNGEON.BOSS_MULT * DUNGEONS.PARTY_HP_SCALE[0]);
  check(`others: ...its boss sized by who is inside (one: ${want})`, !!r.boss && r.boss.maxHp === want, r.boss && { max: r.boss.maxHp, want });
}

// ── 4. THE KILL SWITCH ─────────────────────────────────────────────────────
{
  const sync = firstSync;
  check('switch: state_sync advertises caps.partydungeon', !!sync && !!sync.caps && sync.caps.partydungeon === true, sync && sync.caps && sync.caps.partydungeon);
  room._liveFlags = { partydungeon: false };
  const wsK = fakeWs('k');
  await join(wsK, 'bp_gp_k');
  const ks = msgsOfType(wsK, 'state_sync')[0];
  check('switch: `partydungeon: false` un-advertises it (the phone shows the place\'s levels again)', !!ks && ks.caps.partydungeon === false, ks && ks.caps.partydungeon);
  const low = await start('verdant', 3);
  const high = await start('verdant', 40);
  check('switch: ...and plays the Grotto of v2.3.3540: a level-3 player meets level 3, a level-40 its top (5), no party size',
    !!low.s && low.s.payload.cfg.monsterLevel === 3 && low.s.payload.cfg.partySize === 0 && !!high.s && high.s.payload.cfg.monsterLevel === 5
      && String(high.s.payload.cfg.levels) === '1,5',
    { low: low.s && low.s.payload.cfg, high: high.s && high.s.payload.cfg });
  const r = await toBoss('verdant', 3, 1);
  const want = Math.ceil(bodyHp('verdant', 3) * WHEEL_DUNGEON.BOSS_MULT * DUNGEONS.PARTY_HP_SCALE[0]);
  check(`switch: ...its boss sized by who is inside (one: ${want})`, !!r.boss && r.boss.maxHp === want, r.boss && { max: r.boss.maxHp, want });
  room._liveFlags = {};
}

// ── 5. THE WALL ────────────────────────────────────────────────────────────
{
  const r = await start('verdant', 10);
  const inst = r.inst;
  const W = inst.cfg.width * T, H = inst.cfg.height * T;
  const box = room._monsterBox(r.zone);
  check(`wall: a world dungeon's box is its arena's floor (x ${2 * T}-${W - 2 * T}, y ${WHEEL_DUNGEON.TOP_ROW * T}-${H - 4 * T}: the walls the phone draws, the rows a wave stands from)`,
    !!box && box.x0 === 2 * T && box.x1 === W - 2 * T && box.y0 === WHEEL_DUNGEON.TOP_ROW * T && box.y1 === H - 4 * T, box);
  const mz = room._monsterBox('meadow');
  check('wall: ...an ordinary zone\'s, its map less a tile (the clamp each shove always had)',
    !!mz && mz.x0 === T && mz.x1 === ZONES.meadow.w * T - T && mz.y0 === T && mz.y1 === ZONES.meadow.h * T - T, mz);
  check('wall: ...the Wheel\'s, none (nothing moved), nor a dungeon no longer running',
    room._monsterBox('wheel') === null && room._monsterBox('dungeon:nope') === null && room._monsterBox(null) === null);
  /* a real hit: a slime at the west wall, the player east of it */
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: box.x0 + 40, y: 500, z: r.zone }));
  psA.x = box.x0 + 40; psA.y = 500;
  psA.weapon = { type: 'greatsword', name: 'Test Sword', tierMult: 1.25, quality: 'normal' };
  psA.activeSlot = 'melee';
  const m = room.monsters[r.zone][0];
  for (const o of room.monsters[r.zone]) if (o !== m) { o.alive = false; o.hp = 0; }
  m.x = box.x0 + 2; m.y = 500; m.hp = m.maxHp * 10; m.maxHp = m.hp;
  const hp0 = m.hp;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m.id, zone: r.zone, element: null, slot: 'melee', special: false } }));
  check(`wall: a sword's hit at the west wall lands and its knockback stops at the arena's edge (x ${Math.round(m.x)} >= ${box.x0}) -- it put the slime in the wall, where no sword reached it`,
    m.hp < hp0 && m.x >= box.x0 && m.x <= box.x0 + 1, { hp0, hp: m.hp, x: m.x });
  /* the north edge, the rows under the top bar */
  m.x = 500; m.y = box.y0 + 3;
  psA.x = 500; psA.y = box.y0 + 43;
  const y0 = m.y;
  room.lastHitTime = {};
  if (room._monsterHitLanes && room._monsterHitLanes.clear) room._monsterHitLanes.clear();
  const t0 = Date.now;
  Date.now = () => t0() + 5000;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m.id, zone: r.zone, element: null, slot: 'melee', special: false } }));
  Date.now = t0;
  check(`wall: ...and at the north edge it stops at the first row a wave stands in (y ${Math.round(m.y)} >= ${box.y0})`, m.y >= box.y0 && m.y <= y0, { y: m.y, y0: box.y0 });
  /* every shove reads the one box */
  const sites = [
    ['src/combat.js', 1], ['src/abilities.js', 2], ['src/telegraph.js', 1], ['src/dungeon.js', 1],
  ];
  const off = sites.filter(([f, n]) => (readFileSync(new URL('../' + f, import.meta.url), 'utf8').match(/this\._keepMonsterIn\(/g) || []).length !== n);
  check('wall: ...the hit\'s knockback, the bash and the whirlwind\'s pull, the burrow and the boss\'s charge each keep the monster in (_keepMonsterIn)',
    off.length === 0, off);
  const sb = readFileSync(new URL('../src/slimeboss.js', import.meta.url), 'utf8');
  check('wall: ...and the giant\'s split slimes land inside the same box', /this\._monsterBox\(inst\.zone\)/.test(sb));
  const leftover = ['src/combat.js', 'src/abilities.js', 'src/telegraph.js'].filter((f) => /const (?:zoneCfg|_z) = this\._getZoneConfig\(zone(?:Id)?\);\s*\n\s*if \((?:zoneCfg|_z)\) \{\s*\n\s*const (?:W|_pad)/.test(readFileSync(new URL('../' + f, import.meta.url), 'utf8')));
  check('wall: ...no clamp asks _getZoneConfig alone any more (it knows no dungeon zone)', leftover.length === 0, leftover);
  /* the giant's splits: run one and look where its slimes land */
  const R = await toBoss('verdant', 10, 1);
  const boss = R.boss;
  const bb = room._monsterBox(R.zone);
  let t = Date.now() + 10;
  boss.x = (bb.x0 + bb.x1) / 2; boss.y = bb.y1 - 20;   /* hard by the bottom wall */
  room._applyMonsterDot(R.zone, boss, boss.maxHp * 10, psA.id, 'burn');
  room._tickDungeons(t);
  const before = room.monsters[R.zone].length;
  t += SLIME_BOSS.SWELL_MS + 10;
  room._tickDungeons(t);
  const fresh = room.monsters[R.zone].slice(before);
  check(`wall: ...a split by the bottom wall lands all ${fresh.length} slimes on the floor (y <= ${bb.y1}; it was ${H - 2 * T}, in the wall)`,
    fresh.length === SLIME_BOSS.SPAWN[0] && fresh.every((m) => m.x >= bb.x0 && m.x <= bb.x1 && m.y >= bb.y0 && m.y <= bb.y1),
    fresh.map((m) => [Math.round(m.x), Math.round(m.y)]));
  endRuns();
}

// ── 6. THE PHONE'S WORDS ───────────────────────────────────────────────────
{
  const p = WHEEL_DUNGEON_PARTY.verdant;
  check('words: the world map says "Lv 16 · 2–3 players" under the Grotto\'s name ("dungeon · Lv 16 · 2–3 players" lost to the stage\'s name, mp-googrotto), the place\'s levels for any other',
    dungeonLevelsLine(p, [1, 5]) === 'Lv 16 · 2–3 players' && dungeonLevelsLine(null, [26, 30]) === 'dungeon · Lv 26–30' && dungeonLevelsLine(null, null) === 'dungeon',
    [dungeonLevelsLine(p, [1, 5]), dungeonLevelsLine(null, [26, 30])]);
  check('words: ...and its mouth "Lv 16 · for 2–3 players" under the Enter button, nothing under any other',
    dungeonDoorLine(p) === 'Lv 16 · for 2–3 players' && dungeonDoorLine(null) === null, dungeonDoorLine(p));
  const gw = readFileSync(new URL('../../src/game/wheelDungeons.js', import.meta.url), 'utf8');
  check('words: ...only against a worker that plays it so (caps.partydungeon)', /S\._serverCaps\.partydungeon !== true\) return null/.test(gw));
  /* v2.3.3608: the words say the level it is FOR -- the owner: "Change the
     recommended level for the slime grotto dungeon to lvl 10 (don't change
     any difficulty settings)" -- its monsters stay the worker's 16 */
  const r = WHEEL_DUNGEON_REC.verdant;
  check('words: v2.3.3608 the Grotto is for level 10: "Lv 10+ · 2–3 players" on the map, "Lv 10+ · for 2–3 players" at its door, the monsters still level 16',
    r === 10 && dungeonLevelsLine(p, [1, 5], r) === 'Lv 10+ · 2–3 players' && dungeonDoorLine(p, r) === 'Lv 10+ · for 2–3 players'
      && p.level === 16 && WHEEL_DUNGEON.PARTY.verdant.level === 16, [dungeonLevelsLine(p, [1, 5], r), dungeonDoorLine(p, r)]);
  check('words: ...the phone asks with it, both lines', /dungeonLevelsLine\(wheelDungeonParty\(S, id\), levels, recOf\(id\)\)/.test(gw)
    && /dungeonDoorLine\(wheelDungeonParty\(S, id\), recOf\(id\)\)/.test(gw));
  const gs = readFileSync(new URL('../../src/data/gameSystems.js', import.meta.url), 'utf8');
  check('words: ...and the Mayor\'s line says the same level as the map (GROTTO_REC_LEVEL = WHEEL_DUNGEON_REC.verdant)',
    new RegExp(`var GROTTO_REC_LEVEL = ${r};`).test(gs));
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nALL PASS');
