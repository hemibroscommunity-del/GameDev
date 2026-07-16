/* Friends suite (v2.3.1323, friends.js).  Mutual friendships as a
 * server fact: request/accept/decline/remove handshake with STORED
 * requests (offline-reachable, unlike memory-only party invites) and
 * friend-gated DMs with an offline backlog.  Checks:
 *   1. caps.friends advertised.
 *   2. Request: self-request dropped; request to an unknown id errors
 *      'not-found'; request to an online player delivers
 *      friend_request_in (server-stamped name) + syncs both docs;
 *      duplicate request is an idempotent no-op.
 *   3. Accept: forged accept (no stored request) drops silently and
 *      forms nothing; the real accept forms a MUTUAL edge, clears both
 *      request sides, notifies the requester (friend_accepted), and
 *      syncs both docs.
 *   4. Crossing requests auto-accept (mutual intent).
 *   5. Decline: clears both sides, requester gets NO notification.
 *   6. Remove: clears both halves of the edge.
 *   7. DM: non-friend DM errors 'not-friends' and delivers nothing;
 *      friend DM delivers live with server-stamped sender; control
 *      chars stripped + length clamped; empty/non-string dropped.
 *   8. Offline: request to an OFFLINE (persisted) player stores their
 *      reqIn; DM to an offline friend lands in the friend_msg backlog
 *      (capped) and is delivered + CLEARED on their next join;
 *      friend_sync arrives on join.
 *   9. Forgery: friend_sync / friend_dm / friend_request_in from a
 *      client are never rebroadcast (deny-list).
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { FRIENDS } from '../src/friends.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
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
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const lastSync = (ws) => { const r = msgsOfType(ws, 'friend_sync'); return r[r.length - 1] && r[r.length - 1].payload; };
const lastErr = (ws) => { const r = msgsOfType(ws, 'friend_error'); return r[r.length - 1] && r[r.length - 1].payload; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const P = (n) => 'bp_frd_' + n;
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

const wss = {};
for (const n of ['a', 'b', 'c']) {
  wss[n] = fakeWs(n);
  await join(wss[n], P(n), n.toUpperCase());
}

// ── 1. caps ──
const sync0 = wss.a.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.friends', sync0 && sync0.caps && sync0.caps.friends === true, sync0 && sync0.caps && Object.keys(sync0.caps).length);
check('friend_sync delivered on join', !!wss.a.sent.find((m) => m.type === 'friend_sync'));

// ── 2. request ──
await cmd(wss.a, 'friend_request', { target: P('a') });
check('self-request dropped', !(await state.storage.get('friends:' + P('a'))) || !((await state.storage.get('friends:' + P('a'))).reqOut || {})[P('a')]);
wss.a.sent.length = 0;
await cmd(wss.a, 'friend_request', { target: 'bp_frd_ghost' });
check("unknown target errors 'not-found'", lastErr(wss.a) && lastErr(wss.a).reason === 'not-found', lastErr(wss.a));
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'friend_request', { target: P('b'), name: 'B-from-client' });
const reqIn = msgsOfType(wss.b, 'friend_request_in');
check('request delivers friend_request_in with SERVER-stamped name', reqIn.length === 1 && reqIn[0].payload.from === P('a') && reqIn[0].payload.fromName === 'A', reqIn[0] && reqIn[0].payload);
let sA = lastSync(wss.a), sB = lastSync(wss.b);
check('both docs sync: A.reqOut[B] + B.reqIn[A]', sA && sA.reqOut[P('b')] && sB && sB.reqIn[P('a')], { a: sA && Object.keys(sA.reqOut), b: sB && Object.keys(sB.reqIn) });
const outCountBefore = Object.keys(lastSync(wss.a).reqOut).length;
wss.b.sent.length = 0;
await cmd(wss.a, 'friend_request', { target: P('b') });
check('duplicate request is an idempotent no-op (no second notification)', msgsOfType(wss.b, 'friend_request_in').length === 0 && Object.keys((await state.storage.get('friends:' + P('a'))).reqOut).length === outCountBefore);

// ── 3. accept ──
await cmd(wss.c, 'friend_accept', { from: P('a') }); // no request to C ever made
const cDoc = await state.storage.get('friends:' + P('c'));
check('forged accept drops silently, forms nothing', (!cDoc || Object.keys(cDoc.list || {}).length === 0) && msgsOfType(wss.c, 'friend_error').length === 0);
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.b, 'friend_accept', { from: P('a') });
sA = lastSync(wss.a); sB = lastSync(wss.b);
check('accept forms the MUTUAL edge + clears requests',
  sA && sA.list[P('b')] && Object.keys(sA.reqOut).length === 0 &&
  sB && sB.list[P('a')] && Object.keys(sB.reqIn).length === 0,
  { aList: sA && Object.keys(sA.list), bList: sB && Object.keys(sB.list) });
const acc = msgsOfType(wss.a, 'friend_accepted');
check('requester gets friend_accepted', acc.length === 1 && acc[0].payload.by === P('b') && acc[0].payload.byName === 'B', acc[0] && acc[0].payload);
check("re-request of an existing friend errors 'already-friends'", await (async () => { wss.a.sent.length = 0; await cmd(wss.a, 'friend_request', { target: P('b') }); return lastErr(wss.a) && lastErr(wss.a).reason === 'already-friends'; })());

// ── 4. crossing requests auto-accept ──
wss.a.sent.length = 0; wss.c.sent.length = 0;
await cmd(wss.a, 'friend_request', { target: P('c') });
await cmd(wss.c, 'friend_request', { target: P('a') });
sA = lastSync(wss.a); const sC = lastSync(wss.c);
check('crossing requests auto-accept into a mutual edge', sA && sA.list[P('c')] && sC && sC.list[P('a')], { a: sA && Object.keys(sA.list), c: sC && Object.keys(sC.list) });
// clean up c<->a for later tests
await cmd(wss.c, 'friend_remove', { fid: P('a') });

// ── 5. decline ──
await cmd(wss.c, 'friend_request', { target: P('b') });
wss.c.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.b, 'friend_decline', { from: P('c') });
sB = lastSync(wss.b);
const cAfterDecline = await state.storage.get('friends:' + P('c'));
check('decline clears both sides', sB && !sB.reqIn[P('c')] && cAfterDecline && !(cAfterDecline.reqOut || {})[P('b')]);
check('decline sends NO notification to the requester', msgsOfType(wss.c, 'friend_request_in').length === 0 && msgsOfType(wss.c, 'friend_accepted').length === 0 && msgsOfType(wss.c, 'friend_error').length === 0);

// ── 7. DM (before remove so A<->B are friends) ──
wss.c.sent.length = 0;
await cmd(wss.c, 'friend_dm', { to: P('b'), text: 'yo' });
check("non-friend DM errors 'not-friends', delivers nothing", lastErr(wss.c) && lastErr(wss.c).reason === 'not-friends' && msgsOfType(wss.b, 'friend_dm').length === 0, lastErr(wss.c));
wss.b.sent.length = 0;
await cmd(wss.a, 'friend_dm', { to: P('b'), text: '  hey\x01bro  ' + 'x'.repeat(500) });
const dm = msgsOfType(wss.b, 'friend_dm');
check('friend DM delivers live, server-stamped, cleaned + clamped',
  dm.length === 1 && dm[0].payload.from === P('a') && dm[0].payload.fromName === 'A' &&
  dm[0].payload.text.length <= FRIENDS.DM_MAX && !/[\x00-\x1f\x7f]/.test(dm[0].payload.text) && dm[0].payload.text.startsWith('hey bro'),
  dm[0] && dm[0].payload && { len: dm[0].payload.text.length, head: dm[0].payload.text.slice(0, 12) });
wss.b.sent.length = 0;
await cmd(wss.a, 'friend_dm', { to: P('b'), text: '   ' });
await cmd(wss.a, 'friend_dm', { to: P('b'), text: 42 });
check('empty / non-string DM dropped', msgsOfType(wss.b, 'friend_dm').length === 0);

// ── 6. remove ──
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'friend_remove', { fid: P('b') });
sA = lastSync(wss.a); sB = lastSync(wss.b);
check('remove clears both halves', sA && !sA.list[P('b')] && sB && !sB.list[P('a')], { a: sA && Object.keys(sA.list), b: sB && Object.keys(sB.list) });

// ── 8. offline flows ──
// D exists only as a persisted blob (offline player)
const wsD = fakeWs('d');
await join(wsD, P('d'), 'D');
room.sessions.delete(wsD);
delete room.playerState[P('d')]; // fully offline now
wss.a.sent.length = 0;
await cmd(wss.a, 'friend_request', { target: P('d'), name: 'Dee' });
const dDoc = await state.storage.get('friends:' + P('d'));
check("request to OFFLINE player stores their reqIn (client display name only on requester's own reqOut)",
  dDoc && dDoc.reqIn[P('a')] && dDoc.reqIn[P('a')].name === 'A' && (await state.storage.get('friends:' + P('a'))).reqOut[P('d')].name === 'Dee',
  dDoc && dDoc.reqIn);
// D comes online, accepts, goes offline again; A DMs D offline
const wsD2 = fakeWs('d2');
await join(wsD2, P('d'), 'D');
check('join sync carries the stored request', !!(lastSync(wsD2) && lastSync(wsD2).reqIn[P('a')]), lastSync(wsD2));
await cmd(wsD2, 'friend_accept', { from: P('a') });
room.sessions.delete(wsD2);
delete room.playerState[P('d')];
for (let i = 0; i < FRIENDS.DM_BACKLOG_MAX + 5; i++) {
  await cmd(wss.a, 'friend_dm', { to: P('d'), text: 'msg-' + i });
}
const box = await state.storage.get('friend_msg:' + P('d'));
check('offline DMs land in a CAPPED backlog (oldest dropped)',
  Array.isArray(box) && box.length === FRIENDS.DM_BACKLOG_MAX && box[0].text === 'msg-5' && box[box.length - 1].text === 'msg-' + (FRIENDS.DM_BACKLOG_MAX + 4),
  box && { len: box.length, first: box[0] && box[0].text });
const wsD3 = fakeWs('d3');
await join(wsD3, P('d'), 'D');
const backlog = msgsOfType(wsD3, 'friend_dm_backlog');
check('backlog delivered on join and cleared from storage',
  backlog.length === 1 && backlog[0].payload.messages.length === FRIENDS.DM_BACKLOG_MAX && !(await state.storage.get('friend_msg:' + P('d'))),
  backlog[0] && backlog[0].payload && backlog[0].payload.messages.length);

// ── 9. deny-list ──
for (const t of ['friend_sync', 'friend_dm', 'friend_request_in', 'friend_accepted', 'friend_dm_backlog', 'friend_error']) {
  check(`${t} is PRIVILEGED (never rebroadcast)`, PRIVILEGED_EVENTS.has(t));
}
wss.b.sent.length = 0;
await room.webSocketMessage(wss.a, JSON.stringify({ type: 'friend_dm', from: P('c'), fromName: 'FAKE', text: 'forged', payload: { to: P('b'), text: 'gated-real' } }));
check('client-sent friend_dm routes through the validated case only (B got nothing — A and B are no longer friends)', msgsOfType(wss.b, 'friend_dm').length === 0);

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
