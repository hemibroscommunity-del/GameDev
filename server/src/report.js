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
 *   - v2.3.5125: THE SPEED TEST'S CARD, once after a player runs it: the
 *     book's `speed` part, by the model the player picked (a place in the
 *     phone's list), the device class and the build -- a step's runs and
 *     sums (speedSums).  The book is read by ONE admin route, GET
 *     /dev/daybook (devtools.js): the Test panel's "Copy table" and card E's
 *     owner's card.  v2.3.5127 (sitting 4's review): its own cap and switch
 *     -- `caps.report` 2 (_reportCap), `reportspeed: false` back to 1, and
 *     a card that still comes dropped;
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
 * v2.3.5127, the gatekeeper's review (sitting 3):
 *   - THE BUILD IN A CELL IS THE WORKER'S CALL: a page on the game's own
 *     site (`live`: the socket's Origin, which a browser sets and no page
 *     can change; session.site) keeps its build; every other page -- each
 *     pull request's preview, a developer's build, a program -- is the one
 *     build `preview`, so previews cannot fill the day's few `dev` cells;
 *   - SEEN TIME: `seen` (checked, at most `secs`) is what the cell adds as
 *     time played and time in a place; `secs` (covered) is kept beside it;
 *   - a report is not the player's input: it never stamps the AFK clock
 *     (index.js), so an idle tab is still let go of.
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
 * v2.3.5221, CARD O's LANES (step 2.1; src/game/drawLanes.js): the worker
 * learns the whole card's lists at once, so it deploys once for the card --
 *   - `drawLane`: `full`, `light` or `thirty` (DRAW_LANES), each its own
 *     cell.  The page sends a lane but `full` only to `caps.report` 3;
 *   - `rung` (the governor's, card O's PR 2): [the most rungs taken at
 *     once, the seconds spent below the lane's row], two whole numbers;
 *     the cell's sums beside it, never in the cell's key: [reports with one,
 *     the most rungs summed, seconds below summed];
 *   - `self` (the self-test at the door, step 1.7, card O's PR 14): the
 *     game's drawing programs that failed (SELF_PROGRAMS), each a count of
 *     reports naming it.
 * `caps.report` 3 (_reportCap); THE KILL SWITCH `reportlanes: false` takes it
 * back to 2: a lane other than `full` is then dropped (no cell), and `rung`
 * and `self` are dropped from a report that still comes.
 *
 * v2.3.6500, CARD PH's PR 1: THE REPORT SEES HEAT AND THE BOARD.  The shape
 * review of 2026-11-23 (docs/plan/census/shape-review.md item 20): the
 * owner's iPhone fell from 106 to 51 frames a second after 24 minutes
 * (2026-11-10) and the skateboard felt gritty (2026-11-18), and the day's
 * sums could see neither -- no minutes up, no riding flag -- nor which of
 * the address bar's off-ramps the page ran with (only the worker's 15
 * savers).  So, to a worker whose caps.report is 4:
 *   - `up`: which stretch of the page's SEEN minutes since its first join
 *     the report's middle falls in (UP_EDGES: 0 to 5, 5 to 15, 15 to 30,
 *     over 30), a place 0..3.  The cell sums by it, beside the cell's own
 *     sums (never in its key: one sitting crosses all four, and a socket
 *     reaches two cells): `up` { m0 | m5 | m15 | m30: [seen secs, frames
 *     drawn, late, seconds below the lane's row] } -- the frame rate, the
 *     late share and the governor's time down by minutes played: heat;
 *   - `ride` [seconds on the board, late, judged] and `rideGaps` (the gaps'
 *     ten bins) of the frames drawn while riding (game/ride.js isRiding at
 *     each poll); the cell's `ride` [reports with a ride, seconds, frames,
 *     late, long: past 42 ms] summed: the board's own frames
 *     beside all (one row, not ten bins: report.test 7);
 *   - `ramps`: the address bar's switches thrown, `name=word` (RAMP_WORDS),
 *     each held to the page's ONE reader of the switch table
 *     (src/game/switches.js readerFor: the forms `switches.test.mjs --write`
 *     makes from tools/guards/lib/switches.mjs) -- a ramp is kept only if
 *     that address really throws that switch, so no name off the table and
 *     no free text reaches the book.  They join the savers in the cell's
 *     switches part (swCell: none, the one, or many), so `?govern=0` is a
 *     cell of its own, `govern=0`, beside the same phone's `none`.  A
 *     switch newer than this worker's deploy is not on its copy of the
 *     reader: it is dropped until the worker deploys again.
 * THE DAY'S `dev` PART GROWS TO 28 KB (daybook.js PART_BYTES_OF), all the
 * worst full day leaves under a stored value's 128 KiB (daybook.test 10b).
 * The fullest cell -- every field, its four `up` rows and a ride -- reckons
 * about 2.4 KB (report.test 7): eleven a day, devices times builds times
 * the owner's ramps.  The floor was sixteen of a cell that was not full (its
 * late and rung were dropped by its own fixture's numbers: a full one was
 * 1.7 KB, fourteen); one player on several builds a day fills about ten.
 * The book still writes one row a pace.
 * THE KILL SWITCH `reportheat: false` in the live flags: caps.report back to
 * 3, and `up`, `ride`, `rideGaps` and `ramps` dropped from a report that
 * still comes (its cell then the savers' alone, as before).
 *
 * Suite: server/test/report.test.mjs.
 */
import { bookAdd } from './daybook.js';
/* v2.3.6500 (card PH PR 1): the page's one reader of its switches, a leaf
   with no imports, generated from the switch table: the worker asks it
   whether an address throws a switch (rampsOf), so the closed list of the
   report's `ramps` is the table's, one source (the plan's rule 2) */
import { readerFor } from '../../src/game/switches.js';

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
  /* v2.3.5127: the cells one socket's reports may reach */
  CELLS_A_SOCKET: 2,
  SW_MAX: 32,
  /* v2.3.6500 (card PH PR 1): the address bar's ramps read, at most */
  RAMPS_MAX: 8,
});

/* v2.3.6500 (card PH PR 1): the stretches of minutes seen (src/debug/report.js
   UP_EDGES; report.test holds them equal), and their keys in a cell's `up` */
export const UP_EDGES = Object.freeze([5, 15, 30]);
export const UP_KEYS = Object.freeze(['m0', 'm5', 'm15', 'm30']);
/* the words a ramp may carry after its `=` (src/debug/report.js RAMP_WORDS):
   every word a row's form on the page throws with ('' its presence), so a
   switch thrown by its row's own word is always sent as written; a value
   switch (`?zoom=1.5`) is sent with '' (report.test holds the list whole) */
export const RAMP_WORDS = Object.freeze(['', '0', '1', '2', 'off', 'false', 'no', 'all', 'mouse']);
const RAMP_NAME_RE = /^[a-z0-9]{1,32}$/;

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
/* v2.3.5221: card O's lanes (step 2.1): src/game/drawLanes.js LANE_NAMES
   (mirror-audit holds the two equal) */
export const DRAW_LANES = Object.freeze(['full', 'light', 'thirty']);
/* v2.3.5221: the game's own drawing programs (step 1.7, the report's
   `self`): src/game/drawLanes.js PROGRAM_NAMES (mirror-audit) */
export const SELF_PROGRAMS = Object.freeze(['one', 'palette', 'look', 'sharp', 'clip', 'fill', 'water', 'glint', 'sheen', 'shadow']);
/* v2.3.5221: the governor's `rung` -- the most rungs taken at once, at most
   MAX (wider than the page's ladder, drawLanes.js ladderDepth(): the page's
   ladder may grow without a deploy; mirror-audit holds it under) */
export const RUNG = Object.freeze({ MAX: 31 });
/* src/game/clientOff.js CLIENT_SAVERS' ids.  v2.3.5235: + `govern` (card O's
   governor switched off for every phone): a report then says the ladder
   stood still.  An older worker drops a name it does not list (swCell), so
   either side ships first */
export const SAVERS = Object.freeze(['sfxcache', 'voicecap', 'onecopy', 'picnumbers', 'codelazy', 'groundlean', 'heaplean',
  'lookpalette', 'lookshirt', 'soundgate', 'lookarmour', 'lookfolk', 'gfxlean', 'viewcap', 'govern']);
/* src/debug/report.js WHERE and GAP_EDGES (ten bins) */
export const WHERE = Object.freeze(['town', 'farm', 'dungeon', 'commons', 'frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant', 'other']);
export const GAP_BINS = 10;
/* v2.3.6500 (card PH PR 1): the first bin a ride's frame counts as long in
   (its lower edge 42 ms, src/debug/report.js GAP_EDGES[6]: a frame that
   missed two refreshes of 60) */
export const RIDE_LONG_BIN = 7;
export const DIED = Object.freeze(['no', 'killed', 'evicted']);
/* src/debug/holdNames.js HOLD_NAMES */
export const HOLD_NAMES = Object.freeze([
  'body-bake', 'standin-bake', 'gear-sheet', 'head-piece', 'masked-bake', 'strip-page', 'pack-page', 'strip-made',
  'monster-recolour', 'object-bases', 'object-page', 'screen-check', 'portrait', 'map', 'codex', 'ground', 'sound',
  'text', 'server-message', 'gc',
  'the frame itself', 'ui:*', 'other: wrapped > sweepPicsOnce', 'other: BT_AUDIO$1._fold > foldToMono', 'other: R > J',
  'other: createObjectURL', 'other: _flushOutbox > Wrapped.ws.send',
]);

/* v2.3.5125: the Speed test's card (src/debug/report.js SPEED_STEPS; and
   SPEED_MODELS' length: the worker keeps only the count, the names are the
   phone's, and only a place in the list is ever sent) */
export const SPEED_STEPS = Object.freeze(['all', 'noshadow', 'noshine', 'shinepass', 'threeprog', 'shadowpass', 'still', 'res2', 'bare']);
export const SPEED_MODELS_N = 22;
export const SPEED = Object.freeze({ FPS_MAX: 1000, MS_MAX: 10000 });

/* ── a cell's sums (each a number or an array of numbers, so days add) ──
 *   n        reports
 *   secs     seconds covered (v2.3.5127: hidden time included)
 *   seen     seconds the page was seen: the time played
 *   gaps     the frames' gaps, in the phone's ten bins
 *   late     [late, judged]: only reports that carried a verdict add here
 *   split    [sim, tile, entity, effects, fps, app, outside, busy, wait] ms:
 *            a report with busy and wait adds their sum to `outside` too, so
 *            `outside` is every report's and busy + wait the beat's share
 *   holds    { '<name>': [times, ms in all] }, the name made safe for a key
 *            (holdKey)
 *   where    { '<place>': seen seconds }, the places of WHERE it was in
 *   near     the most other players near, summed (a mean: / n)
 *   mem      [tex, gpu, snd] MB summed (a mean: / n)
 *   lost     [contexts lost, renderers rebuilt]
 *   died     reports by DIED's order (the first report after a join only)
 *   diedMem  [MB, minutes up, rebuilds] of the pages that died, summed
 *   diedAt   { '<place>': pages that died there }
 *   line     [delay, waver] ms summed, the worker's own (means: / n)
 *   rung     v2.3.5221: [reports that carried one, the most rungs taken
 *            summed, seconds below the lane's row summed] (card O)
 *   self     v2.3.5221: { '<program>': reports naming it } (card O, step 1.7)
 *   up       v2.3.6500: { m0 | m5 | m15 | m30: [seen secs, frames drawn,
 *            late, secs below the row] }, by minutes seen (card PH: heat):
 *            the rate (drawn / seen), the late share (late / drawn) and the
 *            governor's time down, by minutes played
 *   ride     v2.3.6500: [reports with a ride, secs riding, frames drawn
 *            riding, late, long: those past 42 ms] (the report's `rideGaps`
 *            checked against its gaps, then summed to `long`)
 *   v2.3.5127 (sitting 4): maps and sums, not a bin a word, so a cell is
 *   about half its first size and the day's 24 KB holds about twice the
 *   devices and builds */

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const int = (v, lo, hi) => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
const ints = (a, n, lo, hi) => {
  if (!Array.isArray(a) || a.length !== n) return null;
  for (const x of a) if (int(x, lo, hi) === null) return null;
  return a.slice();
};
const oneHot = (n, i, by = 1) => { const a = new Array(n).fill(0); a[i] = by; return a; };

/* v2.3.5127: the game's own site: a page there is `live`.  Sitting 4's
   review: and Cloudflare Pages' own name for the project, bare -- the same
   build of `main` as brotown.net (origin.js ORIGIN_LOCK.SITES); its
   `<hash>.` and `<branch>.` addresses are the previews, and stay `preview` */
export const LIVE_HOSTS = Object.freeze(['brotown.net', 'www.brotown.net', 'gamedev-aix.pages.dev']);
/** A socket's page, from its Origin: 'live' (the game's own site) or
 *  'preview' (anything else, or none). */
export function reportSiteOf(origin) {
  try {
    if (typeof origin !== 'string' || !origin) return 'preview';
    const host = new URL(origin).hostname.toLowerCase();
    return LIVE_HOSTS.includes(host) ? 'live' : 'preview';
  } catch (e) { return 'preview'; }
}

/** A hold's key in the book: its name made safe (daybook.js takes letters,
 *  digits and _.:|,+=- in a key).  v2.3.5127: by name alone (the cell's
 *  `where` says where its time went), so a cell holds a few keys, not a key
 *  a name and a place. */
export function holdKey(name) {
  return String(name).replace(/[^A-Za-z0-9_.:,+=-]/g, '_');
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
 *  and the rest apart).  Ids off the list are dropped.  v2.3.6500 (card PH
 *  PR 1): and the address bar's ramps, already checked (rampsOf), with them:
 *  `?govern=0` alone is the cell `govern=0`. */
export function swCell(sw, ramps) {
  const ids = [];
  if (Array.isArray(sw)) for (const s of sw.slice(0, REPORT.SW_MAX)) if (typeof s === 'string' && SAVERS.includes(s) && !ids.includes(s)) ids.push(s);
  if (Array.isArray(ramps)) for (const r of ramps) if (!ids.includes(r)) ids.push(r);
  return ids.length === 0 ? 'none' : ids.length === 1 ? ids[0] : 'many';
}

/** v2.3.6500 (card PH PR 1): a report's `ramps`, checked: each `name=word`
 *  kept only where the page's one reader says the address `?name=word`
 *  throws that switch (src/game/switches.js readerFor) -- a name off the
 *  switch table, a word off RAMP_WORDS, a dependent the address does not
 *  name itself, free text: dropped.  -> the kept ones, sorted, as written. */
export function rampsOf(ramps) {
  if (!Array.isArray(ramps)) return [];
  const out = [];
  for (const t of ramps.slice(0, REPORT.RAMPS_MAX)) {
    if (typeof t !== 'string') continue;
    const at = t.indexOf('=');
    if (at < 1) continue;
    const name = t.slice(0, at), word = t.slice(at + 1);
    if (!RAMP_NAME_RE.test(name) || !RAMP_WORDS.includes(word) || out.includes(t)) continue;
    let thrown = false;
    try { thrown = readerFor('?' + name + '=' + word).thrown().includes('?' + name); } catch (e) { thrown = false; }
    if (thrown) out.push(t);
  }
  return out.sort();
}

/** v2.3.6500 (card PH PR 1): the stretch a page's seen minutes fall in, a
 *  place of UP_KEYS (the page's own rule, src/debug/report.js upBucket). */
export function upBucket(min) {
  let i = 0;
  while (i < UP_EDGES.length && !(min < UP_EDGES[i])) i++;
  return i;
}

/** The next waver (index.js case 'pong'): the smoothed distance of `sample`
 *  from the smoothed round trip BEFORE it, the same weight as the round
 *  trip's own, capped as it is. */
export function rttWaverNext(waver, sample, rttBefore, alpha, cap) {
  const w = typeof waver === 'number' && waver >= 0 ? waver : 0;
  const d = Math.abs((Number(sample) || 0) - (Number(rttBefore) || 0));
  return Math.min(cap, w * (1 - alpha) + d * alpha);
}

/** v2.3.5125: a report's `speed`, checked, as what it adds to the book's
 *  `speed` part under `key` -- or null.  { model: a place in the phone's
 *  list, rows: [step, fps, p50, p95, work] } (work -1: not measured).  A
 *  step's sums: [runs, fps, p50, p95, work, runs with no work]. */
export function speedSums(speed, classKey, build) {
  if (!isObj(speed)) return null;
  const model = int(speed.model, 0, SPEED_MODELS_N - 1);
  if (model === null || !Array.isArray(speed.rows) || !speed.rows.length || speed.rows.length > SPEED_STEPS.length) return null;
  const s = Object.create(null);
  for (const r of speed.rows) {
    if (!Array.isArray(r) || r.length !== 5 || !SPEED_STEPS.includes(r[0]) || has(s, r[0])) return null;
    const fps = int(r[1], 0, SPEED.FPS_MAX), p50 = int(r[2], 0, SPEED.MS_MAX), p95 = int(r[3], 0, SPEED.MS_MAX);
    const work = r[4] === -1 ? -1 : int(r[4], 0, SPEED.MS_MAX);
    if (fps === null || p50 === null || p95 === null || work === null) return null;
    s[r[0]] = [1, fps, p50, p95, work === -1 ? 0 : work, work === -1 ? 1 : 0];
  }
  s.n = 1;
  return { key: REPORT.V + '|' + model + '|' + classKey + '|' + build, sums: s };
}

/** A report, checked, as what it adds to its cell -- or null (dropped: no
 *  cell can be made).  `own`: the worker's own numbers ({ delay, waver }).
 *  v2.3.5125: and `speed`, the Speed test's card for the book's `speed`
 *  part, when it carries one that passes (else none).  Pure: the suite reads
 *  it. */
export function reportSums(msg, own) {
  if (!isObj(msg) || msg.v !== REPORT.V) return null;
  const cls = classOfReport(msg.devClass);
  if (!cls) return null;
  if (!DRAW_LANES.includes(msg.drawLane)) return null;
  /* v2.3.5221: a lane but `full` only where the worker takes lanes
     (`own.lanes`: caps.report 3; `reportlanes: false` none) */
  const lanes = !!(own && own.lanes);
  if (!lanes && msg.drawLane !== 'full') return null;
  const build = int(msg.build, 0, REPORT.BUILD_MAX);
  if (build === null) return null;
  const secs = int(msg.secs, 1, REPORT.SECS_MAX);
  if (secs === null) return null;
  /* v2.3.5127: the seen seconds, at most those covered: the time played */
  const seen = int(msg.seen, 0, secs);
  if (seen === null) return null;
  const o = own || {};
  /* v2.3.6500 (card PH PR 1): heat, the board and the ramps, only where the
     worker takes them (`own.heat`: caps.report 4; `reportheat: false` none) */
  const heat = !!(lanes && o.heat);
  const ramps = heat ? rampsOf(msg.ramps) : [];
  /* v2.3.5127: the build is the page's only on the game's own site */
  const cell = REPORT.V + '|' + cls.key + '|' + msg.drawLane + '|' + swCell(msg.sw, ramps) + '|' + (o.site === 'live' ? build : 'preview');
  const s = Object.create(null);
  s.n = 1;
  s.secs = secs;
  s.seen = seen;
  /* the frames: drawn only while seen, at most FPS_MAX a second, and the gaps' bins add to it */
  const drawn = int(msg.drawn, 0, (seen + 1) * REPORT.FPS_MAX);
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
  /* v2.3.5127 (sitting 4: the day's `dev` part filled in about six live
     builds): a cell's few places and deaths are maps of what happened, not a
     place for every word of WHERE; `near`, `delay` and `waver` are sums (a
     mean: / n), not bins; holds by name alone.  A full cell is about half
     the size it was (report.test 7) */
  const where = WHERE.includes(msg.where) ? msg.where : null;
  if (where && seen > 0) { s.where = Object.create(null); s.where[where] = seen; }
  const near = int(msg.near, 0, REPORT.NEAR_MAX);
  if (near !== null) s.near = near;
  /* the worst holds: names of the one list only, each [times, ms in all] */
  if (Array.isArray(msg.holds)) {
    const hs = Object.create(null);
    for (const h of msg.holds.slice(0, REPORT.HOLDS_MAX)) {
      if (!Array.isArray(h) || h.length !== 4) continue;
      const [name, ms, at, nr] = h;
      if (!HOLD_NAMES.includes(name) || !WHERE.includes(at)) continue;
      const m = int(ms, 0, REPORT.HOLD_MS_MAX), n = int(nr, 0, REPORT.NEAR_MAX);
      if (m === null || n === null) continue;
      const k = holdKey(name);
      const was = hs[k] || [0, 0];
      hs[k] = [was[0] + 1, was[1] + m];
    }
    if (Object.keys(hs).length) s.holds = hs;
  }
  const mem = ints(msg.mem, 3, 0, REPORT.MB_MAX);
  if (mem) s.mem = mem;
  const lost = ints(msg.lost, 2, 0, REPORT.LOST_MAX);
  if (lost) s.lost = lost;
  /* the last page's death: once a page, so only on a socket's first report
     (v2.3.5127: `own.first`; a later one's `died` is not counted) */
  if (o.first && Array.isArray(msg.died) && DIED.includes(msg.died[0])) {
    const kind = msg.died[0];
    if (kind === 'no' && msg.died.length === 1) s.died = oneHot(DIED.length, 0);
    else if (kind !== 'no' && msg.died.length === 5) {
      const nums = ints(msg.died.slice(1, 4), 3, 0, REPORT.UP_MAX);
      const at = WHERE.includes(msg.died[4]) ? msg.died[4] : null;
      if (nums && nums[0] <= REPORT.MB_MAX && nums[2] <= REPORT.LOST_MAX && at) {
        s.died = oneHot(DIED.length, DIED.indexOf(kind));
        s.diedMem = nums;
        s.diedAt = Object.create(null);
        s.diedAt[at] = 1;
      }
    }
  }
  /* the worker's own, summed: [delay, waver] ms (means: / n) */
  if (typeof o.delay === 'number' && o.delay >= 0 && typeof o.waver === 'number' && o.waver >= 0) s.line = [Math.round(o.delay), Math.round(o.waver)];
  else if (typeof o.delay === 'number' && o.delay >= 0) s.line = [Math.round(o.delay), 0];
  /* v2.3.5221: the governor's rung (card O PR 2) and the self-test's
     failures (PR 14), only where the worker takes lanes */
  if (lanes) {
    const rg = Array.isArray(msg.rung) && msg.rung.length === 2 ? [int(msg.rung[0], 0, RUNG.MAX), int(msg.rung[1], 0, secs)] : null;
    if (rg && rg[0] !== null && rg[1] !== null) s.rung = [1, rg[0], rg[1]];
    if (Array.isArray(msg.self) && msg.self.length && msg.self.length <= SELF_PROGRAMS.length) {
      const sf = Object.create(null);
      for (const p of msg.self) if (typeof p === 'string' && SELF_PROGRAMS.includes(p)) sf[p] = 1;
      if (Object.keys(sf).length) s.self = sf;
    }
  }
  /* v2.3.6500 (card PH PR 1): the minutes seen, and the board's frames */
  if (heat) {
    const up = int(msg.up, 0, UP_KEYS.length - 1);
    if (up !== null) {
      const drawnOk = s.gaps ? s.gaps.reduce((a, b) => a + b, 0) : 0;
      s.up = Object.create(null);
      s.up[UP_KEYS[up]] = [seen, drawnOk, s.late ? s.late[0] : 0, s.rung ? s.rung[2] : 0];
    }
    /* the board: its gaps a part of the report's (each bin at most the
       report's own), late <= judged <= its frames, its seconds at most seen */
    const rg = s.gaps ? ints(msg.rideGaps, GAP_BINS, 0, REPORT.SECS_MAX * REPORT.FPS_MAX) : null;
    const rd = Array.isArray(msg.ride) && msg.ride.length === 3 ? [int(msg.ride[0], 0, seen), int(msg.ride[1], 0, REPORT.SECS_MAX * REPORT.FPS_MAX), int(msg.ride[2], 0, REPORT.SECS_MAX * REPORT.FPS_MAX)] : null;
    if (rg && rd && rd.every((x) => x !== null) && rg.every((x, i) => x <= s.gaps[i])) {
      const rDrawn = rg.reduce((a, b) => a + b, 0);
      const judgedAll = s.late ? s.late[1] : 0, lateAll = s.late ? s.late[0] : 0;
      if (rd[1] <= rd[2] && rd[2] <= rDrawn && rd[2] <= judgedAll && rd[1] <= lateAll && (rd[0] > 0 || rDrawn > 0)) {
        /* kept as one short row, not ten bins: the board's frames, and those
           past RIDE_LONG_BIN's edge (42 ms: two refreshes of 60 missed) --
           a cell's ten bins of its own would have cut the day's cells by a
           third (report.test 7) */
        let long = 0;
        for (let i = RIDE_LONG_BIN; i < GAP_BINS; i++) long += rg[i];
        s.ride = [1, rd[0], rDrawn, rd[1], long];
      }
    }
  }
  const speed = has(msg, 'speed') ? speedSums(msg.speed, cls.key, o.site === 'live' ? build : 'preview') : null;   /* v2.3.5127: the build is the worker's call */
  return { cell, sums: s, soft: cls.soft, speed };
}

export const reportMethods = {
  /* the kill switch is liveops.js `_reportOff` */
  _reportOn() { return !this._reportOff(); },
  /** join.js's `caps.report` (the caps literal reads a method call:
   *  caps-audit).  v2.3.5127 (sitting 4's review): a count, as a cap that
   *  grows is (TRAPS §9) -- 1 the smoothness reports, 2 the Speed test's
   *  card too; `report: false` none, `reportspeed: false` 1. */
  _reportCap() {
    if (this._reportOff()) return undefined;
    if (this._reportSpeedOff()) return 1;
    /* v2.3.5221: 3 takes card O's lanes, rung and self too; `reportlanes:
       false` back to 2 (a cap that grows gates by its count: TRAPS §9) */
    if (this._reportLanesOff()) return 2;
    /* v2.3.6500 (card PH PR 1): 4 takes heat, the board and the ramps too;
       `reportheat: false` back to 3 */
    return this._reportHeatOff() ? 3 : 4;
  },

  /* v2.3.6500 (card PH PR 1): `reportheat: false` in the live flags takes
     `up`, `ride`, `rideGaps` and `ramps` no more -- caps.report back to 3,
     and the four dropped from a report that still comes */
  _reportHeatOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'reportheat') && !f.reportheat);
  },

  /* v2.3.5221: card O's kill switch, as liveops.js's `_reportSpeedOff`:
     `reportlanes: false` in the live flags takes the lanes no more --
     caps.report back to 2, a lane other than `full` dropped, and `rung` and
     `self` dropped from a report that still comes */
  _reportLanesOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'reportlanes') && !f.reportlanes);
  },

  /** index.js `case 'report'`: checked, paced, added into the day's book.
   *  Returns why it went nowhere ('off', 'who', 'pace', 'bad', 'cells') or 'ok'
   *  (the suite's).  Sends nothing back. */
  _reportTake(session, msg, now) {
    try {
      now = typeof now === 'number' ? now : Date.now();
      if (this._reportOff()) return 'off';
      if (!session || !session.id) return 'who';
      if (session.reportAt && now - session.reportAt < REPORT.PACE_MS) return 'pace';
      session.reportAt = now;
      const first = !session.reportCells;
      const r = reportSums(msg, { delay: session.rtt, waver: session.rttWaver, site: session.site, first, lanes: this._reportCap() >= 3, heat: this._reportCap() >= 4 });   /* v2.3.5221: lanes; v2.3.6500 heat (card PH PR 1) */
      if (!r) return 'bad';
      /* v2.3.5127 (sitting 4: a program could fill the day's part with one
         device class a report): a socket's reports reach at most
         CELLS_A_SOCKET cells (a phone's class can change once, its rate
         settling or a window resized) */
      if (!session.reportCells) session.reportCells = [];
      if (!session.reportCells.includes(r.cell)) {
        if (session.reportCells.length >= REPORT.CELLS_A_SOCKET) return 'cells';
        session.reportCells.push(r.cell);
      }
      /* smoothness: the cell, and nothing of who sent it */
      const tree = Object.create(null);
      tree[r.cell] = r.sums;
      bookAdd(this, 'dev', tree, now);
      /* v2.3.5125: the Speed test's card, into the book's `speed` part: by
         the model the player picked, the device class and the build
         (v2.3.5127: not with `reportspeed: false`) */
      if (r.speed && !this._reportSpeedOff()) {
        const st = Object.create(null);
        st[r.speed.key] = r.speed.sums;
        bookAdd(this, 'speed', st, now);
      }
      /* the sitting's card (soft, build, seen, drawn against moves): card
         Q's, not built yet -- dropped here (SHAPES part 7) */
      return 'ok';
    } catch (e) { return 'bad'; }   /* a report must never break the socket */
  },
};
