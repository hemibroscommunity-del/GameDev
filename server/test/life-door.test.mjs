/* The life door -- v2.3.4820 (spec docs/specs/life-door.md; src/life.js).
 *
 * A player's health was written by hand in 39 places across 12 files, and
 * the life phase was two booleans (`dying`, `dead`) set side by side in five
 * places.  The door puts every health write through _hpSet and every phase
 * change through _lifeTo (one field, `ps.life`, the old booleans written from
 * it), each call naming its ROAD.  This suite holds it:
 *
 *   1. STEP 1 CHANGES NOTHING: each road's call passes, text for text, the
 *      value its line wrote before the door (EXPECT_HP below: the old right-
 *      hand side, read off main at v2.3.4820), and _hpSet writes it as it is,
 *      to the bit; _lifeTo writes exactly the old pairs;
 *   2. ONE DOOR: no player's `.hp`, and no `.dying` / `.dead` / `.life`, is
 *      written anywhere in server/src but life.js (what is not a player's,
 *      a monster's health, a tick entry's copy, is listed below with why);
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, from the
 *      file its row names; every road has exactly one caller;
 *   4. A WRONG ROAD writes nothing;
 *   5. THE ROOM: the doors are on the GameRoom; a death and a respawn go
 *      through _lifeTo; "dead is the server's word" holds (a move's `dead`
 *      writes nothing with `serverdead` on, the old claim with it off).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { HP_ROADS, LIFE_ROADS, LIFE, lifeOf, lifeMethods } from '../src/life.js';
import { GameRoom } from '../src/index.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ── the source, comments out, line numbers kept (gold-door.test's strip) ── */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const dir = new URL('../src/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, dir), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;

/* Every this.<name>( call: its arguments as text, read to the call's own
   closing bracket (strings skipped), split at the top-level commas. */
function callsIn(s, name) {
  const out = [];
  const re = new RegExp('this\\.' + name + '\\(', 'g');
  for (const m of s.matchAll(re)) {
    let i = m.index + m[0].length, depth = 1, q = null;
    const args = []; let start = i;
    for (; i < s.length && depth > 0; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') q = ch;
      else if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) args.push(s.slice(start, i)); }
      else if (ch === ',' && depth === 1) { args.push(s.slice(start, i)); start = i + 1; }
    }
    const a = args.map((x) => x.trim());
    const lit = /^'([A-Za-z0-9_]+)'$/.exec(a[a.length - 1] || '');
    out.push({ args: a, road: lit ? lit[1] : null, line: lineOf(s, m.index) });
  }
  return out;
}

/* ── 1. STEP 1 CHANGES NOTHING ───────────────────────────────────────────── */
/* Each road: [the body it wrote, the value it wrote] -- its line before the
   door was `<body>.hp = <value>`.  A road whose value changes on purpose
   (step 2) changes its line here, in the same PR, with why. */
const EXPECT_HP = {
  hit_unset:          ['ps', 'ps.maxHp'],
  hit:                ['ps', 'Math.max(0, ps.hp - dmgTaken)'],
  second_wind:        ['ps', 'Math.min(ps.maxHp, ps.hp + secondWind)'],
  lifesteal_melee:    ['ps', 'Math.min(maxHp, (ps.hp || 0) + refund)'],
  kill_lifeblood:     ['killerPs', 'Math.min(_lbMax, killerPs.hp + _lbFlat)'],
  pvp_lifeblood:      ['killerPs', 'Math.min(maxHp, killerPs.hp + lb)'],
  pvp_refund:         ['killerPs', 'Math.min(maxHp, killerPs.hp + refund)'],
  eat_unset:          ['ps', 'ps.maxHp'],
  eat:                ['ps', 'Math.min(ps.maxHp, ps.hp + heal)'],
  dish_unset:         ['ps', 'ps.maxHp'],
  dish:               ['ps', 'Math.min(ps.maxHp, ps.hp + Math.ceil(Number(dish.power)) + (this._fishHealOff() ? this._recoveryFlat(ps) : 0))'],
  tonic_unset:        ['ps', 'ps.maxHp'],
  tonic:              ['ps', 'Math.min(ps.maxHp, ps.hp + (item.power || 23))'],
  regen_hub:          ['ps', 'Math.min(ps.maxHp, ps.hp + heal)'],
  regen_spoke:        ['ps', 'Math.min(ps.maxHp, ps.hp + heal)'],
  rest:               ['ps', 'ps.maxHp'],
  kill_level_up:      ['recipPs', 'recipPs.maxHp'],
  bp_level_up:        ['ps', 'ps.maxHp'],
  bp_earned_level_up: ['ps', 'ps.maxHp'],
  skill_level_up:     ['ps', 'ps.maxHp'],
  stats_level_up:     ['ps', 'ps.maxHp'],
  quest_level_up:     ['ps', 'ps.maxHp'],
  prog3_level_up:     ['ps', 'ps.maxHp'],
  maxes_unset:        ['ps', 'ps.maxHp'],
  maxes_clamp:        ['ps', 'Math.min(ps.hp, ps.maxHp)'],
  prog3_unset:        ['ps', 'ps.maxHp'],
  prog3_clamp:        ['ps', 'Math.min(ps.hp, ps.maxHp)'],
  bar_fullness:       ['ps', 'Math.max(1, Math.min(ps.maxHp, Math.round(hp0 * ps.maxHp / max0)))'],
  join_stored:        ['this.playerState[msg.id]', 'typeof stored.hp === \'number\' ? stored.hp : 100'],
  join_new:           ['this.playerState[msg.id]', '(msg.data && typeof msg.data.rpgHp === \'number\') ? msg.data.rpgHp : 100'],
  join_respec:        ['_ps', '_ps.maxHp'],
  join_stand_up:      ['_ps', '_ps.maxHp || 100'],
  respawn:            ['ps', 'ps.maxHp || 100'],
  spar_clone_new:     ['ps', 'ps.maxHp || 100'],
  spar_down:          ['ps', '0'],
  spar_self_ko:       ['ps', 'ps.maxHp || 100'],
  spar_up:            ['ps', 'ps.maxHp || 100'],
  dev_heal:           ['ps', 'ps.maxHp'],
  dev_hp:             ['ps', 'Math.max(1, Math.min(ps.maxHp, Math.floor(o.hp)))'],
};
const hpCalls = [];
for (const f of files) if (f !== 'life.js') for (const c of callsIn(code[f], '_hpSet')) hpCalls.push({ f, ...c });
{
  const missing = Object.keys(HP_ROADS).filter((r) => !own(EXPECT_HP, r));
  const stale = Object.keys(EXPECT_HP).filter((r) => !own(HP_ROADS, r));
  check('1. every hp road has its old line, and every old line a road', missing.length === 0 && stale.length === 0, { missing, stale });
  const off = [];
  for (const c of hpCalls) {
    const want = c.road && own(EXPECT_HP, c.road) ? EXPECT_HP[c.road] : null;
    if (!want) continue;
    if (c.args.length !== 3 || c.args[0] !== want[0] || c.args[1].replace(/\s+/g, ' ') !== want[1]) off.push({ at: c.f + ':' + c.line, road: c.road, got: c.args.slice(0, 2), want });
  }
  check('1. each _hpSet call writes its old line\'s body and value, text for text', off.length === 0, off);
  check('1. at v2.3.4820: 39 hp roads, the 39 hand writes before the door', Object.keys(HP_ROADS).length >= 39, Object.keys(HP_ROADS).length);

  /* the door writes the value as it is, for every value a line can make */
  const VALUES = [0, -0, 1, 37, 100, 99.5, -3, NaN, undefined, null, Infinity, 2 ** 40];
  const bad = [];
  for (const v of VALUES) {
    const ps = { hp: 55, maxHp: 100 };
    const ret = lifeMethods._hpSet(ps, v, 'hit');
    if (!Object.is(ps.hp, v) || !Object.is(ret, v)) bad.push({ v, got: ps.hp });
  }
  check('1. _hpSet writes its value as it is, to the bit', bad.length === 0, bad);

  /* _lifeTo writes the two booleans exactly as the old pairs did, from any start */
  const starts = [{}, { dying: true, dead: true }, { dying: false, dead: true }, { dying: true, dead: false }, { life: 'dying', dying: true, dead: true }];
  const wrong = [];
  for (const s0 of starts) {
    for (const road of Object.keys(LIFE_ROADS)) {
      const to = LIFE_ROADS[road].to;
      const ps = { ...s0 };
      lifeMethods._lifeTo(ps, to, road);
      const d = to === 'dying';   /* the old lines: `dying = dead = true` or `= false` */
      if (ps.dying !== d || ps.dead !== d || ps.life !== to || lifeOf(ps) !== to) wrong.push({ s0, road, ps });
    }
  }
  check('1. _lifeTo writes dying and dead as the old pairs did, and the one field', wrong.length === 0, wrong.slice(0, 3));
  check('1. a body made before the door reads its phase from its booleans', lifeOf({ dying: true }) === LIFE.DYING && lifeOf({}) === LIFE.ALIVE && lifeOf(null) === LIFE.ALIVE);
}

/* ── 2. ONE DOOR ─────────────────────────────────────────────────────────── */
/* What writes a `.hp` that is NOT a player's, and why.  `m` and `mn` are a
   monster in every file (the server's own name for one); the rest are
   matched by file and text. */
const MONSTER_NAMES = ['m', 'mn'];
const NOT_A_PLAYER = [
  { file: 'gathering.js', text: 'rec.hp =', why: 'a gather node\'s hits, not a body' },
  { file: 'devtools.js', text: 'out.hp =', why: 'the Test panel\'s answer, reporting what the door wrote' },
  { file: 'slimeboss.js', text: 'x.hp =', why: 'a split slime (a monster)' },
  { file: 'tick.js', text: 'e.dead =', why: 'the tick entry\'s copy of the body\'s phase, for the wire' },
];
{
  const HP_WRITE = /([\w$\]\)]+)(?:\.hp|\[\s*['"]hp['"]\s*\])\s*(?:[-+*/%]?=(?!=)|\+\+|--)|(?:\+\+|--)\s*[\w$.]*\.hp\b/g;
  /* v2.3.4820 (batch merge): the owner is captured here too, so a monster's own
     `m.life` (monsterlife.js, v2.3.4843: its count of lives) is a monster's
     field, not a player's phase -- the same `m` / `mn` rule as hp */
  const PHASE_WRITE = /([\w$\]\)]+)(?:\.(?:dying|dead|life)|\[\s*['"](?:dying|dead|life)['"]\s*\])\s*(?:[-+*/%]?=(?!=)|\+\+|--)/g;
  const found = [];
  const allowedSeen = new Set();
  for (const f of files) {
    if (f === 'life.js') continue;
    const s = code[f];
    for (const [re, isHp] of [[HP_WRITE, true], [PHASE_WRITE, false]]) {
      for (const m of s.matchAll(re)) {
        if (m[1] && MONSTER_NAMES.includes(m[1])) continue;
        const lineStart = s.lastIndexOf('\n', m.index) + 1;
        const lineEnd = s.indexOf('\n', m.index);
        const line = s.slice(lineStart, lineEnd < 0 ? s.length : lineEnd);
        const ok = NOT_A_PLAYER.find((a) => a.file === f && line.includes(a.text));
        if (ok) { allowedSeen.add(ok); continue; }
        found.push(f + ':' + lineOf(s, m.index) + ' ' + line.trim().slice(0, 100));
      }
    }
  }
  check('2. no player\'s hp, and no dying / dead / life, is written in server/src but through the life door', found.length === 0, found);
  check('2. every NOT_A_PLAYER entry still exists (a stale one is deleted)', allowedSeen.size === NOT_A_PLAYER.length,
    NOT_A_PLAYER.filter((a) => !allowedSeen.has(a)).map((a) => a.file + ' ' + a.text));
  /* an object literal or assign that names the phase is a second writer too */
  const lit = [];
  for (const f of files) {
    if (f === 'life.js') continue;
    for (const m of code[f].matchAll(/\b(dying|life)\s*:\s*(true|false|'alive'|'dying')/g)) lit.push(f + ':' + lineOf(code[f], m.index));
  }
  check('2. no literal sets the phase (join.js\'s fresh body has `dead: false`, then _lifeTo)', lit.length === 0, lit);
}

/* ── 3. ONE ROW, ONE PLACE ───────────────────────────────────────────────── */
for (const [name, table, fn] of [['hp', HP_ROADS, '_hpSet'], ['life', LIFE_ROADS, '_lifeTo']]) {
  const byRoad = Object.create(null);
  const bad = [];
  for (const f of files) {
    if (f === 'life.js') continue;
    for (const c of callsIn(code[f], fn)) {
      const where = f + ':' + c.line;
      if (!c.road) { bad.push(where + ' names no road as a plain string'); continue; }
      if (!own(table, c.road)) { bad.push(where + ' names "' + c.road + '", which the table has not got'); continue; }
      const row = table[c.road];
      if (row.at.split(' ')[0] !== f) bad.push(where + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
      if (fn === '_lifeTo' && c.args[1] !== '\'' + row.to + '\'') bad.push(where + ' ' + c.road + ' goes to ' + row.to + ', called with ' + c.args[1]);
      (byRoad[c.road] = byRoad[c.road] || []).push(where);
    }
  }
  check('3. every ' + fn + ' call names a ' + name + ' road the table has, from its row\'s file', bad.length === 0, bad);
  const none = Object.keys(table).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every ' + name + ' road has a caller', none.length === 0, none);
  check('3. no ' + name + ' road has two callers', twice.length === 0, twice);
}
{
  /* the claim road: one caller, in the move, behind serverdead's switch */
  const claims = [];
  for (const f of files) if (f !== 'life.js') for (const c of callsIn(code[f], '_lifeDeadClaim')) claims.push({ f, line: c.line });
  const ok = claims.length === 1 && claims[0].f === 'movement.js'
    && /_serverDeadOff\(\)\)\s*this\._lifeDeadClaim\(/.test(code['movement.js'].split('\n')[claims[0].line - 1]);
  check('3. _lifeDeadClaim has one caller: the move, behind `serverdead: false`', ok, claims);
}

/* ── 4. A WRONG ROAD WRITES NOTHING ──────────────────────────────────────── */
{
  const tries = [
    ['_hpSet', 'no_such_road'], ['_hpSet', '__proto__'], ['_hpSet', 'constructor'], ['_hpSet', undefined],
    ['_lifeTo', 'no_such_road', 'alive'], ['_lifeTo', 'toString', 'alive'], ['_lifeTo', null, 'dying'],
    ['_lifeTo', 'death', 'alive'],     /* a road to dying, asked for alive */
    ['_lifeTo', 'respawn', 'dying'],   /* and the other way */
    ['_lifeTo', 'respawn', 'dead'],    /* not a phase */
  ];
  for (const [m, road, to] of tries) {
    const ps = { hp: 50, dying: false, dead: false };
    let threw = false;
    try { if (m === '_hpSet') lifeMethods._hpSet(ps, 7, road); else lifeMethods._lifeTo(ps, to, road); }
    catch (e) { threw = /life door/.test(String(e && e.message)); }
    check('4. ' + m + '(' + String(road) + (to ? ', ' + to : '') + ') throws and writes nothing',
      threw && ps.hp === 50 && ps.dying === false && ps.dead === false && !('life' in ps), { threw, ps });
  }
}

/* ── 5. THE ROOM ─────────────────────────────────────────────────────────── */
{
  const mockState = () => ({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  });
  const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(mockState(), mockEnv);
  check('5. the doors are on the GameRoom', typeof room._hpSet === 'function' && typeof room._lifeTo === 'function' && typeof room._lifeDeadClaim === 'function');

  const ps = { hp: 0, maxHp: 120, maxStamina: 80, maxMana: 60, x: 0, y: 0, z: 'town', inventory: {}, coins: 0 };
  room.playerState.p1 = ps;
  try { room._handlePlayerDeath(ps, 'p1', 'test'); } catch (e) { /* the optional hooks are not wired in a bare room */ }
  check('5. a death goes to dying through the door: the field and both booleans', ps.life === 'dying' && ps.dying === true && ps.dead === true, { life: ps.life, dying: ps.dying, dead: ps.dead });
  ps.respawnAt = 1;
  try { room._tickPlayerRespawn(); } catch (e) { /* as above */ }
  check('5. the respawn stands them up through the door, at a full bar', ps.life === 'alive' && ps.dying === false && ps.dead === false && ps.hp === 120,
    { life: ps.life, dying: ps.dying, dead: ps.dead, hp: ps.hp });

  /* "dead is the server's word" (v2.3.4373): the move's claim, by the switch */
  room._liveFlags = {};
  check('5. serverdead on (the default): the switch is not off', room._serverDeadOff() === false);
  room._liveFlags = { serverdead: false };
  check('5. serverdead: false turns the old claim back on', room._serverDeadOff() === true);
  const q = { dead: false, dying: false };
  room._lifeDeadClaim(q, 1);
  check('5. the old claim writes `dead` alone, as a boolean (as before)', q.dead === true && q.dying === false && !('life' in q), q);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
