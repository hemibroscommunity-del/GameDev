/* THE BOW SPECIAL'S BLAST (v2.3.2279).
 *
 * Owner: "Bow still feels a bit underpowered.  I want to add something to the
 * special attack.  Add this explosion once the arrow is done adding tick
 * damage for the final send off.  Make the explosion a large area about the
 * size of the perimeter that a melee character can auto target a monster.
 * Make it about 3x the damage of the base damage bow attack for any caught in
 * the blast radius."
 *
 * WHY THIS IS A SERVER SUITE AND NOT ONLY A HEADLESS ONE.  The blast is the
 * first damage message on this worker that asks it to accept a COORDINATE --
 * every other AoE centres on ps.x/ps.y, which the server owns.  Unbounded it
 * would be a 220px triple-damage nova anywhere in the zone on demand, so the
 * bounds are the feature as much as the damage is, and each one wants its own
 * deterministic case.  mp-arrowblast covers the other half (the wire, the
 * render, and whether a PEER sees it) which no server fixture can reach.
 *
 * THE ONE NUMBER EVERYTHING RESTS ON: combat.js applies
 * `if (isSpecial) base *= (type === 'staff' ? 2.0 : 3.0)` AFTER variance and
 * after the banked flat, so _computeAttackDamage(ps,'ranged',true) is exactly
 * three times the same call with false.  That is asserted below rather than
 * described, because "3x a base bow attack" is the owner's whole spec and a
 * later edit to that multiplier would otherwise change this feature silently.
 */
import { GameRoom } from '../src/index.js';
import { ARROW_BLAST } from '../src/arrowblast.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

async function newRoom() {
  const room = new GameRoom(mockState, env);
  const ws = fakeWs('p');
  const session = { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() };
  room.sessions.set(ws, session);
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id: 'p1', name: 'Archer', protocolVersion: 2,
    data: { x: 500, y: 500, z: 'meadow' },
  }));
  const ps = room.playerState.p1;
  /* A bow in the equipped slot -- the gate reads ps.rangedWeapon, which is
     what "owning a bow" means on this side. */
  ps.rangedWeapon = { name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal', tierMult: 1 };
  ps.activeSlot = 'ranged';
  return { room, ws, session: room.sessions.get(ws), ps };
}

/* Put monsters exactly where we want them, so a radius assertion is about the
   radius and not about where the spawn table happened to roll. */
function placeMonsters(room, zone, spots) {
  room.monsters[zone] = spots.map((s, i) => ({
    id: 'm' + i, x: s.x, y: s.y, hp: 5000, maxHp: 5000, alive: true,
    archetype: 'fodder', type: 'fodder', level: 1, dmgByPlayer: null,
  }));
  return room.monsters[zone];
}

// ── 1. THE DAMAGE IS THE BOW SPECIAL'S OWN ROLL, WHICH IS 3x ──
{
  const { room, ps } = await newRoom();
  /* MEANS, not band edges.  The first cut compared min-to-min and max-to-max
     over 400 rolls and read 2.89 / 2.13 -- not because the multiplier is not
     3, but because the extremes of a sample are where the 1% CRIT lands, and
     a crit does not scale with the special multiplier the way the base does.
     The mean converges on the real ratio; the edges converge on the dice. */
  const N = 4000;
  let sumN = 0, sumS = 0;
  for (let i = 0; i < N; i++) {
    sumN += room._computeAttackDamage(ps, 'ranged', false).dmg;
    sumS += room._computeAttackDamage(ps, 'ranged', true).dmg;
  }
  const ratio = (sumS / N) / (sumN / N);
  check('damage: a special averages 3x a normal bow hit (the owner\'s "3x base")',
    Math.abs(ratio - 3) < 0.15,
    { normalMean: +(sumN / N).toFixed(2), specialMean: +(sumS / N).toFixed(2), ratio: +ratio.toFixed(3) });
}

// ── 2. IT IS AN AREA, MEASURED FROM THE ARROW ──
{
  const { room, session, ps } = await newRoom();
  /* Blast point 300px east of the player -- inside MAX_REACH, and far enough
     that "measured from the arrow" and "measured from the player" give
     different answers.  `near` is 100px from the blast and 200 from the
     player; `far` is 260 from the blast, outside the 220 radius. */
  const bx = ps.x + 300, by = ps.y;
  const mons = placeMonsters(room, 'meadow', [
    { x: bx + 100, y: by },        /* m0 - inside */
    { x: bx, y: by + 200 },        /* m1 - inside */
    { x: bx + 260, y: by },        /* m2 - OUTSIDE */
    { x: ps.x, y: ps.y },          /* m3 - on the PLAYER, outside the blast */
  ]);
  room._handleArrowBlast(session, { zone: 'meadow', x: bx, y: by });
  const lost = mons.map((m) => 5000 - m.hp);
  check('area: everything inside the radius took damage', lost[0] > 0 && lost[1] > 0, lost);
  check('area: nothing outside it did', lost[2] === 0, lost);
  check('area: it is centred on the ARROW, not the player (the one on the player is untouched)',
    lost[3] === 0, lost);
  check('area: the damage is a real roll, not a flat number',
    lost[0] >= 1 && lost[0] < 10000, lost);
  /* Sticky aggro -- without it a 220px blast is a way to farm a pack without
     consequence.  Copied from _abilityStrikeMonster deliberately. */
  check('area: the monsters it hurt are now aggroed onto the shooter',
    mons[0]._aggroOverrideTarget === 'p1' && mons[0]._aggroOverrideUntil > Date.now(),
    { t: mons[0]._aggroOverrideTarget, u: mons[0]._aggroOverrideUntil });
  /* And everyone in the zone is told to draw it. */
  const boom = room.eventBuffer.filter((e) => e.type === 'arrow_boom');
  check('area: one arrow_boom is broadcast, carrying the radius',
    boom.length === 1 && boom[0].payload.r === ARROW_BLAST.RADIUS
      && boom[0].payload.x === bx && boom[0].payload.y === by, boom.map((b) => b.payload));
}

// ── 3. THE RADIUS IS THE ONE THE OWNER NAMED ──
{
  check('radius: 220, mirror-pinned to the client\'s TARGET_PERIMETER_PX',
    ARROW_BLAST.RADIUS === 220, ARROW_BLAST.RADIUS);
  check('radius: the target count is bounded, so one blast cannot walk the zone',
    ARROW_BLAST.MAX_TARGETS > 0 && ARROW_BLAST.MAX_TARGETS <= 32, ARROW_BLAST.MAX_TARGETS);
}

// ── 4. THE BOUNDS.  THIS IS THE FIRST MESSAGE THAT ASKS US TO TRUST A POINT ──
{
  const { room, session, ps } = await newRoom();
  const mons = placeMonsters(room, 'meadow', [{ x: 9000, y: 9000 }]);
  /* Across the map: the whole reason a coordinate needs bounding. */
  room._handleArrowBlast(session, { zone: 'meadow', x: 9000, y: 9000 });
  check('bounds: a blast far outside the bow\'s reach is refused', mons[0].hp === 5000, mons[0].hp);
  check('bounds: ...and it says which gate, for the operator',
    (room._arrowBlastRejectsFor('p1') || {}).last === 'out-of-reach', room._arrowBlastRejectsFor('p1'));
}
{
  const { room, session, ps } = await newRoom();
  const mons = placeMonsters(room, 'meadow', [{ x: ps.x + 100, y: ps.y }]);
  room._handleArrowBlast(session, { zone: 'meadow', x: ps.x + 100, y: ps.y });
  const first = 5000 - mons[0].hp;
  /* Immediately again: the client's own swipe cooldown is 1500ms, so a legit
     client can never beat this and a modified one is held to the same pace. */
  room._handleArrowBlast(session, { zone: 'meadow', x: ps.x + 100, y: ps.y });
  check('bounds: a second blast inside the cooldown does nothing',
    first > 0 && (5000 - mons[0].hp) === first, { first, after: 5000 - mons[0].hp });
  check('bounds: ...named as the cooldown',
    (room._arrowBlastRejectsFor('p1') || {}).last === 'cooldown', room._arrowBlastRejectsFor('p1'));
}
{
  const { room, session, ps } = await newRoom();
  ps.rangedWeapon = null;                       /* no bow owned */
  const mons = placeMonsters(room, 'meadow', [{ x: ps.x + 100, y: ps.y }]);
  room._handleArrowBlast(session, { zone: 'meadow', x: ps.x + 100, y: ps.y });
  check('bounds: no bow, no blast', mons[0].hp === 5000, mons[0].hp);
}
{
  const { room, session, ps } = await newRoom();
  ps.dead = true;
  const mons = placeMonsters(room, 'meadow', [{ x: ps.x + 100, y: ps.y }]);
  room._handleArrowBlast(session, { zone: 'meadow', x: ps.x + 100, y: ps.y });
  check('bounds: a dead player does not detonate', mons[0].hp === 5000, mons[0].hp);
}
{
  const { room, session, ps } = await newRoom();
  const mons = placeMonsters(room, 'ember', [{ x: ps.x + 100, y: ps.y }]);
  /* Claiming a zone you are not in: the attacker gate _handleMonsterDamage
     uses, verbatim. */
  room._handleArrowBlast(session, { zone: 'ember', x: ps.x + 100, y: ps.y });
  check('bounds: a blast in a zone you are not standing in is refused',
    mons[0].hp === 5000, mons[0].hp);
}
{
  const { room, session, ps } = await newRoom();
  const mons = placeMonsters(room, 'meadow', [{ x: ps.x + 100, y: ps.y }]);
  room._handleArrowBlast(session, { zone: 'meadow', x: 'over-there', y: null });
  check('bounds: a non-numeric point cannot reach the damage loop',
    mons[0].hp === 5000, mons[0].hp);
}

// ── 5. IT CANNOT BE FORGED OFF THE RELAY ──
{
  const { PRIVILEGED_EVENTS } = await import('../src/index.js');
  check('security: the VISUAL half is deny-listed, so no client can paint a fake fireball',
    PRIVILEGED_EVENTS.has('arrow_boom'), [...PRIVILEGED_EVENTS].slice(0, 3));
  check('security: ...and the INBOUND half is NOT, or the feature would deny itself',
    !PRIVILEGED_EVENTS.has('arrow_blast'));
}

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
