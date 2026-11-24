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
 *      writes nothing with `serverdead` on, the old claim with it off);
 *   6. STEP 2a (v2.3.4901): every `heal` row is refused on a dying body (the
 *      hp unchanged), nothing else is, and `lifenoheal: false` puts the
 *      step-1 write back.
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { HP_ROADS, LIFE_ROADS, LIFE, lifeOf, lifeMethods } from '../src/life.js';
import { GameRoom } from '../src/index.js';
import { flagNameOk } from '../src/liveops.js';
import { playTour, roomGuard } from './testroom.mjs';   /* v2.3.6440: the running room refuses (card DG PR 1) */
import { doorWrites, doorCalls, visit, where } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6441: the scans read the syntax tree (card DG PR 2) */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ── the source, comments out, line numbers kept (gold-door.test's strip) ── */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const dir = SRC_DIR;
const files = srcFiles();   /* v2.3.5060: in depth, a folder's files too (src-walk.mjs) */
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
/* v2.3.6441 (card DG PR 2): the scan reads the syntax tree
   (tools/guards/lib/writesOf.mjs): `||=`, `Object.assign(ps, { hp })`,
   `delete ps.dead`, a destructure, a key in a variable.  What writes an `hp`
   or a `dying` / `dead` / `life` that is NOT a player's is listed by its
   file, its function and its field, with how many writes: the old rule that
   a receiver named `m` or `mn` is a monster in every file let a party healed
   through `const m = this.playerState[id]` walk past (plants1 HP-2). */
const raw = Object.create(null);
for (const f of files) raw[f] = readFileSync(new URL(f, dir), 'utf8');
const P = (file, fn, field, n, why) => ({ file, fn, field, n, why });
const MONSTER = 'a monster\'s own hit points (`m`, `mn`), not a body';
const NOT_A_PLAYER = [
  P('abilities.js', '_abilityStrikeMonster', 'hp', 1, MONSTER),
  P('combat.js', '_handleMonsterDamage', 'hp', 2, MONSTER),
  P('devtools.js', '_devClearWave', 'hp', 1, MONSTER),
  P('devtools.js', '_devTrapping', 'hp', 1, MONSTER),
  P('devtools.js', '_devVitals', 'hp', 2, 'the Test panel\'s answer (`out`), reporting what the door wrote'),
  P('dungeon.js', '_dungeonSpawnBoss', 'hp', 1, MONSTER),
  P('dungeon.js', '_dungeonBossSummon', 'hp', 1, MONSTER),
  P('dungeon.js', '_dungeonTickBossAbilities', 'hp', 1, MONSTER),
  P('gathering.js', '_planGatherHits', 'hp', 1, 'a gather node\'s hits (`rec.hp`), not a body'),
  P('gathering.js', '_planCookHits', 'hp', 1, 'a cook\'s planned hits (`ps._cookHits`), not a body'),
  P('hits.js', '_legacyThornsReflect', 'hp', 1, MONSTER),
  P('index.js', '_applyMonsterDot', 'hp', 1, MONSTER),
  P('killroll.js', '_killRollDev', 'hp', 1, MONSTER),
  P('monsterlife.js', '_monsterNewLife', 'hp', 1, MONSTER),
  P('monsterlife.js', '_monsterNewLife', 'life', 1, 'a monster\'s own count of lives (v2.3.4843), not the player\'s phase'),
  P('monstermoves.js', '_moveTierStep', 'hp', 1, MONSTER),
  P('monstermoves.js', '_monsterMovesFlagChanged', 'hp', 2, MONSTER),
  P('slimeboss.js', '_slimeBossCleanup', 'hp', 1, 'a split slime (a monster)'),
  P('tick.js', 'body', 'dead', 1, 'the tick entry\'s copy of the body\'s phase, for the wire'),
  P('join.js', '_handleJoin', 'dead', 1, 'the join\'s fresh body has `dead: false`, then _lifeTo'),
];
{
  const r = doorWrites(raw, { skip: ['life.js'], fields: ['hp', 'dying', 'dead', 'life'], listed: NOT_A_PLAYER });
  check('2. no player\'s hp, and no dying / dead / life, is written in server/src but through the life door, however it is spelled', r.found.length === 0, r.found.map(where));
  check('2. every NOT_A_PLAYER row still holds its count of writes (a stale one is deleted, a second spelling is one too many)', r.stale.length === 0, r.stale);
  /* an object literal that names the phase is a second writer too (read off the tree) */
  const lit = [];
  for (const f of files) {
    if (f === 'life.js') continue;
    visit(raw[f], { ObjectProperty(path) {
      const k = path.node.key, v = path.node.value;
      const key = path.node.computed ? null : (k.name || k.value);
      if ((key === 'dying' || key === 'life') && (v.type === 'BooleanLiteral' || (v.type === 'StringLiteral' && (v.value === 'alive' || v.value === 'dying'))))
        lit.push(f + ':' + path.node.loc.start.line);
    } });
  }
  check('2. no literal sets the phase (join.js\'s fresh body has `dead: false`, then _lifeTo)', lit.length === 0, lit);
}

/* ── 3. ONE ROW, ONE PLACE ───────────────────────────────────────────────── */
/* v2.3.6441: every call by ANY receiver (`const room = this; room._hpSet(...)`,
   plants3 HP-5), a bind or a name made of it no plain call */
const LIFE_CALLS = doorCalls(raw, { skip: ['life.js'], names: ['_hpSet', '_lifeTo', '_lifeDeadClaim'] });
check('3. the life door is called plainly, by name (no bind, .call, apply or a name made of it)', LIFE_CALLS.odd.length === 0, LIFE_CALLS.odd.map((o) => where(o) + ' (' + o.how + ')'));
for (const [name, table, fn] of [['hp', HP_ROADS, '_hpSet'], ['life', LIFE_ROADS, '_lifeTo']]) {
  const byRoad = Object.create(null);
  const bad = [];
  for (const c of LIFE_CALLS.calls.filter((x) => x.name === fn)) {
    const where1 = c.file + ':' + c.line;
    if (!c.road || !/^[A-Za-z0-9_]+$/.test(c.road) || c.args[c.args.length - 1] !== c.road) { bad.push(where1 + ' names no road as a plain string (its last argument)'); continue; }
    if (!own(table, c.road)) { bad.push(where1 + ' names "' + c.road + '", which the table has not got'); continue; }
    const row = table[c.road];
    if (row.at.split(' ')[0] !== c.file) bad.push(where1 + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
    if (fn === '_lifeTo' && c.args[1] !== row.to) bad.push(where1 + ' ' + c.road + ' goes to ' + row.to + ', called with ' + c.args[1]);
    (byRoad[c.road] = byRoad[c.road] || []).push(where1);
  }
  check('3. every ' + fn + ' call names a ' + name + ' road the table has, from its row\'s file', bad.length === 0, bad);
  const none = Object.keys(table).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every ' + name + ' road has a caller', none.length === 0, none);
  check('3. no ' + name + ' road has two callers, by any receiver', twice.length === 0, twice);
}
{
  /* the claim road: one caller, in the move, behind serverdead's switch */
  const claims = LIFE_CALLS.calls.filter((c) => c.name === '_lifeDeadClaim').map((c) => ({ f: c.file, line: c.line, fn: c.fn }));
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

/* ── 6. STEP 2a: NO HEAL ON A DYING BODY (v2.3.4901) ───────────────────── */
{
  const mockState = () => ({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  });
  const room = new GameRoom(mockState(), { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  room._liveFlags = {};
  check('6. the switch is on by default, a name the flags route stores', room._lifeNoHealOn() && flagNameOk('lifenoheal'));
  const heals = Object.keys(HP_ROADS).filter((r) => HP_ROADS[r].kind === 'heal');
  check('6. the heal rows are the ones the spec names', heals.length >= 10 && ['eat', 'lifesteal_melee', 'kill_lifeblood', 'regen_hub', 'second_wind'].every((r) => heals.includes(r)), heals);
  const off = [];
  for (const road of Object.keys(HP_ROADS)) {
    /* a dying body (the door's own phase, and one made before the door: its booleans) */
    for (const mk of [() => room._lifeTo({ hp: 0, maxHp: 100 }, 'dying', 'death'), () => ({ hp: 0, maxHp: 100, dying: true, dead: true })]) {
      const ps = mk();
      const ret = room._hpSet(ps, 40, road);
      const heal = HP_ROADS[road].kind === 'heal';
      if (heal ? (ps.hp !== 0 || ret !== 0) : ps.hp !== 40) off.push({ road, heal, hp: ps.hp });
    }
    /* a live body: every road writes, as in step 1 */
    const up = room._lifeTo({ hp: 10, maxHp: 100 }, 'alive', 'respawn');
    room._hpSet(up, 40, road);
    if (up.hp !== 40) off.push({ road, alive: true, hp: up.hp });
  }
  check('6. on a dying body every heal row is refused and nothing else is; a live body takes every road', off.length === 0, off.slice(0, 6));
  room._liveFlags = { lifenoheal: false };
  const d = room._lifeTo({ hp: 0, maxHp: 100 }, 'dying', 'death');
  room._hpSet(d, 25, 'lifesteal_melee');
  check('6. `lifenoheal: false` puts the step-1 write back (the heal lands)', d.hp === 25 && !room._lifeNoHealOn(), d);
  /* the real path that had no check of its own: a melee kill's lifesteal on a dying killer */
  room._liveFlags = {};
  const k = room._lifeTo({ hp: 0, maxHp: 100, dmgFromMonster: { m1: 30 } }, 'dying', 'death');
  room._applyMeleeLifesteal(k, 'm1', 'melee');
  const a = room._lifeTo({ hp: 10, maxHp: 100, dmgFromMonster: { m1: 30 } }, 'alive', 'respawn');
  room._applyMeleeLifesteal(a, 'm1', 'melee');
  check('6. the melee lifesteal no longer raises a dying body, and still heals a live one', k.hp === 0 && a.hp > 10, { dying: k.hp, alive: a.hp });
}

/* ══════════ R. THE RUNNING ROOM (v2.3.6440, card DG PR 1) ══════════
   The tour (testroom.mjs playTour: a quest handed in) played on a guarded
   room.  A second writer of health and the life phase planted on its paths is refused there,
   however it is spelled (Object.assign, `||=`, a computed key, an alias, a
   destructure, `delete`), and fails this suite: testroom.mjs "THE RUNNING
   ROOM REFUSES".  Break proof: plants1.json (tools/dev/plants/). */
{
  const t = await playTour({ tag: 'life' });
  check('R. the tour plays under the running room\'s guard', roomGuard.armed());
  check('R. ...the guard is ON the tour\'s record (coins its accessor, the bag its Proxy, the room\'s map the guarded one: the purpose review, sitting 56)', roomGuard.holds(t.ps, t.room).length === 0, roomGuard.holds(t.ps, t.room));
  check('R. ...each of its steps did what it does (a quest handed in, paid)', t.steps.length > 0 && t.steps.every((x) => x.paid), t.steps);
  check('R. ...and no write of a guarded field was refused (testroom.mjs)', roomGuard.refusals().length === 0, roomGuard.refusals().slice(0, 5));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
