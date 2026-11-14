/* ═══ v2.3.5090: A VALUE ROAD FAILS CLOSED WHILE SAVES ARE REFUSED (valuepause.js; card E PR 9) ═══
 *
 *   1. THE PAUSE, from card A's one count (roomrow.js `_savesRefused`): a put
 *      the storage refuses starts it; it lasts PAUSE.MS (one minute), then
 *      lifts by itself; a newer worker's character refused at a join does not
 *      start it; `valuepause: false` turns it off; a room with no count never
 *      pauses.  Through the real storage wrapper: a put that throws.
 *   2. THE ONE TABLE: every `move` or `escrow` road of the two doors is in
 *      VALUE_PAUSE (an action that starts with its TAKE) or in PAUSE_EXEMPT
 *      (a payout, a kill, a shop, a shut road) -- never both, never neither;
 *      every road VALUE_PAUSE names is a TAKE; every exempt payout a GIVE.
 *   3. EACH ROW'S LINE: a socket row is answered by the router's one line
 *      (index.js `_onMessage`, before its switch) and has its refusal in
 *      PAUSE_REFUSE; an HTTP row's route asks the pause.
 *   4. THE THREAT LEVY stays shut (OPEN_PVP false): the day it opens, its row
 *      moves from PAUSE_EXEMPT into VALUE_PAUSE.
 *   5. FAIL CLOSED, PLAYED: two players at the Bank, the storage refuses one
 *      save, then every covered action is sent the game's way: each is
 *      answered with its own refusal and the code or the owner's words, and
 *      NOTHING MOVES (both purses and bags as they were, nothing escrowed).
 *      An offer and a challenge are kept: after the minute the same press
 *      settles.  A duel with no stake is not paused (nothing moves).
 *   6. EVERY PAYOUT KEEPS PAYING during the pause: the vault's withdrawal,
 *      the mail landing, a shop sale.
 *   7. THE KILL SWITCH, played: `valuepause: false`, a deposit in the pause
 *      goes through.
 *   8. THE PHONE'S WORDS: each copy of the owner's words on the phone (the
 *      wire's events, the trade window, the vault's and the drop's refusals)
 *      is PAUSE.WORDS.
 *
 * BREAK PROOFS (rule 8), tried by hand: `bank_deposit` taken off VALUE_PAUSE
 * -> FAIL 2 (a road on neither list); the router's line taken out of
 * index.js -> FAIL 3 and 5 (each action moved value in the pause); the
 * arena's /join line taken out -> FAIL 3 and 5 (the fee taken);
 * `bank_withdraw` added to PAUSE_REFUSE -> FAIL 3 and 6 (a payout refused).
 */
import { readFileSync } from 'node:fs';
import { PAUSE, VALUE_PAUSE, PAUSE_EXEMPT, PAUSE_REFUSE, PAUSE_GATED, valuePaused, pauseOff } from '../src/valuepause.js';
import { GOLD_ROADS } from '../src/gold.js';
import { BAG_ROADS } from '../src/bag.js';
import { BANK } from '../src/bank.js';
import { makeStorage, openRoom, roomQueue, seededClock, join, fakeWs, settle } from './testroom.mjs';
import { systemNames, findIn } from '../../tools/guards/lib/filesOf.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const clock = seededClock({ start: Date.UTC(2026, 10, 14, 12, 0, 0), seed: 9 }).install();

/* ══════════ 1. THE PAUSE ══════════ */
{
  /* a storage that refuses its puts when told (as a full disk or a rolled-back
     worker's would), under card A's wrapper, which the room's start puts on it */
  const st = makeStorage();
  const inner = st.storage.put;
  let refuse = false;
  st.storage.put = function (...a) { return refuse ? Promise.reject(new Error('refused')) : inner.apply(this, a); };
  const room = await openRoom(st);
  if (!st.storage.__btRowsCounted) room._roomRowStart(clock.now());
  check('1. a room whose saves all landed is not paused', valuePaused(room) === false && st.storage.__btRowsCounted === true);
  refuse = true;
  await room.state.storage.put('rpg:bp_vp', { coins: 1 }).catch(() => {});
  await settle();
  refuse = false;
  check('1. a put the storage refused is card A\'s count (one, never counted again here)', room._savesRefused().put === 1, room._savesRefused());
  check('1. ...and the room pauses at once', valuePaused(room) === true);
  clock.advance(PAUSE.MS - 1000);
  check('1. ...for a minute', valuePaused(room) === true);
  clock.advance(2000);
  check('1. ...then lifts by itself', valuePaused(room) === false);
  /* a second refusal starts it again; the kill switch turns it off */
  room._roomRowRefused('put', clock.now());
  check('1. a second refused put pauses again', valuePaused(room) === true);
  room._liveFlags = { valuepause: false };
  check('1. `valuepause: false`: nothing pauses', pauseOff(room) === true && valuePaused(room) === false);
  room._liveFlags = {};
  clock.advance(PAUSE.MS + 1);
  /* a newer worker's character refused at a join is that player's, not the storage's */
  room._roomRowRefused('newer', clock.now());
  check('1. a character a newer worker saved does not pause the room', valuePaused(room) === false, room._savesRefused());
  check('1. ...a room with no count never pauses, and a broken read never throws', valuePaused({}) === false && valuePaused(null) === false
    && valuePaused({ _savesRefused() { throw new Error('x'); } }) === false);
  check('1. the owner\'s words', PAUSE.WORDS === 'Saving is paused for a moment, try again.' && PAUSE.MS === 60000);
}

/* ══════════ 2. THE ONE TABLE ══════════ */
{
  const roads = [...Object.entries(GOLD_ROADS), ...Object.entries(BAG_ROADS)].filter(([, r]) => r.class === 'move' || r.class === 'escrow');
  const names = new Set(roads.map(([k]) => k));
  const paused = new Set(Object.values(VALUE_PAUSE).flatMap((r) => r.roads));
  const exempt = new Set(Object.keys(PAUSE_EXEMPT));
  const neither = [...names].filter((k) => !paused.has(k) && !exempt.has(k));
  const both = [...names].filter((k) => paused.has(k) && exempt.has(k));
  const stray = [...paused, ...exempt].filter((k) => !names.has(k));
  /* 28 rows (16 gold, 12 bag), 24 names: four roads carry both gold and goods */
  check(`2. every move or escrow road (${roads.length} rows, ${names.size} names) pauses or is exempt, never both`, roads.length === 28 && names.size === 24 && neither.length === 0 && both.length === 0, { neither, both });
  check('2. ...and both lists name only move or escrow roads', stray.length === 0, stray);
  const rowsOf = (k) => roads.filter(([n]) => n === k).map(([, r]) => r);   /* its move or escrow rows only */
  const takes = [...paused].filter((k) => rowsOf(k).some((r) => r.dir !== 'take'));
  check('2. every road an action pauses on is a TAKE (into another player or a held place)', takes.length === 0, takes);
  const payouts = Object.entries(PAUSE_EXEMPT).filter(([, why]) => why.startsWith('a payout')).map(([k]) => k);
  const notGives = payouts.filter((k) => rowsOf(k).some((r) => r.dir !== 'give'));
  check('2. ...and every exempt payout a GIVE (the owner: every payout keeps paying)', payouts.length >= 6 && notGives.length === 0, notGives);
}

/* ══════════ 3. EACH ROW'S LINE ══════════ */
{
  const bad = [];
  const fnText = (file, fn) => {
    const f = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
    const i = f.search(new RegExp('\\n  (async )?' + fn + '\\('));
    if (i < 0) return null;
    const j = f.indexOf('\n  },', i);
    return f.slice(i, j > i ? j : undefined);
  };
  const router = fnText('index.js', '_onMessage') || '';
  const gate = router.indexOf('this._valuePauseGate(session, msg)');
  const sw = router.indexOf('switch (msg.type)');
  if (!(gate > 0 && sw > gate)) bad.push('index.js _onMessage: no pause line before the switch');
  for (const [t, row] of Object.entries(VALUE_PAUSE)) {
    if (t.startsWith('http:')) {
      const [file, fn] = row.at.split(' ');
      const body = fnText(file, fn);
      const route = t.slice(t.lastIndexOf('/') + 1);
      if (body === null) { bad.push(t + ': no ' + row.at); continue; }
      /* the line names its route (store.js's one line names its three) */
      const line = body.split('\n').find((l) => l.includes('this._valuePaused()') && (l.includes(route) || file !== 'store.js'));
      if (!line) bad.push(t + ': ' + row.at + ' never asks the pause');
      if (PAUSE_GATED.has(t)) bad.push(t + ': an HTTP row in the router\'s set');
    } else {
      if (row.at !== 'index.js _onMessage') bad.push(t + ': a socket row not at the router');
      if (typeof PAUSE_REFUSE[t] !== 'function' || !PAUSE_GATED.has(t)) bad.push(t + ': no refusal');
    }
  }
  const strays = [...PAUSE_GATED].filter((t) => !VALUE_PAUSE[t]);
  check('3. every row has its line: the router\'s one (before its switch) for a socket action, its route\'s for HTTP', bad.length === 0 && strays.length === 0, { bad, strays });
}

/* ══════════ 4. THE THREAT LEVY STAYS SHUT ══════════ */
{
  const src = readFileSync(new URL('../src/threat.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const m = src.match(/OPEN_PVP\s*=\s*(true|false)/);
  check('4. OPEN_PVP is false, so the threat levy is shut (open it, and its row moves into VALUE_PAUSE)', !!m && m[1] === 'false', m && m[0]);
}

/* ══════════ THE PLAYED WORLD: two players at the Bank ══════════ */
const IDS = { a: 'bp_vp_a', b: 'bp_vp_b' };
const rec = (coins, inventory) => ({ _v: 21, coins, inventory, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
async function world(flags) {
  const st = makeStorage(new Map([
    ['rpg:' + IDS.a, rec(1000, { wood_oak: 10, fish_minnow: 20, 'slime-remnants': 10 })],
    ['rpg:' + IDS.b, rec(800, { ore_iron_ore: 6 })],
  ]));
  const inner = st.storage.put;
  let refuse = false;
  st.storage.put = function (...a) { return refuse ? Promise.reject(new Error('refused')) : inner.apply(this, a); };
  const room = await openRoom(st, Object.assign({ giftclosed: false }, flags || {}));
  if (!st.storage.__btRowsCounted) room._roomRowStart(clock.now());
  room._httpAuthCheck = () => true;   /* the HTTP routes: signed in */
  const ws = { a: fakeWs('a'), b: fakeWs('b') };
  for (const w of ['a', 'b']) await join(room, ws[w], IDS[w], { loginTaken: true });
  const c = room._wheelT().WHEEL_CENTRE;
  const at = (w, dx) => Object.assign(room.playerState[IDS[w]], { z: 'wheel', x: c[0] + BANK.DOOR[0] + 40 + dx, y: c[1] + BANK.DOOR[1] + 150, dead: false, dying: false });
  at('a', 0); at('b', 30);
  const q = roomQueue(room);
  const send = async (w, msg) => { await q.send(ws[w], msg); await q.drain(); await settle(); };
  /* the storage refuses one save (a full disk, a rolled-back worker): card A's count moves */
  const pause = async () => {
    refuse = true;
    await room.state.storage.put('rpg:bp_vp_probe', { coins: 1 }).catch(() => {});
    await settle();
    refuse = false;
  };
  const snap = () => JSON.stringify(['a', 'b'].map((w) => { const p = room.playerState[IDS[w]]; return [p.coins, p.inventory]; }))
    + '|' + [...st._store.keys()].filter((k) => /^(arena_stake|mkt_order|ah|offer|duel|jackpot)/.test(k)).sort().join(',');
  const sent = (w, type) => ws[w].sent.filter((m) => m && m.type === type);
  const told = (type, target) => (room.eventBuffer || []).filter((e) => e && e.type === type && e.payload && e.payload.target === target);
  const http = async (fetch, url, body) => {
    const r = await room[fetch](new Request('https://brotown.test' + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    return r.json();
  };
  return { st, room, ws, send, pause, snap, sent, told, http, ps: (w) => room.playerState[IDS[w]] };
}

/* ══════════ 5. FAIL CLOSED, PLAYED ══════════ */
{
  const W = await world();
  const { room, send, pause, snap, sent, told, http } = W;
  /* before the pause: a trade window ready on both sides, a gift offered to B,
     a challenge with a stake to A */
  await send('a', { type: 'trade2_open', payload: { target: IDS.b } });
  await send('b', { type: 'trade2_open', payload: { target: IDS.a } });
  await send('a', { type: 'trade2_set', payload: { offer: { _gold: 200 } } });
  await send('a', { type: 'trade2_ready', payload: { ready: true } });
  await send('b', { type: 'trade2_ready', payload: { ready: true } });
  await send('a', { type: 'trade_offer', payload: { target: IDS.b, offer: { _gold: 50 }, fromName: 'a' } });
  await send('b', { type: 'duel_wager_request', payload: { target: IDS.a, wager: 40 } });
  clock.advance(3000);   /* the window's accept cooldown */
  await pause();
  check('5. the storage refused a save: the room is paused', valuePaused(room) === true);
  const before = snap();
  const steps = [];
  const play = async (name, fn, heard) => { const n0 = snap(); await fn(); const moved = snap() !== n0; steps.push({ name, moved, heard: !!heard() }); };
  await play('trade2_confirm', async () => { await send('a', { type: 'trade2_confirm' }); await send('b', { type: 'trade2_confirm' }); },
    () => sent('a', 'trade2_state').some((m) => m.payload && m.payload.reason === PAUSE.CODE));
  await play('trade_accept', () => send('b', { type: 'trade_accept', payload: { target: IDS.a } }),
    () => told('trade_reject', IDS.b).some((e) => e.payload.reason === PAUSE.CODE));
  await play('duel_accept (a stake)', () => send('a', { type: 'duel_accept', payload: { target: IDS.b, wager: 40 } }),
    () => told('duel_decline', IDS.a).some((e) => e.payload.reason === PAUSE.CODE));
  await play('bank_deposit', () => send('a', { type: 'bank_deposit', payload: { kind: 'gold', n: 100, opId: 'vp-1' } }),
    () => sent('a', 'bank_state').some((m) => m.payload && m.payload.last && m.payload.last.err === PAUSE.CODE && m.payload.last.opId === 'vp-1'));
  await play('arena_sponsor', () => send('a', { type: 'arena_sponsor', payload: { targetId: IDS.b, amount: 100 } }),
    () => sent('a', 'arena_stake_error').some((m) => m.payload && m.payload.code === PAUSE.CODE && m.payload.message === PAUSE.WORDS));
  await play('jackpot_deposit', () => send('a', { type: 'jackpot_deposit', payload: { amount: 100 } }),
    () => sent('a', 'jackpot_state').some((m) => m.payload && m.payload.error === PAUSE.WORDS));
  await play('store_offer', () => send('a', { type: 'store_offer', payload: { listingId: 'vp-listing', gold: 100 } }),
    () => sent('a', 'store_offer_error').some((m) => m.payload && m.payload.error === PAUSE.WORDS));
  await play('item_drop', () => send('a', { type: 'item_drop', key: 'wood_oak', qty: 1 }),
    () => sent('a', 'item_drop_result').some((m) => m.payload && m.payload.reason === PAUSE.CODE));
  for (const [route, fetch, body] of [
    ['/api/arena/join', '_arenaFetch', { playerId: IDS.a, playerName: 'a' }],
    ['/api/market/place', '_marketFetch', { playerId: IDS.a, side: 'sell', category: 'material', subtype: 'wood_oak', qty: 1, price: 10 }],
    ['/api/store/list', '_storeFetch', { playerId: IDS.a, item: { key: 'wood_oak', qty: 1 }, askPrice: 10 }],
    ['/api/store/buy', '_storeFetch', { playerId: IDS.a, listingId: 'vp-listing' }],
    ['/api/store/bid', '_storeFetch', { playerId: IDS.a, listingId: 'vp-listing', amount: 10 }],
  ]) {
    let out = null;
    await play('http:' + route, async () => { out = await http(fetch, route, body); }, () => out && out.ok === false && out.error === PAUSE.WORDS && out.reason === PAUSE.CODE);
  }
  const bad = steps.filter((x) => x.moved || !x.heard);
  check(`5. every covered action (${steps.length}) answered with its own refusal and the words, nothing moved`, steps.length === Object.keys(VALUE_PAUSE).length && bad.length === 0 && snap() === before, { bad, n: steps.length });
  check('5. ...the window, the offer and the challenge are kept', !!room._t2SessionFor(IDS.a)
    && room._pendingTradeOffers.has(IDS.a + '>' + IDS.b) && room._duelChallenges.has(IDS.b + '>' + IDS.a));
  /* the minute's end: the same presses settle */
  clock.advance(PAUSE.MS);
  check('5. after the minute the pause lifts', valuePaused(room) === false);
  const a0 = W.ps('a').coins, b0 = W.ps('b').coins;
  await send('a', { type: 'trade2_confirm' }); await send('b', { type: 'trade2_confirm' });
  const tradeDone = W.ps('a').coins === a0 - 200 && W.ps('b').coins === b0 + 200;
  await send('b', { type: 'trade_accept', payload: { target: IDS.a } });
  const giftDone = W.ps('a').coins === a0 - 250 && W.ps('b').coins === b0 + 250;
  await send('a', { type: 'duel_accept', payload: { target: IDS.b, wager: 40 } });
  const duelOn = !!(room._duelFor && room._duelFor(IDS.a)) && W.ps('a').coins === a0 - 290;
  check('5. ...and the same presses settle: the window\'s trade, the gift, the duel\'s stakes', tradeDone && giftDone && duelOn, { a: W.ps('a').coins, b: W.ps('b').coins, a0, b0, tradeDone, giftDone, duelOn });
}
{
  /* a duel with no stake moves nothing: it is not paused */
  const W = await world();
  await W.send('b', { type: 'duel_request', payload: { target: IDS.a } });
  await W.pause();
  await W.send('a', { type: 'duel_accept', payload: { target: IDS.b, wager: 0 } });
  check('5. a duel with no stake is not paused (nothing moves): it starts', valuePaused(W.room) === true && !!W.room._duelFor(IDS.a)
    && !W.told('duel_decline', IDS.a).some((e) => e.payload.reason === PAUSE.CODE));
}

/* ══════════ 6. EVERY PAYOUT KEEPS PAYING ══════════ */
{
  const W = await world();
  await W.send('a', { type: 'bank_deposit', payload: { kind: 'gold', n: 300, opId: 'vp-in' } });
  await W.pause();
  const c0 = W.ps('a').coins;
  await W.send('a', { type: 'bank_withdraw', payload: { kind: 'gold', n: 100, opId: 'vp-out' } });
  const withdrew = W.ps('a').coins === c0 + 100;
  await W.room._creditPlayer(IDS.a, { opId: 'dq:' + IDS.a + ':20261114:vp', source: 'daily', kind: 'gold', payload: { amount: 35 }, note: 'a daily quest' });
  await settle();
  const mailed = W.ps('a').coins === c0 + 135;
  const inv0 = W.ps('a').inventory['slime-remnants'] || 0;
  await W.send('a', { type: 'shop_sell', payload: { key: 'slime-remnants', qty: 4 } });
  const sold = (W.ps('a').inventory['slime-remnants'] || 0) === inv0 - 4 && W.ps('a').coins > c0 + 135;
  check('6. in the pause the vault pays out, the mail lands, a shop buys', valuePaused(W.room) === true && withdrew && mailed && sold, { withdrew, mailed, sold, coins: W.ps('a').coins, c0 });
  const payouts = ['bank_withdraw', 'mail_gold', 'mail_item', 'market_unwind', 'ah_offer_back', 'shop_pile', 'shop_sell', 'shop_buy', 'loot_pickup'];
  check('6. ...and no payout\'s message is in the router\'s set', payouts.every((t) => !PAUSE_GATED.has(t)), [...PAUSE_GATED]);
}

/* ══════════ 7. THE KILL SWITCH ══════════ */
{
  const W = await world({ valuepause: false });
  await W.pause();
  const c0 = W.ps('a').coins;
  await W.send('a', { type: 'bank_deposit', payload: { kind: 'gold', n: 100, opId: 'vp-off' } });
  check('7. `valuepause: false`: a deposit after a refused save goes through (the old way)', W.room._savesRefused().put >= 1 && W.ps('a').coins === c0 - 100);
}

/* ══════════ 8. THE PHONE'S WORDS ══════════ */
/* read by system (tools/guards/lib/filesOf.mjs: a suite never names a big
   file by its path); every copy on the phone is the owner's words exactly */
{
  const hits = [];
  for (const sys of systemNames()) for (const h of findIn(sys, /Saving is paused/)) if (h.file.startsWith('src/')) hits.push(h);
  const files = new Set(hits.map((h) => h.file));
  const wrong = hits.filter((h) => !h.text.includes(PAUSE.WORDS));
  /* the trade's decline, the duel's decline, the jackpot's answer (the wire's
     events); the trade window's line; the vault's and the drop's REFUSED */
  const keyed = hits.filter((h) => /\bpaused: '/.test(h.text)).length;
  const shown = hits.filter((h) => /reason === 'paused' \?/.test(h.text)).length;
  check(`8. the phone holds the owner's words for \`paused\` where it shows a refusal (${hits.length} places, ${files.size} files)`,
    wrong.length === 0 && hits.length >= 6 && files.size >= 4 && keyed === 2 && shown === 3, { wrong, keyed, shown, files: [...files] });
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all valuepause checks passed');
