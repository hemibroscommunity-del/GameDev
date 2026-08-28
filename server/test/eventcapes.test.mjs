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
import { EVENT_LIVE, EVENT_START_ID, EVENT_CAPES } from '../src/eventcapes.js';

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
  /* v2.3.2102: read the cap from the table rather than repeating the number.
     It went 3 -> 10 when the owner widened the contest, and a test carrying
     its own copy of a constant asserts that someone remembered to edit two
     places -- not that the cap holds. Rolls well past it either way. */
  const CAP = EVENT_CAPES.crimson.cap;
  const got = [];
  for (let i = 0; i < CAP + 9; i++) {
    const id = 'p' + i;
    ps(id);
    const t = room._claimCapeTicket('crimson', id, room.playerState[id], always);
    if (t) got.push(id);
  }
  check(`exactly ${CAP} tickets exist, however many players roll`,
    got.length === CAP, { issued: got.length, cap: CAP });
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
  check(`twenty-five simultaneous claims still yield exactly ${EVENT_CAPES.crimson.cap}`,
    winners.length === EVENT_CAPES.crimson.cap, { winners: winners.length, cap: EVENT_CAPES.crimson.cap });
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

/* ── v2.3.2034: the ledger is readable, and resettable on purpose ──
 * Added because the owner asked "did testing eat one of the three?" and the
 * honest answer was "no, and you had no way to check" -- the ledger decides
 * who won and nothing could read it.  The reset exists for one situation
 * (clearing an accidental issuance BEFORE a contest starts) and voids real
 * tickets, so the guards on it are the point, not ceremony. */
{
  const s9 = makeState();
  const r9 = new GameRoom(s9, mockEnv);
  r9.playerState = Object.create(null);
  r9._saveRpg = () => {}; r9._sendPlayerState = () => {}; r9._wsBySessionId = () => null;
  r9._opSeen = async () => false; r9._opStamp = async () => {};
  r9._adminLog = async () => {};
  await r9._capeLedgersLoad();
  const J = (o, st) => ({ status: st || 200, body: o });
  const U = (q) => new URL('https://x/api/admin/capes' + (q || ''));

  check('a path it does not own returns null, so the router falls through',
    (await r9._capeAdminRoute({ method: 'GET' }, U(), '/economy', J)) === null);

  r9._eventLive = true;
  const p9 = { inventory: {} };
  r9.playerState.winner = p9;
  r9._claimCapeTicket('crimson', 'winner', p9, always);
  const read = await r9._capeAdminRoute({ method: 'GET' }, U(), '/capes', J);
  check('the ledger reads back who holds a ticket',
    read.body.capes.crimson.issued.indexOf('winner') >= 0, read.body.capes);
  check('...and how many are left, which is the number the owner actually wants',
    read.body.capes.crimson.remaining === EVENT_CAPES.crimson.cap - 1,
    read.body.capes.crimson);
  check('...and whether the contest is running right now',
    read.body.live === true, read.body.live);

  const noName = await r9._capeAdminRoute({ method: 'DELETE' }, U('?confirm=yes'), '/capes', J);
  check('a reset without naming a real cape is refused', noName.status === 400, noName.body);
  /* EVENT_CAPES is a plain object literal, so EVENT_CAPES['__proto__'] is
     Object.prototype and TRUTHY: the obvious `!EVENT_CAPES[capeId]` guard
     waves this through.  Same shape as the three incidents on 2026-07-07. */
  const proto = await r9._capeAdminRoute({ method: 'DELETE' },
    U('?cape=__proto__&confirm=yes'), '/capes', J);
  check('a reset for `__proto__` is refused (it is not a cape, however truthy)',
    proto.status === 400, proto.body);
  const noConf = await r9._capeAdminRoute({ method: 'DELETE' }, U('?cape=crimson'), '/capes', J);
  check('a reset without confirm=yes is refused — it voids tickets people hold',
    noConf.status === 400, noConf.body);
  const stillThere = await r9._capeAdminRoute({ method: 'GET' }, U(), '/capes', J);
  check('...and neither refusal touched the ledger',
    stillThere.body.capes.crimson.issued.length === 1, stillThere.body.capes.crimson);

  const done = await r9._capeAdminRoute({ method: 'DELETE' }, U('?cape=crimson&confirm=yes'), '/capes', J);
  check('a confirmed reset clears the ledger and reports what it voided',
    done.body.ok === true && done.body.cleared.issued.indexOf('winner') >= 0, done.body);
  const after9 = await r9._capeAdminRoute({ method: 'GET' }, U(), '/capes', J);
  check('...leaving every ticket available again',
    after9.body.capes.crimson.remaining === EVENT_CAPES.crimson.cap
      && after9.body.capes.crimson.issued.length === 0,
    after9.body.capes.crimson);
  check('...and the reset SURVIVES a reload, not just the cache',
    JSON.stringify((await s9.storage.get('capegrant:crimson')) || {}) === JSON.stringify({ issued: [], redeemed: [] }),
    await s9.storage.get('capegrant:crimson'));
}


/* ═══ v2.3.2098: A STALE STOP FROM THE LAST CONTEST DOES NOT VETO THIS ONE ═══
   The owner's demo: 50 kills at 1-in-5 and no ticket. Every code path was
   right; what was wrong was `liveflags` in durable storage, which outlives
   every deploy and which nothing in the source can show you. These pin the
   clear AND its once-ness -- an emergency stop on the CURRENT contest must
   still stick, or the kill switch is not one. */
{
  const sA = makeState();
  const r = new GameRoom(sA, mockEnv);
  r.playerState = Object.create(null);
  r._saveRpg = () => {}; r._sendPlayerState = () => {}; r._wsBySessionId = () => null;
  await sA.storage.put('liveflags', { disable_event_capes: true, event_cape_rate: 0.0001 });
  await r._capeLedgersLoad();
  check('a stale stop from a previous contest is cleared on start',
    r._capeEventOpen() === true, { open: r._capeEventOpen() });
  check('...and a stale rate with it, so the shipped default decides',
    r._flagNum('event_cape_rate', 1 / 5, 0, 1) === 1 / 5,
    { rate: r._flagNum('event_cape_rate', 1 / 5, 0, 1) });
  const persisted = await sA.storage.get('liveflags');
  check('...and the clear is written, not just cached',
    !persisted.disable_event_capes && persisted.event_cape_rate === undefined, persisted);
  check('...and the contest start is recorded so it happens once',
    (await sA.storage.get('cape_start_id')) === EVENT_START_ID,
    await sA.storage.get('cape_start_id'));
}
{
  /* A stop on the contest that is ALREADY started must survive the next join,
     or the emergency stop stops nothing. */
  const sB = makeState();
  const rB = new GameRoom(sB, mockEnv);
  rB.playerState = Object.create(null);
  rB._saveRpg = () => {}; rB._sendPlayerState = () => {}; rB._wsBySessionId = () => null;
  await sB.storage.put('cape_start_id', EVENT_START_ID);
  await sB.storage.put('liveflags', { disable_event_capes: true });
  await rB._capeLedgersLoad();
  /* The join handler awaits _liveFlagsEnsure before any of this (liveops.js),
     so the cache is warm in production. Warm it here too, or `_flagOn` reads
     an unloaded cache and reports every flag off -- which would make this
     assertion pass for the wrong reason on a build that HAD cleared the stop. */
  await rB._liveFlagsEnsure();
  check('a stop on the CURRENT contest is NOT cleared — the kill switch holds',
    rB._capeEventOpen() === false, { open: rB._capeEventOpen() });
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\neventcapes: ALL PASS');
process.exit(failures ? 1 : 0);
