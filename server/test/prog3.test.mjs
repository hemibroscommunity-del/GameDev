/* Prog3 combat-rebuild test (v2.3.1659; spec:
 * docs/specs/progression-v3.md, design: docs/PROGRESSION-REDESIGN.md).
 *
 * Pins the server core of the trained-skill progression:
 *   1. Migration v10 respec: levels from carried XP (legacy+1), pool =
 *      Σ legacy weapon levels + defense level, alloc zeroed, absent-only.
 *   2. Fresh-join bootstrap: levels 1/1/1, char level 3, §5-B pools.
 *   3. Trained XP accrual at hit time (melee→sword; v2.3.1710: a special
 *      trains the weapon that fired it, not Magic) and
 *      the level-up: +1 pool, +1 char level, full restore, prog3_level.
 *   4. Allocation endpoint: pool gate, stat whitelist ('__proto__'
 *      rejected), the §6-C double cap (stat cap AND min(100, level)).
 *   5. Combat math: defense % reduction, dodge from the allocated stat,
 *      dropped channels inert (laststand/thorns/bulwark/attunement/
 *      conditioning/t2Flat) while legacy players keep them.
 *   6. Anticheat ceiling lockstep: every prog3 roll ≤ _maxDmgForAttacker.
 *   7. _sanitizeProg3 bounds corrupt stored shapes.
 */
import { GameRoom } from '../src/index.js';
import { runRpgMigrations, RPG_SCHEMA_VERSION } from '../src/migrations.js';
import { PROG3, prog3XpRequired, prog3FromLegacy, prog3SplitAtk,
  prog3StatDef, prog3FreshAtk /* v2.3.2512 */ } from '../src/prog3.js';
import { BLACKSMITH_TIERS } from '../src/data.js';

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

// ── 1. Migration v10: the respec ──
{
  /* v2.3.1772: these three read the CONSTANT rather than a literal 11.  This
     suite is about the prog3 migrations (v10/v11), not about which migration
     happens to be last — pinned to a literal, every future migration fails it
     for no reason, which is how a suite starts getting edited without being
     read.  What matters here is that v11 has shipped and the registry runs to
     completion. */
  check('the prog3 migrations have shipped', RPG_SCHEMA_VERSION >= 11, RPG_SCHEMA_VERSION);
  const blob = {
    _v: 9,
    weaponSkills: {
      sword: { level: 7, xp: 500 },
      bow: { level: 0, xp: 10 },
      staff: { level: 100, xp: 12345 },
    },
    defenseSkill: { level: 12, xp: 40 },
    t2Flat: { defense: { ironskin: 300 } },
  };
  const res = runRpgMigrations(blob);
  check('v10+v11 run clean', res.failed === null && res.version === RPG_SCHEMA_VERSION, res);
  check('sword level = legacy+1, xp carried',
    blob.prog3.sk.sword.level === 8 && blob.prog3.sk.sword.xp === 500, blob.prog3.sk.sword);
  check('bow floors at level 1', blob.prog3.sk.bow.level === 1 && blob.prog3.sk.bow.xp === 10, blob.prog3.sk.bow);
  check('staff caps at 100, xp zeroed', blob.prog3.sk.staff.level === 100 && blob.prog3.sk.staff.xp === 0, blob.prog3.sk.staff);
  /* v2.3.2199: weapon levels mint at POINTS_PER_LEVEL (3); the defense
     carry stays a one-time unchannelled bonus and does NOT triple. */
  check('pool = Σ weapon levels × PPL + defense level',
    blob.prog3.pool === (7 + 0 + 100) * PROG3.POINTS_PER_LEVEL + 12, blob.prog3.pool);
  check('poolBy stamps each weapon lane at the minted rate',
    blob.prog3.poolBy.sword === 7 * PROG3.POINTS_PER_LEVEL
      && blob.prog3.poolBy.bow === 0
      && blob.prog3.poolBy.staff === 100 * PROG3.POINTS_PER_LEVEL, blob.prog3.poolBy);
  check('the rate stamp rides the respec (v14 must not double-grant)',
    blob.prog3.ppl === PROG3.POINTS_PER_LEVEL, blob.prog3.ppl);
  /* v2.3.1668: alloc is the BODY set only; offense lives in atk, keyed
     by combat type.  v2.3.2199: + elem / + dmg.
     v2.3.2512: elem LEAVES for atk (per weapon); eres + mana arrive. */
  /* v2.3.2592: + move (shared); crit/critDmg -> luck, + range, + special. */
  check('body alloc starts zeroed',
    Object.values(blob.prog3.alloc).every((v) => v === 0)
      && Object.keys(blob.prog3.alloc).sort().join(',') === 'def,dodge,eres,hp,mana,move,stam', blob.prog3.alloc);
  check('per-type offense starts zeroed for all three skills',
    PROG3.SKILLS.every((c) => blob.prog3.atk[c]
      && Object.keys(blob.prog3.atk[c]).sort().join(',') === 'aspd,dmg,elem,luck,range,special'
      && Object.values(blob.prog3.atk[c]).every((v) => v === 0)),
    blob.prog3.atk);
  /* v2.3.2592: the respec mints the SHARED pool beside the lane pool, one
     per lane point, and stamps the rate (so v17 cannot double-grant). */
  check('the respec mints shared points at SHARED_POINTS_PER_LEVEL, stamped',
    blob.prog3.shared === (7 + 0 + 100) * PROG3.SHARED_POINTS_PER_LEVEL
      && blob.prog3.spl === PROG3.SHARED_POINTS_PER_LEVEL,
    { shared: blob.prog3.shared, spl: blob.prog3.spl });
  check('legacy fields kept for rollback', blob.weaponSkills.sword.level === 7 && blob.t2Flat.defense.ironskin === 300);
  // Absent-only: a second pass (or a hand-reset _v) never re-derives.
  blob.prog3.sk.sword.level = 42;
  blob._v = 9;
  runRpgMigrations(blob);
  check('v10 is absent-only (live prog3 wins)', blob.prog3.sk.sword.level === 42, blob.prog3.sk.sword);
  const empty = {};
  runRpgMigrations(empty);
  check('empty blob gets fresh prog3', empty.prog3.sk.sword.level === 1 && empty.prog3.pool === 0, empty.prog3);
  const fresh = prog3FromLegacy(null);
  check('prog3FromLegacy(null) is the fresh shape',
    fresh.sk.bow.level === 1 && fresh.pool === 0 && fresh.alloc.def === 0, fresh);
}

// ── 2. Fresh-join bootstrap ──
const room = new GameRoom(mockState, mockEnv);
const wsA = fakeWs('pa');
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
room.sessions.set(wsA, baseSession());
const joinData = { x: -100000, y: -100000, z: 'meadow' };
await room.webSocketMessage(wsA, JSON.stringify({ type: 'join', id: 'pa', name: 'Trainee', protocolVersion: 2, data: { ...joinData } }));
const psA = room.playerState.pa;
{
  check('fresh join seeds prog3', !!psA.prog3 && psA.prog3.sk.sword.level === 1 && psA.prog3.pool === 0, psA.prog3);
  check('char level = Σ trained = 3', psA.level === 3, psA.level);
  /* v2.3.1727: derived from PROG3, not the literal 106 that was here — the
     retune moved HP_PER_LEVEL and a hand-typed expectation just re-asserts
     whatever the constant happened to be on the day. */
  check('maxHp = 100 + level×HP_PER_LEVEL (no armor, no hp pts)',
    psA.maxHp === 100 + 3 * PROG3.HP_PER_LEVEL, { maxHp: psA.maxHp, per: PROG3.HP_PER_LEVEL });
  check('maxStamina = 100 flat', psA.maxStamina === 100, psA.maxStamina);
  /* v2.3.1734: derived from PROG3, same reasoning as the maxHp line above
     — the mana rework moved MANA_PER_MAGIC_LEVEL and a hand-typed 101 just
     re-asserted whatever the constant happened to be that day.  burst.test
     owns the pacing assertions (casts per bar at each Magic level). */
  check('maxMana = floor(100 + magic×MANA_PER_MAGIC_LEVEL)',
    psA.maxMana === Math.floor(100 + 1 * PROG3.MANA_PER_MAGIC_LEVEL),
    { maxMana: psA.maxMana, per: PROG3.MANA_PER_MAGIC_LEVEL });
  const sync = msgsOfType(wsA, 'state_sync')[0];
  check('caps.prog3 advertised', sync && sync.caps && sync.caps.prog3 === true, sync && sync.caps && sync.caps.prog3);
  const st = msgsOfType(wsA, 'player_state')[0];
  check('player_state echoes prog3', st && st.payload && !!st.payload.prog3, st && Object.keys(st.payload || {}));
}

// ── 3. Trained XP accrual + level-up ──
{
  psA.hp = 5; psA.stamina = 5; psA.mana = 5;
  /* ═══ v2.3.1727: DAMAGE AND XP ARE DIFFERENT UNITS ═══
     This block used to hand _prog3AwardXp a raw XP figure and rely on
     XP_PER_DMG being exactly 1.0 to make the two interchangeable.  The
     retune dropped the rate to 0.4, so `flat` now says which unit is being
     passed, and the assertion below pins the conversion rather than
     assuming it away.  quests.js passes flat for the same reason: a quest
     reward is XP already, and was being silently scaled by the damage
     rate. */
  room._prog3AwardXp('pa', psA, 'sword', prog3XpRequired(1) - 1, { flat: true });
  check('xp below threshold: no level', psA.prog3.sk.sword.level === 1 && psA.prog3.pool === 0, psA.prog3.sk.sword);
  room._prog3AwardXp('pa', psA, 'sword', 1, { flat: true });
  /* v2.3.2199: a level-up mints POINTS_PER_LEVEL (3), stamped to the lane. */
  check('level-up: sword 2, pool 3, char level 4',
    psA.prog3.sk.sword.level === 2 && psA.prog3.pool === PROG3.POINTS_PER_LEVEL && psA.level === 4,
    { sk: psA.prog3.sk.sword, pool: psA.prog3.pool, level: psA.level });
  check('level-up: the minted points are channelled to the earning skill',
    psA.prog3.poolBy.sword === PROG3.POINTS_PER_LEVEL && psA.prog3.poolBy.bow === 0,
    psA.prog3.poolBy);
  check('level-up restores resources', psA.hp === psA.maxHp && psA.stamina === psA.maxStamina && psA.mana === psA.maxMana,
    { hp: psA.hp, maxHp: psA.maxHp });
  const lvlMsgs = msgsOfType(wsA, 'prog3_level');
  check('prog3_level notification sent', lvlMsgs.length === 1
    && lvlMsgs[0].payload.skill === 'sword' && lvlMsgs[0].payload.level === 2 && lvlMsgs[0].payload.charLevel === 4,
    lvlMsgs.map((m) => m.payload));

  /* The conversion itself, both directions — the thing that made the
     v2.3.1727 pacing change safe to reason about.  DAMAGE is scaled by
     XP_PER_DMG; FLAT xp is not.  If these ever agree again, someone has
     collapsed the two units back together and the quest table silently
     pays XP_PER_DMG× what it advertises. */
  {
    const before = psA.prog3.sk.bow.xp;
    room._prog3AwardXp('pa', psA, 'bow', 100);                   /* 100 damage */
    const dmgGain = psA.prog3.sk.bow.xp - before;
    room._prog3AwardXp('pa', psA, 'bow', 100, { flat: true });   /* 100 xp */
    const flatGain = psA.prog3.sk.bow.xp - before - dmgGain;
    check('damage is converted at XP_PER_DMG', Math.abs(dmgGain - 100 * PROG3.XP_PER_DMG) < 1e-9,
      { dmgGain, rate: PROG3.XP_PER_DMG });
    check('flat xp is NOT scaled by the damage rate', Math.abs(flatGain - 100) < 1e-9, { flatGain });
  }

  // Hit-time accrual through the real monster_damage handler:
  // melee → sword; v2.3.1710: a special trains its OWN weapon.
  const m = (room.monsters.meadow || []).find((x) => x.alive);
  check('harness found a live meadow monster', !!m);
  if (m) {
    m.hp = 100000; m.maxHp = 100000; m.atkCd = Date.now() + 1e9;
    psA.x = m.x; psA.y = m.y; psA.z = 'meadow';
    const sess = [...room.sessions.values()].find((s) => s.id === 'pa');
    const xpBefore = psA.prog3.sk.sword.xp;
    room._handleMonsterDamage(sess, { monsterId: m.id, zone: 'meadow', slot: 'melee' });
    check('melee hit trains sword (xp = credited damage)', psA.prog3.sk.sword.xp > xpBefore,
      { before: xpBefore, after: psA.prog3.sk.sword.xp });
    /* ═══ v2.3.1710: A SPECIAL TRAINS THE WEAPON THAT FIRED IT ═══
       This assertion used to read "special hit trains staff/Magic", pinning
       §3's rule that every special credited Magic whatever you were holding.
       The owner hit it in a playthrough — "I was shooting a bow ... and it
       levelled up my magic combat skill instead" — and, asked directly, chose
       to move specials onto their own weapon while keeping Magic's
       cross-weapon value as the MANA POOL every special spends.  So a MELEE
       special must now train sword and leave Magic alone; the old assertion
       is inverted rather than deleted, because "Magic did not move" is the
       half that would silently rot if the coupling ever came back. */
    const staffBefore = psA.prog3.sk.staff.xp + psA.prog3.sk.staff.level;
    const swordBefore2 = psA.prog3.sk.sword.xp + psA.prog3.sk.sword.level;
    room._handleMonsterDamage(sess, { monsterId: m.id, zone: 'meadow', slot: 'melee', special: true });
    check('special hit trains the WEAPON that fired it, not Magic',
      psA.prog3.sk.sword.xp + psA.prog3.sk.sword.level > swordBefore2,
      { before: swordBefore2, after: psA.prog3.sk.sword.xp + psA.prog3.sk.sword.level });
    check('...and Magic is untouched by a melee special',
      psA.prog3.sk.staff.xp + psA.prog3.sk.staff.level === staffBefore,
      psA.prog3.sk.staff);
  }
}

// ── 4. Allocation endpoint ──
{
  const sess = { id: 'pa' };
  const p3 = psA.prog3;
  /* v2.3.2592: hp is a SHARED stat now, so the pool that gates it is the
     shared one — an empty shared pool (and no unchannelled remainder)
     refuses, whatever the lane pools hold.  The level-up in §3 minted 3
     shared points; zeroed here so the refusal is the thing under test. */
  p3.pool = 0; p3.shared = 0;
  room._handleProg3Allocate(sess, { stat: 'hp' });
  check('empty pool rejects', p3.alloc.hp === 0 && p3.pool === 0 && p3.shared === 0, p3);
  p3.pool = 10; p3.shared = 10;
  room._handleProg3Allocate(sess, { stat: 'coins' });
  room._handleProg3Allocate(sess, { stat: '__proto__' });
  room._handleProg3Allocate(sess, { stat: 'crit', cat: 'sword' });     /* v2.3.2592: the retired names are refused too */
  room._handleProg3Allocate(sess, { stat: 'critDmg', cat: 'sword' });
  room._handleProg3Allocate(sess, {});
  check('bad stat names reject (pools untouched)', p3.pool === 10 && p3.shared === 10 && p3.alloc.hp === 0, p3);
  // §6-C: per-stat cap = min(stat cap, character level).  Char level is
  // 4 here, so the 5th hp point must bounce.
  for (let i = 0; i < 5; i++) room._handleProg3Allocate(sess, { stat: 'hp' });
  check('per-stat cap = min(100, char level)', p3.alloc.hp === 4 && p3.shared === 6,
    { hp: p3.alloc.hp, shared: p3.shared, level: psA.level });
  check('...and a shared spend leaves the LANE pool alone (v2.3.2592)', p3.pool === 10, p3.pool);
  check('hp points land in maxHp (+8/pt)',
    psA.maxHp === 100 + psA.level * PROG3.HP_PER_LEVEL + 4 * PROG3.BODY.hp.per, psA.maxHp);
  const acks = msgsOfType(wsA, 'prog3_allocated');
  check('prog3_allocated acks each landed point, carrying both pools', acks.length === 4
    && acks[3].payload.stat === 'hp' && acks[3].payload.pts === 4
    && acks[3].payload.pool === 10 && acks[3].payload.shared === 6,
    acks.map((a) => a.payload));

  /* ═══ v2.3.2176: POINTS REMEMBER THE SKILL THAT EARNED THEM ═══
     Owner: "You can only apply offensive weapon damage to the combat skills
     you leveled up in.  However you can apply that stat point to any
     defensive attribute ... regardless of what channel you earned the point
     through."  Four claims, each its own check. */
  p3.alloc.hp = 0; p3.atk = prog3FreshAtk();
  p3.pool = 2; p3.poolBy = { sword: 0, bow: 2, staff: 0 }; p3.shared = 0;

  room._handleProg3Allocate(sess, { stat: 'luck', cat: 'sword' });
  check('a BOW point cannot buy MELEE luck', p3.atk.sword.luck === 0 && p3.pool === 2,
    { sword: p3.atk.sword, pool: p3.pool, poolBy: p3.poolBy });

  room._handleProg3Allocate(sess, { stat: 'luck', cat: 'bow' });
  check('...but it buys BOW luck, off BOW\'s own count',
    p3.atk.bow.luck === 1 && p3.pool === 1 && p3.poolBy.bow === 1,
    { bow: p3.atk.bow, pool: p3.pool, poolBy: p3.poolBy });

  /* ═══ v2.3.2592: THE SECOND POOL ═══
     Owner: "only the point earned in the combat channel can be spent there
     (the point for shared can be allocated to any in that shared pool)."
     This INVERTS the v2.3.2176 check that stood here ("a BOW point buys a
     DEFENSIVE stat") — a lane point no longer can, and a shared point can
     buy nothing else.  Both directions, each its own check. */
  room._handleProg3Allocate(sess, { stat: 'hp', cat: 'bow' });
  check('a BOW point can NO LONGER buy a shared stat (v2.3.2592)',
    p3.alloc.hp === 0 && p3.pool === 1 && p3.poolBy.bow === 1,
    { hp: p3.alloc.hp, pool: p3.pool, poolBy: p3.poolBy });
  p3.shared = 1;
  room._handleProg3Allocate(sess, { stat: 'hp', cat: 'bow' });
  check('...a SHARED point buys it, and the lane pool is untouched',
    p3.alloc.hp === 1 && p3.shared === 0 && p3.pool === 1 && p3.poolBy.bow === 1,
    { hp: p3.alloc.hp, shared: p3.shared, pool: p3.pool, poolBy: p3.poolBy });
  p3.shared = 1; p3.pool = 0; p3.poolBy = { sword: 0, bow: 0, staff: 0 };
  room._handleProg3Allocate(sess, { stat: 'luck', cat: 'bow' });
  check('...and a SHARED point cannot buy any weapon\'s offense',
    p3.atk.bow.luck === 1 && p3.shared === 1, { bow: p3.atk.bow, shared: p3.shared });
  p3.shared = 0;

  /* Points banked before this rule existed have no channel on record, and
     must stay spendable anywhere — the migration promise.  v2.3.2592:
     "anywhere" now means a lane's offense OR the shared column. */
  p3.pool = 1; p3.poolBy = { sword: 0, bow: 0, staff: 0 };
  room._handleProg3Allocate(sess, { stat: 'luck', cat: 'staff' });
  check('a legacy point with no channel still buys any weapon\'s offense',
    p3.atk.staff.luck === 1 && p3.pool === 0, { staff: p3.atk.staff, pool: p3.pool });
  p3.pool = 1; p3.poolBy = { sword: 0, bow: 0, staff: 0 }; p3.shared = 0; p3.alloc.def = 0;
  room._handleProg3Allocate(sess, { stat: 'def' });
  check('...and a legacy point buys a shared stat too, off the lane total',
    p3.alloc.def === 1 && p3.pool === 0 && p3.shared === 0, { def: p3.alloc.def, pool: p3.pool });

  /* A forged blob must not mint offense points by over-claiming a channel. */
  const forged = room._sanitizeProg3({ pool: 1, poolBy: { sword: 99, bow: 99, staff: 99 } });
  const forgedSum = forged.poolBy.sword + forged.poolBy.bow + forged.poolBy.staff;
  check('the channel breakdown can never exceed the pool it splits',
    forgedSum <= forged.pool, { pool: forged.pool, poolBy: forged.poolBy });
  /* v2.3.2680: Dodge has NO design cap any more (the curve heads for 90 %
     and never reaches it); the only limit is the per-level bound, which stays
     1 × character level on Dodge (owner: "keep per level limit on those 3"). */
  psA.prog3.sk.sword.level = 100; psA.prog3.sk.bow.level = 100; psA.prog3.sk.staff.level = 100;
  room._prog3Recompute(psA);
  check('char level caps at 300', psA.level === 300, psA.level);
  p3.shared = 200; p3.alloc.dodge = 75;
  room._handleProg3Allocate(sess, { stat: 'dodge' });
  check('v2.3.2680: the old 75-point Dodge cap is gone', p3.alloc.dodge === 76 && p3.shared === 199, p3.alloc.dodge);
  p3.alloc.dodge = 300;
  room._handleProg3Allocate(sess, { stat: 'dodge' });
  check('...and the per-level bound (300 at character 300) is what binds', p3.alloc.dodge === 300 && p3.shared === 199, p3.alloc.dodge);
  p3.alloc.dodge = 0;
}

// ── 5. Combat math: defense, dodge, dropped channels ──
{
  const p3 = psA.prog3;
  psA._zoneEntryGraceUntil = 0; psA._buffs = {};
  psA.maxHp = 1000; psA.hp = 1000;
  /* v2.3.2680: Defense and Dodge read the CURVE, 0.9 × p/(p + 7) at edge 1.
     Literals, not the constants — a fixture that imports what it checks
     agrees with production by construction. */
  p3.alloc.dodge = 0; p3.alloc.def = 50;
  const r = room._applyDamage(psA, 100, false);
  check('defense on the curve: 50 pts → 0.9 × 50/57 = 78.9 % off', r.dmgTaken === Math.round(100 * (1 - 0.9 * 50 / 57)), r);
  p3.alloc.def = 100;
  const r2 = room._applyDamage(psA, 100, false);
  check('...100 pts → 84 %, heading for 90 % and never reaching it', r2.dmgTaken === Math.round(100 * (1 - 0.9 * 100 / 107)), r2);
  p3.alloc.def = 5;
  check('...and the FIRST points are the big ones: 5 pts → 37.5 % off', Math.abs((1 - room._prog3DefMult(psA)) - 0.9 * 5 / 12) < 1e-9, room._prog3DefMult(psA));
  p3.alloc.def = 100;
  p3.alloc.dodge = 75;
  check('dodge on the curve: 75 pts → 0.9 × 75/82', Math.abs(room._prog3DodgePct(psA) - 0.9 * 75 / 82) < 1e-9, room._prog3DodgePct(psA));
  {
    /* THE COMBINED FLOOR (owner: "Yes do combined floor", base damage only):
       Dodge × Defense never lets less than 10 % of a BASE hit through.  With
       Dodge 82 % and Defense 84 %, the cut is held at 0.10 / (1 − dodge). */
    const _r = Math.random;
    Math.random = () => 0.999;   /* the dodge roll misses, so the cut is visible */
    const fl = room._applyDamage(psA, 1000, false);
    Math.random = _r;
    const dodge = 0.9 * 75 / 82;
    check('the combined floor holds a base hit at 10 % through (expected, over the dodge roll)',
      fl.dmgTaken === Math.round(1000 * 0.10 / (1 - dodge)), { got: fl.dmgTaken, want: Math.round(1000 * 0.10 / (1 - dodge)) });
    /* An ELEMENTAL hit meets Resist alone: never dodged, never cut by
       Defense, and not floored (its own 90 % asymptote is its floor). */
    Math.random = () => 0;       /* would dodge anything dodgeable */
    const el0 = room._applyDamage(psA, 100, false, { elemental: true });
    p3.alloc.eres = 20;
    const el1 = room._applyDamage(psA, 100, false, { elemental: true });
    Math.random = _r;
    p3.alloc.eres = 0;
    check('an elemental hit cannot be dodged and Defense does not cut it', el0.dodged === false && el0.dmgTaken === 100, el0);
    check('...Resist is what cuts it, on the curve: 20 pts → 0.9 × 20/27', el1.dmgTaken === Math.round(100 * (1 - 0.9 * 20 / 27)), el1);
    /* THE EDGE: against a monster above the yardstick (the highest trained
       skill for a shared stat) the points fade 20 %/level and are gone at +5. */
    const sk = psA.prog3.sk;
    const saved = [sk.sword.level, sk.bow.level, sk.staff.level];
    sk.sword.level = 10; sk.bow.level = 1; sk.staff.level = 1;
    p3.alloc.dodge = 0; p3.alloc.def = 50;
    const atLvl = room._applyDamage(psA, 100, false, { attackerLevel: 10 });
    const plus3 = room._applyDamage(psA, 100, false, { attackerLevel: 13 });
    const plus5 = room._applyDamage(psA, 100, false, { attackerLevel: 15 });
    [sk.sword.level, sk.bow.level, sk.staff.level] = saved;
    check('the edge: full Defense against a monster at your level', atLvl.dmgTaken === Math.round(100 * (1 - 0.9 * 50 / 57)), atLvl);
    check('...40 % of the points at +3 (0.9 × 20/27)', plus3.dmgTaken === Math.round(100 * (1 - 0.9 * 20 / 27)), plus3);
    check('...and none at +5', plus5.dmgTaken === 100, plus5);
    p3.alloc.dodge = 75; p3.alloc.def = 100;   /* the state the dodge-roll check below expects */
  }
  const origRandom = Math.random;
  Math.random = () => 0.29;
  const rd = room._applyDamage(psA, 100, false);
  Math.random = origRandom;
  check('dodge roll consumes the allocated stat', rd.dodged === true && rd.dmgTaken === 0, rd);
  p3.alloc.dodge = 0; p3.alloc.def = 0;

  // Dropped channels are inert for prog3 players...
  psA.hpSpec = { laststand: 100 };
  psA.defenseSpec = { thorns: 100, bulwark: 100, secondwind: 100 };
  psA.enduranceSpec = { conditioning: 100, evasion: 100 };
  psA.weaponSpecs = { staff: { attunement: 100 }, sword: { precision: 100 } };
  psA.t2Flat = { defense: { ironskin: 500 } };
  check('t2Flat reads 0 under prog3', room._t2Flat(psA, 'defense', 'ironskin') === 0);
  check('bulwark inert under prog3', room._blockStaminaMult(psA) === 1);
  check('attunement inert under prog3', room._attuneMult(psA) === 1);
  check('conditioning inert under prog3', room._conditioningFlat(psA) === 0);
  check('crit-counter channel inert under prog3', room._wpnCritPts(psA, 'sword') === 0);
  psA.hp = 10;
  const kill = room._applyDamage(psA, 9999, false);
  check('laststand inert under prog3 (killing blow kills)', psA.hp === 0 && !kill.lastStand, { hp: psA.hp, kill });
  psA.hp = psA.maxHp;

  // ...while legacy (non-prog3) state keeps the old reads.
  const legacy = { t2Flat: { defense: { ironskin: 42 } }, defenseSpec: { bulwark: 50 }, weaponSpecs: { sword: { precision: 100 } } };
  check('legacy t2Flat still reads banked value', room._t2Flat(legacy, 'defense', 'ironskin') === 42);
  check('legacy bulwark still discounts', room._blockStaminaMult(legacy) === 0.5);
  check('legacy crit counter still reads points', room._wpnCritPts(legacy, 'sword') === 100);
}

// ── 6. Damage roll ≤ anticheat ceiling (lockstep) ──
{
  psA.weapon = { type: 'sword', tierMult: 6, isVolatile: true };
  psA.rangedWeapon = { type: 'bow', tierMult: 6 };
  psA.staffWeapon = { type: 'staff', tierMult: 6 };
  /* v2.3.1668: offense is per type — invest in every category so each
     candidate weapon in the ceiling loop is genuinely maxed.
     v2.3.2199: + the flat-damage stat, maxed too, so the sampling proves
     the ceiling carries the new term. */
  /* v2.3.2592: luck (both crit halves), special and range at cap too, so
     the sampling proves the ceiling carries the special term. */
  for (const c of PROG3.SKILLS) { psA.prog3.atk[c].luck = 100; psA.prog3.atk[c].dmg = 75; psA.prog3.atk[c].special = 75; psA.prog3.atk[c].range = 100; }
  psA._cursedUntil = 0; psA.amulet = null;
  for (const special of [false, true]) {
    const cap = room._maxDmgForAttacker(psA, special);
    let maxSeen = 0;
    for (let i = 0; i < 400; i++) {
      for (const slot of ['melee', 'ranged', 'staff']) {
        const { dmg } = room._computeAttackDamage(psA, slot, special);
        if (dmg > maxSeen) maxSeen = dmg;
        if (dmg > cap) { maxSeen = Infinity; break; }
      }
    }
    check(`prog3 ${special ? 'special' : 'normal'} rolls stay under the ceiling`, maxSeen <= cap, { maxSeen, cap });
  }
  // Deterministic crit: rate 30% at 75 pts; v2.3.2199: critDmg is +1%/pt
  // on the 1.5× multiplier (×2.5 at the 100-pt cap), no flat term.
  const origRandom = Math.random;
  Math.random = () => 0.0;
  const critRoll = room._computeAttackDamage(psA, 'melee', false);
  Math.random = origRandom;
  check('prog3 crit fires from the allocated stat', critRoll.isCrit === true, critRoll);
  /* The exact percent math, deterministically: Math.random()=0 pins the
     melee variance at its 0.75 floor, so
       multiplied = (effBase + skLvl×1.5 + 75×0.5) × tierMult 6 × 0.75
                    × volatile 1.3 × critMult 2.5
     ...and v2.3.2212 floors that at the ANCHOR, 2 × the top of the range,
     where the range top is the same pre-variance base × the melee band's
     1.25 ceiling.  On this fixture the anchor WINS (2.5 × base against
     2.4375 × base), which is the anchor doing its job: Math.random()=0 is
     the worst roll on the table, and the whole point is that a crit off a
     bad roll still beats the best ordinary hit.  The 2 is written as a
     literal, not imported, so this stays an independent check. */
  {
    const skLvl = psA.prog3.sk.sword.level;
    const effBase = room._weaponEffBase('sword', psA.weapon);
    /* v2.3.2680: Power is a MULTIPLIER on (base + skill) — × (1 + 75/82) at
       edge 1 (no target passed) — and Luck's crit multiplier is on the
       curve: 1.5 + 2.0 × 100/107.  v2.3.2664: the tier FACTOR is
       tierMult^1.5 (data.js weaponTierFactor).  Literals, for the reason
       above.  On this fixture the multiplied crit now beats the anchor. */
    const preVar = (effBase + skLvl * 1.5) * (1 + 75 / 82) * Math.pow(6, 1.5);
    const multiplied = preVar * 0.75 * 1.3 * (1.5 + 2.0 * 100 / 107);
    const anchored = preVar * 1.25 * 2;
    const expected = Math.round(Math.max(multiplied, anchored));
    check('crit damage = max(base × critMult, 2 × range top) — the v2.3.2212 anchor, on the curve', critRoll.dmg === expected,
      { got: critRoll.dmg, expected });
  }
  /* And the dmg stat feeds the NON-crit roll too: +75×0.5 pre-tier. */
  {
    Math.random = () => 0.999999; // no crit; melee variance ~1.25 either way
    const invested = room._computeAttackDamage(psA, 'melee', false);
    const pts = psA.prog3.atk.sword.dmg;
    psA.prog3.atk.sword.dmg = 0;
    const bare = room._computeAttackDamage(psA, 'melee', false);
    psA.prog3.atk.sword.dmg = pts;
    Math.random = origRandom;
    /* v2.3.2680: Power MULTIPLIES the pre-tier sum now: 75 points at edge 1
       is × (1 + 75/82), so the ratio of the two rolls is that factor. */
    const ratio = invested.dmg / bare.dmg;
    const want = 1 + 75 / 82;
    check('Power multiplies the pre-tier sum: 75 pts → × (1 + 75/82)',
      Math.abs(ratio - want) < 0.01 && invested.isCrit === false, { invested: invested.dmg, bare: bare.dmg, ratio, want });
  }
  /* ═══ v2.3.2592: THE SPECIAL STAT SCALES THE SPECIAL, AND ONLY THE SPECIAL ═══
     Deterministic: same variance draw, no crit, with and without the 75
     points — the special roll must grow by exactly (1 + 75 × per) and the
     ordinary roll must not move at all. */
  {
    const roll = (special, spec) => {
      Math.random = () => 0.999999;                  /* band top, and outside any crit chance */
      psA.prog3.atk.sword.special = special;
      const r = room._computeAttackDamage(psA, 'melee', spec);
      Math.random = origRandom;
      return r;
    };
    const specOn = roll(75, true), specOff = roll(0, true);
    const normOn = roll(75, false), normOff = roll(0, false);
    psA.prog3.atk.sword.special = 75;
    const want = 1 + 1.5 * 75 / 82;   /* v2.3.2680: the curve, max +150 %, k 7 */
    check('the special stat multiplies the SPECIAL roll by (1 + 1.5 × p/(p+7))',
      !specOn.isCrit && !specOff.isCrit && Math.abs(specOn.dmg / specOff.dmg - want) < 0.02,
      { on: specOn.dmg, off: specOff.dmg, ratio: specOn.dmg / specOff.dmg, want });
    check('...and leaves the ORDINARY roll alone', normOn.dmg === normOff.dmg, { on: normOn.dmg, off: normOff.dmg });
    check('...and the ceiling still covers a maxed special (lockstep)',
      specOn.dmg <= room._maxDmgForAttacker(psA, true), { dmg: specOn.dmg, cap: room._maxDmgForAttacker(psA, true) });
  }
}

// ── 7. Sanitizer bounds corrupt stored shapes ──
{
  const dirty = room._sanitizeProg3({
    sk: { sword: { level: 999, xp: -5 }, bow: 'nope' },
    alloc: { hp: 5000, dodge: 5000, bogus: 9 },
    atk: { sword: { luck: 5000, range: -3, bogus: 4 }, nosuchcat: { luck: 50 } },
    pool: 1e9,
  });
  check('sanitize clamps sk levels to [1,100]', dirty.sk.sword.level === 100 && dirty.sk.bow.level === 1, dirty.sk);
  check('sanitize floors xp at 0', dirty.sk.sword.xp === 0, dirty.sk.sword);
  /* v2.3.2680: a curve stat's `cap` is the 999 STORAGE bound (the curve has
     no design cap; the per-level bound binds at spend time), and a pool
     keeps its real cap — so HP clamps to 100 and Dodge / Luck to 999. */
  check('sanitize clamps body alloc to caps, drops unknown keys',
    dirty.alloc.hp === 100 && dirty.alloc.dodge === 999 && !('bogus' in dirty.alloc), dirty.alloc);
  check('sanitize clamps per-type offense and drops unknown cats/keys',
    dirty.atk.sword.luck === 999 && dirty.atk.sword.range === 0
      && !('bogus' in dirty.atk.sword) && !('nosuchcat' in dirty.atk), dirty.atk);
  check('sanitize bounds pool', dirty.pool === 999, dirty.pool);
}

// ── 8b. Tier/equip gates (v2.3.1661, §6) ──
{
  const sess = { id: 'pa' };
  const p3 = psA.prog3;
  psA.dying = false; psA.dead = false; psA.disconnected = false;
  // Reset the trained/alloc state the earlier sections inflated.
  p3.sk.sword.level = 1; p3.sk.bow.level = 1; p3.sk.staff.level = 1;
  p3.alloc.def = 0;
  room._prog3Recompute(psA);

  check('gate primitive: trained level gates weapons',
    room._prog3GearOk(psA, 'sword', 5) === false
    && (p3.sk.sword.level = 10, room._prog3GearOk(psA, 'sword', 5) === true), p3.sk.sword);
  check('gate primitive: defense points gate armor-class gear',
    room._prog3GearOk(psA, 'defense', 10) === false
    && (p3.alloc.def = 10, room._prog3GearOk(psA, 'defense', 10) === true), p3.alloc.def);
  check('gate primitive: legacy (non-prog3) players pass',
    room._prog3GearOk({ }, 'sword', 95) === true);

  // equip_request: THE previously-missing server gate.  A dropped
  // high-tier bow (tierMult 6 → est tier 19 → req 95) with Bow Lv 1.
  psA.weaponStash = [{ type: 'bow', tierMult: 6 }];
  psA.rangedWeapon = null;
  room._handleEquipRequest(sess, { stashIdx: 0, slot: 'rangedWeapon' });
  check('equip_request: over-tier weapon rejected server-side',
    psA.rangedWeapon === null && psA.weaponStash.length === 1,
    { slot: psA.rangedWeapon, stash: psA.weaponStash.length });
  p3.sk.bow.level = 95;
  room._handleEquipRequest(sess, { stashIdx: 0, slot: 'rangedWeapon' });
  check('equip_request: trained level unlocks the tier',
    !!psA.rangedWeapon && psA.rangedWeapon.type === 'bow' && psA.weaponStash.length === 0,
    { slot: psA.rangedWeapon, stash: psA.weaponStash.length });

  // forge_weapon: the stat gate reads the trained skill now.  Tier
  // index 1 (statReq 10 legacy) → prog3 requirement Melee 5.
  const tierKey = Object.keys(BLACKSMITH_TIERS)[1];
  const tier = BLACKSMITH_TIERS[tierKey];
  psA.lifeSkills = { blacksmithing: { level: 99, xp: 0 } };
  psA.coins = 100000;
  psA.inventory = { ['ore_' + tier.oreName + '_ore']: 999 };
  psA.weapon = null; psA.weaponStash = [];
  p3.sk.sword.level = 1;
  room._handleForgeWeapon(sess, { weaponType: 'sword', tierKey, isWoodwork: false });
  check('forge: under-trained mint rejected', psA.weapon === null, psA.weapon);
  p3.sk.sword.level = 5;
  room._handleForgeWeapon(sess, { weaponType: 'sword', tierKey, isWoodwork: false });
  check('forge: trained level unlocks the mint',
    !!psA.weapon && psA.weapon.gearBase === tierKey, psA.weapon);

  // stats_update armor ingest: gates on defense POINTS; rejection
  // keeps the old armor (echo snaps the client back).
  // v2.3.2664: armour is priced on its OWN ladder now (data.js armorDefReq;
  // owner: "I'll go with your defense requirements for next tiers") — a
  // tier-4 plate asks 10 Defense, where the weapon table's fallback asked 90.
  psA.armor = null;
  p3.alloc.def = 9;
  room._handleStatsUpdate(sess, { armor: { name: 'Test Plate', tierMult: 4 } }); // tier 4 → req 10
  check('armor ingest: over-tier swap rejected (defense points too low)', psA.armor === null, psA.armor);
  p3.alloc.def = 10;
  room._handleStatsUpdate(sess, { armor: { name: 'Test Plate', tierMult: 4 } });
  check('armor ingest: defense allocation unlocks the tier',
    !!psA.armor && psA.armor.name === 'Test Plate', psA.armor);
  // Unequip always passes (grandfather rule: only SWAPS are gated).
  p3.alloc.def = 0;
  room._handleStatsUpdate(sess, { armor: null });
  check('armor ingest: unequip always passes', psA.armor === null, psA.armor);
}

// ── 8. _saveRpg carries prog3 + the v10 stamp ──
{
  let lastPut = null;
  room.state.storage.put = async (k, v) => { if (String(k).startsWith('rpg:')) lastPut = v; };
  await room._saveRpg('pa', psA);
  check('_saveRpg persists prog3', lastPut && !!lastPut.prog3 && lastPut._v === RPG_SCHEMA_VERSION,
    lastPut && { hasProg3: !!lastPut.prog3, _v: lastPut._v });
}

// ── 9. v2.3.1668: per-type offense — the split, the endpoint, the roll ──
{
  const sess = { id: 'pa' };
  const p3 = psA.prog3;

  /* The refund, in isolation: a v10 blob's offense points come back to
     the pool rather than being copied into all three types (which would
     triple them) or dropped (which would steal them). */
  const v10 = { sk: {}, alloc: { def: 5, hp: 3, crit: 10, critDmg: 4, aspd: 2 }, pool: 1 };
  const split = prog3SplitAtk(v10);
  check('v11 refunds global offense points to the pool (1 + 16)', split.pool === 17, split.pool);
  check('v11 keeps body points where they were',
    split.alloc.def === 5 && split.alloc.hp === 3, split.alloc);
  check('v11 leaves every type at zero offense',
    PROG3.SKILLS.every((c) => split.atk[c].luck === 0 && split.atk[c].dmg === 0), split.atk);
  check('v11 is idempotent (no double refund)', prog3SplitAtk(split).pool === 17);

  /* The endpoint: an offense stat REQUIRES a category. */
  p3.pool = 50; p3.poolBy = { sword: 0, bow: 0, staff: 0 }; p3.shared = 5;
  p3.atk = prog3FreshAtk();
  const poolBefore = p3.pool;
  room._handleProg3Allocate(sess, { stat: 'luck' });                 // no cat
  room._handleProg3Allocate(sess, { stat: 'luck', cat: 'trebuchet' }); // unknown cat
  room._handleProg3Allocate(sess, { stat: 'luck', cat: '__proto__' });
  check('an offense spend without a valid category is refused',
    p3.pool === poolBefore && p3.atk.sword.luck === 0,
    { pool: p3.pool, sword: p3.atk.sword });

  room._handleProg3Allocate(sess, { stat: 'luck', cat: 'bow' });
  check('an offense spend lands on the NAMED type only',
    p3.atk.bow.luck === 1 && p3.atk.sword.luck === 0 && p3.atk.staff.luck === 0, p3.atk);
  check('the offense spend debited the lane pool', p3.pool === poolBefore - 1, p3.pool);
  const ack = msgsOfType(wsA, 'prog3_allocated').pop();
  check('the ack names the category', ack && ack.payload.cat === 'bow' && ack.payload.stat === 'luck',
    ack && ack.payload);

  /* A body stat still works with no category, and ignores a stray one
     (v2.3.2592: it comes off the SHARED pool whatever lane is named). */
  p3.alloc.def = 0;
  room._handleProg3Allocate(sess, { stat: 'def', cat: 'bow' });
  check('a body spend ignores a stray category', p3.alloc.def === 1 && p3.shared === 4 && p3.pool === poolBefore - 1, p3.alloc);

  /* THE POINT OF THE CHANGE: investing in one type must not arm another. */
  psA.weapon = { type: 'greatsword', tierMult: 1 };
  psA.rangedWeapon = { type: 'bow', tierMult: 1 };
  psA.staffWeapon = null;
  psA.amulet = null; psA._cursedUntil = 0;
  p3.atk = prog3FreshAtk();
  p3.atk.bow.luck = 100;                      // maxed BOW luck only (31% crit)
  const origRandom = Math.random;
  Math.random = () => 0.10;                   // inside 31%, outside 1%
  const bowRoll = room._computeAttackDamage(psA, 'ranged', false);
  const meleeRoll = room._computeAttackDamage(psA, 'melee', false);
  Math.random = origRandom;
  check('maxed BOW crit crits with a bow', bowRoll.isCrit === true, bowRoll);
  check('maxed BOW crit does NOTHING for melee', meleeRoll.isCrit === false, meleeRoll);

  /* The ceiling must cover the best type, not the active one. */
  for (const c of PROG3.SKILLS) { p3.atk[c] = prog3FreshAtk()[c]; p3.atk[c].luck = 100; }
  let over = 0;
  const cap = room._maxDmgForAttacker(psA, false);
  for (let i = 0; i < 300; i++) {
    for (const slot of ['melee', 'ranged']) {
      if (room._computeAttackDamage(psA, slot, false).dmg > cap) over++;
    }
  }
  check('per-type crit damage stays under the anticheat ceiling', over === 0, { over, cap });
}

/* ═══ v2.3.1765: THE TUTORIAL'S OWN WEAPONS ARE EQUIPPABLE ═══
 *
 * Owner: "there seems to be some weird auto Unequipping of weapons after
 * completing quests but I could be wrong."  They were right that something was
 * wrong, and this is it: the equip gate scores a weapon by its POSITION in the
 * forge table, BLACKSMITH_TIERS still opens with the vestigial `wood` rung, and
 * v2.3.1760 made copper the first metal weapon.  So "Copper Great Sword" — handed over
 * in the first five minutes — sat at rung 1 and demanded trained sword level 5
 * from a character who is level 1 in everything.  The server refuses that
 * silently by design ("the client's own gate shows the requirement"), so the
 * weapon simply would not stay on.
 *
 * The owner's call was "copper counts as rung zero", which slides every metal
 * above it down one step and restores the ladder's original shape.  Pinned in
 * BOTH directions here: the starter must be equippable at level 1, and the
 * rungs above it must still be gated, or "fix the starter" becomes "delete the
 * gate". */
{
  const lvl1 = () => ({ prog3: { sk: { sword: { level: 1 }, bow: { level: 1 }, staff: { level: 1 } },
    alloc: {}, atk: {}, pool: {}, ms: {} } });
  const wpn = (type, gearBase) => ({ type, gearBase, tierMult: 1, name: type + ':' + gearBase });

  check('the tutorial copper sword is equippable at trained level 1 (owner: copper is rung zero)',
    room._prog3EquipOk(lvl1(), 'weapon', wpn('greatsword', 'copper')) === true);
  check('...and so is the pine bow it hands you alongside it',
    room._prog3EquipOk(lvl1(), 'rangedWeapon', wpn('bow', 'ww_pine')) === true);
  check('...and the pine staff',
    room._prog3EquipOk(lvl1(), 'staffWeapon', wpn('staff', 'ww_pine')) === true);

  /* The other half.  A gate that lets the starter through by letting
     EVERYTHING through is not a fix, and that is the failure mode a "make it
     work" change lands on. */
  /* ═══ v2.3.2125: IRON IS FREE, BY OWNER DIRECTIVE ═══
     This used to read "iron still asks for something — one rung up, not
     zero", and it was right to: v2.3.1765 slid the ladder down so copper sat
     at rung zero, and iron at rung one was the first thing that cost you
     anything.  The owner has since decided otherwise, twice and explicitly —
     "Remove any defense requirement for all iron", then "Allow iron weapons
     to be equipped at any level.  Exempt iron weapons from requirement too."
     So the expectation is inverted rather than deleted: iron passes at
     trained level 1 in every slot.

     The reason the old check existed has NOT gone away, and the two below
     carry it: a gate that lets the starter through by letting EVERYTHING
     through is not a fix, so steel — the first rung above iron — must still
     be refused, and must still be reachable once the level is there. */
  check('iron is equippable at trained level 1 in every slot (owner: exempt all iron)',
    room._prog3EquipOk(lvl1(), 'weapon', wpn('greatsword', 'iron')) === true
    && room._prog3EquipOk(lvl1(), 'armor', { mat: 'iron', tierMult: 2.0 }) === true);
  check('...and the ladder above iron still gates: steel is refused at level 1',
    room._prog3EquipOk(lvl1(), 'weapon', wpn('greatsword', 'steel')) === false);
  check('...and steel opens up once the trained level is there',
    room._prog3EquipOk({ prog3: { sk: { sword: { level: 30 } }, alloc: {}, atk: {}, pool: {}, ms: {} } },
      'weapon', wpn('greatsword', 'steel')) === true);

  /* The whole point, end to end: the handler must actually seat it, not just
     the predicate.  A gate that says yes while _handleEquipRequest returns for
     some other reason leaves the owner's bug exactly where it was. */
  room.playerState['t1'] = { ...lvl1(), z: 'town', x: 0, y: 0,
    weaponStash: [wpn('greatsword', 'copper')] };
  room._handleEquipRequest({ id: 't1' }, { stashIdx: 0, slot: 'weapon' });
  check('a level-1 character can actually SEAT the starter sword',
    !!room.playerState['t1'].weapon && room.playerState['t1'].weapon.gearBase === 'copper',
    room.playerState['t1'].weapon);
  delete room.playerState['t1'];
}

// ── 11. v2.3.2199: the 3-points economy — retro grant, ppl stamp, elem ──
{
  const { prog3GrantRetroPoints } = await import('../src/prog3.js');
  const { elemAttackStat, tickElementStatuses, applyElementStatus, resolveElementCollision } =
    await import('../src/elemental.js');

  /* Migration v14 back-pays +2 per earned level-up, per lane. */
  const vet = {
    _v: 13,
    prog3: {
      sk: { sword: { level: 7, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 100, xp: 0 } },
      alloc: { def: 3, hp: 2, dodge: 0, stam: 0 },
      atk: { sword: { luck: 1, aspd: 0 }, bow: { luck: 0, aspd: 0 }, staff: { luck: 0, aspd: 0 } },
      pool: 40, poolBy: { sword: 4, bow: 0, staff: 30 }, ms: 8,
    },
  };
  const res14 = runRpgMigrations(vet);
  const grant = (c, lvl) => (PROG3.POINTS_PER_LEVEL - 1) * (lvl - 1);
  check('v14 runs clean to the current version', res14.failed === null && vet._v === RPG_SCHEMA_VERSION, res14);
  check('v14 back-pays +2 × (level−1) per skill into the pool',
    vet.prog3.pool === 40 + grant('sword', 7) + grant('bow', 1) + grant('staff', 100), vet.prog3.pool);
  check('v14 stamps the back-pay into each earning lane',
    vet.prog3.poolBy.sword === 4 + grant('sword', 7)
      && vet.prog3.poolBy.bow === 0
      && vet.prog3.poolBy.staff === 30 + grant('staff', 100), vet.prog3.poolBy);
  check('v14 stamps the rate', vet.prog3.ppl === PROG3.POINTS_PER_LEVEL, vet.prog3.ppl);
  const poolAfter = vet.prog3.pool;
  check('v14 is idempotent (ppl gates the re-run)',
    prog3GrantRetroPoints(vet.prog3) === false && vet.prog3.pool === poolAfter, vet.prog3.pool);

  /* The sanitizer is the boundary heal for fail-open blobs — and must
     PRESERVE the stamp or every join re-pays the grant. */
  const healed = room._sanitizeProg3({
    sk: { sword: { level: 10, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } },
    alloc: {}, atk: {}, pool: 9, poolBy: { sword: 9 },
  });
  check('sanitize boundary-heals a ppl-less blob (+2×9 on sword)',
    healed.pool === 9 + 18 && healed.poolBy.sword === 9 + 18 && healed.ppl === PROG3.POINTS_PER_LEVEL,
    { pool: healed.pool, poolBy: healed.poolBy, ppl: healed.ppl });
  const healedTwice = room._sanitizeProg3(healed);
  check('...and a healed blob sanitizes to itself (no re-grant)',
    healedTwice.pool === healed.pool && healedTwice.poolBy.sword === healed.poolBy.sword,
    { pool: healedTwice.pool });
  check('sanitize clamps the new stats',
    /* v2.3.2512: elem is an ATK stat now, so a BODY `elem` is REFUNDED
       rather than clamped — pinned in its own section below. */
    room._sanitizeProg3({ sk: {}, alloc: {}, atk: { sword: { elem: 999 } }, pool: 0, ppl: 3 })
      .atk.sword.elem === PROG3.ATK.elem.cap
    && room._sanitizeProg3({ sk: {}, alloc: {}, atk: { sword: { dmg: 999 } }, pool: 0, ppl: 3 })
      .atk.sword.dmg === PROG3.ATK.dmg.cap
    && room._sanitizeProg3({ sk: {}, alloc: { eres: 999, mana: 999 }, atk: {}, pool: 0, ppl: 3 })
      .alloc.eres === PROG3.BODY.eres.cap);

  /* elem feeds the DoT snapshot and the collision stat; legacy players
     keep their old read, byte for byte.
     v2.3.2512: per weapon — the stat is read out of atk[cat].elem, and a
     reader that names no category falls back to 'sword'. */
  const p3ps = { prog3: { atk: { sword: { elem: 75 }, bow: { elem: 0 }, staff: { elem: 0 } } }, power: 500 };
  const legacyPs = { power: 40, agility: 15 };
  /* v2.3.2680: on the curve — 120 × 75/(75+10) at edge 1 (no monster). */
  check('elemAttackStat: prog3 reads the WEAPON\'s elem on the curve, never the fossil T1 stat',
    Math.abs(elemAttackStat(p3ps, 'power', 'sword') - 120 * 75 / 85) < 1e-9,
    elemAttackStat(p3ps, 'power', 'sword'));
  check('elemAttackStat: a different weapon reads its OWN elem, not the sword\'s',
    elemAttackStat(p3ps, 'power', 'bow') === 0 && elemAttackStat(p3ps, 'power', 'staff') === 0,
    { bow: elemAttackStat(p3ps, 'power', 'bow'), staff: elemAttackStat(p3ps, 'power', 'staff') });
  check('elemAttackStat: an unnamed category falls back to sword (never someone else\'s lane)',
    elemAttackStat(p3ps, 'power') === elemAttackStat(p3ps, 'power', 'sword'));
  check('elemAttackStat: legacy reads the named legacy stat',
    elemAttackStat(legacyPs, 'power', 'sword') === 40 && elemAttackStat(legacyPs, 'agility', 'bow') === 15);
  const burnM = { hp: 1000, statuses: null };
  applyElementStatus(burnM, 'flame', 'src1', elemAttackStat(p3ps, 'power', 'sword'), 1000, 1);
  burnM.statuses.burn.lastTick = 0;
  const ticks = tickElementStatuses(burnM, 0.1, 1000);
  check('burn DoT prices off the elem snapshot (5 + power×0.3, power on the curve)',
    ticks.length === 1 && ticks[0].dmg === Math.round(5 + (120 * 75 / 85) * 0.3), ticks);
  const colM = { hp: 1000, statuses: null, element: null };
  applyElementStatus(colM, 'flame', 'src1', 0, 1000, 1);
  const col = resolveElementCollision(colM, 'frost', p3ps, false, 2000, 'sword');
  check('collision stat term reads elem for prog3 attackers',
    col && col.id === 'steam' && col.dmg >= Math.round(40 + 75 * 0.8), col);
}

/* ══ v2.3.2512: ELEM PWR per weapon, ELEM RESIST and MAX MANA as stats ══
   Owner asks from the backlog triage (§2.1c, D12).  Three moves in one
   system, because they share the allocation grid and one migration:
     - ELEM PWR: one global BODY channel -> one ATK channel per combat type;
     - ELEM RESIST: a new global BODY channel, the first thing in the game
       that reduces elemental damage (the 5% cooking buff aside);
     - MAX MANA: a new global BODY channel, ADDED to the Magic-level
       derivation so nobody's existing pool moves. */
{
  const { prog3MoveElemToAtk } = await import('../src/prog3.js');

  /* ── the grid ── */
  check('elem is an ATK stat now, and no longer a BODY one',
    !!PROG3.ATK.elem && !PROG3.BODY.elem, { atk: PROG3.ATK.elem, body: PROG3.BODY.elem });
  /* v2.3.2680: elem moved onto the curve with every other hit-changing stat:
     max 120 power, k 10, the edge, no design cap (999 is storage), and the
     loosened per-level bound of the damage stats. */
  check('...on the curve: max 120, k 10, relative, 999 storage, 2 × level bound',
    PROG3.ATK.elem.max === 120 && PROG3.ATK.elem.k === 10 && PROG3.ATK.elem.rel === true
      && PROG3.ATK.elem.cap === 999 && PROG3.ATK.elem.lvlBound === 2, PROG3.ATK.elem);
  check('eres and mana are BODY stats (global: they describe the character)',
    !!PROG3.BODY.eres && !!PROG3.BODY.mana && !PROG3.ATK.eres && !PROG3.ATK.mana);
  check('the allocate whitelist accepts all three through the same door',
    prog3StatDef('elem').scope === 'atk'
      && prog3StatDef('eres').scope === 'body'
      && prog3StatDef('mana').scope === 'body',
    { elem: prog3StatDef('elem'), eres: prog3StatDef('eres'), mana: prog3StatDef('mana') });

  /* ── migration v15: the refund (the v11 precedent) ── */
  const mv = {
    _v: 14,
    prog3: {
      sk: { sword: { level: 5, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } },
      alloc: { def: 2, hp: 1, dodge: 0, stam: 0, elem: 30 },
      atk: { sword: { luck: 0, aspd: 0, dmg: 0 }, bow: {}, staff: {} },
      pool: 5, poolBy: { sword: 5, bow: 0, staff: 0 }, ppl: 3,
    },
  };
  const res15 = runRpgMigrations(mv);
  check('v15 runs clean to the current version',
    res15.failed === null && mv._v === RPG_SCHEMA_VERSION, { res: res15, v: mv._v });
  check('v15 REFUNDS placed elem points to the pool (never copies them ×3, never guesses a type)',
    mv.prog3.pool === 5 + 30 && mv.prog3.alloc.elem === undefined,
    { pool: mv.prog3.pool, alloc: mv.prog3.alloc });
  check('v15 leaves every other body stat alone',
    mv.prog3.alloc.def === 2 && mv.prog3.alloc.hp === 1, mv.prog3.alloc);
  const poolAfter15 = mv.prog3.pool;
  check('v15 is idempotent (a re-run cannot double-refund)',
    prog3MoveElemToAtk(mv.prog3) === false && mv.prog3.pool === poolAfter15, mv.prog3.pool);

  /* ── the boundary heal, because migrations fail open ── */
  const bh = room._sanitizeProg3({
    sk: {}, alloc: { def: 1, elem: 12 }, atk: { sword: {}, bow: {}, staff: {} },
    pool: 2, poolBy: { sword: 2 }, ppl: 3,
  });
  check('sanitize folds an elem-as-BODY blob the same way (fail-open cover)',
    bh.pool === 2 + 12 && bh.alloc.elem === undefined && bh.alloc.def === 1,
    { pool: bh.pool, alloc: bh.alloc });

  /* ── MAX MANA: unchanged at zero points, and it buys real casts ── */
  const mps = (pts, magicLvl) => {
    const ps = {
      prog3: {
        sk: { sword: { level: 1, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: magicLvl, xp: 0 } },
        alloc: { def: 0, hp: 0, dodge: 0, stam: 0, eres: 0, mana: pts },
        atk: prog3FreshAtk(), pool: 0, poolBy: { sword: 0, bow: 0, staff: 0 },
      },
    };
    room._prog3Recompute(ps);
    return ps;
  };
  const base = mps(0, 10);
  check('max mana at ZERO points is exactly the old Magic-level derivation',
    base.maxMana === Math.floor(100 + 10 * PROG3.MANA_PER_MAGIC_LEVEL), base.maxMana);
  const spent = mps(20, 10);
  check('...and a point adds MANA_PER_MAGIC_LEVEL, so one point = one Magic level',
    spent.maxMana === Math.floor(100 + 10 * PROG3.MANA_PER_MAGIC_LEVEL + 20 * PROG3.BODY.mana.per),
    spent.maxMana);
  /* THE TRAP THIS AVOIDS (v2.3.1734): a special costs maxMana / manaBlocks,
     so a bigger pool with the same block count is a more expensive cast and
     zero extra casts.  Investing must buy CASTS. */
  check('spending on max mana buys CASTS, not just a longer bar',
    spent.manaBlocks > base.manaBlocks
      && Math.floor(spent.maxMana / spent.manaBlocks) > 0,
    { blocks: [base.manaBlocks, spent.manaBlocks], max: [base.maxMana, spent.maxMana] });

  /* ── ELEM RESIST: cuts elemental damage only ── */
  const victim = (pts) => ({
    hp: 1000, maxHp: 1000, z: 'meadow', agility: 0, _zoneEntryGraceUntil: 0,
    prog3: {
      sk: {}, alloc: { def: 0, hp: 0, dodge: 0, stam: 0, eres: pts, mana: 0 },
      atk: prog3FreshAtk(), pool: 0, poolBy: { sword: 0, bow: 0, staff: 0 },
    },
  });
  const plainV = victim(75);
  const plain = room._applyDamage(plainV, 100, false).dmgTaken;
  const elemV = victim(75);
  const elem = room._applyDamage(elemV, 100, false, { elemental: true }).dmgTaken;
  check('elem resist cuts ELEMENTAL damage on the curve (75 pts → 0.9 × 75/82)',
    elem === Math.round(100 * (1 - 0.9 * 75 / 82)), { elem, plain });
  check('...and leaves ordinary untyped damage completely alone',
    plain === 100, plain);
  const zeroV = victim(0);
  check('...and a character with no points in it takes elemental damage in full',
    room._applyDamage(zeroV, 100, false, { elemental: true }).dmgTaken === 100);
}

/* ═══ v2.3.2210: EVERY CHARACTER STARTS AT A FLAT 1%, PER DAMAGE TYPE ═══
   Owner: "I want crit chance to start at a flat 1% per damage type by
   default for each character."

   Before this the roll was `Math.random() < 0` for anyone who had not spent
   a point -- literally impossible, in every weapon type, for the whole early
   game.  Pinned deterministically on BOTH SIDES of the 1% boundary rather
   than by sampling: a probabilistic assertion on a 1% rate needs tens of
   thousands of rolls to separate 1% from 0% reliably, and would still flake.
   Math.random is stubbed to a value just inside the window and then just
   outside it, which tests the actual comparison.

   All three categories, because "per damage type" is the ask and the ATK
   block is read per category -- a base wired into only one of them would
   pass any single-slot test. */
{
  const origRandom = Math.random;
  const fresh = {
    prog3: { sk: { sword: { level: 1 }, bow: { level: 1 }, staff: { level: 1 } },
             atk: prog3FreshAtk(),
             alloc: {}, pool: 0 },
    power: 0, mind: 0, agility: 0, weaponSpecs: {},
    weapon: { type: 'sword', tierMult: 1 },
    rangedWeapon: { type: 'bow', tierMult: 1 },
    staffWeapon: { type: 'staff', tierMult: 1 },
  };
  /* v2.3.2592: the base lives on LUCK now (crit folded into it). */
  check('the base is a real constant, not a literal buried in the roll',
    PROG3.ATK.luck.base === 0.01, PROG3.ATK.luck.base);
  for (const [slot, cat] of [['melee', 'sword'], ['ranged', 'bow'], ['staff', 'staff']]) {
    Math.random = () => 0.005;              /* inside 1% */
    const hit = room._computeAttackDamage(fresh, slot, false);
    Math.random = () => 0.02;               /* outside 1%, inside nothing */
    const miss = room._computeAttackDamage(fresh, slot, false);
    Math.random = origRandom;
    check(`${cat}: an UNALLOCATED character crits inside the 1% window`,
      hit.isCrit === true, { slot, cat, hit: hit.isCrit });
    check(`${cat}: ...and does not crit outside it (the base is 1%, not a free crit)`,
      miss.isCrit === false, { slot, cat, miss: miss.isCrit });
  }
  /* Additive, not absorbed: the first point bought must still be worth its
     0.3% (v2.3.2592: luck's chance half), which is what a base folded INTO
     the allocated range would cost. */
  fresh.prog3.atk.bow.luck = 1;
  Math.random = () => 0.012;                /* between 1% and 1.3% */
  const bought = room._computeAttackDamage(fresh, 'ranged', false);
  Math.random = origRandom;
  check('a bought point stacks ON TOP of the base (1% + 0.3%)',
    bought.isCrit === true, { at: 0.012, isCrit: bought.isCrit });
  check('...and melee, which bought nothing, is unaffected by bow\'s point',
    room._prog3CritChance(fresh, 'sword') === 0.01, fresh.prog3.atk.sword.luck);
}

/* ═══ v2.3.2212: A CRIT ALWAYS BEATS THE BEST ORDINARY HIT ═══
   Owner: "The crit damage amount should be doing at least double the top
   end range of the weapon's damage.  Maybe that's the anchor.  Right now
   it's very underwhelming."

   The promise in one line: whatever the dice did, a crit pays at least 2x
   the top of the range.  Asserted as the PROPERTY rather than a number,
   across the whole variance band, because the failure it guards is exactly
   the old behaviour -- a crit on a low roll landing under a lucky normal
   hit.  Both ends of the band are pinned via Math.random, so this covers
   the worst roll (where the anchor must bind) and the best (where the
   multiplier may already win and the anchor must not REDUCE it). */
{
  const origRandom = Math.random;
  const ps = {
    prog3: { sk: { sword: { level: 1 }, bow: { level: 1 }, staff: { level: 1 } },
             /* v2.3.2592: maxed LUCK — 31% chance, and its ×2.5 multiplier
                is exactly the case the anchor must not REDUCE. */
             atk: { sword: { luck: 100, aspd: 0, dmg: 0 },
                    bow:   { luck: 100, aspd: 0, dmg: 0 },
                    staff: { luck: 100, aspd: 0, dmg: 0 } },
             alloc: {}, pool: 0 },
    power: 0, mind: 0, agility: 0, weaponSpecs: {},
    weapon: { type: 'sword', tierMult: 2 },
    rangedWeapon: { type: 'bow', tierMult: 2 },
    staffWeapon: { type: 'staff', tierMult: 2 },
  };
  /* The band ceilings the roll actually uses (combat.js VAR). */
  const BAND_TOP = { melee: 1.25, ranged: 0.8, staff: 1.65 };
  const TYPE = { melee: 'sword', ranged: 'bow', staff: 'staff' };
  for (const slot of ['melee', 'ranged', 'staff']) {
    const w = slot === 'melee' ? ps.weapon : slot === 'ranged' ? ps.rangedWeapon : ps.staffWeapon;
    const preVar = (room._weaponEffBase(TYPE[slot], w) + PROG3.DMG_PER_LEVEL[TYPE[slot]]) * Math.pow(2, 1.5);  /* v2.3.2664: tier factor */
    const rangeTop = preVar * BAND_TOP[slot];
    /* A SEQUENCE, not one value.  _computeAttackDamage draws variance first
       and the crit roll second, so a single stub cannot ask for "best roll
       AND a crit" -- 0.999999 pins the band at its top and then fails the
       31% crit check.  The first draft did exactly that and reported six
       failures that were the test's fault, not the code's. */
    for (const [label, band] of [['worst roll', 0.0], ['best roll', 0.999999]]) {
      const seq = [band, 0.0]; let n = 0;
      Math.random = () => seq[Math.min(n++, seq.length - 1)];
      const hit = room._computeAttackDamage(ps, slot, false);
      Math.random = origRandom;
      check(`${TYPE[slot]} (${label}): the hit crit (guard)`, hit.isCrit === true, hit);
      check(`${TYPE[slot]} (${label}): a crit pays at least 2x the top of the range`,
        hit.dmg >= Math.round(rangeTop * 2) - 1,
        { dmg: hit.dmg, rangeTop: Math.round(rangeTop), need: Math.round(rangeTop * 2) });
    }
  }

  /* ═══ v2.3.2383: AND THE STAFF'S BAND IS 0.5 - 1.65, BY VALUE ═══
     Owner: "For magic it's a bit underpowered so make the base attacks have a
     higher upper damage range."

     The BAND_TOP loop above would pass with ANY self-consistent band -- it
     asserts the crit anchor AGAINST the band, so moving both together keeps it
     green.  That is the right shape for what it guards and the wrong shape for
     what this change is, so the numbers get pinned here by value, from both
     ends.  Six copies of this band exist (combat.js, gameSystems.js x3,
     balance-sim.mjs, BAND_TOP above); this is the one that fails if the
     authority drifts from the rest.

     Read off a rigged Math.random rather than by arithmetic: the roll is
     `VAR[0] + rand * (VAR[1] - VAR[0])`, so rand 0 gives the floor and rand
     ~1 the ceiling, and dividing the returned damage by the pre-variance base
     recovers the multiplier the code actually used. */
  {
    const w = ps.staffWeapon;
    const preVar = (room._weaponEffBase('staff', w) + PROG3.DMG_PER_LEVEL.staff) * Math.pow(2, 1.5);  /* v2.3.2664: tier factor */
    /* crit would multiply on top and hide the band, so the second draw is
       forced to 1 -- above any crit chance -- exactly as the loop above
       forces 0.0 to guarantee one. */
    const roll = (r) => {
      const seq = [r, 1]; let n = 0;
      Math.random = () => seq[Math.min(n++, seq.length - 1)];
      const hit = room._computeAttackDamage(ps, 'staff', false);
      Math.random = origRandom;
      return hit;
    };
    const lo = roll(0.0), hi = roll(0.999999);
    check('staff: the band FLOOR is still 0.5 -- the swingy feel is kept',
      !lo.isCrit && Math.abs(lo.dmg / preVar - 0.5) < 0.02,
      { dmg: lo.dmg, preVar, mult: +(lo.dmg / preVar).toFixed(3) });
    check('staff: the band CEILING is 1.65, not the old 1.5',
      !hi.isCrit && Math.abs(hi.dmg / preVar - 1.65) < 0.02,
      { dmg: hi.dmg, preVar, mult: +(hi.dmg / preVar).toFixed(3) });
    /* The ceiling that actually bounds how far this could go: a top roll must
       still sit UNDER the anticheat cap, or the server truncates damage the
       player earned and never sees.  Same attacker, so this is the cap the
       real hit would be measured against. */
    const cap = room._maxDmgForAttacker(ps, false);
    check('staff: ...and a top roll still fits under the anticheat ceiling',
      hi.dmg <= cap, { dmg: hi.dmg, cap });
  }
  Math.random = origRandom;
}

/* ═══ v2.3.2592: THE FOUR-COLUMN POINTS REDESIGN (owner, 2026-09-16) ═══
   Six stats per combat type — Range, Power, Speed, LUCK (crit + critDmg in
   one), Special, Elemental — seven shared ones (Move Speed arrives), and a
   SECOND POOL: "for every point earned through one of the 3 combat channels,
   you earn one 'shared' point too."  The economy checks live in §4 above
   (they invert the v2.3.2176 rule in place); this section pins the grid,
   the migration, the boundary heal, the mint, and the two client-consumed
   stats' server bounds. */
{
  const { prog3FoldLuck, prog3GrantSharedPoints } = await import('../src/prog3.js');
  const { setProg3Enabled, setProg3SharedEnabled, setProg3RelEnabled, prog3MoveMult } = await import('../../src/data/prog3.js'); /* v2.3.2680: + the relative flag */
  const { SPEED, calcMoveSpeed } = await import('../../src/data/gameSystems.js');

  /* ── the grid ── */
  check('the six per-type stats are exactly range/dmg/aspd/luck/special/elem',
    Object.keys(PROG3.ATK).sort().join(',') === 'aspd,dmg,elem,luck,range,special', Object.keys(PROG3.ATK));
  check('the seven shared stats are exactly def/dodge/eres/hp/mana/move/stam',
    Object.keys(PROG3.BODY).sort().join(',') === 'def,dodge,eres,hp,mana,move,stam', Object.keys(PROG3.BODY));
  /* v2.3.2680: both halves on the curve — chance 1 % + 60 % × p/(p+7),
     multiplier 1.5 + 2.0 × p/(p+7). */
  check('luck carries BOTH halves of a crit: a chance curve, a damage curve and the 1% base',
    PROG3.ATK.luck.max === 0.60 && PROG3.ATK.luck.dmgMax === 2.0 && PROG3.ATK.luck.base === 0.01
      && PROG3.ATK.luck.k === 7 && PROG3.ATK.luck.rel === true,
    PROG3.ATK.luck);
  {
    const lk = (pts) => ({ prog3: { sk: { sword: { level: 50 }, bow: { level: 1 }, staff: { level: 1 } },
      atk: { sword: { luck: pts }, bow: {}, staff: {} }, alloc: {} } });
    check('...5 points already read 26 % crit and ×2.33 — the first points count most',
      Math.abs(room._prog3CritChance(lk(5), 'sword') - (0.01 + 0.60 * 5 / 12)) < 1e-9
        && Math.abs(room._prog3CritMult(lk(5), 'sword') - (1.5 + 2.0 * 5 / 12)) < 1e-9);
    check('...and 100 points read past the old pair\'s endpoints (31 % / ×2.5): nobody\'s Luck weakens',
      room._prog3CritChance(lk(100), 'sword') > 0.31 && room._prog3CritMult(lk(100), 'sword') > 2.5,
      { chance: room._prog3CritChance(lk(100), 'sword'), mult: room._prog3CritMult(lk(100), 'sword') });
  }
  check('the whitelist takes the new names through the same door and refuses the retired ones',
    prog3StatDef('luck').scope === 'atk' && prog3StatDef('range').scope === 'atk'
      && prog3StatDef('special').scope === 'atk' && prog3StatDef('move').scope === 'body'
      && prog3StatDef('crit') === null && prog3StatDef('critDmg') === null);

  /* ── migration v17: the luck fold refunds INTO THE LANE, and the shared grant ── */
  const b17 = {
    _v: 16,
    prog3: {
      sk: { sword: { level: 6, xp: 0 }, bow: { level: 3, xp: 0 }, staff: { level: 1, xp: 0 } },
      alloc: { def: 2, hp: 1, dodge: 0, stam: 0, eres: 0, mana: 0 },
      atk: { sword: { crit: 20, critDmg: 10, aspd: 5, dmg: 0, elem: 0 },
             bow:   { crit: 3, critDmg: 0, aspd: 0, dmg: 0, elem: 0 },
             staff: { crit: 0, critDmg: 0, aspd: 0, dmg: 0, elem: 0 } },
      pool: 4, poolBy: { sword: 2, bow: 1, staff: 0 }, ms: 10, ppl: 3,
    },
  };
  const r17 = runRpgMigrations(b17);
  check('v17 runs clean to the current version', r17.failed === null && b17._v === RPG_SCHEMA_VERSION, { r17, v: b17._v });
  check('v17 REFUNDS crit + critDmg into the LANE that held them (pool and poolBy both)',
    b17.prog3.pool === 4 + 30 + 3 && b17.prog3.poolBy.sword === 2 + 30 && b17.prog3.poolBy.bow === 1 + 3 && b17.prog3.poolBy.staff === 0,
    { pool: b17.prog3.pool, poolBy: b17.prog3.poolBy });
  check('...and the retired keys are gone while everything else stays',
    !('crit' in b17.prog3.atk.sword) && !('critDmg' in b17.prog3.atk.sword) && b17.prog3.atk.sword.aspd === 5
      && b17.prog3.alloc.def === 2 && b17.prog3.alloc.hp === 1,
    b17.prog3.atk.sword);
  check('v17 grants SHARED_POINTS_PER_LEVEL × (level − 1) per skill, stamped',
    b17.prog3.shared === PROG3.SHARED_POINTS_PER_LEVEL * (5 + 2 + 0) && b17.prog3.spl === PROG3.SHARED_POINTS_PER_LEVEL,
    { shared: b17.prog3.shared, spl: b17.prog3.spl });
  check('...and body points already placed with lane points STAY placed (never clawed back)',
    b17.prog3.alloc.def === 2 && b17.prog3.alloc.hp === 1, b17.prog3.alloc);
  const pool17 = b17.prog3.pool, shared17 = b17.prog3.shared;
  check('v17 is idempotent (no double refund, no double grant)',
    prog3FoldLuck(b17.prog3) === false && prog3GrantSharedPoints(b17.prog3) === false
      && b17.prog3.pool === pool17 && b17.prog3.shared === shared17
      && runRpgMigrations(b17).changed === false,
    { pool: b17.prog3.pool, shared: b17.prog3.shared });
  /* A v10-ERA blob runs v10→v17 in one pass: prog3FromLegacy mints shared at
     the current rate AND stamps spl, so v17 must find nothing left to grant. */
  const era = { _v: 9, weaponSkills: { sword: { level: 6, xp: 0 } } };
  runRpgMigrations(era);
  check('a v10-era blob lands at the shared rate in one pass (no double grant)',
    era.prog3.shared === 6 * PROG3.SHARED_POINTS_PER_LEVEL && era.prog3.spl === PROG3.SHARED_POINTS_PER_LEVEL,
    { shared: era.prog3.shared, spl: era.prog3.spl });

  /* ── the boundary heal, because migrations fail open ── */
  const bh = room._sanitizeProg3({
    sk: { sword: { level: 10, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } },
    alloc: {}, atk: { sword: { crit: 999, critDmg: 5 }, bow: {}, staff: {} },
    pool: 1, poolBy: { sword: 1 }, ppl: 3,
  });
  check('sanitize folds a crit-pair blob the same way, refund BOUNDED by the retired caps (75 + 5)',
    bh.pool === 1 + 75 + 5 && bh.poolBy.sword === 1 + 75 + 5
      && !('crit' in bh.atk.sword) && bh.atk.sword.luck === 0,
    { pool: bh.pool, poolBy: bh.poolBy, sword: bh.atk.sword });
  check('sanitize boundary-heals the shared grant on a spl-less blob (+3×9 on sword)',
    bh.shared === 9 * PROG3.SHARED_POINTS_PER_LEVEL && bh.spl === PROG3.SHARED_POINTS_PER_LEVEL,
    { shared: bh.shared, spl: bh.spl });
  const bh2 = room._sanitizeProg3(bh);
  check('...and a healed blob sanitizes to itself (no re-grant, no re-refund)',
    bh2.shared === bh.shared && bh2.pool === bh.pool && bh2.spl === bh.spl, { shared: bh2.shared, pool: bh2.pool });
  check('sanitize bounds the shared pool and clamps the new stats',
    room._sanitizeProg3({ sk: {}, alloc: { move: 999 }, atk: { sword: { range: 999, special: 999 } }, pool: 0, shared: 1e9, ppl: 3, spl: 3 })
      .shared === 999
    && room._sanitizeProg3({ sk: {}, alloc: { move: 999 }, atk: {}, pool: 0, ppl: 3, spl: 3 }).alloc.move === PROG3.BODY.move.cap
    && room._sanitizeProg3({ sk: {}, alloc: {}, atk: { sword: { range: 999, special: 999 } }, pool: 0, ppl: 3, spl: 3 }).atk.sword.range === PROG3.ATK.range.cap
    && room._sanitizeProg3({ sk: {}, alloc: {}, atk: { sword: { range: 999, special: 999 } }, pool: 0, ppl: 3, spl: 3 }).atk.sword.special === PROG3.ATK.special.cap);

  /* ── the mint: a level-up pays BOTH pools, and prog3_level says so ── */
  {
    const p3 = psA.prog3;
    p3.sk.bow.level = 1; p3.sk.bow.xp = 0; p3.sk.sword.level = 1; p3.sk.staff.level = 1;
    room._prog3Recompute(psA);
    const poolB = p3.pool, byB = p3.poolBy.bow, shB = p3.shared;
    room._prog3AwardXp('pa', psA, 'bow', prog3XpRequired(1), { flat: true });
    check('a level-up mints POINTS_PER_LEVEL to the lane AND SHARED_POINTS_PER_LEVEL to the shared pool',
      p3.pool === poolB + PROG3.POINTS_PER_LEVEL && p3.poolBy.bow === byB + PROG3.POINTS_PER_LEVEL
        && p3.shared === shB + PROG3.SHARED_POINTS_PER_LEVEL,
      { pool: [poolB, p3.pool], by: [byB, p3.poolBy.bow], shared: [shB, p3.shared] });
    const lvl = msgsOfType(wsA, 'prog3_level').pop();
    check('...and prog3_level carries the shared pool', lvl && lvl.payload.shared === p3.shared, lvl && lvl.payload);
  }

  /* ── MOVE SPEED: the anti-teleport bound widens by the server's OWN copy of the stat ── */
  {
    /* v2.3.2680: the curve, max +35 %, k 10 — no edge (movement is not
       evaluated against a monster). */
    check('move mult reads the allocation on the curve (75 pts → +35 % × 75/85)',
      Math.abs(room._prog3MoveMult({ prog3: { alloc: { move: 75 } } }) - (1 + 0.35 * 75 / 85)) < 1e-9
        && room._prog3MoveMult({ prog3: { alloc: {} } }) === 1);
    /* The fastest legitimate stack the client can run, in px/s, against the
       bound the worker actually applies to a prog3 player — read off the
       CLIENT's constants, so a client-side speed retune fails here.  The
       potion (×1.5) widens the bound too (movement.js _spdCap), so both
       sides carry it. */
    setProg3Enabled(true); setProg3SharedEnabled(true); setProg3RelEnabled(true);
    const capRpg = { prog3: { sk: { sword: { level: 1 }, bow: { level: 1 }, staff: { level: 1 } }, alloc: { move: PROG3.BODY.move.cap }, atk: {}, pool: 0 } };
    const clientMult = prog3MoveMult(capRpg);
    setProg3Enabled(false); setProg3SharedEnabled(false); setProg3RelEnabled(false);
    const worstPxPerSec = calcMoveSpeed(0, 0) / 5.0 * SPEED * 60 * clientMult * 1.15 * 1.065 * 1.5;
    const bound = 500 * 1.5 * room._prog3MoveMult({ prog3: { alloc: { move: PROG3.BODY.move.cap } } });
    check('client and server agree on the move multiplier at cap', Math.abs(clientMult - room._prog3MoveMult({ prog3: { alloc: { move: PROG3.BODY.move.cap } } })) < 1e-9, { clientMult });
    check('the fastest legitimate maxed-move stack stays under the widened bound with headroom',
      worstPxPerSec < bound * 0.75, { worstPxPerSec, bound });
    /* And the handler itself: a move a maxed-stat player can legitimately
       make in one second is accepted, while the same move from a player
       with no points is refused — the widening is real, not a comment. */
    const mkMover = (movePts) => ({
      x: 0, y: 0, z: 'meadow', lastMoveAt: Date.now() - 1000,
      prog3: { sk: { sword: { level: 1 }, bow: { level: 1 }, staff: { level: 1 } }, alloc: { move: movePts }, atk: prog3FreshAtk(), pool: 0 },
    });
    const dist = 500 * 1.3 + 80 - 5;   /* inside the widened bound, outside the plain one */
    room.playerState.mvA = mkMover(75); room.playerState.mvB = mkMover(0);
    room._handleMove({ id: 'mvA' }, null, { x: dist, y: 0, z: 'meadow' });
    room._handleMove({ id: 'mvB' }, null, { x: dist, y: 0, z: 'meadow' });
    check('a maxed-move player\'s legitimate move is accepted by the widened bound',
      room.playerState.mvA.x === dist, { x: room.playerState.mvA.x });
    check('...while the same move from a player with no move points is refused',
      room.playerState.mvB.x === 0, { x: room.playerState.mvB.x });
    delete room.playerState.mvA; delete room.playerState.mvB;
  }
}

// ── v2.3.2680: RELATIVE POINT VALUE — the owner's case, the bound, the edge ──
{
  /* Owner, 2026-09-22: "If a character is putting his first 5 points into
     dodge I want them to experience a high rate of dodging RELATIVE to the
     same or lesser monster level they're playing.  It can decay quickly for
     higher level monsters."  A character-5 (Melee 3) with 5 Dodge points: */
  const five = { prog3: { sk: { sword: { level: 3 }, bow: { level: 1 }, staff: { level: 1 } },
    alloc: { dodge: 5 }, atk: { sword: {}, bow: {}, staff: {} } } };
  check('the owner\'s case: 5 Dodge points = 37.5 % dodge against a same-or-lower-level monster',
    Math.abs(room._prog3DodgePct(five, 3) - 0.375) < 1e-9 && Math.abs(room._prog3DodgePct(five, 1) - 0.375) < 1e-9,
    { atLevel: room._prog3DodgePct(five, 3), lower: room._prog3DodgePct(five, 1) });
  check('...fading quickly above: 27 % at +2, 13.8 % at +4, nothing at +5',
    Math.abs(room._prog3DodgePct(five, 5) - 0.9 * 3 / 10) < 1e-9
      && Math.abs(room._prog3DodgePct(five, 7) - 0.9 * 1 / 8) < 1e-9
      && room._prog3DodgePct(five, 8) === 0,
    { p2: room._prog3DodgePct(five, 5), p4: room._prog3DodgePct(five, 7), p5: room._prog3DodgePct(five, 8) });

  /* The per-level bound, per stat (owner: "keep per level limit on those
     3"): 1 × character level on Defense/Dodge/Resist, 2 × on the four damage
     stats.  Character 10 here. */
  const sess = { id: 'rb' };
  room.playerState.rb = { prog3: { sk: { sword: { level: 8 }, bow: { level: 1 }, staff: { level: 1 } },
    alloc: { dodge: 10 }, atk: prog3FreshAtk(), pool: 50, poolBy: { sword: 50, bow: 0, staff: 0 }, shared: 50, ppl: 3, spl: 3 } };
  const rb = room.playerState.rb;
  room._prog3Recompute(rb);
  room._handleProg3Allocate(sess, { stat: 'dodge' });
  check('the bound: an 11th Dodge point at character 10 is refused (1 × level)', rb.prog3.alloc.dodge === 10, rb.prog3.alloc.dodge);
  rb.prog3.atk.sword.dmg = 10;
  room._handleProg3Allocate(sess, { stat: 'dmg', cat: 'sword' });
  check('...while an 11th Power point is taken (2 × level on the damage stats)', rb.prog3.atk.sword.dmg === 11, rb.prog3.atk.sword.dmg);
  rb.prog3.atk.sword.dmg = 20;
  room._handleProg3Allocate(sess, { stat: 'dmg', cat: 'sword' });
  check('...up to 20, and no further', rb.prog3.atk.sword.dmg === 20, rb.prog3.atk.sword.dmg);
  delete room.playerState.rb;

  /* The edge on YOUR hits: Power's multiplier fades against a target above
     the lane's own trained level, and is whole at or below it. */
  const hitter = { prog3: { sk: { sword: { level: 10 }, bow: { level: 1 }, staff: { level: 1 } },
    alloc: {}, atk: { sword: { dmg: 20 }, bow: {}, staff: {} } } };
  check('Power: × (1 + 20/27) at or below the lane\'s level',
    Math.abs(room._prog3PowerMult(hitter, 'sword', 10) - (1 + 20 / 27)) < 1e-9
      && Math.abs(room._prog3PowerMult(hitter, 'sword', 2) - (1 + 20 / 27)) < 1e-9);
  check('...× (1 + 8/15) at +3 (40 % of the points) and × 1 at +5',
    Math.abs(room._prog3PowerMult(hitter, 'sword', 13) - (1 + 8 / 15)) < 1e-9
      && room._prog3PowerMult(hitter, 'sword', 15) === 1);
  check('the yardstick is the LANE: the same points on a Bow 1 lane fade against a level-3 target',
    room._prog3PowerMult({ prog3: { sk: { sword: { level: 10 }, bow: { level: 1 }, staff: { level: 1 } },
      alloc: {}, atk: { sword: {}, bow: { dmg: 20 }, staff: {} } } }, 'bow', 3) < 1 + 20 / 27);
  /* ANTICHEAT LOCKSTEP: the ceiling takes the curve at edge 1, the most any
     monster can grant, so a roll against any target stays under it. */
  const cap = room._maxDmgForAttacker(psA, false);
  let over = 0;
  for (const lvl of [1, 5, 50, 100, undefined]) for (let i = 0; i < 200; i++) {
    if (room._computeAttackDamage(psA, 'melee', false, { targetLevel: lvl }).dmg > cap) over++;
  }
  check('rolls against every target level stay under the edge-1 ceiling', over === 0, { over, cap });
}

console.log(failures === 0 ? '\nprog3: ALL PASS' : `\nprog3: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
