/* Pets -- what is left of v2.3.1130's capture, and the loot vacuum.
 *
 * v2.3.3111: the 20%-health capture is RETIRED (pets.js; the plan,
 * docs/PET-TRAPPING-PLAN.md).  Pets are caught by arming a trap and killing
 * the monster (trapping.js, test/trapping.test.mjs) and kept in their own
 * record, pets:<pid> (petbook.js).  This suite keeps what still lives here:
 *   1. caps.petLoot advertised.
 *   2. pet_capture answers 'retired' and touches nothing -- no trap, no
 *      monster, no XP -- even on a monster at 1 hp with traps in the bag.
 *   3. A forged pet_capture_result is not rebroadcast (deny-list).
 *   4. The join no longer adopts a browser's pet list (it took up to six of
 *      any kind at level 100, on every join).
 *   9. Pet loot vacuum (v2.3.1200): an active pet -- now the RECORD's
 *      (petbook.js _petbookActive) -- widens a loot_pickup {viaPet:true} to
 *      PETS.VACUUM_RANGE through the REAL pickup path (share applied to
 *      ps.coins, private loot_credit with viaPet:true) where a manual pickup
 *      is out of range; claimedBy is shared so a manual pickup after a vacuum
 *      claim is 'already-claimed' (no double credit); beyond VACUUM_RANGE the
 *      vacuum is rejected out-of-range; viaPet with no active pet in the
 *      record is rejected 'no-pet'; the recipient gate still applies.
 */
import { GameRoom } from '../src/index.js';
import { PETS } from '../src/pets.js';

function makeState() {
  const store = new Map();
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
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: Object.assign({ x: 0, y: 0, z: 'town' }, data || {}) }));
}
const capture = (ws, monsterId) => room.webSocketMessage(ws, JSON.stringify({ type: 'pet_capture', payload: { monsterId } }));
const lastResult = (ws) => { const r = msgsOfType(ws, 'pet_capture_result'); return r[r.length - 1] && r[r.length - 1].payload; };

/* An active pet, the way a catch makes one (petbook.js): in the record. */
function giveActivePet(pid) {
  const book = room._petbookOf(pid);
  const pet = { id: 'p_test' + pid.slice(-6).replace(/[^a-z0-9]/g, '0'), kind: 'gobling', look: 'fireGoblin', home: 'ember', stage: 1,
    gold: false, size: 1, name: null, lv: 1, xp: 0, at: Date.now(), caughtBy: pid, owners: 1, tradeAfter: Date.now() };
  book.rec.list.push(pet);
  book.rec.active = pet.id;
  return pet;
}

const ws = fakeWs('p');
await join(ws, 'bp_pet_p');
const ps = room.playerState['bp_pet_p'];
ps.coins = 1000;
ps.level = 10;
const sync = ws.sent.find((m) => m.type === 'state_sync');

// ── 1 + 2. the retired capture ──
{
  ps.z = 'meadow';
  const meadow = room._ensureZoneMonsters('meadow');
  const m = meadow[0];
  ps.x = m.x; ps.y = m.y;
  m.hp = 1;
  ps.inventory.basic_trap = 2;
  ps.inventory.trap_box = 2;
  const xp0 = JSON.stringify(ps.lifeSkills || {});
  await capture(ws, m.id);
  check('pet_capture: retired -- answered \'retired\'', lastResult(ws) && lastResult(ws).error === 'retired' && lastResult(ws).captured === false, lastResult(ws));
  check('pet_capture: ...and touches nothing: the traps, the monster, the XP',
    ps.inventory.basic_trap === 2 && ps.inventory.trap_box === 2 && m.alive === true && m.hp === 1 && JSON.stringify(ps.lifeSkills || {}) === xp0
      && room._petbookOf('bp_pet_p').rec.list.length === 0);
  m.hp = m.maxHp;
}

// ── 3. forged pet_capture_result denied ──
room.eventBuffer.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'pet_capture_result', payload: { captured: true, pet: { name: 'Hax' } } }));
check('forged pet_capture_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'pet_capture_result').length === 0, room.eventBuffer.map((e) => e.type));

// ── 4. no adoption from the browser ──
const ws2 = fakeWs('adopt');
const forged = new Array(7).fill(0).map(() => ({ archetype: 'fodder', level: 9999, element: 'flame' }));
await join(ws2, 'bp_pet_new', { rpgLifeSkills: { pets: forged, activePet: 0, trapping: { level: 1, xp: 0 } } });
const ws3 = fakeWs('rejoin');
await join(ws3, 'bp_pet_new', { rpgLifeSkills: { pets: forged, activePet: 0 } });
check('join: a browser\'s pet list is never adopted, first join or later',
  room._petbookOf('bp_pet_new').rec.list.length === 0 && !((room.playerState['bp_pet_new'].lifeSkills.pets || []).length),
  { list: room._petbookOf('bp_pet_new').rec.list.length, ls: room.playerState['bp_pet_new'].lifeSkills.pets });

// ── 9. pet loot vacuum (v2.3.1200): server-credited through the REAL
// loot_pickup path.  Hand-crafted monster-kill pile (the anticheat
// suite's pattern); range measured from the OWNER's position since the
// server tracks no pet position (see PETS.VACUUM_RANGE in pets.js). ──
function mkPile(id, x, y, coins, recipients, shares) {
  const pile = {
    lootId: id, zone: 'meadow', x, y, coins,
    skull: null, shard: null, recipients, shares,
    killerName: 'T', ts: Date.now(), inventoryClaimed: false, claimedBy: {},
    weapon: null, weaponClaimed: false,
  };
  if (!room.loot.meadow) room.loot.meadow = [];
  room.loot.meadow.push(pile);
  return pile;
}
const pickup = (w, lootId, viaPet) => room.webSocketMessage(w, JSON.stringify({
  type: 'loot_pickup',
  payload: viaPet ? { lootId, zone: 'meadow', viaPet: true } : { lootId, zone: 'meadow' },
}));
const lastCredit = (w) => { const r = msgsOfType(w, 'loot_credit'); return r[r.length - 1] && r[r.length - 1].payload; };
const lastReject = (w) => { const r = msgsOfType(w, 'loot_pickup_rejected'); return r[r.length - 1] && r[r.length - 1].payload; };

check('state_sync advertises caps.petLoot', sync && sync.caps && sync.caps.petLoot === true, sync && sync.caps);

// v2.3.3111: each gets an active pet in the RECORD (petbook.js).
giveActivePet('bp_pet_p');
giveActivePet('bp_pet_new');
ps.z = 'meadow'; ps.dead = false; ps.disconnected = false;
ps.x = 500; ps.y = 500;
const ps2v = room.playerState['bp_pet_new'];
ps2v.z = 'meadow'; ps2v.dead = false; ps2v.disconnected = false;

// Pile at 200 px: beyond LOOT_PICKUP_RANGE (160), inside VACUUM_RANGE (240).
const pileA = mkPile('vac-a', 700, 500, 100, ['bp_pet_p', 'bp_pet_new'], { bp_pet_p: 0.6, bp_pet_new: 0.4 });
let coinsBefore = ps.coins;
ws.sent.length = 0;
await pickup(ws, 'vac-a', false);
check('manual pickup at 200px rejected out-of-range (control)', lastReject(ws) && lastReject(ws).reason === 'out-of-range' && ps.coins === coinsBefore, lastReject(ws));
await pickup(ws, 'vac-a', true);
const credA = lastCredit(ws);
check('vacuum pickup at 200px credits through the real path', credA && credA.coins === 60 && credA.viaPet === true && ps.coins === coinsBefore + 60, { cred: credA, coins: ps.coins });
check('vacuum claim sets the shared claimedBy flag; pile stays for the other recipient', pileA.claimedBy['bp_pet_p'] === true && room.loot.meadow.find((p) => p.lootId === 'vac-a'), pileA.claimedBy);

// Manual grab AFTER the vacuum claim: same claimedBy map -> no double credit.
ps.x = pileA.x; ps.y = pileA.y;
coinsBefore = ps.coins;
ws.sent.length = 0;
await pickup(ws, 'vac-a', false);
check('manual pickup after vacuum claim is already-claimed (no double credit)', lastReject(ws) && lastReject(ws).reason === 'already-claimed' && ps.coins === coinsBefore, lastReject(ws));

// viaPet without an active pet in the record -> no-pet, no wider range.
// NOTE: ws2's session was evicted by the ws3 same-id rejoin in section
// 4 (v2.3.702 eviction), so bp_pet_new's live socket is ws3.
ps2v.x = 700; ps2v.y = 700; // 200 px from the pile
const book2 = room._petbookOf('bp_pet_new').rec;
const savedActive = book2.active;
book2.active = null;
/* and the old field, set as an old record would have it, buys nothing */
ps2v.lifeSkills.pets = [{ id: 'x' }]; ps2v.lifeSkills.activePet = 0;
const coins2Before = ps2v.coins || 0;
ws3.sent.length = 0;
await pickup(ws3, 'vac-a', true);
check('vacuum without an active pet rejected no-pet', lastReject(ws3) && lastReject(ws3).reason === 'no-pet' && (ps2v.coins || 0) === coins2Before, lastReject(ws3));
book2.active = savedActive;
await pickup(ws3, 'vac-a', true);
check('second recipient vacuums their share; fully-claimed pile despawns', lastCredit(ws3) && lastCredit(ws3).coins === 40 && (ps2v.coins || 0) === coins2Before + 40 && !room.loot.meadow.find((p) => p.lootId === 'vac-a'), { cred: lastCredit(ws3), coins: ps2v.coins });

// Range validation: beyond VACUUM_RANGE the pet reaches nothing.
mkPile('vac-far', 500 + PETS.VACUUM_RANGE + 60, 500, 50, ['bp_pet_p'], { bp_pet_p: 1 });
ps.x = 500; ps.y = 500;
coinsBefore = ps.coins;
ws.sent.length = 0;
await pickup(ws, 'vac-far', true);
check('vacuum beyond VACUUM_RANGE rejected out-of-range', lastReject(ws) && lastReject(ws).reason === 'out-of-range' && lastReject(ws).max === PETS.VACUUM_RANGE && ps.coins === coinsBefore, lastReject(ws));

// Recipient gate still applies to vacuum pickups.
mkPile('vac-other', 520, 500, 50, ['bp_pet_new'], { bp_pet_new: 1 });
ws.sent.length = 0;
await pickup(ws, 'vac-other', true);
check('vacuum on someone else\'s pile rejected not-recipient', lastReject(ws) && lastReject(ws).reason === 'not-recipient' && ps.coins === coinsBefore, lastReject(ws));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
