/* Server-side gear stash suite (v2.3.2523; spec
 * docs/specs/gear-stash.md).
 *
 * The five gear lists (armour, legs, shield, cosmetic, amulet) became
 * rpg-blob fields in this version so that the auction house can escrow
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
 *      crash shape: a retry that pays twice), and a crash that lost the
 *      save re-adopts to exactly one copy;
 *   4. genuine duplicates are NOT collapsed (two identical plates stay
 *      two) -- the merge is a multiset union, not a set union;
 *   5. an empty stash, a malformed stash and a character that never had
 *      gear all land as empty arrays rather than throwing or poisoning
 *      the blob;
 *   6. a client that sends NO stash keys (the old-tab / deploy-order
 *      case) does not burn the capture;
 *   7. the seeds are ingest-only: they never reach playerState, so they
 *      never reach the room-wide state_sync;
 *   8. v2.3.2527 (§8, from the review of #640) -- the capture is not
 *      one-shot and not lossy: a veteran joining from a browser with no
 *      stash keeps their stored wardrobe and does not get it stamped
 *      away; a claim the cap cut short does not stamp; a forged amulet
 *      claim is refused; and armour GRADES survive adoption (§6).
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

  /* ...and v2.3.2527 (review finding 1): a stamped record does NOT stop
     listening.  The one-shot gate is what lost gear -- a second device
     could stamp a capture over a wardrobe it had never seen -- so the
     merge now runs on every join and the surplus of a larger claim is
     taken.  Held: 2x plate + 1x plate2, 1 shield.  Claimed: 6 plates, 2
     shields.  Surplus is 4 plates and 1 shield, never the sum. */
  const room3 = new GameRoom(makeState(state._store), mockEnv);
  const ws3 = fakeWs('greedy');
  await join(room3, ws3, 'bp_gs_a', {
    rpgArmorStash: [plate(), plate(), plate(), plate(), plate(), plate()],
    rpgShieldStash: [shieldPiece(), shieldPiece()],
  });
  check('the door stays open: a later, bigger claim contributes its SURPLUS',
    room3.playerState['bp_gs_a'].armorStash.length === 7 && room3.playerState['bp_gs_a'].shieldStash.length === 2,
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
  /* v2.3.2527 (review finding 1a): four empty arrays are NOT a capture.
     A brand-new character owning nothing and a veteran signing in from
     a browser that has never seen their gear send the identical
     payload, so the server cannot tell them apart -- and must therefore
     not write either one down as done.  (The new client omits the keys
     entirely; this asserts the old client's shape is harmless too.) */
  check('an empty claim adopts nothing and does NOT stamp',
    GEAR_STASH_FIELDS.every((f) => psE[f].length === 0) && !psE.gearStashCaptured, psE.gearStashCaptured);

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
    psM.shieldStash.length === 1
      && psM.shieldStash[0].hardness === undefined && psM.shieldStash[0].temper === undefined, psM.shieldStash[0]);
  /* v2.3.2527 (review finding 2): quality is NOT one of them.  It is the
     armour grade -- _armorDrMult multiplies tier by it -- and stripping
     it on adoption would have written every graded piece anyone had
     earned down as ungraded, permanently.  It is safe to keep because
     the reader applies its [0, 8] clamp AFTER the grade (and grids.js
     already accepts a client-supplied one on the live combat path). */
  check('a real armour GRADE survives adoption (it is not decoration)',
    psM.shieldStash[0].quality === 'godly', psM.shieldStash[0]);
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

/* ── 8. v2.3.2527 — the three holes the review found in the capture ──
   Each of these passed review-free in v2.3.2523 because no test asked. */
{
  /* ── 8a. finding 1a: A PRE-EXISTING CHARACTER JOINING FROM A BROWSER
     THAT DOES NOT HAVE THEIR GEAR.  §6's empty-claim test only ever
     covered a BRAND-NEW character id, where "they own nothing" happens
     to be true -- which is precisely why it hid this.  Here the player
     is a veteran with a real wardrobe on the server, and the join comes
     from a second device / private tab / cleared Safari.  The old code
     stamped CAPTURED off the four empty arrays and wrote the wardrobe
     down as nothing, permanently.  Both client shapes are exercised:
     the old client's four empty arrays, and the new client's no keys
     at all. */
  const vetStore = new Map();
  await join(new GameRoom(makeState(vetStore), mockEnv), fakeWs('vet'), 'bp_gs_vet', clientClaim());
  const vetFirst = vetStore.get('rpg:bp_gs_vet');
  check('8a setup: the veteran\'s wardrobe is on the server',
    vetFirst.armorStash.length === 3 && vetFirst.shieldStash.length === 1 && vetFirst.gearStashCaptured === true,
    { armor: vetFirst.armorStash.length, shield: vetFirst.shieldStash.length });

  /* Device two, old client: four empty arrays. */
  const roomD2 = new GameRoom(makeState(vetStore), mockEnv);
  await join(roomD2, fakeWs('device2-old'), 'bp_gs_vet',
    { rpgArmorStash: [], rpgLegsStash: [], rpgShieldStash: [], rpgGearStash: [] });
  const psD2 = roomD2.playerState['bp_gs_vet'];
  check('device two sending four EMPTY lists does not erase the stored wardrobe',
    psD2.armorStash.length === 3 && psD2.legsStash.length === 1 && psD2.shieldStash.length === 1
      && psD2.gearStash.length === 2, { armor: psD2.armorStash.length, shield: psD2.shieldStash.length });

  /* Device two, new client: the keys are omitted entirely. */
  const roomD3 = new GameRoom(makeState(vetStore), mockEnv);
  await join(roomD3, fakeWs('device2-new'), 'bp_gs_vet', {});
  check('device two sending NO keys does not erase it either',
    roomD3.playerState['bp_gs_vet'].armorStash.length === 3, roomD3.playerState['bp_gs_vet'].armorStash.length);

  /* ...and the main phone, where the wardrobe actually lives, is still
     heard when it comes back -- the whole point of the open door.  It
     adds nothing, because the server already holds all of it. */
  const roomD4 = new GameRoom(makeState(vetStore), mockEnv);
  await join(roomD4, fakeWs('mainphone'), 'bp_gs_vet', clientClaim());
  check('the main phone is still heard afterwards, and adds nothing it already sent',
    roomD4.playerState['bp_gs_vet'].armorStash.length === 3, roomD4.playerState['bp_gs_vet'].armorStash.length);

  /* The gear that a LATER join brings is adopted rather than refused --
     this is the case a stamped, one-shot capture threw away. */
  const roomD5 = new GameRoom(makeState(vetStore), mockEnv);
  await join(roomD5, fakeWs('newpiece'), 'bp_gs_vet',
    { rpgArmorStash: [plate(), plate(), plate2(), { name: 'Iron Plate', gearBase: 'iron', tierMult: 3, tier: 't3' }] });
  check('a piece the server has never seen is still adopted on a later join',
    roomD5.playerState['bp_gs_vet'].armorStash.length === 4,
    roomD5.playerState['bp_gs_vet'].armorStash.map((g) => g.name));

  /* ── 8d. finding 2, second half: A RECORD ALREADY WRITTEN UNGRADED
     BY v2.3.2523 HEALS ON THE NEXT JOIN.  v2.3.2523 merged and
     deployed before this repair did, so armour is stored on real
     records with its grade stripped.  Re-opening the door does not fix
     that by itself: stashSig does not key on quality (a grade must not
     make one plate look like two), so the merge recognises the graded
     claim as a plate it already holds and takes no surplus.  The
     matched pair backfills the grade instead. */
  const gradeStore = new Map();
  const elite = () => ({ name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7, quality: 'elite' });
  /* Hand-build the damage v2.3.2523 did: the piece is stored, stamped
     captured, and its grade is gone. */
  await gradeStore.set('rpg:bp_gs_grade', {
    _v: RPG_SCHEMA_VERSION, coins: 0,
    armorStash: [{ name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7 }],
    legsStash: [], shieldStash: [], gearStash: [], amuletStash: [],
    gearStashCaptured: true,
  });
  const roomG = new GameRoom(makeState(gradeStore), mockEnv);
  await join(roomG, fakeWs('grade'), 'bp_gs_grade', { rpgArmorStash: [elite()] });
  const psG = roomG.playerState['bp_gs_grade'];
  check('a stripped grade is backfilled from the client\'s copy, not duplicated',
    psG.armorStash.length === 1 && psG.armorStash[0].quality === 'elite', psG.armorStash);
  check('...and it persisted', gradeStore.get('rpg:bp_gs_grade').armorStash[0].quality === 'elite');
  /* One-directional and absent-only: a grade the server already holds
     can never be overwritten or downgraded by a claim. */
  const downgraded = mergeStashLists('armorStash', [elite()],
    [{ name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7, quality: 'normal' }]);
  check('a claim cannot overwrite or downgrade a grade the server already holds',
    downgraded.length === 1 && downgraded[0].quality === 'elite', downgraded);
  /* Idempotent, like the rest of the merge. */
  const healedOnce = mergeStashLists('armorStash', [plate()], [elite()]);
  const healedTwice = mergeStashLists('armorStash', healedOnce, [elite()]);
  check('the backfill is idempotent (no second copy on a re-run)',
    healedOnce.length === 1 && healedTwice.length === 1 && healedTwice[0].quality === 'elite',
    { once: healedOnce.length, twice: healedTwice.length });

  /* ── 8b. finding 1c: A CLAIM THAT OVERFLOWS THE CAP MUST NOT STAMP.
     The merge's cap was tested; the consequence of stamping over a
     TRUNCATED capture was not.  32 pieces land, the rest do not, and
     the record must not claim the capture was complete. */
  const overStore = new Map();
  const roomOv = new GameRoom(makeState(overStore), mockEnv);
  await join(roomOv, fakeWs('overflow'), 'bp_gs_over',
    { rpgArmorStash: Array.from({ length: GEAR_STASH_CAP + 5 }, plate2) });
  const psOv = roomOv.playerState['bp_gs_over'];
  check('an over-cap claim keeps exactly GEAR_STASH_CAP pieces', psOv.armorStash.length === GEAR_STASH_CAP, psOv.armorStash.length);
  check('...and does NOT stamp the capture complete over the truncation', !psOv.gearStashCaptured, psOv.gearStashCaptured);
  check('the truncated capture persisted un-stamped (so it is still visibly open)',
    overStore.get('rpg:bp_gs_over').armorStash.length === GEAR_STASH_CAP
      && overStore.get('rpg:bp_gs_over').gearStashCaptured === false,
    overStore.get('rpg:bp_gs_over').gearStashCaptured);
  /* A within-cap claim on the same character DOES stamp: the rule is
     "not cut short", not "never overflowed". */
  const roomOv2 = new GameRoom(makeState(overStore), mockEnv);
  await join(roomOv2, fakeWs('overflow2'), 'bp_gs_over', { rpgLegsStash: [greaves()] });
  check('a later claim that fits stamps normally', roomOv2.playerState['bp_gs_over'].gearStashCaptured === true);

  /* ── 8c. finding 3: AN AMULET LIST ARRIVING FROM A CLIENT IS REFUSED.
     `amuletStash` has no client source (no unequip flow), so a claim
     for it can only be forged -- and _sanitizeAmulet would have passed
     these as LEGITIMATE mythic amulets, the most expensive thing in the
     forge.  The field and its migration stay; the ear for it is gone. */
  const amuStore = new Map();
  const roomAm = new GameRoom(makeState(amuStore), mockEnv);
  await join(roomAm, fakeWs('amulet'), 'bp_gs_amu', {
    rpgAmuletStash: Array.from({ length: 5 }, () => ({ tier: 'mythic', gem: 'flame', name: 'Mythic Flame' })),
    rpgArmorStash: [plate()],
  });
  const psAm = roomAm.playerState['bp_gs_amu'];
  check('a forged amulet claim is refused outright', psAm.amuletStash.length === 0, psAm.amuletStash);
  check('...and it never reached storage either', amuStore.get('rpg:bp_gs_amu').amuletStash.length === 0);
  check('...while the lists that DO have a client source still adopt', psAm.armorStash.length === 1, psAm.armorStash);
  check('the refused seed key does not leak onto playerState (ingest-only set)',
    !('rpgAmuletStash' in psAm), Object.keys(psAm).filter((k) => k.startsWith('rpg')));
}

/* ══════════════════════════════════════════════════════════════════
   9. PROVENANCE ACROSS A REAL JOIN (v2.3.2532, rewritten v2.3.2552)
   ══════════════════════════════════════════════════════════════════
   This section used to be about `_sv`: a boolean meaning "the server
   wrote this piece", which was the whole basis of the store's
   strict-provenance mode.  v2.3.2531 got it wrong in BOTH directions and
   neither was visible from a test that called a sanitizer directly —
   FORGEABLE (nothing stripped it off the join claim, the path that
   actually fills a stash) and LOST (the rebuilding sanitizers dropped a
   mark the server had genuinely set).

   v2.3.2552 RETIRES `_sv`.  The question it answered is now answered by
   `gear_prov:<playerId>` — a server-assigned id looked up in the player's
   own ledger — and the store gates on `_gearSellable` rather than on a
   flag.  The forgeable direction cannot exist for a derived field: there
   is nothing to strip because nothing is ever carried.  The lost
   direction cannot either, for the same reason.

   What is still worth driving through the REAL join, and is, is that a
   claim cannot promote itself, and that the retired field is swept out of
   the blobs that already carry it. */
{
  const wsP = fakeWs('prov-claim');
  await join(room, wsP, 'bp_gs_prov', {
    rpgArmorStash: [{ name: 'Forged Plate', gearBase: 'iron', tierMult: 3, tier: 't3', gid: 'g-made-up', prov: 'minted', _sv: true }],
    rpgGearStash: [{ slot: 'chest', gearId: 'forgedlook', name: 'Forged Look', gid: 'g-also-made-up', prov: 'minted', _sv: true }],
    rpgAmuletStash: [{ tier: 'mythic', gem: 'flame', name: 'Forged Amulet', gid: 'g-nope', prov: 'minted', _sv: true }],
  });
  const psP = room.playerState['bp_gs_prov'];
  check('a join claim cannot award itself a receipt number',
    psP.armorStash.length === 1 && psP.armorStash[0].gid === undefined
      && psP.armorStash[0].prov === 'legacy', psP.armorStash[0]);
  check('...nor on a cosmetic claim',
    psP.gearStash[0].gid === undefined && psP.gearStash[0].prov === 'legacy', psP.gearStash[0]);
  check('...and the retired `_sv` mark is swept off both on the way in',
    psP.armorStash[0]._sv === undefined && psP.gearStash[0]._sv === undefined, psP.armorStash[0]);
  /* v2.3.2533: the AMULET leg of this section met a stronger rule while
     this branch was in flight.  v2.3.2527 (#641, finding 3) removed the
     client ear for rpgAmuletStash outright — `amuletStash` has no client
     source, so a claim for it can only be forged — which means a forged
     amulet never lands at all.  §8c pins the refusal itself; asserted
     here too so this section keeps covering all three lists rather than
     going quiet about one of them. */
  check('...and a forged amulet claim never arrives at all (v2.3.2527)',
    psP.amuletStash.length === 0, psP.amuletStash);
  /* The point of the strip, stated the way the store now asks it: not
     "is the flag off" but "may this be sold", which is the question a
     listing actually puts (storegear.js _stGearEscrow). */
  check('...so the forged plate is refused as `legacy`, which is the point',
    room._gearSellable('bp_gs_prov', 'armor', psP.armorStash[0]).reason === 'legacy',
    room._gearSellable('bp_gs_prov', 'armor', psP.armorStash[0]));
  check('...and the forged outfit is refused as `cosmetic` — a different answer, by design',
    room._gearSellable('bp_gs_prov', 'gear', psP.gearStash[0]).reason === 'cosmetic',
    room._gearSellable('bp_gs_prov', 'gear', psP.gearStash[0]));
  /* The claim still ARRIVED — refusing to believe its provenance must not
     cost the player the piece, only its sellability.  (The amulet is the
     deliberate exception above: it is refused, not unmarked.) */
  check('...and the pieces themselves are still there, just unproven',
    psP.armorStash[0].name === 'Forged Plate' && psP.armorStash[0].tierMult === 3
      && psP.gearStash[0].gearId === 'forgedlook', psP.armorStash[0]);
}

/* The reverse: a piece the SERVER really minted keeps its provenance
   across a save, a restart and a fresh login — and, because the mark is
   DERIVED from the ledger rather than carried on the blob, it keeps it
   through the rebuilding sanitizers that used to lose `_sv`.
   And the piece whose row is gone comes back usable and unproven, never
   missing: the owner's decision, pinned. */
{
  const store2 = new Map();
  const room2 = new GameRoom(makeState(store2), mockEnv);
  const realPlate = { name: 'Server Plate', gearBase: 'iron', tierMult: 2, tier: 't2' };
  await store2.set('gear_prov:bp_gs_svd', {
    _v: 1, seq: 1, forgotten: 0,
    list: [{ id: 'g-real-1', slot: 'armor', src: 'drop', at: Date.now(), p: { ...realPlate } }],
  });
  await store2.set('rpg:bp_gs_svd', {
    _v: RPG_SCHEMA_VERSION, coins: 0, level: 1, gearStashCaptured: true,
    /* `_sv: true` is on these because real stored blobs carry it: the
       field shipped in v2.3.2531 and was written by every store delivery
       until v2.3.2552.  It must be swept, and must change nothing. */
    armorStash: [{ ...realPlate, gid: 'g-real-1', _sv: true },
                 { name: 'Orphaned Plate', gearBase: 'iron', tierMult: 2, tier: 't2', gid: 'g-row-is-gone', _sv: true }],
    legsStash: [], shieldStash: [],
    gearStash: [{ slot: 'chest', gearId: 'serverlook', name: 'Server Look', _sv: true }],
    amuletStash: [{ tier: 'regal', gem: 'frost', name: 'Server Amulet', _sv: true }],
  });
  await join(room2, fakeWs('prov-stored'), 'bp_gs_svd', {});
  const psS = room2.playerState['bp_gs_svd'];
  const held = psS.armorStash.find((g) => g.name === 'Server Plate');
  const orphan = psS.armorStash.find((g) => g.name === 'Orphaned Plate');
  check('a genuinely minted plate is still proved across a login',
    !!held && held.gid === 'g-real-1' && held.prov === 'minted', held);
  check('...and the store will take it', room2._gearSellable('bp_gs_svd', 'armor', 'g-real-1').ok === true,
    room2._gearSellable('bp_gs_svd', 'armor', 'g-real-1'));
  check('a piece whose row is gone comes back USABLE and unproven, never missing',
    !!orphan && orphan.tierMult === 2 && orphan.gid === undefined && orphan.prov === 'legacy', orphan);
  check('...and is refused with the honest reason rather than silently',
    room2._gearSellable('bp_gs_svd', 'armor', orphan).reason === 'legacy');
  check('a cosmetic survives the login and is never sellable, by design',
    psS.gearStash[0] && psS.gearStash[0].gearId === 'serverlook'
      && room2._gearSellable('bp_gs_svd', 'gear', psS.gearStash[0]).reason === 'cosmetic', psS.gearStash[0]);
  check('an amulet survives the login through the sanitizer that REBUILDS it',
    psS.amuletStash[0] && psS.amuletStash[0].name === 'Server Amulet', psS.amuletStash[0]);
  /* The tombstone: the retired field is gone from live state AND from the
     blob that gets written back, so it does not need a migration. */
  check('the retired `_sv` is swept off every stored list on the way in',
    psS.armorStash.every((g) => g._sv === undefined)
      && psS.gearStash.every((g) => g._sv === undefined)
      && psS.amuletStash.every((g) => g._sv === undefined),
    { a: psS.armorStash, g: psS.gearStash, m: psS.amuletStash });
  await room2._saveRpg('bp_gs_svd', psS);
  const savedS = store2.get('rpg:bp_gs_svd');
  check('...and it does not come back through _saveRpg\'s fixed field list either',
    savedS.armorStash.every((g) => g._sv === undefined)
      && savedS.gearStash.every((g) => g._sv === undefined), savedS.gearStash[0]);
  check('...while the receipt number itself DOES survive the save',
    savedS.armorStash.some((g) => g.gid === 'g-real-1'), savedS.armorStash);
  check('every part of the retired mark is gone from the room, not just unused',
    typeof room2._stGearListable === 'undefined' && typeof room2._stGearStrip === 'undefined',
    { listable: typeof room2._stGearListable, strip: typeof room2._stGearStrip });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
