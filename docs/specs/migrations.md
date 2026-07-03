# Save-format migration registry (v2.3.1148)

`server/src/migrations.js` — the run-once, versioned alternative to the
ad-hoc heal-on-load branches that rpg-blob shape changes used to ship as
(lifeSkills corruption heal v2.3.769, leather-armor strip v2.3.249).

## Why

Ad-hoc heals have two structural failures:

1. **They run forever.** Nothing records that a blob is clean, so every
   load pays every heal, and dead defensive code accretes in the hottest
   path in the worker.
2. **They can be bypassed.** The admin restore route writes snapshots
   verbatim; escrow offline paths re-put whole blobs. A blob shaped
   before a heal existed can re-enter storage after the live paths
   stopped defending against that shape.

## Design

- **`_v` stamp** on the blob = highest migration version COMPLETED for
  it. Absent/0 = legacy, run everything.
- **`runRpgMigrations(blob)`** (called from `_loadRpg`) runs pending
  migrations in order, stamping `_v` after each success. Returns
  `{changed, version, failed}`; `_loadRpg` re-puts when `changed`.
  A clean current blob costs **zero** writes; a legacy or restored
  blob converges in **one** re-put and never migrates again.
- **Fail-open:** a throwing migration stops the run WITHOUT stamping
  past the failure — the blob stays playable in its old shape and the
  failed migration retries on the next load (after the bug is fixed).
  `runRpgMigrations` never throws; a save that can't migrate must
  still load.
- **Rule-1 exception** (amended in ARCHITECTURE-HANDOFF): `_saveRpg`
  strips unknown fields by design; `_v` is the one blessed extra field.
  It writes the `RPG_SCHEMA_VERSION` **constant**, never `ps._v` — a
  blob written by current code is current-shape by construction. This
  also means escrow paths and admin restores can't lose the stamp: they
  re-put whole loaded objects (stamp survives), and an unversioned
  restore simply re-migrates on its next load (tested).

## Migration contract

Every migration must be **small**, **idempotent** (a crash can land
between the re-put and the stamp; re-running on a half-migrated blob
must be safe), and **partial-tolerant** (blobs from every historical
version flow through; any field may be missing).

Shipped:

| v | name | what |
|---|---|---|
| 1 | `heal-lifeskills` | pre-v2.3.769 client merge bug: `pets` array spread into an object, `activePet` null into `{}` |
| 2 | `strip-leather-armor` | Leather Armor removed from the game in v2.3.249; old saves still carry it |

## The boundary-heal rule

A migration fixes STORED blobs once. If an **unmigrated writer** still
exists, the corruption can re-enter after the stamp says "done" — and
pre-fix clients are permanently unmigrated writers (their join payloads
bootstrap fresh blobs). So:

- the join bootstrap keeps its own leather-armor strip, and
- v2.3.1148 ADDED `healLifeSkills` at the bootstrap lifeSkills ingest
  (this hole was real: a pre-v2.3.769 client could seed a corrupted
  fresh blob already stamped past migration v1).

Rule of thumb: **delete the live-path defense a migration replaces only
if no unmigrated writer remains; client-payload ingests always keep
theirs.**

## Adding migration N+1 (recipe)

1. Bump `RPG_SCHEMA_VERSION` to N+1.
2. Append `{v: N+1, name, run}` to `MIGRATIONS` — never reorder or
   renumber shipped entries.
3. Apply the boundary-heal rule to any live-path defense you remove.
4. Add a case to `test/migrations.test.mjs` with a real legacy blob
   (the suite's put-counting mock proves one-re-put convergence).

## Why v3 (T2-stat cleanup) was NOT shipped

Handoff item L wants the five retired T2 stats (`ferocity`,
`elementalMastery`, `fortification`, `restoration`, `influence`)
dropped from wire/save/clamps. That is **not a mechanical blob edit** —
a delete-the-fields migration alone would silently regress because the
fields are still live in three places. The coordinated edit list, for
whoever ships it as its own PR:

1. **Join RAW_STATS fallback** (index.js join handler): reconnects fall
   back to the join payload for stats the stored blob lacks — deleting
   the fields from the blob makes every reconnect re-inject them from
   the (client-controlled) payload. The fallback must stop accepting
   the five retired keys in the same commit.
2. **`_handleStatsUpdate` T2 clamp**: still validates-and-stores the
   retired stats; must stop storing them or the next save re-adds them.
3. **`_saveRpg` fixed list**: remove the five fields (the registry
   migration then strips them from stored blobs).
4. **Two live formulas**: `restoration` (heal scaling) and `influence`
   (vendor/economy scaling) are read by current formulas — decide their
   replacement inputs BEFORE deleting the data they read.

Only after 1–3 land together (plus the formula decision in 4) does the
actual migration entry become the trivial part.

## Tests

`server/test/migrations.test.mjs` (16 checks): pure-registry heal +
stamp + idempotency; fail-open ordering with retry-after-fix (a planted
throwing migration); `_loadRpg` economics via a put-counting mock
(legacy = exactly one re-put, current = zero); `_v` surviving the real
`_saveRpg` rewrite; the join bootstrap boundary heal against a
re-corrupting client payload; admin-restore of an unversioned snapshot
re-migrating on next load.
