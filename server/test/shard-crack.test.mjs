/* Shards cracked for raw gems, three raw gems combined into a gem, gems in
 * the bag -- v2.3.3516 (server/src/shardcrack.js, gems.js; docs/GEM-PLAN.md,
 * its Phase 2: the owner took every recommended answer, 2026-10-20).
 *
 *   1. The flags: caps.shardcrack, under a kill-switch name; both receipts
 *      privileged.
 *   2. The crack: each shard rolled 1-100 at the player's own Gem Cutting
 *      chance; the rolls sent are the rolls credited, the shards taken, the
 *      raw gems into the BAG, 40 XP a crack found or not, one row written.
 *   3. Crack all: never more than the bag holds, never more than 50 an ask.
 *   4. The chance by level, over many rolls: 10%, 12% from 15, 15% from 35,
 *      20% from 60.
 *   5. Refused, nothing taken, nothing written: every reason.
 *   6. The combine: three raw gems into one gem (nothing left over of the
 *      three), 200 XP, the gem owed its set's Enchanting XP; refused short;
 *      Flora's own gems.
 *   7. The Rare Gem: one into any of the eight lands' gems, never Dark or
 *      Light, refused with none.
 *   8. The old one-raw-gem cut is refused while the crack is on (the gems
 *      sent back to the page), and the raw gem off a kill is gone.
 *   9. The kill switch: no crack, no combine; the old cut and the kill's raw
 *      gem back, into the bag.
 *  10. The move into the bag: the old pouch at the join, once, raw and cut,
 *      nothing lost; a second join moves nothing.
 *  11. A death keeps gems; No man's land's whole-bag loss takes them.
 *  12. One gem spent once: two combines in one bundle, three raw gems.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
let SC = {};
try { SC = await import('../src/shardcrack.js'); } catch (e) { SC = {}; }
const SHARD_CRACK = SC.SHARD_CRACK || { CHANCE: [], LANDS: {} };
const shardCrackChance = SC.shardCrackChance || (() => null);
import { LIVEOPS } from '../src/liveops.js';

let NOW = 1_770_000_000_000;
Date.now = () => NOW;
const realRandom = Math.random;
const withRandom = (vals, fn) => {
  let i = 0;
  Math.random = () => (i < vals.length ? vals[i++] : vals[vals.length - 1]);
  try { return fn(); } finally { Math.random = realRandom; }
};

function makeState() {
  const store = new Map();
  const writes = [];
  return {
    _store: store, writes,
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); store.set(kk, JSON.parse(JSON.stringify(vv))); } return; }
        writes.push(String(k)); store.set(k, JSON.parse(JSON.stringify(v)));
      },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { writes.push(String(k)); store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: -100000, y: -100000, z: 'meadow' } }));
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const PID = 'bp_shardcrack_a';
let ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
const inv = () => ps().inventory || (ps().inventory = {});
const gc = () => ps().lifeSkills.gemCutting;
const gcXp = () => { const s = gc(); return s && typeof s === 'object' ? (s.xp || 0) + 1e7 * ((s.level || 1) - 1) : 0; };
const setLevel = (lv) => { ps().lifeSkills.gemCutting = { level: lv, xp: 0 }; };
const rowsFor = (pid) => state.writes.filter((k) => k === 'rpg:' + pid).length;
const send = async (sock, type, payload) => {
  sock.sent.length = 0;
  NOW += 20;   /* a socket's message budget refills with time (flood.js): a frozen clock would cut it off */
  await room.webSocketMessage(sock, JSON.stringify({ type, payload }));
  await flush();
  const t = type === 'shard_crack' ? 'shard_crack_result' : 'gem_combine_result';
  const m = sock.sent.filter((x) => x.type === t);
  return m.length ? m[m.length - 1].payload : null;
};
const crack = (land, count) => send(ws, 'shard_crack', { land, count });
const combine = (payload) => send(ws, 'gem_combine', payload);

// ── 1. The flags ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('caps.shardcrack advertised', !!(sync && sync.caps && sync.caps.shardcrack === true), sync && sync.caps && sync.caps.shardcrack);
  check('...under a name the live flags take (lower case, TRAPS §117)', LIVEOPS.FLAG_NAME_RE.test('shardcrack'));
  check('both receipts are privileged (a page cannot forge gems onto another)',
    PRIVILEGED_EVENTS.has('shard_crack_result') && PRIVILEGED_EVENTS.has('gem_combine_result'));
  check('the lands and their gems: the eight lands, each its own element, the meadow none',
    Object.keys(SHARD_CRACK.LANDS).length === 8 && SHARD_CRACK.LANDS.ember === 'flame' && SHARD_CRACK.LANDS.verdant === 'flora'
      && SHARD_CRACK.LANDS.hollows === 'stone' && !('meadow' in SHARD_CRACK.LANDS), SHARD_CRACK.LANDS);
}

// ── 2. The crack ──
{
  setLevel(1);
  inv().shard_frost = 5;
  delete inv().gem_raw_frost;
  const xp0 = gcXp();
  const w0 = rowsFor(PID);
  /* rolls 6 (held), 51, 10 (held: at the chance), 11, 99 */
  const r = await withRandom([0.05, 0.5, 0.099, 0.1, 0.98], () => crack('frost', 5));
  check('a crack answers with every roll, in order, and the chance it was rolled at',
    !!r && r.ok && JSON.stringify(r.rolls) === JSON.stringify([6, 51, 10, 11, 99]) && r.chance === 10 && r.land === 'frost' && r.element === 'frost', r);
  check('...a roll at or under the chance held a gem: 2 found', !!r && r.found === 2, r && r.found);
  check('...the raw gems found are in the BAG, the shards taken', inv().gem_raw_frost === 2 && !('shard_frost' in inv()) && r.left === 0,
    { inv: inv(), left: r && r.left });
  check('...40 Gem Cutting XP a crack, found or not (decision 11)', gcXp() - xp0 === 200 && r.xp === 200, { got: gcXp() - xp0, r: r && r.xp });
  await flush();
  check('...one row written for five cracks', rowsFor(PID) - w0 === 1, rowsFor(PID) - w0);
  check('...a player_state follows the receipt (the bag and the XP)',
    ws.sent.findIndex((m) => m.type === 'player_state') > ws.sent.findIndex((m) => m.type === 'shard_crack_result'));
  const stored = state._store.get('rpg:' + PID);
  check('...and it is saved: the stored bag holds the raw gems', !!stored && stored.inventory && stored.inventory.gem_raw_frost === 2, stored && stored.inventory);
  /* the receipt is the cracker's alone */
  const PB = 'bp_shardcrack_b';
  const wsb = fakeWs();
  await join(wsb, PB);
  inv().shard_ember = 1;
  wsb.sent.length = 0;
  await withRandom([0.5], () => crack('ember', 1));
  check('...and private: another player is sent no receipt', !wsb.sent.some((m) => m.type === 'shard_crack_result'));
}

// ── 3. Crack all ──
{
  inv().shard_sky = 12;
  const r = await withRandom([0.5], () => crack('sky', 50));
  check('Crack all takes no more shards than the bag holds (asked 50, held 12)', !!r && r.ok && r.rolls.length === 12 && !('shard_sky' in inv()), r && r.rolls.length);
  inv().shard_sky = 80;
  const r2 = await withRandom([0.5], () => crack('sky', 999));
  check('...and never more than 50 an ask', !!r2 && r2.rolls.length === 50 && inv().shard_sky === 30 && r2.left === 30, { n: r2 && r2.rolls.length, left: inv().shard_sky });
  const r3 = await withRandom([0.5], () => crack('sky', 0));
  check('...a count of nothing is one', !!r3 && r3.rolls.length === 1 && inv().shard_sky === 29, r3 && r3.rolls.length);
}

// ── 4. The chance by level, over many rolls ──
{
  const N = 20000;
  const off = [];
  for (const [lv, pct] of [[1, 10], [14, 10], [15, 12], [34, 12], [35, 15], [59, 15], [60, 20], [99, 20]]) {
    if (shardCrackChance(lv) !== pct) off.push({ lv, want: pct, got: shardCrackChance(lv) });
  }
  check('the chance by Gem Cutting level: 10%, 12% from 15, 15% from 35, 20% from 60', off.length === 0, off);
  const rateOff = [];
  for (const [lv, pct] of [[1, 10], [15, 12], [35, 15], [60, 20]]) {
    setLevel(lv);
    let found = 0, cracked = 0;
    for (let i = 0; i < N / 50; i++) {
      setLevel(lv);   /* every crack pays XP: hold the level the chance is for */
      inv().shard_tidal = 50;
      const r = await crack('tidal', 50);
      if (!r || !r.ok) { rateOff.push({ lv, refused: r }); break; }
      found += r.found; cracked += r.rolls.length;
      if (r.rolls.filter((x) => x <= r.chance).length !== r.found) rateOff.push({ lv, mismatch: r });
    }
    const p = pct / 100, sd = Math.sqrt(cracked * p * (1 - p));
    if (Math.abs(found - cracked * p) > 5 * sd) rateOff.push({ lv, found, cracked, want: cracked * p });
  }
  check(`over ${N} cracks at each step, the gems found sit at its chance (within five standard deviations), every receipt's found its own rolls'`,
    rateOff.length === 0, rateOff);
  setLevel(1);
}

// ── 5. Refused, nothing taken, nothing written ──
{
  inv().shard_mist = 3;
  const before = JSON.stringify(inv());
  const w0 = rowsFor(PID);
  const bad = [];
  for (const [land, why] of [['meadow', 'bad_land'], ['commons', 'bad_land'], ['__proto__', 'bad_land'], ['constructor', 'bad_land'], [undefined, 'bad_land'], ['hollows', 'short']]) {
    const r = await crack(land, 1);
    if (!r || r.ok || r.reason !== why) bad.push({ land, want: why, r });
  }
  ps().dead = true;
  const rd = await crack('mist', 1);
  ps().dead = false;
  if (!rd || rd.reason !== 'down') bad.push({ want: 'down', r: rd });
  room._liveFlags = { ...(room._liveFlags || {}), shardcrack: false };
  const ro = await crack('mist', 1);
  const co = await combine({ element: 'mist' });
  delete room._liveFlags.shardcrack;
  if (!ro || ro.reason !== 'off') bad.push({ want: 'off', r: ro });
  if (!co || co.reason !== 'off') bad.push({ want: 'off (combine)', r: co });
  await flush();
  check('a crack is refused for a land with no gem ("bad_land": the meadow, the commons, a prototype name, none), no shards ("short"), a player who is down ("down"), and the kill switch ("off")',
    bad.length === 0, bad);
  check('...and a refusal takes nothing and writes nothing', JSON.stringify(inv()) === before && rowsFor(PID) === w0, { inv: inv(), rows: rowsFor(PID) - w0 });
}

// ── 6. The combine ──
{
  inv().gem_raw_storm = 4;
  delete inv().gem_storm;
  ps().lifeSkills.gemsUnpaid = {};
  const xp0 = gcXp();
  const w0 = rowsFor(PID);
  const r = await combine({ element: 'storm' });
  await flush();
  check('three raw gems make one Storm Gem: three taken, one made', !!r && r.ok && r.made === 'gem_storm' && inv().gem_storm === 1 && inv().gem_raw_storm === 1, { r, inv: inv() });
  check('...200 Gem Cutting XP (decision 11), one row', gcXp() - xp0 === 200 && r.xp === 200 && rowsFor(PID) - w0 === 1, { xp: gcXp() - xp0, rows: rowsFor(PID) - w0 });
  check('...and the gem made is owed its set\'s Enchanting XP (weapongem.js "THE XP, ONCE A GEM")', (ps().lifeSkills.gemsUnpaid || {}).storm === 1, ps().lifeSkills.gemsUnpaid);
  const short = await combine({ element: 'storm' });
  check('...one raw gem left is "short", saying what is needed and held', !!short && !short.ok && short.reason === 'short' && short.need === 3 && short.have === 1 && inv().gem_raw_storm === 1, short);
  inv().gem_raw_storm = 3;
  await combine({ element: 'storm' });
  check('...three exactly leaves no raw key behind, not a zero', !('gem_raw_storm' in inv()) && inv().gem_storm === 2, inv());
  inv().gem_raw_flora = 3;
  const rf = await combine({ element: 'flora' });
  check('Flora\'s raw gems make a Flora Gem (decision 7: a weapon\'s gem)', !!rf && rf.ok && inv().gem_flora === 1, rf);
  const bad = [];
  for (const e of ['plasma', '__proto__', 'hasOwnProperty', null, 7]) {
    const rb = await combine({ element: e });
    if (!rb || rb.ok || rb.reason !== 'bad_gem') bad.push({ e, rb });
  }
  check('...not a gem\'s element is "bad_gem"', bad.length === 0, bad);
  /* an old pouch still counts: two in the bag and one in the pouch make one */
  inv().gem_raw_wind = 2;
  ps().lifeSkills.gems = { raw_wind: 1 };
  const rp = await combine({ element: 'wind' });
  check('...a raw gem still in an old pouch counts toward the three (the bag first, then the pouch)', !!rp && rp.ok && !('gem_raw_wind' in inv())
    && !('raw_wind' in (ps().lifeSkills.gems || {})) && inv().gem_wind === 1, { inv: inv(), pouch: ps().lifeSkills.gems });
}

// ── 7. The Rare Gem ──
{
  inv().rare_gem = 2;
  const r = await combine({ element: 'venom', rare: true });
  check('a Rare Gem cuts into the gem picked (decision 6)', !!r && r.ok && r.rare === true && inv().gem_venom === 1 && inv().rare_gem === 1, { r, inv: inv() });
  const rd = await combine({ element: 'dark', rare: true });
  const rl = await combine({ element: 'light', rare: true });
  check('...the eight lands\' elements only: never Dark or Light (the realms, not built)', !!rd && rd.reason === 'bad_gem' && !!rl && rl.reason === 'bad_gem' && inv().rare_gem === 1, { rd, rl });
  await combine({ element: 'flora', rare: true });
  const rn = await combine({ element: 'frost', rare: true });
  check('...Flora too, and with none left: "no_rare", no key left behind', inv().gem_flora === 2 && !!rn && rn.reason === 'no_rare' && !('rare_gem' in inv()), { rn, inv: inv() });
  check('...a Rare Gem\'s cut is a gem made: owed its XP', (ps().lifeSkills.gemsUnpaid || {}).venom === 1, ps().lifeSkills.gemsUnpaid);
  /* `rare` must be exactly true: a truthy string is the raw combine */
  inv().rare_gem = 1;
  const rs = await combine({ element: 'frost', rare: 'yes' });
  check('...only rare: true asks for the Rare Gem (anything else is the three raw gems)', !!rs && rs.reason === 'short' && inv().rare_gem === 1, rs);
  delete inv().rare_gem;
}

// ── 8. The old cut refused; no raw gem off a kill ──
{
  inv().gem_raw_frost = 1;
  setLevel(60);
  ws.sent.length = 0;
  NOW += 20;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'gem_cut_request', payload: { gem: 'frost' } }));
  await flush();
  check('the old one-raw-gem cut is refused while the crack is on: the raw gem stays, no gem made, no XP',
    inv().gem_raw_frost === 1 && !inv().gem_frost && !ws.sent.some((m) => m.type === 'gem_cut_result'), { inv: inv(), sent: ws.sent.map((m) => m.type) });
  check('...and the page is sent its gems back (its own prediction took one)', ws.sent.some((m) => m.type === 'player_state'), ws.sent.map((m) => m.type));
  const t = { lifeSkills: {}, inventory: {} };
  room._gemRawOnKill(t, 'frost', true);
  check('no raw gem off a kill (decision 1), even on a sure hit', Object.keys(t.inventory).length === 0, t);
  setLevel(1);
}

// ── 9. The kill switch ──
{
  room._liveFlags = { ...(room._liveFlags || {}), shardcrack: false };
  const wsk = fakeWs();
  await join(wsk, 'bp_shardcrack_k');
  const sync = wsk.sent.find((m) => m.type === 'state_sync');
  check('shardcrack: false un-advertises it', !!sync && sync.caps && sync.caps.shardcrack === false, sync && sync.caps && sync.caps.shardcrack);
  const pk = room.playerState['bp_shardcrack_k'];
  pk.lifeSkills.gemCutting = { level: 60, xp: 0 };
  pk.lifeSkills.gemsUnpaid = {};
  pk.inventory = { gem_raw_flame: 1 };
  await withRandom([0.5], () => room.webSocketMessage(wsk, JSON.stringify({ type: 'gem_cut_request', payload: { gem: 'flame' } })));
  check('...the old cut comes back: one raw gem from the bag, a Flame Gem into it, owed its XP',
    !('gem_raw_flame' in pk.inventory) && pk.inventory.gem_flame === 1 && (pk.lifeSkills.gemsUnpaid || {}).flame === 1, { inv: pk.inventory, owed: pk.lifeSkills.gemsUnpaid });
  const t = { lifeSkills: {}, inventory: {} };
  room._gemRawOnKill(t, 'ember', true);
  check('...and the kill\'s raw gem, into the bag', t.inventory.gem_raw_flame === 1, t);
  delete room._liveFlags.shardcrack;
}

// ── 10. The move into the bag ──
{
  const PM = 'bp_shardcrack_m';
  const wsm = fakeWs();
  await join(wsm, PM);
  const pm = room.playerState[PM];
  pm.inventory = { gem_frost: 1, shard_frost: 4 };
  pm.lifeSkills.gems = { raw_frost: 2, polished_frost: 3, raw_light: 1, polished_dark: 2 };
  pm.lifeSkills.gemsBack = { frost: 1 };
  pm.lifeSkills.gemsUnpaid = {};
  await room._saveRpg(PM, pm);
  const wsm2 = fakeWs();
  await join(wsm2, PM);
  const p2 = room.playerState[PM];
  check('the join moves an old pouch into the bag: raw and cut, one for one, onto what the bag held',
    p2.inventory.gem_raw_frost === 2 && p2.inventory.gem_frost === 4 && p2.inventory.gem_raw_light === 1 && p2.inventory.gem_dark === 2
      && p2.inventory.shard_frost === 4 && Object.keys(p2.lifeSkills.gems || {}).length === 0, { inv: p2.inventory, pouch: p2.lifeSkills.gems });
  check('...each polished gem owed its XP less the ones that came back (frost 3-1, dark 2)',
    (p2.lifeSkills.gemsUnpaid || {}).frost === 2 && (p2.lifeSkills.gemsUnpaid || {}).dark === 2, p2.lifeSkills.gemsUnpaid);
  const stored = state._store.get('rpg:' + PM);
  check('...saved so: the stored record has the gems in the bag and an empty pouch',
    !!stored && stored.inventory.gem_frost === 4 && Object.keys((stored.lifeSkills && stored.lifeSkills.gems) || {}).length === 0, stored && { inv: stored.inventory, pouch: stored.lifeSkills && stored.lifeSkills.gems });
  const wsm3 = fakeWs();
  await join(wsm3, PM);
  const p3 = room.playerState[PM];
  check('...and a second join moves and owes nothing more', p3.inventory.gem_frost === 4 && p3.inventory.gem_raw_frost === 2
    && (p3.lifeSkills.gemsUnpaid || {}).frost === 2, { inv: p3.inventory, owed: p3.lifeSkills.gemsUnpaid });
}

// ── 11. A death keeps gems; No man's land's whole-bag loss takes them ──
{
  check('a death keeps gems, raw and cut (gathering.js _keptThroughDeath), not shards',
    room._keptThroughDeath('gem_frost') && room._keptThroughDeath('gem_raw_flora') && !room._keptThroughDeath('shard_frost')
      && !room._keptThroughDeath('gem_bogus') && !room._keptThroughDeath('rare_gem'));
  const pd = { inventory: { gem_frost: 2, gem_raw_storm: 1, shard_frost: 3, rare_gem: 1 } };
  const kept = room._wipeInventoryOnDeath(pd);
  check('...an ordinary death\'s wipe leaves them in the bag', kept.gem_frost === 2 && kept.gem_raw_storm === 1 && !kept.shard_frost && !kept.rare_gem, kept);
  const all = room._wipeInventoryOnDeath(pd, true);
  check('...and No man\'s land\'s (everything carried, `all`) takes them with the rest', Object.keys(all).length === 0, all);
}

// ── 12. One gem spent once: two combines in one bundle ──
{
  inv().gem_raw_water = 3;
  delete inv().gem_water;
  ws.sent.length = 0;
  NOW += 20;
  await room.webSocketMessage(ws, JSON.stringify([{ type: 'gem_combine', payload: { element: 'water' } }, { type: 'gem_combine', payload: { element: 'water' } }]));
  await flush();
  const rs = ws.sent.filter((m) => m.type === 'gem_combine_result').map((m) => m.payload);
  check('two combines in one bundle with three raw gems: one gem, one refusal', inv().gem_water === 1 && rs.length === 2 && rs[0].ok && !rs[1].ok && rs[1].reason === 'short',
    { inv: inv(), rs });
  inv().shard_thunder = 1;
  ws.sent.length = 0;
  NOW += 20;
  await room.webSocketMessage(ws, JSON.stringify([{ type: 'shard_crack', payload: { land: 'thunder', count: 1 } }, { type: 'shard_crack', payload: { land: 'thunder', count: 1 } }]));
  await flush();
  const cs = ws.sent.filter((m) => m.type === 'shard_crack_result').map((m) => m.payload);
  check('...and two cracks of one shard: one crack, one "short"', cs.length === 2 && cs[0].ok && cs[0].rolls.length === 1 && !cs[1].ok && cs[1].reason === 'short', cs);
}

Math.random = realRandom;
console.log(failures === 0 ? '\nall shard-crack checks passed' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
