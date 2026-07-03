/* ═══ v2.3.1148: RPG SAVE-FORMAT MIGRATION REGISTRY (spec:
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

export const RPG_SCHEMA_VERSION = 2;

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
  /* v3 (T2-stat cleanup) DELIBERATELY NOT SHIPPED: stripping the
   * legacy T2 stat fields is not a mechanical blob edit — the join
   * handler's RAW_STATS fallback would re-inject them from the join
   * payload, stats_update still clamps-and-stores them, and the
   * restoration/influence formulas read them live.  The exact
   * coordinated edit list is documented in docs/specs/migrations.md
   * (handoff item L); ship it as its own PR with all edits together. */
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
