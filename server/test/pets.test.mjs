/* Pet-capture test (v2.3.1130, PR14, handoff item G).  Capture was
 * 100% client theatre: local hp gate, own Math.random roll, traps
 * never consumed, and the "captured" monster only died on the
 * capturer's screen.  The server now validates against ITS monster,
 * spends a basic_trap per attempt, rolls, and removes the monster for
 * everyone.  Checks:
 *   1. caps.pets advertised; shop trap lands in ps.inventory.
 *   2. Every rejection (bogus monster, too healthy, out of range,
 *      full slots, no trap) costs NO trap.
 *   3. Forced success: trap consumed, sanitized pet appended,
 *      activePet set, monster dead with a real respawnAt, trapping XP
 *      awarded, captured:true result.
 *   4. Forced fail: trap consumed, escape XP only, monster lives.
 *   5. Chance formula (base + skill bonuses - level penalty, clamped).
 *   6. Dungeon-instance monster: capture leaves respawnAt 0
 *      (noRespawn regression).
 *   7. Join adoption: a forged 7-pet client list is sanitized (cap 6,
 *      bad archetype -> fodder, level clamped); a non-empty
 *      server-held list wins over the client's.
 *   8. Forged pet_capture_result is not rebroadcast (deny-list).
 *   9. Pet loot vacuum (v2.3.1200): caps.petLoot advertised; a
 *      loot_pickup {viaPet:true} credits through the REAL pickup path
 *      (share applied to ps.coins, private loot_credit with
 *      viaPet:true) at vacuum range where a manual pickup is rejected
 *      out-of-range; claimedBy is shared so a manual pickup after a
 *      vacuum claim is 'already-claimed' (no double credit); beyond
 *      VACUUM_RANGE the vacuum is rejected out-of-range; viaPet
 *      without a server-known active pet is rejected 'no-pet';
 *      recipient gate still applies to vacuum pickups.
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

const ws = fakeWs('p');
await join(ws, 'bp_pet_p');
const ps = room.playerState['bp_pet_p'];
ps.coins = 1000;
ps.level = 10;

// ── 1. caps + a trap in the bag ──
/* v2.3.2069: THE TRAP IS NO LONGER SOLD, AND THAT IS NOT A BUG HERE.
   Owner: "Remove the 20g trap from the shop it has no effect in the game
   currently" -- the capture system below is finished and correct server-side,
   but its only trigger is a button on the legacy toolbar, whose root has
   `display: 'none'`. So the shop LINE went and everything this file exercises
   stayed (see the note in server/src/data.js).
   The trap is therefore placed in the bag directly. That is what this section
   was really establishing -- "a player holding a trap" -- and it now says so
   instead of routing through a shelf that no longer carries one. A trap
   already in someone's bag still works, which is the property being kept. */
const sync = ws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.pets', sync && sync.caps && sync.caps.pets === true, sync && sync.caps);
await room.webSocketMessage(ws, JSON.stringify({ type: 'shop_purchase', payload: { itemId: 'basicTrap' } }));
check('the vendor no longer sells a trap, and the attempt costs nothing',
  !ps.inventory.basic_trap && ps.coins === 1000, { trap: ps.inventory.basic_trap, coins: ps.coins });
ps.inventory.basic_trap = 1;

// world monster to hunt
ps.z = 'meadow';
const meadow = room._ensureZoneMonsters('meadow');
const m = meadow[0];
ps.x = m.x; ps.y = m.y; // in range

// ── 2. rejections cost no trap ──
await capture(ws, 'sm-bogus-99');
check('bogus monster rejected', lastResult(ws).error === 'no-monster' && ps.inventory.basic_trap === 1);
m.hp = m.maxHp; // full health
await capture(ws, m.id);
check('healthy monster rejected', lastResult(ws).error === 'too-healthy' && ps.inventory.basic_trap === 1);
m.hp = Math.max(1, Math.floor(m.maxHp * 0.1)); // weak now
ps.x = m.x + 1000;
await capture(ws, m.id);
check('out of range rejected', lastResult(ws).error === 'too-far' && ps.inventory.basic_trap === 1);
ps.x = m.x;
ps.lifeSkills.pets = new Array(PETS.MAX_SLOTS).fill(0).map((_, i) => ({ id: 'x' + i }));
await capture(ws, m.id);
check('full slots rejected', lastResult(ws).error === 'slots-full' && ps.inventory.basic_trap === 1);
ps.lifeSkills.pets = [];
delete ps.inventory.basic_trap;
await capture(ws, m.id);
check('no trap rejected', lastResult(ws).error === 'no-trap');

// ── 3. forced success ──
ps.inventory.basic_trap = 2;
ps.lifeSkills.trapping = { level: 10, xp: 0 };
ps.lifeSkills.woodcutting = { level: 10, xp: 0 };
const realRandom = Math.random;
Math.random = () => 0.0; // roll always <= chance -> success (and name/personality index 0)
ws.sent.length = 0;
await capture(ws, m.id);
let res = lastResult(ws);
Math.random = realRandom;
const xpAfterCapture = ps.lifeSkills.trapping.xp;
check('success consumes exactly one trap', ps.inventory.basic_trap === 1, ps.inventory.basic_trap);
check('pet appended with sanitized shape + activePet set', ps.lifeSkills.pets.length === 1 && ps.lifeSkills.pets[0].archetype === m.arch && ps.lifeSkills.pets[0].level >= 1 && ps.lifeSkills.activePet === 0, ps.lifeSkills.pets[0]);
check('monster removed for everyone with a real respawnAt', m.alive === false && m.hp === 0 && m.respawnAt > Date.now(), m.respawnAt);
check('capture trapping XP awarded', xpAfterCapture === PETS.CAPTURE_XP_BASE + (m.level || 1) * PETS.CAPTURE_XP_PER_LVL, xpAfterCapture);
check('captured:true result carries the pet', res && res.captured === true && res.pet && res.pet.name === 'Nibbles', res);

// ── 4 + 5. forced fail + chance formula ──
const m2 = meadow[1];
m2.hp = Math.max(1, Math.floor(m2.maxHp * 0.15));
m2.level = ps.level + 4; // 4 above -> penalty 0.2
ps.x = m2.x; ps.y = m2.y;
Math.random = () => 0.999; // always > chance -> escape
ws.sent.length = 0;
await capture(ws, m2.id);
res = lastResult(ws);
Math.random = realRandom;
const expChance = Math.max(PETS.CHANCE_MIN, Math.min(PETS.CHANCE_MAX,
  PETS.BASE_CHANCE + 10 * PETS.TRAP_LVL_BONUS + 10 * PETS.WC_LVL_BONUS - 4 * PETS.LEVEL_PENALTY));
check('escape consumes the trap, awards escape XP, monster lives', ps.inventory.basic_trap === undefined && ps.lifeSkills.trapping.xp === xpAfterCapture + PETS.ESCAPE_XP && m2.alive === true, { trap: ps.inventory.basic_trap, xp: ps.lifeSkills.trapping.xp });
check('chance formula matches (base + bonuses - level penalty)', res && res.captured === false && Math.abs(res.chance - expChance) < 1e-9, { got: res && res.chance, expChance });

// ── 6. dungeon monster: noRespawn honored ──
ws.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'dungeon_start', payload: { config: { waves: 1, monsters: [{ archetype: 'fodder', count: 1 }] } } }));
const dzone = msgsOfType(ws, 'dungeon_started')[0].payload.zone;
ps.z = dzone;
const dm = room.monsters[dzone][0];
dm.hp = 1;
ps.x = dm.x; ps.y = dm.y;
ps.inventory.basic_trap = 1;
Math.random = () => 0.0;
await capture(ws, dm.id);
Math.random = realRandom;
check('dungeon capture leaves respawnAt 0 (noRespawn)', dm.alive === false && dm.respawnAt === 0 && ps.lifeSkills.pets.length === 2, dm.respawnAt);

// ── 7. join adoption + sanitization ──
const forged = new Array(7).fill(0).map((_, i) => ({ archetype: i === 0 ? 'dragon_god' : 'fodder', level: 9999, name: 'x'.repeat(99), element: 'nuclear', personality: 'evil', emoji: 'e'.repeat(99), color: 'javascript:alert(1)' }));
const ws2 = fakeWs('adopt');
await join(ws2, 'bp_pet_new', { rpgLifeSkills: { pets: forged, activePet: null, trapping: { level: 1, xp: 0 } } });
const ps2 = room.playerState['bp_pet_new'];
const adopted = ps2.lifeSkills.pets;
check('forged join list capped at 6 and sanitized', adopted.length === 6 && adopted[0].archetype === 'fodder' && adopted.every((p) => p.level === 100 && p.name.length <= 24 && p.element === null && ['playful', 'lazy', 'curious', 'anxious', 'bold'].includes(p.personality) && /^#/.test(p.color)), adopted[0]);
check('adoption sets activePet', ps2.lifeSkills.activePet === 0, ps2.lifeSkills.activePet);
// server-held list beats the client's on later joins
const ws3 = fakeWs('rejoin');
await join(ws3, 'bp_pet_new', { rpgLifeSkills: { pets: [{ archetype: 'brute', level: 50 }] } });
check('non-empty server list wins over client on rejoin', room.playerState['bp_pet_new'].lifeSkills.pets.length === 6, room.playerState['bp_pet_new'].lifeSkills.pets.length);

// ── 8. forged pet_capture_result denied ──
room.eventBuffer.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'pet_capture_result', payload: { captured: true, pet: { name: 'Hax' } } }));
check('forged pet_capture_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'pet_capture_result').length === 0, room.eventBuffer.map((e) => e.type));

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

// ps (bp_pet_p) has 2 pets, activePet=0 from the captures above.
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

// viaPet without a server-known active pet -> no-pet, no wider range.
// NOTE: ws2's session was evicted by the ws3 same-id rejoin in section
// 7 (v2.3.702 eviction), so bp_pet_new's live socket is ws3.
ps2v.x = 700; ps2v.y = 700; // 200 px from the pile
const savedActive = ps2v.lifeSkills.activePet;
ps2v.lifeSkills.activePet = null;
const coins2Before = ps2v.coins || 0;
ws3.sent.length = 0;
await pickup(ws3, 'vac-a', true);
check('vacuum without an active pet rejected no-pet', lastReject(ws3) && lastReject(ws3).reason === 'no-pet' && (ps2v.coins || 0) === coins2Before, lastReject(ws3));
ps2v.lifeSkills.activePet = savedActive;
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
