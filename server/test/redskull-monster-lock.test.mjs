/* v2.3.4841: A RED SKULL IN A FIGHT WITH A MONSTER HOLDS ITS BAG
 * (nomansland.js _bagLockedByFight; STATE-MACHINES.md "what is left"; the
 * sweep's V21 Q3, #1523).
 *
 * A red skull a monster kills loses all it carries, but the fight lock
 * watched player fights only, so its bag could be sold or traded away in the
 * last seconds and the pile left empty.
 *   1. a red skull hit by a monster in the last 10 s: the bag is locked, and
 *      in No man's land the router's table (fightlock.js) holds too
 *   2. ten seconds later it is open again
 *   3. a player without a red skull is never locked by a monster
 *   4. a real road out of the bag refuses (the item drop: 'fight')
 *   5. `fightlockmonster: false`: as before
 */
import { GameRoom } from '../src/index.js';
import { NML } from '../src/nomansland.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_LONG } from '../src/wheelspawns.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
state._store.set('liveflags', { nmlsteps: false });
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const PID = 'bp_redmon_a';
const ws = fakeWs();
room.sessions.set(ws, baseSession());
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: PID, name: 'R', phrase: 'p-' + PID, ws: [1, 5], protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
const ps = room.playerState[PID];

const TIER = NML.TIER * WHEEL_LONG;
const NML1 = NML.HUB + (NML.FIRST_TIER - 0.5) * TIER;
ps.z = WHEEL_ZONE; ps.x = WHEEL_CENTRE[0] + NML1; ps.y = WHEEL_CENTRE[1];
ps.dead = false; ps.dying = false; ps.disconnected = false; ps.level = 7;
ps.hp = ps.maxHp = 1000; ps._zoneEntryGraceUntil = 0;
ps.inventory = { copper_ore: 5 };
check('0. setup: the player stands in No man\'s land', room._nmlLevelOf(ps) >= 1, room._nmlLevelOf(ps));

/* a monster's blow: the hit door's own stamp (combat.js _applyDamage) */
const monsterHit = () => { room._applyDamage(ps, 1, false); ps.hp = ps.maxHp; };

// ── 1. a red skull hit by a monster ──
room._nmlState(ps).red = NML.SKULL_MS;
monsterHit();
const now = Date.now();
check('1a. a red skull hit by a monster: the bag is locked', room._bagLockedByFight(PID, now));
check('1b. ...and the router\'s table holds in No man\'s land', room._fightLockHolds(PID, 'fightlock', now));

// ── 2. ten seconds later ──
check('2. ten seconds after the last blow the bag is open again', !room._bagLockedByFight(PID, now + 10500));

// ── 3. no red skull ──
room._nmlState(ps).red = 0;
monsterHit();
check('3. a player without a red skull is not locked by a monster', !room._bagLockedByFight(PID));

// ── 4. a real road: the item drop ──
room._nmlState(ps).red = NML.SKULL_MS;
monsterHit();
ws.sent.length = 0;
const r4 = room._handleItemDrop ? await room._handleItemDrop({ id: PID }, { key: 'copper_ore', count: 1 }) : undefined;
const said = JSON.stringify(ws.sent) + JSON.stringify(r4 === undefined ? null : r4);
check('4. a red skull mid-monster-fight cannot drop an item out of the bag (\'fight\')',
  (ps.inventory.copper_ore === 5) && /fight/.test(said), { inv: ps.inventory, said: said.slice(0, 300) });

// ── 5. the switch ──
room._liveFlags = { ...(room._liveFlags || {}), fightlockmonster: false };
monsterHit();
check('5. `fightlockmonster: false`: a monster fight locks nothing, as before', !room._bagLockedByFight(PID));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
