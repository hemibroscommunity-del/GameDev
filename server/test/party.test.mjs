/* Party roster test (v2.3.1185, handoff backlog item D).  Memory-only
 * roster on the duel/trade2 handshake pattern: invite recorded
 * per-sender-session, accept validated against it, every change echoed
 * as a privileged party_state snapshot, tick re-echo for cross-zone
 * vitals.  Checks:
 *   1. caps.party advertised.
 *   2. Invite handshake: self-invite dropped; invite delivers
 *      party_invited; accept forms the party (leader = inviter) and
 *      echoes the roster to both; member invites grow it to 3.
 *   3. Validation: inviting someone already partied errors; forged
 *      accept (no live invite) is dropped; expired invite is dropped;
 *      accepting while already partied errors.
 *   4. Capacity: 4 is the cap — 5th invite errors 'full' at invite
 *      time, and a pre-fill invite that races the cap errors 'full'
 *      at accept time (invite snapshots are not authoritative).
 *   5. Vitals: the tick re-echo carries live hp/maxHp/zone per member
 *      and respects the VITALS_MS cadence.
 *   6. Kick: leader-only (non-leader kick ignored); kicked member
 *      gets a terminal state, roster shrinks for the rest.
 *   7. Leave: leader leaving promotes the oldest member; a 2-member
 *      party disbands for both.
 *   8. Disconnect: member goes 'away' (grace), rejoin restores them
 *      AFTER state_sync (client clears its HUD on every sync); grace
 *      expiry removes them via the tick sweep.
 *   9. Forged party_state / party_invited / party_error are not
 *      rebroadcast (deny-list).
 *
 * v2.3.1212 (item D follow-up, party chat): a party-scoped, server-
 * validated relay.  Checks:
 *   10. Chat relays to party members only (server-stamped sender +
 *       trimmed), a non-member never receives it, a forged from/name is
 *       ignored, a partyless sender is dropped, control chars stripped +
 *       length clamped + empty/non-string dropped, and party_chat is
 *       never rebroadcast room-wide (its own validated case, rule 13).
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
const lastParty = (ws) => { const r = msgsOfType(ws, 'party_state'); return r[r.length - 1] && r[r.length - 1].payload; };
const lastErr = (ws) => { const r = msgsOfType(ws, 'party_error'); return r[r.length - 1] && r[r.length - 1].payload; };

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
const P = (n) => 'bp_pty_' + n;
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
const inv = msgsOfType(wss.b, 'party_invited');
check("A's invite delivers party_invited to B", inv.length === 1 && inv[0].payload.from === P('a') && inv[0].payload.fromName === 'A', inv[0] && inv[0].payload);
await cmd(wss.b, 'party_accept', { target: P('a') });
let pA = lastParty(wss.a), pB = lastParty(wss.b);
check('accept forms the party, echoed to both, leader = inviter',
  pA && pB && pA.id === pB.id && pA.leader === P('a') && pA.members.length === 2 && pA.members.map((m) => m.id).join() === [P('a'), P('b')].join(),
  pA && { leader: pA.leader, members: pA.members.map((m) => m.id) });
// member (non-leader) can invite too
wss.c.sent.length = 0;
await cmd(wss.b, 'party_invite', { target: P('c') });
await cmd(wss.c, 'party_accept', { target: P('b') });
pA = lastParty(wss.a);
check('member invite grows the party to 3 (same party for C)', pA && pA.members.length === 3 && lastParty(wss.c).id === pA.id, pA && pA.members.map((m) => m.id));

// ── 3. validation ──
wss.d.sent.length = 0;
await cmd(wss.d, 'party_invite', { target: P('a') });
check("inviting an already-partied player errors 'target-busy'", lastErr(wss.d) && lastErr(wss.d).reason === 'target-busy', lastErr(wss.d));
const partiesBefore = room._parties.size;
await cmd(wss.d, 'party_accept', { target: P('e') }); // no invite ever sent
check('forged accept (no live invite) is dropped', room._parties.size === partiesBefore && !room._partyOf(P('d')));
await cmd(wss.e, 'party_invite', { target: P('d') });
room._partyInvites.set(P('e') + '>' + P('d'), Date.now() - PARTY.INVITE_TTL - 1000);
wss.d.sent.length = 0;
await cmd(wss.d, 'party_accept', { target: P('e') });
check('expired invite is dropped', !room._partyOf(P('d')) && !room._partyOf(P('e')));
// v2.3.1185: expired (unlike forged) answers privately -- the accepter
// really tapped Join on an aged-out card; dead air reads as a broken
// button.  Forged accepts stay silent (no oracle).
check("expired invite answers 'expired' privately", lastErr(wss.d) && lastErr(wss.d).reason === 'expired', lastErr(wss.d));
await cmd(wss.a, 'party_invite', { target: P('d') });
await cmd(wss.d, 'party_accept', { target: P('a') }); // joins A's party (4/4 now)
wss.d.sent.length = 0;
await cmd(wss.e, 'party_invite', { target: P('d') });
await cmd(wss.d, 'party_accept', { target: P('e') });
check("inviting a partied player from outside errors 'target-busy' (already-partied accepts can't even start)", lastErr(wss.e) && lastErr(wss.e).reason === 'target-busy');

// ── 4. capacity ──
check('party is at the 4 cap', room._partyOf(P('a')).members.length === 4);
wss.a.sent.length = 0;
await cmd(wss.a, 'party_invite', { target: P('e') });
check("5th invite errors 'full' at invite time", lastErr(wss.a) && lastErr(wss.a).reason === 'full', lastErr(wss.a));
// accept-time full check: invite E while there's room, fill up, then accept
await cmd(wss.d, 'party_leave');
await cmd(wss.a, 'party_invite', { target: P('e') }); // room now (3/4)
await cmd(wss.a, 'party_invite', { target: P('d') });
await cmd(wss.d, 'party_accept', { target: P('a') }); // fills to 4 again
wss.e.sent.length = 0;
await cmd(wss.e, 'party_accept', { target: P('a') });
check("racing accept against a filled party errors 'full' at accept time", lastErr(wss.e) && lastErr(wss.e).reason === 'full' && !room._partyOf(P('e')), lastErr(wss.e));

// ── 5. vitals re-echo ──
room.playerState[P('b')].hp = 37;
room.playerState[P('b')].maxHp = 120;
room.playerState[P('b')].z = 'meadow';
const pty = room._partyOf(P('a'));
pty.lastVitals = 0;
wss.a.sent.length = 0;
room._tickParties(Date.now());
let vit = lastParty(wss.a);
const bWire = vit && vit.members.find((m) => m.id === P('b'));
check('tick re-echo carries live hp/maxHp/zone', bWire && bWire.hp === 37 && bWire.maxHp === 120 && bWire.zone === 'meadow', bWire);
wss.a.sent.length = 0;
room._tickParties(Date.now()); // within VITALS_MS of the last echo
check('vitals respect the VITALS_MS cadence (no double echo)', msgsOfType(wss.a, 'party_state').length === 0, msgsOfType(wss.a, 'party_state').length);

// ── 6. kick ──
await cmd(wss.b, 'party_kick', { target: P('c') }); // B is not leader
check('non-leader kick is ignored', room._partyOf(P('c')));
wss.c.sent.length = 0; wss.a.sent.length = 0;
await cmd(wss.a, 'party_kick', { target: P('c') });
check("kicked member gets terminal state 'kicked'", lastParty(wss.c) && lastParty(wss.c).state === 'none' && lastParty(wss.c).reason === 'kicked', lastParty(wss.c));
check('roster shrinks for the rest', lastParty(wss.a).members.length === 3 && !room._partyOf(P('c')), lastParty(wss.a) && lastParty(wss.a).members.map((m) => m.id));

// ── 7. leave + promotion + disband ──
wss.b.sent.length = 0;
await cmd(wss.a, 'party_leave'); // leader leaves {a,b,d} -> {b,d}, b promoted
pB = lastParty(wss.b);
check('leader leaving promotes the oldest member', pB && pB.leader === P('b') && pB.members.length === 2, pB && { leader: pB.leader, n: pB.members.length });
check("leaver got terminal 'left'", lastParty(wss.a) && lastParty(wss.a).state === 'none' && lastParty(wss.a).reason === 'left');
wss.d.sent.length = 0;
await cmd(wss.b, 'party_leave'); // {b,d} -> disband
check('2-member party disbands for both', lastParty(wss.d) && lastParty(wss.d).state === 'none' && lastParty(wss.d).reason === 'disbanded' && room._parties.size === 0, lastParty(wss.d));

// ── 8. disconnect grace / rejoin / sweep ──
await cmd(wss.a, 'party_invite', { target: P('b') });
await cmd(wss.b, 'party_accept', { target: P('a') });
wss.a.sent.length = 0;
await room.webSocketClose(wss.b);
pA = lastParty(wss.a);
const bAway = pA && pA.members.find((m) => m.id === P('b'));
check("disconnected member shows 'away', not removed", bAway && bAway.away === true && room._partyOf(P('b')), bAway);
// rejoin on a fresh socket: roster echo must land AFTER state_sync
const wsB2 = fakeWs('b2');
await join(wsB2, P('b'), 'B');
const syncIdx = wsB2.sent.findIndex((m) => m.type === 'state_sync');
const rosterIdx = wsB2.sent.findIndex((m) => m.type === 'party_state');
check('rejoin restores the roster AFTER state_sync (client clears its HUD on sync)', syncIdx >= 0 && rosterIdx > syncIdx, { syncIdx, rosterIdx });
pA = lastParty(wss.a);
check('away flag cleared on rejoin', pA && pA.members.find((m) => m.id === P('b')).away === false, pA && pA.members);
// grace expiry sweep
await room.webSocketClose(wsB2);
const p2 = room._partyOf(P('a'));
p2.meta[P('b')].awaySince = Date.now() - PARTY.OFFLINE_GRACE_MS - 1000;
wss.a.sent.length = 0;
room._tickParties(Date.now());
check("grace expiry removes the member ('offline'); 2-member party disbands", !room._partyOf(P('a')) && !room._partyOf(P('b')) && lastParty(wss.a) && lastParty(wss.a).reason === 'disbanded', lastParty(wss.a));

// ── 9. deny-list ──
room.eventBuffer.length = 0;
await cmd(wss.c, 'party_state', { state: 'open', members: [] });
await cmd(wss.c, 'party_invited', { from: P('c') });
await cmd(wss.c, 'party_error', { reason: 'declined' });
check('forged party_state / party_invited / party_error dropped by deny-list',
  room.eventBuffer.filter((e) => e.type === 'party_state' || e.type === 'party_invited' || e.type === 'party_error').length === 0,
  room.eventBuffer.map((e) => e.type));

// decline notice
await cmd(wss.c, 'party_invite', { target: P('d') });
wss.c.sent.length = 0;
await cmd(wss.d, 'party_decline', { target: P('c') });
check("decline notifies the inviter privately ('declined')", lastErr(wss.c) && lastErr(wss.c).reason === 'declined' && lastErr(wss.c).name === 'D', lastErr(wss.c));
wss.c.sent.length = 0;
await cmd(wss.d, 'party_decline', { target: P('c') }); // no live invite now
check('forged decline (no live invite) sends nothing', msgsOfType(wss.c, 'party_error').length === 0);

// ── 10. v2.3.1212 party chat (item D follow-up): a party-scoped,
// server-validated relay ──
{
  for (const n of ['f', 'g', 'h']) { wss[n] = fakeWs(n); await join(wss[n], P(n), n.toUpperCase()); }
  const F = P('f'), G = P('g'), H = P('h');
  await cmd(wss.f, 'party_invite', { target: G });
  await cmd(wss.g, 'party_accept', { target: F }); // F + G form a party
  check('a party formed for the chat checks', !!room._partyOf(F) && room._partyOf(F) === room._partyOf(G));
  { const s = wss.f.sent.find((m) => m.type === 'state_sync'); check('state_sync advertises caps.partyChat (narrow deploy-order gate)', s && s.caps && s.caps.partyChat === true, s && s.caps); }
  wss.f.sent.length = 0; wss.g.sent.length = 0; wss.h.sent.length = 0;

  // relay to members, server-stamped identity, trimmed
  await cmd(wss.f, 'party_chat', { text: '  hello team  ' });
  const gChat = msgsOfType(wss.g, 'party_chat');
  check('party chat relays to members, server-stamped + trimmed',
    gChat.length === 1 && gChat[0].payload.from === F && gChat[0].payload.fromName === 'F' && gChat[0].payload.text === 'hello team',
    gChat.map((m) => m.payload));
  check('the sender is delivered too (client dedups on from===myId)', msgsOfType(wss.f, 'party_chat').length === 1);
  check('a non-member never receives party chat', msgsOfType(wss.h, 'party_chat').length === 0);

  // a client-supplied from/name is ignored -- the server stamps identity
  wss.g.sent.length = 0;
  await cmd(wss.f, 'party_chat', { text: 'x', from: 'bp_evil', fromName: 'Hacker' });
  const g2 = msgsOfType(wss.g, 'party_chat');
  check('a forged from/name is ignored (server stamps the real sender)',
    g2.length === 1 && g2[0].payload.from === F && g2[0].payload.fromName === 'F', g2.map((m) => m.payload));

  // a partyless sender is dropped (nothing relayed, never rebroadcast)
  wss.h.sent.length = 0;
  await cmd(wss.h, 'party_chat', { text: 'anyone?' });
  check('a partyless sender is dropped', msgsOfType(wss.h, 'party_chat').length === 0);

  // control-char strip + length clamp + empty/non-string drop
  wss.g.sent.length = 0;
  await cmd(wss.f, 'party_chat', { text: 'hi' + String.fromCharCode(7, 1) + 'there' });
  const gc = msgsOfType(wss.g, 'party_chat');
  var _ctrl = false; var _ct = (gc[0] && gc[0].payload.text) || ''; for (var _i = 0; _i < _ct.length; _i++) if (_ct.charCodeAt(_i) < 32) _ctrl = true;
  check('control chars are stripped', gc.length === 1 && !_ctrl && _ct.indexOf('there') >= 0, _ct);
  wss.g.sent.length = 0;
  await cmd(wss.f, 'party_chat', { text: 'a'.repeat(500) });
  const gl = msgsOfType(wss.g, 'party_chat');
  check('length clamps to CHAT_MAX', gl.length === 1 && gl[0].payload.text.length === PARTY.CHAT_MAX, gl[0] && gl[0].payload.text.length);
  wss.g.sent.length = 0;
  await cmd(wss.f, 'party_chat', { text: '   ' });
  await cmd(wss.f, 'party_chat', { text: 42 });
  await cmd(wss.f, 'party_chat', {});
  check('whitespace-only / non-string / missing text are all dropped', msgsOfType(wss.g, 'party_chat').length === 0);

  // forged party_chat is handled by the dedicated case, never the
  // room-wide rebroadcast branch (rule 13)
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wss.h, JSON.stringify({ type: 'party_chat', payload: { from: F, text: 'spoof' } }));
  check('party_chat is never rebroadcast room-wide (dedicated validated case)',
    room.eventBuffer.filter((e) => e.type === 'party_chat').length === 0, room.eventBuffer.map((e) => e.type));
}

// ── 11. v2.3.1742: your party is not a free-fire target ──
// Owner: "party mode looks like it needs fixed.  It auto targeted my
// teammate and looked like my attacks were damaging them."  They were:
// every wilderness zone carries lawless:true (data.js) and _pvpAllowed
// had no party test anywhere in it.  These pin the gate's ORDER as much
// as its answer -- consent must still beat the party shield, or two
// teammates could never duel each other on purpose.
{
  for (const n of ['i', 'j', 'k'] ) { wss[n] = fakeWs(n); await join(wss[n], P(n), n.toUpperCase()); }
  const I = P('i'), J = P('j'), K = P('k');
  await cmd(wss.i, 'party_invite', { target: J });
  await cmd(wss.j, 'party_accept', { target: I }); // I + J are a party; K is not
  check('a party formed for the PvP-gate checks', !!room._partyOf(I) && room._partyOf(I) === room._partyOf(J));

  check('party members cannot damage each other in a lawless zone',
    room._pvpAllowed(I, J, 'meadow') === false && room._pvpAllowed(J, I, 'meadow') === false);
  check('...and the shield is not zone-specific (every wilderness zone is lawless)',
    room._pvpAllowed(I, J, 'frost') === false && room._pvpAllowed(I, J, 'hollows') === false);
  check('a non-party pair in a lawless zone is unaffected (open PvP still open)',
    room._pvpAllowed(I, K, 'meadow') === true && room._pvpAllowed(K, J, 'meadow') === true);
  check('a safe zone still refuses everyone', room._pvpAllowed(I, K, 'town') === false);

  // Explicit consent is registered exactly as duel.js:124 does it.
  if (!room._pvpConsent) room._pvpConsent = new Map();
  room._pvpConsent.set(room._pvpPairKey(I, J), Date.now() + 60000);
  check('a consented duel between party members is STILL allowed (consent is checked first)',
    room._pvpAllowed(I, J, 'meadow') === true && room._pvpAllowed(J, I, 'meadow') === true);
  room._pvpConsent.delete(room._pvpPairKey(I, J));
  check('and the shield returns the moment that consent lapses',
    room._pvpAllowed(I, J, 'meadow') === false);

  // Leaving the party restores ordinary lawless rules -- the shield
  // tracks the roster, it is not a sticky per-pair flag.
  await cmd(wss.j, 'party_leave', {});
  check('leaving the party makes the pair damageable again in the wild',
    room._pvpAllowed(I, J, 'meadow') === true, { pi: !!room._partyOf(I), pj: !!room._partyOf(J) });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
