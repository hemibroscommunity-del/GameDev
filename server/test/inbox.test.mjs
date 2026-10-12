/* Inbox + escrow primitives test (v2.3.1117, PR2 of the heavy-systems
 * plan).  Stateful storage mock; checks:
 *   1. Online credit applies to live playerState immediately, stamps the
 *      oplog, and sends inbox_delivered.
 *   2. Duplicate opId is a no-op ('dup', no double credit).
 *   3. Offline credit lands in inbox:<id>; the next join drains it into
 *      the player BEFORE state_sync, then clears the key.
 *   4. Weapon deliveries respect WEAPON_STASH_CAP: the overflow stays
 *      queued (partial drain) instead of being silently truncated away
 *      by _saveRpg.
 *   5. Escrow debit/take: insufficient funds fail cleanly; success
 *      mutates live state; duplicate opId converges ({ok, dup}).
 *   6. Offline escrow take mutates the stored blob directly.
 *   7. Inbox soft cap: gold/item entries merge losslessly at 200.
 *   8. (v2.3.1182) Drain remainder path: a join drains what fits (gold)
 *      but writes the rejected weapon BACK to inbox:<id> and reports it
 *      in inbox_delivered.queued; a later join with stash room delivers
 *      it and deletes the key.
 *   9. (v2.3.1182) _opPruneMaybe: deletes >48h and junk-valued oplog
 *      keys, keeps fresh ones, and rate-limits to one sweep per hour.
 */
import { GameRoom } from '../src/index.js';
import { NEW_CHARACTER_COINS } from '../src/join.js';   /* v2.3.3138: a new character's purse */
import { OP_PRUNE } from '../src/inbox.js'; /* v2.3.2438 */

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      /* v2.3.2438: faithful to the runtime -- keys come back SORTED, `limit`
         bounds the page, `startAfter` resumes past a key, and delete()
         takes one key or an array.  The incremental housekeeping jobs
         depend on all four; a mock that ignored `limit` would let a sweep
         "finish" in one page and prove nothing about the paging. */
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        let n = 0;
        for (const k of keys) {
          if (opts?.startAfter && k <= opts.startAfter) continue;
          if (opts?.limit && n >= opts.limit) break;
          out.set(k, store.get(k)); n++;
        }
        if (store._listLog) store._listLog.push({ prefix: opts?.prefix, limit: opts?.limit, startAfter: opts?.startAfter, size: out.size });
        return out;
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};

function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

async function join(ws, id, z = 'town') {
  room.sessions.set(ws, baseSession());
  // v2.3.1149: pre-settle today's daily login reward -- this suite
  // asserts EXACT join-time coins / inbox_delivered arithmetic, and the
  // cadence reward (+25g via its own inbox_delivered) would skew it.
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 100, y: 100, z } }));
}

// ── 1 + 2. online credit + idempotency ──
const wsA = fakeWs('alice');
await join(wsA, 'bp_inbox_alice');
const coins0 = room.playerState['bp_inbox_alice'].coins || 0;
const r1 = await room._creditPlayer('bp_inbox_alice', { opId: 'test:gold:1', source: 'test', kind: 'gold', payload: { amount: 75 }, note: 'sale' });
check('online gold credit delivered', r1 === 'delivered' && room.playerState['bp_inbox_alice'].coins === coins0 + 75, { r1, coins: room.playerState['bp_inbox_alice'].coins });
check('oplog stamped', state._store.has('oplog:test:gold:1'));
const inb1 = msgsOfType(wsA, 'inbox_delivered');
check('inbox_delivered notification sent', inb1.length === 1 && inb1[0].payload.entries[0].kind === 'gold', inb1);
const r2 = await room._creditPlayer('bp_inbox_alice', { opId: 'test:gold:1', source: 'test', kind: 'gold', payload: { amount: 75 } });
check('duplicate opId is a no-op', r2 === 'dup' && room.playerState['bp_inbox_alice'].coins === coins0 + 75);

// item credit
await room._creditPlayer('bp_inbox_alice', { opId: 'test:item:1', source: 'test', kind: 'item', payload: { invKey: 'wood', count: 5 } });
check('online item credit applied', room.playerState['bp_inbox_alice'].inventory.wood === 5, room.playerState['bp_inbox_alice'].inventory);

// ── 3. offline credit -> inbox -> drained at join ──
const rOff = await room._creditPlayer('bp_inbox_bob', { opId: 'test:off:1', source: 'market', kind: 'gold', payload: { amount: 120 }, note: 'order sold' });
check('offline credit parked in inbox', rOff === 'inboxed' && state._store.get('inbox:bp_inbox_bob')?.length === 1, state._store.get('inbox:bp_inbox_bob'));
const wsB = fakeWs('bob');
await join(wsB, 'bp_inbox_bob');
/* v2.3.3138: a new character starts with the client's own starting purse
   (NEW_CHARACTER_COINS), so the drained 120 lands on top of it. */
check('join drains inbox into coins', room.playerState['bp_inbox_bob'].coins === NEW_CHARACTER_COINS + 120, room.playerState['bp_inbox_bob'].coins);
check('drained inbox key deleted', !state._store.has('inbox:bp_inbox_bob'));
const inbB = msgsOfType(wsB, 'inbox_delivered');
check('drain sends inbox_delivered on the joining socket', inbB.length === 1 && inbB[0].payload.entries.length === 1, inbB);
const syncB = msgsOfType(wsB, 'state_sync');
check('state_sync arrives after the drain (order)', wsB.sent.indexOf(inbB[0]) < wsB.sent.indexOf(syncB[0]));

// ── 4. weapon partial drain at stash cap ──
const wpn = (n) => ({ name: 'Sword ' + n, tierMult: 1.0, dmg: 5 });
const psB = room.playerState['bp_inbox_bob'];
psB.weaponStash = [];
for (let i = 0; i < room.WEAPON_STASH_CAP - 1; i++) psB.weaponStash.push(wpn('held' + i));
await room._creditPlayer('bp_inbox_bob', { opId: 'test:w:1', source: 'test', kind: 'weapon', payload: { weapon: wpn('fits') } });
const rW2 = await room._creditPlayer('bp_inbox_bob', { opId: 'test:w:2', source: 'test', kind: 'weapon', payload: { weapon: wpn('overflow') } });
check('weapon fits until cap, then parks', psB.weaponStash.length === room.WEAPON_STASH_CAP && rW2 === 'inboxed', { len: psB.weaponStash.length, rW2 });
check('overflow weapon queued, not destroyed', state._store.get('inbox:bp_inbox_bob')?.length === 1);

// ── 5. escrow debit/take (online) ──
const dFail = await room._escrowDebitGold('bp_inbox_bob', 999999, 'test:d:1');
check('debit fails on insufficient gold', dFail.ok === false && dFail.reason === 'insufficient_gold' && !state._store.has('oplog:test:d:1'), dFail);
const dOk = await room._escrowDebitGold('bp_inbox_bob', 100, 'test:d:2');
check('debit succeeds and mutates live coins', dOk.ok === true && psB.coins === NEW_CHARACTER_COINS + 20, { dOk, coins: psB.coins });
const dDup = await room._escrowDebitGold('bp_inbox_bob', 100, 'test:d:2');
check('duplicate debit converges without re-debiting', dDup.ok === true && dDup.dup === true && psB.coins === NEW_CHARACTER_COINS + 20);
psB.inventory = { wood: 3 };
const tFail = await room._escrowTakeItem('bp_inbox_bob', 'wood', 5, 'test:t:1');
const tOk = await room._escrowTakeItem('bp_inbox_bob', 'wood', 3, 'test:t:2');
check('take-item validates count then empties the slot', tFail.ok === false && tOk.ok === true && psB.inventory.wood === undefined, { tFail, tOk, inv: psB.inventory });

// ── 6. offline escrow against the stored blob ──
await room.webSocketMessage(wsB, JSON.stringify({ type: 'move', x: 100, y: 100 })); // ensure a save exists
room._saveRpg('bp_inbox_bob', psB);
await new Promise((r) => setTimeout(r, 10)); // fire-and-forget save settles
room.sessions.delete(wsB);
delete room.playerState['bp_inbox_bob'];
const dOffFail = await room._escrowDebitGold('bp_inbox_bob', 999, 'test:d:3');
const dOff = await room._escrowDebitGold('bp_inbox_bob', 20, 'test:d:4');
const storedAfter = state._store.get('rpg:bp_inbox_bob');
check('offline debit validates and mutates the stored blob', dOffFail.ok === false && dOff.ok === true && storedAfter.coins === NEW_CHARACTER_COINS, { dOffFail, dOff, coins: storedAfter?.coins });

// ── 7. inbox soft cap merges gold/items losslessly ──
for (let i = 0; i < 200; i++) {
  await room._inboxAppend('bp_inbox_carol', { opId: 'test:c:' + i, kind: 'gold', payload: { amount: 1 }, source: 'test' });
}
await room._inboxAppend('bp_inbox_carol', { opId: 'test:c:extra', kind: 'gold', payload: { amount: 50 }, source: 'test' });
const carolBox = state._store.get('inbox:bp_inbox_carol');
const carolGold = carolBox.reduce((s, e) => s + (e.kind === 'gold' ? e.payload.amount : 0), 0);
check('at cap, gold merges instead of growing', carolBox.length === 200 && carolGold === 250, { len: carolBox.length, gold: carolGold });

// ── 8. v2.3.1182: drain remainder path (inbox.js _drainInbox) ──
// Section 4 covers the ONLINE credit parking at a full stash; this
// covers the JOIN-TIME drain partition: deliverable entries apply, the
// rejected weapon must be written back to storage (not dropped with the
// delete branch) and surface as inbox_delivered.queued.
const wsD = fakeWs('dave');
await join(wsD, 'bp_inbox_dave');
const psD = room.playerState['bp_inbox_dave'];
psD.weaponStash = [];
for (let i = 0; i < room.WEAPON_STASH_CAP; i++) psD.weaponStash.push(wpn('dave' + i));
const daveCoins0 = psD.coins || 0;
room._saveRpg('bp_inbox_dave', psD);
await new Promise((r) => setTimeout(r, 10)); // fire-and-forget save settles
room.sessions.delete(wsD);
delete room.playerState['bp_inbox_dave'];
// Mail him gold (always deliverable) plus a weapon (stash is full).
await room._inboxAppend('bp_inbox_dave', { opId: 'test:dr:g', source: 'test', kind: 'gold', payload: { amount: 33 } });
await room._inboxAppend('bp_inbox_dave', { opId: 'test:dr:w', source: 'test', kind: 'weapon', payload: { weapon: wpn('mailed') } });
const wsD2 = fakeWs('dave2');
await join(wsD2, 'bp_inbox_dave');
const psD2 = room.playerState['bp_inbox_dave'];
check('partial drain applies the gold', psD2.coins === daveCoins0 + 33, { coins: psD2.coins, expected: daveCoins0 + 33 });
check('partial drain leaves the full stash untouched', psD2.weaponStash.length === room.WEAPON_STASH_CAP, psD2.weaponStash.length);
const daveBox = state._store.get('inbox:bp_inbox_dave');
check('rejected weapon written back to the inbox key', Array.isArray(daveBox) && daveBox.length === 1 && daveBox[0].kind === 'weapon' && daveBox[0].payload.weapon.name === 'Sword mailed', daveBox);
const inbD2 = msgsOfType(wsD2, 'inbox_delivered');
check('inbox_delivered reports queued === 1', inbD2.length === 1 && inbD2[0].payload.queued === 1 && inbD2[0].payload.entries.length === 1 && inbD2[0].payload.entries[0].kind === 'gold', inbD2);
// Free a slot and rejoin: the queued weapon must now deliver and the
// key must be deleted (drain's delete branch, not the write-back).
psD2.weaponStash.pop();
room._saveRpg('bp_inbox_dave', psD2);
await new Promise((r) => setTimeout(r, 10));
room.sessions.delete(wsD2);
delete room.playerState['bp_inbox_dave'];
const wsD3 = fakeWs('dave3');
await join(wsD3, 'bp_inbox_dave');
const psD3 = room.playerState['bp_inbox_dave'];
check('queued weapon delivers once a slot frees', psD3.weaponStash.length === room.WEAPON_STASH_CAP && psD3.weaponStash.some((w) => w.name === 'Sword mailed'), psD3.weaponStash.map((w) => w.name));
check('fully drained inbox key deleted', !state._store.has('inbox:bp_inbox_dave'));
const inbD3 = msgsOfType(wsD3, 'inbox_delivered');
check('second drain reports queued === 0', inbD3.length === 1 && inbD3[0].payload.queued === 0 && inbD3[0].payload.entries[0].kind === 'weapon', inbD3);

// ── 8b. v2.3.3185: a restart at ANY write of a join's mail delivery ──
// The drain rewrote (or deleted) the mailbox, awaited, and saved the player
// after -- two writes: a restart between them took the mail away with its
// gold never saved.  A storage where every write made in one synchronous run
// commits as one batch, as a Durable Object's does, and the room dies before
// batch `crashAt`.  For every batch of a join that delivers 500 gold: crash
// there, restart on what was written, join again -- exactly 500 arrives.
{
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const mkBatchState = (seed) => {
    const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
    let pending = null, batches = 0, crashAt = Infinity, dead = false;
    const commit = () => {
      const w = pending; pending = null;
      const n = batches++;
      if (dead || n >= crashAt) { dead = true; return; }
      for (const [op, k, v] of w) { if (op === 'put') store.set(k, v); else store.delete(k); }
    };
    const write = (op, k, v) => {
      if (!pending) { pending = []; queueMicrotask(commit); }
      pending.push([op, k, clone(v)]);
    };
    const view = (k) => {
      if (pending) for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] === k) return pending[i][0] === 'put' ? clone(pending[i][2]) : undefined;
      return clone(store.get(k));
    };
    return {
      _store: store,
      batches: () => batches,
      crashAt(n) { crashAt = n; },
      storage: {
        get: async (k) => view(k),
        put: async (k, v) => {
          if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
          write('put', k, v);
        },
        delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) write('del', x); return true; },
        list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, clone(v)); return out; },
      },
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    };
  };
  const settleIo = () => new Promise((r) => setTimeout(r, 5));
  const PIDM = 'bp_inbox_restart';
  const joinOn = async (rm, ws) => {
    rm.sessions.set(ws, baseSession());
    await rm.state.storage.put('cadence:login:' + PIDM, { period: rm._cadencePeriodDaily(), streak: 1, ts: Date.now() });
    await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: PIDM, name: 'T', phrase: 'p-' + PIDM, data: { x: 100, y: 100, z: 'town' } }));
  };
  /* the world before: 100 in the purse, 500 waiting in the mail */
  const s0 = mkBatchState();
  const r0 = new GameRoom(s0, mockEnv);
  const w0 = fakeWs('m0');
  await joinOn(r0, w0);
  r0.playerState[PIDM].coins = 100;
  r0._saveRpg(PIDM, r0.playerState[PIDM]);
  await settleIo();
  r0.sessions.delete(w0);
  delete r0.playerState[PIDM];
  await r0._creditPlayer(PIDM, { opId: 'test:restart:mail', source: 'test', kind: 'gold', payload: { amount: 500 }, note: 'mail' });
  await settleIo();
  check('setup: 500 gold waits in the mail', ((s0._store.get('inbox:' + PIDM) || [])[0] || {}).payload?.amount === 500, s0._store.get('inbox:' + PIDM));
  /* how many writes a join makes */
  const dry = mkBatchState(s0._store);
  const rd = new GameRoom(dry, mockEnv);
  await joinOn(rd, fakeWs('md'));
  await settleIo();
  const joinBatches = dry.batches();
  check('setup: a join that delivers it ends with 600', rd.playerState[PIDM].coins === 600, rd.playerState[PIDM].coins);
  const wrong = [];
  for (let k = 0; k <= joinBatches; k++) {
    const s1 = mkBatchState(s0._store);
    s1.crashAt(k);
    const r1 = new GameRoom(s1, mockEnv);
    await joinOn(r1, fakeWs('m1'));
    await settleIo();
    const s2 = mkBatchState(s1._store);
    const r2 = new GameRoom(s2, mockEnv);
    await joinOn(r2, fakeWs('m2'));
    await settleIo();
    const c = r2.playerState[PIDM].coins;
    if (c !== 600) wrong.push({ crashAt: k, coins: c });
  }
  check('a restart at any of a join\'s ' + joinBatches + ' writes delivers the mail exactly once after the next join (600)', wrong.length === 0, wrong);
}

// ── 9. v2.3.1182: _opPruneMaybe (48h expiry + junk cleanup + hourly rate limit) ──
// Both failure directions are silent (best-effort catch), so assert
// each explicitly: expired and junk-valued keys go, fresh keys stay,
// and a second sweep inside the hour is a no-op.
await room.state.storage.put('oplog:old', Date.now() - 49 * 3600000);
await room.state.storage.put('oplog:fresh', Date.now());
await room.state.storage.put('oplog:junk', 'not-a-timestamp');
await room._opStamp('test:prune:live');
room._lastOpPrune = 0; // reset the once-per-hour anchor (joins above already swept)
await room._opPruneMaybe();
check('prune deletes 49h-old oplog entry', !state._store.has('oplog:old'));
check('prune deletes junk-valued oplog entry', !state._store.has('oplog:junk'));
check('prune keeps fresh oplog entry', state._store.has('oplog:fresh'));
check('stamped opId survives the prune and is still seen', (await room._opSeen('test:prune:live')) === true);
// Rate limit: re-seed an expired key and sweep again immediately -- it
// must SURVIVE because the hourly anchor was just set.
await room.state.storage.put('oplog:old', Date.now() - 49 * 3600000);
await room._opPruneMaybe();
check('second sweep inside the hour is rate-limited (expired key survives)', state._store.has('oplog:old'));
await room.state.storage.delete('oplog:old'); // don't leak into later checks

// ── 10. v2.3.2438: the prune is a PAGED JOB, off the join path ──
// The 2026-09-10 stall: one list() over every stamp ever written, then a
// serial delete per key, awaited before state_sync.  Now: one bounded page
// per call, batched deletes, a cursor, and _drainInbox never touches it.
{
  const N = OP_PRUNE.PAGE * 2 + 137;                  // three pages, last one short
  const stale = Date.now() - 49 * 3600000;
  for (let i = 0; i < N; i++) await room.state.storage.put('oplog:bulk:' + String(i).padStart(5, '0'), stale);
  await room.state.storage.put('oplog:zz-fresh', Date.now());
  room._lastOpPrune = 0; room._opPrune = null;
  state._store._listLog = [];
  const r1 = await room._opPruneMaybe();
  check('page 1 reports more to do', r1 === true, r1);
  check('page 1 listed at most one page of keys', state._store._listLog.length === 1 && state._store._listLog[0].limit === OP_PRUNE.PAGE && state._store._listLog[0].size === OP_PRUNE.PAGE, state._store._listLog);
  const leftAfter1 = [...state._store.keys()].filter((k) => k.startsWith('oplog:bulk:')).length;
  check('page 1 deleted exactly one page of stale keys', leftAfter1 === N - OP_PRUNE.PAGE, leftAfter1);
  const r2 = await room._opPruneMaybe();
  const r3 = await room._opPruneMaybe();
  check('page 2 reports more to do, page 3 (short) reports done', r2 === true && r3 === false, { r2, r3 });
  check('every page listed with the page limit and a cursor after the first', state._store._listLog.every((l, i) => l.limit === OP_PRUNE.PAGE && (i === 0 ? !l.startAfter : !!l.startAfter)), state._store._listLog);
  check('all stale keys gone after three pages', [...state._store.keys()].filter((k) => k.startsWith('oplog:bulk:')).length === 0);
  check('the fresh key survived the whole sweep', state._store.has('oplog:zz-fresh'));
  check('a completed sweep arms the hourly anchor (fourth call is a no-op)', (await room._opPruneMaybe()) === false && state._store._listLog.length === 3, state._store._listLog.length);
  check('the sweep reported its work', room._opPruneLast && room._opPruneLast.pages === 3 && room._opPruneLast.deleted === N, room._opPruneLast);
  // THE JOIN PATH: a drain must not list the oplog at all.
  room._lastOpPrune = 0; room._opPrune = null;
  await room.state.storage.put('oplog:bulk:again', stale);
  state._store._listLog = [];
  await room._drainInbox('bp_inbox_nobody', { send() {} });
  check('_drainInbox performs NO oplog list (the join path never waits on housekeeping)', !state._store._listLog.some((l) => l.prefix === 'oplog:'), state._store._listLog);
  check('...and the stale key is still there for the tick slot to take', state._store.has('oplog:bulk:again'));
  await room.state.storage.delete('oplog:bulk:again');
  await room.state.storage.delete('oplog:zz-fresh');
  // A page that THROWS ends the sweep and arms the anchor instead of spinning.
  room._lastOpPrune = 0; room._opPrune = null;
  const realList = state.storage.list;
  state.storage.list = async () => { throw new Error('boom'); };
  const rt = await room._opPruneMaybe();
  state.storage.list = realList;
  check('a throwing page ends the sweep (no spin) and arms the anchor', rt === false && room._opPrune === null && room._lastOpPrune > 0, { rt });
}

/* ── v2.3.3165: AN ESCROW STAMP NEVER LANDS WITHOUT ITS DEBIT ──
   The stamp was written first and the debit saved after, in the next batch;
   a worker restart between them left "paid" with nothing taken, and the
   auction house's rebuild settles on that stamp (store.js).  Here the
   storage "crashes" the instant the stamp is written: every put after it is
   lost, as it would be.  Puts are copied, so only what was written counts. */
{
  const mkCrashState = () => {
    const store = new Map();
    let crashAfter = null;
    let crashed = false;
    const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
    return {
      _store: store,
      arm(key) { crashAfter = key; crashed = false; },
      storage: {
        get: async (k) => clone(store.get(k)),
        put: async (k, v) => {
          if (crashed) return;
          store.set(k, clone(v));
          if (k === crashAfter) crashed = true;
        },
        list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, clone(v)); return out; },
        delete: async (k) => { if (crashed) return; for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
      },
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    };
  };
  const cs = mkCrashState();
  const cr = new GameRoom(cs, mockEnv);
  const PIDC = 'bp_inbox_crash';
  const wsC = fakeWs('crash');
  cr.sessions.set(wsC, baseSession());
  await cr.webSocketMessage(wsC, JSON.stringify({ type: 'join', id: PIDC, name: 'T', phrase: 'p-' + PIDC, data: { x: 0, y: 0, z: 'town' } }));
  const pc = cr.playerState[PIDC];
  pc.coins = 1000;
  pc.inventory = { rare_gem: 5 };
  await cr._saveRpg(PIDC, pc);
  const durable = () => cs._store.get('rpg:' + PIDC);

  cs.arm('oplog:test:crash:gold');
  await cr._escrowDebitGold(PIDC, 300, 'test:crash:gold');
  check('online gold: when the payment\'s stamp is written, the debit is written with it',
    cs._store.has('oplog:test:crash:gold') && durable().coins === 700, { stamp: cs._store.has('oplog:test:crash:gold'), coins: durable().coins });

  cs.arm('oplog:test:crash:item');
  await cr._escrowTakeItem(PIDC, 'rare_gem', 2, 'test:crash:item');
  check('online item: when the take\'s stamp is written, the take is written with it',
    cs._store.has('oplog:test:crash:item') && (durable().inventory || {}).rare_gem === 3, { stamp: cs._store.has('oplog:test:crash:item'), inv: durable().inventory });

  /* offline: the stored record is debited directly */
  cs.arm(null);
  const st0 = durable();
  st0.coins = 1000;
  st0.inventory = { rare_gem: 5 };
  await cs.storage.put('rpg:' + PIDC, st0);
  cr.sessions.delete(wsC);
  delete cr.playerState[PIDC];
  cs.arm('oplog:test:crash:gold-off');
  await cr._escrowDebitGold(PIDC, 300, 'test:crash:gold-off');
  check('offline gold: the same, on the stored record',
    cs._store.has('oplog:test:crash:gold-off') && durable().coins === 700, { stamp: cs._store.has('oplog:test:crash:gold-off'), coins: durable().coins });
  cs.arm('oplog:test:crash:item-off');
  await cr._escrowTakeItem(PIDC, 'rare_gem', 2, 'test:crash:item-off');
  check('offline item: the same, on the stored record',
    cs._store.has('oplog:test:crash:item-off') && (durable().inventory || {}).rare_gem === 3, { stamp: cs._store.has('oplog:test:crash:item-off'), inv: durable().inventory });

  /* and nothing else moved: a retry of a paid op is still a dup, never a second debit */
  cs.arm(null);
  const again = await cr._escrowDebitGold(PIDC, 300, 'test:crash:gold-off');
  check('...and a retry of a stamped payment is a dup that takes nothing more', again.ok === true && again.dup === true && durable().coins === 700, { again, coins: durable().coins });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
