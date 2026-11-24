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
 *   drawLane  the lane this page draws in (game/drawLanes.js, card O's
 *             step 2.1: `full`, `light` or `thirty`), to a worker whose
 *             caps.report is 3 or more (takesLanes); to an older one `full`,
 *             as every page sent before lanes (v2.3.5221)
 *   sw        the memory savers the worker has turned off for every phone,
 *             ids of game/clientOff.js CLIENT_SAVERS -- never a name read
 *             off the address bar
 *   build     the N of this page's v2.3.N
 *   secs      seconds this report covers; `seen` those the page was visible
 *   drawn     frames drawn in them
 *   gaps      the time between drawn frames, as counts in GAP_EDGES' bins
 *   late      [late, judged] by the frame pacer's own rule (framePacer.js
 *             lateOver, never a copy), where the pacer judges: v2.3.5222,
 *             EVERY screen whose refresh it knows (120, 60, 30; before, only
 *             one faster than about 70 a second); ABSENT where it knows none
 *             (the QA box's few frames a second).  Never the strip's count or
 *             perfTracker's
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
 *   rung      v2.3.5222 (card O's governor): [the most rungs taken at once,
 *             the seconds seen below the lane's row] (game/drawLanes.js), to
 *             a worker that takes lanes (takesLanes) only
 *   up        v2.3.6500 (card PH PR 1): which stretch of the page's SEEN
 *             minutes since its first join the report's middle falls in
 *             (UP_EDGES: 0 to 5, 5 to 15, 15 to 30, over 30), a place 0..3:
 *             the frames by minutes played, which is heat (the owner's 106
 *             to 51 a second after 24 minutes, 2026-11-10)
 *   ride      v2.3.6500: [seconds on the board, late, judged] and
 *   rideGaps  the gaps' ten bins, of the frames drawn while riding
 *             (game/ride.js isRiding at each poll: the skateboard's grit,
 *             2026-11-18), where it rode at all
 *   ramps     v2.3.6500: the address bar's switches thrown, `name=word`, by
 *             the page's one reader of the switch table (game/switches.js
 *             thrown), only names the address writes itself; the word as
 *             written where it is one of RAMP_WORDS, else '' (a value)
 *             -- these four to a worker whose caps.report is 4 (takesHeat)
 *   speed     v2.3.5125: the Speed test's card, once, in the first report
 *             after a player runs it (game/speedTest.js): { model, rows },
 *             `model` a place in SPEED_MODELS the player picks (a page
 *             cannot read its model), `rows` [step, fps, p50, p95, work] a
 *             step of SPEED_STEPS, whole numbers.  The report goes early for
 *             it (SPEED_SOON_MS), never sooner than the worker's pace
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
import { devClass, fineInput } from '../game/deviceProfile.js';
import { drawLane, rungDepth } from '../game/drawLanes.js';   /* v2.3.5221: card O's lanes; v2.3.5222 the rung */
import { selfFailures } from '../rendering/selfTest.js';   /* v2.3.5234: the self-test's failures, the report's `self` (card O PR 14a) */
import { CLIENT_SAVERS, clientOff } from '../game/clientOff.js';
import { PACE_BREAK_MS, lateOver, useMemCount } from '../game/framePacer.js';   /* v2.3.5222: the pacer's one rule of a late frame; v2.3.5231 the memory's count */
/* ═══ v2.3.5231 (card O PR 11): THE GAME'S OWN COUNT OF ITS MEMORY, HANDED
   TO THE PACER (the memory's verdict, framePacer.js memOver) -- the same
   three reads as the report's `mem`: the art from files, the chip's
   textures, the decoded sound, in MB.  The chip's only on a phone or a
   tablet (deviceProfile.js: no fine pointer): a computer's screen-sized
   pictures are no fault (the planner's, 2026-11-17). ── */
/* v2.3.6242: the chip's MB, by pixiApp.js __btGpuMb (the same sum as __btGpuTex().mb, without its table of every
   texture: 20 to 52 ms on budget-android, docs/plan/census/HB-holds.md row 8); __btGpuTex where it is missing.
   v2.3.6243: the pacer's count (memCount) too, every 5 s while the governor judges: frame-pacer.test 23c widened
   for it (card HB PR 4, the planning session's yes) */
function gpuMb() {
  if (typeof window === 'undefined') return null;
  if (window.__btGpuMb) return window.__btGpuMb();
  return window.__btGpuTex ? window.__btGpuTex() : null;
}
function memCount() {
  if (typeof window === 'undefined') return null;
  const t = window.__btTex && window.__btTex();
  const g = fineInput() ? null : gpuMb();   /* v2.3.6243: the total alone (pixiApp.js __btGpuMb; card HB PR 4) */
  const d = window.BT_AUDIO && window.BT_AUDIO.decodedMB && window.BT_AUDIO.decodedMB();
  return [Number(t && t.mb) || 0, g ? Number(g.mb) || 0 : null, Number(d && d.mb) || 0];
}
try { useMemCount(memCount); } catch (e) { /* no pacer: no verdict */ }
import { wheelHere } from '../game/wheelTrial.js';
import { act } from '../game/actions.js';   /* v2.3.5189: the page's requests leave through the action door (card K PR 7) */
import { sw, thrown, swHas, swValue } from '../game/switches.js';   /* v2.3.5314: the page's one reader (card T); v2.3.6500 the ramps thrown (card PH PR 1) */
import { isRiding } from '../game/ride.js';   /* v2.3.6500 (card PH PR 1): the board's frames */

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
const OFF_KEY = 'bt_report';
/* v2.3.6500 (card PH PR 1): the stretches of minutes seen, their upper edges
   (server/src/report.js UP_EDGES: report.test holds them equal) */
export const UP_EDGES = Object.freeze([5, 15, 30]);
/* the words a ramp carries after its `=` (server/src/report.js RAMP_WORDS):
   every word a row's form throws with; any other value is sent as '' */
export const RAMP_WORDS = Object.freeze(['', '0', '1', '2', 'off', 'false', 'no', 'all', 'mouse']);
const RAMPS_MAX = 8;

/** v2.3.6500: the stretch `min` seen minutes fall in, 0..3 (the worker's
 *  upBucket is the same rule). */
export function upBucket(min) {
  let i = 0;
  while (i < UP_EDGES.length && !(min < UP_EDGES[i])) i++;
  return i;
}

/** v2.3.6500 (card PH PR 1): the ramps of an address, `name=word`, from its
 *  reader's answers: `names` the thrown names ('?x', thrown()), `has` and
 *  `value` its swHas and swValue.  Only names the address writes itself (a
 *  dependent thrown by what it needs is not sent: the worker could not
 *  check it), sorted, at most RAMPS_MAX.  Pure (the suite's). */
export function rampsOf(names, has, value) {
  const out = [];
  for (const q of Array.isArray(names) ? names : []) {
    const n = String(q).replace(/^\?/, '');
    if (!has(n)) continue;
    const v = value(n);
    const t = n + '=' + (RAMP_WORDS.includes(v) ? v : '');
    if (!out.includes(t)) out.push(t);
  }
  return out.sort().slice(0, RAMPS_MAX);
}

/* ── v2.3.5125: THE SPEED TEST'S CARD (the grand plan's step 1.2) ── */
/* the Speed test's steps (game/speedTest.js steps(): `k`), in its order */
export const SPEED_STEPS = Object.freeze(['all', 'noshadow', 'noshine', 'shinepass', 'threeprog', 'shadowpass', 'still', 'res2', 'bare']);
/* What a player says the device is: a page cannot read its model, so the
   card asks.  A PLACE IN THIS LIST is what is sent and kept (a number, never
   the words): add at the END, never reorder or reword one's meaning, or a
   day's book reads an old number as the new name.  The worker keeps the
   count (server/src/report.js SPEED_MODELS_N, report.test holds it). */
export const SPEED_MODELS = Object.freeze([
  'Not said',
  'iPhone 17 Pro or Pro Max', 'iPhone 17 or iPhone Air', 'iPhone 16 Pro or Pro Max', 'iPhone 16 or 16 Plus or 16e',
  'iPhone 15 Pro or Pro Max', 'iPhone 15 or 15 Plus', 'iPhone 14 Pro or Pro Max', 'iPhone 14 or 14 Plus',
  'iPhone 13 or older', 'iPhone SE', 'iPad',
  'Android phone, from 2023 or newer', 'Android phone, older', 'Android tablet',
  'Mac laptop', 'Mac desktop', 'Windows laptop', 'Windows desktop', 'Chromebook', 'Linux computer',
  'Something else',
]);
/* after a test, the report goes this soon (and not before the worker's pace
   allows: one a socket each 50 s, server/src/report.js) */
const SPEED_SOON_MS = 5 * 1000;
const SPEED_GAP_MS = 60 * 1000;
const MODEL_KEY = 'bt_speed_model';

/** The device the player said this is, a place in SPEED_MODELS (0: not said). */
export function speedModel() {
  try {
    const v = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(MODEL_KEY)) : 0;
    return Number.isInteger(v) && v >= 0 && v < SPEED_MODELS.length ? v : 0;
  } catch (e) { return 0; }
}
/** The player's pick, kept on this device; a card waiting to go takes it. */
export function setSpeedModel(i) {
  const v = Number.isInteger(i) && i >= 0 && i < SPEED_MODELS.length ? i : 0;
  try { localStorage.setItem(MODEL_KEY, String(v)); } catch (e) { /* this tab only */ }
  if (_speed) _speed.model = v;
  return v;
}

/** A Speed test's result as the card the report carries: its rows as
 *  [step, fps, p50, p95, work] whole numbers (`work` -1 where not measured),
 *  steps of SPEED_STEPS only.  Pure (the suite's). */
export function speedCardOf(result, model) {
  if (!result || !Array.isArray(result.rows)) return null;
  const rows = [];
  for (const x of result.rows) {
    if (!x || !SPEED_STEPS.includes(x.k) || rows.some((r) => r[0] === x.k)) continue;
    rows.push([x.k, _w(x.fps), _w(x.p50), _w(x.p95), typeof x.work === 'number' ? _w(x.work) : -1]);
  }
  if (!rows.length) return null;
  return { model: Number.isInteger(model) && model >= 0 && model < SPEED_MODELS.length ? model : 0, rows };
}

/** game/speedTest.js, when a test ends: its card goes with the next report,
 *  and that report goes soon.  Nothing goes with the report switched off. */
export function queueSpeedCard(result) {
  try {
    if (!reportOn() || !takesSpeed(_S)) return false;   /* v2.3.5127: a worker that takes the card (caps.report 2) */
    const card = speedCardOf(result, speedModel());
    if (!card) return false;
    _speed = card;
    const now = Date.now();
    const soon = Math.max(now + SPEED_SOON_MS, _lastSentAt + SPEED_GAP_MS);
    if (_dueAt && soon < _dueAt) _dueAt = soon;
    return true;
  } catch (e) { return false; }
}
/** QA and the card: is a Speed test card waiting for the next report? */
export function speedCardWaiting() { return !!_speed; }

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
  if (sw('report')) return false;
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
const _selfSaid = new Set();   /* v2.3.5234: the self-test's failures, each said once a sitting (v2.3.5236: by name -- 14b's verdicts can come after the first report: the shine's at the loading screen's end, the water's behind the Wheel's, a rebuilt renderer's later still) */
let _diedOwed = false;
let _lastFrameT = -Infinity, _lastHoldT = -Infinity;
let _a = null;            /* the bins */
/* v2.3.5127: the page's visibility: since when it is in view (Date.now(),
   null while hidden), and when it came back to view the last few times
   (performance.now(), the frame meter's clock: a frame whose gap holds one
   is the hidden spell, not a frame) */
let _visSince = null;
/* v2.3.6500 (card PH PR 1): the seen time banked since the first join, apart
   from any report (a report switched off and on again keeps the page's
   minutes): the report's `up` */
let _upBank = 0;
function _upMs(now) {
  return Math.max(0, _upBank + (_visSince != null ? Math.max(0, now - _visSince) : 0));
}
const _shows = [];
const SHOWS_KEEP = 8;
let _last = null;         /* QA: the last report built, sent or not */
let _sent = 0, _dropped = 0;
let _speed = null;        /* v2.3.5125: the Speed test's card, waiting for the next report */
let _lastSentAt = 0;

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
      if (_visSince != null) _upBank += Math.max(0, now - _visSince);   /* v2.3.6500 */
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
export function addFrames(a, samples, fromT, shows, pace, riding) {
  /* v2.3.5222: judged on every screen whose refresh the pacer knows, by its
     own rule (lateOver): the report's `late` and the governor's are one */
  const judging = !!(pace && pace.refresh);
  const lateMs = judging ? lateOver(pace.refresh, pace.every || 1) : Infinity;
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
    if (riding && a.rideGaps) a.rideGaps[gapBin(total)]++;   /* v2.3.6500: the board's own frames */
    if (nearNow > a.near) a.near = nearNow;
    if (!judging || !(total > 0) || total > PACE_BREAK_MS) continue;
    a.judged++;
    if (riding && a.rideGaps) a.rideJudged++;
    if (!(total > lateMs)) continue;
    a.late++;
    if (riding && a.rideGaps) a.rideLate++;
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
    rungMax: 0, belowMs: 0,   /* v2.3.5222: the governor's rung (drawLanes.js) */
    /* v2.3.6500 (card PH PR 1): the seen minutes at the report's start, and
       the board's frames, seconds, late and judged */
    up0: 0, rideGaps: new Array(GAP_EDGES.length + 1).fill(0), rideMs: 0, rideLate: 0, rideJudged: 0,
  };
}
function _reset(now) {
  _a = blankBins(now);
  _a.up0 = _upMs(now);   /* v2.3.6500 */
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
      _upBank -= Math.min(late, Math.max(0, now - _visSince));   /* v2.3.6500: nor the page's minutes */
    }
    _lastPollP = typeof performance !== 'undefined' ? performance.now() : 0;
    const where = _whereNow(_S);
    /* v2.3.5127: only the seen time is time in a place (not a thawed spell) */
    const seenD = _visSince != null ? Math.max(0, now - Math.max(a.lastPoll, _visSince, a.t0) - Math.max(0, late > REPORT.THAW_MS ? late : 0)) : 0;
    if (_visSince != null) a.whereMs[where] = (a.whereMs[where] || 0) + seenD;
    /* v2.3.5222: the governor's rung -- the most rungs taken at once, and the
       seen time spent below the lane's row */
    const depth = rungDepth();
    if (depth > a.rungMax) a.rungMax = depth;
    if (depth > 0) a.belowMs += seenD;
    /* v2.3.6500 (card PH PR 1): on the board now: the frames since the last
       poll are the board's (a poll every 2 s), and the seen time */
    let riding = false;
    try { riding = isRiding(_S); } catch (e) { riding = false; }
    if (riding) a.rideMs += seenD;
    a.lastPoll = now;
    setMarkWhere(where);
    /* the pacer's own rule, with its own refresh and step (framePacer.js
       lateOver: a run more than half a refresh past its frame is late),
       where it judges: v2.3.5222, a refresh it knows, on every screen */
    let pace = null;
    try { pace = typeof window !== 'undefined' && window.__btPace ? window.__btPace() : null; } catch (e) { pace = null; }
    const fr = addFrames(a, perfTracker.getSamples(), _lastFrameT, _shows, pace, riding);
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
    const g = gpuMb();   /* v2.3.6242: the total alone, not __btGpuTex's table (card HB PR 3) */
    const d = window.BT_AUDIO && window.BT_AUDIO.decodedMB && window.BT_AUDIO.decodedMB();
    mem = [_w(t && t.mb), _w(g && g.mb), _w(d && d.mb)];
  } catch (e) { /* what it read stands */ }
  const r = {
    /* v2.3.5221: the lane from the same class the report sends (drawLanes.js
       pickLane, through drawLane: `?lane=` wins), to a worker that takes
       lanes; `full` to one that does not */
    type: 'report', v: REPORT.V, devClass: facts, drawLane: takesLanes(_S) ? drawLane(cls) : 'full',
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
  /* v2.3.5222: the governor's rung, to a worker that takes lanes (caps.report 3) */
  if (takesLanes(_S)) r.rung = [_w(a.rungMax), Math.min(secs, _w(a.belowMs / 1000))];
  /* v2.3.5234 (card O PR 14a): the programs that failed their self-test at the
     door (rendering/selfTest.js), once a sitting, to a worker that takes lanes */
  if (takesLanes(_S)) { try { const sf = selfFailures().filter((n) => !_selfSaid.has(n)); if (sf.length) r.self = sf; } catch (e) { /* none said */ } }
  /* v2.3.5127 (sitting 4): the card goes only to a worker that takes it;
     to one that does not, it waits (and is not cleared by the send) */
  /* v2.3.6500 (card PH PR 1): the minutes seen, the board and the ramps, to
     a worker that takes them (caps.report 4) */
  if (takesHeat(_S)) {
    r.up = upBucket((a.up0 + _upMs(tNow)) / 2 / 60000);
    const rideDrawn = a.rideGaps.reduce((x, y) => x + y, 0);
    if (a.rideMs > 0 || rideDrawn > 0) {
      r.ride = [Math.min(r.seen, _w(a.rideMs / 1000)), a.judged > 0 ? a.rideLate : 0, a.judged > 0 ? a.rideJudged : 0];
      r.rideGaps = a.rideGaps.slice();
    }
    try { const rp = rampsOf(thrown(), swHas, swValue); if (rp.length) r.ramps = rp; } catch (e) { /* none said */ }
  }
  if (_speed && takesSpeed(_S)) r.speed = { model: _speed.model, rows: _speed.rows.map((x) => x.slice()) };
  return r;
}

/** Does this socket's worker take a report?  v2.3.5123: one that says
 *  `caps.report` (server/src/report.js; `report: false` in its live flags
 *  un-advertises it). */
export function takesReports(S) {
  return !!(S && S._serverCaps && S._serverCaps.report);
}

/** v2.3.5127 (sitting 4's review: the card had no cap of its own, and a
 *  worker that took reports dropped it while the player read that it "goes
 *  to the game"): the cap grew -- `caps.report` 2 takes the Speed test's
 *  card too (`reportspeed: false` in its live flags: back to 1). */
export function takesSpeed(S) {
  return !!(S && S._serverCaps && Number(S._serverCaps.report) >= 2);
}

/** v2.3.5221: card O's lanes -- `caps.report` 3 takes a lane but `full`, the
 *  governor's `rung` and the self-test's `self` (`reportlanes: false` in its
 *  live flags: back to 2, and the page sends `full`, no `rung`, no `self`). */
export function takesLanes(S) {
  return !!(S && S._serverCaps && Number(S._serverCaps.report) >= 3);
}

/** v2.3.6500 (card PH PR 1): `caps.report` 4 takes the minutes seen, the
 *  board and the address bar's ramps (`reportheat: false` in its live flags:
 *  back to 3, and the page sends none of the four). */
export function takesHeat(S) {
  return !!(S && S._serverCaps && Number(S._serverCaps.report) >= 4);
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
  if (ok && act('report', r) !== false) {   /* v2.3.5189: through the action door (actions.js) */
    _sent++;
    _lastSentAt = now;
    if (_died) { _died = null; _diedOwed = false; }   /* once */
    if (r.self) for (const n of r.self) _selfSaid.add(n);   /* v2.3.5234: once a sitting (v2.3.5236: each name) */
    if (r.speed) _speed = null;   /* v2.3.5125: the card went with it */
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
    /* v2.3.5221 (card O PR 1; card P's held sweep found `wrapped > _poll >
       _due` holding the page 18.4 ms in the town): the device class's chip
       facts (deviceProfile.js chipFacts: getParameter and the precision,
       which may wait for the chip) are asked ONCE a drawing context and kept.
       The first ask was the first report's, a minute into play; now it is at
       every join, behind its loading screen (cheap once kept; a renderer
       rebuilt is a new context, asked again at the rejoin), and the lane
       (drawLanes.js) is picked from that class then too */
    try { drawLane(devClass()); } catch (e) { /* the first report asks */ }
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

/* ═══ v2.3.5125: THE BOOK AS TEXT (the Test panel's "Copy table") ═══
   Until a reader can bring the book into the repository (step 1.3, the
   owner's call 6), the owner pastes it: the days' `dev` and `speed` parts
   from the worker's one admin route (GET /dev/daybook, devtools.js), as
   plain lines, a cell's sums as means where a mean is what a person reads.
   Numbers and the game's own names only: nothing in it came from a phone as
   words (every key is the worker's, from its closed lists). */
const _mean = (sum, n) => (n > 0 ? Math.round((sum / n) * 10) / 10 : 0);
export function bookTableText(days) {
  const out = [];
  const list = Array.isArray(days) ? days : [];
  out.push('BroTown smoothness table (v' + REPORT.V + '): ' + list.length + ' day(s), newest first. A cell is: shape | device class '
    + '(gl-soft-maxTex-prec-units-mp-dpr-hz-fill-input-frame-cores) | lane | switches (a saver, or an address\'s `name=word`) | build (`preview`: any page off the game\'s own site).');
  out.push('gaps bins (ms): <' + GAP_EDGES.join(', <') + ', more.  where: ' + WHERE.join(' ') + '.  speed rows: step fps p50 p95 work (means of the runs).');
  for (const d of list) {
    out.push('');
    out.push('== day ' + (d && d.day) + (d && d.over && Object.keys(d.over).length ? '  (refused as over a part\'s size: ' + JSON.stringify(d.over) + ')' : ''));
    const dev = (d && d.dev) || {};
    const cells = Object.keys(dev).sort();
    out.push('-- smoothness: ' + cells.length + ' cell(s)');
    for (const k of cells) {
      const c = dev[k] || {};
      const n = c.n || 0;
      out.push(k + '  reports ' + n + '  seen secs ' + (c.seen || 0) + ' (of ' + (c.secs || 0) + ' covered)');
      if (c.gaps) out.push('  gaps ' + c.gaps.join(' '));
      if (c.late) out.push('  late ' + c.late[0] + ' of ' + c.late[1] + ' judged' + (c.split ? '  split ms sim,tile,entity,effects,fps,app,outside,busy,wait ' + c.split.join(' ') : ''));
      /* v2.3.5127 (sitting 4): the cell's smaller shape -- places and deaths
         as maps, `near` and the line as sums (a mean: / n), holds by name */
      const map = (o) => Object.keys(o).sort().map((w) => w + ' ' + o[w]).join(', ');
      if (c.where && typeof c.where === 'object') out.push('  where (seen secs) ' + map(c.where));
      if (typeof c.near === 'number') out.push('  near (the most others at once, mean) ' + _mean(c.near, n));
      if (c.mem) out.push('  mem mean MB tex ' + _mean(c.mem[0], n) + ' gpu ' + _mean(c.mem[1], n) + ' snd ' + _mean(c.mem[2], n));
      if (c.lost) out.push('  lost contexts ' + c.lost[0] + ', rebuilt ' + c.lost[1]);
      if (c.died) out.push('  died no ' + c.died[0] + ' killed ' + c.died[1] + ' evicted ' + c.died[2] + (c.diedMem ? '  (their MB ' + c.diedMem[0] + ', min up ' + c.diedMem[1] + ', rebuilds ' + c.diedMem[2] + ')' : '')
        + (c.diedAt && typeof c.diedAt === 'object' ? '  where ' + map(c.diedAt) : ''));
      if (c.line) out.push('  line mean ms: delay ' + _mean(c.line[0], n) + ', waver ' + _mean(c.line[1], n));
      /* v2.3.6500 (card PH PR 1): by minutes seen (heat), and the board's own frames */
      if (c.up && typeof c.up === 'object') {
        const rows = ['m0', 'm5', 'm15', 'm30'].filter((k) => Array.isArray(c.up[k])).map((k) => {
          const [sn, dr, lt, bl] = c.up[k];
          return k.slice(1) + '+ min: ' + _mean(dr, sn) + ' fps, late ' + (dr > 0 ? Math.round((1000 * lt) / dr) / 10 : 0) + '%, ' + bl + ' of ' + sn + ' secs below the row';
        });
        if (rows.length) out.push('  by minutes seen  ' + rows.join('; '));
      }
      if (Array.isArray(c.ride)) {
        const [rn, rs, rd, rl, rlong] = c.ride;
        out.push('  riding (' + rn + ' reports, ' + rs + ' secs): ' + _mean(rd, rs) + ' fps, late ' + (rd > 0 ? Math.round((1000 * rl) / rd) / 10 : 0) + '%, frames past 42 ms ' + rlong);
      }
      if (c.holds) {
        const hs = Object.keys(c.holds).map((h) => [h, c.holds[h]]).sort((a, b) => b[1][1] - a[1][1]);
        out.push('  holds (name: times, ms in all) ' + hs.map(([h, v]) => h + ' ' + v[0] + 'x ' + v[1] + 'ms').join('; '));
      }
    }
    const sp = (d && d.speed) || {};
    const keys = Object.keys(sp).sort();
    out.push('-- speed test: ' + keys.length + ' card(s)');
    for (const k of keys) {
      const c = sp[k] || {};
      const parts = k.split('|');
      const model = SPEED_MODELS[Number(parts[1])] || ('model ' + parts[1]);
      out.push(k + '  (' + model + ')  runs ' + (c.n || 0));
      for (const st of SPEED_STEPS) {
        const v = c[st];
        if (!v || !v[0]) continue;
        out.push('  ' + st + '  ' + [1, 2, 3, 4].map((i) => (i === 4 && v[5] ? _mean(v[4], v[0] - v[5]) : _mean(v[i], v[0]))).join(' ') + (v[5] ? '  (work not measured in ' + v[5] + ')' : ''));
      }
    }
  }
  return out.join('\n');
}

/* QA: the open report as it would go now ({ send: true }: send it now), and
   what this page has done */
if (typeof window !== 'undefined') {
  window.__btReport = (opt) => {
    if (opt && opt.send) { _poll(); _due(Date.now()); }
    return { on: reportOn(), cap: takesReports(_S), speedCap: takesSpeed(_S), lanesCap: takesLanes(_S), heatCap: takesHeat(_S), upMin: Math.round(_upMs(Date.now()) / 600) / 100, joinedAt: _joinedAt,
      dueIn: _dueAt ? _dueAt - Date.now() : null, sent: _sent, dropped: _dropped, diedOwed: _diedOwed, speed: _speed,
      open: buildReport(Date.now()), last: _last };
  };
}
