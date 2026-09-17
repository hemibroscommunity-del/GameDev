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
import * as gearstashExports from '../src/gearstash.js';   /* v2.3.2552: §10 asserts what it no longer exports */
import { STORE_GEAR } from '../src/storegear.js';          /* v2.3.2552: ...and what it no longer names */
import {
  GEAR_PROV_KEY, GEAR_PROV_CAP, GEAR_PROV_V, PROV_MINTED, PROV_LEGACY,
  emptyProvLedger, normalizeProvLedger, findProvRow, isGearProvSlot, claimedGid,
  GEAR_WORN_KNOWN_SLOTS, gearWornKnown,   /* v2.3.2553: which slots `worn` can honestly be asked about */
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
/* v2.3.2544: kept so sections that stub _wsBySessionId can put it back --
   see the note on the gear-lock stub in section 4b. */
const _realWsBySessionId = room._wsBySessionId.bind(room);

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
  /* v2.3.2544: and the id is genuinely ON THE WIRE, which is the contract
     wsClient's `quest_reward_stashed` ingestion now reads.  The client half
     has no unit suite, so the wire shape is what can be pinned here -- and
     it is exactly the half that was broken: the worker was sending the id
     and the browser was dropping it, so equip-by-name could never fire. */
  {
    const wsQ = fakeWs('Q');
    room._wsBySessionId = (id) => (id === PID ? wsQ : null);
    for (const piece of over) {
      wsQ.send(JSON.stringify({ type: 'quest_reward_stashed', payload: { questId: 'test', item: piece } }));
    }
    const qm = wsQ.sent.filter((m) => m.type === 'quest_reward_stashed').pop();
    check('...and that id is on the quest_reward_stashed wire, not just in memory',
      !!qm && typeof qm.payload.item.gid === 'string' && qm.payload.item.gid === over[0].gid,
      qm && qm.payload.item);
    room._wsBySessionId = _realWsBySessionId;
  }
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
  /* v2.3.2540: this assertion USED to require the grade be stripped, which
     was v2.3.2523's behaviour.  v2.3.2527 (#641, now on main) deliberately
     stopped stripping it -- deleting `quality` off an adopted piece wrote
     every graded plate anyone had earned down as plain, permanently, and
     armour has no anti-cheat damage ceiling for a forged grade to raise
     (the [0,8] clamp is applied AFTER the grade, with the 75% DR cap above
     it).  So the grade survives, clamped to the known enum.
     That is not a hole in THIS lane and the change is the right way round:
     what the provenance gate cares about is that the piece is still
     unprovable, so it can never be listed whatever grade it claims.  The
     assertion now pins the property that actually matters. */
  check('...and it is still unprovable, whatever grade it claims',
    byName('Godly Iron Plate').prov === PROV_LEGACY && !byName('Godly Iron Plate').gid,
    byName('Godly Iron Plate'));
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

  /* v2.3.2544: the stub is RESTORED afterwards rather than left installed on
     the file-wide shared room.  It happens to be harmless today (the real
     _threatGearLocked also answers false with no lock), but a stub left
     lying around is how a later section silently stops testing a gate. */
  const _realLock = room._threatGearLocked;
  room._threatGearLocked = () => true;
  await send(room, ws, { type: 'stats_update', payload: { armorRef: armorGid } });
  check('...and the guard gear-lock', ps.armor && ps.armor.name === 'Old Plate', ps.armor);
  room._threatGearLocked = _realLock;

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
   9. v2.3.2536 -- CUSTODY: may this be sold, taking it, handing it over
   ════════════════════════════════════════════════════════════════════ */
{
  const SELLER = 'bp_prov_sell';
  const BUYER = 'bp_prov_buy';
  const wsS = fakeWs('S');
  await join(room, wsS, SELLER);
  const ps = room.playerState[SELLER];
  room._prog3EquipOk = () => true;

  ps._questGrantOverflow = null;
  room._grantQuestItem(ps, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, SELLER);
  const gid = ps._questGrantOverflow[0].gid;
  /* Put a copy in the server's own stash, the way a join claim would. */
  ps.armorStash = [{ ...ps._questGrantOverflow[0] }];

  /* ── the one definition of "may this be sold", with a reason ── */
  check('a minted piece is sellable', room._gearSellable(SELLER, 'armor', gid).ok === true);
  check("a legacy piece answers 'legacy', so the client can say why",
    room._gearSellable(SELLER, 'armor', { name: 'Old Plate' }).reason === 'legacy');
  check("an id we never issued answers 'not_held'",
    room._gearSellable(SELLER, 'armor', 'g-never-issued').reason === 'not_held');
  check("the right id in the wrong slot answers 'wrong_slot'",
    room._gearSellable(SELLER, 'shield', gid).reason === 'wrong_slot');
  check("a piece belonging to someone ELSE is not sellable by you",
    room._gearSellable(BUYER, 'armor', gid).ok === false, room._gearSellable(BUYER, 'armor', gid));

  /* ── taking it into escrow ── */
  const taken = room._gearProvTake(SELLER, 'armor', gid);
  check('taking a piece returns the SERVER\'s copy, not a claim',
    !!taken && taken.piece.name === 'Copper Torso' && taken.piece.gid === gid, taken && taken.piece);
  check('...and its detached row, for the listing record to escrow',
    !!taken.row && taken.row.id === gid && taken.row.slot === 'armor', taken.row);
  check('...the record leaves the seller\'s ledger', !findProvRow(room._gearProvOf(SELLER), gid));
  check('...and the piece leaves the server\'s own stash where it was present',
    (ps.armorStash || []).length === 0, ps.armorStash);

  check('a piece already on the shelf cannot be listed a SECOND time',
    room._gearSellable(SELLER, 'armor', gid).reason === 'not_held');
  /* This is the hole v2.3.2535 left open and named: a ref could equip a
     piece the player was no longer holding.  With the row gone, it cannot. */
  check('...and cannot be EQUIPPED by name while it is on the shelf',
    room._gearProvPieceByRef(SELLER, 'armor', gid) === null);
  await send(room, wsS, { type: 'stats_update', payload: { armorRef: gid } });
  check('...proven through the real message path too', !ps.armor, ps.armor);
  check('taking it twice returns nothing the second time',
    room._gearProvTake(SELLER, 'armor', gid) === null);

  /* ── handing it to the buyer, who is OFFLINE ── */
  const res = await room._creditPlayer(BUYER, {
    opId: 'store:test1:goods', source: 'market', kind: 'gear',
    payload: { field: 'armorStash', piece: taken.piece, row: taken.row }, note: 'bought',
  });
  check('an offline buyer\'s piece parks in the mail', res === 'inboxed', res);
  /* ═══ v2.3.2539: THE RECORD DOES NOT LAND UNTIL THE PIECE DOES ═══
     This assertion used to say the opposite, and asserting it was how the
     bug got written down as a feature.  v2.3.2536 granted the row up front
     so an offline buyer's proof was durable -- but `_applyCreditToPs` also
     declines on a FULL stash, and that happens while the player is ONLINE,
     so the ledger claimed they held a piece that was sitting in their
     inbox.  The row now travels inside the durable inbox entry instead,
     which is just as durable and cannot be sold from. */
  const buyerLedger = await state._store.get(GEAR_PROV_KEY(BUYER));
  check('...and the record does NOT land yet -- it rides inside the mail',
    !buyerLedger || !buyerLedger.list.some((r) => r.id === gid), buyerLedger);
  check('...so the buyer cannot sell a piece that is still in the post',
    room._gearSellable(BUYER, 'armor', gid).ok === false,
    room._gearSellable(BUYER, 'armor', gid));

  const wsB = fakeWs('BY');
  await join(room, wsB, BUYER);
  const psB = room.playerState[BUYER];
  check('...and the piece arrives in the right stash at their next login',
    (psB.armorStash || []).length === 1 && psB.armorStash[0].name === 'Copper Torso', psB.armorStash);
  check('...still provable, under the SAME id -- the piece kept its identity across the counter',
    psB.armorStash[0].gid === gid && psB.armorStash[0].prov === PROV_MINTED, psB.armorStash[0]);
  check('...and it is now the BUYER who may sell it, not the seller',
    room._gearSellable(BUYER, 'armor', gid).ok === true
      && room._gearSellable(SELLER, 'armor', gid).ok === false);
  const mail = wsB.sent.filter((m) => m.type === 'inbox_delivered').pop();
  check('...announced through the existing mail notice, not a new event type',
    !!mail && mail.payload.entries.some((e) => e.kind === 'gear'), mail && mail.payload.entries);

  /* A settlement retry must converge on ONE row, not two (rule 5's opId
     converges the payment; this converges the record). */
  await room._gearProvGrantRow(BUYER, taken.row);
  check('granting the same row twice leaves ONE row, not two',
    room._gearProvOf(BUYER).list.filter((r) => r.id === gid).length === 1);

  /* ── the cancel / expiry direction: same function, row goes back ── */
  const back = room._gearProvTake(BUYER, 'armor', gid);
  check('the buyer can put it back on the shelf', !!back);
  await room._gearProvGrantRow(BUYER, back.row);
  check('a cancelled listing hands the record straight back', room._gearSellable(BUYER, 'armor', gid).ok === true);

  /* ── a FULL stash keeps the delivery queued rather than eating it
        (handoff rule 3 -- _saveRpg truncates these lists at the cap) ── */
  psB.legsStash = Array.from({ length: 32 }, (_, i) => ({ name: 'Filler ' + i, tierMult: 1 }));
  const full = await room._creditPlayer(BUYER, {
    opId: 'store:test2:goods', source: 'market', kind: 'gear',
    payload: { field: 'legsStash', piece: { name: 'Greaves', tierMult: 1 } }, note: 'bought',
  });
  check('a delivery into a FULL stash stays queued instead of being destroyed', full === 'inboxed', full);
  check('...and the full list did not grow past its cap', psB.legsStash.length === 32, psB.legsStash.length);

  /* ── a piece with no row arrives legacy rather than being refused ── */
  psB.shieldStash = [];
  await room._creditPlayer(BUYER, {
    opId: 'store:test3:goods', source: 'market', kind: 'gear',
    payload: { field: 'shieldStash', piece: { name: 'Plain Shield', gearBase: 'wood', tierMult: 1 } }, note: 'bought',
  });
  check('a piece handed over WITHOUT a record arrives legacy, not refused',
    (psB.shieldStash || []).length === 1 && psB.shieldStash[0].prov === PROV_LEGACY, psB.shieldStash);

  /* ── malformed payloads cannot wedge the mail forever ── */
  const before = (psB.armorStash || []).length;
  await room._creditPlayer(BUYER, { opId: 'store:test4:goods', source: 'market', kind: 'gear', payload: { field: '__proto__', piece: { name: 'X' } } });
  await room._creditPlayer(BUYER, { opId: 'store:test5:goods', source: 'market', kind: 'gear', payload: { field: 'armorStash', piece: 'not-an-object' } });
  check('a bogus stash name and a bogus piece are dropped, not queued forever',
    (psB.armorStash || []).length === before && !Array.isArray(Object.prototype.armorStash),
    (psB.armorStash || []).length);

  /* ════════════════════════════════════════════════════════════════
     v2.3.2539 -- THE GATE ASKS WHETHER YOU HOLD IT, NOT ONLY WHETHER WE
     MINTED IT.  Both cases below were found by the review of #650 and
     both print gear once #643 calls this.
     ════════════════════════════════════════════════════════════════ */

  /* (a) A piece you are WEARING used to pass.  The take then removed the
         row and spliced the STASH (where a worn piece is not), so the
         seller kept wearing theirs while the buyer got a copy.

         v2.3.2553: THIS TEST USED THE TUTORIAL SHIELD, AND THAT WAS THE
         WRONG EXAMPLE -- which is how the bug below stayed invisible
         through two reviews.  `ps.shield` is not the worn slot: quests.js
         says where it mints one that it is "the server's OWNERSHIP record,
         not a statement about what is strapped to the arm", and there is
         no shield equip message for it to be anything else.  So the
         original assertion passed for a reason that had nothing to do with
         wearing, and the real property went untested.

         It is now asserted on ARMOUR, which the server does learn about,
         and driven through the real `stats_update` equip route rather than
         by assigning the slot by hand -- setting `ps.armor` directly would
         prove the gate refuses "given that the slot carries the id" and
         pin nothing about whether equipping puts it there. */
  {
    const PIDW = 'bp_prov_worn';
    const wsW = fakeWs('W');
    await join(room, wsW, PIDW);
    const psW = room.playerState[PIDW];
    room._prog3EquipOk = () => true;
    psW._questGrantOverflow = null;
    room._grantQuestItem(psW, { kind: 'armor', name: 'Worn Torso', mat: 'iron', tierMult: 2 }, PIDW);
    const wornGid = psW._questGrantOverflow[0].gid;
    psW.armorStash = [{ ...psW._questGrantOverflow[0] }];
    check('guard: the quest plate is minted with a receipt', !!wornGid);
    check('guard: it is sellable before it goes on', room._gearSellable(PIDW, 'armor', wornGid).ok === true);
    await room.webSocketMessage(wsW, JSON.stringify({ type: 'stats_update', payload: { armorRef: wornGid } }));
    check('guard: the REAL equip route put it on, carrying its id',
      !!psW.armor && psW.armor.gid === wornGid, psW.armor);
    check('a piece you are WEARING is not sellable',
      room._gearSellable(PIDW, 'armor', wornGid).reason === 'worn',
      room._gearSellable(PIDW, 'armor', wornGid));
    check('...and taking it is refused, so it cannot be duplicated off your back',
      room._gearProvTake(PIDW, 'armor', wornGid) === null);
    check('...and you are still wearing it, untouched',
      psW.armor && psW.armor.gid === wornGid, psW.armor);
    /* Take it off THROUGH THE SAME ROUTE and it becomes sellable -- the
       refusal is "unequip first", which is something a player can act on,
       and this is what makes that promise true rather than plausible. */
    await room.webSocketMessage(wsW, JSON.stringify({ type: 'stats_update', payload: { armorRef: null } }));
    check('...once unequipped, the same piece IS sellable',
      room._gearSellable(PIDW, 'armor', wornGid).ok === true,
      room._gearSellable(PIDW, 'armor', wornGid));
  }

  /* (a2) ...and the slots where the server CANNOT know say so, rather
          than guessing.  The honest half of the fix above: a shield and an
          amulet are ownership records, so the gate never answers `worn`
          for them.  What that leaves open (the server cannot tell a shield
          on the arm from one in the bag) is written down in
          auction-house.md; what it CLOSES is a starter shield telling a
          brand-new player to take off something they are not wearing. */
  {
    const PIDS2 = 'bp_prov_ownrec';
    const wsS2 = fakeWs('W2');
    await join(room, wsS2, PIDS2);
    const psS2 = room.playerState[PIDS2];
    psS2.shield = null;
    room._grantQuestItem(psS2, { kind: 'shield', gearBase: 'wood', tierMult: 1, name: 'Pine Shield' }, PIDS2);
    check('the shield ownership record never answers `worn`',
      room._gearSellable(PIDS2, 'shield', psS2.shield.gid).ok === true,
      room._gearSellable(PIDS2, 'shield', psS2.shield.gid));
    check('...and the roster naming which slots the server can know is exactly the two equip-reported ones',
      GEAR_WORN_KNOWN_SLOTS.join(',') === 'armor,legsArmor', GEAR_WORN_KNOWN_SLOTS);
    check('...legs ARE one of them, so the worn rule is not armour-only',
      gearWornKnown('legsArmor') === true && gearWornKnown('shield') === false
      && gearWornKnown('amulet') === false && gearWornKnown('gear') === false);
  }

  /* (b) A piece parked in the MAIL used to pass, because the row was
         granted before delivery was attempted and a full stash defers
         delivery while the player is online. */
  {
    const PIDM = 'bp_prov_mail';
    const wsM = fakeWs('M');
    await join(room, wsM, PIDM);
    const psM = room.playerState[PIDM];
    psM._questGrantOverflow = null;
    room._grantQuestItem(psM, { kind: 'legs', name: 'Copper Greaves', mat: 'copper', tierMult: 1 }, PIDM);
    const mailGid = psM._questGrantOverflow[0].gid;
    const taken = room._gearProvTake(PIDM, 'legsArmor', mailGid);
    check('guard: the greaves are taken into a listing', !!taken);

    /* Their legs stash is full, so the delivery cannot land. */
    psM.legsStash = Array.from({ length: 32 }, (_, i) => ({ name: 'Filler ' + i, tierMult: 1 }));
    const r = await room._creditPlayer(PIDM, {
      opId: 'store:mailtest:goods', source: 'market', kind: 'gear',
      payload: { field: 'legsStash', piece: taken.piece, row: taken.row }, note: 'bought back',
    });
    check('a delivery that cannot land parks in the mail', r === 'inboxed', r);
    check('...and does NOT put its record in the ledger',
      !findProvRow(room._gearProvOf(PIDM), mailGid), room._gearProvOf(PIDM).list.length);
    check('...so it cannot be sold while it is sitting in the post',
      room._gearSellable(PIDM, 'legsArmor', mailGid).reason === 'in_mail',
      room._gearSellable(PIDM, 'legsArmor', mailGid));
    check('...and the full list did not grow past its cap', psM.legsStash.length === 32, psM.legsStash.length);

    /* Make room and reconnect: NOW the piece and its record arrive together. */
    psM.legsStash = [];
    await room._saveRpg(PIDM, psM);
    const wsM2 = fakeWs('M2');
    await join(room, wsM2, PIDM);
    const psM2 = room.playerState[PIDM];
    check('making room and reconnecting delivers it',
      (psM2.legsStash || []).length === 1 && psM2.legsStash[0].gid === mailGid, psM2.legsStash);
    check('...with its record, exactly once',
      room._gearProvOf(PIDM).list.filter((x) => x.id === mailGid).length === 1);
    check('...and it is sellable again now that it is really held',
      room._gearSellable(PIDM, 'legsArmor', mailGid).ok === true);
  }

  /* Rule 16 at the credit funnel: a verified row means the piece is rebuilt
     from OUR copy, so a producer that put inflated stats in the payload
     cannot sneak them past a genuine id. */
  {
    const PIDV = 'bp_prov_payload';
    const wsV = fakeWs('V');
    await join(room, wsV, PIDV);
    const psV = room.playerState[PIDV];
    psV._questGrantOverflow = null;
    room._grantQuestItem(psV, { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1 }, PIDV);
    const vGid = psV._questGrantOverflow[0].gid;
    const t = room._gearProvTake(PIDV, 'armor', vGid);
    psV.armorStash = [];
    await room._creditPlayer(PIDV, {
      opId: 'store:payloadtest:goods', source: 'market', kind: 'gear',
      payload: { field: 'armorStash', row: t.row,
        piece: { name: 'Godly Iron Plate', tierMult: 8, quality: 'godly', gid: vGid } },
      note: 'bought',
    });
    const got = (psV.armorStash || [])[0];
    check('a verified row rebuilds the piece from OUR copy, not the payload',
      !!got && got.name === 'Copper Torso' && got.tierMult === 1 && !got.quality, got);
    check('...and it still comes out minted, under the same id',
      got.gid === vGid && got.prov === PROV_MINTED, got);
  }

  /* Cosmetics get their own refusal.  `legacy` would mean "you earned this
     before we kept receipts", which invites someone to "fix" it by adding a
     mint path nobody wants; the truth is that they are never sellable. */
  check("cosmetics answer 'cosmetic', not 'legacy'",
    room._gearSellable(BUYER, 'gear', { slot: 'chest', gearId: 'copperplate' }).reason === 'cosmetic',
    room._gearSellable(BUYER, 'gear', { slot: 'chest', gearId: 'copperplate' }));

  /* ── no signature heuristic anywhere: selling one of two identical
        pieces leaves the other alone (the #643 deletion) ── */
  psB._questGrantOverflow = null;
  room._grantQuestItem(psB, { kind: 'armor', name: 'Twin Plate', mat: 'iron', tierMult: 2 }, BUYER);
  const twinA = psB._questGrantOverflow[0].gid;
  psB._questGrantOverflow = null;
  room._grantQuestItem(psB, { kind: 'armor', name: 'Twin Plate', mat: 'iron', tierMult: 2 }, BUYER);
  const twinB = psB._questGrantOverflow[0].gid;
  room._gearProvTake(BUYER, 'armor', twinA);
  check('selling one of two identical-looking pieces leaves the other sellable',
    room._gearSellable(BUYER, 'armor', twinA).ok === false
      && room._gearSellable(BUYER, 'armor', twinB).ok === true);
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

/* ════════════════════════════════════════════════════════════════════
   10. v2.3.2551/2552 -- THE STORE IS WIRED ONTO THE GATE, AND `_sv` IS GONE
   ════════════════════════════════════════════════════════════════════
   §9 proved the custody primitives in isolation.  #650 shipped them and
   said out loud what it had not done: "Nothing in `server/src` calls the
   sell gate yet."  This section is the proof that something does.

   The store's own end-to-end behaviour -- escrow, cancel, expiry, sale,
   the crash windows, the reasons over HTTP -- is pinned in
   `market.test.mjs` §S12, against a real `_stCreateListing` and a real
   `fetch`.  What is pinned HERE is the part only this file's vantage can
   see: that the listing path and the gate cannot DISAGREE, because the
   listing path has no gate of its own; and that the retired mark is
   retired everywhere rather than merely unused.

   Driven through real messages, per this suite's rule: the forged claim
   below goes through `webSocketMessage`, never through `stripProv`. */
{
  const PIDS = 'bp_prov_store';
  const wsSt = fakeWs('ST');
  await join(room, wsSt, PIDS);
  const psS = room.playerState[PIDS];
  room._prog3EquipOk = () => true;
  await room._stEnsureIndex();

  /* ── THE LISTING PATH HAS NO GATE OF ITS OWN ──
     For every shape the gate has an opinion about, `_stGearEscrow` must
     return exactly the gate's verdict -- same ok, same reason.  A second
     gate beside the first is how a refusal loses its reason string, and
     how the next contributor fixes one of two checks.  Table-driven so a
     new reason cannot be added to `_gearSellable` and quietly skipped
     here. */
  psS.armorStash = []; psS.legsStash = []; psS.shieldStash = []; psS.armor = null;
  psS._questGrantOverflow = null;
  room._grantQuestItem(psS, { kind: 'armor', name: 'Gate Plate', mat: 'iron', tierMult: 2 }, PIDS);
  const gateGid = psS._questGrantOverflow[0].gid;
  psS.armorStash = [{ ...psS._questGrantOverflow[0] }];
  psS.gearStash = [{ slot: 'chest', gearId: 'steelchest', name: 'Steel Chest' }];

  const cases = [
    ['a recorded piece we hold', 'armorStash', 'armor', gateGid],
    ['an id nobody was issued', 'armorStash', 'armor', 'g-not-a-real-id'],
    ['the right id in the wrong slot', 'shieldStash', 'shield', gateGid],
    ['a piece with no id at all', 'armorStash', 'armor', null],
    ['an outfit layer', 'gearStash', 'gear', null],
  ];
  for (const [label, field, slot, gid] of cases) {
    const verdict = room._gearSellable(PIDS, slot, gid);
    const escrow = room._stGearEscrow(PIDS, psS, gid ? { field, gid } : { field, sel: { name: 'Nope', tierMult: 1, slot: 'chest', gearId: 'zzz' } });
    check('store gate: ' + label + ' -- the listing path answers exactly what the gate does',
      escrow.ok === verdict.ok && (verdict.ok || escrow.reason === verdict.reason),
      { label, verdict, escrow });
    /* Put the one success back, so the table is order-independent. */
    if (escrow.ok) await room._gearProvGrantRow(PIDS, escrow.row);
  }
  check('store gate: ...and every refusal above left the wardrobe alone',
    psS.gearStash.length === 1 && !!room._gearProvOf(PIDS).list.find((r) => r.id === gateGid),
    { gear: psS.gearStash, book: room._gearProvOf(PIDS).list.length });

  /* ── A WORN PIECE, THROUGH THE REAL EQUIP PATH ──
     The single most expensive thing #650's review found, asserted against
     the path that would have printed the gear.

     v2.3.2553: driven through `stats_update` rather than by assigning
     `ps.armor` by hand.  Setting the worn slot directly proved that the
     GATE refuses a worn piece "given that `ps[slot]` carries the id", and
     pinned nothing about whether the equip route actually puts the id
     there -- which is exactly the shape the last four reviews kept
     finding, and exactly what hid the shield bug below.  So the piece is
     equipped the way the game equips it, and the gate is asked afterwards. */
  psS.armorStash = []; psS.armor = null;
  room._grantQuestItem(psS, { kind: 'armor', name: 'Body Plate', mat: 'iron', tierMult: 2 }, PIDS);
  const bodyGid = psS._questGrantOverflow[psS._questGrantOverflow.length - 1].gid;
  psS.armorStash = [{ ...psS._questGrantOverflow[psS._questGrantOverflow.length - 1] }];
  check('store gate: (setup) the plate is sellable while it is off',
    room._gearSellable(PIDS, 'armor', bodyGid).ok === true, room._gearSellable(PIDS, 'armor', bodyGid));
  await room.webSocketMessage(wsSt, JSON.stringify({ type: 'stats_update', payload: { armorRef: bodyGid } }));
  check('store gate: (setup) the REAL equip route put it on, with its id',
    !!psS.armor && psS.armor.gid === bodyGid, psS.armor);
  const sellWorn = room._stGearEscrow(PIDS, psS, { field: 'armorStash', gid: bodyGid });
  check("store gate: listing the plate you are WEARING is refused with 'worn'",
    sellWorn.ok === false && sellWorn.reason === 'worn', sellWorn);
  check('store gate: ...and you are still wearing it afterwards',
    psS.armor && psS.armor.gid === bodyGid, psS.armor);
  check('store gate: ...and its receipt is still yours',
    !!findProvRow(room._gearProvOf(PIDS), bodyGid));
  await room.webSocketMessage(wsSt, JSON.stringify({ type: 'stats_update', payload: { armorRef: null } }));
  const sellOff = room._stGearEscrow(PIDS, psS, { field: 'armorStash', gid: bodyGid });
  check('store gate: ...take it off through the real route and the refusal comes good',
    sellOff.ok === true, sellOff);
  if (sellOff.ok) await room._gearProvGrantRow(PIDS, sellOff.row);

  /* ══ THE STARTER SHIELD: A REFUSAL THE PLAYER COULD NOT ACT ON ══
     (v2.3.2553, review of #653 -- reproduced against a real room before
     it was fixed.)

     `quests.js` mints the tutorial Pine Shield straight into `ps.shield`
     and says where it does so that `ps.shield` is "the server's OWNERSHIP
     record, not a statement about what is strapped to the arm" -- there is
     no shield equip message at all.  wsClient routes the player's own copy
     into their BAG ("received in inventory first").  v2.3.2551 read that
     field as "on the body", so the first piece of gear every character owns
     offered a Sell button and then answered "take it off first" with
     nothing on the arm to take off, until a reload reset the field.

     No modified client, day one, every character.  The gate now answers
     `worn` only for the slots where the server actually learns about
     equipping, and this is the regression test. */
  {
    const PIDT = 'bp_prov_tut';
    const wsT = fakeWs('T');
    await join(room, wsT, PIDT);
    const psT = room.playerState[PIDT];
    psT.shield = null;
    room._grantQuestItem(psT, { kind: 'shield', gearBase: 'wood', tierMult: 1, name: 'Pine Shield' }, PIDT);
    check('starter shield: (setup) the quest minted it into the ownership slot',
      !!psT.shield && psT.shield.prov === PROV_MINTED && psT.shield.gid, psT.shield);
    check('starter shield: (setup) ...and the server\'s bag list is still empty, as it is in the game',
      Array.isArray(psT.shieldStash) && psT.shieldStash.length === 0, psT.shieldStash);
    const tutVerdict = room._gearSellable(PIDT, 'shield', psT.shield.gid);
    check('starter shield: it can be sold in the session it is given',
      tutVerdict.ok === true, tutVerdict);
    const tutList = room._stGearEscrow(PIDT, psT, { field: 'shieldStash', gid: psT.shield.gid });
    check('starter shield: ...and the listing path takes it rather than telling you to remove it',
      tutList.ok === true, { ok: tutList.ok, reason: tutList.reason, error: tutList.error });
    if (tutList.ok) await room._gearProvGrantRow(PIDT, tutList.row);
    /* The other half of the same wrong signal, stated so it is a decision
       and not an accident: the server CANNOT know a shield is on the arm,
       so it does not claim to.  auction-house.md says what that leaves
       open and what would close it. */
    check('starter shield: the gate does not pretend to know about a shield on the arm',
      room._gearSellable(PIDT, 'shield', psT.shield.gid).reason !== 'worn',
      room._gearSellable(PIDT, 'shield', psT.shield.gid));
  }

  /* ── A FORGED CLAIM, THROUGH A REAL JOIN, CANNOT BECOME SELLABLE ──
     The shape of #643's miss: a mark stripped from the selector and not
     from the path that fills a stash.  There is no mark to strip now, so
     what is asserted is the whole chain -- claim arrives, resolves
     legacy, and the LISTING PATH refuses it. */
  {
    const PIDF = 'bp_prov_forge';
    const wsF = fakeWs('F');
    await join(room, wsF, PIDF, {
      rpgArmorStash: [
        { name: 'Forged Godly Plate', mat: 'mythril', tierMult: 8, gid: 'g-invented', prov: PROV_MINTED, _sv: true },
        { name: 'Stolen Plate', mat: 'iron', tierMult: 2, gid: gateGid, prov: PROV_MINTED },
      ],
    });
    const psF = room.playerState[PIDF];
    await room._stEnsureIndex();
    check('store gate: an invented id lands legacy through a real join',
      psF.armorStash[0].prov === PROV_LEGACY && !psF.armorStash[0].gid && psF.armorStash[0]._sv === undefined,
      psF.armorStash[0]);
    check("store gate: ...and ANOTHER player's real id lands legacy too",
      psF.armorStash[1].prov === PROV_LEGACY && !psF.armorStash[1].gid, psF.armorStash[1]);
    const forgedList = room._stGearEscrow(PIDF, psF, { field: 'armorStash', gid: 'g-invented' });
    const stolenList = room._stGearEscrow(PIDF, psF, { field: 'armorStash', gid: gateGid });
    check('store gate: the listing path refuses the invented id',
      forgedList.ok === false && forgedList.reason === 'not_held', forgedList);
    check("store gate: ...and refuses another player's id without touching THEIR record",
      stolenList.ok === false && stolenList.reason === 'not_held'
      && !!findProvRow(room._gearProvOf(PIDS), gateGid), stolenList);
    check('store gate: ...and the forger keeps both pieces, at the stats they claimed, simply unsellable',
      psF.armorStash.length === 2 && psF.armorStash[0].tierMult === 8, psF.armorStash);
    /* The selector path has to reach the same place: an old browser must
       not be able to list what a new one cannot. */
    const bySel = room._stGearEscrow(PIDF, psF, { field: 'armorStash', sel: { ...psF.armorStash[0] }, hint: 0 });
    check('store gate: ...and naming it by SELECTOR is refused identically',
      bySel.ok === false && bySel.reason === 'legacy', bySel);
  }

  /* ── THE RETIREMENT IS COMPLETE, NOT MERELY UNUSED ──
     "Nothing reads this" is not evidence (/repo-review angle F): the
     grep is.  These assert the absence of every part of the mechanism at
     the places a future contributor would look for it. */
  check('`_sv`: the module that defined the mark no longer exports it',
    !('GEAR_PROV' in gearstashExports) && !('carryProv' in gearstashExports),
    Object.keys(gearstashExports).filter((k) => /PROV|carry/i.test(k)));
  check('`_sv`: the store no longer has a listable check or a strip',
    typeof room._stGearListable === 'undefined' && typeof room._stGearStrip === 'undefined',
    { listable: typeof room._stGearListable, strip: typeof room._stGearStrip });
  check('`_sv`: the STORE_GEAR constants no longer name a mark or a strict flag',
    !('PROV' in STORE_GEAR) && !('STRICT_FLAG' in STORE_GEAR), Object.keys(STORE_GEAR));
  /* The one decision it used to make, made better.  `store_gear_strict`
     is now inert: turning it on changes nothing, where before it was the
     difference between "lists nothing" and "lists marked pieces". */
  {
    psS.armorStash = [];
    room._grantQuestItem(psS, { kind: 'armor', name: 'Inert Plate', mat: 'iron', tierMult: 2 }, PIDS);
    const inertGid = psS._questGrantOverflow[psS._questGrantOverflow.length - 1].gid;
    const before = room._gearSellable(PIDS, 'armor', inertGid).ok;
    room._liveFlags = { store_gear_strict: true };
    const during = room._gearSellable(PIDS, 'armor', inertGid).ok;
    const escrowDuring = room._stGearEscrow(PIDS, psS, { field: 'armorStash', gid: inertGid });
    room._liveFlags = {};
    check('`_sv`: the retired `store_gear_strict` live flag is inert in both directions',
      before === true && during === true && escrowDuring.ok === true,
      { before, during, escrow: escrowDuring });
    if (escrowDuring.ok) await room._gearProvGrantRow(PIDS, escrowDuring.row);
  }
  /* And a delivered piece is marked from the BOOK, not from a flag on
     the payload -- the replacement for what `_stGearApplyCredit` used to
     stamp.  Driven through the real credit funnel. */
  {
    psS.legsStash = [];
    room._grantQuestItem(psS, { kind: 'legs', name: 'Delivered Greaves', mat: 'iron', tierMult: 2 }, PIDS);
    const delGid = psS._questGrantOverflow[psS._questGrantOverflow.length - 1].gid;
    const taken = room._gearProvTake(PIDS, 'legsArmor', delGid);
    psS.legsStash = [];
    await room._creditPlayer(PIDS, {
      opId: 'test:sv-retire:1', source: 'market', kind: 'gear',
      payload: { field: 'legsStash', piece: { ...taken.piece, _sv: true }, row: taken.row },
      note: 'delivered',
    });
    const landed = psS.legsStash[0];
    check('`_sv`: a delivered piece is marked from the ledger, and carries no dead flag',
      !!landed && landed.gid === delGid && landed.prov === PROV_MINTED && landed._sv === undefined, landed);
  }
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
if (failures) process.exit(1);
