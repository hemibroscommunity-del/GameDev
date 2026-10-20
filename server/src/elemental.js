/* ═══ ELEMENTAL — server-authoritative status / DoT / collision model ═══
 *
 * v2.3.1114: elemental damage becomes server-authoritative.  Until now the
 * whole pipeline was client-only: burns/roots/collisions mutated a LOCAL
 * hp prediction that the next authoritative tick overwrote -- against
 * server-driven monsters, elemental builds did nothing.  This module
 * mirrors the client formulas in src/data/gameSystems.js (tables extracted
 * programmatically from that module at v2.3.1113 -- keep in sync; the
 * client remains the visual source, this is the damage truth).
 *
 * Deliberately NOT ported (per docs/BALANCE-PLAN.md §6):
 * - elementalMastery multipliers (retired T2 stat, pinned 0 -> x1.0)
 * - influence CC-duration bonus (retired)
 * - all particles/popups/codex discovery (cosmetic)
 * v2.3.1139 (item I) PORTED the rest: CC movement/attack effects
 * (elementMoveMult below, consumed by _tickMonsters), the
 * resonance-streak mana restore (collision `resonating` flag +
 * _handleMonsterDamage), amulet elemDmg and the hexer curse in
 * _computeAttackDamage.
 * Caps: collision damage is clamped to COLLISION_BURST_CAP x the raw
 * table value (GDD §22 INV-16 combo-burst ceiling 3.2x; the natural
 * multiplier product resonance(<=1.3) x volatile(1.3) x effectiveness
 * (<=1.25) ~ 2.11 sits under it -- the cap is a defensive backstop). */

export const ELEMENT_STATUS = {"flame":"burn","frost":"freeze","water":"soak","venom":"root","storm":"shock","stone":"fracture","wind":"slow","dark":"curse","light":"reveal","flora":"thorn"};

export const STATUS_DEFS = {"burn":{"dur":4,"refresh":1,"maxDur":6,"tick":0.5},"freeze":{"dur":3,"refresh":0.5,"maxDur":5,"tick":null},"soak":{"dur":5,"refresh":1,"maxDur":7,"tick":null},"root":{"dur":5,"refresh":0.5,"maxDur":7,"tick":1},"shock":{"dur":4,"refresh":0,"maxDur":4,"tick":null},"fracture":{"dur":6,"refresh":0,"maxDur":6,"tick":null,"maxStacks":5},"slow":{"dur":5,"refresh":1,"maxDur":7,"tick":null},"curse":{"dur":6,"refresh":1,"maxDur":8,"tick":null},"reveal":{"dur":5,"refresh":1,"maxDur":7,"tick":null},"thorn":{"dur":6,"refresh":1,"maxDur":8,"tick":null}};

/* v2.3.1569: Flora joins the wheel where the GDD puts it — between
 * Venom and Water.  This is NOT an append: the old venom>water link is
 * replaced by venom>flora>water, so Venom no longer beats Water directly.
 * That is the GDD's wheel, and it is the one behaviour change adding
 * Flora forces on existing matchups. */
const EFFECTIVENESS = [["flame","frost"],["frost","storm"],["storm","stone"],["stone","wind"],["wind","venom"],["venom","flora"],["flora","water"],["water","flame"]];

export const COLLISION_TABLE = {"flora|flame":{"id":"wildfire","base":45,"coeff":0.8,"stat":"power"},"flora|frost":{"id":"thaw_bloom","base":25,"coeff":0.5,"stat":"vitality"},"flora|water":{"id":"overgrowth","base":30,"coeff":0.6,"stat":"vitality"},"flora|venom":{"id":"blight_garden","base":40,"coeff":0.7,"stat":"mind"},"flora|storm":{"id":"lightning_rod","base":65,"coeff":1.1,"stat":"agility"},"flora|stone":{"id":"petrified_wood","base":30,"coeff":0.6,"stat":"vitality"},"flora|wind":{"id":"scatter_seed","base":30,"coeff":0.5,"stat":"agility"},"flora|dark":{"id":"withering","base":45,"coeff":0.8,"stat":"mind"},"flora|light":{"id":"purifying_bloom","base":50,"coeff":0.9,"stat":"vitality"},"flame|frost":{"id":"steam","base":40,"coeff":0.8,"stat":"power"},"flame|water":{"id":"quench","base":45,"coeff":0.9,"stat":"power"},"flame|venom":{"id":"toxic_fumes","base":30,"coeff":0.6,"stat":"power"},"flame|storm":{"id":"overcharge","base":70,"coeff":1.2,"stat":"agility"},"flame|stone":{"id":"magma","base":50,"coeff":1,"stat":"power"},"flame|wind":{"id":"firestorm","base":35,"coeff":0.7,"stat":"power"},"frost|water":{"id":"flash_freeze","base":25,"coeff":0.5,"stat":"vitality"},"frost|venom":{"id":"shatter","base":70,"coeff":1.2,"stat":"agility"},"frost|storm":{"id":"hailstorm","base":50,"coeff":0.8,"stat":"agility"},"frost|stone":{"id":"permafrost","base":20,"coeff":0.4,"stat":"vitality"},"frost|wind":{"id":"blizzard","base":45,"coeff":0.7,"stat":"agility"},"water|venom":{"id":"dilute","base":30,"coeff":0.6,"stat":"vitality"},"water|storm":{"id":"conduit","base":55,"coeff":1,"stat":"agility"},"water|stone":{"id":"mudslide","base":40,"coeff":0.7,"stat":"vitality"},"water|wind":{"id":"monsoon","base":25,"coeff":0.5,"stat":"agility"},"venom|storm":{"id":"blight","base":60,"coeff":1,"stat":"mind"},"venom|stone":{"id":"petrify","base":35,"coeff":0.6,"stat":"vitality"},"venom|wind":{"id":"miasma","base":30,"coeff":0.5,"stat":"mind"},"storm|stone":{"id":"seismic_pulse","base":55,"coeff":0.9,"stat":"power"},"storm|wind":{"id":"tempest","base":50,"coeff":0.8,"stat":"agility"},"stone|wind":{"id":"erosion","base":20,"coeff":0.4,"stat":"vitality"},"dark|flame":{"id":"hellfire","base":65,"coeff":1.1,"stat":"power"},"dark|frost":{"id":"dread","base":40,"coeff":0.7,"stat":"vitality"},"dark|water":{"id":"drown","base":45,"coeff":0.8,"stat":"vitality"},"dark|venom":{"id":"wither","base":50,"coeff":0.9,"stat":"mind"},"dark|storm":{"id":"hex","base":60,"coeff":1,"stat":"mind"},"dark|stone":{"id":"shackle","base":55,"coeff":0.9,"stat":"power"},"dark|wind":{"id":"haunt","base":35,"coeff":0.6,"stat":"agility"},"light|flame":{"id":"radiant_fire","base":50,"coeff":0.8,"stat":"mind"},"light|frost":{"id":"purify","base":40,"coeff":0.7,"stat":"vitality"},"light|water":{"id":"baptism","base":60,"coeff":1,"stat":"vitality"},"light|venom":{"id":"cleansing_bloom","base":45,"coeff":0.7,"stat":"vitality"},"light|storm":{"id":"divine_strike","base":90,"coeff":1.4,"stat":"mind"},"light|stone":{"id":"consecrate","base":35,"coeff":0.6,"stat":"vitality"},"light|wind":{"id":"salvation","base":55,"coeff":0.9,"stat":"mind"},"dark|light":{"id":"eclipse","base":120,"coeff":1.8,"stat":"vitality"}};

export const COLLISION_BURST_CAP = 3.2;   // GDD §22 INV-16

/* ═══ v2.3.2199: ELEMENTAL SCALING GETS A LIVE STAT AGAIN ═══
 *
 * Every formula in this module prices off LEGACY T1 stats — the power
 * snapshot in applyElementStatus, the per-collision `stat` column above.
 * prog3 retired those stats but left them stored for rollback, so a
 * migrated veteran's burns ride a frozen fossil value and a
 * fresh-created character's ride 0.  Elemental damage was the one
 * combat system no spendable point could touch.
 *
 * This resolver is the single seam: the allocated BODY stat `elem`
 * (+1 effective power per point, cap 75) substitutes for WHATEVER
 * legacy stat a formula asks for, so burn 5+P×0.3, root 3+P×0.15,
 * thorn 4+P×0.25 and collision base+P×coeff all scale from it with
 * zero change to the formulas themselves.  Legacy (non-prog3) players
 * keep the byte-identical old read.
 *
 * KNOWN, ANNOUNCED REGRESSION for veterans: their fossil T1 stats stop
 * feeding elemental damage the moment this ships — deliberately, since
 * a value nobody can raise or lower is not a stat — so their elemental
 * output DROPS until they invest in `elem` (the 3-points retro grant
 * in the same release hands them the points to do it).
 *
 * Anticheat posture: `elem` is server-owned and spend-gated like every
 * prog3 allocation, DoT/collision damage is minted server-side, and
 * COLLISION_BURST_CAP still binds (raw includes the stat term).  No
 * ceiling work needed. */
import { PROG3, prog3StatValue } from './prog3.js'; // v2.3.2680: + the curve/edge reader
/* v2.3.2512: `cat` — WHICH WEAPON's elemental power.  Elemental power moved
   from one global BODY channel to a per-combat-type ATK channel (owner's own
   split: attack power belongs to the type that produces it), so every reader
   must now say which type is swinging.  The callers pass the slot the SERVER
   resolved (_effSlot / the burst's own slot), never the client's claim.
   An unrecognised or missing cat falls back to 'sword', matching _wpnCat and
   _computeAttackDamage's own slot resolution — a reader that forgot to say
   loses the bonus rather than reading someone else's lane. */
/* v2.3.2680: elemental power is on the CURVE (max 120, k 10: 5 points = 40
   power, where +1/pt gave 5) and takes the EDGE against `monsterLevel`, the
   level of the monster the status or collision lands on — omitted, edge 1.
   The power SNAPSHOT a status takes here therefore already carries the edge
   of the monster it is on, so burn/root/thorn ticks need no further change. */
export function elemAttackStat(ps, legacyStatName, cat, monsterLevel) {
  if (ps && ps.prog3) {
    const c = (cat === 'bow' || cat === 'staff') ? cat : 'sword';
    return PROG3.ATK.elem.max * prog3StatValue(ps, 'elem', c, monsterLevel);
  }
  return (ps && ps[legacyStatName]) || 0;
}
const RESONANCE_WINDOW_RATIO = 0.25;      // mirrors gameSystems.js §5.7
const RESONANCE_BONUS_BASE = 0.10;
const RESONANCE_BONUS_PEAK = 0.30;

export function getEffectiveness(attackElem, targetElem) {
  if (!attackElem || !targetElem || attackElem === targetElem) return 1.0;
  if ((attackElem === 'dark' && targetElem === 'light') || (attackElem === 'light' && targetElem === 'dark')) return 1.25;
  for (const [strong, weak] of EFFECTIVENESS) {
    if (attackElem === strong && targetElem === weak) return 1.25;
    if (attackElem === weak && targetElem === strong) return 0.75;
  }
  return 1.0;
}

/* ═══ v2.3.3517: EVERY GEM PULLS ITS WEIGHT (docs/GEM-PLAN.md, Phase 4) ═══
 * The owner's decisions 13 and 14, "All of that sounds good" (2026-10-20).
 * Until now two of the eight gems did nothing a player could see beyond
 * setting up a collision -- soak and shock were combo starters only -- and
 * the "UP" a hit showed over a monster its element beats was a word, the
 * damage unchanged (only a collision read getEffectiveness).
 *
 * UP.  A hit carrying an element that BEATS the monster's (the wheel above)
 * lands UP.MULT harder: the gem's own hit (combat.js _handleMonsterDamage)
 * and the Element Burst (burst.js).  No penalty the other way -- a gem that
 * loses the matchup hits as hard as no gem, and the phone's "DN" goes.
 * Applied where FRACTURE is, after the attacker's ceiling: like fracture it
 * is the worker's own fact about the TARGET (its own copy of the gem against
 * the monster's element), nothing a claim can raise, so the ceiling that
 * bounds the attacker's roll does not move.  A collision keeps its own
 * effectiveness (resolveElementCollision, 0.75 to 1.25), as before.
 *
 * SOAK.  A soaked monster's blows land SOAK_HIT.MULT as hard: every blow it
 * delivers itself (hits.js, the door's `soak` column), its storm arcs
 * included; not a burn or poison it left on you, nor ground it set alight.
 *
 * SHOCK.  A hit on a monster that was already shocked SPARKS to the nearest
 * other monster within SHOCK_SPARK.R, for SHOCK_SPARK.PCT of the hit (combat.js
 * _shockSpark): one monster, no chain, the hitter's damage and credit.
 *
 * Kill switches: `elemup`, `soakhit`, `shockspark` -- each `false` in the
 * live flags puts its part back as it was (combat.js). */
export const ELEM_UP = Object.freeze({ MULT: 1.25 });
export const SOAK_HIT = Object.freeze({ MULT: 0.8 });
export const SHOCK_SPARK = Object.freeze({ R: 150, PCT: 0.25 });

/* What a hit of `attackElem` lands for on a monster of `targetElem`: UP.MULT
   when it wins the matchup, else 1 -- never less (decision 14). */
export function elementUpMult(attackElem, targetElem) {
  return getEffectiveness(attackElem, targetElem) > 1 ? ELEM_UP.MULT : 1;
}

/* How hard a monster's own blow lands while it is soaked. */
export function soakHitMult(m) {
  return (m && m.statuses && m.statuses.soak) ? SOAK_HIT.MULT : 1;
}

export function lookupCollision(a, b) {
  return COLLISION_TABLE[a + '|' + b] || COLLISION_TABLE[b + '|' + a] || null;
}

/* Apply an element's status to a monster.  Mirrors applyStatus in
 * gameSystems.js.  Stores a POWER SNAPSHOT from the attacker at
 * application time so DoT ticks are priced off server-tracked stats, not
 * a client claim.
 * v2.3.1136: durMult -- the Attunement channel's duration bonus, the
 * successor to the retired Influence bonus (BALANCE-PLAN §8).  The caller
 * derives it from SERVER-clamped weaponSpecs so it's bounded (<=2.00
 * since the v2.3.1343 kid-simple reprice: +1%/pt at the 100-pt cap)
 * even for forged clients.  Scales the initial duration AND maxDur;
 * refreshes cap at the instance's own scaled maxDur. */
export function applyElementStatus(m, element, sourceId, power, now, durMult) {
  const statusId = ELEMENT_STATUS[element];
  const def = statusId && STATUS_DEFS[statusId];
  if (!def) return false;
  const dm = durMult || 1;
  if (!m.statuses) m.statuses = Object.create(null);  /* v2.3.1569: null-proto per CLAUDE.md rule 4 — status ids come from a
     closed server table so there is no live exploit here, but the map is
     id-keyed and the rule exists because that assumption keeps breaking. */
  const existing = m.statuses[statusId];
  if (existing) {
    if (def.refresh > 0) existing.remaining = Math.min(existing.remaining + def.refresh, existing.maxDur || def.maxDur);
    else existing.remaining = def.dur * dm;
    if (def.maxStacks && existing.stacks < def.maxStacks) existing.stacks++;
    existing.sourceId = sourceId;
    existing.power = power || 0;
    startElementHold(m, statusId, now);   /* v2.3.3513: the hold rule (below) */
    return true;
  }
  m.statuses[statusId] = {
    id: statusId, element, remaining: def.dur * dm, maxDur: (def.maxDur || def.dur) * dm,
    stacks: 1, sourceId, power: power || 0, appliedAt: now, lastTick: now,
  };
  startElementHold(m, statusId, now);   /* v2.3.3513: the hold rule (below) */
  return true;
}

/* ═══ v2.3.3513: THE HOLD RULE FOR MONSTERS ═══
 * The owner's decision 8 (docs/GEM-PLAN.md): "Stopped for 1.5 s, then 3 s
 * before another stop; bosses half".  A freeze or a root stopped a monster
 * for as long as the status lasted, and every hit topped the status up
 * (STATUS_DEFS refresh) -- nothing made it immune, not even a boss.  It hardly
 * showed while a weapon's gem was the phone's alone and gone at the next
 * join; with real gems (weapongem.js) a frost or venom weapon would keep
 * everything it hit standing still, and nothing could hit back.
 *
 * Now a freeze or a root that LANDS starts a hold: the monster is stopped for
 * HOLD.MS (half for a dungeon boss, `_dungeonBoss`), and then cannot be
 * stopped again for HOLD.IMMUNE_MS after it.  A landing inside the hold or
 * the immune time starts nothing.  The STATUS keeps its own length and does
 * what it always did beyond the stop: a frozen monster past its hold is
 * CHILLED, at HOLD.CHILL_MULT of its speed (it can attack), and a rooted one
 * walks freely while the root's poison keeps ticking (tickElementStatuses).
 * The same shape as a player's own hold (pvpextras.js _pvpHold: DAZE 0.5 s
 * then 2.5 s, STUCK 0.7 s then 2 s, monsterstatus.js), with a monster's
 * numbers.  Attunement (durMult) lengthens the status, never the hold.
 *
 * Stamped on any holder applyElementStatus is handed; only a monster's are
 * read (elementMoveMult, from _tickMonsters).  A player hit by a weapon is
 * held by the player's own rule, as before.  A respawn clears both stamps
 * (index.js, beside the statuses).  `monsterhold: false` in liveflags puts the
 * old lock back (weapongem.js _monsterHoldOff, read by _tickMonsters). */
export const HOLD = Object.freeze({
  MS: 1500,
  IMMUNE_MS: 3000,
  BOSS_K: 0.5,
  CHILL_MULT: 0.5,
});

/* Start a hold for a freeze or root that just landed, unless the monster is
   held or immune.  Returns the ms it holds, or 0. */
export function startElementHold(m, statusId, now) {
  if (statusId !== 'freeze' && statusId !== 'root') return 0;
  if (!m || typeof m !== 'object') return 0;
  const t = typeof now === 'number' ? now : Date.now();
  if (t < (m._holdImmuneUntil || 0)) return 0;
  const ms = Math.round(HOLD.MS * (m._dungeonBoss ? HOLD.BOSS_K : 1));
  m._holdUntil = t + ms;
  m._holdImmuneUntil = t + ms + HOLD.IMMUNE_MS;
  return ms;
}

/* v2.3.1139 (item I): CC movement multiplier for the server AI.
 * Mirrors the client's authoritative constants (monsterCombat.js
 * moveMult block): freeze or root -> full stop (0), slow -> x0.4,
 * else x1.  The client also gates ATTACKS on moveMult > 0 -- the
 * caller (_tickMonsters) mirrors that.  No influence duration
 * scaling (retired stat).
 * v2.3.3513: `hold` -- the hold rule (above): freeze or root stop the monster
 * only while its hold lasts (0); after it a freeze CHILLS (HOLD.CHILL_MULT)
 * and a root lets it walk; slow is 0.4 either way, the stronger of the two
 * when both.  A caller that does not say gets the old lock, the
 * `monsterhold: false` behaviour -- _tickMonsters, the one caller, says. */
export function elementMoveMult(m, now, hold) {
  if (!m || !m.statuses) return 1;
  const st = m.statuses;
  if (st.freeze || st.root) {
    if (!hold) return 0;
    const t = typeof now === 'number' ? now : Date.now();
    if (t < (m._holdUntil || 0)) return 0;
  }
  let k = 1;
  if (st.freeze) k = HOLD.CHILL_MULT;
  if (st.slow) k = Math.min(k, 0.4);
  return k;
}

/* ═══ v2.3.1734: FRACTURE STOPS BEING A DECORATION ═══
 *
 * Stone's status has existed in both status tables since the elemental
 * system was written, with `maxStacks: 5` reserved for it and nothing
 * anywhere that read either field.  applyElementStatus has always
 * counted the stacks; no code has ever spent them.  So a stone weapon
 * applied an invisible nothing, and a player who read the codex entry
 * and built for it got a strictly worse weapon than one that rolled
 * flame.  COMBAT-OVERHAUL-PLAN PR 6 names it as one of three dormant
 * statuses to activate; this is the one that shipped (see the PR body
 * for why shock and the rest did not — a mechanic without a visual is
 * the same bug in a different hat).
 *
 * "Armor shred" against a monster that has no armor stat means one
 * thing only: it takes more damage.  +6% per stack, five stacks, so a
 * fully-fractured target takes +30% — worth building around, not worth
 * dropping everything else for.  Multiplicative on the FINAL number
 * because the alternative (folding it into the attacker's roll) would
 * have put a target-side property inside the attacker's anticheat
 * ceiling, where it does not belong.
 *
 * VISIBILITY (the reason this is safe to ship): the client's status pip
 * row above the monster grows with the stack count and the ambient
 * stone particles are already wired, so five stacks LOOK like five
 * stacks — and the damage numbers going up is the confirmation.  A
 * debuff you cannot see is not a mechanic. */
export const FRACTURE_DMG_PER_STACK = 0.06;

export function fractureDmgMult(m) {
  const st = m && m.statuses && m.statuses.fracture;
  if (!st) return 1;
  const def = STATUS_DEFS.fracture;
  const stacks = Math.max(0, Math.min(def.maxStacks, Math.floor(st.stacks || 0)));
  return 1 + stacks * FRACTURE_DMG_PER_STACK;
}

/* ═══ v2.3.3264: THORN'S RECOIL, ONE NUMBER ═══
 * What a target carrying Flora's thorn takes each time it attacks: 4 +
 * power x 0.25 off the snapshot the status took.  A monster (index.js, the
 * moment it commits to an attack) and a player (pvpextras.js
 * _pvpThornRecoil, the moment they do) read it here, so the two cannot drift. */
export function thornRecoil(st) {
  return Math.round(4 + ((st && st.power) || 0) * 0.25);
}

/* Tick a monster's statuses.  dtSec since the last call; returns DoT
 * damage events [{dmg, sourceId, statusId}] for the caller to apply
 * through the normal damage/credit path.  Mirrors tickStatuses burn/root
 * formulas ((5 + power*0.3) / (3 + power*0.15)); emMult omitted (retired
 * stat, x1.0). */
export function tickElementStatuses(m, dtSec, now) {
  if (!m.statuses) return [];
  const events = [];
  for (const [id, st] of Object.entries(m.statuses)) {
    st.remaining -= dtSec;
    const def = STATUS_DEFS[id];
    if (def && def.tick && now - st.lastTick >= def.tick * 1000) {
      st.lastTick = now;
      let dot = 0;
      if (id === 'burn') dot = 5 + (st.power || 0) * 0.3;
      if (id === 'root') dot = 3 + (st.power || 0) * 0.15;
      if (dot > 0) events.push({ dmg: Math.round(dot), sourceId: st.sourceId, statusId: id });
    }
    if (st.remaining <= 0) delete m.statuses[id];
  }
  return events;
}

/* Detonate a collision when `triggerElement` hits a monster carrying the
 * OLDEST different-element status (client order: the trigger's own status
 * is applied first by the caller, mirror of monsterCombat.js:1478/1548).
 * Returns null or {id, dmg, setupElement, consumed}.  Damage =
 * (base + serverStat*coeff) x resonance x volatile x effectiveness,
 * clamped to COLLISION_BURST_CAP x raw. */
/* v2.3.2512: `cat` rides through to elemAttackStat — a collision is priced
   off the elemental power of the weapon that TRIGGERED it. */
export function resolveElementCollision(m, triggerElement, attackerPs, isVolatile, now, cat) {
  if (!m.statuses || !triggerElement) return null;
  let setup = null;
  let oldest = Infinity;
  for (const st of Object.values(m.statuses)) {
    if (st.element && st.element !== triggerElement && st.appliedAt < oldest) {
      oldest = st.appliedAt; setup = st;
    }
  }
  if (!setup) return null;
  const collision = lookupCollision(setup.element, triggerElement);
  if (!collision) return null;
  const statValue = elemAttackStat(attackerPs, collision.stat, cat, m.level); // v2.3.2199: prog3 reads `elem`; v2.3.2512: per weapon; v2.3.2680: + edge
  const raw = collision.base + statValue * collision.coeff;
  let dmg = raw;
  let resonating = false;
  if (setup.maxDur > 0) {
    const windowSize = setup.maxDur * RESONANCE_WINDOW_RATIO;
    if (setup.remaining <= windowSize && windowSize > 0) {
      resonating = true; // v2.3.1139: drives the streak/mana restore
      const depth = Math.max(0, Math.min(1, (windowSize - setup.remaining) / windowSize));
      dmg *= 1 + (RESONANCE_BONUS_BASE + depth * (RESONANCE_BONUS_PEAK - RESONANCE_BONUS_BASE));
    }
  }
  if (isVolatile) dmg *= 1.30;
  if (m.element) dmg *= getEffectiveness(triggerElement, m.element);
  dmg = Math.min(dmg, raw * COLLISION_BURST_CAP);
  const consumed = setup.id;
  delete m.statuses[consumed];
  return { id: collision.id, dmg: Math.round(dmg), setupElement: setup.element, consumed, resonating };
}
