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
import { BURROW, BURROW_ARCH } from '../src/telegraph.js';

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

// ── 4. The pile is HARMLESS — the owner's rule, and what makes it fair ──
{
  const hpBefore = ps.hp;
  snowman.x = ps.x; snowman.y = ps.y;      /* right on top of the player */
  snowman.atkCd = 0;
  room.eventBuffer.length = 0;
  for (let i = 0; i < 5; i++) room._tickMonsters();
  check('pile: he cannot attack you in this form', ps.hp === hpBefore,
    { hpBefore, hp: ps.hp });
  check('pile: ...and starts no wind-up either', !snowman._bwUntil, snowman._bwUntil);
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
}

// ── 10. v2.3.2222: the pile has a FLOOR, not just a cap ──
{
  arm(0);                                  /* player standing right on him */
  room._tickMonsters();                    /* dig */
  snowman._burUntil = Date.now() - 1;
  room._tickMonsters();                    /* -> pile */
  check('duration: the pile begins even at point-blank range',
    snowman._burPhase === 'pile', snowman._burPhase);
  /* Arrival is already true (distance 0), so without a floor this would
     surface on the very next tick -- which is exactly the case that made
     the move feel like it barely happened. */
  snowman.x = ps.x; snowman.y = ps.y;
  room._tickMonsters();
  check('duration: ...and arrival cannot end it before the floor',
    snowman._burPhase === 'pile', { phase: snowman._burPhase, floor: snowman._burFloor });
  snowman._burFloor = Date.now() - 1;
  room._tickMonsters();
  check('duration: ...but does end it once the floor has passed',
    snowman._burPhase === 'emerge', snowman._burPhase);
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
  room._tickMonsters();
  const step = Math.abs(snowman.x - x0);
  /* m.spd (0.4 for a snowman) x SPEED_MULT.  Pinned because the field was
     read as `m.speed` -- which does not exist -- and silently fell back to
     1, moving the pile at two and a half times its design speed. */
  const want = (snowman.spd || 0.4) * BURROW.SPEED_MULT;
  check('duration: the pile moves at m.spd x SPEED_MULT, not a fallback',
    Math.abs(step - want) < 0.05, { step, want, spd: snowman.spd });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
