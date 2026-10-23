/* v2.3.3578: NO CAP ON HOW MANY POINTS A STAT HOLDS (server/src/statcap.js).
 *
 * The owner: "Remove stat cap."  A stat took at most your character level in
 * points (twice it on Power, Luck, Special and Element); now it takes every
 * point you have for it, up to the 999 storage bound, and the three pools' old
 * 100 is gone too.  `nostatcap: false` in the live flags brings both back,
 * exactly as they were.
 *
 *   1. the table: every row's bound is the 999 storage bound, on both sides;
 *      the pools' old 100 is kept, on both sides, for the switch
 *   2. no cap: past your level on Max HP, Dodge and Power, past 100 on a pool,
 *      still not past 999; a point is still needed, and still its lane's
 *   3. `nostatcap: false`: the bound exactly as before (one level and the sum)
 *   4. a point already placed stays when the switch is thrown
 *   5. caps.nostatcap at the join, and off with the switch
 *   6. the phone's prog3StatCap greys [+] exactly where the worker refuses;
 *      the Max HP row says what a point is worth on the connected worker
 *   7. the wiring
 */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { PROG3, prog3FreshAtk, ONE_LEVEL_REDEAL } from '../src/prog3.js';
import { STAT_CAP } from '../src/statcap.js';
import { healthAt } from '../src/oneformula.js';
import {
  PROG3 as CLIENT_PROG3, STAT_CAP_WAS, setProg3Enabled, setProg3RelEnabled, setStatCapFree,
  isStatCapFree, prog3StatCap, prog3BodyMeta,
} from '../../src/data/prog3.js';
import { setOneLevelEnabled, setOneFormulaEnabled } from '../../src/data/oneFormula.js';

const mockState = {
  storage: {
    get: async () => undefined,
    put: async () => {},
    list: async () => new Map(),
    delete: async () => {},
  },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

/* a character whose best skill is `lvl` (one level), with `shared` shared and
   `lane` sword-lane points to spend */
function player(room, id, lvl, { shared = 0, lane = 0, alloc = {}, atk = null, bow = 1, staff = 1 } = {}) {
  room.playerState[id] = {
    prog3: {
      sk: { sword: { level: lvl, xp: 0 }, bow: { level: bow, xp: 0 }, staff: { level: staff, xp: 0 } },
      alloc: { def: 0, hp: 0, dodge: 0, stam: 0, eres: 0, mana: 0, move: 0, ...alloc },
      atk: atk || prog3FreshAtk(),
      pool: lane, poolBy: { sword: lane, bow: 0, staff: 0 }, shared, ppl: 3, spl: 3,
    },
  };
  const ps = room.playerState[id];
  room._prog3Recompute(ps);
  return ps;
}
const spend = (room, id, stat, cat, n = 1) => {
  for (let i = 0; i < n; i++) room._handleProg3Allocate({ id }, cat ? { stat, cat } : { stat });
};

// ── 1. The table ──
{
  const rows = { ...PROG3.BODY, ...PROG3.ATK };
  check('1a. every stat row\'s bound is the 999 storage bound on the worker (the pools\' 100 lifted)',
    Object.values(rows).every((d) => d.cap === 999), Object.fromEntries(Object.entries(rows).map(([k, d]) => [k, d.cap])));
  const crow = { ...CLIENT_PROG3.BODY, ...CLIENT_PROG3.ATK };
  check('1b. ...and on the phone\'s copy, row for row',
    Object.keys(rows).every((k) => crow[k] && crow[k].cap === rows[k].cap), Object.fromEntries(Object.entries(crow).map(([k, d]) => [k, d.cap])));
  check('1c. the pools\' old 100 is kept for the switch, the same on both sides',
    JSON.stringify(STAT_CAP.WAS) === JSON.stringify({ hp: 100, stam: 100, mana: 100 })
      && JSON.stringify(STAT_CAP_WAS) === JSON.stringify(STAT_CAP.WAS), { srv: STAT_CAP.WAS, cli: STAT_CAP_WAS });
  check('1d. the switch is lower case (a live flag name, liveops FLAG_NAME_RE)', /^[a-z0-9_]+$/.test(STAT_CAP.FLAG), STAT_CAP.FLAG);
}

// ── 2. No cap ──
{
  const room = new GameRoom(mockState, mockEnv);
  const a = player(room, 'a', 2, { shared: 20 });
  spend(room, 'a', 'hp', null, 5);
  check('2a. a level-2 character puts 5 points in Max HP (the bound was 2)',
    a.prog3.alloc.hp === 5 && a.prog3.shared === 15, { hp: a.prog3.alloc.hp, shared: a.prog3.shared });
  check('2b. ...and the bar grows by all five (40 a point under the one formula)',
    a.maxHp === healthAt(a.level, 5, true, true), { maxHp: a.maxHp, want: healthAt(a.level, 5, true, true) });
  spend(room, 'a', 'dodge', null, 15);
  check('2c. ...and all of the rest in Dodge, 15 at level 2 (1 x level was the bound)',
    a.prog3.alloc.dodge === 15 && a.prog3.shared === 0, { dodge: a.prog3.alloc.dodge, shared: a.prog3.shared });
  spend(room, 'a', 'dodge');
  check('2d. with no shared point left the next is refused (a point is still needed)',
    a.prog3.alloc.dodge === 15, a.prog3.alloc.dodge);
  check('2e. Dodge 15 is still the curve\'s: under 90 %, and Dodge with Defense never under the 10 % floor (combat.js)',
    room._prog3DodgePct(a, a.level) < 0.9, room._prog3DodgePct(a, a.level));

  const b = player(room, 'b', 10, { lane: 40 });
  spend(room, 'b', 'dmg', 'sword', 30);
  check('2f. Power past twice your level: 30 at level 10 (the bound was 20)',
    b.prog3.atk.sword.dmg === 30 && b.prog3.poolBy.sword === 10, { dmg: b.prog3.atk.sword.dmg, lane: b.prog3.poolBy.sword });
  spend(room, 'b', 'luck', 'bow');
  check('2g. a sword-lane point still cannot buy bow Luck', b.prog3.atk.bow.luck === 0 && b.prog3.poolBy.sword === 10, b.prog3.atk.bow);
  spend(room, 'b', 'luck');
  check('2h. an offense stat still needs its lane named', b.prog3.atk.sword.luck === 0 && b.prog3.pool === 10, b.prog3.atk.sword);

  const c = player(room, 'c', 100, { shared: 400, alloc: { hp: 100, stam: 100, mana: 100 } });
  spend(room, 'c', 'hp'); spend(room, 'c', 'stam'); spend(room, 'c', 'mana');
  check('2i. the pools take a 101st point (their old hard 100 is lifted)',
    c.prog3.alloc.hp === 101 && c.prog3.alloc.stam === 101 && c.prog3.alloc.mana === 101 && c.prog3.shared === 397, c.prog3.alloc);
  check('2j. ...and it counts: the bar, the stamina and the mana pools grow with it',
    c.maxHp === healthAt(c.level, 101, true, true)
      && c.maxStamina === Math.floor(100 + 101 * PROG3.BODY.stam.per),
    { maxHp: c.maxHp, maxStamina: c.maxStamina, maxMana: c.maxMana });
  c.prog3.alloc.dodge = 999;
  spend(room, 'c', 'dodge');
  check('2k. the 999 storage bound still refuses the 1,000th point', c.prog3.alloc.dodge === 999 && c.prog3.shared === 397, c.prog3.alloc.dodge);
  spend(room, 'c', '__proto__'); spend(room, 'c', 'coins');
  check('2l. an unknown stat is still refused', c.prog3.shared === 397, c.prog3.shared);
  const acks = [];
  check('2m. the bound is the worker\'s own (_prog3StatBound): 999 for every stat at any level',
    ['hp', 'dodge', 'def', 'eres', 'mana', 'stam', 'move'].every((k) => room._prog3StatBound(a, k, PROG3.BODY[k]) === 999)
      && ['dmg', 'luck', 'special', 'elem', 'range', 'aspd'].every((k) => room._prog3StatBound(a, k, PROG3.ATK[k]) === 999), acks);
}

// ── 3. The switch: the bound exactly as it was ──
{
  const room = new GameRoom(mockState, mockEnv);
  room._liveFlags = { nostatcap: false };
  const a = player(room, 'a', 2, { shared: 20 });
  spend(room, 'a', 'hp', null, 5);
  check('3a. `nostatcap: false`: Max HP stops at 2 at level 2, as before', a.prog3.alloc.hp === 2 && a.prog3.shared === 18, a.prog3.alloc);
  const b = player(room, 'b', 10, { shared: 50, lane: 50, alloc: { dodge: 10 } });
  spend(room, 'b', 'dodge');
  check('3b. ...an 11th Dodge point at level 10 is refused (1 x level)', b.prog3.alloc.dodge === 10, b.prog3.alloc.dodge);
  b.prog3.atk.sword.dmg = 19;
  spend(room, 'b', 'dmg', 'sword', 3);
  check('3c. ...Power to 20 and no further (2 x level on the damage stats)', b.prog3.atk.sword.dmg === 20, b.prog3.atk.sword.dmg);
  const c = player(room, 'c', 100, { shared: 50, alloc: { hp: 99 } });
  spend(room, 'c', 'hp', null, 3);
  check('3d. ...the 100th Max HP point at level 100 lands and the 101st does not', c.prog3.alloc.hp === 100 && c.prog3.shared === 49, c.prog3.alloc.hp);

  /* the sum (`onelevel: false`) lets a character level reach 300: the pools'
     old hard 100 still binds there, as it did, while Dodge takes its 300 */
  room._liveFlags = { nostatcap: false, onelevel: false };
  const d = player(room, 'd', 100, { bow: 100, staff: 100, shared: 50, alloc: { hp: 100, dodge: 150 } });
  check('3e. (the sum: three skills at 100 make character level 300)', d.level === 300, d.level);
  spend(room, 'd', 'hp'); spend(room, 'd', 'dodge');
  check('3f. ...the pools still stop at their old 100 there, and Dodge at the level (151 lands)',
    d.prog3.alloc.hp === 100 && d.prog3.alloc.dodge === 151, d.prog3.alloc);
  check('3g. ...the bound read the old way for every stat: min(old cap, level x lvlBound)',
    ['hp', 'stam', 'mana'].every((k) => room._prog3StatBound(d, k, PROG3.BODY[k]) === 100)
      && ['def', 'dodge', 'eres', 'move'].every((k) => room._prog3StatBound(d, k, PROG3.BODY[k]) === 300)
      && ['dmg', 'luck', 'special', 'elem'].every((k) => room._prog3StatBound(d, k, PROG3.ATK[k]) === 600)
      && ['range', 'aspd'].every((k) => room._prog3StatBound(d, k, PROG3.ATK[k]) === 300));
  room._liveFlags = { nostatcap: true };
  check('3h. `nostatcap: true` (or no flag) is no cap', room._statCapFree() && room._prog3StatBound(a, 'hp', PROG3.BODY.hp) === 999);
  room._liveFlags = null;
  check('3i. ...and no live flags at all is no cap', room._statCapFree());
}

// ── 4. A point already placed stays ──
{
  const room = new GameRoom(mockState, mockEnv);
  const a = player(room, 'a', 10, { shared: 40 });
  spend(room, 'a', 'dodge', null, 30);
  room._liveFlags = { nostatcap: false };
  room._prog3Recompute(a);
  check('4a. 30 Dodge placed at level 10, then the switch thrown: all 30 stay',
    a.prog3.alloc.dodge === 30 && room._prog3Pts(a, 'dodge') === 30, a.prog3.alloc.dodge);
  spend(room, 'a', 'dodge');
  check('4b. ...and the next is refused until the switch is put back', a.prog3.alloc.dodge === 30 && a.prog3.shared === 10, a.prog3.alloc.dodge);
  room._liveFlags = {};
  spend(room, 'a', 'dodge');
  check('4c. ...put back, it is taken', a.prog3.alloc.dodge === 31 && a.prog3.shared === 9, a.prog3.alloc.dodge);
  const san = room._sanitizeProg3({ sk: { sword: { level: 50 }, bow: { level: 1 }, staff: { level: 1 } },
    alloc: { hp: 250, stam: 250, mana: 250, dodge: 5000 }, atk: prog3FreshAtk(), olr: ONE_LEVEL_REDEAL });   /* olr: already re-dealt (v2.3.3538), so the sanitizer keeps what is placed */
  check('4d. a stored pool past 100 is read whole at the join (999 the bound)',
    san.alloc.hp === 250 && san.alloc.stam === 250 && san.alloc.mana === 250 && san.alloc.dodge === 999, san.alloc);
}

// ── 5. caps.nostatcap ──
{
  const join = async (flags) => {
    const room = new GameRoom(mockState, mockEnv);
    if (flags) room._liveFlags = flags;
    const ws = fakeWs('j');
    room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'pj', name: 'Spender', protocolVersion: 2, data: { x: -100000, y: -100000, z: 'meadow' } }));
    const sync = msgsOfType(ws, 'state_sync')[0];
    return sync && sync.payload ? sync.payload.caps : (sync && sync.caps);
  };
  const on = await join(null);
  check('5a. the join advertises caps.nostatcap', !!on && on.nostatcap === true, on && on.nostatcap);
  const off = await join({ nostatcap: false });
  check('5b. ...and `nostatcap: false` un-advertises it', !!off && off.nostatcap === false, off && off.nostatcap);
}

// ── 6. The phone greys [+] where the worker refuses ──
{
  const room = new GameRoom(mockState, mockEnv);
  setProg3Enabled(true); setProg3RelEnabled(true); setOneLevelEnabled(true);
  const lv = [2, 10, 100];
  const stats = [...Object.keys(PROG3.BODY).map((k) => [k, PROG3.BODY[k]]), ...Object.keys(PROG3.ATK).map((k) => [k, PROG3.ATK[k]])];
  const agree = (label) => {
    const bad = [];
    for (const L of lv) {
      const ps = player(room, 'm' + L, L);
      const rpg = { prog3: ps.prog3 };
      for (const [k, def] of stats) {
        const srv = room._prog3StatBound(ps, k, def), cli = prog3StatCap(rpg, k);
        if (srv !== cli) bad.push({ L, k, srv, cli });
      }
    }
    check(label, bad.length === 0, bad.slice(0, 6));
  };
  setStatCapFree(true);
  check('6a. against caps.nostatcap the phone knows (isStatCapFree)', isStatCapFree() === true);
  agree('6b. ...and its [+] bound is the worker\'s for every stat at levels 2, 10 and 100 (999)');
  setStatCapFree(false);
  room._liveFlags = { nostatcap: false };
  agree('6c. against a worker without it, the phone\'s bound is that worker\'s: level, twice it on the damage stats, 100 on the pools');
  setProg3RelEnabled(false); setStatCapFree(true);
  check('6d. caps.nostatcap means nothing to the phone against a linear (pre-curve) worker', isStatCapFree() === false);
  setProg3RelEnabled(true); setStatCapFree(false);
}

// ── 6e. What a Max HP point is worth, said as the worker pays it ──
{
  /* the row said "+8 max HP" since v2.3.3260 while each point gave 40 under
     the one formula (the bar and the window's before/after both grew 40) */
  setOneFormulaEnabled(true);
  const on = prog3BodyMeta().find((r) => r.key === 'hp');
  setOneFormulaEnabled(false);
  const off = prog3BodyMeta().find((r) => r.key === 'hp');
  setOneFormulaEnabled(true);
  check('6e. the Max HP row says "+40 max HP" a point under the one formula, "+8" against an older worker',
    on && on.perText === '+40 max HP' && off && off.perText === '+8 max HP', { on: on && on.perText, off: off && off.perText });
}

// ── 7. The wiring ──
{
  const handler = read('../src/prog3.js');
  check('7a. the allocate handler asks _prog3StatBound (and keeps no level bound of its own)',
    /const cap = this\._prog3StatBound\(ps, stat, sd\.def\);/.test(handler)
      && !/Math\.min\(sd\.def\.cap, levelCap/.test(handler));
  const idx = read('../src/index.js');
  check('7b. the room mixes statcap.js in', /Object\.assign\(GameRoom\.prototype, statCapMethods\)/.test(idx));
  const join = read('../src/join.js');
  check('7c. the caps literal names nostatcap from _statCapFree', /nostatcap: this\._statCapFree\(\)/.test(join));
  const ws = read('../../src/networking/wsClient.js');
  check('7d. the phone sets its switch from caps.nostatcap', /setStatCapFree\(!!\(S\._serverCaps && S\._serverCaps\.nostatcap\)\)/.test(ws));
  const dev = read('../../src/ui/panels/DevPanel.jsx');
  const gates = dev.slice(dev.indexOf('const CAP_GATES = ['), dev.indexOf('];', dev.indexOf('const CAP_GATES = [')));
  check('7e. the test panel lists it (CAP_GATES)', /'nostatcap'/.test(gates));
  const hero = read('../../src/ui/mobile/sheet/HeroExpanded.jsx');
  check('7f. the Points labels say "N points" with no cap (ptsOf), never "N of 999"',
    /function ptsOf\(pts, cap, unit\)/.test(hero) && !/\$\{pts\} of \$\{cap\}\. \$\{st\.perText\}/.test(hero)
      && (hero.match(/ptsOf\(pts, cap, (true|false)\)/g) || []).length === 5);
}

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nstat-cap: all checks passed');
