/* ═══ v2.3.3083: THE FARM'S STATE, OUTSIDE REACT ═══
 *
 * What the worker last said about this player's farm (server/src/farm.js),
 * for the Feed & Seed window to draw.  Outside the component tree for the
 * aceFlipBus reason: the thing that WRITES it is a WebSocket handler
 * (gameEvents.js 'farm_state'), and the window may not even be open.
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

export const farmBus = {
  /* {beds, plots:[{s, crop?, plantedAt?, readyAt?, water?, feed?}]} or null
     before the first answer. */
  view: null,
  /* worker clock minus this phone's clock, ms. */
  offset: 0,
  /* {op, at} while a request is out. */
  pending: null,
  /* The last answer: {did, err, at}. */
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
    if (!payload.login) {
      this.pending = null;
      this.last = { did: payload.did || null, err: payload.err || null, at: Date.now() };
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

  _out(S, op, fire) {
    if (!S || !S.channel || this.pending) return false;
    try { fire(); } catch (e) { return false; }
    const at = Date.now();
    this.pending = { op, at };
    this.rev += 1;
    emit();
    setTimeout(() => {
      if (this.pending && this.pending.at === at) {
        this.pending = null;
        this.last = { did: null, err: 'timeout', at: Date.now() };
        this.rev += 1;
        emit();
      }
    }, FARM_ANSWER_MS);
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
    this.view = null; this.offset = 0; this.pending = null; this.last = null;
    this.rev += 1;
    emit();
  },
};

if (typeof window !== 'undefined') window.__btFarm = farmBus;   /* QA: mp-farm reads the worker's farm through this */
