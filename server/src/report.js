/* ═══ v2.3.5123: THE FIELD REPORT, THE WORKER'S SIDE (the grand plan's step 1.1) ═══
 *
 * The owner's iPhone was the game's only measure of how it runs, each hitch
 * found by hand.  Every phone now sends, every five minutes, how smoothly the
 * game ran on it: one `report` message on the game's own socket (the phone's
 * half: src/debug/report.js; the shape: docs/SHAPES.md part 4).  This file is
 * its one handler and its spec (card A's PR 4; as daybook.js, the header is
 * the spec).
 *
 * NUMBERS AND CLOSED LISTS ONLY.  Every field is checked here, and a value
 * off its range or its list is DROPPED: nothing a phone wrote as free text
 * reaches a table a coding session reads (the plan's part 8).  The lists are
 * copies of the phone's, held equal to them by server/test/report.test.mjs
 * (the device class's: src/game/deviceProfile.js DEV_CLASS; the savers':
 * src/game/clientOff.js CLIENT_SAVERS; the places and bins:
 * src/debug/report.js; the holds' names: src/debug/holdNames.js).
 *
 * TWO SINKS (SHAPES part 4):
 *   - SMOOTHNESS: the day's book's `dev` part (daybook.js bookAdd, card E's
 *     door), by CELL: the report's shape number, the device class's key, the
 *     lane, the switches (`none`, the one saver's id, or `many`) and the
 *     build -- `1|2-0-16384-16-16-4-3-120-none-touch-0-4|full|none|5123`.
 *     IT LOSES ITS PLAYER: no pid, no sitting, no address, no time finer than
 *     the day reaches it.  Under a cell, every leaf is a sum, so days and
 *     phones add (DEV below);
 *   - THE SITTING'S CARD (card Q, step 10.2): `soft`, `build`, `seen`,
 *     `drawn` against the worker's own count of moves.  Card Q builds the
 *     card; until then these facts are DROPPED here (they ride the message
 *     already, so the phone's side is built once).
 *
 * The worker's own three are never asked of the phone (pillar 4: the server
 * believes nothing it cannot bound):
 *   - `delay`: the line's round trip, session.rtt as the report arrives;
 *   - `waver`: how much the round trip wavers, session.rttWaver -- NEW, kept
 *     in index.js `case 'pong'` (rttWaverNext below): the smoothed distance
 *     of each sample from the smoothed round trip before it;
 *   - `moves`: the card's, the worker's count (movement's ps._sprintTally),
 *     read when card Q's card exists.
 *
 * THE PACE: one report a socket each PACE_MS (the phone sends one a minute
 * after its join and then every five).  One sooner is dropped, and nothing
 * is written for it.  The book itself writes at most one row a pace
 * (daybook.js), so a report costs no row of its own.
 *
 * THE KILL SWITCH `report: false` in the live flags (liveops.js
 * `_reportOff`): `caps.report` is not advertised, so the phone sends nothing,
 * and a report that still comes (an older socket) is dropped.
 *
 * Suite: server/test/report.test.mjs.
 */
import { bookAdd } from './daybook.js';

export const REPORT = Object.freeze({
  V: 1,
  /* v2.3.5123: one a socket a minute at most, a little under the phone's
     first (60 s after its join): the phone's every five minutes pass, a
     script's flood does not */
  PACE_MS: 50 * 1000,
  /* the ranges a number may take; past one, the field is dropped */
  SECS_MAX: 24 * 3600,          /* a hidden tab's timer is slowed: one report may cover hours */
  FPS_MAX: 250,                 /* frames a second, at most, for `drawn` against `secs` */
  HOLD_MS_MAX: 60 * 1000,
  NEAR_MAX: 500,
  MB_MAX: 8192,
  LOST_MAX: 1000,
  UP_MAX: 100000,               /* minutes a dead page had been up */
  BUILD_MAX: 99999,
  HOLDS_MAX: 5,
  SW_MAX: 32,
});

/* ── the closed lists: the phone's, copied (report.test holds them equal) ── */
/* src/game/deviceProfile.js DEV_CLASS, in its key's order */
export const DEV_CLASS = Object.freeze({
  gl: Object.freeze([1, 2]),
  soft: Object.freeze([0, 1]),
  maxTex: Object.freeze([2048, 4096, 8192, 16384]),
  prec: Object.freeze([16, 32]),
  units: Object.freeze([8, 16, 32]),
  mp: Object.freeze([1, 2, 3, 4, 6, 9, 12]),
  dpr: Object.freeze([1, 1.5, 2, 3, 4]),
  hz: Object.freeze([30, 60, 90, 120, 144, 'other']),
  fill: Object.freeze(['fast', 'mid', 'slow', 'none']),
  input: Object.freeze(['mouse', 'touch']),
  frame: Object.freeze([0, 1]),
  cores: Object.freeze([2, 4, 8, 16]),
});
/* card O's lanes (step 2.1); until then the one */
export const DRAW_LANES = Object.freeze(['full']);
/* src/game/clientOff.js CLIENT_SAVERS' ids */
export const SAVERS = Object.freeze(['sfxcache', 'voicecap', 'onecopy', 'picnumbers', 'codelazy', 'groundlean', 'heaplean',
  'lookpalette', 'lookshirt', 'soundgate', 'lookarmour', 'lookfolk', 'gfxlean', 'viewcap']);
/* src/debug/report.js WHERE and GAP_EDGES (ten bins) */
export const WHERE = Object.freeze(['town', 'farm', 'dungeon', 'commons', 'frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant', 'other']);
export const GAP_BINS = 10;
export const DIED = Object.freeze(['no', 'killed', 'evicted']);
/* src/debug/holdNames.js HOLD_NAMES */
export const HOLD_NAMES = Object.freeze([
  'body-bake', 'standin-bake', 'gear-sheet', 'head-piece', 'masked-bake', 'strip-page', 'pack-page', 'strip-made',
  'monster-recolour', 'object-bases', 'object-page', 'screen-check', 'portrait', 'map', 'codex', 'ground', 'sound',
  'text', 'server-message', 'gc',
  'the frame itself', 'ui:*', 'other: wrapped > sweepPicsOnce', 'other: BT_AUDIO$1._fold > foldToMono', 'other: R > J',
  'other: createObjectURL', 'other: _flushOutbox > Wrapped.ws.send',
]);

/* ── the worker's own numbers, binned (upper edges, ms; one more bin past the last) ── */
export const DELAY_EDGES = Object.freeze([25, 50, 100, 150, 200, 300]);
export const WAVER_EDGES = Object.freeze([5, 10, 20, 40, 80]);
/* the most other players near at once: 0, 1, 2-3, 4-7, 8-15, 16 or more */
export const NEAR_EDGES = Object.freeze([1, 2, 4, 8, 16]);

/* ── a cell's sums (each a number or an array of numbers, so days add) ──
 *   n        reports
 *   secs     seconds covered
 *   gaps     the frames' gaps, in the phone's ten bins
 *   late     [late, judged]: only reports that carried a verdict add here
 *   split    [sim, tile, entity, effects, fps, app, outside, busy, wait] ms:
 *            a report with busy and wait adds their sum to `outside` too, so
 *            `outside` is every report's and busy + wait the beat's share
 *   holds    { '<name>|<where>': [count, ms, near] }, the name made safe for
 *            a key (holdKey)
 *   where    seconds by WHERE's order
 *   near     reports by NEAR_EDGES' bins
 *   mem      [tex, gpu, snd] MB summed (a mean: / n)
 *   lost     [contexts lost, renderers rebuilt]
 *   died     reports by DIED's order (the first report after a join only)
 *   diedMem  [MB, minutes up, rebuilds] of the pages that died, summed
 *   diedAt   the pages that died by WHERE's order
 *   delay    reports by DELAY_EDGES' bins (the worker's)
 *   waver    reports by WAVER_EDGES' bins (the worker's) */

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const int = (v, lo, hi) => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
const ints = (a, n, lo, hi) => {
  if (!Array.isArray(a) || a.length !== n) return null;
  for (const x of a) if (int(x, lo, hi) === null) return null;
  return a.slice();
};
const binOf = (edges, v) => { let i = 0; while (i < edges.length && v >= edges[i]) i++; return i; };
const oneHot = (n, i, by = 1) => { const a = new Array(n).fill(0); a[i] = by; return a; };

/** A hold's key in the book: its name made safe (daybook.js takes letters,
 *  digits and _.:|,+=- in a key) and its place. */
export function holdKey(name, where) {
  return String(name).replace(/[^A-Za-z0-9_.:,+=-]/g, '_') + '|' + where;
}

/** The device class, checked: every field on its list, or null.  -> {key}. */
export function classOfReport(c) {
  if (!isObj(c)) return null;
  const vals = [];
  for (const k of Object.keys(DEV_CLASS)) {
    if (!has(c, k) || !DEV_CLASS[k].includes(c[k])) return null;
    vals.push(String(c[k]));
  }
  return { key: vals.join('-'), soft: c.soft };
}

/** The switches' part of a cell: 'none', the one saver's id, or 'many' (the
 *  plan's rule 4: two configurations, all new or exactly one switch thrown,
 *  and the rest apart).  Ids off the list are dropped. */
export function swCell(sw) {
  if (!Array.isArray(sw)) return 'none';
  const ids = [];
  for (const s of sw.slice(0, REPORT.SW_MAX)) if (typeof s === 'string' && SAVERS.includes(s) && !ids.includes(s)) ids.push(s);
  return ids.length === 0 ? 'none' : ids.length === 1 ? ids[0] : 'many';
}

/** The next waver (index.js case 'pong'): the smoothed distance of `sample`
 *  from the smoothed round trip BEFORE it, the same weight as the round
 *  trip's own, capped as it is. */
export function rttWaverNext(waver, sample, rttBefore, alpha, cap) {
  const w = typeof waver === 'number' && waver >= 0 ? waver : 0;
  const d = Math.abs((Number(sample) || 0) - (Number(rttBefore) || 0));
  return Math.min(cap, w * (1 - alpha) + d * alpha);
}

/** A report, checked, as what it adds to its cell -- or null (dropped: no
 *  cell can be made).  `own`: the worker's own numbers ({ delay, waver }).
 *  Pure: the suite reads it. */
export function reportSums(msg, own) {
  if (!isObj(msg) || msg.v !== REPORT.V) return null;
  const cls = classOfReport(msg.devClass);
  if (!cls) return null;
  if (!DRAW_LANES.includes(msg.drawLane)) return null;
  const build = int(msg.build, 0, REPORT.BUILD_MAX);
  if (build === null) return null;
  const secs = int(msg.secs, 1, REPORT.SECS_MAX);
  if (secs === null) return null;
  const cell = REPORT.V + '|' + cls.key + '|' + msg.drawLane + '|' + swCell(msg.sw) + '|' + build;
  const s = Object.create(null);
  s.n = 1;
  s.secs = secs;
  /* the frames: drawn at most FPS_MAX a second, and the gaps' bins add to it */
  const drawn = int(msg.drawn, 0, secs * REPORT.FPS_MAX);
  const gaps = drawn === null ? null : ints(msg.gaps, GAP_BINS, 0, drawn);
  if (gaps && gaps.reduce((a, b) => a + b, 0) === drawn) s.gaps = gaps;
  /* the pacer's verdict, only where it gave one: late <= judged <= drawn */
  const late = drawn === null ? null : ints(msg.late, 2, 0, drawn);
  if (late && late[0] <= late[1]) {
    s.late = late;
    const msMax = secs * 1000;
    const sp = Array.isArray(msg.split) && (msg.split.length === 7 || msg.split.length === 8) ? ints(msg.split, msg.split.length, 0, msMax) : null;
    if (sp) s.split = sp.length === 7 ? sp.concat([0, 0]) : sp.slice(0, 6).concat([sp[6] + sp[7], sp[6], sp[7]]);
  }
  const where = WHERE.includes(msg.where) ? msg.where : null;
  if (where) s.where = oneHot(WHERE.length, WHERE.indexOf(where), secs);
  const near = int(msg.near, 0, REPORT.NEAR_MAX);
  if (near !== null) s.near = oneHot(NEAR_EDGES.length + 1, binOf(NEAR_EDGES, near));
  /* the worst holds: names of the one list only */
  if (Array.isArray(msg.holds)) {
    const hs = Object.create(null);
    for (const h of msg.holds.slice(0, REPORT.HOLDS_MAX)) {
      if (!Array.isArray(h) || h.length !== 4) continue;
      const [name, ms, at, nr] = h;
      if (!HOLD_NAMES.includes(name) || !WHERE.includes(at)) continue;
      const m = int(ms, 0, REPORT.HOLD_MS_MAX), n = int(nr, 0, REPORT.NEAR_MAX);
      if (m === null || n === null) continue;
      const k = holdKey(name, at);
      const was = hs[k] || [0, 0, 0];
      hs[k] = [was[0] + 1, was[1] + m, was[2] + n];
    }
    if (Object.keys(hs).length) s.holds = hs;
  }
  const mem = ints(msg.mem, 3, 0, REPORT.MB_MAX);
  if (mem) s.mem = mem;
  const lost = ints(msg.lost, 2, 0, REPORT.LOST_MAX);
  if (lost) s.lost = lost;
  /* the last page's death, once a join */
  if (Array.isArray(msg.died) && DIED.includes(msg.died[0])) {
    const kind = msg.died[0];
    if (kind === 'no' && msg.died.length === 1) s.died = oneHot(DIED.length, 0);
    else if (kind !== 'no' && msg.died.length === 5) {
      const nums = ints(msg.died.slice(1, 4), 3, 0, REPORT.UP_MAX);
      const at = WHERE.includes(msg.died[4]) ? msg.died[4] : null;
      if (nums && nums[0] <= REPORT.MB_MAX && nums[2] <= REPORT.LOST_MAX && at) {
        s.died = oneHot(DIED.length, DIED.indexOf(kind));
        s.diedMem = nums;
        s.diedAt = oneHot(WHERE.length, WHERE.indexOf(at));
      }
    }
  }
  /* the worker's own */
  const o = own || {};
  if (typeof o.delay === 'number' && o.delay >= 0) s.delay = oneHot(DELAY_EDGES.length + 1, binOf(DELAY_EDGES, o.delay));
  if (typeof o.waver === 'number' && o.waver >= 0) s.waver = oneHot(WAVER_EDGES.length + 1, binOf(WAVER_EDGES, o.waver));
  return { cell, sums: s, soft: cls.soft };
}

export const reportMethods = {
  /* the kill switch is liveops.js `_reportOff` */
  _reportOn() { return !this._reportOff(); },   /* the caps literal reads a method call (caps-audit) */

  /** index.js `case 'report'`: checked, paced, added into the day's book.
   *  Returns why it went nowhere ('off', 'who', 'pace', 'bad') or 'ok'
   *  (the suite's).  Sends nothing back. */
  _reportTake(session, msg, now) {
    try {
      now = typeof now === 'number' ? now : Date.now();
      if (this._reportOff()) return 'off';
      if (!session || !session.id) return 'who';
      if (session.reportAt && now - session.reportAt < REPORT.PACE_MS) return 'pace';
      session.reportAt = now;
      const r = reportSums(msg, { delay: session.rtt, waver: session.rttWaver });
      if (!r) return 'bad';
      /* smoothness: the cell, and nothing of who sent it */
      const tree = Object.create(null);
      tree[r.cell] = r.sums;
      bookAdd(this, 'dev', tree, now);
      /* the sitting's card (soft, build, seen, drawn against moves): card
         Q's, not built yet -- dropped here (SHAPES part 7) */
      return 'ok';
    } catch (e) { return 'bad'; }   /* a report must never break the socket */
  },
};
