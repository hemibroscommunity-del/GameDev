/* ═══ v2.3.5702: A REFUSED WRITE IS SEEN, AND THE BANK'S TWO RECORDS LAND TOGETHER (card SEC PR 3) ═══
 * (server/src/bank.js "A VAULT OWED"; docs/specs/bank-vault.md)
 *
 * A move at the Bank writes the purse or bag (`rpg:`) and the vault
 * (`bank:`) in one run.  When the storage refused both, memory had moved and
 * the file had not; the next ORDINARY save wrote the purse again from memory
 * and nothing ever wrote the vault (the leave drops its copy), so a
 * withdrawal's gold was in the purse AND still in the vault on file, and a
 * deposit made then was in neither.  Now a vault whose put was refused is
 * OWED: the character's next save puts it again in the same synchronous
 * run as its own put, no await between (one write),
 * the leave saves while one is owed, and the bank answers `paused`.
 *
 *   1. A WITHDRAWAL in a refusal: answered `paused` after its ok; the file
 *      untouched; the next ordinary save lands purse and vault together;
 *      after a leave and a restart the world's sum is unchanged (unexplained
 *      gold 0) and the player has what memory said.
 *   2. A DEPOSIT in a refusal, the same (gold and an item).
 *   3. A LEAVE while the storage still refuses: nothing doubled, nothing
 *      lost to the sum (both halves of the move undone together); and a
 *      leave after it recovers writes both before the vault is forgotten.
 *   4. THE EVERY-BATCH SWEEP: each of the bank's two actions played through
 *      a refusal, a later save and a leave, the room killed before each
 *      batch in turn: a second room on what was written, the sum unchanged.
 *   5. NO NEW WRITE in the ordinary case: a move with the storage taking
 *      puts is one rpg put and one bank put, and a later save writes the
 *      rpg alone.
 *   6. `bankretry: false`: the old way (the planted double comes back: the
 *      break proof's other half).
 *
 * BREAK PROOF (rule 8), tried by hand: `_bankOwed` answering null always
 * (main's way) -> FAIL 1, 2 and 4 (unexplained gold 100 / -50).
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, join, seededClock, settle } from './testroom.mjs';
import { BANK } from '../src/bank.js';
import { PAUSE } from '../src/valuepause.js';
import { count, unexplained } from '../src/worldsum.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const clock = seededClock({ start: Date.UTC(2026, 10, 17, 12, 0, 0), seed: 5 }).install();
const PID = 'bp_bankretry';
const rec = () => ({ _v: 21, coins: 1000, inventory: { wood_oak: 10 }, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
let opN = 0;
const op = () => 'br-' + (++opN);

/** A room on a storage that refuses its puts while `refuse` says so (a full
 *  disk, a rolled-back worker), under card A's wrapper (the room's start). */
async function world(flags, seed) {
  const st = makeStorage(seed || new Map([['rpg:' + PID, rec()]]));
  const inner = st.storage.put;
  const ctl = { refuse: false, puts: [], runs: [] };
  st.storage.put = function (...a) {
    ctl.puts.push(typeof a[0] === 'string' ? [a[0]] : Object.keys(a[0] || {}));
    ctl.runs.push(st.batches() + (ctl.refuse ? 0.5 : 0));   /* puts of one synchronous run share a number (testroom.mjs: a run is a batch) */
    return ctl.refuse ? Promise.reject(new Error('refused')) : inner.apply(this, a);
  };
  const room = await openRoom(st, flags);
  const ws = fakeWs('p');
  await join(room, ws, PID, { loginTaken: true });
  const P = room.playerState[PID];
  const c = room._wheelT().WHEEL_CENTRE;
  Object.assign(P, { z: 'wheel', x: c[0] + BANK.DOOR[0] + 40, y: c[1] + BANK.DOOR[1] + 150, dead: false, dying: false });
  const send = async (type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await settle(); await settle(); };
  const lasts = () => ws.sent.filter((m) => m.type === 'bank_state').map((m) => m.payload.last).filter(Boolean);
  const file = () => ({ coins: (st._store.get('rpg:' + PID) || {}).coins, inv: (st._store.get('rpg:' + PID) || {}).inventory,
    vault: (st._store.get('bank:' + PID) || {}).gold || 0, vitems: ((st._store.get('bank:' + PID) || {}).items || []) });
  const leave = async () => { await room.webSocketClose(ws, 1000, 'bye', true); await settle(); await settle(); };
  return { st, room, ws, P, ctl, send, lasts, file, leave };
}
/** The world's sum on what is written, as a restarted room finds it. */
async function afterRestart(st, flags) {
  const r2 = await openRoom(st, flags);
  return { r2, sum: count(r2, st) };
}

/* ══════════ 1. A WITHDRAWAL IN A REFUSAL ══════════ */
async function withdrawCase(flags) {
  const W = await world(flags);
  await W.send('bank_deposit', { kind: 'gold', n: 300, opId: op() });
  const start = count(W.room, W.st);
  W.ctl.refuse = true;
  W.ws.sent.length = 0;
  await W.send('bank_withdraw', { kind: 'gold', n: 100, opId: op() });
  W.ctl.refuse = false;
  const mid = W.file();
  const memory = { coins: W.P.coins };
  clock.advance(2000);
  await W.room._saveRpg(PID, W.P);   /* the next ordinary save (a hit, a sale, the regen's) */
  await settle();
  const saved = W.file();
  await W.leave();
  const { sum } = await afterRestart(W.st, flags);
  return { W, start, mid, memory, saved, u: unexplained(start, sum), end: W.file() };
}
{
  const r = await withdrawCase();
  check('1. the withdrawal was answered ok, then `paused` when its write was refused',
    r.W.lasts().length >= 2 && r.W.lasts()[0].ok === true && r.W.lasts().some((l) => l.ok === false && l.err === PAUSE.CODE), r.W.lasts());
  check('1. ...and the file was untouched by it (purse 700, vault 300)', r.mid.coins === 700 && r.mid.vault === 300, r.mid);
  check('1. the next ordinary save lands purse AND vault (800, 200)', r.saved.coins === 800 && r.saved.vault === 200, r.saved);
  check('1. after a leave and a restart: unexplained gold 0', r.u.gold === 0 && Object.keys(r.u.goods).length === 0, r.u);
  check('1. ...and the player has what memory said', r.end.coins === r.memory.coins && r.end.vault === 200, { end: r.end, memory: r.memory });
}

/* ══════════ 2. A DEPOSIT IN A REFUSAL ══════════ */
{
  const W = await world();
  const start = count(W.room, W.st);
  W.ctl.refuse = true;
  await W.send('bank_deposit', { kind: 'gold', n: 50, opId: op() });
  W.ctl.refuse = false;
  check('2. the deposit was answered `paused` when its write was refused', W.lasts().some((l) => l.ok === false && l.err === PAUSE.CODE), W.lasts());
  clock.advance(61000);   /* past the value pause: a second deposit goes now */
  W.ctl.refuse = true;
  await W.send('bank_deposit', { kind: 'item', id: 'wood_oak', n: 4, opId: op() });
  W.ctl.refuse = false;
  clock.advance(2000);
  await W.room._saveRpg(PID, W.P);
  await settle();
  const saved = W.file();
  check('2. the next ordinary save lands purse, bag AND vault (950 and 6 oak; 50 and 4 oak in the vault)',
    saved.coins === 950 && saved.vault === 50 && saved.inv.wood_oak === 6 && saved.vitems.some((i) => i.key === 'wood_oak' && i.n === 4), saved);
  await W.leave();
  const { sum } = await afterRestart(W.st);
  const u = unexplained(start, sum);
  check('2. after a leave and a restart: unexplained gold 0 and no item made or lost', u.gold === 0 && Object.keys(u.goods).length === 0, u);
}

/* ══════════ 3. A LEAVE WHILE IT STILL REFUSES; A LEAVE AFTER ══════════ */
{
  const W = await world();
  await W.send('bank_deposit', { kind: 'gold', n: 300, opId: op() });
  const start = count(W.room, W.st);
  W.ctl.refuse = true;
  await W.send('bank_withdraw', { kind: 'gold', n: 100, opId: op() });
  await W.leave();   /* still refusing: the leave's save is refused too */
  W.ctl.refuse = false;
  check('3. a leave in the refusal: the vault is not kept in memory past it', !W.room._bankMap().has(PID));
  const { r2, sum } = await afterRestart(W.st);
  const u = unexplained(start, sum);
  check('3. ...and the sum is unchanged: the move undone whole (purse 700, vault 300)', u.gold === 0 && W.file().coins === 700 && W.file().vault === 300, { u, f: W.file() });
  /* the same room, the player back: the vault read from the file, not memory */
  const ws2 = fakeWs('p2');
  await join(W.room, ws2, PID, { loginTaken: true });
  const v = await W.room._bankLoad(PID);
  check('3. ...a rejoin reads the vault from the file (300), never a copy ahead of the purse', v.gold === 300 && W.room.playerState[PID].coins === 700, { v: v.gold, coins: W.room.playerState[PID].coins });
  void r2;
}
{
  const W = await world();
  await W.send('bank_deposit', { kind: 'gold', n: 300, opId: op() });
  const start = count(W.room, W.st);
  W.ctl.refuse = true;
  await W.send('bank_withdraw', { kind: 'gold', n: 100, opId: op() });
  W.ctl.refuse = false;
  W.P._regenDirty = false;   /* nothing else for the leave to save */
  W.ctl.puts.length = 0; W.ctl.runs.length = 0;
  await W.leave();
  const ri = W.ctl.puts.findIndex((k) => k[0] === 'rpg:' + PID), bi = W.ctl.puts.findIndex((k) => k[0] === 'bank:' + PID);
  check('3. a leave after it recovers writes purse and vault in one run (no await between)', ri >= 0 && bi >= 0 && W.ctl.runs[ri] === W.ctl.runs[bi], { puts: W.ctl.puts, runs: W.ctl.runs });
  const { sum } = await afterRestart(W.st);
  const u = unexplained(start, sum);
  check('3. ...(800, 200) and the sum is unchanged', u.gold === 0 && W.file().coins === 800 && W.file().vault === 200, { u, f: W.file() });
}

/* ══════════ 4. THE EVERY-BATCH SWEEP ══════════ */
async function sweepOnce(kind, crashAt) {
  const W = await world();
  await W.send('bank_deposit', { kind: 'gold', n: 300, opId: op() });
  await W.send('bank_deposit', { kind: 'item', id: 'wood_oak', n: 5, opId: op() });
  const start = count(W.room, W.st);
  const b0 = W.st.batches();
  if (crashAt !== null) W.st.crashAt(b0 + crashAt);
  W.ctl.refuse = true;
  if (kind === 'withdraw') { await W.send('bank_withdraw', { kind: 'gold', n: 100, opId: op() }); await W.send('bank_withdraw', { kind: 'item', id: 'wood_oak', n: 2, opId: op() }); }
  else { await W.send('bank_deposit', { kind: 'gold', n: 40, opId: op() }); }
  W.ctl.refuse = false;
  clock.advance(2000);
  await W.room._saveRpg(PID, W.P);
  await settle();
  if (kind === 'deposit') { clock.advance(61000); await W.send('bank_deposit', { kind: 'item', id: 'wood_oak', n: 1, opId: op() }); }
  await W.leave();
  const { sum } = await afterRestart(W.st);
  return { u: unexplained(start, sum), batches: W.st.batches() - b0 };
}
for (const kind of ['withdraw', 'deposit']) {
  const whole = await sweepOnce(kind, null);
  check(`4. ${kind}: played whole, unexplained 0`, whole.u.gold === 0 && Object.keys(whole.u.goods).length === 0, whole.u);
  const bad = [];
  for (let n = 0; n <= whole.batches; n++) {
    const r = await sweepOnce(kind, n);
    if (r.u.gold !== 0 || Object.keys(r.u.goods).length) bad.push({ n, u: r.u });
  }
  check(`4. ${kind}: killed before each of its ${whole.batches} batches in turn, the sum unchanged every time`, bad.length === 0, bad);
}

/* ══════════ 5. NO NEW WRITE IN THE ORDINARY CASE ══════════ */
{
  const W = await world();
  W.ctl.puts.length = 0;
  await W.send('bank_deposit', { kind: 'gold', n: 10, opId: op() });
  const movePuts = W.ctl.puts.slice();
  W.ctl.puts.length = 0;
  await W.room._saveRpg(PID, W.P);
  await settle();
  const savePuts = W.ctl.puts.slice();
  check('5. a move with the storage taking puts: one rpg put and one bank put, as before',
    movePuts.filter((k) => k.length === 1 && k[0] === 'rpg:' + PID).length === 1 && movePuts.filter((k) => k.length === 1 && k[0] === 'bank:' + PID).length === 1 && movePuts.every((k) => k.length === 1), movePuts);
  check('5. ...and a later save writes the rpg alone', savePuts.length === 1 && savePuts[0].length === 1 && savePuts[0][0] === 'rpg:' + PID, savePuts);
}

/* ══════════ 6. THE SWITCH THROWN ══════════ */
{
  const r = await withdrawCase({ bankretry: false });
  check('6. bankretry: false: the old way (the vault never rewritten: unexplained gold 100)', r.u.gold === 100, r.u);
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
