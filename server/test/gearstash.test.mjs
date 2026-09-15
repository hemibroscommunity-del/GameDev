/* Server-side gear stash suite (v2.3.2523; spec
 * docs/specs/gear-stash.md).
 *
 * The five gear lists (armour, legs, shield, cosmetic, amulet) became
 * rpg-blob fields in this version so that the general store can escrow
 * them later (backlog §2.2, M2 -> M3).  What is proven here is the part
 * that can lose a player's property:
 *
 *   1. migration v16 gives every stored blob the five containers, is
 *      idempotent, and costs exactly one re-put through _loadRpg;
 *   2. adoption captures a legacy character's local stash on first
 *      join, and the stash + the capture stamp survive _saveRpg's fixed
 *      field list (rule 1 -- a field missing from that list vanishes on
 *      the next save, which is how this class of bug ships green);
 *   3. RE-ADOPTION after a simulated restart adds nothing (the #615
 *      crash shape: a retry that pays twice).  Covered in both
 *      directions -- a stamped record ignores a fresh claim, and a
 *      crash that lost the save re-adopts to exactly one copy;
 *   4. genuine duplicates are NOT collapsed (two identical plates stay
 *      two) -- the merge is a multiset union, not a set union;
 *   5. an empty stash, a malformed stash and a character that never had
 *      gear all land as empty arrays rather than throwing or poisoning
 *      the blob;
 *   6. a client that sends NO stash keys (the old-tab / deploy-order
 *      case) does not burn the one-time capture;
 *   7. the seeds are ingest-only: they never reach playerState, so they
 *      never reach the room-wide state_sync.
 */
import { GameRoom } from '../src/index.js';
import { RPG_SCHEMA_VERSION, runRpgMigrations } from '../src/migrations.js';
import { GEAR_STASH_CAP, GEAR_STASH_FIELDS, normalizeGearStashes, mergeStashLists, stashSig } from '../src/gearstash.js';

function makeState(store = new Map()) {
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
async function join(roomRef, ws, id, data) {
  roomRef.sessions.set(ws, { id: null, name: 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  // Pre-settle the daily reward so credits don't shift blob contents
  // mid-assert (the suite convention since v2.3.1149).
  await roomRef.state.storage.put('cadence:login:' + id, { period: roomRef._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await roomRef.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T-' + id, phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town', ...(data || {}) } }));
}

/* A believable client wardrobe: two distinct plates, one of them held
   TWICE (a real case -- armour drops repeat), a legs piece, a shield
   and two cosmetic layers. */
const plate = () => ({ name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7 });
const plate2 = () => ({ name: 'Pine Plate', gearBase: 'wood', tierMult: 1, tier: 't1', def: 3 });
const greaves = () => ({ name: 'Copper Greaves', gearBase: 'copper', tierMult: 2, tier: 't2', def: 4 });
const shieldPiece = () => ({ name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 't1' });
const clientClaim = () => ({
  rpgArmorStash: [plate(), plate(), plate2()],
  rpgLegsStash: [greaves()],
  rpgShieldStash: [shieldPiece()],
  rpgGearStash: [{ slot: 'chest', gearId: 'copperplate', name: 'Copper Plate' },
                 { slot: 'legs', gearId: 'coppergreaves', name: 'Copper Greaves' }],
});

// ── 1. migration v16: containers, idempotence, one re-put ──
{
  const blob = { coins: 10, level: 3, _v: 14 };
  const r = runRpgMigrations(blob);
  check('v16 ran and stamped to current', r.failed === null && blob._v === RPG_SCHEMA_VERSION, { r, _v: blob._v });
  check('v16 gave the blob all five containers, all empty',
    GEAR_STASH_FIELDS.every((f) => Array.isArray(blob[f]) && blob[f].length === 0), GEAR_STASH_FIELDS.map((f) => blob[f]));
  const r2 = runRpgMigrations(blob);
  check('v16 is idempotent (second pass is a zero-change no-op)', r2.changed === false, r2);

  // Malformed containers heal; good ones are left alone.
  const bad = { _v: 15, armorStash: 'nope', legsStash: [null, 7, greaves(), 'x'], shieldStash: [shieldPiece()] };
  normalizeGearStashes(bad);
  check('v16 heals a non-array stash to an empty list', Array.isArray(bad.armorStash) && bad.armorStash.length === 0, bad.armorStash);
  check('v16 drops non-object entries and keeps the real one', bad.legsStash.length === 1 && bad.legsStash[0].name === 'Copper Greaves', bad.legsStash);
  check('v16 leaves a well-formed list untouched', bad.shieldStash.length === 1, bad.shieldStash);

  // Over-cap lists are bounded (handoff rule 3's silent-truncation warning).
  const huge = { armorStash: Array.from({ length: GEAR_STASH_CAP + 20 }, plate) };
  normalizeGearStashes(huge);
  check('v16 caps a list at GEAR_STASH_CAP', huge.armorStash.length === GEAR_STASH_CAP, huge.armorStash.length);

  // The _loadRpg economics the registry exists for.
  await state.storage.put('rpg:bp_gs_mig', { coins: 5, _v: 14 });
  state._counts.rpgPuts = 0;
  const loaded = await room._loadRpg('bp_gs_mig');
  check('_loadRpg migrates a pre-slice blob in exactly ONE re-put',
    state._counts.rpgPuts === 1 && loaded._v === RPG_SCHEMA_VERSION && Array.isArray(loaded.armorStash), state._counts.rpgPuts);
  state._counts.rpgPuts = 0;
  await room._loadRpg('bp_gs_mig');
  check('_loadRpg on a migrated blob costs ZERO writes', state._counts.rpgPuts === 0);
}

// ── 2. adoption on first join, and survival of the fixed field list ──
{
  const ws = fakeWs('adopt');
  await join(room, ws, 'bp_gs_a', clientClaim());
  const ps = room.playerState['bp_gs_a'];
  check('adopted the armour stash, duplicates included', ps.armorStash.length === 3, ps.armorStash);
  check('adopted legs / shield / cosmetic lists',
    ps.legsStash.length === 1 && ps.shieldStash.length === 1 && ps.gearStash.length === 2,
    { legs: ps.legsStash, shield: ps.shieldStash, gear: ps.gearStash });
  check('amuletStash exists and is empty (no client stash to adopt yet)',
    Array.isArray(ps.amuletStash) && ps.amuletStash.length === 0, ps.amuletStash);
  check('the capture stamp is set', ps.gearStashCaptured === true);

  await room._saveRpg('bp_gs_a', ps);
  const saved = state._store.get('rpg:bp_gs_a');
  check('the stashes survive _saveRpg\'s fixed field list (rule 1)',
    saved.armorStash.length === 3 && saved.legsStash.length === 1 && saved.shieldStash.length === 1
      && saved.gearStash.length === 2 && Array.isArray(saved.amuletStash),
    Object.keys(saved).filter((k) => /Stash/.test(k)));
  check('the capture stamp survives the save too', saved.gearStashCaptured === true);
  /* v2.3.2534: ...plus the derived `prov` mark (gearprov.js).  Cosmetics
     have NO server mint path at all -- the catalog is client art and the
     list is filled by unequipping a worn layer -- so every cosmetic entry
     is `legacy` and will stay that way until something server-side mints
     one.  The whitelist property this assertion exists for is unchanged:
     nothing the client sent survives except slot/gearId/name. */
  check('a cosmetic entry keeps only {slot, gearId, name} (+ the derived prov mark)',
    Object.keys(saved.gearStash[0]).sort().join(',') === 'gearId,name,prov,slot'
      && saved.gearStash[0].prov === 'legacy', saved.gearStash[0]);
}

// ── 3. re-adoption after a RESTART adds nothing (the #615 shape) ──
{
  /* A worker deploy wipes all memory (rule 11) but not storage.  Build a
     fresh room over the same store and rejoin with the SAME claim -- the
     client still has its local copy and still sends it. */
  const room2 = new GameRoom(makeState(state._store), mockEnv);
  const ws2 = fakeWs('restart');
  await join(room2, ws2, 'bp_gs_a', clientClaim());
  const ps2 = room2.playerState['bp_gs_a'];
  check('restart + same claim: armour stash is still exactly 3 (no double-adopt)', ps2.armorStash.length === 3, ps2.armorStash);
  check('restart: legs / shield / cosmetic unchanged',
    ps2.legsStash.length === 1 && ps2.shieldStash.length === 1 && ps2.gearStash.length === 2,
    { legs: ps2.legsStash.length, shield: ps2.shieldStash.length, gear: ps2.gearStash.length });

  /* ...and a stamped record ignores a LARGER claim outright: once the
     server holds the stash, the client's copy stops being a source. */
  const room3 = new GameRoom(makeState(state._store), mockEnv);
  const ws3 = fakeWs('greedy');
  await join(room3, ws3, 'bp_gs_a', {
    rpgArmorStash: [plate(), plate(), plate(), plate(), plate(), plate()],
    rpgShieldStash: [shieldPiece(), shieldPiece()],
  });
  check('a captured record ignores a later, bigger claim (stored wins forever)',
    room3.playerState['bp_gs_a'].armorStash.length === 3 && room3.playerState['bp_gs_a'].shieldStash.length === 1,
    { armor: room3.playerState['bp_gs_a'].armorStash.length, shield: room3.playerState['bp_gs_a'].shieldStash.length });
}

// ── 4. the crash window: adoption that never reached storage re-runs
// and lands exactly one copy ──
{
  /* The #615 lesson applied to this path: a crash between adopting the
     client's stash and persisting it must not lose the stash, and the
     retry must not duplicate it.  Simulate the save being LOST -- the
     put throws, so neither the lists nor the stamp reach storage. */
  const crashStore = new Map();
  const crashState = makeState(crashStore);
  const realPut = crashState.storage.put;
  crashState.storage.put = async (k, v) => {
    if (k === 'rpg:bp_gs_crash') throw new Error('simulated crash');
    return realPut(k, v);
  };
  const roomC = new GameRoom(crashState, mockEnv);
  const wsC = fakeWs('crashA');
  await join(roomC, wsC, 'bp_gs_crash', clientClaim());
  check('crash sim: the in-memory adoption happened', roomC.playerState['bp_gs_crash'].armorStash.length === 3);
  check('crash sim: NOTHING reached storage -- neither stash nor stamp', !crashStore.has('rpg:bp_gs_crash'));

  /* Storage recovers; the player reconnects into a fresh room. */
  const healedState = makeState(crashStore);
  const roomD = new GameRoom(healedState, mockEnv);
  const wsD = fakeWs('crashB');
  await join(roomD, wsD, 'bp_gs_crash', clientClaim());
  const psD = roomD.playerState['bp_gs_crash'];
  check('after the lost save, the retry adopts -- exactly once, not twice', psD.armorStash.length === 3, psD.armorStash);
  const savedD = crashStore.get('rpg:bp_gs_crash');
  check('the retry persisted the stash AND the stamp together',
    savedD && savedD.armorStash.length === 3 && savedD.gearStashCaptured === true, savedD && savedD.gearStashCaptured);

  /* The half-written case: the stash landed but the stamp somehow did
     not (a hand-restored snapshot, an admin rail re-put).  Re-adoption
     must converge on the same list, never a doubled one. */
  const halfState = makeState(crashStore);
  const halfBlob = { ...crashStore.get('rpg:bp_gs_crash') };
  delete halfBlob.gearStashCaptured;
  crashStore.set('rpg:bp_gs_crash', halfBlob);
  const roomE = new GameRoom(halfState, mockEnv);
  await join(roomE, fakeWs('half'), 'bp_gs_crash', clientClaim());
  check('stash stored but stamp lost: the merge converges, it does not double',
    roomE.playerState['bp_gs_crash'].armorStash.length === 3, roomE.playerState['bp_gs_crash'].armorStash);
}

// ── 5. the merge itself: idempotent, duplicate-preserving, capped ──
{
  const held = [plate(), plate2()];
  const claim = [plate(), plate(), plate2(), greaves()];
  const once = mergeStashLists('armorStash', held, claim);
  check('merge takes the SURPLUS of a duplicate, not the sum', once.filter((g) => stashSig('armorStash', g) === stashSig('armorStash', plate())).length === 2, once);
  check('merge keeps a piece only one side has', once.length === 4, once);
  const twice = mergeStashLists('armorStash', once, claim);
  check('merge is idempotent (re-running on its own output changes nothing)', twice.length === once.length, { once: once.length, twice: twice.length });
  const over = mergeStashLists('armorStash', [], Array.from({ length: GEAR_STASH_CAP + 5 }, plate2));
  check('merge respects the cap', over.length === GEAR_STASH_CAP, over.length);
  check('cosmetic signatures key on slot+gearId',
    stashSig('gearStash', { slot: 'chest', gearId: 'copperplate' }) === stashSig('gearStash', { slot: 'chest', gearId: 'copperplate', name: 'other' }));
  /* TRAPS #6: the merge keys on client-supplied strings and must not
     no-op on the magic one. */
  const protoA = { name: '__proto__', gearBase: '__proto__', tierMult: 1 };
  const protoMerged = mergeStashLists('armorStash', [], [protoA, protoA]);
  check("a piece named '__proto__' merges like any other (Map, not {})", protoMerged.length === 2, protoMerged);
}

// ── 6. empty, malformed, and never-had-gear characters ──
{
  const wsE = fakeWs('empty');
  await join(room, wsE, 'bp_gs_empty', { rpgArmorStash: [], rpgLegsStash: [], rpgShieldStash: [], rpgGearStash: [] });
  const psE = room.playerState['bp_gs_empty'];
  check('an empty claim adopts nothing and still stamps (they own nothing)',
    GEAR_STASH_FIELDS.every((f) => psE[f].length === 0) && psE.gearStashCaptured === true, psE.gearStashCaptured);

  const wsM = fakeWs('malformed');
  await join(room, wsM, 'bp_gs_bad', {
    rpgArmorStash: 'not-an-array',
    rpgLegsStash: [null, 5, 'x', { name: 'Real Greaves', tierMult: 99999 }],
    rpgGearStash: [{ slot: 'chest' }, { gearId: 'x' }, { slot: 'legs', gearId: 'coppergreaves', name: 'A'.repeat(500) }],
    rpgShieldStash: [{ name: 'Forged', tierMult: 2, quality: 'godly', hardness: 5, temper: 9999 }],
  });
  const psM = room.playerState['bp_gs_bad'];
  check('a non-array claim is ignored, not crashed on', Array.isArray(psM.armorStash) && psM.armorStash.length === 0, psM.armorStash);
  check('junk entries are dropped and the real one is clamped',
    psM.legsStash.length === 1 && psM.legsStash[0].tierMult === 8, psM.legsStash);
  check('cosmetic entries missing slot or gearId are dropped; the name is bounded',
    psM.gearStash.length === 1 && psM.gearStash[0].name.length === 40, psM.gearStash);
  check('a client-supplied piece cannot smuggle server-minted forge fields',
    psM.shieldStash.length === 1 && psM.shieldStash[0].quality === undefined
      && psM.shieldStash[0].hardness === undefined && psM.shieldStash[0].temper === undefined, psM.shieldStash[0]);
  /* ...and none of that stopped the join. */
  check('the join still completed with a malformed claim', !!room.playerState['bp_gs_bad'].hp);

  const wsN = fakeWs('nogear');
  await join(room, wsN, 'bp_gs_none', {});
  const psN = room.playerState['bp_gs_none'];
  check('a character that never had gear gets five empty lists', GEAR_STASH_FIELDS.every((f) => Array.isArray(psN[f]) && psN[f].length === 0));
  check('a client that sends NO stash keys does NOT burn the one-time capture',
    !psN.gearStashCaptured, psN.gearStashCaptured);
  /* ...so when that player's client finally ships the seed, adoption
     still runs.  This is the deploy-order half: worker first, Pages
     second, old tabs open for days. */
  const roomF = new GameRoom(makeState(state._store), mockEnv);
  await join(roomF, fakeWs('late'), 'bp_gs_none', clientClaim());
  check('a later join WITH the seed still adopts the whole wardrobe',
    roomF.playerState['bp_gs_none'].armorStash.length === 3 && roomF.playerState['bp_gs_none'].gearStashCaptured === true,
    roomF.playerState['bp_gs_none'].armorStash.length);
}

// ── 7. the seeds are ingest-only (never on the room-wide wire) ──
{
  const ps = room.playerState['bp_gs_a'];
  check('no rpg*Stash seed key leaked onto playerState',
    !('rpgArmorStash' in ps) && !('rpgLegsStash' in ps) && !('rpgShieldStash' in ps) && !('rpgGearStash' in ps),
    Object.keys(ps).filter((k) => k.startsWith('rpg')));
  const mine = room.getAllPlayerData()['bp_gs_a'] || {};
  check('...and none reaches the state_sync every other player receives',
    !Object.keys(mine).some((k) => /^rpg.*Stash$/.test(k)), Object.keys(mine).filter((k) => k.startsWith('rpg')));
  /* The echo, by contrast, DOES carry the server's own copy. */
  const wsEcho = fakeWs('echo');
  room.sessions.set(wsEcho, { id: 'bp_gs_a', name: 'T', data: {}, protocolVersion: 1, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  room._sendPlayerState(wsEcho, 'bp_gs_a');
  const echo = wsEcho.sent.find((m) => m.type === 'player_state');
  check('player_state echoes the five stashes',
    echo && GEAR_STASH_FIELDS.every((f) => Array.isArray(echo.payload[f])) && echo.payload.armorStash.length === 3,
    echo && Object.keys(echo.payload).filter((k) => /Stash/.test(k)));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
