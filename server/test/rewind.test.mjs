/* ═══ v2.3.5288: THE ROOM'S WAY BACK (grand plan step 4.7, card R PR 9) ═══
 * (the code: server/src/restore.js rewindPlan, rewindDo; the route: admin.js
 *  POST /api/admin/rewind; the spec: docs/specs/restore.md)
 *
 * Cloudflare keeps 30 days of a SQLite object's changes; the owner's lever
 * puts the whole room back to a time in two steps (a plan that changes
 * nothing, a do that closes every socket, sets the restore for the next start
 * and restarts).  Local workerd keeps no earlier times ("does not implement
 * point-in-time recovery"), so this runs on a STAND-IN storage: the shared
 * test room's (testroom.mjs makeStorage), with every committed run of writes
 * kept as a moment to go back to, and the three calls the lever uses.
 *
 *   1. THE ASK: minutes ago, a time, or an earlier answer's bookmark; a time
 *      to come, one past 30 days, or junk is refused in words;
 *   2. THE PLAN (the dry run) changes nothing: no record, no socket; it
 *      answers what it would restore and lose, the target, the bookmark of
 *      NOW, the sockets and players it would close, the hour to type back and
 *      a token; a storage with no earlier times, or one that throws, answers
 *      no-pitr;
 *   3. THE DO: no plan, a wrong token, the hour not typed back as the plan
 *      wrote it, a token used twice, a stale plan -- refused, nothing closed;
 *      with the token and the hour, every socket closed with
 *      1012 and its words, each player saved first (in the undo), the restore
 *      set to the plan's target, and the restart only after the answer;
 *   4. THE RESTART: a room started on the restored storage holds what it held
 *      at that time; the undo, planned and done, puts back the rest;
 *   5. THE WORLD'S SUM: a room played (the trade window, a gamble won and
 *      lost, the mail, the bank) -- every moment of its storage balances
 *      (unexplained gold 0, every bag key 0), so a rewind to any time is
 *      balanced; and through the lever: unexplained 0 after the rewind;
 *   6. THE ROUTE AND ITS SWITCH: behind the owner's key; any ask but a do is
 *      the dry run; OFF until `roomrewind: true` is in the live flags (the
 *      planning session's limits).
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-14:
 *   - `room._rewind = null;` deleted from rewindDo                -> FAIL 3 (a token used twice)
 *   - the sockets' loop moved after onNextSessionRestoreBookmark  -> FAIL 3 (the leavers' saves not in the undo)
 *   - `if (at >= now)` deleted from rewindTarget                  -> FAIL 1
 *   - the `b.confirm !== p.confirm` line made `if (false)`         -> FAIL 3 (the hour not typed back)
 */
import { makeStorage, openRoom, join, fakeWs, settle, seededClock } from './testroom.mjs';
import { REWIND, rewindTarget, rewindPlan, rewindDo, rewindOn, rewindConfirm } from '../src/restore.js';
import { count, unexplained } from '../src/worldsum.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const clock = seededClock({ start: Date.UTC(2026, 10, 14, 12, 0, 0), seed: 9 }).install();
const NOW0 = clock.now();
const wait = (ms) => new Promise((r) => globalThis.setTimeout(r, ms));

/* ══════════ THE STAND-IN: every committed run a moment to go back to ══════════
   A makeStorage whose put and delete also note the store once their run has
   committed (the run's commit is queued first, so a microtask queued after
   it sees it done), at the clock's time; the three calls of Cloudflare's
   point-in-time recovery; and the next start's restore, by `restart()`. */
function pitrStorage(seed) {
  const st = makeStorage(seed);
  const moments = [];   /* {bm, t, store} oldest first */
  let v = 0, queued = false, pending = null;
  const bmOf = (n) => n.toString(16).padStart(8, '0') + '-0000-0000';
  const note = () => {
    const store = new Map([...st._store].map(([k, x]) => [k, structuredClone(x)]));
    const m = { bm: bmOf(++v), t: clock.now(), store };
    moments.push(m);
    return m;
  };
  note();   /* the start */
  const after = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; if (!st.dead()) note(); }); };
  const put = st.storage.put.bind(st.storage), del = st.storage.delete.bind(st.storage);
  st.storage.put = async (k, x) => { const r = put(k, x); after(); return r; };
  st.storage.delete = async (k) => { const r = del(k); after(); return r; };
  st.storage.getCurrentBookmark = async () => note().bm;
  st.storage.getBookmarkForTime = async (t) => {
    let best = moments[0];
    for (const m of moments) if (m.t <= t) best = m;
    return best.bm;
  };
  st.storage.onNextSessionRestoreBookmark = async (bm) => {
    const m = moments.find((x) => x.bm === bm);
    if (!m) throw new Error('no such bookmark');
    const undo = note().bm;   /* the room as it is now: the way back */
    pending = m;
    return undo;
  };
  st.aborted = [];
  st.abort = (why) => { st.aborted.push({ why, at: Date.now() }); };
  /** The next start: the restore applied, if one was set. */
  st.restart = () => {
    if (!pending) return false;
    st._store.clear();
    for (const [k, x] of pending.store) st._store.set(k, structuredClone(x));
    pending = null;
    note();
    return true;
  };
  st.moments = moments;
  return st;
}
const seedRec = (coins, inventory) => ({ _v: 21, coins, inventory: { ...inventory }, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
const world = () => new Map([
  ['rpg:bp_rw_a', seedRec(1000, { fish_minnow: 20, wood_oak: 10 })],
  ['rpg:bp_rw_b', seedRec(800, { ore_iron_ore: 6 })],
]);
const send = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };

/* ══════════ 1. THE ASK ══════════ */
{
  const now = NOW0;
  const t = (b) => rewindTarget(b, now);
  check('1. minutes ago, a time, an earlier answer\'s bookmark',
    t({ minutesAgo: 60 }).at === now - 3600000 && t({ at: now - 5000 }).at === now - 5000 && t({ bookmark: '0000000a-0000-r' }).bookmark === undefined && t({ bookmark: '0000000a-0000-0' }).bookmark === '0000000a-0000-0');
  const bad = [{}, null, { minutesAgo: 'x' }, { minutesAgo: 0 }, { minutesAgo: -5 }, { at: now + 1 }, { at: now }, { minutesAgo: 31 * 24 * 60 }, { bookmark: '' }, { bookmark: 'x'.repeat(10) }, { bookmark: 'a'.repeat(201) }, { bookmark: 5 }];
  const ok = bad.filter((b) => !t(b).error);
  check('1. ...and a time to come, now, past 30 days, or junk is refused in words', ok.length === 0 && typeof t({}).error === 'string', ok);
}

/* ══════════ 2. THE PLAN changes nothing ══════════ */
const ON = { roomrewind: true };   /* the lever is OFF until the owner sets this */
async function playedRoom(flags) {
  const st = pitrStorage(world());
  const room = await openRoom(st, { ...ON, ...(flags || {}) });
  room._liveFlags.roomrow = false;
  const wa = fakeWs('a'), wb = fakeWs('b');
  await join(room, wa, 'bp_rw_a', { loginTaken: true });
  await join(room, wb, 'bp_rw_b', { loginTaken: true });
  return { st, room, wa, wb };
}
{
  const { st, room, wa, wb } = await playedRoom();
  clock.advance(60000);
  const before = JSON.stringify([...st._store]);
  const nMoments = st.moments.length;
  const p = await rewindPlan(room, { minutesAgo: 1 });
  await settle();
  check('2. the plan answers the target, the bookmark of now, what it would close, the hour to type back, and a token',
    p.ok && p.step === 'plan' && p.dryRun === true && typeof p.target === 'string' && typeof p.now === 'string' && p.target !== p.now && p.sockets === 2 && p.players === 2 && /^[0-9a-f]{32}$/.test(p.token) && /close 2 connection/.test(p.words)
      && p.confirm === rewindConfirm({ at: p.at }) && /^\d{4}-\d\d-\d\d \d\d:\d\d UTC$/.test(p.confirm) && p.words.includes(p.confirm), p);
  check('2. ...what it would RESTORE and what it would LOSE, in numbers and words (who is in the room)',
    p.restore && p.restore.at === p.at && /as it was at/.test(p.restore.words) && p.lose && p.lose.minutes === 1 && p.lose.playersHere === 2 && p.lose.players.length === 2 && /Everything written after/.test(p.lose.words) && /RESTORE/.test(p.words) && /LOSE/.test(p.words), { restore: p.restore, lose: p.lose });
  check('2. ...and changes nothing: no record, no socket, no restart', JSON.stringify([...st._store]) === before && !wa.closed && !wb.closed && st.aborted.length === 0 && st.moments.length === nMoments + 1, { closed: [wa.closed, wb.closed] });
  /* a storage with no earlier times; one that throws */
  const plain = await openRoom(makeStorage(), ON);
  const np = await rewindPlan(plain, { minutesAgo: 5 });
  check('2. a storage with no earlier times answers no-pitr', !np.ok && np.error === 'no-pitr', np);
  const st2 = pitrStorage();
  st2.storage.getBookmarkForTime = async () => { throw new Error('This Durable Object\'s storage back-end does not implement point-in-time recovery.'); };
  const r2 = await openRoom(st2, ON);
  const tp = await rewindPlan(r2, { minutesAgo: 5 });
  check('2. ...and one that throws (local workerd\'s words) answers no-pitr, with them', !tp.ok && tp.error === 'no-pitr' && /point-in-time/.test(tp.words) && !r2._rewind, tp);
  const ask = await rewindPlan(room, { at: Date.now() + 9 });
  check('2. a bad ask answers in words, and keeps no plan over the last', !ask.ok && ask.error === 'ask' && room._rewind && room._rewind.token === p.token, ask);
}

/* ══════════ 3. THE DO ══════════ */
{
  const { st, room, wa, wb } = await playedRoom();
  const none = await rewindDo(room, { token: 'x' });
  check('3. no plan: refused, nothing closed', !none.ok && none.error === 'token' && !wa.closed && !wb.closed);
  clock.advance(60000);
  const p = await rewindPlan(room, { minutesAgo: 1 });
  const wrong = await rewindDo(room, { token: p.token.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')) });
  check('3. a wrong token: refused, nothing closed, the plan kept', !wrong.ok && wrong.error === 'token' && !wa.closed && room._rewind && room._rewind.token === p.token);
  /* A's purse changes in memory after the plan: the leave must save it into the undo */
  /* A is paid after the plan, and the save waits (its unsaved part marked,
     as the regen marks it): the leave's own save must carry it into the undo */
  room._goldGive(room.playerState.bp_rw_a, 7, 'quest_reward');
  room.playerState.bp_rw_a._regenDirty = true;
  const noHour = await rewindDo(room, { token: p.token });
  const badHour = await rewindDo(room, { token: p.token, confirm: p.confirm.replace(/\d UTC$/, (m) => (m[0] === '9' ? '0' : String(+m[0] + 1)) + ' UTC') });
  check('3. the hour not typed back, or typed wrong: refused in words, nothing closed, the plan kept',
    !noHour.ok && noHour.error === 'confirm' && noHour.words.includes(p.confirm) && !badHour.ok && badHour.error === 'confirm' && !wa.closed && !wb.closed && room._rewind && room._rewind.token === p.token, { noHour, badHour });
  const d = await rewindDo(room, { token: p.token, confirm: p.confirm });
  check('3. ...the do\'s answer says what it restored and what was lost', d.ok && d.restore && d.lose && d.lose.playersHere === 2 && /RESTORED/.test(d.words) && /LOST/.test(d.words), d);
  check('3. the do: every socket closed with 1012 and its words', d.ok && d.closed === 2 && wa.closed && wa.closed.code === REWIND.CLOSE_CODE && wa.closed.why === REWIND.CLOSE_WHY && wb.closed && wb.closed.code === 1012, { d, wa: wa.closed });
  check('3. ...each player left through the leave door (out of the room), and was saved first', !room.playerState.bp_rw_a && !room.playerState.bp_rw_b && st._store.get('rpg:bp_rw_a').coins === 1007, st._store.get('rpg:bp_rw_a') && st._store.get('rpg:bp_rw_a').coins);
  const undoM = st.moments.find((m) => m.bm === d.undo);
  check('3. ...the undo holds the leavers\' saves (the room as it was just before)', !!undoM && undoM.store.get('rpg:bp_rw_a').coins === 1007, undoM && undoM.store.get('rpg:bp_rw_a'));
  check('3. ...the restart comes only after the answer', st.aborted.length === 0);
  await wait(REWIND.ABORT_MS + 30);
  check('3. ...and then, once', st.aborted.length === 1, st.aborted);
  const again = await rewindDo(room, { token: p.token, confirm: p.confirm });
  check('3. a token used twice: refused', !again.ok && again.error === 'token');
  /* a stale plan */
  const p2 = await rewindPlan(room, { minutesAgo: 1 });
  clock.advance(REWIND.PLAN_TTL_MS + 1);
  const stale = await rewindDo(room, { token: p2.token, confirm: p2.confirm });
  check('3. a plan older than PLAN_TTL_MS: refused', !stale.ok && stale.error === 'stale' && st.aborted.length === 1);
  /* the storage refuses the restore */
  const p3 = await rewindPlan(room, { minutesAgo: 1 });
  st.storage.onNextSessionRestoreBookmark = async () => { throw new Error('refused'); };
  const ref = await rewindDo(room, { token: p3.token, confirm: p3.confirm });
  await wait(REWIND.ABORT_MS + 30);
  check('3. a restore the storage refuses: said in words, and no restart', !ref.ok && ref.error === 'restore' && /Nothing was put back/.test(ref.words) && st.aborted.length === 1, ref);
}

/* ══════════ 4. THE RESTART, AND THE UNDO ══════════ */
{
  const { st, room, wa, wb } = await playedRoom();
  for (const w of [wa, wb]) await room.webSocketClose(w, 1000, 'bye', true);
  await settle();
  clock.advance(60000);
  const tBack = Date.now();
  const then = JSON.stringify([...st._store].filter(([k]) => k.startsWith('rpg:')));
  clock.advance(60000);
  /* more play after: A comes back and is paid */
  const wa2 = fakeWs('a2');
  await join(room, wa2, 'bp_rw_a', { loginTaken: true });
  room._goldGive(room.playerState.bp_rw_a, 500, 'quest_reward');
  await room._saveRpg('bp_rw_a', room.playerState.bp_rw_a);   /* as a hand-in saves before it answers */
  await room.webSocketClose(wa2, 1000, 'bye', true);
  await settle();
  clock.advance(60000);
  const later = st._store.get('rpg:bp_rw_a').coins;
  const p = await rewindPlan(room, { at: tBack });
  const d = await rewindDo(room, { token: p.token, confirm: p.confirm });
  await wait(REWIND.ABORT_MS + 30);
  check('4. the do went through', d.ok && st.aborted.length === 1 && later === 1500, { d, later });
  st.restart();
  const back = await openRoom(st, ON);
  const now = JSON.stringify([...st._store].filter(([k]) => k.startsWith('rpg:')));
  check('4. a room started on the restored storage holds what it held then (the 500 not paid)', now === then && st._store.get('rpg:bp_rw_a').coins === 1000, { a: st._store.get('rpg:bp_rw_a').coins });
  const wa3 = fakeWs('a3');
  await join(back, wa3, 'bp_rw_a', { loginTaken: true });
  check('4. ...and a player joins into it', back.playerState.bp_rw_a && back.playerState.bp_rw_a.coins === 1000);
  await back.webSocketClose(wa3, 1000, 'bye', true);
  await settle();
  /* the undo: planned and done, it puts back everything up to the rewind */
  const u = await rewindPlan(back, { bookmark: d.undo });
  const ud = await rewindDo(back, { token: u.token, confirm: u.confirm });
  await wait(REWIND.ABORT_MS + 30);
  st.restart();
  check('4. the undo, planned and done, puts back the rest (the 500 paid); its words to type back are the bookmark\'s', u.ok && ud.ok && u.confirm === 'bookmark ' + d.undo.slice(0, 8) && st._store.get('rpg:bp_rw_a').coins === 1500, { u: u.error, a: st._store.get('rpg:bp_rw_a').coins });
}

/* ══════════ 5. THE WORLD'S SUM ══════════ */
{
  const { st, room, wa, wb } = await playedRoom();
  const A = room.playerState.bp_rw_a, B = room.playerState.bp_rw_b;
  const start = count(null, st.moments[0].store);
  /* the trade window: gold and goods both ways */
  for (const p of [A, B]) { p.z = 'town'; p.x = 0; p.y = 0; }
  await send(room, wa, 'trade2_open', { target: 'bp_rw_b' });
  await send(room, wb, 'trade2_open', { target: 'bp_rw_a' });
  await send(room, wa, 'trade2_set', { offer: { fish_minnow: 5, _gold: 200 } });
  await send(room, wb, 'trade2_set', { offer: { ore_iron_ore: 2 } });
  await send(room, wa, 'trade2_ready', { ready: true });
  await send(room, wb, 'trade2_ready', { ready: true });
  clock.advance(5000);
  await send(room, wa, 'trade2_confirm');
  await send(room, wb, 'trade2_confirm');
  const traded = B.inventory.fish_minnow === 5 && A.inventory.ore_iron_ore === 2;
  /* a gamble won and lost (a mint, a burn) */
  const rnd = Math.random;
  Math.random = () => 0.0; await send(room, wa, 'gamble_request', { wager: 100 });
  A._lastGambleAt = 0; clock.advance(5000);
  Math.random = () => 0.99; await send(room, wa, 'gamble_request', { wager: 50 });
  Math.random = rnd;
  /* the mail: a grant to B, here (a mint, landing at once), saved at its pace */
  await room._creditPlayer('bp_rw_b', { opId: 'admin:rw1', source: 'admin', kind: 'gold', payload: { amount: 75 }, note: 'grant' });
  await room._saveRpg('bp_rw_a', A); await room._saveRpg('bp_rw_b', B); await settle();
  clock.advance(60000);
  /* both leave; A comes back, sells to Diego and leaves */
  for (const w of [wa, wb]) await room.webSocketClose(w, 1000, 'bye', true);
  await settle();
  const wa2 = fakeWs('a2');
  await join(room, wa2, 'bp_rw_a', { loginTaken: true });
  await send(room, wa2, 'shop_sell', { key: 'wood_oak', qty: 3 });
  await room.webSocketClose(wa2, 1000, 'bye', true);
  await settle();
  check('5. the room played: a trade, a gamble won and lost, a grant, Diego', traded && st.moments.length > 8, { traded, moments: st.moments.length });
  /* every moment of the storage balances against the start */
  const off = [];
  for (const m of st.moments) {
    const u = unexplained(start, count(null, m.store));
    if (u.gold !== 0 || Object.keys(u.goods).length) off.push({ bm: m.bm, gold: u.gold, goods: u.goods });
  }
  check('5. every moment of the played room\'s storage balances (' + st.moments.length + ' moments): a rewind to any time is balanced', off.length === 0, off.slice(0, 3));
  /* and through the lever, to the middle of it */
  const mid = st.moments[Math.floor(st.moments.length / 2)];
  const p = await rewindPlan(room, { bookmark: mid.bm });
  const d = await rewindDo(room, { token: p.token, confirm: p.confirm });
  await wait(REWIND.ABORT_MS + 30);
  st.restart();
  const back = await openRoom(st);
  const u = unexplained(start, count(back, st));
  check('5. through the lever, to the middle of the play: unexplained gold 0, every bag key 0', d.ok && u.gold === 0 && Object.keys(u.goods).length === 0, { d: d.error, u });
}

/* ══════════ 6. THE ROUTE, AND THE SWITCH ══════════ */
{
  check('6. OFF by default: on only with `roomrewind: true`', rewindOn({ _liveFlags: { roomrewind: true } }) && !rewindOn({ _liveFlags: {} }) && !rewindOn({ _liveFlags: { roomrewind: false } }) && !rewindOn({ _liveFlags: { roomrewind: 'yes' } }) && !rewindOn({}));
  for (const flags of [{ roomrewind: false }, { roomrewind: undefined }]) {
    const { room, wa } = await playedRoom(flags);
    if (flags.roomrewind === undefined) delete room._liveFlags.roomrewind;
    const p = await rewindPlan(room, { minutesAgo: 1 });
    room._rewind = { token: 'f'.repeat(32), target: '00000001-0000-0', confirm: 'x', at: 1, made: Date.now() };
    const d = await rewindDo(room, { token: 'f'.repeat(32), confirm: 'x' });
    check('6. ...' + (flags.roomrewind === false ? '`roomrewind: false`' : 'with no flag (the default)') + ': the plan and the do both answer off, nothing closed', !p.ok && p.error === 'off' && /roomrewind: true/.test(p.words) && !d.ok && d.error === 'off' && !wa.closed);
  }
  /* the route: the owner's key, and nothing else */
  const st = pitrStorage(world());
  const { GameRoom } = await import('../src/index.js');
  const r = new GameRoom(st, { ADMIN_KEY: 'k-owner', LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
  await r._liveFlagsEnsure();
  r._liveFlags.roomrewind = true;
  const req = (key, body) => new Request('https://x/api/admin/rewind', { method: 'POST', headers: key ? { Authorization: 'Bearer ' + key } : {}, body: JSON.stringify(body) });
  const noKey = await r._adminFetch(req(null, { step: 'plan', minutesAgo: 1 }));
  const badKey = await r._adminFetch(req('nope', { step: 'plan', minutesAgo: 1 }));
  clock.advance(60000);
  const good = await r._adminFetch(req('k-owner', { step: 'plan', minutesAgo: 1 }));
  const gj = await good.json();
  const noStep = await r._adminFetch(req('k-owner', { minutesAgo: 1 }));
  const nj = await noStep.json();
  check('6. the route answers only the owner\'s key (401 without), and plans; an ask with no step is the dry run too', noKey.status === 401 && badKey.status === 401 && good.status === 200 && gj.ok && gj.step === 'plan' && noStep.status === 200 && nj.step === 'plan' && nj.dryRun === true && st.aborted.length === 0, { noKey: noKey.status, good: good.status, gj, nj });
  const done = await r._adminFetch(req('k-owner', { step: 'do', token: nj.token, confirm: nj.confirm }));
  const dj = await done.json();
  await wait(REWIND.ABORT_MS + 30);
  check('6. ...and does, with the plan\'s token', done.status === 200 && dj.ok && typeof dj.undo === 'string' && st.aborted.length === 1, dj);
}

clock.restore();
console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('rewind: FAILED'); process.exit(1); }
console.log('all rewind checks passed');
