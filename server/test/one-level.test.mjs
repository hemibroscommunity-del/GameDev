/* ONE LEVEL -- v2.3.3538 (docs/specs/one-level.md, prog3.js header).
 *
 * The owner: "I value SIMPLICITY and INTELLIGIBILITY".  A character's level
 * is the HIGHEST of its three weapon skills, not the three added up.
 *
 *   1. A new character is level 1 with the 250 HP it always had, and the
 *      join advertises caps.onelevel.
 *   2. The level is the best weapon; HP reads it so a one-weapon character's
 *      bar is the sum's to the point at every level, and training more
 *      weapons adds none.
 *   3. Points: each weapon's level-up pays that weapon 3 lane points; only a
 *      rise of the CHARACTER level pays 3 shared (body) points -- so the
 *      per-stat bound (the character level) always has room for every shared
 *      point, spent through the real endpoint.
 *   4. The one-time re-deal at a real join of a stored character: every
 *      placed point back, the pools the new rule's, skills and XP kept,
 *      stamped and saved, never dealt twice.
 *   5. The level others see is the worker's: the join's and every look's
 *      `rpgLv` stamped over the phone's claim, and relayed so.
 *   6. `onelevel: false`: the sum again (a new character 3, shared points a
 *      skill level-up, caps.onelevel false), thrown live through the admin
 *      route with every bar re-sized at once.
 */
import { GameRoom } from '../src/index.js';
import { healthAt } from '../src/oneformula.js';
import { PROG3, prog3XpRequired, prog3RespecPoints, prog3Redeal } from '../src/prog3.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
function makeState(seed) {
  const store = new Map(seed || []);
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const settle = () => new Promise((r) => setTimeout(r, 5));

const state = makeState();
const room = new GameRoom(state, mockEnv);
room._liveFlags = {};
async function join(ws, id, data) {
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, data: data || { x: 0, y: 0, z: 'town' } }));
  await settle();
  return room.sessions.get(ws);
}
const setSkills = (ps, sw, bw, st) => {
  ps.prog3.sk.sword = { level: sw, xp: 0 };
  ps.prog3.sk.bow = { level: bw, xp: 0 };
  ps.prog3.sk.staff = { level: st, xp: 0 };
  room._prog3Recompute(ps);
};
const sumBar = (sw, bw, st) => healthAt(Math.min(300, sw + bw + st), 0, true, false);

// ── 1. a new character ──
const wsA = fakeWs();
const sesA = await join(wsA, 'bp_ol_a');
const A = room.playerState.bp_ol_a;
{
  check('1: a new character is level 1', A.level === 1, A.level);
  check('1: ...with the 250 HP a new character always had', A.maxHp === 250 && A.maxHp === sumBar(1, 1, 1), A.maxHp);
  const sync = wsA.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('1: the join advertises caps.onelevel', !!sync && sync.caps.onelevel === true, sync && sync.caps.onelevel);
  check('1: ...and the level others will see is the worker\'s 1', sesA.data.rpgLv === 1, sesA.data.rpgLv);
}

// ── 2. the level is the best weapon; the bar reads it ──
{
  const off = [];
  for (let L = 1; L <= 100; L++) {
    setSkills(A, L, 1, 1);
    if (A.level !== L || A.maxHp !== sumBar(L, 1, 1)) off.push({ L, level: A.level, max: A.maxHp, sum: sumBar(L, 1, 1) });
  }
  check('2: a one-weapon character is level L with the sum\'s very bar, L 1-100', off.length === 0, off.slice(0, 3));
  setSkills(A, 10, 10, 10);
  check('2: 10/10/10 is level 10 with level 10\'s bar (700; the sum gave level 30 and 1,600)',
    A.level === 10 && A.maxHp === 700, { level: A.level, max: A.maxHp });
  setSkills(A, 3, 24, 7);
  check('2: the level is the BEST weapon, whichever it is (bow 24)', A.level === 24 && room._prog3OpponentLevel(A) === 24, A.level);
  setSkills(A, 1, 1, 1);
}

// ── 3. points: the lane pays its weapon, the character level pays the body ──
{
  const p3 = A.prog3;
  p3.pool = 0; p3.poolBy = { sword: 0, bow: 0, staff: 0 }; p3.shared = 0;
  room._prog3AwardXp('bp_ol_a', A, 'sword', prog3XpRequired(1), { flat: true });
  check('3: sword 1 -> 2 raises the level to 2: 3 sword points AND 3 shared',
    A.level === 2 && p3.poolBy.sword === 3 && p3.shared === 3, { level: A.level, poolBy: p3.poolBy, shared: p3.shared });
  wsA.sent.length = 0;
  room._prog3AwardXp('bp_ol_a', A, 'bow', prog3XpRequired(1), { flat: true });
  const lv = wsA.sent.filter((m) => m.type === 'prog3_level').pop();
  check('3: bow 1 -> 2 (not above your best) pays 3 bow points and NO shared ones',
    A.level === 2 && p3.poolBy.bow === 3 && p3.shared === 3, { level: A.level, poolBy: p3.poolBy, shared: p3.shared });
  check('3: ...and still says so (prog3_level, the character level unchanged) and refills the bars',
    !!lv && lv.payload.skill === 'bow' && lv.payload.level === 2 && lv.payload.charLevel === 2 && A.hp === A.maxHp, lv && lv.payload);
  room._prog3AwardXp('bp_ol_a', A, 'bow', prog3XpRequired(2), { flat: true });
  check('3: bow 2 -> 3 passes the sword: level 3, 3 bow points and 3 shared', A.level === 3 && p3.poolBy.bow === 6 && p3.shared === 6,
    { level: A.level, poolBy: p3.poolBy, shared: p3.shared });
  /* many levels at once (a quest's big flat award): shared by the rise */
  let need = 0; for (let l = 2; l < 7; l++) need += prog3XpRequired(l);
  room._prog3AwardXp('bp_ol_a', A, 'sword', need, { flat: true });
  check('3: one award taking the sword 2 -> 7 pays 15 sword points and shared for the level\'s rise, 3 -> 7: 12',
    A.prog3.sk.sword.level === 7 && A.level === 7 && p3.poolBy.sword === 18 && p3.shared === 18, { level: A.level, poolBy: p3.poolBy, shared: p3.shared });

  /* every shared point fits under the per-stat bound, spent through the real
     endpoint, for builds that trained one, two or three weapons */
  const BODY = Object.keys(PROG3.BODY);
  const stranded = [];
  for (const [sw, bw, st] of [[10, 10, 10], [20, 20, 20], [40, 40, 40], [30, 1, 1], [5, 25, 12], [100, 100, 100]]) {
    setSkills(A, sw, bw, st);
    prog3RespecPoints(A.prog3, false);
    room._prog3Recompute(A);
    let guard = 0;
    while (A.prog3.shared > 0 && guard++ < 5000) {
      const before = A.prog3.shared;
      for (const stat of BODY) { if (A.prog3.shared > 0) room._handleProg3Allocate(sesA, { stat }); }
      if (A.prog3.shared === before) break;
    }
    if (A.prog3.shared !== 0) stranded.push({ build: [sw, bw, st], left: A.prog3.shared, level: A.level });
  }
  check('3: every shared point can be spent (the per-stat bound has room) -- 10/10/10, 20/20/20, 40/40/40, 30/1/1, 5/25/12, 100/100/100',
    stranded.length === 0, stranded);
  setSkills(A, 1, 1, 1);
  prog3RespecPoints(A.prog3, false);
  room._prog3Recompute(A);
}

// ── 4. the re-deal, at a real join of a stored character ──
{
  const id = 'bp_ol_old';
  await state.storage.put('rpg:' + id, {
    _v: 17, coins: 321, level: 18, xp: 0, inventory: { wood_pine: 4 }, lifeSkills: {},
    prog3: {
      sk: { sword: { level: 12, xp: 90 }, bow: { level: 4, xp: 3 }, staff: { level: 2, xp: 0 } },
      alloc: { def: 12, hp: 9, dodge: 5, stam: 1, eres: 0, mana: 2, move: 4 },
      atk: { sword: { range: 2, luck: 6, aspd: 4, dmg: 14, elem: 0, special: 3 }, bow: { range: 0, luck: 2, aspd: 0, dmg: 3, elem: 0, special: 0 }, staff: { range: 0, luck: 0, aspd: 0, dmg: 3, elem: 0, special: 0 } },
      pool: 0, poolBy: { sword: 0, bow: 0, staff: 0 }, shared: 18, ms: 0, ppl: 3, spl: 3,
    },
  });
  const ws = fakeWs();
  await join(ws, id);
  const P = room.playerState[id];
  const p3 = P && P.prog3;
  check('4: the stored character joins (guard)', !!p3, !!P);
  check('4: every placed point is handed back', !!p3 && Object.values(p3.alloc).every((v) => v === 0)
    && PROG3.SKILLS.every((c) => Object.values(p3.atk[c]).every((v) => v === 0)), p3 && { alloc: p3.alloc, atk: p3.atk });
  check('4: the lane pools are 3 a level of their skill past 1 (33 / 9 / 3), the shared pool 3 a character level past 1 (33)',
    !!p3 && p3.poolBy.sword === 33 && p3.poolBy.bow === 9 && p3.poolBy.staff === 3 && p3.pool === 45 && p3.shared === 33,
    p3 && { pool: p3.pool, poolBy: p3.poolBy, shared: p3.shared });
  check('4: skills, XP, gold and the bag kept; the level 12 (it was 18, the sum)',
    !!p3 && p3.sk.sword.level === 12 && p3.sk.sword.xp === 90 && p3.sk.bow.xp === 3 && P.coins === 321 && P.inventory.wood_pine === 4 && P.level === 12,
    p3 && { sk: p3.sk, coins: P.coins, level: P.level });
  const saved = state._store.get('rpg:' + id);
  check('4: the deal is saved, stamped, at the new schema', !!saved && saved.prog3.olr === 1 && saved._v >= 18 && saved.prog3.shared === 33, saved && { olr: saved.prog3.olr, v: saved._v });
  /* spend, leave, come back: never dealt again */
  room._handleProg3Allocate(room.sessions.get(ws), { stat: 'def' });
  room._handleProg3Allocate(room.sessions.get(ws), { stat: 'def' });
  room._saveRpg(id, P);
  await room.webSocketClose(ws); room.sessions.delete(ws);
  delete room.playerState[id];
  const ws2 = fakeWs();
  await join(ws2, id);
  const P2 = room.playerState[id];
  check('4: back again, the points spent since stay spent (dealt once)', !!P2 && P2.prog3.alloc.def === 2 && P2.prog3.shared === 31,
    P2 && { def: P2.prog3.alloc.def, shared: P2.prog3.shared });
  check('4: prog3Redeal on a stamped blob does nothing', prog3Redeal(P2.prog3) === false && P2.prog3.alloc.def === 2);
  await room.webSocketClose(ws2); room.sessions.delete(ws2);
}

// ── 5. the level others see is the worker's ──
{
  setSkills(A, 9, 2, 1);
  const wsB = fakeWs();
  await join(wsB, 'bp_ol_b');
  wsB.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'track', data: { name: 'bp_ol_a', rpgLv: 99, x: 0, y: 0 } }));
  await settle();
  check('5: a look claiming level 99 is stamped with the worker\'s 9', sesA.data.rpgLv === 9, sesA.data.rpgLv);
  const rel = wsB.sent.filter((m) => m.type === 'player_update' && m.id === 'bp_ol_a').pop();
  check('5: ...and relayed to the others as 9', !!rel && rel.data && rel.data.rpgLv === 9, rel && rel.data);
  const ws3 = fakeWs();
  const ses3 = await join(ws3, 'bp_ol_c', { x: 0, y: 0, z: 'town', rpgLv: 77 });
  check('5: a join claiming level 77 shows the worker\'s 1', ses3.data.rpgLv === 1, ses3.data.rpgLv);
  setSkills(A, 1, 1, 1);
}

// ── 6. the kill switch ──
{
  setSkills(A, 20, 20, 20);
  A.hp = Math.round(A.maxHp * 0.5);
  const json = (o) => o;
  await room._liveopsRoutes({ method: 'POST', json: async () => ({ name: 'onelevel', value: false }) }, new URL('http://x/admin/flags'), '/flags', json);
  check('6: onelevel false through the admin route: the three added up again (60), its bar at once',
    A.level === 60 && A.maxHp === healthAt(60, 0, true, false), { level: A.level, max: A.maxHp });
  check('6: ...as full as it was (50%)', Math.abs(A.hp / A.maxHp - 0.5) < 0.02, { hp: A.hp, max: A.maxHp });
  const p3 = A.prog3;
  const sh0 = p3.shared;
  room._prog3AwardXp('bp_ol_a', A, 'bow', prog3XpRequired(20), { flat: true });
  check('6: ...and a skill below the best pays shared points again (every skill level-up is a level under the sum)',
    A.level === 61 && p3.shared === sh0 + 3, { level: A.level, shared: [sh0, p3.shared] });
  const ws4 = fakeWs();
  await join(ws4, 'bp_ol_d');
  const D = room.playerState.bp_ol_d;
  const sync = ws4.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('6: a new character is 3 again, caps.onelevel false', D.level === 3 && !!sync && sync.caps.onelevel === false,
    { level: D.level, cap: sync && sync.caps.onelevel });
  await room._liveopsRoutes({ method: 'DELETE', json: async () => ({}) }, new URL('http://x/admin/flags?name=onelevel'), '/flags', json);
  check('6: switched back: the best weapon again (the bow, 21 since) and its bar', A.level === 21 && A.maxHp === healthAt(21, 0, true, true), { level: A.level, max: A.maxHp });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
