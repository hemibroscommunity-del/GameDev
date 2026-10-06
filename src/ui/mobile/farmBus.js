/* ═══ v2.3.3102: THE FARM'S STATE, OUTSIDE REACT ═══
 *
 * What the worker last said about this player's farm (server/src/farm.js),
 * for the Feed & Seed window to draw.  Outside the component tree for the
 * aceFlipBus reason: the thing that WRITES it is a WebSocket handler
 * (wsClient.js's direct 'farm_state' case), and the window may not even be
 * open.
 *
 * NOTHING HERE DECIDES ANYTHING.  `view` is only ever the worker's farm_state;
 * the window sends a request and draws the answer.  A bed is ripe when the
 * worker's clock says so, and the worker's clock is reconstructed here as
 * Date.now() + `offset`, the gap measured when its last message arrived --
 * so a phone whose own clock is minutes off still counts down to the moment
 * the worker will actually pay (a phone's clock is never the date). */
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

/* How long a request may go unanswered before the window says so.  The
   worker drops a message it will not settle (a rate-limited script, a
   farmless old worker), so silence is an answer too. */
export const FARM_ANSWER_MS = 4000;
/* v2.3.3102: a BUY waits longer, and its silence is worded "check your bag".
   Every bed action is guarded by the bed (a resent one does nothing), but a
   buy is not: after 4 s of a busy room or a stalled phone the buttons woke up
   saying nothing, and a second tap bought again what the worker had already
   sold (review finding).  12 s is past the dead-pipe watch's 7 s after a
   settled send (wsClient SETTLED_SENDS lists the farm's), which rejoins a
   silent socket and brings the bag's truth back first. */
export const FARM_BUY_ANSWER_MS = 12000;

export const farmBus = {
  /* {beds, plots:[{s, crop?, plantedAt?, readyAt?, water?, feed?}]} or null
     before the first answer. */
  view: null,
  /* worker clock minus this phone's clock, ms. */
  offset: 0,
  /* v2.3.3109: today's order board (server farmorders.js) --
     {day, resetsAt, list: [{id, key, n, gold, xp, done, gone?}]} -- or null
     before the worker has sent one (or with the board switched off). */
  orders: null,
  /* v2.3.3109 (review): whether the worker has SAID what the board is -- a
     board, or none (switched off, or a newer worker's record).  With `orders`
     null the window tells "not asked yet" from "closed" by this; it used to
     show "…" for both, forever. */
  ordersSeen: false,
  /* {op, at} while a request is out. */
  pending: null,
  /* The last answer: {did, err, op, at} (op: what it answered). */
  last: null,
  /* Bumped on every change; the window's useSyncExternalStore snapshot. */
  rev: 0,

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getSnapshot() { return farmBus.rev; },
  serverNow() { return Date.now() + this.offset; },

  /* A farm_state from the worker. */
  apply(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (Array.isArray(payload.plots) && typeof payload.beds === 'number') {
      this.view = { beds: payload.beds, plots: payload.plots };
      if (Number.isFinite(payload.now)) this.offset = payload.now - Date.now();
    }
    /* v2.3.3109: the board rides farm_open's answer (null with it switched
       off) and every delivery's; a bed action's answer has no `orders` key
       and leaves it be. */
    if (Object.prototype.hasOwnProperty.call(payload, 'orders')) {
      const b = payload.orders;
      this.orders = b && typeof b === 'object' && Array.isArray(b.list) ? b : null;
      this.ordersSeen = true;
    }
    if (!payload.login) {
      const op = (payload.did && payload.did.op) || (this.pending && this.pending.op) || null;
      this.pending = null;
      this.last = { did: payload.did || null, err: payload.err || null, op, at: Date.now() };
    }
    this.rev += 1;
    emit();
  },

  /* The three requests, each a literal send so precheck's shim-allowlist
     check can see every type the window sends.  False when there is nothing
     to send on or a request is already out (a double-tap is the normal way a
     phone presses once). */
  open(S) {
    return this._out(S, 'open', () => S.channel.send({ type: 'farm_open', payload: {} }));
  },
  act(S, op, beds, crop) {
    const payload = crop ? { op, beds, crop } : { op, beds };
    return this._out(S, op, () => S.channel.send({ type: 'farm_act', payload }));
  },
  buy(S, item, count) {
    return this._out(S, 'buy', () => S.channel.send({ type: 'farm_buy', payload: { item, count } }));
  },
  /* v2.3.3109: deliver one of today's orders.  The day and id ride along as
     a check: a board that turned over at midnight under an open window is
     refused, not delivered from a different order (farmorders.js).  Safe to
     repeat: a delivered order is refused the second time. */
  order(S, slot) {
    const b = this.orders;
    const o = b && b.list && b.list[slot];
    if (!o || !o.id || o.done) return false;
    return this._out(S, 'order', () => S.channel.send({ type: 'farm_order', payload: { slot, day: b.day, id: o.id } }));
  },

  _out(S, op, fire) {
    if (!S || !S.channel || this.pending) return false;
    try { fire(); } catch (e) { return false; }
    const at = Date.now();
    this.pending = { op, at };
    this.rev += 1;
    emit();
    /* v2.3.3109 (review): a delivery waits as long as a buy, and its silence
       asks the worker for the board instead of waking Deliver: after 4 s a
       second tap went out, the late first answer said "Order delivered" and
       the second's then said "Already delivered" in red.  The board's answer
       says what is done (the worker's done flag never pays twice). */
    const slow = op === 'buy' || op === 'order';
    setTimeout(() => {
      if (this.pending && this.pending.at === at) {
        this.pending = null;
        this.last = { did: null, err: op === 'buy' ? 'timeout-buy' : op === 'order' ? 'timeout-order' : 'timeout', op, at: Date.now() };
        this.rev += 1;
        emit();
        if (op === 'order') this.open(S);
      }
    }, slow ? FARM_BUY_ANSWER_MS : FARM_ANSWER_MS);
    return true;
  },

  /* Ripe beds, by the worker's clock. */
  ripeCount() {
    const v = this.view;
    if (!v) return 0;
    const now = this.serverNow();
    let n = 0;
    for (const p of v.plots) if (p && p.s === 'planted' && now >= p.readyAt) n += 1;
    return n;
  },

  /* A new session (a re-login as someone else) starts with no farm. */
  reset() {
    this.view = null; this.offset = 0; this.pending = null; this.last = null; this.orders = null; this.ordersSeen = false;
    this.rev += 1;
    emit();
  },
};

if (typeof window !== 'undefined') window.__btFarm = farmBus;   /* QA: mp-farm reads the worker's farm through this */
