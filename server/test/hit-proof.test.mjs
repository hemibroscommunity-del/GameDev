/* A HIT ON A MONSTER NEEDS ITS WEAPON, ITS REACH, AND A PAID SPECIAL (v2.3.3334).
 *
 * The anti-bot review's fix 8, its first part (docs/specs/antibot-review.md
 * §5).  hitproof.js has the rules, combat.js _handleMonsterDamage calls them;
 * what this suite pins, through the real handler:
 *   1. the numbers, and the reach they make for a bow and a staff, with and
 *      without the Range stat, an older character's Longshot, a draught;
 *   2. the weapon: no bow, no arrow; no staff, no bolt; a bare fist still
 *      swings;
 *   3. the reach, in every zone: a bow claim past the bow's reach is refused,
 *      a staff's past the staff's; inside a paid volley's window a chip keeps
 *      the Wheel's 3,600, and only a bow's window widens it;
 *   4. a special is a special only after a paid swipe: unpaid it rolls as an
 *      ordinary hit (never dropped), a paid one is one special's shape -- the
 *      sword's on each monster once, the volley's three arrows, the big
 *      bolt's orbs -- and two in the air both count; the real road
 *      (ability_use swipe) opens a window, a refused one does not;
 *   5. the lanes are trimmed by last use;
 *   6. `hitproof: false` is all of it as before;
 *   7. the overview's counts. */
import { GameRoom } from '../src/index.js';
import { HIT_PROOF } from '../src/hitproof.js';
import { MOVE_BUDGET } from '../src/movement.js';
import { SPRINT } from '../src/sprint.js';
import { PROG3, prog3StatValue } from '../src/prog3.js';
import { WHEEL_ZONE, WHEEL } from '../src/wheelzone.js';
import { flagNameOk } from '../src/liveops.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

let T = 1_970_000_000_000;
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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

async function setup(flags) {
  const room = new GameRoom(makeState(), mockEnv);
  room._liveFlags = flags || {};
  room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
  room._queuePlayerStateFlush = () => {};
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_hp', name: 'Archer', phrase: 'p-hp', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = room.playerState.bp_hp;
  const sess = room.sessions.get(ws);
  room._prog3AwardXp = () => {};
  return { room, ws, ps, sess };
}

const ZONE = 'meadow';
let mid = 0;
/* a monster `d` px east of the player, in the player's zone, very hard */
function monster(p, d, dy = 0) {
  const { room, ps } = p;
  const z = ps.z;
  const zcfg = room._getZoneConfig(z) || room._getZoneConfig(ZONE);
  const spawn = (zcfg && zcfg.spawns && zcfg.spawns[0]) || { arch: 'fodder' };
  const m = room._makeZoneMonster(z, zcfg, spawn, 'hp-m' + (++mid), ps.x + d, ps.y + dy, 3);
  m.hp = m.maxHp = 1e7; m.alive = true; m.atkCd = T + 1e9;
  if (!room.monsters[z]) room.monsters[z] = [];
  room.monsters[z].push(m);
  return m;
}
function place(p, z, x, y) {
  const { ps } = p;
  ps.z = z; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps.mana = ps.maxMana = 1000;
  delete ps._monHitCad; ps._pveSpec = undefined;
}
function arm(p, kinds) {
  const { ps } = p;
  ps.weapon = kinds.includes('sword') ? { type: 'sword', tierMult: 1 } : null;
  ps.rangedWeapon = kinds.includes('bow') ? { type: 'bow', tierMult: 1 } : null;
  ps.staffWeapon = kinds.includes('staff') ? { type: 'staff', tierMult: 1 } : null;
}
/* the real handler; how much the hit took */
function hit(p, m, payload) {
  const hp0 = m.hp;
  p.room.eventBuffer.length = 0;
  p.room._handleMonsterDamage(p.sess, Object.assign({ monsterId: m.id, zone: p.ps.z }, payload));
  return hp0 - m.hp;
}
const fresh = (p) => { delete p.ps._monHitCad; };

// ── 1. the numbers ──
{
  check('1. HIT_PROOF: a 4.5 s window, three claims, 24 monsters for the sword\'s, four at once',
    HIT_PROOF.SPECIAL_WINDOW_MS === 4500 && HIT_PROOF.SPECIAL_CLAIMS === 3 && HIT_PROOF.MELEE_SPECIAL_MAX === 24 && HIT_PROOF.WINDOWS_MAX === 4);
  const p = await setup();
  place(p, ZONE, 1000, 1000);
  const run = MOVE_BUDGET.SPEED_PX * SPRINT.MULT;
  const ps = p.ps;
  ps.prog3 = ps.prog3 || {};
  ps.prog3.atk = { bow: {}, staff: {}, sword: {} };
  const bow0 = p.room._hitReach(ps, 'ranged', T);
  check('1. a bow with no Range points: 675 + 150 + a second of the fastest honest run (665) = 1,490 px', near(bow0, 675 + 150 + run), bow0);
  ps.prog3.atk.bow = { range: 999 };
  const bowMax = p.room._hitReach(ps, 'ranged', T);
  const rangeMult = 1 + PROG3.ATK.range.max * prog3StatValue(ps, 'range', 'bow', null);
  check('1. ...with the Range stat high, 675 x its reach (up to 1.55) + 150 + 665', near(bowMax, 675 * rangeMult + 150 + run, 1e-6) && rangeMult > 1.5 && rangeMult <= 1.55, { bowMax, rangeMult });
  ps.prog3.atk.staff = {};
  const staff0 = p.room._hitReach(ps, 'staff', T);
  check('1. a staff with no Range points: 675 + 250 + 0.3 s of the run = 1,124.5 px', near(staff0, 675 + 250 + run * 0.3), staff0);
  const savedP3 = ps.prog3;
  ps.prog3 = undefined;
  check('1. an older character\'s bow (its Longshot at most x2.0): 1,350 + 150 + 665', near(p.room._hitReach(ps, 'ranged', T), 1350 + 150 + run));
  ps.prog3 = savedP3; ps.prog3.atk.bow = {};
  ps._buffs = { spd: T + 60000, spdMul: 1.5 };
  check('1. on the Swift Draught the run is half as long again', near(p.room._hitReach(ps, 'ranged', T), 675 + 150 + run * 1.5), p.room._hitReach(ps, 'ranged', T));
  ps._buffs = {};
  check('1. melee has no reach of hitproof\'s (combat.js keeps its 400 px)', p.room._hitReach(ps, 'melee', T) === null);
}

// ── 2. the weapon ──
{
  const p = await setup();
  place(p, ZONE, 1000, 1000);
  arm(p, ['sword']);
  const m = monster(p, 300);
  check('2. a "ranged" claim with no bow does nothing', hit(p, m, { slot: 'ranged' }) === 0);
  check('2. ...nor a "staff" claim with no staff', (fresh(p), hit(p, m, { slot: 'staff' })) === 0);
  arm(p, ['sword', 'bow', 'staff']);
  fresh(p);
  check('2. with a bow in the bow slot the arrow lands', hit(p, m, { slot: 'ranged' }) > 0);
  fresh(p);
  check('2. ...and with a staff the bolt', hit(p, m, { slot: 'staff' }) > 0);
  arm(p, []);
  fresh(p);
  const mm = monster(p, 60);
  check('2. a bare fist still swings (an unarmed player is held in the safe commons until armed)', hit(p, mm, { slot: 'melee' }) > 0);
  check('2. the refusals are counted', p.room._hitProofInfo().noWeapon === 2, p.room._hitProofInfo());
  /* the phone's activeSlot is never asked */
  arm(p, ['sword']);
  p.ps.activeSlot = 'ranged';
  fresh(p);
  check('2. the phone saying it holds the bow buys no arrow (only the worker\'s own bow slot counts)', hit(p, m, { slot: 'ranged' }) === 0);
}

// ── 3. the reach ──
{
  const p = await setup();
  place(p, ZONE, 1000, 1000);
  arm(p, ['bow', 'staff']);
  p.ps.prog3 = p.ps.prog3 || {}; p.ps.prog3.atk = { bow: {}, staff: {}, sword: {} };
  const near1 = monster(p, 1400), far1 = monster(p, 1600);
  check('3. a bow claim from 1,400 px lands (inside 1,490)', hit(p, near1, { slot: 'ranged' }) > 0);
  check('3. ...from 1,600 px it does not, in a zone that had no cap at all', hit(p, far1, { slot: 'ranged' }) === 0);
  const s1 = monster(p, 1000), s2 = monster(p, 1300);
  check('3. a staff bolt from 1,000 px lands (inside 1,124)', hit(p, s1, { slot: 'staff' }) > 0);
  check('3. ...from 1,300 px it does not: a bolt is held to its caster', hit(p, s2, { slot: 'staff' }) === 0);
  check('3. counted as too far', p.room._hitProofInfo().far === 2, p.room._hitProofInfo());

  /* a paid bow special's window: the stuck arrows chip from far away */
  const chip = monster(p, 3000);
  p.room._pveSpecialPaid(p.ps, T);
  fresh(p);
  check('3. inside a paid swipe\'s window a chip from 3,000 px lands (the Wheel\'s old 3,600)', hit(p, chip, { slot: 'ranged', noKb: true }) > 0);
  const beyond = monster(p, 3700);
  check('3. ...but never past 3,600', hit(p, beyond, { slot: 'ranged', noKb: true }) === 0);
  T += HIT_PROOF.SPECIAL_WINDOW_MS + 1;
  fresh(p);
  check('3. ...and the window over, 3,000 px is past the bow again', hit(p, chip, { slot: 'ranged', noKb: true }) === 0);

  /* a staff claim is never widened: its bolt is held to its caster */
  p.room._pveSpecialPaid(p.ps, T);
  fresh(p);
  const sFar = monster(p, 2000);
  check('3. inside a paid window a staff bolt from 2,000 px is still refused (only a bow\'s chips are widened)', hit(p, sFar, { slot: 'staff' }) === 0);
  p.ps._pveSpec = undefined;

  /* only a bow's window widens a bow claim */
  p.room._pveSpecialPaid(p.ps, T);
  const sw = monster(p, 50);
  arm(p, ['sword', 'bow', 'staff']);
  hit(p, sw, { slot: 'melee', special: true });
  fresh(p);
  check('3. a window the sword\'s special took does not widen an arrow\'s reach', hit(p, chip, { slot: 'ranged', noKb: true }) === 0);

  /* the Wheel: the same reach */
  const w = await setup();
  place(w, WHEEL_ZONE, 90000, 90000);
  arm(w, ['bow']);
  w.ps.prog3 = w.ps.prog3 || {}; w.ps.prog3.atk = { bow: {}, staff: {}, sword: {} };
  const wm = monster(w, 2500);
  check('3. in the Wheel a bow claim from 2,500 px is refused (it was inside the old 3,600)', hit(w, wm, { slot: 'ranged' }) === 0);
}

// ── 4. a special only after a paid swipe ──
{
  const p = await setup();
  place(p, ZONE, 1000, 1000);
  arm(p, ['sword', 'bow', 'staff']);
  const m = monster(p, 60);
  /* the ordinary and special numbers on these dice */
  fresh(p);
  const plain = hit(p, m, { slot: 'melee' });
  T += 1000; fresh(p);
  p.room._pveSpecialPaid(p.ps, T);
  const special = hit(p, m, { slot: 'melee', special: true });
  check('4. (guard) a paid sword special hits harder than a plain swing', special > plain && plain > 0, { special, plain });
  T += 5000; fresh(p); p.ps._pveSpec = undefined;
  const unpaid = hit(p, m, { slot: 'melee', special: true });
  check('4. a special nobody paid for rolls as an ORDINARY hit -- not dropped, not a special', unpaid === plain, { unpaid, plain });
  check('4. ...counted', p.room._hitProofInfo().unpaid === 1, p.room._hitProofInfo());
  T += 100;
  check('4. ...and under the ordinary lane: another 100 ms later is dropped (210 ms)', hit(p, m, { slot: 'melee', special: true }) === 0);

  /* the sword's special: each monster in it once */
  T += 5000; fresh(p); p.ps._pveSpec = undefined;
  const ring = [monster(p, 40), monster(p, -40), monster(p, 0, 40)];
  p.room._pveSpecialPaid(p.ps, T);
  const got = ring.map((mm) => hit(p, mm, { slot: 'melee', special: true }));
  check('4. a paid sword special lands as a special on each monster in its ring', got.every((g) => g === special), { got, special });
  T += 300;
  delete p.ps._monHitCad;
  check('4. ...once each: the same monster again in that window is an ordinary hit', hit(p, ring[0], { slot: 'melee', special: true }) === plain);

  /* the volley: three arrows */
  T += 5000; fresh(p); p.ps._pveSpec = undefined;
  const v = monster(p, 500);
  p.room._pveSpecialPaid(p.ps, T);
  const vol = [];
  for (let i = 0; i < 4; i++) { T += 250; vol.push(hit(p, v, { slot: 'ranged', special: true, part: 3 })); }
  fresh(p); T += 1000; p.ps._pveSpec = undefined;
  const arrow = hit(p, v, { slot: 'ranged' });
  check('4. a paid volley\'s three arrows land as its specials, alike', vol[0] > 0 && vol[0] === vol[1] && vol[1] === vol[2], vol);
  check('4. ...and a fourth on the same swipe is an ordinary arrow', vol[3] === arrow, { fourth: vol[3], arrow });

  /* the big bolt: its orbs, and two in the air both count */
  T += 5000; fresh(p); p.ps._pveSpec = undefined;
  const b = monster(p, 500);
  p.room._pveSpecialPaid(p.ps, T);
  T += 1500;
  p.room._pveSpecialPaid(p.ps, T);
  T += 1500;
  const bolt1 = hit(p, b, { slot: 'staff', special: true, orbs: 3 });
  T += 1500; fresh(p);
  const bolt2 = hit(p, b, { slot: 'staff', special: true, orbs: 3 });
  T += 1500; fresh(p);
  const bolt3 = hit(p, b, { slot: 'staff', special: true, orbs: 3 });
  T += 2000; fresh(p); p.ps._pveSpec = undefined;
  const basic = hit(p, b, { slot: 'staff' });
  check('4. two big bolts paid 1.5 s apart, landing 3 s after each swipe: both count (the oldest window with room first)', bolt1 > basic * 2 && bolt2 === bolt1, { bolt1, bolt2, basic });
  check('4. ...and a third with no third swipe is a basic bolt', bolt3 === basic, { bolt3, basic });

  /* one swipe, one big bolt: a second in the same window is a basic bolt */
  T += 5000; fresh(p); p.ps._pveSpec = undefined;
  const b2 = monster(p, 500);
  p.room._pveSpecialPaid(p.ps, T);
  T += 500;
  const one = hit(p, b2, { slot: 'staff', special: true, orbs: 3 });
  T += 600; fresh(p);
  const two = hit(p, b2, { slot: 'staff', special: true, orbs: 3 });
  check('4. one swipe buys one big bolt: a second in its window is a basic bolt', one > basic * 2 && two === basic, { one, two, basic });

  /* a window closes */
  T += 5000; fresh(p); p.ps._pveSpec = undefined;
  const wc = monster(p, 60);
  p.room._pveSpecialPaid(p.ps, T);
  T += HIT_PROOF.SPECIAL_WINDOW_MS + 100;
  check('4. a special 4.6 s after its swipe is past the window: an ordinary hit', hit(p, wc, { slot: 'melee', special: true }) === plain);

  /* an unpaid special shoves as an ordinary hit does -- measured from one
     spot in the middle of the zone, clear of its edges' clamp */
  T += 5000;
  const zc = p.room._getZoneConfig(ZONE);
  const cx = zc.w * p.room.TILE / 2, cy = zc.h * p.room.TILE / 2;
  place(p, ZONE, cx, cy);
  arm(p, ['sword', 'bow', 'staff']);
  const kb = monster(p, 60);
  const shove = (payload, pay) => {
    kb.x = cx + 60; kb.y = cy; kb._kbDebt = 0;
    fresh(p); p.ps._pveSpec = undefined;
    if (pay) p.room._pveSpecialPaid(p.ps, T);
    hit(p, kb, payload);
    return Math.hypot(kb.x - (cx + 60), kb.y - cy);
  };
  T += 1000; const unpaidShove = shove({ slot: 'melee', special: true }, false);
  T += 1000; const plainShove = shove({ slot: 'melee' }, false);
  T += 1000; const paidShove = shove({ slot: 'melee', special: true }, true);
  check('4. an unpaid special shoves the monster as far as an ordinary hit, a paid one further', near(unpaidShove, plainShove, 1e-6) && paidShove > plainShove + 1, { unpaidShove, plainShove, paidShove });

  /* one special's shape a window */
  T += 5000; fresh(p); p.ps._pveSpec = undefined;
  const sh = monster(p, 50);
  p.room._pveSpecialPaid(p.ps, T);
  hit(p, sh, { slot: 'melee', special: true });
  fresh(p); T += 400;
  const shArrow = hit(p, sh, { slot: 'ranged', special: true, part: 3 });
  fresh(p); T += 1000; p.ps._pveSpec = undefined;
  check('4. a window the sword\'s special took buys no volley arrow as well', shArrow === hit(p, sh, { slot: 'ranged' }), shArrow);

  /* four windows at most */
  p.ps._pveSpec = undefined;
  for (let i = 0; i < 6; i++) p.room._pveSpecialPaid(p.ps, T + i);
  check('4. at most four windows at once', p.ps._pveSpec.length === HIT_PROOF.WINDOWS_MAX, p.ps._pveSpec.length);

  /* the real road */
  const q = await setup();
  place(q, ZONE, 1000, 1000);
  q.ps.mana = 1000;
  await q.room.webSocketMessage(q.ws, JSON.stringify({ type: 'ability_use', payload: { type: 'swipe' } }));
  check('4. a charged swipe (ability_use) opens a window', Array.isArray(q.ps._pveSpec) && q.ps._pveSpec.length === 1 && q.ps._pveSpec[0].until === T + HIT_PROOF.SPECIAL_WINDOW_MS, q.ps._pveSpec);
  q.ps._pveSpec = undefined; q.ps.mana = 0;
  await q.room.webSocketMessage(q.ws, JSON.stringify({ type: 'ability_use', payload: { type: 'swipe' } }));
  check('4. ...one refused for want of mana opens none', !q.ps._pveSpec, q.ps._pveSpec);
}

// ── 4b. how many a player lands a second, across every monster ──
{
  const p = await setup();
  place(p, ZONE, 1000, 1000);
  arm(p, ['bow', 'staff', 'sword']);
  p.ps.prog3 = p.ps.prog3 || {}; p.ps.prog3.atk = { bow: {}, staff: {}, sword: {} };
  p.ps.weaponSpecs = undefined;
  const pack = [];
  for (let i = 0; i < 40; i++) pack.push(monster(p, 300, i * 3));
  check('4b. a bow carries 5 hits a second (its quickest shot, 200 ms), 15 may wait', near(p.room._hitRate(p.ps, 'ranged'), 5) && HIT_PROOF.RATE_BURST_S === 3);
  let landed = 0;
  for (const mm of pack) if (hit(p, mm, { slot: 'ranged' }) > 0) landed++;
  check('4b. a script claiming 40 monsters at once lands 15 of them, not 40', landed === 15, landed);
  check('4b. ...the rest counted as past the rate', p.room._hitProofInfo().rate === 25, p.room._hitProofInfo());
  T += 1000;
  landed = 0;
  for (const mm of pack) { delete p.ps._monHitCad; if (hit(p, mm, { slot: 'ranged' }) > 0) landed++; }
  check('4b. ...and a second later, 5 more', landed === 5, landed);

  /* an honest archer at its quickest: every shot lands */
  T += 10000; p.ps._hitBucket = undefined;
  let all = true;
  for (let i = 0; i < 50; i++) { T += 285; delete p.ps._monHitCad; if (!(hit(p, pack[i % 40], { slot: 'ranged' }) > 0)) all = false; }
  check('4b. an honest archer\'s 50 shots at the quickest real pace (285 ms) all land', all);

  /* Piercing: each arrow may hit what it passes through */
  T += 10000; p.ps._hitBucket = undefined;
  p.ps.weaponSpecs = { bow: { piercing: 30 } };
  check('4b. 30 Piercing points: an arrow through 4 monsters, 20 hits a second', near(p.room._hitRate(p.ps, 'ranged'), 20) && p.room._hitPierce(p.ps) === 3);
  all = true;
  for (let i = 0; i < 20; i++) {
    T += 285;
    for (let k = 0; k < 4; k++) { const mm = pack[(i * 4 + k) % 40]; delete p.ps._monHitCad; if (!(hit(p, mm, { slot: 'ranged' }) > 0)) all = false; }
  }
  check('4b. ...every one of a piercing archer\'s arrows lands on all four it passes through', all);
  p.ps.weaponSpecs = undefined;

  /* the staff */
  T += 10000; p.ps._hitBucket = undefined;
  check('4b. a staff carries 2 bolts a second (300 ms slower), 6 may wait', near(p.room._hitRate(p.ps, 'staff'), 2));
  landed = 0;
  for (let i = 0; i < 10; i++) if (hit(p, pack[i], { slot: 'staff' }) > 0) landed++;
  check('4b. ...ten staff claims at once land six', landed === 6, landed);

  /* a paid swipe: room for the chips; a special spends none */
  T += 10000; p.ps._hitBucket = undefined; p.ps._pveSpec = undefined;
  for (let i = 0; i < 15; i++) hit(p, pack[i], { slot: 'ranged' });
  p.room._pveSpecialPaid(p.ps, T);
  landed = 0;
  for (let i = 0; i < 3; i++) { delete p.ps._monHitCad; if (hit(p, pack[20 + i], { slot: 'ranged', special: true, part: 3 }) > 0) landed++; }
  check('4b. with the shots spent, a paid volley\'s three arrows still land (a special spends none)', landed === 3, landed);
  landed = 0;
  for (let k = 0; k < 80; k++) { delete p.ps._monHitCad; if (hit(p, pack[k % 40], { slot: 'ranged', noKb: true }) > 0) landed++; }
  check(`4b. ...and its swipe brought ${HIT_PROOF.CHIP_GRANT} claims for the stuck arrows' chips and its burn`, landed === HIT_PROOF.CHIP_GRANT, landed);

  /* a volley that missed: its burning patch (one arrow of the volley carries
     it, every 0.5 s for 2.5 s) under eight packed monsters, the archer
     shooting a ninth at the quickest real pace (285 ms) -- every claim lands */
  T += 10000; p.ps._hitBucket = undefined; p.ps._pveSpec = undefined; delete p.ps._monHitCad;
  const T0 = T;
  p.room._pveSpecialPaid(p.ps, T0);
  const evs = [];
  for (let k = 1; k <= 5; k++) for (let i = 0; i < 8; i++) evs.push({ at: T0 + 500 * k, m: pack[i] });
  for (let j = 0; T0 + 285 * j <= T0 + 2500; j++) evs.push({ at: T0 + 285 * j, m: pack[8] });
  evs.sort((a, b) => a.at - b.at);
  landed = 0;
  for (const e of evs) { T = e.at; if (hit(p, e.m, { slot: 'ranged' }) > 0) landed++; }
  check(`4b. a volley's burn under eight monsters, the archer at the quickest real pace: all ${evs.length} claims land`, landed === evs.length && evs.length === 49, { landed, of: evs.length });

  /* a paid retreat: its shot */
  T += 10000; p.ps._hitBucket = undefined;
  for (let i = 0; i < 15; i++) hit(p, pack[i], { slot: 'ranged' });
  for (let i = 0; i < 6; i++) hit(p, pack[i], { slot: 'staff' });
  p.room._pveRetreatPaid(p.ps, T);
  delete p.ps._monHitCad;
  const rArrow = hit(p, pack[30], { slot: 'ranged' }) > 0;
  let rBolts = 0;
  for (let i = 0; i < 4; i++) { delete p.ps._monHitCad; if (hit(p, pack[31 + i], { slot: 'staff' }) > 0) rBolts++; }
  check('4b. a paid retreat brings its arrow, or its three bolts', rArrow && rBolts === 3, { rArrow, rBolts });
  /* ...and the real road: ability_use retreat, charged by the worker */
  T += 10000; p.ps._hitBucket = undefined;
  for (let i = 0; i < 15; i++) hit(p, pack[i], { slot: 'ranged' });
  p.ps.stamina = p.ps.maxStamina = 1000;
  await p.room.webSocketMessage(p.ws, JSON.stringify({ type: 'ability_use', payload: { type: 'retreat' } }));
  delete p.ps._monHitCad;
  check('4b. a retreat the worker charged (ability_use) brings its arrow', hit(p, pack[33], { slot: 'ranged' }) > 0);

  /* melee is the lanes' */
  T += 10000;
  const ring = [];
  for (let i = 0; i < 30; i++) ring.push(monster(p, 30, i));
  landed = 0;
  for (const mm of ring) if (hit(p, mm, { slot: 'melee' }) > 0) landed++;
  check('4b. a sword\'s swing through a pack of 30 is not limited by the rate (its ring holds what it holds)', landed === 30, landed);

  /* the switch */
  const k = await setup({ hitproof: false });
  place(k, ZONE, 1000, 1000);
  arm(k, ['bow']);
  const kp = [];
  for (let i = 0; i < 40; i++) kp.push(monster(k, 300, i * 3));
  landed = 0;
  for (const mm of kp) if (hit(k, mm, { slot: 'ranged' }) > 0) landed++;
  check('4b. `hitproof: false`: all 40 land, as before', landed === 40, landed);
}

// ── 5. the lanes by last use ──
{
  const p = await setup();
  place(p, ZONE, 1000, 1000);
  arm(p, ['sword']);
  const many = [];
  for (let i = 0; i < 40; i++) many.push(monster(p, 30, (i % 2 ? 1 : -1) * (i % 7)));
  const hot = many[0];
  hit(p, hot, { slot: 'melee' });
  for (let i = 1; i < 40; i++) {
    T += 5;
    hit(p, many[i], { slot: 'melee' });
    if (i % 5 === 0) { T += 1; hit(p, hot, { slot: 'melee' }); }
  }
  check('5. after a fight across 40 monsters the one being hit all along keeps its lane (trimmed by last use)', p.ps._monHitCad.has(hot.id) && p.ps._monHitCad.size <= 33, { size: p.ps._monHitCad.size });
  /* where it matters: hit at 0, its lane refused-and-touched at 100 ms, then
     a pack hit until the map trims -- at 205 ms it is still inside its 210 */
  const q = await setup();
  place(q, ZONE, 1000, 1000);
  arm(q, ['sword']);
  const others = [];
  for (let i = 0; i < 40; i++) others.push(monster(q, 30, i));
  const hot2 = monster(q, 30, -5);
  const t0 = T;
  hit(q, hot2, { slot: 'melee' });
  for (let i = 0; i < 20; i++) { T = t0 + 1 + i; hit(q, others[i], { slot: 'melee' }); }
  T = t0 + 100; hit(q, hot2, { slot: 'melee' });
  for (let i = 20; i < 40; i++) { T = t0 + 101 + (i - 20); hit(q, others[i], { slot: 'melee' }); }
  T = t0 + 205;
  check('5. a monster hit 205 ms ago keeps its 210 ms lane through a 40-monster fight (by first hit, its lane was wiped and it took a second hit)', hit(q, hot2, { slot: 'melee' }) === 0);
}

// ── 6. the kill switch ──
{
  check('6. `hitproof` is a name the live flags route takes', flagNameOk('hitproof'));
  const p = await setup({ hitproof: false });
  place(p, ZONE, 1000, 1000);
  arm(p, ['sword']);
  const m = monster(p, 2500);
  check('6. `hitproof: false`: a "ranged" claim with no bow lands again, from 2,500 px, in a zone with no cap', hit(p, m, { slot: 'ranged' }) > 0);
  const n = monster(p, 60);
  fresh(p);
  const plain = hit(p, n, { slot: 'melee' });
  T += 1000; fresh(p);
  check('6. ...and a special with no swipe is a special again', hit(p, n, { slot: 'melee', special: true }) > plain);
  const w = await setup({ hitproof: false });
  place(w, WHEEL_ZONE, 90000, 90000);
  arm(w, ['bow']);
  const wm = monster(w, 3500), wf = monster(w, 3700);
  check('6. ...the Wheel\'s old 3,600 px', hit(w, wm, { slot: 'ranged' }) > 0 && hit(w, wf, { slot: 'ranged' }) === 0 && WHEEL.RANGED_MAX === 3600);
}

// ── 7. the overview ──
{
  const p = await setup();
  place(p, ZONE, 1000, 1000);
  arm(p, ['sword']);
  const m = monster(p, 60);
  hit(p, m, { slot: 'ranged' });
  p.room._pveSpecialPaid(p.ps, T);
  fresh(p);
  hit(p, m, { slot: 'melee', special: true });
  const info = p.room._hitProofInfo();
  check('7. the overview counts the refusals and the paid specials', info.on === true && info.noWeapon === 1 && info.paid === 1 && info.unpaid === 0 && info.far === 0, info);
  p.room._liveFlags = { hitproof: false };
  check('7. ...and says when the switch is off', p.room._hitProofInfo().on === false);
}

console.log(failures === 0 ? '\nhit-proof: all checks passed' : `\nhit-proof: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
