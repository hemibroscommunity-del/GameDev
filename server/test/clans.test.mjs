/* Clan registry + server-scored wars test (v2.3.1125, Wave 2 PR9).
 * Clans used to live in localStorage with peer-scored wars and
 * self-credited rewards.  Checks:
 *   1. Create: 500g debit, storage records, clan_state echo, tag
 *      stamped into session data; dup tag/name rejected with clan_error
 *      and NO debit; bad name/tag rejected; no double-clanning.
 *   2. Invite/accept handshake: leader-only invites, accept valid only
 *      against a recorded invite from the leader's own session; forged
 *      accepts ignored; member added + everyone gets clan_state.
 *   3. Authoritative tag: forged clanTag stripped from clanless
 *      players' data; real members get the registry tag.
 *   4. Leave/kick: kick is leader-only; leadership succession; last
 *      leave dissolves the clan.
 *   5. War declare: leader-only, defender must be registered, zone must
 *      be lawless, one war per clan; server-built war broadcast in the
 *      client's existing clan_war_declare shape.
 *   6. Scoring: only the server's own pvp:<id> deaths count, only in
 *      the war zone, never between duelists; clan_war_kill emitted.
 *   7. Resolution: endsAt via tick, winner by score, flat gold rewards
 *      via _creditPlayer (offline member -> inbox), double-resolve
 *      no-op.
 *   9. v2.3.2301 wire-driven leave: clan_leave routed through the real
 *      message switch (not the handler directly); the tag cleared from
 *      playerState AND session data AND every peer's screen; survivor
 *      keeps the clan; succession; last-out dissolves and frees the tag;
 *      leaving twice is a no-op; desertion refused mid-war while a kick
 *      is still allowed.
 */
import { GameRoom } from '../src/index.js';
import { CLANS } from '../src/clans.js';

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
const sessionOf = (id) => [...room.sessions.values()].find((s) => s.id === id);

const wsA = fakeWs('alice'); const wsB = fakeWs('bob'); const wsC = fakeWs('carol'); const wsD = fakeWs('dave');
await join(wsA, 'bp_cl_alice', 'Alice');
await join(wsB, 'bp_cl_bob', 'Bob');
await join(wsC, 'bp_cl_carol', 'Carol');
await join(wsD, 'bp_cl_dave', 'Dave');
const psA = room.playerState['bp_cl_alice'];
const psB = room.playerState['bp_cl_bob'];
const psC = room.playerState['bp_cl_carol'];
const psD = room.playerState['bp_cl_dave'];
psA.coins = 1000; psB.coins = 1000; psC.coins = 1000; psD.coins = 1000;

// ── 1. create ──
await room._handleClanCreate(sessionOf('bp_cl_alice'), { name: 'Red Team', tag: 'red', color1: '#f00' });
const redClan = room._clanOf('bp_cl_alice');
check('create debits 500g and registers', psA.coins === 500 && redClan && redClan.tag === 'RED' && redClan.leaderId === 'bp_cl_alice', { coins: psA.coins, clan: redClan });
check('registry persisted under its own keys', state._store.has('clan:' + redClan.id) && state._store.get('clan_by_player:bp_cl_alice') === redClan.id);
const aStates = msgsOfType(wsA, 'clan_state');
check('creator got clan_state carrying the new clan', aStates.length >= 1 && aStates[aStates.length - 1].payload.clan && aStates[aStates.length - 1].payload.clan.tag === 'RED', aStates.map((m) => m.payload));
check('tag stamped into session data', sessionOf('bp_cl_alice').data.clanTag === 'RED');
wsB.sent.length = 0;
await room._handleClanCreate(sessionOf('bp_cl_bob'), { name: 'Other Name', tag: 'RED' });
check('duplicate tag rejected without debit', psB.coins === 1000 && !room._clanOf('bp_cl_bob') && msgsOfType(wsB, 'clan_error').length === 1, psB.coins);
await room._handleClanCreate(sessionOf('bp_cl_bob'), { name: 'xy', tag: 'BLU' });
check('short name rejected', !room._clanOf('bp_cl_bob'));
await room._handleClanCreate(sessionOf('bp_cl_bob'), { name: 'Blue Team', tag: 'BLU' });
const bluClan = room._clanOf('bp_cl_bob');
check('second clan created', bluClan && bluClan.tag === 'BLU' && psB.coins === 500);
await room._handleClanCreate(sessionOf('bp_cl_alice'), { name: 'Third', tag: 'THR' });
check('no double-clanning', room._clanOf('bp_cl_alice').tag === 'RED' && psA.coins === 500);

// ── 2. invite/accept handshake ──
const forged = await room._handleClanJoinAccept(sessionOf('bp_cl_carol'), { inviter: 'bp_cl_alice' });
check('forged accept (no invite) ignored', !room._clanOf('bp_cl_carol'), forged);
await room._observeClanInvite('bp_cl_carol', { payload: { target: 'bp_cl_dave' } }); // non-leader invite
await room._handleClanJoinAccept(sessionOf('bp_cl_dave'), { inviter: 'bp_cl_carol' });
check('non-leader invite confers nothing', !room._clanOf('bp_cl_dave'));
await room._observeClanInvite('bp_cl_alice', { payload: { target: 'bp_cl_carol' } });
await room._handleClanJoinAccept(sessionOf('bp_cl_carol'), { inviter: 'bp_cl_alice' });
check('leader invite + accept joins RED', room._clanOf('bp_cl_carol') === redClan && redClan.members.length === 2);
check('joiner tag stamped', sessionOf('bp_cl_carol').data.clanTag === 'RED');

// ── 3. authoritative tag stamping ──
const forgedData = { clanTag: 'HAXX', clanColor1: '#000' };
room._clanStampTag('bp_cl_dave', forgedData);
check('forged tag stripped from clanless player', !forgedData.clanTag && !forgedData.clanColor1, forgedData);
const realData = { clanTag: 'FAKE' };
room._clanStampTag('bp_cl_alice', realData);
check('member tag overridden by registry', realData.clanTag === 'RED');

// ── 5. war declare (before kicks change membership) ──
await room._handleClanWarDeclare(sessionOf('bp_cl_carol'), { defenderTag: 'BLU', zone: 'meadow' });
check('non-leader cannot declare war', room._clanWars.size === 0);
wsA.sent.length = 0;
await room._handleClanWarDeclare(sessionOf('bp_cl_alice'), { defenderTag: 'XXX', zone: 'meadow' });
check('unregistered defender rejected', room._clanWars.size === 0 && msgsOfType(wsA, 'clan_error').length === 1);
await room._handleClanWarDeclare(sessionOf('bp_cl_alice'), { defenderTag: 'BLU', zone: 'town' });
check('non-lawless zone rejected', room._clanWars.size === 0);
room.eventBuffer.length = 0;
await room._handleClanWarDeclare(sessionOf('bp_cl_alice'), { defenderTag: 'BLU', zone: 'meadow' });
const war = [...room._clanWars.values()][0];
const declared = room.eventBuffer.find((e) => e.type === 'clan_war_declare');
check('war declared with server-built object', war && war.status === 'active' && declared && declared.payload.war.id === war.id
  && declared.payload.war.challenger.tag === 'RED' && declared.payload.war.defender.tag === 'BLU', declared && declared.payload.war);
check('war snapshot persisted', state._store.has('clan_war:' + war.id));
await room._handleClanWarDeclare(sessionOf('bp_cl_alice'), { defenderTag: 'BLU', zone: 'ember' });
check('one war per clan', room._clanWars.size === 1);

// ── 6. scoring ──
psA.z = 'meadow'; psB.z = 'meadow'; psC.z = 'meadow';
room.eventBuffer.length = 0;
room._warOnDeath('bp_cl_bob', 'pvp:bp_cl_alice'); // RED kills BLU in zone
check('war kill scores the killer side', war.challenger.score === 1 && room.eventBuffer.some((e) => e.type === 'clan_war_kill' && e.payload.scoreSide === 'challenger'), war.challenger.score);
psB.z = 'ember';
room._warOnDeath('bp_cl_bob', 'pvp:bp_cl_alice'); // outside the war zone
check('kill outside the war zone does not score', war.challenger.score === 1);
psB.z = 'meadow';
room._warOnDeath('bp_cl_bob', 'monster:fodder');
check('monster deaths never score', war.challenger.score === 1);
room._warOnDeath('bp_cl_dave', 'pvp:bp_cl_alice'); // victim not clanned
check('non-clan victims never score', war.challenger.score === 1);
// duel exclusion: put alice+bob in an active duel, then a war-zone kill
room._duels = room._duels || new Map();
// v2.3.1175: away replaced graceUntil/awayId (per-player forfeit clocks)
room._duels.set('d1', { id: 'd1', a: 'bp_cl_alice', b: 'bp_cl_bob', wager: 0, status: 'active', startedAt: Date.now(), away: {} });
room._warOnDeath('bp_cl_bob', 'pvp:bp_cl_alice');
check('duel kills never score the war', war.challenger.score === 1);
room._duels.delete('d1');

// ── 7. resolution + rewards ──
// bob (BLU) goes offline before the war ends -> reward must land in his inbox.
room.sessions.delete(wsB);
delete room.playerState['bp_cl_bob'];
war.endTime = Date.now() - 1;
room.eventBuffer.length = 0;
room._tickClanWars(Date.now());
await new Promise((r) => setTimeout(r, 20)); // fire-and-forget payouts settle
const ended = room.eventBuffer.find((e) => e.type === 'clan_war_end');
check('war resolves by endsAt with the winning tag', ended && ended.payload.winner === 'RED' && room._clanWars.size === 0, ended && ended.payload);
/* v2.3.3180: only the members who FOUGHT are paid -- alice made the kill,
   carol never fought (she was paid 500 for nothing before) */
check('the winner who fought is paid flat gold', psA.coins === 500 + 500, { a: psA.coins });
check('v2.3.3180: a winning member who never fought is paid nothing (was 500)', psC.coins === 1000, { c: psC.coins });
const bobInbox = state._store.get('inbox:bp_cl_bob');
check('offline loser paid via inbox', bobInbox && bobInbox.length === 1 && bobInbox[0].payload.amount === 50, bobInbox);
const coinsA7 = psA.coins;
room._resolveClanWar(war);
await new Promise((r) => setTimeout(r, 10));
check('double resolution is a no-op', psA.coins === coinsA7);

// ── 7b. v2.3.3180: a war pays only who fought, and a clan rests an hour ──
// It paid every member of the roster frozen at declare: 50 each on a 0-0
// war (2,000 gold every 30 minutes for two 20-member clans doing nothing)
// and 500 to every winner after one staged kill; and a new war could be
// declared the moment one ended.  Self-contained: its own players and clans,
// its war snapshots removed at the end (section 5 counts them).
{
  const ids = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'].map((n) => 'bp_cl_' + n);
  const wsW = {};
  for (const id of ids) { wsW[id] = fakeWs(id); await join(wsW[id], id, id); room.playerState[id].coins = 1000; }
  const [l1, m1, m2, l2, n1, n2] = ids;   // WAA: l1 (leader), m1, m2   WBB: l2 (leader), n1, n2
  await room._handleClanCreate(sessionOf(l1), { name: 'War Alpha', tag: 'WAA' });
  await room._handleClanCreate(sessionOf(l2), { name: 'War Beta', tag: 'WBB' });
  const cA = room._clanOf(l1), cB = room._clanOf(l2);
  for (const [lead, pid] of [[l1, m1], [l1, m2], [l2, n1], [l2, n2]]) {
    await room._observeClanInvite(lead, { payload: { target: pid } });
    await room._handleClanJoinAccept(sessionOf(pid), { inviter: lead });
  }
  check('setup: two clans of three', cA && cB && cA.members.length === 3 && cB.members.length === 3, { a: cA && cA.members, b: cB && cB.members });
  const coinsOf = () => Object.fromEntries(ids.map((id) => [id, room.playerState[id].coins]));
  const declare = async () => {
    room.eventBuffer.length = 0;
    await room._handleClanWarDeclare(sessionOf(l1), { defenderTag: 'WBB', zone: 'meadow' });
    return [...room._clanWars.values()].find((w) => w.challenger.clanId === cA.id && w.status === 'active');
  };
  const finish = async (w) => {
    w.endTime = Date.now() - 1;
    room.eventBuffer.length = 0;
    room._tickClanWars(Date.now());
    await new Promise((r) => setTimeout(r, 20));
    return room.eventBuffer.find((e) => e.type === 'clan_war_end');
  };
  const rest = () => { cA.lastWarEnd = 0; cB.lastWarEnd = 0; };
  const snaps = [];

  // (a) 0-0: nobody fought, nobody is paid
  const w0 = await declare();
  if (w0) snaps.push(w0.id);
  const before0 = coinsOf();
  const end0 = await finish(w0);
  const after0 = coinsOf();
  check('a 0-0 war pays nobody (was 50 to every member of both clans)', ids.every((id) => after0[id] === before0[id]), { before0, after0 });
  check('...and says so: nobody on its paid list', end0 && Array.isArray(end0.payload.paid) && end0.payload.paid.length === 0, end0 && end0.payload);

  // (b) the hour's rest, counted from the war's end
  room.eventBuffer.length = 0;
  wsW[l1].sent.length = 0;
  await room._handleClanWarDeclare(sessionOf(l1), { defenderTag: 'WBB', zone: 'meadow' });
  const refused = msgsOfType(wsW[l1], 'clan_error').map((m) => m.payload.text || m.payload.message || '');
  check('a new war within the hour after one ends is refused', ![...room._clanWars.values()].some((w) => w.challenger.clanId === cA.id) && refused.length === 1, refused);
  check('...the end is kept on both clans\' records', cA.lastWarEnd > 0 && cB.lastWarEnd > 0
    && state._store.get('clan:' + cA.id).lastWarEnd === cA.lastWarEnd && state._store.get('clan:' + cB.id).lastWarEnd === cB.lastWarEnd, { a: cA.lastWarEnd, b: cB.lastWarEnd });
  cA.lastWarEnd = Date.now() - CLANS.WAR_COOLDOWN - 1; cB.lastWarEnd = Date.now() - 5 * 60000;
  wsW[l1].sent.length = 0;
  await room._handleClanWarDeclare(sessionOf(l1), { defenderTag: 'WBB', zone: 'meadow' });
  check('...for the defender too (55 minutes ago is too soon)', ![...room._clanWars.values()].some((w) => w.challenger.clanId === cA.id) && msgsOfType(wsW[l1], 'clan_error').length === 1);
  cB.lastWarEnd = Date.now() - CLANS.WAR_COOLDOWN - 1;

  // (c) one staged kill: only its killer and its victim are paid
  const w1 = await declare();
  check('...and an hour on, a war can be declared again', !!w1, room._clanWars.size);
  if (w1) snaps.push(w1.id);
  for (const id of ids) room.playerState[id].z = 'meadow';
  room._warOnDeath(n1, 'pvp:' + m1);               // m1 (WAA) kills n1 (WBB)
  const foughtOf = (w, sd) => (w && w[sd] && Array.isArray(w[sd].fought) ? w[sd].fought : []);
  check('the kill marks its killer and its victim as having fought', foughtOf(w1, 'challenger').includes(m1) && foughtOf(w1, 'defender').includes(n1)
    && foughtOf(w1, 'challenger').length === 1 && foughtOf(w1, 'defender').length === 1, { c: foughtOf(w1, 'challenger'), d: foughtOf(w1, 'defender') });
  const before1 = coinsOf();
  const end1 = await finish(w1);
  const got1 = Object.fromEntries(ids.map((id) => [id, room.playerState[id].coins - before1[id]]));
  check('a 1-0 war pays the winner who fought 500 and the loser who fought 50', got1[m1] === 500 && got1[n1] === 50, got1);
  check('...and nobody else on either side (was 500 to every winner, 50 to every loser)', got1[l1] === 0 && got1[m2] === 0 && got1[l2] === 0 && got1[n2] === 0, got1);
  check('...the war\'s end names who was paid', end1 && end1.payload.winner === 'WAA' && JSON.stringify([...(end1.payload.paid || [])].sort()) === JSON.stringify([m1, n1].sort()), end1 && end1.payload);

  // (d) kicked mid-war: fought, but not in the clan at the end -> not paid
  rest();
  const w2 = await declare();
  if (w2) snaps.push(w2.id);
  room._warOnDeath(n2, 'pvp:' + m2);               // m2 kills n2
  room._warOnDeath(m1, 'pvp:' + n1);               // n1 kills m1
  await room._handleClanKick(sessionOf(l1), { target: m2 });
  check('setup: m2 fought and was then kicked', foughtOf(w2, 'challenger').includes(m2) && !room._clanOf(m2));
  const before2 = coinsOf();
  await finish(w2);
  const got2 = Object.fromEntries(ids.map((id) => [id, room.playerState[id].coins - before2[id]]));
  check('a member kicked mid-war is not paid by it, though they fought', got2[m2] === 0, got2);
  check('...the others who fought are (a 1-1 draw pays the loser rate to both)', got2[m1] === 50 && got2[n1] === 50 && got2[n2] === 50 && got2[l1] === 0 && got2[l2] === 0, got2);

  // (e) a war declared before this version (no `fought` lists) pays its
  //     roster as it did -- once, unless it is 0-0
  rest();
  const w3 = await declare();
  if (w3) snaps.push(w3.id);
  delete w3.challenger.fought; delete w3.defender.fought;
  w3.challenger.score = 1;
  const before3 = coinsOf();
  await finish(w3);
  const got3 = Object.fromEntries(ids.map((id) => [id, room.playerState[id].coins - before3[id]]));
  check('a war declared before the change still pays its roster (one last time)', got3[l1] === 500 && got3[m1] === 500 && got3[l2] === 50 && got3[n1] === 50 && got3[n2] === 50, got3);
  rest();
  const w4 = await declare();
  if (w4) snaps.push(w4.id);
  delete w4.challenger.fought; delete w4.defender.fought;
  const before4 = coinsOf();
  await finish(w4);
  check('...but not for a 0-0', ids.every((id) => room.playerState[id].coins === before4[id]), coinsOf());

  for (const id of snaps) { state._store.delete('clan_war:' + id); }
  for (const id of ids) room.playerState[id].z = 'town';
}

// ── 4. leave/kick (after the war so membership was stable above) ──
await room._handleClanKick(sessionOf('bp_cl_carol'), { target: 'bp_cl_alice' });
check('non-leader kick ignored', redClan.members.length === 2);
await room._handleClanKick(sessionOf('bp_cl_alice'), { target: 'bp_cl_carol' });
check('leader kick removes the member', redClan.members.length === 1 && !room._clanOf('bp_cl_carol'));
check('kicked player tag cleared', !sessionOf('bp_cl_carol').data.clanTag);
await room._handleClanLeave(sessionOf('bp_cl_alice'));
check('last leave dissolves the clan', !room._clans.has(redClan.id) && !state._store.has('clan:' + redClan.id));

// ── 5. v2.3.1179: ended-war snapshot retention ──
// clan_war:<id> keys were written on declare/kill/resolve and never
// deleted -- one orphan per war ever declared.  The registry load now
// sweeps ended wars older than CLANS.WAR_RETENTION (48h, the oplog
// prune posture); a just-ended war stays inside the window so its
// reward opId stamps remain checkable on a crash-retry.
{
  const recentWars = [...state._store.keys()].filter((k) => k.startsWith('clan_war:'));
  check('just-ended war snapshot persists inside the retention window', recentWars.length === 1, recentWars);
  state._store.set('clan_war:ancient', { id: 'ancient', status: 'ended', endTime: Date.now() - CLANS.WAR_RETENTION - 1000 });
  room._clans = null; // drop the wake cache -> next ensure reloads + sweeps
  await room._clansEnsure();
  await new Promise((r) => setTimeout(r, 10)); // fire-and-forget deletes settle
  check('ancient ended war swept on registry load', !state._store.has('clan_war:ancient'));
  const kept = [...state._store.keys()].filter((k) => k.startsWith('clan_war:'));
  check('recent ended war retained by the sweep', kept.length === 1, kept);
}

// ── 8. v2.3.1622: pending invites expire, and the key is bounded ──
//
// CLANS.INVITE_TTL was only read to REJECT a late accept — nothing ever
// deleted the entry, so an invite nobody answers stayed resident for the
// life of the DO, keyed by a client-supplied string of unbounded length.
// Every sibling invite map (_t2Invites, _partyInvites, _duelChallenges)
// already swept; this one and _pendingTradeOffers were the two missed.
{
  // NB: RED was dissolved at the last-leave check above, so this uses
  // BLU's leader (bob), who is still a leader of a live clan.
  room._clanInvites = new Map();
  await room._observeClanInvite('bp_cl_bob', { payload: { target: 'bp_cl_fresh' } });
  await room._observeClanInvite('bp_cl_bob', { payload: { target: 'bp_cl_stale' } });
  check('invite sweep: both invites recorded', room._clanInvites.size === 2,
    [...room._clanInvites.keys()]);

  room._clanInvites.get('bp_cl_bob>bp_cl_stale').ts = Date.now() - CLANS.INVITE_TTL - 1;
  room._tickClanInvites(Date.now());
  check('invite sweep: the expired invite is evicted',
    !room._clanInvites.has('bp_cl_bob>bp_cl_stale'), [...room._clanInvites.keys()]);
  check('invite sweep: a live invite survives the sweep',
    room._clanInvites.has('bp_cl_bob>bp_cl_fresh'), [...room._clanInvites.keys()]);

  const before = room._clanInvites.size;
  await room._observeClanInvite('bp_cl_bob', { payload: { target: 'x'.repeat(5000) } });
  check('invite sweep: an oversized target is refused outright',
    room._clanInvites.size === before, { size: room._clanInvites.size, before });

  await room._observeClanInvite('bp_cl_bob', { payload: { target: 'b'.repeat(64) } });
  check('invite sweep: a 64-char target is still accepted',
    room._clanInvites.size === before + 1, { size: room._clanInvites.size, before });
}

// ── 9. v2.3.2301: wire-driven leave ──
// The Leave Clan button was local-only until now: it nulled the client's own
// state while the registry kept you a member, so the clan came back on the
// next reload.  The server command has existed since v2.3.1125 -- only the
// send was missing.  Turning the send on makes the whole removal path
// reachable from a real client for the first time, which is what these
// assertions cover.
//
// TWO THINGS ABOUT THE SHAPE OF THIS SECTION, both learned the hard way:
//
//  a) It routes through webSocketMessage, not straight at the handler like
//     section 4 does.  A suite that only calls the handler cannot catch a
//     typo'd `case` label (TRAPS #18), and the entire bug being fixed here
//     was "the message never arrives".
//  b) The mid-war REFUSAL test is last, deliberately.  It was written first,
//     and against a build without the guard the refusal does not happen --
//     so Hana actually left, and every later assertion about "her tag is
//     gone" then passed for the wrong reason, on a player who was not in a
//     clan at all.  A cascading fixture turns real assertions vacuous.
{
  const cmd = (ws, type, payload) =>
    room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

  const wsG = fakeWs('greg'); const wsH = fakeWs('hana'); const wsI = fakeWs('ivan');
  await join(wsG, 'bp_cl_greg', 'Greg');
  await join(wsH, 'bp_cl_hana', 'Hana');
  await join(wsI, 'bp_cl_ivan', 'Ivan');
  const topUp = () => { room.playerState['bp_cl_greg'].coins = 5000; room.playerState['bp_cl_hana'].coins = 5000; room.playerState['bp_cl_ivan'].coins = 5000; };
  topUp();

  const enlist = async (leaderId, ws, id) => {
    await room._observeClanInvite(leaderId, { payload: { target: id } });
    await room._handleClanJoinAccept(sessionOf(id), { inviter: leaderId });
  };

  await room._handleClanCreate(sessionOf('bp_cl_greg'), { name: 'Green Team', tag: 'GRN', color1: '#0f0' });
  await enlist('bp_cl_greg', wsH, 'bp_cl_hana');
  check('9.0 fixture: GRN has two members', room._clanOf('bp_cl_greg') && room._clanOf('bp_cl_greg').members.length === 2);

  // Only join.js stamps the tag onto playerState; _handleClanCreate and
  // _handleClanJoinAccept stamp session.data alone.  These players joined
  // BEFORE their clan existed, so without this reconnect playerState never
  // carries a tag -- and "the tag is gone from playerState" passes happily
  // against the broken build.  Rejoining is what a real member does on every
  // reconnect, and it is the only way the field under test gets populated.
  await join(wsH, 'bp_cl_hana', 'Hana');
  check('9.2a positive control: a reconnected member HAS the tag on playerState',
    room.playerState['bp_cl_hana'].clanTag === 'GRN', room.playerState['bp_cl_hana'].clanTag);

  /* v2.3.3220: a tall, broad leaver -- the clear must keep the build */
  sessionOf('bp_cl_hana').data.hg = 'tall';
  sessionOf('bp_cl_hana').data.fr = 'broad';
  sessionOf('bp_cl_hana')._look = { sigs: Object.create(null), fullAt: Date.now() };
  wsH.sent.length = 0; wsI.sent.length = 0;
  await cmd(wsH, 'clan_leave');
  check('9.1 clan_leave routes through the message switch', !room._clanOf('bp_cl_hana'));
  {
    const upd = msgsOfType(wsI, 'player_update').filter((m) => m.id === 'bp_cl_hana');
    const last = upd[upd.length - 1];
    check('9.3c v2.3.3220: the tag clear carries the leaver\'s build (hg/fr) -- a phone sets a peer\'s build from every relay',
      last && last.data.hg === 'tall' && last.data.fr === 'broad', last && last.data);
    check('9.3d v2.3.3220: and the leaver\'s next look relay goes whole (lookrelay.js _lookForget)',
      sessionOf('bp_cl_hana')._look === null);
  }
  check('9.2 leaving strips the tag from playerState',
    !room.playerState['bp_cl_hana'].clanTag && !room.playerState['bp_cl_hana'].clanColor1,
    { ps: room.playerState['bp_cl_hana'].clanTag });
  check('9.2b ...and from session data too', !sessionOf('bp_cl_hana').data.clanTag);
  {
    const upd = msgsOfType(wsI, 'player_update').filter((m) => m.id === 'bp_cl_hana');
    check('9.3 peers are told the tag is gone',
      upd.length >= 1 && upd[upd.length - 1].data.clanTag === null && upd[upd.length - 1].data.clanColor1 === null,
      upd.map((m) => m.data));
    check('9.3b the leaver is not sent their own peer update',
      msgsOfType(wsH, 'player_update').filter((m) => m.id === 'bp_cl_hana').length === 0);
  }
  check('9.5 the survivor keeps the clan', !!room._clanOf('bp_cl_greg') && room._clanOf('bp_cl_greg').members.length === 1);
  // The only storage assertion that bites: makeState().put stores the LIVE
  // object and _clanRemoveMember mutates it in place, so re-reading
  // 'clan:<id>' hands back the same in-memory object and proves nothing.
  // A delete is real.
  check('9.5b the leaver\'s clan_by_player key is deleted', !state._store.has('clan_by_player:bp_cl_hana'));

  // 9.4: kick walks the same removal path, so it gains the same two fixes.
  await enlist('bp_cl_greg', wsH, 'bp_cl_hana');
  await join(wsH, 'bp_cl_hana', 'Hana');       // repopulate playerState.clanTag
  check('9.4a positive control: rejoined and tagged again', room.playerState['bp_cl_hana'].clanTag === 'GRN');
  wsI.sent.length = 0;
  await cmd(wsG, 'clan_kick', { target: 'bp_cl_hana' });
  check('9.4 a kick strips playerState and tells peers',
    !room.playerState['bp_cl_hana'].clanTag
      && msgsOfType(wsI, 'player_update').some((m) => m.id === 'bp_cl_hana' && m.data.clanTag === null),
    { ps: room.playerState['bp_cl_hana'].clanTag });

  // 9.6: succession, then the dissolve.
  await enlist('bp_cl_greg', wsH, 'bp_cl_hana');
  const grnId = room._clanOf('bp_cl_greg').id;
  await cmd(wsG, 'clan_leave');   // the LEADER leaves a populated clan
  check('9.6 leadership passes to the remaining member',
    room._clanOf('bp_cl_hana') && room._clanOf('bp_cl_hana').leaderId === 'bp_cl_hana',
    room._clanOf('bp_cl_hana'));

  // 9.8: the last member out dissolves the clan and frees the name+tag. This
  // is the owner-visible consequence the armed button now spells out.
  await cmd(wsH, 'clan_leave');
  check('9.8 the last member out dissolves the clan',
    !room._clans.has(grnId) && !state._store.has('clan:' + grnId));
  check('9.8b ...and the tag is free to take again',
    ![...room._clans.values()].some((c) => c.tag === 'GRN'));

  // 9.9: idempotency, which is why this path needs no opId. Counted, not
  // compared to zero -- an assertion that the count is 0 would also pass if
  // the command silently stopped working.
  const clansAtEnd = room._clans.size;
  wsH.sent.length = 0;
  await cmd(wsH, 'clan_leave');
  await cmd(wsH, 'clan_leave');
  check('9.9 leaving twice is a no-op, not an error',
    msgsOfType(wsH, 'clan_state').length === 0 && room._clans.size === clansAtEnd,
    { states: msgsOfType(wsH, 'clan_state').length, clans: room._clans.size, was: clansAtEnd });

  // 9.7 LAST, on its own fresh fixture, so a missing guard cannot corrupt
  // anything above it.
  topUp();
  await room._handleClanCreate(sessionOf('bp_cl_greg'), { name: 'Green Two', tag: 'GRT', color1: '#0f0' });
  await enlist('bp_cl_greg', wsH, 'bp_cl_hana');
  await room._handleClanCreate(sessionOf('bp_cl_ivan'), { name: 'Ivan Legion', tag: 'IVN' });
  await room._handleClanWarDeclare(sessionOf('bp_cl_greg'), { defenderTag: 'IVN', zone: 'meadow' });
  const grt = room._clanOf('bp_cl_greg');
  check('9.7a fixture: GRT is at war',
    [...room._clanWars.values()].some((w) => w.status === 'active' && (w.challenger.clanId === grt.id || w.defender.clanId === grt.id)));
  wsH.sent.length = 0;
  await cmd(wsH, 'clan_leave');
  check('9.7 leaving is refused mid-war',
    !!room._clanOf('bp_cl_hana') && msgsOfType(wsH, 'clan_error').some((m) => m.payload.text === 'Cannot leave during a clan war'),
    { stillIn: !!room._clanOf('bp_cl_hana'), errs: msgsOfType(wsH, 'clan_error').map((m) => m.payload.text) });
  check('9.7b ...and a kick is still allowed mid-war (a leader ejecting a griefer)',
    await (async () => { await cmd(wsG, 'clan_kick', { target: 'bp_cl_hana' }); return !room._clanOf('bp_cl_hana'); })());

  /* 9.7c v2.3.3175: ...but the kicked member is still on that war's roster
     (it pays the roster frozen at declare), so joining another clan put her
     on a SECOND war's roster -- paid twice, or on both sides of one. */
  const war97 = [...room._clanWars.values()].find((w) => w.status === 'active' && (w.challenger.clanId === grt.id || w.defender.clanId === grt.id));
  check('9.7c fixture: the kicked member is still on the war\'s roster',
    !!war97 && (war97.challenger.members.includes('bp_cl_hana') || war97.defender.members.includes('bp_cl_hana')));
  const wsJ = fakeWs('jo');
  await join(wsJ, 'bp_cl_jo', 'Jo');
  room.playerState['bp_cl_jo'].coins = 5000;
  await room._handleClanCreate(sessionOf('bp_cl_jo'), { name: 'Jo Crew', tag: 'JOC' });
  wsH.sent.length = 0;
  await enlist('bp_cl_jo', wsH, 'bp_cl_hana');
  check('9.7c a member kicked mid-war cannot join another clan while that war is on',
    !room._clanOf('bp_cl_hana') && msgsOfType(wsH, 'clan_error').some((m) => m.payload.text === 'Cannot join during a clan war'),
    { clan: room._clanOf('bp_cl_hana') && room._clanOf('bp_cl_hana').tag, errs: msgsOfType(wsH, 'clan_error').map((m) => m.payload.text) });
  await enlist('bp_cl_ivan', wsH, 'bp_cl_hana');
  check('...nor the clan on the other side of it', !room._clanOf('bp_cl_hana'), room._clanOf('bp_cl_hana') && room._clanOf('bp_cl_hana').tag);
  war97.endTime = Date.now() - 1;
  room._tickClanWars(Date.now());
  await new Promise((r) => setTimeout(r, 20));
  await enlist('bp_cl_jo', wsH, 'bp_cl_hana');
  check('9.7d ...and once the war is over she can join', !!room._clanOf('bp_cl_hana') && room._clanOf('bp_cl_hana').tag === 'JOC',
    room._clanOf('bp_cl_hana') && room._clanOf('bp_cl_hana').tag);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
