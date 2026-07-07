/* Party roster test (v2.3.1175, handoff backlog item D).  Parties are
 * a pure social roster — invite/accept handshake, leader, server-truth
 * party_state snapshots — with deliberately NO XP/loot share changes.
 * Checks:
 *   1. caps.party advertised.
 *   2. Invite handshake: invite sends party_invited to the target +
 *      an 'invited' echo to the sender; self-target dropped; accept
 *      forms the party (inviter = leader) and both get the roster.
 *   3. Growth to MAX_SIZE; the (MAX+1)th invite is refused 'full';
 *      only the leader can invite; a member of another party can't be
 *      poached ('target-busy').
 *   4. Forged / expired / replayed accepts get 'expired', never a
 *      roster; decline clears the invite + tells the inviter.
 *   5. Leave: leader leaving promotes the next-oldest member; a party
 *      of two disbands when one leaves (both told).
 *   6. Kick: leader only; kicked member gets a terminal snapshot.
 *   7. Disconnect marks the member away (name still rendered from the
 *      cached record); rejoin clears it; an expired away window drops
 *      the member via the tick sweep; invite TTL sweep works.
 *   8. Forged party_state / party_invited / party_error are not
 *      rebroadcast (deny-list).
 */
import { GameRoom } from '../src/index.js';
import { PARTY } from '../src/party.js';

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
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }
const lastOf = (ws, type) => { const r = msgsOfType(ws, type); return r[r.length - 1] && r[r.length - 1].payload; };
const lastState = (ws) => lastOf(ws, 'party_state');

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
const P = (n) => 'bp_pt_' + n;
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

const wss = {};
for (const n of ['a', 'b', 'c', 'd', 'e']) {
  wss[n] = fakeWs(n);
  await join(wss[n], P(n), n.toUpperCase());
}

// ── 1. caps ──
const sync = wss.a.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.party', sync && sync.caps && sync.caps.party === true, sync && sync.caps);

// ── 2. invite handshake ──
await cmd(wss.a, 'party_invite', { target: P('a') });
check('self-invite dropped', !room._partyInvites || !room._partyInvites.has(P('a') + '>' + P('a')));
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'party_invite', { target: P('b') });
const invRx = lastOf(wss.b, 'party_invited');
check("invite reaches target + sender echoed 'invited'", invRx && invRx.from === P('a') && invRx.fromName === 'A' && lastState(wss.a).state === 'invited', invRx);
await cmd(wss.b, 'party_accept', { from: P('a') });
let stA = lastState(wss.a), stB = lastState(wss.b);
check('accept forms the party, inviter is leader, both get the roster',
  stA && stA.state === 'active' && stA.leader === P('a') && stA.members.length === 2
  && stB && stB.id === stA.id && stB.members.some((m) => m.id === P('b')), { stA, stB });
check('member snapshot carries name/level/zone', stA.members[0].name === 'A' && stA.members[0].level >= 1 && stA.members[0].z === 'town', stA.members[0]);

// ── 3. growth, size cap, leader-only invites, no poaching ──
await cmd(wss.a, 'party_invite', { target: P('c') });
await cmd(wss.c, 'party_accept', { from: P('a') });
await cmd(wss.a, 'party_invite', { target: P('d') });
await cmd(wss.d, 'party_accept', { from: P('a') });
stA = lastState(wss.a);
check('party grows to MAX_SIZE', stA.members.length === PARTY.MAX_SIZE && PARTY.MAX_SIZE === 4, stA.members.length);
wss.a.sent.length = 0;
await cmd(wss.a, 'party_invite', { target: P('e') });
check("invite past MAX_SIZE refused 'full'", lastOf(wss.a, 'party_error') && lastOf(wss.a, 'party_error').code === 'full');
wss.b.sent.length = 0;
await cmd(wss.b, 'party_invite', { target: P('e') });
check("non-leader invite refused 'not-leader'", lastOf(wss.b, 'party_error') && lastOf(wss.b, 'party_error').code === 'not-leader');
// e forms a second party with... nobody; e invites b (already partied).
wss.e.sent.length = 0;
await cmd(wss.e, 'party_invite', { target: P('b') });
check("inviting a partied player refused 'target-busy'", lastOf(wss.e, 'party_error') && lastOf(wss.e, 'party_error').code === 'target-busy');

// ── 4. forged / expired accepts + decline ──
wss.e.sent.length = 0;
await cmd(wss.e, 'party_accept', { from: P('a') }); // no invite was ever sent to e
check("forged accept answered 'expired', no roster", lastOf(wss.e, 'party_error').code === 'expired' && !room._partyByPlayer.get(P('e')));
// kick d out to make room, then run the expiry + decline flows on the slot.
await cmd(wss.a, 'party_kick', { target: P('d') });
await cmd(wss.a, 'party_invite', { target: P('e') });
room._partyInvites.set(P('a') + '>' + P('e'), Date.now() - PARTY.INVITE_TTL - 1000);
wss.e.sent.length = 0;
await cmd(wss.e, 'party_accept', { from: P('a') });
check("expired accept answered 'expired'", lastOf(wss.e, 'party_error').code === 'expired');
await cmd(wss.a, 'party_invite', { target: P('e') });
wss.a.sent.length = 0;
await cmd(wss.e, 'party_decline', { from: P('a') });
const decl = lastOf(wss.a, 'party_error');
check('decline clears the invite + tells the inviter', decl && decl.code === 'declined' && decl.who === P('e') && !room._partyInvites.has(P('a') + '>' + P('e')), decl);
wss.e.sent.length = 0;
await cmd(wss.e, 'party_accept', { from: P('a') }); // replay after decline
check('replayed accept after decline is refused', lastOf(wss.e, 'party_error').code === 'expired' && lastState(wss.a) === undefined);

// ── 6. kick posture (d was kicked above) ──
const dTerminal = lastState(wss.d);
check("kicked member got terminal 'kicked' snapshot + is out", dTerminal && dTerminal.state === 'kicked' && !room._partyByPlayer.get(P('d')), dTerminal);
wss.c.sent.length = 0;
await cmd(wss.c, 'party_kick', { target: P('b') }); // c is not the leader
check('non-leader kick ignored', room._partyByPlayer.get(P('b')) && lastState(wss.c) === undefined);

// ── 5. leave + leader promotion + disband at one ──
// Roster is a(leader), b, c in join order.
wss.b.sent.length = 0; wss.c.sent.length = 0;
await cmd(wss.a, 'party_leave');
stB = lastState(wss.b);
check('leader leaving promotes next-oldest member', stB && stB.state === 'active' && stB.leader === P('b') && stB.members.length === 2, stB);
wss.c.sent.length = 0;
await cmd(wss.b, 'party_leave');
const cTerminal = lastState(wss.c);
check('party of two disbands when one leaves', cTerminal && cTerminal.state === 'disbanded' && room._parties.size === 0 && !room._partyByPlayer.get(P('c')), cTerminal);

// ── 7. disconnect away window / rejoin / timeout sweep ──
await cmd(wss.a, 'party_invite', { target: P('b') });
await cmd(wss.b, 'party_accept', { from: P('a') });
await cmd(wss.a, 'party_invite', { target: P('c') });
await cmd(wss.c, 'party_accept', { from: P('a') });
wss.a.sent.length = 0;
await room.webSocketClose(wss.b); // b drops (playerState deleted)
stA = lastState(wss.a);
const bEntry = stA && stA.members.find((m) => m.id === P('b'));
check('disconnected member shown away, cached name survives', bEntry && bEntry.away === true && bEntry.name === 'B', bEntry);
room._tickParties(Date.now());
check('away member survives the sweep inside the grace window', room._partyByPlayer.get(P('b')));
wss.b = fakeWs('b2');
await join(wss.b, P('b'), 'B');
stB = lastState(wss.b);
check('rejoin clears away + re-echoes the roster to the reconnector', stB && stB.state === 'active' && stB.members.find((m) => m.id === P('b')).away === false, stB);
await room.webSocketClose(wss.b);
const party = room._parties.get(room._partyByPlayer.get(P('a')));
party.members.find((m) => m.id === P('b')).awayUntil = Date.now() - 1000;
wss.a.sent.length = 0;
room._tickParties(Date.now());
stA = lastState(wss.a);
check('lapsed away window drops the member via the tick sweep', !room._partyByPlayer.get(P('b')) && stA.members.length === 2, stA && stA.members);
room._partyInvites.set(P('a') + '>' + P('e'), Date.now() - PARTY.INVITE_TTL - 1000);
room._tickParties(Date.now());
check('stale invites swept by the tick', !room._partyInvites.has(P('a') + '>' + P('e')));

// ── 8. deny-list ──
room.eventBuffer.length = 0;
await cmd(wss.e, 'party_state', { state: 'active', leader: P('e') });
await cmd(wss.e, 'party_invited', { from: P('e') });
await cmd(wss.e, 'party_error', { code: 'x' });
check('forged party_state / party_invited / party_error dropped by deny-list',
  room.eventBuffer.filter((e) => e.type === 'party_state' || e.type === 'party_invited' || e.type === 'party_error').length === 0,
  room.eventBuffer.map((e) => e.type));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
