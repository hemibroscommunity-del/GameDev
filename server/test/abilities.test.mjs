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
/* v2.3.1734: the ladder's rung 6 and the burst's actual level gate live in
   two files that CANNOT import each other (abilities.js ⇄ prog3.js would be
   a module cycle — see abilities.js's header).  This suite is the only
   place they can be pinned together. */
import { PROG3 } from '../src/prog3.js';

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
  /* ═══ v2.3.1734: THE HAND-OFF TRIPWIRE, FIRED AND RE-ARMED ═══
     v2.3.1733 left rung 6 empty and asserted the GAP, so that PR 6 filling
     it would fail this line and force a deliberate update rather than the
     two sessions silently disagreeing about who owned level 6.  PR 6 has
     landed; the assertion is flipped rather than deleted, because the thing
     worth pinning was never "the rung is empty" — it is "exactly one thing
     owns level 6, and everyone agrees what". */
  check('level 6 is Element Burst (PR 6 landed — was asserted EMPTY at v2.3.1733)',
    !!MILESTONES[6] && MILESTONES[6].burst === true && MILESTONES[6].label === 'Element Burst',
    MILESTONES[6]);
  /* Element Burst is a MANA ability with its own handler (server/src/burst.js),
     so it must NOT name a `kind`: `kind` means "look me up in
     STAM_ABILITIES", and the ladder-consistency check above would (rightly)
     reject a kind that table does not have. */
  check('...and does not claim to be a stamina ability', !MILESTONES[6].kind, MILESTONES[6]);
  /* THE TWO SOURCES OF "6" AGREE.  burst.js gates on
     PROG3.BURST_MIN_CHAR_LEVEL (mirrored to the client, drives the button);
     the ladder carries the rung the level-up celebration announces.
     abilities.js cannot import prog3.js — the module cycle its header
     documents — so this suite is the only place the two can be pinned
     together, and without it they can drift into a level whose unlock
     message and unlock gate disagree. */
  check('the ladder rung and PROG3.BURST_MIN_CHAR_LEVEL name the SAME level',
    PROG3.BURST_MIN_CHAR_LEVEL === 6, PROG3.BURST_MIN_CHAR_LEVEL);
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
  /* ═══ v2.3.2252: BASH IS UNGATED, SO THESE TWO INVERT ═══
     Owner: "Make shield bash an ability for any level (no gates) the only
     requirement is you must have your shield held."  These asserted the level
     gate that no longer exists -- rewritten to assert what replaced it: at the
     ungated floor (char 3) a bash with a shield equipped LANDS, and it is not
     refused for being locked.  The whirlwind assertions below are untouched
     and are what still proves the ladder gates per rung. */
  check('char 3: Shield Bash is NOT level-locked any more',
    !r || r.reason !== 'locked', r);
  check('...and at the ungated floor it lands, costing stamina',
    hits().length === 1 && m.hp < hp0 && psA.stamina < stam0,
    { hp: m.hp, hp0, stamina: psA.stamina, stam0, hits: hits().length, rejects: rejects() });
  /* The shield is the requirement now, and it is server-authoritative. */
  readyPlayer();
  const _savedShield = psA.shield;
  psA.shield = null;
  arm(m, psA.x + 20, psA.y);
  await cast('bash');
  const rNo = rejects()[0];
  check('char 3: ...but with NO shield it is refused, by the worker',
    !!rNo && rNo.reason === 'no-shield', rNo);
  psA.shield = _savedShield;

  setCharLevel(4);
  readyPlayer();
  arm(m, psA.x + 20, psA.y);
  await cast('bash');
  check('char 4: Shield Bash still lands', hits().length === 1 && m.hp < 5000,
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

  /* v2.3.2302: whole blocks, not a percentage.  Derived from the LIVE
     playerState rather than from a bare maxStamina, because the block size
     needs the count as well as the pool -- a bare object falls back to five
     blocks and would price this identically whether the ladder works or not. */
  const cost = STAM_ABILITIES.bash.blocks * Math.floor(psA.maxStamina / psA.stamBlocks);
  await cast('bash');
  check('a cast spends exactly one block of the pool',
    psA.stamina === psA.maxStamina - cost,
    { spent: psA.maxStamina - psA.stamina, cost, maxStamina: psA.maxStamina, blocks: psA.stamBlocks });

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
  /* v2.3.2215: a basic swing is stamp-then-resolve now — one pass stamps the
     wind-up, the next lands it.  Expiring _bwUntil cannot manufacture an
     attack for a monster that never stamped one (a frozen or stunned monster
     is gated out of STARTING a wind-up by ccMoveMult), so the negative
     assertions below stay honest. */
  if (m._bwUntil) { m._bwUntil = Date.now() - 1; room._tickMonsters(); }
  const stunnedAttacks = room.eventBuffer.filter((e) => e.type === 'monster_attack');
  check('a stunned monster does not attack', stunnedAttacks.length === 0,
    { attacks: stunnedAttacks.length });

  m._stunUntil = 0; m.atkCd = 0; m._attackingUntil = 0; noTelegraph();
  m.x = psA.x + 20; m.y = psA.y;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  /* v2.3.2215: a basic swing is stamp-then-resolve now — one pass stamps the
     wind-up, the next lands it.  Expiring _bwUntil cannot manufacture an
     attack for a monster that never stamped one (a frozen or stunned monster
     is gated out of STARTING a wind-up by ccMoveMult), so the negative
     assertions below stay honest. */
  if (m._bwUntil) { m._bwUntil = Date.now() - 1; room._tickMonsters(); }
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
  /* ═══ v2.3.1738: WHIRLWIND STUNS NOW, AND THAT IS THE POINT ═══
     v2.3.1733 asserted the opposite ("that is bash's job") and it was right
     at the time.  The owner then played it: "it has virtually no effect...
     disable enemy attacks for the first second while it pulls them in so
     it's not just a big damage sponge."  A gather with no lockout hands the
     whole pack a free swing the instant it lands on top of you.
     The assertion is FLIPPED, not deleted — what is worth pinning is that
     the lockout exists and is SHORT, because a whirl that dazed as long as
     bash (1600ms) would make bash pointless. */
  const whirlStun = STAM_ABILITIES.whirl.stunMs;
  check('whirlwind locks attacks out while it gathers (owner: not a damage sponge)',
    whirlStun > 0 && inside.every((m) => m._stunUntil > Date.now()),
    { whirlStun, until: inside.map((m) => m._stunUntil - Date.now()) });
  check('...but for less time than a bash, which is the dedicated stun',
    whirlStun < STAM_ABILITIES.bash.stunMs, { whirl: whirlStun, bash: STAM_ABILITIES.bash.stunMs });

  /* ═══ v2.3.1735: THE GATHER ═══
     Owner: "make it so that all the enemies are brought in directly around
     the character."  Whirlwind used to SHOVE (knockback 40), which scattered
     the pack out of the swing you were standing in the middle of.  It now
     places every target on a ring of pullTo px around the caster.

     Asserted on the RING, not on "closer than before": a pull implemented as
     an impulse would overshoot a monster that started nearer than the target
     radius and fling it out the far side, and "it moved inward" would pass
     for that.  Distance-to-ring is the property that actually distinguishes
     the two implementations. */
  const pullTo = STAM_ABILITIES.whirl.pullTo;
  const distA = (m) => Math.hypot(m.x - psA.x, m.y - psA.y);
  const bearing = (m) => Math.atan2(m.y - psA.y, m.x - psA.x);
  {
    /* This block MOVES the caster and three monsters, and the section below
       re-arms those same monsters at wherever they currently stand
       (`arm(m, m.x, m.y)`) — so it has to hand the world back exactly as it
       found it or it silently breaks its neighbour.  Snapshot first,
       restore last. */
    const snapshot = [meadow[0], meadow[1], meadow[2]].map((m) => ({ m, x: m.x, y: m.y }));
    const psSnap = { x: psA.x, y: psA.y };
    readyPlayer();
    /* MOVE OFF (1000,1000).  readyPlayer parks the caster there, but meadow
       is 32x32 tiles and the displacement clamp keeps entities inside
       [TILE, W-TILE] = [32, 992] — so a ring drawn around (1000,1000) is
       partly OUTSIDE the walkable box and every point past 992 gets clamped
       flat onto it.  That is a fixture artifact, not a gather bug (it cost
       an hour to see: the clamped values, 992/966, look exactly like a
       plausible wrong formula).  Every other section only asserts damage, so
       nothing noticed until a position was checked. */
    psA.x = 500; psA.y = 500;
    /* One further out than the ring, one nearer than it, one almost on top —
       the three cases an impulse-based pull gets wrong in different ways. */
    /* v2.3.1738: 200px out — more than TRIPLE the old 60px radius, so this
       monster was not merely un-gathered before, it was not even a target.
       It is the assertion that would have to change if the reach ever
       regressed toward "virtually no effect". */
    const far = arm(meadow[0], psA.x + 200, psA.y);
    const near = arm(meadow[1], psA.x - 18, psA.y);
    const onTop = arm(meadow[2], psA.x, psA.y - 6);
    const bearingsBefore = [far, near, onTop].map(bearing);
    await cast('whirl');
    const gathered = [far, near, onTop];
    check('whirlwind GATHERS every target onto the ring around the caster',
      gathered.every((m) => Math.abs(distA(m) - pullTo) < 0.001),
      gathered.map((m) => +distA(m).toFixed(2)).concat(['ring=' + pullTo]));
    /* The one that started INSIDE the ring must be pushed out to it, not
       left where it was — otherwise "gather" only means "pull". */
    check('...including one that started nearer than the ring', Math.abs(distA(near) - pullTo) < 0.001,
      { before: 18, after: +distA(near).toFixed(2), ring: pullTo });
    /* Bearings preserved = the pack keeps its shape and closes in, rather
       than being stacked on one point. */
    check('...each keeping its own bearing, so the pack closes in and does not stack',
      gathered.every((m, i) => Math.abs(bearing(m) - bearingsBefore[i]) < 1e-9),
      gathered.map(bearing));
    /* And the ring is inside melee reach — a gather that parked the pack
       outside your own swing would be a downgrade dressed as a feature. */
    check('...onto a ring your own swing can reach', pullTo < r,
      { pullTo, whirlRadius: r });
    /* The reach itself, stated as a number so a silent shrink fails here. */
    check('the vacuum reaches far enough to be worth casting (owner: "a huge radius")',
      r >= 200, { radius: r, wasBefore: 60 });
    check('...and can hold a whole swarm, not half of one',
      (STAM_ABILITIES.whirl.maxTargets || 0) >= 16, STAM_ABILITIES.whirl.maxTargets);
    for (const s of snapshot) { s.m.x = s.x; s.m.y = s.y; }
    psA.x = psSnap.x; psA.y = psSnap.y;
  }

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

/* ═══ v2.3.2266: THE LUNGE REACHES AS FAR AS IT CAN CLOSE, AND THE WORKER
   MOVES THE PLAYER THERE ═══
 *
 * Owner: "dash damage using the tap to lock on a far away monster gives an
 * 'out of range' error."  Two halves, both pinned here:
 *
 *   1. `reach` was 240, sized in v2.3.2252 for the 220px targeting perimeter,
 *      while tap-to-lock has no range limit and v2.3.2263 let the lunge close
 *      up to 900.  The client crossed the gap, arrived, swung, and the worker
 *      refused it against a bound belonging to a different feature.
 *   2. The worker now PLACES the player at contact when it accepts a declared
 *      lunge, instead of hoping the move stream got there first.  It cannot:
 *      the dash runs at ~1560 px/s against a 500*dt+80 movement budget, so a
 *      single bunched packet on a phone strands the server's copy.
 *
 * The refusal half matters as much as the acceptance half, so both are here --
 * a reach that accepts everything would pass the first assertion and be a
 * strictly worse bug.
 */
{
  parkAll();
  const far = meadow[0];
  far.alive = true; far.hp = 900; far.maxHp = 900;
  far.respawnAt = 0; far._stunUntil = 0; far._wanderPausedUntil = Date.now() + 600000;
  far.x = 5000; far.y = 5000;
  psA.x = 5000; psA.y = 5000 - 700;      /* 700px away: past the old 240, inside the new 900 */
  psA.z = 'meadow';
  psA.weapon = psA.weapon || { type: 'greatsword', tier: 'wood' };
  psA.stamina = psA.maxStamina || 100;
  if (psA._abilCd) psA._abilCd.sworddash = 0;
  const hp0 = far.hp;
  /* Stamp where the monster IS, before the cast.  The placement is computed
     from this position, and the hit knocks the monster 40px and the room tick
     moves it again -- measuring against where it ended up asks a moving value
     about a past event, which is TRAPS #44 and read 5636px the first time. */
  const mx0 = far.x, my0 = far.y;
  await room.webSocketMessage(wsA, JSON.stringify({
    type: 'ability', kind: 'sworddash', targetId: String(far.id),
  }));
  check('a lunge at a monster 700px away LANDS (it was refused at reach 240)',
    far.hp < hp0, { before: hp0, after: far.hp });
  const gap = Math.round(Math.hypot(mx0 - psA.x, my0 - psA.y));
  check(`...and the worker MOVED the player to contact, so its copy is where the lunge ended (${gap}px)`,
    gap >= 44 && gap <= 48, { gap, ps: { x: Math.round(psA.x), y: Math.round(psA.y) } });
  check('...and the next move is treated as a first move, so the jump it just made is not read as a teleport',
    psA.lastMoveAt === undefined, { lastMoveAt: psA.lastMoveAt });

  /* BEYOND the reach is still refused -- the bound moved, it did not go away. */
  psA.x = 5000; psA.y = 5000 - 1400;
  psA.stamina = psA.maxStamina || 100;
  if (psA._abilCd) psA._abilCd.sworddash = 0;
  const hp1 = far.hp;
  const beforeY = psA.y;
  await room.webSocketMessage(wsA, JSON.stringify({
    type: 'ability', kind: 'sworddash', targetId: String(far.id),
  }));
  check('a lunge at 1400px is STILL refused -- the bound moved, it did not go away',
    far.hp === hp1, { before: hp1, after: far.hp });
  check('...and a refused lunge does not move the player either',
    psA.y === beforeY, { y: psA.y, was: beforeY });

  /* BASH is deliberately not moved: it strikes on the PRESS, while the player
     is still travelling (v2.3.2260), so placing them at the target would be a
     lie about where the shove came from. */
  psA.shield = psA.shield || { type: 'wood_shield' };
  psA.x = 5000; psA.y = 5000 - 200;
  psA.stamina = psA.maxStamina || 100;
  if (psA._abilCd) psA._abilCd.bash = 0;
  const bashY = psA.y;
  await room.webSocketMessage(wsA, JSON.stringify({
    type: 'ability', kind: 'bash', targetId: String(far.id),
  }));
  check('BASH does not move the player -- it strikes on the press, not on arrival',
    psA.y === bashY, { y: psA.y, was: bashY });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
