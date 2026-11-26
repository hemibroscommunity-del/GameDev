/* ═══ v2.3.6720: THE IDLE CENSUS -- WHAT THE PAGE DOES WHEN NOTHING HAPPENS (card PRT) ═══
 *
 * The owner, 2026-11-26: "Pretend you're a red team but mission is
 * performance enhancements."  The held budget (held-budget.mjs) judges the
 * LONG jobs and the memory budget what is HELD; nothing counted the small
 * work that runs for ever: a question to a worker on every frame, a control
 * that draws itself again 60 times a second, a timer that wakes the page to
 * do nothing.  None of it is ever 12 ms, so the sweep never names it, and all
 * of it is paid for the whole session -- on the page's one thread, and in a
 * phone's heat.
 *
 * This file is the census's two halves that more than one scenario uses:
 *
 *   THE COUNTERS  put on the page before the bundle runs (newPlayer's `init`,
 *                 as text): every message to and from a worker by its type,
 *                 every timer and animation-frame callback by where it was
 *                 set, and React's commits with the components that ran in
 *                 each (through React's own DevTools hook, which a production
 *                 build calls too).  Each is one branch while the census is
 *                 off, so a profile taken on the same page is not theirs.
 *   THE LINES     what a page standing still may do, each with what it read
 *                 when the line was set.  LOWERED as the idle work is cut,
 *                 never raised silently: say in the PR body how many and why
 *                 (the memory budget's way).
 *
 * The scenario is mp-idlecensus.mjs; mp-phoneframe.mjs BT_PF_REACT=1 uses the
 * React counter in its own window.  No game file reads this.
 */

/* ── THE LINES (a page standing still at the town's arrival point, alone) ──
   Per FRAME where the work rides the frame (this box draws about 11 a second
   at dpr 0.5, a phone 60 or 120: a count a second would be the box's), per
   SECOND where it rides a clock. */
export const IDLE_LINES = Object.freeze({
  /* questions to the ground worker ("where am I") a frame.  0 read 2026-11-26
     on the test box with the last four cells kept (game/hereCells.js); 1.0 a
     frame before (11.4 a second at 11.6 frames a second: one EVERY frame, at
     the place every player arrives). */
  whereAsksPerFrame: 0.1,
  /* the same two places asked in turn for CORNER_FRAMES frames: the cells'
     two questions and no more (4: room for the frame's own callers) */
  cornerAsks: 4,
  /* renders of the Element Burst button a frame.  0 read 2026-11-26 (drawn
     only on a change: game/drawOnChange.js); 1.0 a frame before, drawing
     nothing on a character with no enchanted weapon. */
  burstRendersPerFrame: 0.05,
  /* React commits a second, everything.  15.9 read 2026-11-26 on the test
     box after the burst button's mend (21.9 before, at 11.9 frames a second;
     on a 60 Hz phone the button alone was 60 more).  What is left rides
     clocks, not frames, so a faster screen does not raise it: the band's
     redraw every 200 ms (27 components, 4.9 a second each), the four combat
     buttons' (5 a second each), the top bar's (2) -- docs/plan/census/
     PRT-findings.md rows 3 and 4: this line falls as they are mended. */
  commitsPerSec: 20,
});
export const CORNER_FRAMES = 60;

/* ── THE COUNTERS: the page's side, as one function sent as text ── */
export const IDLE_HOOKS = () => {
  const c = window.__qaIdle = { on: false, toWorker: Object.create(null), fromWorker: Object.create(null), timers: Object.create(null) };
  const typeOf = (d) => (d && typeof d === 'object' ? String(d.type || d.kind || d.op || '(no type)') : typeof d);
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  /* workers: every message out, every message back */
  const post = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (d) { if (c.on) bump(c.toWorker, typeOf(d)); return post.apply(this, arguments); };
  const add = Worker.prototype.addEventListener;
  Worker.prototype.addEventListener = function (t, f, o) {
    if (t === 'message' && typeof f === 'function') {
      return add.call(this, t, function (e) { if (c.on) bump(c.fromWorker, typeOf(e.data)); return f.apply(this, arguments); }, o);
    }
    return add.apply(this, arguments);
  };
  const desc = Object.getOwnPropertyDescriptor(Worker.prototype, 'onmessage');
  if (desc && desc.set) {
    Object.defineProperty(Worker.prototype, 'onmessage', { configurable: true, get() { return desc.get.call(this); },
      set(f) {
        if (typeof f !== 'function') return desc.set.call(this, f);
        return desc.set.call(this, function (e) { if (c.on) bump(c.fromWorker, typeOf(e.data)); return f.apply(this, arguments); });
      } });
  }
  /* timers and animation frames, by where each was set (the bundle's file:line:column; the scenario maps it back) */
  const where = () => {
    const s = (new Error().stack || '').split('\n');
    for (let i = 3; i < s.length; i++) { const m = /assets\/([^:)]+):(\d+):(\d+)/.exec(s[i]); if (m && !/perfTracker/.test(s[i])) return m[1] + ':' + m[2] + ':' + m[3]; }
    return '?';
  };
  const si = window.setInterval, st = window.setTimeout, raf = window.requestAnimationFrame;
  window.setInterval = function (f, ms) {
    if (typeof f !== 'function') return si.apply(window, arguments);
    const w = 'every ' + (ms | 0) + ' ms @' + where();
    const rest = [].slice.call(arguments, 2);
    return si.apply(window, [function () { if (c.on) bump(c.timers, w); return f.apply(this, arguments); }, ms].concat(rest));
  };
  window.setTimeout = function (f, ms) {
    if (typeof f !== 'function') return st.apply(window, arguments);
    const w = 'after ' + (ms | 0) + ' ms @' + where();
    const rest = [].slice.call(arguments, 2);
    return st.apply(window, [function () { if (c.on) bump(c.timers, w); return f.apply(this, arguments); }, ms].concat(rest));
  };
  window.requestAnimationFrame = function (f) {
    const w = 'frame @' + where();
    return raf.call(window, function () { if (c.on) bump(c.timers, w); return f.apply(this, arguments); });
  };
};

/* ── WHO REDRAWS: React's own DevTools hook, put on the page before the bundle runs ──
   A production build calls `onCommitFiberRoot` at every commit when the hook was there at start-up.  In a commit, a
   fiber whose children were worked on has NEW child fibers (not its alternate's), and a component that ran carries
   the PerformedWork flag (1); a fiber cloned only to reach a child has that flag cleared, and an untouched subtree
   is the same objects as before and is never walked.  So the walk counts exactly the components that ran.  Names
   need the unminified build (QA_DIST=dist-prof); a minified build counts under the bundler's short names. */
export const REACT_HOOK = () => {
  const st = window.__qaReact = { on: false, commits: 0, by: Object.create(null) };
  const fnName = (g) => (g && (g.displayName || g.name)) || '';
  const nameOf = (f) => {
    const t = f.type;
    if (typeof t === 'function') return fnName(t) || '(anonymous)';
    if (t && typeof t === 'object') {
      let g = t.type || t.render;                       /* memo -> its type; forwardRef -> its render */
      if (g && typeof g === 'object') g = g.render || g.type;
      if (typeof g === 'function') return fnName(g) || '(anonymous)';
    }
    return null;
  };
  const count = (root) => {
    const stack = [root];
    while (stack.length) {
      const f = stack.pop();
      const tag = f.tag;   /* 0 function, 1 class, 11 forwardRef, 14 memo, 15 simple memo */
      if ((tag === 0 || tag === 1 || tag === 11 || tag === 14 || tag === 15) && (f.flags & 1)) {
        const n = nameOf(f);
        if (n) st.by[n] = (st.by[n] || 0) + 1;
      }
      const prev = f.alternate;
      if (!prev || f.child !== prev.child) for (let c = f.child; c; c = c.sibling) stack.push(c);
    }
  };
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {});
  hook.supportsFiber = true;
  hook.isDisabled = false;
  if (typeof hook.inject !== 'function') hook.inject = () => 1;
  const was = hook.onCommitFiberRoot;
  hook.onCommitFiberRoot = function (id, root) {
    if (st.on && root && root.current) { st.commits++; try { count(root.current); } catch (e) { st.err = String(e); } }
    if (typeof was === 'function') return was.apply(this, arguments);
  };
  if (typeof hook.onCommitFiberUnmount !== 'function') hook.onCommitFiberUnmount = () => {};
  if (typeof hook.onPostCommitFiberRoot !== 'function') hook.onPostCommitFiberRoot = () => {};
};

/* ── the page's side of a count, sent by page.evaluate: a scenario asks through these and never names the
   counters itself (precheck `qa-handles`: a handle is read where it is defined).  Each works with either counter
   alone on the page (mp-phoneframe puts only React's). ── */
/** start a count afresh */
export const censusArm = () => {
  const c = window.__qaIdle, r = window.__qaReact;
  if (c) { c.toWorker = Object.create(null); c.fromWorker = Object.create(null); c.timers = Object.create(null); c.on = true; }
  if (r) { r.commits = 0; r.by = Object.create(null); r.err = null; r.on = true; }
  if (window.perfTracker) window.perfTracker.reset();
  return !!(c || r);
};
/** stop it and read it: { toWorker, fromWorker, timers, commits, by, err, frames } */
export const censusRead = () => {
  const c = window.__qaIdle, r = window.__qaReact;
  if (c) c.on = false;
  if (r) r.on = false;
  return { toWorker: c ? c.toWorker : {}, fromWorker: c ? c.fromWorker : {}, timers: c ? c.timers : {},
    commits: r ? r.commits : 0, by: r ? r.by : {}, err: (r && r.err) || null, counted: !!r,
    frames: ((window.perfTracker && window.perfTracker.getSamples()) || []).length };
};

/** the counters and the React hook as one init script (text) */
export const censusInit = () => `(${IDLE_HOOKS.toString()})();\n(${REACT_HOOK.toString()})();`;

/** Is a census over its lines?  `r` what the scenario read:
 *  { frames, secs, whereAsks, burstRenders, commits, cornerAsks }.  The rows, each { name, ok, detail }. */
export function judgeIdle(r, lines = IDLE_LINES) {
  const f = Math.max(1, r.frames || 0), s = Math.max(0.001, r.secs || 0);
  const perFrame = (n) => +((n || 0) / f).toFixed(3), perSec = (n) => +((n || 0) / s).toFixed(1);
  const rows = [
    { name: `standing still, the page asks the ground worker where it is at most ${lines.whereAsksPerFrame} times a frame (${perFrame(r.whereAsks)}: ${r.whereAsks || 0} in ${f} frames)`,
      ok: perFrame(r.whereAsks) <= lines.whereAsksPerFrame, detail: { asks: r.whereAsks, frames: f } },
    { name: `standing still, the Element Burst button is drawn again at most ${lines.burstRendersPerFrame} times a frame (${perFrame(r.burstRenders)}: ${r.burstRenders || 0} in ${f} frames)`,
      ok: perFrame(r.burstRenders) <= lines.burstRendersPerFrame, detail: { renders: r.burstRenders, frames: f } },
    { name: `standing still, React commits at most ${lines.commitsPerSec} times a second (${perSec(r.commits)})`,
      ok: perSec(r.commits) <= lines.commitsPerSec, detail: { commits: r.commits, secs: +s.toFixed(1) } },
  ];
  if (r.cornerAsks != null) {
    rows.push({ name: `two places in two cells asked in turn for ${CORNER_FRAMES} frames: at most ${lines.cornerAsks} questions to the worker (${r.cornerAsks})`,
      ok: r.cornerAsks <= lines.cornerAsks, detail: { asks: r.cornerAsks } });
  }
  return rows;
}
