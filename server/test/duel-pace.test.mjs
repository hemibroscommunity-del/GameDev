/* ═══ v2.3.5805 (card RV, PR 6): A DUEL CHALLENGE IS PACED AND HEARD ONLY IF
 * WANTED, A DECLINE IS OF A REAL ONE, AND THE POT IS ONE WRITE ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), three findings in duel.js:
 *
 *   S1 (medium).  A challenge had no pace, no check that its target is in the
 *   room and no mute: 40 cards and sounds in 10 s reached a player, the relay
 *   bucket the only bound.  Now a challenger's cards to one target are a
 *   bucket (CARD_BURST, then one each INVITE_REPEAT_MS), nobody in the room
 *   is no challenge, and a muted challenger is not heard (`duelpace`).
 *
 *   S4 (low).  A `duel_decline` of nothing was relayed with its `reason`:
 *   "Duel declined" or "Saving is paused" on anyone's screen.  Now only a
 *   real challenge's decline goes, and it says only that (`duelpace`).
 *
 *   MS-6, the duel's part (low).  The pot was paid in one write and its
 *   escrow record deleted in the next: a restart between left a record only
 *   the pot's stamp explained, and the prune could outrun the sweep
 *   (TRAPS §146).  Now one write (`duelonewrite`).
 *
 *   1. 40 challenges in 10 s: at most 4 cards; each one's record still kept,
 *      a stake re-sent still the stake on file;
 *   2. a challenge to nobody in the room, and one the target muted: no card;
 *   3. a decline of nothing: not relayed; a real one: `{target, from}` only;
 *   4. the pot cut at each write: never a record left that only the pot's
 *      stamp explains;
 *   5. `duelpace: false`, `duelonewrite: false`: as before.
 *
 * Red on main before this change: checks 1a, 2a, 2b, 3a, 3b and 4 fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const A = 'bp_rvduela01', B = 'bp_rvduelb01';
const chal = (target, wager) => ({ type: 'duel_wager_request', payload: { target, fromName: 'A', wager } });

async function pair(flags) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  await join(room, fakeWs('a'), A, { loginTaken: true, data: { x: 100, y: 100, z: 'town' } });
  await join(room, fakeWs('b'), B, { loginTaken: true, data: { x: 120, y: 100, z: 'town' } });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  room._goldSet(room.playerState[A], 1000, 'restore'); room._goldSet(room.playerState[B], 1000, 'restore');
  room._saveRpg(A, room.playerState[A]); room._saveRpg(B, room.playerState[B]);
  await settleN(2);
  return { st, room };
}

/* ── 1 to 3 ── */
async function social(flags) {
  const clock = seededClock().install();
  try {
    const { room } = await pair(flags);
    let cards = 0;
    for (let i = 0; i < 40; i++) {
      if (await room._interceptDuel(A, chal(B, 100 + i))) cards++;
      clock.advance(250);
    }
    const rec = room._duelChallenges.get(A + '>' + B);
    const toNobody = await room._interceptDuel(A, chal('bp_rvnobody1', 10));
    /* B mutes A, the room's own way */
    const ws = [...room.sessions.entries()].find(([, s]) => s.id === B)[0];
    await room.webSocketMessage(ws, JSON.stringify({ type: 'chat_mute', payload: { target: A, on: true, muted: true } }));
    await settleN(2);
    clock.advance(20000);
    const muted = await room._interceptDuel(A, chal(B, 10));
    const fake = await room._interceptDuel(A, { type: 'duel_decline', payload: { target: B, reason: 'paused' } });
    room._duelChallenges.set(B + '>' + A, { wager: 0, ts: Date.now() });
    const real = await room._interceptDuel(A, { type: 'duel_decline', payload: { target: B, reason: 'paused' } });
    return { cards, rec, toNobody, muted, mutedOk: !!(room._chatModMuted && room._chatModMuted(B, A)), fake, real };
  } finally { clock.restore(); }
}
{
  const r = await social(null);
  check('1a. 40 challenges in 10 s: at most 4 cards', r.cards >= 1 && r.cards <= 4, r.cards);
  check('1b. ...each one\'s record still kept, the last stake on file', r.rec && r.rec.wager === 139, r.rec);
  check('2a. a challenge to nobody in the room: no card', r.toNobody === null, r.toNobody);
  check('2b. a challenge the target muted: no card', r.mutedOk && r.muted === null, { mutedOk: r.mutedOk, muted: r.muted });
  check('3a. a decline of nothing: not relayed', r.fake === null, r.fake);
  check('3b. a real decline: relayed, `{target, from}` only (no reason)', !!r.real && r.real.payload.target === B && r.real.payload.from === A && !('reason' in r.real.payload), r.real && r.real.payload);
}
{
  const r = await social({ duelpace: false });
  check('5a. `duelpace: false`: every card relayed, and a decline of nothing too, as before', r.cards === 40 && r.fake !== null, { cards: r.cards, fake: r.fake });
}

/* ── 4. the pot cut at each write ── */
async function potCut(flags, cut) {
  const clock = seededClock().install();
  try {
    const { st, room } = await pair(flags);
    await room._interceptDuel(A, chal(B, 100));
    const acc = await room._interceptDuel(B, { type: 'duel_accept', payload: { target: A, wager: 100 } });
    await settleN(3);
    const d = room._duelFor(A);
    if (!acc || !d) return { setup: false };
    const id = d.id;
    st.crashAt(st.batches() + cut);
    room._tickDuels(Date.now() + 3600000);   /* resolved on the clock; the pot paid */
    await settleN(10);
    const rec = st._store.has('duelEscrow:' + id), stamp = st._store.has('oplog:duelpot:' + id);
    return { setup: true, rec, stamp };
  } finally { clock.restore(); }
}
{
  const bad = [];
  let setupOk = true;
  for (let cut = 0; cut <= 4; cut++) {
    const r = await potCut(null, cut);
    if (!r.setup) setupOk = false;
    else if (r.rec && r.stamp) bad.push({ cut, ...r });
  }
  check('4. (setup) a staked duel accepted and escrowed', setupOk);
  check('4. the pot cut at each write: never an escrow record left that only the pot\'s stamp explains', bad.length === 0, bad);
}
{
  let seen = false;
  for (let cut = 0; cut <= 4 && !seen; cut++) {
    const r = await potCut({ duelonewrite: false }, cut);
    if (r.setup && r.rec && r.stamp) seen = true;
  }
  check('5b. `duelonewrite: false`: the old two writes (a cut between leaves the stamp-only record)', seen);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
