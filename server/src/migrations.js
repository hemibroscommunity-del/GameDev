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

export const RPG_SCHEMA_VERSION = 5;

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
