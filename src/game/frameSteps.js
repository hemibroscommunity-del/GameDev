/* ═══ v2.3.5340: THE FRAME AS NAMED STEPS (grand plan step 5.4, card M PR 1) ═══
 *
 * The game's loop (`gameLoop` in src/ui/BroTown.jsx) was one try block of
 * about 1,600 code lines: a throw anywhere in it ended the frame, and the
 * console said only "GameLoop error".  Which part threw, and which part took
 * the frame's time, nobody could say without a profiler.
 *
 * So the loop is now a list of named steps, in order.  This PR MOVES NOTHING:
 * the six calls at the loop's end are each a step, and everything before them
 * is one step, `legacy` (the monsters' step is the first to leave it, card M
 * PR 2).  Each step counts its time and its throws.
 *
 *   legacy      the loop's body before the six calls (the player, the town,
 *               the monsters, the input...)
 *   visual      updateVisualSystems   (game/visualSystems.js)
 *   arrows      updateArrows          (game/projectiles.js)
 *   slime       updateSlimeProjectiles
 *   cleanup     updateStateCleanup    (game/stateCleanup.js)
 *   render      renderFrame           (game/renderFrame.js)
 *   afterFrame  runAfterFrame         (ui/afterFrame.js)
 *
 * v2.3.5341 (card M PR 2, the owner's review item 5): every single call in
 * legacy is a step of its own, grouped, in its place: legacy is closed before
 * it and opened again after it (still ONE step, its time summed).  Nothing
 * moves.
 *
 *   tap         settleTapPress            (game/tapJump.js)
 *   input       stickFrame                (game/stickZones.js; v2.3.6541: the
 *               stick and the keys read, moved out of legacy whole, card CT)
 *   sound       tickWaterAmbience to tickDanceMusic (the six ambience ticks)
 *   ride        rideStepped               (game/ride.js)
 *   zone        handleZoneTransitions, updateZoneMechanics, updateDungeonWaves
 *   farm        tickFarmWalk              (game/farmWalk.js)
 *   townsfolk   raceTick, townsfolkFrame  (game/race.js, game/townsfolkDay.js)
 *   monsters    updateMonsterCombat       (game/monsterCombat.js)
 *   weaponFeel  swordFeelFrame, staffFeelFrame, bowFeelFrame
 *   loot        updateGroundLootPickup    (game/groundLoot.js)
 *   peers       releasePeerDamage
 *
 * THE MARKS.  `begin(i)` and `end(i)`, by the step's index, and `to(a, b)`:
 * a ends, b begins, on ONE clock read (legacy's way in and out of the steps
 * inside it).  No closure and no object made per frame (the sums are typed
 * arrays made once: a frame makes no garbage).  `begin(0)` starts a frame;
 * legacy opened again by `to(k, 0)` is the same frame and the same run.  The time
 * is summed over WINDOW (600) frames, and the last whole window's sums are
 * kept beside the window being summed: Safari's clock ticks in whole ms, so
 * one frame's reading of a small step is 0 or 1, and only a sum says
 * anything.
 *
 * A THROW.  The loop's one try/catch asks `fault(err)`: the step that was
 * open is the one that threw.  It is counted, and the step's FIRST throw on
 * this page load goes to the crash ring (`report(name, message)`: BroTown
 * passes crashTrap's recordCrash, kind 'frame-step', which is QUIET there: it
 * rides along with the next real upload and never sends alone; the planning
 * session's answer 2, 2026-11-17).  Later throws of that step are counted
 * only.  The frame ends as it always did: a throw still stops the steps after
 * it (nothing a player sees changes).
 *
 * THE PROBE.  `read()` (window.__btSteps on the page): the names, the last
 * whole window's sums in ms, the window being summed, each step's runs and
 * throws.  On the page only: never in the field report (answer 5).
 *
 * `?framesteps=0` (src/game/switches.js; tools/guards/lib/switches.mjs): no
 * marks are made, no ring entry, the loop exactly as it was.
 *
 * NO IMPORTS: node tests it (tools/guards/frame-steps.test.mjs).
 */

/** The steps, in the loop's order: the name, and the calls it wraps (legacy
 *  wraps the body before the six at the end, the steps inside it aside).  tools/guards/frame-steps.test.mjs holds the
 *  loop to this list: each call between its own step's marks, in this order. */
export const STEPS = [
  { name: 'legacy', calls: [] },
  /* v2.3.5341: inside legacy, each between `to(0, k)` (or the step before's
     `to(k - 1, k)`) and `to(k, ...)` */
  { name: 'tap', calls: ['settleTapPress'], inLegacy: true },
  /* v2.3.6541: the player's input read (game/stickZones.js stickFrame), moved
     out of legacy whole; the two buttons' reads sit here (card CT PR 2) */
  { name: 'input', calls: ['stickFrame'], inLegacy: true },
  { name: 'sound', calls: ['tickWaterAmbience', 'tickTownAmbience', 'tickAmbientBeds', 'tickRideSound', 'tickHeartbeat', 'tickDanceMusic'], inLegacy: true },
  { name: 'ride', calls: ['rideStepped'], inLegacy: true },
  { name: 'zone', calls: ['handleZoneTransitions', 'updateZoneMechanics', 'updateDungeonWaves'], inLegacy: true },
  { name: 'farm', calls: ['tickFarmWalk'], inLegacy: true },
  { name: 'townsfolk', calls: ['raceTick', 'townsfolkFrame'], inLegacy: true },
  { name: 'monsters', calls: ['updateMonsterCombat'], inLegacy: true },
  { name: 'weaponFeel', calls: ['swordFeelFrame', 'staffFeelFrame', 'bowFeelFrame'], inLegacy: true },
  { name: 'loot', calls: ['updateGroundLootPickup'], inLegacy: true },
  { name: 'peers', calls: ['releasePeerDamage'], inLegacy: true },
  /* the six at the loop's end, each between `begin(k)` and `end(k)` */
  { name: 'visual', calls: ['updateVisualSystems'] },
  { name: 'arrows', calls: ['updateArrows'] },
  { name: 'slime', calls: ['updateSlimeProjectiles'] },
  { name: 'cleanup', calls: ['updateStateCleanup'] },
  { name: 'render', calls: ['renderFrame'] },
  { name: 'afterFrame', calls: ['runAfterFrame'] },
];
export const STEP_NAMES = STEPS.map(function (s) { return s.name; });

/** the frames a window's sums are taken over */
export const WINDOW = 600;

/** One page's steps.
 *  opts.now     the clock (performance.now on the page; a fake one in node)
 *  opts.report  (name, message) for a step's first throw (the crash ring)
 *  opts.window  the frames a window (WINDOW) */
export function makeFrameSteps(opts) {
  var o = opts || {};
  var n = STEPS.length;
  var now = typeof o.now === 'function' ? o.now
    : function () { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); };
  var report = typeof o.report === 'function' ? o.report : null;
  var win = o.window > 0 ? o.window : WINDOW;
  var cur = new Float64Array(n);     /* the window being summed */
  var last = new Float64Array(n);    /* the last whole window's sums */
  var at = new Float64Array(n);      /* when each open step began */
  var runs = new Uint32Array(n);     /* each step's runs, since the page loaded */
  var throws = new Uint32Array(n);   /* each step's throws, since the page loaded */
  var frames = 0, lastFrames = 0, open = -1;

  function begin(i) {
    if (i === 0) {
      /* a frame begins: a whole window is kept, and the next starts */
      if (frames >= win) { last.set(cur); lastFrames = frames; cur.fill(0); frames = 0; }
      frames++;
    }
    open = i;
    runs[i]++;
    at[i] = now();
  }
  function end(i) {
    cur[i] += now() - at[i];
    if (open === i) open = -1;
  }
  /* v2.3.5341: a ends and b begins on one clock read; legacy opened again is
     not a new run (its runs are the frames) */
  function to(a, b) {
    var t = now();
    cur[a] += t - at[a];
    at[b] = t;
    open = b;
    if (b !== 0) runs[b]++;
  }
  /** the loop's catch: the open step threw.  Its time so far is counted, the
   *  throw counted, and its first throw reported.  Returns the step's name. */
  function fault(err) {
    var i = open;
    if (i < 0) return null;
    end(i);
    throws[i]++;
    if (throws[i] === 1 && report) {
      var msg = '';
      try { msg = err && err.message ? String(err.message) : String(err); } catch (e) { msg = '?'; }
      try { report(STEPS[i].name, msg); } catch (e) { /* the ring never throws into the game */ }
    }
    return STEPS[i].name;
  }
  function read() {
    var r = function (a) { return Array.prototype.map.call(a, function (v) { return Math.round(v * 1000) / 1000; }); };
    return {
      on: true,
      names: STEP_NAMES.slice(),
      window: win,
      frames: lastFrames,
      ms: lastFrames ? r(last) : null,
      now: { frames: frames, ms: r(cur) },
      runs: Array.from(runs),
      throws: Array.from(throws),
      open: open < 0 ? null : STEPS[open].name,
    };
  }
  return { begin: begin, end: end, to: to, fault: fault, read: read };
}
