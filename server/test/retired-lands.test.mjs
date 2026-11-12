/* The retired lands are closed -- v2.3.4675 (zonejudge.js R3; spec
 * docs/specs/zone-judge.md "R3").
 *
 * The owner retired the old map on 2026-10-02 and, on 2026-11-11, chose to
 * close it ("Close it").  The worker never had: a phone in today's town could
 * name an old land and farm its monsters for XP, gold, shards and quest
 * credit.  This suite plays the worker as it ships (no patch):
 *
 *   1. THE LIST: the eleven retired ids, every one a zone the worker knows
 *      (so only R3 refuses it), none of the live places; and every zone the
 *      worker knows is either retired or live, on purpose;
 *   2. A JOIN naming a retired land arrives in today's town;
 *   3. A MOVE into one is refused from town, from the Wheel's safe ground and
 *      with every quest that once opened the lands active: nothing written,
 *      no monsters made there, nothing sent, the road counted as 'retired';
 *   4. THE SWITCHES: `zonejudge: false` leaves R3 in force; `retiredlands:
 *      false` opens the lands again, joins and moves alike;
 *   5. A PLAYER ALREADY THERE (a body taken over, a setup) can still walk and
 *      leave: R3 refuses a change INTO a land, never a move within one;
 *   6. THE FIXTURES: the suites that still stand players in an old land open
 *      it for themselves with one marked line; that list only shrinks.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { RETIRED_LANDS } from '../src/zonejudge.js';
import { VALID_ZONE_IDS } from '../src/data.js';
import { flagNameOk } from '../src/liveops.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

let T = 1_900_000_000_000;
Date.now = () => T;

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
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

const room = new GameRoom(makeState(), mockEnv);
room._liveFlags = {};
const WS = {};
async function join(pid, z, x, y) {
  const ws = fakeWs();
  WS[pid] = ws;
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid, phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5], data: { x, y, z } }));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return room.playerState[pid];
}
let baSeq = 0;
/* a move as the phone sends it; a fresh `ba` shows whether it was TAKEN */
async function move(pid, z, x, y) {
  const p = room.playerState[pid];
  const ba = 0.1 + (++baSeq) * 1e-4;
  T += 120;
  await room.webSocketMessage(WS[pid], JSON.stringify({ type: 'move', x: x === undefined ? p.x : x, y: y === undefined ? p.y : y,
    d: 'down', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba, ex: null }));
  return p.ba === ba;
}
const put = (p, z, x, y) => { p.z = z; p.x = x; p.y = y; p.dead = false; p.dying = false; p._zoneEntryGraceUntil = 0; p._mvFollow = undefined; };
const refusedN = (k) => room._zoneJudgeInfo().refused[k] || 0;

/* ── 1. THE LIST ── */
{
  const want = ['meadow', 'frost', 'ember', 'sky', 'verdant', 'hollows', 'thunder', 'tidal', 'mist', 'shadow', 'radiant'];
  check('1. the eleven retired lands', RETIRED_LANDS.size === want.length && want.every((z) => RETIRED_LANDS.has(z)), [...RETIRED_LANDS]);
  check('1. every one is a zone the worker knows (so only R3 refuses it)', [...RETIRED_LANDS].every((z) => VALID_ZONE_IDS.has(z)));
  const LIVE = ['town', 'farm_home', 'worldview', WHEEL_ZONE];
  check('1. none of the live places: today\'s town, the farm, the World View (the Wheel\'s fallback), the Wheel', LIVE.every((z) => !RETIRED_LANDS.has(z)));
  const unplaced = [...VALID_ZONE_IDS].filter((z) => !RETIRED_LANDS.has(z) && !LIVE.includes(z));
  check('1. every zone the worker knows is retired or live (a new one is placed on purpose)', unplaced.length === 0, unplaced);
}

/* ── 2. A JOIN ── */
{
  const p = await join('bp_rl_a', 'meadow', 500, 500);
  check('2. a join naming the meadow arrives in today\'s town', !!p && p.z === 'town', p && p.z);
  const q = await join('bp_rl_b', 'frost', 500, 500);
  check('2. ...and one naming frost', !!q && q.z === 'town', q && q.z);
  const C = room._wheelT().WHEEL_CENTRE;   /* the room's own Wheel, never a table's numbers */
  const w = await join('bp_rl_w', WHEEL_ZONE, C[0], C[1]);
  check('2. a join naming the Wheel is untouched', !!w && w.z === WHEEL_ZONE, w && w.z);
}

/* ── 3. A MOVE ── */
{
  const p = room.playerState.bp_rl_a;
  const x0 = p.x, y0 = p.y;
  const lists0 = Object.keys(room.monsters).length + Object.keys(room.nodes).length;
  WS.bp_rl_a.sent.length = 0;
  const tried = {};
  for (const z of ['meadow', 'frost', 'hollows', 'shadow', 'radiant']) tried[z] = await move('bp_rl_a', z);
  check('3. from today\'s town, every retired land is refused', Object.values(tried).every((ok) => !ok) && p.z === 'town', { tried, z: p.z });
  check('3. ...the player stands where the worker had them', p.x === x0 && p.y === y0);
  check('3. ...no monsters or nodes are made there', Object.keys(room.monsters).length + Object.keys(room.nodes).length === lists0
    && !room.monsters.meadow && !room.monsters.frost);
  check('3. ...nothing is sent for it', !WS.bp_rl_a.sent.some((m) => m && m.type === 'zone_state'), WS.bp_rl_a.sent.map((m) => m.type));
  check('3. ...each counted on the overview as town>retired', refusedN('town>retired') === 5, room._zoneJudgeInfo());
  check('3. ...and the overview says R3 is on', room._zoneJudgeInfo().retiredLands === true);

  const w = room.playerState.bp_rl_w;
  const C = room._wheelT().WHEEL_CENTRE;
  put(w, WHEEL_ZONE, C[0], C[1]);
  check('3. (setup) the Wheel player stands on its safe ground', room._wheelSafeAt(w.x, w.y));
  check('3. from the Wheel\'s safe ground, a retired land is refused too', !(await move('bp_rl_w', 'tidal')) && w.z === WHEEL_ZONE, w.z);
  check('3. ...counted as wheel>retired', refusedN('wheel>retired') === 1);
  check('3. ...while the farm, from the same safe ground, is not', await move('bp_rl_w', 'farm_home') && w.z === 'farm_home', w.z);
}

/* ── 4. THE SWITCHES ── */
{
  const p = room.playerState.bp_rl_a;
  room._liveFlags = { zonejudge: false };
  check('4. `zonejudge: false` leaves R3 in force', !(await move('bp_rl_a', 'meadow')) && p.z === 'town', p.z);
  room._liveFlags = { retiredlands: false };
  check('4. `retiredlands: false` opens them: the move is taken', await move('bp_rl_a', 'meadow') && p.z === 'meadow', p.z);
  check('4. ...and the overview says R3 is off', room._zoneJudgeInfo().retiredLands === false);
  const j = await join('bp_rl_c', 'ember', 500, 500);
  check('4. ...and a join naming one lands there', !!j && j.z === 'ember', j && j.z);
  check('4. `retiredlands` is a name the flags route stores (lower case)', flagNameOk('retiredlands') && room._retiredLandsOn() === false);
  room._liveFlags = {};
}

/* ── 5. A PLAYER ALREADY THERE ── */
{
  const p = room.playerState.bp_rl_b;
  put(p, 'verdant', 600, 600);
  check('5. a player already in a retired land can walk in it (a move, not a change)', await move('bp_rl_b', 'verdant', 640, 600) && p.z === 'verdant' && p.x === 640, { z: p.z, x: p.x });
  check('5. ...and leave it for today\'s town', await move('bp_rl_b', 'town', 640, 600) && p.z === 'town', p.z);
  check('5. ...but not go back', !(await move('bp_rl_b', 'verdant')) && p.z === 'town', p.z);
}

/* ── 6. THE FIXTURES ── */
{
  /* The suites that still stand players in an old land, opening it with
     `GameRoom.prototype._retiredLandsOn = function () { return false; };`
     (v2.3.4675).  THIS LIST ONLY SHRINKS: move a suite to the world
     ('wheel') and take its name off.  A new suite plays the world. */
  const FIXTURES = new Set([
    'anticheat', 'arrowblast', 'burrow', 'combat-lifecycle',
    'gem-weight', 'move-budget', 'props', 'protocol-v2',
    'tick', 'weapon-gem', 'wheelnear', 'wheelzone',
  ]);
  /* v2.3.4923: 17 -> 12 (chainscore, devtools, prog3, quests, ride play the world) */
  const FROZEN = 12;
  const dir = new URL('./', import.meta.url);
  const opening = readdirSync(dir).filter((f) => f.endsWith('.test.mjs'))
    .filter((f) => /GameRoom\.prototype\._retiredLandsOn\s*=/.test(readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')))   /* code, not a comment */
    .map((f) => f.replace(/\.test\.mjs$/, '')).sort();
  const extra = opening.filter((n) => !FIXTURES.has(n));
  const stale = [...FIXTURES].filter((n) => !opening.includes(n));
  check('6. only the listed suites open the old lands (a new suite plays the world)', extra.length === 0, extra);
  check('6. every listed suite still does (take a moved one off)', stale.length === 0, stale);
  check(`6. the list only shrinks (${FIXTURES.size} <= ${FROZEN})`, FIXTURES.size <= FROZEN);
  check('6. this suite opens nothing', !opening.includes('retired-lands'));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
