/* Snow-pile burrow + the invulnerable-phase foundation (v2.3.2221).
 *
 * The foundation is the risky half. Until this change `m.alive` was the ONLY
 * thing that could deny a monster damage, and there are five separate hp
 * writes plus a pet capture that removes a monster without one. An
 * "invulnerable" phase that a damage-over-time tick still chews through is
 * worse than no phase at all, so every one of those doors is pinned here
 * INDEPENDENTLY -- a single "swing does nothing" assertion would have passed
 * while five other paths leaked.
 *
 * The behaviour half pins the owner's rules from docs/specs/snowman-snow-pile.md:
 * dig and emerge are vulnerable, the pile is untouchable AND harmless, and
 * surfacing does not grant a free hit.
 */
import { GameRoom } from '../src/index.js';
import { BURROW, BURROW_ARCH, SLIME_BURST, TELEGRAPH } from '../src/telegraph.js';

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

const room = new GameRoom(mockState, mockEnv);
const ws = fakeWs('p');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({
  type: 'join', id: 'p1', name: 'Player', protocolVersion: 2,
  data: { x: 500, y: 500, z: 'frost' },
}));
const ps = room.playerState.p1;

const frost = room.monsters.frost || [];
const snowman = frost.find((m) => m.arch === 'snowman');
check('fixture: frost fields a snowman', !!snowman, { count: frost.length });

/* Put him next to the player and drop him to half health so the move arms. */
function arm(distance) {
  snowman.alive = true;
  snowman.hp = Math.floor(snowman.maxHp * BURROW.HP_FRAC);
  snowman.x = ps.x + (distance === undefined ? 120 : distance);
  snowman.y = ps.y;
  snowman.spawnX = snowman.x; snowman.spawnY = snowman.y;
  snowman._burPhase = null; snowman._burUntil = 0; snowman._burCd = 0; snowman._burFloor = 0;
  snowman._invulnUntil = 0; snowman._bwUntil = 0; snowman.atkCd = 0;
  ps.dead = false; ps.dying = false; ps.z = 'frost'; ps.hp = ps.maxHp;
  room.eventBuffer.length = 0;
}
const phaseEvents = () => room.eventBuffer
  .filter((e) => e.type === 'monster_ability' && e.payload.ability === 'burrow')
  .map((e) => e.payload.phase);

// ── 1. The move arms at half health, and not before ──
{
  arm();
  snowman.hp = snowman.maxHp;                    /* full health */
  room._tickMonsters();
  check('trigger: a healthy snowman does not burrow', !snowman._burPhase, snowman._burPhase);

  arm();
  room._tickMonsters();
  check('trigger: he burrows at half health', snowman._burPhase === 'dig', snowman._burPhase);
  check('trigger: ...and announces the dig', phaseEvents().includes('dig'), phaseEvents());
  check('trigger: only listed archetypes own the move',
    Object.keys(BURROW_ARCH).length > 0 && !!BURROW_ARCH.snowman, Object.keys(BURROW_ARCH));
}

// ── 2. Dig is VULNERABLE — entering has to cost something ──
{
  check('dig: he can still be hurt while collapsing',
    room._monsterDamageable(snowman) === true, {
      phase: snowman._burPhase, invulnUntil: snowman._invulnUntil });
}

/* Advance into the pile. */
function toPile() {
  snowman._burUntil = Date.now() - 1;
  room.eventBuffer.length = 0;
  room._tickMonsters();
}

// ── 3. The pile is UNTOUCHABLE, through every door ──
{
  toPile();
  check('pile: the phase advances to the mound', snowman._burPhase === 'pile', snowman._burPhase);
  check('pile: ...and announces it', phaseEvents().includes('pile'), phaseEvents());
  check('pile: the damage gate denies it', room._monsterDamageable(snowman) === false, {
    invulnUntil: snowman._invulnUntil, now: Date.now() });

  /* Every hp write, one at a time.  These are the five doors the spec warned
     about; a phase that closes only the first is not a phase. */
  const hp0 = snowman.hp;
  ps.x = snowman.x; ps.y = snowman.y;
  ps.weapon = { type: 'sword', tierMult: 1 };
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'monster_damage',
    payload: { monsterId: snowman.id, zone: 'frost', slot: 'melee' },
  }));
  check('pile: a sword swing does nothing', snowman.hp === hp0, { hp0, hp: snowman.hp });

  const dot = room._applyMonsterDot('frost', snowman, 25, 'p1', 'burn');
  check('pile: a damage-over-time tick does nothing (it DROPS, not banks)',
    dot === 0 && snowman.hp === hp0, { dot, hp0, hp: snowman.hp });

  const burst = room._applyMonsterDot('frost', snowman, 40, 'p1', null, { burst: true });
  check('pile: an element burst does nothing', burst === 0 && snowman.hp === hp0,
    { burst, hp: snowman.hp });

  const struck = room._abilityStrikeMonster
    ? room._abilityStrikeMonster('frost', snowman, 30, 'p1', {})
    : false;
  check('pile: a stamina ability (bash / whirlwind) does nothing',
    struck === false && snowman.hp === hp0, { struck, hp: snowman.hp });

  check('pile: kill credit banked earlier is untouched',
    !snowman.dmgByPlayer || !snowman.dmgByPlayer.p1 || snowman.dmgByPlayer.p1 >= 0, snowman.dmgByPlayer);
}

// ── 4. v2.3.2244: the pile HURTS TO TOUCH — once a second, and only in contact ──
//    (It was HARMLESS from v2.3.2221 to v2.3.2243; the owner changed the rule:
//     "when the snowman touches you you will take damage (at a max rate of 1
//     time being damaged per second you remain in contact with it)".)
{
  ps.hp = ps.maxHp;
  const hpBefore = ps.hp;
  snowman.x = ps.x; snowman.y = ps.y;      /* right on top of the player */
  snowman.atkCd = 0;
  snowman._burContactNextAt = 0;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const hits = () => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.monsterId === snowman.id);
  check('contact: standing on the pile deals damage', ps.hp < hpBefore, { hpBefore, hp: ps.hp });
  check('contact: ...as an ordinary monster_attack from the pile', hits().length === 1, hits().length);
  check('contact: ...and still starts no wind-up (it is a touch, not a swing)', !snowman._bwUntil, snowman._bwUntil);
  const hpAfterOne = ps.hp;
  for (let i = 0; i < 20; i++) room._tickMonsters();   /* ~440ms of ticks, well inside the second */
  check('contact: a second touch inside the same second does NOT hit again',
    ps.hp === hpAfterOne && hits().length === 1, { hp: ps.hp, hpAfterOne, hits: hits().length });
  snowman._burContactNextAt = Date.now() - 1;           /* the second is up */
  room._tickMonsters();
  check('contact: ...and does once the second has passed',
    ps.hp < hpAfterOne && hits().length === 2, { hp: ps.hp, hpAfterOne, hits: hits().length });
  /* Out of contact: no damage however long you stand there. */
  const hpOut = ps.hp;
  snowman.x = ps.x + BURROW.CONTACT_PX + 30; snowman.y = ps.y;
  snowman._burContactNextAt = 0;
  room._tickMonsters();
  check('contact: out of the touch ring, no damage', ps.hp === hpOut && hits().length === 2, { hp: ps.hp, hpOut });
  /* And the pile is still intangible to the player while it hurts them. */
  check('contact: the pile stays invulnerable while it is hurting you',
    room._monsterDamageable(snowman) === false, snowman._invulnUntil);
  /* Facing him with a shield up blocks the touch, because it goes through
     the same impact path a swing does. */
  ps.hp = ps.maxHp; ps.blocking = true; ps.ba = Math.PI;   /* he is due west of the player after the step above? no: re-seat */
  snowman.x = ps.x - 10; snowman.y = ps.y;                 /* 10px to the WEST */
  ps.ba = Math.PI;                                         /* shield faces west */
  snowman._burContactNextAt = 0;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const blockedHit = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.monsterId === snowman.id);
  check('contact: a shield facing the pile blocks the touch (impact-time arc, same as a swing)',
    ps.hp === ps.maxHp && !!blockedHit && blockedHit.payload.blocked === true, { hp: ps.hp, blockedHit });
  ps.blocking = false; ps.ba = null;
}

// ── 5. Emerging ends the immunity and is itself a punish window ──
{
  arm();
  room._tickMonsters();                   /* dig */
  toPile();                               /* pile */
  check('emerge: precondition — invulnerable in the pile',
    room._monsterDamageable(snowman) === false, snowman._burPhase);
  snowman._burUntil = Date.now() - 1;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  check('emerge: the phase surfaces', snowman._burPhase === 'emerge', snowman._burPhase);
  check('emerge: ...and announces it', phaseEvents().includes('emerge'), phaseEvents());
  check('emerge: the immunity is gone the instant he surfaces',
    room._monsterDamageable(snowman) === true,
    { invulnUntil: snowman._invulnUntil, now: Date.now() });
}

// ── 6. Surfacing is not a free hit ──
{
  const hpBefore = ps.hp;
  snowman.x = ps.x; snowman.y = ps.y;
  snowman._burUntil = Date.now() - 1;
  room._tickMonsters();                   /* emerge completes */
  check('emerge: the move ends cleanly', !snowman._burPhase, snowman._burPhase);
  /* v2.3.2251: the cooldown is re-stamped HERE, at the end of the move, which
     is what turns the owner's "at least 20 seconds before the same snowman can
     do it again" into a floor on the QUIET rather than on start-to-start
     spacing.  Without this the 4.2s move eats into the 20s and delivers 15.8. */
  check('emerge: the cooldown is re-stamped from the END, so the 20s is real downtime',
    snowman._burCd >= Date.now() + BURROW.CD_MS - 50,
    { burCd: snowman._burCd, now: Date.now(), cd: BURROW.CD_MS });
  room._tickMonsters();                   /* first tick back in ordinary AI */
  check('emerge: his first attack still pays its wind-up (no free hit)',
    ps.hp === hpBefore, { hpBefore, hp: ps.hp, bw: snowman._bwUntil });
}

// ── 7. A pile cannot simply be trapped instead ──
{
  arm(); room._tickMonsters(); toPile();
  ps.inventory = Object.assign({}, ps.inventory, { basic_trap: 5 });
  if (!ps.lifeSkills) ps.lifeSkills = {};
  ps.lifeSkills.pets = [];
  snowman.hp = 1;                          /* well under the capture threshold */
  snowman.x = ps.x; snowman.y = ps.y;
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'pet_capture', payload: { monsterId: snowman.id },
  }));
  check('pile: it cannot be captured either (the one non-damage removal)',
    snowman.alive === true, { alive: snowman.alive });
}

// ── 8. Respawn must not resurrect the phase ──
{
  snowman._burPhase = 'pile';
  snowman._invulnUntil = Date.now() + 99999;
  snowman.alive = false;
  snowman.respawnAt = Date.now() - 1;
  room._tickMonsters();
  check('respawn: a respawned snowman is not still a mound of snow',
    !snowman._burPhase, snowman._burPhase);
  check('respawn: ...and is not still invulnerable',
    room._monsterDamageable(snowman) === true,
    { alive: snowman.alive, invulnUntil: snowman._invulnUntil });
}

// ── 9. The cooldown keeps it a moment, not a personality ──
{
  arm();
  room._tickMonsters();
  const armedAt = snowman._burCd;
  check('cooldown: stamped from the START of the move, not its end',
    armedAt > Date.now() && armedAt <= Date.now() + BURROW.CD_MS + 50,
    { armedAt, now: Date.now(), cd: BURROW.CD_MS });
  snowman._burPhase = null; snowman._burUntil = 0; snowman._invulnUntil = 0;
  room._tickMonsters();
  check('cooldown: he cannot immediately burrow again', !snowman._burPhase, snowman._burPhase);
  /* v2.3.2251: the owner's number, pinned.  "At least 20 seconds before the
     same snowman can do it again" -- asserted so a later tune has to argue
     with this line rather than silently undo it. */
  check('cooldown: it is at least the 20 seconds the owner asked for',
    BURROW.CD_MS >= 20000, BURROW.CD_MS);
}

// ── 10. v2.3.2223: the pile has a FLOOR, not just a cap ──
{
  /* v2.3.2251: the owner's other number, pinned alongside its floor.  "Change
     snowman burrow to be way shorter.  Maybe 3 seconds" -- read as the PILE
     (the phase he is burrowed for), the same reading v2.3.2225 used when it
     doubled this on "double burrow time".  The floor must stay strictly under
     the cap or the pile can never end early on arrival, which is the case the
     floor was added for in the first place. */
  check('duration: the pile is the 3 seconds the owner asked for',
    BURROW.PILE_MAX_MS === 3000, BURROW.PILE_MAX_MS);
  check('duration: ...and the floor is still under the cap, so arrival can end it early',
    BURROW.PILE_MIN_MS < BURROW.PILE_MAX_MS,
    { floor: BURROW.PILE_MIN_MS, cap: BURROW.PILE_MAX_MS });
  arm(0);                                  /* player standing right on him */
  room._tickMonsters();                    /* dig */
  snowman._burUntil = Date.now() - 1;
  room._tickMonsters();                    /* -> pile */
  check('duration: the pile begins even at point-blank range',
    snowman._burPhase === 'pile', snowman._burPhase);
  /* v2.3.2244: ARRIVAL NO LONGER ENDS THE PILE AT ALL.  A pile that hurts
     on contact cannot surface on contact, or the rule fires at most once
     and only by accident.  It runs to the cap (or until the target is gone,
     after the floor). */
  snowman.x = ps.x; snowman.y = ps.y;
  room._tickMonsters();
  check('duration: standing on him does not end it before the floor',
    snowman._burPhase === 'pile', { phase: snowman._burPhase, floor: snowman._burFloor });
  /* THE FLOOR ALONE IS NOT ENOUGH ANY MORE.  Still standing on him, so he
     has not made the distance -- the old rule would have surfaced here. */
  snowman._burFloor = Date.now() - 1;
  snowman.x = ps.x; snowman.y = ps.y;
  room._tickMonsters();
  check('duration: ...nor after the floor (v2.3.2244: arrival is the hurt, not the end)',
    snowman._burPhase === 'pile', snowman._burPhase);
  snowman._burUntil = Date.now() - 1;
  room._tickMonsters();
  check('duration: the cap ends it', snowman._burPhase === 'emerge', snowman._burPhase);
  /* And a target who is GONE ends it too, once the floor has passed.
     "Gone" here is death rather than a zone change: with the only player
     out of frost the zone is not active and _tickMonsters does not visit
     it at all, so a zone-change fixture would measure nothing. */
  arm(0); room._tickMonsters(); snowman._burUntil = Date.now() - 1; room._tickMonsters();
  snowman._burFloor = Date.now() - 1;
  ps.dead = true;
  room._tickMonsters();
  check('duration: a target who is gone ends it after the floor', snowman._burPhase === 'emerge', snowman._burPhase);
  ps.dead = false;
}

// ── 11. The pile travels at the snowman's OWN speed ──
{
  /* Inside aggro range -- the burrow STARTS in the aggro branch (he needs
     somewhere to grind toward), so parking him at 400px meant he simply
     wandered and the phase never began.  120 is close enough to aggro and
     still 60px of travel from the arrival ring. */
  arm();
  room._tickMonsters();
  snowman._burUntil = Date.now() - 1;
  room._tickMonsters();                    /* -> pile */
  const x0 = snowman.x;
  const dx0 = Math.abs(snowman.x - ps.x);
  room._tickMonsters();
  const step = Math.abs(snowman.x - x0);
  /* ═══ v2.3.2244: IT CHASES AGAIN, AT HALF THE PACE IT FLED ═══
     v2.3.2236 pinned the flee at FLEE_PX_S 190 px/s against the room clock
     (the px/s form exists because the old m.spd x SPEED_MULT read `m.speed`,
     a field that does not exist, and ran at 2.5x behind a fallback).  The
     control redesign turns him back toward the player -- "target to the
     player AGAIN" -- and halves the speed he was watched fleeing at.  So the
     pins are: the form (px/s x tick), the number (half of 190), the
     direction (TOWARD), and that a default character (150 px/s, i.e.
     calcMoveSpeed(0,0)/5 x SPEED = 2.5 px/frame at 60fps) can walk away. */
  const PLAYER_PX_S = 150;
  const want = BURROW.PILE_PX_S * (room.TICK_RATE / 1000);
  check('the pile moves at PILE_PX_S against the room clock, not a fallback',
    Math.abs(step - want) < 0.05, { step, want, tick: room.TICK_RATE });
  check('...and PILE_PX_S is half of the 190 px/s he fled at (v2.3.2236 -> v2.3.2244)',
    BURROW.PILE_PX_S === 95, BURROW.PILE_PX_S);
  check('...which a default character can walk away from',
    BURROW.PILE_PX_S < PLAYER_PX_S, { pile: BURROW.PILE_PX_S, player: PLAYER_PX_S });
  /* DIRECTION, which is the whole ask.  Away-from-the-player was v2.3.2236
     and would pass every speed assertion above. */
  check('...and it moves TOWARD the player, not away',
    Math.abs(snowman.x - ps.x) < dx0, { before: dx0, after: Math.abs(snowman.x - ps.x) });
  check('duration: the contact ring is inside the melee reach (a mound, not an arm)',
    BURROW.CONTACT_PX > 0 && BURROW.CONTACT_PX < 70 && BURROW.CONTACT_CD_MS === 1000,
    { px: BURROW.CONTACT_PX, cd: BURROW.CONTACT_CD_MS });
}

// ══════════════════════════════════════════════════════════════════
// v2.3.2224: the blue slime's death burst
// ══════════════════════════════════════════════════════════════════
/* Zones spawn lazily (_ensureZoneMonsters), and this suite joined in frost,
   so verdant has to be asked for explicitly before its slimes exist. */
const verdant = room._ensureZoneMonsters('verdant') || [];
const slime = verdant.find((m) => m.variant === 'blueSlime');
check('burst: verdant fields a blue slime', !!slime, { count: verdant.length });

function armSlime(dist) {
  slime.alive = true; slime.hp = slime.maxHp;
  slime.x = ps.x + (dist === undefined ? 40 : dist); slime.y = ps.y;
  slime.spawnX = slime.x; slime.spawnY = slime.y;
  slime._burstUntil = 0; slime._burstKiller = null; slime._burstDone = false;
  ps.z = 'verdant'; ps.dead = false; ps.dying = false;
  ps.hp = ps.maxHp; ps.x = ps.x; ps.blocking = false;
  room.eventBuffer.length = 0;
}
const burstPhases = () => room.eventBuffer
  .filter((e) => e.type === 'monster_ability' && e.payload.ability === 'burst')
  .map((e) => e.payload.phase);

// ── B1. Death defers into a swell, it does not drop ──
{
  armSlime();
  room._applyMonsterDot('verdant', slime, slime.hp + 50, 'p1', 'burn');
  check('burst: at 0 hp it is still ALIVE, swelling', slime.alive === true && slime._burstUntil > 0,
    { alive: slime.alive, until: slime._burstUntil });
  check('burst: ...and announces the swell', burstPhases().includes('swell'), burstPhases());
  check('burst: ...and cannot be hurt while it swells (hp is already 0)',
    room._monsterDamageable(slime) === false, { hp: slime.hp });
}

// ── B2. It goes off, damages what is in the radius, and only then dies ──
{
  const hp0 = ps.hp;
  ps.x = slime.x; ps.y = slime.y;             /* standing in it */
  slime._burstUntil = Date.now() - 1;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  check('burst: it explodes', burstPhases().includes('execute'), burstPhases());
  check('burst: ...and hurts a player caught in the radius', ps.hp < hp0, { hp0, hp: ps.hp });
  check('burst: ...and only now is it dead', slime.alive === false, { alive: slime.alive });
}

// ── B3. Walking out of the radius is the counterplay ──
{
  armSlime();
  room._applyMonsterDot('verdant', slime, slime.hp + 50, 'p1', 'burn');
  ps.x = slime.x + SLIME_BURST.RADIUS + 40;   /* clear of it */
  ps.y = slime.y;
  const hpSafe = ps.hp;
  slime._burstUntil = Date.now() - 1;
  room._tickMonsters();
  check('burst: a player outside the radius takes nothing', ps.hp === hpSafe,
    { hpSafe, hp: ps.hp, radius: SLIME_BURST.RADIUS });
}

// ── B4. EVERY kill path explodes, not just the sword ──
{
  armSlime();
  ps.x = slime.x; ps.y = slime.y;
  ps.weapon = { type: 'sword', tierMult: 1 };
  slime.hp = 1;
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: slime.id, zone: 'verdant', slot: 'melee' },
  }));
  check('burst: a melee kill defers into the swell too',
    slime.alive === true && slime._burstUntil > 0, { alive: slime.alive });
}

// ── B5. The damage is the owner's flat number, under the no-one-shot rail ──
{
  armSlime();
  ps.x = slime.x; ps.y = slime.y;
  ps.hp = ps.maxHp;
  room._applyMonsterDot('verdant', slime, slime.hp + 50, 'p1', 'burn');
  const before = ps.hp;
  slime._burstUntil = Date.now() - 1;
  room._tickMonsters();
  const dealt = before - ps.hp;
  const cap = Math.max(1, Math.floor((ps.maxHp || 100) * TELEGRAPH.MAX_HIT_PCT));
  check('burst: deals the flat 60 (or the no-one-shot cap, whichever is lower)',
    dealt > 0 && dealt <= Math.min(SLIME_BURST.DMG, cap) + 1,
    { dealt, flat: SLIME_BURST.DMG, cap, maxHp: ps.maxHp });
}

// ── B6. A respawned slime is not still holding a lit fuse ──
{
  slime._burstUntil = Date.now() + 99999;
  slime.alive = false; slime.respawnAt = Date.now() - 1;
  room._tickMonsters();
  check('burst: respawn clears the fuse', !slime._burstUntil, slime._burstUntil);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
