/* A monster's hit carries its element — v2.3.2996 (server/src/monsterstatus.js;
 * spec docs/specs/monster-statuses.md).
 *
 * Owner, 2026-10-03: a snowflake and a second's slow from the snowman's
 * snowball, burning tick damage with a fire icon from the fire goblin, an air
 * icon and a shove back from the desert mummy, and "slime for floral damage
 * ... a brief held in place effect".
 *
 *   1. WHICH MONSTERS: the four elements that do something, by the element
 *      each monster's home gives it; the other four carry nothing at all.
 *   2. WHAT LANDS: a landed hit carries its status; a dodge, a block, the
 *      zone-entry grace, a killing blow carry the element's name only.
 *   3. CHILL: the snowman's hit chills for CHILL.MS (the client's walk, pinned
 *      against the client's own number in mirror-audit).
 *   4. BURN: the fire goblin's hit sets you burning; the ticks are the worker's,
 *      priced as elemental, announced as monster_attack `ability: 'burn'`, three
 *      and done; a second hit refreshes, never stacks; no tick over the
 *      no-one-shot rail; put out on the Wheel's safe ground, by a zone change,
 *      by death; skipped on a harvester.
 *   5. GUST: the mummy's hit shoves you GUST.PX straight away from it; the
 *      worker's speed bound widens by exactly what it granted, spent as it is
 *      used and gone after ALLOW_MS -- and never without a gust.
 *   6. STUCK: the blue slime's hit holds you for STUCK.MS, and not again until
 *      IMMUNE_MS after (six slimes cannot hold you for good).
 *   7. THE TELEGRAPHED HITS carry it too; the fire trail names its flame.
 *   8. THE KILL SWITCH: `elemhits: false` stops every new status.
 *   9. THE WIRE: additive fields on monster_attack only -- no new event type --
 *      and a plain hit's payload is exactly what it was.
 *
 * v2.3.3013, the other four ("stone stuns briefly; storm shocks nearby
 * players; water slows stamina refill; venom poisons over time" -- the owner:
 * "Yes continue working on those items"):
 *  10. DAZE: the rock monster's hit dazes you for DAZE.MS, and not again until
 *      IMMUNE_MS after.
 *  11. SHOCK: the storm slime's hit arcs to every other player within SHOCK.R
 *      (the nearest MAX_ARCS), PCT of it each under the no-one-shot rail, from
 *      where you stand -- never to the far, the dead, a harvester or anyone on
 *      the safe ground; an arc that kills goes through the death path.
 *  12. SOAK: the fishman's hit soaks you; the regen tick refills your stamina
 *      at SOAK.REGEN_MULT while it lasts, and exactly as before after.
 *  13. POISON: the venom monsters' hit poisons -- the burn's machinery in its
 *      own Map: five ticks, refreshed never stacked, the rail, put out by the
 *      same things, and alongside a burn without touching it.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { ELEM_HITS, CHILL, BURN, GUST, STUCK, DAZE, SHOCK, SOAK, POISON } from '../src/monsterstatus.js';
import { ZONES } from '../src/data.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* Every hit below is a sure hit: _applyDamage rolls a Dodge with Math.random,
   and a test that passes on a lucky roll pins nothing. */
const realRandom = Math.random;
Math.random = () => 0.999;

const room = new GameRoom(mockState, mockEnv);
const ws = fakeWs('p');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'p1', name: 'Player', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: 21504, y: 21792, z: WHEEL_ZONE }));
const ps = room.playerState.p1;
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const of = (home) => wheel.find((m) => m.home === home);

/* A point out along a land's spoke, `r` px from the centre: off the safe
   ground when r > WHEEL_SAFE_R. */
function alongSpoke(m, r) {
  const ux = m.spawnX - WHEEL_CENTRE[0], uy = m.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  return { x: WHEEL_CENTRE[0] + (ux / ul) * r, y: WHEEL_CENTRE[1] + (uy / ul) * r };
}
/* Monster m and the player 30 px apart, out on m's spoke, the player fresh. */
function stage(m, opts) {
  const o = opts || {};
  const p = alongSpoke(m, WHEEL_SAFE_R + 400);
  m.x = p.x; m.y = p.y; m.alive = true;
  ps.x = p.x + 30; ps.y = p.y;
  ps.z = WHEEL_ZONE; ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps.hp = o.hp != null ? o.hp : (ps.maxHp || 100);
  ps.blocking = false; ps._zoneEntryGraceUntil = 0; ps._godUntil = 0;
  ps._chillUntil = 0; ps._stuckUntil = 0; ps._stuckImmuneUntil = 0; ps._gustLeft = 0; ps._gustUntil = 0;
  ps._dazeUntil = 0; ps._dazeImmuneUntil = 0; ps._soakUntil = 0;   /* v2.3.3013 */
  if (room._burns) room._burns.clear();
  if (room._poisons) room._poisons.clear();
  room.extractions && room.extractions.delete && room.extractions.delete('p1');
  room.eventBuffer.length = 0;
}
const attacks = () => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === 'p1');
const lastHit = () => { const a = attacks(); return a.length ? a[a.length - 1].payload : null; };
const strike = (m) => { room._monsterStrikePlayer(WHEEL_ZONE, m, 'p1', m.x, m.y); return lastHit(); };

// ── 1. WHICH MONSTERS ─────────────────────────────────────────────────────
{
  check('which: the eight elements and what each does (v2.3.3013: stone, storm, water and venom too)',
    ELEM_HITS.frost === 'chill' && ELEM_HITS.flame === 'burn' && ELEM_HITS.wind === 'gust' && ELEM_HITS.flora === 'stuck'
      && ELEM_HITS.stone === 'daze' && ELEM_HITS.storm === 'shock' && ELEM_HITS.water === 'soak' && ELEM_HITS.venom === 'poison'
      && Object.keys(ELEM_HITS).length === 8, ELEM_HITS);
  const want = { frost: 'frost', ember: 'flame', sky: 'wind', verdant: 'flora', hollows: 'stone', thunder: 'storm', tidal: 'water', mist: 'venom' };
  const got = {};
  for (const h of Object.keys(want)) got[h] = room._elemHitOf(of(h));
  check('which: the snowman frost, the fire goblin flame, the mummies wind, the blue slime flora, the rock monster stone, the Storm Peaks\' slime storm, the fishman water, the wisps venom',
    Object.keys(want).every((h) => got[h] === want[h]), got);
  check('which: every one of the Mire\'s two kinds (wisps and lurkers) is venom', wheel.filter((m) => m.home === 'mist').every((m) => room._elemHitOf(m) === 'venom'));
  const plain = room._makeZoneMonster('meadow', ZONES.meadow, ZONES.meadow.spawns[0], 'plain-0', 512, 512);
  check('which: a monster with no element (the meadow\'s) carries nothing', room._elemHitOf(plain) === null, plain.element);
  check('which: every mummy (stalker, hexer, volatile) blows', wheel.filter((m) => m.home === 'sky').every((m) => room._elemHitOf(m) === 'wind'));
  check('which: a monster with a forged element is not believed', room._elemHitOf({ element: '__proto__' }) === null && room._elemHitOf({ element: 'toString' }) === null);
}

// ── 2. WHAT LANDS ─────────────────────────────────────────────────────────
{
  const m = of('frost');
  stage(m);
  const res = { dodged: true, dmgTaken: 0 };
  const dodge = room._elemOnHit(WHEEL_ZONE, m, 'p1', ps, res, Date.now());
  check('lands: a dodge carries the element\'s name and nothing else', dodge && dodge.elem === 'frost' && !('st' in dodge) && !ps._chillUntil, dodge);
  const grace = room._elemOnHit(WHEEL_ZONE, m, 'p1', ps, { dodged: false, graced: true, dmgTaken: 0 }, Date.now());
  check('lands: a graced hit (zone entry) carries nothing', grace && !('st' in grace) && !ps._chillUntil, grace);
  ps.hp = 0;
  const dead = room._elemOnHit(WHEEL_ZONE, m, 'p1', ps, { dodged: false, dmgTaken: 5 }, Date.now());
  check('lands: a killing blow carries nothing (no burn on a corpse)', dead && !('st' in dead), dead);
  stage(m);
  ps._zoneEntryGraceUntil = Date.now() + 5000;
  const g = strike(m);
  check('lands: a real graced swing: elem only', g && g.elem === 'frost' && g.st === undefined && g.dmgTaken === 0, g);
  stage(m);
  const hit = strike(m);
  check('lands: a landed hit carries its status', hit && hit.elem === 'frost' && hit.st === 'chill' && hit.dmgTaken > 0, hit);
}

// ── 3. CHILL ──────────────────────────────────────────────────────────────
{
  const m = of('frost');
  stage(m);
  const t0 = Date.now();
  const hit = strike(m);
  check('chill: the snowman chills for CHILL.MS', hit.st === 'chill' && hit.stMs === CHILL.MS && hit.kb === undefined, hit);
  check('chill: ...and the worker knows until when', ps._chillUntil >= t0 + CHILL.MS && ps._chillUntil <= Date.now() + CHILL.MS, ps._chillUntil - t0);
  check('chill: about a second, at about half speed (the owner\'s "slowing down for a second")', CHILL.MS === 1000 && CHILL.MULT > 0.3 && CHILL.MULT < 0.8);
}

// ── 4. BURN ───────────────────────────────────────────────────────────────
{
  const m = of('ember');
  stage(m);
  const t0 = Date.now();
  const hit = strike(m);
  check('burn: the fire goblin sets you burning', hit.elem === 'flame' && hit.st === 'burn' && hit.stMs === BURN.TICKS * BURN.EVERY_MS, hit);
  const b = room._burns && room._burns.get('p1');
  check('burn: three ticks of 20% of its hit, the first a second out',
    !!b && b.left === BURN.TICKS && b.dmg === Math.max(1, Math.round(m.dmg * BURN.PCT)) && b.next >= t0 + BURN.EVERY_MS && b.mid === m.id, b);
  check('burn: the burns are a Map (player ids are client-supplied)', room._burns instanceof Map);

  room.eventBuffer.length = 0;
  room._tickMonsterBurns(b.next - 1);
  check('burn: nothing before the tick is due', attacks().length === 0, attacks().length);
  const hp0 = ps.hp;
  room._tickMonsterBurns(b.next);
  const tick = lastHit();
  check('burn: a tick is a monster_attack the worker resolved (ability burn), named flame',
    !!tick && tick.ability === 'burn' && tick.elem === 'flame' && tick.monsterId === m.id && tick.zone === WHEEL_ZONE, tick);
  check('burn: ...that takes the HP it says', tick && tick.dmgTaken > 0 && ps.hp === hp0 - tick.dmgTaken, { hp0, hp: ps.hp, tick });
  check('burn: ...from where you are (the client points feedback there)', tick && tick.attackerX === ps.x && tick.attackerY === ps.y);
  check('burn: ...and carries no status of its own (a tick is not a new hit)', tick && tick.st === undefined && tick.kb === undefined, tick);
  const next1 = b.next;
  room._tickMonsterBurns(next1);
  room._tickMonsterBurns(b.next);
  check('burn: three ticks, then it is out', attacks().length === 3 && !room._burns.has('p1'), { n: attacks().length, has: room._burns.has('p1') });
  room._tickMonsterBurns(Date.now() + 60000);
  check('burn: ...and stays out', attacks().length === 3);

  /* a second hit refreshes, never stacks */
  stage(m);
  strike(m);
  const b1 = room._burns.get('p1');
  const nextA = b1.next;
  b1.left = 1;
  strike(m);
  const b2 = room._burns.get('p1');
  check('burn: a second hit restarts the count but not the clock, and is still ONE burn',
    room._burns.size === 1 && b2 === b1 && b2.left === BURN.TICKS && b2.next === nextA, { size: room._burns.size, b2 });

  /* the no-one-shot rail */
  stage(m);
  strike(m);
  const b3 = room._burns.get('p1');
  b3.dmg = 9999;
  room.eventBuffer.length = 0;
  room._tickMonsterBurns(b3.next);
  const big = lastHit();
  check('burn: no tick over 10% of your max HP, whatever its number', big && big.dmg <= Math.max(1, Math.floor((ps.maxHp || 100) * BURN.MAX_HP_PCT)), big);

  /* put out */
  stage(m); strike(m);
  const sp = alongSpoke(m, WHEEL_SAFE_R - 50);
  ps.x = sp.x; ps.y = sp.y;
  room.eventBuffer.length = 0;
  room._tickMonsterBurns(Date.now() + BURN.EVERY_MS);
  check('burn: put out on the Wheel\'s safe ground (no monster damage lands there)', !room._burns.has('p1') && attacks().length === 0);
  stage(m); strike(m);
  ps.z = 'town';
  room._tickMonsterBurns(Date.now() + BURN.EVERY_MS);
  check('burn: put out by leaving the zone', !room._burns.has('p1'));
  stage(m); strike(m);
  ps.dying = true;
  room._tickMonsterBurns(Date.now() + BURN.EVERY_MS);
  check('burn: put out by death', !room._burns.has('p1'));
  ps.dying = false;

  /* the harvester shield */
  stage(m); strike(m);
  const keep = room._extractionShielded;
  room._extractionShielded = (pid) => pid === 'p1';
  const hpH = ps.hp;
  room.eventBuffer.length = 0;
  room._tickMonsterBurns(room._burns.get('p1').next);
  check('burn: a harvester takes no tick (v2.3.1704), though the burn counts down', ps.hp === hpH && attacks().length === 0 && room._burns.get('p1').left === BURN.TICKS - 1);
  room._extractionShielded = keep;

  /* a burn that kills */
  stage(m); strike(m);
  ps.hp = 1;
  let died = null;
  const keepDeath = room._handlePlayerDeath;
  room._handlePlayerDeath = (p, pid, cause) => { died = { pid, cause }; p.dying = true; };
  room._tickMonsterBurns(room._burns.get('p1').next);
  check('burn: a tick that kills goes through the death path, credited to the goblin', died && died.pid === 'p1' && died.cause === 'monster:' + m.id, died);
  check('burn: ...and the burn ends with you', !room._burns.has('p1'));
  room._handlePlayerDeath = keepDeath;
  ps.dying = false;
}

// ── 5. GUST ───────────────────────────────────────────────────────────────
{
  const m = of('sky');
  stage(m);
  const t0 = Date.now();
  const hit = strike(m);
  check('gust: the mummy blows you back', hit.elem === 'wind' && hit.st === 'gust' && hit.stMs === GUST.MS && Array.isArray(hit.kb), hit);
  const [kx, ky] = hit.kb || [0, 0];
  const len = Math.hypot(kx, ky);
  const away = (kx * (ps.x - m.x) + ky * (ps.y - m.y)) / (len * Math.hypot(ps.x - m.x, ps.y - m.y));
  check('gust: GUST.PX long, straight away from it', Math.abs(len - GUST.PX) <= 1 && away > 0.99, { len, away });
  check('gust: the worker grants exactly that much more room to move', Math.abs(room._gustAllowance(ps, t0 + 10) - len) < 0.01 && ps._gustUntil >= t0 + GUST.ALLOW_MS, { left: ps._gustLeft });

  /* the movement bound: a step one gust long past the ordinary bound */
  const moveBy = async (dx) => {
    ps.lastMoveAt = Date.now() - 50;
    const x0 = ps.x;
    await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: ps.x + dx, y: ps.y, z: WHEEL_ZONE }));
    return ps.x !== x0;
  };
  const bound = 500 * 0.05 + 80;   /* 50 ms of the ordinary bound, at no speed buffs */
  check('gust: a shove on top of a walk is accepted while the gust lasts', await moveBy(bound + 30), { left: ps._gustLeft });
  check('gust: ...and what it used is spent', ps._gustLeft > 0 && ps._gustLeft < GUST.PX, ps._gustLeft);
  const leftNow = ps._gustLeft;
  check('gust: ...so the rest cannot be used twice over', !(await moveBy(bound + leftNow + 20)), { left: ps._gustLeft });
  ps._gustUntil = Date.now() - 1;
  check('gust: after ALLOW_MS the bound is the ordinary one again', !(await moveBy(bound + 30)) && ps._gustLeft === 0, ps._gustLeft);
  ps._gustLeft = 0; ps._gustUntil = 0;
  check('gust: and without a gust, never', !(await moveBy(bound + 30)));
  check('gust: two gusts\' room at most, however many land', (() => {
    stage(m); for (let i = 0; i < 6; i++) strike(m);
    return ps._gustLeft <= GUST.ALLOW_MAX && ps._gustLeft > GUST.PX;
  })(), ps._gustLeft);
  stage(m);
  ps.x = m.x; ps.y = m.y;
  const onTop = strike(m);
  check('gust: standing on top of it there is no "away": no shove, no room granted', onTop && onTop.st === undefined && onTop.kb === undefined && !(ps._gustLeft > 0), onTop);
}

// ── 6. STUCK ──────────────────────────────────────────────────────────────
{
  const m = of('verdant');
  stage(m);
  const t0 = Date.now();
  const hit = strike(m);
  check('stuck: the blue slime holds you in place', hit.elem === 'flora' && hit.st === 'stuck' && hit.stMs === STUCK.MS, hit);
  check('stuck: briefly', STUCK.MS >= 400 && STUCK.MS <= 1200 && ps._stuckUntil >= t0 + STUCK.MS);
  const again = strike(m);
  check('stuck: not held again straight after (six slimes cannot hold you for good)', again.elem === 'flora' && again.st === undefined, again);
  ps._stuckImmuneUntil = Date.now() - 1;
  const later = strike(m);
  check('stuck: ...but once IMMUNE_MS has passed, again', later.st === 'stuck', later);
  check('stuck: the immunity outlasts the hold', STUCK.IMMUNE_MS >= STUCK.MS);
}

// ── 7. THE TELEGRAPHED HITS, AND THE FIRE TRAIL ───────────────────────────
{
  const m = of('verdant');
  stage(m);
  room._telegraphHitPlayer(WHEEL_ZONE, m, 'p1', { kind: 'burst', flat: 20 });
  const t = lastHit();
  check('telegraph: a blue slime\'s burst holds you too', t && t.ability === 'burst' && t.elem === 'flora' && t.st === 'stuck', t);
  const g = of('ember');
  stage(g);
  room._telegraphHitPlayer(WHEEL_ZONE, g, 'p1', { kind: 'lunge', dmgMult: 1 });
  const l = lastHit();
  check('telegraph: a fire goblin\'s lunge sets you burning', l && l.elem === 'flame' && l.st === 'burn' && room._burns.has('p1'), l);

  stage(g);
  room.eventBuffer.length = 0;
  room._fireTrailHitPlayer(WHEEL_ZONE, { mid: g.id, lvl: g.level, x: ps.x, y: ps.y }, 'p1');
  const ft = lastHit();
  check('fire trail: its ticks name their flame', ft && ft.ability === 'firetrail' && ft.elem === 'flame' && ft.st === undefined, ft);
}

// ── 8. THE KILL SWITCH ────────────────────────────────────────────────────
{
  const keep = room._liveFlags;
  room._liveFlags = Object.assign({}, keep || {}, { elemhits: false });
  for (const h of ['frost', 'ember', 'sky', 'verdant', 'hollows', 'thunder', 'tidal', 'mist']) {
    const m = of(h);
    stage(m);
    const hit = strike(m);
    check('kill switch: ' + h + '\'s hit carries nothing with elemhits off', hit && !('elem' in hit) && !('st' in hit) && !('kb' in hit), hit);
  }
  check('kill switch: no burn, no hold, no room granted', !(room._burns && room._burns.size) && !ps._stuckUntil && !(ps._gustLeft > 0));
  check('kill switch: no daze, no soak, no poison (v2.3.3013)', !ps._dazeUntil && !ps._soakUntil && !(room._poisons && room._poisons.size));
  room._liveFlags = keep;
}

// ── 9. THE WIRE ───────────────────────────────────────────────────────────
{
  check('wire: monster_attack is still the worker\'s alone', PRIVILEGED_EVENTS.has('monster_attack'));
  /* v2.3.3013: every land's monsters carry an element now; the meadow's do
     not -- a plain monster, as the Rock Hollows' were */
  const m = room._makeZoneMonster('meadow', ZONES.meadow, ZONES.meadow.spawns[0], 'plain-1', 512, 512);
  stage(m);
  const hit = strike(m);
  /* as it goes on the wire: an undefined field is dropped by JSON.stringify */
  const keys = Object.keys(JSON.parse(JSON.stringify(hit))).sort().join(',');
  check('wire: a plain hit is exactly what it was -- no elem, st, stMs, kb or arcs', keys === 'attackerX,attackerY,dmg,dmgTaken,dodged,monsterId,targetId,zone', keys);
  stage(of('sky'));
  const gh = strike(of('sky'));
  check('wire: a gust carries kb as two whole numbers', Array.isArray(gh.kb) && gh.kb.length === 2 && gh.kb.every(Number.isInteger), gh.kb);
  const types = new Set(room.eventBuffer.map((e) => e.type));
  check('wire: no new event type', [...types].every((t) => t === 'monster_attack' || PRIVILEGED_EVENTS.has(t)), [...types]);
}

// ── 10. DAZE (v2.3.3013) ─────────────────────────────────────────────────
{
  const m = of('hollows');
  stage(m);
  const t0 = Date.now();
  const hit = strike(m);
  check('daze: the rock monster dazes you ("stone stuns briefly")', hit.elem === 'stone' && hit.st === 'daze' && hit.stMs === DAZE.MS && hit.kb === undefined, hit);
  check('daze: briefly, and the worker knows until when', DAZE.MS >= 300 && DAZE.MS <= 800 && ps._dazeUntil >= t0 + DAZE.MS && ps._dazeUntil <= Date.now() + DAZE.MS, ps._dazeUntil - t0);
  const again = strike(m);
  check('daze: not again straight after (six rock monsters cannot stun-lock you)', again.elem === 'stone' && again.st === undefined, again);
  ps._dazeImmuneUntil = Date.now() - 1;
  const later = strike(m);
  check('daze: ...but once IMMUNE_MS has passed, again', later.st === 'daze', later);
  check('daze: the window after it is longer than the slime\'s (they hit harder)', DAZE.IMMUNE_MS > STUCK.IMMUNE_MS && DAZE.IMMUNE_MS > DAZE.MS);
  stage(m);
  const g = room._elemOnHit(WHEEL_ZONE, m, 'p1', ps, { dodged: false, dmgTaken: 0, graced: true }, Date.now());
  check('daze: a hit that lands nothing dazes nobody', g && g.elem === 'stone' && !('st' in g) && !ps._dazeUntil, g);
}

// ── 11. SHOCK (v2.3.3013) ────────────────────────────────────────────────
{
  /* five more players, joined as players are */
  const others = [];
  for (let i = 2; i <= 7; i++) {
    const w = fakeWs('p' + i);
    room.sessions.set(w, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(w, JSON.stringify({ type: 'join', id: 'p' + i, name: 'P' + i, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
    others.push('p' + i);
  }
  const m = of('thunder');
  const place = (id, dx, dy, extra) => {
    const o = room.playerState[id];
    Object.assign(o, { z: WHEEL_ZONE, x: ps.x + dx, y: ps.y + dy, dead: false, dying: false, disconnected: false, hp: o.maxHp || 100,
      _zoneEntryGraceUntil: 0, _godUntil: 0, blocking: false }, extra || {});
    return o;
  };
  const park = () => { for (const id of others) Object.assign(room.playerState[id], { z: 'town', x: 1000, y: 1000 }); };
  const arcsTo = () => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.ability === 'shock').map((e) => e.payload);
  stage(m); park();
  const solo = strike(m);
  check('shock: the storm slime\'s hit crackles on you alone, and arcs to nobody', solo.elem === 'storm' && solo.st === 'shock' && solo.stMs === SHOCK.MS && !('arcs' in solo) && arcsTo().length === 0, solo);
  stage(m); park();
  const p2 = place('p2', 100, 0), p3 = place('p3', SHOCK.R + 60, 0);
  const hp2 = p2.hp, hp3 = p3.hp;
  const hit = strike(m);
  const arcs = arcsTo();
  check('shock: with a friend 100 px away it arcs to them -- and not to one further than SHOCK.R', hit.st === 'shock' && hit.arcs === 1 && arcs.length === 1 && arcs[0].targetId === 'p2', { hit, arcs });
  const want = Math.max(1, Math.min(Math.round(m.dmg * SHOCK.PCT), Math.floor((p2.maxHp || 100) * SHOCK.MAX_HP_PCT)));
  check(`shock: ...for ${Math.round(SHOCK.PCT * 100)}% of the hit (${want}), elemental, taking what it says`, arcs[0] && arcs[0].dmg === want && p2.hp === hp2 - arcs[0].dmgTaken && arcs[0].dmgTaken > 0 && p3.hp === hp3, { arc: arcs[0], hp2, now: p2.hp });
  check('shock: ...named storm, carried out as a shock on them, drawn from where you stand', arcs[0] && arcs[0].elem === 'storm' && arcs[0].st === 'shock' && arcs[0].stMs === SHOCK.MS
    && arcs[0].attackerX === ps.x && arcs[0].attackerY === ps.y && arcs[0].monsterId === m.id && arcs[0].zone === WHEEL_ZONE, arcs[0]);
  /* the nearest MAX_ARCS, and nobody who should not be */
  stage(m); park();
  for (let i = 0; i < others.length; i++) place(others[i], 20 + i * 18, 10);
  strike(m);
  const many = arcsTo().map((a) => a.targetId);
  check(`shock: a crowd of six takes the nearest ${SHOCK.MAX_ARCS}`, many.length === SHOCK.MAX_ARCS && many.join() === others.slice(0, SHOCK.MAX_ARCS).join(), many);
  stage(m); park();
  place('p2', 60, 0, { dead: true }); place('p3', 70, 0, { dying: true }); place('p4', 80, 0, { disconnected: true }); place('p5', 90, 0, { z: 'tidal' });
  strike(m);
  check('shock: never to the dead, the dying, the disconnected or another zone', arcsTo().length === 0, arcsTo());
  stage(m); park();
  place('p2', 80, 0);
  const keepX = room._extractionShielded;
  room._extractionShielded = (pid) => pid === 'p2';
  strike(m);
  check('shock: never to a harvester (v2.3.1704)', arcsTo().length === 0);
  room._extractionShielded = keepX;
  /* the safe ground: the player struck stands just outside it, the friend just inside */
  stage(m); park();
  const out = alongSpoke(m, WHEEL_SAFE_R + 40), inn = alongSpoke(m, WHEEL_SAFE_R - 40);
  ps.x = out.x; ps.y = out.y;
  Object.assign(place('p2', 0, 0), { x: inn.x, y: inn.y });
  strike(m);
  check('shock: never onto the Wheel\'s safe ground, 80 px away or not', arcsTo().length === 0 && Math.hypot(inn.x - out.x, inn.y - out.y) < SHOCK.R, arcsTo());
  /* the rail, and an arc that kills */
  stage(m); park();
  const weak = place('p2', 50, 0, { maxHp: 20, hp: 20 });
  strike(m);
  const railed = arcsTo()[0];
  check('shock: never more than 15% of their max HP', railed && railed.dmg <= Math.max(1, Math.floor(20 * SHOCK.MAX_HP_PCT)), railed);
  stage(m); park();
  place('p2', 50, 0, { hp: 1 });
  let died = null;
  const keepDeath = room._handlePlayerDeath;
  room._handlePlayerDeath = (p, pid, cause) => { died = { pid, cause }; p.dying = true; };
  strike(m);
  check('shock: an arc that kills goes through the death path, credited to the slime', died && died.pid === 'p2' && died.cause === 'monster:' + m.id, died);
  room._handlePlayerDeath = keepDeath;
  park();
  void weak;
}

// ── 12. SOAK (v2.3.3013) ─────────────────────────────────────────────────
{
  const m = of('tidal');
  stage(m);
  const t0 = Date.now();
  const hit = strike(m);
  check('soak: the fishman soaks you', hit.elem === 'water' && hit.st === 'soak' && hit.stMs === SOAK.MS && ps._soakUntil >= t0 + SOAK.MS, hit);
  /* the regen tick, dry and soaked, from the same stamina */
  const refill = (soaked) => {
    ps._soakUntil = soaked ? Date.now() + SOAK.MS : 0;
    ps.blocking = false; ps.stamina = 10; ps.maxStamina = 100;
    ps._sprintUntil = 0; ps._sprintRegenAt = 0;
    room._tickPlayerRegen();
    return ps.stamina - 10;
  };
  const dry = refill(false), wet = refill(true), dryAgain = refill(false);
  check(`soak: soaked, stamina refills at ${SOAK.REGEN_MULT} of its pace (${dry} a tick dry, ${wet} soaked)`,
    dry > 1 && wet === Math.max(1, Math.round(dry * SOAK.REGEN_MULT)) && wet < dry, { dry, wet });
  check('soak: ...and once it has dried, exactly as before', dryAgain === dry, { dry, dryAgain });
  check('soak: the multiplier is exactly 1 when dry (the regen line untouched)', room._soakRegenMult(ps, Date.now()) === 1 && room._soakRegenMult({ _soakUntil: Date.now() + 1000 }, Date.now()) === SOAK.REGEN_MULT);
  stage(m);
  strike(m);
  const u1 = ps._soakUntil;
  ps._soakUntil = Date.now() + 100;
  strike(m);
  check('soak: each hit starts it again', ps._soakUntil >= u1 - 5 && ps._soakUntil > Date.now() + SOAK.MS - 50);
}

// ── 13. POISON (v2.3.3013) ───────────────────────────────────────────────
{
  const m = of('mist');
  stage(m);
  const t0 = Date.now();
  const hit = strike(m);
  check('poison: the wisp poisons you', hit.elem === 'venom' && hit.st === 'poison' && hit.stMs === POISON.TICKS * POISON.EVERY_MS, hit);
  const b = room._poisons && room._poisons.get('p1');
  check('poison: five ticks of 12% of its hit, the first a second out, in a Map of its own',
    room._poisons instanceof Map && !!b && b.left === POISON.TICKS && b.dmg === Math.max(1, Math.round(m.dmg * POISON.PCT)) && b.next >= t0 + POISON.EVERY_MS && b.mid === m.id && !(room._burns && room._burns.has('p1')), b);
  room.eventBuffer.length = 0;
  const hp0 = ps.hp;
  room._tickMonsterBurns(b.next);
  const tick = lastHit();
  check('poison: a tick is a monster_attack the worker resolved (ability poison), named venom, taking what it says',
    !!tick && tick.ability === 'poison' && tick.elem === 'venom' && tick.st === undefined && tick.dmgTaken > 0 && ps.hp === hp0 - tick.dmgTaken, tick);
  for (let k = 0; k < 6; k++) room._tickMonsterBurns(room._poisons.has('p1') ? room._poisons.get('p1').next : Date.now() + 60000);
  check('poison: five ticks, then it is out', attacks().length === POISON.TICKS && !room._poisons.has('p1'), attacks().length);
  /* refreshed, never stacked */
  stage(m);
  strike(m);
  const p1 = room._poisons.get('p1');
  const nextA = p1.next;
  p1.left = 1;
  strike(m);
  check('poison: a second hit restarts the count but not the clock, and is still ONE poison',
    room._poisons.size === 1 && room._poisons.get('p1') === p1 && p1.left === POISON.TICKS && p1.next === nextA);
  /* the rail */
  p1.dmg = 9999;
  room.eventBuffer.length = 0;
  room._tickMonsterBurns(p1.next);
  const big = lastHit();
  check('poison: no tick over 8% of your max HP', big && big.dmg <= Math.max(1, Math.floor((ps.maxHp || 100) * POISON.MAX_HP_PCT)), big);
  /* put out, as the burn is */
  stage(m); strike(m);
  const sp = alongSpoke(m, WHEEL_SAFE_R - 50);
  ps.x = sp.x; ps.y = sp.y;
  room._tickMonsterBurns(Date.now() + POISON.EVERY_MS);
  check('poison: put out on the Wheel\'s safe ground', !room._poisons.has('p1'));
  stage(m); strike(m);
  ps.z = 'town';
  room._tickMonsterBurns(Date.now() + POISON.EVERY_MS);
  check('poison: put out by leaving the zone', !room._poisons.has('p1'));
  /* alongside a burn, each on its own clock */
  stage(m); strike(m);
  const gob = of('ember');
  gob.x = m.x; gob.y = m.y;
  strike(gob);
  check('poison: burning and poisoned at once, one of each', room._burns.has('p1') && room._poisons.has('p1') && room._burns.size === 1 && room._poisons.size === 1);
  room.eventBuffer.length = 0;
  const due = Math.max(room._burns.get('p1').next, room._poisons.get('p1').next);
  room._tickMonsterBurns(due);
  const kinds = attacks().map((a) => a.payload.ability).sort().join();
  check('poison: ...and one tick of each, each its own ability', kinds === 'burn,poison', kinds);
}

Math.random = realRandom;
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
