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

console.log(failures ? `\n${failures} FAILURE(S)` : '\neventcapes: ALL PASS');
process.exit(failures ? 1 : 0);
