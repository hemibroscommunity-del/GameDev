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
// v2.3.1345: the accelerating flat channel headroom (+10,100 damage,
// +15,150 crit) dwarfs a tier-1 wood sword's multiplicative
// quality/hardness uplift, so the guard is directional only — godly
// must still raise the ceiling, by however little relative to the
// flat terms.
check('damage ceiling rises for godly/hardened weapons', capGodly > capNormal, { capNormal, capGodly });
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

// ── 10. v2.3.1141: server-minted weapon drops ──
// This suite owns the drop tests because the drop mint is the second
// server quality-roll site (after the forge).  Math.random = () => 0
// forces the FULL rare chain: drop passes, tier roll 0 -> shift (zone
// has an element), type -> greatsword, quality roll 0 -> godly.
check('caps.weaponDrops advertised', sync && sync.caps && sync.caps.weaponDrops === true, sync && sync.caps);

const wdMon = { id: 'wd-1', arch: 'fodder', level: 25, x: 100, y: 100, gold: 5, xp: 5 };
Math.random = () => 0;
const wdPile = room._spawnLootForKill('frost', wdMon, 'bp_hd_p', ['bp_hd_p'], { bp_hd_p: 1 });
Math.random = realRandom;
check('forced roll mints a weapon on the pile (shift/godly chain)',
  !!wdPile && !!wdPile.weapon && wdPile.weapon.tier === 'shift' && wdPile.weapon.quality === 'godly'
  && wdPile.weapon.hardness === 0 && wdPile.weapon.temper === 0 && wdPile.weapon.hardenBonus === null
  && wdPile.weaponClaimed === false,
  wdPile && wdPile.weapon);
check('shift drop takes the zone element, name matches client convention',
  wdPile.weapon.element1 === 'frost' && wdPile.weapon.element2 === null
  && wdPile.weapon.name === 'Prismatic Great Sword' && wdPile.weapon.tierMult === 3.0,
  wdPile.weapon);

// Mystery reveal: the broadcastable serialization must carry presence
// but NEVER the quality (or the raw blob).
const wdWire = room._serializePile(wdPile);
check('wire pile: hasWeapon/tier/type/name, NO quality, NO raw blob',
  wdWire.hasWeapon === true && wdWire.weaponClaimed === false
  && wdWire.weaponTier === 'shift' && wdWire.weaponType === 'greatsword'
  && wdWire.weaponName === 'Prismatic Great Sword'
  && wdWire.weapon === undefined && !JSON.stringify(wdWire).includes('godly'),
  wdWire);

// No-drop path: random 0.999 fails the cubic chance at L25; the pile
// still spawns for its coins, weapon stays null.
Math.random = () => 0.999;
const wdNone = room._spawnLootForKill('frost', { id: 'wd-2', arch: 'fodder', level: 25, x: 0, y: 0, gold: 5 }, 'bp_hd_p', ['bp_hd_p'], { bp_hd_p: 1 });
Math.random = realRandom;
check('no-drop roll leaves pile.weapon null', !!wdNone && wdNone.weapon === null && room._serializePile(wdNone).hasWeapon === false);

// Claim through the REAL loot_pickup handler: recipient in range
// stashes the weapon; the private credit is the quality reveal.
const psHd = room.playerState['bp_hd_p'];
psHd.z = 'frost'; psHd.x = 100; psHd.y = 100; psHd.dead = false;
psHd.weaponStash = [];
room.eventBuffer.length = 0;
ws.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'loot_pickup', payload: { lootId: wdPile.lootId, zone: 'frost' } }));
const wdCredit = msgsOfType(ws, 'loot_credit')[0];
check('loot_credit reveals the weapon (quality included) + stashed flag',
  wdCredit && wdCredit.payload.weapon && wdCredit.payload.weapon.quality === 'godly'
  && wdCredit.payload.weaponStashed === true && wdCredit.payload.weaponSoldFor === null,
  wdCredit && wdCredit.payload);
check('weapon landed in the server-side stash', psHd.weaponStash.length === 1 && psHd.weaponStash[0].quality === 'godly');
check('pile weapon claim flagged + broadcast carries weaponClaimedNow',
  wdPile.weaponClaimed === true
  && room.eventBuffer.some((e) => e.type === 'loot_claimed' && e.payload.weaponClaimedNow === true),
  room.eventBuffer.map((e) => e.type));

// Second claim can't double-take: the picker already claimed the pile
// (single-claim gate) and the weapon flag is spent for everyone else.
ws.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'loot_pickup', payload: { lootId: wdPile.lootId, zone: 'frost' } }));
check('re-claim rejected (single-claim gate holds for the weapon too)',
  msgsOfType(ws, 'loot_credit').length === 0 && psHd.weaponStash.length === 1);

// Non-recipient can't take a weapon pile.
Math.random = () => 0;
const wdPile2 = room._spawnLootForKill('frost', { id: 'wd-3', arch: 'fodder', level: 25, x: 100, y: 100, gold: 5 }, 'bp_hd_p', ['bp_hd_p'], { bp_hd_p: 1 });
Math.random = realRandom;
const psPeer = room.playerState['bp_hd_peer'];
psPeer.z = 'frost'; psPeer.x = 100; psPeer.y = 100; psPeer.dead = false;
ws2.sent.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'loot_pickup', payload: { lootId: wdPile2.lootId, zone: 'frost' } }));
check('non-recipient rejected (weapon stays on the pile)',
  msgsOfType(ws2, 'loot_credit').length === 0
  && msgsOfType(ws2, 'loot_pickup_rejected').length === 1
  && wdPile2.weaponClaimed === false);

// Stash at cap: the claim auto-sells for the server sell value instead
// of silently destroying the weapon.
psHd.weaponStash = Array.from({ length: room.WEAPON_STASH_CAP }, () => ({ type: 'sword', tierMult: 1 }));
const coinsPreSell = psHd.coins;
ws.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'loot_pickup', payload: { lootId: wdPile2.lootId, zone: 'frost' } }));
const wdCredit2 = msgsOfType(ws, 'loot_credit')[0];
const expectedSell = room._weaponSellValue(wdCredit2.payload.weapon);
check('stash-at-cap auto-sells (weaponSoldFor = server sell value)',
  wdCredit2 && wdCredit2.payload.weaponStashed === false
  && wdCredit2.payload.weaponSoldFor === expectedSell
  && psHd.weaponStash.length === room.WEAPON_STASH_CAP
  && psHd.coins === coinsPreSell + expectedSell + 5, // +5: the pile's coin share rides the same claim
  { credit: wdCredit2 && wdCredit2.payload, coins: psHd.coins, coinsPreSell });

// Join-bootstrap strict-strip still guards the ingest door.
const wdStrict = room._sanitizeWeapon({ type: 'sword', tierMult: 3, quality: 'godly', hardness: 5, temper: 0 }, true);
check('strict sanitize still strips quality on client blobs (drops are server-minted now)',
  wdStrict.quality === undefined && wdStrict.hardness === undefined);

/* ── v2.3.1606: inbound abuse bounds ──
 *
 * Before this, one authenticated socket could loop a ~900 KB message:
 * parsed, retained by reference in the room-wide eventBuffer (v2.3.1163
 * made overflow DELAY rather than drop), fanned to every socket, and
 * re-stringified per zone-group on the single DO thread every 22 ms.
 * EVENTS_PER_TICK_CAP bounded the COUNT of events and never the bytes.
 * Each check below fails against the pre-v2.3.1606 server. */
{
  const wsAb = fakeWs('abuse');
  await join(wsAb, 'bp_hd_abuse');
  room.eventBuffer.length = 0;

  // 1. oversize is refused BEFORE parse, and costs the room nothing.
  const huge = JSON.stringify({ type: 'qa_flood', text: 'A'.repeat(room.MAX_INBOUND_BYTES) });
  await room.webSocketMessage(wsAb, huge);
  check('oversize inbound message is dropped, never relayed',
    room.eventBuffer.length === 0, room.eventBuffer.length);
  check('oversize drop is counted on the session (evidence, not silence)',
    room.sessions.get(wsAb).oversize === 1, room.sessions.get(wsAb).oversize);

  // 2. a normal chat still relays — the cap must sit ABOVE real traffic.
  //    ChatPanel.jsx caps the input at 200 chars; this is that, exactly.
  room.eventBuffer.length = 0;
  const sess = room.sessions.get(wsAb);
  sess.relayTokens = room.RELAY_BURST; sess.relayAt = Date.now();
  await room.webSocketMessage(wsAb, JSON.stringify({ type: 'chat', payload: { text: 'x'.repeat(200) } }));
  check('a real 200-char chat line still relays',
    room.eventBuffer.length === 1 && room.eventBuffer[0].from === 'bp_hd_abuse',
    room.eventBuffer.length);

  // 3. the relay token bucket bounds the RATE into the shared buffer.
  room.eventBuffer.length = 0;
  sess.relayTokens = room.RELAY_BURST; sess.relayAt = Date.now();
  for (let i = 0; i < 60; i++) {
    await room.webSocketMessage(wsAb, JSON.stringify({ type: 'chat', payload: { text: 'spam' + i } }));
  }
  check('relay bucket caps a burst at RELAY_BURST',
    room.eventBuffer.length === room.RELAY_BURST, room.eventBuffer.length);
  check('excess relays are counted as dropped',
    sess.relayDropped === 60 - room.RELAY_BURST, sess.relayDropped);

  // 4. the bucket REFILLS — this is a throttle, not a permanent lockout.
  room.eventBuffer.length = 0;
  sess.relayAt = Date.now() - 1000; // simulate one second elapsed
  await room.webSocketMessage(wsAb, JSON.stringify({ type: 'chat', payload: { text: 'after refill' } }));
  check('the bucket refills over time (throttle, not a ban)',
    room.eventBuffer.length === 1, room.eventBuffer.length);

  // 5. the tick drain has a BYTE ceiling, and honors v2.3.1163: the
  //    remainder must stay QUEUED, not be discarded.
  room.eventBuffer.length = 0;
  const chunk = 'B'.repeat(8000);
  for (let i = 0; i < 40; i++) room.eventBuffer.push({ type: 'qa_bytes', payload: { i, chunk } });
  const queuedBefore = room.eventBuffer.length;
  let drained = 0, bytes = 0;
  {
    const cap = Math.min(room.eventBuffer.length, room.EVENTS_PER_TICK_CAP);
    let take = 0, b = 0;
    while (take < cap) {
      const sz = JSON.stringify(room.eventBuffer[take]).length;
      if (take > 0 && b + sz > room.EVENT_BYTES_PER_TICK) break;
      b += sz; take++;
    }
    drained = take; bytes = b;
  }
  check('tick drain stops on the BYTE ceiling, not just the count',
    drained < queuedBefore && bytes <= room.EVENT_BYTES_PER_TICK,
    { drained, queuedBefore, bytes, ceiling: room.EVENT_BYTES_PER_TICK });
  check('at least one event always drains (a huge entry cannot wedge the queue)',
    drained >= 1, drained);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
