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
check('winning members paid flat gold', psA.coins === 500 + 500 && psC.coins === 1000 + 500, { a: psA.coins, c: psC.coins });
const bobInbox = state._store.get('inbox:bp_cl_bob');
check('offline loser paid via inbox', bobInbox && bobInbox.length === 1 && bobInbox[0].payload.amount === 50, bobInbox);
const coinsA7 = psA.coins;
room._resolveClanWar(war);
await new Promise((r) => setTimeout(r, 10));
check('double resolution is a no-op', psA.coins === coinsA7);

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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
