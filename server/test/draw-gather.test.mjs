/* THE BOW'S DRAW AND THE STAFF'S GATHER (v2.3.4801): build, then release.
 *
 * The owner, 2026-11-11: "Think about the sword swing.  The bow pull back and
 * release.  The staff building power and blasting the orb."  drawgather.js
 * has the rules (its header); index.js stamps the shot at its relay and
 * combat.js lands its claims.  What this suite pins, through the real
 * GameRoom (every shot through the real router, every claim through
 * _handleMonsterDamage / _resolvePvPAttack):
 *   1. the numbers, the phone's mirror (src/game/drawGather.js), the
 *      switches' names, the caps (each on its own line), CAP_GATES;
 *   2. the bow's draw: a shot's share of a full draw (the flicked bow's 371
 *      ms), `pw` told; only a share of 0.8 or more shoves; the relayed copy
 *      carries the counted draw;
 *   3. the bound: never more than the time since the last bow shot or bolt
 *      (one clock) plus the 100 ms slack, LENT not given; forged claims (a
 *      negative, NaN, a string, Infinity, 1e12, the wrong weapon's field, no
 *      weapon held, a special's or retreat's shot, no `ts`, the same shot
 *      twice, a bolt's shot named on an arrow's claim) gain nothing;
 *   4. the perfect draw: from full to 300 ms after, not cut by the bound,
 *      x1.12 and an eighth of the special's mana once a shot, monsters only,
 *      and the switches (perfectbow, freeswingbonus, fs: 1, off the trial);
 *   5. the floors: a shot within 100 ms lands nothing and leaves the clock;
 *      a named shot is held to the 210 ms lane by its worth (v2.3.4799); each monster once a shot; an
 *      arrow 4 monsters (or its Piercing's), a bolt 1; the allowance is
 *      spent by share;
 *   6. the staff's gather: its share; the stages (spark, orb, sphere at 0.4
 *      and 0.8); the splash's reach and damage by stage; the ring of force
 *      outward (a braced monster stays); NO perfect; `gs` told;
 *   7. against a player: the share as a sword's (no perfect, no mana), the
 *      300 ms lane skipped, a bolt's splash by its stage;
 *   8. no field: today exactly (an arrow's 100, a bolt's 100 and its 60 px
 *      splash of 50); the kill switches put today back, caps un-advertised;
 *      a v1 join (full snapshots) plays the same;
 *   9. THE BALANCE PROOF: a minute against a dummy, each rhythm -- today's
 *      bow and staff, full builds, tap-spam, the forged rhythms -- the best
 *      damage a second does not move (exact with a fixed roll, and again
 *      with the worker's own roll at a fixed die); and (v2.3.4799) the
 *      MIXED rhythms, shots with and without a field, on a monster and in
 *      a duel: never past today's best forged rhythm, never more perfects
 *      than honest full draws. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { DRAW_GATHER } from '../src/drawgather.js';
import { FREE_SWING } from '../src/freeswing.js';
import { STAFF_SPLASH } from '../src/combat.js';
import { flagNameOk } from '../src/liveops.js';
import * as PHONE from '../../src/game/drawGather.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

let T = 1_977_000_000_000;
Date.now = () => T;
Math.random = () => 0.5;

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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: 'dg-key' };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

const room = new GameRoom(makeState(), mockEnv);
room._liveFlags = {};
async function join(id, extra, v1) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  const msg = Object.assign({ type: 'join', id, name: id, phrase: 'p-' + id, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }, v1 ? {} : { protocolVersion: 2 }, extra || {});
  await room.webSocketMessage(ws, JSON.stringify(msg));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return { ws, ps: room.playerState[id], sess: room.sessions.get(ws), id };
}
const P = await join('bp_dg_one', { fs: 2 });     /* the phone's default join */
const NOB = await join('bp_dg_nob', { fs: 1 });   /* `?swingbonus=0` */
const OFF = await join('bp_dg_off');              /* off the trial */
const V1 = await join('bp_dg_v1', { fs: 2 }, true);   /* protocol v1 */
const TGT = await join('bp_dg_tgt');
const capsOf = (j) => (j.ws.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
room._saveRpg = () => {}; room._saveRpgVitals = () => {};
room._saveRpgPools = () => {};
room._queuePlayerStateFlush = () => {};
room.stateHistory = {};
room._prog3AwardXp = () => {};
const realRoll = room._rollHit;
const FIXED = () => ({ dmg: 100, isCrit: false });
room._rollHit = FIXED;

const ZONE = 'meadow';
let mid = 0;
function arm(p, slot) {
  p.ps.weapon = { type: 'sword', name: 'sword', tierMult: 1.25, quality: 'normal' };
  p.ps.rangedWeapon = { type: 'bow', tierMult: 1 };
  p.ps.staffWeapon = { type: 'staff', tierMult: 1 };
  p.ps.activeSlot = slot || 'ranged';
  p.ps.z = ZONE; p.ps.x = 500; p.ps.y = 500;
  p.ps.dead = false; p.ps.dying = false; p.ps.disconnected = false;
  p.ps.maxMana = 100; p.ps.mana = 0; p.ps.manaBlocks = 5; p.ps.amulet = null;
  delete p.ps._monHitCad; delete p.ps._hitBucket; p.ps._pveSpec = undefined; p.ps._fs = undefined; p.ps._pfb = undefined; p.ps._dg = undefined;
  p.sess.relayTokens = undefined;
  room.monsters[ZONE] = [];
}
function monster(p, d, dy = 0) {
  const zcfg = room._getZoneConfig(ZONE);
  const spawn = (zcfg && zcfg.spawns && zcfg.spawns[0]) || { arch: 'fodder' };
  const m = room._makeZoneMonster(ZONE, zcfg, spawn, 'dg-m' + (++mid), p.ps.x + d, p.ps.y + dy, 3);
  m.hp = m.maxHp = 1e7; m.alive = true; m.atkCd = T + 1e9; m.element = null; m.statuses = {};
  m._at = [d, dy];
  if (!room.monsters[ZONE]) room.monsters[ZONE] = [];
  room.monsters[ZONE].push(m);
  return m;
}
function home(p, m) { m.x = p.ps.x + m._at[0]; m.y = p.ps.y + m._at[1]; m._kbDebt = 0; }
let lastEvents = [];
function hit(p, m, payload, keep) {
  const hp0 = m.hp;
  if (!keep) home(p, m);
  room.eventBuffer.length = 0;
  room._handleMonsterDamage(p.sess, Object.assign({ monsterId: m.id, zone: p.ps.z, slot: 'ranged', element: null }, payload || {}));
  lastEvents = room.eventBuffer.slice();
  return hp0 - m.hp;
}
const hitEv = () => lastEvents.find((e) => e.type === 'monster_hit' && !e.payload.splash) || null;
/* a shot leaves: its relay through the real router (`ts` its own stamp) */
let relayed = null;
async function shot(p, extra) {
  const ts = T;
  room.eventBuffer.length = 0;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'player_projectile', payload: Object.assign({ id: p.id, x: 500, y: 500, ang: 0, isStaff: false, ts }, extra || {}) }));
  relayed = room.eventBuffer.find((e) => e.type === 'player_projectile') || null;
  return ts;
}
const bow = (p, dr, extra) => shot(p, Object.assign(dr === undefined ? {} : { dr }, extra || {}));
const bolt = (p, ga, extra) => shot(p, Object.assign({ isStaff: true }, ga === undefined ? {} : { ga }, extra || {}));
const arrow = (p, m, sw) => hit(p, m, { slot: 'ranged', sw });
const orb = (p, m, sw, keep) => hit(p, m, { slot: 'staff', sw }, keep);

const BCYC = room._pfBowCycleMs(P.ps);
const SCYC = room._dgStaffCycleMs(P.ps);

// ── 1. the numbers, the mirror, the switches, the caps ──
{
  check('1. a new character\'s full draw is the flicked bow\'s 371 ms, its full gather the staff\'s 900', BCYC === 371 && SCYC === 900, { BCYC, SCYC });
  const shared = ['BOW_FASTER', 'BOW_MIN_MS', 'STAFF_EXTRA_MS', 'PERFECT_DRAW_MS', 'FULL_SHARE', 'ORB_SHARE', 'SPHERE_SHARE', 'MIN_GAP_MS', 'CLAIM_MAX_MS'];
  check('1. MIRROR: every number the phone shares is the worker\'s (src/game/drawGather.js)',
    shared.every((k) => PHONE.DRAW_GATHER[k] === DRAW_GATHER[k])
    && JSON.stringify(PHONE.DRAW_GATHER.SPLASH_K) === JSON.stringify(DRAW_GATHER.SPLASH_K)
    && JSON.stringify(PHONE.DRAW_GATHER.RING_PX) === JSON.stringify(DRAW_GATHER.RING_PX),
    shared.filter((k) => PHONE.DRAW_GATHER[k] !== DRAW_GATHER[k]));
  check('1. MIRROR: the full share is the sword\'s, the perfect window the sword\'s late side',
    DRAW_GATHER.FULL_SHARE === FREE_SWING.FULL_SWING_SHARE && DRAW_GATHER.PERFECT_DRAW_MS === FREE_SWING.PERFECT_LATE_MS
    && DRAW_GATHER.BOW_FASTER === FREE_SWING.BOW_FASTER && DRAW_GATHER.BOW_MIN_MS === FREE_SWING.BOW_MIN_MS
    && DRAW_GATHER.MIN_GAP_MS === FREE_SWING.MIN_SWING_GAP_MS);
  check('1. MIRROR: the phone\'s full draw and full gather from the held intervals are the worker\'s (495 -> 371, 600 -> 900)',
    PHONE.fullDrawMs(495) === BCYC && PHONE.fullGatherMs(600) === SCYC && PHONE.fullDrawMs(250) === 215);
  check('1. MIRROR: the staff\'s +300 is monsterCombat.js\'s', /var _staffCdExtra = \(S\.rpg && S\.rpg\.activeSlot === 'staff'\) \? 300 : 0;/.test(read('../../src/game/monsterCombat.js')));
  check('1. the phone\'s rules: shares, the perfect window\'s edges, the stages\' edges, the wire',
    PHONE.buildShare(185.5, 371) === 0.5 && PHONE.buildShare(9999, 371) === 1 && PHONE.buildShare(-5, 371) === 0 && PHONE.buildShare(NaN, 371) === 0
    && !PHONE.drawPerfect(370, 371) && PHONE.drawPerfect(371, 371) && PHONE.drawPerfect(671, 371) && !PHONE.drawPerfect(672, 371)
    && PHONE.gatherStageAt(359, 900) === 0 && PHONE.gatherStageAt(360, 900) === 1 && PHONE.gatherStageAt(719, 900) === 1 && PHONE.gatherStageAt(720, 900) === 2
    && PHONE.buildWire(371.6) === 372 && PHONE.buildWire(-1) === 0 && PHONE.buildWire(1e12) === 60000 && PHONE.BUILD_FIELDS.bow === 'dr' && PHONE.BUILD_FIELDS.staff === 'ga');
  check('1. `bowdraw` and `staffgather` are lower-case names the operator\'s route takes, on unless written false',
    flagNameOk('bowdraw') && flagNameOk('staffgather') && room._bowDrawOn() && room._staffGatherOn());
  const c = capsOf(P);
  check('1. caps.bowDraw and caps.staffGather are advertised', c.bowDraw === 1 && c.staffGather === 1, c);
  room._liveFlags = { bowdraw: false };
  const c1 = capsOf(await join('bp_dg_c1', { fs: 2 }));
  room._liveFlags = { staffgather: false };
  const c2 = capsOf(await join('bp_dg_c2', { fs: 2 }));
  room._liveFlags = {};
  check('1. ...each un-advertised by its own switch, the other kept', c1.bowDraw === undefined && c1.staffGather === 1 && c2.bowDraw === 1 && c2.staffGather === undefined, { c1: [c1.bowDraw, c1.staffGather], c2: [c2.bowDraw, c2.staffGather] });
  const jtxt = read('../src/join.js');
  check('1. each cap on its OWN line in join.js (TRAPS §316)',
    /\n {8}bowDraw: this\._bowDrawOn\(\) \? 1 : undefined,\n/.test(jtxt) && /\n {8}staffGather: this\._staffGatherOn\(\) \? 1 : undefined,\n/.test(jtxt));
  const dp = read('../../src/ui/panels/DevPanel.jsx');
  check('1. ...and each on its own line in CAP_GATES', /\n {2}'bowDraw' \/\*/.test(dp) && /\n {2}'staffGather' \/\*/.test(dp));
}

// ── 2. the bow's draw: a share of a full one ──
{
  for (const [frac, shoves] of [[0.25, false], [0.5, false], [0.79, false], [0.8, true], [2, true] /* past the perfect window: a plain full one */]) {
    arm(P); T += 10000;
    const m = monster(P, 120);
    await bow(P, 0); T += 1000;   /* a shot to time the next by */
    const dr = Math.round(frac * BCYC);
    const s = await bow(P, dr);
    T += 100;
    home(P, m);
    const d = hit(P, m, { slot: 'ranged', sw: s }, true);
    const moved = Math.round(Math.hypot(m.x - (P.ps.x + 120), m.y - P.ps.y));
    const k = Math.min(1, dr / BCYC);
    const want = Math.floor(100 * k + 1e-9);
    const ev = hitEv();
    check(`2. a draw of ${dr} ms (${frac} of a full one) lands ${want} of a full 100, ${shoves ? 'and shoves' : 'and shoves nothing'}`,
      d === want && (shoves ? moved > 0 : moved === 0) && (k === 1 ? ev.payload.pw === undefined : ev.payload.pw === Math.round(k * 100) / 100),
      { d, want, moved, p: ev && ev.payload });
  }
  arm(P); T += 10000;
  const m = monster(P, 120);
  await bow(P, 0); T += 250;
  await bow(P, 9000);
  check('2. the relayed copy carries the draw the worker counted (250 + the 100 slack), not the claim', relayed && relayed.payload.dr === 350, relayed && relayed.payload);
  /* the fraction carried: three thirds of a draw are a whole hit */
  arm(P); T += 10000;
  const m3 = monster(P, 120);
  await bow(P, 0);
  let sum = 0;
  for (let i = 0; i < 3; i++) { T += Math.round(BCYC / 3) + 1; const s = await bow(P, BCYC / 3); T += 50; sum += arrow(P, m3, s); T -= 50; }
  check('2. three draws of a third land a whole hit between them (the fraction carried, never rounded up)', sum === 100, sum);
  void m;
}

// ── 3. the bound, and forged claims ──
{
  arm(P); T += 10000;
  const m = monster(P, 120);
  await bow(P, 0); T += 200;
  let s = await bow(P, BCYC);
  T += 50;
  const d1 = arrow(P, m, s);
  check('3. a full draw claimed 200 ms after the last shot counts 300 (200 + the 100 slack): 80 of 100', d1 === Math.floor(100 * 300 / BCYC), d1);
  T += 150;
  s = await bow(P, BCYC);
  T += 50;
  const d2 = arrow(P, m, s);
  check('3. ...and the slack is LENT: the next, 200 ms on, has 200 - 100 owed + 100 = 200 (53)', d2 === Math.floor(100 * 200 / BCYC + (100 * 300 / BCYC % 1) + 1e-9), { d2 });
  /* a run of greedy claims never beats the time that passed + the slack once */
  arm(P); T += 10000;
  const mg = monster(P, 120);
  await bow(P, 0);
  const t0 = T;
  let got = 0;
  for (let i = 0; i < 100; i++) { T += 150; const g = await bow(P, 1e9); T += 20; got += arrow(P, mg, g); T -= 20; }
  const most = Math.floor(100 * ((T - t0) + DRAW_GATHER.SLACK_MS) / BCYC);
  check(`3. a hundred shots claiming a billion ms, 150 ms apart: at most the time that passed + the slack once (${most})`, got <= most && got >= most - 2, { got, most });
  /* forged values */
  const forge = async (val, extra, slotOverride) => {
    arm(P); T += 10000;
    const mm = monster(P, 120);
    await bow(P, 0); T += 2000;
    const st = await shot(P, Object.assign({ dr: val }, extra || {}));
    T += 50;
    return { d: hit(P, mm, { slot: slotOverride || 'ranged', sw: st }), kept: !!(P.ps._dg && P.ps._dg.q.find((x) => x.sw === st)), ev: hitEv() };
  };
  const neg = await forge(-500);
  check('3. a negative draw is a draw of nothing: it lands nothing, says nothing', neg.d === 0 && neg.kept && !neg.ev, neg);
  const str = await forge('371');
  check('3. a string is a draw of nothing', str.d === 0 && str.kept, str);
  const nul = await forge(null);
  check('3. null (JSON\'s NaN and Infinity) is no claim: today\'s arrow, nothing kept', nul.d === 100 && !nul.kept, nul);
  const huge = await forge(1e12);
  check('3. a huge draw is the bound: a full one, never more (100)', huge.d === 100, huge);
  /* NaN and Infinity straight in (a JSON phone cannot send them) */
  arm(P); T += 10000;
  room._dgShot(P.sess, { isStaff: false, ts: T, dr: NaN }, T); T += 2000;
  room._dgShot(P.sess, { isStaff: false, ts: T, dr: Infinity }, T);
  check('3. NaN and Infinity (handed in directly) are draws of nothing', P.ps._dg.q.length === 2 && P.ps._dg.q.every((x) => x.f === 0), P.ps._dg.q);
  const wrongField = await forge(undefined, { isStaff: false, ga: BCYC });
  check('3. a gather claimed on an arrow keeps nothing (today\'s arrow)', wrongField.d === 100 && !wrongField.kept, wrongField);
  arm(P); T += 10000;
  { const mm = monster(P, 120); await bow(P, 0); T += 2000; const st = await bolt(P, undefined, { dr: 100 }); T += 50;
    check('3. a draw claimed on a bolt keeps nothing (today\'s bolt)', orb(P, mm, st) === 100 && !(P.ps._dg.q.find((x) => x.sw === st))); }
  arm(P); P.ps.rangedWeapon = null; T += 10000;
  await bow(P, 100);
  check('3. a draw from a phone with no bow in the worker\'s slot keeps nothing', P.ps._dg === undefined);
  arm(P); T += 10000;
  await bow(P, 100, { isSpecial: true }); T += 500; await bow(P, 100, { retreat: 1 });
  check('3. a special\'s or a retreat\'s shot keeps nothing', P.ps._dg === undefined);
  arm(P); T += 10000;
  await room.webSocketMessage(P.ws, JSON.stringify({ type: 'player_projectile', payload: { id: P.id, x: 1, y: 1, ang: 0, isStaff: false, dr: 300 } }));
  check('3. a shot with no `ts` (nothing its claims can name) keeps nothing', P.ps._dg === undefined);
  arm(P); T += 10000;
  { const mm = monster(P, 120); await bow(P, 0); T += 2000;
    const st = await bow(P, 50); await room.webSocketMessage(P.ws, JSON.stringify({ type: 'player_projectile', payload: { id: P.id, isStaff: false, ts: st, dr: BCYC } }));
    T += 50;
    check('3. the same shot sent twice: the first stands (a draw of 50, 13)', arrow(P, mm, st) === Math.floor(100 * 50 / BCYC)); }
  arm(P); T += 10000;
  { const mm = monster(P, 120); await bow(P, 0); T += 2000; const sb = await bolt(P, 90); T += 50;
    check('3. a bolt\'s shot named on an arrow\'s claim is no shot of the bow\'s: today\'s arrow', arrow(P, mm, sb) === 100); }
  /* one clock for the bow and the staff */
  arm(P); T += 10000;
  { const mm = monster(P, 120); await bow(P, 0); T += 400; const sb = await bolt(P, SCYC); T += 200; const sa = await bow(P, BCYC); T += 50;
    const db = orb(P, mm, sb); const da = arrow(P, mm, sa);
    check('3. ONE clock: a full bolt 400 ms after an arrow counts 500 (the slack lent), and a full arrow 200 ms after the bolt only 200 (100 of it owed), not a full of each',
      db === Math.floor(100 * 500 / SCYC) && da === Math.floor(100 * 200 / BCYC + ((100 * 500 / SCYC) % 1) + 1e-9), { db, da }); }
}

// ── 4. the perfect draw ──
async function drawAt(p, dr, gap) {
  arm(p); T += 10000;
  const m = monster(p, 120);
  await bow(p, 0); T += (gap === undefined ? dr + 50 : gap);
  const s = await bow(p, dr);
  T += 100;
  const d = arrow(p, m, s);
  return { d, ev: hitEv(), mana: p.ps.mana };
}
{
  for (const [dr, pf] of [[BCYC - 1, false], [BCYC, true], [BCYC + 150, true], [BCYC + 300, true], [BCYC + 301, false], [2000, false]]) {
    const r = await drawAt(P, dr);
    const want = pf ? 112 : Math.floor(100 * Math.min(1, dr / BCYC) + 1e-9);
    check(`4. a draw of ${dr} ms on a ${BCYC} full draw ${pf ? 'IS' : 'is not'} the perfect shot (${want})`,
      r.d === want && (pf ? r.ev.payload.pf === 1 : r.ev.payload.pf === undefined), { d: r.d, p: r.ev && r.ev.payload });
  }
  const cut = await drawAt(P, BCYC, 200);
  check('4. a full draw claimed only 200 ms after the last shot is cut by the bound: never perfect', cut.d === 80 && cut.ev.payload.pf === undefined, cut.d);
  /* the mana: an eighth of the special a perfect shot, once a shot however many it takes */
  arm(P); T += 10000;
  const m = monster(P, 120), m2 = monster(P, 130, 10);
  await bow(P, 0);
  for (let i = 0; i < 8; i++) { T += BCYC; const s = await bow(P, BCYC); T += 50; arrow(P, m, s); T += 2; arrow(P, m2, s); T -= 52; }
  check('4. eight perfect draws pay one special (20 mana), once a shot however many monsters it pierces', P.ps.mana === 20, P.ps.mana);
  const nob = await drawAt(NOB, BCYC);
  check('4. a phone that declined the bonus (`fs: 1`): a plain full arrow', nob.d === 100 && nob.ev.payload.pf === undefined && nob.mana === 0);
  const off = await drawAt(OFF, BCYC);
  check('4. a phone off the trial (no perfect today) gets none from a draw either', off.d === 100 && off.ev.payload.pf === undefined);
  room._liveFlags = { perfectbow: false };
  const pb = await drawAt(P, BCYC);
  room._liveFlags = { freeswingbonus: false };
  const fb = await drawAt(P, BCYC);
  room._liveFlags = {};
  check('4. `perfectbow: false` and `freeswingbonus: false`: a full draw is a plain full arrow, no mana', pb.d === 100 && fb.d === 100 && pb.mana === 0 && fb.mana === 0 && pb.ev.payload.pf === undefined);
}

// ── 5. the floors ──
{
  arm(P); T += 10000;
  const m = monster(P, 120);
  await bow(P, 0); T += 1000;
  const s1 = await bow(P, 200);
  T += 60;
  const s2 = await bow(P, 60);    /* 60 ms after: under the floor */
  T += 20;
  const d1 = arrow(P, m, s1);
  const d2 = arrow(P, m, s2);
  const ev2 = hitEv();
  T += 140;                        /* 200 ms after the counted shot */
  const s3 = await bow(P, 200);
  T += 20;
  const d3 = arrow(P, m, s3);
  check('5. a shot 60 ms after the last lands nothing, says nothing, and leaves the clock (the next, 200 ms after the counted one, counts 200)',
    d1 === Math.floor(100 * 200 / BCYC) && d2 === 0 && !ev2 && d3 === Math.floor(100 * 200 / BCYC + ((100 * 200 / BCYC) % 1) + 1e-9), { d1, d2, d3 });
  check('5. ...and the 210 ms lane on one monster did not drop the third (it came 80 ms after the first claim)', d3 > 0);
  /* each monster once a shot; an arrow takes 4 at most */
  arm(P); T += 10000;
  const ms = [0, 1, 2, 3, 4].map((i) => monster(P, 120 + i * 10, i * 5));
  await bow(P, 0); T += 1000;
  const s = await bow(P, BCYC + 1000);
  T += 50;
  const took = ms.map((mm) => { T += 2; return arrow(P, mm, s); });
  const again = arrow(P, ms[0], s);
  check('5. an arrow takes each monster once, four at most (an arrow and its Piercing)', took.join() === '100,100,100,100,0' && again === 0, { took, again });
  P.ps.weaponSpecs = { bow: { piercing: 60 } };
  arm(P); T += 10000;
  const mp = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => monster(P, 120 + i * 10, i * 5));
  await bow(P, 0); T += 1000;
  const sp = await bow(P, BCYC + 1000); T += 50;
  const tp = mp.map((mm) => { T += 2; return arrow(P, mm, sp); });
  delete P.ps.weaponSpecs;
  check('5. ...or its Piercing\'s worth (60 points: 6, so 7)', tp.filter((x) => x === 100).length === 7, tp);
  /* a bolt takes one */
  arm(P, 'staff'); T += 10000;
  const b1 = monster(P, 120), b2 = monster(P, 300, 0);
  await bolt(P, 0); T += 2000;
  const sb = await bolt(P, SCYC); T += 50;
  const ob = [orb(P, b1, sb), (T += 5, orb(P, b2, sb))];
  check('5. a bolt takes one (its splash is the worker\'s own)', ob[0] === 100 && ob[1] === 0, ob);
  /* the allowance is spent by share: a tap-spam of light shots is never cut */
  arm(P); T += 10000;
  const mr = monster(P, 120);
  await bow(P, 0);
  let n = 0;
  for (let i = 0; i < 80; i++) { T += 110; const st = await bow(P, 110); T += 5; if (arrow(P, mr, st) > 0) n++; T -= 5; }
  const tok = P.ps._hitBucket && P.ps._hitBucket.ranged;
  check('5. eighty shots 110 ms apart (9 a second, past the bow\'s 5 claims a second): every one landed, the allowance spent by share', n === 80 && tok && tok.tokens > 0, { n, tokens: tok && tok.tokens });
}

// ── 6. the staff's gather ──
{
  for (const [frac, st] of [[0.2, 0], [0.39, 0], [0.4, 1], [0.79, 1], [0.8, 2], [1, 2]]) {
    arm(P, 'staff'); T += 10000;
    const m = monster(P, 200);
    const near = monster(P, 200 + 30, 0);    /* 30 px from the impact */
    const mid2 = monster(P, 200, 50);        /* 50 px */
    await bolt(P, 0); T += 3000;
    const ga = Math.round(frac * SCYC);
    const s = await bolt(P, ga);
    T += 200;
    for (const mm of [m, near, mid2]) home(P, mm);
    const h0 = [near.hp, mid2.hp];
    const d = orb(P, m, s, true);
    const k = Math.min(1, ga / SCYC);
    const sd = [h0[0] - near.hp, h0[1] - mid2.hp];
    const ev = hitEv();
    const base = Math.floor(100 * k * STAFF_SPLASH.FRAC + 1e-9);   /* whole, the fraction carried (drawgather.js _dgSplash) */
    const want = st === 0 ? [0, 0] : st === 1 ? [base, 0] : [base, base];
    const ring = DRAW_GATHER.RING_PX[st];
    const pushNear = Math.round(Math.hypot(near.x - (P.ps.x + 230), near.y - P.ps.y));
    check(`6. a gather of ${frac} (${ga} ms) is a ${PHONE.STAGE_NAMES[st]}: ${Math.floor(100 * k + 1e-9)} on its monster, a splash of ${want.join('/')} at 30/50 px, a ring of ${ring} px`,
      d === Math.floor(100 * k + 1e-9) && sd.join() === want.join() && ev.payload.gs === st && pushNear === ring && ev.payload.pf === undefined,
      { d, sd, want, gs: ev && ev.payload.gs, pushNear });
  }
  /* the ring pushes outward from the impact, the primary is not ringed */
  arm(P, 'staff'); T += 10000;
  const m = monster(P, 200), w = monster(P, 200, -40);
  await bolt(P, 0); T += 3000;
  const s = await bolt(P, SCYC); T += 200;
  home(P, m); home(P, w);
  orb(P, m, s, true);
  check('6. a sphere\'s ring throws a monster 40 px north of the impact 30 px further north', Math.round(w.y) === 500 - 40 - 30 && Math.round(w.x) === 700, { x: w.x, y: w.y });
  check('6. ...the monster it struck takes the hit\'s own shove (away from the caster), not the ring', Math.round(m.x) === 730 && Math.round(m.y) === 500, { x: m.x, y: m.y });
  /* a braced monster stays */
  arm(P, 'staff'); T += 10000;
  const m2 = monster(P, 200), br = monster(P, 200, 40);
  const was = room._moveBraced;
  room._moveBraced = (mm) => mm === br;
  await bolt(P, 0); T += 3000;
  const s2 = await bolt(P, SCYC); T += 200;
  home(P, m2); home(P, br);
  orb(P, m2, s2, true);
  room._moveBraced = was;
  check('6. a monster braced for its move is not thrown', Math.round(br.y) === 540);
  /* no perfect for the staff, and today's bolt with no field */
  arm(P, 'staff'); T += 10000;
  const m3 = monster(P, 200), n3 = monster(P, 200, 50);
  await bolt(P); T += 3000;
  const s3 = await bolt(P); T += 200;
  home(P, m3); home(P, n3);
  const h3 = n3.hp;
  const d3 = orb(P, m3, s3, true);
  check('6. a bolt with no gather is today\'s: 100, a splash of 50 at 50 px, no stage told, no ring', d3 === 100 && h3 - n3.hp === 50 && hitEv().payload.gs === undefined && Math.round(n3.y) === 550 && P.ps._dg === undefined);
}

// ── 7. against a player ──
{
  if (!room._pvpConsent) room._pvpConsent = new Map();
  const realPvpRoll = room._pvpRollFor;
  room._pvpRollFor = () => ({ dmg: 100, isCrit: false });
  async function duel(p, kind, build, gap, sw2, pre) {
    arm(p, kind === 'staff' ? 'staff' : 'ranged');
    if (pre) pre();
    room._pvpConsent.set(room._pvpPairKey(p.id, TGT.id), T + 3600000);
    TGT.ps.z = p.ps.z; TGT.ps.x = p.ps.x + 200; TGT.ps.y = p.ps.y;
    TGT.ps.maxHp = 1e7; TGT.ps.hp = 1e7; TGT.ps.dead = TGT.ps.dying = TGT.ps.disconnected = false;
    TGT.ps.blocking = false; TGT.ps.dodging = false; TGT.ps._zoneEntryGraceUntil = 0;
    room._pvpHitLanes = new Map(); T += 10000;
    const fire = (b) => (kind === 'staff' ? bolt(p, b) : bow(p, b));
    await fire(0); T += gap;
    const s = await fire(build);
    T += 100;
    const hp0 = TGT.ps.hp;
    room.eventBuffer.length = 0;
    room._resolvePvPAttack(p.sess, { kind, range: 600, arc: 3, angle: 0, target: TGT.id, sw: sw2 === undefined ? s : sw2 });
    return { d: hp0 - TGT.ps.hp, ev: room.eventBuffer.find((e) => e.type === 'pvp_hit') };
  }
  const full = await duel(P, 'ranged', BCYC, 2000);
  const plain = await duel(P, 'ranged', undefined, 2000);
  const half = await duel(P, 'ranged', Math.round(BCYC / 2), 2000);
  check('7. a perfect draw on a player: no bonus (the same as a shot with no draw), no mana, nothing said',
    full.d > 0 && full.d === plain.d && P.ps.mana === 0 && full.ev.payload.pf === undefined, { full: full.d, plain: plain.d });
  check('7. a half draw on a player lands its share (after every cut) and says so', half.d === Math.floor(full.d * Math.round(BCYC / 2) / BCYC + 1e-9) && half.ev.payload.pw === Math.round(Math.round(BCYC / 2) / BCYC * 100) / 100, { half: half.d, full: full.d, p: half.ev && half.ev.payload.pw });
  /* the 300 ms lane: two named shots 150 ms apart both land */
  arm(P);
  room._pvpConsent.set(room._pvpPairKey(P.id, TGT.id), T + 3600000);
  TGT.ps.x = P.ps.x + 200; TGT.ps.y = P.ps.y; TGT.ps.z = P.ps.z; TGT.ps.hp = 1e7;
  room._pvpHitLanes = new Map(); T += 10000;
  await bow(P, 0); T += 150;
  const sa = await bow(P, 150); T += 150;
  const sb = await bow(P, 150); T += 50;
  const hA = TGT.ps.hp; room._resolvePvPAttack(P.sess, { kind: 'ranged', range: 600, arc: 3, angle: 0, target: TGT.id, sw: sa });
  T += 150;
  const hB = TGT.ps.hp; room._resolvePvPAttack(P.sess, { kind: 'ranged', range: 600, arc: 3, angle: 0, target: TGT.id, sw: sb });
  check('7. two named shots on a player 150 ms apart both land (the 300 ms lane holds a named one by its worth: v2.3.4799)', hA - hB > 0 && hB - TGT.ps.hp > 0, { a: hA - hB, b: hB - TGT.ps.hp });
  const again = TGT.ps.hp; room._resolvePvPAttack(P.sess, { kind: 'ranged', range: 600, arc: 3, angle: 0, target: TGT.id, sw: sb });
  check('7. ...and each player once a shot', again === TGT.ps.hp);
  /* a gathered bolt's splash from a player, by its stage */
  const splashOf = async (ga) => {
    let near = null;
    const r = await duel(P, 'staff', ga, 3000, undefined, () => { near = monster(P, 200, 50); });   /* 50 px from the struck player */
    return { d: r.d, splash: 1e7 - near.hp };
  };
  const sph = await splashOf(SCYC), spk = await splashOf(Math.round(SCYC * 0.2));
  check('7. a sphere that struck a player splashes the monster 50 px off (50); a spark none', sph.splash === 50 && spk.splash === 0, { sph, spk });
  room._pvpRollFor = realPvpRoll;
}

// ── 8. no field, the switches, protocol v1 ──
{
  arm(P); T += 10000;
  const m = monster(P, 120);
  await bow(P); T += 50;
  const s = await bow(P); T += 50;
  check('8. an arrow with no draw: today\'s 100 (a shot 50 ms after the last), nothing kept', arrow(P, m, s) === 100 && P.ps._dg === undefined);
  for (const [flag, kind] of [['bowdraw', 'ranged'], ['staffgather', 'staff']]) {
    room._liveFlags = { [flag]: false };
    arm(P, kind); T += 10000;
    const mm = monster(P, 120);
    const fire = (b) => (kind === 'staff' ? bolt(P, b) : bow(P, b));
    await fire(0); T += 2000;
    const st = await fire(50);
    T += 50;
    const d = kind === 'staff' ? orb(P, mm, st) : arrow(P, mm, st);
    check(`8. \`${flag}: false\`: a shot claiming a 50 ms build is today's whole one, nothing kept, the claim relayed as sent`, d === 100 && P.ps._dg === undefined && relayed && relayed.payload[kind === 'staff' ? 'ga' : 'dr'] === 50, { d });
    room._liveFlags = {};
  }
  /* v2.3.4799: a switch thrown live reaches every phone already playing
     (the combined feel's review, F2: the caps were read only at a join, so
     a phone kept drawing and its light flicks landed as whole arrows) */
  {
    const told = [];
    const realBA = room.broadcastAll;
    room.broadcastAll = (msg) => { told.push(msg); };
    const req = (method, path, body) => room.fetch(new Request('https://x' + path, {
      method, headers: { Authorization: 'Bearer dg-key' }, body: body ? JSON.stringify(body) : undefined,
    }));
    await req('POST', '/api/admin/flags', { name: 'bowdraw', value: false });
    const a = told.filter((x) => x.type === 'draw_gather').pop();
    told.length = 0;
    await req('POST', '/api/admin/flags', { name: 'staffgather', value: false });
    const b = told.filter((x) => x.type === 'draw_gather').pop();
    told.length = 0;
    await req('DELETE', '/api/admin/flags?name=bowdraw');
    await req('DELETE', '/api/admin/flags?name=staffgather');
    const c = told.filter((x) => x.type === 'draw_gather').pop();
    room.broadcastAll = realBA;
    room._liveFlags = {};
    check('8. setting `bowdraw: false` live tells every phone (draw_gather, bow 0, staff 1)', !!a && a.bow === 0 && a.staff === 1, a);
    check('8. ...`staffgather: false` too (bow 0, staff 0), and clearing both puts both back', !!b && b.bow === 0 && b.staff === 0 && !!c && c.bow === 1 && c.staff === 1, { b, c });
    const { PRIVILEGED_EVENTS } = await import('../src/index.js');
    check('8. draw_gather is a privileged type (a phone cannot forge it)', PRIVILEGED_EVENTS.has('draw_gather'));
    const wsc = read('../../src/networking/wsClient.js');
    check('8. the phone\'s direct switch sets both caps from it (bowFeelOn and staffFeelOn read them, and give way at once)',
      /case 'draw_gather':\s*\n\s*\{\s*\n\s*if \(S\._serverCaps\) \{\s*\n\s*S\._serverCaps\.bowDraw = msg\.bow \? 1 : undefined;\s*\n\s*S\._serverCaps\.staffGather = msg\.staff \? 1 : undefined;/.test(wsc));
  }
  /* switched off with shots already kept: their claims are today's at once */
  arm(P); T += 10000;
  const mk = monster(P, 120);
  await bow(P, 0); T += 2000;
  const sk = await bow(P, 50); T += 50;
  room._liveFlags = { bowdraw: false };
  const dk = arrow(P, mk, sk);
  room._liveFlags = {};
  check('8. ...a shot kept before the switch went off lands today\'s whole one', dk === 100, dk);
  /* protocol v1 */
  arm(V1); T += 10000;
  const mv = monster(V1, 120);
  await bow(V1, 0); T += 2000;
  const sv = await bow(V1, Math.round(BCYC / 2)); T += 50;
  check('8. a protocol-v1 phone (full snapshots) draws the same: half a draw, half a hit', arrow(V1, mv, sv) === Math.floor(100 * Math.round(BCYC / 2) / BCYC + 1e-9) && capsOf(V1).bowDraw === 1);
}

// ── 9. THE BALANCE PROOF: a minute against a dummy ──
async function minute(p, kind, every, build, neighbours) {
  arm(p, kind === 'staff' ? 'staff' : 'ranged'); T += 10000;
  const m = monster(p, 200);
  const ns = [];
  for (let i = 0; i < (neighbours || 0); i++) ns.push(monster(p, 200 + (i ? -30 : 30), 0));
  const hp0 = ns.map((x) => x.hp);
  const t0 = T;
  let main = 0, shots = 0;
  while (T - t0 < 60000) {
    const s = kind === 'staff' ? await bolt(p, build) : await bow(p, build);
    shots++;
    T += 40;
    home(p, m); for (const x of ns) home(p, x);
    main += hit(p, m, { slot: kind, sw: s }, true);
    T += every - 40;
  }
  const splash = ns.reduce((a, x, i) => a + (hp0[i] - x.hp), 0);
  return { main, splash, shots };
}
async function proof(tag) {
  /* the bow: today on the trial (every arrow on the cycle perfect: today's best), and off it */
  const todayBest = await minute(P, 'ranged', BCYC);
  const todayPlain = await minute(OFF, 'ranged', BCYC);
  const fullPerfect = await minute(P, 'ranged', BCYC, BCYC);
  const fullPlain = await minute(OFF, 'ranged', BCYC, BCYC);
  const spam = await minute(P, 'ranged', 120, 120);
  const half = await minute(P, 'ranged', Math.round(BCYC / 2), Math.round(BCYC / 2));
  const forgedFast = await minute(P, 'ranged', 120, 1e9);
  const forgedFull = await minute(P, 'ranged', 200, BCYC);
  const within = (a, b, pct) => Math.abs(a - b) <= b * pct / 100 + 2;
  console.log(`   [${tag}] bow a minute: today best ${todayBest.main} (${todayBest.shots} shots), today plain ${todayPlain.main}; full perfect draws ${fullPerfect.main}, full draws off the trial ${fullPlain.main}; tap-spam 120 ms ${spam.main} (${spam.shots} shots), half draws ${half.main}; forged 1e9 every 120 ms ${forgedFast.main}, forged full every 200 ms ${forgedFull.main}`);
  /* one bonus apart at most: today's first arrow after a rest has nothing to
     be timed by, a first full draw is timed by itself */
  const bonus = Math.ceil(fullPerfect.main / fullPerfect.shots * FREE_SWING.FULL_SWING_BONUS / (1 + FREE_SWING.FULL_SWING_BONUS));
  check(`9. [${tag}] the bow's best a minute does not move: full perfect draws = today's perfect arrows (the first draw's bonus aside: ${bonus})`,
    fullPerfect.main >= todayBest.main && fullPerfect.main - todayBest.main <= bonus, { fullPerfect: fullPerfect.main, todayBest: todayBest.main, bonus });
  check(`9. [${tag}] full draws off the trial = today's arrows off it`, fullPlain.main === todayPlain.main, { fullPlain: fullPlain.main, todayPlain: todayPlain.main });
  check(`9. [${tag}] tap-spam and half draws land today's plain damage a second (within 1%), never above today's best`,
    within(spam.main, todayPlain.main, 1) && within(half.main, todayPlain.main, 1) && spam.main < todayBest.main && half.main < todayBest.main, { spam: spam.main, half: half.main, todayPlain: todayPlain.main });
  check(`9. [${tag}] forged rhythms gain nothing over an honest one (at most today's plain + the slack once)`,
    forgedFast.main <= todayPlain.main * (60000 + 100) / 60000 + 101 && forgedFull.main <= todayPlain.main * (60000 + 100) / 60000 + 101, { forgedFast: forgedFast.main, forgedFull: forgedFull.main });
  /* the staff: today's held staff (every 900 ms) over a monster and two neighbours */
  const sToday = await minute(P, 'staff', SCYC, undefined, 2);
  const sFull = await minute(P, 'staff', SCYC, SCYC, 2);
  const sSphere = await minute(P, 'staff', Math.round(SCYC * 0.8), Math.round(SCYC * 0.8), 2);
  const sSpark = await minute(P, 'staff', 150, 150, 2);
  console.log(`   [${tag}] staff a minute (monster / splash on two neighbours): today ${sToday.main}/${sToday.splash}; full gathers ${sFull.main}/${sFull.splash}; spheres of 0.8 ${sSphere.main}/${sSphere.splash}; sparks every 150 ms ${sSpark.main}/${sSpark.splash}`);
  check(`9. [${tag}] the staff's best a minute does not move: full gathers = today's bolts, on the monster and in the splash`, sFull.main === sToday.main && sFull.splash === sToday.splash, { sFull, sToday });
  check(`9. [${tag}] spheres of 0.8 land today's damage a second, monster and splash (within 1%)`, within(sSphere.main, sToday.main, 1) && within(sSphere.splash, sToday.splash, 1.5), { sSphere, sToday });
  check(`9. [${tag}] sparks land today's on the monster (within 1%) and no splash: building pays over a pack, never past today`, within(sSpark.main, sToday.main, 1) && sSpark.splash === 0, { sSpark, sToday });
}
await proof('a fixed roll of 100');
room._rollHit = realRoll;   /* the worker's own roll (its ceilings, the edge) at a fixed die */
await proof('the worker\'s roll');
room._rollHit = FIXED;

/* v2.3.4799: THE MIXED RHYTHMS (the combined feel's review, F1).  A modified
   phone mixing shots with and without a field: before, a field-less arrow
   did not move the draw clock and a drawn one skipped the 210 ms lane, so a
   field-less arrow then a full draw 1 ms later, every cycle, landed 35,044
   a minute and 312 perfects (today's best forged rhythm 29,068; honest 162
   perfects), and in a duel 1.8x today's.  Each step: a shot (`b` its build;
   absent: no field; `nr`: no shot at all, a claim naming nothing), its
   claim 1 ms later, then `gap` ms to the next. */
async function mixMinute(p, kind, plan) {
  arm(p, kind); T += 10000;
  const m = monster(p, 200);
  const t0 = T;
  let main = 0, pf = 0;
  while (T - t0 < 60000) {
    for (const st of plan) {
      const s = st.nr ? undefined : kind === 'staff' ? await bolt(p, st.b) : await bow(p, st.b);
      T += 1;
      main += hit(p, m, { slot: kind, sw: s });
      for (const e of lastEvents) if (e.type === 'monster_hit' && e.payload.pf) pf++;
      T += st.gap - 1;
    }
  }
  return { main, pf };
}
async function mixDuel(p, kind, plan) {
  arm(p, kind);
  room._pvpConsent.set(room._pvpPairKey(p.id, TGT.id), T + 3600000);
  TGT.ps.z = p.ps.z; TGT.ps.x = p.ps.x + 200; TGT.ps.y = p.ps.y;
  TGT.ps.maxHp = 1e9; TGT.ps.hp = 1e9; TGT.ps.dead = TGT.ps.dying = TGT.ps.disconnected = false;
  TGT.ps.blocking = false; TGT.ps.dodging = false; TGT.ps._zoneEntryGraceUntil = 0;
  room._pvpHitLanes = new Map(); T += 10000;
  const t0 = T, hp0 = TGT.ps.hp;
  while (T - t0 < 60000) {
    for (const st of plan) {
      const s = st.nr ? undefined : kind === 'staff' ? await bolt(p, st.b) : await bow(p, st.b);
      T += 1;
      TGT.ps.dodging = false; TGT.ps.blocking = false;
      room._resolvePvPAttack(p.sess, { kind, range: 600, arc: 3, angle: 0, target: TGT.id, sw: s });
      T += st.gap - 1;
    }
  }
  return hp0 - TGT.ps.hp;
}
{
  room._rollHit = FIXED;
  const honest = await mixMinute(P, 'ranged', [{ b: BCYC, gap: BCYC }]);
  const ceiling = await mixMinute(P, 'ranged', [{ gap: 210 }]);   /* today's best forged rhythm: no field, every lane */
  const one = 100 * (1 + FREE_SWING.FULL_SWING_BONUS) + 1;   /* one lane early, once (drawgather.js _dgLaneTake) */
  const bowMixes = {
    'a field-less arrow, a full draw 1 ms later, every cycle (the review\'s)': [{ gap: 1 }, { b: BCYC, gap: BCYC - 1 }],
    'a field-less arrow every lane, a draw between': [{ gap: 1 }, { b: 209, gap: 209 }],
    'claims naming no shot every lane, a full draw a cycle': [{ nr: 1, gap: 1 }, { b: BCYC, gap: 210 }, { nr: 1, gap: BCYC - 211 }],
    'a field-less arrow in today\'s perfect window, then a full draw': [{ gap: BCYC - 60 }, { b: BCYC, gap: BCYC }],
    'halves: field-less and a half draw, alternating': [{ gap: 105 }, { b: 105, gap: 105 }],
    'a forged draw of 1e9 after each field-less arrow': [{ gap: 110 }, { b: 1e9, gap: 110 }],
  };
  const rows = [];
  for (const [name, plan] of Object.entries(bowMixes)) {
    const r = await mixMinute(P, 'ranged', plan);
    rows.push(`${r.main}/${r.pf}`);
    check(`9. MIXED [${name}]: never past today's best forged rhythm (+ one lane, once), never more perfects than honest full draws`,
      r.main <= ceiling.main + one && r.pf <= honest.pf, { mixed: r, ceiling, honest });
  }
  const sCeiling = await mixMinute(P, 'staff', [{ gap: 210 }]);
  const sMix = await mixMinute(P, 'staff', [{ gap: 1 }, { b: SCYC, gap: SCYC - 1 }]);
  const sMix2 = await mixMinute(P, 'staff', [{ gap: 1 }, { b: 300, gap: 209 }]);
  check('9. MIXED staff: a field-less bolt and a full gather 1 ms later, or every lane: never past today\'s best forged bolts (+ one, once)',
    sMix.main <= sCeiling.main + 101 && sMix2.main <= sCeiling.main + 101, { sMix, sMix2, sCeiling });
  console.log(`   mixed a minute (damage/perfects): honest ${honest.main}/${honest.pf}, today's best forged ${ceiling.main}/${ceiling.pf}; mixes ${rows.join(', ')}; staff today forged ${sCeiling.main}, mixes ${sMix.main}, ${sMix2.main}`);
  /* a duel: no allowance there, the 300 ms lane is the whole ceiling */
  const realPvp = room._pvpRollFor;
  room._pvpRollFor = () => ({ dmg: 100, isCrit: false });
  const dCeiling = await mixDuel(P, 'ranged', [{ gap: 300 }]);
  const dRows = [];
  for (const [kind, full] of [['ranged', BCYC], ['staff', SCYC]]) {
    for (const plan of [[{ gap: 1 }, { b: full, gap: 299 }], [{ gap: 1 }, { b: full, gap: 300 }], [{ nr: 1, gap: 1 }, { b: full, gap: 299 }], [{ gap: 150 }, { b: 150, gap: 150 }]]) {
      const d = await mixDuel(P, kind, plan);
      dRows.push(d);
      check(`9. MIXED duel [${kind} ${JSON.stringify(plan)}]: never past today's field-less shot every 300 ms (+ one, once)`, d <= dCeiling + 101, { d, dCeiling });
    }
  }
  console.log(`   mixed duels a minute: today's best forged ${dCeiling}; mixes ${dRows.join(', ')}`);
  room._pvpRollFor = realPvp;
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nALL PASS');
