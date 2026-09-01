/* ═══ v2.3.1152: RPG SAVE-FORMAT MIGRATION REGISTRY (spec:
 * docs/specs/migrations.md) ═══
 *
 * The rpg blob's shape has already changed several times (lifeSkills
 * corruption heal v2.3.769, leather-armor removal v2.3.249, the T1/T2
 * stat redesign, weapon-skill persistence v2.3.1021), and each change
 * shipped as its own ad-hoc heal-on-load branch scattered through
 * index.js.  Ad-hoc heals have two failure modes this registry closes:
 *   - they run on EVERY load forever (no way to know a blob is clean),
 *   - nothing records which fixes a blob has been through, so a
 *     restored snapshot (admin rail) or an escrow-path re-put can
 *     resurrect a shape every live path stopped defending against.
 *
 * Design:
 *   - `_v` on the blob = the highest migration version that has
 *     COMPLETED for it.  Absent/0 = legacy blob, run everything.
 *   - `runRpgMigrations(blob)` runs pending migrations IN ORDER,
 *     stamping `_v` after each success.  FAIL-OPEN on throw: stop,
 *     do NOT stamp past the failure, return what succeeded — the blob
 *     stays playable with the old shape and the failed migration
 *     retries on the next load (after the bug is fixed).  Never throw
 *     out of here; a save that can't migrate must still load.
 *   - Migrations MUST be: small, idempotent (safe to re-run on a
 *     half-migrated blob — a crash can land between the put and the
 *     stamp), and partial-tolerant (any field may be missing; blobs
 *     from every historical version flow through).
 *   - RULE-1 EXCEPTION (ARCHITECTURE-HANDOFF): `_saveRpg` writes a
 *     fixed field list and drops everything else; `_v` is the ONE
 *     blessed extra field — _saveRpg stamps `_v: RPG_SCHEMA_VERSION`
 *     (the constant, never ps._v) because a blob written by current
 *     code IS current-shape by construction.
 *
 * Adding migration N+1 (the recipe, also in the spec):
 *   1. bump RPG_SCHEMA_VERSION to N+1;
 *   2. append { v: N+1, name, run } here — never reorder or renumber
 *      shipped entries;
 *   3. delete the live-path defense the migration replaces ONLY if no
 *      unmigrated writer remains (client bootstrap payloads are always
 *      unmigrated writers — their ingest defenses stay);
 *   4. add a case to test/migrations.test.mjs with a real legacy blob.
 */

import { t2ReplayFlat } from './data.js';
import { prog3FromLegacy, prog3SplitAtk, prog3GrantRetroPoints } from './prog3.js';

export const RPG_SCHEMA_VERSION = 14;

/* Pure version of the v2.3.769 heal (was GameRoom._healLifeSkills):
 * records bootstrapped from pre-fix clients carry lifeSkills with
 * ARRAYS object-spread into plain objects (pets: {0:..}) and null
 * into {} (activePet).  Exported separately because the client-join
 * bootstrap ingest must ALSO run it on fresh payloads — a pre-fix
 * client can re-corrupt a brand-new blob after the one-time migration
 * already ran (the boundary heal; see index.js bootstrap branch). */
export function healLifeSkills(blob) {
  const ls = blob && blob.lifeSkills;
  if (!ls || typeof ls !== 'object') return false;
  let changed = false;
  if (ls.pets && !Array.isArray(ls.pets) && typeof ls.pets === 'object') {
    ls.pets = Object.values(ls.pets);
    changed = true;
  }
  if (ls.activePet && typeof ls.activePet === 'object' && Object.keys(ls.activePet).length === 0) {
    ls.activePet = null;
    changed = true;
  }
  return changed;
}

/* v2.3.1158: the canonical pool formula, extracted from migration v7 so
 * the live stats_update path can apply it too.  One source of truth for
 * "unspent = max(0, min(200, 2 × level-or-stat) − Σ spec)":
 *   - migration v7 runs it once per stored blob at upgrade time;
 *   - _handleStatsUpdate (index.js) re-runs it whenever a spec/skill
 *     field arrives, so a mid-session truncation (grid budget clamp or
 *     the 1000-point combat ceiling) credits the clipped points back to
 *     the pools IMMEDIATELY instead of waiting for the next reconnect —
 *     the "pools display stale after a clamped spend" playtest bug.
 * Mutates blob's pool fields in place; returns true when any changed. */
export function computeCanonicalPools(blob) {
  if (!blob || typeof blob !== 'object') return false;
  let changed = false;
  const sum = (spec, keys) => keys.reduce((a, k) => a + ((spec && typeof spec[k] === 'number') ? Math.max(0, Math.min(100, Math.floor(spec[k]))) : 0), 0);
  const pool = (level, spent) => Math.max(0, Math.min(200, 2 * Math.max(0, Math.floor(level || 0))) - spent);
  const WCH = {
    sword: ['edge', 'precision', 'executioner', 'tempo', 'cleave'],
    bow:   ['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot'],
    staff: ['spellPower', 'overload', 'detonation', 'attunement', 'focus'],
  };
  for (const cat of Object.keys(WCH)) {
    const level = blob.weaponSkills && blob.weaponSkills[cat] && blob.weaponSkills[cat].level;
    const next = pool(level, sum(blob.weaponSpecs && blob.weaponSpecs[cat], WCH[cat]));
    if (!blob.weaponUnspent || typeof blob.weaponUnspent !== 'object') blob.weaponUnspent = {};
    if (blob.weaponUnspent[cat] !== next) { blob.weaponUnspent[cat] = next; changed = true; }
  }
  const defNext = pool(blob.defenseSkill && blob.defenseSkill.level,
    sum(blob.defenseSpec, ['bulwark', 'ironskin', 'thorns', 'secondwind', 'poise']));
  if (blob.defenseUnspent !== defNext) { blob.defenseUnspent = defNext; changed = true; }
  /* v2.3.1342: 'laststand' was missing from this list since the channel
     shipped (v2.3.1160) — Last Stand spends were never counted as
     "spent", so this recompute refunded them into hpUnspent every pass:
     free points and a client/server pool desync.  Found during the
     level-is-build design audit. */
  const hpNext = pool(blob.vitality, sum(blob.hpSpec, ['vigor', 'recovery', 'lifeblood', 'resilience', 'laststand']));
  if (blob.hpUnspent !== hpNext) { blob.hpUnspent = hpNext; changed = true; }
  const enNext = pool(blob.endurance, sum(blob.enduranceSpec, ['stamina', 'conditioning', 'swiftness', 'evasion', 'reflexes']));
  if (blob.enduranceUnspent !== enNext) { blob.enduranceUnspent = enNext; changed = true; }
  return changed;
}

/* v2.3.1342: total T2 points PLACED across all six grids — the new
 * combat level (owner directive 2026-07-16: "each tier 2 point should
 * raise your combat level", cap 1000 = COMBAT_BUILD_CEILING).  Pure and
 * blob-shaped so migration v8, _recomputeMaxes (grids.js), and tests
 * share ONE summation; per-channel [0,100] clamp matches the
 * sanitizers.  Read-only — never reuse _clampBuildTotal (it mutates). */
const BUILD_KEYS = {
  weapon: {
    sword: ['edge', 'precision', 'executioner', 'tempo', 'cleave'],
    bow:   ['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot'],
    staff: ['spellPower', 'overload', 'detonation', 'attunement', 'focus'],
  },
  defense:   ['bulwark', 'ironskin', 'thorns', 'secondwind', 'poise'],
  hp:        ['vigor', 'recovery', 'lifeblood', 'resilience', 'laststand'],
  endurance: ['stamina', 'conditioning', 'swiftness', 'evasion', 'reflexes'],
};
export function computeBuildTotal(blob) {
  if (!blob || typeof blob !== 'object') return 0;
  const sum = (spec, keys) => keys.reduce((a, k) => a + ((spec && typeof spec[k] === 'number') ? Math.max(0, Math.min(100, Math.floor(spec[k]))) : 0), 0);
  let total = 0;
  for (const cat of Object.keys(BUILD_KEYS.weapon)) {
    total += sum(blob.weaponSpecs && blob.weaponSpecs[cat], BUILD_KEYS.weapon[cat]);
  }
  total += sum(blob.defenseSpec, BUILD_KEYS.defense);
  total += sum(blob.hpSpec, BUILD_KEYS.hp);
  total += sum(blob.enduranceSpec, BUILD_KEYS.endurance);
  return total;
}

export const MIGRATIONS = [
  {
    v: 1,
    name: 'heal-lifeskills',
    run: healLifeSkills,
  },
  {
    v: 2,
    name: 'strip-leather-armor',
    // v2.3.249 removed Leather Armor from the game; saves that predate
    // the removal still carry it.  Was an every-load strip in the join
    // handler (now deleted); the join-payload bootstrap keeps its own
    // strip because client payloads are unmigrated by definition.
    run(blob) {
      if (blob && blob.armor && blob.armor.name === 'Leather Armor') {
        blob.armor = null;
        return true;
      }
      return false;
    },
  },
  {
    v: 3,
    name: 'refund-damage-channels',
    // v2.3.1153: the damage channels (edge/drawPower/spellPower) were
    // repriced from flat +1/pt pre-tierMult (~+725% DPS at 99 pts
    // mid-band, the BALANCE-PLAN §4 outlier) to ×(1 + pts×0.005) —
    // roughly an 85% value cut for invested builds.  Owner decision
    // (2026-07-03): refund, don't silently reprice — points move back
    // to weaponUnspent and players re-choose at the honest price.
    // NOT a shape repair: a pre-fix client's join payload re-seeding
    // channel points is a valid new-price spend, so the bootstrap
    // ingest keeps no boundary heal for this (the refund is a
    // courtesy, not a corruption fix).  Idempotent: second run finds
    // the channel at 0 and does nothing.
    run(blob) {
      const K = { sword: 'edge', bow: 'drawPower', staff: 'spellPower' };
      if (!blob || !blob.weaponSpecs || typeof blob.weaponSpecs !== 'object') return false;
      let changed = false;
      for (const [cat, key] of Object.entries(K)) {
        const spec = blob.weaponSpecs[cat];
        if (!spec || typeof spec[key] !== 'number' || spec[key] === 0) continue;
        // Same [0,99] clamp as _sanitizeWeaponSpecs so a corrupt blob
        // can't refund more than a legit spend (unspent pool cap 999
        // mirrors _sanitizeWeaponUnspent).
        const pts = Math.max(0, Math.min(99, Math.floor(spec[key])));
        if (pts > 0) {
          if (!blob.weaponUnspent || typeof blob.weaponUnspent !== 'object') blob.weaponUnspent = {};
          blob.weaponUnspent[cat] = Math.min(999, (blob.weaponUnspent[cat] || 0) + pts);
        }
        spec[key] = 0;
        changed = true;
      }
      return changed;
    },
  },
  {
    v: 4,
    name: 'backfill-grid-points',
    // v2.3.1154: the HP/Endurance channel grids ship AFTER vitality/
    // endurance have been leveling for months, so existing characters
    // get their grid points retroactively: 1 point per stat level
    // (WEAPON_PTS_PER_LEVEL parity), minus any points a half-migrated
    // blob already shows as spent.  Only fills ABSENT pools (typeof
    // check) so it is idempotent and never resets a live pool to the
    // formula value.  The join bootstrap runs the same computation on
    // fresh client payloads (the boundary heal).
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      const clampPt = (v) => Math.max(0, Math.min(50, Math.floor(v || 0)));
      const sum = (o, keys) => keys.reduce((a, k) => a + ((o && typeof o[k] === 'number') ? clampPt(o[k]) : 0), 0);
      const HPK = ['vigor', 'recovery', 'lifeblood', 'resilience'];
      const ENK = ['stamina', 'conditioning', 'swiftness', 'evasion', 'reflexes'];
      let changed = false;
      if (typeof blob.hpUnspent !== 'number') {
        blob.hpUnspent = Math.max(0, Math.floor(blob.vitality || 0) - sum(blob.hpSpec, HPK));
        changed = true;
      }
      if (typeof blob.enduranceUnspent !== 'number') {
        blob.enduranceUnspent = Math.max(0, Math.floor(blob.endurance || 0) - sum(blob.enduranceSpec, ENK));
        changed = true;
      }
      return changed;
    },
  },
  {
    v: 5,
    name: 'strip-retired-t2',
    // v2.3.1155: the T2-stat cleanup, shipped AS the coordinated change
    // migrations.md §"Why v3 was not shipped" demanded — this entry
    // lands in the SAME version as the deletion of every unmigrated
    // writer: the join RAW_STATS fallback (T1-only now), the
    // stats_update T2 clamp (ignores the keys), the _saveRpg field
    // list, and the last live formula reads (restoration -> the HP/
    // Endurance grids' Recovery/Conditioning; influence's vendor
    // discount retired outright, owner decision 2026-07-03).  All five
    // have been pinned 0 for every live player since v2.3.910, so this
    // deletes plumbing, not balance.  A partial ship of this list
    // re-injects client-controlled values on reconnect — never split.
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      let changed = false;
      for (const k of ['ferocity', 'elementalMastery', 'fortification', 'restoration', 'influence']) {
        if (k in blob) { delete blob[k]; changed = true; }
      }
      return changed;
    },
  },
  {
    v: 6,
    name: 'uniform-t2-caps',
    // v2.3.1156: every T2 channel now caps at 100 (owner design
    // 2026-07-04 — one allocation max, every cap-value landing at
    // exactly 100 points).  Two rebalances land with it:
    //   - the formerly-50-cap grids (defense/HP/endurance) halved their
    //     per-point coefficients, so stored points are DOUBLED here —
    //     exactly power-neutral for every player;
    //   - the materially-repriced weapon channels (crit trio 0.5->0.3%/pt,
    //     tempo, cleave, piercing breakpoints) are REFUNDED to
    //     weaponUnspent, the v3 refund-damage-channels pattern.
    // RE-RUN SAFETY: the doubling is not re-run idempotent in isolation,
    // but re-runs are unreachable under the registry's machinery — the
    // mutation and the _v stamp land in ONE atomic storage put
    // (runRpgMigrations stamps in-memory; _loadRpg re-puts once), and
    // post-migration _saveRpg snapshots carry _v >= 6, so even the
    // admin-restore path can only replay this on a genuinely pre-v6
    // blob.  The client twin (migrateUniformT2 in gameSystems.js) gates
    // on the rpg._t2uniform flag for its localStorage copy.
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      let changed = false;
      const CAP = 100;
      const dbl = (spec, keys) => {
        if (!spec || typeof spec !== 'object') return;
        for (const k of keys) {
          if (typeof spec[k] === 'number' && spec[k] > 0) {
            spec[k] = Math.min(CAP, Math.floor(spec[k]) * 2);
            changed = true;
          }
        }
      };
      dbl(blob.defenseSpec, ['bulwark', 'ironskin', 'thorns', 'secondwind', 'poise']);
      dbl(blob.hpSpec, ['vigor', 'recovery', 'lifeblood', 'resilience']);
      dbl(blob.enduranceSpec, ['stamina', 'conditioning', 'swiftness', 'evasion', 'reflexes']);
      const REFUND = { sword: ['precision', 'tempo', 'cleave'], bow: ['marksmanship', 'piercing'], staff: ['overload'] };
      for (const [cat, keys] of Object.entries(REFUND)) {
        const spec = blob.weaponSpecs && blob.weaponSpecs[cat];
        if (!spec) continue;
        for (const k of keys) {
          if (typeof spec[k] !== 'number' || spec[k] === 0) continue;
          const pts = Math.max(0, Math.min(CAP, Math.floor(spec[k])));
          if (pts > 0) {
            if (!blob.weaponUnspent || typeof blob.weaponUnspent !== 'object') blob.weaponUnspent = {};
            blob.weaponUnspent[cat] = Math.min(999, (blob.weaponUnspent[cat] || 0) + pts);
          }
          spec[k] = 0;
          changed = true;
        }
      }
      return changed;
    },
  },
  {
    v: 7,
    name: 'uniform-t2-pools',
    // v2.3.1157: the 1000-point economy doubles the earn rate to 2
    // points per skill level (200 lifetime per skill), so every pool is
    // RECOMPUTED to the canonical earned-minus-spent at the new rate:
    //   unspent = max(0, min(200, 2 × level-or-stat) − Σ spec)
    // This runs AFTER v6 (doubled grid points, refunded weapon
    // channels), so "spent" is already on the new scale.  Idempotent by
    // construction — the recompute converges on re-run.  Existing
    // characters only ever GAIN here: the old rate was 1/level, so the
    // recomputed pool is at least as large as anything they could have
    // held.  (Spending stays bounded by the per-grid budget and the
    // 1000-point combat ceiling, both enforced live in index.js.)
    // v2.3.1158: formula extracted to computeCanonicalPools (above) so
    // the live stats_update path shares it; this entry just delegates.
    run: computeCanonicalPools,
  },
  {
    v: 8,
    name: 'level-is-build',
    // v2.3.1342: combat level = total T2 points PLACED, cap 1000 (owner
    // directive 2026-07-16 — every point spent is +1 level, so every
    // level-up is a real power gain; max level 1000).  Replaces the
    // v2.3.910 stat-sum derivation (sum of six skill levels, cap 500).
    // Recomputed here once per stored blob so saves converge on load
    // without waiting for a stats_update; _recomputeMaxes re-derives
    // the same formula live.  Levels can DROP for characters with
    // skill levels but unspent points — accepted (no live players;
    // celebration loops only fire on increases).  Idempotent: the
    // recompute converges.  Runs AFTER the v8-adjacent laststand pool
    // fix in computeCanonicalPools so "placed" counts every channel.
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      // 1 + placed (capped 1000) — mirrors _recomputeMaxes: fresh
      // characters are level 1 and the first point is +1 like every
      // other (level = points alone made point #1 a 1 -> 1 dud).
      const next = Math.min(1000, 1 + computeBuildTotal(blob));
      if (blob.level !== next) { blob.level = next; return true; }
      return false;
    },
  },
  {
    v: 9,
    name: 'bench-locked-t2',
    // v2.3.1451: BENCH-LOCKED T2 PRICING (owner directive 2026-07-24 —
    // "make the strength of that skill relative to current level
    // monsters... with decaying power carried to the next level up").
    // The 10 flat channels stop reading t2Accel(pts, unit) and read a
    // server-owned per-channel accumulator (blob.t2Flat) instead; a
    // point banks its value AT SPEND TIME, sized to the benchmark
    // monster of the buyer's level (t2PointValue, data.js).  Existing
    // characters never chose under that rule, so their spent points
    // are REPLAYED at benchmark: t2ReplayFlat assumes each channel's
    // points were bought uniformly interleaved across the character's
    // whole purchase history (owner-approved migration choice —
    // nobody loses points, no player action needed).  Absent-only
    // fill (the v4 idempotency pattern): a blob that already carries
    // t2Flat was priced live and must NEVER be re-replayed — the
    // replay is an estimate, the live accumulator is the truth.
    // The join bootstrap runs the same computation on fresh client
    // payloads (the boundary heal — payloads never carry a trusted
    // t2Flat; see the bootstrap branch in join/index.js).
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      if (blob.t2Flat && typeof blob.t2Flat === 'object') return false;
      blob.t2Flat = t2ReplayFlat(blob);
      return true;
    },
  },
  {
    v: 10,
    name: 'prog3-respec',
    // v2.3.1659: THE COMBAT REBUILD RESPEC (docs/PROGRESSION-REDESIGN.md,
    // owner-approved 2026-08-13).  Every stored character gets the new
    // trained-skill track: prog3FromLegacy (prog3.js) recomputes from
    // carried XP — trained level = legacy weapon-skill level + 1 (same
    // curve, 1-based now), leftover xp carried, allocation pool = Σ
    // legacy weapon levels + legacy defense level, all seven allocated
    // stats zeroed (the full respec: players re-choose their build).
    // Absent-only fill (the v4/v9 idempotency pattern): a blob already
    // carrying prog3 was respecced once and its live trained levels are
    // the truth — never re-derive from the frozen legacy fields.
    // The legacy fields themselves (weaponSkills/weaponSpecs/defense*/
    // hpSpec/enduranceSpec/t2Flat/T1 stats) are deliberately KEPT: the
    // rollback path needs them, and every prog3 read of them is gated
    // off at the choke points instead (_t2Flat and the point-count
    // helpers return neutral for prog3 players — that IS the doc's
    // "ratchet zeroed" invariant, enforced at the single read site so a
    // rollback recovers the real accumulator instead of an estimate).
    // The join bootstrap runs prog3FromLegacy on first-connect payloads
    // (the boundary heal — join.js).  Cleanup PR retires the legacy
    // fields after soak (§10 PR-6).
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      if (blob.prog3 && typeof blob.prog3 === 'object') return false;
      blob.prog3 = prog3FromLegacy(blob);
      return true;
    },
  },
  {
    v: 11,
    name: 'prog3-per-type-offense',
    /* v2.3.1668 (owner: "the attack power ... are specific to the combat
       type").  v10 gave every character ONE global set of seven allocated
       stats.  Offense (crit / critDmg / aspd) is now allocated per combat
       type, so a v10-shaped blob has to be folded into the BODY/ATK split.

       prog3SplitAtk REFUNDS the three offense stats to the pool rather
       than copying them into each type: copying would triple a player's
       investment for free, and choosing one type to receive them would be
       guessing on their behalf.  Refunding hands the choice back, which is
       the entire point of the change.  Body stats (def/hp/dodge/stam) are
       untouched — they did not move.

       Absent-only by construction: prog3SplitAtk returns immediately when
       `atk` already exists, so a re-run cannot double-refund.  A blob with
       no prog3 at all is left for v10 above to build (migrations run in
       order, so that has already happened by the time we get here). */
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      if (!blob.prog3 || typeof blob.prog3 !== 'object') return false;
      if (blob.prog3.atk && typeof blob.prog3.atk === 'object') return false;
      prog3SplitAtk(blob.prog3);
      return true;
    },
  },
  {
    v: 12,
    name: 'starter-weapons-named-for-their-metal',
    /* v2.3.1772 (owner: "rename bros sword, staff, and bow to the correct
       metals (copper great sword, pine bow, pine staff)").

       Only the NAMES were wrong — the grants have been copper/pine/pine since
       v2.3.1760/1763 — so this is a pure relabel and touches no stat.  Renaming
       the grant table alone would leave every existing player holding the old
       name forever while new players got the new one: the same item under two
       identities, which is the exact failure v2.3.1758 called out when copper
       replaced iron in the armour tiers.  So saved records are rewritten too,
       by the same by-exact-name rule.

       The TYPE is checked alongside the name so this can only ever hit the
       three starter weapons, and the rename is idempotent by construction: once
       renamed, the old name no longer matches.  Every weapon-bearing field on
       the blob is covered — the three equipped slots and the stash — because a
       player who stashed their bow and carried the sword must not end up with
       one renamed and one not. */
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      /* `wtype`, not `type`: the hardening suite extracts server-emitted event
         types by scanning for `type:` literals, and a weapon kind sitting in
         one reads to it as an unregistered emittable event. */
      const RENAME = {
        "Bro's Sword": { to: 'Copper Great Sword', wtype: 'greatsword' },
        "Bro's Bow":   { to: 'Pine Bow',           wtype: 'bow' },
        "Bro's Staff": { to: 'Pine Staff',         wtype: 'staff' },
      };
      let changed = false;
      const fix = (w) => {
        if (!w || typeof w !== 'object') return;
        const r = RENAME[w.name];
        if (!r || w.type !== r.wtype) return;
        w.name = r.to;
        changed = true;
      };
      fix(blob.weapon);
      fix(blob.rangedWeapon);
      fix(blob.staffWeapon);
      if (Array.isArray(blob.weaponStash)) for (const w of blob.weaponStash) fix(w);
      return changed;
    },
  },
  {
    v: 13,
    name: 'starter-shield-is-a-pine-shield',
    /* v2.3.1774 (owner: "change bro's shield to pine shield").  Same relabel,
       same reasoning as v12: renaming the grant alone would leave existing
       players holding "Bro's Shield" while new ones get the new name.

       Nothing but the name changes — `gearBase` stays 'wood', which is the
       BLACKSMITH_TIERS key the client reads for the shield's tier label and
       multiplier.  Guarded on that base so it can only ever hit the starter
       shield, and idempotent by construction. */
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      const sh = blob.shield;
      if (!sh || typeof sh !== 'object') return false;
      if (sh.name !== "Bro's Shield" || sh.gearBase !== 'wood') return false;
      sh.name = 'Pine Shield';
      return true;
    },
  },
  {
    v: 14,
    name: 'prog3-three-points-per-level',
    /* v2.3.2199 (owner: "each level up gives the character 3 points to
       spend instead of 1").  The mint moved to PROG3.POINTS_PER_LEVEL and
       this back-pays every stored character the difference — +2 per
       level-up already earned (level − 1 per skill, the v10 convention),
       stamped into poolBy per the earning skill — so a veteran holds
       exactly what a fresh character reaching the same levels would.
       The v10 defense-skill carry was a one-time bonus, not per-level
       minting, and is deliberately NOT tripled.

       Idempotent via the blob's `ppl` rate stamp (prog3GrantRetroPoints
       returns false when already at the current rate), which also covers
       the two paths that never see this migration: fresh v10-derives
       (prog3FromLegacy now mints at the new rate and stamps ppl itself)
       and fail-open blobs healed at join (_sanitizeProg3 runs the same
       grant as a boundary heal — the v11 pattern). */
    run(blob) {
      if (!blob || typeof blob !== 'object') return false;
      if (!blob.prog3 || typeof blob.prog3 !== 'object') return false;
      return prog3GrantRetroPoints(blob.prog3);
    },
  },
];

/* Run every migration newer than blob._v, in order.  Returns
 * { changed, version, failed } — `changed` covers BOTH data mutations
 * and version stamps (the caller re-puts when true), `failed` is the
 * name of the migration that threw (null when all pending completed).
 * Never throws. */
export function runRpgMigrations(blob) {
  const result = { changed: false, version: (blob && typeof blob._v === 'number') ? blob._v : 0, failed: null };
  if (!blob || typeof blob !== 'object') return result;
  for (const m of MIGRATIONS) {
    if (m.v <= result.version) continue;
    try {
      if (m.run(blob)) result.changed = true;
    } catch (e) {
      // Fail-open: stop here, don't stamp past the failure.  The blob
      // keeps its pre-failure _v and this migration retries next load.
      result.failed = m.name;
      break;
    }
    blob._v = m.v;
    result.version = m.v;
    result.changed = true; // the stamp itself must persist
  }
  return result;
}
