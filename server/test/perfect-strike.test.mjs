/* THE PERFECT STRIKE (v2.3.4610): the free-swing trial's bonus is for timing.
 *
 * The owner, 2026-11-10: "something that benefits the player if they swipe
 * just around the time their swing is back to full again", and of the timing
 * bar: "once the bar reaches the top it glints.  During this glinting must
 * attack to get the bonus.  Same with the bow."  freeswing.js has the rules
 * (its header, "THE PERFECT STRIKE"); combat.js _handleMonsterDamage and
 * index.js's relay branch call them.  What this suite pins, through the real
 * GameRoom (the bow's arrows through the real router):
 *   1. the numbers, the switch's name, the cap, and the phone's mirrors;
 *   2. a SWORD swing at 0.85, 0.95, 1.0, 1.2, 1.4 and 1.6 cycles (and the
 *      window's edges) gets the bonus only inside the window, its share x
 *      FULL_SWING_BONUS, and its monster_hit says `pf: 1`;
 *   3. the mana: an eighth of the special's cost a perfect strike, carried
 *      -- eight pay one special; once a swing however many it takes;
 *   4. a BOW shot timed by its arrow's relay, the same cycles; an arrow's
 *      claims judged by their own shot (the next leaves before it lands);
 *      a pierced second monster; the volley and the retreat restart the
 *      clock and are never perfect; the bow's cycle (the Speed stat, the
 *      storm amulet);
 *   5. never against a player (damage a second stays the untried sword's);
 *   6. the switches: `freeswingbonus: false` (no bonus, no mana, either
 *      weapon), `perfectbow: false` (the bow's part only), `fs: 1`
 *      (`?swingbonus=0`: none), `freeswing: false`;
 *   7. a device off the trial meets today exactly: its relays keep nothing,
 *      its named arrows land as unnamed ones, its sword is the 210 ms lane. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { FREE_SWING } from '../src/freeswing.js';
import { PROG3, prog3StatValue } from '../src/prog3.js';
import { flagNameOk } from '../src/liveops.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

let T = 1_976_000_000_000;
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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: 'pf-key' };
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
const P2 = await join('bp_pf_two', { fs: 2 });   /* the trial with the bonus: the default now */
const P1 = await join('bp_pf_one', { fs: 1 });   /* `?swingbonus=0` */
const OFF = await join('bp_pf_off');             /* not on the trial */
const TGT = await join('bp_pf_tgt');             /* a player to hit */
const caps = (P2.ws.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
room._saveRpg = () => {}; room._saveRpgVitals = () => {};
let poolSaves = 0;
room._saveRpgPools = () => { poolSaves++; };
room._queuePlayerStateFlush = () => {};
room.stateHistory = {};
room._prog3AwardXp = () => {};
/* one roll, so every number is exact: 100 a hit, no crit */
room._rollHit = () => ({ dmg: 100, isCrit: false });

const ZONE = 'meadow';
let mid = 0;
function arm(p, slot) {
  p.ps.weapon = { type: 'sword', name: 'sword', tierMult: 1.25, quality: 'normal' };
  p.ps.rangedWeapon = { type: 'bow', tierMult: 1 }; p.ps.staffWeapon = null;
  p.ps.activeSlot = slot || 'melee';
  p.ps.z = ZONE; p.ps.x = 500; p.ps.y = 500;
  p.ps.dead = false; p.ps.dying = false; p.ps.disconnected = false;
  p.ps.maxMana = 100; p.ps.mana = 0; p.ps.manaBlocks = 5; p.ps.amulet = null;
  delete p.ps._monHitCad; delete p.ps._hpRate; p.ps._pveSpec = undefined; p.ps._fs = undefined; p.ps._pfb = undefined;
  p.sess.relayTokens = undefined;
}
function monster(p, d, dy = 0) {
  const zcfg = room._getZoneConfig(ZONE);
  const spawn = (zcfg && zcfg.spawns && zcfg.spawns[0]) || { arch: 'fodder' };
  const m = room._makeZoneMonster(ZONE, zcfg, spawn, 'pf-m' + (++mid), p.ps.x + d, p.ps.y + dy, 3);
  m.hp = m.maxHp = 1e7; m.alive = true; m.atkCd = T + 1e9; m.element = null; m.statuses = {};
  m._at = [d, dy];
  if (!room.monsters[ZONE]) room.monsters[ZONE] = [];
  room.monsters[ZONE].push(m);
  return m;
}
function home(p, m) { m.x = p.ps.x + m._at[0]; m.y = p.ps.y + m._at[1]; m._kbDebt = 0; }
let lastEvents = [];
function hit(p, m, payload) {
  const hp0 = m.hp;
  home(p, m);
  room.eventBuffer.length = 0;
  room._handleMonsterDamage(p.sess, Object.assign({ monsterId: m.id, zone: p.ps.z, slot: 'melee' }, payload || {}));
  lastEvents = room.eventBuffer.slice();
  return hp0 - m.hp;
}
const hitEv = () => lastEvents.find((e) => e.type === 'monster_hit');
/* an arrow leaves: its relay through the real router (the shot's own stamp, `ts`) */
async function shoot(p, extra) {
  const ts = T;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'player_projectile', payload: Object.assign({ id: p.id, x: 500, y: 500, ang: 0, isStaff: false, ts }, extra || {}) }));
  return ts;
}
const arrow = (p, m, sw) => hit(p, m, { slot: 'ranged', element: null, sw });

// ── 1. the numbers, the switch, the cap, the mirrors ──
{
  check('1. the window: 60 ms before the full cycle to 300 after; an eighth of the special back; the bonus 0.12',
    FREE_SWING.PERFECT_EARLY_MS === 60 && FREE_SWING.PERFECT_LATE_MS === 300 && FREE_SWING.PERFECT_MANA === 0.125 && FREE_SWING.FULL_SWING_BONUS === 0.12, FREE_SWING);
  check('1. `perfectbow` is a lower-case name the operator\'s route takes, on unless written false', flagNameOk('perfectbow') && room._perfectBowOn());
  check('1. caps.perfectStrike is advertised (the phone draws its bar only against a worker that judges it)', caps.perfectStrike === 1, caps);
  room._liveFlags = { freeswing: false };
  const j = await join('bp_pf_capoff', { fs: 2 });
  const c2 = (j.ws.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
  room._liveFlags = {};
  check('1. ...and not under `freeswing: false` (no trial, no bar)', c2.perfectStrike === undefined, c2);
  const mc = read('../../src/game/manualCombat.js');
  check('1. MIRROR: the phone\'s glint is the worker\'s window (manualCombat.js PERFECT_EARLY_MS / PERFECT_LATE_MS)',
    /PERFECT_EARLY_MS: 60,/.test(mc) && /PERFECT_LATE_MS: 300,/.test(mc));
  check('1. MIRROR: the flicked bow (manualCombat.js BOW_FASTER 0.75, BOW_MIN_MS 215; gameSystems.js BOW_SWING_MULT 0.825; the shot floor 200)',
    /BOW_FASTER: 0\.75,/.test(mc) && /BOW_MIN_MS: 215,/.test(mc) && FREE_SWING.BOW_FASTER === 0.75 && FREE_SWING.BOW_MIN_MS === 215
    && /export const BOW_SWING_MULT = 0\.825;/.test(read('../../src/data/gameSystems.js')) && FREE_SWING.BOW_SWING_MULT === 0.825
    && /var effectiveSwingCd = Math\.max\(200, /.test(read('../../src/game/monsterCombat.js')) && FREE_SWING.SHOT_FLOOR_MS === 200);
  check('1. MIRROR: the storm amulet\'s attack speed (items.js: base 2, 1.5 a point of power)',
    /storm: \{ stat: 'atkSpd',\s+label: 'Attack Speed',\s+unit: '%',\s+base: 2,\s+perPower: 1\.5 \}/.test(read('../../src/data/items.js'))
    && FREE_SWING.STORM_ATKSPD_BASE === 2 && FREE_SWING.STORM_ATKSPD_PER === 1.5);
}

const CYC = room._fsCycleMs(P2.ps);
check('2. a new character\'s sword cycle is 600 ms (guard)', CYC === 600, CYC);

/* a swing `k` cycles after a full one: what it took, and its event */
function swordAt(p, k, extra) {
  arm(p); T += 10000;
  const m = monster(p, 40);
  hit(p, m, { sw: 1 });
  T += Math.round(k * CYC);
  const d = hit(p, m, Object.assign({ sw: 2 }, extra || {}));
  return { d, ev: hitEv(), m };
}

// ── 2. the sword: the bonus only inside the window ──
{
  const want = (k) => Math.floor(100 * Math.min(1, k) * 1.12 + 1e-9);
  for (const [k, inside] of [[0.85, false], [0.95, true], [1.0, true], [1.2, true], [1.4, true], [1.6, false]]) {
    const r = swordAt(P2, k);
    const plain = Math.floor(100 * Math.min(1, k) + 1e-9);
    check(`2. a sword swing at ${k} cycles ${inside ? 'IS' : 'is not'} a perfect strike (${inside ? want(k) : plain} of a full 100)`,
      r.d === (inside ? want(k) : plain) && (inside ? r.ev.payload.pf === 1 : r.ev.payload.pf === undefined), { d: r.d, p: r.ev && r.ev.payload });
  }
  /* the edges: 540 and 900 ms on a 600 ms cycle */
  const at = (ms) => { arm(P2); T += 10000; const m = monster(P2, 40); hit(P2, m, { sw: 1 }); T += ms; hit(P2, m, { sw: 2 }); return hitEv().payload.pf === 1; };
  check('2. the window\'s edges: 539 ms no, 540 yes, 900 yes, 901 no', !at(539) && at(540) && at(900) && !at(901));
  /* a full swing after a rest is an ordinary full hit */
  arm(P2); T += 10000;
  const m = monster(P2, 40);
  const first = hit(P2, m, { sw: 1 });
  check('2. a first swing after a rest: a full 100, not perfect (nothing to time it by)', first === 100 && hitEv().payload.pf === undefined && hitEv().payload.pw === undefined);
  /* a swing's other target shares its judgement, and is judged once */
  T += CYC;
  const m2 = monster(P2, 40, 20);
  const a = hit(P2, m, { sw: 3 });
  const pfA = hitEv().payload.pf;
  T += 2;
  const b = hit(P2, m2, { sw: 3 });
  check('2. a perfect swing\'s second monster is perfect too (the same swing)', a === 112 && b === 112 && pfA === 1 && hitEv().payload.pf === 1, { a, b });
  /* a paid special swing is counted, never perfect, and the next is timed from it */
  arm(P2); T += 10000;
  const ms = monster(P2, 40);
  room._pveSpecialPaid(P2.ps, T);
  hit(P2, ms, { special: true, sw: 1 });
  check('2. a paid special swing is never a perfect strike', hitEv().payload.pf === undefined);
  T += CYC;
  hit(P2, ms, { sw: 2 });
  check('2. ...and a swing a cycle after it is', hitEv().payload.pf === 1);
}

// ── 3. the mana ──
{
  arm(P2); T += 10000;
  const m = monster(P2, 40), m2 = monster(P2, 40, 20);
  hit(P2, m, { sw: 1 });
  const got = [];
  poolSaves = 0;
  for (let i = 0; i < 8; i++) {
    T += CYC;
    hit(P2, m, { sw: 10 + i });
    T += 2;
    hit(P2, m2, { sw: 10 + i });   /* the same swing's second monster pays nothing more */
    got.push(P2.ps.mana);
  }
  check('3. the special costs one mana block: 20 of a new character\'s 100 (guard)', room._abilityCost(P2.ps, 'swipe') === 20, room._abilityCost(P2.ps, 'swipe'));
  check('3. eight perfect strikes give back exactly one special (20 mana: 2.5 each, the half carried)', P2.ps.mana === 20 && got[0] === 2 && got[1] === 5, got);
  check('3. ...saved the way every mana write is (coalesced: _saveRpgPools)', poolSaves >= 8, poolSaves);
  T += Math.round(CYC * 0.5);
  hit(P2, m, { sw: 99 });
  check('3. a swing outside the window gives none', P2.ps.mana === 20);
  P2.ps.mana = 99; T += CYC; hit(P2, m, { sw: 100 });
  check('3. never past the pool', P2.ps.mana === 100, P2.ps.mana);
}

// ── 4. the bow ──
const BCYC = room._pfBowCycleMs(P2.ps);
check('4. a new character\'s flicked bow cycle is the phone\'s 371 ms', BCYC === 371, BCYC);
{
  /* a shot `k` cycles after the last; its arrow lands 300 ms later */
  async function bowAt(p, k) {
    arm(p, 'ranged'); T += 10000;
    const m = monster(p, 120);
    const s0 = await shoot(p);
    T += 300; arrow(p, m, s0);
    T += Math.round(k * BCYC) - 300;
    const s1 = await shoot(p);
    T += 300;
    const d = arrow(p, m, s1);
    return { d, ev: hitEv() };
  }
  /* the window is 311..671 ms round a 371 ms cycle: 0.84 to 1.81 cycles */
  for (const [k, inside] of [[0.8, false], [0.85, true], [0.95, true], [1.0, true], [1.2, true], [1.4, true], [1.6, true], [1.9, false]]) {
    const r = await bowAt(P2, k);
    check(`4. a bow shot at ${k} cycles ${inside ? 'IS' : 'is not'} a perfect strike (${inside ? 112 : 100} of a full 100: the bow has no share)`,
      r.d === (inside ? 112 : 100) && (inside ? r.ev.payload.pf === 1 : r.ev.payload.pf === undefined), { d: r.d, p: r.ev && r.ev.payload });
  }
  {
    const edge = async (ms) => { arm(P2, 'ranged'); T += 10000; const m = monster(P2, 120); await shoot(P2); T += ms; const s = await shoot(P2); T += 100; arrow(P2, m, s); return hitEv().payload.pf === 1; };
    check('4. the bow window\'s edges: 310 ms no, 311 yes, 671 yes, 672 no', !(await edge(310)) && await edge(311) && await edge(671) && !(await edge(672)));
  }
  /* the next arrow leaves before the last lands: each claim is its own shot's */
  arm(P2, 'ranged'); T += 10000;
  const m = monster(P2, 120), m2 = monster(P2, 140, 10), m0 = monster(P2, 100, -10);
  const s0 = await shoot(P2);
  T += BCYC;
  const s1 = await shoot(P2);       /* perfect */
  T += 50;
  arrow(P2, m0, s0);                /* the first arrow lands only now */
  const pf0 = hitEv().payload.pf;
  T += Math.round(BCYC * 0.5);
  const s2 = await shoot(P2);       /* too soon: not perfect */
  T += 10;
  const d1 = arrow(P2, m, s1);
  const pf1 = hitEv().payload.pf;
  T += 5;
  const d1b = arrow(P2, m2, s1);    /* pierced on into a second monster */
  T += 300;
  const d2 = arrow(P2, m, s2);
  check('4. an arrow is judged by its own shot, whichever shot left since: the first (not timed) plain, the second (on the cycle) perfect, the third (too soon) plain',
    pf0 === undefined && d1 === 112 && pf1 === 1 && d2 === 100 && hitEv().payload.pf === undefined, { pf0, d1, pf1, d2 });
  check('4. a perfect arrow pierced into a second monster is perfect there too', d1b === 112, d1b);
  const again = arrow(P2, m2, s1);
  check('4. ...and each monster once a shot (a claim again later is plain at most)', again <= 100, again);
  check('4. an arrow naming no shot, or a shot never seen, is plain', (T += 400, arrow(P2, m, undefined)) === 100 && (T += 400, arrow(P2, m, 12345)) === 100);
  /* the mana: once a shot */
  arm(P2, 'ranged'); T += 10000;
  const mm = monster(P2, 120), mm2 = monster(P2, 130, 10);
  await shoot(P2);
  for (let i = 0; i < 8; i++) { T += BCYC; const s = await shoot(P2); T += 100; arrow(P2, mm, s); T += 2; arrow(P2, mm2, s); T -= 102; }
  check('4. eight perfect arrows give back one special, once a shot however many it pierces', P2.ps.mana === 20, P2.ps.mana);
  /* the volley and the retreat: the clock restarts, never perfect */
  arm(P2, 'ranged'); T += 10000;
  const mv = monster(P2, 120);
  await shoot(P2);
  T += BCYC;
  const sv = await shoot(P2, { isSpecial: true });
  T += 100; hit(P2, mv, { slot: 'ranged', sw: sv, special: true, part: 3 });
  check('4. a special\'s volley on the cycle is never a perfect strike', !lastEvents.some((e) => e.payload && e.payload.pf), lastEvents.map((e) => e.payload));
  T += BCYC - 100;
  const sa = await shoot(P2);
  T += 100;
  arrow(P2, mv, sa);
  check('4. ...but it restarts the clock: an arrow a cycle after the volley is perfect', hitEv().payload.pf === 1, hitEv().payload);
  T += BCYC - 100;
  await shoot(P2, { retreat: 1 });
  T += 2 * BCYC + 400;
  const sr = await shoot(P2);
  T += 100;
  arrow(P2, mv, sr);
  check('4. a retreat\'s arrow restarts it too, and is not judged', hitEv().payload.pf === undefined && P2.ps._pfb.q.find((x) => x.sw === sr - 0) !== undefined);
  /* a staff's bolt touches nothing */
  arm(P2, 'staff');
  await shoot(P2, { isStaff: true });
  check('4. a staff\'s bolt keeps nothing', P2.ps._pfb === undefined);
  /* the bow's cycle */
  const ps = P2.ps;
  const was = ps.prog3 && ps.prog3.atk ? JSON.parse(JSON.stringify(ps.prog3.atk)) : null;
  ps.prog3.atk = ps.prog3.atk || {};
  ps.prog3.atk.bow = Object.assign({}, ps.prog3.atk.bow, { aspd: 999 });
  const fast = room._pfBowCycleMs(ps);
  const cut = PROG3.ATK.aspd.max * prog3StatValue(ps, 'aspd', 'bow', null);
  const want = Math.max(215, Math.floor(Math.max(200, Math.floor(600 * Math.max(0.5, 1 - cut) * 0.825)) * 0.75));
  check('4. the Speed stat (the Bow lane) shortens the bow\'s cycle as it shortens the phone\'s', fast === want && fast < BCYC, { fast, want });
  if (was) ps.prog3.atk = was; else delete ps.prog3.atk;
  ps.amulet = { gem: 'storm', tier: 'mythic' };
  check('4. a mythic storm amulet (+6.5%): 495 / 1.065 = 464, x0.75 = 348', room._pfBowCycleMs(ps) === 348, room._pfBowCycleMs(ps));
  ps.amulet = { gem: 'flame', tier: 'mythic' };
  check('4. ...any other gem changes nothing', room._pfBowCycleMs(ps) === 371);
  ps.amulet = null;
}

// ── 5. never against a player ──
{
  if (!room._pvpConsent) room._pvpConsent = new Map();
  function duelAt(p, k) {
    arm(p);
    room._pvpConsent.set(room._pvpPairKey(p.id, TGT.id), T + 3600000);
    TGT.ps.z = p.ps.z; TGT.ps.x = p.ps.x + 40; TGT.ps.y = p.ps.y;
    TGT.ps.maxHp = 1e7; TGT.ps.hp = 1e7; TGT.ps.dead = TGT.ps.dying = TGT.ps.disconnected = false;
    TGT.ps.blocking = false; TGT.ps.dodging = false; TGT.ps._zoneEntryGraceUntil = 0;
    room._pvpHitLanes = new Map(); T += 10000;
    const atk = (sw) => { room.eventBuffer.length = 0; room._resolvePvPAttack(p.sess, { kind: 'melee', range: 200, arc: 3, angle: 0, target: TGT.id, sw }); return room.eventBuffer.find((e) => e.type === 'pvp_hit'); };
    atk(1);
    T += Math.round(k * CYC);
    const hp0 = TGT.ps.hp;
    const ev = atk(2);
    return { d: hp0 - TGT.ps.hp, ev, mana: p.ps.mana };
  }
  const two = duelAt(P2, 1.0), one = duelAt(P1, 1.0);
  check('5. a swing timed to the cycle on a player: no bonus (the same as a phone that never asked), no mana, nothing said',
    two.d > 0 && two.d === one.d && two.mana === 0 && !!two.ev && two.ev.payload.pf === undefined, { two: two.d, one: one.d, mana: two.mana, p: two.ev && two.ev.payload });
}

// ── 6. the switches ──
{
  room._liveFlags = { freeswingbonus: false };
  const s = swordAt(P2, 1.0);
  check('6. `freeswingbonus: false`: a sword swing on the cycle is a plain full hit, no mana, nothing said', s.d === 100 && P2.ps.mana === 0 && s.ev.payload.pf === undefined, { d: s.d, mana: P2.ps.mana });
  arm(P2, 'ranged'); T += 10000;
  let m = monster(P2, 120);
  await shoot(P2); T += BCYC; let sb = await shoot(P2); T += 100;
  check('6. ...and a bow shot on the cycle', arrow(P2, m, sb) === 100 && P2.ps.mana === 0 && hitEv().payload.pf === undefined);
  room._liveFlags = { perfectbow: false };
  arm(P2, 'ranged'); T += 10000;
  m = monster(P2, 120);
  await shoot(P2); T += BCYC; sb = await shoot(P2); T += 100;
  check('6. `perfectbow: false`: the bow\'s shot on the cycle is plain, and nothing is kept for it', arrow(P2, m, sb) === 100 && hitEv().payload.pf === undefined && P2.ps._pfb === undefined);
  const s2 = swordAt(P2, 1.0);
  check('6. ...the sword\'s perfect strike is untouched by it', s2.d === 112 && s2.ev.payload.pf === 1);
  room._liveFlags = {};
  const s1 = swordAt(P1, 1.0);
  check('6. `fs: 1` (the phone\'s `?swingbonus=0`): a swing on the cycle is a plain full hit, no mana', s1.d === 100 && P1.ps.mana === 0 && s1.ev.payload.pf === undefined);
  arm(P1, 'ranged'); T += 10000;
  m = monster(P1, 120);
  await shoot(P1); T += BCYC; sb = await shoot(P1); T += 100;
  check('6. ...and its bow too', arrow(P1, m, sb) === 100 && hitEv().payload.pf === undefined);
  room._liveFlags = { freeswing: false };
  const sf = swordAt(P2, 1.0);
  arm(P2, 'ranged'); T += 10000;
  m = monster(P2, 120);
  await shoot(P2); T += BCYC; sb = await shoot(P2); T += 100;
  const bf = arrow(P2, m, sb);
  check('6. `freeswing: false`: neither weapon\'s attack is judged (the untried sword, today\'s bow)', sf.d === 100 && sf.ev.payload.pf === undefined && bf === 100 && P2.ps._pfb === undefined);
  room._liveFlags = {};
}

// ── 7. a device off the trial meets today exactly ──
{
  arm(OFF, 'ranged'); T += 10000;
  const m = monster(OFF, 120);
  const s0 = await shoot(OFF); T += BCYC;
  const s1 = await shoot(OFF); T += 100;
  check('7. a device off the trial: its arrows\' relays keep nothing', OFF.ps._pfb === undefined);
  const named = arrow(OFF, m, s1);
  const named0 = (T += 400, arrow(OFF, m, s0));
  const plain = (T += 400, arrow(OFF, m, undefined));
  check('7. ...an arrow naming a shot on the cycle lands as an unnamed one (100), nothing said', named === 100 && named0 === 100 && plain === 100 && hitEv().payload.pf === undefined);
  arm(OFF); T += 10000;
  const ms = monster(OFF, 40);
  hit(OFF, ms, {});
  T += 150;
  const quick = hit(OFF, ms, {});
  T += 450;
  const cyc = hit(OFF, ms, {});
  check('7. ...its sword: the 210 ms lane drops a swing 150 ms after the last, a swing on the cycle is a plain 100', quick === 0 && cyc === 100 && hitEv().payload.pf === undefined && OFF.ps._fs === undefined);
  check('7. ...and it is never paid mana', OFF.ps.mana === 0);
  /* the relay itself is still relayed to the others, as ever */
  room.eventBuffer.length = 0;
  T += 1000; OFF.sess.relayTokens = undefined;
  await shoot(OFF);
  check('7. the arrow\'s relay still reaches the others (rebuilt in the sender\'s name)', room.eventBuffer.some((e) => e.type === 'player_projectile'), room.eventBuffer.map((e) => e.type));
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nALL PASS');
