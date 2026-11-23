/* ═══ v2.3.5289: EXPERIENCE AND LEVELS' DOOR (grand plan step 4.3, card R PR 10) ═══
 * (the door: server/src/xp.js; the spec: docs/specs/xp-door.md)
 *
 * Every change to a character's experience and levels -- a life skill's, a
 * combat skill's, the character's own -- goes through the door's four
 * verbs, each call naming its road in XP_ROADS.  This suite holds it, as
 * skillpoints-door.test holds the build points:
 *
 *   1. THE DOOR: each give and level-up road against the old line it
 *      replaced, for every count a track can hold (step 1: nothing changes);
 *      a set writes its own field only; a make writes {level, xp: 0}; a
 *      wrong road, verb, field, track or key throws, nothing written;
 *   2. ONE DOOR: no `xp` or `level` written in server/src but xp.js and the
 *      places listed below with why (a shaper, a whole map, not a
 *      character's experience); a stale entry fails; each planted shape of
 *      a second writer is found;
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, with its
 *      verb, from its row's file; every road has exactly one caller;
 *   4. THE ROOM: a life skill's harvest XP and its level-ups, a combat
 *      skill's XP, its level-ups and the points they bring, the stored
 *      character's level and XP at the join.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-15:
 *   - `s.xp = (s.xp || 0) + xpAmt;` put back in gathering.js           -> FAIL 2 (a second writer)
 *   - life_level's read made `plain` in xp.js                          -> FAIL 1 (a level-up on no level)
 *   - a second `xpSet(ps, 'level', ..., 'char_level')` in grids.js      -> FAIL 3
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { XP_ROADS, XP_READS, XP_TRACKS, XP_VERBS, XP_FIELDS, xpGive, xpLevelUp, xpSet, xpMake } from '../src/xp.js';
import { makeStorage, openRoom, join, fakeWs, settle, playTour, roomGuard } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}
const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };

/* ══════════ 1. THE DOOR ══════════ */
/* the old line each give or level-up road replaced, on a track `t` */
const EXPECT = {
  life_xp:     (t, n) => { t.xp = (t.xp || 0) + n; },                                   // gathering.js: s.xp = (s.xp || 0) + xpAmt
  life_level:  (t, need) => { t.xp -= need; t.level = (t.level || 1) + 1; },            // s.xp -= th; s.level = (s.level || 1) + 1
  skill_xp:    (t, n) => { t.xp += n; },                                                 // prog3.js: sk.xp += ...
  skill_level: (t, need) => { t.xp -= need; t.level++; },                                // sk.xp -= req; sk.level++
  grid_xp:     (t, n) => { t.xp = (t.xp || 0) + (n || 0); },                             // grids.js: ps.xp = (ps.xp || 0) + (xpAmt || 0)
};
const COUNTS = [undefined, null, 0, 1, 7, 7.5, -3, NaN, Infinity, '3', 'x', ''];
const AMOUNTS = [0, 1, 2.5, -1, 1e6, undefined, NaN, '2'];
{
  const roads = Object.keys(XP_ROADS);
  check('1. every road is one of the verbs, on one of the tracks', roads.every((r) => XP_VERBS.includes(XP_ROADS[r].verb) && XP_TRACKS.includes(XP_ROADS[r].track)));
  check('1. every give and level-up road has its old line here, and a read the door knows', roads.filter((r) => ['give', 'levelUp'].includes(XP_ROADS[r].verb)).every((r) => EXPECT[r] && Object.prototype.hasOwnProperty.call(XP_READS, XP_ROADS[r].read)));
  check('1. every set road names one field, every other none', roads.every((r) => (XP_ROADS[r].verb === 'set') === XP_FIELDS.includes(XP_ROADS[r].field)));
  const off = [];
  for (const road of Object.keys(EXPECT)) {
    const row = XP_ROADS[road];
    for (const xp of COUNTS) for (const level of COUNTS) for (const n of AMOUNTS) {
      const want = { xp, level, other: 4 }, got = { xp, level, other: 4 };
      EXPECT[road](want, n);
      const ret = row.verb === 'give' ? xpGive(got, n, road) : xpLevelUp(got, n, road);
      const same = Object.is(want.xp, got.xp) && Object.is(want.level, got.level) && got.other === 4 && Object.keys(got).length === 3;
      const retOk = row.verb === 'give' ? Object.is(ret, got.xp) : Object.is(ret, got.level);
      if (!same || !retOk) off.push({ road, xp, level, n, want: [want.xp, want.level], got: [got.xp, got.level] });
    }
  }
  check('1. each give and level-up road is its old line, to the bit, for every count a track can hold', off.length === 0, off.slice(0, 4));
  const t = { level: 3, xp: 10 };
  xpSet(t, 'level', 9, 'char_level');
  check('1. a set writes its field only', t.level === 9 && t.xp === 10);
  const h = {};
  const made = xpMake(h, 'mining', 4, 'dev_life');
  check('1. a make writes {level, xp: 0} under its key', made === h.mining && h.mining.level === 4 && h.mining.xp === 0 && Object.keys(h.mining).length === 2);
  const before = JSON.stringify(t);
  const wrong = [
    () => xpGive(t, 1, 'no_such_road'), () => xpGive(t, 1, 'char_level'), () => xpGive(t, 1, 'constructor'),
    () => xpLevelUp(t, 1, 'life_xp'), () => xpSet(t, 'xp', 1, 'char_level'), () => xpSet(t, 'level', 1, '__proto__'),
    () => xpGive(null, 1, 'life_xp'), () => xpGive([], 1, 'life_xp'), () => xpMake(h, '__proto__', 1, 'dev_life'), () => xpMake(null, 'x', 1, 'dev_life'),
  ];
  check('1. a wrong road, verb, field, track or key throws, nothing written', wrong.every(throws) && JSON.stringify(t) === before && Object.getPrototypeOf(h) === Object.prototype);
}

/* ══════════ 2. ONE DOOR ══════════ */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const files = srcFiles();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, SRC_DIR), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
/* a write of `xp` or `level` by any name, a track made whole, a map of tracks made whole */
const WRITES = [
  /(?:\.(?:xp|level)|\[\s*['"](?:xp|level)['"]\s*\])\s*(?:[-+*/%]?=(?![=>])|\+\+|--)/g,
  /(?:\+\+|--)\s*[\w$.]+\.(?:xp|level)\b/g,
  /=(?![=>])\s*\{[^{}\n]*\blevel\b\s*[:,}][^{}\n]*\bxp\b[^{}\n]*\}/g,
  /=(?![=>])\s*\{[^{}\n]*\bxp\b\s*[:,}][^{}\n]*\blevel\b[^{}\n]*\}/g,
  /\.(?:lifeSkills|weaponSkills|defenseSkill|sk)\s*=(?![=>])/g,
];
function writesIn(s) {
  const lines = new Map();
  for (const re of WRITES) for (const m of s.matchAll(re)) {
    const ln = lineOf(s, m.index);
    if (lines.has(ln)) continue;
    const ls = s.lastIndexOf('\n', m.index) + 1, le = s.indexOf('\n', m.index);
    lines.set(ln, s.slice(ls, le < 0 ? s.length : le).trim());
  }
  return lines;
}
/* Not the door's, each with why (a line of its file matching `re`) */
const L = (file, re, kind, why) => ({ file, re, kind, why });
const LISTED = [
  /* SHAPERS: a stored record, or a fresh copy, shaped before it is a live player's */
  L('migrations.js', /ls\[k\] = \{ level: 1, xp: 0 \}/, 'shaper', 'the migrations: a stored record\'s life skills made whole'),
  L('migrations.js', /sk\.level = 1/, 'shaper', 'the migrations: a stored life skill with no level, made 1'),
  L('migrations.js', /blob\.level = next/, 'shaper', 'the migrations: a stored character\'s level, re-dealt'),
  L('prog3.js', /sk\[cat\] = \{ level, xp:/, 'shaper', 'prog3FromLegacy: a build made from the old grid\'s (migration v10, the join\'s heal)'),
  L('prog3.js', /out\.sk\[cat\]\.(?:level|xp) = /, 'shaper', '_sanitizeProg3: the join\'s clean, into a fresh block'),
  L('grids.js', /out\[cat\] = \{ level: floor, xp:/, 'shaper', '_sanitizeWeaponSkills: a sanitized copy'),
  L('power.js', /p3\.sk\[cat\] = \{ level: C\.sk\[cat\], xp: 0 \}/, 'shaper', 'the power index\'s control: a build made up in memory, no player\'s'),
  /* WHOLE: a map of tracks made whole (empty, or loaded) */
  L('*', /\.lifeSkills = \{\}/, 'whole', 'a new, empty map of life skills for a player who has none (holds no experience)'),
  L('prog3.js', /p3\.sk = \{\}/, 'whole', 'a new, empty map of combat skills (holds no experience)'),
  L('join.js', /\.lifeSkills = stored\.lifeSkills \|\| \{\}/, 'whole', 'the join loads the stored character\'s life skills'),
  L('join.js', /\.lifeSkills = \(msg\.data && msg\.data\.rpgLifeSkills/, 'whole', 'a first join\'s claimed life skills (held by trapBootstrapGuard and the gems\' adopt)'),
  L('join.js', /\.weaponSkills = /, 'whole', 'the old grid\'s weapon tracks, loaded or a phone\'s copy sanitized (the Wheel\'s characters read prog3)'),
  L('join.js', /\.defenseSkill = /, 'whole', 'the old grid\'s defence track, the same'),
  L('grids.js', /ps\.weaponSkills = this\._sanitizeWeaponSkills/, 'whole', 'the old grid\'s weapon tracks from a phone\'s report, sanitized, never lower'),
  L('grids.js', /ps\.defenseSkill = this\._sanitizeDefenseSkill/, 'whole', 'the old grid\'s defence track, the same'),
  /* NOT A CHARACTER'S EXPERIENCE */
  L('cooking.js', /ps\._buffs\.xp = endsAt/, 'notxp', 'a meal\'s XP buff: its timer'),
  L('devtools.js', /m\.xp = /, 'notxp', 'a monster\'s XP reward (the owner\'s spawn lever)'),
  L('devtools.js', /out\.level = L/, 'notxp', 'the lever\'s reply'),
  L('dungeon.js', /mn\.xp = /, 'notxp', 'a summoned monster\'s XP reward'),
  L('farm.js', /did\.xp = xp/, 'notxp', 'a harvest\'s report'),
  L('party.js', /m\.level = ps\.level/, 'notxp', 'a party roster\'s copy of a member\'s level'),
  L('party.js', /meta\.level = level/, 'notxp', 'a party roster\'s copy, the same'),
  L('petbook.js', /pet\.xp = g\.xp/, 'notxp', 'a pet\'s own experience: the pet\'s, in its own record (pets:), out of the door'),
  L('pvpextras.js', /h\.level = this\._prog3OpponentLevel/, 'notxp', 'a hit\'s record of the opponent\'s level'),
];
{
  const found = [];
  const seen = new Set();
  for (const f of files) {
    if (f === 'xp.js') continue;
    for (const [ln, line] of writesIn(code[f])) {
      const hit = LISTED.find((e) => (e.file === '*' || e.file === f) && e.re.test(line));
      if (hit) { seen.add(hit); continue; }
      found.push(f + ':' + ln + ' ' + line.slice(0, 110));
    }
  }
  check('2. no experience or level is written in server/src but through the door (xp.js) or a place listed with why', found.length === 0, found);
  check('2. every listed place still exists (a stale one is deleted)', seen.size === LISTED.length, LISTED.filter((e) => !seen.has(e)).map((e) => e.file + ' ' + e.re));
  const plant = (t) => writesIn(strip(t)).size;
  const mustFind = [
    's.xp = (s.xp || 0) + n;', 'sk.xp += n;', 'sk.level++;', '++sk.level;', 'ps.level = 5;', 'ps.level += 1;', 'ps["xp"] = 0;',
    'ps.lifeSkills.mining = { level: 1, xp: 0 };', 'p3.sk[cat] = { xp: 0, level: 2 };', 'ps.lifeSkills = claimed;', 'track.xp -= need;',
  ];
  check('2. ...the scanner finds each shape of a second writer (' + mustFind.length + ' planted)', mustFind.every((t) => plant(t) === 1), mustFind.filter((t) => plant(t) !== 1));
  check('2. ...and reads a read as no write', plant('if (s.xp >= need) return s.level;\nconst lv = ps.level || 1;\nreturn { level: lv };\nx = a.level === b.level;') === 0);
}

/* ══════════ 3. ONE ROW, ONE PLACE ══════════ */
const DOOR = { xpGive: 'give', xpLevelUp: 'levelUp', xpSet: 'set', xpMake: 'make' };
function callsIn(s, name) {
  const out = [];
  for (const m of s.matchAll(new RegExp('(?<![\\w$.])' + name + '\\(', 'g'))) {
    let i = m.index + m[0].length, depth = 1, q = null;
    for (; i < s.length && depth > 0; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') q = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    const args = s.slice(m.index + m[0].length, i - 1);
    const road = /,\s*'([A-Za-z0-9_]+)'\s*$/.exec(args);
    out.push({ road: road ? road[1] : null, line: lineOf(s, m.index) });
  }
  return out;
}
{
  const byRoad = Object.create(null);
  const bad = [];
  for (const f of files) {
    if (f === 'xp.js') continue;
    for (const [name, verb] of Object.entries(DOOR)) {
      for (const c of callsIn(code[f], name)) {
        const where = f + ':' + c.line;
        if (!c.road) { bad.push(where + ' ' + name + ' names no road as a plain string'); continue; }
        const row = Object.prototype.hasOwnProperty.call(XP_ROADS, c.road) ? XP_ROADS[c.road] : null;
        if (!row) { bad.push(where + ' names "' + c.road + '", which XP_ROADS has not got'); continue; }
        if (row.verb !== verb) bad.push(where + ' ' + c.road + ' is a ' + row.verb + ', called by ' + name);
        if (row.at.split(' ')[0] !== f) bad.push(where + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
        (byRoad[c.road] = byRoad[c.road] || []).push(where);
      }
    }
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file', bad.length === 0, bad);
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', Object.keys(XP_ROADS).every((r) => byRoad[r]), Object.keys(XP_ROADS).filter((r) => !byRoad[r]));
  check('3. no road has two callers (a second place is a second row)', Object.keys(byRoad).every((r) => byRoad[r].length === 1), Object.entries(byRoad).filter(([, w]) => w.length > 1));
}

/* ══════════ 4. THE ROOM ══════════ */
{
  const P = 'bp_xp_a';
  const st = makeStorage(new Map([['rpg:' + P, { _v: 21, coins: 0, level: 7, xp: 123, inventory: {} }]]));
  const room = await openRoom(st);
  await join(room, fakeWs('a'), P, { loginTaken: true });
  await settle();
  const ps = room.playerState[P];
  check('4. the join loads the stored character\'s XP (join_xp)', ps && ps.xp === 123, ps && { level: ps.level, xp: ps.xp });
  const r = room._addLifeSkillXp(ps, 'mining', 5000);
  check('4. a life skill\'s XP through the door: made, given, and levelled up', r.leveled && r.newLevel > 1 && ps.lifeSkills.mining.level === r.newLevel && ps.lifeSkills.mining.xp >= 0 && ps.lifeSkills.mining.xp < room._lifeSkillXpThreshold(r.newLevel), ps.lifeSkills.mining);
  if (ps.prog3 && ps.prog3.sk && ps.prog3.sk.sword) {
    const lv0 = ps.prog3.sk.sword.level, pool0 = ps.prog3.pool;
    room._prog3AwardXp(P, ps, 'sword', 100000, { flat: true });
    check('4. a combat skill\'s XP through the door: levelled up, its points dealt, the character level read', ps.prog3.sk.sword.level > lv0 && ps.prog3.pool > pool0 && ps.level >= ps.prog3.sk.sword.level, { sk: ps.prog3.sk.sword, pool: ps.prog3.pool, level: ps.level });
  } else check('4. the character has combat skills (prog3) to award', false, ps && ps.prog3);
}

/* ══════════ R. THE RUNNING ROOM (v2.3.6440, card DG PR 1) ══════════
   The tour (testroom.mjs playTour: a quest handed in) played on a guarded
   room.  A second writer of experience and levels planted on its paths is refused there,
   however it is spelled (Object.assign, `||=`, a computed key, an alias, a
   destructure, `delete`), and fails this suite: testroom.mjs "THE RUNNING
   ROOM REFUSES".  Break proof: plants1.json (tools/dev/plants/). */
{
  const t = await playTour({ tag: 'xp' });
  check('R. the tour plays under the running room\'s guard', roomGuard.armed());
  check('R. ...the guard is ON the tour\'s record (coins its accessor, the bag its Proxy, the room\'s map the guarded one: the purpose review, sitting 56)', roomGuard.holds(t.ps, t.room).length === 0, roomGuard.holds(t.ps, t.room));
  check('R. ...each of its steps did what it does (a quest handed in, paid)', t.steps.length > 0 && t.steps.every((x) => x.paid), t.steps);
  check('R. ...and no write of a guarded field was refused (testroom.mjs)', roomGuard.refusals().length === 0, roomGuard.refusals().slice(0, 5));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all xp-door checks passed');
process.exit(0);
