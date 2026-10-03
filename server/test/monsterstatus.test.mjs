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
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { ELEM_HITS, CHILL, BURN, GUST, STUCK } from '../src/monsterstatus.js';

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
  if (room._burns) room._burns.clear();
  room.extractions && room.extractions.delete && room.extractions.delete('p1');
  room.eventBuffer.length = 0;
}
const attacks = () => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === 'p1');
const lastHit = () => { const a = attacks(); return a.length ? a[a.length - 1].payload : null; };
const strike = (m) => { room._monsterStrikePlayer(WHEEL_ZONE, m, 'p1', m.x, m.y); return lastHit(); };

// ── 1. WHICH MONSTERS ─────────────────────────────────────────────────────
{
  check('which: the four elements and what each does',
    ELEM_HITS.frost === 'chill' && ELEM_HITS.flame === 'burn' && ELEM_HITS.wind === 'gust' && ELEM_HITS.flora === 'stuck'
      && Object.keys(ELEM_HITS).length === 4, ELEM_HITS);
  const want = { frost: 'frost', ember: 'flame', sky: 'wind', verdant: 'flora', hollows: null, thunder: null, tidal: null, mist: null };
  const got = {};
  for (const h of Object.keys(want)) got[h] = room._elemHitOf(of(h));
  check('which: the snowman frost, the fire goblin flame, the mummies wind, the blue slime flora; the rest nothing',
    Object.keys(want).every((h) => got[h] === want[h]), got);
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
  for (const h of ['frost', 'ember', 'sky', 'verdant']) {
    const m = of(h);
    stage(m);
    const hit = strike(m);
    check('kill switch: ' + h + '\'s hit carries nothing with elemhits off', hit && !('elem' in hit) && !('st' in hit) && !('kb' in hit), hit);
  }
  check('kill switch: no burn, no hold, no room granted', !(room._burns && room._burns.size) && !ps._stuckUntil && !(ps._gustLeft > 0));
  room._liveFlags = keep;
}

// ── 9. THE WIRE ───────────────────────────────────────────────────────────
{
  check('wire: monster_attack is still the worker\'s alone', PRIVILEGED_EVENTS.has('monster_attack'));
  const m = of('hollows');
  stage(m);
  const hit = strike(m);
  /* as it goes on the wire: an undefined field is dropped by JSON.stringify */
  const keys = Object.keys(JSON.parse(JSON.stringify(hit))).sort().join(',');
  check('wire: a plain hit is exactly what it was -- no elem, st, stMs or kb', keys === 'attackerX,attackerY,dmg,dmgTaken,dodged,monsterId,targetId,zone', keys);
  stage(of('sky'));
  const gh = strike(of('sky'));
  check('wire: a gust carries kb as two whole numbers', Array.isArray(gh.kb) && gh.kb.length === 2 && gh.kb.every(Number.isInteger), gh.kb);
  const types = new Set(room.eventBuffer.map((e) => e.type));
  check('wire: no new event type', [...types].every((t) => t === 'monster_attack' || PRIVILEGED_EVENTS.has(t)), [...types]);
}

Math.random = realRandom;
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
