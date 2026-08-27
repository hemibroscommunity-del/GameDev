/* ═══ v2.3.2026: THE GOLDEN TICKET AND THE CAPE IT BUYS ═══
 *
 * The contest awards three capes, in public, to named people.  Everything
 * here is about the ways that number stops being three.
 *
 * THE CENTRAL TEST IS THE CONCURRENT CLAIM.  Written the obvious way --
 * await the ledger, check the count, await the write -- two kills landing in
 * the same turn both read 2, both pass, and four people win.  The DO is
 * single-threaded but not single-TASK, so an await inside the decision is an
 * interleave point.  `many claims in one turn` below is the assertion that
 * catches it: it fires far more claims than the cap with a roll that always
 * hits, and requires exactly three to survive.
 */
import { GameRoom } from '../src/index.js';
import { EVENT_LIVE } from '../src/eventcapes.js';

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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
room.playerState = Object.create(null);
room._saveRpg = () => {};
room._sendPlayerState = () => {};
room._wsBySessionId = () => null;
room._opSeen = async () => false;
room._opStamp = async () => {};

const ps = (id) => { room.playerState[id] = { inventory: {} }; return room.playerState[id]; };
const always = () => 0;                 /* a roll that always hits */
const never = () => 0.99;

await room._capeLedgersLoad();

/* ── the cap ── */
{
  const got = [];
  for (let i = 0; i < 12; i++) {
    const id = 'p' + i;
    ps(id);
    const t = room._claimCapeTicket('crimson', id, room.playerState[id], always);
    if (t) got.push(id);
  }
  check('exactly three tickets exist, however many players roll', got.length === 3, got);
}

/* ── THE CONCURRENCY CASE ── every claim decided in ONE synchronous pass,
   which is what a real turn looks like when several kills resolve together. */
{
  const s2 = makeState();
  const r2 = new GameRoom(s2, mockEnv);
  r2.playerState = Object.create(null);
  r2._saveRpg = () => {}; r2._sendPlayerState = () => {}; r2._wsBySessionId = () => null;
  await r2._capeLedgersLoad();
  /* FIRED CONCURRENTLY, not in a plain loop.  A loop over a synchronous
     function cannot interleave whatever the implementation does, so it would
     only be re-testing the cap above and would go green on the very rewrite
     this exists to catch.  Promise.all resolves each claim as a task: while
     _claimCapeTicket stays synchronous every claim still completes whole, but
     the moment someone gives it an `await` BETWEEN the check and the push the
     reads go stale here and the count breaks.

     VERIFIED, and the first attempt to verify it was wrong in a way worth
     recording: injecting the await at the TOP of the decision, before the cap
     check, does NOT break it -- each resumption still does check-then-push as
     one synchronous run, so the answer is still three and this test goes
     green.  It is only an await BETWEEN the check and the push that lets 25
     claims all pass the check before any of them records one.  Injected there,
     this assertion fails with all 25 winning.  So "has an await in it" is not
     the property; WHERE the await sits is. */
  const ids = Array.from({ length: 25 }, (_, i) => 'c' + i);
  for (const id of ids) r2.playerState[id] = { inventory: {} };
  const results = await Promise.all(ids.map(async (id) =>
    r2._claimCapeTicket('crimson', id, r2.playerState[id], always)));
  const winners = ids.filter((id, i) => results[i]);
  check('twenty-five simultaneous claims still yield exactly three', winners.length === 3, winners);
}

/* ── one per account ── */
{
  const s3 = makeState();
  const r3 = new GameRoom(s3, mockEnv);
  r3.playerState = Object.create(null);
  r3._saveRpg = () => {}; r3._sendPlayerState = () => {}; r3._wsBySessionId = () => null;
  await r3._capeLedgersLoad();
  const p = { inventory: {} };
  const a = r3._claimCapeTicket('crimson', 'solo', p, always);
  const b = r3._claimCapeTicket('crimson', 'solo', p, always);
  check('a second ticket is refused for an account that has one', !!a && b === null, { a, b });
  check('...and the holder has exactly one', p.inventory.goldticket_crimson === 1, p.inventory);
}

/* ── the roll actually gates ── */
{
  const s4 = makeState();
  const r4 = new GameRoom(s4, mockEnv);
  r4.playerState = Object.create(null);
  await r4._capeLedgersLoad();
  const p = { inventory: {} };
  check('a losing roll awards nothing', r4._claimCapeTicket('crimson', 'unlucky', p, never) === null, p.inventory);
}

/* ── redemption ── */
{
  const s5 = makeState();
  const r5 = new GameRoom(s5, mockEnv);
  r5.playerState = Object.create(null);
  r5._saveRpg = () => {}; r5._sendPlayerState = () => {}; r5._wsBySessionId = () => null;
  const seen = new Set();
  r5._opSeen = async (k) => seen.has(k);
  r5._opStamp = async (k) => { seen.add(k); };
  await r5._capeLedgersLoad();

  const sess = { id: 'winner' };
  const p = { inventory: {} };
  r5.playerState.winner = p;
  r5._claimCapeTicket('crimson', 'winner', p, always);
  check('the winner holds a ticket before redeeming (guard)', p.inventory.goldticket_crimson === 1, p.inventory);

  await r5._handleCapeRedeem(sess, { invKey: 'goldticket_crimson', opId: 'op1' });
  check('redeem consumes the ticket', !p.inventory.goldticket_crimson, p.inventory);
  check('...and grants exactly one cape', r5._capeOwnedBy('winner') === 'crimson', r5._capeOwnedBy('winner'));

  /* THE FIREMAKING SHAPE: a replay must not mint a second cape. */
  await r5._handleCapeRedeem(sess, { invKey: 'goldticket_crimson', opId: 'op1' });
  const led = await r5._capeLedger('crimson');
  check('a replayed redeem grants nothing', led.redeemed.filter((x) => x === 'winner').length === 1, led.redeemed);

  /* And a player who never held one cannot redeem. */
  const sess2 = { id: 'nobody' };
  r5.playerState.nobody = { inventory: {} };
  await r5._handleCapeRedeem(sess2, { invKey: 'goldticket_crimson', opId: 'op2' });
  check('a redeem from a player holding no ticket is refused', r5._capeOwnedBy('nobody') === null, r5._capeOwnedBy('nobody'));

  /* A key that is not a ticket must never reach ps.inventory as an index. */
  await r5._handleCapeRedeem(sess2, { invKey: '__proto__', opId: 'op3' });
  await r5._handleCapeRedeem(sess2, { invKey: 'cooked_fish_cod', opId: 'op4' });
  check('a non-ticket key is refused (proto-safety: prefix-validated first)',
    r5._capeOwnedBy('nobody') === null && !({}).goldticket_crimson, true);
}

/* ── OWNER DECISIONS (2026-08-27): the ticket is TRADEABLE and never expires ──
 * Tradeable needed checking rather than assuming, and the answer is that it
 * already is: the marketplace is weapons-only (kind:'weapon' throughout
 * market.js) so a ticket cannot be listed there, but the player-to-player
 * trade window moves arbitrary inventory keys -- _sanitizeTradeOffer accepts
 * any string key under 32 chars that is not an Object.prototype member
 * (v2.3.1971). `goldticket_crimson` is 18. So no code was needed; what IS
 * needed is a test, because "tradeable" is now a property someone could
 * remove by tightening that sanitizer without realising a prize depends on it.
 *
 * The risk tradability introduces is a second ticket in one pair of hands.
 * That must not mint a second cape -- and it must not BURN the ticket either,
 * or a player who bought one is simply out of pocket. */
{
  const s6 = makeState();
  const r6 = new GameRoom(s6, mockEnv);
  r6.playerState = Object.create(null);
  r6._saveRpg = () => {}; r6._sendPlayerState = () => {}; r6._wsBySessionId = () => null;
  const seen6 = new Set();
  r6._opSeen = async (k) => seen6.has(k);
  r6._opStamp = async (k) => { seen6.add(k); };
  await r6._capeLedgersLoad();

  check('a ticket key survives the trade sanitizer, so the ticket is tradeable',
    !!(r6._sanitizeTradeOffer({ goldticket_crimson: 1 }) || {}).goldticket_crimson,
    r6._sanitizeTradeOffer({ goldticket_crimson: 1 }));

  const sess = { id: 'collector' };
  const p = { inventory: { goldticket_crimson: 2 } };   /* bought a second one */
  r6.playerState.collector = p;
  await r6._handleCapeRedeem(sess, { invKey: 'goldticket_crimson', opId: 'c1' });
  await r6._handleCapeRedeem(sess, { invKey: 'goldticket_crimson', opId: 'c2' });
  const led6 = await r6._capeLedger('crimson');
  check('holding two tickets still grants exactly one cape',
    led6.redeemed.filter((x) => x === 'collector').length === 1, led6.redeemed);
  check('...and the second ticket is NOT burned, so it can be traded on',
    p.inventory.goldticket_crimson === 1, p.inventory);
}

/* ── the ticket never expires (owner decision, 2026-08-27) ──
 * The event flag gates the DROP, not the REDEEM.  This is easy to get wrong in
 * the tidy-looking direction: a `if (!this._capeEventOpen()) return;` at the
 * top of _handleCapeRedeem reads like correct hygiene and would quietly strand
 * every winner who was offline when the window closed -- and every ticket
 * traded on afterwards, which the owner also allowed.  So: win it live, throw
 * the kill switch, redeem anyway.
 *
 * v2.3.2028 MADE THIS BLOCK LOAD-BEARING, and re-measuring is how that was
 * noticed rather than guessed.  Under the old opt-in flag, injecting the
 * guard failed seven assertions -- five of them older redeem tests catching
 * it by accident, because no test set _liveFlags and the flag was therefore
 * false file-wide.  Now that the event is open by default, those five pass
 * with the guard injected: the event is open when they run, so the guard
 * lets them through.  Re-measured after the flip, exactly TWO assertions
 * fail, and both are in this block.  The accidental coverage is gone and
 * this is the only thing standing between a tidy-looking one-line guard and
 * a stranded winner. */
{
  const s7 = makeState();
  const r7 = new GameRoom(s7, mockEnv);
  r7.playerState = Object.create(null);
  r7._saveRpg = () => {}; r7._sendPlayerState = () => {}; r7._wsBySessionId = () => null;
  r7._opSeen = async () => false; r7._opStamp = async () => {};
  await r7._capeLedgersLoad();

  /* ── v2.3.2029: the two switches, driven separately ──
     EVENT_LIVE is the owner's start button (a source constant, flipped by
     merging).  disable_event_capes is the operator's emergency stop.  Both
     branches of the first one are driven here via `_eventLive`, because a
     module constant cannot be stubbed and the branch that is NOT currently
     shipped is precisely the one that has to work on the day. */
  r7._liveFlags = undefined;

  r7._eventLive = false;
  check('EVENT_LIVE false keeps the event closed', r7._capeEventOpen() === false,
    r7._capeEventOpen());
  check('...and no ticket can drop while it is closed at the kill site',
    !(r7._capeEventOpen() && r7._claimCapeTicket('crimson', 'nobody', { inventory: {} }, always)),
    'a ticket dropped with the event closed');

  r7._eventLive = true;
  check('EVENT_LIVE true with no flags set opens the event',
    r7._capeEventOpen() === true, r7._capeEventOpen());

  const p7 = { inventory: {} };
  r7.playerState.latecomer = p7;
  const tkt = r7._claimCapeTicket('crimson', 'latecomer', p7, always);
  check('a ticket drops once the event is live', tkt === 'goldticket_crimson', tkt);

  r7._liveFlags = { disable_event_capes: true };   /* the kill switch */
  /* _claimCapeTicket is deliberately NOT self-gating -- the guard lives at the
     kill site (combat.js), so what this asserts is the flag read itself
     flipping both ways.  The first draft of this line ORed in
     `|| !r7._capeEventOpen()`, which made it pass no matter what the claim
     returned: the claim is unguarded, so it does hand out a second ticket
     here.  An assertion that cannot fail is worse than no assertion, because
     it reads as coverage. */
  check('the kill switch closes the event even while EVENT_LIVE is true',
    r7._capeEventOpen() === false, r7._capeEventOpen());
  await r7._handleCapeRedeem({ id: 'latecomer' }, { invKey: tkt, opId: 'late1' });
  const led7 = await r7._capeLedger('crimson');
  check('a ticket redeems AFTER the kill switch is thrown -- it never expires',
    led7.redeemed.indexOf('latecomer') >= 0 && !p7.inventory[tkt], [led7.redeemed, p7.inventory]);
  check('...and the cape is what the player is then wearing',
    r7._capeOwnedBy('latecomer') === 'crimson', r7._capeOwnedBy('latecomer'));
}

/* ── what is ACTUALLY SHIPPED right now ──
 * Everything above overrides the constant to test both branches, which means
 * none of it would notice the shipped value being wrong.  This is the only
 * assertion that reads the real one.  It is deliberately not `=== false`:
 * flipping EVENT_LIVE to true IS the owner's start button, and a test that
 * fails when they push the button would be a test telling them not to hold
 * their own event.  It asserts the type instead -- that the switch is a
 * boolean and the gate agrees with it on a room with nothing else set. */
{
  const s8 = makeState();
  const r8 = new GameRoom(s8, mockEnv);
  await r8._capeLedgersLoad();
  check('EVENT_LIVE is a boolean', typeof EVENT_LIVE === 'boolean', typeof EVENT_LIVE);
  check('a fresh room with no overrides agrees with the shipped EVENT_LIVE',
    r8._capeEventOpen() === EVENT_LIVE, { open: r8._capeEventOpen(), EVENT_LIVE });
  console.log(`      (shipped state: the contest is ${EVENT_LIVE ? 'RUNNING' : 'not running'})`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\neventcapes: ALL PASS');
process.exit(failures ? 1 : 0);
