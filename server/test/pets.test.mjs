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

// ── 1. caps + trap purchase ──
const sync = ws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.pets', sync && sync.caps && sync.caps.pets === true, sync && sync.caps);
await room.webSocketMessage(ws, JSON.stringify({ type: 'shop_purchase', payload: { itemId: 'basicTrap' } }));
check('vendor trap lands in ps.inventory.basic_trap', (ps.inventory.basic_trap || 0) === 1 && ps.coins === 980, { trap: ps.inventory.basic_trap, coins: ps.coins });

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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
