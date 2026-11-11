/* v2.3.4795: THE TRADE WINDOW'S WEAPONS IN THE SAME WRITE AS ITS GOLD.
 *
 * The chaos tests (#1548, chaos-restart.test §3, listed KNOWN there as
 * `trade-weapon-half`) found it: the trade window's commit
 * (trade2.js _handleTrade2Confirm) moved both sides' gold and goods in ONE
 * write, then paid each staged weapon in a write of its own after it.  A
 * restart between (every merge touching server/ restarts the room): the
 * window is gone, the weapon's escrow record still stands with no deliver
 * stamp, and the restart sweep (_trade2WpnSweep) hands the weapon BACK to its
 * owner -- who also kept the other side's gold and goods.  One player paid
 * and got nothing.  Red on main at "a restart before write 1 of 3".
 *
 * Now each weapon rides the swap's one write (inbox.js _creditLiveTogether's
 * `also`): credited to its recipient's stash, its deliver opId stamped, its
 * escrow record deleted.  A recipient whose stash is full gets it by mail,
 * which cannot join the run, so the run marks its record OWED (`to`) and the
 * sweep finishes an owed record by delivering it, never by refunding it.
 *
 *   1. chaos §3 itself: gold, goods and a staged weapon -- the room dies
 *      before each of the commit's writes in turn, a second room wakes on
 *      what was written (the players back, every restart sweep run), and
 *      the books are counted over the disk: nothing made or lost, and the
 *      swap whole or not at all
 *   2. a weapon each way, and gold
 *   3. the receiver's weapon stash full: the weapon owed, then mailed
 *   4. the sweep: an owed record goes to its receiver, once; an orphan
 *      still goes home; `tradeonewrite: false` does not change that
 *   5. the kill switch `tradeonewrite: false`: the old order (and its hole)
 *   6. what the commit writes: one batch, and no more rows than before
 *   7. _creditLiveTogether: a weapon that would not fit refuses the run,
 *      with nothing done
 *
 * The storage is inbox.test §8c's (via chaos-restart.test): every write of
 * one synchronous run commits as one batch, as a Durable Object's does, and
 * the room dies before batch `crashAt` (that one and every later one lost).
 */
import { GameRoom } from '../src/index.js';

const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
function mkCrashState(seed) {
  const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
  let pending = null, batches = 0, crashAt = Infinity, dead = false, rows = 0;
  const commit = () => {
    const w = pending; pending = null;
    const n = batches++;
    if (dead || n >= crashAt) { dead = true; return; }
    rows += w.length;
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
    rows: () => rows,
    crashAt(n) { crashAt = n; },
    storage: {
      get: async (k) => view(k),
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
        write('put', k, v);
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) write('del', x); return true; },
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        for (const k of keys) {
          if (opts?.startAfter && k <= opts.startAfter) continue;
          if (opts?.limit && out.size >= opts.limit) break;
          out.set(k, clone(store.get(k)));
        }
        return out;
      },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const settleIo = () => new Promise((r) => setTimeout(r, 5));
async function joinOn(rm, ws, pid) {
  rm.sessions.set(ws, baseSession());
  /* today's login reward already taken, so a join moves no gold (inbox.test) */
  await rm.state.storage.put('cadence:login:' + pid, { period: rm._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(3, 12), phrase: 'p-' + pid, data: { x: 100, y: 100, z: 'town' } }));
  await settleIo();
  return ws;
}
const cmd = (r, ws, type, payload) => r.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

const GEL = 'slime_gel';
const BLADE = 'Chaos-blade', BOW = 'Chaos-bow';
/* the weapons named `name` in a record: every object so named with a type (a
   weapon can carry its name twice, so the text is no count) */
function named(v, name) {
  let n = 0;
  const walk = (x) => {
    if (!x || typeof x !== 'object') return;
    if (!Array.isArray(x) && x.name === name && typeof x.type === 'string') { n++; return; }
    for (const y of Array.isArray(x) ? x : Object.values(x)) walk(y);
  };
  walk(v);
  return n;
}

/* The books, read off the disk: gold in purses and mail; gel in bags and mail;
   each weapon in stashes, mail and escrow.  `left` names any escrow record. */
function books(store) {
  let gold = 0, gel = 0, blades = 0, bows = 0;
  const left = [];
  for (const [k, v] of store) {
    if (k.startsWith('rpg:')) {
      gold += Math.floor((v && v.coins) || 0);
      gel += (v && v.inventory && v.inventory[GEL]) || 0;
      blades += named(v, BLADE); bows += named(v, BOW);
    } else if (k.startsWith('inbox:')) {
      for (const e of v || []) {
        if (e.kind === 'gold') gold += Math.floor(e.payload.amount || 0);
        if (e.kind === 'item' && e.payload.invKey === GEL) gel += Math.max(1, Math.floor(e.payload.count || 1));
        if (e.kind === 'weapon') { blades += named(e.payload, BLADE); bows += named(e.payload, BOW); }
      }
    } else if (k.startsWith('trade2wpn:')) {
      left.push(k);
      blades += named(v, BLADE); bows += named(v, BOW);
    }
  }
  return { gold, gel, blades, bows, left };
}
const per = (store, pid) => {
  const v = store.get('rpg:' + pid) || {};
  let gold = Math.floor(v.coins || 0), gel = (v.inventory && v.inventory[GEL]) || 0;
  let blades = named(v, BLADE), bows = named(v, BOW);
  for (const e of store.get('inbox:' + pid) || []) {
    if (e.kind === 'gold') gold += e.payload.amount;
    if (e.kind === 'item' && e.payload.invKey === GEL) gel += e.payload.count;
    if (e.kind === 'weapon') { blades += named(e.payload, BLADE); bows += named(e.payload, BOW); }
  }
  return { gold, gel, blades, bows };
};

/* A world of saved players: pid -> { coins, inv, stash }; `flags` are the
   live flags every room on it reads */
async function seedPlayers(spec, flags) {
  const s = mkCrashState();
  if (flags) s._store.set('liveflags', { ...flags });
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  for (const [pid, p] of Object.entries(spec)) {
    await joinOn(r, fakeWs('seed-' + pid), pid);
    const ps = r.playerState[pid];
    ps.coins = p.coins || 0;
    ps.inventory = { ...(p.inv || {}) };
    ps.weaponStash = (p.stash || []).map((w) => ({ ...w }));
    r._saveRpg(pid, ps);
  }
  await settleIo();
  return s._store;
}

/* The restart: a second room on what survived; the players come back, the
   trade window's restart sweep runs to its end, and everyone joins again (the
   mail reaches a player at their join). */
async function wake(survived, pids) {
  const s2 = mkCrashState(survived);
  const r2 = new GameRoom(s2, mockEnv);
  await r2._liveFlagsEnsure();
  for (const pid of pids) await joinOn(r2, fakeWs('back-' + pid), pid);
  for (let i = 0; i < 2; i++) {
    r2._lastT2WpnSweep = 0; await r2._trade2WpnSweep();
    await settleIo();
  }
  for (const pid of pids) await joinOn(r2, fakeWs('again-' + pid), pid);
  await settleIo();
  return { store: s2._store, room: r2 };
}

async function crashRun(seed, k, path) {
  const s1 = mkCrashState(seed);
  const r1 = new GameRoom(s1, mockEnv);
  await r1._liveFlagsEnsure();
  const ctx = (await path.before(r1)) || {};
  await settleIo();
  s1.crashAt(k === Infinity ? Infinity : s1.batches() + k);
  await path.act(r1, ctx);
  await settleIo(); await settleIo();
  return wake(s1._store, path.pids);
}
async function measure(seed, path) {
  const s = mkCrashState(seed);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  const ctx = (await path.before(r)) || {};
  await settleIo();
  const b0 = s.batches(), w0 = s.rows();
  await path.act(r, ctx);
  await settleIo(); await settleIo();
  return { batches: s.batches() - b0, rows: s.rows() - w0, store: s._store, room: r, ctx };
}
/* every k from 0 (before the first write) to n (none lost) */
async function everyRestart(seed, path, judge) {
  const m = await measure(seed, path);
  const out = [];
  for (let k = 0; k <= m.batches; k++) {
    const w = await crashRun(seed, k, path);
    const bad = judge(w.store, k);
    if (bad) out.push({ restartBefore: k, of: m.batches, ...bad });
  }
  return { wrong: out, batches: m.batches };
}
const sameBooks = (W0) => (st) => {
  const b = books(st);
  if (b.gold !== W0.gold || b.gel !== W0.gel || b.blades !== W0.blades || b.bows !== W0.bows || b.left.length) {
    return { gold: b.gold - W0.gold, gel: b.gel - W0.gel, blades: b.blades - W0.blades, bows: b.bows - W0.bows, left: b.left };
  }
  return null;
};

const TA = 'bp_tow_tradea', TB = 'bp_tow_tradeb';
const blade = { type: 'sword', gearBase: 'iron', tier: 'common', tierMult: 1, name: BLADE };
const bow = { type: 'bow', gearBase: 'iron', tier: 'common', tierMult: 1, name: BOW };
const filler = (i) => ({ type: 'bow', gearBase: 'iron', tier: 'common', tierMult: 1, name: 'Filler ' + i });

/* open the window: A stages the blade (and B the bow, when B has it), A puts
   up `aGold`, B `bGold` and 3 gel; both ready; A confirms (the cooling-off
   aged away).  The act is B's confirm: the commit. */
function tradePath({ aGold = 40, bGold = 70, bWeapon = false } = {}) {
  return {
    pids: [TA, TB],
    before: async (r) => {
      const wa = await joinOn(r, fakeWs('ta'), TA), wb = await joinOn(r, fakeWs('tb'), TB);
      await cmd(r, wa, 'trade2_open', { target: TB });
      await cmd(r, wb, 'trade2_open', { target: TA });
      await cmd(r, wa, 'trade2_stage_weapon', { stashIdx: 0 });
      if (bWeapon) await cmd(r, wb, 'trade2_stage_weapon', { stashIdx: r.playerState[TB].weaponStash.findIndex((w) => w.name === BOW) });
      await settleIo();
      await cmd(r, wa, 'trade2_set', { offer: { _gold: aGold } });
      await cmd(r, wb, 'trade2_set', { offer: { _gold: bGold, [GEL]: 3 } });
      await cmd(r, wa, 'trade2_ready', { ready: true });
      await cmd(r, wb, 'trade2_ready', { ready: true });
      for (const t of r._trades2.values()) t.changedAt = Date.now() - 999999;
      await cmd(r, wa, 'trade2_confirm');
      await settleIo();
      return { wa, wb };
    },
    act: (r, ctx) => cmd(r, ctx.wb, 'trade2_confirm'),
  };
}

// ── 1. chaos §3: gold, goods and a staged weapon ──
const seed1 = await seedPlayers({ [TA]: { coins: 300, stash: [blade] }, [TB]: { coins: 300, inv: { [GEL]: 5 } } });
{
  const W0 = books(seed1);
  check('1. the world: 600 gold, 5 gel, one blade (A\'s)', W0.gold === 600 && W0.gel === 5 && W0.blades === 1, W0);
  const path = tradePath();
  const m = await measure(seed1, path);
  const whole = { a: per(m.store, TA), b: per(m.store, TB), left: books(m.store).left };
  check('1. with no restart the trade is whole: A 330 gold, 3 gel, no blade; B 270 gold, 2 gel, the blade; no escrow left',
    whole.a.gold === 330 && whole.a.gel === 3 && whole.a.blades === 0 && whole.b.gold === 270 && whole.b.gel === 2 && whole.b.blades === 1 && !whole.left.length, whole);
  const isNone = (a, b) => a.gold === 300 && a.gel === 0 && a.blades === 1 && b.gold === 300 && b.gel === 5 && b.blades === 0;
  const isWhole = (a, b) => a.gold === 330 && a.gel === 3 && a.blades === 0 && b.gold === 270 && b.gel === 2 && b.blades === 1;
  const conserve = await everyRestart(seed1, path, sameBooks(W0));
  check(`1. a restart before any of the commit's ${conserve.batches} write(s) makes or loses no gold, gel or blade over the room`, conserve.wrong.length === 0, conserve);
  const swap = await everyRestart(seed1, path, (st) => {
    const a = per(st, TA), b = per(st, TB);
    return (isNone(a, b) || isWhole(a, b)) ? null : { a, b };
  });
  /* main: [{restartBefore: 1, of: 3, a: {gold: 330, gel: 3, blades: 1}, b: {gold: 270, gel: 2, blades: 0}}] */
  check(`1. ...and the swap is whole or not at all at every one of them (was: a restart before write 1 of 3 left A the gold, the gel AND the blade)`, swap.wrong.length === 0, swap.wrong);
}

// ── 2. a weapon each way, and gold ──
{
  const seed = await seedPlayers({ [TA]: { coins: 300, stash: [blade] }, [TB]: { coins: 300, inv: { [GEL]: 5 }, stash: [bow] } });
  const W0 = books(seed);
  const path = tradePath({ bWeapon: true });
  const m = await measure(seed, path);
  const a0 = per(m.store, TA), b0 = per(m.store, TB);
  check('2. with no restart the weapons cross: A has the bow, B the blade, the gold and gel moved',
    a0.bows === 1 && a0.blades === 0 && b0.blades === 1 && b0.bows === 0 && a0.gold === 330 && b0.gold === 270 && !books(m.store).left.length, { a0, b0 });
  const isNone = (a, b) => a.gold === 300 && a.blades === 1 && a.bows === 0 && b.gold === 300 && b.gel === 5 && b.bows === 1 && b.blades === 0;
  const isWhole = (a, b) => a.gold === 330 && a.gel === 3 && a.bows === 1 && a.blades === 0 && b.gold === 270 && b.gel === 2 && b.blades === 1 && b.bows === 0;
  const res = await everyRestart(seed, path, (st) => {
    const bad = sameBooks(W0)(st);
    if (bad) return bad;
    const a = per(st, TA), b = per(st, TB);
    return (isNone(a, b) || isWhole(a, b)) ? null : { a, b };
  });
  check(`2. a restart before any of the commit's ${res.batches} write(s): nothing made or lost, the swap whole or not at all`, res.wrong.length === 0, res.wrong);
}

// ── 3. the receiver's weapon stash is full: the weapon owed, then mailed ──
{
  /* the small bags (`disable_bigbags`: 8 weapons) so B's stash is full */
  const full = Array.from({ length: 8 }, (_, i) => filler(i));
  const seed = await seedPlayers({ [TA]: { coins: 300, stash: [blade] }, [TB]: { coins: 300, inv: { [GEL]: 5 }, stash: full } }, { disable_bigbags: true });
  const W0 = books(seed);
  const path = tradePath();
  const m = await measure(seed, path);
  check('3. guard: B\'s stash is full (8 of 8)', m.room.WEAPON_STASH_CAP === 8 && (m.room.playerState[TB].weaponStash || []).length === 8, { cap: m.room.WEAPON_STASH_CAP });
  const inboxB = m.store.get('inbox:' + TB) || [];
  check('3. with no restart the trade is whole and the blade waits in B\'s mail; no escrow left',
    per(m.store, TB).blades === 1 && inboxB.some((e) => e.kind === 'weapon' && named(e.payload, BLADE) === 1) && per(m.store, TA).gold === 330 && per(m.store, TB).gold === 270 && !books(m.store).left.length,
    { b: per(m.store, TB), inbox: inboxB.length, left: books(m.store).left });
  const isNone = (a, b) => a.gold === 300 && a.blades === 1 && b.gold === 300 && b.gel === 5 && b.blades === 0;
  const isWhole = (a, b) => a.gold === 330 && a.gel === 3 && a.blades === 0 && b.gold === 270 && b.gel === 2 && b.blades === 1;
  let sawOwed = false;
  const res = await everyRestart(seed, {
    ...path,
    act: async (r, ctx) => {
      /* catch the owed record between the swap's write and the mail */
      const put = r.state.storage.put;
      r.state.storage.put = (k, v) => { if (typeof k === 'string' && k.startsWith('trade2wpn:') && v && v.to === TB) sawOwed = true; return put(k, v); };
      await path.act(r, ctx);
    },
  }, (st) => {
    const bad = sameBooks(W0)(st);
    if (bad) return bad;
    const a = per(st, TA), b = per(st, TB);
    return (isNone(a, b) || isWhole(a, b)) ? null : { a, b };
  });
  check('3. ...the swap\'s write marks the blade\'s record OWED to B (`to`)', sawOwed);
  check(`3. a restart before any of the commit's ${res.batches} write(s) (the swap, the mail, the record): nothing made or lost, the swap whole or not at all`, res.wrong.length === 0 && res.batches >= 3, res);
}

// ── 4. the sweep: owed records, orphans ──
{
  const seed = await seedPlayers({ [TA]: { coins: 0 }, [TB]: { coins: 0 } });
  const s = mkCrashState(seed);
  /* an owed record (the swap committed, the restart came before the mail), an
     owed one already delivered (its stamp on file: the record's delete was
     lost), and an orphan of a window a deploy voided */
  s._store.set('trade2wpn:' + TA + ':1', { pid: TA, sid: 'gone1', seq: 1, weapon: { ...blade }, ts: 0, to: TB, note: 'trade with A' });
  s._store.set('trade2wpn:' + TA + ':2', { pid: TA, sid: 'gone2', seq: 2, weapon: { ...blade, name: 'Twice-blade' }, ts: 0, to: TB });
  s._store.set('oplog:trade2:gone2:wpndeliver:' + TA + ':2', Date.now());
  s._store.set('trade2wpn:' + TB + ':3', { pid: TB, sid: 'gone3', seq: 3, weapon: { ...bow }, ts: 0 });
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  await joinOn(r, fakeWs('a4'), TA); await joinOn(r, fakeWs('b4'), TB);
  r._lastT2WpnSweep = 0; await r._trade2WpnSweep(); await settleIo();
  const stA = (r.playerState[TA].weaponStash || []).map((w) => w.name), stB = (r.playerState[TB].weaponStash || []).map((w) => w.name);
  check('4. an owed record goes to its receiver (B), not home to its owner', stB.filter((n) => n === BLADE).length === 1 && !stA.includes(BLADE), { stA, stB });
  check('4. ...an owed record already delivered (stamp on file) is only deleted: no second copy', !stA.includes('Twice-blade') && !stB.includes('Twice-blade'), { stA, stB });
  check('4. ...an orphan still goes home (B\'s bow back to B)', stB.includes(BOW) && !stA.includes(BOW), { stA, stB });
  check('4. ...and no escrow record is left', ![...s._store.keys()].some((k) => k.startsWith('trade2wpn:')), [...s._store.keys()].filter((k) => k.startsWith('trade2wpn:')));
  r._lastT2WpnSweep = 0; await r._trade2WpnSweep(); await settleIo();
  check('4. a second sweep pays nothing again', (r.playerState[TB].weaponStash || []).filter((w) => w.name === BLADE).length === 1);

  /* the switch thrown: an owed record is still the receiver's */
  const s2 = mkCrashState(seed);
  s2._store.set('liveflags', { tradeonewrite: false });
  s2._store.set('trade2wpn:' + TA + ':1', { pid: TA, sid: 'gone4', seq: 1, weapon: { ...blade }, ts: 0, to: TB });
  const r2 = new GameRoom(s2, mockEnv);
  await r2._liveFlagsEnsure();
  await joinOn(r2, fakeWs('a5'), TA); await joinOn(r2, fakeWs('b5'), TB);
  r2._lastT2WpnSweep = 0; await r2._trade2WpnSweep(); await settleIo();
  check('4. with `tradeonewrite: false` an owed record still goes to its receiver', (r2.playerState[TB].weaponStash || []).some((w) => w.name === BLADE) && !(r2.playerState[TA].weaponStash || []).some((w) => w.name === BLADE));
}

// ── 5. the kill switch: `tradeonewrite: false` puts back the old order ──
{
  const seed = await seedPlayers({ [TA]: { coins: 300, stash: [blade] }, [TB]: { coins: 300, inv: { [GEL]: 5 } } }, { tradeonewrite: false });
  const path = tradePath();
  const m = await measure(seed, path);
  check('5. off: with no restart the trade is still whole (B has the blade, 270 gold)', per(m.store, TB).blades === 1 && per(m.store, TB).gold === 270 && per(m.store, TA).gold === 330 && !books(m.store).left.length, { a: per(m.store, TA), b: per(m.store, TB) });
  check('5. off: ...in the old three writes (the swap, the blade, its record)', m.batches === 3, m.batches);
  const w = await crashRun(seed, 1, path);
  const a = per(w.store, TA), b = per(w.store, TB);
  check('5. off: ...and the old hole is back -- a restart before write 1 hands the blade home to A, who keeps B\'s gold (what the switch gives up)',
    a.blades === 1 && a.gold === 330 && b.blades === 0 && b.gold === 270, { a, b });
}

// ── 6. what the commit writes ──
{
  const on = await measure(seed1, tradePath());
  const offSeed = new Map(seed1); offSeed.set('liveflags', { tradeonewrite: false });
  const off = await measure(offSeed, tradePath());
  check(`6. a commit with a weapon is ONE write (${on.batches}; was ${off.batches})`, on.batches === 1 && off.batches === 3, { on: on.batches, off: off.batches });
  check(`6. ...and writes no more rows than before (${on.rows}; was ${off.rows}): the blade rides the receiver's save`, on.rows <= off.rows, { on: on.rows, off: off.rows });
}

// ── 7. _creditLiveTogether and a weapon that would not fit ──
{
  const seed = await seedPlayers({ [TA]: { coins: 10 } }, { disable_bigbags: true });
  const r = new GameRoom(mkCrashState(seed), mockEnv);
  await r._liveFlagsEnsure();
  await joinOn(r, fakeWs('a7'), TA);
  const ps = r.playerState[TA];
  ps.weaponStash = Array.from({ length: 7 }, (_, i) => filler(i));
  const two = [0, 1].map((i) => ({ pid: TA, entry: { opId: 'test:tow:' + i, source: 'test', kind: 'weapon', payload: { weapon: { ...blade } } } }));
  const gold = { pid: TA, entry: { opId: 'test:tow:g', source: 'test', kind: 'gold', payload: { amount: 5 } } };
  let called = false;
  const res = r._creditLiveTogether([gold, ...two], [TA], () => { called = true; return []; });
  check('7. two weapons into a stash with room for one: null, and nothing done (no gold, no weapon, no caller writes)',
    res === null && ps.coins === 10 && ps.weaponStash.length === 7 && !called, { res: res === null, coins: ps.coins, n: ps.weaponStash.length, called });
  const one = r._creditLiveTogether([gold, two[0]], [TA], () => { called = true; return []; });
  await one;
  check('7. ...one weapon into that room: paid with the gold, the caller\'s writes in the run', !!one && ps.coins === 15 && ps.weaponStash.length === 8 && called, { coins: ps.coins, n: ps.weaponStash.length, called });
}

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
