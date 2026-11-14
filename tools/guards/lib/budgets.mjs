/* ═══ v2.3.5105: RULE 6'S TABLE (card B PR 6; docs/BUDGETS.md part 9) ═══
 *
 * The plan's rule 6: "one controller a signal, and a budget for what is
 * shared.  Each system declares, in one table a guard reads, what it reads,
 * spends or controls of the shared things."  This is that table: a row a
 * system (the system map's names, lib/systems.mjs), each with
 *
 *   reads     the shared things it measures;
 *   spends    the shared things it uses, and how much (a number in the
 *             thing's unit, or null: not measured yet);
 *   controls  the signals it acts on, each { signal, where }: the file the
 *             controller lives in (the guard holds it to the row's system).
 *
 * Read off docs/BUDGETS.md parts 1 to 7 (card S, at main 2d4138e: what the
 * CODE does, not a plan).  A controller BUDGETS names is a row's control
 * here; a signal two controls act on is a SECOND controller, and part 8's
 * sixteen are KNOWN_SECOND below: a census (rule 3), whose count only falls.
 * tools/guards/budgets.test.mjs holds it.
 *
 * THE SIGNALS (a controller acts on one of these):
 *   page-ms          the page's thread: how much a job may take of a frame
 *   page-ms-line     where a hold's line is written (a test's, not the game's)
 *   lateness         the frames are late / the frame's length
 *   world-in-play    "is the world in play", the input four things decide on
 *   worker-idle      when png8Worker.js is let go
 *   worker-stuck     when a worker is taken as stuck
 *   mb               bytes held by a cache against its own line
 *   regen-save       the player's record saved while health and pools refill
 *   botstat-rows     when `botstat:` is written
 *   move-send-rate   how often the phone sends a move
 *   moves-out        how often a player's moves go out to the others
 *   move-places      which places of a player's moves the server reads
 *   reaction-time    the time a reaction looks to have taken
 *   idleness         when an idle player is logged out
 *   loading-giveup   when a loading wait gives up
 *   save-pace        the player's record's stamp (_saveRpg), its one owner
 *   tick-rate        the tick's interval (tickpace.js), its one owner
 *   socket-budget    a socket's messages in (flood.js), its one owner
 *
 * THE SHARED THINGS and the line a sum of spends may not pass (null: no sum
 * line exists today; BUDGETS part 0's table):
 */
export const SHARED = Object.freeze({
  'page-ms': { unit: 'ms a frame', line: 16, where: 'tools/qa/mp/held-budget.mjs FRAME_JS_MAX_MS' },
  lateness: { unit: 'a verdict', line: null, where: 'src/game/framePacer.js (the pacer\'s rule)' },
  mb: { unit: 'MB', line: null, where: 'tools/qa/mp/memory-budget.mjs: seven lines, no sum' },
  'loading-seconds': { unit: 's', line: null, where: 'blank: no line' },
  rows: { unit: 'rows a player-hour', line: null, where: 'server/test/cost-guard.test.mjs: lines a case, no total' },
  messages: { unit: 'events out a tick', line: 500, where: 'server/src/index.js EVENTS_PER_TICK_CAP' },
  looks: { unit: 'a hidden threshold', line: null, where: 'server/src/hidden.js HIDDEN_SPEC' },
});

const c = (signal, where) => Object.freeze({ signal, where });

/* a row a system; a system BUDGETS does not name has an empty row */
export const ROWS = Object.freeze({
  wire: {
    reads: ['page-ms'],   /* wsClient.js _slowLog: a slow handler, over 5 ms */
    spends: { messages: null },
    controls: [
      c('socket-budget', 'server/src/flood.js'),
      c('regen-save', 'server/src/index.js'),          /* REGEN_SAVE_MS, the regen's gate */
      c('move-send-rate', 'src/networking/wsClient.js'), /* INPUT_BATCH_WINDOW; moveGapMs; the move diet's 66 ms */
      c('move-places', 'src/networking/wsClient.js'),    /* the send layers decide which places the ring holds */
      c('reaction-time', 'src/networking/wsClient.js'),  /* the move's send gap */
      c('reaction-time', 'src/networking/wsClient.js'),  /* the pong rider, which shapes session.rtt */
      c('idleness', 'server/src/index.js'),              /* IDLE_TIMEOUT_MS, the worker's sweep */
    ],
  },
  session: { reads: [], spends: {}, controls: [c('move-send-rate', 'src/game/quietPhone.js'), c('moves-out', 'server/src/presence2.js')] },
  identity: { reads: [], spends: {}, controls: [] },
  bots: { reads: ['looks'], spends: { rows: null }, controls: [c('botstat-rows', 'server/src/botfp.js'), c('botstat-rows', 'server/src/botsig.js')] },
  liveops: { reads: [], spends: {}, controls: [] },
  'server-core': {
    reads: [],
    spends: { rows: null, messages: null },
    controls: [
      c('save-pace', 'server/src/persistence.js'),
      c('regen-save', 'server/src/persistence.js'),   /* _saveRpgPools: the same 10 s gate again */
      c('tick-rate', 'server/src/tickpace.js'),
      c('moves-out', 'server/src/tick.js'),          /* the near circle, the slim roster */
    ],
  },
  combat: { reads: [], spends: {}, controls: [] },
  monsters: { reads: [], spends: {}, controls: [] },
  economy: { reads: [], spends: { rows: null }, controls: [] },
  skills: { reads: [], spends: { rows: null }, controls: [] },
  quests: { reads: [], spends: {}, controls: [] },
  social: { reads: [], spends: {}, controls: [] },
  world: {
    reads: [],
    spends: { 'loading-seconds': null, 'page-ms': null },
    controls: [
      c('page-ms', 'src/game/onePic.js'),             /* PAINTS_A_FRAME */
      c('page-ms', 'src/game/buildingRooms.js'),      /* an idle moment */
      c('worker-stuck', 'src/game/wheelTrial.js'),    /* the ground builder, retried 2 to 30 s */
      c('moves-out', 'server/src/eventplace.js'),
      c('moves-out', 'server/src/wheelzone.js'),
      c('loading-giveup', 'src/game/wheelHome.js'),   /* TRIP_VEIL_MS */
      c('loading-giveup', 'src/game/zoneGate.js'),
      c('loading-giveup', 'src/game/worldTrial.js'),
    ],
  },
  movement: {
    reads: [],
    spends: {},
    controls: [
      c('move-send-rate', 'src/game/moveDiet.js'),     /* the path diet, 200 ms */
      c('moves-out', 'server/src/steadymovers.js'),    /* steady walkers held */
      c('moves-out', 'server/src/movepath.js'),        /* a glider */
    ],
  },
  townsfolk: { reads: [], spends: {}, controls: [] },
  life: { reads: [], spends: {}, controls: [] },
  audio: { reads: [], spends: { mb: null }, controls: [c('mb', 'src/data/sfxCache.js')] },
  input: { reads: [], spends: {}, controls: [] },
  desktop: { reads: [], spends: {}, controls: [] },
  device: { reads: ['loading-seconds'], spends: {}, controls: [] },   /* loadTimes.js: the screen's seconds, kept nowhere */
  'page-thread': {
    reads: ['page-ms', 'lateness'],   /* renderFrame.js: the frame's sample */
    spends: {},
    controls: [
      c('lateness', 'src/game/framePacer.js'),        /* THE pacer: how many refreshes are drawn */
      c('lateness', 'src/game/frameClock.js'),        /* the steady step: a second clock of the same frame */
      c('world-in-play', 'src/game/framePacer.js'),   /* the pacer's judge */
      c('page-ms', 'src/game/framePacer.js'),         /* beforeDraw: reads that wait for the chip, no limit */
      c('move-send-rate', 'src/game/framePacer.js'),  /* which refreshes are frames at all */
      c('move-places', 'src/game/frameClock.js'),     /* the step's length shapes the places */
    ],
  },
  memory: {
    reads: [],
    spends: { mb: null },
    controls: [c('page-ms', 'src/rendering/heldNumbers.js'), c('worker-idle', 'src/rendering/paletteLoad.js')],
  },
  preload: {
    reads: [],
    spends: { 'loading-seconds': null },
    controls: [c('page-ms', 'src/rendering/picsOnce.js'), c('world-in-play', 'src/ui/loadingGate.js')],
  },
  art: {
    reads: [],
    spends: { mb: null, 'page-ms': null },
    controls: [
      c('page-ms', 'src/rendering/zoneTextures.js'),  /* stripTurn: a quarter of the frame, 3 to 50 ms */
      c('lateness', 'src/rendering/zoneTextures.js'), /* the strip slice GROWS with the frame's length */
      c('worker-idle', 'src/rendering/stripRead.js'),
      c('worker-stuck', 'src/rendering/stripRead.js'),
      c('worker-stuck', 'src/rendering/bodyBake.js'),
    ],
  },
  look: { reads: [], spends: { mb: null }, controls: [c('page-ms', 'src/rendering/gearSheets.js')] },   /* _gearTurn, 6 ms */
  render: {
    reads: [],
    spends: { mb: null, 'page-ms': null },
    controls: [
      c('page-ms', 'src/rendering/wheelObjects.js'),   /* BASES_SLICE_MS; BOTTOMS_A_FRAME */
      c('page-ms', 'src/rendering/wheelGround.js'),
      c('page-ms', 'src/rendering/systems/entityRenderer.js'),   /* an equip's bakes; _idleYield */
      c('worker-idle', 'src/rendering/wheelObjects.js'),
      c('worker-stuck', 'src/rendering/systems/entityRenderer.js'),   /* maskedBakeWorker, 6 s */
      c('mb', 'src/rendering/systems/effectsRenderer.js'),   /* PEER_FIG_BUDGET, 16 MB */
    ],
  },
  ui: {
    reads: [],
    spends: { 'page-ms': null },
    controls: [
      c('page-ms', 'src/ui/mobile/dash/BoardRow.jsx'),
      c('page-ms', 'src/ui/mobile/BottomDashboard.jsx'),
      c('page-ms', 'src/ui/WorldMapOverlay.jsx'),
      c('world-in-play', 'src/ui/BroTown.jsx'),        /* setStripPlay */
      c('world-in-play', 'src/ui/BroTown.jsx'),        /* the black-screen watchdog's own list */
      c('move-send-rate', 'src/ui/BroTown.jsx'),       /* the frame loop writes the waiting move */
      c('idleness', 'src/ui/BroTown.jsx'),             /* IDLE_LOGOUT_MS, the phone's own logout */
      c('loading-giveup', 'src/ui/IntroVideo.jsx'),
    ],
  },
  data: { reads: [], spends: { mb: null }, controls: [c('mb', 'src/data/gameDisplay.js')] },   /* zone music, 56 MB */
  state: { reads: [], spends: {}, controls: [] },   /* v2.3.5160: the state ledger (card U): plain data, nothing imports it */
  debug: { reads: ['page-ms', 'lateness'], spends: {}, controls: [] },   /* perfTracker, madeLog, busyBeat, perfHud: meters */
  shell: { reads: [], spends: {}, controls: [] },
  vendor: { reads: [], spends: {}, controls: [] },
});

/* BUDGETS part 8: every second controller, as found.  A CENSUS (rule 3):
   it only falls.  Take one off when its signal has one controller left (the
   guard prints which may go); never add one: a new second controller fails. */
export const KNOWN_SECOND = Object.freeze([
  { n: 1, thing: 'page-ms', signal: 'page-ms', what: '24 rationers, none sharing; "a few ms, then the next frame" written five times' },
  { n: 2, thing: 'page-ms', signal: 'page-ms-line', what: 'hold lines in three files (held-budget.mjs, mp-townride.mjs, mp-stripgentle.mjs): tests, no row of the game\'s' },
  { n: 3, thing: 'page-ms', signal: 'worker-idle', what: 'one worker file started by three owners, three idle rules' },
  { n: 4, thing: 'page-ms', signal: 'worker-stuck', what: 'a worker\'s stuck watch written four times' },
  { n: 5, thing: 'lateness', signal: 'lateness', what: 'the frame\'s time measured by two clocks in one loop (the pacer\'s, the step\'s)' },
  { n: 6, thing: 'lateness', signal: 'lateness', what: 'the strip slice reads the frame\'s length and grows with it' },
  { n: 7, thing: 'lateness', signal: 'world-in-play', what: '"is the world in play" asked four ways' },
  { n: 8, thing: 'mb', signal: 'mb', what: 'three byte caps, no sum; about 30 caps, each its own; nothing reads a total' },
  { n: 9, thing: 'rows', signal: 'regen-save', what: 'the regen\'s 10 s gate written twice' },
  { n: 10, thing: 'rows', signal: 'botstat-rows', what: '`botstat:` written by two paces' },
  { n: 11, thing: 'messages', signal: 'move-send-rate', what: 'the phone\'s move rate: six layers' },
  { n: 12, thing: 'messages', signal: 'moves-out', what: 'moves out to the others: five rules' },
  { n: 13, thing: 'looks', signal: 'move-places', what: 'the places of moves: the frame\'s step and the send layers' },
  { n: 14, thing: 'looks', signal: 'reaction-time', what: 'a reaction\'s time: the send gap and the pong rider' },
  { n: 15, thing: 'looks', signal: 'idleness', what: 'idleness: two timers' },
  { n: 16, thing: 'loading-seconds', signal: 'loading-giveup', what: 'give-up caps, each its own; no budget' },
]);
/* the census's line: only the gatekeeper lowers it */
export const KNOWN_SECOND_LINE = 16;
