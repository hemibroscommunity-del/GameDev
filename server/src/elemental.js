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
    return true;
  }
  m.statuses[statusId] = {
    id: statusId, element, remaining: def.dur * dm, maxDur: (def.maxDur || def.dur) * dm,
    stacks: 1, sourceId, power: power || 0, appliedAt: now, lastTick: now,
  };
  return true;
}

/* v2.3.1139 (item I): CC movement multiplier for the server AI.
 * Mirrors the client's authoritative constants (monsterCombat.js
 * moveMult block): freeze or root -> full stop (0), slow -> x0.4,
 * else x1.  The client also gates ATTACKS on moveMult > 0 -- the
 * caller (_tickMonsters) mirrors that.  No influence duration
 * scaling (retired stat). */
export function elementMoveMult(m) {
  if (!m || !m.statuses) return 1;
  if (m.statuses.freeze || m.statuses.root) return 0;
  if (m.statuses.slow) return 0.4;
  return 1;
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
export function resolveElementCollision(m, triggerElement, attackerPs, isVolatile, now) {
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
  const statValue = (attackerPs && attackerPs[collision.stat]) || 0;
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
