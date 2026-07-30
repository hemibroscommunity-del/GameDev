/* Elemental-completion test (v2.3.1133, PR17, handoff item I).  The
 * v2.3.1114 model left CC, resonance mana, amulet elemDmg and curse
 * client-side -- all four were phantom (or display-only) because the
 * server owns monster AI, mana, and the damage roll.  Checks:
 *   1. elementMoveMult: freeze/root -> 0, slow -> 0.4, none -> 1,
 *      expiry -> 1.
 *   2. A frozen monster neither moves nor attacks through a tick while
 *      an identical unfrozen control does both; slow scales the chase
 *      step by exactly 0.4.
 *   3. resolveElementCollision reports `resonating` inside the last
 *      25% of the setup's duration and not outside it.
 *   4. Resonance mana restore: exact amount (4% maxMana × restoration
 *      mult × streak mult), 3s throttle, maxMana clamp, streak counts
 *      up inside the 10s window and resets outside it.
 *   5. Amulet elemDmg: flame-gem amulets boost ELEMENTAL weapons by
 *      the per-tier percentage (5.5/10.5%), no boost without element1
 *      or with a non-flame/forged gem.
 *   6. Curse: ×0.7 outgoing while _cursedUntil is future, normal
 *      after; a hexer's landed hit stamps it.
 */
import { GameRoom } from '../src/index.js';
import { elementMoveMult, applyElementStatus, resolveElementCollision, STATUS_DEFS, COLLISION_TABLE, ELEMENT_STATUS, getEffectiveness } from '../src/elemental.js';
/* v2.3.1569: the elemental tables are hand-mirrored between client and
   server and were NOT covered by mirror-audit — the one pair of tables
   most likely to drift, since every new element touches both.  Flora
   made that concrete, so the conformance check lives here now. */
import { COLLISION_TABLE as C_COLLISION, STATUS_DEFS as C_STATUS, EFFECTIVENESS as C_WHEEL, getEffectiveness as cGetEff } from '../../src/data/gameSystems.js';
import { ELEMENTS } from '../../src/data/elements.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const realRandom = Math.random;

// ── 1. moveMult units ──
const now0 = Date.now();
check('no statuses -> 1', elementMoveMult({ statuses: {} }) === 1 && elementMoveMult({}) === 1);
check('freeze -> 0', elementMoveMult({ statuses: { freeze: { remaining: 2 } } }) === 0);
check('root -> 0', elementMoveMult({ statuses: { root: { remaining: 2 } } }) === 0);
check('slow -> 0.4', elementMoveMult({ statuses: { slow: { remaining: 2 } } }) === 0.4);
const mExp = { statuses: {} };
applyElementStatus(mExp, 'frost', 'p', 0, now0);
mExp.statuses.freeze.remaining = -1;
import('../src/elemental.js').then(() => {});
// expiry is handled by tickElementStatuses deleting the status
const { tickElementStatuses } = await import('../src/elemental.js');
tickElementStatuses(mExp, 0.1, now0);
check('expired status restores moveMult 1', elementMoveMult(mExp) === 1, mExp.statuses);

// ── 2. tick behavior: frozen vs control ──
const ws = fakeWs('e');
await join(ws, 'bp_el_p');
const ps = room.playerState['bp_el_p'];
ps.z = 'meadow';
const meadow = room._ensureZoneMonsters('meadow');
/* v2.3.1592: meadow dropped from 10 monsters to 3, but this suite reaches for
   meadow[0..4] so each element case gets an untouched target.  Top the list up
   with real spawns under unique ids instead of sharing three monsters across
   cases — status effects persist on the monster, so reuse would leak burn/
   freeze state between checks.  Same idiom as combat-lifecycle.test.mjs;
   node-respawn.test.mjs owns the population number. */
while (meadow.length < 5) {
  const extra = room._spawnZoneMonsters('meadow');
  if (!extra.length) break;                    /* never loop forever */
  for (const m of extra) {
    if (meadow.length >= 5) break;
    m.id = 'sm-meadow-x' + meadow.length;      /* ids repeat per spawn call */
    meadow.push(m);
  }
}
const mFrozen = meadow[0], mControl = meadow[1], mSlow = meadow[2];
// place the player near all three, outside ATTACK_RANGE (45) to force chase
ps.x = 500; ps.y = 500;
for (const [m, dx] of [[mFrozen, 100], [mControl, -100], [mSlow, 160]]) {
  m.x = ps.x + dx; m.y = ps.y; m.spawnX = m.x; m.spawnY = m.y;
  m.alive = true; m.atkCd = 0; m._aggroOverrideTarget = null; m._aggroOverrideUntil = 0;
}
// v2.3.1148: FLAKE FIX -- park the OTHER meadow spawns in a far corner.
// Their RANDOM positions landed within the v2.3.1110 pairwise
// separation radius (22px, index.js "monster<->monster separation") of
// a test monster ~25% of runs, and the shove (up to 11px/pair/tick,
// which has no CC gate) moved the "frozen" monster and broke the
// exact-step assertions below.  The trio itself sits 60-260px apart,
// safely outside the radius.
for (const m of meadow) {
  if (m !== mFrozen && m !== mControl && m !== mSlow) {
    m.x = m.spawnX = -50000; m.y = m.spawnY = -50000;
    m._wanderPausedUntil = Date.now() + 600000;
  }
}
applyElementStatus(mFrozen, 'frost', 'bp_el_p', 0, Date.now()); // freeze
applyElementStatus(mSlow, 'wind', 'bp_el_p', 0, Date.now());    // slow
const posF = { x: mFrozen.x, y: mFrozen.y };
const posC = { x: mControl.x, y: mControl.y };
const posS = { x: mSlow.x, y: mSlow.y };
room._tickMonsters();
const distMoved = (m, p) => Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
check('frozen monster does not move', distMoved(mFrozen, posF) === 0, distMoved(mFrozen, posF));
check('control monster chases', distMoved(mControl, posC) > 0.4, distMoved(mControl, posC));
const slowStep = distMoved(mSlow, posS);
check('slowed monster moves at exactly 0.4x', Math.abs(slowStep - mControl.spd * 0.4) < 1e-6 || Math.abs(slowStep - mSlow.spd * 0.4) < 1e-6, { slowStep, spd: mSlow.spd });
// attacks: park frozen + control INSIDE attack range with atkCd 0
mFrozen.x = ps.x + 10; mFrozen.y = ps.y; mFrozen.atkCd = 0;
mControl.x = ps.x - 10; mControl.y = ps.y; mControl.atkCd = 0;
room.eventBuffer.length = 0;
ps.hp = 1000; ps.maxHp = 1000; ps._zoneEntryGraceUntil = 0;
room._tickMonsters();
const atkFrom = (id) => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.monsterId === id).length;
check('frozen monster cannot attack', atkFrom(mFrozen.id) === 0, room.eventBuffer.map((e) => e.type));
check('control monster attacks', atkFrom(mControl.id) === 1);

// ── 3. resonating flag ──
const mCol = { statuses: {}, element: null };
applyElementStatus(mCol, 'flame', 'bp_el_p', 0, Date.now()); // burn: dur 4, maxDur 6 -> window 1.5
mCol.statuses.burn.remaining = 3.0; // outside window
let col = resolveElementCollision(mCol, 'frost', ps, false, Date.now());
check('collision outside the window is not resonating', col && col.resonating === false, col);
applyElementStatus(mCol, 'flame', 'bp_el_p', 0, Date.now());
mCol.statuses.burn.remaining = 1.0; // inside 1.5 window
col = resolveElementCollision(mCol, 'frost', ps, false, Date.now());
check('collision inside the last 25% is resonating', col && col.resonating === true, col);

// ── 4. resonance mana restore via the real damage path ──
ps.weapon = { type: 'sword', tierMult: 1, element1: 'frost' };
ps.activeSlot = 'melee';
ps.mana = 50; ps.maxMana = 100; ps.restoration = 0;
ps.power = 0;
const mTarget = meadow[3];
mTarget.alive = true; mTarget.hp = 100000; mTarget.maxHp = 100000;
mTarget.x = ps.x + 10; mTarget.y = ps.y;
mTarget.statuses = {};
const primeSetup = (remaining) => {
  applyElementStatus(mTarget, 'flame', 'bp_el_p', 0, Date.now());
  mTarget.statuses.burn.remaining = remaining;
};
const hit = () => {
  // v2.3.1134 (merged from #195 mid-PR): a per-(player,monster)
  // 335ms hit-cadence floor drops back-to-back hits.  This test fires
  // consecutively on purpose -- rewind the cadence stamp so each call
  // represents a legally-spaced swing.
  if (ps._monHitCad) ps._monHitCad.delete(mTarget.id);
  return room._handleMonsterDamage(room.sessions.get(ws), { monsterId: mTarget.id, zone: 'meadow', element: 'frost', slot: 'melee' });
};
primeSetup(1.0); // resonating
hit();
check('resonating collision restores 4% maxMana × streak 1.1', ps.mana === 50 + Math.round(4 * 1.1), ps.mana);
const manaAfterFirst = ps.mana;
primeSetup(1.0);
hit(); // inside the 3s throttle: streak counts but no mana
check('3s throttle: second resonating collision restores nothing', ps.mana === manaAfterFirst && ps._resonanceStreak.count === 2, { mana: ps.mana, streak: ps._resonanceStreak });
ps._lastCollisionMana = Date.now() - 4000; // outside throttle
primeSetup(1.0);
hit();
check('third collision (streak 3) restores 4% × 1.3', ps.mana === manaAfterFirst + Math.round(4 * 1.3), { mana: ps.mana, streak: ps._resonanceStreak });
ps._resonanceStreak.lastTs = Date.now() - 11000; // window lapsed
ps._lastCollisionMana = 0;
primeSetup(1.0);
hit();
check('streak resets outside the 10s window', ps._resonanceStreak.count === 1, ps._resonanceStreak);
ps.mana = 99; ps._lastCollisionMana = 0;
primeSetup(1.0);
hit();
check('restore clamps at maxMana', ps.mana === 100, ps.mana);

// ── 5. amulet elemDmg ──
Math.random = () => 0.5; // fixed variance, no crit at power 0
const roll = () => room._computeAttackDamage(ps, 'melee', false).dmg;
ps.amulet = null;
ps._cursedUntil = 0;
const dNo = roll();
ps.amulet = { tier: 'mythic', gem: 'flame' };
const dMythic = roll();
ps.amulet = { tier: 'simple', gem: 'flame' };
const dSimple = roll();
ps.amulet = { tier: 'mythic', gem: 'dark' }; // critDmg gem: no elemDmg
const dDark = roll();
ps.amulet = { tier: 'weird', gem: 'nuclear' }; // forged
const dForged = roll();
ps.amulet = { tier: 'mythic', gem: 'flame' };
ps.weapon.element1 = null; // non-elemental weapon
const dNoElem = roll();
ps.weapon.element1 = 'frost';
Math.random = realRandom;
check('mythic flame amulet = +10.5% on elemental weapons', Math.abs(dMythic - Math.round(dNo * 1.105)) <= 1, { dNo, dMythic });
check('simple flame amulet = +5.5%', Math.abs(dSimple - Math.round(dNo * 1.055)) <= 1, { dNo, dSimple });
check('non-flame gem gives no elemDmg boost', dDark === dNo, { dNo, dDark });
check('forged gem/tier gives no boost', dForged === dNo, { dNo, dForged });
check('no element1 -> no boost', dNoElem === dNo, { dNo, dNoElem });

// ── 5b. v2.3.1180: join-path amulet sanitizer (_sanitizeAmulet) ──
// Amulets are a client-crafted blob (no server forge), so ps.amulet is
// ingested wholly untrusted at join.  _computeAttackDamage reads gem +
// tier, so the join load path whitelists them.
{
  const legit = room._sanitizeAmulet({ tier: 'mythic', gem: 'flame', name: 'Mythic Flame Amulet' });
  check('sanitize keeps a legit {tier,gem,name}', legit && legit.tier === 'mythic' && legit.gem === 'flame' && legit.name === 'Mythic Flame Amulet', legit);
  // Forged tier beyond the legit ladder -> the whole amulet is dropped
  // (can't ride the AMULET_TIER_POWER `|| 1.0` fallback with the rest of
  // the blob intact).
  check('forged high-tier amulet is clamped to null', room._sanitizeAmulet({ tier: 'godtier', gem: 'flame' }) === null, room._sanitizeAmulet({ tier: 'godtier', gem: 'flame' }));
  // Forged gem -> nulled, tier retained (amulet stays equipped, no boost).
  const badGem = room._sanitizeAmulet({ tier: 'mythic', gem: 'nuclear' });
  check('forged gem nulled, valid tier kept', badGem && badGem.tier === 'mythic' && badGem.gem === null, badGem);
  // Smuggled extra fields (a raw elemDmg / tierMult) are stripped.
  const extra = room._sanitizeAmulet({ tier: 'simple', gem: 'flame', elemDmg: 9999, tierMult: 99, hardness: 5 });
  check('extra client fields stripped from amulet', extra && extra.tier === 'simple' && extra.gem === 'flame' && !('elemDmg' in extra) && !('tierMult' in extra) && !('hardness' in extra), extra);
  // A forged mythic-flame amulet is bounded to the LEGIT ceiling (the
  // accepted residual per elemental-completion.md) -- it survives
  // sanitize but grants only the same +10.5% a crafted one would.
  ps.weapon.element1 = 'frost';
  Math.random = () => 0.5;
  ps.amulet = null; const dClean = room._computeAttackDamage(ps, 'melee', false).dmg;
  ps.amulet = room._sanitizeAmulet({ tier: 'mythic', gem: 'flame', foo: 'bar' });
  const dSanitized = room._computeAttackDamage(ps, 'melee', false).dmg;
  Math.random = realRandom;
  check('sanitized forged mythic flame == legit +10.5% ceiling', Math.abs(dSanitized - Math.round(dClean * 1.105)) <= 1, { dClean, dSanitized });
  // Long name bounded; non-objects -> null.
  check('amulet name bounded to 40 chars', room._sanitizeAmulet({ tier: 'simple', name: 'x'.repeat(200) }).name.length === 40);
  check('non-object amulet -> null', room._sanitizeAmulet('forged') === null && room._sanitizeAmulet(null) === null);
  ps.amulet = null;
}

// ── 6. curse ──
Math.random = () => 0.5;
ps.amulet = null;
const dBase = roll();
ps._cursedUntil = Date.now() + 4000;
const dCursed = roll();
ps._cursedUntil = Date.now() - 1;
const dAfter = roll();
Math.random = realRandom;
check('curse multiplies outgoing by 0.7', Math.abs(dCursed - Math.round(dBase * 0.7)) <= 1, { dBase, dCursed });
check('curse expires', dAfter === dBase, { dBase, dAfter });
// hexer stamp through the real attack path
ps._cursedUntil = 0;
const mHex = meadow[4];
mHex.alive = true; mHex.arch = 'hexer'; mHex.atkCd = 0; mHex.dmg = 1;
mHex.x = ps.x + 5; mHex.y = ps.y;
mHex.statuses = {};
ps.hp = 1000; ps.blocking = false;
room._tickMonsters();
check("a hexer's landed hit stamps the curse", ps._cursedUntil > Date.now(), ps._cursedUntil);

/* ── v2.3.1569: Flora + client/server elemental mirror ── */
{
  // Flora exists on both sides with the Thorn status.
  check('flora: element registered client-side', !!ELEMENTS.flora && ELEMENTS.flora.status === 'thorn', ELEMENTS.flora);
  check('flora: server maps flora -> thorn', ELEMENT_STATUS.flora === 'thorn', ELEMENT_STATUS.flora);
  check('flora: thorn is not a passive DoT (it answers the attack)',
    STATUS_DEFS.thorn && STATUS_DEFS.thorn.tick === null, STATUS_DEFS.thorn);

  // Every element pair has a collision, both sides, same key set.
  const els = Object.keys(ELEMENTS);
  const want = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) want.push([els[i], els[j]]);
  const missing = want.filter(([a, b]) => !(COLLISION_TABLE[a + '|' + b] || COLLISION_TABLE[b + '|' + a]));
  check(`collisions: all ${want.length} element pairs resolve server-side`, missing.length === 0, missing);
  const cMissing = want.filter(([a, b]) => !(C_COLLISION[a + '|' + b] || C_COLLISION[b + '|' + a]));
  check('collisions: client table covers the same pairs', cMissing.length === 0, cMissing);

  // MIRROR: ids and damage numbers must match across the wire boundary.
  const drift = [];
  for (const k of Object.keys(COLLISION_TABLE)) {
    const srv = COLLISION_TABLE[k];
    const [a, b] = k.split('|');
    const cli = C_COLLISION[k] || C_COLLISION[b + '|' + a];
    if (!cli) { drift.push({ k, why: 'absent client-side' }); continue; }
    if (cli.id !== srv.id || cli.base !== srv.base || cli.coeff !== srv.coeff || cli.stat !== srv.stat) {
      drift.push({ k, srv: [srv.id, srv.base, srv.coeff, srv.stat], cli: [cli.id, cli.base, cli.coeff, cli.stat] });
    }
  }
  check('mirror: collision id/base/coeff/stat identical on both sides', drift.length === 0, drift.slice(0, 4));

  const sDrift = Object.keys(STATUS_DEFS).filter((id) => {
    const a = STATUS_DEFS[id], b = C_STATUS[id];
    return !b || a.dur !== b.dur || a.maxDur !== b.maxDur || a.tick !== b.tick;
  });
  check('mirror: status definitions identical on both sides', sDrift.length === 0, sDrift);

  // The wheel reroute: venom no longer beats water directly; it goes
  // through flora.  Checked on BOTH implementations.
  check('wheel: venom > flora > water (server)',
    getEffectiveness('venom', 'flora') === 1.25 && getEffectiveness('flora', 'water') === 1.25
    && getEffectiveness('venom', 'water') === 1.0);
  check('wheel: venom > flora > water (client)',
    cGetEff('venom', 'flora') === 1.25 && cGetEff('flora', 'water') === 1.25
    && cGetEff('venom', 'water') === 1.0);
  check('wheel: closed loop over all palette elements', C_WHEEL.length === 8, C_WHEEL.length);

  // Thorn recoil fires when the afflicted monster attacks, and routes
  // through the shared status-damage pipeline (credit + kill).
  const room2 = new GameRoom(makeState(), mockEnv);
  const mon = { id: 'm1', alive: true, hp: 100, maxHp: 100, statuses: {} };
  applyElementStatus(mon, 'flora', 'p1', 20, Date.now(), 1);
  check('thorn: applied by a flora hit', !!mon.statuses.thorn, mon.statuses);
  const dealt = room2._applyMonsterDot('meadow', mon, 4 + 20 * 0.25, 'p1', 'thorn');
  check('thorn: recoil damages the monster', dealt === 9 && mon.hp === 91, { dealt, hp: mon.hp });
  check('thorn: recoil is credited to the flora attacker',
    mon.dmgByPlayer && mon.dmgByPlayer.p1 === 9, mon.dmgByPlayer);
  const over = room2._applyMonsterDot('meadow', mon, 9999, 'p1', 'thorn');
  check('thorn: overkill is clamped to remaining hp', over === 91 && mon.hp === 0, { over, hp: mon.hp });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
