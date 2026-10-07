/* THE FEED & SEED'S ORDER BOARD -- v2.3.3134 (docs/specs/farm-orders.md).
 *
 * Owner: "Farming needs a purpose ... temporary buffs ... and source of
 * income."  The income: three orders a day, delivered from the bag for gold
 * and Farming XP.
 *
 *   1. The draw: PER_DAY orders from what this player's Farming and Cooking
 *      levels can fill, the same board for the same player and day, a
 *      different one on another day; every order pays more than Diego's
 *      opening price for its goods.
 *   2. farm_open carries today's board, and writes it the first time.
 *   3. A delivery takes exactly the goods, pays exactly the gold and XP,
 *      once; a second is refused; so is a short bag, a stale day or id, a gone
 *      order, a bad slot -- each changing nothing, each answered.
 *   4. A new UTC day draws a new board; levels gained mid-day do not change
 *      today's.
 *   5. One batch: the board's put and the save are issued in ONE synchronous
 *      run (no await between), the board first.
 *   6. The kill switch (`farmorders: false`) and the farm's own.
 *   7. A restart KEEPS the board (its done flags are the day's limit).
 *   v2.3.3134 (review): the record read fail-closed and stamped `v`, a later
 *   day never replaced by an earlier one, no delivery in a fight with a
 *   player, a short bag resent, the shared rate budget, and every bad slot
 *   answered with nothing at all.
 */
import { GameRoom } from '../src/index.js';
import { FARM_ORDERS, drawFarmOrders, farmOrderById, farmOrdersResetAt } from '../src/farmorders.js';
import { FARM, FARM_SHOP_BASE } from '../src/farm.js';
import { COOKING_RECIPES, DISHES, SHOP_ITEMS } from '../src/data.js';

/* v2.3.3134 (review): each put is tagged with the synchronous run it was
   issued in -- a microtask moves the run on, so two puts with no await
   between them share a tag (what Cloudflare commits as one batch). */
function makeState() {
  const store = new Map();
  const puts = [];
  const runs = [];
  let run = 0;
  let armed = false;
  return {
    _store: store,
    _puts: puts,
    _runs: runs,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => {
        if (!armed) { armed = true; queueMicrotask(() => { run += 1; armed = false; }); }
        puts.push(k); runs.push(run);
        store.set(k, JSON.parse(JSON.stringify(v)));
      },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* The worker's clock, movable, for tomorrow's board. */
const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;

const st = makeState();
const room = new GameRoom(st, mockEnv);
const settle = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
}
async function send(ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
}
const farmState = (ws) => { const m = ws.sent.filter((x) => x.type === 'farm_state'); return m.length ? m[m.length - 1].payload : null; };
const level = (ps, skill, lvl) => { if (!ps.lifeSkills) ps.lifeSkills = {}; ps.lifeSkills[skill] = { level: lvl, xp: 0 }; };

// ── 1. the draw ──
{
  const all = FARM_ORDERS.POOL;
  check('three orders a day (guard)', FARM_ORDERS.PER_DAY === 3);
  check('every order id is unique', new Set(all.map((o) => o.id)).size === all.length);
  /* Every key is something the farm's goods make: a crop the farm grows, or
     a recipe's dish/bottle -- and its levels are what that takes. */
  const cropItems = Object.values(FARM.CROPS);
  const recipeOf = (key) => COOKING_RECIPES.find((r) => r.makes === key);
  const bad = [];
  for (const o of all) {
    const crop = cropItems.find((c) => c.item === o.key);
    const r = recipeOf(o.key);
    if (!crop && !r) { bad.push({ id: o.id, why: 'nothing makes it' }); continue; }
    if (crop && (o.farm < crop.lvl || o.cook !== 0)) bad.push({ id: o.id, why: 'levels', farm: o.farm, crop: crop.lvl });
    if (r) {
      if (o.cook < (r.cookLvl || 1)) bad.push({ id: o.id, why: 'cook level', cook: o.cook, need: r.cookLvl });
      /* every ingredient grows at or below the order's Farming level */
      for (const ing of Object.keys(r.ingredients)) {
        const c = cropItems.find((x) => x.item === ing);
        if (!c || c.lvl > o.farm) bad.push({ id: o.id, why: 'ingredient level', ing, farm: o.farm });
      }
      if (!(Object.prototype.hasOwnProperty.call(DISHES, o.key) || Object.prototype.hasOwnProperty.call(SHOP_ITEMS, o.key))) bad.push({ id: o.id, why: 'not a dish or bottle' });
    }
    if (!(o.n >= 1 && o.gold >= 1 && o.xp >= 1)) bad.push({ id: o.id, why: 'numbers' });
  }
  check('every order is made from what the farm grows, at the levels it asks', bad.length === 0, bad);

  /* Every order pays more than Diego's opening price for its goods (half
     their base; a dish's goods are its ingredients -- he buys no dish). */
  const baseOf = (key) => Number(FARM_SHOP_BASE[key]) || 0;
  const goodsValue = (o) => {
    const r = recipeOf(o.key);
    if (!r) return o.n * baseOf(o.key) / 2;
    let v = 0;
    for (const [ing, q] of Object.entries(r.ingredients)) v += q * baseOf(ing) / 2;
    return o.n * v;
  };
  const cheap = all.filter((o) => !(o.gold > goodsValue(o))).map((o) => ({ id: o.id, gold: o.gold, diego: goodsValue(o) }));
  check('every order pays more than Diego would for its goods', cheap.length === 0, cheap);

  const a = drawFarmOrders('bp_x', 20261006, 1, 1);
  const b = drawFarmOrders('bp_x', 20261006, 1, 1);
  check('the same player and day draw the same board', JSON.stringify(a) === JSON.stringify(b), { a, b });
  check('...three different orders', a.length === 3 && new Set(a).size === 3, a);
  const lowFit = new Set(all.filter((o) => o.farm <= 1 && o.cook <= 1).map((o) => o.id));
  let onlyFit = true;
  let days = new Set();
  for (let d = 0; d < 40; d++) {
    const ids = drawFarmOrders('bp_x', 20261006 + d, 1, 1);
    days.add(ids.join());
    if (!ids.every((id) => lowFit.has(id))) onlyFit = false;
  }
  check('a new farmer is only ever asked for what Farming 1 and Cooking 1 make', onlyFit);
  check('...and the board changes from day to day', days.size > 1, days.size);
  let pies = false;
  for (let d = 0; d < 60 && !pies; d++) if (drawFarmOrders('bp_y', 20261006 + d, 10, 8).includes('pies')) pies = true;
  check('a Farming 10, Cooking 8 farmer can be asked for Pumpkin Pies', pies);
  let noPies = true;
  for (let d = 0; d < 60; d++) if (drawFarmOrders('bp_y', 20261006 + d, 10, 7).includes('pies')) noPies = false;
  check('...but not at Cooking 7', noPies);
  check('unknown ids are no order (and __proto__ is nothing)', farmOrderById('nope') === null && farmOrderById('__proto__') === null && farmOrderById('constructor') === null);
  const t = Date.UTC(2026, 9, 6, 13, 0, 0);
  check('the board turns over at the next UTC midnight', farmOrdersResetAt(t) === Date.UTC(2026, 9, 7));
}

// ── 2. farm_open carries the board ──
const ws = fakeWs();
const PID = 'bp_orders_a';
await join(ws, PID);
const P = room.playerState[PID];
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.farmorders is advertised', !!sync && sync.caps.farmorders === true, sync && sync.caps && sync.caps.farmorders);
  level(P, 'farming', 1); level(P, 'cooking', 1);
  await send(ws, 'farm_open', {});
  const fs = farmState(ws);
  check('farm_open answers with the farm AND today\'s board', !!fs && Array.isArray(fs.plots) && !!fs.orders && Array.isArray(fs.orders.list) && fs.orders.list.length === 3, fs && fs.orders);
  const today = room._cadencePeriodDaily(Date.now());
  check('...for today, turning over at midnight UTC', fs.orders.day === today && fs.orders.resetsAt === farmOrdersResetAt(Date.now()), fs.orders);
  const want = drawFarmOrders(PID, today, 1, 1);
  check('...the drawn board, each order as the worker knows it', JSON.stringify(fs.orders.list.map((o) => o.id)) === JSON.stringify(want)
    && fs.orders.list.every((o) => { const p = farmOrderById(o.id); return p && o.key === p.key && o.n === p.n && o.gold === p.gold && o.xp === p.xp && o.done === 0; }), fs.orders.list);
  const stored = st._store.get('farmorders:' + PID);
  check('...and written the first time it is drawn, stamped with its shape', !!stored && stored.day === today && JSON.stringify(stored.ids) === JSON.stringify(want) && stored.v === FARM_ORDERS.V, stored);
  /* Levels gained mid-day do not redraw today's board. */
  level(P, 'farming', 10); level(P, 'cooking', 8);
  await send(ws, 'farm_open', {});
  check('a level gained mid-day leaves today\'s board as it was', JSON.stringify(farmState(ws).orders.list.map((o) => o.id)) === JSON.stringify(want));
}

// ── 3. a delivery ──
const board = () => farmState(ws) && farmState(ws).orders;
let today = room._cadencePeriodDaily(Date.now());
{
  await send(ws, 'farm_open', {});
  const o0 = board().list[0];
  const deliver = (slot, extra) => send(ws, 'farm_order', Object.assign({ slot, day: today, id: board() ? board().list[slot].id : '' }, extra || {}));

  /* Short: nothing changes. */
  P.inventory = Object.create(null);
  P.inventory[o0.key] = o0.n - 1;
  const coins0 = P.coins = 100;
  const xp0 = (P.lifeSkills.farming.xp || 0);
  await send(ws, 'farm_order', { slot: 0, day: today, id: o0.id });
  let fs = farmState(ws);
  check('one short of the order: refused, "order-short"', fs && fs.err === 'order-short' && fs.did && fs.did.n === 0, fs);
  check('...the bag, the gold and the XP untouched', P.inventory[o0.key] === o0.n - 1 && P.coins === coins0 && (P.lifeSkills.farming.xp || 0) === xp0);
  check('...and the bag sent again (the phone thought it had enough)', ws.sent.some((m) => m.type === 'player_state' && m.payload && m.payload.inventory && m.payload.inventory[o0.key] === o0.n - 1), ws.sent.map((m) => m.type));

  /* Enough, plus some. */
  P.inventory[o0.key] = o0.n + 2;
  const lvl0 = P.lifeSkills.farming.level;
  await send(ws, 'farm_order', { slot: 0, day: today, id: o0.id });
  fs = farmState(ws);
  check('a delivery takes exactly the order from the bag', P.inventory[o0.key] === 2, P.inventory);
  check('...pays exactly its gold', P.coins === coins0 + o0.gold, { coins: P.coins, want: coins0 + o0.gold });
  const ls = P.lifeSkills.farming;
  check('...and its Farming XP', ls.level > lvl0 || ls.xp === xp0 + o0.xp, ls);
  check('...answers with what it paid, and the order done', fs && fs.did && fs.did.op === 'order' && fs.did.n === 1 && fs.did.gold === o0.gold && fs.did.xp === o0.xp
    && fs.did.item === o0.key && fs.did.count === o0.n && fs.orders.list[0].done === 1, fs);
  check('...and sends the bag and the gold to the phone', ws.sent.some((m) => m.type === 'player_state'));
  const stored = st._store.get('farmorders:' + PID);
  check('...the board on the books says so', stored && stored.done[0] === 1, stored);
  const saved = st._store.get('rpg:' + PID);
  check('...and so does the saved character', saved && saved.coins === coins0 + o0.gold && (saved.inventory || {})[o0.key] === 2, saved && { coins: saved.coins, inv: saved.inventory });

  /* Again: refused, nothing paid. */
  P.inventory[o0.key] = o0.n * 3;
  const c1 = P.coins;
  await send(ws, 'farm_order', { slot: 0, day: today, id: o0.id });
  fs = farmState(ws);
  check('the same order again: refused, "order-done", nothing taken or paid', fs.err === 'order-done' && P.coins === c1 && P.inventory[o0.key] === o0.n * 3, fs);

  /* A stale day or id: refused, and the board as it is now comes back. */
  const o1 = board().list[1];
  P.inventory[o1.key] = o1.n;
  const c2 = P.coins;
  await send(ws, 'farm_order', { slot: 1, day: today - 1, id: o1.id });
  fs = farmState(ws);
  check('a delivery for yesterday\'s board is refused ("order-stale") -- never today\'s slot 1 instead', fs.err === 'order-stale' && P.coins === c2 && P.inventory[o1.key] === o1.n && fs.orders.day === today, fs);
  await send(ws, 'farm_order', { slot: 1, day: today, id: o0.id });
  fs = farmState(ws);
  check('...and one naming another order than the slot holds', fs.err === 'order-stale' && P.coins === c2, fs);
  await send(ws, 'farm_order', { slot: 1, day: today });
  check('...or no order at all', farmState(ws).err === 'order-stale' && P.coins === c2);

  /* Bad slots: nothing at all -- not even an answer (the slot guard, not the
     id check, turns them away). */
  const answered = [];
  for (const slot of [-1, 3, 1.5, '0', '1', null, '__proto__', 1e9, [1]]) {
    ws.sent.length = 0;
    await room.webSocketMessage(ws, JSON.stringify({ type: 'farm_order', payload: { slot, day: today, id: o1.id } }));
    await settle();
    if (ws.sent.some((m) => m.type === 'farm_state')) answered.push(slot);
  }
  check('a slot that is not 0, 1 or 2 is not an order: nothing paid, nothing answered', P.coins === c2 && P.inventory[o1.key] === o1.n && answered.length === 0, answered);

  /* A gone order (an id this worker does not know): shown gone, never paid. */
  const rec = st._store.get('farmorders:' + PID);
  rec.ids[2] = 'from_a_newer_worker';
  st._store.set('farmorders:' + PID, rec);
  await send(ws, 'farm_open', {});
  check('an order this worker does not know shows as gone', board().list[2].gone === 1 && board().list[2].id === '', board().list[2]);
  await send(ws, 'farm_order', { slot: 2, day: today, id: 'from_a_newer_worker' });
  check('...and cannot be delivered', farmState(ws).err === 'order-gone' && P.coins === c2, farmState(ws));

  /* v2.3.3134 (review): the board on the books is read FAIL-CLOSED -- its
     done flags are the only thing between a delivery and a second pay. */
  const odd = { v: 1, day: today, ids: [o0.id, o1.id, 7], done: [0, 'yes', 2] };
  st._store.set('farmorders:' + PID, odd);
  await send(ws, 'farm_open', {});
  let healed = board();
  check('a done flag that is not exactly 0 reads as DONE; an id that is not a string is gone',
    healed.list[0].done === 0 && healed.list[1].done === 1 && healed.list[2].gone === 1 && healed.list[2].done === 1, healed.list);
  P.inventory[o1.key] = o1.n;
  await send(ws, 'farm_order', { slot: 1, day: today, id: o1.id });
  check('...so it cannot be delivered again', farmState(ws).err === 'order-done' && P.coins === c2 && P.inventory[o1.key] === o1.n, farmState(ws));
  check('...and the record is left as it was (never rewritten as undelivered)', JSON.stringify(st._store.get('farmorders:' + PID)) === JSON.stringify(odd));
  const shapeless = { v: 1, day: today, slots: [{ id: o1.id, done: 1 }] };
  st._store.set('farmorders:' + PID, shapeless);
  await send(ws, 'farm_open', {});
  healed = board();
  check('today\'s record in a shape this worker cannot read delivers nothing', healed.day === today && healed.list.every((x) => x.gone === 1 && x.done === 1), healed.list);
  check('...and is not drawn over', JSON.stringify(st._store.get('farmorders:' + PID)) === JSON.stringify(shapeless));
  const newer = { v: FARM_ORDERS.V + 1, day: String(today), list: [{ id: o1.id, done: Date.now() }] };
  st._store.set('farmorders:' + PID, newer);
  await send(ws, 'farm_open', {});
  fs = farmState(ws);
  check('a newer worker\'s record: no board (orders null), the farm still answers', Object.prototype.hasOwnProperty.call(fs, 'orders') && fs.orders === null && Array.isArray(fs.plots), fs);
  await send(ws, 'farm_order', { slot: 1, day: today, id: o1.id });
  fs = farmState(ws);
  check('...a delivery against it is refused "newer", nothing paid', fs.err === 'newer' && fs.orders === null && P.coins === c2 && P.inventory[o1.key] === o1.n, fs);
  check('...and the newer record is never written over', JSON.stringify(st._store.get('farmorders:' + PID)) === JSON.stringify(newer));
  /* A worker clock that steps back across midnight keeps the later board. */
  const tmrw = room._cadencePeriodDaily(Date.now() + 86400000);
  const later = { v: 1, day: tmrw, ids: [o0.id, o1.id, o0.id], done: [1, 1, 0] };
  st._store.set('farmorders:' + PID, later);
  await send(ws, 'farm_open', {});
  check('a board dated LATER than the worker\'s today is kept, never replaced by an earlier day\'s', board().day === tmrw && board().list[0].done === 1 && JSON.stringify(st._store.get('farmorders:' + PID)) === JSON.stringify(later), board());
  await send(ws, 'farm_order', { slot: 1, day: tmrw, id: o1.id });
  check('...its delivered orders stay delivered', farmState(ws).err === 'order-done' && P.coins === c2, farmState(ws));
  st._store.set('farmorders:' + PID, rec);
}

// ── 3b. not in a fight with a player ──
{
  await send(ws, 'farm_open', {});
  const slot = board().list.findIndex((x) => !x.done && !x.gone);
  const o = farmOrderById(board().list[slot].id);
  P.inventory[o.key] = o.n;
  const c = P.coins;
  room._notePvpExchange(PID, 'bp_someone', Date.now());
  await send(ws, 'farm_order', { slot, day: today, id: o.id });
  check('within 10 s of a hit between players: refused "order-fight", nothing taken or paid', farmState(ws).err === 'order-fight' && P.coins === c && P.inventory[o.key] === o.n, farmState(ws));
  const realDuel = room._duelFor;
  room._duelFor = (id) => (id === PID ? { status: 'active', a: PID, b: 'bp_someone' } : null);
  skew += 10001;
  await send(ws, 'farm_order', { slot, day: today, id: o.id });
  check('...and in a duel', farmState(ws).err === 'order-fight' && P.coins === c, farmState(ws));
  room._duelFor = realDuel;
  await send(ws, 'farm_order', { slot, day: today, id: o.id });
  check('...and delivered once the fight is over', farmState(ws).did && farmState(ws).did.n === 1 && P.coins === c + o.gold, farmState(ws));
  today = room._cadencePeriodDaily(Date.now());
}

// ── 4. a new day ──
{
  skew += 86400000;
  const tomorrow = room._cadencePeriodDaily(Date.now());
  await send(ws, 'farm_open', {});
  const fs = farmState(ws);
  check('a new UTC day: a new board, nothing done', fs.orders.day === tomorrow && tomorrow !== today && fs.orders.list.every((o) => o.done === 0), fs.orders);
  check('...drawn for the levels the player has NOW', JSON.stringify(fs.orders.list.map((o) => o.id)) === JSON.stringify(drawFarmOrders(PID, tomorrow, 10, 8)));
  today = tomorrow;
  /* A delivery is the first read of a day too: it draws, writes, and checks
     the day it was sent against the new board. */
  skew += 86400000;
  const day3 = room._cadencePeriodDaily(Date.now());
  const ids3 = drawFarmOrders(PID, day3, 10, 8);
  const o = farmOrderById(ids3[0]);
  P.inventory[o.key] = o.n;
  const c = P.coins;
  await send(ws, 'farm_order', { slot: 0, day: today, id: board().list[0].id });
  check('a tap left over from yesterday\'s window is refused against today\'s board', farmState(ws).err === 'order-stale' && P.coins === c && farmState(ws).orders.day === day3, farmState(ws));
  check('...which is written, and is the one delivered next', st._store.get('farmorders:' + PID).day === day3);
  await send(ws, 'farm_order', { slot: 0, day: day3, id: o.id });
  check('...and delivers', P.coins === c + o.gold && farmState(ws).did.n === 1, farmState(ws));
  today = day3;
}

// ── 5. one batch, the board first ──
{
  const o = farmOrderById(board().list[1].id);
  P.inventory[o.key] = o.n;
  st._puts.length = 0; st._runs.length = 0;
  /* Count the puts issued in the delivery's own synchronous run. */
  let issued = null;
  const origSave = room._saveRpg.bind(room);
  room._saveRpg = (pid, ps) => { if (issued === null) issued = st._puts.slice(); return origSave(pid, ps); };
  await send(ws, 'farm_order', { slot: 1, day: today, id: o.id });
  room._saveRpg = origSave;
  check('a delivery (guard)', farmState(ws).did && farmState(ws).did.n === 1, farmState(ws));
  check('the board\'s put is issued before the save (a crash loses a pay, never pays twice)',
    Array.isArray(issued) && issued[issued.length - 1] === 'farmorders:' + PID, issued);
  const ib = st._puts.lastIndexOf('farmorders:' + PID);
  const ir = st._puts.lastIndexOf('rpg:' + PID);
  check('...and both in ONE synchronous run, no await between (one batch, rule 8)', ib >= 0 && ir > ib && st._runs[ib] === st._runs[ir], { puts: st._puts, runs: st._runs });
}

// ── 6. the kill switches ──
{
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { farmorders: false });
  await send(ws, 'farm_open', {});
  let fs = farmState(ws);
  check('farmorders:false -- farm_open sends the farm with the board as null (the window drops the one it showed)',
    Array.isArray(fs.plots) && Object.prototype.hasOwnProperty.call(fs, 'orders') && fs.orders === null, fs);
  const o = farmOrderById(st._store.get('farmorders:' + PID).ids[2]);
  if (o) P.inventory[o.key] = o.n;
  const c = P.coins;
  await send(ws, 'farm_order', { slot: 2, day: today, id: o ? o.id : '' });
  fs = farmState(ws);
  check('...and refuses a delivery with "off" and the board null, nothing paid', fs.err === 'off' && Object.prototype.hasOwnProperty.call(fs, 'orders') && fs.orders === null && P.coins === c, fs);
  const ws2 = fakeWs();
  await join(ws2, 'bp_orders_b');
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and un-advertises caps.farmorders', !!sync && sync.caps.farmorders === false, sync && sync.caps && sync.caps.farmorders);
  delete room._liveFlags.farmorders;
  room._liveFlags = Object.assign({}, room._liveFlags, { farm: false });
  await send(ws, 'farm_order', { slot: 2, day: today, id: o ? o.id : '' });
  check('the farm\'s own switch (farm:false) closes the board too', farmState(ws).err === 'off' && P.coins === c);
  delete room._liveFlags.farm;
}

// ── 6b. the farm's shared rate budget ──
{
  room._farmRate = new Map();
  let answers = 0;
  const id0 = st._store.get('farmorders:' + PID).ids[0];
  for (let i = 0; i < FARM.MSG_PER_MIN + 1; i++) {
    await send(ws, 'farm_order', { slot: 0, day: today, id: id0 });
    if (ws.sent.some((m) => m.type === 'farm_state')) answers += 1;
  }
  check(`farm_order counts in the farm's ${FARM.MSG_PER_MIN} a minute: the next one goes unanswered`, answers === FARM.MSG_PER_MIN, answers);
  room._farmRate = new Map();
}

// ── 7. a restart keeps the board ──
{
  const before = JSON.stringify(st._store.get('farmorders:' + PID));
  check('the board is on the books, an order delivered (guard)', !!st._store.get('farmorders:' + PID) && st._store.get('farmorders:' + PID).done.some((d) => d === 1));
  await room._resetCharacterData(PID);
  check('a character restart KEEPS today\'s board, its delivered orders delivered (the day\'s limit)', JSON.stringify(st._store.get('farmorders:' + PID)) === before, st._store.get('farmorders:' + PID));
}

// ── 8. the phone can name and draw every order ──
{
  const { FARM_ITEM_NAMES, farmLookFor } = await import('../../src/data/farmCrops.js');
  const { DISH_NAMES, dishFor } = await import('../../src/data/dishes.js');
  /* The bag's ITEM_NAMES (InventoryPanel.jsx, which node cannot load) is these
     two tables plus the bottles' own names -- the Stamina Tonic among them,
     drawn by the bag's own picture of it (thumbFor: potion-stamina.webp). */
  const BOTTLES = { staminaSalts: 'Stamina Tonic' };
  const unnamed = FARM_ORDERS.POOL.filter((o) => !(FARM_ITEM_NAMES[o.key] || DISH_NAMES[o.key] || BOTTLES[o.key])).map((o) => o.key);
  check('the phone names every order\'s goods (never "Goods")', unnamed.length === 0, unnamed);
  const undrawn = FARM_ORDERS.POOL.filter((o) => !(farmLookFor(o.key) || (dishFor(o.key) && dishFor(o.key).look) || BOTTLES[o.key])).map((o) => o.key);
  check('...and has a picture for each', undrawn.length === 0, undrawn);
}

Date.now = realNow;
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
