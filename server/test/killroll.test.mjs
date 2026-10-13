/* ONE ROLL A KILL -- v2.3.3198 (server/src/killroll.js; spec
 * docs/specs/monster-codex.md "One roll a kill").
 *
 * The owner, on the codex's Roll column: "Shouldn't these numbers not overlap
 * each other? Getting a roll of 1 implies you'd get all the loot with 1, but
 * it's really just the gold nugget. I think these should be number ranges.
 * That way a player hunting for something can also be looking for a roll
 * number within that range".
 *
 *   1. THE NUMBERS: each drop owns its chance x 10,000 numbers, from 1 up in
 *      the order the codex prints them, no gap and no overlap; a monster with
 *      no raw gem (the blue slime) has none for it, and its shard moves down.
 *   2. CAPS: caps.killroll advertised.
 *   3. A KILL ROLLS ONCE: a roll on each drop's first and last number drops
 *      exactly that drop -- into the pile, or the killing blow's bag -- and
 *      nothing else; the next number is the next drop's; past the last, none.
 *      The kill's combat_credit says the roll, and the drop (`rh`).
 *   4. ONLY THE ROLL: with every other draw of the kill forced to 0 (which on
 *      their own rolls would drop everything at once), a roll on no drop's
 *      numbers drops none of them.
 *   5. A PARTY: everyone the kill credits is told the roll; `rh` only to
 *      those the drop is for -- a pile's to the pile's players (5% of the
 *      damage), the raw gem and the nugget to the killing blow alone.
 *   6. THE WORKSHOP'S SHARE: on a flat drop's numbers, it drops at the run's
 *      share (dungeon.js _workshopDropScale) -- one more draw; the shard's and
 *      the raw gem's are never scaled.
 *   7. disable_weapon_drops: the iron blade's numbers drop nothing, and every
 *      other drop keeps its own.
 *   8. THE KILL SWITCH: `killroll: false` un-advertises, sends no roll, and
 *      puts every drop back on its own roll.
 *   9. THE TEST LEVER: /dev/killroll's `next` is the next kill's roll.
 *  10. THE CHANCES: over 300,000 rolls each drop comes up as often as its
 *      chance says.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { KILL_ROLL, KILL_ROLL_CHANCES, killRollLayout, killRollHit } from '../src/killroll.js';
import { GOLD_NUGGET_MONSTER_DROP, GEM_RAW_MONSTER_DROP, RARE_GEM_MONSTER_DROP, SHARD_MONSTER_DROP, MONSTER_IRON_WEAPON_DROP, MONSTER_ARMOR_DROPS } from '../src/data.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const k of [...store.keys()].filter((x) => !opts?.prefix || x.startsWith(opts.prefix)).sort()) out.set(k, store.get(k));
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
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const last = (ws, type) => { const r = msgsOfType(ws, type); return r.length ? r[r.length - 1].payload : null; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
const realRandom = Math.random;
const withRandom = (vals, fn) => {
  let i = 0;
  Math.random = () => (i < vals.length ? vals[i++] : vals[vals.length - 1]);
  try { return fn(); } finally { Math.random = realRandom; }
};

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'K', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  return room.playerState[id];
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const ofHome = (home, pred) => wheel.find((m) => m.home === home && (!pred || pred(m)));
function standBy(ps, m) { ps.z = WHEEL_ZONE; ps.x = m.x + 60; ps.y = m.y; ps.dead = false; ps.dying = false; ps.disconnected = false; }
function revive(m) {
  m.alive = true; m.hp = m.maxHp; m.respawnAt = 0;
  m._burstDone = true; m._burstUntil = 0; m._burstKiller = null; m._armedBy = null; m._trapJudgeAt = 0;
  m.dmgByPlayer = Object.create(null);
}
/* A kill, as the damage paths make one, its roll set by the test lever's map */
function kill(m, contribs, killerId, roll) {
  revive(m);
  for (const [pid, d] of Object.entries(contribs)) m.dmgByPlayer[pid] = d;
  m.hp = 0;
  if (roll != null) {
    if (!(room._killRollForced instanceof Map)) room._killRollForced = new Map();
    room._killRollForced.set(killerId, roll);
  }
  const before = (room.loot[WHEEL_ZONE] || []).length;
  room._resolveMonsterKill(WHEEL_ZONE, m, killerId, room.playerState[killerId], 'melee');
  const list = room.loot[WHEEL_ZONE] || [];
  return list.length > before ? list[list.length - 1] : null;
}
const gems = (ps, k) => ((ps.lifeSkills && ps.lifeSkills.gems && ps.lifeSkills.gems[k]) || 0);
/* what one kill dropped of the seven, by the codex's ids */
function dropped(pile, ps, gemKey, nug0, gem0) {
  const out = [];
  if (pile && pile.shard) out.push('shard');
  if (pile && pile.gem) out.push('raregem');
  if (pile && pile.weapon) out.push('irongreatsword');
  for (const a of (pile && pile.armor) || []) out.push(a.slot === 'legsArmor' ? 'irongreaves' : 'irontorso');
  if (gems(ps, gemKey) > gem0) out.push('rawgem');
  if ((ps.goldNuggets || 0) > nug0) out.push('nugget');
  return out;
}

// ── 1. THE NUMBERS ──────────────────────────────────────────────────────────
const FULL = killRollLayout({ shard: true, rawgem: true });
const NOGEM = killRollLayout({ shard: true, rawgem: false });
{
  check('the order is the codex\'s, the rarest from 1: nugget, iron great sword, greaves, torso, rare gem, raw gem, shard',
    JSON.stringify(FULL.map((l) => l.id)) === JSON.stringify(['nugget', 'irongreatsword', 'irongreaves', 'irontorso', 'raregem', 'rawgem', 'shard']), FULL);
  check('a snowman\'s numbers: 1 | 2-21 | 22-41 | 42-61 | 62-111 | 112-611 | 612-1,611',
    JSON.stringify(FULL.map((l) => [l.from, l.to])) === JSON.stringify([[1, 1], [2, 21], [22, 41], [42, 61], [62, 111], [112, 611], [612, 1611]]), FULL);
  let at = 1, ok = true;
  for (const l of FULL) {
    const n = l.to - l.from + 1;
    if (l.from !== at || Math.abs(n - KILL_ROLL_CHANCES[l.id] * KILL_ROLL.SIDES) > 1e-9) ok = false;
    at = l.to + 1;
  }
  check('each drop owns exactly its chance x 10,000 numbers, from 1 with no gap and none shared', ok && at - 1 <= KILL_ROLL.SIDES, FULL);
  check('...the chances are the very constants the drops always rolled at',
    KILL_ROLL_CHANCES.nugget === GOLD_NUGGET_MONSTER_DROP && KILL_ROLL_CHANCES.rawgem === GEM_RAW_MONSTER_DROP
      && KILL_ROLL_CHANCES.raregem === RARE_GEM_MONSTER_DROP && KILL_ROLL_CHANCES.shard === SHARD_MONSTER_DROP
      && KILL_ROLL_CHANCES.irongreatsword === MONSTER_IRON_WEAPON_DROP.chance
      && KILL_ROLL_CHANCES.irontorso === MONSTER_ARMOR_DROPS.find((d) => d.slot === 'armor').chance
      && KILL_ROLL_CHANCES.irongreaves === MONSTER_ARMOR_DROPS.find((d) => d.slot === 'legsArmor').chance, KILL_ROLL_CHANCES);
  check('no raw gem (the blue slime\'s land): no numbers for it, and its shard is 112-1,111',
    !NOGEM.some((l) => l.id === 'rawgem') && JSON.stringify(NOGEM.find((l) => l.id === 'shard')) === JSON.stringify({ id: 'shard', from: 112, to: 1111 }), NOGEM);
  check('killRollHit: each run\'s first and last number are its own, past the last none',
    killRollHit(FULL, 1) === 'nugget' && killRollHit(FULL, 2) === 'irongreatsword' && killRollHit(FULL, 21) === 'irongreatsword'
      && killRollHit(FULL, 22) === 'irongreaves' && killRollHit(FULL, 611) === 'rawgem' && killRollHit(FULL, 612) === 'shard'
      && killRollHit(FULL, 1611) === 'shard' && killRollHit(FULL, 1612) === null && killRollHit(FULL, 10000) === null);
}

// ── 2. CAPS ─────────────────────────────────────────────────────────────────
const wsA = fakeWs('A');
const A = await join(wsA, 'bp_kr_a');
{
  const sync = wsA.sent.find((m) => m.type === 'state_sync');
  check('caps: killroll advertised', sync && sync.caps && sync.caps.killroll === true, sync && sync.caps && sync.caps.killroll);
  const snow0 = ofHome('frost', (m) => !m.tier);
  check('the worker reads a frost monster as having its shard and its raw gem; the blue slime\'s, its shard only',
    JSON.stringify(room._killRollCan(WHEEL_ZONE, snow0)) === JSON.stringify({ shard: true, rawgem: true })
      && JSON.stringify(room._killRollCan(WHEEL_ZONE, ofHome('verdant'))) === JSON.stringify({ shard: true, rawgem: false }),
    { snow: room._killRollCan(WHEEL_ZONE, snow0), slime: room._killRollCan(WHEEL_ZONE, ofHome('verdant')) });
}

// ── 3. A KILL ROLLS ONCE ────────────────────────────────────────────────────
const snow = ofHome('frost', (m) => !m.tier);
snow.level = 1;
{
  const cases = [];
  for (const l of FULL) cases.push([l.from, l.id], [l.to, l.id]);
  cases.push([1612, null], [5000, null], [10000, null]);
  const off = [];
  for (const [roll, want] of cases) {
    standBy(A, snow);
    const nug0 = A.goldNuggets || 0, gem0 = gems(A, 'raw_frost');
    wsA.sent.length = 0;
    const pile = kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', roll);
    const got = dropped(pile, A, 'raw_frost', nug0, gem0);
    const c = last(wsA, 'combat_credit');
    const okDrop = want ? (got.length === 1 && got[0] === want) : got.length === 0;
    const okWire = !!c && c.roll === roll && (want ? c.rh === want : !('rh' in c));
    if (!okDrop || !okWire) off.push({ roll, want, got, credit: c && { roll: c.roll, rh: c.rh } });
  }
  check('a roll on each drop\'s first and last number drops that drop and nothing else, past 1,611 nothing; the combat_credit says the roll and the drop',
    off.length === 0, off);
  /* where each one goes is where it always went */
  standBy(A, snow);
  const g0 = gems(A, 'raw_frost');
  const p1 = kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', 300);
  check('the raw gem goes to the killing blow\'s bag, not the pile', gems(A, 'raw_frost') === g0 + 1 && !(p1 && (p1.shard || p1.gem)), { g0, now: gems(A, 'raw_frost') });
  standBy(A, snow);
  const p2 = kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', 1000);
  check('the shard lies in the pile, its land\'s', !!p2 && p2.shard === 'shard_frost', p2 && p2.shard);
  standBy(A, snow);
  const p3 = kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', 50);
  check('the iron torso is the pile\'s one armour piece, graded', !!p3 && Array.isArray(p3.armor) && p3.armor.length === 1 && p3.armor[0].name === 'Iron Torso'
    && typeof p3.armor[0].quality === 'string', p3 && p3.armor);
  standBy(A, snow);
  const p4 = kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', 10);
  check('the iron great sword is the pile\'s weapon', !!p4 && p4.weapon && p4.weapon.type === 'greatsword' && p4.weapon.gearBase === 'iron', p4 && p4.weapon);
  /* the blue slime: no raw gem, its shard lower down */
  const slime = ofHome('verdant', (m) => !m.tier);
  slime.level = 1;
  const off2 = [];
  for (const [roll, want] of [[111, 'raregem'], [112, 'shard'], [1111, 'shard'], [1112, null]]) {
    standBy(A, slime);
    const nug0 = A.goldNuggets || 0;
    const pile = kill(slime, { bp_kr_a: slime.maxHp }, 'bp_kr_a', roll);
    const got = dropped(pile, A, 'raw_flora', nug0, 0);
    if (want ? !(got.length === 1 && got[0] === want) : got.length !== 0) off2.push({ roll, want, got });
  }
  check('the blue slime: 112 and 1,111 its shard (no raw gem to own them), 1,112 nothing', off2.length === 0, off2);
}

// ── 4. ONLY THE ROLL ────────────────────────────────────────────────────────
{
  standBy(A, snow);
  const nug0 = A.goldNuggets || 0, gem0 = gems(A, 'raw_frost');
  /* every other draw of the kill 0: each drop on its own roll would drop at once */
  const pile = withRandom([0], () => kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', 7777));
  const got = dropped(pile, A, 'raw_frost', nug0, gem0);
  check('with every other draw forced to 0, a roll of 7,777 drops none of the seven: the roll alone decides', got.length === 0, got);
  /* and the roll itself comes off Math.random: 0 is a 1, the last sliver 10,000 */
  standBy(A, snow);
  const n0 = A.goldNuggets || 0;
  withRandom([0], () => room._killRollFor(WHEEL_ZONE, snow, 'bp_kr_a'));
  const r0 = withRandom([0], () => room._killRollFor(WHEEL_ZONE, snow, 'bp_kr_a'));
  const r1 = withRandom([1 - 1e-12], () => room._killRollFor(WHEEL_ZONE, snow, 'bp_kr_a'));
  const rm = withRandom([0.0612], () => room._killRollFor(WHEEL_ZONE, snow, 'bp_kr_a'));
  check('the roll: Math.random 0 is 1 (the nugget), just under 1 is 10,000 (nothing), 0.0612 is 613 (the shard)',
    r0.roll === 1 && r0.hit === 'nugget' && r1.roll === 10000 && r1.hit === null && rm.roll === 613 && rm.hit === 'shard' && (A.goldNuggets || 0) === n0, { r0, r1, rm });
}

// ── 5. A PARTY ──────────────────────────────────────────────────────────────
const wsB = fakeWs('B');
const B = await join(wsB, 'bp_kr_b');
const wsC = fakeWs('C');
const C = await join(wsC, 'bp_kr_c');
{
  const contribs = { bp_kr_a: 60, bp_kr_b: 37, bp_kr_c: 3 };   /* C under the pile's 5% */
  /* a credit carries the roll only to whom the kill pays XP, so enough XP
     that 3% of it is some (a level-1 snowman's 3% rounds to none) */
  const keepXp = snow.xp;
  snow.xp = 1000;
  const tell = (ws) => last(ws, 'combat_credit');
  for (const p of [A, B, C]) standBy(p, snow);
  for (const ws of [wsA, wsB, wsC]) ws.sent.length = 0;
  const gB0 = gems(B, 'raw_frost'), gA0 = gems(A, 'raw_frost');
  kill(snow, contribs, 'bp_kr_a', 200);   /* the raw gem: the killing blow's */
  const a = tell(wsA), b = tell(wsB), c = tell(wsC);
  check('a party\'s kill: everyone it credits is told the one roll', a && b && c && a.roll === 200 && b.roll === 200 && c.roll === 200, { a, b, c });
  check('...the raw gem is the killer\'s alone: told to the killer, in the killer\'s bag, not the others\'',
    a.rh === 'rawgem' && !('rh' in b) && !('rh' in c) && gems(A, 'raw_frost') === gA0 + 1 && gems(B, 'raw_frost') === gB0, { a: a.rh, b: b.rh, c: c.rh });
  for (const p of [A, B, C]) standBy(p, snow);
  for (const ws of [wsA, wsB, wsC]) ws.sent.length = 0;
  kill(snow, contribs, 'bp_kr_a', 900);   /* the shard: the pile's */
  const a2 = tell(wsA), b2 = tell(wsB), c2 = tell(wsC);
  check('...a shard is the pile\'s: told to both who may pick it up, not to the one under 5% of the damage',
    a2.rh === 'shard' && b2.rh === 'shard' && !('rh' in c2) && c2.roll === 900, { a: a2.rh, b: b2.rh, c: c2.rh });
  snow.xp = keepXp;
  for (const p of [B, C]) { p.z = 'town'; }
}

// ── 6. THE WORKSHOP'S SHARE ─────────────────────────────────────────────────
{
  const keep = room._workshopDropScale;
  room._workshopDropScale = () => 0.25;
  const mon = { id: 'kr-ws', arch: 'fodder', level: 1, x: 0, y: 0, gold: 5 };
  const pile = (hit, vals) => { const kr = { roll: 1, hit, minted: false }; const p = withRandom(vals, () => room._spawnLootForKill('frost', mon, 'bp_kr_a', ['bp_kr_a'], { bp_kr_a: 1 }, kr)); return { p, kr }; };
  const miss = pile('irontorso', [0.3]);
  const hit = pile('irontorso', [0.2, 0.99]);
  const gemMiss = pile('raregem', [0.26]);
  const gemHit = pile('raregem', [0.24]);
  const sh = pile('shard', [0.99]);
  room._workshopDropScale = keep;
  check('a Workshop run at a quarter: on the torso\'s numbers a draw over 0.25 drops nothing (and tells no one), under it the torso',
    miss.p && !miss.p.armor && miss.kr.minted === false && hit.p && hit.p.armor && hit.p.armor.length === 1 && hit.kr.minted === true, { miss: miss.p && miss.p.armor, hit: hit.p && hit.p.armor });
  check('...the rare gem the same', gemMiss.p && !gemMiss.p.gem && gemHit.p && gemHit.p.gem === 'rare_gem', { miss: gemMiss.p && gemMiss.p.gem, hit: gemHit.p && gemHit.p.gem });
  check('...and the shard is never scaled', sh.p && sh.p.shard === 'shard_frost' && sh.kr.minted === true, sh.p && sh.p.shard);
}

// ── 7. disable_weapon_drops ─────────────────────────────────────────────────
{
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { disable_weapon_drops: true });
  standBy(A, snow);
  wsA.sent.length = 0;
  const p1 = kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', 15);
  const c1 = last(wsA, 'combat_credit');
  standBy(A, snow);
  const p2 = kill(snow, { bp_kr_a: snow.maxHp }, 'bp_kr_a', 30);
  delete room._liveFlags.disable_weapon_drops;
  check('disable_weapon_drops: the iron blade\'s numbers drop no blade, and say so to no one; the greaves keep theirs',
    !(p1 && p1.weapon) && c1 && c1.roll === 15 && !('rh' in c1) && p2 && p2.armor && p2.armor[0].name === 'Iron Greaves', { p1: p1 && p1.weapon, c1, p2: p2 && p2.armor });
}

// ── 8. THE KILL SWITCH ──────────────────────────────────────────────────────
{
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { killroll: false });
  const wsD = fakeWs('D');
  const D = await join(wsD, 'bp_kr_d');
  const sync = wsD.sent.find((m) => m.type === 'state_sync');
  check('killroll: false -- un-advertised', sync && sync.caps && sync.caps.killroll === false, sync && sync.caps && sync.caps.killroll);
  standBy(D, snow);
  wsD.sent.length = 0;
  const nug0 = D.goldNuggets || 0, gem0 = gems(D, 'raw_frost');
  const pile = withRandom([0], () => kill(snow, { bp_kr_d: snow.maxHp }, 'bp_kr_d'));
  const got = dropped(pile, D, 'raw_frost', nug0, gem0).sort();
  const c = last(wsD, 'combat_credit');
  check('...no roll sent, and every drop back on its own roll (all seven at a forced 0, as before)',
    c && !('roll' in c) && !('rh' in c) && JSON.stringify(got) === JSON.stringify(['irongreatsword', 'irongreaves', 'irontorso', 'nugget', 'raregem', 'rawgem', 'shard']), { got, c });
  delete room._liveFlags.killroll;
  D.z = 'town';
}

// ── 9. THE TEST LEVER ───────────────────────────────────────────────────────
{
  standBy(A, snow);
  revive(snow);
  wsA.sent.length = 0;
  const r = room._killRollDev('bp_kr_a', { next: 640, kill: snow.id });
  const c = last(wsA, 'combat_credit');
  check('/dev/killroll {next: 640, kill}: that kill rolls 640, the Frost Shard', r.ok && r.next === 640 && r.killed === snow.id && c && c.roll === 640 && c.rh === 'shard'
    && Array.isArray(r.layout) && r.layout.length === 7, { r, c });
  check('...a roll outside 1-10,000 is refused', room._killRollDev('bp_kr_a', { next: 0 }).ok === false && room._killRollDev('bp_kr_a', { next: 10001 }).ok === false
    && room._killRollDev('nobody', { next: 5 }).ok === false);
  check('...and the next kill rolls its own again', !(room._killRollForced instanceof Map) || !room._killRollForced.has('bp_kr_a'));
}

// ── 10. THE CHANCES ─────────────────────────────────────────────────────────
{
  const N = 300000;
  const count = Object.create(null);
  for (const l of FULL) count[l.id] = 0;
  let none = 0;
  for (let i = 0; i < N; i++) {
    const kr = room._killRollFor(WHEEL_ZONE, snow, 'bp_kr_a');
    if (kr.hit) count[kr.hit]++; else none++;
  }
  const off = [];
  for (const l of FULL) {
    const p = KILL_ROLL_CHANCES[l.id];
    const sd = Math.sqrt(N * p * (1 - p));
    if (Math.abs(count[l.id] - N * p) > 5 * sd + 2) off.push({ id: l.id, got: count[l.id], want: N * p });
  }
  check('over 300,000 rolls each drop comes up at its chance (within five standard deviations), and about 84% drop nothing more',
    off.length === 0 && Math.abs(none / N - (1 - 0.1611)) < 0.005, { off, none: none / N });
}

await flush();
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
