/* ═══ v2.3.5284: QUEST STATE'S DOOR (grand plan step 4.3, card R PR 5) ═══
 * (the door: server/src/queststate.js; the spec: docs/specs/quest-door.md)
 *
 * Every change to a quest's state -- its state (the hand-in), its progress
 * (the track), its flags, and the kept lists of a reward that did not fit --
 * goes through the door's seven verbs, each call naming its road in
 * QUEST_ROADS.  This suite holds it, as stash-door.test holds the stashes:
 *
 *   1. THE DOOR: a state from the closed list, progress capped, a quest
 *      forgotten, the maps loaded, a piece kept and the list taken whole; a
 *      map made with no prototype; a wrong road, verb, state or list throws,
 *      the state untouched;
 *   2. ONE DOOR: no quest state is written in server/src but queststate.js,
 *      by its name or through a name that holds it (v2.3.5291: `||=`, `??=`,
 *      `&&=`, `+=` and Object.assign too, the sitting 20 review); each shape
 *      planted and found;
 *   2b. (v2.3.6446, sitting 59) THE ALLOW LIST: quest state appears outside
 *      queststate.js only in a form the scan knows (a state or count read,
 *      a test, a copy, a name it follows, the door's verbs, a pure global, a
 *      function of the same file); handed to a function of another file,
 *      returned, put into an object or a list written out (a kept piece too)
 *      is RED unless a row of HANDED_OUT (6 at v2.3.6446; it only falls);
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, with its
 *      verb, from its row's file; every road has exactly one caller;
 *   4. THE GAME: a quest accepted, its signal counted, handed in, and the
 *      chain's next step opened, all through a room's own handlers.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-15:
 *   - `ps._quests[questId] = 'active';` put back in quests.js     -> FAIL 2 (a second writer)
 *   - `Math.min(QUEST_COUNT_MAX, ...)` made the plain sum            -> FAIL 1 (past the cap)
 *   - a second `questStateSet(ps, q, 'turnedIn', 'turn_in')` in devtools.js -> FAIL 3
 *   - (v2.3.5291) `ps._quests ||= Object.create(null);` in quests.js     -> FAIL 2
 *   - (v2.3.5291) `Object.assign(this.playerState[playerId]._questKills, body.x);`
 *     in devtools.js                                                     -> FAIL 2
 *   - (v2.3.6446) `this._questTidy(ps._quests)` in devtools.js (a function
 *     of another file)                                                  -> FAIL 2b (plants-scans.json)
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { QUEST_ROADS, QUEST_STATES, QUEST_KEPT, QUEST_COUNT_MAX, questStateSet, questCountAdd, questCountSet, questForget, questLoad, questKeep, questKeptTake } from '../src/queststate.js';
import { makeStorage, openRoom, join, fakeWs, settle, playTour, roomGuard } from './testroom.mjs';
import { writesOf, doorWrites, doorCalls, where } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6441: the scans read the syntax tree (card DG PR 2) */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}
const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };

/* ══════════ 1. THE DOOR ══════════ */
{
  const ps = {};
  questStateSet(ps, 'q1', 'active', 'accept');
  check('1. a state set makes the map, with no prototype (rule 4)', ps._quests && Object.getPrototypeOf(ps._quests) === null && ps._quests.q1 === 'active');
  questStateSet(ps, 'q1', 'turnedIn', 'turn_in');
  check('1. ...only a state on the list: anything else throws, the state untouched', QUEST_STATES.join() === 'available,active,turnedIn' && throws(() => questStateSet(ps, 'q1', 'done', 'turn_in')) && ps._quests.q1 === 'turnedIn');
  check('1. progress added, made with no prototype, and capped at ' + QUEST_COUNT_MAX, questCountAdd(ps, 'q2', 5, 'progress') === 5 && Object.getPrototypeOf(ps._questKills) === null && questCountAdd(ps, 'q2', QUEST_COUNT_MAX, 'progress') === QUEST_COUNT_MAX);
  questCountSet(ps, 'q3', 7, 'dev_count');
  check('1. progress set', ps._questKills.q3 === 7);
  questForget(ps, 'q3', 'dev_tour_reset');
  questStateSet(ps, 'q3', 'available', 'chain_next');
  questForget(ps, 'q3', 'dev_tour_reset');
  check('1. a quest forgotten: its state and progress gone', !('q3' in ps._quests) && !('q3' in ps._questKills));
  const parts = { _quests: { a: 'active' }, _questFlags: { f: true }, _questKills: { a: 2 } };
  questLoad(ps, parts, 'join_stored');
  check('1. a load sets the maps as given (the caller\'s own copies)', ps._quests === parts._quests && ps._questFlags === parts._questFlags && ps._questKills === parts._questKills);
  questKeep(ps, '_questWeaponUnfit', { n: 1 }, 'weapon_unfit');
  questKeep(ps, '_questWeaponUnfit', { n: 2 }, 'weapon_unfit');
  const took = questKeptTake(ps, '_questWeaponUnfit', 'unfit_drain');
  check('1. a piece kept, the list taken whole and emptied', took.length === 2 && ps._questWeaponUnfit === null && questKeptTake(ps, '_questWeaponUnfit', 'unfit_drain') === null);
  const before = JSON.stringify([ps._quests, ps._questKills]);
  const wrong = [
    () => questStateSet(ps, 'x', 'active', 'nope'),
    () => questStateSet(ps, 'x', 'active', 'progress'),               /* a count road, set */
    () => questCountAdd(ps, 'x', 1, 'accept'),                         /* a state road, counted */
    () => questKeep(ps, '_questGrantOverflow', {}, 'weapon_unfit'),    /* the other list */
    () => questKeptTake(ps, '_questWeaponUnfit', 'turn_in_clear'),
    () => questStateSet(ps, 'x', 'active', 'constructor'),
    () => questStateSet(ps, '', 'active', 'accept'),
  ];
  check('1. a wrong road, verb, list or id throws, the state untouched', wrong.every(throws) && JSON.stringify([ps._quests, ps._questKills]) === before);
  check('1. every keep or take road names a kept list', Object.values(QUEST_ROADS).every((r) => (r.verb === 'keep' || r.verb === 'kept') === QUEST_KEPT.includes(r.list)));
}

/* ══════════ 2. ONE DOOR ══════════ */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const files = srcFiles();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, SRC_DIR), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
/* v2.3.6441 (card DG PR 2): the scans read the syntax tree
   (tools/guards/lib/writesOf.mjs), never a pattern of text: a destructured
   map renamed (`const { _quests: qs } = ps`), a helper of the file handed the
   map, a spread put back through Object.assign (plants1 QUEST-1..3), and
   every spelling the v2.3.5291 review added (`||=`, `??=`, `&&=`). */
const raw = Object.create(null);
for (const f of files) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');
const SCAN = { containers: ['_quests', '_questKills', '_questFlags', ...QUEST_KEPT] };
const writesIn = (s) => writesOf(s, SCAN);
/* v2.3.6446 (sitting 59: a container handed to a function of ANOTHER file
   stayed green).  THE ALLOW LIST (writesOf opts.handout): quest state
   appears outside queststate.js only in a form the scan knows -- a read of a
   quest's state or count (a word, a number: it goes anywhere), a test, a
   copy, a name it follows, an argument of the door's verbs, of a pure global
   or of a function of the same file; a map or a kept list handed to a
   function of another file, returned, or put into an object or a list
   written out (a kept list's pieces are objects: a piece too) is a write the
   scan cannot follow, RED unless a row of HANDED_OUT (it only falls). */
const QUEST_DOORS = ['questStateSet', 'questCountAdd', 'questCountSet', 'questForget', 'questLoad', 'questKeep', 'questKeptTake'];
const SCAN_OUT = { ...SCAN, handout: { doors: QUEST_DOORS, objects: [...QUEST_KEPT] } };
const O = (file, fn, field, why) => ({ file, fn, field, out: true, n: 1, why });
const HANDED_OUT = [
  O('persistence.js', '_saveRpg', '_quests', 'the save: the map put into the stored record'),
  O('persistence.js', '_saveRpg', '_questFlags', 'the save: the flags put into the stored record'),
  O('persistence.js', '_saveRpg', '_questKills', 'the save: the counts put into the stored record'),
  O('persistence.js', '_sendPlayerState', '_quests', 'the echo: the map put into the player\'s message'),
  O('persistence.js', '_sendPlayerState', '_questFlags', 'the echo: the flags put into the player\'s message'),
  O('persistence.js', '_sendPlayerState', '_questKills', 'the echo: the counts put into the player\'s message'),
];
{
  const r = doorWrites(raw, { skip: ['queststate.js'], ...SCAN_OUT, listed: HANDED_OUT });
  check('2. no quest state is written in server/src but through the door (queststate.js), however it is spelled', r.found.length === 0, r.found.map(where));
  check('2. ...every HANDED_OUT row still holds its count (it only falls: a row whose place is gone is deleted)', r.stale.length === 0, r.stale);
  const outs = (t) => writesOf('function f(ps, id, q, x, claimed, pid) {\n' + t + '\n}', SCAN_OUT).filter((w) => w.out).length;
  check('2. ...ALLOW LIST: a map or a kept list handed where the scan cannot follow is red (a function of another file, a return, an object or a list written out, a kept piece)',
    outs('markAll(ps._quests, id);') && outs('return ps._questKills;') && outs('const o = { q: ps._quests }; send(o);') && outs('keep([ps._questFlags]);')
    && outs('this._fit(ps._questGrantOverflow[0]);') && outs('for (const w of ps._questWeaponUnfit) mail(w);') && outs('const m = ps._quests; this._tidy(m);'));
  check('2. ...and the allowed forms are not: a state or a count anywhere, a test, a copy, the door\'s verbs, a pure global',
    outs('log(ps._quests[id], ps._questKills[q] + 1);\nif (!ps._quests || typeof ps._quests !== \'object\') return;\nsend({ q: { ...ps._quests } });\nquestKeep(ps, \'_questWeaponUnfit\', ps._questWeaponUnfit[0], \'weapon_unfit\');\nconst n = Object.keys(ps._questKills).length + JSON.stringify(ps._quests).length;\nfor (const w of ps._questWeaponUnfit) say(w.name);') === 0);
  const plant = (t) => writesIn('function f(ps, id, q, x, claimed, pid) {\n' + t + '\n}').length;
  const mustFind = [
    'ps._quests[id] = \'active\';', 'ps._questKills = Object.create(null);', 'ps._questKills[q] += 1;', 'ps._questKills[q]++;',
    'delete ps._quests[q];', 'ps._questGrantOverflow.push(x);', 'ps._questWeaponUnfit = null;', 'ps[\'_questFlags\'] = {};',
    'const q2 = ps._quests || {};\nq2[id] = \'turnedIn\';', 'const k = ps._questKills;\ndelete k[id];',
    /* v2.3.5291 (the sitting 20 review): the shapes it missed */
    'ps._quests ||= {};', 'ps._questKills ??= Object.create(null);', 'ps._quests[id] ||= \'available\';', 'ps._questKills[q] += 2;',
    'ps._questFlags &&= null;', 'Object.assign(ps._quests, claimed);', 'Object.assign(this.playerState[pid]._questKills, x);', 'const q2 = ps._quests;\nObject.assign(q2, { a: 1 });',
    /* v2.3.6441: the shape review's (plants1 QUEST-1..3) */
    '{ const { _quests: qs } = ps; qs[id] = \'active\'; }', 'function mark(m, k, st) { m[k] = st; } mark(ps._quests, id, \'active\');', 'Object.assign(ps, { _quests: { ...ps._quests, [id]: \'active\' } });',
  ];
  const missed = mustFind.filter((t) => plant(t) === 0);
  check('2. ...the scanner finds each shape of a second writer (' + mustFind.length + ' planted)', missed.length === 0, missed);
  check('2. ...and reads a read as no write', plant('if (ps._quests[id] === \'active\') return;\nconst q2 = ps._quests || {};\nreturn q2[id] !== \'turnedIn\';\nconst y = { _quests: ps._quests || {} };') === 0);
}

/* ══════════ 3. ONE ROW, ONE PLACE ══════════ */
const DOOR = { questStateSet: 'state', questCountAdd: 'count', questCountSet: 'countSet', questForget: 'forget', questLoad: 'load', questKeep: 'keep', questKeptTake: 'kept' };
{
  /* v2.3.6441: by any receiver, read off the tree; the road is the last argument */
  const { calls, odd } = doorCalls(raw, { skip: ['queststate.js'], names: Object.keys(DOOR), road: (args) => args[args.length - 1] || null });
  check('3. the door is called plainly, by name (no bind, .call, apply or a name made of it)', odd.length === 0, odd.map((o) => where(o) + ' (' + o.how + ')'));
  const byRoad = Object.create(null);
  const bad = [];
  for (const c of calls) {
    const w = c.file + ':' + c.line;
    if (!c.road || !/^[A-Za-z0-9_]+$/.test(c.road)) { bad.push(w + ' ' + c.name + ' names no road as a plain string'); continue; }
    if (!Object.prototype.hasOwnProperty.call(QUEST_ROADS, c.road)) { bad.push(w + ' names "' + c.road + '", which QUEST_ROADS has not got'); continue; }
    const row = QUEST_ROADS[c.road];
    if (row.verb !== DOOR[c.name]) bad.push(w + ' ' + c.road + ' is a ' + row.verb + ', called by ' + c.name);
    if (row.at.split(' ')[0] !== c.file) bad.push(w + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
    (byRoad[c.road] = byRoad[c.road] || []).push(w);
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file', bad.length === 0, bad);
  const none = Object.keys(QUEST_ROADS).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', none.length === 0, none);
  check('3. no road has two callers, by any receiver (a second place is a second row)', twice.length === 0, twice);
}

/* ══════════ 4. THE GAME ══════════ */
{
  const room = await openRoom(makeStorage());
  const ws = fakeWs('q');
  await join(room, ws, 'bp_qd_a', { loginTaken: true });
  const ps = room.playerState.bp_qd_a;
  const table = room._QUEST_REWARDS_DATA();
  /* a quest that opens a next step and whose objective is a counted kind */
  const qid = Object.keys(table).find((k) => table[k] && table[k].next && table[k].objective && table[k].objective.type === 'kill' && !table[k].objective.zone && !(table[k].gate));
  check('4. a kill quest with a next step exists to play', !!qid, qid);
  if (qid) {
    const obj = table[qid].objective;
    questLoad(ps, { _quests: Object.assign(Object.create(null), ps._quests || {}), _questKills: Object.assign(Object.create(null), ps._questKills || {}) }, 'join_stored');
    ps._qdTry = true;
    await room._handleQuestAccept(room.sessions.get(ws) || { id: 'bp_qd_a' }, { questId: qid });
    const accepted = ps._quests && ps._quests[qid] === 'active';
    for (let i = 0; i < (obj.count || 1); i++) room._creditQuestObjective('bp_qd_a', 'kill', obj.arch || 'x', null, 1);
    const counted = ps._questKills && ps._questKills[qid] >= (obj.count || 1);
    check('4. accepted and counted through the room\'s handlers (the door underneath)', accepted && counted, { state: ps._quests && ps._quests[qid], kills: ps._questKills && ps._questKills[qid] });
    const sess = room.sessions.get(ws) || { id: 'bp_qd_a' };
    await room._handleQuestTurnIn(sess, { questId: qid, xpCat: 'sword' });   /* a prog3 player names its skill (prog3.js SKILLS) */
    await settle();
    const next = table[qid].next;
    check('4. ...handed in, and the chain\'s next step opened', ps._quests[qid] === 'turnedIn' && (ps._quests[next] === 'available' || ps._quests[next] === 'active' || ps._quests[next] === 'turnedIn'), { state: ps._quests[qid], next: ps._quests[next] });
  }
}

await settle();
/* ══════════ R. THE RUNNING ROOM (v2.3.6440, card DG PR 1) ══════════
   The tour (testroom.mjs playTour: a quest handed in) played on a guarded
   room.  A second writer of quest state planted on its paths is refused there,
   however it is spelled (Object.assign, `||=`, a computed key, an alias, a
   destructure, `delete`), and fails this suite: testroom.mjs "THE RUNNING
   ROOM REFUSES".  Break proof: plants1.json (tools/dev/plants/). */
{
  const t = await playTour({ tag: 'quest' });
  check('R. the tour plays under the running room\'s guard', roomGuard.armed());
  check('R. ...the guard is ON the tour\'s record (coins its accessor, the bag its Proxy, the room\'s map the guarded one: the purpose review, sitting 56)', roomGuard.holds(t.ps, t.room).length === 0, roomGuard.holds(t.ps, t.room));
  check('R. ...each of its steps did what it does (a quest handed in, paid)', t.steps.length > 0 && t.steps.every((x) => x.paid), t.steps);
  check('R. ...and no write of a guarded field was refused (testroom.mjs)', roomGuard.refusals().length === 0, roomGuard.refusals().slice(0, 5));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('quest-door: FAILED'); process.exit(1); }
console.log('all quest-door checks passed');
