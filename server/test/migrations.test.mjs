/* Save-format migration registry test (v2.3.1148; spec
 * docs/specs/migrations.md).  Put-counting mock storage proves the
 * core economy of the rail: a legacy blob converges in exactly ONE
 * re-put, a current blob costs ZERO writes, and the version stamp
 * survives the real _saveRpg fixed-field rewrite (the rule-1
 * exception).  Also covers fail-open ordering, the join bootstrap's
 * boundary heal, and the admin-restore re-migration path. */
import { GameRoom } from '../src/index.js';
import { RPG_SCHEMA_VERSION, MIGRATIONS, runRpgMigrations, healLifeSkills } from '../src/migrations.js';

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
  // mid-assert (the suite convention since v2.3.1145).
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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
