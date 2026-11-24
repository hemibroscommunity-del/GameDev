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
 *   AXES    the LADDER: the rungs below a lane's row, on two axes (v2.3.5225: three, below) -- the
 *           game's own work (the crowd, then the rate) and waiting for the
 *           chip (the rate, then the passes, then the pixels).  A rung
 *           lowers ONE knob ONE step (`{ knob, to }`: the step it takes the
 *           knob to); the rate's rung is on both axes, so whichever axis
 *           takes it first lowers the rate, and the other's is then taken
 *           already.  The order is data (call 16: a steady lower rate before
 *           a softer picture).  v2.3.5225 (the gatekeeper's sitting 12): the
 *           pixels are an axis of their OWN, after the chip's -- a rung is an
 *           axis's first n, so on the chip axis the rate could not come back
 *           while a pixel rung waited for a veil (a cooled phone at 30 until
 *           its next loading screen); now the rate comes back in play, and
 *           the pixels at a veil.
 *   PROGRAMS the game's own drawing programs, a name each (the report's
 *           `self`, step 1.7), read from the code (the guard holds each
 *           program's names to its file); Pixi's own are not the game's.
 *
 * THE READER.  laneKnob(name) is the ONE way a knob's value is read: an
 * override if one pins it (OVERRIDES: v2.3.5228 the fallbacks, card O PR 8;
 * PR 12 moves the off-ramps here), else the lane's row at the ladder's
 * rung.  A knob that must be told when it changes (a resolution, a pass)
 * subscribes: onKnob(name, fn).
 *
 * v2.3.5222, THE RUNG (card O PR 2): where the governor stands on the
 * ladder, rungs taken on each axis ({ work, chip }; the row: none).  ONE
 * WRITER: setRung, called by the governor alone (game/framePacer.js, the
 * pacer grown); server/test/frame-pacer.test.mjs fails a second caller, and
 * src/state/phases.js has its row (`ladder`).  Kept: the device's, not the
 * zone's (the governor keeps it by lane in localStorage for the next
 * sitting).  The rung moves no knob until each knob's PR reads laneKnob
 * (v2.3.5224: and the governor walks only the rungs of knobs read: LIVE).
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
 * NO IMPORTS but switches.js (the page's one reader, itself none; v2.3.5232): node tests it (tools/guards/draw-lanes.test.mjs, which also
 * makes docs/LANES.md from this table; server/test/mirror-audit.test.mjs
 * holds the worker's lists to these).  Spec: docs/specs/draw-lanes.md.
 */
import { readerFor, sw, swValue } from './switches.js';   /* v2.3.5232 (card O PR 12): the off-ramps through the page's one reader (no imports of its own) */

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
    reader: { files: Object.freeze(['src/game/crowdCap.js']), moved: true }, pr: 6, switch: '?laddercrowd', system: 'monsters',
  },
  program: {
    what: 'one drawing program for the world\'s sprites, or three (chosen behind the loading screen: never a rung; v2.3.5228: the three an override\'s, below)',
    steps: Object.freeze(['one', 'three']),
    say: Object.freeze(['One drawing program for the world\'s sprites', 'Three drawing programs, as the game drew until 2026-10-18 (a software renderer; a Windows or Mac computer)']),
    reader: { files: Object.freeze(['src/rendering/paletteTex.js']), moved: true }, pr: 8, switch: '?onebatch', system: 'memory',
  },
  look: {
    what: 'how a character\'s look is made: coloured on the chip, or each baked (chosen behind the loading screen: never a rung; v2.3.5228: baked an override\'s, below)',
    steps: Object.freeze(['palette', 'baked']),
    say: Object.freeze(['Looks coloured on the graphics chip', 'Each look baked on first sight, as before the look palette (a Windows or Mac computer)']),
    reader: { files: Object.freeze(['src/game/lookPaletteChoice.js']), moved: true }, pr: 8, switch: 'lookpalette', system: 'device',
  },
  shine: {
    what: 'the metal\'s shine on gear',
    steps: Object.freeze(['on', 'off']),
    say: Object.freeze(['Metal shines', 'No shine on metal']),
    reader: { files: Object.freeze(['src/rendering/lightfx/glint.js']), moved: true }, pr: 9, switch: '?sheen', system: 'render',
  },
  shadows: {
    what: 'the light and the shadows',
    steps: Object.freeze(['on', 'off']),
    say: Object.freeze(['Shadows drawn', 'No shadows']),
    reader: { files: Object.freeze(['src/rendering/lightfx/lightFx.js']), moved: true }, pr: 9, switch: '?lightfx', system: 'render',
  },
  water: {
    what: 'the sea\'s waves',
    steps: Object.freeze(['moving', 'still']),
    say: Object.freeze(['The sea moves', 'The sea is still']),
    reader: { files: Object.freeze(['src/rendering/wheelWater.js']), moved: true }, pr: 9, switch: '?waves', system: 'render',
  },
  queue: {
    what: 'the ms a frame the strip queue may take loading monsters\' art in play (v2.3.5230: the lane\'s, never the frame\'s length; was a quarter of the frame, 3 to 50 ms)',
    steps: Object.freeze([4, 8]),
    say: Object.freeze(['Monsters\' art loads 4 ms a frame at most (a 60 screen\'s quarter)', 'Monsters\' art loads 8 ms a frame at most (a 30 screen\'s quarter)']),
    reader: { files: Object.freeze(['src/rendering/zoneTextures.js']), moved: true }, pr: 10, switch: '?stripslice', system: 'art',
  },
  caches: {
    what: 'the caches\' caps, as a share of each cache\'s own (docs/BUDGETS.md part 3)',
    steps: Object.freeze([1, 0.5]),
    say: Object.freeze(['Every cache holds what its own cap allows', 'A full memory: each cache holds half its own cap, its oldest let go']),
    /* v2.3.5231 (card O PR 11): read where a cap frees memory -- the
       walking armour's sheets and frames (gearNumbers.js), the masked body
       frames (maskedEvict.js, entityRenderer.js's cache).  Not
       lookPalette.js's DIR_CAP (the atlas's 8 KB directory: fewer slots free
       nothing and send later sheets to a texture each) nor cacheBytes.js
       (the art line's counting rule, no cap): the spec, "Not here". */
    reader: { files: Object.freeze(['src/rendering/gearNumbers.js', 'src/rendering/maskedEvict.js']), moved: true }, pr: 11, switch: '', system: 'look',
  },
  step: {
    what: 'the longest step, in ms, one frame may move the world (frameClock.js SMOOTH_MAX_MS, handed in; the loop\'s clamp): three of the lane\'s frames',
    steps: Object.freeze([50, 100]),
    say: Object.freeze(['A frame moves the world at most 50 ms (three frames at 60)', 'A frame moves the world at most 100 ms (three frames at 30): a missed refresh is still its whole ground']),
    /* v2.3.5233 (card O PR 13): read in BroTown.jsx alone, which hands it to
       the clock (frameClock.js keeps no imports) and clamps its step with it */
    reader: { files: Object.freeze(['src/ui/BroTown.jsx']), moved: true }, pr: 13, switch: '?dtsmooth', system: 'ui',
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
    row: Object.freeze({ rate: 26, pixels: 1, crowd: 50, program: 'one', look: 'palette', shine: 'on', shadows: 'on', water: 'moving', queue: 4, caches: 1, step: 50, prewarm: 0 }),
  },
  light: {
    say: 'A lighter picture, for tests and slow devices: picked only by `?lane=light`',
    row: Object.freeze({ rate: 34, pixels: 1, crowd: 30, program: 'one', look: 'palette', shine: 'off', shadows: 'on', water: 'moving', queue: 4, caches: 1, step: 50, prewarm: 0 }),
  },
  thirty: {
    say: 'A screen of 30 a second (an iPhone in Low Power Mode): the full lane\'s row (v2.3.5230: but monsters\' art 8 ms a frame, a 30 screen\'s quarter, as before) and a step of three of its frames, 100 ms (v2.3.5233, card O PR 13)',
    row: Object.freeze({ rate: 26, pixels: 1, crowd: 50, program: 'one', look: 'palette', shine: 'on', shadows: 'on', water: 'moving', queue: 8, caches: 1, step: 100, prewarm: 0 }),   /* v2.3.5233: three of its frames (card O PR 13) */
  },
});
export const LANE_NAMES = Object.freeze(Object.keys(LANES));
/* the lane where nothing is known yet, and the one a worker below caps.report 3 is sent */
export const DEFAULT_LANE = 'full';

/* ── the ladder: three axes (v2.3.5225: the pixels their own), each rung one knob one step ── */
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
  ]),
  /* v2.3.5225: the pixels, after the chip's (a chip-bound phone's last two
     rungs, only behind a veil); never a work-bound phone's (framePacer.js) */
  pixels: Object.freeze([
    Object.freeze({ knob: 'pixels', to: 1 }),
    Object.freeze({ knob: 'pixels', to: 2 }),
  ]),
  /* v2.3.5231 (card O PR 11; the planner's, 2026-11-17): THE MEMORY'S OWN
     AXIS -- a full memory frees caches, then the crowd, never resizes; a
     late frame never takes it (the work axis is the work's).  The crowd's
     rungs are the work axis's too: a knob takes the deeper of its axes. */
  mem: Object.freeze([
    Object.freeze({ knob: 'caches', to: 1 }),
    Object.freeze({ knob: 'crowd', to: 1 }),
    Object.freeze({ knob: 'crowd', to: 2 }),
  ]),
});
export const AXIS_NAMES = Object.freeze(Object.keys(AXES));
/* the light lane's row is full's at this rung (the guard holds the two equal) */
export const LIGHT_AT = Object.freeze({ work: 1, chip: 2 });

/** The deepest the ladder goes: every rung of every axis taken.  The report's
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
  { name: 'palette', file: 'src/rendering/paletteTex.js', built: Object.freeze(['bt-palette-batch', 'bt-palette-clip', 'bt-palette-hairclip', 'bt-palette-mesh', 'bt-palette-fill']), back: 'whole colours' },
  { name: 'look', file: 'src/rendering/lookPalette.js', built: Object.freeze(['bt-look-batch', 'bt-look-sheen-batch']), back: 'each look baked' },
  { name: 'sharp', file: 'src/rendering/sharpPixels.js', built: Object.freeze(['batch-sharp']), back: 'plain pixels' },
  { name: 'clip', file: 'src/rendering/hairClip.js', built: Object.freeze(['batch-clip', 'batch-clip-alpha']), back: 'pictures to the alpha mask (colour numbers stay on the stencil)' },
  { name: 'fill', file: 'src/rendering/fillBatch.js', built: Object.freeze(['batch-fill']), back: 'no one-colour glow' },
  { name: 'water', file: 'src/rendering/wheelWater.js', built: Object.freeze(['bt-wheel-water', 'bt-wheel-water-all', 'bt-wheel-water-pal', 'bt-wheel-water-pal-all']), back: 'still water' },
  { name: 'glint', file: 'src/rendering/lightfx/glint.js', built: Object.freeze(['bt-glint-filter']), back: 'the filtered pieces plain' },
  { name: 'sheen', file: 'src/rendering/lightfx/sheenBatch.js', built: Object.freeze(['batch-sheen']), back: 'its pass' },
  { name: 'shadow', file: 'src/rendering/lightfx/shadows.js', built: Object.freeze(['bt-shadow-shade', 'bt-shadow-filter']), back: 'the old pass' },
]);
export const PROGRAM_NAMES = Object.freeze(PROGRAMS.map((p) => p.name));

/* ── the overrides: a row pins a knob to a value, winning over the lane and
   the ladder; the governor never moves a pinned knob.  v2.3.5228 (card O PR
   8): THE FALLBACKS -- each a known trouble, kept while its trigger lives
   (card T's `fallback` column); PR 12 brings the off-ramps (`?pixbudget=0`,
   `?onebatch=0` ...).  A row: { knob, value, when, why }: `when` is a
   question the device is asked through deviceProfile.js ALONE (useDevAsk:
   'software', 'computer', 'windows', 'mac'), never a name read here ── */
export const OVERRIDES = Object.freeze([
  Object.freeze({ knob: 'program', value: 'three', when: 'software', why: 'a software renderer runs every branch of the one program for every pixel (TRAPS §225: 4.1 frames a second against 9.2)' }),
  Object.freeze({ knob: 'program', value: 'three', when: 'computer', why: 'a Windows or Mac computer builds programs through ANGLE, whose compilers took minutes over the look palette\'s; this one was never built there (v2.3.5016)' }),
  Object.freeze({ knob: 'look', value: 'baked', when: 'windows', why: 'Windows: ANGLE\'s FXC inlines the look palette\'s program, the loading screen stood at 75% for 5-10 minutes on the owner\'s laptop (v2.3.3838)' }),
  Object.freeze({ knob: 'look', value: 'baked', when: 'mac', why: 'a Mac: ANGLE\'s Metal inlines as FXC does, and a computer has the memory the palette saves (v2.3.3842)' }),
]);
/* ── v2.3.5232 (card O PR 12): THE OFF-RAMPS ARE OVERRIDES TOO.  A switch in
   this page's address (read through switches.js, the page's one reader)
   pins its knob: to `value`, where the off-ramp is one of the knob's steps,
   or (value null) to its lane's row -- either way out of the governor's
   reach (liveKnobs), so a rung is never taken on a knob nothing reads.
   `addr`: a switch's name (`nowaves`: thrown, as its row says), or a name
   and the value it is written with (`onebatch=0`).  Only this page's own
   address: a choice asking as another device (askingAs) reads its own. ── */
export const ADDRESS_PINS = Object.freeze([
  Object.freeze({ knob: 'program', value: 'three', addr: 'onebatch=0', why: 'the three programs, as before the one program' }),
  Object.freeze({ knob: 'program', value: 'one', addr: 'onebatch=1', why: 'the one program asked for (QA: a software renderer would keep the three)' }),
  Object.freeze({ knob: 'look', value: 'baked', addr: 'lookpalette=0', why: 'every look baked' }),
  Object.freeze({ knob: 'look', value: 'palette', addr: 'lookpalette=1', why: 'the look palette asked for (QA: even on Windows)' }),
  Object.freeze({ knob: 'water', value: 'still', addr: 'nowaves', why: 'the sea still' }),
  /* v2.3.6503 (card PH PR 4): the owner's two ways to hold the shine still (the ladder's second chip rung otherwise;
     on by default: decided for the owner while away, the orchestrator, 2026-11-24) */
  Object.freeze({ knob: 'shine', value: 'off', addr: 'shine=0', why: KNOBS.shine.say[1] }),   /* v2.3.6503: the knob's own words (no new word written in place: player-words) */
  Object.freeze({ knob: 'shine', value: 'on', addr: 'shine=1', why: KNOBS.shine.say[0] }),
  Object.freeze({ knob: 'rate', value: null, addr: 'pace', why: 'the pacer off (`?pace=0`): the rate is read by nothing' }),
  Object.freeze({ knob: 'crowd', value: null, addr: 'crowd', why: 'a crowd cap of its own (`?crowd=K`): the knob is read by nothing' }),
]);
/** Does this page's address throw an address pin's switch?  A name and a
 *  value: the value as written; a switch with a form: thrown; a value's
 *  switch (`?crowd`): written with one. */
function addrPinned(addr) {
  /* v2.3.6503: the shine's two pins, read by name (the switch scanner finds a read it can see) */
  if (addr === 'shine=0' || addr === 'shine=1') return swValue('shine') === addr.slice(6);
  const i = addr.indexOf('=');
  if (i >= 0) return swValue(addr.slice(0, i)) === addr.slice(i + 1);
  if (addr === 'crowd') return crowdWord(swValue('crowd'));
  if (addr === 'pace') return sw('pace');
  if (addr === 'nowaves') return sw('nowaves');
  return false;
}
/* `?crowd=K` as crowdCap.js crowdFromSearch takes it (a cap of 1-500, or
   0/all/off for none): a word it ignores pins nothing.  Its copy here, held
   to crowdFromSearch by off-ramps.test §3 (crowdCap.js imports this file) */
function crowdWord(raw) {
  if (raw === null) return false;
  const v = String(raw).trim().toLowerCase();
  if (v === 'all' || v === '0' || v === 'off') return true;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1;
}
/** The address pin on this knob on this page, or null. */
export function addressPinOf(name) {
  if (_askNow) return null;   /* a choice asking as another device: its own address */
  for (const o of ADDRESS_PINS) {
    if (o.knob !== name) continue;
    let yes = false;
    try { yes = addrPinned(o.addr); } catch (e) { yes = false; }
    if (yes) return o;
  }
  return null;
}
/* the questions an override's `when` may ask: deviceProfile.js devAsk
   answers each (one-program.test §2); this file reads no device's name */
export const DEV_ASKS = Object.freeze(['software', 'computer', 'windows', 'mac']);
/* the device's answers to an override's `when` (deviceProfile.js hands its
   own in: useDevAsk); a pure choice asks about another device for a moment
   (askingAs: the QA probes, the tests) */
let _ask = null;
let _askNow = null;
/** deviceProfile.js hands in its answers to an override's question (the one
 *  file that asks the device anything). */
export function useDevAsk(fn) { _ask = typeof fn === 'function' ? fn : null; }
/** Run fn with the overrides' questions answered by `ask` (a device other
 *  than this page's: the pure choices, their tests and QA probes). */
export function askingAs(ask, fn) {
  const was = _askNow;
  _askNow = typeof ask === 'function' ? ask : () => false;
  try { return fn(); } finally { _askNow = was; }
}

/** The lane a device class picks: facts only.  `thirty` where the screen's
 *  rate is 30, else `full`.  Pure. */
export function pickLane(cls) {
  return cls && cls.hz === 30 ? 'thirty' : 'full';
}

/** `?lane=<name>` from an address's search string: a lane of the table, or
 *  null (none, or a name off the table: the facts pick). */
export function laneFromSearch(search) {
  /* v2.3.5232 (card O PR 12): through the page's one reader (switches.js);
     an address handed in (the tests') read by its own reader */
  const v = typeof search === 'string' ? readerFor(search).swValue('lane') : swValue('lane');
  return v && LANE_NAMES.includes(v) ? v : null;
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
    if (_urlLane === undefined) _urlLane = laneFromSearch();
    if (_urlLane) return _urlLane;
    let c = cls;
    if (c === undefined && _classOf) {
      const t = _now();
      /* v2.3.5228: a class not yet known (no drawing context) spends no ask:
         the look palette's choice reads its knob at load, before the
         renderer, and must not hold the first real answer back 5 s */
      if (t - _laneAskedAt >= LANE_ASK_MS) { c = _classOf(); if (c) _laneAskedAt = t; }
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
const ROW = Object.freeze({ work: 0, chip: 0, pixels: 0, mem: 0 });
/* the governor's (setRung): rungs taken on each axis.  v2.3.5222 (the
   gatekeeper's sitting 12): a property of a module object, not a module
   `let` -- card L's phase guard reads a door's writes off the syntax tree as
   `.prop` writes (DOOR_SUITES), and only setRung and the tests' reset write it */
const LANE = { _rung: ROW };

/* v2.3.5224: THE LIVE KNOBS -- a rung counts only if something reads its
   knob (the gatekeeper's sitting 11 on #1794, verified by a probe: the
   governor counted every knob in KNOB_NAMES, read or not, so it stepped
   through rungs nothing read -- the crowd, the passes, the pixels -- kept
   them in bt_rung, and climbed back one 20 s try a rung, the rate (chip
   rung 1) last: after a hot sitting a cool 60 phone started at 30 and stayed
   there for minutes, a whole sitting where a pixel rung waited for a veil).
   A knob is LIVE once its row marks it moved (its PR reads it through
   laneKnob); the governor walks only rungs that change a live knob, and
   rungDepth counts only those.  The tests may play the whole ladder, as the
   knobs' PRs will make it (_liveKnobs). */
export const MOVED_KNOBS = Object.freeze(KNOB_NAMES.filter((k) => KNOBS[k].reader && KNOBS[k].reader.moved));
/* v2.3.5228: ...and on the ladder.  The program and the look are moved (read
   through laneKnob) but on no axis: chosen once behind the loading screen,
   never a rung.  Leaving them out keeps the live set, and so the key a kept
   rung is stored under (framePacer.js liveKey), what it was: no phone's kept
   rung is thrown away by this PR */
const ON_LADDER = new Set(AXIS_NAMES.flatMap((a) => AXES[a].map((r) => r.knob)));
export const LADDER_KNOBS = Object.freeze(MOVED_KNOBS.filter((k) => ON_LADDER.has(k)));
let _live = LADDER_KNOBS;
let _liveNow = null;      /* _live less the knobs this page's address takes off the ladder (read once) */
/* v2.3.5225 (the gatekeeper's sitting 12): a knob's ladder switch takes its
   rungs out of the governor's reach, not only out of its reader's -- with
   `?ladderpix=0` the governor took a pixel rung nothing read and its try up
   then held the rate (sitting 11's class); with `?ladderrate=0` a slow 60
   computer was never paced but softened at the next veil.  The two
   switches are read here, once (framePacer.js and renderRes.js ask these) */
/* v2.3.5232 (card O PR 12): each through the page's one reader (switches.js:
   no address handed in, the page's; the tests' by its own reader) */
export function ladderRateOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('ladderrate') : sw('ladderrate'));
}
export function ladderPixOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('ladderpix') : sw('ladderpix'));
}
/* v2.3.5229 (card O PR 9): the passes -- the metal's shine, the shadows, the
   moving sea -- are the chip axis's rungs after the rate.  `?ladderpass=0`
   takes all three off the ladder for this screen: off the live set, so the
   governor never takes their rungs and each is drawn as its lane's row,
   whatever the step (as `?ladderpix=0`, sitting 12) */
export const PASS_KNOBS = Object.freeze(['shine', 'shadows', 'water']);
export function ladderPassOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('ladderpass') : sw('ladderpass'));
}
/* v2.3.5226 (card O PR 6): the crowd's rungs, out of reach under `?laddercrowd=0` (crowdCap.js asks it too) */
export function ladderCrowdOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('laddercrowd') : sw('laddercrowd'));
}
/** The knobs a rung can change today: marked moved and on an axis (the
 *  tests' list while one is set), less any this page's address takes off
 *  the ladder. */
export function liveKnobs() {
  if (_liveNow) return _liveNow;
  _liveNow = Object.freeze(_live.filter((k) => !(k === 'rate' && !ladderRateOn()) && !(k === 'pixels' && !ladderPixOn()) && !(k === 'crowd' && !ladderCrowdOn())
    && !(PASS_KNOBS.includes(k) && !ladderPassOn())
    && !addressPinOf(k)));   /* v2.3.5232: a knob an off-ramp pins is never moved (card O PR 12) */   /* v2.3.5229: the passes */
  return _liveNow;
}
/** For the tests only: play the ladder with these knobs live (null: the moved ones). */
export function _liveKnobs(list) { _live = Array.isArray(list) ? Object.freeze(list.slice()) : LADDER_KNOBS; _liveNow = null; }

/** Where the ladder stands now: { work, chip, pixels }, rungs taken on each axis. */
export function ladderRung() { return LANE._rung; }
/** Rungs taken that change something, every axis: 0 is the lane's row (the
 *  report's `rung`).  v2.3.5224: a rung whose knob nothing reads yet counts
 *  none. */
export function rungDepth(r) {
  const x = r || LANE._rung;
  let n = 0;
  for (const a of AXIS_NAMES) {
    const m = Math.max(0, Math.min(AXES[a].length, x[a] | 0));
    for (let j = 0; j < m; j++) if (liveKnobs().includes(AXES[a][j].knob)) n++;
  }
  return n;
}
/** THE ONE WRITER of the rung: the governor's (framePacer.js), never another
 *  file's.  Each axis held to its rungs.  Subscribed knobs are told.
 *  v2.3.5225: three axes (the pixels' own). */
export function setRung(work, chip, pixels, mem) {
  const w = Math.max(0, Math.min(AXES.work.length, Math.floor(Number(work) || 0)));
  const c = Math.max(0, Math.min(AXES.chip.length, Math.floor(Number(chip) || 0)));
  const p = Math.max(0, Math.min(AXES.pixels.length, Math.floor(Number(pixels) || 0)));
  const m = Math.max(0, Math.min(AXES.mem.length, Math.floor(Number(mem) || 0)));   /* v2.3.5231: the memory's own */
  if (w === LANE._rung.work && c === LANE._rung.chip && p === LANE._rung.pixels && m === (LANE._rung.mem | 0)) return LANE._rung;
  LANE._rung = w === 0 && c === 0 && p === 0 && m === 0 ? ROW : Object.freeze({ work: w, chip: c, pixels: p, mem: m });
  _tell();
  return LANE._rung;
}

/** The override pinning a knob for a device whose answers are `ask` (pure), or null. */
export function pinFor(name, ask) {
  if (typeof ask !== 'function') return null;
  for (const o of OVERRIDES) {
    if (o.knob !== name) continue;
    let yes = false;
    try { yes = !!ask(o.when); } catch (e) { yes = false; }
    if (yes) return o;
  }
  return null;
}
/** The override pinning a knob on this page (or the device askingAs names), or null. */
export function pinOf(name) {
  const a = addressPinOf(name);   /* v2.3.5232: this page's off-ramp first */
  if (a && a.value !== null) return { knob: a.knob, value: a.value, when: 'address', why: a.why };
  return pinFor(name, _askNow || _ask);
}

/** THE ONE WAY a knob's value is read: an override if one pins it, else this
 *  page's lane's row at the ladder's rung (v2.3.5222: the governor's). */
export function laneKnob(name) {
  const p = pinOf(name);
  if (p) return p.value;
  return knobAt(drawLane(), name, LANE._rung);
}

/* ═══ v2.3.5226 (the gatekeeper's sitting 15 on #1836): WHAT THE SCREEN SEES OF A KNOB ═══
   The governor counts a rung as useful when it changes what is drawn
   (framePacer.js next(), trim()), and read that as "its knob's value
   changes".  For the crowd it is not: with 30 or fewer players near, 50 ->
   30 -> 15 hides no one and saves nothing, yet each rung cost two late
   verdicts before the rate's (about 5 s more of late frames a hot spell,
   the owner alone on his iPhone).  So a knob's reader may say what the
   screen sees of a value (crowdCap.js: the cap, or the players near if
   fewer), and the governor compares those: a crowd rung whose cap is at or
   above the players near is passed, down and up (the finder's cure; the
   planning session's word). */
const _seen = Object.create(null);
/** A knob's reader says what the screen sees of a value (fn(value) -> what
 *  decides the picture).  One a knob. */
export function seeKnob(name, fn) {
  if (KNOBS[name] && typeof fn === 'function') _seen[name] = fn;
}
/** What the screen sees of a knob's value now (the value itself where its
 *  reader says nothing). */
export function knobSeen(name, value) {
  const f = _seen[name];
  if (!f) return value;
  try { return f(value); } catch (e) { return value; }
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
  _classOf = null; _lane = null; _laneAskedAt = -Infinity; _urlLane = undefined; LANE._rung = ROW; _liveNow = null;
  for (const k in _subs) delete _subs[k];
  for (const k in _told) delete _told[k];
}

/* QA: this page's lane and every knob's value now */
if (typeof window !== 'undefined') {
  window.__btLane = () => {
    const knobs = Object.create(null);
    for (const n of KNOB_NAMES) knobs[n] = laneKnob(n);
    return { lane: drawLane(), fromAddress: !!laneFromSearch(), rung: { ...LANE._rung }, depth: rungDepth(), live: liveKnobs().slice(), knobs };
  };
}
