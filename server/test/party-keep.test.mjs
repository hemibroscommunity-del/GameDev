/* A party that lasts (v2.3.3284, docs/specs/party.md "A party that lasts").
 *
 * The owner: a party "that stays persistent until you remove yourself from
 * the party and it becomes 'alliance' at 20+ people", then "Go recommended".
 * Step 1: the party is STORED (party:<id>, party_by_player:<pid>), keeps its
 * offline members, grows past four, and dungeons stay four.  The party of
 * four in memory is still party.test.mjs, run under the kill switch.
 *
 *   1. caps.partykeep; the roster says its `max` (50).
 *   2. Forming a party stores the record and both indexes.
 *   3. It grows past four (six), and stops at KEEP_MAX: the next invite 'full'.
 *   4. An offline member STAYS past OFFLINE_GRACE_MS, shown `off` with `seen`.
 *   5. A deploy (a new room on the same storage): the first member back gets
 *      the whole roster, the others offline; the next one back is online.
 *   6. Leaving and kicking (an offline member too) drop the index and rewrite
 *      the record; the leader leaving hands it to the oldest member; a party
 *      down to one is deleted, both indexes with it.
 *   7. The index is the truth: a record listing a member whose index names
 *      another party loses them at the next load, and the record is rewritten;
 *      a record that does not list its reader drops the reader's index.
 *   8. A failed read fails closed: that player can neither invite nor be
 *      invited ('not-loaded' / 'target-busy') until a join reads it.
 *   9. A record of a newer shape is left untouched, its reader unknown.
 *  10. A leader not seen for LEADER_IDLE_MS hands the party on at a member's
 *      join, to the longest-standing member online.
 *  11. A reconnect storm writes nothing; a stale `seen` is written once.
 *  12. A character restart leaves the party, online or not.
 *  13. Dungeons stay four: the leader pulls the three members nearest them.
 *  14. The kill switch, `partykeep: false`: nothing read or written, four at
 *      most, caps.partykeep false.
 *  15. The wire still says `away` for an offline member (an older game).
 */
import { GameRoom } from '../src/index.js';
import { PARTY } from '../src/party.js';
import { partyRows, PARTY_ROWS, seenAgo, memberOffline } from '../../src/game/partyRows.js';
import { readFileSync } from 'node:fs';

function makeState(seed) {
  const store = new Map(seed || []);
  const st = {
    puts: [], deletes: [], throwOn: null,
    storage: {
      get: async (k) => {
        if (Array.isArray(k)) {
          const out = new Map();
          for (const x of k) { if (st.throwOn && st.throwOn(x)) throw new Error('storage down'); if (store.has(x)) out.set(x, store.get(x)); }
          return out;
        }
        if (st.throwOn && st.throwOn(k)) throw new Error('storage down');
        return store.get(k);
      },
      put: async (k, v) => { st.puts.push(k); store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { st.deletes.push(k); store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
  return st;
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const lastParty = (ws) => { const r = msgsOfType(ws, 'party_state'); return r[r.length - 1] && r[r.length - 1].payload; };
const lastErr = (ws) => { const r = msgsOfType(ws, 'party_error'); return r[r.length - 1] && r[r.length - 1].payload; };
const ids = (p) => (p && p.members ? p.members.map((m) => m.id) : []);
const flush = () => new Promise((r) => setTimeout(r, 0));

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const P = (n) => 'bp_pk_' + n;
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(room, ws, id, name, at) {
  room.sessions.set(ws, baseSession());
  const a = at || { x: 0, y: 0, z: 'town' };
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data: { x: a.x, y: a.y, z: a.z } }));
  await flush();
}
const cmd = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await flush(); };
const close = async (room, ws) => { await room.webSocketClose(ws); await flush(); };
async function form(room, wss, leader, others) {
  for (const o of others) {
    await cmd(room, wss[leader], 'party_invite', { target: P(o) });
    await cmd(room, wss[o], 'party_accept', { target: P(leader) });
  }
}

// ── 1-3: forming, storing, growing ──
const state = makeState();
const room = new GameRoom(state, mockEnv);
const wss = {};
for (const n of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) { wss[n] = fakeWs(n); await join(room, wss[n], P(n), n.toUpperCase()); }

const sync = wss.a.sent.find((m) => m.type === 'state_sync');
check('1. state_sync advertises caps.partykeep', sync && sync.caps && sync.caps.partykeep === true, sync && sync.caps && sync.caps.partykeep);

await form(room, wss, 'a', ['b']);
let pa = lastParty(wss.a);
const pid1 = pa && pa.id;
check('1. the roster says how many it can hold (max 50)', pa && pa.max === PARTY.KEEP_MAX && PARTY.KEEP_MAX === 50, pa && pa.max);
const rec1 = state._store.get('party:' + pid1);
/* v2.3.3311: PARTY.V is 2 (a record with an alliance, alliance.js); a party
   that never was one stays shape 1, so a rollback to v2.3.3284 reads it */
check('2. forming a party stores the record: its id, leader, members oldest first, shape v1',
  rec1 && rec1.id === pid1 && rec1.leader === P('a') && rec1.members.join() === [P('a'), P('b')].join() && rec1.v === 1 && PARTY.V === 2, rec1);
check('2. ...each member\'s name, level, when they joined and when last seen',
  rec1 && rec1.meta && rec1.meta[P('a')] && rec1.meta[P('a')].name === 'A' && rec1.meta[P('b')].name === 'B'
    && rec1.meta[P('b')].level >= 1 && rec1.meta[P('b')].at > 0 && rec1.meta[P('b')].seen > 0, rec1 && rec1.meta);
check('2. ...and both indexes name it', state._store.get('party_by_player:' + P('a')) === pid1 && state._store.get('party_by_player:' + P('b')) === pid1,
  [state._store.get('party_by_player:' + P('a')), state._store.get('party_by_player:' + P('b'))]);

await form(room, wss, 'a', ['c', 'd', 'e', 'f']);
pa = lastParty(wss.a);
check('3. it grows past four: six members', ids(pa).length === 6 && ids(pa).join() === ['a', 'b', 'c', 'd', 'e', 'f'].map(P).join(), ids(pa));
check('3. ...and the record holds all six', (state._store.get('party:' + pid1) || {}).members.length === 6, state._store.get('party:' + pid1));

/* KEEP_MAX: fill a second party to the cap with players of its own */
{
  const st2 = makeState();
  const r2 = new GameRoom(st2, mockEnv);
  const w2 = {};
  const names = [];
  for (let i = 0; i <= PARTY.KEEP_MAX; i++) { const n = 'm' + i; names.push(n); w2[n] = fakeWs(n); await join(r2, w2[n], P(n), 'M' + i); }
  await form(r2, w2, 'm0', names.slice(1, PARTY.KEEP_MAX));
  const full = lastParty(w2.m0);
  check(`3. a party stops at KEEP_MAX (${PARTY.KEEP_MAX} members)`, ids(full).length === PARTY.KEEP_MAX, ids(full).length);
  w2.m0.sent.length = 0;
  const last = names[PARTY.KEEP_MAX];
  await cmd(r2, w2.m0, 'party_invite', { target: P(last) });
  check("3. ...the next invite is answered 'full'", lastErr(w2.m0) && lastErr(w2.m0).reason === 'full', lastErr(w2.m0));
}

// ── 4: an offline member stays ──
await close(room, wss.b);
room._tickParties(Date.now() + PARTY.OFFLINE_GRACE_MS + 5000);
pa = lastParty(wss.a);
const bOff = pa && pa.members.find((m) => m.id === P('b'));
check('4. an offline member STAYS past the old grace window', ids(pa).includes(P('b')) && !!room._partyOf(P('b')), ids(pa));
check('4. ...shown offline (off: 1) with when they were last on (seen, seconds)', bOff && bOff.off === 1 && typeof bOff.seen === 'number' && bOff.seen >= 0, bOff);
check('15. ...and `away` still true for an older game', bOff && bOff.away === true, bOff);
check('4. ...nobody was told the party ended', !msgsOfType(wss.a, 'party_state').some((m) => m.payload.state === 'none'));

// ── 5: a deploy ──
for (const n of ['a', 'c', 'd', 'e', 'f']) await close(room, wss[n]);
const roomB = new GameRoom(state, mockEnv);   /* the same storage: a worker deploy */
const wb = {};
wb.c = fakeWs('c2');
await join(roomB, wb.c, P('c'), 'C');
let pc = lastParty(wb.c);
check('5. after a deploy, the first member back is sent the whole roster', pc && pc.id === pid1 && ids(pc).length === 6, pc && ids(pc));
check('5. ...the leader kept (A), everyone else offline',
  pc && pc.leader === P('a') && pc.members.filter((m) => m.id !== P('c')).every((m) => m.off === 1) && !pc.members.find((m) => m.id === P('c')).off, pc && pc.members);
const syncIdx = wb.c.sent.findIndex((m) => m.type === 'state_sync');
const partyIdx = wb.c.sent.findIndex((m) => m.type === 'party_state');
check('5. ...after its state_sync (the game clears its party on every sync)', syncIdx >= 0 && partyIdx > syncIdx, { syncIdx, partyIdx });
wb.d = fakeWs('d2');
await join(roomB, wb.d, P('d'), 'D');
pc = lastParty(wb.c);
check('5. the next one back is online on the first one\'s screen', pc && pc.members.find((m) => m.id === P('d')) && !pc.members.find((m) => m.id === P('d')).off, pc && pc.members);
check('5. ...one record in memory for the party, both members on it', roomB._partyOf(P('c')) && roomB._partyOf(P('c')) === roomB._partyOf(P('d')));

// ── 6: leave, kick, the leader, a disband ──
wb.a = fakeWs('a2');
await join(roomB, wb.a, P('a'), 'A');
await cmd(roomB, wb.d, 'party_leave');
let rec = state._store.get('party:' + pid1);
check('6. leaving drops your index and rewrites the record without you',
  !state._store.has('party_by_player:' + P('d')) && rec && !rec.members.includes(P('d')) && rec.members.length === 5, rec && rec.members);
check("6. ...and you are told (state 'none', 'left')", lastParty(wb.d) && lastParty(wb.d).state === 'none' && lastParty(wb.d).reason === 'left', lastParty(wb.d));
await cmd(roomB, wb.a, 'party_kick', { target: P('e') });   /* E is offline */
rec = state._store.get('party:' + pid1);
check('6. the leader can kick an OFFLINE member: their index goes, the record without them',
  !state._store.has('party_by_player:' + P('e')) && rec && !rec.members.includes(P('e')), rec && rec.members);
wb.e = fakeWs('e2');
await join(roomB, wb.e, P('e'), 'E');
check('6. ...and back online they are in no party', !roomB._partyOf(P('e')) && !(lastParty(wb.e) && lastParty(wb.e).state === 'open'), lastParty(wb.e));
await cmd(roomB, wb.a, 'party_leave');
rec = state._store.get('party:' + pid1);
check('6. the leader leaving hands it to the oldest member (B, offline)', rec && rec.leader === P('b') && lastParty(wb.c).leader === P('b'), rec && rec.leader);
/* a two: E and G */
wb.g = fakeWs('g2');
await join(roomB, wb.g, P('g'), 'G');
await form(roomB, wb, 'e', ['g']);
const pid2 = lastParty(wb.e) && lastParty(wb.e).id;
check('6. a second party forms (guard)', !!pid2 && state._store.has('party:' + pid2), pid2);
await cmd(roomB, wb.g, 'party_leave');
check('6. a party down to one is DELETED, both indexes with it',
  !state._store.has('party:' + pid2) && !state._store.has('party_by_player:' + P('e')) && !state._store.has('party_by_player:' + P('g')));
check("6. ...the one left told 'disbanded'", lastParty(wb.e) && lastParty(wb.e).state === 'none' && lastParty(wb.e).reason === 'disbanded', lastParty(wb.e));

// ── 7: the index is the truth ──
{
  const st = makeState([
    ['party:px', { v: 1, id: 'px', leader: P('x'), members: [P('x'), P('y'), P('z')], meta: { [P('x')]: { name: 'X', level: 2, at: 1, seen: Date.now() }, [P('y')]: { name: 'Y', level: 2, at: 2, seen: Date.now() }, [P('z')]: { name: 'Z', level: 2, at: 3, seen: Date.now() } }, ts: 1 }],
    ['party_by_player:' + P('x'), 'px'],
    ['party_by_player:' + P('y'), 'px'],
    ['party_by_player:' + P('z'), 'pother'],          /* Z moved on: their own word wins */
    ['party:pq', { v: 1, id: 'pq', leader: P('q2'), members: [P('q2'), P('q3')], meta: {}, ts: 1 }],
    ['party_by_player:' + P('q1'), 'pq'],             /* names a party that does not list them */
  ]);
  const r = new GameRoom(st, mockEnv);
  const wx = fakeWs('x');
  await join(r, wx, P('x'), 'X');
  const px = lastParty(wx);
  check('7. a member whose own index names ANOTHER party is dropped at the load', px && ids(px).join() === [P('x'), P('y')].join(), px && ids(px));
  check('7. ...and the record rewritten without them', st._store.get('party:px').members.join() === [P('x'), P('y')].join(), st._store.get('party:px').members);
  const wq = fakeWs('q1');
  await join(r, wq, P('q1'), 'Q1');
  check('7. an index naming a party that does not list you is dropped, and you are in none',
    !r._partyOf(P('q1')) && !st._store.has('party_by_player:' + P('q1')));
}

// ── 8: a failed read fails closed ──
{
  const st = makeState([['party_by_player:' + P('h'), 'ph'], ['party:ph', { v: 1, id: 'ph', leader: P('h'), members: [P('h'), P('i')], meta: {}, ts: 1 }], ['party_by_player:' + P('i'), 'ph']]);
  st.throwOn = (k) => k === 'party_by_player:' + P('h');
  const r = new GameRoom(st, mockEnv);
  const wh = fakeWs('h'), wj = fakeWs('j');
  await join(r, wh, P('h'), 'H');
  await join(r, wj, P('j'), 'J');
  check('8. a read that throws leaves the player UNKNOWN, in no party', r._partyUnknownIds && r._partyUnknownIds.has(P('h')) && !r._partyOf(P('h')));
  await cmd(r, wh, 'party_invite', { target: P('j') });
  check("8. ...they cannot invite ('not-loaded')", lastErr(wh) && lastErr(wh).reason === 'not-loaded' && !msgsOfType(wj, 'party_invited').length, lastErr(wh));
  await cmd(r, wj, 'party_invite', { target: P('h') });
  check("8. ...nor be invited ('target-busy')", lastErr(wj) && lastErr(wj).reason === 'target-busy' && !msgsOfType(wh, 'party_invited').length, lastErr(wj));
  check('8. ...and nothing was written for them', !st.puts.some((k) => k.startsWith('party')) && !st.deletes.some((k) => k.startsWith('party')), { puts: st.puts.filter((k) => k.startsWith('party')), dels: st.deletes });
  st.throwOn = null;
  await close(r, wh);
  const wh2 = fakeWs('h2');
  await join(r, wh2, P('h'), 'H');
  check('8. a join that reads it clears the mark and restores the party', !r._partyUnknownIds.has(P('h')) && lastParty(wh2) && lastParty(wh2).id === 'ph', lastParty(wh2));
}

// ── 9: a newer shape is left whole ──
{
  const newer = { v: PARTY.V + 1, id: 'pn', leader: P('k'), members: [P('k'), P('l')], meta: {}, ts: 1, extra: 'from a later worker' };
  const st = makeState([['party_by_player:' + P('k'), 'pn'], ['party:pn', newer], ['party_by_player:' + P('l'), 'pn']]);
  const r = new GameRoom(st, mockEnv);
  const wk = fakeWs('k');
  await join(r, wk, P('k'), 'K');
  check('9. a record of a newer shape: its reader is unknown, in no party', r._partyUnknownIds.has(P('k')) && !r._partyOf(P('k')));
  check('9. ...and the record and indexes are untouched', JSON.stringify(st._store.get('party:pn')) === JSON.stringify(newer) && st._store.get('party_by_player:' + P('k')) === 'pn' && !st.puts.some((k) => k.startsWith('party')) && !st.deletes.some((k) => k.startsWith('party')), { puts: st.puts.filter((k) => k.startsWith('party')), dels: st.deletes.filter((k) => k.startsWith('party')) });
}

// ── 10: an idle leader ──
{
  const old = Date.now() - PARTY.LEADER_IDLE_MS - 3600000;
  const st = makeState([
    ['party:pl', { v: 1, id: 'pl', leader: P('n1'), members: [P('n1'), P('n2'), P('n3')], meta: { [P('n1')]: { name: 'N1', level: 3, at: 1, seen: old }, [P('n2')]: { name: 'N2', level: 3, at: 2, seen: old }, [P('n3')]: { name: 'N3', level: 3, at: 3, seen: Date.now() } }, ts: 1 }],
    ['party_by_player:' + P('n1'), 'pl'], ['party_by_player:' + P('n2'), 'pl'], ['party_by_player:' + P('n3'), 'pl'],
  ]);
  const r = new GameRoom(st, mockEnv);
  const w3 = fakeWs('n3');
  await join(r, w3, P('n3'), 'N3');
  check('10. a leader not seen for 7 days hands the party on at a member\'s join (to N3, the one online)',
    lastParty(w3) && lastParty(w3).leader === P('n3') && st._store.get('party:pl').leader === P('n3'), lastParty(w3) && lastParty(w3).leader);
  const fresh = makeState([
    ['party:pf', { v: 1, id: 'pf', leader: P('o1'), members: [P('o1'), P('o2')], meta: { [P('o1')]: { name: 'O1', level: 3, at: 1, seen: Date.now() - 86400000 } }, ts: 1 }],
    ['party_by_player:' + P('o1'), 'pf'], ['party_by_player:' + P('o2'), 'pf'],
  ]);
  const r2 = new GameRoom(fresh, mockEnv);
  const wo = fakeWs('o2');
  await join(r2, wo, P('o2'), 'O2');
  check('10. ...but a leader seen a day ago keeps it', lastParty(wo) && lastParty(wo).leader === P('o1'), lastParty(wo) && lastParty(wo).leader);
}

// ── 11: what a join writes ──
{
  const st = makeState();
  const r = new GameRoom(st, mockEnv);
  const w1 = fakeWs('s1'), w2 = fakeWs('s2');
  await join(r, w1, P('s1'), 'S1');
  await join(r, w2, P('s2'), 'S2');
  await form(r, { s1: w1, s2: w2 }, 's1', ['s2']);
  st.puts.length = 0;
  let ws = w2;
  for (let i = 0; i < 10; i++) {
    await close(r, ws);
    ws = fakeWs('s2-' + i);
    await join(r, ws, P('s2'), 'S2');
  }
  check('11. ten reconnects write nothing (cost-guard: no row per reconnect)', !st.puts.some((k) => k.startsWith('party')), st.puts.filter((k) => k.startsWith('party')));
  r._partyOf(P('s2')).meta[P('s2')].ss = Date.now() - PARTY.SEEN_WRITE_MS - 1000;
  await close(r, ws);
  ws = fakeWs('s2-x');
  await join(r, ws, P('s2'), 'S2');
  check('11. a `seen` older than SEEN_WRITE_MS is written at the join, once',
    st.puts.filter((k) => k.startsWith('party:')).length === 1 && Date.now() - st._store.get('party:' + r._partyOf(P('s2')).id).meta[P('s2')].seen < 5000,
    st.puts.filter((k) => k.startsWith('party')));
}

// ── 12: a character restart leaves the party ──
{
  const st = makeState();
  const r = new GameRoom(st, mockEnv);
  const w = { t1: fakeWs('t1'), t2: fakeWs('t2'), t3: fakeWs('t3') };
  for (const n of ['t1', 't2', 't3']) await join(r, w[n], P(n), n.toUpperCase());
  await form(r, w, 't1', ['t2', 't3']);
  const id = lastParty(w.t1).id;
  await r._resetCharacterData(P('t2'));
  await flush();
  check('12. a restart (online) leaves the party: index gone, record and roster without them',
    !st._store.has('party_by_player:' + P('t2')) && !st._store.get('party:' + id).members.includes(P('t2')) && !ids(lastParty(w.t1)).includes(P('t2')));
  const r2 = new GameRoom(st, mockEnv);   /* nobody online: the stored record only */
  await r2._resetCharacterData(P('t3'));
  check('12. ...offline too: the stored record, down to one, deleted with both indexes',
    !st._store.has('party:' + id) && !st._store.has('party_by_player:' + P('t3')) && !st._store.has('party_by_player:' + P('t1')));
}

// ── 13: dungeons stay four ──
{
  const st = makeState();
  const r = new GameRoom(st, mockEnv);
  const w = {};
  const dist = { u0: 0, u1: 500, u2: 50, u3: 400, u4: 100, u5: 300 };
  for (const n of Object.keys(dist)) { w[n] = fakeWs(n); await join(r, w[n], P(n), n.toUpperCase(), { x: 1000 + dist[n], y: 1000, z: 'town' }); }
  await form(r, w, 'u0', ['u1', 'u2', 'u3', 'u4', 'u5']);
  for (const n of Object.keys(dist)) { r.playerState[P(n)].x = 1000 + dist[n]; r.playerState[P(n)].y = 1000; r.playerState[P(n)].z = 'town'; }
  for (const n of Object.keys(dist)) w[n].sent.length = 0;
  const pulled = r._dungeonPullPartyMembers({ zone: 'dungeon:t', cfg: {} }, P('u0'));
  const got = Object.keys(dist).filter((n) => msgsOfType(w[n], 'dungeon_started').length);
  check('13. a leader\'s dungeon takes three of five members: four in all', pulled === 3 && got.length === 3, { pulled, got });
  check('13. ...the three nearest the leader (50, 100, 300 px), not the far two', got.sort().join() === ['u2', 'u4', 'u5'].join(), got);
}

// ── 14: the kill switch ──
{
  const st = makeState([['liveflags', { partykeep: false }]]);
  const r = new GameRoom(st, mockEnv);
  const w = {};
  for (const n of ['v0', 'v1', 'v2', 'v3', 'v4']) { w[n] = fakeWs(n); await join(r, w[n], P(n), n.toUpperCase()); }
  const sy = w.v0.sent.find((m) => m.type === 'state_sync');
  check('14. partykeep: false un-advertises caps.partykeep', sy && sy.caps && sy.caps.partykeep === false, sy && sy.caps && sy.caps.partykeep);
  await form(r, w, 'v0', ['v1', 'v2', 'v3']);
  w.v0.sent.length = 0;
  await cmd(r, w.v0, 'party_invite', { target: P('v4') });
  check("14. ...four at most again (the fifth invite 'full')", lastErr(w.v0) && lastErr(w.v0).reason === 'full' && lastParty(w.v1).max === PARTY.MAX_SIZE, lastErr(w.v0));
  check('14. ...and nothing read or written for parties', ![...st._store.keys()].some((k) => k.startsWith('party')) && !st.puts.some((k) => k.startsWith('party')), [...st._store.keys()]);
  await close(r, w.v1);
  r._tickParties(Date.now() + PARTY.OFFLINE_GRACE_MS + 5000);
  check("14. ...an offline member removed after the grace, as before ('offline')", !ids(lastParty(w.v0)).includes(P('v1')), ids(lastParty(w.v0)));
}

// ── 16: the strip's six rows (src/game/partyRows.js) ──
{
  const me = { x: 0, y: 0, zone: 'wheel' };
  const pos = { n1: { x: 900, y: 0 }, n2: { x: 100, y: 0 }, n3: { x: 400, y: 0 } };
  const members = [
    { id: 'off2', off: 1, away: true, seen: 7200 },
    { id: 'n1', zone: 'wheel' },
    { id: 'me', zone: 'wheel' },
    { id: 'far1', zone: 'dungeon:x' },
    { id: 'off1', off: 1, away: true, seen: 60 },
    { id: 'n2', zone: 'wheel' },
    { id: 'n3', zone: 'wheel' },
    { id: 'off3', away: true },
  ];
  const v = partyRows(members, 'me', me, (id) => pos[id] || null);
  check('16. six rows at most (PARTY_ROWS)', PARTY_ROWS === 6 && v.rows.length === 6, v.rows.length);
  check('16. ...you first, then the online members nearest you, then those elsewhere, then the most recently seen offline',
    v.rows.map((m) => m.id).join() === ['me', 'n2', 'n3', 'n1', 'far1', 'off1'].join(), v.rows.map((m) => m.id));
  check('16. ...and how many more (2) and how many online (5)', v.more === 2 && v.online === 5, { more: v.more, online: v.online });
  check('16. offline is `off` or an older worker\'s `away`', memberOffline({ off: 1 }) && memberOffline({ away: true }) && !memberOffline({ id: 'x' }));
  check('16. "seen" reads as a phone says it', seenAgo(30) === 'just now' && seenAgo(600) === '10m ago' && seenAgo(7200) === '2h ago' && seenAgo(3 * 86400) === '3d ago' && seenAgo(undefined) === '');
  const four = partyRows(members.slice(1, 4), 'me', me, (id) => pos[id] || null);
  check('16. a small party shows everyone, nothing more', four.rows.length === 3 && four.more === 0, four);
  const hud = readFileSync(new URL('../../src/ui/panels/PartyHUD.jsx', import.meta.url), 'utf8');
  check('16. the strip draws partyRows\' rows, says "+N more", and leaves in two taps',
    /partyRows\(party\.members/.test(hud) && /view\.rows\.map/.test(hud) && /data-party-more/.test(hud) && /Leave\?/.test(hud) && /LEAVE_ARM_MS/.test(hud));
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
