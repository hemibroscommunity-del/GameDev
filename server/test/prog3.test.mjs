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
import { PROG3, prog3XpRequired, prog3FromLegacy, prog3SplitAtk } from '../src/prog3.js';
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
  check('schema version is 11', RPG_SCHEMA_VERSION === 11, RPG_SCHEMA_VERSION);
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
  check('v10+v11 run clean', res.failed === null && res.version === 11, res);
  check('sword level = legacy+1, xp carried',
    blob.prog3.sk.sword.level === 8 && blob.prog3.sk.sword.xp === 500, blob.prog3.sk.sword);
  check('bow floors at level 1', blob.prog3.sk.bow.level === 1 && blob.prog3.sk.bow.xp === 10, blob.prog3.sk.bow);
  check('staff caps at 100, xp zeroed', blob.prog3.sk.staff.level === 100 && blob.prog3.sk.staff.xp === 0, blob.prog3.sk.staff);
  check('pool = Σ weapon levels + defense level', blob.prog3.pool === 7 + 0 + 100 + 12, blob.prog3.pool);
  /* v2.3.1668: alloc is the BODY set only; offense lives in atk, keyed
     by combat type. */
  check('body alloc starts zeroed',
    Object.values(blob.prog3.alloc).every((v) => v === 0)
      && Object.keys(blob.prog3.alloc).sort().join(',') === 'def,dodge,hp,stam', blob.prog3.alloc);
  check('per-type offense starts zeroed for all three skills',
    PROG3.SKILLS.every((c) => blob.prog3.atk[c]
      && blob.prog3.atk[c].crit === 0 && blob.prog3.atk[c].critDmg === 0 && blob.prog3.atk[c].aspd === 0),
    blob.prog3.atk);
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
  check('maxHp = 100 + level×2 (no armor, no hp pts)', psA.maxHp === 106, psA.maxHp);
  check('maxStamina = 100 flat', psA.maxStamina === 100, psA.maxStamina);
  check('maxMana = floor(100 + magic×1.2)', psA.maxMana === 101, psA.maxMana);
  const sync = msgsOfType(wsA, 'state_sync')[0];
  check('caps.prog3 advertised', sync && sync.caps && sync.caps.prog3 === true, sync && sync.caps && sync.caps.prog3);
  const st = msgsOfType(wsA, 'player_state')[0];
  check('player_state echoes prog3', st && st.payload && !!st.payload.prog3, st && Object.keys(st.payload || {}));
}

// ── 3. Trained XP accrual + level-up ──
{
  psA.hp = 5; psA.stamina = 5; psA.mana = 5;
  room._prog3AwardXp('pa', psA, 'sword', prog3XpRequired(1) - 1);
  check('xp below threshold: no level', psA.prog3.sk.sword.level === 1 && psA.prog3.pool === 0, psA.prog3.sk.sword);
  room._prog3AwardXp('pa', psA, 'sword', 1);
  check('level-up: sword 2, pool 1, char level 4',
    psA.prog3.sk.sword.level === 2 && psA.prog3.pool === 1 && psA.level === 4,
    { sk: psA.prog3.sk.sword, pool: psA.prog3.pool, level: psA.level });
  check('level-up restores resources', psA.hp === psA.maxHp && psA.stamina === psA.maxStamina && psA.mana === psA.maxMana,
    { hp: psA.hp, maxHp: psA.maxHp });
  const lvlMsgs = msgsOfType(wsA, 'prog3_level');
  check('prog3_level notification sent', lvlMsgs.length === 1
    && lvlMsgs[0].payload.skill === 'sword' && lvlMsgs[0].payload.level === 2 && lvlMsgs[0].payload.charLevel === 4,
    lvlMsgs.map((m) => m.payload));

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
  p3.pool = 0;
  room._handleProg3Allocate(sess, { stat: 'hp' });
  check('empty pool rejects', p3.alloc.hp === 0 && p3.pool === 0, p3);
  p3.pool = 10;
  room._handleProg3Allocate(sess, { stat: 'coins' });
  room._handleProg3Allocate(sess, { stat: '__proto__' });
  room._handleProg3Allocate(sess, {});
  check('bad stat names reject (pool untouched)', p3.pool === 10 && p3.alloc.hp === 0, p3);
  // §6-C: per-stat cap = min(stat cap, character level).  Char level is
  // 4 here, so the 5th hp point must bounce.
  for (let i = 0; i < 5; i++) room._handleProg3Allocate(sess, { stat: 'hp' });
  check('per-stat cap = min(100, char level)', p3.alloc.hp === 4 && p3.pool === 6,
    { hp: p3.alloc.hp, pool: p3.pool, level: psA.level });
  check('hp points land in maxHp (+8/pt)', psA.maxHp === 100 + psA.level * 2 + 4 * 8, psA.maxHp);
  const acks = msgsOfType(wsA, 'prog3_allocated');
  check('prog3_allocated acks each landed point', acks.length === 4
    && acks[3].payload.stat === 'hp' && acks[3].payload.pts === 4 && acks[3].payload.pool === 6,
    acks.map((a) => a.payload));
  // Dodge's own hard cap (75) binds even with level headroom.
  psA.prog3.sk.sword.level = 100; psA.prog3.sk.bow.level = 100; psA.prog3.sk.staff.level = 100;
  room._prog3Recompute(psA);
  check('char level caps at 300', psA.level === 300, psA.level);
  p3.pool = 200; p3.alloc.dodge = 75;
  room._handleProg3Allocate(sess, { stat: 'dodge' });
  check('dodge hard cap 75 binds', p3.alloc.dodge === 75 && p3.pool === 200, p3.alloc.dodge);
}

// ── 5. Combat math: defense, dodge, dropped channels ──
{
  const p3 = psA.prog3;
  psA._zoneEntryGraceUntil = 0; psA._buffs = {};
  psA.maxHp = 1000; psA.hp = 1000;
  p3.alloc.dodge = 0; p3.alloc.def = 50;
  const r = room._applyDamage(psA, 100, false);
  check('defense: −0.4%/pt (50 pts → ×0.8)', r.dmgTaken === 80, r);
  p3.alloc.def = 100;
  const r2 = room._applyDamage(psA, 100, false);
  check('defense caps at −40%', r2.dmgTaken === 60, r2);
  p3.alloc.dodge = 75;
  check('dodge pct = 0.4%/pt (75 → 30%)', Math.abs(room._prog3DodgePct(psA) - 0.30) < 1e-9, room._prog3DodgePct(psA));
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
     candidate weapon in the ceiling loop is genuinely maxed. */
  for (const c of PROG3.SKILLS) { psA.prog3.atk[c].crit = 75; psA.prog3.atk[c].critDmg = 100; }
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
  // Deterministic crit: rate 30% at 75 pts, flat +200 at 100 critDmg.
  const origRandom = Math.random;
  Math.random = () => 0.0;
  const critRoll = room._computeAttackDamage(psA, 'melee', false);
  Math.random = origRandom;
  check('prog3 crit fires from the allocated stat', critRoll.isCrit === true, critRoll);
}

// ── 7. Sanitizer bounds corrupt stored shapes ──
{
  const dirty = room._sanitizeProg3({
    sk: { sword: { level: 999, xp: -5 }, bow: 'nope' },
    alloc: { hp: 5000, dodge: 999, bogus: 9 },
    atk: { sword: { crit: 999, critDmg: -3, bogus: 4 }, nosuchcat: { crit: 50 } },
    pool: 1e9,
  });
  check('sanitize clamps sk levels to [1,100]', dirty.sk.sword.level === 100 && dirty.sk.bow.level === 1, dirty.sk);
  check('sanitize floors xp at 0', dirty.sk.sword.xp === 0, dirty.sk.sword);
  check('sanitize clamps body alloc to caps, drops unknown keys',
    dirty.alloc.hp === 100 && dirty.alloc.dodge === 75 && !('bogus' in dirty.alloc), dirty.alloc);
  check('sanitize clamps per-type offense and drops unknown cats/keys',
    dirty.atk.sword.crit === 75 && dirty.atk.sword.critDmg === 0
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
  psA.armor = null;
  p3.alloc.def = 10;
  room._handleStatsUpdate(sess, { armor: { name: 'Test Plate', tierMult: 4 } }); // est tier 18 → req 90
  check('armor ingest: over-tier swap rejected (defense points too low)', psA.armor === null, psA.armor);
  p3.alloc.def = 90;
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
  check('_saveRpg persists prog3', lastPut && !!lastPut.prog3 && lastPut._v === 11,
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
    PROG3.SKILLS.every((c) => split.atk[c].crit === 0), split.atk);
  check('v11 is idempotent (no double refund)', prog3SplitAtk(split).pool === 17);

  /* The endpoint: an offense stat REQUIRES a category. */
  p3.pool = 50;
  for (const c of PROG3.SKILLS) p3.atk[c] = { crit: 0, critDmg: 0, aspd: 0 };
  const poolBefore = p3.pool;
  room._handleProg3Allocate(sess, { stat: 'crit' });                 // no cat
  room._handleProg3Allocate(sess, { stat: 'crit', cat: 'trebuchet' }); // unknown cat
  room._handleProg3Allocate(sess, { stat: 'crit', cat: '__proto__' });
  check('an offense spend without a valid category is refused',
    p3.pool === poolBefore && p3.atk.sword.crit === 0,
    { pool: p3.pool, sword: p3.atk.sword });

  room._handleProg3Allocate(sess, { stat: 'crit', cat: 'bow' });
  check('an offense spend lands on the NAMED type only',
    p3.atk.bow.crit === 1 && p3.atk.sword.crit === 0 && p3.atk.staff.crit === 0, p3.atk);
  check('the offense spend debited the shared pool', p3.pool === poolBefore - 1, p3.pool);
  const ack = msgsOfType(wsA, 'prog3_allocated').pop();
  check('the ack names the category', ack && ack.payload.cat === 'bow' && ack.payload.stat === 'crit',
    ack && ack.payload);

  /* A body stat still works with no category, and ignores a stray one. */
  room._handleProg3Allocate(sess, { stat: 'def', cat: 'bow' });
  check('a body spend ignores a stray category', p3.alloc.def === 1, p3.alloc);

  /* THE POINT OF THE CHANGE: investing in one type must not arm another. */
  psA.weapon = { type: 'greatsword', tierMult: 1 };
  psA.rangedWeapon = { type: 'bow', tierMult: 1 };
  psA.staffWeapon = null;
  psA.amulet = null; psA._cursedUntil = 0;
  for (const c of PROG3.SKILLS) p3.atk[c] = { crit: 0, critDmg: 0, aspd: 0 };
  p3.atk.bow.crit = 75;                       // maxed BOW crit only
  const origRandom = Math.random;
  Math.random = () => 0.10;                   // inside 30%, outside 0%
  const bowRoll = room._computeAttackDamage(psA, 'ranged', false);
  const meleeRoll = room._computeAttackDamage(psA, 'melee', false);
  Math.random = origRandom;
  check('maxed BOW crit crits with a bow', bowRoll.isCrit === true, bowRoll);
  check('maxed BOW crit does NOTHING for melee', meleeRoll.isCrit === false, meleeRoll);

  /* The ceiling must cover the best type, not the active one. */
  for (const c of PROG3.SKILLS) p3.atk[c] = { crit: 75, critDmg: 100, aspd: 0 };
  let over = 0;
  const cap = room._maxDmgForAttacker(psA, false);
  for (let i = 0; i < 300; i++) {
    for (const slot of ['melee', 'ranged']) {
      if (room._computeAttackDamage(psA, slot, false).dmg > cap) over++;
    }
  }
  check('per-type crit damage stays under the anticheat ceiling', over === 0, { over, cap });
}

console.log(failures === 0 ? '\nprog3: ALL PASS' : `\nprog3: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
