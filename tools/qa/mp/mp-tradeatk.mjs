/* ═══ v2.3.1971: THE TRADE WINDOW, ATTACKED ═══
 *
 * mp-trade drives the happy path through the real buttons.  This one drives
 * the paths a demo crowd finds by accident and a modified client finds on
 * purpose, and it asserts CONSERVATION rather than "the panel said complete":
 * every check reads the worker's own persisted blob for both players
 * (H.adminPlayer -> rpg), because the client's copy of its own bag is a
 * mirror that a bug can make agree with itself.
 *
 * What it covers, and why each one is here:
 *   1. An offer keyed on Object.prototype ('constructor', 'toString', …).
 *      The ownership gate used to be `(inv[k] || 0) < v`, which is a NaN
 *      comparison for an inherited function and therefore a PASS on goods
 *      nobody holds — leaving `inventory.constructor = NaN` in the giver's
 *      saved blob and a STRING count in the taker's.  Driven through a real
 *      client and a real worker so the fix is proved where it ships, not
 *      only in the unit mock.
 *   2. Conservation across a normal swap: coins and items, both players,
 *      before == after.  The one assertion that catches a dupe nobody
 *      predicted.
 *   3. A replayed confirm after the trade already settled.
 *   4. A tab that DIES between the two confirms — the "accept then close the
 *      laptop" case.  Nothing may move and nothing may be eaten.
 *
 * Deliberately NOT covered: the marketplace order book.  It has no entry
 * point in the shipped build (TOWN_PROPS_ENABLED is false, so `nearBuilding`
 * is always null and no building panel opens) — its settlement is pinned in
 * server/test/market.test.mjs instead.
 */
import * as H from './harness.mjs';

/* The worker's own view of a player: coins + the whole inventory map.  Read
   from the admin route rather than the browser, so a client that lies to
   itself cannot make a conservation check pass. */
async function serverBag(wsPort, id) {
  const p = await H.adminPlayer(wsPort, id);
  const live = p.live || {};
  const rpg = p.rpg || {};
  const inv = live.inventory || rpg.inventory || {};
  const coins = typeof live.coins === 'number' ? live.coins : (rpg.coins || 0);
  return { coins, inv: { ...inv } };
}
const invTotal = (inv) => Object.values(inv).reduce((s, n) => s + (Number(n) || 0), 0);

/* Raw send on the live channel.
   MUST be `{type:'broadcast', event, payload}` — that is the ONLY shape the
   channelShim forwards for a trade2 command (wsClient.js: the shim's last
   branch is `msg.type === 'broadcast' && msg.event`, and the seven trade2
   types are in its PRIORITY_EVENTS set).  A `{type:'trade2_set'}` send
   matches no branch at all and is silently DROPPED in the browser — it never
   reaches the worker, and a test written that way asserts against a trade
   that never changed.  Same shape the shipped Trade button uses
   (InspectPlayerPanel.jsx). */
const raw = (P, event, payload) => P.page.evaluate(({ e, p }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.channel) return false;
  S.channel.send({ type: 'broadcast', event: e, payload: p });
  return true;
}, { e: event, p: payload || {} });

const WOOD = 'wood_pine_log';

/* Open a live window between A and B: each opens toward the other, which is
   the mutual-open handshake the Trade button drives. */
async function openWindow(A, B, aId, bId) {
  await raw(A, 'trade2_open', { target: bId });
  await A.page.waitForTimeout(400);
  await raw(B, 'trade2_open', { target: aId });
  await A.page.waitForTimeout(900);
}

/* Ready both sides, wait out the server's 2.5 s anti-swap cooldown, accept
   both.  The cooldown is enforced on the worker (TRADE2.ACCEPT_COOLDOWN_MS),
   so it has to be slept through here rather than clicked past. */
async function readyAndAccept(A, B) {
  await raw(A, 'trade2_ready', { ready: true });
  await raw(B, 'trade2_ready', { ready: true });
  await A.page.waitForTimeout(3200);
  await raw(A, 'trade2_confirm', {});
  await A.page.waitForTimeout(400);
  await raw(B, 'trade2_confirm', {});
  await A.page.waitForTimeout(2500);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Attacker', nameB: 'Mark' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  await H.grant(wsPort, aId, 'gold', { amount: 500 });
  await H.grant(wsPort, aId, 'item', { invKey: WOOD, count: 6 });
  await H.grant(wsPort, bId, 'gold', { amount: 400 });
  await A.page.waitForTimeout(1500);

  const a0 = await serverBag(wsPort, aId), b0 = await serverBag(wsPort, bId);
  rec.ok('both players are seeded on the worker',
    a0.coins >= 500 && b0.coins >= 400 && (a0.inv[WOOD] || 0) === 6, { a0, b0 });

  /* ═══ 1. AN Object.prototype NAME IS NOT AN ITEM ═══
     A stages seven `constructor`, three `toString` and two `hasOwnProperty`
     alongside one real log, then both sides go through the real two-stage
     handshake.  Before the fix this settled: A's saved bag gained
     `constructor: null` (NaN through JSON) and B's gained
     `constructor: "function Object() { [native code] }7"` — a string where a
     count belongs, in a persisted character, on a stranger's account. */
  await openWindow(A, B, aId, bId);
  await raw(A, 'trade2_set', { offer: { constructor: 7, toString: 3, hasOwnProperty: 2, [WOOD]: 1 } });
  await A.page.waitForTimeout(800);

  const staged = await H.readState(A, (S) => (S._trade2 && S._trade2.offers) || null);
  await readyAndAccept(A, B);

  const a1 = await serverBag(wsPort, aId), b1 = await serverBag(wsPort, bId);
  const protoKeys = (inv) => Object.keys(inv)
    .filter((k) => Object.prototype.hasOwnProperty.call(Object.prototype, k));
  rec.ok('a crafted offer puts NO prototype key in the giver\'s saved bag',
    protoKeys(a1.inv).length === 0, { keys: Object.keys(a1.inv), staged });
  rec.ok('...nor in the taker\'s',
    protoKeys(b1.inv).length === 0, { keys: Object.keys(b1.inv) });
  rec.ok('...and every count on both sides is still a finite number',
    [...Object.values(a1.inv), ...Object.values(b1.inv)]
      .every((n) => typeof n === 'number' && Number.isFinite(n)),
    { a: a1.inv, b: b1.inv });
  rec.ok('the one REAL item in that offer still crossed',
    (a1.inv[WOOD] || 0) === (a0.inv[WOOD] || 0) - 1 && (b1.inv[WOOD] || 0) === 1,
    { aWood: a1.inv[WOOD], bWood: b1.inv[WOOD] });
  rec.ok('...and nothing was minted: the two bags still hold six logs between them',
    (a1.inv[WOOD] || 0) + (b1.inv[WOOD] || 0) === 6,
    { a: a1.inv[WOOD], b: b1.inv[WOOD] });

  /* ═══ 2. CONSERVATION ACROSS A NORMAL SWAP ═══
     120 gold one way, two logs the other.  Totals across BOTH players must
     be identical before and after — the assertion that catches a duplication
     nobody thought to look for. */
  const c0 = a1.coins + b1.coins;
  const i0 = invTotal(a1.inv) + invTotal(b1.inv);

  await openWindow(A, B, aId, bId);
  await raw(A, 'trade2_set', { offer: { _gold: 120, [WOOD]: 2 } });
  await B.page.waitForTimeout(600);
  await raw(B, 'trade2_set', { offer: { _gold: 30 } });
  await A.page.waitForTimeout(800);
  await readyAndAccept(A, B);

  const a2 = await serverBag(wsPort, aId), b2 = await serverBag(wsPort, bId);
  rec.ok('the swap actually happened', a2.coins === a1.coins - 120 + 30 && b2.coins === b1.coins + 120 - 30,
    { a1: a1.coins, a2: a2.coins, b1: b1.coins, b2: b2.coins });
  rec.ok('TOTAL COINS across both players are unchanged', a2.coins + b2.coins === c0,
    { before: c0, after: a2.coins + b2.coins });
  rec.ok('TOTAL ITEMS across both players are unchanged',
    invTotal(a2.inv) + invTotal(b2.inv) === i0,
    { before: i0, after: invTotal(a2.inv) + invTotal(b2.inv) });

  /* ═══ 3. A REPLAYED CONFIRM ═══
     The session is deleted synchronously at commit, before any await, so a
     confirm that arrives afterwards must find nothing.  Fired from both
     sides in case only one half was single-shot. */
  await raw(A, 'trade2_confirm', {});
  await raw(B, 'trade2_confirm', {});
  await A.page.waitForTimeout(1500);
  const a3 = await serverBag(wsPort, aId), b3 = await serverBag(wsPort, bId);
  rec.ok('a confirm replayed after settlement moves nothing',
    a3.coins === a2.coins && b3.coins === b2.coins
      && JSON.stringify(a3.inv) === JSON.stringify(a2.inv)
      && JSON.stringify(b3.inv) === JSON.stringify(b2.inv),
    { a2, a3, b2, b3 });

  /* ═══ 4. THE TAB THAT DIES BETWEEN THE TWO CONFIRMS ═══
     A confirms; B's browser context is destroyed before B can.  The commit
     needs both, so nothing may move — and A must not be left short.  This is
     the "accepted and then my phone locked" report, ahead of it happening at
     the demo. */
  await openWindow(A, B, aId, bId);
  await raw(A, 'trade2_set', { offer: { _gold: 75, [WOOD]: 1 } });
  await A.page.waitForTimeout(800);
  await raw(A, 'trade2_ready', { ready: true });
  await raw(B, 'trade2_ready', { ready: true });
  await A.page.waitForTimeout(3200);
  await raw(A, 'trade2_confirm', {});
  await A.page.waitForTimeout(300);
  await B.ctx.close();               // the tab dies mid-handshake
  await A.page.waitForTimeout(4000);

  const a4 = await serverBag(wsPort, aId), b4 = await serverBag(wsPort, bId);
  rec.ok('a half-confirmed trade whose partner vanished moves NOTHING',
    a4.coins === a3.coins && (a4.inv[WOOD] || 0) === (a3.inv[WOOD] || 0),
    { a3, a4 });
  rec.ok('...and the vanished partner is not credited either',
    b4.coins === b3.coins && (b4.inv[WOOD] || 0) === (b3.inv[WOOD] || 0),
    { b3, b4 });
  rec.ok('...leaving the world total exactly where it started this step',
    a4.coins + b4.coins === a3.coins + b3.coins
      && invTotal(a4.inv) + invTotal(b4.inv) === invTotal(a3.inv) + invTotal(b3.inv),
    { coins: [a3.coins + b3.coins, a4.coins + b4.coins] });

  await A.ctx.close();
}
