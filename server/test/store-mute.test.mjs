/* ═══ v2.3.5806 (card RV, PR 6b): A MUTE HOLDS IN THE SHOP'S THREADS, AND A
 * PLAYER WHO MUTES YOU READS AS AWAY ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md):
 *
 *   S5 (medium).  A muted buyer's lines in a listing's thread were shown to
 *   the seller when they opened it: the mute held only the live send.  The
 *   line is still stored (docs/specs/store-chat.md: the thread is the
 *   seller's record of the haggle, and a mute is about what reaches a
 *   screen), but a line from someone the opener mutes is not shown, nor a
 *   muted buyer's thread to its seller (`storemute`).
 *
 *   S8 (low; the owner's call, decided while away: "Go recommended on all").
 *   A whisper answered nothing for a player present and `no-such-player` for
 *   one away, so a harasser could test whether the player who muted them was
 *   on; a party invite reached a muter's screen.  Now a player who mutes you
 *   reads as away to you, for both (`mutehides`).
 *
 *   1. a seller who muted a buyer: no line live, none on open (each still
 *      stored, the haggle's record); the buyer is answered as each went;
 *   2. a buyer who muted the seller: the seller's lines are not shown on open;
 *   3. a whisper to a player who muted you: `no-such-player`, as for a name
 *      nobody holds; to anyone else: delivered;
 *   4. a party invite to a player who muted you: `target-gone`, no card;
 *   5. `storemute: false`, `mutehides: false`: as before.
 *
 * Red on main before this change: checks 1c, 2, 3a and 4 fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const BUY = 'bp_rvsmbuy01', SEL = 'bp_rvsmsel01', OTH = 'bp_rvsmoth01';
const LID = 'L_rvsm_1';

async function room3(flags) {
  const clock = seededClock({ seed: 5 }).install();
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const wb = fakeWs('b'), ws = fakeWs('s'), wo = fakeWs('o');
  await join(room, wb, BUY, { name: 'Buyerr', loginTaken: true, data: { x: 100, y: 100, z: 'town', name: 'Buyerr' } });
  await join(room, ws, SEL, { name: 'Sellerr', loginTaken: true, data: { x: 100, y: 100, z: 'town', name: 'Sellerr' } });
  await join(room, wo, OTH, { name: 'Otherr', loginTaken: true, data: { x: 100, y: 100, z: 'town', name: 'Otherr' } });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const send = async (w, type, payload) => { await room.webSocketMessage(w, JSON.stringify({ type, payload: payload || {} })); await settle(); };
  await room._stEnsureIndex();
  room._stIndex.set(LID, { id: LID, sellerId: SEL, sellerName: 'Sellerr', askPrice: 10, expiresAt: Date.now() + 864e5, disp: { name: 'Stick' } });
  return { clock, st, room, wb, ws, wo, send };
}
const of = (w, type) => w.sent.filter((m) => m.type === type);

/* ── 1. a seller who muted a buyer ── */
async function sellerMutes(flags) {
  const R = await room3(flags);
  try {
    await R.send(R.ws, 'chat_mute', { target: BUY, on: true });
    R.ws.sent.length = 0; R.wb.sent.length = 0;
    for (let i = 0; i < 3; i++) { R.clock.advance(2100); await R.send(R.wb, 'store_dm', { listingId: LID, text: 'line ' + i }); }
    const live = of(R.ws, 'store_dm').length;
    const echo = of(R.wb, 'store_dm').length;
    const doc = await R.room._scDoc(LID);
    const stored = Object.keys(doc.t).reduce((n, b) => n + (doc.t[b] || []).length, 0);
    const places = Object.keys(doc.t).length;
    await R.send(R.ws, 'store_dm_open', { listingId: LID });
    const th = of(R.ws, 'store_dm_thread')[0];
    const shown = th ? th.payload.threads.reduce((n, t) => n + t.msgs.length, 0) : -1;
    return { live, echo, stored, places, shown, threads: th ? th.payload.threads.length : -1 };
  } finally { R.clock.restore(); }
}
{
  const r = await sellerMutes(null);
  check('1a. a seller who muted a buyer gets no line live', r.live === 0, r);
  check('1b. ...each is still stored, the seller\'s record of the haggle (store-chat.md)', r.stored === 3, r);
  check('1c. ...none shown on open, and no thread for the buyer', r.shown === 0 && r.threads === 0, r);
  check('1e. ...and the buyer is answered as if each went', r.echo === 3, r);
}

/* ── 2. a buyer who muted the seller ── */
{
  const R = await room3(null);
  try {
    await R.send(R.wb, 'store_dm', { listingId: LID, text: 'how much' });
    R.clock.advance(2100);
    await R.send(R.ws, 'store_dm', { listingId: LID, to: BUY, text: 'rude words' });
    await R.send(R.wb, 'chat_mute', { target: SEL, on: true });
    R.wb.sent.length = 0;
    await R.send(R.wb, 'store_dm_open', { listingId: LID });
    const th = of(R.wb, 'store_dm_thread')[0];
    const msgs = th ? th.payload.threads.flatMap((t) => t.msgs.map((m) => m.text || m.x)) : null;
    check('2. a buyer who muted the seller is not shown the seller\'s lines on open (their own still are)', !!msgs && msgs.length === 1 && msgs[0] === 'how much', msgs);
  } finally { R.clock.restore(); }
}

/* ── 3 and 4. a player who mutes you reads as away ── */
async function hides(flags) {
  const R = await room3(flags);
  try {
    await R.send(R.ws, 'chat_mute', { target: BUY, on: true });
    R.wb.sent.length = 0; R.ws.sent.length = 0;
    R.clock.advance(2100);
    await R.send(R.wb, 'whisper', { to: 'Sellerr', text: 'you there?' });
    const toMuter = of(R.wb, 'whisper_error').map((m) => m.payload.reason);
    R.clock.advance(2100);
    await R.send(R.wb, 'whisper', { to: 'Otherr', text: 'hi' });
    const toOther = of(R.wo, 'whisper').length;
    R.wb.sent.length = 0;
    R.clock.advance(6000);
    await R.send(R.wb, 'party_invite', { target: SEL });
    const partyErr = of(R.wb, 'party_error').map((m) => m.payload.reason);
    const card = R.ws.sent.filter((m) => /party_invite/.test(m.type)).length;
    return { toMuter, toOther, partyErr, card };
  } finally { R.clock.restore(); }
}
{
  const r = await hides(null);
  check('3a. a whisper to a player who muted you: no-such-player, as for a name nobody holds', r.toMuter.length === 1 && r.toMuter[0] === 'no-such-player', r);
  check('3b. ...a whisper to anyone else: delivered', r.toOther === 1, r);
  check('4. a party invite to a player who muted you: target-gone, and no card on their screen', r.partyErr[0] === 'target-gone' && r.card === 0, r);
}

/* ── 5. the switches ── */
{
  const r = await sellerMutes({ storemute: false });
  check('5a. `storemute: false`: shown on open, as before', r.shown === 3, r);
  const h = await hides({ mutehides: false });
  check('5b. `mutehides: false`: the whisper silent, as before', h.toMuter.length === 0, h);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
