/* Pet trading -- v2.3.3122 (docs/PET-TRAPPING-PLAN.md Phase 3; spec
 * docs/specs/trapping.md "Trading pets").
 *
 *   1. CAPS: caps.pettrade advertised; the switch.
 *   2. THE GATE (petbook.js _petSellable): another's pet, an old pet, the pet
 *      out with you, a pet within a day of its catch, a locked record -- each
 *      refused with its reason; '__proto__' and junk ids are no pet.
 *   3. THE TRADE WINDOW's pet lane (trade2.js): a refused pet stages nothing;
 *      a staged pet stays in its owner's record (validate-at-commit) and is
 *      shown to both; staging resets both readies; more than TRADE_MAX
 *      refused; the commit moves it -- same id, name, level, one more owner,
 *      both records written -- with petsMoved on the settled state; a SWAP
 *      at full collections works; a full collection, a released pet or the
 *      pet taken out meanwhile cancels the whole trade with nothing moved; a
 *      disconnect cancels and loses nothing.
 *   4. THE AUCTION HOUSE (store.js `kind: 'pet'`): a refused pet lists
 *      nothing; a listed pet leaves the record into the listing (and survives
 *      a wake-time rebuild); its public row shows the pet but not its hidden
 *      fields; a buyer gets it (one more owner) and the seller the gold; a
 *      buyer with a full collection gets it IN THE MAIL, where it waits until
 *      there is room and lands at the next join; a taken-down or expired
 *      listing comes back (no extra owner) -- by mail to an offline seller.
 *   5. THE MAIL (inbox.js `pet`): never destroyed, never twice.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { PETBOOK } from '../src/petbook.js';
import { STORE } from '../src/store.js';

const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;
const tick = (ms) => { clock += ms; };

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        let n = 0;
        for (const k of keys) {
          if (opts && opts.startAfter && k <= opts.startAfter) continue;
          if (opts && opts.limit && n >= opts.limit) break;
          out.set(k, store.get(k)); n++;
        }
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
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const lastOf = (ws, type) => { const r = msgsOfType(ws, type); return r.length ? r[r.length - 1].payload : null; };

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
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));
const P = (n) => 'bp_pt_' + n;
const ws = {};
for (const n of ['a', 'b', 'c']) {
  ws[n] = fakeWs(n);
  await join(ws[n], P(n), n.toUpperCase());
  room.playerState[P(n)].coins = 1000;
  room.playerState[P(n)].inventory = {};
  room.playerState[P(n)].lifeSkills.trapping = { level: 30, xp: 0 };
}
const book = (n) => room._petbookOf(P(n));
const ids = (n) => book(n).rec.list.map((p) => p.id);
const stored = (n) => state._store.get('pets:' + P(n));
/* a pet, as a catch makes one (petbook.js _petbookAddCatch) */
function catchPet(n, home = 'frost', level = 3) {
  const pet = room._petbookAddCatch(P(n), room.playerState[P(n)], { home, level, arch: 'snowman' }, 30, Date.now());
  return pet.id;
}

// ── 1. CAPS ───────────────────────────────────────────────────────────────────
{
  const sync = ws.a.sent.find((m) => m.type === 'state_sync');
  check('caps.pettrade advertised', sync && sync.caps && sync.caps.pettrade === true, sync && sync.caps);
  check('trade2_state is still PRIVILEGED (the pet lane rides it)', PRIVILEGED_EVENTS.has('trade2_state'));
}

// ── 2. THE GATE ───────────────────────────────────────────────────────────────
const a1 = catchPet('a');           /* A's first: out with A */
const a2 = catchPet('a', 'ember', 4);
const a3 = catchPet('a', 'sky', 2);
const b1 = catchPet('b', 'tidal', 5);
{
  check('setup: A has three pets, the first out with A; B one', ids('a').length === 3 && book('a').rec.active === a1 && ids('b').length === 1);
  const now = Date.now();
  check('gate: a pet within a day of its catch is refused (too-new)', room._petSellable(P('a'), a2, now).why === 'too-new');
  tick(PETBOOK.TRADE_HOLD_MS + 1000);
  const t = Date.now();
  check('gate: a day on, it may go', room._petSellable(P('a'), a2, t).ok === true);
  check('gate: the pet out with you may not (active)', room._petSellable(P('a'), a1, t).why === 'active');
  check('gate: another player\'s pet is no pet of yours', room._petSellable(P('a'), b1, t).why === 'no-pet');
  check('gate: junk ids are no pet', ['__proto__', 'constructor', '', null, 42, { id: a2 }].every((x) => room._petSellable(P('a'), x, t).why === 'no-pet'));
  book('a').rec.list.find((p) => p.id === a3).legacy = true;
  check('gate: an old pet moved in from the browser years never goes (legacy)', room._petSellable(P('a'), a3, t).why === 'legacy');
  book('a').rec.list.find((p) => p.id === a3).legacy = false;
  room._liveFlags = { pettrade: false };
  check('gate: `pettrade: false` stops it (off)', room._petSellable(P('a'), a2, t).why === 'off');
  room._liveFlags = {};
  const keep = book('c');
  room._petbookMap().set(P('c'), { rec: null, locked: true, dirty: false, savedAt: 0, acts: [] });
  check('gate: a record from a newer worker is never touched (pets-unavailable)', room._petSellable(P('c'), 'p_x', t).why === 'pets-unavailable');
  room._petbookMap().set(P('c'), keep);
}

// ── 3. THE TRADE WINDOW ───────────────────────────────────────────────────────
const lastT2 = (n) => lastOf(ws[n], 'trade2_state');
async function openTrade() {
  await cmd(ws.a, 'trade2_open', { target: P('b') });
  await cmd(ws.b, 'trade2_open', { target: P('a') });
}
const bothReady = async () => {
  await cmd(ws.a, 'trade2_ready', { ready: true });
  await cmd(ws.b, 'trade2_ready', { ready: true });
  for (const s2 of room._trades2.values()) s2.changedAt = Date.now() - 999999;
};
const confirmBoth = async () => { await bothReady(); await cmd(ws.a, 'trade2_confirm'); await cmd(ws.b, 'trade2_confirm'); };
{
  await openTrade();
  check('trade: open (guard)', lastT2('a') && lastT2('a').state === 'open');
  await cmd(ws.a, 'trade2_pets', { ids: [a1] });
  check('trade: the pet out with you stages nothing, and says why', lastT2('a').reason === 'pet:active' && lastT2('a').pets[P('a')].length === 0, lastT2('a'));
  await cmd(ws.a, 'trade2_pets', { ids: [b1] });
  check('trade: a pet that is not yours stages nothing', lastT2('a').reason === 'pet:no-pet');
  await cmd(ws.a, 'trade2_pets', { ids: ['p_1', 'p_2', 'p_3', 'p_4', 'p_5'] });
  check('trade: more than TRADE_MAX refused', lastT2('a').reason === 'pets-max' && PETBOOK.TRADE_MAX === 4);
  await cmd(ws.a, 'trade2_ready', { ready: true });
  ws.b.sent.length = 0;
  await cmd(ws.a, 'trade2_pets', { ids: [a2, a2, '__proto__'] });
  check('trade: `__proto__` among the ids is refused whole', lastT2('a').reason === 'pet:no-pet');
  await cmd(ws.a, 'trade2_pets', { ids: [a2, a2] });
  const st = lastT2('b');
  check('trade: a pet staged (once, duplicates dropped) and shown to BOTH, as a buyer sees it',
    st && st.pets[P('a')].length === 1 && st.pets[P('a')][0].id === a2 && st.pets[P('a')][0].kind === 'gobling'
      && !('caughtBy' in st.pets[P('a')][0]) && !('xp' in st.pets[P('a')][0]), st && st.pets);
  check('trade: ...staging resets both readies', st.ready[P('a')] === false && st.stage === 'offer');
  check('trade: ...and the pet STAYS in A\'s record until the commit (validate-at-commit)', ids('a').includes(a2));
  /* B offers gold */
  await cmd(ws.b, 'trade2_set', { offer: { _gold: 100 } });
  const nameA2 = 'Ember';
  book('a').rec.list.find((p) => p.id === a2).name = nameA2;
  book('a').rec.list.find((p) => p.id === a2).lv = 7;
  const aGold = room.playerState[P('a')].coins, bGold = room.playerState[P('b')].coins;
  ws.a.sent.length = 0;
  await confirmBoth();
  const done = lastT2('a');
  const got = book('b').rec.list.find((p) => p.id === a2);
  check('trade: the commit moves it -- out of A\'s record, into B\'s, same id, name and level, one more owner',
    !ids('a').includes(a2) && !!got && got.name === nameA2 && got.lv === 7 && got.owners === 2, got);
  check('trade: ...both records written', !stored('a').list.some((p) => p.id === a2) && stored('b').list.some((p) => p.id === a2));
  check('trade: ...the gold went the other way', room.playerState[P('a')].coins === aGold + 100 && room.playerState[P('b')].coins === bGold - 100);
  check('trade: ...the settled state says what moved', done && done.settled === true && Array.isArray(done.petsMoved)
    && done.petsMoved.length === 1 && done.petsMoved[0].from === P('a') && done.petsMoved[0].to === P('b') && done.petsMoved[0].pet.id === a2, done && done.petsMoved);
}
{
  /* a SWAP at full collections: each gives one and gets one */
  const fill = (n) => { const r = book(n).rec; while (r.list.length < r.cap) catchPet(n, 'verdant', 1); };
  fill('a'); fill('b');
  tick(PETBOOK.TRADE_HOLD_MS + 1000);
  check('swap: setup -- both collections full', ids('a').length === PETBOOK.CAP && ids('b').length === PETBOOK.CAP);
  const giveA = ids('a').find((id) => id !== book('a').rec.active);
  const giveB = ids('b').find((id) => id !== book('b').rec.active);
  await openTrade();
  await cmd(ws.a, 'trade2_pets', { ids: [giveA] });
  await cmd(ws.b, 'trade2_pets', { ids: [giveB] });
  await confirmBoth();
  check('swap: two full collections swap one each', ids('a').includes(giveB) && ids('b').includes(giveA) && !ids('a').includes(giveA)
    && ids('a').length === PETBOOK.CAP && ids('b').length === PETBOOK.CAP);
  /* A gives one, B gives none: B is full */
  const giveA2 = ids('a').find((id) => id !== book('a').rec.active);
  await openTrade();
  await cmd(ws.a, 'trade2_pets', { ids: [giveA2] });
  await cmd(ws.b, 'trade2_set', { offer: { _gold: 5 } });
  const bGold = room.playerState[P('b')].coins;
  await confirmBoth();
  const st = lastT2('a');
  check('full: no room on B for what B gets -> the whole trade is cancelled, nothing moved, no gold',
    st && st.state === 'cancelled' && st.reason === 'pets-full:' + P('b') && ids('a').includes(giveA2) && room.playerState[P('b')].coins === bGold, st && st.reason);
}
{
  /* the pet released, or set out, between staging and the commit */
  const r = book('b').rec;
  r.list.splice(5, 10);   /* room on B */
  const giveA = ids('a').find((id) => id !== book('a').rec.active);
  await openTrade();
  await cmd(ws.a, 'trade2_pets', { ids: [giveA] });
  await cmd(ws.a, 'pet_release', { id: giveA, confirm: true });
  check('gone: setup -- A released it after staging', !ids('a').includes(giveA));
  await confirmBoth();
  check('gone: a released pet cancels the trade', lastT2('a').state === 'cancelled' && lastT2('a').reason === 'pet-gone:' + P('a') && !ids('b').includes(giveA), lastT2('a').reason);
  const giveA2 = ids('a').find((id) => id !== book('a').rec.active);
  await openTrade();
  await cmd(ws.a, 'trade2_pets', { ids: [giveA2] });
  await cmd(ws.a, 'pet_active', { id: giveA2 });
  await confirmBoth();
  check('gone: a pet taken out with you after staging cancels it too', lastT2('a').reason === 'pet-gone:' + P('a') && ids('a').includes(giveA2));
  /* a disconnect cancels and loses nothing */
  const giveA3 = ids('a').find((id) => id !== book('a').rec.active);
  await openTrade();
  await cmd(ws.a, 'trade2_pets', { ids: [giveA3] });
  const before = ids('a').length;
  room._trade2OnDisconnect(P('b'));
  check('disconnect: cancelled, and the staged pet never left A', !room._t2SessionFor(P('a')) && ids('a').length === before && ids('a').includes(giveA3));
}

// ── 4. THE AUCTION HOUSE ──────────────────────────────────────────────────────
await room._stEnsureIndex();
{
  const fresh = catchPet('a', 'hollows', 6);
  const r0 = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: fresh, price: 500 });
  check('store: a pet within a day of its catch lists nothing (reason too-new)', r0.ok === false && r0.reason === 'too-new' && ids('a').includes(fresh), r0);
  const r1 = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: book('a').rec.active, price: 500 });
  check('store: the pet out with you lists nothing (active)', r1.ok === false && r1.reason === 'active');
  const r2 = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: '__proto__', price: 500 });
  check('store: `__proto__` lists nothing', r2.ok === false && r2.reason === 'no-pet');
  room._liveFlags = { pettrade: false };
  const sell0 = ids('a').find((id) => id !== book('a').rec.active && id !== fresh);
  const r3 = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: sell0, price: 500 });
  check('store: `pettrade: false` lists nothing', r3.ok === false && r3.reason === 'off');
  room._liveFlags = {};
}
let listing = null;
let sellId = null;
{
  sellId = ids('a').find((id) => id !== book('a').rec.active && book('a').rec.list.find((p) => p.id === id).tradeAfter < Date.now());
  const pet = book('a').rec.list.find((p) => p.id === sellId);
  pet.name = 'Pebbles';
  const r = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: sellId, price: 300 });
  listing = r.listing;
  const rec = state._store.get('store_listing:' + (listing && listing.id));
  check('store: a pet listed -- out of the record, held in the listing record', r.ok === true && !ids('a').includes(sellId)
    && rec && rec.kind === 'pet' && rec.pet && rec.pet.id === sellId && !stored('a').list.some((p) => p.id === sellId), r);
  check('store: its public row shows the pet as a buyer sees it, never its hidden fields',
    listing.kind === 'pet' && listing.cat === 'pet' && listing.disp && listing.disp.name === 'Pebbles' && listing.disp.pet && listing.disp.pet.id === sellId
      && !('caughtBy' in listing.disp.pet) && !('xp' in listing.disp.pet) && !('tradeAfter' in listing.disp.pet) && !('pet' in listing), listing);
  const browse = room._stBrowse('pet', null, 20);
  check('store: the Pets shelf lists it', browse.listings.some((l) => l.id === listing.id));
  /* a wake-time rebuild keeps it */
  const room2 = new GameRoom(state, mockEnv);
  room2.playerState = room.playerState;
  await room2._stEnsureIndex();
  check('store: a listed pet survives a restart (the listing is in storage)', room2._stIndex.get(listing.id) && room2._stIndex.get(listing.id).pet.id === sellId);
}
{
  /* C buys it */
  const cGold = room.playerState[P('c')].coins, aGold = room.playerState[P('a')].coins;
  const bought = await room._stBuyNow(listing.id, P('c'));
  const got = book('c').rec.list.find((p) => p.id === sellId);
  check('store: a buyer gets the pet -- the same id and name, one more owner', bought.ok === true && !!got && got.name === 'Pebbles' && got.owners >= 2
    && stored('c').list.some((p) => p.id === sellId), { bought, got });
  check('store: ...and paid for it; the seller is paid (less the fee, through the mail path)', room.playerState[P('c')].coins === cGold - 300 && room.playerState[P('a')].coins > aGold,
    { c: [cGold, room.playerState[P('c')].coins], a: [aGold, room.playerState[P('a')].coins] });
  check('store: ...and the listing is gone', !state._store.has('store_listing:' + listing.id));
}
{
  /* a buyer with a FULL collection: the pet waits in the mail */
  const r = book('c').rec;
  while (r.list.length < r.cap) catchPet('c', 'mist', 2);
  tick(PETBOOK.TRADE_HOLD_MS + 1000);
  const sell2 = ids('a').find((id) => id !== book('a').rec.active);
  const r2 = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: sell2, price: 50 });
  const bought = await room._stBuyNow(r2.listing.id, P('c'));
  const box = state._store.get('inbox:' + P('c')) || [];
  check('full buyer: the sale goes through and the pet waits in C\'s mail, not destroyed', bought.ok === true && !ids('c').includes(sell2)
    && box.some((e) => e.kind === 'pet' && e.payload && e.payload.pet && e.payload.pet.id === sell2), { bought, box: box.map((e) => e.kind) });
  /* it stays there while there is no room */
  await room._drainInbox(P('c'), ws.c);
  check('full buyer: ...a drain with no room leaves it queued', (state._store.get('inbox:' + P('c')) || []).some((e) => e.kind === 'pet'));
  /* C makes room and comes back: the join loads the record BEFORE the mail */
  const rel = ids('c').find((id) => id !== book('c').rec.active);
  await cmd(ws.c, 'pet_release', { id: rel, confirm: true });
  await room.webSocketClose(ws.c);
  ws.c = fakeWs('c2');
  await join(ws.c, P('c'), 'C');
  check('full buyer: at the next join, with room, it lands -- once', ids('c').filter((id) => id === sell2).length === 1
    && !(state._store.get('inbox:' + P('c')) || []).some((e) => e.kind === 'pet'), ids('c').length);
  const ps = lastOf(ws.c, 'pets_state');
  check('full buyer: ...and the join\'s pets_state shows it', ps && ps.list.some((p) => p.id === sell2));
}
{
  /* taken down: it comes back, no extra owner */
  tick(PETBOOK.TRADE_HOLD_MS + 1000);
  const sell3 = ids('a').find((id) => id !== book('a').rec.active);
  const owners0 = book('a').rec.list.find((p) => p.id === sell3).owners;
  const r = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: sell3, price: 70 });
  const c = await room._stCancel(r.listing.id, P('a'));
  const back = book('a').rec.list.find((p) => p.id === sell3);
  check('take-down: the pet comes back to its seller, and is not one more owner', c.ok === true && !!back && back.owners === owners0, { c, back });
  /* expiry, with the seller OFFLINE: by mail, landing at the next join */
  const sell4 = ids('a').find((id) => id !== book('a').rec.active);
  const r4 = await room._stCreateListing({ playerId: P('a'), kind: 'pet', petId: sell4, price: 70 });
  await room.webSocketClose(ws.a);
  room._stIndex.get(r4.listing.id).expiresAt = Date.now() - 1;
  room._stLastSweep = 0;
  await room._stSweep();
  const box = state._store.get('inbox:' + P('a')) || [];
  check('expiry: an unsold pet goes back to an offline seller by mail', box.some((e) => e.kind === 'pet' && e.payload.pet.id === sell4) && !state._store.has('store_listing:' + r4.listing.id), box.map((e) => e.kind));
  ws.a = fakeWs('a2');
  await join(ws.a, P('a'), 'A');
  check('expiry: ...and lands at the seller\'s next join', ids('a').includes(sell4) && !(state._store.get('inbox:' + P('a')) || []).some((e) => e.kind === 'pet'));
}

// ── 5. THE MAIL ───────────────────────────────────────────────────────────────
{
  const pet = book('a').rec.list.find((p) => p.id !== book('a').rec.active);
  const copy = JSON.parse(JSON.stringify(pet));
  const n0 = ids('a').length;
  const r1 = await room._creditPlayer(P('a'), { opId: 'test:pet:dup', source: 'trade', kind: 'pet', payload: { pet: copy, from: P('b') } });
  check('mail: a pet already in the record is never added twice', ids('a').length === n0 && r1 === 'delivered', r1);
  const r2 = await room._creditPlayer(P('a'), { opId: 'test:pet:dup', source: 'trade', kind: 'pet', payload: { pet: copy, from: P('b') } });
  check('mail: the same opId is applied once', r2 === 'dup');
  check('mail: a pet entry with a junk payload is consumed, never wedging the mail', room._applyCreditToPs(room.playerState[P('a')], { kind: 'pet', payload: { pet: { id: '__proto__' } } }, P('a')) === true);
}

Date.now = realNow;
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
