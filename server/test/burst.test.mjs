/* Element Burst + mana rework test (v2.3.1734; plan:
 * docs/COMBAT-OVERHAUL-PLAN.md PR 6).
 *
 * Two features, one suite, because they are one change: the burst spends
 * from the pool the mana rework repaired, and neither is coherent alone.
 *
 *   1. THE MANA BUG.  The special cost floor(maxMana/5) — a fraction of
 *      max — so the bar was exactly 5 casts at Magic 1 AND at Magic 100,
 *      and (regen also being a % of max) the SUSTAINED rate never moved
 *      either.  Pinned: the cost is now flat, the pool curve is steeper,
 *      and casts-per-bar actually rises with Magic.
 *   2. THE BURST'S FOUR GATES.  Character level, an element on the
 *      SERVER's copy of the weapon, mana, cooldown — each refused
 *      independently, each with a reason, none of them client-supplied.
 *   3. RESOLUTION.  Radius, status application, damage multiplier, XP to
 *      the weapon that fired it, mana spent exactly once, and the
 *      anticheat ceiling (the v2.3.1451 lockstep rule) holding over
 *      thousands of rolls with every multiplier switched on.
 *   4. FRACTURE, activated.  Stacks to 5, +6% damage taken per stack,
 *      inert at zero stacks (so every monster in the game today is
 *      unaffected), and applied on the ORDINARY hit path too.
 *
 * Each behavior is written so it FAILS with the change reverted — the
 * casts-per-bar table would read 5/5/5, the gates would let a level-3
 * player with a plain sword cast, and fracture would be a flat ×1.
 */
import { GameRoom } from '../src/index.js';
import { PROG3 } from '../src/prog3.js';
import { applyElementStatus, fractureDmgMult, FRACTURE_DMG_PER_STACK, STATUS_DEFS } from '../src/elemental.js';

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
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'B', phrase: 'p-' + id, protocolVersion: 2,
    data: { x: -100000, y: -100000, z: 'meadow' },
  }));
}

// ══════════════════════════════════════════════════════════════════
// 1. THE MANA BUG — a flat cost, and a pool that pays for training
// ══════════════════════════════════════════════════════════════════
{
  const ws = fakeWs('mana');
  await join(ws, 'bp_burst_mana');
  const ps = room.playerState.bp_burst_mana;
  const session = room.sessions.get(ws);

  check('special cost is FLAT — the whole bug was that it was a fraction of max',
    room._abilityCost({ maxMana: 100 }, 'swipe') === PROG3.SPECIAL_MANA_COST
    && room._abilityCost({ maxMana: 999 }, 'swipe') === PROG3.SPECIAL_MANA_COST,
    { at100: room._abilityCost({ maxMana: 100 }, 'swipe'), at999: room._abilityCost({ maxMana: 999 }, 'swipe') });

  /* THE REGRESSION TEST FOR THE ACTUAL BUG.  Under the old formula this
     array is [5,5,5,5,5] — five casts per bar at every Magic level in the
     game.  It is the single assertion that fails if anyone restores
     floor(maxMana/5). */
  const castsAt = (magicLvl) => {
    ps.prog3.sk.staff.level = magicLvl;
    room._prog3Recompute(ps);
    return Math.floor(ps.maxMana / room._abilityCost(ps, 'swipe'));
  };
  const curve = [1, 10, 30, 50, 100].map(castsAt);
  check('casts per bar RISES with Magic (was a flat 5 at every level)',
    curve[0] < curve[1] && curve[1] < curve[2] && curve[2] < curve[3] && curve[3] < curve[4],
    { levels: [1, 10, 30, 50, 100], casts: curve });
  check('the floor is 4 casts and the cap is materially more',
    curve[0] === 4 && curve[4] >= 12, curve);

  /* The SUSTAINED rate moves too, which the old system also froze: regen
     pays a percentage of maxMana, so with a proportional cost the seconds
     per cast were identical at every level.  Same tick constant the regen
     loop uses (index.js: maxMana × 0.018 out of combat). */
  const secsPerCast = (magicLvl) => {
    ps.prog3.sk.staff.level = magicLvl;
    room._prog3Recompute(ps);
    return room._abilityCost(ps, 'swipe') / (ps.maxMana * 0.018);
  };
  check('sustained seconds-per-cast FALLS with Magic (was invariant by construction)',
    secsPerCast(100) < secsPerCast(1) * 0.5,
    { at1: secsPerCast(1).toFixed(2), at100: secsPerCast(100).toFixed(2) });

  // spend path still deducts exactly the flat cost, once
  ps.prog3.sk.staff.level = 1;
  room._prog3Recompute(ps);
  ps.mana = ps.maxMana;
  const before = ps.mana;
  room._handleAbilityUse(session, { type: 'swipe', tier: 3 });
  check('ability_use deducts exactly the flat cost (tier does not change it)',
    ps.mana === before - PROG3.SPECIAL_MANA_COST, { before, after: ps.mana });

  ps.mana = 1;
  ws.sent.length = 0;
  room._handleAbilityUse(session, { type: 'swipe' });
  check('an unaffordable special is refused, not overdrawn',
    ps.mana === 1 && msgsOfType(ws, 'ability_rejected').length === 1, ps.mana);
}

// ══════════════════════════════════════════════════════════════════
// 2. THE FOUR GATES
// ══════════════════════════════════════════════════════════════════
const ws = fakeWs('burst');
await join(ws, 'bp_burst');
const ps = room.playerState.bp_burst;
const session = room.sessions.get(ws);
ps.z = 'meadow';
ps.x = 500; ps.y = 500;

/* Park every meadow spawn far away so each case controls its own targets
   (the elemental2 idiom — shared monsters leak status state between
   checks, and the pairwise-separation shove moves them). */
const meadow = room._ensureZoneMonsters('meadow');
while (meadow.length < 6) {
  const extra = room._spawnZoneMonsters('meadow');
  if (!extra.length) break;
  for (const m of extra) {
    if (meadow.length >= 6) break;
    m.id = 'sm-burst-x' + meadow.length;
    meadow.push(m);
  }
}
for (const m of meadow) { m.x = m.spawnX = -50000; m.y = m.spawnY = -50000; m.statuses = {}; }

const lastReject = () => {
  const r = msgsOfType(ws, 'ability_rejected');
  return r.length ? r[r.length - 1].payload : null;
};
const cast = () => {
  ws.sent.length = 0;
  room.eventBuffer.length = 0;
  room._handleElementBurst(session);
};
const novas = () => room.eventBuffer.filter((e) => e.type === 'element_nova');

// Baseline: eligible.
const setEligible = () => {
  ps.prog3.sk.sword.level = PROG3.BURST_MIN_CHAR_LEVEL - 2; // Σ = 6 with bow/staff at 1
  room._prog3Recompute(ps);
  ps.weapon = { type: 'sword', tierMult: 1, element1: 'flame' };
  ps.activeSlot = 'melee';
  ps.mana = ps.maxMana;
  ps._burstCdUntil = 0;
  ps.dying = false; ps.dead = false; ps.disconnected = false;
};

{
  setEligible();
  check('level gate: Σ trained level is exactly the unlock level',
    room._prog3CharLevel(ps) === PROG3.BURST_MIN_CHAR_LEVEL, room._prog3CharLevel(ps));
  cast();
  check('an eligible cast fires a nova', novas().length === 1, room.eventBuffer.map((e) => e.type));
}
{
  setEligible();
  ps.prog3.sk.sword.level = 1;          // Σ = 3, a fresh character
  room._prog3Recompute(ps);
  cast();
  check('GATE level: below the unlock level, refused with reason "level"',
    novas().length === 0 && lastReject() && lastReject().reason === 'level', lastReject());
}
{
  setEligible();
  ps.weapon = { type: 'sword', tierMult: 1 };   // no element1 = not enchanted
  cast();
  check('GATE element: a plain weapon is refused with reason "no_element" (the Enchant gate)',
    novas().length === 0 && lastReject() && lastReject().reason === 'no_element', lastReject());
}
{
  setEligible();
  ps.weapon = null;
  cast();
  check('GATE weapon: an empty slot is refused with reason "no_weapon"',
    novas().length === 0 && lastReject() && lastReject().reason === 'no_weapon', lastReject());
}
{
  setEligible();
  ps.mana = PROG3.BURST_MANA_COST - 1;
  cast();
  check('GATE mana: one short is refused with reason "mana", and spends nothing',
    novas().length === 0 && lastReject() && lastReject().reason === 'mana'
    && ps.mana === PROG3.BURST_MANA_COST - 1, { reject: lastReject(), mana: ps.mana });
}
{
  setEligible();
  cast();
  const manaAfterFirst = ps.mana;
  cast();
  check('GATE cooldown: a second cast inside BURST_CD_MS is refused and costs nothing',
    novas().length === 0 && lastReject() && lastReject().reason === 'cooldown'
    && ps.mana === manaAfterFirst, { reject: lastReject(), mana: ps.mana, was: manaAfterFirst });
  ps._burstCdUntil = Date.now() - 1;
  cast();
  check('...and fires again once the cooldown has elapsed', novas().length === 1);
}
{
  setEligible();
  ps.dying = true;
  cast();
  check('GATE death: a dying player cannot cast',
    novas().length === 0 && lastReject() && lastReject().reason === 'dead', lastReject());
  ps.dying = false;
}
{
  /* The element comes from the SERVER's copy of the weapon in the ACTIVE
     slot, never from the wire — the handler takes no payload at all. */
  setEligible();
  ps.staffWeapon = { type: 'staff', tierMult: 1, element1: 'frost' };
  ps.activeSlot = 'staff';
  const target = meadow[0];
  target.alive = true; target.hp = 100000; target.maxHp = 100000;
  target.x = ps.x + 10; target.y = ps.y; target.statuses = {};
  cast();
  const nova = novas()[0];
  check('the nova casts the ACTIVE slot\'s element, resolved server-side',
    nova && nova.payload.element === 'frost' && nova.payload.status === 'freeze', nova && nova.payload);
  check('the target carries that element\'s status', !!target.statuses.freeze, target.statuses);
  target.x = -50000; target.y = -50000; target.statuses = {};
  ps.activeSlot = 'melee';
}

// ══════════════════════════════════════════════════════════════════
// 3. RESOLUTION — radius, damage, XP, spend-once
// ══════════════════════════════════════════════════════════════════
{
  setEligible();
  const inRange = meadow[1];
  const outRange = meadow[2];
  for (const m of [inRange, outRange]) {
    m.alive = true; m.hp = 100000; m.maxHp = 100000; m.statuses = {};
  }
  inRange.x = ps.x + PROG3.BURST_RADIUS - 5; inRange.y = ps.y;
  outRange.x = ps.x + PROG3.BURST_RADIUS + 5; outRange.y = ps.y;
  const manaBefore = ps.mana;
  const hpIn = inRange.hp, hpOut = outRange.hp;
  cast();
  const nova = novas()[0];
  check('RADIUS: a monster inside BURST_RADIUS is hit', inRange.hp < hpIn, { before: hpIn, after: inRange.hp });
  check('RADIUS: a monster just outside is NOT hit', outRange.hp === hpOut, { before: hpOut, after: outRange.hp });
  check('the nova names only the monsters it hit',
    nova && nova.payload.targets.length === 1 && nova.payload.targets[0] === inRange.id, nova && nova.payload.targets);
  check('the nova reports the radius it actually tested',
    nova && nova.payload.r === PROG3.BURST_RADIUS, nova && nova.payload.r);
  check('mana is spent EXACTLY once for the whole nova',
    ps.mana === manaBefore - PROG3.BURST_MANA_COST, { before: manaBefore, after: ps.mana });
  check('the element\'s status lands on the target', !!inRange.statuses.burn, inRange.statuses);
  const hits = room.eventBuffer.filter((e) => e.type === 'monster_hit' && e.payload.burst);
  check('each hit rides monster_hit tagged burst:true (the caster\'s own popup)',
    hits.length === 1 && hits[0].payload.monsterId === inRange.id, hits.map((h) => h.payload));
  check('the cooldown is stamped', ps._burstCdUntil > Date.now(), ps._burstCdUntil - Date.now());

  // XP goes to the weapon that fired it (v2.3.1710's rule), not to Magic.
  setEligible();
  const swordXpBefore = ps.prog3.sk.sword.xp;
  const staffXpBefore = ps.prog3.sk.staff.xp;
  inRange.hp = 100000; inRange.statuses = {};
  cast();
  check('trained XP goes to the weapon that fired the burst, not to Magic',
    ps.prog3.sk.sword.xp > swordXpBefore && ps.prog3.sk.staff.xp === staffXpBefore,
    { sword: [swordXpBefore, ps.prog3.sk.sword.xp], staff: [staffXpBefore, ps.prog3.sk.staff.xp] });

  // A nova that catches nothing still costs mana and still stamps the CD:
  // a whiff is a whiff.
  setEligible();
  inRange.x = -50000; inRange.y = -50000;
  const manaBefore2 = ps.mana;
  cast();
  check('a nova that hits nothing still costs mana and still fires',
    ps.mana === manaBefore2 - PROG3.BURST_MANA_COST && novas().length === 1
    && novas()[0].payload.targets.length === 0, { mana: ps.mana, targets: novas()[0].payload.targets });
}

// ══════════════════════════════════════════════════════════════════
// 3b. ANTICHEAT LOCKSTEP (the v2.3.1451 rule)
// ══════════════════════════════════════════════════════════════════
{
  /* 1.5x an ordinary auto-attack must sit INSIDE the ordinary auto-attack
     ceiling, or every burst silently clamps to the cap in production and
     the multiplier quietly stops existing.  Every multiplier the roll can
     stack is switched on at once: staff variance (the widest, 0.5-1.5),
     volatile, the cooked damage buff, crit, and a flame amulet on an
     elemental weapon. */
  setEligible();
  ps.prog3.sk.staff.level = PROG3.LEVEL_CAP;
  ps.prog3.atk.staff.crit = PROG3.ATK.crit.cap;
  ps.prog3.atk.staff.critDmg = PROG3.ATK.critDmg.cap;
  room._prog3Recompute(ps);
  ps.staffWeapon = { type: 'staff', tierMult: 3.0, element1: 'flame', isVolatile: true };
  ps.activeSlot = 'staff';
  ps.amulet = { gem: 'flame', tier: 'godly' };
  ps.buffs = { damage: { until: Date.now() + 60000 } };

  const cap = room._maxDmgForAttacker(ps, false);
  let worst = 0;
  let overCap = 0;
  for (let i = 0; i < 4000; i++) {
    const rolled = room._computeAttackDamage(ps, 'staff', false);
    const burst = Math.round(rolled.dmg * PROG3.BURST_DMG_MULT);
    if (burst > worst) worst = burst;
    if (burst > cap) overCap++;
  }
  check('BURST_DMG_MULT fits inside the auto-attack ceiling — no legit burst is ever clamped',
    overCap === 0, { cap, worstBurstRoll: worst, clamped: overCap });
  check('...with real headroom left, not by a hair',
    worst < cap * 0.95, { cap, worst, ratio: (worst / cap).toFixed(3) });

  ps.amulet = null;
  ps.buffs = {};
  ps.activeSlot = 'melee';
  ps.prog3.sk.staff.level = 1;
  ps.prog3.atk.staff.crit = 0;
  ps.prog3.atk.staff.critDmg = 0;
  room._prog3Recompute(ps);
}

// ══════════════════════════════════════════════════════════════════
// 4. FRACTURE, activated
// ══════════════════════════════════════════════════════════════════
{
  check('fracture is inert on an unfractured monster — every monster today is unchanged',
    fractureDmgMult({}) === 1 && fractureDmgMult({ statuses: {} }) === 1
    && fractureDmgMult({ statuses: { burn: { stacks: 3 } } }) === 1);

  const m = { statuses: {} };
  const now = Date.now();
  applyElementStatus(m, 'stone', 'bp_burst', 0, now);
  check('one stone application = one stack = +6% damage taken',
    Math.abs(fractureDmgMult(m) - (1 + FRACTURE_DMG_PER_STACK)) < 1e-9, fractureDmgMult(m));
  for (let i = 0; i < 10; i++) applyElementStatus(m, 'stone', 'bp_burst', 0, now);
  check('stacks cap at maxStacks (5) — a stone build cannot grind a monster to dust',
    m.statuses.fracture.stacks === STATUS_DEFS.fracture.maxStacks
    && Math.abs(fractureDmgMult(m) - (1 + 5 * FRACTURE_DMG_PER_STACK)) < 1e-9,
    { stacks: m.statuses.fracture.stacks, mult: fractureDmgMult(m) });

  /* THE VISIBLE HALF: the stack count is what the client's pip row reads
     (entityRenderer.js).  A stacking status whose stacks never leave 1
     would render identically at +6% and +30%. */
  check('the stack count is exposed on the status object for the client pip row',
    typeof m.statuses.fracture.stacks === 'number' && m.statuses.fracture.stacks === 5,
    m.statuses.fracture);

  /* And it applies on the ORDINARY hit path, not only the burst — Stone
     weapons have been applying this status since the elemental system was
     written. */
  setEligible();
  ps.weapon = { type: 'sword', tierMult: 1, element1: 'stone' };
  ps.activeSlot = 'melee';
  ps.prog3.atk.sword.crit = 0;   // remove the crit dice from the comparison
  const victim = meadow[3];
  victim.alive = true; victim.hp = 10000000; victim.maxHp = 10000000;
  victim.x = ps.x + 10; victim.y = ps.y; victim.statuses = {}; victim.element = null;

  const swing = () => {
    /* Rewind the per-(player,monster) cadence floor (v2.3.1134) so each
       call represents a legally-spaced swing, and undo the KNOCKBACK — a
       landed hit shoves the monster, and after ~50 swings it is outside
       PVE_MELEE_RANGE and every later "swing" silently deals nothing.
       (Found the hard way: the first draft of this sample measured 300
       swings and 250 of them were misses.) */
    if (ps._monHitCad) ps._monHitCad.delete(victim.id);
    victim.x = ps.x + 10; victim.y = ps.y;
    const before = victim.hp;
    room._handleMonsterDamage(session, { monsterId: victim.id, zone: 'meadow', slot: 'melee' });
    return before - victim.hp;
  };
  /* Average over many swings — the roll has per-type variance, so a single
     pair proves nothing.  INTERLEAVED rather than run as two blocks: every
     landed hit pays trained XP, so a thousand swings measurably levels the
     sword mid-sample and a "fractured" block run second would come out
     ahead for that reason alone (the first draft read 1.74x and the extra
     0.44 was pure levelling).  Alternating makes the drift common-mode. */
  let plain = 0;
  let broken = 0;
  for (let i = 0; i < 400; i++) {
    victim.statuses = {};
    plain += swing();
    applyElementStatus(victim, 'stone', 'bp_burst', 0, Date.now());
    victim.statuses.fracture.stacks = STATUS_DEFS.fracture.maxStacks;
    broken += swing();
  }
  check('FRACTURE on the ordinary hit path: a 5-stack target takes ~30% more',
    broken > plain * 1.20 && broken < plain * 1.40,
    { plain, broken, ratio: (broken / plain).toFixed(3) });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
