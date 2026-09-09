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
import { STAM_ABILITIES, MILESTONES, LUNGE, staminaMilestoneMult, milestonePointsThrough,
  milestoneAbilityLevels } from '../src/abilities.js';
/* v2.3.2361: the contextual lunge's weight is a CLIENT design constant the
   worker now has to honour, so the suite imports the client's own copy rather
   than restating 0.6 (a test that copies a value out of the game stops testing
   the game -- TRAPS #35).  Plain-node importable, like the ability mirror. */
import { LUNGE_DAMAGE_MULT } from '../../src/data/gameSystems.js';
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

  /* ═══ v2.3.2327: WHIRLWIND IS NO LONGER LOCKED AT ALL ═══
     Owner: "begins as an option immediately (no level gating)."  This block
     used to assert the opposite -- that level 4 could not cast it -- and it
     was right until minLevel went 8 -> 0.  Inverted rather than deleted: the
     claim worth keeping is that a low-level character CAN cast it, which is
     the whole of what was asked for, and a test that merely stopped
     mentioning whirl would leave the change unpinned. */
  readyPlayer();
  const m2 = arm(meadow[1] || meadow[0], psA.x + 20, psA.y);
  await cast('whirl');
  check('char 4: Whirlwind casts — it is ungated now, at every level',
    rejects().length === 0 && hits().length >= 1,
    { rejects: rejects(), hits: hits().length, hp: m2 && m2.hp });
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

/* ═══ v2.3.2266: SWORDDASH REACHES AS FAR AS IT CAN CLOSE, AND THE WORKER
   MOVES THE PLAYER THERE ═══
 *
 * v2.3.2361: the four check names in this block used to call sworddash "a
 * lunge", which was fine while it was the only thing here by that name.  It
 * is not any more -- the §5.8 contextual lunge landed a real damage leg in
 * the section below -- and two different moves sharing one word in the test
 * output is the single most likely source of a wrong future edit.  Renamed;
 * nothing else in the block changed.
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
  check('a SWORDDASH at a monster 700px away LANDS (it was refused at reach 240)',
    far.hp < hp0, { before: hp0, after: far.hp });
  const gap = Math.round(Math.hypot(mx0 - psA.x, my0 - psA.y));
  check(`...and the worker MOVED the player to contact, so its copy is where the sworddash ended (${gap}px)`,
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
  check('a SWORDDASH at 1400px is STILL refused -- the bound moved, it did not go away',
    far.hp === hp1, { before: hp1, after: far.hp });
  check('...and a refused sworddash does not move the player either',
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


/* === v2.3.2361: THE CONTEXTUAL LUNGE DEALS DAMAGE ===
 *
 * Owner, answering the question doLunge left in the code at v2.3.2352: "Yes
 * lunge damage should take effect."  Until now `ability_use {type:'lunge'}`
 * spent a stamina block and did nothing in a server zone.
 *
 * DO NOT CONFUSE THIS WITH THE SECTION ABOVE.  That one is `sworddash`, the
 * melee opener cast through `ability {kind}`.  This is the section 5.8
 * swipe-toward-your-lock dodge, which has its own wire message, its own
 * handler and its own (lighter) weight, and is deliberately NOT a
 * STAM_ABILITIES row -- see the LUNGE block in server/src/abilities.js for the
 * four reasons.
 *
 * What is worth pinning is not "it does damage" but the properties that make
 * it a SERVER-REFEREED hit rather than a client claim, and the one property
 * that makes it deployable in either order: the declared targetId is REQUIRED,
 * because a client old enough to lack it is also a client that still applies
 * its own lunge number locally, and two numbers over one monster is the exact
 * bug v2.3.2350-2352 spent three versions killing.
 */
{
  const lunge = async (targetId) => {
    wsA.sent.length = 0;
    room.eventBuffer.length = 0;
    const payload = { type: 'lunge' };
    if (targetId !== undefined) payload.targetId = targetId;
    await room.webSocketMessage(wsA, JSON.stringify({ type: 'ability_use', payload }));
  };
  /* readyPlayer() does not know about the cadence floor; every case that is
     not ABOUT the floor has to clear it or it tests the floor by accident. */
  /* v2.3.2373: ...and it clears the live harvest signal, which readyPlayer()
     does not know about either.  Without this the harvest section leaks `ex`
     into whatever runs after it and every later case tests the harvest gate by
     accident. */
  const readyLunge = () => { readyPlayer(); psA._lungeAt = 0; psA.ex = null; };

  setCharLevel(60);
  parkAll();

  // -- the weight --
  {
    check("the lunge is rolled at the CLIENT's own LUNGE_DAMAGE_MULT, not a full swing",
      LUNGE.dmgMult === LUNGE_DAMAGE_MULT && LUNGE_DAMAGE_MULT === 0.6,
      { server: LUNGE.dmgMult, client: LUNGE_DAMAGE_MULT });

    /* MEASURED through the real strike path, not re-derived from the formula:
       stub the roll to a known number for one block and watch what comes out
       the other end.  Two different multipliers through ONE code path is what
       proves the cfg field is doing the scaling rather than luck. */
    readyLunge();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    const ceiling = room._maxDmgForAttacker(psA, false);
    const realCompute = room._computeAttackDamage;
    room._computeAttackDamage = () => ({ dmg: 100, isCrit: false });
    let lungeDmg = null; let bashDmg = null;
    try {
      await lunge(String(m.id));
      lungeDmg = hits()[0] && hits()[0].payload.dmg;
      readyLunge();
      arm(m, psA.x + 20, psA.y);
      await cast('bash');
      bashDmg = hits()[0] && hits()[0].payload.dmg;
    } finally { room._computeAttackDamage = realCompute; }
    check('...and 60% of a roll really is what lands (bash 75% through the same path)',
      ceiling >= 100 && lungeDmg === 60 && bashDmg === 75,
      { lungeDmg, bashDmg, ceiling });
  }

  // -- it lands, tagged, and the price does not move --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    const hp0 = m.hp;
    const stam0 = psA.stamina;
    await lunge(String(m.id));
    check('a lunge at a named, in-range monster LANDS (it dealt nothing before v2.3.2361)',
      hits().length === 1 && m.hp < hp0, { hits: hits().length, hp: m.hp, hp0, rejects: rejects() });
    check('...tagged `ability: lunge`, which is what makes the client paint the number',
      hits()[0] && hits()[0].payload.ability === 'lunge', hits()[0] && hits()[0].payload);
    /* The price is the ONE thing this change must not move: it is what
       index.js:_abilityCost has charged since v2.3.2302. */
    check('...for exactly the one stamina block it always cost, charged once',
      psA.stamina === stam0 - room._blockCost(psA, 'stamina', 1),
      { spent: stam0 - psA.stamina, expected: room._blockCost(psA, 'stamina', 1) });
    check('...through the ordinary melee ceiling, on a roll that is a FRACTION of one',
      hits()[0].payload.dmg <= room._maxDmgForAttacker(psA, false) && LUNGE.dmgMult < 1,
      { dmg: hits()[0].payload.dmg, ceiling: room._maxDmgForAttacker(psA, false) });
  }

  // -- THE DEPLOY-ORDER PROPERTY.  Nothing else pins this. --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 10, psA.y);
    const hp0 = m.hp;
    await lunge(undefined);
    check('an UNNAMED lunge deals nothing even with a monster 10px away',
      hits().length === 0 && m.hp === hp0, { hits: hits().length, hp: m.hp, hp0 });
    /* This is the assertion that must survive: bash and sworddash fall back to
       a 70px anonymous scan for exactly this case, and copying that here would
       hand a pre-v2.3.2351 client -- which still paints its OWN lunge number in
       a server zone -- a second, server-rolled number for the same swing.  The
       field is the opt-in handshake, which is also why no caps flag exists. */
    check('...and the block was still spent, so no deploy order gets a free lunge',
      psA.stamina === psA.maxStamina - room._blockCost(psA, 'stamina', 1),
      { stamina: psA.stamina, max: psA.maxStamina });
  }

  // -- zone: the server's own copy, never the wire --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    const hp0 = m.hp;
    psA.z = 'frost';
    await lunge(String(m.id));
    check('a lunge from a zone you are not in touches nothing (v2.3.1628 by construction)',
      hits().length === 0 && m.hp === hp0, { hp: m.hp, hp0, hits: hits().length });
    psA.z = 'meadow';
  }

  /* -- reach: the move's OWN, bracketed round LUNGE.reach --
     v2.3.2372: these two used to bracket room.PVE_MELEE_RANGE, because
     _lungeStrike measured against it directly.  That number is the anticheat
     TOLERANCE for a client-claimed swing (sized for iPhone-over-cellular
     position lag on top of a swing's real reach), not a reach any honest swing
     has, so borrowing it handed this move a ~400px damage lane that nothing
     else in the attack model has.  Bracketed round the move's own 220 now, with
     a third case that fails if anyone puts the tolerance back. */
  {
    const reach = LUNGE.reach;
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + (reach - 20), psA.y);
    const hp0 = m.hp;
    await lunge(String(m.id));
    check('a lunge just inside its own reach lands (' + (reach - 20) + 'px of ' + reach + ')',
      m.hp < hp0, { hp: m.hp, hp0, rejects: rejects() });
    /* The refusal half matters as much as the acceptance half -- a reach that
       accepts everything passes the first assertion and is strictly worse than
       no reach at all (the sworddash block's own argument, v2.3.2266). */
    readyLunge();
    arm(m, psA.x + (reach + 20), psA.y);
    const hp1 = m.hp;
    await lunge(String(m.id));
    check('...and one just outside it does not (' + (reach + 20) + "px) -- the lunge is NOT sworddash's 900",
      m.hp === hp1 && hits().length === 0, { hp: m.hp, hp1, hits: hits().length });
    /* THE ASSERTION THAT CATCHES THE REGRESSION THIS BLOCK EXISTS FOR: 380px is
       comfortably inside PVE_MELEE_RANGE and must still be refused. */
    readyLunge();
    arm(m, psA.x + (room.PVE_MELEE_RANGE - 20), psA.y);
    const hp2 = m.hp;
    await lunge(String(m.id));
    check('...and it does NOT borrow the anticheat tolerance as a reach ('
      + (room.PVE_MELEE_RANGE - 20) + 'px is inside PVE_MELEE_RANGE and still refused)',
      m.hp === hp2 && hits().length === 0, { hp: m.hp, hp2, hits: hits().length });
    /* ...and the tolerance is still the outer backstop, not a thing the table
       can raise past: Math.min, so a LUNGE.reach edit can only tighten. */
    check('...with PVE_MELEE_RANGE still the outer bound the table cannot exceed',
      LUNGE.reach < room.PVE_MELEE_RANGE, { reach: LUNGE.reach, bound: room.PVE_MELEE_RANGE });
    /* ═══ v2.3.2373: AN ABSOLUTE BOUND, BECAUSE THE TWO ABOVE ARE RELATIVE ═══
       Both bracketing cases are written as LUNGE.reach +/- 20, so they TRACK
       the constant: set LUNGE.reach to 900 and every one of them still passes
       while the move quietly becomes sworddash.  These two do not read it.
       260 is the first round number past the derivation in the LUNGE block
       (58 px of roll travel + 122 px of ordinary swing reach + 40 px of lag =
       ~220), so a widening has to argue with a literal instead of dragging the
       assertions along behind it. */
    readyLunge();
    arm(m, psA.x + 260, psA.y);
    const hp3 = m.hp;
    await lunge(String(m.id));
    check('a lunge at 260px is refused -- an ABSOLUTE bound, one that does not track the constant',
      m.hp === hp3 && hits().length === 0, { hp: m.hp, hp3, hits: hits().length });
    check('...and LUNGE.reach itself is <= 220 (58 roll travel + 122 swing reach + 40 lag)',
      LUNGE.reach <= 220, LUNGE.reach);
  }

  // -- damageability --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    m._invulnUntil = Date.now() + 5000;
    const hp0 = m.hp;
    await lunge(String(m.id));
    check('an invulnerable monster takes nothing from a lunge (v2.3.2221)',
      m.hp === hp0 && hits().length === 0, { hp: m.hp, hp0 });
    /* ...and the refusal is CHEAP.  _abilityStrikeMonster re-checks
       damageability, so the gate inside _lungeStrike looks redundant -- it is
       not, and this is what says so: it sits ahead of the cadence stamp and
       _endExtraction, so a lunge into an invulnerable phase must not eat your
       next 175ms or break a harvest you are standing in.  (Found by the
       mutation run: deleting that gate left every other assertion green.) */
    check('...and refusing it costs the player nothing -- no cadence burned, no harvest broken',
      (psA._lungeAt || 0) === 0 && !room.extractions.pa,
      { lungeAt: psA._lungeAt, extraction: room.extractions.pa });
    m._invulnUntil = 0;
    readyLunge();
    m.alive = false;
    const hp1 = m.hp;
    await lunge(String(m.id));
    check('...nor does a dead one', m.hp === hp1 && hits().length === 0, { hp: m.hp, hp1 });
    m.alive = true;
  }

  // -- the weapon gate (v2.3.1682, "the first swing is free" in a new costume) --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    const hp0 = m.hp;
    const savedWeapon = psA.weapon;
    psA.weapon = null;
    await lunge(String(m.id));
    check('a bare-handed lunge deals nothing (no greatsword fallback roll)',
      m.hp === hp0 && hits().length === 0, { hp: m.hp, hp0 });
    psA.weapon = savedWeapon;
  }

  // -- the cadence floor: NEW, because ability_use has never had one --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    await lunge(String(m.id));
    const hpAfterFirst = m.hp;
    const stamAfterFirst = psA.stamina;
    await lunge(String(m.id));
    check('a second lunge inside the cadence floor deals nothing',
      m.hp === hpAfterFirst && hits().length === 0, { hp: m.hp, was: hpAfterFirst });
    /* The floor gates the DAMAGE, not the pool -- a spammer still burns
       stamina for nothing, which is the right direction. */
    check('...but it still paid, so spamming the wire is never free',
      psA.stamina < stamAfterFirst, { stamina: psA.stamina, was: stamAfterFirst });
    /* ═══ v2.3.2374: THIS ASSERTION USED TO SAY THE OPPOSITE ═══
       It read "the floor is below the client's own 250ms roll window, so
       nothing honest is refused", pinning cooldownMs < 250.  That premise is
       gone: the owner was shown the measured rates and chose "about 1 second",
       accepting that a player CAN out-lunge the floor and that the extra ones
       land no damage (they are still dodges -- i-frames, travel and sound are
       on the mobility path).

       What replaces it is the property they actually bought.  The stamina pool
       cannot bound this lane -- staminaSalts is a shop item, so a player is
       MEANT to refill it -- which means the cooldown is the only bound, and the
       number that matters is what a client with an infinite bar extracts:
           1000 / cooldownMs * dmgMult  full-swing-equivalents per second.
       At 1000ms that is 0.6/s, which is what a MEASURED honest fresh character
       already gets (0.600 lunges/s, pool-bound).  So cheating buys nothing here.
       Lower the cooldown and nothing downstream catches it -- three rounds of
       this change tried to make the pool catch it and could not. */
    check('the cheat ceiling sits at or below an honest rate (the cooldown is the only bound)',
      (1000 / LUNGE.cooldownMs) * LUNGE.dmgMult <= 0.6 + 1e-9,
      { swingEquivPerSec: (1000 / LUNGE.cooldownMs) * LUNGE.dmgMult, cooldownMs: LUNGE.cooldownMs });
    psA._lungeAt = 0;
    psA.stamina = psA.maxStamina;
    await lunge(String(m.id));
    check('...once the floor expires it fires again (the refusal was the clock)',
      hits().length === 1, { hits: hits().length, rejects: rejects() });
  }

  // -- the element, from the server's own weapon; status only, never a collision --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    psA.weapon = { type: 'sword', tierMult: 1, element1: 'flame' };
    await lunge(String(m.id));
    check('a flame weapon burns what it lunges into, credited to the luncher',
      !!(m.statuses && m.statuses.burn) && m.statuses.burn.sourceId === 'pa',
      m.statuses && m.statuses.burn);
    /* The collision lane bypasses dmgCap entirely (COLLISION_BURST_CAP), and
       the client-authoritative lunge this mirrors never resolves one.  A
       second, cheaper door onto that lane is not what the owner approved. */
    readyLunge();
    /* readyPlayer() re-stamps a PLAIN sword, so the element has to be put back
       or this sub-case silently asserts that a weapon with no element fails to
       detonate -- which is true of any build and tests nothing.  (Caught by the
       mutation run: injecting a resolveElementCollision call here left the
       suite green.) */
    psA.weapon = { type: 'sword', tierMult: 1, element1: 'flame' };
    arm(m, psA.x + 20, psA.y);
    m.statuses = { freeze: { id: 'freeze', element: 'frost', remaining: 5, maxDur: 5, stacks: 1, sourceId: 'pa', power: 1, appliedAt: Date.now(), lastTick: Date.now() } };
    await lunge(String(m.id));
    check('...but it never DETONATES one: no collision hit, and the old status survives',
      hits().every((h) => !h.payload.collision) && !!m.statuses.freeze,
      { collisions: hits().filter((h) => h.payload.collision).length, statuses: Object.keys(m.statuses) });
    readyLunge();
    arm(m, psA.x + 20, psA.y);
    psA.weapon = { type: 'sword', tierMult: 1 };
    await lunge(String(m.id));
    check('...and a plain weapon applies no status at all',
      Object.keys(m.statuses || {}).length === 0, m.statuses);
  }

  // -- ONE credit pipeline: a killing lunge is indistinguishable from a swing --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    m.hp = 3; m.maxHp = 5000;
    m._burstDone = true;   /* skip the v2.3.2224 slime-burst deferral */
    /* An ELEMENTAL weapon, or the corpse-guard assertion below passes for the
       trivial reason that there was no element to apply. */
    psA.weapon = { type: 'sword', tierMult: 1, element1: 'flame' };
    await lunge(String(m.id));
    const hit = hits()[0];
    check('a lunge that overkills is clamped to the hp that was actually there',
      !!hit && hit.payload.dmg === 3 && m.hp === 0, { dmg: hit && hit.payload.dmg, hp: m.hp });
    /* The credit map itself is asserted on a NON-lethal lunge below: the kill
       path resets dmgByPlayer for the respawn (combat.js v2.3.1202), so asking
       the corpse what it was credited is asking a moving value about a past
       event (TRAPS #44).  The PROTOTYPE survives that reset and is checked
       here anyway, since a plain {} would come back through it. */
    check('...on a map that is still null-prototype after the kill resets it',
      !!m.dmgByPlayer && Object.getPrototypeOf(m.dmgByPlayer) === null,
      { proto: m.dmgByPlayer && Object.getPrototypeOf(m.dmgByPlayer) });
    const kills = room.eventBuffer.filter((e) => e.type === 'monster_kill');
    check('...and it resolves through the ONE kill path, so xp/gold/loot credit cannot diverge',
      kills.length === 1 && kills[0].payload.killerId === 'pa'
        && kills[0].payload.recipients.indexOf('pa') >= 0,
      kills[0] && kills[0].payload);
    /* A corpse must not catch a burn -- the m.hp > 0 guard, same rule the
       inline copy in _handleMonsterDamage plays by. */
    check('...and a lethal lunge applies no status to the corpse',
      !(m.statuses && Object.keys(m.statuses).length), m.statuses);
  }

  // -- ...and the contribution credit itself, on a monster that survives it --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    await lunge(String(m.id));
    const dealt = hits()[0] && hits()[0].payload.dmg;
    check('a lunge credits the luncher its exact damage, on a null-prototype map',
      !!dealt && m.dmgByPlayer && m.dmgByPlayer.pa === dealt
        && Object.getPrototypeOf(m.dmgByPlayer) === null,
      { dealt, dmgByPlayer: m.dmgByPlayer && Object.assign({}, m.dmgByPlayer) });
    /* Sticky aggro, exactly as a swing does it -- hitting something has to
       pull it onto you or the lunge is a way to farm without consequence. */
    check('...and pulls the monster onto them, so a lunge is not free farming',
      m._aggroOverrideTarget === 'pa' && m._aggroOverrideUntil > Date.now(),
      { target: m._aggroOverrideTarget, until: m._aggroOverrideUntil - Date.now() });
  }

  // -- the things a targetId must never reach --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    const hp0 = m.hp;
    let threw = false;
    try { await lunge('__proto__'); } catch { threw = true; }
    check("a '__proto__' targetId neither throws nor hits, and leaves the zone list a list",
      !threw && hits().length === 0 && m.hp === hp0 && Array.isArray(room.monsters.meadow),
      { threw, hits: hits().length });
    /* PvP fails closed by construction: the lookup runs over the monster list
       only.  This IS reachable from an unmodified client -- a duel lock and a
       tapped player both write S.lockedTarget with type 'player' -- so it is a
       real path, not a hypothetical. */
    readyLunge();
    threw = false;
    try { await lunge('pa'); } catch { threw = true; }
    const pvp = room.eventBuffer.filter((e) => e.type === 'pvp_hit');
    check('a PLAYER id as the target hits nothing and opens no PvP door',
      !threw && hits().length === 0 && pvp.length === 0, { threw, hits: hits().length, pvp: pvp.length });
  }

  // -- the damage leg is lunge-only --
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    const hp0 = m.hp;
    for (const t of ['dodge', 'retreat']) {
      wsA.sent.length = 0; room.eventBuffer.length = 0;
      psA.stamina = psA.maxStamina; psA._lungeAt = 0;
      await room.webSocketMessage(wsA, JSON.stringify({
        type: 'ability_use', payload: { type: t, targetId: String(m.id) },
      }));
    }
    check('a dodge or a retreat carrying a targetId still deals nothing',
      m.hp === hp0, { hp: m.hp, hp0 });
  }

  /* ══ a harvest refuses the lunge (v2.3.2372), on the LIVE signal (v2.3.2373) ══
     This used to assert the opposite: that a landed lunge called
     _endExtraction, on v2.3.1704's "swinging ends an extraction".  That is
     server-side truth and it made the two halves disagree -- the client
     refuses an ATTACK mid-harvest (playerActions.js: `if (S._extraction)
     return;` at the top of swingAttack and specialAttack) but has no such gate
     on the dodge path, and the desktop Space-bar route into
     triggerContextualDodge has none either.  So a desktop player could lunge
     mid-harvest and silently lose the harvest while their client kept painting
     it.  The worker plays by the client's own rule now.

     v2.3.2373: AND IT READS ps.ex, NOT this.extractions.  The first draft of
     that rule gated on the extraction RECORD and called it "the server's exact
     mirror of the client's S._extraction".  It is a lazily-swept ledger: there
     is no extraction_cancel message type in this repo, so a player who taps a
     node and walks away leaves the record standing for EXTRACTION_TIMEOUT_MS
     -- ten minutes -- and every lunge in those ten minutes silently dealt
     nothing while still charging the block.  The abandoned-harvest case below
     is that regression, written down. */
  {
    readyLunge();
    parkAll();
    const m = arm(meadow[0], psA.x + 20, psA.y);
    const hp0 = m.hp;
    const startedAt = Date.now();
    room.extractions.pa = { nodeId: 'n1', zone: 'meadow', skill: 'wood', startedAt };
    psA._exAt = startedAt;
    psA.ex = 'chop';           /* the live signal, as movement.js stamps it */
    await lunge(String(m.id));
    check('a lunge mid-harvest deals nothing -- the same rule the client applies to attacks',
      m.hp === hp0 && hits().length === 0, { hp: m.hp, hp0, hits: hits().length });
    check('...and the harvest it interrupted is still running, not silently voided',
      !!room.extractions.pa && room.extractions.pa.startedAt === startedAt && psA._exAt === startedAt,
      { extraction: room.extractions.pa, exAt: psA._exAt });
    /* Cheap refusal, ahead of the cadence stamp -- the invulnerable case's
       argument, and the reason the gate sits where it sits. */
    check('...and it burned no cadence, so the lunge after the harvest is not on a clock',
      (psA._lungeAt || 0) === 0, { lungeAt: psA._lungeAt });

    /* ═══ THE ABANDONED HARVEST.  THIS IS THE CASE THAT WENT RED. ═══
       Record still present -- nothing deletes it for ten minutes -- but the
       player has moved on, so the next move packet already cleared ps.ex.
       Gating on the record muted the lunge for all ten of those minutes;
       gating on the live signal does not.  The record is asserted STILL
       PRESENT so this cannot pass for the trivial reason that something
       swept it. */
    readyLunge();
    psA.ex = null;
    arm(m, psA.x + 20, psA.y);
    const hp1 = m.hp;
    await lunge(String(m.id));
    check('...but an ABANDONED harvest does NOT block it (record still there, player walked off)',
      m.hp < hp1 && hits().length === 1 && !!room.extractions.pa,
      { hp: m.hp, hp1, hits: hits().length, stillRecorded: !!room.extractions.pa, rejects: rejects() });

    /* ...and the live signal covers what the ledger never held: cooking has no
       server node and is in this.extractions for nobody (v2.3.1765), while the
       client's own `if (S._extraction) return;` refuses an attack during it.

       v2.3.2374: FIREMAKING IS THE EXCEPTION, and the sentence that used to sit
       here said the opposite -- it claimed the client refuses an attack during
       firemaking too.  It does not.  BroTown.jsx builds the code as
       `S._firemaking ? 'fire' : <_exSkill-derived>`, and only the second half
       requires S._extraction; every other code (mine/chop/fish/cook) implies it.
       So during firemaking the client swings happily while a bare `if (ps.ex)`
       gate had the server refusing the lunge -- the two halves disagreeing,
       which is the exact bug this whole harvest gate exists to avoid. */
    readyLunge();
    delete room.extractions.pa;
    psA.ex = 'cook';
    arm(m, psA.x + 20, psA.y);
    const hp2 = m.hp;
    await lunge(String(m.id));
    check('...and a COOK refuses it too, though the extraction ledger never held cooking',
      m.hp === hp2 && hits().length === 0, { hp: m.hp, hp2, hits: hits().length });

    readyLunge();
    psA.ex = 'fire';
    arm(m, psA.x + 20, psA.y);
    const hpF = m.hp;
    await lunge(String(m.id));
    check("...but FIREMAKING does not -- the client swings during it, so the server must let the lunge land",
      m.hp < hpF && hits().length === 1, { hp: m.hp, hpF, hits: hits().length, rejects: rejects() });

    readyLunge();
    arm(m, psA.x + 20, psA.y);
    const hp3 = m.hp;
    await lunge(String(m.id));
    check('...and once the harvest is over the same lunge lands',
      m.hp < hp3 && hits().length === 1,
      { hp: m.hp, hp3, hits: hits().length, rejects: rejects() });
  }
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
