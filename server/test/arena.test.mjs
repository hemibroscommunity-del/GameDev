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
 *      the bracket's prize paid via _creditPlayer (v2.3.3178: 250g a
 *      gladiator, so 500g for this 2-bracket; was 2000g for any bracket),
 *      entry records cleaned, arena_tournament_complete emitted, flags
 *      cleared.  §4b (v2.3.3178): the prize follows the bracket and the
 *      house adds at most HOUSE_GOLD_PER_HOUR to prizes in a clock hour.
 *   5. 4-player bracket: concurrent round-1 matches, round 2 forms from
 *      the winners, final crowns the champion.
 *   6. Shot-clock timeout resolves by hp-fraction tiebreak.
 *   7. Offline player at activation = walkover.
 *   8. Bracket overflow (3 players -> bracket of 2) refunds the extra.
 *   9. Entry sweep refunds orphans but never a paid-pot tournament.
 *  10. [post-wiring] healing gates: town regen / eat / healFish denied
 *      for ps._arenaMatch players.  (Skipped under __ARENA_PREMIX.)
 *  11. v2.3.1182: forged POST /api/arena/result is refused with
 *      ok:false + settled:true (so capable clients read it as an
 *      authoritative denial, not an old worker's 404) and moves no
 *      coins or bracket state.
 *  12. v2.3.3171: a finished tournament (kept 60 s for the poll) takes
 *      no entries.
 *  13. v2.3.3171: leaving and re-joining the same tournament pays again;
 *      each entry refunds under its own id, the sweep's included.
 *  14. v2.3.3171: an 8-player bracket is not won in round 2 on a
 *      walkover -- the whole round is built before any of it starts.
 */
import { GameRoom } from '../src/index.js';
import { ARENA } from '../src/gladiator.js';

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
// v2.3.1182: pins the v2.3.1126 hole-closure.  The old endpoint
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
  /* v2.3.3132: the minnow is no longer sold (shop_purchase sells nothing:
     data.js DIEGO_SHELF), so the gate is tested where a minnow still is: a
     bottle drunk from the bag. */
  psA10.inventory = { cookedMinnow: 1 };
  await room.webSocketMessage(wss.a, JSON.stringify({ type: 'potion_drink', payload: { invKey: 'cookedMinnow' } }));
  check('a carried healFish is gated during an arena match (and kept)', psA10.hp === 10 && psA10.inventory.cookedMinnow === 1, { hp: psA10.hp, inv: psA10.inventory });
}

// ── 4. server-resolved kill crowns the 2-bracket champion ──
room.eventBuffer.length = 0;
const psB4 = room.playerState[P('b')];
psB4.hp = 0;
room._handlePlayerDeath(psB4, P('b'), 'pvp:' + P('a'));
await new Promise((r) => setTimeout(r, 25));
check('kill resolves the match server-side', room._arena.champion && room._arena.champion.playerId === P('a'), room._arena.champion);
check('champion paid via mail/escrow', room.playerState[P('a')].coins === 900 + 2 * ARENA.PRIZE_PER_ENTRANT, room.playerState[P('a')].coins);
check('v2.3.3178: a 2-gladiator bracket pays 500, not 2,000 for 200 of entries', room.playerState[P('a')].coins === 900 + 500, room.playerState[P('a')].coins);
/* v2.3.3481: and the champion's 500 achievement points, with the gold (the
   owner: "an arena winner should be included") -- on the crown and its event */
check('v2.3.3481: the champion is paid ARENA.CHAMPION_AP achievement points with the gold',
  ARENA.CHAMPION_AP === 500 && room.playerState[P('a')].achievementPoints === ARENA.CHAMPION_AP, room.playerState[P('a')].achievementPoints);
check('v2.3.3481: ...the crown and its event say so (champion.ap)',
  room._arena.champion.ap === 500 && room.eventBuffer.some((e) => e.type === 'arena_tournament_complete' && e.payload.champion && e.payload.champion.ap === 500), room._arena.champion);
check('entry records cleaned after the pot', ![...state._store.keys()].some((k) => k.startsWith('arena_entry:' + tid2 + ':')));
check('completion + result events emitted', room.eventBuffer.some((e) => e.type === 'arena_match_result') && room.eventBuffer.some((e) => e.type === 'arena_tournament_complete'));
check('healing-gate flags cleared', !room.playerState[P('a')]._arenaMatch);
psB4.dying = false; psB4.dead = false; psB4.hp = 100;
room._arena = null; room._arenaClearAt = 0;

/* ── 4b. v2.3.3178: the champion's prize follows the bracket ──
 * It was 2,000 for any bracket, so a 2-player tournament paid 2,000 for
 * 200 of entries and two accounts could run one every 2-3 minutes.  Now it
 * is 250 a gladiator (a full 8 still 2,000), the entries its first 100
 * each, and the house adds the rest out of at most 3,600 an hour, game-wide. */
{
  const HOUR = 3600000;
  const hourOf = (t) => Math.floor(t / HOUR);
  const prizeFn = typeof room._arenaPrize === 'function';
  check('the prize is worked out by the bracket (_arenaPrize)', prizeFn);
  const prizeAt = (n, now, used) => {
    if (!prizeFn) return null;
    room._arenaHouse = { hour: hourOf(now), used };
    return room._arenaPrize(n, now).prize;
  };
  const now = Date.now();
  check('8 gladiators: 2,000, as before', prizeAt(8, now, 0) === 2000, prizeAt(8, now, 0));
  check('4 gladiators: 1,000', prizeAt(4, now, 0) === 1000, prizeAt(4, now, 0));
  check('2 gladiators: 500', prizeAt(2, now, 0) === 500, prizeAt(2, now, 0));
  check('the house tops up only what the hour has left (100 left: 200 + 100)', prizeAt(2, now, ARENA.HOUSE_GOLD_PER_HOUR - 100) === 300, prizeAt(2, now, ARENA.HOUSE_GOLD_PER_HOUR - 100));
  check('...and nothing once the hour is spent: the champion takes the entries', prizeAt(8, now, ARENA.HOUSE_GOLD_PER_HOUR) === 800, prizeAt(8, now, ARENA.HOUSE_GOLD_PER_HOUR));
  if (prizeFn) {
    room._arenaHouse = { hour: hourOf(now) - 1, used: ARENA.HOUSE_GOLD_PER_HOUR };
    check('a new hour starts a new budget', room._arenaPrize(8, now).prize === 2000 && room._arenaHouse.used === 1200, room._arenaHouse);
    room._arenaHouse = { hour: hourOf(now), used: 0 };
    let total = 0;
    for (let i = 0; i < 20; i++) total += room._arenaPrize(2, now).prize - 200;
    check('twenty 2-player tournaments in one hour get 3,600 from the house, no more', total === ARENA.HOUSE_GOLD_PER_HOUR, total);
  }

  // End to end: a 2-bracket crowned with the hour nearly spent, the hour's
  // total saved BEFORE the pot is paid, and the wire telling the real prize.
  const tour = async (w, l) => {
    room._arena = null; room._arenaClearAt = 0;
    for (const id of [w, l]) { const ps = room.playerState[id]; ps.coins = 1000; ps.hp = 100; ps.dying = false; ps.dead = false; }
    await room._arenaJoin(w, w);
    await room._arenaJoin(l, l);
    room._arena.gatherDeadline = Date.now() - 1;
    room._arenaLazyTick(Date.now());
    const t = room._arena;
    const ps = room.playerState[l];
    ps.hp = 0;
    room._handlePlayerDeath(ps, l, 'pvp:' + w);
    await new Promise((r) => setTimeout(r, 25));
    ps.dying = false; ps.dead = false; ps.hp = 100;
    return t;
  };
  const order = [];
  const put0 = state.storage.put;
  state.storage.put = async (k, v) => { order.push(k); return put0(k, v); };
  room._arenaHouse = { hour: hourOf(Date.now()), used: ARENA.HOUSE_GOLD_PER_HOUR - 50 };
  const t4b = await tour(P('a'), P('b'));
  state.storage.put = put0;
  check('a 2-bracket with 50 left in the hour pays the entries + 50', room.playerState[P('a')].coins === 900 + 250, room.playerState[P('a')].coins);
  const rec4b = state._store.get('arena_house');
  check('the hour\'s house total is saved', rec4b && rec4b.used === ARENA.HOUSE_GOLD_PER_HOUR && rec4b.hour === hourOf(Date.now()), rec4b);
  const iHouse = order.indexOf('arena_house'), iPot = order.indexOf('oplog:arenapot:' + (t4b && t4b.id));
  check('...before the pot is paid (a restart between them adds nothing)', iHouse >= 0 && iPot > iHouse, { iHouse, iPot });
  const wire4b = room._arenaWire();
  check('the poll\'s champion carries the prize paid', wire4b && wire4b.champion && wire4b.champion.prize === 250, wire4b && wire4b.champion);
  check('...and so does the crown\'s event', room.eventBuffer.some((e) => e.type === 'arena_tournament_complete' && e.payload.champion && e.payload.champion.prize === 250));
  /* v2.3.3481: `arenaap: false` -- the champion is paid gold alone, and the
     crown says nothing of AP; and a gold credit's `ap` is paid where the gold
     is, from the mail too (inbox.js _applyCreditToPs) */
  {
    const apA = room.playerState[P('a')].achievementPoints || 0;
    room._liveFlags = { arenaap: false };
    const tOff = await tour(P('a'), P('b'));
    room._liveFlags = {};
    check('v2.3.3481: arenaap false -- no achievement points, no champion.ap',
      (room.playerState[P('a')].achievementPoints || 0) === apA && tOff && tOff.champion && !('ap' in tOff.champion),
      { ap: room.playerState[P('a')].achievementPoints, champ: tOff && tOff.champion });
    const psX = { coins: 5, achievementPoints: 7 };
    room._applyCreditToPs(psX, { kind: 'gold', payload: { amount: 100, ap: 500 } }, 'bp_ap_mail');
    room._applyCreditToPs(psX, { kind: 'gold', payload: { amount: 1 } }, 'bp_ap_mail');
    room._applyCreditToPs(psX, { kind: 'gold', payload: { amount: 1, ap: -9 } }, 'bp_ap_mail');
    check('v2.3.3481: a gold credit pays its ap with the gold (a plain one and a negative one add none)',
      psX.coins === 107 && psX.achievementPoints === 507, psX);
  }
  /* v2.3.3488: the champion's points a character's FIRST win only -- the
     owner: "I don't want anyone exploiting the achievement points from it"
     (two accounts could crown each other turn about).  The mark is
     ps.apOnce.arena; the credit carries apOnce, and inbox.js decides where
     it pays the gold, a mailed prize at the drain. */
  {
    const psA = room.playerState[P('a')], psB = room.playerState[P('b')];
    check('v2.3.3488: the first win marked the champion (apOnce.arena)', !!psA.apOnce && psA.apOnce.arena === 1, psA.apOnce);
    const markA = state._store.get('aponce:' + P('a')), rpgA = state._store.get('rpg:' + P('a'));
    check('v2.3.3488: ...in its own record, aponce:<pid>, written with the save that holds the points (never a field of the rpg blob)',
      !!markA && markA.arena === 1 && Object.keys(markA).length === 1 && !!rpgA && !('apOnce' in rpgA) && !('_apOnceDirty' in rpgA) && !('_apOnceFailed' in rpgA)
        && rpgA.achievementPoints === psA.achievementPoints,
      { markA, rpgKeys: rpgA && Object.keys(rpgA).filter((k) => /ap/i.test(k)), ap: rpgA && rpgA.achievementPoints });
    const apA0 = psA.achievementPoints || 0;
    const tAgain = await tour(P('a'), P('b'));
    check('v2.3.3488: a second win pays the gold and no points, and its crown names none',
      (psA.achievementPoints || 0) === apA0 && psA.coins > 1000 && !!tAgain && !!tAgain.champion && !('ap' in tAgain.champion)
        && room.eventBuffer.some((e) => e.type === 'arena_tournament_complete' && e.payload.tid === tAgain.id && !('ap' in e.payload.champion)),
      { ap: psA.achievementPoints, coins: psA.coins, champ: tAgain && tAgain.champion });
    const apB0 = psB.achievementPoints || 0;
    const tB = await tour(P('b'), P('a'));
    check('v2.3.3488: ...while another character\'s first win still pays them, and marks it',
      psB.achievementPoints === apB0 + ARENA.CHAMPION_AP && !!tB && tB.champion.ap === ARENA.CHAMPION_AP && !!psB.apOnce && psB.apOnce.arena === 1,
      { ap: psB.achievementPoints, champ: tB && tB.champion, mark: psB.apOnce });
    /* the mail: two champion prizes waiting for one character pay both
       golds and the points once, decided as each is applied */
    const psM = { coins: 0, achievementPoints: 0 };
    room._applyCreditToPs(psM, { kind: 'gold', payload: { amount: 100, ap: 500, apOnce: 'arena' } }, 'bp_ap_once');
    room._applyCreditToPs(psM, { kind: 'gold', payload: { amount: 100, ap: 500, apOnce: 'arena' } }, 'bp_ap_once');
    check('v2.3.3488: two mailed champion prizes: both golds, the points once', psM.coins === 200 && psM.achievementPoints === 500 && psM.apOnce.arena === 1, psM);
    /* a failed read of the mark pays no once-points that session: neither the
       crown nor a waiting prize, and the record is never written over */
    const psF = { coins: 0, achievementPoints: 0, apOnce: {}, _apOnceFailed: true };
    room._applyCreditToPs(psF, { kind: 'gold', payload: { amount: 100, ap: 500, apOnce: 'arena' } }, 'bp_ap_failed');
    check('v2.3.3488: the mark unreadable: the gold, no points, nothing to write',
      psF.coins === 100 && psF.achievementPoints === 0 && !psF.apOnce.arena && !psF._apOnceDirty, psF);
    const keepB = psB.apOnce;
    psB.apOnce = {}; psB._apOnceFailed = true;
    const apB1 = psB.achievementPoints || 0;
    const tF = await tour(P('b'), P('a'));
    check('v2.3.3488: ...and a champion whose mark was unreadable is crowned with the gold alone',
      (psB.achievementPoints || 0) === apB1 && !!tF && !!tF.champion && !('ap' in tF.champion), { ap: psB.achievementPoints, champ: tF && tF.champion });
    psB.apOnce = keepB; psB._apOnceFailed = false;
    const psN = { coins: 0, achievementPoints: 0 };
    room._applyCreditToPs(psN, { kind: 'gold', payload: { amount: 1, ap: 5, apOnce: '__proto__' } }, 'bp_ap_once2');
    check('v2.3.3488: a name not on the list is no mark (paid as a plain credit; nothing written on a prototype)',
      psN.achievementPoints === 5 && psN.apOnce === undefined && ({}).arena === undefined, psN);
  }
  await tour(P('a'), P('b'));
  check('the next crown that hour takes the entries only', room.playerState[P('a')].coins === 900 + 200, room.playerState[P('a')].coins);

  // A restart: the hour's total comes back from storage at the first join.
  const room2 = new GameRoom(state, mockEnv);
  const ws2 = fakeWs('r2');
  room2.sessions.set(ws2, baseSession());
  await room2.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: P('a'), name: 'A', phrase: 'p-' + P('a'), data: { x: 0, y: 0, z: 'town' } }));
  room2.playerState[P('a')].coins = 1000;
  await room2._arenaJoin(P('a'), 'A');
  check('a restart keeps the hour\'s house total (read at the first join)', room2._arenaHouse && room2._arenaHouse.used === ARENA.HOUSE_GOLD_PER_HOUR, room2._arenaHouse);
  await room2._arenaLeave(P('a'));

  // A failed read of the total adds nothing (the champion takes the entries).
  room._arenaHouse = undefined;
  const get0 = state.storage.get;
  state.storage.get = async (k) => { if (k === 'arena_house') throw new Error('storage down'); return get0(k); };
  await tour(P('a'), P('b'));
  state.storage.get = get0;
  check('with the hour\'s total unreadable the house adds nothing', room.playerState[P('a')].coins === 900 + 200, room.playerState[P('a')].coins);

  room._arena = null; room._arenaClearAt = 0; room._arenaHouse = { hour: 0, used: 0 };
  state._store.delete('arena_house');
  room.eventBuffer.length = 0;
}

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

/* Helpers for the v2.3.3171 sections: a fresh room-side arena, and a match
   ended the way combat ends one -- the loser's death, cause pvp:<winner>. */
const freshArena = () => { room._arena = null; room._arenaClearAt = 0; room.eventBuffer.length = 0; };
const beat = (winner, loser) => {
  const ps = room.playerState[loser];
  ps.hp = 0; ps.dying = false; ps.dead = false;
  room._handlePlayerDeath(ps, loser, 'pvp:' + winner);
  ps.dying = false; ps.dead = false; ps.hp = 100;
};
for (const n of ['f', 'g', 'h', 'i']) { wss[n] = fakeWs(n); await join(wss[n], P(n), n.toUpperCase()); }
for (const n of ['a', 'b', 'd', 'e', 'f', 'g', 'h', 'i']) {
  const ps = room.playerState[P(n)];
  ps.coins = 1000; ps.hp = 100; ps.maxHp = 100; ps.dying = false; ps.dead = false; delete ps._arenaMatch;
}
for (const d of [...(room._duels || new Map()).values()]) room._duels.delete(d.id);

/* ── 12. v2.3.3171: a finished tournament takes no entries ──
 * The finished bracket is kept 60 s for the game's completion poll.  A join
 * in that minute took the 100 g, wrote its record and queued the player on a
 * bracket nothing would start; the tournament was then dropped with no
 * refund, and the sweep deleted the record because the pot was paid. */
freshArena();
await room._arenaJoin(P('a'), 'A');
await room._arenaJoin(P('b'), 'B');
room._arena.gatherDeadline = Date.now() - 1;
room._arenaLazyTick(Date.now());
beat(P('a'), P('b'));
await new Promise((r) => setTimeout(r, 25));
const t12 = room._arena;
check('setup: a champion is crowned and the bracket kept for the poll', t12 && t12.status === 'complete' && t12.champion && t12.champion.playerId === P('a'), t12 && { status: t12.status, champ: t12.champion });
const coinsD12 = room.playerState[P('d')].coins;
const late = await room._arenaJoin(P('d'), 'D');
check('a join in the minute after the crown is refused', late && late.ok === false && late.settled === true, late);
check('...taking no entry fee', room.playerState[P('d')].coins === coinsD12, room.playerState[P('d')].coins);
check('...writing no entry record and queuing nobody',
  !state._store.has('arena_entry:' + t12.id + ':' + P('d')) && t12.queue.length === 0, { queue: t12.queue.length });
room._tickArena(Date.now() + 61000);           // the poll's minute is over
const next12 = await room._arenaJoin(P('d'), 'D');
check('...and once it is cleared the next tournament takes entries again', next12.ok === true && room._arena && room._arena.status === 'gathering', next12);
await room._arenaLeave(P('d'));

/* ── 13. v2.3.3171: leaving and re-joining the same tournament pays again ──
 * A leave refunds under its own id, but the entry's debit stamp stayed, so a
 * re-join of the same tournament (it keeps its id while someone else is
 * queued) was answered "already paid" and queued for free. */
freshArena();
for (const n of ['a', 'b']) room.playerState[P(n)].coins = 1000;
await room._arenaJoin(P('b'), 'B');            // keeps the tournament (and its id) alive
const tid13 = room._arena.id;
await room._arenaJoin(P('a'), 'A');
check('setup: the first entry costs 100', room.playerState[P('a')].coins === 900, room.playerState[P('a')].coins);
await room._arenaLeave(P('a'));
check('...and leaving refunds it', room.playerState[P('a')].coins === 1000, room.playerState[P('a')].coins);
const re13 = await room._arenaJoin(P('a'), 'A');
check('re-joining the same tournament charges the entry again',
  re13.ok === true && room._arena.id === tid13 && room.playerState[P('a')].coins === 900, { ok: re13.ok, coins: room.playerState[P('a')].coins });
await room._arenaLeave(P('a'));
check('...and a second leave refunds that entry too', room.playerState[P('a')].coins === 1000, room.playerState[P('a')].coins);
await room._arenaJoin(P('a'), 'A');            // a third entry, for the sweep
const rec13 = state._store.get('arena_entry:' + tid13 + ':' + P('a'));
check('the entry record says which entry it is', rec13 && rec13.n === 3, rec13);
// A deploy wipes the bracket: the sweep refunds the third entry under its own id.
room._arena = null;
for (const k of [...state._store.keys()]) if (k.startsWith('arena_entry:' + tid13 + ':')) state._store.get(k).paidAt = Date.now() - 9999999;
room._lastArenaSweep = 0;
await room._arenaEntrySweep();
check('...and the sweep refunds that entry, not an earlier one already refunded', room.playerState[P('a')].coins === 1000, room.playerState[P('a')].coins);

/* ── 14. v2.3.3171: an 8-player bracket is not won in round 2 on a walkover ──
 * The next round was activated match by match as it was pushed, so a
 * walkover in its first match resolved into the bracket while that match was
 * the whole round so far -- and crowned its winner before the round's other
 * match existed. */
freshArena();
const eight = ['a', 'b', 'd', 'e', 'f', 'g', 'h', 'i'].map(P);
for (const id of eight) await room._arenaJoin(id, id);
const t14 = room._arena;
check('setup: eight entries start an 8-bracket of four matches', t14 && t14.status === 'running' && t14.matches.filter((m) => m.round === 1).length === 4, t14 && t14.matches.length);
beat(P('a'), P('b'));                           // match 1
beat(P('d'), P('e'));                           // match 2
beat(P('f'), P('g'));                           // match 3
for (const [ws, s] of room.sessions) if (s.id === P('d')) room.sessions.delete(ws);
delete room.playerState[P('d')];                // match 2's winner leaves the game
beat(P('h'), P('i'));                           // match 4 ends round 1
await new Promise((r) => setTimeout(r, 25));
const r2 = t14.matches.filter((m) => m.round === 2);
check('round 2 has both of its matches', r2.length === 2, r2.map((m) => [m.a, m.b]));
check('...the walkover is decided', r2.some((m) => m.a === P('a') && m.b === P('d') && m.winner === P('a')), r2.map((m) => m.winner));
check('...and NOBODY is crowned while the other semifinal is still to be fought',
  t14.status === 'running' && !t14.champion, { status: t14.status, champion: t14.champion });
check('...whose match is live', r2.some((m) => m.a === P('f') && m.b === P('h') && !m.winner && m.active), r2.map((m) => ({ a: m.a, b: m.b, active: m.active, w: m.winner })));
check('the champion\'s 2,000 is not paid early', room.playerState[P('a')].coins === 900, room.playerState[P('a')].coins);

/* ── 15. v2.3.3185: a restart at ANY write of an entry loses no fee ──
 * The fee was taken in one write and the entry record -- what the restart
 * sweep refunds from -- written in the next, so a restart between them kept
 * 100 g no record named.  A storage where every write made in one
 * synchronous run commits as one batch (a Durable Object's), the room dying
 * before batch `crashAt`: for every batch of a join, crash there, restart on
 * what was written, sweep, and the player must have the 1,000 back. */
{
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const mkBatchState = (seed) => {
    const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
    let pending = null, batches = 0, crashAt = Infinity, dead = false;
    const commit = () => {
      const w = pending; pending = null;
      const n = batches++;
      if (dead || n >= crashAt) { dead = true; return; }
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
      crashAt(n) { crashAt = n; },
      storage: {
        get: async (k) => view(k),
        put: async (k, v) => {
          if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
          write('put', k, v);
        },
        delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) write('del', x); return true; },
        list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, clone(v)); return out; },
      },
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    };
  };
  const settleIo = () => new Promise((r) => setTimeout(r, 5));
  const PIDR = 'bp_ar_restart';
  const joinOn = async (rm) => {
    rm.sessions.set(fakeWs('r'), baseSession());
    const ws = [...rm.sessions.keys()].pop();
    await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: PIDR, name: 'R', phrase: 'p-' + PIDR, data: { x: 0, y: 0, z: 'town' } }));
  };
  const s0 = mkBatchState();
  const r0 = new GameRoom(s0, mockEnv);
  await joinOn(r0);
  r0.playerState[PIDR].coins = 1000;
  r0._saveRpg(PIDR, r0.playerState[PIDR]);
  await settleIo();
  const lost = [];
  let joinWrites = 0;
  for (let k = 0; k <= 6; k++) {
    const s1 = mkBatchState(s0._store);
    const r1 = new GameRoom(s1, mockEnv);
    await joinOn(r1);
    await settleIo();
    const before = s1.batches();
    s1.crashAt(before + k);
    await r1._arenaJoin(PIDR, 'R');
    await settleIo();
    joinWrites = Math.max(joinWrites, s1.batches() - before);
    const s2 = mkBatchState(s1._store);
    for (const [kk, v] of s2._store) if (kk.startsWith('arena_entry:')) s2._store.set(kk, { ...v, paidAt: 0 });
    const r2 = new GameRoom(s2, mockEnv);
    await joinOn(r2);
    r2._lastArenaSweep = 0;
    await r2._arenaEntrySweep();
    await settleIo();
    if (r2.playerState[PIDR].coins !== 1000) lost.push({ crashAt: k, coins: r2.playerState[PIDR].coins });
  }
  check('a restart at any write of an arena entry leaves the 1,000 after the sweep (no fee lost, none refunded twice)', lost.length === 0, lost);
  check('...the fee, its stamp and the entry record go out as ONE write', joinWrites === 1, joinWrites);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
