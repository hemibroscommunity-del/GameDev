/* Wind Dunes depth on the monster AI -- v2.3.2790 (step 2 of 3).
 *
 * Owner: "can the objects in the game, player, monsters, etc follow a
 * similar perspective changing pattern the more north on the map they get
 * and also slow the movement speed the further north they get".  The client
 * draws the curve (v2.3.2745); this suite pins the server half: every flat
 * distance the monster AI measures is multiplied by the same curve at the
 * monster's own feet, and NOTHING changes on any zone without a `depth` row.
 *
 *   1. The curve: 1 south / `far` north / 1 off the dunes / 1 for junk.
 *   2. Lockstep with the client's row (src/data/zones.js sky.depth).
 *   3. The paired rings: _basicAtkGeom and the tick's stop ring both scale.
 *   4. Behaviour on the north edge: a 60px gap is a CHASE there (it is a
 *      hold in meadow), a swing from inside the scaled ring lands, a chase
 *      settles at the scaled ring, the chase step is slower, and a player
 *      inside the flat aggro ring but outside the scaled one is ignored.
 *   5. The south edge behaves exactly like a flat zone.
 *   6. caps.zoneDepth is advertised, and the liveflags kill switch turns
 *      both the scaling and the advertisement off.
 */
import { GameRoom } from '../src/index.js';
import { ZONES as SERVER_ZONES } from '../src/data.js';
import { zoneDepthK } from '../src/depth.js';
import { ZONES as CLIENT_ZONES } from '../../src/data/zones.js';

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
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town' } }));
}

// ── 1. The curve ──
const FAR_K = SERVER_ZONES.sky.depth.far;
{
  check('curve: the south edge of Wind Dunes is full size', near(zoneDepthK('sky', 1024), 1));
  check('curve: the north edge is `far`', near(zoneDepthK('sky', 0), FAR_K), zoneDepthK('sky', 0));
  check('curve: halfway is halfway (linear, curve 1)',
    near(zoneDepthK('sky', 512), (1 + FAR_K) / 2), zoneDepthK('sky', 512));
  check('curve: clamped past either edge',
    near(zoneDepthK('sky', -500), FAR_K) && near(zoneDepthK('sky', 5000), 1));
  check('curve: every zone without a depth row is exactly 1',
    ['meadow', 'frost', 'town', 'worldview', 'dungeon-x'].every((z) => zoneDepthK(z, 0) === 1));
  check('curve: junk in is 1 out (proto key, NaN y)',
    zoneDepthK('__proto__', 0) === 1 && zoneDepthK('sky', NaN) === 1 && zoneDepthK('sky', 'x') === 1);
}

// ── 2. Lockstep with the client's row ──
{
  const c = CLIENT_ZONES.sky && CLIENT_ZONES.sky.depth;
  const s = SERVER_ZONES.sky.depth;
  const strip = (d) => { const o = { ...d }; delete o.preview; return o; };
  check('lockstep: the server curve is the client curve (minus the client-only `preview`)',
    !!c && JSON.stringify(strip(c)) === JSON.stringify(s), { client: c, server: s });
  check('lockstep: sky is the only zone with a depth row on either side',
    Object.keys(SERVER_ZONES).filter((z) => SERVER_ZONES[z].depth).join() === 'sky'
      && Object.keys(CLIENT_ZONES).filter((z) => CLIENT_ZONES[z].depth).join() === 'sky');
}

// ── 3. The paired rings ──
{
  const northM = { arch: 'stalker', y: 0 };
  check('rings: _basicAtkGeom with no zone is the flat ring (the tick.test probe)',
    room._basicAtkGeom(northM).range === room.MONSTER_ATTACK_RANGE);
  check('rings: _basicAtkGeom off the dunes is the flat ring',
    room._basicAtkGeom(northM, 'meadow').range === room.MONSTER_ATTACK_RANGE);
  check('rings: _basicAtkGeom on the north edge is the ring x far',
    near(room._basicAtkGeom(northM, 'sky').range, room.MONSTER_ATTACK_RANGE * FAR_K),
    room._basicAtkGeom(northM, 'sky'));
}

// ── 4/5. Behaviour ──
const ws = fakeWs('d');
await join(ws, 'bp_depth_a');
const firstSync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);   /* read before later sections clear ws.sent */
const ps = room.playerState['bp_depth_a'];
delete ps.prog3;
room._recomputeMaxes(ps);
ps.dead = false; ps.agility = 0; ps._zoneEntryGraceUntil = 0; ps.defenseSpec = {};
ps.maxHp = 100000; ps.hp = 100000;
ps.x = -100000; ps.y = -100000;
ps.z = 'sky';

const monsters = room._ensureZoneMonsters('sky');
check('sky lazily spawns monsters (guard)', monsters.length > 0, monsters.length);
const A = monsters.find((m) => m.arch === 'stalker') || monsters[0];
/* Park every other monster far away so only A can react. */
for (const m of monsters) {
  m._wanderPausedUntil = Date.now() + 600000;
  if (m !== A) { m.x = m.spawnX = 5000; m.y = m.spawnY = 5000; }
}
const clear = () => {
  room.dirtyMonsters.clear();
  room.dirtyMonsterIds = Object.create(null);
  room.eventBuffer.length = 0;
};
const park = (y, gap) => {
  A.alive = true; A.hp = A.maxHp;
  A.x = A.spawnX = 500; A.y = A.spawnY = y;
  A.targetId = null;
  A.atkCd = 0; A._attackingUntil = 0; A._kbDebt = 0; A._projImpactAt = 0;
  A._tgPhase = null; A._tgUntil = 0; A._tgNextAt = Date.now() + 1e9;
  A._bwUntil = 0; A._bwTarget = null; A._bwKind = null;
  A._aggroOverrideUntil = 0; A._aggroOverrideTarget = null;
  A._wanderPausedUntil = Date.now() + 600000;
  ps.z = 'sky'; ps.x = 500 + gap; ps.y = y;      /* same y: no Y-scale in play */
  ps.hp = ps.maxHp; ps.blocking = false; ps.dead = false; ps.dying = false;
  clear();
};
const land = () => {
  room._tickMonsters();
  if (A._bwUntil) { A._bwUntil = Date.now() - 1; room._tickMonsters(); }
  return room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === A.id);
};
const NORTH = 40;                               /* k ~ 0.44; inside the 32px edge pad the pulls clamp to */
const kN = zoneDepthK('sky', NORTH);
const SOUTH = 980;                              /* k ~ 0.97 */

{
  /* 45px: inside the flat 72 ring (a hold anywhere flat), outside the north
     ring (~31px) and inside the north aggro ring (~52px) -- so on the north
     edge it is a chase. */
  park(NORTH, 45);
  A.atkCd = Number.MAX_SAFE_INTEGER;
  const x0 = A.x;
  room._tickMonsters();
  check('north: a 45px gap is a CHASE on the north edge (it would be a hold on a flat zone)',
    A.x > x0, { before: x0, after: A.x, ring: 72 * kN });
  const step = A.x - x0;
  check('north: ...and the chase step is the monster\'s speed x the depth',
    near(step, A.spd * kN, 1e-6), { step, spd: A.spd, want: A.spd * kN });

  park(SOUTH, 45);
  A.atkCd = Number.MAX_SAFE_INTEGER;
  const xs = A.x;
  room._tickMonsters();
  check('south: the same 45px gap is a HOLD on the south edge, exactly like a flat zone',
    A.x === xs, { before: xs, after: A.x });

  /* Converge a north chase and measure where it pulls up. */
  park(NORTH, 48);                              /* inside the ~52px north aggro ring */
  for (let i = 0; i < 400; i++) {
    A._attackingUntil = 0; A._bwUntil = 0; A._bwTarget = null;
    A.atkCd = Number.MAX_SAFE_INTEGER;
    room._tickMonsters();
  }
  const settled = Math.abs(ps.x - A.x);
  check('north: a chase settles at the SCALED ring (~72 x far), not at 72',
    settled > 72 * kN - 3 && settled <= 72 * kN + 1, { settled, ring: 72 * kN });

  /* The reach moved with the ring: a swing from inside the scaled ring lands,
     one from outside it (but inside the flat 72) does not start at all. */
  park(NORTH, 25);
  const hitIn = land();
  check('north: a swing from 25px (inside the ~31px ring) lands',
    !!hitIn && hitIn.payload.dmgTaken > 0, hitIn && hitIn.payload);
  park(NORTH, 50);
  A.x = 500; const x50 = A.x;
  room._tickMonsters();
  check('north: from 50px it does not wind up a swing -- it walks in instead',
    !A._bwUntil && A.x > x50, { bw: A._bwUntil, moved: A.x - x50 });

  /* Aggro: stalker notices at 120 flat; ~52 on the north edge. */
  park(NORTH, 90);
  room._tickMonsters();
  check('north: a player 90px away is NOT noticed (flat ring 120, north ring ~52)',
    A.targetId == null, { targetId: A.targetId });
  park(SOUTH, 90);
  A.atkCd = Number.MAX_SAFE_INTEGER;
  room._tickMonsters();
  check('south: the same 90px IS noticed on the south edge',
    A.targetId === 'bp_depth_a', { targetId: A.targetId });
}

// ── 5b. v2.3.2790: YOUR reach -- the whirlwind circle and its gather ring ──
{
  const castWhirl = async (y, gap) => {
    park(y, 0);                                   /* player at (500, y), A reset */
    A.x = 500 + gap; A.y = y; A.spawnX = A.x; A.spawnY = y;
    A._stunUntil = 0; A.hp = A.maxHp = 100000;
    ps.weapon = { type: 'sword', tierMult: 1 };
    ps.stamina = ps.maxStamina = 1000;
    ps._abilCd = null; ps.dying = false; ps.disconnected = false;
    ws.sent.length = 0;
    room.eventBuffer.length = 0;
    await room.webSocketMessage(ws, JSON.stringify({ type: 'ability', payload: { kind: 'whirl' } }));
    const rej = ws.sent.filter((m) => m.type === 'ability_rejected').map((m) => m.payload.reason);
    return { rej, dist: Math.hypot(A.x - ps.x, A.y - ps.y) };
  };
  /* 150px: inside the flat 240 vacuum, outside the north one (~103). */
  const farN = await castWhirl(NORTH, 150);
  check('your reach: on the north edge a whirlwind does NOT pull a monster 150px away (its circle is 240 x depth)',
    farN.rej.includes('whiff') && Math.abs(farN.dist - 150) < 1, farN);
  const farS = await castWhirl(SOUTH, 150);
  check('your reach: ...the same cast on the south edge pulls it in, exactly like a flat zone',
    !farS.rej.length && Math.abs(farS.dist - 34 * zoneDepthK('sky', SOUTH)) < 1.5, farS);
  const nearN = await castWhirl(NORTH, 80);
  check('your reach: a north-edge monster inside the scaled circle is gathered to the SCALED ring (34 x depth)',
    !nearN.rej.length && Math.abs(nearN.dist - 34 * kN) < 1.5, { ...nearN, want: 34 * kN });
}

// ── 6. caps + the kill switch ──
{
  const sync = firstSync;
  check('caps: state_sync advertises zoneDepth', !!sync && sync.caps.zoneDepth === true, sync && sync.caps && sync.caps.zoneDepth);

  room._liveFlags = { ...(room._liveFlags || {}), zoneDepth: false };
  check('kill switch: zoneDepth:false makes the north edge flat again',
    room._depthK('sky', 0) === 1 && room._basicAtkGeom({ arch: 'stalker', y: 0 }, 'sky').range === room.MONSTER_ATTACK_RANGE);
  park(NORTH, 45);
  A.atkCd = Number.MAX_SAFE_INTEGER;
  const xk = A.x;
  room._tickMonsters();
  check('kill switch: ...so the 45px gap is a hold again', A.x === xk, { before: xk, after: A.x });

  const ws2 = fakeWs('d2');
  await join(ws2, 'bp_depth_b');
  const sync2 = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('kill switch: ...and the next join is told zoneDepth is off',
    !!sync2 && sync2.caps.zoneDepth === false, sync2 && sync2.caps && sync2.caps.zoneDepth);
  room._liveFlags.zoneDepth = true;
  check('kill switch: turning it back on restores the curve', near(room._depthK('sky', 0), FAR_K));
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall zonedepth checks passed');
process.exit(failures ? 1 : 0);
