/* Quality + hardening test (v2.3.1131, PR15, handoff item E;
 * BALANCE-PLAN §4.6b/§4.6c adopted specs).  Checks:
 *   1.  caps.harden advertised.
 *   2.  Forge mints a quality grade (forced normal/rare/elite/godly via
 *       Math.random stub) + hardness 0 / temper 0.
 *   3.  effective_base formula: identity at H0/Normal (equivalence with
 *       the pre-PR formula), exact multipliers for godly/hardened.
 *   4.  _maxWeaponDmg (anti-cheat ceiling) honors the new layers.
 *   5.  Sanitizer: strict (join bootstrap) STRIPS quality/hardness/
 *       temper; default (stored blob) CLAMPS them.
 *   6.  Harden: success advances + resets temper + exact gold cost
 *       ladder (500×4^H); failure applies the temper pity bands
 *       (0-19 → reset 0, 20-49 → −2, 50-99 → −1, 100+ → none) and
 *       increments temper; odds thresholds per rung.
 *   7.  Gates: blacksmith tier access (floor(skill/5)), maxed, no-gold,
 *       no-weapon, guard gear lock (no charge while locked).
 *   8.  Ledger written (harden_ledger:<pid>) and the INV-27 global H5
 *       log appended on reaching H5.
 *   9.  Forged harden_result is not rebroadcast (deny-list).
 */
import { GameRoom } from '../src/index.js';
import { HARDEN } from '../src/hardening.js';
import { QUALITY_GRADES } from '../src/data.js';

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
const harden = (ws, slot) => room.webSocketMessage(ws, JSON.stringify({ type: 'harden_weapon', payload: { slot } }));
const lastHR = (ws) => { const r = msgsOfType(ws, 'harden_result'); return r[r.length - 1] && r[r.length - 1].payload; };
const realRandom = Math.random;

const ws = fakeWs('h');
await join(ws, 'bp_hd_p');
const ps = room.playerState['bp_hd_p'];
ps.coins = 100000;
ps.lifeSkills = { blacksmithing: { level: 10, xp: 0 } };
ps.inventory = { ore_wood_ore: 99 };

// ── 1. caps ──
const sync = ws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.harden', sync && sync.caps && sync.caps.harden === true, sync && sync.caps);

// ── 2. forge mints quality (forced rolls) ──
const forge = () => room.webSocketMessage(ws, JSON.stringify({ type: 'forge_weapon', payload: { weaponType: 'sword', tierKey: 'wood', isWoodwork: false } }));
for (const [r, expect] of [[0.5, 'normal'], [0.05, 'rare'], [0.005, 'elite'], [0.0000001, 'godly']]) {
  Math.random = () => r;
  ps.weaponStash = []; // room for the swap
  await forge();
  Math.random = realRandom;
  if (ps.weapon.quality !== expect || ps.weapon.hardness !== 0 || ps.weapon.temper !== 0) {
    check('forge quality roll ' + expect, false, ps.weapon);
  }
}
check('forge mints quality per the §4.6b thresholds + H0/T0', true);

// ── 3. effective_base formula ──
const raw = room._weaponBase('sword');
check('H0/Normal is EXACTLY the legacy base (equivalence)', room._weaponEffBase('sword', { quality: 'normal', hardness: 0 }) === raw && room._weaponEffBase('sword', null) === raw, { raw });
check('godly H5 multiplies per the formula', Math.abs(room._weaponEffBase('sword', { quality: 'godly', hardness: 5 }) - (raw + 5 * HARDEN.BASE_BONUS) * 3.0) < 1e-9);
check('rare mult matches the table', Math.abs(room._weaponEffBase('sword', { quality: 'rare', hardness: 0 }) - raw * QUALITY_GRADES.rare.mult) < 1e-9);

// ── 4. anti-cheat ceiling honors the layers ──
ps.weapon = { type: 'sword', tierMult: 1, quality: 'normal', hardness: 0, temper: 0, gearBase: 'wood' };
ps.rangedWeapon = null; ps.staffWeapon = null;
const capNormal = room._maxDmgForAttacker(ps, false);
ps.weapon.quality = 'godly'; ps.weapon.hardness = 5;
const capGodly = room._maxDmgForAttacker(ps, false);
check('damage ceiling rises for godly/hardened weapons', capGodly > capNormal * 2, { capNormal, capGodly });
ps.weapon.quality = 'normal'; ps.weapon.hardness = 0;

// ── 5. sanitizer postures ──
const strict = room._sanitizeWeapon({ type: 'sword', tierMult: 2, quality: 'godly', hardness: 5, temper: 3 }, true);
check('strict sanitize STRIPS the new fields (join bootstrap)', strict.quality === undefined && strict.hardness === undefined && strict.temper === undefined);
const clamped = room._sanitizeWeapon({ type: 'sword', tierMult: 2, quality: 'weird', hardness: 99, temper: -5 });
check('default sanitize clamps (bad quality dropped, hardness→5, temper→0)', clamped.quality === undefined && clamped.hardness === 5 && clamped.temper === 0, clamped);
const kept = room._sanitizeWeapon({ type: 'sword', tierMult: 2, quality: 'elite', hardness: 3, temper: 12 });
check('default sanitize keeps legit stored fields', kept.quality === 'elite' && kept.hardness === 3 && kept.temper === 12);

// ── 6. harden ladder ──
ps.coins = 100000;
// success H0->1 at 80%
Math.random = () => 0.0;
ws.sent.length = 0;
await harden(ws, 'weapon');
Math.random = realRandom;
let hr = lastHR(ws);
check('success: H0→1, temper reset, cost 500', ps.weapon.hardness === 1 && ps.weapon.temper === 0 && ps.coins === 99500 && hr.success === true && hr.cost === 500, { w: ps.weapon, hr });
// cost ladder at H2 = 500*16
ps.weapon.hardness = 2; ps.weapon.temper = 120; // no-reset band
Math.random = () => 0.99; // fail (odds at H2 = 5%)
ws.sent.length = 0;
await harden(ws, 'weapon');
Math.random = realRandom;
hr = lastHR(ws);
check('cost ladder 500×4^H (H2 attempt = 8000)', hr.cost === 8000 && ps.coins === 99500 - 8000, { cost: hr.cost, coins: ps.coins });
check('temper 100+: failure keeps hardness, temper increments', ps.weapon.hardness === 2 && ps.weapon.temper === 121);
// temper bands
const bandCase = async (h, temper, expectH) => {
  ps.weapon.hardness = h; ps.weapon.temper = temper;
  ps.coins = 1000000; // H3 attempts cost 32k -- keep the smith solvent
  Math.random = () => 0.99;
  await harden(ws, 'weapon');
  Math.random = realRandom;
  return ps.weapon.hardness === expectH && ps.weapon.temper === temper + 1;
};
check('temper 0-19: full reset to 0', await bandCase(3, 5, 0));
check('temper 20-49: −2', await bandCase(3, 25, 1));
check('temper 50-99: −1', await bandCase(3, 55, 2));
// odds threshold at H1 (20%)
ps.weapon.hardness = 1; ps.weapon.temper = 200;
Math.random = () => 0.19;
await harden(ws, 'weapon');
Math.random = realRandom;
check('odds threshold: 0.19 succeeds at H1 (20%)', ps.weapon.hardness === 2);
ps.weapon.hardness = 1; ps.weapon.temper = 200;
Math.random = () => 0.21;
await harden(ws, 'weapon');
Math.random = realRandom;
check('odds threshold: 0.21 fails at H1', ps.weapon.hardness === 1);

// ── 7. gates ──
ps.weapon.hardness = 5;
ws.sent.length = 0;
await harden(ws, 'weapon');
check('maxed rejected', lastHR(ws).error === 'maxed');
ps.weapon.hardness = 0;
ps.lifeSkills.blacksmithing.level = 4; // floor(4/5)=0 < tier index 1
ws.sent.length = 0;
await harden(ws, 'weapon');
check('blacksmith tier gate (access, not odds)', lastHR(ws).error === 'skill-gate');
ps.lifeSkills.blacksmithing.level = 10;
ps.coins = 100;
ws.sent.length = 0;
await harden(ws, 'weapon');
check('insufficient gold rejected before any roll', lastHR(ws).error === 'no-gold' && ps.coins === 100);
ps.coins = 100000;
ws.sent.length = 0;
await harden(ws, 'nothere');
check('bad slot rejected', lastHR(ws).error === 'bad-slot');
ps._gearLockUntil = Date.now() + 60000;
const coinsPreLock = ps.coins;
ws.sent.length = 0;
await harden(ws, 'weapon');
check('guard gear lock blocks hardening without charging', ps.coins === coinsPreLock && msgsOfType(ws, 'harden_result').length === 0 && msgsOfType(ws, 'gear_locked').length === 1);
ps._gearLockUntil = 0;

// ── 8. ledger + INV-27 H5 log ──
const ledger = await state.storage.get('harden_ledger:bp_hd_p');
check('harden ledger persisted + capped shape', Array.isArray(ledger) && ledger.length > 0 && ledger.length <= HARDEN.LEDGER_CAP && typeof ledger[ledger.length - 1].success === 'boolean', ledger && ledger.length);
ps.weapon.hardness = 4; ps.weapon.temper = 0;
ps.coins = 1000000; // the H4 attempt costs 128,000g
Math.random = () => 0.0001; // < 0.005 -> H5!
await harden(ws, 'weapon');
Math.random = realRandom;
const h5log = await state.storage.get('harden_h5_log');
check('reaching H5 appends the INV-27 global log', ps.weapon.hardness === 5 && Array.isArray(h5log) && h5log.length === 1, h5log);

// ── 9. deny-list ──
const ws2 = fakeWs('peer');
await join(ws2, 'bp_hd_peer');
room.eventBuffer.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'harden_result', payload: { success: true, hardness: 5 } }));
check('forged harden_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'harden_result').length === 0, room.eventBuffer.map((e) => e.type));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
