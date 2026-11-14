/* ═══ v2.3.5221: THE LANES -- ONE ROW OF KNOBS A DEVICE DRAWS WITH (grand plan step 2.1, card O PR 1) ═══
 *
 * How much a device draws was decided in a dozen places, each by its own
 * rule: the pacer's floor (framePacer.js), the pixel budget (renderRes.js),
 * the crowd cap (crowdCap.js), one program or three (paletteTex.js), how a
 * look is made (lookPaletteChoice.js), the shine, the shadows and the water
 * (lightfx/, wheelWater.js), the strip queue's slice (zoneTextures.js), the
 * cache caps (each its own), the step's cap (frameClock.js).  Nothing said
 * which of them a device was drawing with, so a report could not name it and
 * a test could not choose it.  So they are one TABLE here:
 *
 *   KNOBS   every knob: its STEPS (step 0 the best; each further one a step
 *           down), each step in a player's words; who reads it today (its
 *           files, `moved` once its PR reads it through laneKnob); its
 *           switch; its system (card B's map, tools/guards/lib/systems.mjs).
 *   LANES   a lane is a ROW: a value for every knob.  Three:
 *             full    what every device draws today (2026-11-14), exactly;
 *             light   full a few rungs down (AXES' first rung of work, its
 *                     first two of the chip): the tests' and the slow
 *                     profiles' lane (step 1.5).  NO DEVICE PICKS IT BY
 *                     ITSELF: only `?lane=light`;
 *             thirty  a screen of 30 a second (an iPhone in Low Power
 *                     Mode): full's row until card O's PR 13 gives it its
 *                     step's cap.  A word, never the number: no page sends
 *                     30 where a name is checked.
 *   AXES    the LADDER: the rungs below a lane's row, on two axes -- the
 *           game's own work (the crowd, then the rate) and waiting for the
 *           chip (the rate, then the passes, then the pixels).  A rung
 *           lowers ONE knob ONE step (`{ knob, to }`: the step it takes the
 *           knob to); the rate's rung is on both axes, so whichever axis
 *           takes it first lowers the rate, and the other's is then taken
 *           already.  The order is data (call 16: a steady lower rate before
 *           a softer picture).
 *   PROGRAMS the game's own drawing programs, a name each (the report's
 *           `self`, step 1.7), read from the code (the guard holds each
 *           program's names to its file); Pixi's own are not the game's.
 *
 * THE READER.  laneKnob(name) is the ONE way a knob's value is read: an
 * override if one pins it (OVERRIDES: none yet -- card O's PRs 8 and 12 move
 * the fallbacks and the off-ramps here), else the lane's row at the ladder's
 * rung.  A knob that must be told when it changes (a resolution, a pass)
 * subscribes: onKnob(name, fn).
 *
 * v2.3.5222, THE RUNG (card O PR 2): where the governor stands on the
 * ladder, rungs taken on each axis ({ work, chip }; the row: none).  ONE
 * WRITER: setRung, called by the governor alone (game/framePacer.js, the
 * pacer grown); server/test/frame-pacer.test.mjs fails a second caller, and
 * src/state/phases.js has its row (`ladder`).  Kept: the device's, not the
 * zone's (the governor keeps it by lane in localStorage for the next
 * sitting).  The rung moves no knob until each knob's PR reads laneKnob.
 *
 * THE LANE.  pickLane(cls) is the lane a device class picks: `thirty` where
 * the screen's rate is 30, else `full`.  FACTS ONLY, never a name (a system,
 * a browser, a chip, a model: SHAPES part 6).  A finer pick (`light` by
 * facts) waits for the device table (step 1.3).  drawLane() is this page's:
 * `?lane=<name>` (a lever: this page's lane whatever its facts), else the
 * lane its device class picks -- the class is HANDED IN (useDevClass, by
 * deviceProfile.js, the one file that asks the device anything), asked again
 * at most every LANE_ASK_MS; while the page has no drawing context, `full`.
 *
 * COMBAT'S TIMING AND LOADING ARE NEVER ON THE LADDER (the owner's call 3):
 * no knob is read in card B's `combat` or `preload` system (the guard holds
 * it).  No knob changes a swing's clock, a cooldown, a wind-up, a hit
 * window, the dash's step, the bow's sight, the tick or what the worker
 * reads from moves, nor moves a load off the loading screen.
 *
 * NO IMPORTS: node tests it (tools/guards/draw-lanes.test.mjs, which also
 * makes docs/LANES.md from this table; server/test/mirror-audit.test.mjs
 * holds the worker's lists to these).  Spec: docs/specs/draw-lanes.md.
 */

/* ── the knobs (the plan's 2.1 list), each step in a player's words ── */
export const KNOBS = Object.freeze({
  rate: {
    what: 'the frame rate: the slowest frame, in ms, the pacer may hold a steady rate at, on a screen of 60 or slower (v2.3.5224: a fast screen keeps its own steps, down to about 40, whatever the lane or the rung)',
    steps: Object.freeze([26, 34]),
    say: Object.freeze(['Every frame the screen offers (a faster screen: steady down to about 40 a second)', 'A steady 30 frames a second on a 60 screen (a faster screen: as before)']),
    reader: { files: Object.freeze(['src/game/framePacer.js']), moved: true }, pr: 4, switch: '?ladderrate', system: 'page-thread',
  },
  pixels: {
    what: 'the pixels drawn, a share of the lowest of the screen\'s own and card G\'s budget (renderRes.js; v2.3.5225: of the pixels drawn, phones too: the planning session\'s (b))',
    steps: Object.freeze([1, 0.75, 0.5]),
    say: Object.freeze(['Every pixel of the budget', 'A quarter fewer pixels (a little softer)', 'Half the pixels (softer)']),
    reader: { files: Object.freeze(['src/game/renderRes.js']), moved: true }, pr: 5, switch: '?ladderpix', system: 'device',
  },
  crowd: {
    what: 'the most other players drawn in full (your party, your target, whoever fights you and your duel always)',
    steps: Object.freeze([50, 30, 15]),
    say: Object.freeze(['The 50 nearest other players drawn', 'The 30 nearest other players drawn', 'The 15 nearest other players drawn']),
    reader: { files: Object.freeze(['src/game/crowdCap.js']), moved: false }, pr: 6, switch: '?crowd', system: 'monsters',
  },
  program: {
    what: 'one drawing program for the world\'s sprites, or three (chosen behind the loading screen: never a rung)',
    steps: Object.freeze(['one']),
    say: Object.freeze(['One drawing program for the world\'s sprites']),
    reader: { files: Object.freeze(['src/rendering/paletteTex.js']), moved: false }, pr: 8, switch: '?onebatch', system: 'memory',
  },
  look: {
    what: 'how a character\'s look is made: coloured on the chip, or each baked (chosen behind the loading screen: never a rung)',
    steps: Object.freeze(['palette']),
    say: Object.freeze(['Looks coloured on the graphics chip']),
    reader: { files: Object.freeze(['src/game/lookPaletteChoice.js']), moved: false }, pr: 8, switch: 'lookpalette', system: 'device',
  },
  shine: {
    what: 'the metal\'s shine on gear',
    steps: Object.freeze(['on', 'off']),
    say: Object.freeze(['Metal shines', 'No shine on metal']),
    reader: { files: Object.freeze(['src/rendering/lightfx/glint.js']), moved: false }, pr: 9, switch: '?sheen', system: 'render',
  },
  shadows: {
    what: 'the light and the shadows',
    steps: Object.freeze(['on', 'off']),
    say: Object.freeze(['Shadows drawn', 'No shadows']),
    reader: { files: Object.freeze(['src/rendering/lightfx/lightFx.js']), moved: false }, pr: 9, switch: '?lightfx', system: 'render',
  },
  water: {
    what: 'the sea\'s waves',
    steps: Object.freeze(['moving', 'still']),
    say: Object.freeze(['The sea moves', 'The sea is still']),
    reader: { files: Object.freeze(['src/rendering/wheelWater.js']), moved: false }, pr: 9, switch: '?waves', system: 'render',
  },
  queue: {
    what: 'the ms a frame the strip queue may take loading monsters\' art (today: a quarter of the frame, 3 to 50 ms)',
    steps: Object.freeze(['frame']),
    say: Object.freeze(['Monsters\' art loads a quarter of each frame at most']),
    reader: { files: Object.freeze(['src/rendering/zoneTextures.js']), moved: false }, pr: 10, switch: '?stripslice', system: 'art',
  },
  caches: {
    what: 'the caches\' caps, as a share of each cache\'s own (docs/BUDGETS.md part 3)',
    steps: Object.freeze([1]),
    say: Object.freeze(['Every cache holds what its own cap allows']),
    reader: { files: Object.freeze(['src/rendering/lookPalette.js', 'src/rendering/gearNumbers.js', 'src/rendering/systems/entityRenderer.js', 'src/rendering/cacheBytes.js']), moved: false }, pr: 11, switch: '', system: 'look',
  },
  step: {
    what: 'the longest step, in ms, one frame may move the world (frameClock.js SMOOTH_MAX_MS; the loop\'s clamp)',
    steps: Object.freeze([50]),
    say: Object.freeze(['A frame moves the world at most 50 ms (three frames at 60)']),
    reader: { files: Object.freeze(['src/game/frameClock.js', 'src/ui/BroTown.jsx']), moved: false }, pr: 13, switch: '?dtsmooth', system: 'page-thread',
  },
  prewarm: {
    what: 'the prewarm ring (step 3.3, LATER): one value and no reader until 3.3 builds the ring',
    steps: Object.freeze([0]),
    say: Object.freeze(['No prewarm ring (not built)']),
    reader: null, pr: null, switch: '', system: '',
  },
});
export const KNOB_NAMES = Object.freeze(Object.keys(KNOBS));

/* ── the lanes: a value for every knob ── */
export const LANES = Object.freeze({
  full: {
    say: 'What every device draws today',
    row: Object.freeze({ rate: 26, pixels: 1, crowd: 50, program: 'one', look: 'palette', shine: 'on', shadows: 'on', water: 'moving', queue: 'frame', caches: 1, step: 50, prewarm: 0 }),
  },
  light: {
    say: 'A lighter picture, for tests and slow devices: picked only by `?lane=light`',
    row: Object.freeze({ rate: 34, pixels: 1, crowd: 30, program: 'one', look: 'palette', shine: 'off', shadows: 'on', water: 'moving', queue: 'frame', caches: 1, step: 50, prewarm: 0 }),
  },
  thirty: {
    say: 'A screen of 30 a second (an iPhone in Low Power Mode): the full lane\'s row until its step\'s cap (card O PR 13)',
    row: Object.freeze({ rate: 26, pixels: 1, crowd: 50, program: 'one', look: 'palette', shine: 'on', shadows: 'on', water: 'moving', queue: 'frame', caches: 1, step: 50, prewarm: 0 }),
  },
});
export const LANE_NAMES = Object.freeze(Object.keys(LANES));
/* the lane where nothing is known yet, and the one a worker below caps.report 3 is sent */
export const DEFAULT_LANE = 'full';

/* ── the ladder: two axes, each rung one knob one step ── */
export const AXES = Object.freeze({
  work: Object.freeze([
    Object.freeze({ knob: 'crowd', to: 1 }),
    Object.freeze({ knob: 'crowd', to: 2 }),
    Object.freeze({ knob: 'rate', to: 1 }),
  ]),
  chip: Object.freeze([
    Object.freeze({ knob: 'rate', to: 1 }),
    Object.freeze({ knob: 'shine', to: 1 }),
    Object.freeze({ knob: 'shadows', to: 1 }),
    Object.freeze({ knob: 'water', to: 1 }),
    Object.freeze({ knob: 'pixels', to: 1 }),
    Object.freeze({ knob: 'pixels', to: 2 }),
  ]),
});
export const AXIS_NAMES = Object.freeze(Object.keys(AXES));
/* the light lane's row is full's at this rung (the guard holds the two equal) */
export const LIGHT_AT = Object.freeze({ work: 1, chip: 2 });

/** The deepest the ladder goes: every rung of both axes taken.  The report's
 *  `rung` counts rungs taken, at most this (the worker's bound is wider:
 *  mirror-audit holds this under it). */
export function ladderDepth() {
  let n = 0;
  for (const a of AXIS_NAMES) n += AXES[a].length;
  return n;
}

/* ── the game's own drawing programs (step 1.7: the report's `self`) ── */
export const PROGRAMS = Object.freeze([
  { name: 'one', file: 'src/rendering/paletteTex.js', built: Object.freeze(['bt-one-batch']), back: 'the three programs' },
  { name: 'palette', file: 'src/rendering/paletteTex.js', built: Object.freeze(['bt-palette-batch', 'bt-palette-clip', 'bt-palette-mesh', 'bt-palette-fill']), back: 'whole colours' },
  { name: 'look', file: 'src/rendering/lookPalette.js', built: Object.freeze(['bt-look-batch', 'bt-look-sheen-batch']), back: 'each look baked' },
  { name: 'sharp', file: 'src/rendering/sharpPixels.js', built: Object.freeze(['batch-sharp']), back: 'plain pixels' },
  { name: 'clip', file: 'src/rendering/hairClip.js', built: Object.freeze(['batch-clip', 'batch-clip-alpha']), back: null },
  { name: 'fill', file: 'src/rendering/fillBatch.js', built: Object.freeze(['batch-fill']), back: null },
  { name: 'water', file: 'src/rendering/wheelWater.js', built: Object.freeze(['bt-wheel-water', 'bt-wheel-water-all', 'bt-wheel-water-pal', 'bt-wheel-water-pal-all']), back: 'still water' },
  { name: 'glint', file: 'src/rendering/lightfx/glint.js', built: Object.freeze(['bt-glint-filter']), back: null },
  { name: 'sheen', file: 'src/rendering/lightfx/sheenBatch.js', built: Object.freeze(['batch-sheen']), back: 'its pass' },
  { name: 'shadow', file: 'src/rendering/lightfx/shadows.js', built: Object.freeze(['bt-shadow-shade', 'bt-shadow-filter']), back: 'the old pass' },
]);
export const PROGRAM_NAMES = Object.freeze(PROGRAMS.map((p) => p.name));

/* ── the overrides: a row pins a knob to a value, winning over the lane and
   the ladder; the governor never moves a pinned knob.  NONE YET: card O's
   PR 8 moves the fallbacks here (a software renderer; the look palette on
   Windows and a Mac), PR 12 the off-ramps (`?pixbudget=0`, `?onebatch=0`
   ...).  A row: { knob, value, why } ── */
export const OVERRIDES = Object.freeze([]);

/** The lane a device class picks: facts only.  `thirty` where the screen's
 *  rate is 30, else `full`.  Pure. */
export function pickLane(cls) {
  return cls && cls.hz === 30 ? 'thirty' : 'full';
}

/** `?lane=<name>` from an address's search string: a lane of the table, or
 *  null (none, or a name off the table: the facts pick). */
export function laneFromSearch(search) {
  const m = /(?:^|[?&])lane=([a-z]+)(?:&|$)/.exec(typeof search === 'string' ? search : '');
  return m && LANE_NAMES.includes(m[1]) ? m[1] : null;
}

/** A knob's value in a lane at a rung ({ work, chip }: rungs taken on each
 *  axis; none: the row).  A rung takes its knob to its step, never back up;
 *  past the last step, the last.  Pure (the tests', the page made from it). */
export function knobAt(lane, name, rung) {
  const k = KNOBS[name];
  const L = LANES[lane] || LANES[DEFAULT_LANE];
  if (!k) return undefined;
  let i = k.steps.indexOf(L.row[name]);
  if (i < 0) i = 0;
  if (rung) {
    for (const a of AXIS_NAMES) {
      const n = Math.max(0, Math.min(AXES[a].length, Math.floor(Number(rung[a]) || 0)));
      for (let j = 0; j < n; j++) if (AXES[a][j].knob === name && AXES[a][j].to > i) i = AXES[a][j].to;
    }
  }
  return k.steps[Math.min(i, k.steps.length - 1)];
}

/* ── the page's lane: the address, else the class handed in ── */
const LANE_ASK_MS = 5000;
let _classOf = null;      /* deviceProfile.js devClass, handed in (useDevClass) */
let _lane = null;         /* the lane the class picked; null: not yet known */
let _laneAskedAt = -Infinity;
let _urlLane;             /* undefined: not read; null: none */
const _subs = Object.create(null);   /* knob -> [fn] (onKnob) */
const _told = Object.create(null);   /* knob -> the value its subscribers were last told */

function _search() {
  try { return (typeof location !== 'undefined' && location.search) || ''; } catch (e) { return ''; }
}
function _now() {
  try { return typeof performance !== 'undefined' ? performance.now() : Date.now(); } catch (e) { return Date.now(); }
}

/** deviceProfile.js hands in its devClass (the one file that asks the device
 *  anything): asked again at most every LANE_ASK_MS. */
export function useDevClass(fn) {
  _classOf = typeof fn === 'function' ? fn : null;
  _laneAskedAt = -Infinity;
}

/** This page's lane: `?lane=<name>`, else the lane its device class picks.
 *  `cls`: a class just read (the report's), picked from now; none: the class
 *  asked again when LANE_ASK_MS has passed.  Never throws. */
export function drawLane(cls) {
  try {
    if (_urlLane === undefined) _urlLane = laneFromSearch(_search());
    if (_urlLane) return _urlLane;
    let c = cls;
    if (c === undefined && _classOf) {
      const t = _now();
      if (t - _laneAskedAt >= LANE_ASK_MS) { _laneAskedAt = t; c = _classOf(); }
    }
    if (c) {
      const was = _lane;
      _lane = pickLane(c);
      if (was !== _lane) _tell();
    }
    return _lane || DEFAULT_LANE;
  } catch (e) {
    return DEFAULT_LANE;
  }
}

/* ── v2.3.5222: the rung, the governor's alone ── */
const ROW = Object.freeze({ work: 0, chip: 0 });
let _rung = ROW;          /* the governor's (setRung): rungs taken on each axis */

/** Where the ladder stands now: { work, chip }, rungs taken on each axis. */
export function ladderRung() { return _rung; }
/** Rungs taken, both axes: 0 is the lane's row (the report's `rung`). */
export function rungDepth(r) { const x = r || _rung; return (x.work | 0) + (x.chip | 0); }
/** THE ONE WRITER of the rung: the governor's (framePacer.js), never another
 *  file's.  Each axis held to its rungs.  Subscribed knobs are told. */
export function setRung(work, chip) {
  const w = Math.max(0, Math.min(AXES.work.length, Math.floor(Number(work) || 0)));
  const c = Math.max(0, Math.min(AXES.chip.length, Math.floor(Number(chip) || 0)));
  if (w === _rung.work && c === _rung.chip) return _rung;
  _rung = w === 0 && c === 0 ? ROW : Object.freeze({ work: w, chip: c });
  _tell();
  return _rung;
}

/** The override pinning a knob, or null. */
export function pinOf(name) {
  for (const o of OVERRIDES) if (o.knob === name) return o;
  return null;
}

/** THE ONE WAY a knob's value is read: an override if one pins it, else this
 *  page's lane's row at the ladder's rung (v2.3.5222: the governor's). */
export function laneKnob(name) {
  const p = pinOf(name);
  if (p) return p.value;
  return knobAt(drawLane(), name, _rung);
}

/** Be told when a knob's value changes (a lane picked, a rung moved): fn(value,
 *  was).  Returns a function that stops it. */
export function onKnob(name, fn) {
  if (!KNOBS[name] || typeof fn !== 'function') return () => {};
  const list = _subs[name] || (_subs[name] = []);
  list.push(fn);
  if (!(name in _told)) _told[name] = laneKnob(name);
  return () => { const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
}

/* every subscribed knob whose value moved: its subscribers told, once */
function _tell() {
  for (const name in _subs) {
    const v = laneKnob(name), was = _told[name];
    if (v === was) continue;
    _told[name] = v;
    for (const fn of _subs[name].slice()) { try { fn(v, was); } catch (e) { /* its own */ } }
  }
}

/** For the tests only: forget the address, the class and the subscribers. */
export function _resetLanes() {
  _classOf = null; _lane = null; _laneAskedAt = -Infinity; _urlLane = undefined; _rung = ROW;
  for (const k in _subs) delete _subs[k];
  for (const k in _told) delete _told[k];
}

/* QA: this page's lane and every knob's value now */
if (typeof window !== 'undefined') {
  window.__btLane = () => {
    const knobs = Object.create(null);
    for (const n of KNOB_NAMES) knobs[n] = laneKnob(n);
    return { lane: drawLane(), fromAddress: !!laneFromSearch(_search()), rung: { ..._rung }, depth: rungDepth(), knobs };
  };
}
