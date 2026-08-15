/* Stamina abilities + milestone unlocks (v2.3.1733; plan:
 * docs/COMBAT-OVERHAUL-PLAN.md PR 5).
 *
 * What is worth pinning is not "an ability exists" but the properties that
 * make it a SERVER-REFEREED ability rather than a client claim:
 *
 *   1. The mirror holds — server table === client table.  A drifted number
 *      is a button that lies about its cost, and nothing else would catch it.
 *   2. MILESTONE GATING: below the unlock level a cast does nothing and says
 *      why; at the level it works.
 *   3. STAMINA + COOLDOWN are refused server-side, with the pool untouched.
 *   4. Shield Bash STUNS: the monster stops moving and stops attacking, and
 *      a wind-up in progress is cancelled.
 *   5. Whirlwind hits EVERY monster in its radius and nothing outside it.
 *   6. The roll never breaches the anticheat ceiling.
 *   7. The ladder's non-ability rungs pay once and only once (the bonus
 *      point at 5, the +25% stamina at 10).
 *
 * Harness shape copied from combat-lifecycle/prog3: mocked DO storage, a
 * real join through webSocketMessage, fakeWs collecting sent JSON.  Casts go
 * through webSocketMessage too, deliberately — that exercises the router
 * `case 'ability'`, which is one of the three legs a new client->server type
 * needs (TRAPS #18).
 */
import { GameRoom } from '../src/index.js';
import { STAM_ABILITIES, MILESTONES, staminaMilestoneMult, milestonePointsThrough,
  milestoneAbilityLevels } from '../src/abilities.js';
import { STAM_ABILITIES as CLIENT_ABILITIES, MILESTONES as CLIENT_MILESTONES,
  staminaMilestoneMult as clientStamMult } from '../../src/data/abilities.js';

const mockState = {
  storage: {
    get: async () => undefined,
    put: async () => {},
    list: async () => new Map(),
    delete: async () => {},
  },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};

function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

// ── 1. The mirror (client half is plain-node importable, like every other
// data module the mirror audit reads) ──
{
  check('STAM_ABILITIES server === client (a drifted cost is a lying button)',
    JSON.stringify(STAM_ABILITIES) === JSON.stringify(CLIENT_ABILITIES),
    { server: STAM_ABILITIES, client: CLIENT_ABILITIES });
  check('MILESTONES server === client',
    JSON.stringify(MILESTONES) === JSON.stringify(CLIENT_MILESTONES),
    { server: MILESTONES, client: CLIENT_MILESTONES });
  const bad = Object.entries(milestoneAbilityLevels())
    .filter(([kind, lvl]) => !STAM_ABILITIES[kind] || STAM_ABILITIES[kind].minLevel !== lvl);
  check('every ability the ladder names exists and agrees on its level', bad.length === 0, bad);
  check('staminaMilestoneMult mirrors (3 -> 1, 10 -> 1.25)',
    staminaMilestoneMult(3) === clientStamMult(3) && staminaMilestoneMult(10) === clientStamMult(10)
      && staminaMilestoneMult(3) === 1 && staminaMilestoneMult(10) === 1.25,
    { s3: staminaMilestoneMult(3), s10: staminaMilestoneMult(10) });
  /* Level 6 is Element Burst's rung (PR 6, a different session).  Asserting
     the GAP keeps this suite honest about the hand-off: when PR 6 lands and
     fills it, this line fails and gets updated deliberately rather than the
     two PRs silently disagreeing about who owns level 6. */
  check('level 6 is deliberately left free for Element Burst (PR 6)',
    !MILESTONES[6], MILESTONES[6]);
}

const room = new GameRoom(mockState, mockEnv);
const wsA = fakeWs('pa');
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
room.sessions.set(wsA, baseSession());
await room.webSocketMessage(wsA, JSON.stringify({
  type: 'join', id: 'pa', name: 'Basher', protocolVersion: 2,
  data: { x: -100000, y: -100000, z: 'meadow' },
}));
const psA = room.playerState.pa;

const meadow = room._ensureZoneMonsters('meadow');
/* Deterministic layout: park every monster far away and out of the fight,
   then place exactly the ones a section needs. */
const parkAll = () => {
  for (const m of meadow) {
    m.alive = false; m.respawnAt = Date.now() + 1e9;
    m._wanderPausedUntil = Date.now() + 600000;
    m._stunUntil = 0; m._tgPhase = null; m._tgUntil = 0; m._tgNextAt = 0;
    m.statuses = {};
  }
};
/* Top the roster up so sections can use several monsters at once. */
while (meadow.length < 6) {
  const extra = room._spawnZoneMonsters('meadow');
  if (!extra.length) break;
  for (const m of extra) {
    if (meadow.length >= 6) break;
    m.id = 'ab-meadow-' + meadow.length;
    meadow.push(m);
  }
}
parkAll();

const arm = (m, x, y) => {
  m.alive = true; m.respawnAt = 0; m.hp = 5000; m.maxHp = 5000;
  m.dmgByPlayer = null; m.statuses = {}; m.dmg = 10;
  m.atkCd = 0; m._attackingUntil = 0; m._stunUntil = 0; m._kbDebt = 0;
  m._tgPhase = null; m._tgUntil = 0; m._tgNextAt = Date.now() + 1e9;
  m.x = x; m.y = y; m.spawnX = x; m.spawnY = y;
  m._wanderPausedUntil = Date.now() + 600000;
  return m;
};
const readyPlayer = () => {
  psA.z = 'meadow'; psA.dead = false; psA.dying = false; psA.disconnected = false;
  psA.hp = psA.maxHp; psA.blocking = false; psA.ba = null;
  psA.x = 1000; psA.y = 1000;
  psA.weapon = { type: 'sword', tierMult: 1 };
  psA.shield = { tier: 'wood' };
  psA.stamina = psA.maxStamina;
  psA._abilCd = null;
  psA._zoneEntryGraceUntil = 0;
};
const cast = async (kind) => {
  wsA.sent.length = 0;
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'ability', payload: { kind } }));
};
const rejects = () => msgsOfType(wsA, 'ability_rejected').map((m) => m.payload);
const hits = () => room.eventBuffer.filter((e) => e.type === 'monster_hit');
/* Character level is Σ trained levels; set all three so the sum is exact. */
const setCharLevel = (lvl) => {
  const per = Math.max(1, Math.floor(lvl / 3));
  psA.prog3.sk.sword.level = lvl - 2 * per;
  psA.prog3.sk.bow.level = per;
  psA.prog3.sk.staff.level = per;
  room._prog3Recompute(psA);
};

// ── 2. Milestone gating ──
{
  readyPlayer();
  check('a fresh character is level 3 (the floor)', psA.level === 3, psA.level);
  const m = arm(meadow[0], psA.x + 20, psA.y);
  const hp0 = m.hp;
  const stam0 = psA.stamina;
  await cast('bash');
  const r = rejects()[0];
  check('char 3: Shield Bash is LOCKED and says so',
    !!r && r.reason === 'locked' && r.need === STAM_ABILITIES.bash.minLevel, r);
  check('...and a locked cast costs nothing and hits nothing',
    m.hp === hp0 && psA.stamina === stam0 && hits().length === 0,
    { hp: m.hp, stamina: psA.stamina, hits: hits().length });

  setCharLevel(4);
  readyPlayer();
  arm(m, psA.x + 20, psA.y);
  await cast('bash');
  check('char 4: Shield Bash lands', hits().length === 1 && m.hp < 5000,
    { hits: hits().length, hp: m.hp, rejects: rejects() });
  check('...and the hit is tagged as the ability (the client needs it for the popup)',
    hits()[0] && hits()[0].payload.ability === 'bash', hits()[0] && hits()[0].payload);

  /* Whirlwind is two rungs higher — level 4 must NOT unlock it. */
  readyPlayer();
  await cast('whirl');
  const rw = rejects()[0];
  check('char 4: Whirlwind is still locked (each rung gates independently)',
    !!rw && rw.reason === 'locked' && rw.need === STAM_ABILITIES.whirl.minLevel, rw);
}

// ── 3. Cost, cooldown, equipment ──
{
  setCharLevel(12);
  readyPlayer();
  const m = arm(meadow[0], psA.x + 20, psA.y);

  const cost = Math.ceil(psA.maxStamina * STAM_ABILITIES.bash.staminaPct);
  await cast('bash');
  check('a cast spends exactly staminaPct of the pool',
    psA.stamina === psA.maxStamina - cost, { spent: psA.maxStamina - psA.stamina, cost });

  /* Immediately again: the server's own cooldown must refuse it. */
  const stamMid = psA.stamina;
  const hpMid = m.hp;
  await cast('bash');
  const rc = rejects()[0];
  check('a second cast inside the cooldown is refused',
    !!rc && rc.reason === 'cooldown' && rc.ms > 0, rc);
  check('...and the refused cast spends nothing',
    psA.stamina === stamMid && m.hp === hpMid, { stamina: psA.stamina, hp: m.hp });

  /* An expired cooldown works again — proving the refusal was the clock,
     not something else in the gate chain. */
  psA._abilCd.bash = Date.now() - 1;
  psA.stamina = psA.maxStamina;
  await cast('bash');
  check('once the cooldown expires it fires again', hits().length === 1, rejects());

  /* Empty pool. */
  psA._abilCd.bash = 0;
  psA.stamina = 1;
  const hpLow = m.hp;
  await cast('bash');
  const rs = rejects()[0];
  check('an empty stamina bar refuses the cast', !!rs && rs.reason === 'stamina' && rs.cost > rs.have, rs);
  check('...and nothing is spent or hit', psA.stamina === 1 && m.hp === hpLow, { stamina: psA.stamina });

  /* Equipment: a shield bash needs a shield. */
  readyPlayer();
  psA.shield = null;
  await cast('bash');
  check('no shield, no Shield Bash', (rejects()[0] || {}).reason === 'no-shield', rejects()[0]);
  readyPlayer();
  psA.weapon = null;
  await cast('whirl');
  check('no weapon, no Whirlwind', (rejects()[0] || {}).reason === 'no-weapon', rejects()[0]);

  /* A junk kind must be inert — the handler indexes the table by a wire
     string, so '__proto__' has to resolve to nothing (CLAUDE.md's rule). */
  readyPlayer();
  let threw = false;
  try { await cast('__proto__'); } catch { threw = true; }
  check("a '__proto__' kind neither throws nor casts",
    !threw && rejects().length === 0 && hits().length === 0, { threw, rejects: rejects() });
}

// ── 4. The stun (the thing Shield Bash is FOR) ──
{
  setCharLevel(12);
  readyPlayer();
  parkAll();
  const m = arm(meadow[0], psA.x + 20, psA.y);
  m.arch = 'brute';
  m._tgNextAt = 0;                       /* let it try to wind up */

  await cast('bash');
  check('bash stamps a stun on the target',
    m._stunUntil > Date.now() && m._stunUntil <= Date.now() + STAM_ABILITIES.bash.stunMs + 50,
    { stunUntil: m._stunUntil, now: Date.now() });
  check('bash knocks the target back',
    Math.abs(m.x - (psA.x + 20)) > 1 || Math.abs(m.y - psA.y) > 1, { x: m.x, y: m.y });

  /* ═══ THE STUN IS ONLY REAL IF THE TICK HONOURS IT ═══
     Both halves below deliberately CLEAR m.atkCd first.  Bash pushes atkCd
     out as well as stamping _stunUntil, and an earlier draft of this test
     passed with the tick-loop change reverted for exactly that reason — the
     swing was suppressed by the cooldown, not by the stun, and the test was
     asserting nothing.  With atkCd zeroed, the ONLY thing standing between
     the monster and a swing (or a step) is ccMoveMult reading _stunUntil. */
  const stunUntil = m._stunUntil;
  /* Wind-ups OFF for the two sub-tests below: a brute that starts a
     telegraph freezes itself and skips its basic swing, which would make
     the control runs prove nothing (it did — the first version of this
     test "passed" that way).  The interrupt case at the end of the section
     arms a wind-up explicitly instead. */
  const noTelegraph = () => { m._tgPhase = null; m._tgUntil = 0; m._tgTarget = null; m._tgNextAt = Date.now() + 1e9; };

  /* (a) it does not CHASE.  Out of swing range, inside the sticky-aggro
     radius the bash itself just stamped. */
  m.x = psA.x + 150; m.y = psA.y;
  m.atkCd = 0; m._attackingUntil = 0; m._stunUntil = stunUntil; noTelegraph();
  const chasePos = { x: m.x, y: m.y };
  room.eventBuffer.length = 0;
  room._tickMonsters();
  check('a stunned monster does not chase',
    m.x === chasePos.x && m.y === chasePos.y, { moved: [m.x - chasePos.x, m.y - chasePos.y] });

  m._stunUntil = 0; m.atkCd = 0; m._attackingUntil = 0; noTelegraph();
  room.eventBuffer.length = 0;
  room._tickMonsters();
  check('...the same monster with the stun cleared DOES chase (control)',
    Math.abs(m.x - chasePos.x) > 0 || Math.abs(m.y - chasePos.y) > 0,
    { moved: [m.x - chasePos.x, m.y - chasePos.y] });

  /* (b) it does not SWING. */
  m.x = psA.x + 20; m.y = psA.y;
  m.atkCd = 0; m._attackingUntil = 0; m._stunUntil = Date.now() + 800; noTelegraph();
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const stunnedAttacks = room.eventBuffer.filter((e) => e.type === 'monster_attack');
  check('a stunned monster does not attack', stunnedAttacks.length === 0,
    { attacks: stunnedAttacks.length });

  m._stunUntil = 0; m.atkCd = 0; m._attackingUntil = 0; noTelegraph();
  m.x = psA.x + 20; m.y = psA.y;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const freeAttacks = room.eventBuffer.filter((e) => e.type === 'monster_attack');
  check('...the same monster with the stun cleared DOES attack (control)',
    freeAttacks.length > 0, { attacks: freeAttacks.length });

  /* The marquee interaction: bash CANCELS a wind-up (v2.3.1730 telegraphs). */
  readyPlayer();
  arm(m, psA.x + 20, psA.y);
  m.arch = 'brute';
  m._tgPhase = 'telegraph'; m._tgUntil = Date.now() + 5000; m._tgTarget = 'pa';
  await cast('bash');
  check('bash interrupts a monster mid-wind-up', m._tgPhase === null, m._tgPhase);
}

// ── 5. Whirlwind is an AoE ──
{
  setCharLevel(12);
  readyPlayer();
  parkAll();
  const r = STAM_ABILITIES.whirl.radius;
  const inside = [
    arm(meadow[0], psA.x + 10, psA.y),
    arm(meadow[1], psA.x - 20, psA.y + 10),
    arm(meadow[2], psA.x, psA.y - (r - 5)),
  ];
  const outside = arm(meadow[3], psA.x + r + 80, psA.y);
  await cast('whirl');
  check('whirlwind hits every monster inside the radius',
    hits().length === 3 && inside.every((m) => m.hp < 5000),
    { hits: hits().length, hp: inside.map((m) => m.hp) });
  check('...and nothing outside it', outside.hp === 5000, outside.hp);
  check('...crediting each hit to the caster',
    inside.every((m) => m.dmgByPlayer && m.dmgByPlayer.pa > 0),
    inside.map((m) => m.dmgByPlayer));
  check('whirlwind does not stun (that is bash\'s job)',
    inside.every((m) => !m._stunUntil || m._stunUntil <= Date.now()), inside.map((m) => m._stunUntil));

  /* Bash is single-target by contract — same crowd, one victim. */
  readyPlayer();
  for (const m of inside) arm(m, m.x, m.y);
  arm(outside, psA.x + r + 80, psA.y);
  await cast('bash');
  check('bash is single-target in the same crowd', hits().length === 1,
    { hits: hits().length });
}

// ── 6. Anticheat ceiling (constraint 3 of the PR brief) ──
{
  setCharLevel(60);
  readyPlayer();
  parkAll();
  const m = arm(meadow[0], psA.x + 10, psA.y);
  const ceiling = room._maxDmgForAttacker(psA, false);
  let worst = 0;
  for (let i = 0; i < 40; i++) {
    psA._abilCd = null;
    psA.stamina = psA.maxStamina;
    m.hp = 500000; m.maxHp = 500000;
    await cast('whirl');
    const h = hits()[0];
    if (h) worst = Math.max(worst, h.payload.dmg);
  }
  check('every ability roll sits under the ordinary melee ceiling',
    worst > 0 && worst <= ceiling, { worst, ceiling });
  /* And it is genuinely a FRACTION of a normal hit — if dmgMult were ever
     dropped, the ceiling alone would not notice. */
  const plain = room._computeAttackDamage(psA, 'melee', false);
  check('bash multiplier is below 1 (it trades damage for the stun)',
    STAM_ABILITIES.bash.dmgMult < 1 && plain.dmg > 0, STAM_ABILITIES.bash.dmgMult);
}

// ── 7. The ladder's non-ability rungs ──
{
  /* +1 bonus point at char 5, paid once. */
  psA.prog3.ms = 0;
  psA.prog3.pool = 0;
  setCharLevel(5);
  const paid = room._prog3GrantMilestones('pa', psA);
  check('char 5 pays the bonus allocation point',
    paid === milestonePointsThrough(5) && psA.prog3.pool === 1, { paid, pool: psA.prog3.pool });
  const again = room._prog3GrantMilestones('pa', psA);
  check('...exactly once (a re-run pays nothing)', again === 0 && psA.prog3.pool === 1,
    { again, pool: psA.prog3.pool });

  /* The stamina rung. */
  setCharLevel(9);
  room._prog3GrantMilestones('pa', psA);
  const stam9 = psA.maxStamina;
  setCharLevel(10);
  room._prog3GrantMilestones('pa', psA);
  check('char 10 grants +25% max stamina',
    psA.maxStamina === Math.floor(stam9 * 1.25), { at9: stam9, at10: psA.maxStamina });
  check('...and the sanitizer keeps the paid-through marker (or the bonus point loops)',
    room._sanitizeProg3(psA.prog3).ms === psA.prog3.ms,
    { stored: psA.prog3.ms, sanitized: room._sanitizeProg3(psA.prog3).ms });

  /* A veteran who levelled past the rungs before this shipped is settled
     on their next join/level-up, not left behind. */
  const vet = { prog3: { sk: { sword: { level: 20, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } },
    alloc: { def: 0, hp: 0, dodge: 0, stam: 0 }, atk: {}, pool: 0, ms: 0 } };
  room._prog3Recompute(vet);
  const owed = room._prog3GrantMilestones('vet', vet);
  check('a pre-existing high-level character is paid retroactively, once',
    owed === 1 && vet.prog3.pool === 1 && room._prog3GrantMilestones('vet', vet) === 0,
    { owed, pool: vet.prog3.pool });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
