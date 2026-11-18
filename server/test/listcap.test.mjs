/* ═══ v2.3.5960: THE JOIN'S STORAGE LISTS READ A PAGE (card V5 PR 1; TRAPS §76) ═══
 *
 * The eleven `storage.list` calls a join reaches read a page now
 * (liveops.js LISTCAP, `_listPage`, `_listAll`, `_listNext`):
 *
 *   1. a SWEEP walks its prefix a page a call, its cursor in memory; the next
 *      page is an event of its own, so the walk ends with every record seen,
 *      and the five-minute pace starts a walk, never a page of one under way
 *      (the duel's escrows, the bounties);
 *   2. `listcap: false` reads the prefix whole in one list, as before;
 *   3. a REGISTRY (the clans) is read whole, a page an await, and a second
 *      caller meanwhile waits for the same read; a failed read leaves no
 *      empty registry behind;
 *   4. the arena's stakes: every plan is read before any stake, and a plan
 *      put while the walk was between pages keeps its stakes from a refund;
 *   5. the aim days (accuracy.js): a page of those past DAY_KEEP a flush;
 *   6. a player's copies (admin.js): one page, the oldest dailies first.
 * v2.3.5961 (PR 2), the other thirteen:
 *   7. `_listAll` with a most (an owner's page, LISTCAP.OWNER): it stops
 *      after the page that reaches it and says `more`;
 *   8. the owner's aim days read only the newest days they show;
 *   9. the chat reports' answer says `more` past LISTCAP.OWNER;
 *  10. the Leaderboard object pages `gone:` and `player:` (`_pages`), and
 *      `faceless` stops once it has found its limit.
 *
 * Every list the walks make is spied: each names a limit while the switch is
 * on.  The static census is tools/guards/traps-saves.test.mjs §76.
 */
import { makeStorage, openRoom, settle } from './testroom.mjs';
import { LISTCAP } from '../src/liveops.js';
import { ACC, accDayKey } from '../src/accuracy.js';
import { SNAPSHOT } from '../src/admin.js';
import { Leaderboard, BOARD_HOLD } from '../src/leaderboard.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* the lists a room makes, by prefix, their options as asked */
function spy(s) {
  const calls = [];
  const list = s.storage.list.bind(s.storage);
  s.storage.list = async (o) => { calls.push({ ...(o || {}) }); return list(o); };
  return calls;
}
/* a walk ends: its timers run until the predicate holds (at most ~2 s) */
async function until(pred) {
  for (let i = 0; i < 200 && !pred(); i++) await wait(LISTCAP.NEXT_MS + 2);
  await settle();
  return pred();
}
const count = (s, prefix) => [...s._store.keys()].filter((k) => k.startsWith(prefix)).length;

/* ── 1. a sweep, a page a call ── */
{
  const s = makeStorage();
  const N = LISTCAP.SWEEP * 2 + 7;
  for (let i = 0; i < N; i++) s._store.set('duelEscrow:old-' + String(i).padStart(3, '0'), { a: 'bp_lc_a', b: 'bp_lc_b', wager: 5, startedAt: 1 });
  const room = await openRoom(s);
  const calls = spy(s);
  await room._duelEscrowSweep();
  await settle();
  const first = count(s, 'duelEscrow:');
  check(`1. the duel's escrows: one call settles one page (${LISTCAP.SWEEP}) of ${N}`, first === N - LISTCAP.SWEEP, first);
  const paced = room._lastDuelSweep;
  check('1. ...the walk goes on, a page an event, to the end of the prefix', await until(() => count(s, 'duelEscrow:') === 0), count(s, 'duelEscrow:'));
  check('1. ...each orphan refunded to both sides, once', (s._store.get('inbox:bp_lc_a') || []).length === N && (s._store.get('inbox:bp_lc_b') || []).length === N,
    [(s._store.get('inbox:bp_lc_a') || []).length, (s._store.get('inbox:bp_lc_b') || []).length]);
  const mine = calls.filter((c) => c.prefix === 'duelEscrow:');
  check('1. every list of the walk names a limit, the next after the last key', mine.length >= 3 && mine.every((c) => c.limit === LISTCAP.SWEEP) && mine.slice(1).every((c) => typeof c.startAfter === 'string'), mine);
  check('1. the pace started the walk, and no page of it moved the pace', room._lastDuelSweep === paced && !room._duelSweepWalk.after && !room._duelSweepWalk.timer);
  const before = calls.length;
  await room._duelEscrowSweep();
  check('1. a call inside the five minutes after the walk lists nothing', calls.length === before);

  /* the bounties: a page of LISTCAP.PAGE */
  const B = LISTCAP.PAGE * 2 + 3;
  for (let i = 0; i < B; i++) s._store.set('bounty:bp_lc_' + String(i).padStart(4, '0'), { ts: 1, amount: 10 });
  await room._bountySweep();
  await settle();
  check(`1. the bounties: one call deletes one page (${LISTCAP.PAGE}) of ${B}`, count(s, 'bounty:') === B - LISTCAP.PAGE, count(s, 'bounty:'));
  check('1. ...and the walk ends with none left', await until(() => count(s, 'bounty:') === 0), count(s, 'bounty:'));
  check('1. ...every page named its limit', calls.filter((c) => c.prefix === 'bounty:').every((c) => c.limit === LISTCAP.PAGE));
}

/* ── 2. the switch thrown: whole, as before ── */
{
  const s = makeStorage();
  const N = LISTCAP.SWEEP * 2 + 7;
  for (let i = 0; i < N; i++) s._store.set('duelEscrow:old-' + i, { a: 'bp_lc_a', b: 'bp_lc_b', wager: 5, startedAt: 1 });
  const room = await openRoom(s, { listcap: false });
  const calls = spy(s);
  await room._duelEscrowSweep();
  await settle();
  check('2. `listcap: false`: one call settles every orphan', count(s, 'duelEscrow:') === 0, count(s, 'duelEscrow:'));
  const mine = calls.filter((c) => c.prefix === 'duelEscrow:');
  check('2. ...in one list with no limit, and no walk left', mine.length === 1 && mine[0].limit === undefined && !room._duelSweepWalk.after && !room._duelSweepWalk.timer, mine);
  check('2. the switch is read the lower-case way, on by default', room._listCapOff() && !(await openRoom(makeStorage()))._listCapOff());
}

/* ── 3. a registry: the clans ── */
{
  const s = makeStorage();
  const N = LISTCAP.PAGE * 2 + 5;
  for (let i = 0; i < N; i++) {
    const id = 'c' + String(i).padStart(4, '0');
    s._store.set('clan:' + id, { id, tag: 'T' + i, members: ['bp_lc_m' + i] });
  }
  const room = await openRoom(s);
  room._clanWarsLazyResolve = async () => {};
  room._clanPartyConvertAll = async () => {};
  const calls = spy(s);
  await Promise.all([room._clansEnsure(), room._clansEnsure()]);
  check(`3. the clans: all ${N} read, a page an await`, room._clans.size === N && room._clanByPlayer.get('bp_lc_m' + (N - 1)) === 'c' + String(N - 1).padStart(4, '0'), room._clans && room._clans.size);
  const mine = calls.filter((c) => c.prefix === 'clan:');
  check('3. ...each list names a limit, and a second caller waited for the same read (one walk)', mine.length === 3 && mine.every((c) => c.limit === LISTCAP.PAGE), mine);

  const s2 = makeStorage(new Map([['clan:c1', { id: 'c1', tag: 'A', members: ['bp_lc_x'] }]]));
  const r2 = await openRoom(s2);
  r2._clanWarsLazyResolve = async () => {};
  r2._clanPartyConvertAll = async () => {};
  const list = s2.storage.list.bind(s2.storage);
  let fail = true;
  s2.storage.list = async (o) => { if (fail) { fail = false; throw new Error('storage busy'); } return list(o); };
  let threw = false;
  try { await r2._clansEnsure(); } catch (e) { threw = true; }
  check('3. a failed read throws to its caller and leaves no empty registry behind', threw && !r2._clans);
  await r2._clansEnsure();
  check('3. ...so the next caller reads it', r2._clans && r2._clans.size === 1 && r2._clanOf('bp_lc_x') && r2._clanOf('bp_lc_x').tag === 'A');
}

/* ── 4. the arena's stakes ── */
{
  const s = makeStorage();
  s._store.set('arena_stake:T1:M1:bp_lc_sp', { tid: 'T1', matchId: 'M1', sponsorId: 'bp_lc_sp', amount: 50, ts: 1 });
  s._store.set('arena_stake:T1:M2:bp_lc_sq', { tid: 'T1', matchId: 'M2', sponsorId: 'bp_lc_sq', amount: 70, ts: 1 });
  const room = await openRoom(s);
  const list = s.storage.list.bind(s.storage);
  /* a settlement puts M1's plan after the plans were read, before the stakes are */
  s.storage.list = async (o) => {
    if (o && o.prefix === 'arena_stake:') s._store.set('arena_settle:T1:M1', { v: 0 });
    return list(o);
  };
  await room._arenaStakeSweep();
  await settle();
  check('4. a stake whose plan was put after the plans were read is left to its plan (no refund, kept)',
    s._store.has('arena_stake:T1:M1:bp_lc_sp') && !(s._store.get('inbox:bp_lc_sp') || []).length);
  check('4. ...a stake with no plan is refunded and goes, as before', !s._store.has('arena_stake:T1:M2:bp_lc_sq') && (s._store.get('inbox:bp_lc_sq') || []).length === 1);
  check('4. ...and the walk is done (both legs in one call when each is one page)', !room._stakeSweepWalk.leg && !room._stakeSweepWalk.timer);
}

/* ── 5. the aim days ── */
{
  const s = makeStorage();
  const N = ACC.DAY_KEEP + LISTCAP.PAGE + 40;
  for (let i = 0; i < N; i++) {
    const d = new Date(Date.UTC(2020, 0, 1) + i * 86400000);
    s._store.set(accDayKey(d.toISOString().slice(0, 10).replace(/-/g, '')), { v: 1, melee: [1, 0], ranged: [0, 0], staff: [0, 0] });
  }
  const room = await openRoom(s);
  const calls = spy(s);
  const keys = () => [...s._store.keys()].filter((k) => k.startsWith('accday:')).sort();
  const newest = keys().slice(-ACC.DAY_KEEP);
  await room._accDayFlush();
  await settle();
  check(`5. a flush drops a page (${LISTCAP.PAGE}) of the days past DAY_KEEP`, count(s, 'accday:') === N - LISTCAP.PAGE, count(s, 'accday:'));
  check('5. ...the newest DAY_KEEP kept, read as the newest DAY_KEEP + a page', newest.every((k) => s._store.has(k))
    && calls.filter((c) => c.prefix === 'accday:').every((c) => c.reverse === true && c.limit === ACC.DAY_KEEP + LISTCAP.PAGE));
  check('5. ...a full page leaves the day unpruned for the next flush', room._accPrunedDay === null);
  await room._accDayFlush();
  await settle();
  check(`5. the next flush brings it to DAY_KEEP (${ACC.DAY_KEEP}), the newest`, count(s, 'accday:') === ACC.DAY_KEEP && keys().join() === newest.join() && room._accPrunedDay !== null, count(s, 'accday:'));
}

/* ── 6. a player's copies ── */
{
  const s = makeStorage();
  const N = SNAPSHOT.LIST + 20;
  for (let i = 0; i < N; i++) s._store.set('rpgsnap:bp_lc_p:' + (20000101 + i), { v: 1 });
  s._store.set('rpgsnap:bp_lc_p:prereset-1', { v: 1 });
  const room = await openRoom(s);
  const calls = spy(s);
  await room._rpgSnapshotMaybe('bp_lc_p', { v: 1, coins: 1 });
  await settle();
  const mine = calls.filter((c) => c.prefix === 'rpgsnap:bp_lc_p:');
  check(`6. the prune reads one page of the copies (${SNAPSHOT.LIST})`, mine.length === 1 && mine[0].limit === SNAPSHOT.LIST, mine);
  const left = [...s._store.keys()].filter((k) => k.startsWith('rpgsnap:bp_lc_p:'));
  check('6. ...the oldest dailies go first, the parachute stays', left.length === N + 2 - (SNAPSHOT.LIST - SNAPSHOT.KEEP) && !left.includes('rpgsnap:bp_lc_p:20000101') && left.includes('rpgsnap:bp_lc_p:prereset-1'), left.length);
}

/* ── 7. a most: an owner's page ── */
{
  const s = makeStorage();
  const N = LISTCAP.PAGE * 3 + 9;
  for (let i = 0; i < N; i++) s._store.set('chain_score:bp_' + String(i).padStart(4, '0'), { at: i });
  const room = await openRoom(s);
  const calls = spy(s);
  const info = {};
  const got = await room._listAll('chain_score:', LISTCAP.PAGE * 2, info);
  check('7. `_listAll` with a most stops after the page that reaches it, and says more', got.size === LISTCAP.PAGE * 2 && info.more === true, [got.size, info]);
  const whole = await room._listAll('chain_score:');
  check('7. ...without one it reads the prefix whole, every list a page', whole.size === N && calls.every((c) => c.limit === LISTCAP.PAGE), whole.size);
  const off = await openRoom(s, { listcap: false });
  const i2 = {};
  check('7. `listcap: false`: whole in one read, never `more`', (await off._listAll('chain_score:', LISTCAP.PAGE, i2)).size === N && !i2.more);
}

/* ── 8. the owner's aim days ── */
{
  const s = makeStorage();
  for (let i = 0; i < ACC.DAY_KEEP; i++) {
    const d = new Date(Date.UTC(2020, 0, 1) + i * 86400000);
    s._store.set(accDayKey(d.toISOString().slice(0, 10).replace(/-/g, '')), { v: 1, melee: [i + 1, 0], ranged: [0, 0], staff: [0, 0] });
  }
  const room = await openRoom(s);
  const calls = spy(s);
  const r = await room._accAdminDays(5);
  const mine = calls.filter((c) => c.prefix === 'accday:');
  check('8. the owner\'s days: the newest five, read as five', r.ok && r.days.length === 5 && r.days[0].melee[0] === ACC.DAY_KEEP && mine.length === 1 && mine[0].reverse === true && mine[0].limit === 5, [r.days && r.days.map((x) => x.day), mine]);
}

/* ── 9. the chat reports past the most ── */
{
  const s = makeStorage();
  const now = Date.now();
  const N = LISTCAP.OWNER + 10;
  for (let i = 0; i < N; i++) s._store.set('chat_report:' + String(i).padStart(5, '0'), { at: now, by: 'bp_lc_by', target: 'bp_lc_t', text: 'x' });
  const room = await openRoom(s);
  const json = (o) => o;
  const url = new URL('http://x/api/admin/reports?limit=5');
  const r = await room._chatModAdminRoute({ method: 'GET' }, url, '/reports', json);
  check(`9. the chat reports read ${LISTCAP.OWNER} at most and say more`, r && r.ok && r.total === LISTCAP.OWNER && r.more === true && r.reports.length === 5, r && { total: r.total, more: r.more });
}

/* ── 10. the Leaderboard object ── */
{
  const store = new Map();
  const lists = [];
  const st = { storage: {
    get: async (k) => store.get(k),
    put: async (k, v) => { store.set(k, v); },
    delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    list: async (o = {}) => {
      lists.push({ ...o });
      const m = new Map();
      for (const [k, v] of [...store].sort()) {
        if (o.prefix && !k.startsWith(o.prefix)) continue;
        if (o.startAfter !== undefined && k <= o.startAfter) continue;
        m.set(k, v);
        if (o.limit && m.size >= o.limit) break;
      }
      return m;
    },
  } };
  const lb = new Leaderboard(st, {});
  const now = Date.now();
  const G = BOARD_HOLD.PAGE + 5;
  for (let i = 0; i < G; i++) store.set('gone:bp_g' + String(i).padStart(5, '0') + ':1', JSON.stringify({ gone: 1, lastSeen: 1 }));
  store.set('gone:bp_zz:' + now, JSON.stringify({ gone: now, lastSeen: now }));
  await lb.markGone({ playerId: 'bp_nobody' });
  const left = [...store.keys()].filter((k) => k.startsWith('gone:'));
  check(`10. markGone: every old stand-in of ${G} goes, read a page (${BOARD_HOLD.PAGE}) at a time`, left.length === 1 && lists.filter((c) => c.prefix === 'gone:').every((c) => c.limit === BOARD_HOLD.PAGE) && lists.filter((c) => c.prefix === 'gone:').length === 2, [left.length, lists.length]);
  for (let i = 0; i < 50; i++) store.set('player:bp_f' + String(i).padStart(3, '0'), JSON.stringify({ name: 'f' + i, lastSeen: now }));
  lists.length = 0;
  const ids = await lb.faceless(7);
  check('10. faceless: its limit found, a page read with a limit', ids.length === 7 && lists.length === 1 && lists[0].limit === BOARD_HOLD.PAGE, [ids.length, lists]);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
