/* ═══ v2.3.6443: THE WIRE DOOR HOLDS A FIELD TO ITS FORM (card DG PR 4; grand plan step 4.1) ═══
 *
 * The review (docs/plan/census/shape-doors.md, tools/dev/plants/judge.mjs)
 * found the door let in `bank_deposit` with `n` as "5", -5, 1.5, true, {},
 * [1,2] and an `id` of 15,000 characters: it held a named field only to "no
 * number that is not finite" (and a `words` field to a string of 2,000).
 * Now a named field has a form (wire/door.js WIRE_FORM): its row's, in the
 * wire table's `form` column (in.js), or its trust's default (a `request`
 * field's string of at most STR_MAX).
 *
 *   1. judge.mjs's list: each of those is refused (`form n`, `form id`),
 *      and the honest deposit passes;
 *   2. the order: `null` passes; a frame the old door refused is refused
 *      for the same why (`number`, `words`), never `form`; `forms: false`
 *      judges as the door of v2.3.5184;
 *   3. each form's edges (formWhy);
 *   4. the room, by the live flag: absent, a frame out of form reaches no
 *      handler and is counted (`<type> form`, and `_wireFormSeen` by type
 *      and field); `wireform: 'count'`, it reaches its handler and is
 *      counted; `wireform: false`, nothing read, nothing counted;
 *   5. the table: every `form` names a field its row's `trust` names, in a
 *      form the door reads; the three reads the table did not name have
 *      their rows (player_attack dmgBase and critChance, move dead,
 *      trade2_cancel id);
 *   6. the cap: state_sync's `wireForm` is 1 (refusing), 2 (counting), or
 *      absent with the switch thrown.
 *
 * Not a phone test: node, card E's test room (testroom.mjs).  Under a
 * second. */
import { WIRE_FORM, wireDoorJudge, formWhy, formKnown } from '../src/wire/door.js';
import { WIRE_IN } from '../src/wire/in.js';
import { WIRE_RELAY } from '../src/wire/relays.js';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
};
const A = 'bp_wireform_a';
const dep = (over) => ({ type: 'bank_deposit', payload: { kind: 'gold', n: 5, opId: 'op_1', reqId: 'r1', ...over } });

/* ── 1. judge.mjs's list ── */
{
  const bad = [['"5"', '5'], ['-5', -5], ['1.5', 1.5], ['true', true], ['{}', {}], ['[1,2]', [1, 2]], ['1e308', 1e308]];
  const got = bad.map(([label, n]) => [label, wireDoorJudge(dep({ n }))]);
  check('1: bank_deposit n as "5", -5, 1.5, true, {}, [1,2], 1e308 -> form n', got.every(([, w]) => w === 'form n'), got);
  check('1: ...an id of 15,000 characters -> form id', wireDoorJudge(dep({ kind: 'item', id: 'x'.repeat(15000) })) === 'form id');
  check('1: ...a kind out of its list, an opId that is an array -> form kind, form opId',
    wireDoorJudge(dep({ kind: { a: 1 } })) === 'form kind' && wireDoorJudge(dep({ opId: new Array(1000).fill('x') })) === 'form opId');
  check('1: ...the honest deposits pass (gold, and an item by its key)', wireDoorJudge(dep()) === '' && wireDoorJudge(dep({ kind: 'item', id: 'raw_shrimp', n: 3 })) === '');
  check('1: player_attack dmgBase "abc", critChance 1e999 (now named) -> refused',
    wireDoorJudge({ type: 'player_attack', payload: { kind: 'melee', dmgBase: 'abc' } }) === 'form dmgBase'
    && wireDoorJudge(JSON.parse('{"type":"player_attack","payload":{"kind":"melee","critChance":1e999}}')) === 'number critChance');
  check('1: move dead "yes" (now named) -> form dead; dead true passes',
    wireDoorJudge({ type: 'move', x: 1, y: 2, dead: 'yes' }) === 'form dead' && wireDoorJudge({ type: 'move', x: 1, y: 2, dead: true }) === '');
  check('1: trade2_cancel id of 15,000 characters (now named) -> form id',
    wireDoorJudge({ type: 'trade2_cancel', payload: { id: 'x'.repeat(15000) } }) === 'form id');
}

/* ── 2. the order ── */
{
  check('2: null passes where a form is named (a page\'s NaN arrives as null)', wireDoorJudge(dep({ n: null, id: null })) === '');
  check('2: a field the row does not name passes untouched', wireDoorJudge(dep({ extra: 'x'.repeat(5000) })) === '');
  const two = JSON.parse('{"type":"bank_deposit","payload":{"kind":"gold","n":"5","opId":"op","id":1e999}}');
  check('2: the old door\'s why first: a non-finite number beside a field out of form -> number', wireDoorJudge(two) === 'number id', wireDoorJudge(two));
  const off = [dep({ n: '5' }), dep({ n: -5 }), dep({ kind: 'item', id: 'x'.repeat(15000) }), { type: 'move', x: 1, y: 2, dead: 'yes' }];
  check('2: forms: false judges as the door of v2.3.5184 (every one of these let in)', off.every((m) => wireDoorJudge(m, undefined, { forms: false }) === ''));
}

/* ── 3. each form's edges ── */
{
  const cases = [
    ['count', 0, ''], ['count', 7, ''], ['count', -1, 'form'], ['count', 0.5, 'form'], ['count', '1', 'form'], ['count', 2 ** 53, 'form'],
    ['int', -3, ''], ['int', 1.5, 'form'], ['num', -1.5, ''], ['num', '1', 'form'], ['yes', false, ''], ['yes', 0, 'form'],
    ['id', 'bp_a1-B.c:d', ''], ['id', '', 'form'], ['id', 'a b', 'form'], ['id', 'x'.repeat(96), ''], ['id', 'x'.repeat(97), 'form'], ['id', 5, 'form'],
    ['str:3', 'abc', ''], ['str:3', 'abcd', 'form'], ['str:3', 3, 'form'],
    ['num|str:3', 4, ''], ['num|str:3', 'abc', ''], ['num|str:3', 'abcd', 'form'], ['num|str:3', true, 'form'],
    [['gold', 'item'], 'gold', ''], [['gold', 'item'], 'pet', 'form'], [[1, 2], 2, ''],
    ['nonsense', 1, 'form'],
  ];
  const wrong = cases.filter(([f, v, want]) => formWhy(f, 'request', v) !== want);
  check('3: every form at its edges (a whole number, an id, words of a length, a closed list, yes or no)', wrong.length === 0, wrong);
  check('3: the trust\'s default: a request\'s string of at most STR_MAX; words, claim, look and bounded have none of the door\'s',
    formWhy(undefined, 'request', 'x'.repeat(WIRE_FORM.STR_MAX)) === '' && formWhy(undefined, 'request', 'x'.repeat(WIRE_FORM.STR_MAX + 1)) === 'form'
    && ['words', 'claim', 'look', 'bounded:_clampStat'].every((t) => formWhy(undefined, t, 'x'.repeat(WIRE_FORM.STR_MAX + 1)) === '')
    && formWhy(undefined, 'request', 5) === '' && formWhy(undefined, 'request', { a: 1 }) === '');
}

/* ── 4. the room, by the live flag ── */
async function play(flags) {
  const st = makeStorage(new Map([['rpg:' + A, { _v: 21, coins: 100, level: 3, hp: 100, maxHp: 100, inventory: {} }]]));
  const room = await openRoom(st, flags);
  const ws = await join(room, fakeWs('a'), A, { name: 'Ada' });
  await settle();
  const seen = [];
  const real = room._achvTitle;
  room._achvTitle = function (...a) { seen.push(a[1] && a[1].id); return real ? real.apply(this, a) : undefined; };
  await room.webSocketMessage(ws, JSON.stringify({ type: 'achv_title', payload: { id: 'x'.repeat(WIRE_FORM.STR_MAX + 1) } }));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'achv_title', payload: { id: 't2' } }));
  await settle();
  const sync = ws.sent.find((m) => m && m.type === 'state_sync');
  return { room, ws, seen, sess: room.sessions.get(ws), cap: sync && sync.caps ? sync.caps.wireForm : 'no state_sync' };
}
{
  const on = await play();
  check('4: absent: a frame out of form reaches no handler; the frame in form goes on', on.seen.length === 1 && on.seen[0] === 't2', on.seen.map((s) => String(s).slice(0, 8)));
  check('4: ...counted as a refusal (`achv_title form`, the socket\'s wireDoor) and by its field',
    on.room._wireDoorCounts && on.room._wireDoorCounts['achv_title form'] === 1 && on.sess.wireDoor === 1 && on.room._wireFormSeen['achv_title id'] === 1,
    [on.room._wireDoorCounts, on.sess.wireDoor, on.room._wireFormSeen]);
  const count = await play({ wireform: 'count' });
  check('4: wireform \'count\': both frames reach the handler', count.seen.length === 2, count.seen.length);
  check('4: ...counted by its field, never as a refusal', count.room._wireFormSeen['achv_title id'] === 1 && !count.sess.wireDoor && !(count.room._wireDoorCounts && count.room._wireDoorCounts['achv_title form']));
  const off = await play({ wireform: false });
  check('4: wireform false: both reach the handler, nothing counted (the door of v2.3.5184)', off.seen.length === 2 && !off.room._wireFormSeen && !off.sess.wireDoor);
  check('6: the cap: wireForm 1 refusing, 2 counting, absent with the switch thrown', on.cap === 1 && count.cap === 2 && off.cap === undefined, [on.cap, count.cap, off.cap]);
}

/* ── 5. the table ── */
{
  const bad = [];
  let n = 0;
  for (const r of [...WIRE_IN, ...WIRE_RELAY]) {
    if (!Object.prototype.hasOwnProperty.call(r, 'form')) continue;
    if (!r.form || typeof r.form !== 'object' || Array.isArray(r.form)) { bad.push(r.name + ': form is no object'); continue; }
    for (const [path, form] of Object.entries(r.form)) {
      n++;
      if (!(r.trust && Object.prototype.hasOwnProperty.call(r.trust, path))) bad.push(r.name + ' ' + path + ': named in form, not in trust');
      else if (r.trust[path] === 'words') bad.push(r.name + ' ' + path + ': a words field keeps its own bound');
      if (!formKnown(form)) bad.push(r.name + ' ' + path + ': ' + JSON.stringify(form) + ' is no form the door reads');
    }
  }
  check('5: every row\'s form names a field of its trust, in a form the door reads (' + n + ' fields)', bad.length === 0 && n > 0, bad);
  const row = (name) => WIRE_IN.find((r) => r.name === name);
  const named = [['player_attack', 'dmgBase'], ['player_attack', 'critChance'], ['move', 'dead'], ['trade2_cancel', 'id']];
  check('5: the three reads the table did not name have their rows', named.every(([t, f]) => row(t) && row(t).trust && Object.prototype.hasOwnProperty.call(row(t).trust, f)), named.filter(([t, f]) => !(row(t) && row(t).trust && Object.prototype.hasOwnProperty.call(row(t).trust, f))));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
