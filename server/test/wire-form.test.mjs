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
 *   4b. in every mode the door refuses what the door of v2.3.5184 refused,
 *      for the same why (sitting 58's hold: count mode must never let an
 *      old refusal in);
 *   5. the table: every `form` names a field its row's `trust` names, in a
 *      form the door reads; the three reads the table did not name have
 *      their rows (player_attack dmgBase and critChance, move dead,
 *      trade2_cancel id); and the table's forms are a pinned list;
 *   6. the cap: state_sync's `wireForm` is 1 (refusing), 2 (counting), or
 *      absent with the switch thrown;
 *   7. v2.3.6446 (sitting 59's mend): THE ROOM, FRAME BY FRAME, BY EVERY
 *      VALUE OF THE SWITCH.  39 frames (FRAMES: each form's edges, a
 *      list's member in another case or wrapped in an array, a field at the
 *      frame's top beside a payload or at both roots, a request string of
 *      8,192 and 8,193, a request id let in twice) through a running room's
 *      socket under eleven values of `wireform` (absent, true, 'on', 1,
 *      ['count'], 'COUNT' refuse; 'count' counts; false, 0, '', null read
 *      no form): each frame's refusal, its count, its field's book and the
 *      repeat door; the books whole (a field twice is counted twice); the
 *      cap; the `[wireform]` log lines (count mode only, the first 20); the
 *      owner's overview (`wireDoor`: off, mode, refused, counts, forms).
 *      §3 and §5 also hold the edges of the forms no row names yet (`int`,
 *      `str:<n>`, `num|str:<n>`, an array's path) and of formKnown.
 *
 * BREAK PROOF (v2.3.6446, sitting 59): the mutation pass over every branch
 * and comparison #2310 added (door.js, liveops.js, and the lines that carry
 * them in lists.js and join.js: 102 mutants, each against this suite alone;
 * scratchpad mend/mut-wireform.txt) kills 98; before §7, 57.  The four left
 * are equivalent: `num`'s `typeof` beside Number.isFinite (which never
 * coerces); `mode !== 'on'` for `mode === 'count'` where the count line
 * stands (off mode reads no form, so no form why reaches it); the log's
 * `key.slice(0, 96)` at 95 (every key is a row's type and field, shorter);
 * the overview's copy of a map (it leaves the room as JSON).  The review's
 * three (a list `x == v`; `f.wireform ? 'count' : 'off'`;
 * `roots.slice(0, 1)`) and three plants not designed for (a field's form
 * dropped in lists.js; count mode returning before the repeat door; a field
 * read only at the first root that carries it) are RED
 * (mend/plants-wireform.json).
 *
 * Not a phone test: node, card E's test room (testroom.mjs).  Under a
 * second. */
import { WIRE_FORM, wireDoorJudge, formWhy, formKnown } from '../src/wire/door.js';
import { WIRE_IN } from '../src/wire/in.js';
import { WIRE_RELAY } from '../src/wire/relays.js';
import { GameRoom } from '../src/index.js';
import { makeStorage, openRoom, fakeWs, join, settle, mockEnv } from './testroom.mjs';

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
    /* v2.3.6446 (sitting 59's mend: the mutation pass, scratchpad
       mut-wireform.txt): the forms no row names yet (`int`, `str:<n>`,
       `num|str:<n>`) have no path in the room (§7), so their edges are held
       here: a whole number past the safe ones, a thing with a `length` that
       is no string, a number that is not finite, a bound of 0 */
    ['int', 2 ** 53, 'form'], ['str:3', { length: 1 }, 'form'], ['str:3', ['a'], 'form'], ['str:0', '', 'form'],
    ['num|str:3', Infinity, 'form'], ['num|str:3', { length: 1 }, 'form'], ['num|str:3', ['a'], 'form'], ['num|str:0', 5, 'form'],
    ['num', '1e3', 'form'], ['num', Infinity, 'form'],
  ];
  const wrong = cases.filter(([f, v, want]) => formWhy(f, 'request', v) !== want);
  check('3: every form at its edges (a whole number, an id, words of a length, a closed list, yes or no)', wrong.length === 0, wrong);
  check('3: the trust\'s default: a request\'s string of at most STR_MAX; words, claim, look and bounded have none of the door\'s',
    formWhy(undefined, 'request', 'x'.repeat(WIRE_FORM.STR_MAX)) === '' && formWhy(undefined, 'request', 'x'.repeat(WIRE_FORM.STR_MAX + 1)) === 'form'
    && ['words', 'claim', 'look', 'bounded:_clampStat'].every((t) => formWhy(undefined, t, 'x'.repeat(WIRE_FORM.STR_MAX + 1)) === '')
    && formWhy(undefined, 'request', 5) === '' && formWhy(undefined, 'request', { a: 1 }) === '');
  /* v2.3.6446 (sitting 59's mend): a path through an array (`a[].b`) is
     held at EVERY element, not the first (no row names such a path yet, so
     the judge alone, on a table of its own) */
  const arr = new Map([['t', [['a[].b', 'request', 'count']]]]);
  check('3: a form on an array\'s path holds every element (the second out of form -> form a[].b)',
    wireDoorJudge({ type: 't', payload: { a: [{ b: 1 }, { b: -1 }] } }, arr) === 'form a[].b' && wireDoorJudge({ type: 't', payload: { a: [{ b: 1 }, { b: 2 }] } }, arr) === '');
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

/* ── 4b. v2.3.6443 (sitting 58's hold on #2310: `if (mode === 'count') why
   = ''` moved out of the form branch let EVERY old refusal in, green in four
   suites): in every mode the door refuses what the door of v2.3.5184
   refused, for the same why, and no handler hears it; count mode lets in a
   frame out of FORM only ── */
async function playOld(flags) {
  const st = makeStorage(new Map([['rpg:' + A, { _v: 21, coins: 100, level: 3, hp: 100, maxHp: 100, inventory: {} }]]));
  const room = await openRoom(st, flags);
  const ws = await join(room, fakeWs('b'), A, { name: 'Ada' });
  await settle();
  let heard = 0;
  const real = room._achvTitle;
  room._achvTitle = function (...a) { heard++; return real ? real.apply(this, a) : undefined; };
  for (const f of OLD_FRAMES) await room.webSocketMessage(ws, f);
  await settle();
  return { room, heard, sess: room.sessions.get(ws) };
}
/* each refused by the old door: a body that is no object, a key that is
   never a field, a request id out of its form, a number that is not finite
   (beside a field out of form: the old why comes first) */
const OLD_FRAMES = [
  '{"type":"achv_title","payload":[1]}',
  '{"type":"achv_title","payload":{"id":"t2","__proto__":{"x":1}}}',
  '{"type":"achv_title","payload":{"id":"t2"},"reqId":{"a":1}}',
  '{"type":"achv_title","payload":{"id":1e999}}',
];
{
  const whys = OLD_FRAMES.map((f) => wireDoorJudge(JSON.parse(f), undefined, { forms: false }));
  check('4b: each frame is refused by the door of v2.3.5184 (forms: false), never for its form', whys.every((w) => w && !w.startsWith('form ')), whys);
  const want = Object.create(null);
  for (const w of whys) { const k = 'achv_title ' + w.split(' ')[0]; want[k] = (want[k] || 0) + 1; }
  for (const [label, flags] of [['absent', undefined], ['\'count\'', { wireform: 'count' }], ['false', { wireform: false }]]) {
    const r = await playOld(flags);
    const got = r.room._wireDoorCounts || {};
    const same = Object.keys(want).every((k) => got[k] === want[k]);
    check('4b: wireform ' + label + ': every old refusal still refused (no handler heard it), counted under its old why',
      r.heard === 0 && same && r.sess.wireDoor === OLD_FRAMES.length, { heard: r.heard, got, want, wireDoor: r.sess.wireDoor });
  }
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
  /* v2.3.6446 (sitting 59's mend: the mutation pass): formKnown is the
     table's guard, so its own edges are held -- each form the door reads is
     known, and an empty list, a list with a member that is no word or no
     finite number, a bound of 0 or of six digits, a word in capitals or with
     more after it are not */
  const KNOWN = ['count', 'int', 'num', 'yes', 'id', 'str:1', 'str:99999', 'num|str:5', ['gold'], [1, 'a']];
  const UNKNOWN = [[], ['gold', {}], [Infinity], 'nonsense', 'str:0', 'str:100000', 'STR:3', 'str:3x', 'num|str:0', 'num|str:3x', 'xnum|str:3', 5, null];
  const known = KNOWN.filter((f) => !formKnown(f)).concat(UNKNOWN.filter((f) => formKnown(f)));
  check('5: formKnown at its edges (every form the door reads, and none else)', known.length === 0, known);
  /* v2.3.6443 (sitting 58: the rows' forms were unpinned -- a form dropped
     or loosened stayed green): every form the table holds, written out.  A
     change to a row's form changes this list in the same PR. */
  const PINNED = {
    move: { dead: 'yes' },
    player_attack: { dmgBase: 'num', critChance: 'num' },
    bank_deposit: { kind: ['gold', 'item'], id: 'id', n: 'count', opId: 'id' },
    bank_withdraw: { kind: ['gold', 'item'], id: 'id', n: 'count', opId: 'id' },
    gamble_request: { wager: 'count' },
    ace_flip_request: { stake: 'count' },
    jackpot_deposit: { amount: 'count' },
    trade2_cancel: { id: 'id' },
  };
  const held = Object.create(null);
  for (const r of [...WIRE_IN, ...WIRE_RELAY]) if (Object.prototype.hasOwnProperty.call(r, 'form')) held[r.name] = r.form;
  check('5: the table\'s forms are the pinned list, row for row and field for field (a form dropped, added or loosened is red)',
    JSON.stringify(Object.keys(held).sort().map((k) => [k, held[k]])) === JSON.stringify(Object.keys(PINNED).sort().map((k) => [k, PINNED[k]])),
    { held, PINNED });
  const row = (name) => WIRE_IN.find((r) => r.name === name);
  const named = [['player_attack', 'dmgBase'], ['player_attack', 'critChance'], ['move', 'dead'], ['trade2_cancel', 'id']];
  check('5: the three reads the table did not name have their rows', named.every(([t, f]) => row(t) && row(t).trust && Object.prototype.hasOwnProperty.call(row(t).trust, f)), named.filter(([t, f]) => !(row(t) && row(t).trust && Object.prototype.hasOwnProperty.call(row(t).trust, f))));
}

/* ── 7. v2.3.6446 (sitting 59's mend, card DG; the review of #2310 found
   `form.some((x) => x == v)` let `kind: ['gold']` in, `f.wireform ? 'count'
   : 'off'` made the documented refusing `true` only count, and
   `roots.slice(0, 1)` let a field at the frame's top beside a payload in --
   all green here; the mutation pass, scratchpad mend/mut-wireform.txt,
   found 45 of 102 mutants green): THE ROOM, FRAME BY FRAME, BY EVERY VALUE
   OF THE SWITCH.  Each frame of FRAMES is played through a running room's
   socket, once for each value the live flag may hold; for each frame the
   room's own books are read (the socket's wireDoor, `_wireDoorCounts`,
   `_wireFormSeen`), and at the end the cap, the `[wireform]` log lines and
   the owner's overview (GET /api/admin/overview `wireDoor`) ── */
const KEY7 = 'wire-form-admin';
const D7 = (over, top) => ({ type: 'bank_deposit', payload: { kind: 'gold', n: 5, opId: 'op_7', ...over }, ...top });
/* [label, frame, the `<type> <field>` out of form, or null when in form] */
const FRAMES = [
  ['an honest gold deposit', D7(), null],
  ['an item by a key of 96 (the id\'s longest)', D7({ kind: 'item', id: 'x'.repeat(96), n: 3 }), null],
  ['an id of every kind of character it may hold', D7({ kind: 'item', id: 'bp_a1-B.c:d' }), null],
  ['n 0 (a count\'s least)', D7({ n: 0 }), null],
  ['n the largest safe whole number', D7({ n: 2 ** 53 - 1 }), null],
  ['null in every formed field', D7({ n: null, id: null, opId: null }), null],
  ['kind [\'gold\'] (the review\'s `x == v`)', D7({ kind: ['gold'] }), 'bank_deposit kind'],
  ['kind "Gold"', D7({ kind: 'Gold' }), 'bank_deposit kind'],
  ['n -1', D7({ n: -1 }), 'bank_deposit n'],
  ['n 2^53 (past the safe ones)', D7({ n: 2 ** 53 }), 'bank_deposit n'],
  ['n 1.5', D7({ n: 1.5 }), 'bank_deposit n'],
  ['n "5"', D7({ n: '5' }), 'bank_deposit n'],
  ['an id of 97', D7({ kind: 'item', id: 'x'.repeat(97) }), 'bank_deposit id'],
  ['an empty id', D7({ kind: 'item', id: '' }), 'bank_deposit id'],
  ['an id with a space', D7({ kind: 'item', id: 'a b' }), 'bank_deposit id'],
  ['an id with a slash', D7({ kind: 'item', id: 'ab/c' }), 'bank_deposit id'],
  ['an id with a line break', D7({ kind: 'item', id: 'ab\ncd' }), 'bank_deposit id'],
  ['an opId that is a number', D7({ opId: 5 }), 'bank_deposit opId'],
  ['wager -5 at the frame\'s top beside a payload (the review\'s `roots.slice(0, 1)`)', { type: 'gamble_request', payload: {}, wager: -5 }, 'gamble_request wager'],
  ['wager -5 in the payload', { type: 'gamble_request', payload: { wager: -5 } }, 'gamble_request wager'],
  /* both roots are held, whichever carries the field: one in form never
     covers the other out of form (sitting 59's own plant WF-O3) */
  ['wager 5 in the payload, -5 at the top', { type: 'gamble_request', payload: { wager: 5 }, wager: -5 }, 'gamble_request wager'],
  ['wager -5 in the payload, 5 at the top', { type: 'gamble_request', payload: { wager: -5 }, wager: 5 }, 'gamble_request wager'],
  /* a frame count mode lets in goes on as the door of v2.3.5184 let it
     on: the repeat door (reqonce.js) still drops its request id's second
     coming (sitting 59's own plant WF-O2: `return false` in count mode
     skipped it, green).  The fourth: this frame repeats the request id of
     the one before it */
  ['a gamble rq-w1, wager -5', { type: 'gamble_request', payload: { wager: -5, reqId: 'rq-w1' } }, 'gamble_request wager'],
  ['...the same request id again', { type: 'gamble_request', payload: { wager: -5, reqId: 'rq-w1' } }, 'gamble_request wager', true],
  ['an honest gamble rq-g0, wager 0', { type: 'gamble_request', payload: { wager: 0, reqId: 'rq-g0' } }, null],
  ['...the same request id again', { type: 'gamble_request', payload: { wager: 0, reqId: 'rq-g0' } }, null, true],
  ['stake 1.5', { type: 'ace_flip_request', payload: { stake: 1.5 } }, 'ace_flip_request stake'],
  ['amount "9"', { type: 'jackpot_deposit', payload: { amount: '9' } }, 'jackpot_deposit amount'],
  ['a move, dead true', { type: 'move', x: 100, y: 100, dead: true }, null],
  ['a move, dead 1', { type: 'move', x: 100, y: 100, dead: 1 }, 'move dead'],
  ['a move, dead "yes"', { type: 'move', x: 100, y: 100, dead: 'yes' }, 'move dead'],
  ['an attack, dmgBase -1.5', { type: 'player_attack', payload: { kind: 'melee', dmgBase: -1.5 } }, null],
  ['an attack, dmgBase "abc"', { type: 'player_attack', payload: { kind: 'melee', dmgBase: 'abc' } }, 'player_attack dmgBase'],
  ['a trade cancelled by an id', { type: 'trade2_cancel', payload: { id: 'tr_1' } }, null],
  ['a trade cancelled by an id of 97', { type: 'trade2_cancel', payload: { id: 'x'.repeat(97) } }, 'trade2_cancel id'],
  /* a `request` field with no form of its row: a string of at most 8,192
     (written out: the bound is the door's promise, not WIRE_FORM's
     whatever-it-is); a thing with a `length` that is no string is no string */
  ['a request string of 8,192', { type: 'achv_title', payload: { id: 'x'.repeat(8192) } }, null],
  ['a request string of 8,193', { type: 'achv_title', payload: { id: 'x'.repeat(8193) } }, 'achv_title id'],
  ['a request field { length: 9000 }', { type: 'achv_title', payload: { id: { length: 9000 } } }, null],
  ['a request field 5', { type: 'achv_title', payload: { id: 5 } }, null],
];
/* every value the live flag may hold, and the mode each means (liveops.js
   _wireFormMode's header: absent or any other value refuses, the word
   'count' counts, a falsy value reads no form) */
const SWITCH = [
  ['absent', undefined, 'on'], ['true', true, 'on'], ['\'on\'', 'on', 'on'], ['1', 1, 'on'], ['[\'count\']', ['count'], 'on'],
  ['\'COUNT\'', 'COUNT', 'on'], ['\'count\'', 'count', 'count'], ['false', false, 'off'], ['0', 0, 'off'], ['\'\'', '', 'off'], ['null', null, 'off'],
];
const CAP7 = { on: 1, count: 2, off: undefined };
const delta = (after, before) => {
  const d = Object.create(null);
  for (const k of Object.keys(after || {})) if ((after[k] || 0) !== ((before || {})[k] || 0)) d[k] = after[k] - ((before || {})[k] || 0);
  return d;
};
const sum = (list) => { const o = Object.create(null); for (const k of list) o[k] = (o[k] || 0) + 1; return o; };
const same = (a, b) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));
async function room7(flags) {
  const st = makeStorage(new Map([['rpg:' + A, { _v: 21, coins: 100, level: 3, hp: 100, maxHp: 100, inventory: {} }]]));
  const room = new GameRoom(st, { ...mockEnv, ADMIN_KEY: KEY7 });
  await room._liveFlagsEnsure();
  if (flags) Object.assign(room._liveFlags, flags);
  const ws = await join(room, fakeWs('s7'), A, { name: 'Ada' });
  await settle();
  return { room, ws, sess: room.sessions.get(ws) };
}
const overview7 = async (room) => (await room.fetch(new Request('https://x/api/admin/overview', { headers: { Authorization: 'Bearer ' + KEY7 } }))).json();
{
  const bads = FRAMES.filter((f) => f[2]);
  check('7: the frames hold more out of form than the count mode logs (' + bads.length + ' > LOG_FIRST 20), and some twice by one field',
    bads.length > 20 && Object.values(sum(bads.map((f) => f[2]))).some((n) => n > 1));
  for (const [label, value, mode] of SWITCH) {
    const { room, ws, sess } = await room7(value === undefined ? null : { wireform: value });
    const warns = [];
    const back = console.warn;
    console.warn = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[wireform]')) warns.push(s); };
    const wrong = [];
    try {
      for (const [what, frame, out, again] of FRAMES) {
        const b = { door: sess.wireDoor || 0, again: sess.reqAgain || 0, counts: { ...room._wireDoorCounts }, forms: { ...room._wireFormSeen } };
        await room.webSocketMessage(ws, JSON.stringify(frame));
        const got = { refused: (sess.wireDoor || 0) - b.door, again: (sess.reqAgain || 0) - b.again, counts: delta(room._wireDoorCounts, b.counts), forms: delta(room._wireFormSeen, b.forms) };
        const want = {
          refused: out && mode === 'on' ? 1 : 0,
          again: again && !(out && mode === 'on') ? 1 : 0,
          counts: out && mode === 'on' ? { [frame.type + ' form']: 1 } : {},
          forms: out && mode !== 'off' ? { [out]: 1 } : {},
        };
        if (got.refused !== want.refused || got.again !== want.again || !same(got.counts, want.counts) || !same(got.forms, want.forms)) wrong.push({ what, got, want });
      }
    } finally { console.warn = back; }
    await settle();
    check('7: wireform ' + label + ' (' + mode + '): each frame let in or refused, counted and booked by its field as its mode says, a request id let in twice dropped by the repeat door',
      wrong.length === 0 && room.sessions.has(ws), wrong.slice(0, 3));
    /* the books whole: a field out of form twice is counted twice */
    const wantForms = mode === 'off' ? {} : sum(bads.map((f) => f[2]));
    const wantCounts = mode === 'on' ? sum(bads.map((f) => f[1].type + ' form')) : {};
    check('7: wireform ' + label + ': `_wireFormSeen` and the refusals\' counts, whole', same(room._wireFormSeen || {}, wantForms) && same(room._wireDoorCounts || {}, wantCounts),
      { forms: room._wireFormSeen, counts: room._wireDoorCounts });
    const sync = ws.sent.find((m) => m && m.type === 'state_sync');
    check('7: wireform ' + label + ': the cap wireForm is ' + CAP7[mode], !!sync && sync.caps && sync.caps.wireForm === CAP7[mode], sync && sync.caps && sync.caps.wireForm);
    /* the log: count mode alone says "would refuse", the first LOG_FIRST
       (20) of the room's life, in the order they came; a refusal is
       logged by `[wiredoor]`, never here */
    const wantWarns = mode === 'count' ? bads.slice(0, 20).map((f) => '[wireform] would refuse ' + f[2]) : [];
    check('7: wireform ' + label + ': the `[wireform]` log lines', JSON.stringify(warns) === JSON.stringify(wantWarns), { got: warns.length, first: warns[0], last: warns[warns.length - 1] });
    const o = await overview7(room);
    const w = o && o.wireDoor;
    check('7: wireform ' + label + ': the owner\'s overview says the mode, the refusals and both books',
      !!w && w.off === false && w.mode === mode && w.refused === (mode === 'on' ? bads.length : 0) && same(w.counts || {}, wantCounts) && same(w.forms || {}, wantForms), w);
  }
  /* the door thrown whole (`wiredoor: false`): the overview says so */
  const { room } = await room7({ wiredoor: false });
  const o = await overview7(room);
  check('7: wiredoor false: the overview\'s `off` is true', !!(o && o.wireDoor && o.wireDoor.off === true), o && o.wireDoor);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
