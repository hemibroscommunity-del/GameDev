/* ═══ v2.3.5701: A JOIN'S ID IS A STRING OF THE ID'S FORM (card SEC PR 2) ═══
 *
 * The join's magic-name gate (join.js MAGIC_IDS, v2.3.1202 / v2.3.3167)
 * asked only of strings.  An `id` that was a list, a number, a boolean or an
 * object went on to the account check and the body: records were written
 * under `auth:__proto__`-like keys (`rpg:[object Object]`, `auth:1,a`), two
 * live sessions could share one character (`[1]` and `"1"` are one key),
 * and the owner's kick, freeze and silence, which look a player up by a
 * string, answered "not online" for it.
 *
 * Now a join whose `id` is present (not undefined, not null: a join with no
 * id is today's, untouched) and is not 1 to 64 of A-Z a-z 0-9 _ is given
 * the magic-name gate's own answer (`join_rejected` reason `auth`, close
 * 4003), with nothing read or written first.  THE CENSUS of every way an id
 * is made, all inside that form:
 *   - a character's id: `bp_` + a base-36 hash + `_` + the key's first two
 *     words (server/src/account.js accountPassphraseToId, the client's
 *     src/networking/index.js passphraseToId; words a-z): about 25 chars;
 *   - a new Login Key's id: the character's own `bp_` id, kept beside the
 *     key (loginkeys.js `key_new {key, id}`, networking/index.js idForKey);
 *   - a guest's and a private-mode fallback: Math.random().toString(36)
 *     .slice(2, 10), up to 8 of a-z 0-9 (the page's `myId`, made as it starts);
 *   - the load and lab bots and the probes: `lt...`, `lab...`, `rb3_...`,
 *     `probe_gh_actions` (tools/qa/load/, tools/qa/probe-room.mjs);
 *   - the suites: a full `npm test` run logged every id joined: letters,
 *     digits and `_`, the longest 16 (upper case in some: kept);
 *   - the owner's export (admin.js ID_RE) is wider (`.`, `-`, 120): no id
 *     the game makes uses them, so the join's form is the narrower one.
 *
 * KILL SWITCH `joinidform: false` in the live flags: the old way (only the
 * magic names refused).  No cap: an honest phone never meets the refusal.
 *
 * BREAK PROOF (rule 8), tried by hand: `joinIdMalformed` returning false
 * always (main's way) -> FAIL 1 (every bad id joins and writes).
 * docs/specs/identity.md (3, the id's form).
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, baseSession, settle } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const quiet = () => { const o = { log: console.log, warn: console.warn, error: console.error }; console.warn = () => {}; console.error = () => {}; return () => Object.assign(console, o); };

/** A join of `id` on a fresh room: what it answered, and what it left. */
async function tryJoin(id, flags) {
  const mem = makeStorage();
  const room = await openRoom(mem, flags);
  await settle();
  const before = new Set(mem._store.keys());
  const batches = mem.batches();
  const ws = fakeWs('j');
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', name: 'Ada', phrase: 'blaze-frost-nova-titan-42', protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'town' } };
  if (id !== '(absent)') msg.id = id;
  const back = quiet();
  try { await room.webSocketMessage(ws, JSON.stringify(msg)); await settle(); } finally { back(); }
  const added = [...mem._store.keys()].filter((k) => !before.has(k));
  const types = ws.sent.map((m) => m.type);
  const rej = ws.sent.find((m) => m.type === 'join_rejected');
  return {
    room, ws, added, wrote: mem.batches() - batches,
    refused: !!rej && rej.reason === 'auth' && !!ws.closed && ws.closed.code === 4003,
    joined: types.includes('state_sync'),
    kept: room.sessions.has(ws),
    bodies: Object.keys(room.playerState).length,
  };
}

/* 1. every malformed id: the magic gate's answer, nothing written, no session kept */
{
  const deep = {}; let p = deep; for (let i = 0; i < 50; i++) { p.a = {}; p = p.a; }
  const BAD = [
    ['a list', [1, 'a']], ['a one-item list', ['bp_x']], ['a number', 12345], ['0', 0], ['a big number', 9007199254740992],
    ['true', true], ['false', false], ['an object', { a: 1 }], ['a deep object', deep], ['""', ''],
    ['65 characters', 'a'.repeat(65)], ['a NUL inside', 'bp_ab\u0000cd'], ['a space', 'bp_a b'], ['a colon', 'bp_a:b'],
    ['a slash', 'a/b'], ['a dash', 'bp-ab'], ['a dot', 'bp.ab'], ['a letter past ASCII', 'bp_été'],
    ['a direction mark', 'bp_ab‮'],
  ];
  for (const [label, id] of BAD) {
    const r = await tryJoin(id);
    check(`1. ${label}: refused with reason auth and close 4003`, r.refused, { sent: r.ws.sent.map((m) => m.type), closed: r.ws.closed });
    check(`1. ${label}: no storage row written`, r.added.length === 0 && r.wrote === 0, { added: r.added, wrote: r.wrote });
    check(`1. ${label}: no session kept, no body made`, !r.kept && r.bodies === 0 && !r.joined, { kept: r.kept, bodies: r.bodies });
  }
}

/* 2. every id form the census found still joins */
{
  const GOOD = [
    ['a character (bp_ hash and two words)', 'bp_1x9k2q_blazefrost'],
    ['a long character id', 'bp_' + 'z'.repeat(7) + '_' + 'thunderzenith'],
    ['a guest (8 of base 36)', 'k3j9x0aa'],
    ['a short guest', '7f'],
    ['a load bot', 'ltq1x_9a8b7c6d5e4f3g2h'],
    ['a lab bot', 'labfarm3ab9z'],
    ['a probe', 'probe_gh_actions'],
    ['a test name, upper case', 'T'],
    ['a test name with digits', 'P1_x'],
    ['64 characters', 'b'.repeat(64)],
  ];
  for (const [label, id] of GOOD) {
    const r = await tryJoin(id);
    check(`2. ${label}: joins`, r.joined && r.kept && !r.refused && !!r.room.playerState[id], { sent: r.ws.sent.map((m) => m.type).slice(0, 6) });
  }
  /* a join with no id, or a null one, is not this gate's: v2.3.5730, it is
     `joinguard`'s (card K2 PR 11, SEC-F1; join-guard.test 2), so it is read
     here with that switch off */
  for (const id of ['(absent)', null]) {
    const r = await tryJoin(id, { joinguard: false });
    check(`2. an id ${id === null ? 'of null' : 'absent'}: not refused here (today's way, \`joinguard: false\`)`, !r.refused, { sent: r.ws.sent.map((m) => m.type).slice(0, 6) });
  }
  /* the magic names still meet their own gate (they fit the form) */
  for (const id of ['__proto__', 'constructor', 'toString']) {
    const r = await tryJoin(id);
    check(`2. the magic name ${id}: still refused`, r.refused && r.added.length === 0);
  }
}

/* 3. the switch thrown: today's way (only the magic names refused) */
{
  const r = await tryJoin(12345, { joinidform: false });
  check('3. joinidform: false: a number id is let in, as before', !r.refused && r.kept, { sent: r.ws.sent.map((m) => m.type).slice(0, 6) });
  const r2 = await tryJoin('a'.repeat(65), { joinidform: false });
  check('3. joinidform: false: 65 characters let in, as before', !r2.refused && r2.joined);
  const r3 = await tryJoin('__proto__', { joinidform: false });
  check('3. joinidform: false: the magic names still refused', r3.refused && r3.added.length === 0);
  const r4 = await tryJoin(12345, { joinidform: true });
  check('3. joinidform: true: the form holds', r4.refused && r4.added.length === 0);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
