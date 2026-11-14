/* ═══ v2.3.5093: THE OWNER'S CARD'S RULES (src/game/econCard.js; card E PR 12) ═══
 *
 *   1. A DAY OF THE BOOK as the card shows it: gold made and destroyed (the
 *      `econ` part as the two doors add it: g.mint, g.burn; each item under
 *      i.mint / i.burn), the items made and destroyed most first, the room's
 *      own row (card A's `room` part, under its shape's number), the
 *      smoothness cells and Speed test cards, and a full part's `over`.
 *   2. A DAY THAT IS EMPTY, OR HAND-MADE, reads as zeros and empty lists,
 *      never a throw; an unknown shape of the room's row is not added in.
 *   3. THE FIVE NUMBERS, in the plan's order (step 10.4), and NOT COUNTED YET
 *      (null) while nothing counts them: a 0 would look like a reading.
 *   4. THE BOOK'S DAYS from the one admin route's answer, newest first, as
 *      the doors really write them (the gold door through the book's door).
 *   5. v2.3.5093: THE FIVE NUMBERS, counted (econCompute): unexplained gold,
 *      gold a player-hour against the week, the share moved one way for
 *      nothing, the share of new gold to the richest; each says why when it
 *      cannot be counted; `econ: false` says the counting is off.
 *   6. v2.3.5093: THE DAY'S SNAPSHOT carries the world's one sum (worldsum.js,
 *      through liveops.js _metricsMaybe's own pages): held, made less
 *      destroyed, minted to date, the ten richest; GET /dev/econcard reads
 *      it; `econ: false` walks none of it.  Its cost printed: the reads a
 *      day at 1 and 100 characters, and the largest page's time.
 *   7. v2.3.5093: A SITTING'S SECONDS go into the book's riding `econ` part
 *      at the leave (leave.js), for gold a player-hour.
 *   8. v2.3.5093 (the gatekeeper's sitting 10, M1): A RESTART MID-DAY reads
 *      0: A is paid 1000, trades 100 to B, B restarts (its gold and its own
 *      count of what it made go together, outside the gold door); the next
 *      daily count, with the restart booked and added back, reads 0 -- and
 *      0 again the day A restarts.  Played: real joins, a real trade, the
 *      real restart, the real daily walk and the route.
 *   9. M3: GOLD A PLAYER-HOUR counts the sittings still open (the route's
 *      `open`): 100 made in a sitting open half an hour reads 200 an hour.
 *
 * BREAK PROOFS (rule 8), tried by hand: econNumbers returning 0 for a number
 * with no count -> FAIL 3; the restart's line taken out of persistence.js ->
 * FAIL 8 (-100, then +100).
 */
import { econDay, econDays, econNumbers, ECON_NUMBERS } from '../../src/game/econCard.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

/* ── 1. a day ── */
{
  const d = econDay({
    day: '20261114',
    econ: { g: { mint: 65, burn: 15 }, i: { mint: { ore_copper: 3, bar_copper: 2, fish_minnow: 9 }, burn: { ore_copper: 2 } } },
    room: { '1': { joins: [1, 4], restarts: 2, rows: [30, 3], refused: [1, 0], ticks: 900, gap: [1, 2] } },
    dev: { 'g2.s0.4096|full|none|5080': { n: 1 }, 'g1.s0.2048|full|none|5080': { n: 2 } },
    speed: { a: 1 },
    over: { dev: 2, econ: 0 },
  });
  check('1. gold made 65, destroyed 15', d.day === '20261114' && d.goldMade === 65 && d.goldGone === 15, d);
  check('1. ...the items made, the most first; the items destroyed', JSON.stringify(d.itemsMade) === '[["fish_minnow",9],["ore_copper",3],["bar_copper",2]]' && JSON.stringify(d.itemsGone) === '[["ore_copper",2]]', d);
  check('1. ...the room\'s row: joins (v1, v2), restarts, rows written and deleted, saves refused', JSON.stringify(d.room) === JSON.stringify({ joins: [1, 4], restarts: 2, rows: [30, 3], refused: [1, 0], otherShapes: 0 }), d.room);
  check('1. ...two smoothness cells, one speed card, and the full part\'s count (a 0 left out)', d.devCells === 2 && d.speedCards === 1 && JSON.stringify(d.over) === '[["dev",2]]', d);
}

/* ── 2. empty, hand-made ── */
{
  let threw = false;
  let a, b;
  try {
    a = econDay(null);
    b = econDay({ day: 7, econ: { g: { mint: 'x', burn: Infinity }, i: { mint: [1, 2], burn: null } }, room: { '2': { joins: [9, 9] }, '1': 'junk' }, dev: 3, over: { a: 'x' } });
  } catch (e) { threw = true; }
  check('2. an empty day and a hand-made one read as zeros, never a throw', !threw && a.goldMade === 0 && a.itemsMade.length === 0 && a.room.joins[0] === 0 && a.devCells === 0, { a, b });
  check('2. ...a number that is not one is 0; an unknown shape of the room row is not added in (it is counted aside)', !threw && b.goldMade === 0 && b.goldGone === 0 && b.room.joins[0] === 0 && b.room.otherShapes === 1 && b.day === '', b);
  check('2. ...a newer worker\'s day says so', econDay({ day: '20261114', newer: true }).newer === true);
}

/* ── 3. the five numbers ── */
{
  check('3. five numbers, in the plan\'s order', ECON_NUMBERS.map((n) => n.id).join() === 'unexplained,perHour,oneWay,richest,cases' && Object.isFrozen(ECON_NUMBERS));
  const none = econNumbers(null);
  check('3. ...NOT COUNTED YET (null) while nothing counts them, never a 0', ECON_NUMBERS.every((n) => none[n.id] === null), none);
  const some = econNumbers({ unexplained: 0, oneWay: 0.25, richest: 'a lot', perHour: NaN });
  check('3. ...a counted number is shown, 0 included; anything else is not', some.unexplained === 0 && some.oneWay === 0.25 && some.richest === null && some.perHour === null && some.cases === null, some);
  check('3. ...each says what it is and what it waits for', ECON_NUMBERS.every((n) => n.name && n.what && n.waits));
}

/* ── 4. the route's days, as the doors write them ── */
{
  const { GameRoom } = await import('../src/index.js');
  const { bookRead } = await import('../src/daybook.js');
  const store = new Map();
  const clone = (v) => (v === undefined ? v : structuredClone(v));
  const state = {
    storage: {
      async get(k) { return clone(store.get(k)); },
      async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, clone(vv)); return; } store.set(k, clone(v)); },
      async delete(k) { return store.delete(k); },
      async list(o) { let ks = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort(); if (o?.reverse) ks.reverse(); if (o?.limit) ks = ks.slice(0, o.limit); return new Map(ks.map((k) => [k, clone(store.get(k))])); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const room = new GameRoom(state, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
  room._liveFlags = {};
  room._syncBagCaps();
  const ps = { coins: 100, inventory: {} };
  room._goldGive(ps, 40, 'quest_reward');
  room._goldTake(ps, 15, 'harden');
  room._goldTake(ps, 30, 'bank_deposit');
  const r = await bookRead(room, 1);
  const days = econDays(r);
  check('4. the route\'s answer read as the card shows it: today, gold made 40, destroyed 15 (the bank\'s deposit is neither)', r.ok && days.length === 1 && days[0].goldMade === 40 && days[0].goldGone === 15, { r, days });
  check('4. ...an answer with no days is no days', econDays(null).length === 0 && econDays({ ok: true }).length === 0);
  const { setBagBook } = await import('../src/bag.js');
  setBagBook(null);
}

/* ── 5. the five numbers, counted (econCompute; v2.3.5093) ── */
{
  const { econCompute } = await import('../../src/game/econCard.js');
  const book = { days: [{ econ: { g: { mint: 300 }, p: { s: 7200 } } }, { econ: { g: { mint: 100 }, p: { s: 3600 } } }, { econ: { g: { mint: 50 }, p: { s: 1800 } } }] };
  const card = { on: true,
    metrics: [{ day: '20261114', world: { held: 1500, net: 1300, minted: 2000, richest: [['a', 900, 1200], ['b', 300, 400]] } },
      { day: '20261113', world: { held: 1000, net: 800, minted: 1500, richest: [['a', 700, 1000], ['b', 200, 300]] } }],
    xfer: [{ day: '20261114', rows: 2, gold: 200, goldOneWay: 50 }] };
  const n = econCompute(book, card);
  check('5. unexplained gold: the change in held less made between the two newest daily counts (0 here)', n.unexplained.v === 0 && n.unexplained.since === '20261113', n.unexplained);
  check('5. ...and a copy shows: 50 gold held that no road made', econCompute(book, { ...card, metrics: [{ ...card.metrics[0], world: { ...card.metrics[0].world, held: 1550 } }, card.metrics[1]] }).unexplained.v === 50);
  check('5. gold made a player-hour: 150 today, the week 100 (150 over 1.5 hours)', n.perHour.v === 150 && n.perHour.week === 100, n.perHour);
  check('5. moved one way for nothing: 50 of 200, a quarter', n.oneWay.v === 0.25, n.oneWay);
  check('5. new gold to the richest: 300 of the 500 made', n.richest.v === 0.6, n.richest);
  check('5. cases waiting: not counted (card Q)', n.cases.v === null && /card Q/.test(n.cases.why));
  const z = econCompute({ days: [] }, { on: true, metrics: [{ day: 'x', world: { held: 1, net: 1, minted: 1, richest: [] } }], xfer: [{ gold: 0, goldOneWay: 0 }] });
  check('5. ...with too little to count, each says why, never a 0', z.unexplained.v === null && /two/.test(z.unexplained.why) && z.perHour.v === null && z.oneWay.v === null && /no gold moved/.test(z.oneWay.why) && z.richest.v === null, z);
  const off = econCompute(book, { on: false });
  check('5. `econ: false`: every number says the counting is off', Object.values(off).every((x) => x.v === null && /switched off/.test(x.why)));
}

/* ── 6. the day's snapshot carries the world's sum (liveops.js _metricsMaybe; v2.3.5093) ── */
{
  const { GameRoom } = await import('../src/index.js');
  const { LIVEOPS } = await import('../src/liveops.js');
  const mk = () => {
    const store = new Map();
    const clone = (v) => (v === undefined ? v : structuredClone(v));
    const log = { list: 0, read: 0 };
    const st = {
      _store: store, log,
      storage: {
        async get(k) { log.read++; return clone(store.get(k)); },
        async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, clone(vv)); return; } store.set(k, clone(v)); },
        async delete(k) { if (Array.isArray(k)) { let n = 0; for (const x of k) if (store.delete(x)) n++; return n; } return store.delete(k); },
        async list(o) { log.list++; let ks = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort(); if (o?.startAfter) ks = ks.filter((k) => k > o.startAfter); if (o?.reverse) ks.reverse(); if (o?.limit) ks = ks.slice(0, o.limit); log.read += ks.length; return new Map(ks.map((k) => [k, clone(store.get(k))])); },
      },
      getWebSockets: () => [], acceptWebSocket: () => {},
    };
    const room = new GameRoom(st, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
    room._liveFlags = {};
    return { st, room };
  };
  const seedWorld = (store, chars) => {
    for (let i = 0; i < chars; i++) store.set('rpg:bp_w' + String(i).padStart(3, '0'), { _v: 21, coins: 100 + i, inventory: {}, _econ: { v: 1, g: { m: 50 + i, b: 10 }, i: {} } });
    store.set('bank:bp_w000', { gold: 40, items: [] });
    store.set('inbox:bp_w001', [{ opId: 'season:s:x', kind: 'gold', payload: { amount: 30 } }]);
    store.set('duelEscrow:d1', { wager: 5 });
  };
  const walk = async (room, now) => { let n = 0; while ((await room._metricsMaybe(now)) && n < 200) n++; return n + 1; };
  const NOWW = Date.UTC(2026, 10, 14, 13, 0, 0);
  {
    const { st, room } = mk();
    seedWorld(st._store, 3);
    await walk(room, NOWW);
    const rec = st._store.get('metrics:' + room._cadencePeriodDaily(NOWW));
    const w = rec && rec.world;
    /* held: purses 100+101+102, the vault 40, the mail 30, the duel's escrow 2 x 5; made: (50+51+52) - 30 burned, plus the mail's 30 minted */
    check('6. the day\'s record carries the world: held, made less destroyed, minted to date', !!w && w.v === 1 && w.held === 303 + 40 + 30 + 10 && w.net === (153 - 30) + 30 && w.minted === 153, w);
    check('6. ...the ten richest by purse, with what each made', w && w.richest.length === 3 && w.richest[0][0] === 'bp_w002' && w.richest[0][1] === 102 && w.richest[0][2] === 52, w && w.richest);
    check('6. ...and the old fields as before', rec.totalGold === 303 && rec.playerBlobs === 3);
    const { econCardRead } = await import('../src/econcard.js');
    const r = await econCardRead(room, 1);
    check('6. GET /dev/econcard\'s read: the snapshots\' world sums, newest first, and the ledger\'s day', r.ok && r.on && r.metrics.length === 1 && r.metrics[0].world.held === w.held && r.xfer.length === 1 && r.xfer[0].rows === 0, r);
    room._liveFlags = { econ: false };
    room._lastMetricsDay = null;
    st._store.delete('metrics:' + room._cadencePeriodDaily(NOWW));
    await walk(room, NOWW);
    const off = st._store.get('metrics:' + room._cadencePeriodDaily(NOWW));
    check('6. `econ: false`: the snapshot walks none of it (no `world`), the old fields still written', off && !('world' in off) && off.totalGold === 303, off);
    check('6. ...and the card\'s read says the counting is off', (await econCardRead(room, 1)).on === false);
  }
  /* the cost, said in the PR: the reads a day, and how long the largest page takes */
  for (const chars of [1, 100]) {
    const { st, room } = mk();
    seedWorld(st._store, chars);
    const t0 = process.hrtime.bigint();
    const calls = await walk(room, NOWW);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const rec = st._store.get('metrics:' + room._cadencePeriodDaily(NOWW));
    console.log(`  (cost: ${chars} character(s): ${st.log.read} records read, ${st.log.list} lists, ${calls} housekeeping slot(s), ${ms.toFixed(1)} ms in all)`);
    check(`6. ${chars} character(s): the walk reads each record once a day (${st.log.read} reads) and writes one record`, rec && rec.world && st.log.read <= chars + 3 + 2 * (10 + 1) && calls <= Math.ceil(chars / 200) + 2, { reads: st.log.read, calls });
  }
  {
    /* the largest page: METRICS.PAGE characters in one call */
    const { st, room } = mk();
    const { METRICS } = await import('../src/liveops.js');
    seedWorld(st._store, METRICS.PAGE);
    const t0 = process.hrtime.bigint();
    await room._metricsMaybe(NOWW);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`  (cost: the largest page, ${METRICS.PAGE} characters through the one sum: ${ms.toFixed(1)} ms)`);
    check(`6. the largest page (${METRICS.PAGE} characters) is read and summed in one slot`, ms < 250, ms);
    void LIVEOPS;
  }
}

/* ── 7. a sitting's seconds into the book at the leave (leave.js; v2.3.5093) ── */
{
  const { GameRoom } = await import('../src/index.js');
  const store = new Map();
  const clone = (v) => (v === undefined ? v : structuredClone(v));
  const st = { storage: { async get(k) { return clone(store.get(k)); }, async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, clone(vv)); return; } store.set(k, clone(v)); }, async delete(k) { return store.delete(k); }, async list() { return new Map(); } }, getWebSockets: () => [], acceptWebSocket: () => {} };
  const room = new GameRoom(st, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
  room._liveFlags = {};
  const ws = { sent: [], send(x) { this.sent.push(x); }, close() {} };
  const opened = Date.now() - 90 * 60 * 1000;
  room.sessions.set(ws, { phase: 'open', id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), openedAt: opened });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_sit', name: 'S', phrase: 'p-s', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  await new Promise((r) => setTimeout(r, 10));
  await room.webSocketClose(ws, 1000, 'bye', true);
  await new Promise((r) => setTimeout(r, 10));
  const parts = room._daybook && [...room._daybook.days.values()].map((d) => d.parts.econ);
  const stored = [...store.entries()].filter(([k]) => k.startsWith('daybook:')).map(([, v]) => v.econ);
  const secs = [...(parts || []), ...stored].reduce((t, e) => t + ((e && e.p && e.p.s) || 0), 0);
  check('7. a sitting of 90 minutes adds 5400 seconds to the book\'s econ part at the leave', Math.abs(secs - 5400) <= 2, { secs, parts, stored });
}

/* ── 8. a restart mid-day reads 0 (sitting 10, M1) ── */
{
  const { makeStorage, openRoom, join, fakeWs, settle, seededClock } = await import('./testroom.mjs');
  const { bookRead } = await import('../src/daybook.js');
  const { econCardRead } = await import('../src/econcard.js');
  const { econCompute } = await import('../../src/game/econCard.js');
  const clock = seededClock({ start: Date.UTC(2026, 10, 12, 9, 0, 0), seed: 8 }).install();
  try {
    const A = 'bp_ec_a', B = 'bp_ec_b';
    const st = makeStorage();
    const room = await openRoom(st);
    const wa = fakeWs('a'), wb = fakeWs('b');
    await join(room, wa, A, { loginTaken: true });
    await join(room, wb, B, { loginTaken: true });
    const cmd = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };
    const walk = async () => { let n = 0; while ((await room._metricsMaybe(clock.now())) && n < 50) n++; await settle(); };
    const read = async () => econCompute(await bookRead(room, 8), await econCardRead(room, 1));
    await walk();   /* day 1's count */
    clock.advance(86400000);
    /* day 2: A is paid 1000 (a mint), trades 100 to B, and B restarts */
    await room._creditPlayer(A, { opId: 'dq:' + A + ':20261113:ec', source: 'daily', kind: 'gold', payload: { amount: 1000 }, note: 'a daily quest' });
    await settle();
    await cmd(wa, 'trade2_open', { target: B }); await cmd(wb, 'trade2_open', { target: A });
    await cmd(wa, 'trade2_set', { offer: { _gold: 100 } });
    await cmd(wa, 'trade2_ready', { ready: true }); await cmd(wb, 'trade2_ready', { ready: true });
    clock.advance(3000);
    await cmd(wa, 'trade2_confirm'); await cmd(wb, 'trade2_confirm');
    const traded = (st._store.get('rpg:' + B) || {}).coins;
    await room._resetCharacterData(B);
    await settle();
    clock.advance(3600000);
    await walk();   /* day 2's count */
    const n2 = await read();
    check('8. A paid 1000, trades 100 to B, B restarts: the next count reads 0 (not -100)', n2.unexplained.v === 0 && n2.unexplained.why === null && n2.unexplained.restarts === 1 && traded >= 100, { u: n2.unexplained, traded });
    /* day 3: A restarts */
    clock.advance(86400000);
    await room._resetCharacterData(A);
    await settle();
    await walk();
    const n3 = await read();
    check('8. ...and the day A restarts, 0 again (not +100)', n3.unexplained.v === 0 && n3.unexplained.restarts === 1, n3.unexplained);
    /* the restart took B's record with it */
    const rec = st._store.get('rpg:' + B) || null;
    check('8. setup: B\'s record gone with the restart', !rec || !(rec.coins >= 100));
  } finally { clock.restore(); }
}

/* ── 9. gold a player-hour counts the sittings still open (sitting 10, M3) ── */
{
  const { econCompute } = await import('../../src/game/econCard.js');
  const { econCardRead } = await import('../src/econcard.js');
  const { makeStorage, openRoom } = await import('./testroom.mjs');
  const room = await openRoom(makeStorage());
  const now = Date.now();
  room.sessions.set({}, { id: 'bp_o1', openedAt: now - 1800 * 1000 });
  room.sessions.set({}, { id: 'bp_o1', openedAt: now - 1800 * 1000 });   /* a second tab: one sitting */
  room.sessions.set({}, { id: null, openedAt: now - 1800 * 1000 });      /* a socket that never joined */
  const c = await econCardRead(room, 1);
  const day = c.open && c.open.day;
  const n = econCompute({ days: [{ day, econ: { g: { mint: 100 }, p: { s: 0 } } }] }, c);
  const sinceMidnight = Math.round((now - Math.floor(now / 86400000) * 86400000) / 1000);
  const want = Math.min(1800, sinceMidnight);
  check('9. the route counts the sittings still open, today\'s part, once a player', c.open && c.open.sittings === 1 && Math.abs(c.open.s - want) <= 2, c.open);
  check('9. ...and 100 made in a sitting open half an hour reads 200 an hour (it read "not counted")', want === 1800 ? Math.abs(n.perHour.v - 200) < 1 : n.perHour.v > 0, n.perHour);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all econ-card checks passed');
process.exit(0);
