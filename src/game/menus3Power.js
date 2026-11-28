/* ═══ v2.3.6862: BRO · POWER'S RULES -- THE LANES AND THE DRAFT (card MN step 5) ═══
 *
 * The owner's Power (docs/design/menus3/DECISIONS.md, "Decided" 5): "A DRAFT:
 * tap a stat to stage a point, a minus to unstage, one 'Apply N points'. No
 * Undo after Apply (the worker's Reset is the way back) ... Which points are
 * spent first (a weapon's or the shared) is whatever the worker does today:
 * the menu shows it, never decides it."
 *
 * THE WORKER'S RULE, MIRRORED (server/src/prog3.js _handleProg3Allocate; the
 * page's readers src/data/prog3.js prog3PoolBy / prog3PoolAny / prog3Shared).
 * Three kinds of point:
 *   weapon  `poolBy[cat]`, what that weapon's levels earned: spent ONLY on
 *           that weapon's six;
 *   shared  `shared`, minted with the character level: spent ONLY on the
 *           body's seven;
 *   spare   the rest of `pool` past the three weapons' counts, points banked
 *           before the channels existed: spent on ANYTHING (the worker's
 *           `anyPts`; combatHub.js calls it `free`).
 * One `prog3_allocate` spends ONE point: a weapon upgrade takes that weapon's
 * point while it has one, else a spare; a body upgrade takes a shared point
 * while there is one, else a spare; a stat at its bound is refused.  Because
 * a spare can go either way, what a stage draws depends on the stages before
 * it -- so the draft is an ORDERED list, replayed from the start every time,
 * and Apply sends it in that same order: the preview is the worker's own
 * arithmetic, step by step.
 *
 * A draft is a frozen array of { lane, stat }: `lane` sword, bow, staff
 * (a weapon upgrade, sent with that cat) or body (a shared upgrade).  Every
 * verb returns a new draft (or the same one: no change).  No imports: node's
 * suite reads this (server/test/menus3-power.test.mjs). */

export const POWER_LANES = Object.freeze(['sword', 'bow', 'staff', 'body']);
export const POWER_WEAPONS = Object.freeze(['sword', 'bow', 'staff']);
/* the weapon in hand (rpg.activeSlot's names, the HUD's cats) -> its lane */
const LANE_OF = Object.freeze({ melee: 'sword', sword: 'sword', greatsword: 'sword', ranged: 'bow', bow: 'bow', staff: 'staff' });
export const POWER_DRAFT_MAX = 400;   /* a bound on a draft's length: far past any pool, so a forged loop cannot grow it */

const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const num = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

/** A lane's id, or null for anything else. */
export function powerLane(x) {
  return typeof x === 'string' && POWER_LANES.indexOf(x) >= 0 ? x : null;
}
/** The lane of the weapon in hand (sword when unknown, as prog3ActiveCat). */
export function laneOfHeld(held) {
  return typeof held === 'string' && own(LANE_OF, held) ? LANE_OF[held] : 'sword';
}

/** The pools as the worker holds them: { by: {sword, bow, staff}, shared, spare }.
 *  `p` is the page's reading ({ by, shared, spare }); anything missing is 0. */
export function powerPools(p) {
  const q = p || {};
  const by = q.by || {};
  return Object.freeze({
    by: Object.freeze({ sword: num(by.sword), bow: num(by.bow), staff: num(by.staff) }),
    shared: num(q.shared),
    spare: num(q.spare),
  });
}

/** What each lane can spend now (its own kind plus the spares): the dot's count.
 *  A spare is in every lane's count, as today's Combat hub counts it. */
export function powerWaiting(pools) {
  const P = powerPools(pools);
  return Object.freeze({
    sword: P.by.sword + P.spare, bow: P.by.bow + P.spare, staff: P.by.staff + P.spare, body: P.shared + P.spare,
  });
}

/** The lane Power opens on.  The weapon bar: always the weapon in hand's lane
 *  (decided 3).  Every other entry: the weapon in hand's lane, unless it has
 *  nothing waiting and another lane does (the owner's document: "Opens directly
 *  to the active weapon (or whichever lane has unspent points)"), the first
 *  such in the lanes' order.  The same state always opens the same lane. */
export function powerStartLane(held, waiting, fromBar) {
  const hand = laneOfHeld(held);
  if (fromBar) return hand;
  const w = waiting || {};
  if (num(w[hand]) > 0) return hand;
  for (const l of POWER_LANES) if (num(w[l]) > 0) return l;
  return hand;
}

/** A draft from anything (a forged or old value): only well-formed stages. */
export function draftOf(d) {
  if (!Array.isArray(d)) return Object.freeze([]);
  const out = [];
  for (const s of d) {
    if (out.length >= POWER_DRAFT_MAX) break;
    if (s && powerLane(s.lane) && typeof s.stat === 'string' && s.stat) out.push(Object.freeze({ lane: s.lane, stat: s.stat }));
  }
  return Object.freeze(out);
}

/**
 * The draft replayed as the worker would spend it, in order.
 * ctx { pools (powerPools' shape), pts(lane, stat) the points the stat holds now,
 *       cap(lane, stat) the most it may hold (the worker's bound), known(lane, stat)
 *       whether the stat is one of that lane's (optional: all are) }
 * Returns a frozen array, one a stage: { lane, stat, from: 'weapon' | 'shared' | 'spare' | null,
 *   no: null | 'points' | 'cap' | 'stat' }.  `from` null is a stage the worker would refuse.
 * The pools left after it: draftLeft.
 */
export function draftReplay(draft, ctx) {
  return replayRun(draft, ctx).out;
}
/** The pools left after the draft (powerPools' shape). */
export function draftLeft(draft, ctx) {
  return replayRun(draft, ctx).left;
}
function replayRun(draft, ctx) {
  const c = ctx || {};
  const P = powerPools(c.pools);
  const by = { sword: P.by.sword, bow: P.by.bow, staff: P.by.staff };
  let shared = P.shared, spare = P.spare;
  const placed = Object.create(null);   /* lane|stat -> points staged so far */
  const out = [];
  for (const s of draftOf(draft)) {
    const key = s.lane + '|' + s.stat;
    const known = typeof c.known === 'function' ? !!c.known(s.lane, s.stat) : true;
    const have = num(typeof c.pts === 'function' ? c.pts(s.lane, s.stat) : 0) + (placed[key] || 0);
    const capV = typeof c.cap === 'function' ? Number(c.cap(s.lane, s.stat)) : Infinity;
    const cap = Number.isFinite(capV) ? Math.max(0, Math.floor(capV)) : Infinity;
    let from = null, no = null;
    if (!known) no = 'stat';
    else if (have >= cap) no = 'cap';
    else if (s.lane === 'body') {
      if (shared > 0) { shared--; from = 'shared'; } else if (spare > 0) { spare--; from = 'spare'; } else no = 'points';
    } else if (by[s.lane] > 0) { by[s.lane]--; from = 'weapon'; } else if (spare > 0) { spare--; from = 'spare'; } else no = 'points';
    if (from) placed[key] = (placed[key] || 0) + 1;
    out.push(Object.freeze({ lane: s.lane, stat: s.stat, from, no }));
  }
  return { out: Object.freeze(out), left: powerPools({ by, shared, spare }) };
}

/** Stage one point on `stat` of `lane`: { draft, no }.  A stage the worker
 *  would refuse is not added (`no` says: 'points', 'cap', 'stat', 'lane'). */
export function draftStage(draft, ctx, lane, stat) {
  const d = draftOf(draft);
  if (!powerLane(lane) || typeof stat !== 'string' || !stat) return { draft: d, no: 'lane' };
  if (d.length >= POWER_DRAFT_MAX) return { draft: d, no: 'points' };
  const next = Object.freeze(d.concat([Object.freeze({ lane, stat })]));
  const r = draftReplay(next, ctx);
  const last = r[r.length - 1];
  if (!last.from) return { draft: d, no: last.no };
  return { draft: next, no: null };
}

/** Take back the LAST point staged on `stat` of `lane` (the minus).  None staged: no change. */
export function draftUnstage(draft, lane, stat) {
  const d = draftOf(draft);
  for (let i = d.length - 1; i >= 0; i--) {
    if (d[i].lane === lane && d[i].stat === stat) return Object.freeze(d.slice(0, i).concat(d.slice(i + 1)));
  }
  return d;
}

/** The reset arrow: the draft cleared. */
export function draftClear() { return Object.freeze([]); }

/** Points staged: all, a lane's, or one stat's. */
export function draftCount(draft, lane, stat) {
  let n = 0;
  for (const s of draftOf(draft)) {
    if (lane != null && s.lane !== lane) continue;
    if (stat != null && s.stat !== stat) continue;
    n++;
  }
  return n;
}

/** The draft kept to what the worker would still take, in order (the game moved:
 *  a point landed, a reset, a level): every stage it would refuse now leaves. */
export function draftPrune(draft, ctx) {
  const d = draftOf(draft);
  let cur = Object.freeze([]);
  for (const s of d) cur = draftStage(cur, ctx, s.lane, s.stat).draft;
  const same = cur.length === d.length && cur.every((s, i) => s.lane === d[i].lane && s.stat === d[i].stat);
  if (!same) return cur;
  /* unchanged: the very draft handed in (the page redraws nothing) */
  return Array.isArray(draft) && Object.isFrozen(draft) && draft.length === d.length ? draft : d;
}

/** What each kind of point the draft draws: { weapon: {sword, bow, staff}, shared, spare }. */
export function draftDraws(draft, ctx) {
  const r = draftReplay(draft, ctx);
  const weapon = { sword: 0, bow: 0, staff: 0 };
  let shared = 0, spare = 0;
  for (const s of r) {
    if (s.from === 'weapon') weapon[s.lane]++;
    else if (s.from === 'shared') shared++;
    else if (s.from === 'spare') spare++;
  }
  return Object.freeze({ weapon: Object.freeze(weapon), shared, spare });
}

/** The requests Apply sends, in the draft's order: the game's EXISTING
 *  `prog3_allocate` payloads, one a point -- a weapon upgrade names its weapon,
 *  a body upgrade the cat the page names for it (prog3SharedSpendCat: today's
 *  worker ignores it, an old one took the point off that lane).  Only stages
 *  the worker would take are sent. */
export function draftSends(draft, ctx, bodyCat) {
  const r = draftReplay(draft, ctx);
  const bc = POWER_WEAPONS.indexOf(bodyCat) >= 0 ? bodyCat : 'sword';
  const out = [];
  for (const s of r) {
    if (!s.from) continue;
    out.push(Object.freeze({ stat: s.stat, cat: s.lane === 'body' ? bc : s.lane }));
  }
  return Object.freeze(out);
}

/** The queue: has the point sent landed?  `before` the stat's points when it
 *  was sent, `now` its points now.  Landed when they rose. */
export function sendLanded(before, now) {
  return num(now) > num(before);
}

/** The queue's next move: 'send' the next point, 'done' (nothing left), or
 *  'stop' (the last point sent was refused: the worker said no, or did not
 *  answer within the wait).  `q` { left: points still to send, waiting: a
 *  point is out, landed, timedOut }. */
export function queueStep(q) {
  const s = q || {};
  if (s.idle) return 'idle';   /* v2.3.6866: no run (the queue's verbs below ask this one table) */
  if (s.waiting) {
    if (s.landed) return num(s.left) > 0 ? 'send' : 'done';
    return s.timedOut ? 'stop' : 'wait';
  }
  return num(s.left) > 0 ? 'send' : 'done';
}

/* ── v2.3.6866: THE QUEUE, ONE COPY (the gatekeeper's sitting 75 on #2442) ──
 * The page held its own queue beside queueStep, which only the suite played;
 * and a point the worker took AFTER the wait was called refused and KEPT in
 * the draft, so the next Apply sent it again: two spent for one staged.  Now
 * the queue is this one state, each verb a new one, and the page holds only
 * the clock and act().  A send the wait gave up on stays WATCHED (`late`):
 * the draft is reconciled against the character the worker sends, never
 * against the clock alone --
 *   its stat rose    it landed: its stage leaves the draft, it counts applied;
 *   its stat fell    a reset: the watch ends, nothing landed;
 *   a LATER send landed while it had not risen: the worker answers in order,
 *                    so it refused this one: the watch ends;
 * and while a send is watched ONE stage of its kind is held (queueSendable):
 * Apply never sends it a second time.
 * q { on, items: [{ lane, stat, cat }], i, out: { lane, stat, cat, before } | null,
 *     placed, late: [{ lane, stat, before }] }; ptsOf(lane, stat) the points now. */
export const QUEUE_LATE_MAX = 40;   /* a bound on the watches: far past any run of timeouts */
const keyOf = (w) => w.lane + '|' + w.stat;
function freezeQ(o) {
  const w = (x) => Object.freeze({ lane: x.lane, stat: x.stat, before: num(x.before) });
  return Object.freeze({
    on: !!o.on,
    items: Object.freeze((Array.isArray(o.items) ? o.items : []).map((x) => Object.freeze({ lane: x.lane, stat: x.stat, cat: x.cat }))),
    i: num(o.i),
    out: o.out ? Object.freeze({ lane: o.out.lane, stat: o.out.stat, cat: o.out.cat, before: num(o.out.before) }) : null,
    placed: num(o.placed),
    late: Object.freeze((Array.isArray(o.late) ? o.late : []).slice(-QUEUE_LATE_MAX).map(w)),
  });
}
const ptsCall = (ptsOf, w) => num(typeof ptsOf === 'function' ? ptsOf(w.lane, w.stat) : 0);

/** No queue, nothing watched. */
export function queueFresh() { return freezeQ({}); }

/** Apply: a run of `items` ({ lane, stat, cat }, draftSends' payloads with
 *  their lanes).  A run already going, or nothing to send: no change.  The
 *  watches of earlier runs are kept (their points may still land). */
export function queueBegin(q, items) {
  const Q = q || queueFresh();
  if (Q.on || !Array.isArray(items) || !items.length) return Q;
  return freezeQ({ on: true, items, i: 0, out: null, placed: 0, late: Q.late });
}

/** The next move with nothing out: { q, step, send }.  'send': `send` is the
 *  request's payload { stat, cat } and the point is out, its stat's points now
 *  kept; 'done': the run is over; 'wait' (a point is out) and 'idle': no change. */
export function queueSend(q, ptsOf) {
  const Q = q || queueFresh();
  if (!Q.on) return { q: Q, step: queueStep({ idle: true }), send: null };
  if (Q.out) return { q: Q, step: queueStep({ waiting: true }), send: null };
  const step = queueStep({ left: Q.items.length - Q.i });
  if (step === 'done') return { q: freezeQ({ ...Q, on: false }), step, send: null };
  const it = Q.items[Q.i];
  return {
    q: freezeQ({ ...Q, out: { ...it, before: ptsCall(ptsOf, it) } }),
    step, send: Object.freeze({ stat: it.stat, cat: it.cat }),
  };
}

/** A reading of the character (every new one, a run going or not, and the
 *  wait's end): { q, draft, landed, step }.  Each watched send (the late ones
 *  in the order sent, then the one out) whose stat rose LANDED: the first
 *  stage of its kind leaves the draft and it counts in `placed`; two sends of
 *  one stat count one rise once, the earlier first.  `landed` lists them
 *  ({ lane, stat, late }).  `step` is queueStep's for the point out ('send'
 *  the next, 'done', 'wait'), 'idle' with no run. */
export function queueRead(q, draft, ptsOf) {
  const Q = q || queueFresh();
  const ws = Q.late.map((w) => ({ lane: w.lane, stat: w.stat, before: w.before, late: true }));
  if (Q.out) ws.push({ lane: Q.out.lane, stat: Q.out.stat, before: Q.out.before, late: false });
  let d = draftOf(draft);
  let cut = false, lastLanded = -1;
  const landed = [];
  for (let k = 0; k < ws.length; k++) {
    const w = ws[k];
    const now = ptsCall(ptsOf, w);
    if (now > w.before) {
      w.landed = true; lastLanded = k;
      landed.push(Object.freeze({ lane: w.lane, stat: w.stat, late: w.late }));
      for (let j = k + 1; j < ws.length; j++) if (keyOf(ws[j]) === keyOf(w)) ws[j].before = Math.max(ws[j].before, w.before + 1);
      const at = d.findIndex((s) => keyOf(s) === keyOf(w));
      if (at >= 0) { d = Object.freeze(d.slice(0, at).concat(d.slice(at + 1))); cut = true; }
    } else if (now < w.before && w.late) w.gone = true;   /* a reset under it */
  }
  /* sent before one that landed and not risen: refused (the worker answers in order) */
  const late = ws.filter((w, k) => w.late && !w.landed && !w.gone && !(k < lastLanded));
  const outW = Q.out ? ws[ws.length - 1] : null;
  const next = { ...Q, late, placed: Q.placed + landed.length };
  let step = queueStep(Q.on ? { waiting: true } : { idle: true });
  if (Q.on && outW) {
    step = queueStep({ waiting: true, landed: !!outW.landed, left: Q.items.length - Q.i - 1 });
    if (outW.landed) { next.out = null; next.i = Q.i + 1; if (step === 'done') next.on = false; }
    else next.out = { ...Q.out, before: outW.before };   /* an earlier send's rise is not this one's */
  } else if (Q.on) step = queueStep({ left: Q.items.length - Q.i });
  return { q: freezeQ(next), draft: cut ? d : (Array.isArray(draft) && Object.isFrozen(draft) ? draft : d), landed: Object.freeze(landed), step };
}

/** The run stops (the wait ran out, or the line is down): the point out, if
 *  any, is WATCHED from now on, never called refused for good.  { q, held }:
 *  `held` the stage it watches ({ lane, stat }) or null. */
export function queueEnd(q) {
  const Q = q || queueFresh();
  const o = Q.out;
  return {
    q: freezeQ({ ...Q, on: false, out: null, late: o ? Q.late.concat([o]) : Q.late }),
    held: o ? Object.freeze({ lane: o.lane, stat: o.stat }) : null,
  };
}

/** Leaving the page: the point out finishes; nothing more is sent. */
export function queueCut(q) {
  const Q = q || queueFresh();
  return Q.on ? freezeQ({ ...Q, items: Q.items.slice(0, Q.i + 1) }) : Q;
}

/** The draft Apply may send: one stage of its kind held for each watched
 *  send (the LAST of that kind: the draft's order is kept for the rest). */
export function queueSendable(draft, q) {
  const d = draftOf(draft);
  const Q = q || queueFresh();
  if (!Q.late.length) return d;
  const hold = Object.create(null);
  for (const w of Q.late) hold[keyOf(w)] = (hold[keyOf(w)] || 0) + 1;
  const out = [];
  for (let i = d.length - 1; i >= 0; i--) {
    const k = keyOf(d[i]);
    if (hold[k] > 0) { hold[k]--; continue; }
    out.unshift(d[i]);
  }
  return Object.freeze(out);
}
/** How many stages are held for a watched send. */
export function queueHeld(draft, q) { return draftOf(draft).length - queueSendable(draft, q).length; }

/** A stat's filled steps for its card: { filled, staged, cap, steps }.  With
 *  no per-stat cap (caps.nostatcap: the storage bound is no number to show)
 *  `cap` is null and the steps are the points themselves, at most `most`. */
export function statSteps(pts, staged, cap, most) {
  const p = num(pts), s = num(staged);
  const m = num(most) || 10;
  const c = cap == null || !Number.isFinite(Number(cap)) ? null : num(cap);
  if (c != null) {
    const steps = Math.min(m, c);
    if (steps <= 0) return Object.freeze({ filled: 0, staged: 0, cap: c, steps: 0 });
    const k = c > m ? m / c : 1;   /* a long cap drawn in `most` steps */
    const f = Math.min(steps, Math.round(p * k));
    return Object.freeze({ filled: f, staged: Math.min(steps - f, Math.round((p + s) * k) - f), cap: c, steps });
  }
  return Object.freeze({ filled: Math.min(m, p), staged: Math.max(0, Math.min(m, p + s) - Math.min(m, p)), cap: null, steps: m });
}
