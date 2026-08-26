/* Server-settled trades test (v2.3.1119, PR4 of the heavy-systems plan).
 * The old flow duplicated goods on both sides (recipient minted the
 * offer, sender's accept-echo handler minted it again, nobody debited).
 * Checks:
 *   1. offer -> accept transfers gold + items sender->recipient exactly
 *      once: sender debited, recipient credited, relay annotated
 *      settled:true.
 *   2. Replayed accept finds no pending offer and is dropped (no
 *      rebroadcast, no second transfer).
 *   3. Forged accept (no offer ever made) is dropped.
 *   4. Validate-at-commit: sender spends the goods between offer and
 *      accept -> trade_reject to the accepter, no transfer.
 *   5. Expired offer (past TTL) is not settleable.
 *   6. Offer sanitization: negative/absurd quantities clamped, empty
 *      offers dropped.
 *   7. Sender disconnect before accept -> reject, no crash.
 */
import { GameRoom } from '../src/index.js';
import { TRADE_OFFER_TTL } from '../src/trade.js'; // v2.3.1622 (§9 sweep)

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

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  // v2.3.1149: pre-settle today's daily login reward -- this suite
  // asserts EXACT join-time coins / inbox_delivered arithmetic, and the
  // cadence reward (+25g via its own inbox_delivered) would skew it.
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const offerMsg = (offer, target, fromName) => ({ type: 'trade_offer', payload: { target, fromName: fromName || 'Sender', offer } });
const acceptMsg = (target) => ({ type: 'trade_accept', payload: { target } });

const wsA = fakeWs('sender'); const wsB = fakeWs('recipient');
await join(wsA, 'bp_tr_sender');
await join(wsB, 'bp_tr_recipient');
const sender = room.playerState['bp_tr_sender'];
const recipient = room.playerState['bp_tr_recipient'];
sender.coins = 200; sender.inventory = { wood: 10, fish: 3 };
recipient.coins = 0; recipient.inventory = {};

// ── 1. happy path: exact single transfer, settled flag ──
const o1 = await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 4, _gold: 50 }, 'bp_tr_recipient'));
check('offer relays with sanitized shape', o1 && o1.payload.offer.wood === 4 && o1.payload.offer._gold === 50, o1 && o1.payload);
const a1 = await room._interceptTrade('bp_tr_recipient', acceptMsg('bp_tr_sender'));
check('accept relays annotated settled:true', a1 && a1.payload.settled === true, a1 && a1.payload);
check('sender debited exactly the offer', sender.coins === 150 && sender.inventory.wood === 6, { coins: sender.coins, inv: sender.inventory });
check('recipient credited exactly the offer', recipient.coins === 50 && recipient.inventory.wood === 4, { coins: recipient.coins, inv: recipient.inventory });

// ── 2. replayed accept: dropped, no double transfer ──
const a1replay = await room._interceptTrade('bp_tr_recipient', acceptMsg('bp_tr_sender'));
check('replayed accept dropped', a1replay === null && sender.coins === 150 && recipient.coins === 50, { a1replay, s: sender.coins, r: recipient.coins });

// ── 3. forged accept with no offer ──
const forged = await room._interceptTrade('bp_tr_recipient', acceptMsg('bp_tr_sender'));
check('forged accept (no offer) dropped', forged === null);

// ── 4. validate-at-commit: goods spent after offering ──
await room._interceptTrade('bp_tr_sender', offerMsg({ fish: 3 }, 'bp_tr_recipient'));
sender.inventory.fish = 1; // sender "spent" 2 fish after offering
room.eventBuffer.length = 0;
const a2 = await room._interceptTrade('bp_tr_recipient', acceptMsg('bp_tr_sender'));
const rejects = room.eventBuffer.filter((e) => e.type === 'trade_reject' && e.payload.target === 'bp_tr_recipient');
check('spent-goods accept rejected, not settled', a2 === null && rejects.length === 1, { a2, rejects });
check('failed trade transfers nothing', sender.inventory.fish === 1 && !recipient.inventory.fish, { s: sender.inventory, r: recipient.inventory });

// ── 5. expired offer ──
await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 1 }, 'bp_tr_recipient'));
room._pendingTradeOffers.get('bp_tr_sender>bp_tr_recipient').ts = Date.now() - 999999;
const aExp = await room._interceptTrade('bp_tr_recipient', acceptMsg('bp_tr_sender'));
check('expired offer not settleable', aExp === null && sender.inventory.wood === 6, { aExp, wood: sender.inventory.wood });

// ── 6. sanitization ──
const bad = await room._interceptTrade('bp_tr_sender', offerMsg({ wood: -5, hack: 99999999, _gold: -10 }, 'bp_tr_recipient'));
check('negative quantities stripped, absurd clamped', bad && !bad.payload.offer.wood && bad.payload.offer.hack === 9999 && !bad.payload.offer._gold, bad && bad.payload.offer);
room._pendingTradeOffers.clear();
const empty = await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 0 }, 'bp_tr_recipient'));
check('empty offer dropped', empty === null);

// ── 7. sender gone before accept ──
await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 2 }, 'bp_tr_recipient'));
delete room.playerState['bp_tr_sender'];
room.eventBuffer.length = 0;
const aGone = await room._interceptTrade('bp_tr_recipient', acceptMsg('bp_tr_sender'));
check('sender-left accept rejects cleanly', aGone === null && room.eventBuffer.some((e) => e.type === 'trade_reject'), { aGone, buf: room.eventBuffer.map((e) => e.type) });

// ── 8. integration: the full webSocketMessage relay path ──
const wsC = fakeWs('c'); const wsD = fakeWs('d');
await join(wsC, 'bp_tr_carol');
await join(wsD, 'bp_tr_dave');
room.playerState['bp_tr_carol'].coins = 30;
room.eventBuffer.length = 0;
await room.webSocketMessage(wsC, JSON.stringify({ type: 'trade_offer', payload: { target: 'bp_tr_dave', fromName: 'Carol', offer: { _gold: 30 } } }));
await room.webSocketMessage(wsD, JSON.stringify({ type: 'trade_accept', payload: { target: 'bp_tr_carol' } }));
const relayed = room.eventBuffer.filter((e) => e.type === 'trade_accept');
check('relay path settles and annotates', relayed.length === 1 && relayed[0].payload.settled === true
  && room.playerState['bp_tr_carol'].coins === 0 && room.playerState['bp_tr_dave'].coins === 30,
  { relayed: relayed.length, c: room.playerState['bp_tr_carol'].coins, d: room.playerState['bp_tr_dave'].coins });

// ── 9. v2.3.1622: pending offers expire, and the key is bounded ──
//
// TRADE_OFFER_TTL was only ever read to REJECT a late accept — nothing
// deleted the entry, so the only exit from this map was a matching
// trade_accept.  An offer nobody answers stayed resident for the life of
// the DO, keyed by a client-supplied string of unbounded length.
{
  room._pendingTradeOffers = new Map();
  room.playerState['bp_tr_sender'] = room.playerState['bp_tr_sender']
    || { coins: 0, inventory: {}, z: 'town' };

  await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 1 }, 'bp_tr_fresh'));
  await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 1 }, 'bp_tr_stale'));
  check('offer sweep: both offers recorded', room._pendingTradeOffers.size === 2,
    room._pendingTradeOffers.size);

  // Age one past the TTL, leave the other fresh.
  room._pendingTradeOffers.get('bp_tr_sender>bp_tr_stale').ts = Date.now() - TRADE_OFFER_TTL - 1;
  room._tickTradeOffers(Date.now());
  check('offer sweep: the expired offer is evicted',
    !room._pendingTradeOffers.has('bp_tr_sender>bp_tr_stale'),
    [...room._pendingTradeOffers.keys()]);
  check('offer sweep: a live offer survives the sweep',
    room._pendingTradeOffers.has('bp_tr_sender>bp_tr_fresh'),
    [...room._pendingTradeOffers.keys()]);

  // The sweep is ADDITIVE — the single-shot delete is what makes a
  // replayed accept find nothing, and it must still be the thing doing
  // that job.
  room.playerState['bp_tr_fresh'] = { coins: 0, inventory: {}, z: 'town' };
  room.playerState['bp_tr_sender'].inventory = { wood: 5 };
  await room._interceptTrade('bp_tr_fresh', acceptMsg('bp_tr_sender'));
  check('offer sweep: accept still single-shot (entry consumed, not left to the sweep)',
    !room._pendingTradeOffers.has('bp_tr_sender>bp_tr_fresh'),
    [...room._pendingTradeOffers.keys()]);

  // An unbounded key is the DoS: 16 KB (the inbound frame cap) per
  // offer, minted as fast as the relay bucket allows, is a walk to the
  // 128 MB DO ceiling.
  const before = room._pendingTradeOffers.size;
  const huge = 'x'.repeat(5000);
  const rejected = await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 1 }, huge));
  check('offer sweep: an oversized target is refused outright',
    rejected === null && room._pendingTradeOffers.size === before,
    { rejected, size: room._pendingTradeOffers.size, before });

  // A 64-char id is still fine — the cap must not break real ids.
  const ok = await room._interceptTrade('bp_tr_sender', offerMsg({ wood: 1 }, 'b'.repeat(64)));
  check('offer sweep: a 64-char target is still accepted', ok !== null, ok);
}

/* ═══ v2.3.1971: AN Object.prototype NAME IS NOT AN ITEM ═══
   The ownership gate was `(inv[k] || 0) < v`.  For k = 'constructor' the
   lookup returns an inherited FUNCTION -- truthy, so `||` never fires --
   and `Object < 7` is a NaN comparison, i.e. FALSE, i.e. a pass.  The
   giver was then debited `inv.constructor -= 7` (NaN, saved as null) and
   the taker credited `Object + 7` (a STRING in a count field).  Nothing
   of value duplicates -- no real item is named `toString` -- but it
   writes junk into a stranger's persisted character every time they
   accept, and a shadowed `hasOwnProperty` is a crash waiting for a bag
   render.  Measured on the live trade2 path before the fix; pinned here
   too because both lanes share `_sanitizeTradeOffer`. */
{
  room.playerState['bp_tr_sender'] = { coins: 100, inventory: { wood: 3 }, z: 'town' };
  room.playerState['bp_tr_recipient'] = { coins: 0, inventory: {}, z: 'town' };
  const s2 = room.playerState['bp_tr_sender'], r2 = room.playerState['bp_tr_recipient'];

  const protoOffer = room._sanitizeTradeOffer({
    constructor: 7, toString: 3, hasOwnProperty: 2, valueOf: 1, __proto__: 5, wood: 1,
  });
  check('sanitizer drops every Object.prototype key, keeps the real item',
    protoOffer && Object.keys(protoOffer).join(',') === 'wood' && protoOffer.wood === 1, protoOffer);
  check('...and an offer of NOTHING BUT prototype keys is dropped entirely',
    room._sanitizeTradeOffer({ constructor: 9, toString: 4 }) === null);

  await room._interceptTrade('bp_tr_sender', offerMsg({ constructor: 7, wood: 1 }, 'bp_tr_recipient'));
  await room._interceptTrade('bp_tr_recipient', acceptMsg('bp_tr_sender'));
  check('a settled trade leaves NO prototype key on the giver',
    Object.keys(s2.inventory).join(',') === 'wood' && s2.inventory.wood === 2,
    s2.inventory);
  check('...and none on the taker, who gets only the real item',
    Object.keys(r2.inventory).join(',') === 'wood' && r2.inventory.wood === 1,
    r2.inventory);
  check('...with no NaN and no string left in either count field',
    typeof s2.inventory.wood === 'number' && typeof r2.inventory.wood === 'number'
      && !Number.isNaN(s2.inventory.wood) && !Number.isNaN(r2.inventory.wood));

  /* Second gate: even if a crafted key somehow reached the settlement
     site, the ownership check must now REFUSE it rather than debit NaN. */
  check('_invCount reports 0 for an inherited key, not the function',
    room._invCount(s2, 'constructor') === 0 && room._invCount(s2, 'toString') === 0);
  check('_invCount heals a count that is already junk to 0',
    room._invCount({ inventory: { wood: 'function Object() {}4' } }, 'wood') === 0);
  check('_invCount still reads a real count', room._invCount(s2, 'wood') === 2);

  /* The key cap was a `break`, so an offer whose 21st key came before
     `_gold` in insertion order silently dropped the GOLD leg.  A player
     staging a wide bag plus coins lost the coins from the offer. */
  const wide = {};
  for (let i = 0; i < 30; i++) wide['itm' + i] = 2;
  wide._gold = 40;
  const capped = room._sanitizeTradeOffer(wide);
  const itemKeys = Object.keys(capped).filter((k) => k !== '_gold');
  check('the 20-item cap still holds', itemKeys.length === 20, itemKeys.length);
  check('...but gold past the cap is no longer silently dropped', capped._gold === 40, capped._gold);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
