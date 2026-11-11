/* v2.3.4843: A WORLD MONSTER'S ONE RESET FOR A NEW LIFE (monsterlife.js;
 * STATE-MACHINES.md "what is left"; the sweep's V7).
 *   1. every per-monster `_` field the worker writes (each write in server/src)
 *      is in MONSTER_LIFE: wiped for a new life, or kept with its reason --
 *      a new field in no list fails here
 *   2. a monster killed mid-everything comes back clean through the real
 *      tick: the old list's fields, and what it missed (a stun, the swing's
 *      freeze, the sticky aggro, the swell's marks, the wander leg)
 *   3. `m.life` counts its lives
 *   4. what is kept is kept (a kit's cooldown)
 *   5. `monsterlife: false`: the old list only, no count
 */
import { readFileSync, readdirSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let ML = null;
try { ML = (await import('../src/monsterlife.js')).MONSTER_LIFE; } catch (e) { ML = null; }

// ── 1. every field in a list ──
{
  const dir = new URL('../src/', import.meta.url);
  const seen = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const mt of src.matchAll(/\bm\.(_[A-Za-z0-9]+)\s*(?:=(?!=)|\+=|-=)/g)) if (!seen.has(mt[1])) seen.set(mt[1], f);
  }
  const known = ML ? new Set([...ML.RESET, ...Object.keys(ML.NEW), ...Object.keys(ML.KEPT)]) : new Set();
  const missing = [...seen].filter(([k]) => !known.has(k)).map(([k, f]) => k + ' (' + f + ')');
  check(`1. every one of the ${seen.size} per-monster fields the worker writes is wiped for a new life or kept with a reason`, !!ML && seen.size > 30 && missing.length === 0, missing);
  const both = ML ? ML.RESET.filter((k) => Object.prototype.hasOwnProperty.call(ML.KEPT, k) || Object.prototype.hasOwnProperty.call(ML.NEW, k)) : [];
  check('1b. no field is both wiped and kept', both.length === 0, both);
}

// ── 2 to 5: the real tick's respawn edge ──
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(), delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const room = new GameRoom(makeState(), mockEnv);
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const m = Array.isArray(wheel) ? wheel[0] : null;
/* the tick's loop over this one monster: the Wheel active, nobody near */
room.monsters[WHEEL_ZONE] = m ? [m] : [];
room._activeZones = () => [WHEEL_ZONE];
check('2. setup: a world monster to kill', !!m);

const dirty = () => {
  Object.assign(m, {
    alive: false, hp: 0, respawnAt: Date.now() - 1, targetId: 'bp_x',
    _bwUntil: Date.now() + 9e5, _tgPhase: 'telegraph',
    _projImpactAt: Date.now() + 9e5, _kbDebt: 40,
    _stunUntil: Date.now() + 9e5, _attackingUntil: Date.now() + 9e5,
    _aggroOverrideUntil: Date.now() + 9e5, _aggroOverrideTarget: 'bp_x',
    _burstR: 120, _burstHitKiller: true, _burContactNextAt: Date.now() + 9e5,
    _wanderTx: 1, _wanderTy: 2, _wanderPausedUntil: Date.now() + 9e5, _ftX: 3, _ftY: 4,
  });
};
const respawn = () => {
  /* one pass of the real tick's monster loop over this zone */
  room._tickMonsters();
};
if (m) {
  const tgNext = Date.now() + 9e5;
  dirty();
  m._tgNextAt = tgNext;
  delete m.life;
  try { respawn(); } catch (e) { console.log('tick threw', e && e.message); }
  check('2a. it comes back alive at full health with the old list wiped (a wind-up, a cast, a ball, a push)',
    m.alive && m.hp === m.maxHp && !m._bwUntil && !m._tgPhase && !m._projImpactAt && !m._kbDebt && !m.targetId, { alive: m.alive, hp: m.hp });
  check('2b. ...and what the old list missed: a stun, the swing\'s freeze, the sticky aggro, the swell\'s marks, the wander leg, the fire trail',
    !m._stunUntil && !m._attackingUntil && !m._aggroOverrideUntil && m._aggroOverrideTarget == null && !m._burstR && !m._burstHitKiller
    && !m._burContactNextAt && m._wanderTx == null && m._wanderTy == null && !m._wanderPausedUntil && m._ftX == null && m._ftY == null,
    { stun: m._stunUntil, att: m._attackingUntil, ag: m._aggroOverrideUntil, br: m._burstR, bhk: m._burstHitKiller, w: [m._wanderTx, m._wanderPausedUntil], ft: m._ftX });
  check('3. `m.life` counts its lives: the first respawn is life 2', m.life === 2, m.life);
  dirty(); respawn();
  check('3b. ...and the next is life 3', m.life === 3, m.life);
  check('4. a kit\'s cooldown is kept across lives (v2.3.3634)', m._tgNextAt === tgNext, m._tgNextAt);
  room._liveFlags = { ...(room._liveFlags || {}), monsterlife: false };
  dirty(); respawn();
  check('5. `monsterlife: false`: the old list only (a stun survives), and no count', m.alive && !m._bwUntil && m._stunUntil > Date.now() && m.life === 3, { stun: m._stunUntil, life: m.life });
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
