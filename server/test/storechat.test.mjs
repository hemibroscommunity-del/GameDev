/* Store-chat suite (v2.3.2621, storechat.js).  Per-listing message threads in
 * the auction house.  Checks:
 *   1. caps.storeChat advertised; all three emitted types PRIVILEGED.
 *   2. Open: a buyer opening a live listing gets the item header, the price
 *      and the listing's own expiry; a listing that has ended answers `gone`.
 *   3. Send: a buyer's line is stored, echoed to them, and delivered to the
 *      seller with a SERVER-STAMPED sender; the seller can reply into it.
 *   4. The mockup shows one thread; a seller has N.  Two buyers on one
 *      listing make two conversations; a buyer sees ONLY their own, the
 *      seller sees both.
 *   5. A seller cannot open a conversation with somebody who never asked,
 *      and cannot reply into a thread that does not exist.
 *   6. Bounds, all server-side: TEXT_MAX clamped BEFORE trim so padding
 *      cannot smuggle a tail, control chars stripped, empty/non-string
 *      dropped, MSGS_MAX per thread (oldest dropped), THREADS_MAX per
 *      listing.
 *   7. Rate limit: an explicit router case never reaches the default
 *      branch's relay bucket, so this module carries its own.
 *   8. Proto safety: '__proto__' as a listing id or a buyer id is inert.
 *   9. Lifecycle: the thread is deleted when the listing SELLS and when it
 *      EXPIRES -- the two ends a conversation can have.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { STORE_CHAT } from '../src/storechat.js';

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
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const ofType = (ws, t) => ws.sent.filter((m) => m.type === t);
const lastOf = (ws, t) => { const r = ofType(ws, t); return r[r.length - 1] && r[r.length - 1].payload; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
/* The router dispatches these two cases WITHOUT awaiting them -- they are
   async and fire-and-forget, which is correct in production (rule 10: output
   gates hold outbound messages until prior writes commit) and useless in a
   test, where the assertion would run before the handler had touched storage.
   So every command here is followed by a real macrotask turn. */
const flush = () => new Promise((r) => setTimeout(r, 0));
const cmd = async (ws, type, payload) => {
  await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));
  await flush(); await flush();
};
const P = (n) => 'bp_sc_' + n;

const S = fakeWs('seller'); const B1 = fakeWs('buyer1'); const B2 = fakeWs('buyer2');
await join(S, P('sell'), 'Marvin');
await join(B1, P('b1'), 'Lyria');
await join(B2, P('b2'), 'Bram');

// -- 1. caps + privilege --
const sync0 = S.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.storeChat', sync0 && sync0.caps && sync0.caps.storeChat === true, sync0 && sync0.caps && Object.keys(sync0.caps).length);
for (const t of ['store_dm', 'store_dm_thread', 'store_dm_error']) {
  check(t + ' is PRIVILEGED (a client cannot forge it)', PRIVILEGED_EVENTS.has(t));
}

const sellPs = room.playerState[P('sell')];
sellPs.inventory = { slime_gel: 30 };
sellPs.coins = 100;
await room._stEnsureIndex();
const made = await room._stCreateListing({ playerId: P('sell'), kind: 'item', invKey: 'slime_gel', qty: 1, price: 500 });
check('a listing exists to talk about', made.ok === true, made);
const LID = made.listing.id;

// -- 2. open --
B1.sent.length = 0;
await cmd(B1, 'store_dm_open', { listingId: LID });
const th0 = lastOf(B1, 'store_dm_thread');
check('open answers with the item header the mockup draws',
  th0 && th0.listingId === LID && th0.askPrice === 500 && typeof th0.expiresAt === 'number' && th0.sellerName === 'Marvin', th0);
check('...and marks the reader as not the seller', th0 && th0.amSeller === false, th0 && th0.amSeller);
check('...with no conversation yet', th0 && th0.threads.length === 0, th0 && th0.threads);
B1.sent.length = 0;
await cmd(B1, 'store_dm_open', { listingId: 'no-such-listing' });
check('opening a listing that has ended answers gone', (lastOf(B1, 'store_dm_thread') || {}).gone === true, lastOf(B1, 'store_dm_thread'));

// -- 3. send + reply --
S.sent.length = 0; B1.sent.length = 0;
await cmd(B1, 'store_dm', { listingId: LID, text: 'Still available?', from: 'FORGED', fromName: 'FORGED' });
const toSeller = lastOf(S, 'store_dm');
check('the seller receives the line', !!toSeller && toSeller.msg.text === 'Still available?', toSeller);
check('...with the sender stamped by the SERVER, not by the payload',
  toSeller && toSeller.msg.from === P('b1') && toSeller.msg.fromName === 'Lyria', toSeller && toSeller.msg);
check('...echoed to the sender too', ((lastOf(B1, 'store_dm') || {}).msg || {}).text === 'Still available?');
const stored1 = await state.storage.get('store_thread:' + LID);
check('...and stored under the BUYER, on the listing',
  !!stored1 && Array.isArray(stored1.t[P('b1')]) && stored1.t[P('b1')].length === 1, stored1 && Object.keys(stored1.t || {}));

B1.sent.length = 0;
await cmd(S, 'store_dm', { listingId: LID, to: P('b1'), text: 'Maybe - if nobody buys soon.' });
check('the seller can reply into that conversation',
  ((lastOf(B1, 'store_dm') || {}).msg || {}).from === P('sell'), lastOf(B1, 'store_dm'));

// -- 4. one thread in the mockup, N in reality --
await cmd(B2, 'store_dm', { listingId: LID, text: 'Would you take less?' });
B1.sent.length = 0; S.sent.length = 0;
await cmd(B1, 'store_dm_open', { listingId: LID });
const b1View = lastOf(B1, 'store_dm_thread');
check('a buyer sees ONLY their own conversation',
  b1View && b1View.threads.length === 1 && b1View.threads[0].buyerId === P('b1'), b1View && b1View.threads.map((t) => t.buyerId));
await cmd(S, 'store_dm_open', { listingId: LID });
const sView = lastOf(S, 'store_dm_thread');
check('the seller sees every conversation on their listing',
  sView && sView.amSeller === true && sView.threads.length === 2, sView && sView.threads.map((t) => t.buyerId));

// -- 5. a seller cannot start one --
S.sent.length = 0;
await cmd(S, 'store_dm', { listingId: LID, to: P('nobody'), text: 'psst' });
check('a seller cannot open a thread with somebody who never asked',
  (lastOf(S, 'store_dm_error') || {}).reason === 'no-thread', lastOf(S, 'store_dm_error'));
check('...and nothing was stored for them', !((await state.storage.get('store_thread:' + LID)).t[P('nobody')]));
S.sent.length = 0;
await cmd(S, 'store_dm', { listingId: LID, text: 'no target' });
check('a seller reply naming no conversation is refused', (lastOf(S, 'store_dm_error') || {}).reason === 'no-thread');

// -- 6. bounds --
room._scBuckets = null;
const TAIL = 'x'.repeat(50) + ' '.repeat(400) + 'TAIL';
await cmd(B1, 'store_dm', { listingId: LID, text: TAIL });
let doc = await state.storage.get('store_thread:' + LID);
let mine = doc.t[P('b1')];
check('text is clamped to TEXT_MAX BEFORE trim (padding cannot smuggle a tail)',
  mine[mine.length - 1].x.length <= STORE_CHAT.TEXT_MAX && !/TAIL/.test(mine[mine.length - 1].x),
  mine[mine.length - 1].x.length);
room._scBuckets = null;
const CTRL = 'a' + String.fromCharCode(7) + 'b' + String.fromCharCode(0) + 'c';
await cmd(B1, 'store_dm', { listingId: LID, text: CTRL });
doc = await state.storage.get('store_thread:' + LID);
mine = doc.t[P('b1')];
check('control characters are stripped', mine[mine.length - 1].x === 'a b c', mine[mine.length - 1].x);
const beforeEmpty = mine.length;
room._scBuckets = null;
await cmd(B1, 'store_dm', { listingId: LID, text: '   ' });
await cmd(B1, 'store_dm', { listingId: LID, text: 42 });
doc = await state.storage.get('store_thread:' + LID);
check('empty and non-string lines are dropped', doc.t[P('b1')].length === beforeEmpty,
  { before: beforeEmpty, after: doc.t[P('b1')].length });

for (let i = 0; i < STORE_CHAT.MSGS_MAX + 6; i++) {
  room._scBuckets = null;
  // eslint-disable-next-line no-await-in-loop
  await cmd(B1, 'store_dm', { listingId: LID, text: 'line ' + i });
}
doc = await state.storage.get('store_thread:' + LID);
check('a conversation is capped at MSGS_MAX', doc.t[P('b1')].length === STORE_CHAT.MSGS_MAX, doc.t[P('b1')].length);
check('...keeping the NEWEST lines',
  doc.t[P('b1')][doc.t[P('b1')].length - 1].x === 'line ' + (STORE_CHAT.MSGS_MAX + 5));

for (let i = 0; i < STORE_CHAT.THREADS_MAX + 2; i++) {
  const w = fakeWs('extra' + i);
  // eslint-disable-next-line no-await-in-loop
  await join(w, P('x' + i), 'X' + i);
  room._scBuckets = null;
  // eslint-disable-next-line no-await-in-loop
  await cmd(w, 'store_dm', { listingId: LID, text: 'hello' });
}
doc = await state.storage.get('store_thread:' + LID);
check('a listing holds at most THREADS_MAX conversations',
  Object.keys(doc.t).length === STORE_CHAT.THREADS_MAX, Object.keys(doc.t).length);

// -- 7. rate limit --
room._scBuckets = null;
const rlWs = fakeWs('rl');
await join(rlWs, P('rl'), 'Rush');
let refused = 0;
for (let i = 0; i < STORE_CHAT.BURST + 4; i++) {
  rlWs.sent.length = 0;
  // eslint-disable-next-line no-await-in-loop
  await cmd(rlWs, 'store_dm', { listingId: LID, text: 'spam ' + i });
  if ((lastOf(rlWs, 'store_dm_error') || {}).reason === 'too-fast') refused++;
}
check('the module carries its own rate limit (an explicit case never reaches the relay bucket)', refused > 0, { refused });

// -- 8. proto safety --
room._scBuckets = null;
await cmd(B1, 'store_dm', { listingId: '__proto__', text: 'hi' });
check("'__proto__' as a listing id is inert",
  !state._store.has('store_thread:__proto__') && ({}).x === undefined);
room._scBuckets = null;
S.sent.length = 0;
await cmd(S, 'store_dm', { listingId: LID, to: '__proto__', text: 'hi' });
check("'__proto__' as a buyer id is inert", (lastOf(S, 'store_dm_error') || {}).reason === 'no-thread');

// -- 9. lifecycle --
check('the thread exists while the listing does', state._store.has('store_thread:' + LID));
room.playerState[P('b2')].coins = 5000;
const bought = await room._stBuyNow(LID, P('b2'));
check('the listing sells', bought.ok === true, bought);
check('...and its conversations are deleted with it', !state._store.has('store_thread:' + LID));
check('...leaving no listing record either', !state._store.has('store_listing:' + LID));

room._scBuckets = null;
const made2 = await room._stCreateListing({ playerId: P('sell'), kind: 'item', invKey: 'slime_gel', qty: 1, price: 30 });
await cmd(B1, 'store_dm', { listingId: made2.listing.id, text: 'about this one' });
check('a second listing has its own thread', state._store.has('store_thread:' + made2.listing.id));
room._stIndex.get(made2.listing.id).expiresAt = Date.now() - 1;
room._stLastSweep = 0;
await room._stSweep();
check('an EXPIRED listing takes its conversations with it', !state._store.has('store_thread:' + made2.listing.id));

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
