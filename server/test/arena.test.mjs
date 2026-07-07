/* Gladiator Arena test (v2.3.1126, Wave 2 PR10).  The old Arena DO
 * accepted client-claimed winners (POST /result trusted {winnerId});
 * matches are now server-observed duels and all money moves through
 * escrow/mail.  Checks:
 *   1. Join escrows the 100g entry (record persisted); double-join and
 *      broke players rejected; leave refunds exactly once.
 *   2. Undersubscribed gather (1 player) cancels + refunds.
 *   3. A 2-player tournament starts at the gather deadline: the match
 *      activates as a wager-0 duel tagged arenaMatch, consent pair
 *      registered, ps._arenaMatch flags set, arena_match_start sent.
 *   4. A server-resolved kill advances the bracket: champion crowned,
 *      2000g paid via _creditPlayer, entry records cleaned,
 *      arena_tournament_complete emitted, flags cleared.
 *   5. 4-player bracket: concurrent round-1 matches, round 2 forms from
 *      the winners, final crowns the champion.
 *   6. Shot-clock timeout resolves by hp-fraction tiebreak.
 *   7. Offline player at activation = walkover.
 *   8. Bracket overflow (3 players -> bracket of 2) refunds the extra.
 *   9. Entry sweep refunds orphans but never a paid-pot tournament.
 *  10. [post-wiring] healing gates: town regen / eat / healFish denied
 *      for ps._arenaMatch players.  (Skipped under __ARENA_PREMIX.)
 *  11. v2.3.1176: forged POST /api/arena/result is refused with
 *      ok:false + settled:true (so capable clients read it as an
 *      authoritative denial, not an old worker's 404) and moves no
 *      coins or bracket state.
 */
import { GameRoom } from '../src/index.js';

const PREMIX = !!globalThis.__ARENA_PREMIX;

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
const P = (n) => 'bp_ar_' + n;

const wss = {};
for (const n of ['a', 'b', 'c', 'd', 'e']) {
  wss[n] = fakeWs(n);
  await join(wss[n], P(n), n.toUpperCase());
  room.playerState[P(n)].coins = 1000;
}

// ── 1. join economics ──
const j1 = await room._arenaJoin(P('a'), 'A');
check('join escrows the entry fee', j1.ok === true && room.playerState[P('a')].coins === 900, { j1, coins: room.playerState[P('a')].coins });
check('entry record persisted', state._store.has('arena_entry:' + room._arena.id + ':' + P('a')));
const jDup = await room._arenaJoin(P('a'), 'A');
check('double-join rejected', jDup.ok === false && room.playerState[P('a')].coins === 900);
room.playerState[P('e')].coins = 5;
const jBroke = await room._arenaJoin(P('e'), 'E');
check('broke player rejected', jBroke.ok === false && room.playerState[P('e')].coins === 5);
const tid1 = room._arena.id;
const lv = await room._arenaLeave(P('a'));
check('leave refunds exactly once', lv.ok === true && room.playerState[P('a')].coins === 1000 && !state._store.has('arena_entry:' + tid1 + ':' + P('a')), room.playerState[P('a')].coins);

// ── 2. undersubscribed cancel ──
await room._arenaJoin(P('a'), 'A');
room._arena.gatherDeadline = Date.now() - 1;
room._arenaLazyTick(Date.now());
await new Promise((r) => setTimeout(r, 20));
check('lonely gather cancels + refunds', room._arena === null && room.playerState[P('a')].coins === 1000, room.playerState[P('a')].coins);

// ── 3 + 8. start with overflow (3 players -> bracket of 2) ──
await room._arenaJoin(P('a'), 'A');
await room._arenaJoin(P('b'), 'B');
await room._arenaJoin(P('c'), 'C');
const tid2 = room._arena.id;
room._arena.gatherDeadline = Date.now() - 1;
room._arenaLazyTick(Date.now());
await new Promise((r) => setTimeout(r, 20));
const t2 = room._arena;
check('bracket of 2 starts, third refunded', t2 && t2.status === 'running' && t2.players.length === 2 && room.playerState[P('c')].coins === 1000, { status: t2 && t2.status, c: room.playerState[P('c')].coins });
const m1 = t2.matches[0];
const duel1 = room._duelFor(P('a'));
check('match activated as an arenaMatch duel with shot-clock', m1.active && duel1 && duel1.arenaMatch && duel1.arenaMatch.matchId === m1.id && duel1.wager === 0 && duel1.expiresAt > Date.now(), duel1);
check('consent pair registered for the pairing', room._pvpAllowed(P('a'), P('b'), 'town') === true);
check('healing-gate flags set', room.playerState[P('a')]._arenaMatch === m1.id && room.playerState[P('b')]._arenaMatch === m1.id);
check('arena_match_start sent to both', msgsOfType(wss.a, 'arena_match_start').length === 1 && msgsOfType(wss.b, 'arena_match_start').length === 1);

// ── 11. forged POST /result is refused ──
// v2.3.1176: pins the v2.3.1126 hole-closure.  The old endpoint
// trusted a client-claimed {winnerId} and paid the pot; the handler
// now hard-rejects with settled:true.  Nothing else in the suite
// exercises the route, so a refactor of _arenaFetch could drop the
// four rejection lines (the request would fall through to the 404
// branch, whose body has ok:false but NO settled flag) without any
// failure -- these checks make that regression loud.  b (the eventual
// loser of match 1) claims the win mid-match through the real
// GameRoom.fetch routing path (index.js /api/arena -> _arenaFetch).
const coinsB11 = room.playerState[P('b')].coins;
const res11 = await room.fetch(new Request('https://x/api/arena/result', { method: 'POST', body: JSON.stringify({ winnerId: P('b'), tournamentId: tid2 }) }));
const body11 = await res11.json();
check('forged /result refused', body11.ok === false, body11);
check('refusal carries settled:true (authoritative denial, not a 404)', body11.settled === true, body11);
check('claimed winner not paid by the forgery', room.playerState[P('b')].coins === coinsB11, room.playerState[P('b')].coins);
check('bracket/champion state untouched by the forgery', m1.winner === null && m1.active === true && t2.champion === null && t2.status === 'running', { winner: m1.winner, active: m1.active, champion: t2.champion, status: t2.status });

// ── 10. healing gates (post-wiring only) ──
if (!PREMIX) {
  const psA10 = room.playerState[P('a')];
  psA10.hp = 10; psA10.maxHp = 100;
  room._tickPlayerRegen();
  check('town HP regen gated during an arena match', psA10.hp === 10, psA10.hp);
  psA10.inventory = { cookedMinnow: 1 };
  await room.webSocketMessage(wss.a, JSON.stringify({ type: 'shop_purchase', payload: { itemId: 'cookedMinnow' } }));
  check('shop healFish gated during an arena match', psA10.hp === 10, psA10.hp);
}

// ── 4. server-resolved kill crowns the 2-bracket champion ──
room.eventBuffer.length = 0;
const psB4 = room.playerState[P('b')];
psB4.hp = 0;
room._handlePlayerDeath(psB4, P('b'), 'pvp:' + P('a'));
await new Promise((r) => setTimeout(r, 25));
check('kill resolves the match server-side', room._arena.champion && room._arena.champion.playerId === P('a'), room._arena.champion);
check('champion paid via mail/escrow', room.playerState[P('a')].coins === 900 + 2000, room.playerState[P('a')].coins);
check('entry records cleaned after the pot', ![...state._store.keys()].some((k) => k.startsWith('arena_entry:' + tid2 + ':')));
check('completion + result events emitted', room.eventBuffer.some((e) => e.type === 'arena_match_result') && room.eventBuffer.some((e) => e.type === 'arena_tournament_complete'));
check('healing-gate flags cleared', !room.playerState[P('a')]._arenaMatch);
psB4.dying = false; psB4.dead = false; psB4.hp = 100;
room._arena = null; room._arenaClearAt = 0;

// ── 5 + 6 + 7. 4-player bracket: kill, timeout tiebreak, walkover ──
for (const n of ['a', 'b', 'c', 'd']) { room.playerState[P(n)].coins = 1000; }
await room._arenaJoin(P('a'), 'A');
await room._arenaJoin(P('b'), 'B');
await room._arenaJoin(P('c'), 'C');
await room._arenaJoin(P('d'), 'D');
room._arena.gatherDeadline = Date.now() - 1;
room._arenaLazyTick(Date.now());
const t5 = room._arena;
check('4-bracket runs both round-1 matches concurrently', t5.status === 'running' && t5.matches.filter((m) => m.round === 1 && m.active).length === 2, t5.matches.map((m) => m.active));
// match 1 (a vs b): a kills b.
const m5a = t5.matches.find((m) => m.a === P('a'));
const psB5 = room.playerState[P('b')];
psB5.hp = 0;
room._handlePlayerDeath(psB5, P('b'), 'pvp:' + P('a'));
check('round does not advance until all matches resolve', t5.round === 1 && t5.matches.length === 2);
// match 2 (c vs d): shot-clock timeout; c has the higher hp fraction.
const m5b = t5.matches.find((m) => m.a === P('c'));
room.playerState[P('c')].hp = 80; room.playerState[P('c')].maxHp = 100;
room.playerState[P('d')].hp = 20; room.playerState[P('d')].maxHp = 100;
const duel5b = room._duelFor(P('c'));
duel5b.expiresAt = Date.now() - 1;
room._tickDuels(Date.now());
check('shot-clock timeout resolves by hp fraction', m5b.winner === P('c'), m5b.winner);
check('round 2 forms from the winners', t5.round === 2 && t5.matches.length === 3, { round: t5.round, matches: t5.matches.length });
// final (a vs c): c disconnects -> a walks over at (re)activation.
const final5 = t5.matches.find((m) => m.round === 2);
psB5.dying = false; psB5.dead = false; psB5.hp = 100;
const duelF = room._duelFor(P('a'));
if (duelF) room._resolveDuel(duelF, P('a'), P('c'), 'test-clear'); // ensure clean slate if auto-activated
final5.winner = null; final5.active = false; final5.deadline = 0;
room.sessions.delete(wss.c);
delete room.playerState[P('c')];
room.eventBuffer.length = 0;
room._arenaTryActivate(final5);
await new Promise((r) => setTimeout(r, 25));
check('offline finalist walks over', final5.winner === P('a') && room._arena.champion && room._arena.champion.playerId === P('a'), { w: final5.winner, champ: room._arena.champion });

// ── 9. entry sweep ──
state._store.set('arena_entry:dead-tid:' + P('d'), { wager: 100, paidAt: Date.now() - 9999999 });
const coinsD9 = room.playerState[P('d')].coins;
room._lastArenaSweep = 0;
await room._arenaEntrySweep();
check('orphaned entry refunded by the sweep', room.playerState[P('d')].coins === coinsD9 + 100, room.playerState[P('d')].coins);
await room._opStamp('arenapot:paid-tid');
state._store.set('arena_entry:paid-tid:' + P('d'), { wager: 100, paidAt: Date.now() - 9999999 });
const coinsD9b = room.playerState[P('d')].coins;
room._lastArenaSweep = 0;
await room._arenaEntrySweep();
check('sweep never refunds a paid-pot tournament', room.playerState[P('d')].coins === coinsD9b && !state._store.has('arena_entry:paid-tid:' + P('d')), room.playerState[P('d')].coins);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
