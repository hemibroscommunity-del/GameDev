/* ═══ v2.3.3731: BOT SIGNALS MEASURED BY THE SERVER (spec: docs/specs/server-botsig.md;
 * the plan: docs/HIDDEN-SERVER-PLAN.md, "The anti-bot plan" 1, 4 and 5) ═══
 *
 * botfp.js judges numbers the PHONE writes (the gesture's fingerprint), so a
 * script writes whatever passes (docs/specs/antibot-review.md §2).  This
 * module judges only what the SERVER sees for itself, from messages every
 * script must send anyway -- no new message type, nothing new on the wire:
 *
 *   aimed     the walk to each harvest: a perfectly straight run that passes
 *             through the node's exact centre, at an angle no keyboard can
 *             make (the keyboard walks in 8 directions; the stick never holds
 *             one line through a centre to a pixel);
 *   gesture   the time from a harvest's start to its strike, beyond the hits
 *             the worker planned: a person's gesture takes 1.2 to 2.5 s and
 *             never the same twice; a script's takes the same every time;
 *   cook      the beat between cooks: a person's goes with the minigame, a
 *             script's is a timer;
 *   reflex    the time from a monster's wind-up to the player stepping away,
 *             dodging or raising a shield, the round trip taken off: a
 *             person needs a few hundred ms and spreads; a script does not;
 *   rooted    hundreds of hits on several monsters from the same 2 px of
 *             ground: a person moves;
 *   marathon  hours of activity with no break of five minutes;
 *   loop      ...the same harvest route, again and again, through them;
 *   keys      (v2.3.3725) a harvest worked by holding E on a computer: the
 *             gaps between its presses and how long each was held, as the
 *             phone reports them (`k`): a person's wander, a script's repeat;
 *   cloud     the connection comes from a cloud provider's network
 *             (request.cf.asn at the socket's opening): one more signal,
 *             never enough alone.
 *
 * WHAT IT DELIBERATELY DOES NOT USE (the client sends them on timers, so a
 * person and a script look alike -- the honest client's facts, 2026-10-28):
 *   - the cadence of `move` (a 33/66 ms shim timer today; lane D's message
 *     diet, cap `movepath`, sends a steady walk every ~200 ms and changes at
 *     once: neither is a person's rhythm);
 *   - the cadence of swings (holding attack auto-swings on the cooldown);
 *   - "instant turns" alone (a keyboard turns instantly);
 *   - the walk to a MONSTER (the sword's lunge re-aims at it every frame, a
 *     perfectly aimed straight line from an honest player).
 *
 * Robust over hundreds of events: each measure is a counter pair or a small
 * log-scale histogram (botstats.js) read by quantile, so one stalled frame or
 * a network spike moves nothing.  A signal says nothing until it has its
 * minimum count.
 *
 * FLAG, NEVER ACT (the owner, 2026-07-03).  The signals add up to a score
 * (each one's weight, hidden settings); at SIG_FLAG_AT the player gets a
 * `server-signals` flag through botfp's own _botfpFlag (one an hour at most),
 * shown in the Test panel's Bot flags with its reasons in words.  The one
 * optional act, OFF unless the owner throws `botsig_reverify` in the live
 * flags AND the account check is configured: a flagged player passes
 * Turnstile again at their next join (verify.js) -- a person ticks a box,
 * a script struggles.
 *
 * COST: no write per message.  The evidence lives in the existing
 * `botstat:<playerId>` record (field `sig`), written at botfp's own pace: a
 * harvest's or a cook's measure rides the write those already make; a
 * fight's, a walk's and a reaction's ride the close (_botfpFlush) or the
 * next paced write.  A walk keeps a ring of 12 places in memory only.
 *
 * Every threshold and weight is a hidden setting (hidden.js HIDDEN_SPEC,
 * group 'botsig'); BOTSIG below holds the public placeholders. */
import { histNew, histAdd, histTotal, histSpread } from './botstats.js';

export const BOTSIG = {
  // ── aimed: the walk to a harvest ──
  AIM_CHORD_PX: 40,         // the run measured back this far from where the harvest began
  AIM_STRAIGHT_PX: 0.75,    // every place on it within this of its line
  AIM_MISS_PX: 1.5,         // ...and the line within this of the node's centre
  AIM_KEY_DEG: 0.5,         // a heading this close to one of the keyboard's 8 is not judged
  AIM_MIN_N: 40,
  AIM_SHARE: 0.5,           // aimed runs over all judged runs
  // ── gesture: start to strike, beyond the planned hits (log bins, 8 an octave) ──
  GEST_MIN_N: 60,
  GEST_SPREAD_MAX: 1,       // the 10th to 90th percentile within this many bins (9% each)
  // ── cook: the beat between cooks ──
  COOK_MIN_N: 60,
  COOK_SPREAD_MAX: 1,
  COOK_GAP_MAX_MS: 60000,   // a longer gap is a walk, not the beat
  // ── reflex: a monster's wind-up to the step away, dodge or shield ──
  REACT_WINDOW_MS: 1500,
  REACT_QUICK_MS: 120,      // after the measured round trip
  REACT_MIN_N: 20,
  REACT_QUICK_SHARE: 0.6,
  // ── rooted: hits from one spot ──
  ROOT_CELL_PX: 2,
  ROOT_HITS: 600,
  ROOT_MONSTERS: 3,
  // ── marathon and loop ──
  BREAK_MS: 300000,         // five minutes with no action is a break
  MARATHON_MS: 14400000,    // four hours without one
  LOOP_MIN_N: 100,
  LOOP_SHARE: 0.6,          // harvests whose step (node to node) was taken before
  // ── keys (v2.3.3725): E's presses ──
  KEYS_MIN_N: 60,
  KEYS_SPREAD_MAX: 1,
  // ── network ──
  /* cloud and hosting networks, by AS number: Amazon (16509, 14618), Google
     Cloud (396982, 15169), Microsoft Azure (8075), Hetzner (24940), OVH
     (16276), DigitalOcean (14061), Linode/Akamai cloud (63949), Vultr
     (20473), Oracle (31898), Alibaba (45102), Contabo (51167), Scaleway
     (12876).  NOT Cloudflare, Akamai's or Fastly's edge: Apple's Private
     Relay and Chrome's IP protection leave from those, for real players. */
  CLOUD_ASNS: [16509, 14618, 396982, 15169, 8075, 24940, 16276, 14061, 63949, 20473, 31898, 45102, 51167, 12876],
  // ── the score ──
  W_AIM: 6, W_GEST: 3, W_COOK: 6, W_REACT: 6, W_ROOT: 6, W_MARATHON: 2, W_LOOP: 4, W_CLOUD: 2, W_KEYS: 3,
  SIG_FLAG_AT: 6,
  // ── plumbing (public: memory and cost) ──
  MOVE_RING: 12,
  COUNT_CAP: 400,           // counters and histograms halve past this (old evidence fades)
  LOOP_WINDOW: 64,
  EVAL_EVERY: 20,           // measures between evaluations
  HIST_LO_GEST: 50, HIST_N_GEST: 72, HIST_LO_COOK: 100, HIST_N_COOK: 80, HIST_PER: 8,
  HIST_LO_KEY: 20, HIST_N_KEY: 64, KEYS_MAX: 24,
};

/* the reasons, in the order the Test panel lists them */
export const SIG_REASONS = ['aimed', 'reflex', 'rooted', 'cook', 'gesture', 'keys', 'loop', 'marathon', 'cloud'];

/* the values in force: the room's hidden settings, or (a stub) the placeholders.
   A local helper, not an import: hidden.js imports BOTSIG (botfp.js's way). */
const hid = (room) => (room && typeof room._hid === 'function' ? room._hid() : BOTSIG);

export function freshSig() {
  return {
    v: 1,
    aim: { n: 0, hit: 0 },
    gest: histNew(BOTSIG.HIST_N_GEST),
    cook: histNew(BOTSIG.HIST_N_COOK), cookAt: 0,
    keyGap: histNew(BOTSIG.HIST_N_KEY), keyHold: histNew(BOTSIG.HIST_N_KEY),   /* v2.3.3725 */
    react: { n: 0, quick: 0 },
    root: { c: null, run: 0, mons: [], max: 0, maxMons: 0 },
    act: { start: 0, last: 0 },
    loop: { prev: null, win: [], n: 0, rep: 0 },
    net: { asn: null, org: null },
    seen: 0, reasons: [], score: 0, flagAt: 0,
    reverify: false,
  };
}

/* a stored `sig` merged over a fresh one: unknown or broken parts are fresh */
export function hydrateSig(s) {
  const f = freshSig();
  if (!s || typeof s !== 'object' || s.v !== 1) return f;
  const okPair = (o, a, b) => o && typeof o === 'object' && Number.isFinite(o[a]) && Number.isFinite(o[b]);
  if (okPair(s.aim, 'n', 'hit')) f.aim = { n: s.aim.n, hit: s.aim.hit };
  if (okPair(s.react, 'n', 'quick')) f.react = { n: s.react.n, quick: s.react.quick };
  if (Array.isArray(s.gest) && s.gest.length === f.gest.length) f.gest = s.gest.map((x) => Number(x) || 0);
  if (Array.isArray(s.cook) && s.cook.length === f.cook.length) f.cook = s.cook.map((x) => Number(x) || 0);
  if (Array.isArray(s.keyGap) && s.keyGap.length === f.keyGap.length) f.keyGap = s.keyGap.map((x) => Number(x) || 0);
  if (Array.isArray(s.keyHold) && s.keyHold.length === f.keyHold.length) f.keyHold = s.keyHold.map((x) => Number(x) || 0);
  if (s.root && typeof s.root === 'object') {
    f.root.max = Number(s.root.max) || 0;
    f.root.maxMons = Number(s.root.maxMons) || 0;
  }
  if (okPair(s.act, 'start', 'last')) f.act = { start: s.act.start, last: s.act.last };
  if (s.loop && typeof s.loop === 'object' && Array.isArray(s.loop.win)) {
    f.loop = { prev: s.loop.prev == null ? null : String(s.loop.prev).slice(0, 48), win: s.loop.win.slice(-BOTSIG.LOOP_WINDOW).map(Number),
      n: Number(s.loop.n) || 0, rep: Number(s.loop.rep) || 0 };
  }
  if (s.net && typeof s.net === 'object') f.net = { asn: Number.isFinite(s.net.asn) ? s.net.asn : null, org: typeof s.net.org === 'string' ? s.net.org.slice(0, 64) : null };
  if (Array.isArray(s.reasons)) f.reasons = s.reasons.filter((r) => SIG_REASONS.includes(r));
  f.score = Number(s.score) || 0;
  f.seen = Number(s.seen) || 0;
  f.flagAt = Number(s.flagAt) || 0;
  f.reverify = s.reverify === true;
  return f;
}

/* counter pair halving (the evidence fades like the histograms) */
function bump(o, key, yes) {
  o.n++;
  if (yes) o[key]++;
  if (o.n > BOTSIG.COUNT_CAP) { o.n = Math.floor(o.n / 2); o[key] = Math.floor(o[key] / 2); }
}

/* FNV-1a of a short string, for the loop's steps (stored as numbers) */
function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

/* ═══ THE PURE JUDGEMENTS (exported for the tests) ═══ */

/* The run that ended at the last place in `path` ([{x, y}], oldest first):
   null when it is shorter than chordPx; else {straight, deg, miss} for the
   point (tx, ty): how far the run's line passes from it, and whether it was
   ahead of the walker. */
export function judgeApproach(path, tx, ty, T) {
  if (!Array.isArray(path) || path.length < 2) return null;
  const P = path[path.length - 1];
  let qi = -1;
  for (let i = path.length - 2; i >= 0; i--) {
    if (Math.hypot(P.x - path[i].x, P.y - path[i].y) >= T.AIM_CHORD_PX) { qi = i; break; }
  }
  if (qi < 0) return null;
  const Q = path[qi];
  const dx = P.x - Q.x, dy = P.y - Q.y, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L;
  let straight = true;
  for (let i = qi + 1; i < path.length - 1; i++) {
    const off = Math.abs((path[i].x - Q.x) * uy - (path[i].y - Q.y) * ux);
    if (off > T.AIM_STRAIGHT_PX) { straight = false; break; }
  }
  let deg = Math.atan2(dy, dx) * 180 / Math.PI;
  deg = ((deg % 45) + 45) % 45;
  const keyDeg = Math.min(deg, 45 - deg);
  const miss = Math.abs((tx - Q.x) * uy - (ty - Q.y) * ux);
  const ahead = (tx - Q.x) * ux + (ty - Q.y) * uy >= L * 0.5;
  return { straight, keyDeg, miss, ahead };
}

/* The reasons a sig shows, and its score, under the values T */
export function judgeSig(sig, T, now) {
  const reasons = [];
  if (sig.aim.n >= T.AIM_MIN_N && sig.aim.hit / sig.aim.n >= T.AIM_SHARE) reasons.push('aimed');
  if (sig.react.n >= T.REACT_MIN_N && sig.react.quick / sig.react.n >= T.REACT_QUICK_SHARE) reasons.push('reflex');
  if (sig.root.max >= T.ROOT_HITS && sig.root.maxMons >= T.ROOT_MONSTERS) reasons.push('rooted');
  if (histTotal(sig.cook) >= T.COOK_MIN_N && histSpread(sig.cook) <= T.COOK_SPREAD_MAX) reasons.push('cook');
  if (histTotal(sig.gest) >= T.GEST_MIN_N && histSpread(sig.gest) <= T.GEST_SPREAD_MAX) reasons.push('gesture');
  /* v2.3.3725: E's presses -- either their gaps or their holds the same every time */
  const kOk = (h) => Array.isArray(h) && histTotal(h) >= T.KEYS_MIN_N && histSpread(h) <= T.KEYS_SPREAD_MAX;
  if (kOk(sig.keyGap) || kOk(sig.keyHold)) reasons.push('keys');
  const long = sig.act.start > 0 && sig.act.last - sig.act.start >= T.MARATHON_MS && (now - sig.act.last) < T.BREAK_MS;
  if (long) {
    if (sig.loop.n >= T.LOOP_MIN_N && sig.loop.rep / sig.loop.n >= T.LOOP_SHARE) reasons.push('loop');
    else reasons.push('marathon');
  }
  if (sig.net.asn != null && Array.isArray(T.CLOUD_ASNS) && T.CLOUD_ASNS.includes(sig.net.asn)) reasons.push('cloud');
  const W = { aimed: T.W_AIM, reflex: T.W_REACT, rooted: T.W_ROOT, cook: T.W_COOK, gesture: T.W_GEST, keys: T.W_KEYS, loop: T.W_LOOP, marathon: T.W_MARATHON, cloud: T.W_CLOUD };
  let score = 0;
  for (const r of reasons) score += Number(W[r]) || 0;
  return { reasons, score };
}

export const botsigMethods = {
  _botsigOn() {
    return !(typeof this._flagOn === 'function' && this._flagOn('disable_botsig'));
  },

  _sigOf(id, now) {
    if (!id || typeof this._botfpRecord !== 'function') return null;
    const rec = this._botfpRecord(id, now);
    if (!rec.sig) rec.sig = freshSig();
    return rec;
  },

  /* a test-mode character is never judged (testmode.js) */
  _sigSkip(session) {
    if (!session || !session.id || !this._botsigOn()) return true;
    const ps = this.playerState && this.playerState[session.id];
    if (!ps) return true;
    return typeof this._testMode === 'function' && this._testMode(ps);
  },

  /* any action keeps the streak going; five quiet minutes start a new one */
  _sigActive(sig, now, T) {
    const a = sig.act;
    if (!a.start || now - a.last >= T.BREAK_MS) a.start = now;
    a.last = now;
  },

  _sigMeasured(id, rec, now, write) {
    rec.sig.seen++;
    if (write) rec.dirty = true;
    if (rec.sig.seen % BOTSIG.EVAL_EVERY === 0) this._sigEval(id, rec, now);
  },

  /* ── join: the network, from the socket's opening (index.js fetch) ── */
  _sigOnJoin(session) {
    if (this._sigSkip(session)) return;   /* a test-mode character: no network signal either */
    const now = Date.now();
    const rec = this._sigOf(session.id, now);
    if (!rec) return;
    if (Number.isFinite(session.asn)) {
      rec.sig.net = { asn: session.asn, org: typeof session.asOrg === 'string' ? session.asOrg.slice(0, 64) : null };
    }
    this._sigEval(session.id, rec, now);
  },

  /* ── every move: the place in a ring (memory only), the streak, and a
     wind-up's answer.  Called after _handleMove, so ps holds the place the
     worker took. ── */
  _sigOnMove(session, msg) {
    if (this._sigSkip(session)) return;
    const ps = this.playerState[session.id];
    const now = Date.now();
    const ring = session._sigPath || (session._sigPath = []);
    const last = ring[ring.length - 1];
    const moved = !last || Math.abs(last.x - ps.x) > 0.05 || Math.abs(last.y - ps.y) > 0.05;
    if (moved) {
      ring.push({ x: ps.x, y: ps.y });
      if (ring.length > BOTSIG.MOVE_RING) ring.shift();
    }
    const vx = Number(msg && msg.vx) || 0, vy = Number(msg && msg.vy) || 0;
    session._sigVel = { vx, vy };
    const blocking = !!(msg && msg.blocking);
    const raised = blocking && !session._sigBlock;
    session._sigBlock = blocking;
    const T = hid(this);
    if (moved && this._botfp && this._botfp.get(session.id)) {
      const rec = this._botfp.get(session.id);
      if (rec.sig) this._sigActive(rec.sig, now, T);
    }
    const w = this._sigWU && this._sigWU.get(session.id);
    if (w) {
      const away = (vx || vy) && ((vx * (ps.x - w.mx) + vy * (ps.y - w.my)) > 0.5 * Math.hypot(vx, vy) * Math.hypot(ps.x - w.mx, ps.y - w.my));
      if (away || (msg && msg.dodging) || raised) this._sigReact(session, now, w);
    }
  },

  /* a dodge (an ability_use whose type is dodge) answers a wind-up too */
  _sigOnAbility(session, payload) {
    if (this._sigSkip(session) || !payload || payload.type !== 'dodge') return;
    const w = this._sigWU && this._sigWU.get(session.id);
    if (w) this._sigReact(session, Date.now(), w);
  },

  /* ── a monster's wind-up on a player (telegraph.js): remembered only when
     the player was not already stepping away, so a kiter's next step is not
     taken for a reflex ── */
  _sigOnWindup(targetId, m, now) {
    if (!targetId || !m || !this._botsigOn()) return;
    const ps = this.playerState && this.playerState[targetId];
    if (!ps || ps.disconnected) return;
    if (typeof this._testMode === 'function' && this._testMode(ps)) return;
    let sess = null;
    if (this.sessions) for (const s of this.sessions.values()) if (s && s.id === targetId) { sess = s; break; }
    if (!sess) return;
    const v = sess._sigVel || { vx: 0, vy: 0 };
    const rx = ps.x - m.x, ry = ps.y - m.y;
    const sp = Math.hypot(v.vx, v.vy), d = Math.hypot(rx, ry);
    if (sp > 0 && d > 0 && (v.vx * rx + v.vy * ry) > 0.5 * sp * d) return;   /* already going */
    if (sess._sigBlock) return;   /* already behind the shield */
    if (!this._sigWU) this._sigWU = new Map();
    this._sigWU.set(targetId, { at: now, mx: m.x, my: m.y });
    if (this._sigWU.size > 256) this._sigWU.delete(this._sigWU.keys().next().value);
  },

  _sigReact(session, now, w) {
    this._sigWU.delete(session.id);
    const T = hid(this);
    const dt = now - w.at - (Number(session.rtt) || 0);
    if (now - w.at > T.REACT_WINDOW_MS) return;   /* no answer in time: not a reaction */
    const rec = this._sigOf(session.id, now);
    if (!rec) return;
    bump(rec.sig.react, 'quick', dt < T.REACT_QUICK_MS);
    this._sigActive(rec.sig, now, T);
    this._sigMeasured(session.id, rec, now, false);
  },

  /* ── a harvest begins: the walk that led to it, and the route's step ── */
  _sigOnStart(session, payload) {
    if (this._sigSkip(session) || !payload || payload.skill === 'cooking') return;
    this._sigApproach(session, payload.zone, payload.nodeId, true);
  },

  /* the walk to a node, judged where the harvest begins: its start, or (a
     script that never sends one) its strike.  `route` also steps the loop. */
  _sigApproach(session, zone, id, route) {
    if (typeof id !== 'string' && typeof id !== 'number') return;
    const nodes = (this.nodes && typeof zone === 'string' && this.nodes[zone]) || null;
    const n = Array.isArray(nodes) ? nodes.find((x) => x && x.id === id) : null;
    if (!n) return;
    const now = Date.now();
    const rec = this._sigOf(session.id, now);
    if (!rec) return;
    const T = hid(this);
    const sig = rec.sig;
    const j = judgeApproach(session._sigPath, n.x, n.y, T);
    if (j && j.keyDeg > T.AIM_KEY_DEG) bump(sig.aim, 'hit', j.straight && j.ahead && j.miss <= T.AIM_MISS_PX);
    if (!route) {
      session._sigPath = session._sigPath ? session._sigPath.slice(-1) : [];
      this._sigActive(sig, now, T);
      this._sigMeasured(session.id, rec, now, true);
      return;
    }
    /* the route: the last four nodes in order, walked before?  Four, not
       two: a person wandering among the same six trees repeats a step from
       one to the next all the time (30 such steps); a route of four comes
       round again only on a loop (750 of them).  The route itself is the
       session's (memory); only its hashes are kept. */
    const key = String(zone) + ':' + String(id);
    if (sig.loop.prev !== key) {
      const route = (session._sigRoute || []).concat(key).slice(-4);
      session._sigRoute = route;
      if (route.length === 4) {
        const step = hash32(route.join('>'));
        const again = sig.loop.win.includes(step);
        sig.loop.win.push(step);
        if (sig.loop.win.length > BOTSIG.LOOP_WINDOW) sig.loop.win.shift();
        sig.loop.n++;
        if (again) sig.loop.rep++;
        if (sig.loop.n > BOTSIG.COUNT_CAP) { sig.loop.n = Math.floor(sig.loop.n / 2); sig.loop.rep = Math.floor(sig.loop.rep / 2); }
      }
    }
    sig.loop.prev = key.slice(0, 48);
    session._sigPath = session._sigPath ? session._sigPath.slice(-1) : [];   /* the next walk starts here */
    this._sigActive(sig, now, T);
    this._sigMeasured(session.id, rec, now, true);
  },

  /* ── a harvest's strike: its gesture, timed against its own start record
     (before the strike handler deletes it) ── */
  _sigOnStrike(session, payload) {
    if (this._sigSkip(session) || !payload) return;
    const ex = this.extractions && this.extractions[session.id];
    /* no start of its own: the walk is judged here instead (a script that
       skips the start skips nothing of its walk), and the route steps */
    if (!ex || ex.nodeId !== payload.id) { this._sigApproach(session, payload.zone, payload.id, true); return; }
    if (typeof ex.startedAt !== 'number') return;
    /* Only a drawn gesture is timed.  A strike with no fingerprint is E held on
       a computer (ExtractionSwipeLayer v2.3.3407: the meter fills in exactly
       1.5 s of holding, the same every time, honestly) or an old phone: its
       even time is the client's, not a script's. */
    /* v2.3.3725: E's presses are measured on their own (_sigOnKeys) */
    if (Array.isArray(payload.k)) this._sigOnKeys(session, payload.k);
    if ((!payload.swipeFp || typeof payload.swipeFp !== 'object') && (!payload.g || typeof payload.g !== 'object')) return;
    const now = Date.now();
    const extra = now - ex.startedAt - (Number(ex.openDelayBase) || 0);
    if (!(extra > 0)) return;
    const rec = this._sigOf(session.id, now);
    if (!rec) return;
    histAdd(rec.sig.gest, extra, BOTSIG.HIST_LO_GEST, BOTSIG.HIST_PER, BOTSIG.COUNT_CAP);
    this._sigActive(rec.sig, now, hid(this));
    this._sigMeasured(session.id, rec, now, true);
  },

  /* ── v2.3.3725: a harvest E worked: `k` is [[start, held], ...] ms from the
     first press (ExtractionSwipeLayer).  The gaps between presses, and the
     holds of every press but the last (the last is held until the harvest
     ends, so its length is the harvest's, not the hand's).  Shape-checked:
     at most KEYS_MAX pairs of whole, sane numbers, else nothing is read. ── */
  _sigOnKeys(session, k) {
    if (this._sigSkip(session) || !Array.isArray(k) || k.length < 2 || k.length > BOTSIG.KEYS_MAX) return;
    for (const p of k) if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || p[0] < 0 || p[1] < 0 || p[0] > 600000 || p[1] > 600000) return;
    const now = Date.now();
    const rec = this._sigOf(session.id, now);
    if (!rec) return;
    const sig = rec.sig;
    if (!Array.isArray(sig.keyGap)) { sig.keyGap = histNew(BOTSIG.HIST_N_KEY); sig.keyHold = histNew(BOTSIG.HIST_N_KEY); }
    for (let i = 1; i < k.length; i++) {
      const gap = k[i][0] - k[i - 1][0];
      if (gap > 0) histAdd(sig.keyGap, gap, BOTSIG.HIST_LO_KEY, BOTSIG.HIST_PER, BOTSIG.COUNT_CAP);
      histAdd(sig.keyHold, Math.max(1, k[i - 1][1]), BOTSIG.HIST_LO_KEY, BOTSIG.HIST_PER, BOTSIG.COUNT_CAP);
    }
  },

  /* ── a cook: the beat ── */
  _sigOnCook(session) {
    if (this._sigSkip(session)) return;
    const now = Date.now();
    const rec = this._sigOf(session.id, now);
    if (!rec) return;
    const T = hid(this);
    const sig = rec.sig;
    const gap = sig.cookAt ? now - sig.cookAt : 0;
    sig.cookAt = now;
    if (gap > 0 && gap <= T.COOK_GAP_MAX_MS) histAdd(sig.cook, gap, BOTSIG.HIST_LO_COOK, BOTSIG.HIST_PER, BOTSIG.COUNT_CAP);
    this._sigActive(sig, now, T);
    this._sigMeasured(session.id, rec, now, true);
  },

  /* ── a hit on a monster: where it was struck from ── */
  _sigOnHit(session, payload) {
    if (this._sigSkip(session) || !payload) return;
    const ps = this.playerState[session.id];
    const now = Date.now();
    const rec = this._sigOf(session.id, now);
    if (!rec) return;
    const T = hid(this);
    const r = rec.sig.root;
    const cell = Math.floor(ps.x / T.ROOT_CELL_PX) + ',' + Math.floor(ps.y / T.ROOT_CELL_PX);
    if (r.c !== cell) { r.c = cell; r.run = 0; r.mons = []; }
    r.run++;
    const mid = String(payload.monsterId || '').slice(0, 40);
    if (mid && r.mons.length < T.ROOT_MONSTERS && !r.mons.includes(mid)) r.mons.push(mid);
    if (r.run > r.max || (r.run === r.max && r.mons.length > r.maxMons)) { r.max = r.run; r.maxMons = r.mons.length; }
    this._sigActive(rec.sig, now, T);
    this._sigMeasured(session.id, rec, now, false);
  },

  /* ── the judgement: every EVAL_EVERY measures, at a join and at the close ── */
  _sigEval(id, rec, now) {
    if (!rec || !rec.sig) return null;
    const T = hid(this);
    const j = judgeSig(rec.sig, T, now);
    rec.sig.reasons = j.reasons;
    rec.sig.score = j.score;
    if (j.score >= T.SIG_FLAG_AT && typeof this._botfpFlag === 'function') {
      /* the re-check (below) is owed from here until it is passed */
      rec.sig.reverify = true;
      /* One an hour, on its OWN clock: botfp's gap is shared by its kinds, so
         a script flagged an hour ago for its startless strikes would never be
         flagged for what the server saw (the bot lab's fleets, 2026-10-28).
         botfp's clock is left where it was (_botfpTestFlag's way). */
      if (now - (rec.sig.flagAt || 0) >= T.FLAG_MIN_GAP_MS) {
        const keep = rec.lastFlagAt;
        rec.lastFlagAt = 0;
        this._botfpFlag(id, rec, 'server-signals', { score: j.score, reasons: j.reasons }, now);
        rec.lastFlagAt = keep;
        rec.sig.flagAt = now;
      }
    }
    return j;
  },

  /* ═══ THE OPTIONAL RE-CHECK (OFF): a flagged player passes Turnstile again ═══
     Only with `botsig_reverify` thrown in the live flags AND the account check
     configured (verify.js).  Called by the join after the key is accepted;
     returns false when the join must be refused for the check.  One read of
     the player's botstat (only while the switch is on); one write when the
     check is passed, so it is asked once a flag. */
  async _sigReverifyOk(id, token, ip) {
    if (!(typeof this._flagOn === 'function' && this._flagOn('botsig_reverify'))) return true;
    if (!(typeof this._verifyConfigured === 'function' && this._verifyConfigured())) return true;
    /* the owner's test mode (testmode.js) supersedes the anti-bot: never re-checked */
    if (typeof this._testModeRead === 'function' && (await this._testModeRead(id))) return true;
    let stored = null;
    try { stored = await this.state.storage.get('botstat:' + id); } catch (e) { return true; }
    if (!stored || !stored.sig || stored.sig.reverify !== true) return true;
    if (!(await this._verifyToken(token, ip))) return false;
    stored.sig.reverify = false;
    stored.sig.reverifiedAt = Date.now();
    try { await this.state.storage.put('botstat:' + id, stored); } catch (e) { /* asked again next time */ }
    const live = this._botfp && this._botfp.get(id);
    if (live && live.sig) live.sig.reverify = false;
    return true;
  },
};

/* ═══ v2.3.3731: NO SIGNAL EVER BREAKS A MOVE, A HIT OR A MONSTER'S TICK ═══
   The hooks above run on the room's hottest paths (every move, every hit,
   every monster's wind-up).  Two walls keep a player's game safe from them:
   `disable_botsig` returns at the first line of every hook (_sigSkip, and
   _sigOnWindup's own check) before anything else runs; and every hook is
   wrapped here, so a throw inside one is counted (`_sigErrors`, the first few
   logged) and swallowed -- the move, strike or tick that called it carries
   on as if the signals were not there (botsig.test §13). */
for (const name of ['_sigOnJoin', '_sigOnMove', '_sigOnAbility', '_sigOnWindup', '_sigOnStart', '_sigOnStrike', '_sigOnCook', '_sigOnHit']) {
  const fn = botsigMethods[name];
  botsigMethods[name] = function guarded(a, b, c) {
    try { return fn.call(this, a, b, c); }
    catch (e) {
      this._sigErrors = (this._sigErrors || 0) + 1;
      if (this._sigErrors <= 5) { try { console.error('[botsig] ' + name + ' threw:', e && e.message); } catch (e2) { /* nothing */ } }
      return undefined;
    }
  };
}
