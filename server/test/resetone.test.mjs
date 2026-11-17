/* ═══ v2.3.5709: A CHARACTER RESTART IS ONE WRITE; REQUESTS RECEIVED HAVE A CEILING (card SEC PR 10) ═══
 * (server/src/persistence.js _resetCharacterData; server/src/friends.js FRIENDS.REQ_IN_MAX)
 *
 *   1. THE RESTART'S EVERY-BATCH SWEEP: a character with a record of each
 *      kind (its vault, farm, pets, codex, fish log, achievements, prize
 *      marks, test mode, death note, gear record, quest stamps), restarted,
 *      the room killed before each batch in turn: what is on file is either
 *      the old character whole or none of it -- never a new level-1
 *      character (no `rpg:`) holding the old vault, farm or pets.  Before,
 *      the deletes were sixteen awaited writes, a restart between any two
 *      left the rest.
 *   2. Played whole, every record of the old character is gone (the same
 *      rows as before: nothing more is deleted, nothing kept).
 *   3. A player with 50 friend requests pending is answered `target-full`
 *      on the 51st, and nothing is written (there was no ceiling on the
 *      requests a player RECEIVES); `reqincap: false`: the old way.
 *
 * BREAK PROOF (rule 8), tried by hand: main's persistence.js and
 * friends.js -> FAIL 1 and 3.
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const PID = 'bp_reset_one';
const OLD = ['rpg:', 'bank:', 'farm:', 'pets:', 'codex:', 'fishlog:', 'achv:', 'aponce:', 'testmode:', 'life:', 'gear_prov:'];
const STAMP = 'oplog:questitem:' + PID + ':tut_1:0';
function seed() {
  const m = new Map();
  m.set('rpg:' + PID, { _v: 22, coins: 500, inventory: { wood_oak: 3 }, level: 9, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
  m.set('bank:' + PID, { _v: 1, gold: 900, items: [{ key: 'wood_oak', n: 20 }], ops: [] });
  m.set('farm:' + PID, { v: 1, beds: [{ crop: 'cloudpetal', at: 1 }] });
  m.set('pets:' + PID, { v: 1, pets: [{ id: 'p1' }] });
  m.set('codex:' + PID, { v: 1, kills: { slime: 9 } });
  m.set('fishlog:' + PID, { v: 1, fish: {} });
  m.set('achv:' + PID, { v: 1, got: {} });
  m.set('aponce:' + PID, { arena: 1 });
  m.set('testmode:' + PID, { on: true });
  m.set('life:' + PID, { v: 1 });
  m.set('gear_prov:' + PID, { v: 1, rows: {} });
  m.set(STAMP, { at: 1 });
  return m;
}
const oldLeft = (store) => OLD.filter((p) => store.has(p + PID)).concat(store.has(STAMP) ? ['stamp'] : []);

async function restart(crashAt) {
  const st = makeStorage(seed());
  const room = await openRoom(st);
  const b0 = st.batches();
  if (crashAt !== null) st.crashAt(b0 + crashAt);
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  try { await room._resetCharacterData(PID); await settle(); await settle(); } finally { [console.warn, console.error] = back; }
  return { st, left: oldLeft(st._store), batches: st.batches() - b0 };
}

/* 2. whole */
const whole = await restart(null);
check('2. played whole: every record of the old character is gone', whole.left.length === 0, whole.left);

/* 1. the sweep */
{
  const bad = [];
  for (let n = 0; n <= whole.batches; n++) {
    const r = await restart(n);
    const hasRpg = r.st._store.has('rpg:' + PID);
    /* the character itself gone, anything of it left: a new character would hold it */
    if (!hasRpg && r.left.length) bad.push({ n, left: r.left });
    /* the character kept, part of it gone: half a restart */
    if (hasRpg && r.left.length !== OLD.length + 1) bad.push({ n, left: r.left, half: true });
  }
  check(`1. killed before each of its ${whole.batches} batches in turn: the old character whole, or none of it -- never a new one beside its vault, farm or pets`, bad.length === 0, bad);
}

/* 3. requests received */
async function requests(flags) {
  const st = makeStorage(new Map([['rpg:bp_req_target', { _v: 22, coins: 1, level: 1, hp: 100, maxHp: 100 }]]));
  const room = await openRoom(st, flags);
  const sent = [];
  room._friendsSend = (to, type, payload) => { sent.push({ to, type, payload }); };
  room._friendsSyncTo = async () => {};
  for (let i = 0; i < 51; i++) await room._handleFriendRequest({ id: 'bp_req_' + i, name: 'R' + i }, { target: 'bp_req_target', name: 'T' });
  await settle();
  const doc = await room._friendsDoc('bp_req_target');
  const last = sent.filter((s) => s.to === 'bp_req_50');
  return { pending: Object.keys(doc.reqIn).length, last };
}
{
  const r = await requests();
  check('3. 50 requests pending: the 51st is answered target-full, and not kept', r.pending === 50 && r.last.some((s) => s.type === 'friend_error' && s.payload && s.payload.reason === 'target-full'), r);
  const off = await requests({ reqincap: false });
  check('3. reqincap: false: the old way (the 51st kept)', off.pending === 51, off.pending);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
