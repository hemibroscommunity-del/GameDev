/* Save-format migration registry test (v2.3.1152; spec
 * docs/specs/migrations.md).  Put-counting mock storage proves the
 * core economy of the rail: a legacy blob converges in exactly ONE
 * re-put, a current blob costs ZERO writes, and the version stamp
 * survives the real _saveRpg fixed-field rewrite (the rule-1
 * exception).  Also covers fail-open ordering, the join bootstrap's
 * boundary heal, and the admin-restore re-migration path. */
import { GameRoom } from '../src/index.js';
import { RPG_SCHEMA_VERSION, MIGRATIONS, runRpgMigrations, healLifeSkills, computeCanonicalPools } from '../src/migrations.js';
import { t2PointValue, t2BenchLevel } from '../src/data.js'; /* v2.3.1451: v9 bench-locked replay assertions */

function makeState() {
  const store = new Map();
  const counts = { rpgPuts: 0 };
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k.startsWith('rpg:')) counts.rpgPuts++; store.set(k, v); },
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
    _counts: counts,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
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
async function join(ws, id, data) {
  room.sessions.set(ws, { id: null, name: 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  // Pre-settle the daily reward so credits don't shift blob contents
  // mid-assert (the suite convention since v2.3.1149).
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T-' + id, phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town', ...(data || {}) } }));
}

// A realistic pre-registry blob: pre-v2.3.769 corrupted lifeSkills
// (array spread into an object + activePet {}), pre-v2.3.249 leather
// armor, and no _v stamp.
const legacyBlob = () => ({
  coins: 120, level: 5, xp: 40,
  inventory: { 'slime-remnants': 3 },
  lifeSkills: { fishing: { level: 4, xp: 10 }, pets: { 0: { name: 'Slimey' }, 1: { name: 'Rocky' } }, activePet: {} },
  armor: { name: 'Leather Armor', def: 5 },
  hp: 80, maxHp: 100,
});

// ── 1. pure registry: legacy blob heals + stamps in one pass ──
{
  const b = legacyBlob();
  const r = runRpgMigrations(b);
  check('legacy blob: migrations ran and stamped to current', r.changed === true && r.failed === null && b._v === RPG_SCHEMA_VERSION, r);
  check('v1 healed lifeSkills (pets object -> array, activePet {} -> null)', Array.isArray(b.lifeSkills.pets) && b.lifeSkills.pets.length === 2 && b.lifeSkills.activePet === null, b.lifeSkills);
  check('v2 stripped leather armor', b.armor === null);
  const r2 = runRpgMigrations(b);
  check('idempotent: second pass is a zero-change no-op', r2.changed === false && b._v === RPG_SCHEMA_VERSION, r2);
}

// ── 2. fail-open ordering: a throwing migration stops the stamp ──
{
  MIGRATIONS.push({ v: RPG_SCHEMA_VERSION + 1, name: 'boom', run() { throw new Error('boom'); } });
  const b = legacyBlob();
  const r = runRpgMigrations(b);
  check('failure stops AT the failing migration (earlier ones completed + stamped)',
    r.failed === 'boom' && b._v === RPG_SCHEMA_VERSION && b.armor === null && r.changed === true, { r, _v: b._v });
  // "Fix the bug" -- replace the throwing entry, the blob retries from
  // where it stopped and completes.
  MIGRATIONS[MIGRATIONS.length - 1] = { v: RPG_SCHEMA_VERSION + 1, name: 'fixed', run(blob) { blob._testMark = true; return true; } };
  const r3 = runRpgMigrations(b);
  check('retry after fix resumes past the old failure point', r3.failed === null && b._v === RPG_SCHEMA_VERSION + 1 && b._testMark === true, r3);
  MIGRATIONS.pop();
}

// ── 3. _loadRpg economics: one re-put for legacy, zero for current ──
{
  await state.storage.put('rpg:bp_mig_a', legacyBlob());
  state._counts.rpgPuts = 0;
  const loaded = await room._loadRpg('bp_mig_a');
  check('_loadRpg migrates a legacy blob with exactly ONE re-put', state._counts.rpgPuts === 1 && loaded._v === RPG_SCHEMA_VERSION && loaded.armor === null, { puts: state._counts.rpgPuts, _v: loaded._v });
  state._counts.rpgPuts = 0;
  const again = await room._loadRpg('bp_mig_a');
  check('_loadRpg on a current blob costs ZERO writes', state._counts.rpgPuts === 0 && again._v === RPG_SCHEMA_VERSION, state._counts.rpgPuts);
}

// ── 4. the stamp survives the real _saveRpg fixed-field rewrite ──
{
  const ws = fakeWs('a');
  await join(ws, 'bp_mig_a');
  const ps = room.playerState['bp_mig_a'];
  check('join loaded the migrated blob (leather gone, pets an array)', ps.armor === null && Array.isArray(ps.lifeSkills.pets), { armor: ps.armor, pets: ps.lifeSkills.pets });
  ps.coins = 777;
  await room._saveRpg('bp_mig_a', ps);
  const saved = state._store.get('rpg:bp_mig_a');
  check('_saveRpg stamps _v = RPG_SCHEMA_VERSION (rule-1 exception; the constant, not ps._v)', saved._v === RPG_SCHEMA_VERSION && saved.coins === 777, { _v: saved._v });
  state._counts.rpgPuts = 0;
  await room._loadRpg('bp_mig_a');
  check('a blob written by current code never re-migrates', state._counts.rpgPuts === 0);
}

// ── 5. bootstrap boundary heal: a pre-fix CLIENT payload can't
// re-corrupt a fresh blob past migration v1 ──
{
  const ws = fakeWs('b');
  await join(ws, 'bp_mig_b', {
    rpgLifeSkills: { fishing: { level: 2, xp: 5 }, pets: { 0: { name: 'Recorrupt' } }, activePet: {} },
    rpgCoins: 50,
  });
  const ps = room.playerState['bp_mig_b'];
  // activePet may legitimately be a NUMBER afterwards (the pet ingest
  // defaults it to index 0 when pets exist); the corruption signature
  // is an object-typed activePet, and that must be gone.
  check('bootstrap ingest healed the corrupted join payload in place',
    Array.isArray(ps.lifeSkills.pets) && ps.lifeSkills.pets.length === 1 && typeof ps.lifeSkills.activePet !== 'object',
    ps.lifeSkills);
  await room._saveRpg('bp_mig_b', ps);
  const saved = state._store.get('rpg:bp_mig_b');
  check('the saved fresh blob is clean AND stamped (never needs migration v1)', Array.isArray(saved.lifeSkills.pets) && saved._v === RPG_SCHEMA_VERSION, { _v: saved._v });
}

// ── 6. admin-restore path: an unversioned snapshot re-migrates on
// its next load (restore writes the raw snapshot; _loadRpg heals) ──
{
  // Simulate POST /restore of a snapshot taken before the registry
  // existed: raw put of an unversioned legacy blob (exactly what the
  // restore route does -- it writes the snapshot verbatim).
  await state.storage.put('rpg:bp_mig_a', legacyBlob());
  state._counts.rpgPuts = 0;
  const restored = await room._loadRpg('bp_mig_a');
  check('restored unversioned snapshot re-migrates (one re-put, healed, stamped)',
    state._counts.rpgPuts === 1 && restored._v === RPG_SCHEMA_VERSION && restored.armor === null && Array.isArray(restored.lifeSkills.pets),
    { puts: state._counts.rpgPuts, _v: restored._v });
}

// ── 7. healLifeSkills stays a safe no-op on clean/absent shapes ──
{
  check('healLifeSkills: clean blob untouched', healLifeSkills({ lifeSkills: { pets: [{ name: 'ok' }], activePet: { name: 'ok' } } }) === false);
  check('healLifeSkills: missing lifeSkills is a no-op', healLifeSkills({}) === false && healLifeSkills(null) === false);
}

// ── 8. v3 refund-damage-channels (v2.3.1153 reprice; owner decision:
// refund, not silent reprice) — spent edge/drawPower/spellPower points
// move to weaponUnspent so players re-choose at the new price ──
{
  const b = legacyBlob();
  b.weaponSpecs = { sword: { edge: 60, precision: 10 }, bow: { drawPower: 99 }, staff: { spellPower: 0, overload: 5 } };
  b.weaponSkills = { sword: { level: 75, xp: 0 }, bow: { level: 99, xp: 0 }, staff: { level: 5, xp: 0 } };
  b.weaponUnspent = { sword: 5 };
  const r = runRpgMigrations(b);
  // Full chain: v3 refunds the damage channels (edge 60, drawPower 99),
  // v6 (uniform-t2-caps) refunds the repriced crit channels (precision,
  // overload), then v7 (uniform-t2-pools) RECOMPUTES every pool to the
  // canonical earned-minus-spent at the doubled rate: sword = min(200,
  // 2x75) - 0 = 150; bow = 198; staff = 10.
  check('v3+v6+v7: repriced channels zeroed, pools recomputed to 2x-level canonical',
    r.failed === null && b.weaponSpecs.sword.edge === 0 && b.weaponSpecs.bow.drawPower === 0
    && b.weaponSpecs.sword.precision === 0 && b.weaponSpecs.staff.overload === 0
    && b.weaponUnspent.sword === 150 && b.weaponUnspent.bow === 198 && b.weaponUnspent.staff === 10,
    { specs: b.weaponSpecs, unspent: b.weaponUnspent });
  check('chain leaves zeroed channels untouched',
    b.weaponSpecs.staff.spellPower === 0, b.weaponSpecs);
  const r2 = runRpgMigrations(b);
  check('v3+v6+v7 idempotent: re-run changes nothing', r2.changed === false && b.weaponUnspent.sword === 150, r2);
  // A corrupt blob (specs without any recorded skill levels) can't mint
  // points: v3/v6 zero the forged channels, v7's canonical recompute
  // leaves the pools at earned = 0.
  const c = { weaponSpecs: { sword: { edge: 5000 } } };
  runRpgMigrations(c);
  check('forged specs without skill levels net ZERO points after the chain',
    c.weaponUnspent.sword === 0 && c.weaponSpecs.sword.edge === 0, c);
}

// ── 9. v4 backfill-grid-points: retroactive HP/Endurance grid pools
// (v2.3.1154) — 1 point per stat level, minus already-spent ──
{
  const b = legacyBlob();
  b.vitality = 25; b.endurance = 12;
  b.hpSpec = { vigor: 5 };   // a half-migrated blob may already show spends
  const r = runRpgMigrations(b);
  // Chain-final: v6 doubles vigor 5 -> 10, v7 recomputes the pools at
  // the doubled earn rate — hp = min(200, 2x25) - 10 = 40; en = 24.
  check('v4+v6+v7 backfill pools to the 2x-stat canonical minus doubled spends',
    r.failed === null && b.hpSpec.vigor === 10 && b.hpUnspent === 40 && b.enduranceUnspent === 24,
    { vigor: b.hpSpec.vigor, hp: b.hpUnspent, en: b.enduranceUnspent });
  const r2 = runRpgMigrations(b);
  check('v4+v6+v7 idempotent: re-run changes nothing', r2.changed === false && b.hpUnspent === 40, r2);
}

// ── 10. v5 strip-retired-t2 + the coordinated writer deletions
// (v2.3.1155) — the whole point of shipping the migrations.md edit
// list together: NOTHING can re-inject the five retired stats ──
{
  const b = legacyBlob();
  b.ferocity = 12; b.elementalMastery = 4; b.fortification = 9; b.restoration = 3; b.influence = 50;
  const r = runRpgMigrations(b);
  check('v5 strips the five retired fields from stored blobs',
    r.failed === null && !('ferocity' in b) && !('elementalMastery' in b) && !('fortification' in b)
    && !('restoration' in b) && !('influence' in b), Object.keys(b).filter((k) => /fero|elem|fort|resto|influ/.test(k)));
  const r2 = runRpgMigrations(b);
  check('v5 idempotent', r2.changed === false, r2);

  // A spoofed join payload can no longer re-inject (the RAW_STATS
  // fallback is T1-only) — the exact hole migrations.md warned about.
  const wsT = fakeWs('t2r');
  await join(wsT, 'bp_mig_t2', { rpgFerocity: 999, rpgInfluence: 50, rpgVitality: 5 });
  const psT = room.playerState['bp_mig_t2'];
  check('join payload no longer re-injects retired stats (T1 still lands)',
    psT.ferocity === undefined && psT.influence === undefined && psT.vitality === 5,
    { f: psT.ferocity, i: psT.influence, v: psT.vitality });
  await room._saveRpg('bp_mig_t2', psT);
  const savedT = state._store.get('rpg:bp_mig_t2');
  check('_saveRpg fixed field list no longer carries the retired stats',
    !('ferocity' in savedT) && !('influence' in savedT) && !('restoration' in savedT),
    Object.keys(savedT).filter((k) => /fero|influ|resto/.test(k)));
}

// ── 11. v6 uniform-t2-caps (v2.3.1156): 50-cap grid points DOUBLE
// (power-neutral — coefficients halved) and repriced weapon channels
// refund; the atomic-put registry makes a re-run unreachable, and the
// _v stamp proves it here ──
{
  const b = legacyBlob();
  b.defenseSpec = { bulwark: 30, ironskin: 50 };
  b.defenseSkill = { level: 90, xp: 0 };
  b.hpSpec = { vigor: 25 };
  b.enduranceSpec = { evasion: 50, swiftness: 10 };
  b.weaponSpecs = { sword: { tempo: 40, executioner: 20 }, bow: { piercing: 75 } };
  b.weaponSkills = { sword: { level: 30, xp: 0 }, bow: { level: 40, xp: 0 } };
  const r = runRpgMigrations(b);
  check('v6 doubles formerly-50-cap grid points (clamped to the new 100)',
    r.failed === null && b.defenseSpec.bulwark === 60 && b.defenseSpec.ironskin === 100
    && b.hpSpec.vigor === 50 && b.enduranceSpec.evasion === 100 && b.enduranceSpec.swiftness === 20,
    { def: b.defenseSpec, hp: b.hpSpec, en: b.enduranceSpec });
  // v6 refunds tempo/piercing; v7 then recomputes canonically:
  // sword = min(200, 2x30) - 20 (executioner kept) = 40;
  // bow = min(200, 2x40) - 0 = 80; defense = min(200, 2x90) - doubled
  // spend (60 + 100) = 20.
  check('v6 refunds repriced weapon channels, v7 recomputes pools (executioner kept)',
    b.weaponSpecs.sword.tempo === 0 && b.weaponSpecs.bow.piercing === 0
    && b.weaponUnspent.sword === 40 && b.weaponUnspent.bow === 80
    && b.defenseUnspent === 20
    && b.weaponSpecs.sword.executioner === 20,
    { specs: b.weaponSpecs, unspent: b.weaponUnspent, def: b.defenseUnspent });
  check('v6 stamped: a migrated blob never re-doubles', b._v === RPG_SCHEMA_VERSION
    && runRpgMigrations(b).changed === false && b.defenseSpec.bulwark === 60, b._v);
  // Power-neutrality proof: doubled points × halved coefficient = the
  // exact pre-migration multiplier (ironskin 50 pts × 0.5%/pt == 100 pts
  // × 0.25%/pt == −25%).
  check('v6 is power-neutral (ironskin -25% before == after)',
    Math.abs((1 - Math.min(0.25, b.defenseSpec.ironskin * 0.0025)) - 0.75) < 1e-9, b.defenseSpec.ironskin);
  const empty = { _v: 5 };
  const rEmpty = runRpgMigrations(empty);
  check('v6 creates no specs on an empty blob; v7 zero-initializes the pools',
    rEmpty.failed === null && !('defenseSpec' in empty) && empty.weaponUnspent.sword === 0
    && empty.defenseUnspent === 0 && empty.hpUnspent === 0 && empty._v === RPG_SCHEMA_VERSION, empty);
}

// ── 12. v8 level-is-build (v2.3.1342): combat level = total T2 points
// PLACED (cap 1000), recomputed on the stored blob; plus the laststand
// canonical-pool regression (laststand was missing from the HP spent
// list since v2.3.1160 — spends there were refunded as free points) ──
{
  // _v: 7 isolates v8 — a legacy blob would first flow through v3
  // (edge refund) and v6 (grid-point doubling), which is covered above.
  const b = {
    _v: 7,
    level: 300, // stale stat-sum snapshot — must be recomputed
    vitality: 30,
    weaponSpecs: { sword: { edge: 40, tempo: 10 } },
    defenseSpec: { ironskin: 20 },
    hpSpec: { vigor: 10, laststand: 15 },
    enduranceSpec: { swiftness: 5 },
  };
  const r = runRpgMigrations(b);
  check('v8 recomputes level = 1 + placed points (1 + 40+10+20+10+15+5 = 101)',
    r.failed === null && b.level === 101, { level: b.level, failed: r.failed });
  check('v8 idempotent', runRpgMigrations(b).changed === false && b.level === 101, b.level);
  // The laststand canonical-pool regression (shared live path): before
  // the v2.3.1342 fix the 15 laststand points were NOT counted as
  // spent, so the pool refunded them (60 - 10 = 50 free points).
  computeCanonicalPools(b);
  check('laststand pool fix: laststand spend COUNTS as spent (hpUnspent = min(200,2x30) - 25 = 35)',
    b.hpUnspent === 35, b.hpUnspent);
  // Over-ceiling forgery clamps at 1000; empty blob floors at level 1.
  const big = { _v: 7, weaponSpecs: { sword: { edge: 999999 } } };
  runRpgMigrations(big);
  check('v8 per-channel clamp holds a forged blob to 100 placed (level 101)', big.level === 101, big.level);
  const empty = { _v: 7 };
  runRpgMigrations(empty);
  check('v8 empty blob starts at level 1 (0 placed)', empty.level === 1, empty.level);
}

// ── 13. v9 bench-locked-t2 (v2.3.1451): replay existing spent points
// at benchmark into blob.t2Flat — absent-only fill (the v4 pattern),
// deterministic midpoint stratification, exact when one channel holds
// every point. ──
{
  const b = {
    _v: 8,
    weaponSpecs: { sword: { edge: 100 } },
  };
  const r = runRpgMigrations(b);
  // Exactness: 100 points in ONE channel replay at global positions
  // 1..100 — sum of t2PointValue at each position's benchmark.
  let exact = 0;
  for (let pos = 1; pos <= 100; pos++) exact += t2PointValue('damage', t2BenchLevel(pos));
  check('v9 fills t2Flat via replay (all-in-one-channel is position-exact)',
    r.failed === null && b.t2Flat && b.t2Flat.sword.edge === exact, { got: b.t2Flat && b.t2Flat.sword.edge, exact });
  check('v9 stamps the schema version', b._v === RPG_SCHEMA_VERSION, b._v);
  // Idempotency: re-run is a no-op, and a LIVE accumulator (different
  // from the replay estimate) is never overwritten.
  b.t2Flat.sword.edge = 999999;
  const r2 = runRpgMigrations({ ...b, _v: 8 });
  check('v9 never re-replays a blob that already carries t2Flat',
    runRpgMigrations(b).changed === false && b.t2Flat.sword.edge === 999999, { r2: r2.changed, edge: b.t2Flat.sword.edge });
  // Fairness: two equal-sized channels with the SAME pricing (ironskin
  // and recovery are both 5% of benchmark dmg) replay to equal value —
  // the uniform-interleave assumption favors neither.
  const twin = { _v: 8, defenseSpec: { ironskin: 50 }, hpSpec: { recovery: 50 } };
  runRpgMigrations(twin);
  check('v9 equal channels with equal pricing replay to equal value',
    twin.t2Flat.defense.ironskin > 0 && twin.t2Flat.defense.ironskin === twin.t2Flat.hp.recovery, twin.t2Flat);
  // Mechanical channels bank nothing but still occupy level positions:
  // an edge point bought "after" 100 tempo points prices at a higher
  // benchmark than one bought alone.
  const withMech = { _v: 8, weaponSpecs: { sword: { edge: 1, tempo: 100 } } };
  const alone = { _v: 8, weaponSpecs: { sword: { edge: 1 } } };
  runRpgMigrations(withMech); runRpgMigrations(alone);
  check('v9 mechanical points raise the replay positions of flat points',
    withMech.t2Flat.sword.edge >= alone.t2Flat.sword.edge
    && Object.values(withMech.t2Flat.sword).length === 2,
    { withMech: withMech.t2Flat.sword.edge, alone: alone.t2Flat.sword.edge });
  // Empty blob → zeroed shape, still stamped.
  const empty9 = { _v: 8 };
  runRpgMigrations(empty9);
  check('v9 empty blob gets the zeroed accumulator shape',
    empty9.t2Flat && empty9.t2Flat.sword.edge === 0 && empty9.t2Flat.endurance.stamina === 0, empty9.t2Flat);
}

/* ── v12: the starter weapons are named for their metal (v2.3.1772) ── */
{
  const b = {
    _v: 11,
    weapon: { name: "Bro's Sword", type: 'greatsword', gearBase: 'copper' },
    rangedWeapon: { name: "Bro's Bow", type: 'bow', gearBase: 'ww_pine' },
    weaponStash: [
      { name: "Bro's Staff", type: 'staff', gearBase: 'ww_pine' },
      { name: 'Iron Longsword', type: 'sword', gearBase: 'iron' },
    ],
  };
  const r = runRpgMigrations(b);
  check('v12 renames the equipped sword and bow',
    r.failed === null && b.weapon.name === 'Copper Great Sword' && b.rangedWeapon.name === 'Pine Bow',
    { w: b.weapon.name, r: b.rangedWeapon.name });
  check('v12 renames a STASHED starter weapon too (one bag, one story)',
    b.weaponStash[0].name === 'Pine Staff', b.weaponStash[0].name);
  check('v12 leaves every other weapon alone',
    b.weaponStash[1].name === 'Iron Longsword', b.weaponStash[1].name);
  check('v12 stamps the schema version', b._v === RPG_SCHEMA_VERSION, b._v);
  check('v12 is idempotent', runRpgMigrations(b).changed === false, b);
  /* The type guard: a record carrying the old name on the WRONG type is not
     one of the three starter weapons and must not be relabelled. */
  const impostor = { _v: 11, weapon: { name: "Bro's Sword", type: 'dagger' } };
  runRpgMigrations(impostor);
  check('v12 checks the TYPE, not just the name',
    impostor.weapon.name === "Bro's Sword", impostor.weapon.name);
  /* Partial-tolerance: every field may be missing. */
  const bare = { _v: 11 };
  check('v12 survives a blob with no weapons at all',
    runRpgMigrations(bare).failed === null && bare._v === RPG_SCHEMA_VERSION, bare);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
