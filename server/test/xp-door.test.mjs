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
import { writesOf, doorWrites, doorCalls, where } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6441: the scans read the syntax tree (card DG PR 2) */

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
/* v2.3.6441 (card DG PR 2): the scan reads the syntax tree
   (tools/guards/lib/writesOf.mjs): a write of `xp` or `level` by any name and
   any spelling (`||=`, `??=`, `Object.assign`, a destructured track, a track
   rebuilt and put back `{ level, xp }`), a map of tracks made whole.  Each
   place that is not the door's is LISTED by its file, its function and its
   field, with how many writes it holds: the old '*' row (a new, empty map of
   life skills anywhere) names its files now (plants4 XP-5). */
const raw = Object.create(null);
for (const f of files) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');
const XP_SCAN = ['xp', 'level', 'lifeSkills', 'weaponSkills', 'defenseSkill', 'sk'];
const L = (file, fn, field, n, kind, why) => ({ file, fn, field, n, kind, why });
const NEW_LS = 'a new, empty map of life skills for a player who has none (holds no experience)';
const LISTED = [
  /* SHAPERS: a stored record, or a fresh copy, shaped before it is a live player's */
  L('migrations.js', 'freshLifeSkills', 'level', 1, 'shaper', 'the migrations: a stored record\'s life skills made whole'),
  L('migrations.js', 'freshLifeSkills', 'xp', 1, 'shaper', 'the same'),
  L('migrations.js', 'healLifeSkillLevels', 'level', 2, 'shaper', 'the migrations: a stored life skill with no level, made 1'),
  L('migrations.js', 'healLifeSkillLevels', 'xp', 1, 'shaper', 'the same'),
  L('migrations.js', 'run', 'level', 1, 'shaper', 'the migrations: a stored character\'s level, re-dealt'),
  L('prog3.js', 'prog3FromLegacy', 'level', 1, 'shaper', 'prog3FromLegacy: a build made from the old grid\'s (migration v10, the join\'s heal)'),
  L('prog3.js', 'prog3FromLegacy', 'xp', 1, 'shaper', 'the same'),
  L('prog3.js', '_sanitizeProg3', 'level', 1, 'shaper', '_sanitizeProg3: the join\'s clean, into a fresh block'),
  L('prog3.js', '_sanitizeProg3', 'xp', 1, 'shaper', 'the same'),
  L('grids.js', '_sanitizeWeaponSkills', 'level', 2, 'shaper', '_sanitizeWeaponSkills: a sanitized copy'),
  L('grids.js', '_sanitizeWeaponSkills', 'xp', 2, 'shaper', 'the same'),
  L('power.js', 'controlBuild', 'level', 1, 'shaper', 'the power index\'s control: a build made up in memory, no player\'s'),
  L('power.js', 'controlBuild', 'xp', 1, 'shaper', 'the same'),
  /* WHOLE: a map of tracks made whole (empty, or loaded) */
  L('amulet.js', '_gemsAdoptOnJoin', 'lifeSkills', 1, 'whole', NEW_LS),
  L('devtools.js', '_devLifeSkill', 'lifeSkills', 1, 'whole', NEW_LS),
  L('devtools.js', '_devTrapping', 'lifeSkills', 1, 'whole', NEW_LS),
  L('gathering.js', '_addLifeSkillXp', 'lifeSkills', 1, 'whole', NEW_LS),
  L('hardenedwood.js', '_handleMakeHardenedWood', 'lifeSkills', 1, 'whole', NEW_LS),
  L('trapping.js', '_trapSkillReady', 'lifeSkills', 1, 'whole', NEW_LS),
  L('weapongem.js', '_gemsUnpaidOf', 'lifeSkills', 1, 'whole', NEW_LS),
  L('prog3.js', 'prog3RespecPoints', 'sk', 1, 'whole', 'a new, empty map of combat skills (holds no experience)'),
  L('join.js', '_handleJoin', 'lifeSkills', 2, 'whole', 'the join loads the stored character\'s life skills, or a first join\'s claimed ones (held by trapBootstrapGuard and the gems\' adopt)'),
  L('join.js', '_handleJoin', 'weaponSkills', 2, 'whole', 'the old grid\'s weapon tracks, loaded or a phone\'s copy sanitized (the Wheel\'s characters read prog3)'),
  L('join.js', '_handleJoin', 'defenseSkill', 2, 'whole', 'the old grid\'s defence track, the same'),
  L('grids.js', '_handleStatsUpdate', 'weaponSkills', 1, 'whole', 'the old grid\'s weapon tracks from a phone\'s report, sanitized, never lower'),
  L('grids.js', '_handleStatsUpdate', 'defenseSkill', 1, 'whole', 'the old grid\'s defence track, the same'),
  /* NOT A CHARACTER'S EXPERIENCE */
  L('cooking.js', '_applyDish', 'xp', 1, 'notxp', 'a meal\'s XP buff: its timer (`ps._buffs.xp`)'),
  L('devtools.js', '_devTrapping', 'xp', 2, 'notxp', 'a monster\'s XP reward (the owner\'s spawn lever, `m.xp`)'),
  L('devtools.js', '_devTrapping', 'level', 1, 'notxp', 'the lever\'s reply (`out.level`)'),
  L('dungeon.js', '_dungeonBossSummon', 'xp', 1, 'notxp', 'a summoned monster\'s XP reward (`mn.xp`)'),
  L('farm.js', '_handleFarmAct', 'xp', 1, 'notxp', 'a harvest\'s report (`did.xp`)'),
  L('gathering.js', '_planCookHits', 'level', 1, 'notxp', 'a cook\'s planned hits: the skill level it was planned at (`ps._cookHits`)'),
  L('clanparty.js', '_clanToParty', 'level', 1, 'notxp', 'a party roster\'s copy of a member\'s level'),
  L('party.js', '_partyStore', 'level', 2, 'notxp', 'a party roster\'s copy of a member\'s level'),
  L('party.js', '_partyLoad', 'level', 1, 'notxp', 'a party roster\'s copy, the same'),
  L('party.js', '_handlePartyAccept', 'level', 2, 'notxp', 'a party roster\'s copy, the same'),
  L('party.js', '_partyOnRejoin', 'level', 1, 'notxp', 'a party roster\'s copy, the same'),
  L('petbook.js', '_petbookAddXp', 'xp', 1, 'notxp', 'a pet\'s own experience: the pet\'s, in its own record (pets:), out of the door'),
  L('pvpextras.js', '_pvpStatusHolder', 'level', 1, 'notxp', 'a weapon status holder\'s level (`ps._wst`)'),
  L('pvpextras.js', '_pvpApplyWeaponStatus', 'level', 1, 'notxp', 'a hit\'s record of the opponent\'s level'),
  L('pvpextras.js', '_pvpCollision', 'level', 1, 'notxp', 'a hit\'s record of the opponent\'s level'),
  L('join.js', '_sanitizeJoinData', 'sk', 2, 'notxp', 'a look key `sk` (the skin) over the look\'s list, not the build\'s skills'),
  L('join.js', '_loadOrCreateCharacter', 'sk', 1, 'notxp', 'the same look key'),
  L('join.js', '_handleJoin', 'sk', 1, 'notxp', 'the same look key'),
  L('store.js', '_stBustLook', 'sk', 2, 'notxp', 'the same look key, a bust\'s look'),
];
{
  const r = doorWrites(raw, { skip: ['xp.js'], fields: XP_SCAN, listed: LISTED });
  check('2. no experience or level is written in server/src but through the door (xp.js) or a place listed with why', r.found.length === 0, r.found.map(where));
  check('2. every listed place still holds its count of writes (a stale one is deleted, a second spelling is one too many)', r.stale.length === 0, r.stale);
  const plant = (t) => writesOf('function f(s, sk, ps, track, p3, cat, n, need, claimed) {\n' + t + '\n}', { fields: XP_SCAN }).length;
  const mustFind = [
    's.xp = (s.xp || 0) + n;', 'sk.xp += n;', 'sk.level++;', '++sk.level;', 'ps.level = 5;', 'ps.level += 1;', 'ps["xp"] = 0;',
    'ps.lifeSkills.mining = { level: 1, xp: 0 };', 'p3.sk[cat] = { xp: 0, level: 2 };', 'ps.lifeSkills = claimed;', 'track.xp -= need;',
    'ps.level ||= 1;', 'Object.assign(ps, { xp: 0 });', 'delete ps.xp;',
  ];
  check('2. ...the scanner finds each shape of a second writer (' + mustFind.length + ' planted)', mustFind.every((t) => plant(t) >= 1), mustFind.filter((t) => plant(t) < 1));
  check('2. ...and reads a read as no write', plant('if (s.xp >= need) return s.level;\nconst lv = ps.level || 1;\nreturn { level: lv };\nconst x = s.level === sk.level;') === 0);
}

/* ══════════ 3. ONE ROW, ONE PLACE ══════════ */
const DOOR = { xpGive: 'give', xpLevelUp: 'levelUp', xpSet: 'set', xpMake: 'make' };
{
  /* v2.3.6441: by any receiver, a bind or a name made of it no plain call */
  const { calls, odd } = doorCalls(raw, { skip: ['xp.js'], names: Object.keys(DOOR) });
  check('3. the door is called plainly, by name (no bind, .call, apply or a name made of it)', odd.length === 0, odd.map((o) => where(o) + ' (' + o.how + ')'));
  const byRoad = Object.create(null);
  const bad = [];
  for (const c of calls) {
    const w = c.file + ':' + c.line;
    if (!c.road || !/^[A-Za-z0-9_]+$/.test(c.road)) { bad.push(w + ' ' + c.name + ' names no road as a plain string'); continue; }
    const row = Object.prototype.hasOwnProperty.call(XP_ROADS, c.road) ? XP_ROADS[c.road] : null;
    if (!row) { bad.push(w + ' names "' + c.road + '", which XP_ROADS has not got'); continue; }
    if (row.verb !== DOOR[c.name]) bad.push(w + ' ' + c.road + ' is a ' + row.verb + ', called by ' + c.name);
    if (row.at.split(' ')[0] !== c.file) bad.push(w + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
    (byRoad[c.road] = byRoad[c.road] || []).push(w);
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
