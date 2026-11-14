/* ═══ v2.3.5084: THE WORLD'S SUM (grand plan step 4.4, card E PR 5) ═══
 *
 * "A purse equals its start plus the roads that ran" is true by
 * construction, and past copies went through LEGAL roads (one stack of ore
 * sold 24 times in one bundle).  So the whole world is summed, one kind of
 * value at a time (docs/SHAPES.md part 3, "What is summed"):
 *
 *     everything held  ==  the start  +  minted  -  burned
 *
 * "Held" is every record the registry's marks say holds value
 * (server/src/storagemarks.js): purses and bags (a character live in the
 * room, or stored while away), vaults, mail waiting, every escrow, Diego's
 * pile, the piles on the ground.  "Minted" and "burned" are each character's
 * own `_econ` (rule 1's second exception, written in the purse's own put by
 * the two doors: gold.js, bag.js), what the bag door counted beside a bag no
 * save has named yet, and the minted part of mail still waiting (its class by
 * its opId: gold.js MAIL_CLASSES).  `unexplained` is how far the two sides
 * have moved apart since the start: it must stay 0.
 *
 *   1. THE SCENARIO: a room plays the bank, the gamble, Diego's pile, the
 *      trade window, a death and its pile, the mail (a grant waiting, a
 *      daily quest landing, a duel's pot) -- through the real handlers.
 *      Unexplained gold 0, every bag key 0; no gear or pet held twice.
 *   2. A PLANTED DOUBLE PAY THROUGH A LEGAL ROAD is seen: a vault paid out
 *      with no vault behind it, a pile's goods given with no pile, a
 *      duel's pot paid twice by the mail, a trade's gold taken with no
 *      other side.
 *   3. A VALUE RECORD THE MARKS DO NOT COUNT is seen: a stored key with no
 *      marks, and a marked value prefix the sum has no reader for.
 *   4. The three lines outside card E's own files the sum needed (the
 *      owner's yes, 2026-11-14): the join brings `_econ` back before any
 *      door runs, a red skull killed by a monster BURNS its purse
 *      (nml_lost), and the champion's prize says the house's part.
 *
 * BREAK PROOF (rule 8), tried by hand: `WORLD_SUM_PLANT=1 node
 * test/world-sum.test.mjs` plants §2's vault double pay INTO §1's world,
 * and §1 fails ("unexplained gold 50").
 */
import { GameRoom } from '../src/index.js';
import { STORAGE_MARKS } from '../src/storagemarks.js';
import { bagGive } from '../src/bag.js';
import { BANK } from '../src/bank.js';
/* v2.3.5091: the sum moved to worldsum.mjs whole (the storm judges with it too) */
import { READERS, count, unexplained } from './worldsum.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}

let NOW = 1_800_000_000_000;
Date.now = () => NOW;
let seed = 7;
const realRandom = Math.random;
Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

/* storage as a Durable Object's: a copy of what is put, listed in key order */
function makeState() {
  const store = new Map();
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    _store: store,
    storage: {
      async get(k) {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (store.has(x)) r.set(x, clone(store.get(x))); return r; }
        return clone(store.get(k));
      },
      async put(k, v) {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, clone(vv)); return; }
        store.set(k, clone(v));
      },
      async delete(k) { if (Array.isArray(k)) { let n = 0; for (const x of k) if (store.delete(x)) n++; return n; } return store.delete(k); },
      async list(o) {
        let keys = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort();
        if (o?.startAfter) keys = keys.filter((k) => k > o.startAfter);
        if (o?.reverse) keys.reverse();
        if (o?.limit) keys = keys.slice(0, o.limit);
        const out = new Map();
        for (const k of keys) out.set(k, clone(store.get(k)));
        return out;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
const settle = () => new Promise((r) => setTimeout(r, 5));

/* ══════════════════════════ THE ROOM ══════════════════════════ */
async function world() {
  const state = makeState();
  /* the characters, on file before anyone joins (a test seeds a character
     by putting its record first: CLAUDE.md §5); D stays away */
  const rec = (coins, inventory) => ({ _v: 21, coins, inventory, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
  state._store.set('rpg:bp_ws_a', rec(1000, { wood_oak: 10, fish_minnow: 20, 'slime-remnants': 10 }));
  state._store.set('rpg:bp_ws_b', rec(800, { ore_iron_ore: 6 }));
  state._store.set('rpg:bp_ws_d', rec(50, {}));
  const room = new GameRoom(state, mockEnv);
  room._liveFlags = {};
  const ws = {};
  for (const n of ['a', 'b']) {
    ws[n] = fakeWs();
    room.sessions.set(ws[n], { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws[n], JSON.stringify({ type: 'join', id: 'bp_ws_' + n, name: n.toUpperCase(), phrase: 'p-' + n, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
    await settle();
  }
  await room._shopStock();   /* Diego's pile seeds itself once, the first time it is read: before the start */
  await settle();
  return { room, state, ws, A: room.playerState.bp_ws_a, B: room.playerState.bp_ws_b };
}
const send = async (room, w, type, payload) => { await room.webSocketMessage(w, JSON.stringify({ type, payload: payload || {} })); await settle(); };

/* ══════════════════════════ 1. THE SCENARIO ══════════════════════════ */
{
  const { room, state, ws, A, B } = await world();
  check('1. the room holds A and B, D is away', !!A && !!B && !room.playerState.bp_ws_d && A.coins === 1000);
  const start = count(room, state);
  check('1. at the start, every record is marked and every marked value record has a reader', start.unmarked.length === 0 && start.noReader.length === 0, { unmarked: start.unmarked, noReader: start.noReader });
  const steps = [];
  const note = (what) => { const u = unexplained(start, count(room, state)); steps.push([what, u.gold, Object.keys(u.goods).length ? u.goods : 0]); };

  /* the bank: gold and goods in and out (escrow) */
  {
    const c = room._wheelT().WHEEL_CENTRE;
    A.z = 'wheel'; A.x = c[0] + BANK.DOOR[0] + 40; A.y = c[1] + BANK.DOOR[1] + 150; A.dead = false; A.dying = false;
    await send(room, ws.a, 'bank_open');
    await send(room, ws.a, 'bank_deposit', { kind: 'gold', n: 300, opId: 'ws-1' });
    await send(room, ws.a, 'bank_deposit', { kind: 'item', id: 'wood_oak', n: 4, opId: 'ws-2' });
    await send(room, ws.a, 'bank_withdraw', { kind: 'gold', n: 120, opId: 'ws-3' });
    await send(room, ws.a, 'bank_withdraw', { kind: 'item', id: 'wood_oak', n: 1, opId: 'ws-4' });
    check('1. the bank moved gold and goods (a vault on file)', A.coins === 820 && A.inventory.wood_oak === 7 && !!state._store.get('bank:bp_ws_a'), { coins: A.coins, wood: A.inventory.wood_oak });
    note('bank');
  }
  /* the gamble: a win (mint) and a loss (burn) */
  {
    Math.random = () => 0.0; await send(room, ws.a, 'gamble_request', { wager: 100 });
    A._lastGambleAt = 0;
    Math.random = () => 0.99; await send(room, ws.a, 'gamble_request', { wager: 50 });
    Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    check('1. the gamble won 100 and lost 50', A.coins === 870, A.coins);
    note('gamble');
  }
  /* Diego: A sells into his pile, B buys from it (goods in escrow, gold minted and burned) */
  {
    await send(room, ws.a, 'shop_sell', { key: 'slime-remnants', qty: 10 });
    await send(room, ws.b, 'shop_buy', { key: 'slime-remnants', qty: 2 });
    check('1. A sold 10 to Diego, B bought 2 from his pile', !A.inventory['slime-remnants'] && B.inventory['slime-remnants'] === 2, { a: A.inventory['slime-remnants'], b: B.inventory['slime-remnants'] });
    note('shop');
  }
  /* the trade window: gold and goods both ways (moves, by the mail) */
  {
    for (const p of [A, B]) { p.z = 'town'; p.x = 0; p.y = 0; }
    const a0 = A.coins, b0 = B.coins;
    await send(room, ws.a, 'trade2_open', { target: 'bp_ws_b' });
    await send(room, ws.b, 'trade2_open', { target: 'bp_ws_a' });
    await send(room, ws.a, 'trade2_set', { offer: { fish_minnow: 5, _gold: 200 } });
    await send(room, ws.b, 'trade2_set', { offer: { ore_iron_ore: 2 } });
    await send(room, ws.a, 'trade2_ready', { ready: true });
    await send(room, ws.b, 'trade2_ready', { ready: true });
    for (const s2 of (room._trades2 || new Map()).values()) s2.changedAt = Date.now() - 999999;
    await send(room, ws.a, 'trade2_confirm');
    await send(room, ws.b, 'trade2_confirm');
    check('1. the trade settled: 200 gold and 5 fish to B, 2 ore to A', B.inventory.fish_minnow === 5 && A.inventory.ore_iron_ore === 2 && A.coins === a0 - 200 && B.coins === b0 + 200, { a: A.coins - a0, b: B.coins - b0, fish: B.inventory.fish_minnow, ore: A.inventory.ore_iron_ore });
    note('trade');
  }
  /* the mail: a grant to D, who is away (a mint waiting), D comes in and it
     lands; a daily quest's gold lands on B at once (a mint); a duel's pot,
     its escrow on file, lands on A (an escrow paid on) */
  {
    await room._creditPlayer('bp_ws_d', { opId: 'admin:g1', source: 'admin', kind: 'gold', payload: { amount: 75 }, note: 'grant' });
    check('1. a grant to D, away, waits in the mail', Array.isArray(state._store.get('inbox:bp_ws_d')) && state._store.get('inbox:bp_ws_d').length === 1);
    note('grant waiting');
    ws.d = fakeWs();
    room.sessions.set(ws.d, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws.d, JSON.stringify({ type: 'join', id: 'bp_ws_d', name: 'D', phrase: 'p-d', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
    await settle();
    check('1. D comes in and the grant lands', room.playerState.bp_ws_d && room.playerState.bp_ws_d.coins === 125, room.playerState.bp_ws_d && room.playerState.bp_ws_d.coins);
    note('grant landed');
    await room._creditPlayer('bp_ws_b', { opId: 'dq:bp_ws_b:20270115:0', source: 'daily', kind: 'gold', payload: { amount: 40 }, note: 'a daily quest' });
    note('daily quest');
    /* the duel's start, as duel.js makes it: both stakes and the escrow's
       record in one run (_escrowDebitGoldTogether) */
    const staked = await room._escrowDebitGoldTogether(
      [{ id: 'bp_ws_a', amount: 30, opId: 'duel:d1:a' }, { id: 'bp_ws_b', amount: 30, opId: 'duel:d1:b' }],
      [['duelEscrow:d1', { a: 'bp_ws_a', b: 'bp_ws_b', wager: 30, startedAt: NOW }]]);
    check('1. a duel\'s two stakes went into its escrow together', !!staked && staked.ok && !!state._store.get('duelEscrow:d1'), staked);
    note('duel staked');
    await room._creditPlayer('bp_ws_a', { opId: 'duelpot:d1', source: 'duel', kind: 'gold', payload: { amount: 60 }, note: 'duel won' });
    await state.storage.delete('duelEscrow:d1');
    note('duel pot');
    /* goods by the mail: a quest's item, the bag full (a mint) */
    await room._creditPlayer('bp_ws_b', { opId: 'questitem:bp_ws_b:q1:fish_minnow#1', source: 'quest', kind: 'item', payload: { invKey: 'fish_minnow', count: 3 }, note: 'a quest item' });
    note('quest item by the mail');
    /* the champion's prize: three entries held (escrow), and the house's
       gold on top (a mint), in ONE payout that says the house's part */
    const D = room.playerState.bp_ws_d;
    for (const [id, ps] of [['bp_ws_a', A], ['bp_ws_b', B], ['bp_ws_d', D]]) {
      room._goldTake(ps, 100, 'arena_entry');
      state._store.set('arena_entry:t9:' + id, { wager: 100, paidAt: NOW, n: 1 });
    }
    note('arena entries');
    await room._creditPlayer('bp_ws_d', { opId: 'arenapot:t9', source: 'arena', kind: 'gold', payload: { amount: 500, house: 200 }, note: 'Gladiator Arena champion' });
    for (const id of ['bp_ws_a', 'bp_ws_b', 'bp_ws_d']) await state.storage.delete('arena_entry:t9:' + id);
    check('1. the champion was paid 500: 300 from the entries, 200 the house\'s', D.coins === 125 - 100 + 500, D.coins);
    note('arena prize');
  }
  /* a death outside town: the bag to the pile on the ground (escrow), B takes it (escrow) */
  {
    const c = room._wheelT().WHEEL_CENTRE;
    A.z = 'wheel'; A.x = c[0] + 4000; A.y = c[1] + 4000;
    NOW += 60000;
    room._handlePlayerDeath(A, 'bp_ws_a', 'monster');
    await settle();
    const pile = (room.loot[A.z] || []).find((p) => p.isDeathDrop && !p.inventoryClaimed);
    check('1. A died: the bag went to a pile on the ground', !!pile && (pile.deathItems || []).length > 0, pile && pile.deathItems);
    note('death');
    NOW += (room.DEATH_OWNER_ONLY_MS || 60000) + 1000;
    B.z = A.z; B.x = pile.x; B.y = pile.y; B.dead = false; B.dying = false; B.hp = 100;
    const sessB = [...room.sessions.values()].find((x) => x.id === 'bp_ws_b');
    room._handleLootPickup(sessB, { lootId: pile.lootId, zone: pile.zone });
    await settle();
    check('1. B took the pile whole', pile.inventoryClaimed === true, pile.inventoryClaimed);
    note('pickup');
  }
  /* saves and a leave: what is written must say what memory said */
  {
    for (const id of ['bp_ws_a', 'bp_ws_b', 'bp_ws_d']) room._saveRpg(id, room.playerState[id]);
    await settle();
    note('saves');
    room.sessions.delete(ws.b);
    delete room.playerState.bp_ws_b;
    note('B away (counted from the record on file)');
  }
  if (process.env.WORLD_SUM_PLANT === '1') { room._goldGive(A, 50, 'bank_withdraw'); note('PLANTED: a vault paid out twice'); }
  const end = count(room, state);
  const u = unexplained(start, end);
  const bad = steps.filter(([, g, s]) => g !== 0 || s !== 0);
  check('1. after every step, unexplained gold 0 and every bag key 0', bad.length === 0, bad);
  check(`1. at the end: unexplained gold ${u.gold}`, u.gold === 0, u);
  check('1. ...and no bag key unexplained', Object.keys(u.goods).length === 0, u.goods);
  check('1. no piece of gear or pet is held twice', end.dup.length === 0, end.dup);
  check('1. every record is marked and every marked value record has a reader, at the end too', end.unmarked.length === 0 && end.noReader.length === 0, { unmarked: end.unmarked, noReader: end.noReader });
  check('1. value moved: gold was minted and burned (the scenario is not empty)', end.net.gold !== start.net.gold, end.net);
}

/* ══════════════════════════ 2. PLANTED DOUBLE PAYS ══════════════════════════ */
for (const [what, plant, wantGold, wantGoods] of [
  ['a vault paid out with no vault behind it (bank_withdraw, an escrow road)', ({ room, A }) => room._goldGive(A, 50, 'bank_withdraw'), 50, null],
  ['a pile\'s goods given with no pile (loot_death_items, an escrow road)', ({ B }) => bagGive(B.inventory, 'ore_copper', 3, 'loot_death_items'), 0, { ore_copper: 3 }],
  ['a duel\'s pot paid twice by the mail (duelpot, an escrow by its word)', async ({ room }) => {
    await room._creditPlayer('bp_ws_b', { opId: 'duelpot:twice', source: 'duel', kind: 'gold', payload: { amount: 100 }, note: 'x' });
  }, 100, null],
  ['a trade\'s gold taken with no other side (trade_window, a move road)', ({ room, A }) => room._goldTake(A, 40, 'trade_window'), -40, null],
]) {
  const w = await world();
  const s0 = count(w.room, w.state);
  await plant(w);
  await settle();
  const u = unexplained(s0, count(w.room, w.state));
  const goodsOk = wantGoods ? JSON.stringify(Object.fromEntries(Object.entries(u.goods))) === JSON.stringify(wantGoods) : Object.keys(u.goods).length === 0;
  check('2. PLANTED, and seen: ' + what + ` -> unexplained gold ${u.gold}` + (wantGoods ? ', goods ' + JSON.stringify(u.goods) : ''), u.gold === wantGold && goodsOk, u);
}
{
  /* the same roads, honestly run, are not seen */
  const w = await world();
  const s0 = count(w.room, w.state);
  w.room._goldGive(w.A, 25, 'quest_reward');                    /* a mint: counted */
  bagGive(w.B.inventory, 'ore_copper', 2, 'harvest');           /* a mint: counted */
  const u = unexplained(s0, count(w.room, w.state));
  check('2. ...while an honest mint of gold and of goods is explained (0)', u.gold === 0 && Object.keys(u.goods).length === 0, u);
}

/* ══════════════════════════ 3. VALUE THE MARKS DO NOT COUNT ══════════════════════════ */
{
  const w = await world();
  w.state._store.set('vault2:bp_ws_a', { gold: 10 });
  const c = count(w.room, w.state);
  check('3. a stored record with no marks is seen (it holds what nobody counts)', c.unmarked.includes('vault2:bp_ws_a'), c.unmarked);
  const fewer = { ...READERS };
  delete fewer['bounty:'];
  const c2 = count(w.room, makeState(), fewer);
  check('3. a marked value record with no reader is seen (bounty: without its reader)', c2.noReader.join() === 'bounty:', c2.noReader);
  check('3. every marked value prefix has its reader today, and no reader is for a prefix not marked as value',
    Object.entries(STORAGE_MARKS).filter(([, m]) => m.value !== 'none').every(([p]) => READERS[p]) && Object.keys(READERS).every((p) => STORAGE_MARKS[p] && STORAGE_MARKS[p].value !== 'none'));
}

/* ══════════════════════════ 4. THE THREE LINES OUTSIDE ══════════════════════════ */
{
  /* the join brings _econ back before any door runs */
  const w = await world();
  const stored = w.state._store.get('rpg:bp_ws_a');
  check('4. the join brought A\'s _econ back (it was on file; the start\'s join counted nothing over it)', !!w.A._econ && w.A._econ.g.m === stored._econ.g.m, { live: w.A._econ, stored: stored._econ });
  /* a red skull killed by a monster burns its purse; by a player it moves */
  const { NML } = await import('../src/nomansland.js').catch(() => ({}));
  const ps = w.A;
  ps._nml = { red: 60000, white: 0 };
  const c = w.room._wheelT().WHEEL_CENTRE;
  ps.z = 'wheel'; ps.x = c[0] + 4000; ps.y = c[1] + 4000;
  const s0 = count(w.room, w.state);
  const before = ps.coins;
  if (typeof w.room._nmlOnDeath === 'function') w.room._nmlOnDeath(ps, 'bp_ws_a', 'monster');
  const u = unexplained(s0, count(w.room, w.state));
  check(`4. a red skull killed by a monster: the purse (${before}) burned through nml_lost, nothing unexplained`, ps.coins === 0 && u.gold === 0 && w.A._econ.g.b >= before, { coins: ps.coins, u, econ: w.A._econ && w.A._econ.g, NML: !!NML });
  /* the champion's prize carries the house's part */
  const { GOLD_ROADS } = await import('../src/gold.js');
  check('4. nml_lost is its own burn road', GOLD_ROADS.nml_lost && GOLD_ROADS.nml_lost.class === 'burn' && GOLD_ROADS.nml_loss.class === 'move');
  const src = (await import('node:fs')).readFileSync(new URL('../src/gladiator.js', import.meta.url), 'utf8');
  check('4. the champion\'s prize says the house\'s part (payload.house)', /opId: 'arenapot:' \+ tid[^\n]*payload: \{ amount: prize, house: /.test(src));
}

Math.random = realRandom;
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all world-sum checks passed');
process.exit(0);
