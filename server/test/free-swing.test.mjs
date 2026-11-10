/* THE FREE-SWING TRIAL (v2.3.4520): swing as often as you like, each swing's
 * damage its share of a full one.
 *
 * The owner, 2026-11-10: "What if the attack speed was uncapped (you can
 * swipe as many times as you want to hit) but the DPS is prorated by the time
 * elapsed relative to the full swing cycle?"  freeswing.js has the rules,
 * combat.js _handleMonsterDamage and _resolvePvPAttack call them.  What this
 * suite pins, through the real GameRoom:
 *   1. the numbers and the switches' names;
 *   2. the join: `fs: 1` / `fs: 2` asks, anything else does not; caps.freeSwing
 *      and its switch;
 *   3. damage a second against a monster is the same swung every cycle, at
 *      2x, at 4x and at the floor's rate -- and the XP it pays;
 *   4. a light swing carries no shove, no gem status, no collision, no spark;
 *   5. the floor: a swing sooner is dropped quietly and costs nothing;
 *   6. the fractions: tiny hits never add up past one full hit a cycle, and
 *      the floor of 1 cannot be farmed;
 *   7. a swing's other targets take its share, each once;
 *   8. the bonus: only with the phone's ask AND `freeswingbonus`, only a
 *      perfect strike (v2.3.4550: a swing timed to the full cycle; a full
 *      swing after a rest is an ordinary full hit -- perfect-strike.test has
 *      the window), never on a player;
 *   9. a paid special swing is untouched and counted as a swing;
 *  10. against a player: damage a second the same at every rate, the
 *      blocker's stamina by the share, no status from a light swing;
 *  11. the switches put today's sword back, and a phone that does not ask
 *      meets today's sword exactly;
 *  12. the state is small, and the speed stat shortens the cycle. */
import { GameRoom } from '../src/index.js';
import { FREE_SWING } from '../src/freeswing.js';
import { PROG3, prog3StatValue } from '../src/prog3.js';
import { BLOCK_STAMINA_COST } from '../src/data.js';
import { flagNameOk } from '../src/liveops.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_975_000_000_000;
Date.now = () => T;
let R = 0.5;
Math.random = () => R;

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: 'fs-key' };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

const room = new GameRoom(makeState(), mockEnv);
room._liveFlags = {};
async function join(id, extra) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }, extra || {})));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return { ws, ps: room.playerState[id], sess: room.sessions.get(ws), id };
}
const A = await join('bp_fs_a', { fs: 1 });     /* tries the trial */
const C = await join('bp_fs_c');                /* does not ask */
const B = await join('bp_fs_b');                /* a player to hit */
const J2 = await join('bp_fs_j2', { fs: 2 });
const J7 = await join('bp_fs_j7', { fs: 7 });
room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
room._queuePlayerStateFlush = () => {};
room.stateHistory = {};
let XP = 0;
room._prog3AwardXp = (id, ps, cat, amt) => { XP += amt; };
const req = (method, path, body) => room.fetch(new Request('https://x' + path, {
  method, headers: { Authorization: 'Bearer fs-key' }, body: body ? JSON.stringify(body) : undefined,
}));

const ZONE = 'meadow';
let mid = 0;
function arm(p) {
  p.ps.weapon = { type: 'sword', name: 'sword', tierMult: 1.25, quality: 'normal' };
  p.ps.rangedWeapon = null; p.ps.staffWeapon = null; p.ps.activeSlot = 'melee';
  p.ps.z = ZONE; p.ps.x = 500; p.ps.y = 500;   /* the middle of the zone: a shove is not clamped to its edge */
  p.ps.dead = false; p.ps.dying = false; p.ps.disconnected = false;
  p.ps.mana = p.ps.maxMana = 1000;
  delete p.ps._monHitCad; p.ps._pveSpec = undefined; p.ps._fs = undefined;
}
function monster(p, d, dy = 0) {
  const zcfg = room._getZoneConfig(ZONE);
  const spawn = (zcfg && zcfg.spawns && zcfg.spawns[0]) || { arch: 'fodder' };
  const m = room._makeZoneMonster(ZONE, zcfg, spawn, 'fs-m' + (++mid), p.ps.x + d, p.ps.y + dy, 3);
  m.hp = m.maxHp = 1e7; m.alive = true; m.atkCd = T + 1e9; m.element = null;
  m._at = [d, dy];
  if (!room.monsters[ZONE]) room.monsters[ZONE] = [];
  room.monsters[ZONE].push(m);
  return m;
}
/* back where it was made (a full swing shoves it 30 px: a run of them would
   shove it out of the sword's reach) */
function home(p, m) { m.x = p.ps.x + m._at[0]; m.y = p.ps.y + m._at[1]; m._kbDebt = 0; }
/* the real handler: what the hit took, and the events it made */
let lastEvents = [];
function hit(p, m, payload) {
  const hp0 = m.hp;
  room.eventBuffer.length = 0;
  room._handleMonsterDamage(p.sess, Object.assign({ monsterId: m.id, zone: p.ps.z, slot: 'melee' }, payload || {}));
  lastEvents = room.eventBuffer.slice();
  return hp0 - m.hp;
}
const hitEv = () => lastEvents.find((e) => e.type === 'monster_hit');
/* swing every `every` ms for `ms` (the first swing at the start, a full one);
   the damage dealt and the XP it paid */
function swingFor(p, m, every, ms, extra) {
  arm(p); m.hp = 1e7; m.statuses = {}; XP = 0;
  let dmg = 0, sw = 0;
  const t0 = T;
  for (let t = 0; t <= ms; t += every) {
    T = t0 + t;
    home(p, m);
    dmg += hit(p, m, Object.assign({ sw: ++sw }, extra || {}));
  }
  T = t0 + ms + 10000;
  return { dmg, xp: XP };
}

// ── 1. the numbers ──
{
  check('1. FULL_SWING_SHARE 0.8, MIN_SWING_GAP_MS 100, FULL_SWING_BONUS 0.12, a 600 ms cycle floored at x0.5',
    FREE_SWING.FULL_SWING_SHARE === 0.8 && FREE_SWING.MIN_SWING_GAP_MS === 100 && FREE_SWING.FULL_SWING_BONUS === 0.12
    && FREE_SWING.BASE_CYCLE_MS === 600 && FREE_SWING.SPEED_FLOOR === 0.5, FREE_SWING);
  check('1. both switches are lower-case names the operator\'s route takes', flagNameOk('freeswing') && flagNameOk('freeswingbonus'));
  check('1. ...on unless written false', room._freeSwingOn() && room._freeSwingBonusOn());
}

// ── 2. the join and the cap ──
{
  check('2. `fs: 1` asks for the trial', A.sess.freeSwing === 1, A.sess.freeSwing);
  check('2. `fs: 2` asks for it with the bonus', J2.sess.freeSwing === 2);
  check('2. no `fs`, or junk, asks for nothing', C.sess.freeSwing === 0 && J7.sess.freeSwing === 0);
  const caps = (A.ws.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
  check('2. caps.freeSwing is advertised', caps.freeSwing === 1, caps.freeSwing);
  room._liveFlags = { freeswing: false };
  const off = await join('bp_fs_off', { fs: 1 });
  const caps2 = (off.ws.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
  check('2. ...and not under `freeswing: false`', caps2.freeSwing === undefined, caps2.freeSwing);
  room._liveFlags = {};
  /* the operator's route tells every phone at once */
  const told = [];
  const realBA = room.broadcastAll;
  room.broadcastAll = (msg) => { told.push(msg); };
  await req('POST', '/api/admin/flags', { name: 'freeswing', value: false });
  check('2. setting `freeswing: false` tells every phone (free_swing, on false)', told.some((x) => x.type === 'free_swing' && x.on === false), told);
  told.length = 0;
  await req('DELETE', '/api/admin/flags?name=freeswing');
  check('2. ...and clearing it, on true', told.some((x) => x.type === 'free_swing' && x.on === true), told);
  room.broadcastAll = realBA;
  check('2. free_swing is a privileged type (a phone cannot forge it)', (await import('../src/index.js')).PRIVILEGED_EVENTS
    ? (await import('../src/index.js')).PRIVILEGED_EVENTS.has('free_swing') : true);
  room._liveFlags = {};
}

const cycle = room._fsCycleMs(A.ps);
check('12. a new character\'s sword cycle is the untried 600 ms', cycle === 600, cycle);

// ── 3. damage a second against a monster ──
{
  arm(A);
  const m = monster(A, 40);
  const full = swingFor(A, m, 600, 0);   /* one full swing */
  const D = full.dmg;
  check('3. a full swing lands (guard)', D > 0, D);
  const run = {};
  for (const [name, every] of [['1x', 600], ['2x', 300], ['4x', 150], ['floor', 100]]) run[name] = swingFor(A, m, every, 6000);
  /* 6 s: the first swing full, then 10 cycles' worth of time */
  const want = D * 11;
  const ok = Object.values(run).every((r) => Math.abs(r.dmg - want) <= 1);
  check('3. damage over 6 s is the same swung every cycle, at 2x, at 4x and at the floor\'s rate (within 1)', ok,
    { want, got: Object.fromEntries(Object.entries(run).map(([k, v]) => [k, v.dmg])) });
  check('3. ...and never more than the untried sword could deal', Object.values(run).every((r) => r.dmg <= want));
  const xps = Object.values(run).map((r) => r.xp);
  check('3. the XP it pays is in proportion too (damage-paid, never per hit)', xps.every((x) => Math.abs(x - xps[0]) <= 1.01 * PROG3.XP_PER_DMG + 1e-9) || xps.every((x) => Math.abs(x - xps[0]) <= 2), xps);
  /* a light swing is smaller, a full one as today, and the phone is told the share */
  arm(A); m.hp = 1e7; home(A, m);
  hit(A, m, { sw: 1 });
  T += 150; home(A, m);
  const light = hit(A, m, { sw: 2 });
  const ev = hitEv();
  check('3. a swing 150 ms after the last lands a quarter: smaller than a full one', light > 0 && light < D, { light, D });
  check('3. ...and its monster_hit says its share (pw 0.25)', !!ev && ev.payload.pw === 0.25, ev && ev.payload);
  T += 600;
  hit(A, m, { sw: 3 });
  check('3. a full swing says no share (the number as today)', !!hitEv() && hitEv().payload.pw === undefined, hitEv() && hitEv().payload);
  T += 10000;
}

// ── 4. a light swing carries nothing ──
{
  arm(A);
  const m = monster(A, 40);
  /* the shove */
  hit(A, m, { sw: 1 });
  T += 150; home(A, m);
  let x0 = m.x;
  hit(A, m, { sw: 2 });
  check('4. a light swing shoves nothing', m.x === x0, { x0, x: m.x });
  T += 600; home(A, m);
  x0 = m.x;
  hit(A, m, { sw: 3 });
  check('4. a full one shoves as ever (30 px)', Math.abs(m.x - x0 - 30) < 1, { x0, x: m.x });
  /* f just under, and at, FULL_SWING_SHARE */
  T += 600; home(A, m); hit(A, m, { sw: 4 });
  T += Math.floor(cycle * 0.79); home(A, m); x0 = m.x; hit(A, m, { sw: 5 });
  check('4. a swing at 0.79 of a cycle shoves nothing', m.x === x0);
  T += 600; home(A, m); hit(A, m, { sw: 6 });
  T += Math.ceil(cycle * 0.8); home(A, m); x0 = m.x; hit(A, m, { sw: 7 });
  check('4. ...one at 0.8 of a cycle carries it', m.x !== x0);
  /* the gem's status and its collision (the claim's element, as under
     `weapongem: false`, so the test chooses it) */
  room._liveFlags = { weapongem: false };
  T += 10000; m.statuses = {};
  hit(A, m, { sw: 10, element: 'frost' });
  check('4. a full swing with a frost gem freezes (guard)', !!(m.statuses && m.statuses.freeze));
  T += 10000; m.statuses = {};
  hit(A, m, { sw: 11 });
  T += 150;
  hit(A, m, { sw: 12, element: 'frost' });
  check('4. a light one does not', !(m.statuses && m.statuses.freeze), m.statuses);
  /* a collision: flame then frost */
  T += 10000; m.statuses = {};
  hit(A, m, { sw: 13, element: 'flame' });
  check('4. a full flame swing burns (guard)', !!(m.statuses && m.statuses.burn));
  T += 150;
  hit(A, m, { sw: 14, element: 'frost' });
  check('4. a light frost swing sets off no collision (and so no mana back)', !lastEvents.some((e) => e.payload && e.payload.collision) && !!m.statuses.burn, m.statuses);
  T += 700;
  hit(A, m, { sw: 15, element: 'frost' });
  check('4. ...a full one does (guard: the pair collides)', lastEvents.some((e) => e.payload && e.payload.collision), lastEvents.map((e) => e.payload));
  room._liveFlags = {};
  /* a storm gem's spark */
  const other = monster(A, 60);
  T += 10000; home(A, m); home(A, other);
  hit(A, m, { sw: 20 });
  home(A, m);
  m.statuses = { shock: { element: 'storm', appliedAt: T, remaining: 3, maxDur: 4, id: 'shock' } };
  T += 150;
  const o0 = other.hp;
  hit(A, m, { sw: 21 });
  check('4. a light swing on a shocked monster sparks nothing (its floor of 1 would farm)', other.hp === o0);
  T += 700; home(A, m);
  m.statuses = { shock: { element: 'storm', appliedAt: T, remaining: 3, maxDur: 4, id: 'shock' } };
  hit(A, m, { sw: 22 });
  check('4. ...a full one sparks (guard)', other.hp < o0, { o0, hp: other.hp });
  T += 10000;
}

// ── 5. the floor ──
{
  arm(A);
  const m = monster(A, 40);
  hit(A, m, { sw: 1 });
  const sent0 = A.ws.sent.length;
  T += 99;
  const quick = hit(A, m, { sw: 2 });
  check('5. a swing 99 ms after the last is dropped: nothing taken, no event', quick === 0 && lastEvents.length === 0, lastEvents);
  check('5. ...and nothing said to the phone', A.ws.sent.length === sent0);
  T += 1;
  const at100 = hit(A, m, { sw: 3 });
  check('5. it cost nothing: the next, at 100 ms from the last COUNTED swing, takes its whole share', at100 > 0 && !!hitEv() && Math.abs(hitEv().payload.pw - 100 / cycle) < 0.006, hitEv() && hitEv().payload);
  /* half the swings at 50 ms are dropped, and damage over 3 s is the same */
  const D = swingFor(A, m, 600, 0).dmg;
  const fast = swingFor(A, m, 50, 3000).dmg;
  check('5. swiping every 50 ms (half of them dropped) deals what swinging every cycle does (within 1)', Math.abs(fast - D * 6) <= 1, { fast, want: D * 6 });
  T += 10000;
}

// ── 6. the fractions ──
{
  arm(A);
  const m = monster(A, 40);
  /* a hit of 1 (the roll's own floor): mashing at the floor's rate never farms it */
  const realRoll = room._rollHit;
  room._rollHit = () => ({ dmg: 1, isCrit: false });
  const tiny = swingFor(A, m, 100, 6000).dmg;
  check('6. a 1-damage sword mashed every 100 ms for 6 s deals 11 (one a cycle, and the first), not 61', tiny === 11, tiny);
  /* a hit of 7: never more than one full hit's worth over any cycle */
  room._rollHit = () => ({ dmg: 7, isCrit: false });
  arm(A); m.hp = 1e7;
  hit(A, m, { sw: 1 });
  let worst = 0;
  const per = [];
  for (let i = 0; i < 60; i++) { T += 100; per.push(hit(A, m, { sw: 2 + i })); }
  for (let i = 0; i + 6 <= per.length; i++) worst = Math.max(worst, per.slice(i, i + 6).reduce((a, b) => a + b, 0));
  check('6. no cycle\'s worth of tiny hits adds up past one full hit (7)', worst <= 7, { worst, per: per.slice(0, 12) });
  check('6. ...and the carried fraction stays under 1', A.ps._fs.c >= 0 && A.ps._fs.c < 1, A.ps._fs.c);
  room._rollHit = realRoll;
  T += 10000;
}

// ── 7. a swing's other targets ──
{
  arm(A);
  const m1 = monster(A, 40), m2 = monster(A, 40, 20), m3 = monster(A, 40, -20);
  hit(A, m1, { sw: 1 });
  T += 300;
  const a = hit(A, m1, { sw: 2 });
  const pwA = hitEv() && hitEv().payload.pw;
  T += 2;
  const b = hit(A, m2, { sw: 2 });
  const pwB = hitEv() && hitEv().payload.pw;
  const again = hit(A, m1, { sw: 2 });
  check('7. a swing\'s second monster takes the swing\'s own share (0.5)', b > 0 && pwA === 0.5 && pwB === 0.5, { a, b, pwA, pwB });
  check('7. ...and each monster once a swing', again === 0);
  T += 2;
  hit(A, m3, { sw: 2 });
  T += 300;
  hit(A, m1, { sw: 3 });
  check('7. the next swing\'s share runs from the swing (304 ms: 0.51), not from its last target (300 ms)', !!hitEv() && hitEv().payload.pw === 0.51, hitEv() && hitEv().payload);
  T += 50;
  const forged = hit(A, m2, { sw: 1 });
  check('7. an old swing\'s name 50 ms after a new swing is a new swing too soon: dropped', forged === 0);
  T += 10000;
}

// ── 8. the bonus ──
{
  const m = monster(A, 40);
  arm(A); arm(J2); arm(C);
  const D = swingFor(A, m, 600, 0).dmg;
  const m2 = monster(J2, 40);
  /* v2.3.4550: a full swing after a rest is an ordinary full hit now; the
     bonus is a perfect strike's -- a swing a full cycle after the last */
  const Drest = swingFor(J2, m2, 600, 0).dmg;
  check('8. v2.3.4550: a full swing after a rest, from a phone that asked, is an ordinary full hit', Drest === D, { D, Drest });
  T -= 10000 - 600; home(J2, m2);   /* swingFor left the clock 10 s on: a cycle after its swing */
  const Db = hit(J2, m2, { sw: 97 });
  check('8. a perfect strike (a full cycle after the last swing) from a phone that asked for the bonus is 12% harder', Db === Math.floor(D * 1.12) || Db === Math.round(D * 1.12), { D, Db });
  check('8. ...and its monster_hit says so (pw 1.12, pf 1)', !!hitEv() && hitEv().payload.pw === 1.12 && hitEv().payload.pf === 1, hitEv() && hitEv().payload);
  T += 10000; home(J2, m2);
  hit(J2, m2, { sw: 98 });
  T += 150; home(J2, m2);
  const lightB = hit(J2, m2, { sw: 99 });
  check('8. a light swing gets no bonus (its plain share)', !!hitEv() && hitEv().payload.pw === 0.25, { lightB, p: hitEv() && hitEv().payload });
  room._liveFlags = { freeswingbonus: false };
  T += 10000;
  swingFor(J2, m2, 600, 0); T -= 10000 - 600; home(J2, m2);   /* a cycle after it */
  const Dnb = hit(J2, m2, { sw: 96 });
  check('8. `freeswingbonus: false`: no bonus even when asked', Dnb === D, { D, Dnb });
  room._liveFlags = {};
  T += 10000;
  swingFor(A, m, 600, 0); T -= 10000 - 600; home(A, m);
  check('8. `fs: 1` never gets it', hit(A, m, { sw: 95 }) === D);
}

// ── 9. a paid special swing ──
{
  arm(A); arm(C);
  const m = monster(A, 40), mc = monster(C, 40);
  T += 10000;
  room._pveSpecialPaid(A.ps, T);
  room._pveSpecialPaid(C.ps, T);
  const spA = hit(A, m, { special: true, sw: 1 });
  const spC = hit(C, mc, { special: true });
  check('9. a paid special swing lands what the untried sword\'s does (same dice)', spA > 0 && spA === spC, { spA, spC });
  T += 300;
  hit(A, m, { sw: 2 });
  check('9. ...and is counted as a swing: one 300 ms after it takes half', !!hitEv() && hitEv().payload.pw === 0.5, hitEv() && hitEv().payload);
  T += 10000;
}

// ── 10. against a player ──
{
  if (!room._pvpConsent) room._pvpConsent = new Map();
  const consent = () => room._pvpConsent.set(room._pvpPairKey(A.id, B.id), T + 3600000);
  function target(opts = {}) {
    B.ps.z = A.ps.z; B.ps.x = A.ps.x + 40; B.ps.y = A.ps.y;
    B.ps.maxHp = 1e7; B.ps.hp = B.ps.maxHp; B.ps.dead = B.ps.dying = B.ps.disconnected = false;
    B.ps.blocking = !!opts.block; B.ps.ba = 0; B.ps.blockStartT = opts.block ? T - 10000 : 0;
    B.ps.dodging = false; B.ps._zoneEntryGraceUntil = 0; B.ps.stamina = B.ps.maxStamina = 1e6;
    if (opts.block) B.ps.ba = Math.PI;   /* facing the attacker, west */
    consent();
  }
  function attack(sw, extra) {
    room.eventBuffer.length = 0;
    room._resolvePvPAttack(A.sess, Object.assign({ kind: 'melee', range: 200, arc: 3, angle: 0, target: B.id, sw }, extra || {}));
    return room.eventBuffer.find((e) => e.type === 'pvp_hit');
  }
  function duel(every, ms, opts) {
    arm(A); target(opts); room._pvpHitLanes = new Map(); T += 10000;
    const hp0 = B.ps.hp, st0 = B.ps.stamina;
    const t0 = T;
    let sw = 0;
    for (let t = 0; t <= ms; t += every) { T = t0 + t; attack(++sw); }
    T = t0 + ms + 10000;
    return { dmg: hp0 - B.ps.hp, stamina: st0 - B.ps.stamina };
  }
  const one = duel(600, 0);
  check('10. a full swing lands on a player (guard)', one.dmg > 0, one);
  const runs = {};
  for (const [name, every] of [['1x', 600], ['2x', 300], ['4x', 150], ['floor', 100]]) runs[name] = duel(every, 6000).dmg;
  check('10. damage on a player over 6 s is the same at every rate (within 1)', Object.values(runs).every((d) => Math.abs(d - one.dmg * 11) <= 1),
    { want: one.dmg * 11, runs });
  /* the blocker's stamina */
  const blk1 = duel(600, 0, { block: true });
  check('10. a blocked full swing costs its 10 stamina (guard)', blk1.stamina === Math.max(1, Math.round(BLOCK_STAMINA_COST * room._blockStaminaMult(B.ps))), blk1);
  const blk = duel(150, 6000, { block: true });
  check('10. blocked at 4x for 6 s, the stamina is what blocking every cycle costs (within 1)', Math.abs(blk.stamina - blk1.stamina * 11) <= 1, { blk, want: blk1.stamina * 11 });
  /* no status from a light swing; the bonus never on a player */
  room._liveFlags = { weapongem: false };
  arm(A); target(); room._pvpHitLanes = new Map(); T += 10000;
  attack(1);
  T += 300;
  const lt = attack(2, { element: 'frost' });
  check('10. a light swing on a player carries no status', !!lt && !lt.payload.st && lt.payload.pw === 0.5, lt && lt.payload);
  room._liveFlags = {};
  const savedSess = A.sess.freeSwing;
  A.sess.freeSwing = 2;
  const withAsk = duel(600, 0).dmg;
  A.sess.freeSwing = savedSess;
  check('10. a full swing on a player gets no bonus, even asked for (a fair fight)', withAsk === one.dmg, { withAsk, one: one.dmg });
}

// ── 11. the switches, and a phone that does not ask ──
{
  const m = monster(A, 40);
  /* a phone that does not ask: the 210 ms lane, every hit whole, sw ignored */
  arm(C);
  const mc = monster(C, 40);
  const Dc = hit(C, mc, { sw: 1 });
  T += 150;
  const c150 = hit(C, mc, { sw: 2 });
  T += 60;
  const c210 = hit(C, mc, { sw: 3 });
  check('11. a phone that does not ask: a swing 150 ms after the last is dropped by the 210 ms lane, as today', c150 === 0);
  check('11. ...and one at 210 ms lands whole, with no share on its event', c210 === Dc && !!hitEv() && hitEv().payload.pw === undefined, { Dc, c210 });
  {
    T += 10000;
    const x0 = mc.x;
    hit(C, mc, {});
    T += 210;
    const x1 = mc.x;
    hit(C, mc, {});
    check('11. ...and every hit of theirs shoves as ever', x1 !== x0 && mc.x !== x1);
  }
  /* `freeswing: false`: the phone that asked meets today's sword */
  room._liveFlags = { freeswing: false };
  arm(A);
  T += 10000;
  const Da = hit(A, m, { sw: 1 });
  T += 150;
  const a150 = hit(A, m, { sw: 2 });
  T += 60;
  const a210 = hit(A, m, { sw: 3 });
  check('11. `freeswing: false`: the asking phone\'s swing at 150 ms is dropped by the 210 ms lane, the next lands whole',
    a150 === 0 && a210 === Da && Da === Dc, { Da, a150, a210, Dc });
  check('11. ...and nothing of the trial was kept for it', A.ps._fs === undefined);
  room._liveFlags = {};
  /* the same switch is read on every swing: back on, the trial is back */
  T += 10000;
  arm(A);
  hit(A, m, { sw: 1 });
  T += 150;
  check('11. cleared, the trial is back at once (a swing at 150 ms lands its quarter)', hit(A, m, { sw: 2 }) > 0 && hitEv().payload.pw === 0.25);
  T += 10000;
}

// ── 12. the state, and the cycle ──
{
  arm(A);
  const ms = [];
  for (let i = 0; i < 40; i++) ms.push(monster(A, 40, i % 7));
  T += 10000;
  for (const m of ms) hit(A, m, { sw: 77 });
  check('12. one swing takes 24 monsters at most (the special\'s whirlwind bound)', A.ps._fs.ids.size === FREE_SWING.SWING_TARGETS, A.ps._fs.ids.size);
  T += 200;
  hit(A, ms[0], { sw: 78 });
  check('12. a new swing forgets the last one\'s targets', A.ps._fs.ids.size === 1);
  check('12. the state is seven fields on the player (gone with the player; v2.3.4550: + the perfect strike\'s)', Object.keys(A.ps._fs).length === 7, Object.keys(A.ps._fs));
  /* the Speed stat */
  const ps = A.ps;
  const was = ps.prog3 && ps.prog3.atk ? JSON.parse(JSON.stringify(ps.prog3.atk)) : null;
  ps.prog3.atk = ps.prog3.atk || {};
  ps.prog3.atk.sword = Object.assign({}, ps.prog3.atk.sword, { aspd: 999 });
  const fast = room._fsCycleMs(ps);
  const want = 600 * Math.max(0.5, 1 - PROG3.ATK.aspd.max * prog3StatValue(ps, 'aspd', 'sword', null));
  check('12. the Speed stat shortens the cycle as it shortens the untried sword\'s (366 ms at its asymptote)', Math.abs(fast - want) < 1e-9 && fast >= 366 && fast < 400, { fast, want });
  if (was) ps.prog3.atk = was; else delete ps.prog3.atk;
  const legacy = { weaponSpecs: { sword: { tempo: 60 } } };
  check('12. an older character\'s Tempo channel: 60 points, 420 ms', Math.abs(room._fsCycleMs(legacy) - 420) < 1e-9, room._fsCycleMs(legacy));
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nALL PASS');
