/* GEAR PROVENANCE (v2.3.2534; spec docs/specs/gear-provenance.md).
 *
 * The server now records every piece of gear it mints, against the player
 * it minted it for, in `gear_prov:<playerId>`.  What this suite has to
 * prove is not that the happy path works -- it is that the three ways
 * this exact family of change has gone wrong in this repo cannot happen
 * here:
 *
 *   1. A ONE-SHOT STAMP THAT LIES.  #640 marked players "captured" whose
 *      gear it had never seen, and needed a repair (#641) plus a healing
 *      migration.  §7 proves there is no stamp to burn: the resolve runs
 *      on every join, a ledger write lost to a crash leaves the piece
 *      USABLE and unproven rather than gone, and the next mint still
 *      lands.
 *   2. A SAFETY MARK THE CLIENT CAN FORGE.  #643's `_sv` was stripped
 *      from the selector and not from the join claim -- the path that
 *      actually mattered -- and its test passed because it called the
 *      strip helper directly.  So §3 and §4 NEVER call stripProv: every
 *      forgery assertion here is driven through `webSocketMessage` and
 *      read back out of storage or playerState.
 *   3. RECONCILIATION BY SIGNATURE.  #643 told a stale duplicate from a
 *      real second copy by name|gearBase|tierMult|tier and deleted real
 *      gear.  §5 proves the id makes that unnecessary AND that the one
 *      place this does reconcile (two pieces bearing one id) DEMOTES
 *      rather than deletes -- the piece count never falls.
 *
 * Plus the owner's decision, which is the thing most worth pinning
 * because it is a promise to real players: §6 -- legacy gear keeps every
 * stat it had and is simply marked unsellable.
 */
import { GameRoom } from '../src/index.js';
import {
  GEAR_PROV_KEY, GEAR_PROV_CAP, GEAR_PROV_V, PROV_MINTED, PROV_LEGACY,
  emptyProvLedger, normalizeProvLedger, findProvRow, isGearProvSlot, claimedGid,
} from '../src/gearprov.js';

function makeState(store = new Map()) {
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
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
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);

async function join(roomRef, ws, id, data) {
  roomRef.sessions.set(ws, { id: null, name: 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await roomRef.state.storage.put('cadence:login:' + id, { period: roomRef._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await roomRef.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'T-' + id, phrase: 'p-' + id,
    data: { x: -100000, y: -100000, z: 'town', ...(data || {}) },
  }));
}
async function send(roomRef, ws, msg) {
  await roomRef.webSocketMessage(ws, JSON.stringify(msg));
}

/* ════════════════════════════════════════════════════════════════════
   1. The ledger's own shape: heal, cap, and the counter that admits it
   ════════════════════════════════════════════════════════════════════ */
{
  const e = emptyProvLedger();
  check('an empty ledger is {_v, seq, forgotten, list:[]}',
    e._v === GEAR_PROV_V && e.seq === 0 && e.forgotten === 0 && Array.isArray(e.list) && e.list.length === 0, e);

  /* Fail-open: a corrupt ledger must cost sellability, never a join. */
  check('junk heals to empty rather than throwing', normalizeProvLedger('nonsense').list.length === 0);
  check('null heals to empty', normalizeProvLedger(null).list.length === 0);
  const mixed = normalizeProvLedger({
    seq: 3, forgotten: -5, list: [
      { id: 'g1', slot: 'armor', p: { name: 'A' } },
      { id: 'g2', slot: 'not-a-slot', p: { name: 'B' } },   /* bad slot -> dropped */
      { id: '', slot: 'armor', p: { name: 'C' } },          /* no id -> dropped */
      { id: 'g4', slot: 'shield' },                         /* no piece -> dropped */
      'rubbish',
    ],
  });
  check('only well-formed rows survive the heal', mixed.list.length === 1 && mixed.list[0].id === 'g1', mixed.list);
  check('a negative forgotten count heals to 0', mixed.forgotten === 0, mixed.forgotten);

  /* The cap is FIFO and says out loud that it dropped something -- the
     one hole in this design, named in the module header and the spec
     rather than left for a reader to find. */
  const over = normalizeProvLedger({
    seq: 0, forgotten: 0,
    list: Array.from({ length: GEAR_PROV_CAP + 10 }, (_, i) => ({ id: 'g' + i, slot: 'armor', p: { n: i } })),
  });
  check('the ledger caps at GEAR_PROV_CAP', over.list.length === GEAR_PROV_CAP, over.list.length);
  check('...dropping the OLDEST rows, keeping the newest',
    over.list[over.list.length - 1].id === 'g' + (GEAR_PROV_CAP + 9) && over.list[0].id === 'g10',
    [over.list[0].id, over.list[over.list.length - 1].id]);
  check('...and counting what it forgot rather than forgetting silently', over.forgotten === 10, over.forgotten);

  check("'__proto__' is not a slot (frozen array, not an object lookup)", isGearProvSlot('__proto__') === false);
  check('a non-string gid claim resolves to none', claimedGid({ gid: { evil: true } }) === null);
  check('an over-long gid claim resolves to none', claimedGid({ gid: 'x'.repeat(80) }) === null);
}

/* ════════════════════════════════════════════════════════════════════
   2. Every mint path writes a row
   ════════════════════════════════════════════════════════════════════ */
const PID = 'bp_prov_a';
const wsA = fakeWs('A');
await join(room, wsA, PID);

let questShieldGid = null;
{
  const ps = room.playerState[PID];
  check('a fresh character starts with an empty ledger, not a missing one',
    !!room._gearProvOf(PID) && room._gearProvOf(PID).list.length === 0);

  /* ── the quest SHIELD (tut_1 grantOnAccept -- the first gear most
        characters ever own) ── */
  ps.shield = null;
  room._grantQuestItem(ps, { kind: 'shield', gearBase: 'wood', tierMult: 1.0, name: 'Pine Shield' }, PID);
  questShieldGid = ps.shield && ps.shield.gid;
  check('a granted quest shield carries a server-assigned id',
    typeof questShieldGid === 'string' && questShieldGid.length > 1, ps.shield);
  check('...and is marked minted', ps.shield.prov === PROV_MINTED, ps.shield.prov);
  check('...with a row naming the slot it was minted into',
    !!findProvRow(room._gearProvOf(PID), questShieldGid)
      && findProvRow(room._gearProvOf(PID), questShieldGid).slot === 'shield');

  /* ── quest ARMOUR (overflows to the client's bag; the server keeps no
        copy at all, which is exactly why it needs an id) ── */
  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID);
  const over = ps._questGrantOverflow || [];
  check('quest armour handed to the client carries an id too',
    over.length === 1 && typeof over[0].gid === 'string' && over[0].prov === PROV_MINTED, over[0]);
  check('...recorded in the armor slot, not the shield slot',
    findProvRow(room._gearProvOf(PID), over[0].gid).slot === 'armor');

  /* ── the armour DROP, through the real pickup handler ── */
  room._rollShardForKill = () => null;
  room._rollWeaponDropForKill = () => null;
  room._rollIronWeaponForKill = () => null;
  room.loot = {};
  room.eventBuffer = [];
  Object.assign(ps, { x: 100, y: 100, z: 'town', dead: false, disconnected: false });
  const realRandom = Math.random;
  Math.random = () => 0;      /* everything drops */
  const pile = room._spawnLootForKill('town', { id: 'mp1', arch: 'slime', variant: null, level: 5, x: 100, y: 100, gold: 0, xp: 10 },
    PID, [PID], { [PID]: 1 });
  Math.random = realRandom;
  check('the kill pile carries two armour pieces (guard)', !!pile && pile.armor && pile.armor.length === 2, pile && pile.armor);
  check('the pile itself is NOT stamped -- a kill mints nothing for nobody',
    pile.armor.every((a) => !a.gid && !a.prov), pile.armor);

  const before = room._gearProvOf(PID).list.length;
  await send(room, wsA, { type: 'loot_pickup', payload: { lootId: pile.lootId, zone: 'town' } });
  const credit = wsA.sent.filter((m) => m.type === 'loot_credit').pop();
  check('the picker is credited both pieces', !!credit && credit.payload.armor && credit.payload.armor.length === 2,
    credit && credit.payload.armor);
  check('...each carrying an id and the minted mark',
    credit.payload.armor.every((a) => typeof a.gid === 'string' && a.prov === PROV_MINTED), credit.payload.armor);
  check('...rows written for both, at pickup (when ownership is decided), not at the kill',
    room._gearProvOf(PID).list.length === before + 2, [before, room._gearProvOf(PID).list.length]);
  check('...one row per slot, chest and legs',
    credit.payload.armor.map((a) => findProvRow(room._gearProvOf(PID), a.gid).slot).sort().join(',') === 'armor,legsArmor');

  /* The pile stays public.  A gid has no business on a room-wide
     broadcast, so the claimant's copies are copies. */
  const wire = room._serializePile(pile);
  check('the public pile never carries a gid or a prov mark',
    (wire.armor || []).every((a) => !a.gid && !a.prov), wire.armor);
  check('...and the pile objects themselves are still unmarked',
    pile.armor.every((a) => !a.gid), pile.armor);
}

/* ── the AMULET forge: the only path that can ever mint an amulet ── */
let amuletGid = null;
{
  const ps = room.playerState[PID];
  ps.goldBars = 99; ps.coins = 9999999;
  ps.lifeSkills = ps.lifeSkills || {};
  ps.lifeSkills.blacksmithing = { level: 99, xp: 0 };
  ps.lifeSkills.gems = { polished_flame: 1 };
  await send(room, wsA, { type: 'amulet_forge_request', payload: { op: 'craft', tierKey: 'simple' } });
  amuletGid = ps.amulet && ps.amulet.gid;
  check('a forged amulet is recorded', typeof amuletGid === 'string' && ps.amulet.prov === PROV_MINTED, ps.amulet);

  /* THE ROW FOLLOWS THE PIECE.  Slotting a gem rewrites the amulet; if
     the row did not follow, a reconnect would rebuild the mint-time copy
     and the gem would be gone.  This is not hypothetical -- it is what
     amulet.test.mjs caught against the first cut of the resolve. */
  await send(room, wsA, { type: 'amulet_forge_request', payload: { op: 'gem', gem: 'flame' } });
  check('slotting a gem keeps the piece minted', ps.amulet.gem === 'flame' && ps.amulet.prov === PROV_MINTED, ps.amulet);
  check("...and the ledger row follows it, so a rebuild wouldn't lose the gem",
    findProvRow(room._gearProvOf(PID), amuletGid).p.gem === 'flame',
    findProvRow(room._gearProvOf(PID), amuletGid).p);
}

/* The ledger is its OWN storage key (handoff rule 1: nothing new goes in
   the rpg blob) and there is exactly one of them per player. */
{
  const ps = room.playerState[PID];
  await room._saveRpg(PID, ps);
  const blob = state._store.get('rpg:' + PID);
  check('the ledger is NOT a field on the rpg blob (rule 1)',
    !('gearProv' in blob) && !('gear_prov' in blob) && !('provLedger' in blob), Object.keys(blob).filter((k) => /prov/i.test(k)));
  check('it lives under its own registered prefix', !!state._store.get(GEAR_PROV_KEY(PID)));
  check('...one key per player, never a scan',
    [...state._store.keys()].filter((k) => k.startsWith('gear_prov:')).length === 1);
  check('the minted shield survives the fixed field list with its id',
    blob.shield && blob.shield.gid === questShieldGid && blob.shield.prov === PROV_MINTED, blob.shield);
}

/* ════════════════════════════════════════════════════════════════════
   3. The inbound JOIN claim -- driven through webSocketMessage, never
      through the strip helper (the #643 lesson)
   ════════════════════════════════════════════════════════════════════ */
{
  const realGid = questShieldGid;
  const ws2 = fakeWs('A2');
  /* A modified client returns, claiming:
       - a stash plate marked `prov: 'minted'` out of thin air;
       - a stash plate wearing a REAL id of ours, on an inflated piece;
       - a plate with an id we never issued;
       - a plate whose id is '__proto__'. */
  await join(room, ws2, PID, {
    rpgArmorStash: [
      { name: 'Forged Plate', gearBase: 'iron', tierMult: 8, prov: PROV_MINTED },
      { name: 'Godly Iron Plate', gearBase: 'iron', tierMult: 8, quality: 'godly', gid: realGid, prov: PROV_MINTED },
      { name: 'Ghost Plate', gearBase: 'iron', tierMult: 8, gid: 'g-never-issued' },
      { name: 'Proto Plate', gearBase: 'iron', tierMult: 8, gid: '__proto__' },
    ],
  });
  const ps = room.playerState[PID];
  const stash = ps.armorStash || [];
  const byName = (n) => stash.find((g) => g.name === n);

  check('a self-asserted prov mark on a join claim is not believed',
    !!byName('Forged Plate') && byName('Forged Plate').prov === PROV_LEGACY, byName('Forged Plate'));
  check('an id we never issued is not believed',
    !!byName('Ghost Plate') && byName('Ghost Plate').prov === PROV_LEGACY && !byName('Ghost Plate').gid, byName('Ghost Plate'));
  check("an id of '__proto__' resolves to nothing and does not crash the join",
    !!byName('Proto Plate') && byName('Proto Plate').prov === PROV_LEGACY, byName('Proto Plate'));
  /* This one wears a REAL id -- the quest shield's.  A shield is not an
     armour piece, so the slot check refuses it: the id buys nothing, and
     what is left is an ordinary unproven claim.  It is NOT deleted (the
     player keeps what they had; see §6) -- it simply cannot be sold. */
  check('a REAL id in the WRONG slot buys nothing',
    !!byName('Godly Iron Plate') && byName('Godly Iron Plate').prov === PROV_LEGACY
      && !byName('Godly Iron Plate').gid, byName('Godly Iron Plate'));
  check('...and the grade it tried to smuggle in was stripped',
    !byName('Godly Iron Plate').quality, byName('Godly Iron Plate'));
  check('...while the real shield that id names is untouched and still proven',
    ps.shield && ps.shield.gid === realGid && ps.shield.prov === PROV_MINTED, ps.shield);
  check('every entry in the claimed stash landed unproven',
    stash.every((g) => g.prov === PROV_LEGACY && !g.gid), stash);
  check('nothing the client claimed was DELETED -- four in, four out',
    stash.length === 4, stash.length);

  /* And the same through the WORN bootstrap seed, which is the widest
     gear-trust surface in the game. */
  check('the reconnect kept the real minted shield (ours, verified by id)',
    ps.shield && ps.shield.gid === realGid && ps.shield.prov === PROV_MINTED, ps.shield);
  check('...and the minted amulet, gem intact',
    ps.amulet && ps.amulet.gid === amuletGid && ps.amulet.gem === 'flame' && ps.amulet.prov === PROV_MINTED, ps.amulet);

  /* Nothing forged reached DURABLE storage either -- the assertion the
     #643 test was missing.  Read the blob, not the helper. */
  await room._saveRpg(PID, ps);
  const blob = state._store.get('rpg:' + PID);
  check('...and none of it reached storage as minted',
    (blob.armorStash || []).every((g) => g.prov === PROV_LEGACY && !g.gid), blob.armorStash);
}

/* Same-id-on-a-same-slot claim: the piece is rebuilt from OUR row, so the
   claim's inflated numbers are discarded rather than stored. */
{
  const PID2 = 'bp_prov_b';
  const wsB = fakeWs('B');
  await join(room, wsB, PID2);
  const ps = room.playerState[PID2];
  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID2);
  const realArmorGid = ps._questGrantOverflow[0].gid;

  const wsB2 = fakeWs('B2');
  await join(room, wsB2, PID2, {
    rpgArmorStash: [{ name: 'Godly Iron Plate', gearBase: 'iron', tierMult: 8, quality: 'godly', gid: realArmorGid }],
  });
  const got = (room.playerState[PID2].armorStash || [])[0];
  check('a real id on the RIGHT slot returns OUR piece, not theirs',
    !!got && got.name === 'Copper Torso' && got.tierMult === 1 && got.prov === PROV_MINTED, got);
  check('...and the claimed grade came nowhere near it', !got.quality, got);
}

/* ════════════════════════════════════════════════════════════════════
   4. The inbound EQUIP claim (stats_update) -- the path that feeds the
      damage maths, and the one #643's mark was not stripped on
   ════════════════════════════════════════════════════════════════════ */
{
  const PID3 = 'bp_prov_c';
  const wsC = fakeWs('C');
  await join(room, wsC, PID3);
  const ps = room.playerState[PID3];
  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID3);
  const gid = ps._questGrantOverflow[0].gid;
  /* Defense points would otherwise gate the swap; grandfather it by
     equipping the modest piece the server itself minted. */
  room._prog3EquipOk = () => true;

  await send(room, wsC, { type: 'stats_update', payload: { armor: { name: 'Forged Plate', tierMult: 8, prov: PROV_MINTED } } });
  check('a forged prov mark on stats_update is not believed',
    ps.armor && ps.armor.prov === PROV_LEGACY && !ps.armor.gid, ps.armor);
  check('...and legacy armour still EQUIPS and still counts',
    ps.armor.name === 'Forged Plate' && ps.armor.tierMult === 8, ps.armor);

  await send(room, wsC, { type: 'stats_update', payload: { armor: { name: 'Godly Iron Plate', tierMult: 8, quality: 'godly', gid } } });
  check('a real id on stats_update hands back OUR piece, not the claim',
    ps.armor && ps.armor.name === 'Copper Torso' && ps.armor.tierMult === 1 && ps.armor.prov === PROV_MINTED, ps.armor);
  check('...with the claimed grade discarded', !ps.armor.quality, ps.armor);

  await send(room, wsC, { type: 'stats_update', payload: { legsArmor: { name: 'Greaves', tierMult: 4, gid, prov: PROV_MINTED } } });
  check('a chest-slot id cannot be worn as legs',
    ps.legsArmor && ps.legsArmor.prov === PROV_LEGACY && !ps.legsArmor.gid, ps.legsArmor);

  /* Unequip must still work: absent means no opinion, null means take it
     off -- unchanged by any of this. */
  await send(room, wsC, { type: 'stats_update', payload: { armor: null } });
  check('unequip still empties the slot', ps.armor === null, ps.armor);
}

/* ════════════════════════════════════════════════════════════════════
   4b. v2.3.2535 -- EQUIPPING BY NAME (`armorRef` / `legsArmorRef`)
   ════════════════════════════════════════════════════════════════════ */
{
  const PID = 'bp_prov_ref';
  const ws = fakeWs('R');
  await join(room, ws, PID);
  const ps = room.playerState[PID];
  room._prog3EquipOk = () => true;

  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID);
  const armorGid = ps._questGrantOverflow[0].gid;
  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'legs', name: 'Copper Greaves', mat: 'copper', tierMult: 1 }, PID);
  const legsGid = ps._questGrantOverflow[0].gid;

  await send(room, ws, { type: 'stats_update', payload: { armorRef: armorGid } });
  check('naming a recorded piece equips the SERVER\'s copy of it',
    ps.armor && ps.armor.name === 'Copper Torso' && ps.armor.gid === armorGid && ps.armor.prov === PROV_MINTED, ps.armor);
  check('...and nothing about the piece travelled on the wire to inflate',
    ps.armor.tierMult === 1 && !ps.armor.quality, ps.armor);

  await send(room, ws, { type: 'stats_update', payload: { legsArmorRef: legsGid } });
  check('the legs slot rides the same lane', ps.legsArmor && ps.legsArmor.gid === legsGid, ps.legsArmor);

  /* A ref that names nothing is a REFUSAL, not a fall-through.  This is
     the assertion that stops the lane being decorative: if a miss quietly
     accepted whatever else was in the payload, naming a piece would be no
     stronger than describing one. */
  await send(room, ws, { type: 'stats_update', payload: { armorRef: 'g-never-issued' } });
  check('a ref naming nothing keeps what is already worn',
    ps.armor && ps.armor.gid === armorGid, ps.armor);
  await send(room, ws, { type: 'stats_update', payload: { armorRef: legsGid } });
  check('a ref naming a piece from ANOTHER slot is refused too',
    ps.armor && ps.armor.gid === armorGid, ps.armor);
  await send(room, ws, { type: 'stats_update', payload: { armorRef: '__proto__' } });
  check("a ref of '__proto__' resolves to nothing and changes nothing",
    ps.armor && ps.armor.gid === armorGid, ps.armor);

  /* A ref NEVER falls through to a describe in the same message -- the
     whole point of the ref winning is that the object beside it is
     ignored, or a client could name a modest piece and describe a
     godly one and have the second honoured. */
  await send(room, ws, { type: 'stats_update', payload: { armorRef: 'g-never-issued', armor: { name: 'Godly Plate', tierMult: 8 } } });
  check('a ref does NOT fall through to an object sent alongside it',
    ps.armor && ps.armor.gid === armorGid && ps.armor.name === 'Copper Torso', ps.armor);

  /* Null is unequip, on both lanes. */
  await send(room, ws, { type: 'stats_update', payload: { armorRef: null } });
  check('a null ref unequips', ps.armor === null, ps.armor);

  /* The DESCRIBE lane still works, because a legacy piece has no id to
     name -- which is why the old path cannot simply be deleted. */
  await send(room, ws, { type: 'stats_update', payload: { armor: { name: 'Old Plate', tierMult: 2 } } });
  check('the describe lane still equips a legacy piece (there is no id to name)',
    ps.armor && ps.armor.name === 'Old Plate' && ps.armor.prov === PROV_LEGACY, ps.armor);

  /* Both lanes go through ONE gate.  Proven by turning a gate on and
     checking the ref lane obeys it -- a copied gate is the bug shape
     where the new lane silently skips a check. */
  room._prog3EquipOk = () => false;
  await send(room, ws, { type: 'stats_update', payload: { armorRef: armorGid } });
  check('the ref lane obeys the defence-point gate (one gate, not two)',
    ps.armor && ps.armor.name === 'Old Plate', ps.armor);
  room._prog3EquipOk = () => true;

  room._threatGearLocked = () => true;
  await send(room, ws, { type: 'stats_update', payload: { armorRef: armorGid } });
  check('...and the guard gear-lock', ps.armor && ps.armor.name === 'Old Plate', ps.armor);
  room._threatGearLocked = () => false;

  await send(room, ws, { type: 'stats_update', payload: { armorRef: armorGid } });
  check('...and equips normally once both gates open', ps.armor && ps.armor.gid === armorGid, ps.armor);

  /* Deploy-order: an OLD client that has never heard of refs sends only
     objects, and the worker still takes them. */
  await send(room, ws, { type: 'stats_update', payload: { armor: { name: 'Old Plate', tierMult: 2 } } });
  check('an old client sending only the object is still understood',
    ps.armor && ps.armor.name === 'Old Plate', ps.armor);
}

/* ════════════════════════════════════════════════════════════════════
   5. One mint, one piece -- demotion, never deletion
   ════════════════════════════════════════════════════════════════════ */
{
  const PID4 = 'bp_prov_d';
  const wsD = fakeWs('D');
  await join(room, wsD, PID4);
  const ps = room.playerState[PID4];
  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID4);
  const gid = ps._questGrantOverflow[0].gid;

  const wsD2 = fakeWs('D2');
  await join(room, wsD2, PID4, {
    rpgArmorStash: [
      { name: 'Copper Torso', mat: 'copper', tierMult: 1, gid },
      { name: 'Copper Torso', mat: 'copper', tierMult: 1, gid },
      { name: 'Copper Torso', mat: 'copper', tierMult: 1, gid },
    ],
  });
  const stash = room.playerState[PID4].armorStash || [];
  check('three copies of one id do not become three provable pieces',
    stash.filter((g) => g.prov === PROV_MINTED).length === 1, stash.map((g) => g.prov));
  check('...the other two are DEMOTED to legacy, not deleted',
    stash.length === 3 && stash.filter((g) => g.prov === PROV_LEGACY).length === 2, stash);
  check('...and a demoted piece keeps every stat it had',
    stash.filter((g) => g.prov === PROV_LEGACY).every((g) => g.name === 'Copper Torso' && g.tierMult === 1), stash);

  /* Worn beats stashed: the worn slot is the one the damage maths reads. */
  const wsD3 = fakeWs('D3');
  room._prog3EquipOk = () => true;
  await join(room, wsD3, PID4, { rpgArmorStash: [{ name: 'Copper Torso', mat: 'copper', tierMult: 1, gid }] });
  const ps4 = room.playerState[PID4];
  ps4.armor = { name: 'Copper Torso', mat: 'copper', tierMult: 1, gid, prov: PROV_MINTED };
  room._gearProvDedupe(ps4);
  check('when a piece is both worn and stashed, the WORN one keeps the proof',
    ps4.armor.prov === PROV_MINTED && (ps4.armorStash || []).every((g) => g.prov === PROV_LEGACY),
    { worn: ps4.armor.prov, stash: (ps4.armorStash || []).map((g) => g.prov) });
  check('...and the stash entry is still there (nothing reconciled away)',
    (ps4.armorStash || []).length >= 1, ps4.armorStash);

  /* Two GENUINELY different pieces with identical names keep both proofs
     -- the case #643's signature reconciliation got wrong. */
  ps4._questGrantOverflow = null;
  room._grantQuestItem(ps4, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID4);
  const gid2 = ps4._questGrantOverflow[0].gid;
  check('a second mint of an identical-looking piece gets its OWN id', gid2 !== gid, [gid, gid2]);
  const two = { armorStash: [
    { name: 'Copper Torso', mat: 'copper', tierMult: 1, gid, prov: PROV_MINTED },
    { name: 'Copper Torso', mat: 'copper', tierMult: 1, gid: gid2, prov: PROV_MINTED },
  ] };
  room._gearProvDedupe(two);
  check('two identical-looking pieces with different ids BOTH stay provable',
    two.armorStash.every((g) => g.prov === PROV_MINTED), two.armorStash);
}

/* ════════════════════════════════════════════════════════════════════
   6. The owner's decision: legacy gear works, it just cannot be sold
   ════════════════════════════════════════════════════════════════════ */
{
  const PID5 = 'bp_prov_e';
  const wsE = fakeWs('E');
  /* A veteran arriving with a wardrobe nobody can prove -- the state of
     every existing character on the day this ships. */
  await join(room, wsE, PID5, {
    rpgArmor: { name: 'Elite Copper Torso', mat: 'copper', tierMult: 2, quality: 'elite' },
    rpgShield: { name: 'Pine Shield', gearBase: 'wood', tierMult: 1 },
    rpgArmorStash: [{ name: 'Spare Plate', mat: 'iron', tierMult: 2 }],
    rpgShieldStash: [{ name: 'Spare Shield', gearBase: 'wood', tierMult: 1 }],
    rpgGearStash: [{ slot: 'chest', gearId: 'copperplate', name: 'Copper Plate' }],
  });
  const ps = room.playerState[PID5];
  check('legacy worn armour is still worn', !!ps.armor && ps.armor.name === 'Elite Copper Torso', ps.armor);
  check('...with its tier multiplier intact, so it still protects', ps.armor.tierMult === 2, ps.armor);
  check('...marked legacy so the client can say WHY it cannot be listed',
    ps.armor.prov === PROV_LEGACY && !ps.armor.gid, ps.armor);
  check('legacy shield likewise', !!ps.shield && ps.shield.prov === PROV_LEGACY && ps.shield.name === 'Pine Shield', ps.shield);
  check('legacy stash pieces likewise',
    (ps.armorStash || []).length === 1 && ps.armorStash[0].prov === PROV_LEGACY
      && (ps.shieldStash || []).length === 1 && ps.shieldStash[0].prov === PROV_LEGACY,
    { a: ps.armorStash, s: ps.shieldStash });
  check('cosmetics have no server mint path at all, so they are all legacy',
    (ps.gearStash || []).length === 1 && ps.gearStash[0].prov === PROV_LEGACY, ps.gearStash);
  check('the provable-ownership question answers NO for every one of them',
    !room._gearProvOwned(PID5, 'armor', ps.armor)
      && !room._gearProvOwned(PID5, 'shield', ps.shield)
      && !room._gearProvOwned(PID5, 'armor', ps.armorStash[0]));

  /* And the echo carries the mark, so a client can read it. */
  const wsE2 = fakeWs('E2');
  room._sendPlayerState(wsE2, PID5);
  const snap = wsE2.sent.filter((m) => m.type === 'player_state').pop();
  check('player_state echoes the mark on the worn piece',
    !!snap && snap.payload.armor && snap.payload.armor.prov === PROV_LEGACY, snap && snap.payload.armor);
}

/* ════════════════════════════════════════════════════════════════════
   7. No "done" stamp anywhere -- the #640 shape cannot happen here
   ════════════════════════════════════════════════════════════════════ */
{
  const PID6 = 'bp_prov_f';
  const wsF = fakeWs('F');
  await join(room, wsF, PID6);
  const ps = room.playerState[PID6];
  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID6);
  const gid = ps._questGrantOverflow[0].gid;
  await room._saveRpg(PID6, ps);

  /* A join from a device that has NOTHING to say.  #640 would have
     stamped this player "captured"; there is no stamp to write. */
  const wsF2 = fakeWs('F2');
  await join(room, wsF2, PID6);
  const led = state._store.get(GEAR_PROV_KEY(PID6));
  check('an empty-handed join writes no "handled this player" mark anywhere',
    led && led.list.length === 1 && !('captured' in led) && !('done' in led), led && Object.keys(led));

  /* ...and the ledger still answers for the piece afterwards. */
  const wsF3 = fakeWs('F3');
  await join(room, wsF3, PID6, { rpgArmorStash: [{ name: 'Copper Torso', mat: 'copper', tierMult: 1, gid }] });
  const after = (room.playerState[PID6].armorStash || [])[0];
  check('...so a later join from the RIGHT device still resolves the piece as minted',
    !!after && after.prov === PROV_MINTED && after.gid === gid, after);

  /* THE CRASH SHAPE.  A mint whose ledger write is lost leaves a piece
     carrying an id with no row.  It must come back USABLE and unproven
     -- never missing, and never trusted. */
  const PID7 = 'bp_prov_g';
  const wsG = fakeWs('G');
  await join(room, wsG, PID7);
  const psG = room.playerState[PID7];
  const realPut = state.storage.put;
  state.storage.put = async (k, v) => { if (k.startsWith('gear_prov:')) return; return realPut(k, v); };
  psG._questGrantOverflow = null;
  room._grantQuestItem(psG, { kind: 'armor', name: 'Lost Plate', mat: 'iron', tierMult: 2 }, PID7);
  const lostGid = psG._questGrantOverflow[0].gid;
  state.storage.put = realPut;
  check('a mint whose ledger write is lost still hands the piece over', !!lostGid);

  const wsG2 = fakeWs('G2');
  await join(room, wsG2, PID7, { rpgArmorStash: [{ name: 'Lost Plate', mat: 'iron', tierMult: 2, gid: lostGid }] });
  const lost = (room.playerState[PID7].armorStash || [])[0];
  check('...and after the crash the piece is STILL THERE, at full stats',
    !!lost && lost.name === 'Lost Plate' && lost.tierMult === 2, lost);
  check('...simply unproven -- it fails toward legacy, never toward lost or forged',
    lost.prov === PROV_LEGACY && !lost.gid, lost);

  /* Recovery: the ledger is not wedged.  The very next mint lands. */
  room._grantQuestItem(room.playerState[PID7], { kind: 'shield', gearBase: 'wood', tierMult: 1, name: 'Pine Shield' }, PID7);
  check('...and the next mint after the crash records normally',
    room.playerState[PID7].shield && room.playerState[PID7].shield.prov === PROV_MINTED,
    room.playerState[PID7].shield);
}

/* ════════════════════════════════════════════════════════════════════
   8. Nothing about the ledger reaches other players
   ════════════════════════════════════════════════════════════════════
   v2.3.2537: this section USED TO search the broadcast for the words
   `gear_prov` and `forgotten` and nothing else -- so it passed with a
   clean conscience while every `gid` in the room went out on it.  A test
   whose name promises more than it checks is what gave #643 its false
   confidence, so the setup below deliberately puts a MINTED piece on a
   player first: without that, the assertion is vacuous whatever it greps
   for. */
{
  const PID8 = 'bp_prov_peer';
  const ws8 = fakeWs('P8');
  await join(room, ws8, PID8);
  const ps8 = room.playerState[PID8];
  room._prog3EquipOk = () => true;
  ps8.shield = null;
  room._grantQuestItem(ps8, { kind: 'shield', gearBase: 'wood', tierMult: 1, name: 'Pine Shield' }, PID8);
  ps8._questGrantOverflow = null;
  room._grantQuestItem(ps8, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PID8);
  const wornGid = ps8._questGrantOverflow[0].gid;
  ps8.armor = { ...ps8._questGrantOverflow[0] };
  ps8.armorStash = [{ ...ps8._questGrantOverflow[0] }];

  check('guard: the player really is carrying minted gear before we look',
    !!ps8.shield.gid && !!ps8.armor.gid && !!(ps8.armorStash[0] || {}).gid,
    { s: ps8.shield.gid, a: ps8.armor.gid });

  const all = room.getAllPlayerData();
  const blob = JSON.stringify(all || {});
  check('no gear_prov ledger rides the room-wide state_sync',
    !/gear_prov/.test(blob) && !/"forgotten"/.test(blob));
  check('...and no gear ID rides it either -- searched for, not assumed',
    !/"gid"/.test(blob) && blob.indexOf(wornGid) === -1, blob.slice(0, 300));
  check('...nor the provenance mark, which is nobody else\'s business',
    !/"prov"/.test(blob));
  check('the WORN slots are what got cropped, and they are still there',
    !!all[PID8].armor && all[PID8].armor.name === 'Copper Torso' && !all[PID8].armor.gid,
    all[PID8].armor);
  check('...the stash lists too', Array.isArray(all[PID8].armorStash)
    && all[PID8].armorStash.length === 1 && !all[PID8].armorStash[0].gid, all[PID8].armorStash);
  /* The scratch field a field-name crop missed.  Named explicitly so a
     future refactor back to an allowlist fails right here. */
  check('...and the quest-reward scratch, which a field-name crop missed',
    !Array.isArray(all[PID8]._questGrantOverflow)
      || all[PID8]._questGrantOverflow.every((g) => !g.gid && !g.prov),
    all[PID8]._questGrantOverflow);

  /* The crop must not damage the server's OWN copy -- it works on the
     caller's fresh spread, never on playerState. */
  check('cropping the broadcast did not strip the live state',
    ps8.armor.gid === wornGid && ps8.armor.prov === PROV_MINTED, ps8.armor);
  /* ...and the player's own player_state still carries the mark, which is
     the whole point of having one. */
  const wsOwn = fakeWs('P8own');
  room._sendPlayerState(wsOwn, PID8);
  const own = wsOwn.sent.filter((m) => m.type === 'player_state').pop();
  check('the player\'s OWN player_state still carries their id and mark',
    !!own && own.payload.armor && own.payload.armor.gid === wornGid
      && own.payload.armor.prov === PROV_MINTED, own && own.payload.armor);
}

/* ════════════════════════════════════════════════════════════════════
   10. v2.3.2537 -- a mutation the row has to follow: gem EXTRACTION
   ════════════════════════════════════════════════════════════════════
   The spec's rule is "any server-side op that mutates a minted piece must
   call _gearProvTouch".  The gem-SLOT op obeyed it; the gem-EXTRACT op did
   not, so the ledger kept the gem that had just been pulled out.  Latent
   while nothing rebuilds routinely -- and v2.3.2535 makes rebuilding the
   normal way to equip, at which point extract, unequip, re-equip returns
   the gem.  Free gems on a loop.
   ════════════════════════════════════════════════════════════════════ */
{
  const PIDX = 'bp_prov_extract';
  const wsX = fakeWs('X');
  await join(room, wsX, PIDX);
  const ps = room.playerState[PIDX];
  ps.shield = null;
  room._grantQuestItem(ps, { kind: 'shield', gearBase: 'wood', tierMult: 1, name: 'Pine Shield' }, PIDX);
  const gid = ps.shield.gid;
  /* A shield carrying a gem.  The slotting itself is still client-local
     (handoff item A), so this is set the way a real one arrives -- on the
     blob -- rather than through an op the server does not yet own. */
  ps.shield.gem = 'flame';
  ps.shield.name = 'Pine Flame Shield';
  room._gearProvTouch(PIDX, ps.shield);
  check('guard: the ledger holds the gemmed shield before extraction',
    findProvRow(room._gearProvOf(PIDX), gid).p.gem === 'flame');

  ps.coins = 9999999;
  ps.lifeSkills = ps.lifeSkills || {};
  ps.lifeSkills.gems = {};
  await send(room, wsX, { type: 'amulet_forge_request', payload: { op: 'extract', target: 'shield' } });
  check('extraction strips the gem from the live shield',
    ps.shield.gem === null, ps.shield);
  check('...and credits the polished gem', (ps.lifeSkills.gems.polished_flame || 0) === 1, ps.lifeSkills.gems);
  check('...AND the ledger row follows it',
    findProvRow(room._gearProvOf(PIDX), gid).p.gem === null,
    findProvRow(room._gearProvOf(PIDX), gid).p);

  /* The assertion that actually matters: force a REBUILD from the record
     (the path a claim takes, and the path equipping-by-name will take) and
     prove the gem does not come back. */
  const rebuilt = room._gearProvResolve(PIDX, 'shield', { gid }, null);
  check('a piece rebuilt from the record does NOT get the gem back',
    !!rebuilt && rebuilt.gem === null && rebuilt.prov === PROV_MINTED, rebuilt);
  /* The stripped name is what _stripGems builds from the tier label, which
     for gearBase 'wood' is "Wood Shield" -- not the "Pine Shield" the quest
     grant names it.  Asserted as the code actually behaves: the point here
     is that the ROW followed the mutation, not that the mutation picked a
     particular label. */
  check('...and the rebuilt name is the stripped one, not the gemmed one',
    rebuilt.name === 'Wood Shield', rebuilt.name);

  /* And through a real reconnect, claiming the id in the stash seed. */
  const wsX2 = fakeWs('X2');
  await join(room, wsX2, PIDX, { rpgShieldStash: [{ name: 'Pine Flame Shield', gem: 'flame', gearBase: 'wood', tierMult: 1, gid }] });
  const claimed = (room.playerState[PIDX].shieldStash || [])[0];
  check('...and a reconnect claiming the gemmed shield still gets the stripped one',
    !!claimed && claimed.gem === null, claimed);
}

/* ════════════════════════════════════════════════════════════════════
   11. v2.3.2537 -- restarting the character takes the record with it
   ════════════════════════════════════════════════════════════════════
   The ledger is keyed by player id and a restart does not change the id
   (the passphrase IS the character).  Left behind, it would rebuild an old
   wardrobe as `minted` on a brand-new level-1 character -- and two tabs
   share one identity by design, so the other tab can hand it straight
   back.  Nothing is multiplied; it comes back PROVABLE, which v2.3.2536
   turns into sellable.
   ════════════════════════════════════════════════════════════════════ */
{
  const PIDR = 'bp_prov_reset';
  const wsR = fakeWs('R1');
  await join(room, wsR, PIDR);
  const ps = room.playerState[PIDR];
  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PIDR);
  const gid = ps._questGrantOverflow[0].gid;
  await room._saveRpg(PIDR, ps);
  check('guard: the record exists before the restart', !!state._store.get(GEAR_PROV_KEY(PIDR)));

  await room._resetCharacterData(PIDR);
  check('a character restart deletes the gear record', !state._store.get(GEAR_PROV_KEY(PIDR)));
  check('...and drops the in-memory copy with it', !room._gearProvOf(PIDR));
  check('...and still snapshots the old blob, as it always did',
    [...state._store.keys()].some((k) => k.startsWith('rpgsnap:' + PIDR + ':prereset-')));

  /* The second tab hands the old wardrobe back.  It is NOT refused -- the
     player keeps what they claim, per the legacy decision -- but it can no
     longer come back provable. */
  const wsR2 = fakeWs('R2');
  await join(room, wsR2, PIDR, {
    rpgArmorStash: [{ name: 'Copper Torso', mat: 'copper', tierMult: 1, gid }],
  });
  const back = (room.playerState[PIDR].armorStash || [])[0];
  check('a stale tab can still hand the old wardrobe back...', !!back && back.name === 'Copper Torso', back);
  check('...but it comes back LEGACY, not minted, on the fresh character',
    back.prov === PROV_LEGACY && !back.gid, back);
  check('...and the fresh character starts with an empty record book',
    room._gearProvOf(PIDR).list.length === 0, room._gearProvOf(PIDR));
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
if (failures) process.exit(1);
