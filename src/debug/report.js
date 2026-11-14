/* ═══ v2.3.5122: THE FIELD REPORT, THE PHONE'S SIDE (the grand plan's step 1.1) ═══
 *
 * The owner's iPhone has been the game's only measure of how it runs: each
 * hitch found by hand, one at a time (docs/specs/held-sweep.md).  A session
 * cannot reach the live game, so "how does it run on X" had no answer.  So
 * every phone sends, every few minutes, how smoothly the game ran on it: one
 * `report` message on the game's own socket.  The worker adds it into the
 * day's bins by CELL (the device class, the lane, the switches, the build)
 * and the report loses its player there: no name, no id, no address
 * (server/src/report.js, card A's PR 4; the shape is docs/SHAPES.md part 4).
 *
 * NUMBERS AND CLOSED LISTS ONLY: nothing a phone could write as free text
 * reaches a table a coding session reads (the plan's part 8).  Every field:
 *
 *   v         1, the shape's number
 *   devClass  the device class's twelve facts (game/deviceProfile.js)
 *   drawLane  'full': the one lane until card O makes lanes (step 2.1)
 *   sw        the memory savers the worker has turned off for every phone,
 *             ids of game/clientOff.js CLIENT_SAVERS -- never a name read
 *             off the address bar
 *   build     the N of this page's v2.3.N
 *   secs      seconds this report covers; `seen` those the page was visible
 *   drawn     frames drawn in them
 *   gaps      the time between drawn frames, as counts in GAP_EDGES' bins
 *   late      [late, judged] by the frame pacer's own rule, only where the
 *             pacer judges (a screen faster than about 70 a second): ABSENT
 *             otherwise.  Never the strip's count or perfTracker's
 *   split     where the late frames' time went, whole ms: sim, tile, entity,
 *             effects, fps, app, then outside -- or busy and wait in its
 *             place where the busy beat runs (`?perf=1`)
 *   holds     the worst 5 [name, ms, where, near], names from the one list
 *             (holdNames.js; the frame meter's ring, perfTracker)
 *   where     where the player was most of those seconds (WHERE)
 *   near      the most other players near at once (renderFrame.js `others`)
 *   mem       [tex, gpu, snd] whole MB: the art from files, the pictures on
 *             the chip, the sound decoded (the three a page can read)
 *   lost      [contexts lost, renderers rebuilt] in those seconds
 *   died      ONCE, in the first report after the page's first join: ['no'],
 *             or ['killed' | 'evicted', MB of art, minutes up, rebuilds,
 *             where] -- the last page's last mark (debug/crashTrap.js)
 *
 * The worker's own three (the line's delay, how much it wavers, the moves
 * this sitting sent) are never asked of the phone.
 *
 * OFF THE FRAME, AND CHEAP: nothing here runs inside the game's frame or
 * measures the page.  A timer every POLL_MS reads the frame meter's ring
 * (600 frames: over 4 s at 144 a second) and the ring of holds, and adds
 * what is new into the open report's bins; building and sending one is done
 * on the same timer, every EVERY_MS (the first FIRST_MS after the first
 * join).  Sent only to a worker that takes one (takesReports: its
 * state_sync says `caps.report`, v2.3.5123): either side ships first, and an
 * older worker is sent nothing (v2.3.5122 was the phone's half alone; the
 * house's caps-audit fails a cap the phone reads that no worker advertises,
 * so the cap and its read came together).
 *
 * v2.3.5127, the gatekeeper's review (sitting 3): a report is of the time
 * the page was SEEN.  The first frame after a hidden spell spans the whole
 * spell (the loop's own gap: BroTown.jsx `S._perf.prevT`), so a frame whose
 * gap holds a return to view is not counted (addFrames); `seen` is counted
 * at each change of visibility, not guessed at the timer; `where` adds only
 * seen time; a report with under MIN_SECS seen is not sent; and the switch
 * turned back on starts a fresh report (nothing of the time it was off).
 *
 * THE SWITCH: on for every player (the owner's call 1), off from the About
 * panel (kept on this device, OFF_KEY) or with `?report=0` for one tab.  The
 * worker's kill switch is `report: false` in the live flags.
 */
import { perfTracker } from './perfTracker.js';
import { busyIn } from './busyBeat.js';
import { holdOf } from './holdNames.js';
import { lastDeath, glLostCount, setMarkWhere } from './crashTrap.js';
import { devClass } from '../game/deviceProfile.js';
import { CLIENT_SAVERS, clientOff } from '../game/clientOff.js';
import { PACE_FAST_MS, PACE_BREAK_MS } from '../game/framePacer.js';
import { wheelHere } from '../game/wheelTrial.js';

export const REPORT = Object.freeze({
  V: 1,
  POLL_MS: 2000,
  FIRST_MS: 60 * 1000,
  EVERY_MS: 5 * 60 * 1000,
  /* a report of less than this is not worth a message (a tab that left) */
  MIN_SECS: 20,
  /* v2.3.5127: a poll this far past its time is a page that was frozen */
  THAW_MS: 8000,
  HOLDS: 5,
});
/* the bins' upper edges, ms (docs/SHAPES.md part 4: each bin one rate a frame
   can come at -- 120 a second or faster, 90, 72, 60, 45 to 48, 40, 30, 20, 10,
   and a freeze -- each edge between the whole-ms readings of two rates) */
export const GAP_EDGES = Object.freeze([10, 12.5, 15, 18.5, 24, 29, 42, 75, 150]);
export const WHERE = Object.freeze(['town', 'farm', 'dungeon', 'commons', 'frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant', 'other']);
export const DRAW_LANE = 'full';
const OFF_KEY = 'bt_report';

/** The bin a gap between two drawn frames falls in, 0..9. */
export function gapBin(ms) {
  for (let i = 0; i < GAP_EDGES.length; i++) if (ms < GAP_EDGES[i]) return i;
  return GAP_EDGES.length;
}

/** Where a page is, a word of WHERE: a dungeon, the farm, and in the world the
 *  region under the player (the town, the commons round it, a land). */
export function whereOf(zone, region) {
  const z = String(zone || '');
  if (z.startsWith('dungeon')) return 'dungeon';
  if (z === 'farm_home') return 'farm';
  if (z === 'wheel') return WHERE.includes(region) ? region : 'other';
  return 'other';
}

/** The N of a build's 2.3.N, or 0. */
export function buildOf(version) {
  const m = /^2\.3\.(\d+)$/.exec(String(version || ''));
  return m ? +m[1] : 0;
}

const _w = (v) => Math.max(0, Math.round(Number(v) || 0));

/** The switch: on unless this device turned it off, or `?report=0`. */
export function reportOn() {
  try { if (typeof window !== 'undefined' && /(^|[?&])report=0(&|$)/.test(window.location.search || '')) return false; } catch (e) { /* on */ }
  try { return !(typeof localStorage !== 'undefined' && localStorage.getItem(OFF_KEY) === 'off'); } catch (e) { return true; }
}
/** The About panel's switch, kept on this device. */
export function setReportOn(on) {
  try { if (on) localStorage.removeItem(OFF_KEY); else localStorage.setItem(OFF_KEY, 'off'); } catch (e) { /* this tab only */ }
  /* v2.3.5127: off throws the open report away; on starts a fresh one at the
     poll (_poll: no report open), from the rings' newest -- never the time
     it was off */
  _a = null;
}

/* ── the open report ── */
let _S = null;            /* the game's state (wsClient, at each state_sync) */
let _timer = null;
let _joinedAt = 0;        /* the page's first join */
let _dueAt = 0;
let _died = null;         /* the first report's `died` (null: sent, or not yet decided) */
let _diedOwed = false;
let _lastFrameT = -Infinity, _lastHoldT = -Infinity;
let _a = null;            /* the bins */
/* v2.3.5127: the page's visibility: since when it is in view (Date.now(),
   null while hidden), and when it came back to view the last few times
   (performance.now(), the frame meter's clock: a frame whose gap holds one
   is the hidden spell, not a frame) */
let _visSince = null;
const _shows = [];
const SHOWS_KEEP = 8;
let _last = null;         /* QA: the last report built, sent or not */
let _sent = 0, _dropped = 0;

function _visibleNow() {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}
/* v2.3.5127: the seen time of the open report, to `now` */
function _seenMs(a, now) {
  return a.seenMs + (_visSince != null ? Math.max(0, now - Math.max(_visSince, a.t0)) : 0);
}
function _markShow(p) {
  _shows.push(p);
  if (_shows.length > SHOWS_KEEP) _shows.shift();
}
let _lastPollP = 0;
function _onVisibility(ev) {
  try {
    const now = Date.now();
    /* v2.3.5127: `pageshow` too (a page back from the browser's cache) */
    if (_visibleNow() || (ev && ev.type === 'pageshow')) {
      if (_visSince == null) _visSince = now;
      _markShow(typeof performance !== 'undefined' ? performance.now() : 0);
    } else {
      if (_a && _visSince != null) _a.seenMs += Math.max(0, now - Math.max(_visSince, _a.t0));
      _visSince = null;
    }
  } catch (e) { /* the report's own */ }
}
/* a fresh report from now: the rings read from their newest */
function _restart(now) {
  _reset(now);
  const fr = perfTracker.getSamples(), ex = perfTracker.getExtEvents();
  if (fr.length) _lastFrameT = fr[fr.length - 1].t;
  if (ex.length) _lastHoldT = ex[ex.length - 1].t;
}

/** The frame meter's new samples (after `fromT`) into the bins `a`: a frame
 *  whose gap holds a return to view (`shows`, the frame meter's clock) is the
 *  hidden spell, and not counted; the pacer's rule judges where it judges
 *  (`pace`: framePacer.js read()).  Returns { lastT, near } (the newest
 *  sample's time, the near count at it).  Pure but for busyIn (the busy beat,
 *  `?perf=1` only): the suite's. */
export function addFrames(a, samples, fromT, shows, pace) {
  const judging = !!(pace && pace.refresh && pace.refresh < PACE_FAST_MS);
  const lateOver = judging ? (pace.every || 1) * pace.refresh + pace.refresh / 2 : Infinity;
  let nearNow = 0, lastT = fromT;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    if (!x || !(x.t > fromT)) continue;
    lastT = x.t;
    const total = x.totalMs || 0;
    nearNow = x.others || 0;
    let spansShow = false;
    for (let k = 0; k < (shows ? shows.length : 0); k++) if (shows[k] > x.t - total && shows[k] <= x.t) { spansShow = true; break; }
    if (spansShow) continue;   /* the hidden spell, not a frame */
    a.drawn++;
    a.gaps[gapBin(total)]++;
    if (nearNow > a.near) a.near = nearNow;
    if (!judging || !(total > 0) || total > PACE_BREAK_MS) continue;
    a.judged++;
    if (!(total > lateOver)) continue;
    a.late++;
    /* the strip's split of a late frame (perfHud.js): the game's own parts,
       and the rest outside it -- busy or waiting where the beat can say */
    const work = x.workMs || 0, outside = Math.max(0, total - work);
    const sp = a.split;
    sp[0] += x.simMs || 0; sp[1] += x.tileMs || 0; sp[2] += x.entityMs || 0;
    sp[3] += x.effectsMs || 0; sp[4] += x.fpsMs || 0; sp[5] += x.appMs || 0; sp[6] += outside;
    const start = x.t - work, prev = i > 0 ? samples[i - 1] : null;
    const b = busyIn(start - total, start, prev ? [_frameOf(prev)] : null);
    if (b == null) a.beatAll = false;
    else { const bb = Math.min(outside, b); a.busy += bb; a.wait += Math.max(0, outside - bb); }
  }
  return { lastT, near: nearNow };
}

/** A blank report's bins (the suite's). */
export function blankBins(now) {
  return {
    t0: now, seenMs: 0, lastPoll: now,
    drawn: 0, gaps: new Array(GAP_EDGES.length + 1).fill(0),
    late: 0, judged: 0, split: [0, 0, 0, 0, 0, 0, 0], busy: 0, wait: 0, beatAll: true,
    holds: [], whereMs: Object.create(null), near: 0,
    lost0: glLostCount(), rb0: _rebuilds(),
  };
}
function _reset(now) {
  _a = blankBins(now);
}
function _rebuilds() {
  try { return (typeof window !== 'undefined' && window.__btGlRebuilds) || 0; } catch (e) { return 0; }
}

function _whereNow(S) {
  try {
    const z = S && S.currentZone;
    const p = S && S.player;
    let region = null;
    if (z === 'wheel' && p) { const h = wheelHere(p.x, p.y); region = h ? h.region : null; }
    return whereOf(S && S._inDungeon ? 'dungeon' : z, region);
  } catch (e) { return 'other'; }
}

/* a frame of the meter's ring: [its start, its end] (perfHud.js frameOf) */
const _frameOf = (x) => [x.t - (x.workMs || 0), x.t];

/* the timer: what is new in the rings, into the bins; a report when due */
function _poll() {
  try {
    const now = Date.now();
    /* v2.3.5127 (sitting 4): switched off -- here, or in another tab -- the
       open report is thrown away, so on again starts fresh */
    if (!reportOn()) { _a = null; return; }
    if (!_S) return;
    if (!_a) _restart(now);   /* v2.3.5127: turned back on: a fresh report */
    const a = _a;
    /* v2.3.5127 (sitting 4): a page iOS froze and thawed with no word to the
       page (docs/specs/return-to-game.md section 2) shows as a poll far past
       its time: the spell is a return to view (its first frame is not a
       frame) and not seen time */
    const late = now - a.lastPoll - REPORT.POLL_MS;
    if (late > REPORT.THAW_MS && _visSince != null) {
      _markShow(_lastPollP + REPORT.POLL_MS);
      a.seenMs -= Math.min(late, Math.max(0, now - Math.max(_visSince, a.t0)));
    }
    _lastPollP = typeof performance !== 'undefined' ? performance.now() : 0;
    const where = _whereNow(_S);
    /* v2.3.5127: only the seen time is time in a place (not a thawed spell) */
    if (_visSince != null) a.whereMs[where] = (a.whereMs[where] || 0) + Math.max(0, now - Math.max(a.lastPoll, _visSince, a.t0) - Math.max(0, late > REPORT.THAW_MS ? late : 0));
    a.lastPoll = now;
    setMarkWhere(where);
    /* the pacer's own rule, with its own refresh and step (framePacer.js
       take(): a run more than half a refresh past its frame is late), only
       where it judges: a refresh it knows, faster than PACE_FAST_MS */
    let pace = null;
    try { pace = typeof window !== 'undefined' && window.__btPace ? window.__btPace() : null; } catch (e) { pace = null; }
    const fr = addFrames(a, perfTracker.getSamples(), _lastFrameT, _shows, pace);
    _lastFrameT = fr.lastT;
    const nearNow = fr.near;
    /* the holds: the ring's new entries that have a name of the list */
    const ext = perfTracker.getExtEvents();
    for (let i = 0; i < ext.length; i++) {
      const e = ext[i];
      if (!e || !(e.t > _lastHoldT)) continue;
      const name = holdOf(e.name);
      if (!name) continue;
      const ms = _w(e.ms);
      const hs = a.holds;
      if (hs.length < REPORT.HOLDS) hs.push([name, ms, where, nearNow]);
      else {
        let lo = 0;
        for (let k = 1; k < hs.length; k++) if (hs[k][1] < hs[lo][1]) lo = k;
        if (ms > hs[lo][1]) hs[lo] = [name, ms, where, nearNow];
      }
    }
    if (ext.length) _lastHoldT = Math.max(_lastHoldT, ext[ext.length - 1].t);
    if (_diedOwed && !_died) { const d = lastDeath(); if (d) _died = _diedOf(d); }
    if (_dueAt && now >= _dueAt) _due(now);
  } catch (e) { /* the report must never break the game */ }
}

function _diedOf(d) {
  if (!d || d.kind === 'no') return ['no'];
  return [d.kind, _w(d.mb), _w(d.up), _w(d.rb), WHERE.includes(d.where) ? d.where : 'other'];
}

/** The open report as the message it would be now (QA reads it; _due sends it). */
export function buildReport(now) {
  const a = _a;
  if (!a) return null;
  const cls = devClass();
  if (!cls) return null;
  const { key, ...facts } = cls;   /* the worker makes the key */
  const tNow = now || Date.now();
  const secs = _w((tNow - a.t0) / 1000);
  let where = 'other', most = -1;
  for (const k in a.whereMs) if (a.whereMs[k] > most) { most = a.whereMs[k]; where = k; }
  let mem = [0, 0, 0];
  try {
    const t = window.__btTex && window.__btTex();
    const g = window.__btGpuTex && window.__btGpuTex();
    const d = window.BT_AUDIO && window.BT_AUDIO.decodedMB && window.BT_AUDIO.decodedMB();
    mem = [_w(t && t.mb), _w(g && g.mb), _w(d && d.mb)];
  } catch (e) { /* what it read stands */ }
  const r = {
    type: 'report', v: REPORT.V, devClass: facts, drawLane: DRAW_LANE,
    sw: CLIENT_SAVERS.filter((c) => clientOff(c.id)).map((c) => c.id),
    build: buildOf(typeof __GAME_VERSION__ !== 'undefined' ? __GAME_VERSION__ : ''),
    secs, seen: Math.min(secs, _w(_seenMs(a, tNow) / 1000)), drawn: a.drawn, gaps: a.gaps.slice(),
    holds: a.holds.slice().sort((x, y) => y[1] - x[1]), where, near: _w(a.near), mem,
    lost: [_w(glLostCount() - a.lost0), _w(_rebuilds() - a.rb0)],
  };
  if (a.judged > 0) {
    r.late = [a.late, a.judged];
    const s = a.split.map(_w);
    r.split = a.beatAll && a.late > 0 ? s.slice(0, 6).concat([_w(a.busy), _w(a.wait)]) : s;
  }
  if (_died) r.died = _died;
  return r;
}

/** Does this socket's worker take a report?  v2.3.5123: one that says
 *  `caps.report` (server/src/report.js; `report: false` in its live flags
 *  un-advertises it). */
export function takesReports(S) {
  return !!(S && S._serverCaps && S._serverCaps.report);
}

/* a report is due: built, sent to a worker that takes one, and a new one opened */
function _due(now) {
  _dueAt = now + REPORT.EVERY_MS;
  const S = _S;
  const r = buildReport(now);
  if (!r) return;   /* no drawing context yet: the bins carry on */
  _last = r;
  /* v2.3.5127: a report of under MIN_SECS SEEN is not worth a message (a hidden tab's) */
  const ok = r.seen >= REPORT.MIN_SECS && takesReports(S) && S.channel && typeof S.channel.send === 'function';
  if (ok && S.channel.send(r) !== false) {
    _sent++;
    if (_died) { _died = null; _diedOwed = false; }   /* once */
  } else _dropped++;
  _reset(now);
}

/** wsClient.js, at every state_sync: the game's state (its caps are this
 *  socket's).  The first join starts the timer and owes the first report its
 *  `died`. */
export function reportJoined(S) {
  try {
    if (!S || typeof window === 'undefined') return;
    _S = S;
    if (_timer) return;
    const now = Date.now();
    _joinedAt = now;
    _dueAt = now + REPORT.FIRST_MS;
    _diedOwed = true;
    /* the report begins at the join: nothing the loading screen drew */
    _restart(now);
    /* v2.3.5127: the seen time, at each change of visibility */
    _visSince = _visibleNow() ? now : null;
    try { if (typeof document !== 'undefined') document.addEventListener('visibilitychange', _onVisibility); } catch (e) { /* none */ }
    try { if (typeof window !== 'undefined') window.addEventListener('pageshow', _onVisibility); } catch (e) { /* none */ }
    _timer = setInterval(_poll, REPORT.POLL_MS);
  } catch (e) { /* never the game's trouble */ }
}

/* QA: the open report as it would go now ({ send: true }: send it now), and
   what this page has done */
if (typeof window !== 'undefined') {
  window.__btReport = (opt) => {
    if (opt && opt.send) { _poll(); _due(Date.now()); }
    return { on: reportOn(), cap: takesReports(_S), joinedAt: _joinedAt,
      dueIn: _dueAt ? _dueAt - Date.now() : null, sent: _sent, dropped: _dropped, diedOwed: _diedOwed,
      open: buildReport(Date.now()), last: _last };
  };
}
