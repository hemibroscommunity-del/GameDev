/* The chest on a rise pays, once a character -- v2.3.4453 (server/src/risechest.js,
 * docs/specs/rise-chest.md).  The owner, asked where the first public obstacle
 * area goes and what its prize is: "Go recommended" -- the Lagoon Islet, its
 * chest a real prize.
 *
 *   1. the baked table (wheelfaces.js): the long Wheel's two rises, one chest,
 *      on the rise taller than a plain jump clears;
 *   2. the cap: said on the long Wheel, gone under `risechest: false`, gone on
 *      the short Wheel (it has no rises);
 *   3. WHERE: feet at the chest are paid; feet anywhere else are 'far' -- on
 *      the terrace beside the ledge, at the foot of its face, across the
 *      Wheel, in another zone, dead;
 *   4. ONCE: the second ask is 'got', and so is one after the room forgot
 *      everything (the stamp is on file); two asks at once pay once;
 *   5. the switch: `risechest: false` answers 'off' and pays nothing;
 *   6. the wiring: the router's case, PRIVILEGED, the phone's direct switch
 *      and its way out, the cap's gate, the rises laid for everyone.
 */
import fs from 'node:fs';
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_FACES, WHEEL_FACES_LONG } from '../src/wheelfaces.js';
import { RISE_CHEST, riseWithChest, feetAtRiseChest } from '../src/risechest.js';
import { flagNameOk } from '../src/liveops.js';

let T = 1_800_000_000_000;
Date.now = () => T;

function makeState() {
  const store = new Map();
  return {
    store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');

/* the chest's rise, and places by ITS numbers (never a coordinate written here) */
const LEDGE = WHEEL_FACES.find((r) => r.chest);
const TERRACE = WHEEL_FACES.find((r) => !r.chest);
const D = RISE_CHEST.FEET_DY;
const mid = (a, b) => (a + b) / 2;
/* a BODY place whose feet are at (fx, fy) */
const body = (fx, fy) => ({ x: fx, y: fy - D });
const AT_CHEST = body(mid(LEDGE.chest[0], LEDGE.chest[2]), LEDGE.chest[3] + 20);             /* just south of the chest, on the ledge */
const ON_TERRACE_BESIDE = body(LEDGE.box[0] - 12, mid(LEDGE.chest[1], LEDGE.chest[3]));      /* the terrace's strip west of the ledge, level with the chest */
const AT_FACE_FOOT = body(mid(LEDGE.chest[0], LEDGE.chest[2]), LEDGE.face[3] + 12);          /* on the terrace, under the ledge's face */
const LEDGE_FAR_EDGE = body(LEDGE.box[2] - 14, LEDGE.face[1] - 14);                          /* on the ledge, its far corner */

let seq = 0;
async function setup(opts = {}) {
  const st = opts.state || makeState();
  const room = new GameRoom(st, env);
  room._liveFlags = opts.flags || {};
  const id = opts.id || ('bp_rc' + (++seq));
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Climber', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: WHEEL_ZONE } }));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = room.playerState[id];
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  const put = (p, z) => { ps.x = p.x; ps.y = p.y; ps.z = z || WHEEL_ZONE; };
  const open = async (rid) => {
    const n = ws.sent.length;
    await room.webSocketMessage(ws, JSON.stringify({ type: 'rise_chest_open', payload: { id: rid === undefined ? LEDGE.id : rid } }));
    const a = ws.sent.slice(n).filter((m) => m.type === 'rise_chest').map((m) => m.payload);
    return a.length === 1 ? a[0] : a;
  };
  return { room, ws, ps, id, st, sync, put, open };
}

// ── 1. the baked table ──
{
  /* v2.3.4456: the Town Bluff's two follow the islet's two */
  check('1a the long Wheel\'s rises are baked for the worker: the islet\'s two, then the Town Bluff\'s two; a chest on each ledge', WHEEL_FACES_LONG === 5 && WHEEL_FACES.length === 4 && WHEEL_FACES.filter((r) => r.chest).length === 2
    && WHEEL_FACES.map((r) => r.id).join() === 'lagoon-terrace,lagoon-ledge,bluff-terrace,bluff-ledge' && WHEEL_FACES.every((r, i) => r.k === i), WHEEL_FACES.map((r) => r.id));
  /* v2.3.4483: the Town Bluff's terrace has a RAMP where the islet's has vines (one or the other) */
  check('1a2 every ledge with a chest is the taller rise that takes the flip, on a terrace with vines or a ramp', WHEEL_FACES.filter((r) => r.chest).every((r) => r.h > 85 && !r.climb && !r.ramp) && WHEEL_FACES.filter((r) => !r.chest).every((r) => r.h <= 85 && (!!r.climb) !== (!!r.ramp)));
  { const BT = WHEEL_FACES.find((r) => r.id === 'bluff-terrace');
    check('1a3 the Bluff\'s ramp is a strip of its face (the whole band, inside its ends)', !!BT && !!BT.ramp && !BT.climb && BT.ramp[1] === BT.face[1] && BT.ramp[3] === BT.face[3] && BT.ramp[0] > BT.face[0] && BT.ramp[2] < BT.face[2] && BT.ramp[2] - BT.ramp[0] >= 48, BT && BT.ramp); }
  check('1b the chest is on the rise taller than a plain jump clears (85 px): it takes the flip', !!LEDGE && LEDGE.h > 85 && !!TERRACE && TERRACE.h <= 85 && !!TERRACE.climb && !LEDGE.climb, { ledge: LEDGE && LEDGE.h, terrace: TERRACE && TERRACE.h });
  check('1c the chest stands on its rise\'s top, north of its face', LEDGE.chest[0] >= LEDGE.box[0] && LEDGE.chest[2] <= LEDGE.box[2] && LEDGE.chest[1] >= LEDGE.box[1] && LEDGE.chest[3] <= LEDGE.face[1]);
  check('1d every chest has a prize, and a rise with none has none', WHEEL_FACES.every((r) => (!!r.chest) === (RISE_CHEST.COINS[r.id] > 0)) && riseWithChest(LEDGE.id) === LEDGE && riseWithChest(TERRACE.id) === null && riseWithChest('nope') === null && riseWithChest('__proto__') === null);
  const f = (p) => feetAtRiseChest(LEDGE, p.x, p.y + D);
  check('1e feet at the chest are at it; on the terrace beside the ledge, under its face, at its far corner: not', f(AT_CHEST) && !f(ON_TERRACE_BESIDE) && !f(AT_FACE_FOOT) && !f(LEDGE_FAR_EDGE), { beside: f(ON_TERRACE_BESIDE), foot: f(AT_FACE_FOOT), corner: f(LEDGE_FAR_EDGE) });
  check('1f the reach is the phone\'s own (36 px) and a little for the copy being a move behind', RISE_CHEST.REACH_PX === 36 && RISE_CHEST.SLACK_PX > 0 && RISE_CHEST.SLACK_PX <= 40
    && /export const CHEST_REACH = 36;/.test(read('../../src/game/climb.js')));
}

// ── 2. the cap ──
{
  const a = await setup();
  check('2a the worker says `risechest` on the long Wheel', a.sync && a.sync.caps && a.sync.caps.risechest === true && a.room._riseChestOn() === true, a.sync && a.sync.caps && a.sync.caps.risechest);
  const b = await setup({ flags: { risechest: false } });
  check('2b `risechest: false` un-advertises it', b.sync.caps.risechest === false && b.room._riseChestOn() === false);
  const c = await setup({ flags: { wheel5x: false } });
  check('2c the short Wheel has no rises: no cap', c.sync.caps.risechest === false && c.room._riseChestOn() === false);
  check('2d `risechest` is a name POST /flags takes', flagNameOk('risechest'));
  { const was = a.room._liveFlags; a.room._liveFlags = { risechest: false }; const off = a.room._riseChestOff(); a.room._liveFlags = {}; const on = a.room._riseChestOff(); a.room._liveFlags = was;
    check('2e off only when written false', off === true && on === false); }
}

// ── 3. where ──
{
  const a = await setup();
  const c0 = a.ps.coins || 0;
  a.put(ON_TERRACE_BESIDE);
  const beside = await a.open();
  a.put(AT_FACE_FOOT);
  const foot = await a.open();
  a.put(LEDGE_FAR_EDGE);
  const corner = await a.open();
  a.put({ x: 1000, y: 1000 });
  const away = await a.open();
  a.put(AT_CHEST, 'meadow');
  const zone = await a.open();
  a.put(AT_CHEST); a.ps.dead = true;
  const dead = await a.open();
  a.ps.dead = false;
  check('3a not from the terrace beside the ledge, from under its face, from its far corner, or from across the Wheel: "far", and nothing paid',
    [beside, foot, corner, away].every((r) => r && r.ok === false && r.why === 'far') && (a.ps.coins || 0) === c0, { beside, foot, corner, away });
  check('3b not from another zone at the same numbers, and not dead', zone.ok === false && zone.why === 'far' && dead.ok === false && dead.why === 'far' && (a.ps.coins || 0) === c0, { zone, dead });
  const none = await a.open(TERRACE.id), junk = await a.open('__proto__'), blank = await a.open('');
  check('3c a rise with no chest, and an id that is nothing: "none"', none.why === 'none' && junk.why === 'none' && blank.why === 'none' && (a.ps.coins || 0) === c0, { none, junk, blank });
  const got = await a.open();
  check(`3d feet at the chest: paid its ${RISE_CHEST.COINS[LEDGE.id]} coins`, got.ok === true && got.coins === RISE_CHEST.COINS[LEDGE.id] && got.id === LEDGE.id && (a.ps.coins || 0) === c0 + RISE_CHEST.COINS[LEDGE.id], { got, coins: a.ps.coins, c0 });
  check('3e ...stamped under the character and the rise', a.st.store.has('oplog:risechest:' + a.id + ':' + LEDGE.id) || [...a.st.store.keys()].some((k) => k.includes('risechest:' + a.id + ':' + LEDGE.id)), [...a.st.store.keys()].filter((k) => /oplog|risechest/.test(k)).slice(0, 5));

  // ── 4. once ──
  const again = await a.open();
  check('4a the second ask is "got", and pays nothing', again.ok === false && again.why === 'got' && (a.ps.coins || 0) === c0 + RISE_CHEST.COINS[LEDGE.id], again);
  /* the room forgets everything (a deploy): the stamp is on file */
  const b = await setup({ state: a.st, id: a.id });
  b.put(AT_CHEST);
  const cb = b.ps.coins || 0;
  const after = await b.open();
  check('4b after the worker has forgotten everything the same character is still "got"', after.ok === false && after.why === 'got' && (b.ps.coins || 0) === cb, after);
  /* another character is paid its own */
  const c = await setup({ state: a.st });
  c.put(AT_CHEST);
  const cc = c.ps.coins || 0;
  const other = await c.open();
  check('4c another character is paid its own', other.ok === true && (c.ps.coins || 0) === cc + RISE_CHEST.COINS[LEDGE.id], other);
  /* two asks at once */
  const d = await setup();
  d.put(AT_CHEST);
  const cd = d.ps.coins || 0;
  const n0 = d.ws.sent.length;
  await Promise.all([
    d.room.webSocketMessage(d.ws, JSON.stringify({ type: 'rise_chest_open', payload: { id: LEDGE.id } })),
    d.room.webSocketMessage(d.ws, JSON.stringify({ type: 'rise_chest_open', payload: { id: LEDGE.id } })),
  ]);
  const both = d.ws.sent.slice(n0).filter((m) => m.type === 'rise_chest').map((m) => m.payload);
  check('4d two asks at once pay once', both.length === 2 && both.filter((r) => r.ok).length === 1 && both.filter((r) => r.why === 'got').length === 1 && (d.ps.coins || 0) === cd + RISE_CHEST.COINS[LEDGE.id], both);
}

// ── 4b. v2.3.4456: the Town Bluff's chest is its own -- its own prize, its own once ──
{
  const BL = WHEEL_FACES.find((r) => r.id === 'bluff-ledge');
  const AT_BLUFF = body(mid(BL.chest[0], BL.chest[2]), BL.chest[3] + 20);
  const a = await setup();
  const c0 = a.ps.coins || 0;
  a.put(AT_CHEST);
  const wrong = await a.open(BL.id);
  check('4e the Bluff\'s chest is not paid to feet at the islet\'s', wrong.ok === false && wrong.why === 'far' && (a.ps.coins || 0) === c0, wrong);
  a.put(AT_BLUFF);
  const bluff = await a.open(BL.id);
  check(`4f feet at the Bluff's chest are paid its own ${RISE_CHEST.COINS[BL.id]} coins (the small one: it is a minute from the square)`, bluff.ok === true && bluff.coins === RISE_CHEST.COINS[BL.id] && RISE_CHEST.COINS[BL.id] < RISE_CHEST.COINS[LEDGE.id] && (a.ps.coins || 0) === c0 + RISE_CHEST.COINS[BL.id], bluff);
  const again = await a.open(BL.id);
  a.put(AT_CHEST);
  const islet = await a.open(LEDGE.id);
  check('4g once each: the Bluff\'s again is "got", and the islet\'s is still his to have', again.why === 'got' && islet.ok === true && (a.ps.coins || 0) === c0 + RISE_CHEST.COINS[BL.id] + RISE_CHEST.COINS[LEDGE.id], { again, islet });
}

// ── 5. the switch ──
{
  const a = await setup({ flags: { risechest: false } });
  a.put(AT_CHEST);
  const c0 = a.ps.coins || 0;
  const off = await a.open();
  check('5a `risechest: false`: "off", nothing paid, nothing stamped', off.ok === false && off.why === 'off' && (a.ps.coins || 0) === c0 && ![...a.st.store.keys()].some((k) => k.includes('risechest:')), off);
  a.room._liveFlags = {};
  const on = await a.open();
  check('5b switched back on, the same feet are paid', on.ok === true && (a.ps.coins || 0) === c0 + RISE_CHEST.COINS[LEDGE.id], on);
}

// ── 6. the wiring ──
{
  const idx = read('../src/index.js');
  check('6a the router awaits the chest\'s handler; its answer is PRIVILEGED', /case 'rise_chest_open':\s*\n\s*if \(session\.id\) await this\._handleRiseChest\(session, msg\);/.test(idx) && /\n {2}'rise_chest',/.test(idx));
  const wsc = read('../../src/networking/wsClient.js');
  check('6b the phone takes the answer in its direct switch (never a relayed copy) and lets the ask out', /case 'rise_chest':\s*\n\s*\{ if \(msg\.from\) break; try \{ onRiseChest\(S, msg\.payload,/.test(wsc) && /if \(msg\.type === 'rise_chest_open'\) \{\s*\n\s*wsOut\(msg\);/.test(wsc));
  const act = read('../../src/game/climbActions.js');
  check('6c the phone asks only a worker that says `risechest`; else the chest is empty as it was', /const pays = !!\(S\._serverCaps && S\._serverCaps\.risechest === true\);/.test(act) && /if \(!pays\) \{ say\(CHEST_NOTE\);/.test(act));
  check('6d the cap is in the phone\'s registry', /'risechest' \/\*/.test(read('../../src/ui/panels/DevPanel.jsx')));
  check('6e the rises are laid for everyone: off only with climb=0 in the address', /return !\/\(\^\|\[\?&\]\)climb=\(0\|off\|false\)\(&\|\$\)\/\.test\(search \|\| ''\);/.test(read('../../public/tools/world/core/ground-worker.js')));
  check('6f the payment is _creditPlayer\'s one run under an op id of the character and the rise', /opId: 'risechest:' \+ pid \+ ':' \+ r\.id,/.test(read('../src/risechest.js')) && /await this\._creditPlayer\(pid, \{/.test(read('../src/risechest.js')));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
