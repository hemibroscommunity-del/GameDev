/* TEST MODE: THE OWNER'S OWN CHARACTERS WITHOUT THE HONESTY CHECKS (v2.3.3430).
 *
 * The owner's option 2 (docs/specs/test-mode.md): a switch in the Test panel,
 * for their own characters, stored per character, a tag on the screen.  What
 * this suite pins:
 *   1. the switch: only the admin key turns it on (POST /dev/testmode), only
 *      for a character who is here, stored as `testmode:<pid>`, told to the
 *      phone (`test_mode`, PRIVILEGED), off for any id; no WebSocket message
 *      reaches it; a join reads it (state_sync `testMode`), a failed read is
 *      off; never on the rpg blob; a character restart takes it away; the
 *      Test panel's list and state; the kill switch `testmode: false`;
 *   2-7. each check it turns off, once each way: refused (or limited) for a
 *      character not in test mode, let through for one in it, refused again
 *      with the kill switch -- moving (the budget, the follow, the reconnect's
 *      judge), harvesting (too early, no start, the perfect rate, the bot's
 *      hour cap and scoring), cooking (the rate, the 900 ms floor, the bot's
 *      cap), a hit on a monster (the weapon, the reach, the lanes), the quest
 *      order, the roll window;
 *   8. and what it leaves on: the tool and level gates and a harvest's reach,
 *      the zone a hit names, a quest nobody can give, a hit on a PLAYER.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { TEST_MODE } from '../src/testmode.js';
import { MOVE_BUDGET } from '../src/movement.js';
import { COOK_PER_MIN } from '../src/cooking.js';
import { HARVEST_PERFECT_PER_MIN } from '../src/gathering.js';
import { BOTFP } from '../src/botfp.js';
import { flagNameOk } from '../src/liveops.js';

let T = 1_990_000_000_000;
Date.now = () => T;

const KEY = 'test-admin-key-test-mode';
function makeState(seed) {
  const store = new Map(Object.entries(seed || {}));
  let puts = 0;
  return {
    store, puts: () => puts,
    failGet: null,
    storage: {
      get: async function (k) {
        if (this._st.failGet && this._st.failGet(k)) throw new Error('read failed');
        return store.get(k);
      },
      put: async (k, v) => { puts++; if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const envWith = (k) => ({ LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ...(k ? { ADMIN_KEY: k } : {}) });
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const adminReq = (path, key, body) => new Request('https://w/api/admin' + path, {
  method: body ? 'POST' : 'GET',
  headers: Object.assign(key ? { Authorization: 'Bearer ' + key } : {}, body ? { 'Content-Type': 'application/json' } : {}),
  body: body ? JSON.stringify(body) : undefined,
});

function room(seed, flags, key) {
  const st = makeState(seed);
  st.storage._st = st;
  const r = new GameRoom(st, envWith(key === undefined ? KEY : key));
  r._liveFlags = flags || {};
  return { r, st };
}
async function join(r, id, data) {
  const ws = fakeWs(id);
  r.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await r.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Tester', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5],
    data: Object.assign({ x: 1000, y: 1000, z: 'meadow' }, data || {}) }));
  if (r.tickInterval) { clearInterval(r.tickInterval); r.tickInterval = null; }
  const ps = r.playerState[id];
  const sess = r.sessions.get(ws);
  const send = (type, payload) => r.webSocketMessage(ws, JSON.stringify({ type, payload }));
  const move = (x, y, extra) => r.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'move', x, y, z: ps.z }, extra || {})));
  return { ws, ps, sess, send, move, id };
}
const setTM = async (r, id, on, key) => {
  const res = await r._adminFetch(adminReq('/dev/testmode', key === undefined ? KEY : key, { playerId: id, on }));
  let j = null; try { j = await res.json(); } catch (e) {}
  return { status: res.status, j };
};
const lastOf = (ws, type) => { for (let i = ws.sent.length - 1; i >= 0; i--) if (ws.sent[i] && ws.sent[i].type === type) return ws.sent[i]; return null; };

// ── 1. the switch ──
{
  check('1. test_mode is a server-only event (PRIVILEGED_EVENTS)', PRIVILEGED_EVENTS.has('test_mode'));
  check('1. the kill switch\'s name is one the live-flags route takes', flagNameOk('testmode'));
  const { r, st } = room();
  const p = await join(r, 'bp_tm1');
  check('1. a character is not in test mode by default', r._testMode(p.ps) === false && p.ps._testMode === false, p.ps._testMode);
  const ss = lastOf(p.ws, 'state_sync');
  check('1. ...and its state_sync says nothing of it', !!ss && !('testMode' in ss && ss.testMode), ss && ss.testMode);

  /* no WebSocket message reaches it */
  const other = await join(r, 'bp_tm1b');
  other.ws.sent.length = 0;
  await p.send('test_mode', { on: true });
  await p.send('dev_testmode', { on: true });
  await r.webSocketMessage(p.ws, JSON.stringify({ type: 'testmode', on: true, playerId: 'bp_tm1' }));
  check('1. a phone saying test_mode / dev_testmode / testmode turns nothing on', p.ps._testMode === false && !st.store.has('testmode:bp_tm1'));
  check('1. ...and its forged test_mode reaches nobody else (a server-only type)', !other.ws.sent.some((m) => m && (m.type === 'test_mode' || (m.payload && m.payload.type === 'test_mode'))),
    other.ws.sent.map((m) => m.type));

  /* the admin key, and only it */
  const wrong = await setTM(r, 'bp_tm1', true, 'nope');
  check('1. a wrong key is 401, nothing written', wrong.status === 401 && !st.store.has('testmode:bp_tm1'), wrong.status);
  const { r: bare } = room(null, null, null);
  const bj = await join(bare, 'bp_tm1');
  const off = await setTM(bare, 'bp_tm1', true, KEY);
  check('1. with no ADMIN_KEY configured the route is a 404, like every admin route', off.status === 404 && bj.ps._testMode === false, off.status);

  p.ws.sent.length = 0;
  const on = await setTM(r, 'bp_tm1', true);
  const rec = st.store.get(TEST_MODE.PREFIX + 'bp_tm1');
  check('1. POST /dev/testmode {on: true} with the key: on', on.status === 200 && on.j.ok === true && on.j.on === true && on.j.online === true, on);
  check('1. ...stored as testmode:<pid> {v, on, at, name}', !!rec && rec.v === TEST_MODE.V && rec.on === true && rec.at === T && rec.name === 'Tester', rec);
  check('1. ...on the live character at once', p.ps._testMode === true && r._testMode(p.ps) === true);
  const told = lastOf(p.ws, 'test_mode');
  check('1. ...and its phone is told (test_mode {on: true})', !!told && told.payload && told.payload.on === true, told);
  const log = st.store.get('admin_log');
  check('1. ...written to the admin log like every dev op', JSON.stringify(log || []).includes('dev/testmode'), log);

  const stateRes = await r._adminFetch(adminReq('/dev/state?id=bp_tm1', KEY));
  const sj = await stateRes.json();
  check('1. the Test panel\'s state says it (testMode, testModeAllowed)', sj.ok === true && sj.testMode === true && sj.testModeAllowed === true, sj);

  /* never on the rpg blob */
  r._saveRpg('bp_tm1', p.ps);
  await new Promise((res) => setTimeout(res, 0));
  const blob = st.store.get('rpg:bp_tm1');
  check('1. never on the rpg blob (rule 1): a save carries no _testMode', !!blob && !('_testMode' in blob) && !JSON.stringify(blob).includes('testMode'), blob && Object.keys(blob));

  const away = await setTM(r, 'bp_nobody', true);
  check('1. ON needs the character here: an id that is not online is refused, nothing written',
    away.status === 404 && away.j && away.j.ok === false && !st.store.has('testmode:bp_nobody'), away);

  /* the list */
  const lr = await r._adminFetch(adminReq('/dev/testmodes', KEY));
  const lj = await lr.json();
  check('1. GET /dev/testmodes lists who has it, named, online', lr.status === 200 && lj.ok && lj.list.length === 1 && lj.list[0].id === 'bp_tm1'
    && lj.list[0].online === true && lj.list[0].name === 'Tester' && lj.allowed === true, lj);

  /* off */
  p.ws.sent.length = 0;
  const offr = await setTM(r, 'bp_tm1', false);
  check('1. {on: false}: off, the record deleted, the phone told', offr.status === 200 && offr.j.on === false && p.ps._testMode === false
    && !st.store.has('testmode:bp_tm1') && lastOf(p.ws, 'test_mode') && lastOf(p.ws, 'test_mode').payload.on === false, offr);
  st.store.set('testmode:bp_gone', { v: 1, on: true, at: T, name: 'Gone' });
  const offAway = await setTM(r, 'bp_gone', false);
  check('1. OFF works for a character who is not here (the record deleted)', offAway.status === 200 && !st.store.has('testmode:bp_gone'), offAway);
  const junk = await setTM(r, 'x'.repeat(200), false);
  check('1. a junk id is refused', junk.status === 404 && junk.j && junk.j.ok === false, junk);
}

// ── 1b. the join reads it ──
{
  const { r, st } = room({ 'testmode:bp_tm2': { v: 1, on: true, at: T - 1000, name: 'Tester' } });
  const p = await join(r, 'bp_tm2');
  const ss = lastOf(p.ws, 'state_sync');
  check('1b. a join reads it: the stored record puts the character in test mode', p.ps._testMode === true && r._testMode(p.ps));
  check('1b. ...and state_sync says testMode: true', !!ss && ss.testMode === true, ss && ss.testMode);
  const { r: r2, st: st2 } = room({ 'testmode:bp_tm3': { v: 1, on: true, at: T } });
  st2.failGet = (k) => k === 'testmode:bp_tm3';
  const q = await join(r2, 'bp_tm3');
  check('1b. a read that fails is OFF (the checks stay on), and the join goes on', !!q.ps && q.ps._testMode === false, q.ps && q.ps._testMode);
  const { r: r3 } = room({ 'testmode:bp_tm4': { v: 1, on: 'yes' } });
  const w = await join(r3, 'bp_tm4');
  check('1b. a record that is not {on: true} is off', w.ps._testMode === false);
  /* the restart */
  await r._resetCharacterData('bp_tm2');
  check('1b. a character restart deletes it (the character starts as a new player would)', !st.store.has('testmode:bp_tm2'));
}

// ── 1c. the kill switch ──
{
  const { r } = room({ 'testmode:bp_tm5': { v: 1, on: true, at: T } }, { testmode: false });
  const p = await join(r, 'bp_tm5');
  const ss = lastOf(p.ws, 'state_sync');
  check('1c. `testmode: false`: the record is read but nothing is skipped', p.ps._testMode === true && r._testMode(p.ps) === false);
  check('1c. ...state_sync says nothing (the phone shows no tag)', !!ss && !ss.testMode, ss && ss.testMode);
  const sr = await r._adminFetch(adminReq('/dev/state?id=bp_tm5', KEY));
  const sj = await sr.json();
  check('1c. ...and the Test panel says it is not allowed', sj.testModeAllowed === false && sj.testMode === true, sj);
  check('1c. the overview counts it', JSON.stringify(r._testModeInfo()) === JSON.stringify({ allowed: false, online: 1 }), r._testModeInfo());
}

// ── 2. moving ──
{
  const FULL = MOVE_BUDGET.SPEED_PX * MOVE_BUDGET.BURST_S + MOVE_BUDGET.SLACK_PX;
  const run = async (flags, on) => {
    const { r } = room(null, flags);
    r._saveRpg = () => {}; r._saveRpgVitals = () => {}; r._saveRpgPools = () => {};
    const p = await join(r, 'bp_mv');
    await p.move(p.ps.x, p.ps.y);
    if (on) await setTM(r, 'bp_mv', true);
    T += 33;
    const x0 = p.ps.x;
    await p.move(x0 + FULL + 3000, p.ps.y);
    return { r, p, moved: p.ps.x - x0 };
  };
  const a = await run(null, false);
  check('2. not in test mode: a jump past the budget is followed, never taken (moved ' + Math.round(a.moved) + ' px)', a.moved < FULL + 1 && a.p.ps._mvFollow, a.moved);
  const b = await run(null, true);
  check('2. in test mode: the same jump is taken where the phone says', near(b.moved, FULL + 3000) && !b.p.ps._mvFollow, b.moved);
  T += 33;
  const x1 = b.p.ps.x;
  await b.p.move(x1 + 9000, b.p.ps.y);
  check('2. ...and the next, and the next: no budget at all', near(b.p.ps.x - x1, 9000), b.p.ps.x - x1);
  const c = await run({ testmode: false }, true);
  check('2. the kill switch puts the budget back', c.moved < FULL + 1, c.moved);

  /* the follow drops for a character put into test mode mid-follow */
  const d = await run(null, false);
  d.p.ps._testMode = true;
  d.r._tickMoveFollow(T + 22);
  check('2. a follow in flight ends when test mode is on (nothing to follow)', !d.p.ps._mvFollow && !(d.r._mvFollowing && d.r._mvFollowing.has('bp_mv')));

  /* turned off: judged again from where the worker has them, a full budget */
  await setTM(b.r, 'bp_mv', false);
  T += 33;
  const x2 = b.p.ps.x;
  await b.p.move(x2 + FULL + 3000, b.p.ps.y);
  check('2. turned off, the next jump is judged again: a full budget, then followed', near(b.p.ps.x - x2, FULL) && !!b.p.ps._mvFollow, b.p.ps.x - x2);

  /* the reconnect's judge (lastplace.js) */
  const rejoin = async (on) => {
    const { r } = room(on ? { 'testmode:bp_lp': { v: 1, on: true, at: T } } : null);
    r._saveRpg = () => {}; r._saveRpgVitals = () => {}; r._saveRpgPools = () => {};
    const p = await join(r, 'bp_lp', { x: 1000, y: 1000 });
    await p.move(1000, 1000);
    T += 33;
    r._placeRemember('bp_lp', p.ps, T);
    delete r.playerState.bp_lp;
    T += 1000;
    const q = await join(r, 'bp_lp', { x: 20000, y: 1000 });
    return q.ps.x;
  };
  const judged = await rejoin(false);
  check('2. a reconnect far from where it left is judged (put ' + Math.round(judged) + ', not 20,000)', judged < 20000 - 1, judged);
  const free = await rejoin(true);
  check('2. ...and in test mode it joins where it says', near(free, 20000), free);
}

// ── 3. harvesting ──
{
  const ZONE = 'meadow';
  const TOOLS = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  const setup = async (on, flags) => {
    const { r } = room(on ? { 'testmode:bp_hv': { v: 1, on: true, at: T } } : null, flags);
    const p = await join(r, 'bp_hv');
    p.ps.z = ZONE; p.ps.inventory = Object.assign({}, TOOLS); p.ps.lifeSkills = {};
    const nodes = r._ensureZoneNodes(ZONE);
    for (const n of nodes) { n.alive = true; n.respawnAt = 0; }
    return { r, p, nodes, tree: nodes.find((n) => n.nodeType === 'tree') };
  };
  const stand = (ps, n) => { ps.x = n.x; ps.y = n.y; };
  const why = (r) => (r._lastStrikeFor('bp_hv') || {}).why;
  const early = async (S) => {
    stand(S.p.ps, S.tree);
    await S.p.send('extraction_start', { nodeId: S.tree.id, zone: ZONE, skill: 'woodcutting', hitSeq: 5 });
    T += 10;
    await S.p.send('node_strike', { id: S.tree.id, zone: ZONE, accuracy: 'good' });
    return why(S.r);
  };
  check('3. not in test mode: a strike 10 ms after its start is refused too-early', (await early(await setup(false))) === 'too-early');
  check('3. in test mode: paid', (await early(await setup(true))) === 'paid');
  check('3. ...and the kill switch refuses it again', (await early(await setup(true, { testmode: false }))) === 'too-early');

  const bare = async (S) => {
    stand(S.p.ps, S.tree);
    await S.p.send('node_strike', { id: S.tree.id, zone: ZONE, accuracy: 'good' });
    const first = why(S.r);
    S.tree.alive = true; S.tree.respawnAt = 0;
    T += 60000;
    await S.p.send('node_strike', { id: S.tree.id, zone: ZONE, accuracy: 'good' });
    return [first, why(S.r)];
  };
  const nb = await bare(await setup(false));
  check('3. not in test mode: a second strike with no start of its own is refused no-start', nb[0] === 'paid' && nb[1] === 'no-start', nb);
  const tb = await bare(await setup(true));
  check('3. in test mode: paid (no start needed)', tb[0] === 'paid' && tb[1] === 'paid', tb);

  /* the perfect rate */
  const rate = async (on) => {
    const S = await setup(on);
    let last = null;
    for (let i = 0; i <= HARVEST_PERFECT_PER_MIN; i++) last = S.r._ratedHarvestAccuracy(S.p.ps, 'perfect');
    return last;
  };
  check(`3. not in test mode: the ${HARVEST_PERFECT_PER_MIN + 1}th perfect in a minute is rated good`, (await rate(false)) === 'good');
  check('3. in test mode: still perfect', (await rate(true)) === 'perfect');

  /* the bot's hour cap and its scoring */
  const cap = async (on) => {
    const S = await setup(on);
    const rec = S.r._botfpRecord('bp_hv', T);
    rec.hour = { hourStart: T, bySkill: { woodcutting: BOTFP.HARVEST_HOUR_CAP } };
    const strikes0 = rec.counters.strikes;
    stand(S.p.ps, S.tree);
    await S.p.send('extraction_start', { nodeId: S.tree.id, zone: ZONE, skill: 'woodcutting', hitSeq: 9 });
    const ex = S.r.extractions.bp_hv;
    T += (ex ? ex.openDelayBase : 0) + 1500;
    await S.p.send('node_strike', { id: S.tree.id, zone: ZONE, accuracy: 'good', swipeFp: { len: 640, ent: 0.42, dur: 1400, n: 48, tv: 120, vc: 0.31, h: 'q' + T } });
    return { why: why(S.r), counted: rec.counters.strikes - strikes0 };
  };
  const cn = await cap(false);
  check(`3. not in test mode: past the bot's ${BOTFP.HARVEST_HOUR_CAP} an hour, the strike is withheld (antibot-cap)`, cn.why === 'antibot-cap', cn);
  const ct = await cap(true);
  check('3. in test mode: paid, and not scored at all (no strike counted)', ct.why === 'paid' && ct.counted === 0, ct);

  /* what stays on */
  const keep = async () => {
    const S = await setup(true);
    S.p.ps.inventory = {};
    stand(S.p.ps, S.tree);
    await S.p.send('node_strike', { id: S.tree.id, zone: ZONE, accuracy: 'good' });
    const noTool = why(S.r);
    S.p.ps.inventory = Object.assign({}, TOOLS);
    S.p.ps.x = S.tree.x + 5000;
    await S.p.send('node_strike', { id: S.tree.id, zone: ZONE, accuracy: 'good' });
    return [noTool, why(S.r)];
  };
  const kp = await keep();
  check('3. in test mode the tool and a harvest\'s reach still hold (no-tool, out-of-range)', kp[0] === 'no-tool' && kp[1] === 'out-of-range', kp);
}

// ── 4. cooking ──
{
  const setup = async (on, flags) => {
    const { r } = room(on ? { 'testmode:bp_ck': { v: 1, on: true, at: T } } : null, flags);
    r._saveRpg = () => {};
    const p = await join(r, 'bp_ck');
    p.ps.inventory = { fish_minnow: 200 };
    p.ps.lifeSkills = {};
    return { r, p };
  };
  const two = async (S) => {
    S.r._handleCookRequest(S.p.sess, { fishKey: 'fish_minnow', kind: 'cooked' });
    T += 100;
    S.r._handleCookRequest(S.p.sess, { fishKey: 'fish_minnow', kind: 'cooked' });
    return 200 - (S.p.ps.inventory.fish_minnow || 0);
  };
  check('4. not in test mode: a second cook 100 ms after the first is dropped (one fish used)', (await two(await setup(false))) === 1);
  check('4. in test mode: both cook', (await two(await setup(true))) === 2);
  check('4. ...the kill switch drops it again', (await two(await setup(true, { testmode: false }))) === 1);
  const rate = async (on) => {
    const S = await setup(on);
    let ok = true;
    for (let i = 0; i <= COOK_PER_MIN; i++) ok = S.r._cookRateOk(S.p.ps);
    return ok;
  };
  check(`4. not in test mode: the ${COOK_PER_MIN + 1}th cook in a minute is refused`, (await rate(false)) === false);
  check('4. in test mode: not', (await rate(true)) === true);
  const capS = await setup(false);
  const capT = await setup(true);
  for (const S of [capS, capT]) {
    const rec = S.r._botfpRecord('bp_ck', T);
    rec.hour = { hourStart: T, bySkill: { cooking: BOTFP.COOK_HOUR_CAP } };
  }
  check('4. not in test mode: past the bot\'s cook cap a cook is dropped', capS.r._botfpOnCook(capS.p.sess, capS.p.ps, {}).drop === true);
  check('4. in test mode: not', capT.r._botfpOnCook(capT.p.sess, capT.p.ps, {}).drop === false);
}

// ── 5. a hit on a monster ──
{
  let mid = 0;
  const setup = async (on, flags) => {
    const { r } = room(on ? { 'testmode:bp_ht': { v: 1, on: true, at: T } } : null, flags);
    r._saveRpg = () => {}; r._saveRpgVitals = () => {}; r._saveRpgPools = () => {};
    r._queuePlayerStateFlush = () => {}; r._prog3AwardXp = () => {};
    const p = await join(r, 'bp_ht');
    p.ps.z = 'meadow'; p.ps.x = 1000; p.ps.y = 1000;
    p.ps.dead = false; p.ps.dying = false; p.ps.disconnected = false;
    return { r, p };
  };
  const monster = (S, d) => {
    const z = S.p.ps.z;
    const zcfg = S.r._getZoneConfig(z);
    const spawn = (zcfg && zcfg.spawns && zcfg.spawns[0]) || { arch: 'fodder' };
    const m = S.r._makeZoneMonster(z, zcfg, spawn, 'tm-m' + (++mid), S.p.ps.x + d, S.p.ps.y, 3);
    m.hp = m.maxHp = 1e7; m.alive = true; m.atkCd = T + 1e9;
    if (!S.r.monsters[z]) S.r.monsters[z] = [];
    S.r.monsters[z].push(m);
    return m;
  };
  const hit = (S, m, payload) => {
    const hp0 = m.hp;
    S.r._handleMonsterDamage(S.p.sess, Object.assign({ monsterId: m.id, zone: S.p.ps.z }, payload));
    return hp0 - m.hp;
  };
  /* a bow claim with no bow in the bow slot */
  const noBow = async (on, flags) => {
    const S = await setup(on, flags);
    S.p.ps.rangedWeapon = null;
    return hit(S, monster(S, 300), { slot: 'ranged' });
  };
  check('5. not in test mode: a bow hit with no bow lands nothing', (await noBow(false)) === 0);
  check('5. in test mode: it lands (the worker\'s own roll)', (await noBow(true)) > 0);
  check('5. ...the kill switch: nothing again', (await noBow(true, { testmode: false })) === 0);
  /* the melee reach */
  const far = async (on) => {
    const S = await setup(on);
    S.p.ps.weapon = { type: 'sword', tierMult: 1 };
    return hit(S, monster(S, 1200), { slot: 'melee' });
  };
  check('5. not in test mode: a sword hit on a monster 1,200 px away lands nothing (400 px)', (await far(false)) === 0);
  check('5. in test mode: it lands', (await far(true)) > 0);
  /* the per-monster lane */
  const lane = async (on) => {
    const S = await setup(on);
    S.p.ps.weapon = { type: 'sword', tierMult: 1 };
    const m = monster(S, 40);
    const a = hit(S, m, { slot: 'melee' });
    T += 50;
    const b = hit(S, m, { slot: 'melee' });
    return [a > 0, b > 0];
  };
  const ln = await lane(false);
  check('5. not in test mode: a second swing 50 ms after the first lands nothing (210 ms lane)', ln[0] && !ln[1], ln);
  const lt = await lane(true);
  check('5. in test mode: both land', lt[0] && lt[1], lt);
  /* the zone a hit names still holds */
  const S = await setup(true);
  S.p.ps.weapon = { type: 'sword', tierMult: 1 };
  const m = monster(S, 40);
  const hp0 = m.hp;
  S.r._handleMonsterDamage(S.p.sess, { monsterId: m.id, zone: 'town', slot: 'melee' });
  check('5. in test mode a hit naming another zone still lands nothing', m.hp === hp0);
}

// ── 6. the quest order ──
{
  const accept = async (on, qid) => {
    const { r } = room(on ? { 'testmode:bp_q': { v: 1, on: true, at: T } } : null);
    r._saveRpg = () => {};
    const p = await join(r, 'bp_q');
    await r._handleQuestAccept(p.sess, { questId: qid });
    return (p.ps._quests || {})[qid];
  };
  check('6. not in test mode: mayor_3 before the first quest is refused', (await accept(false, 'mayor_3')) !== 'active');
  check('6. in test mode: taken', (await accept(true, 'mayor_3')) === 'active');
  const { r } = room({ 'testmode:bp_q2': { v: 1, on: true, at: T } });
  const p = await join(r, 'bp_q2');
  const { QUEST_DORMANT } = await import('../src/data.js');
  const gone = QUEST_DORMANT[0];
  check(`6. in test mode a quest nobody can give is still refused (${gone}: 'gone')`,
    r._testMode(p.ps) && typeof gone === 'string' && r._questBarred(p.ps, gone, { gold: 1 }, true) === 'gone', gone);
}

// ── 7. the roll window ──
{
  const { r } = room();
  const p = await join(r, 'bp_rl');
  p.ps.dodging = true; p.ps._rollUntil = 0;
  check('7. not in test mode: a dodging claim with no paid roll stops no player\'s blow', r._rollOn(p.ps, T) === false);
  p.ps._testMode = true;
  check('7. in test mode: the claim is believed', r._rollOn(p.ps, T) === true);
  r._liveFlags = { testmode: false };
  check('7. ...the kill switch: not', r._rollOn(p.ps, T) === false);
}

// ── 8. a hit on a PLAYER keeps every check ──
{
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../src/pvpbalance.js', import.meta.url), 'utf8')
    + fs.readFileSync(new URL('../src/pvplunge.js', import.meta.url), 'utf8'));
  check('8. nothing between players asks for test mode (pvpbalance.js, pvplunge.js)', !/_testMode/.test(src));
  const all = await import('node:fs').then((fs) => {
    const dir = new URL('../src/', import.meta.url);
    return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).filter((f) => /_testMode\(/.test(fs.readFileSync(new URL(f, dir), 'utf8')));
  });
  const expect = ['botfp.js', 'botsig.js' /* v2.3.3724 */, 'combat.js', 'cooking.js', 'gathering.js', 'join.js', 'lastplace.js', 'movement.js', 'quests.js', 'testmode.js'];
  check('8. the checks that ask are the listed ones, and only those (a new one is said in testmode.js\'s header)',
    JSON.stringify(all.sort()) === JSON.stringify(expect), all);
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nall test-mode checks passed');
