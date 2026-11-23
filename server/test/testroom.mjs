/* ═══ v2.3.5086: THE SHARED TEST ROOM (grand plan step 4.5's harness, card E PR 7) ═══
 *
 * Every suite that plays the room has carried its own storage mock, its own
 * join and its own clock (ARCHITECTURE-HANDOFF rule 24), and they drifted: a
 * `list` that ignored `limit`, a `get` that could not take a list, a clock
 * that was the machine's.  This is one room for tests, shared:
 *
 *   makeStorage(seed)  a Durable Object's storage as the money suites need
 *                      it: a copy of what is put; `list` in key order with
 *                      prefix / start / startAfter / end / limit / reverse;
 *                      and BATCHES: every write of one synchronous run
 *                      commits as one batch (the runtime's output gate), so a
 *                      restart lands BETWEEN batches -- `crashAt(n)` kills
 *                      the room before batch n, and that one and every later
 *                      one are lost (chaos-restart's model, moved here);
 *   openRoom(storage)  a GameRoom on it, its live flags loaded;
 *   roomQueue(room)    the input gate: messages delivered one at a time, each
 *                      to its handler's end and its writes' commit before the
 *                      next (a bundle's parts each finish before the next:
 *                      CLAUDE.md §5);
 *   seededClock(...)   Date.now and Math.random from a seed, moved only by
 *                      the test (`advance`): a run is the same every time;
 *   join(...)          a player in, the world's way (`ws: [1, 5]`);
 *   DISTURBANCES       THE ONE CLOSED LIST of what changes how an honest
 *                      player looks without any cheating (docs/SHAPES.md
 *                      part 7: the storm of 4.5, each signal's honest
 *                      troubles 10.6, the league's replays 10.7, the slow
 *                      profiles 1.5 -- four steps, one list);
 *   schedule(...)      a script of messages as one disturbance delivers it.
 *
 * Suites move onto it one at a time (card E PR 7 moves chaos-restart, the
 * restart test step 4.5 finishes).  Its own suite: testroom.test.mjs.
 * Not a `*.test.mjs` file: `npm test` never runs it by itself.
 *
 * v2.3.6440 (card DG PR 1): AND THE ROOM REFUSES.  Importing this file arms
 * THE RUNNING ROOM'S GUARD (its section below): in every GameRoom of the
 * suite, a live player's record refuses a set or a delete of a guarded field
 * unless that field's door is running.  So every suite on this room catches
 * a second writer however it is spelled. */
import { GameRoom } from '../src/index.js';
import { BAG_WHOLE } from '../src/bag.js';
import { POINTS_WHOLE } from '../src/skillpoints.js';

export const mockEnv = Object.freeze({ LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
export function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, why) { this.closed = { code, why }; } };
}
export const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
/** Long enough for every write issued so far to commit and every timer of 0 to run. */
export const settle = () => new Promise((r) => setTimeout(r, 5));

/* ══════════ STORAGE: a copy of what is put, committed a batch at a time ══════════ */
const clone = (v) => (v === undefined ? v : structuredClone(v));
export function makeStorage(seed) {
  const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
  let pending = null, batches = 0, crashAt = Infinity, dead = false;
  const commit = () => {
    const w = pending; pending = null;
    const n = batches++;
    if (dead || n >= crashAt) { dead = true; return; }
    for (const [op, k, v] of w) { if (op === 'put') store.set(k, v); else store.delete(k); }
  };
  const write = (op, k, v) => {
    if (!pending) { pending = []; queueMicrotask(commit); }
    pending.push([op, k, clone(v)]);
  };
  /* a read sees this run's own writes (the runtime's cache), never another's lost one */
  const view = (k) => {
    if (pending) for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] === k) return pending[i][0] === 'put' ? clone(pending[i][2]) : undefined;
    return clone(store.get(k));
  };
  return {
    _store: store,
    /** batches issued so far (each one synchronous run's writes) */
    batches: () => batches,
    /** the room dies before batch `n`: that one and every later one are lost */
    crashAt(n) { crashAt = n; },
    /** dead: a batch was lost, so nothing after it commits either */
    dead: () => dead,
    storage: {
      async get(k) {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) { const v = view(x); if (v !== undefined) r.set(x, v); } return r; }
        return view(k);
      },
      async put(k, v) {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
        write('put', k, v);
      },
      async delete(k) {
        const keys = Array.isArray(k) ? k : [k];
        let n = 0;
        for (const x of keys) { if (store.has(x)) n++; write('del', x); }
        return Array.isArray(k) ? n : n > 0;
      },
      async list(o) {
        let keys = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort();
        if (o?.start !== undefined) keys = keys.filter((k) => k >= o.start);
        if (o?.startAfter !== undefined) keys = keys.filter((k) => k > o.startAfter);
        if (o?.end !== undefined) keys = keys.filter((k) => k < o.end);
        if (o?.reverse) keys.reverse();
        if (o?.limit) keys = keys.slice(0, o.limit);
        const out = new Map();
        for (const k of keys) out.set(k, clone(store.get(k)));
        return out;
      },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}

/** A GameRoom on `storage` (a makeStorage), its live flags loaded as a
 *  request would load them (GameRoom.fetch warms them first). */
export async function openRoom(storage, flags) {
  const room = new GameRoom(storage, mockEnv);
  await room._liveFlagsEnsure();
  if (flags) { Object.assign(room._liveFlags, flags); room._syncBagCaps(); }
  return room;
}

/* ══════════ THE INPUT GATE ══════════ */
/** Messages to `room` one at a time, in the order sent: each runs to its
 *  handler's end, and its writes commit, before the next begins -- what the
 *  runtime's input gate and the router's awaits give the room. */
export function roomQueue(room) {
  let tail = Promise.resolve();
  let delivered = 0;
  const q = {
    get delivered() { return delivered; },
    send(ws, type, payload) {
      const msg = typeof type === 'string' ? { type, payload: payload || {} } : type;
      const run = tail.then(async () => {
        await room.webSocketMessage(ws, JSON.stringify(msg));
        await settle();
        delivered++;
      });
      tail = run.catch(() => {});
      return run;
    },
    /** every message sent so far, delivered */
    drain: () => tail,
  };
  return q;
}

/* ══════════ THE CLOCK ══════════ */
/** Date.now and Math.random from `seed`, moved only by `advance`.  `install`
 *  puts them in place, `restore` gives the machine's back. */
export function seededClock({ start = Date.UTC(2026, 10, 14, 12, 0, 0), seed = 1 } = {}) {
  let now = start, s = seed >>> 0 || 1;
  const real = { now: Date.now, random: Math.random };
  const c = {
    now: () => now,
    advance(ms) { now += Math.max(0, Number(ms) || 0); return now; },
    random() { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; },
    install() { Date.now = c.now; Math.random = c.random; return c; },
    restore() { Date.now = real.now; Math.random = real.random; },
  };
  return c;
}

/** A player in, the world's way (CLAUDE.md §5: a test joining the world sends
 *  `ws: [1, 5]`).  `opts.data` is the join's data, `opts.loginTaken` takes
 *  today's login reward first so the join moves no gold. */
export async function join(room, ws, pid, opts = {}) {
  room.sessions.set(ws, baseSession());
  if (opts.loginTaken) await room.state.storage.put('cadence:login:' + pid, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: opts.name || pid.slice(3, 12), phrase: 'p-' + pid,
    protocolVersion: opts.protocolVersion || 2, ws: [1, 5], data: opts.data || { x: 100, y: 100, z: 'town' } }));
  await settle();
  return ws;
}

/* ══════════ THE TOUR: PATHS THE DOOR SUITES PLAY UNDER THE GUARD ══════════
 * v2.3.6440 (card DG PR 1): the door suites each play this short tour on a
 * guarded room, so a second writer planted on any of its paths, however it
 * is spelled, fails the door's own suite (the running room refuses, below).
 * The paths are the ones the shape review planted on
 * (docs/plan/census/shape-doors.md): a quest handed in (quests.js, its
 * gold, its XP into a combat skill, its next quest).  A path added here is
 * one every door suite then plays.  Returns what each step did, for the
 * suite to hold. */
export async function playTour(opts = {}) {
  const storage = makeStorage();
  const room = await openRoom(storage, opts.flags);
  const ws = fakeWs('tour');
  const pid = 'bp_tour_' + (opts.tag || 'door');
  await join(room, ws, pid, { loginTaken: true });
  const ps = room.playerState[pid];
  const q = roomQueue(room);
  const out = { room, ws, pid, ps, steps: [] };
  /* 1. a quest handed in: mayor_1 (no objective: 50 gold, 10 XP, then mayor_2) */
  if (ps) {
    ps._quests = Object.assign(Object.create(null), { tut_1: 'turnedIn', mayor_1: 'active' });
    const before = { coins: ps.coins, sword: ps.prog3 && ps.prog3.sk && ps.prog3.sk.sword ? ps.prog3.sk.sword.xp : null };
    await q.send(ws, 'quest_turn_in', { questId: 'mayor_1', xpCat: 'sword' });
    out.steps.push({ step: 'quest_turn_in', paid: ps._quests.mayor_1 === 'turnedIn' && ps.coins > before.coins, before, coins: ps.coins });
  }
  return out;
}

/* ══════════ THE DISTURBANCES: ONE CLOSED LIST ══════════
 * What changes how an honest player looks without any cheating.  Each says
 * what it does to a script of messages (`schedule` below); `what` is why it
 * is on the list.  A step that needs another names it here first. */
const D = (id, kind, params, what) => Object.freeze({ id, kind, ...params, what });
export const DISTURBANCES = Object.freeze([
  D('deploy', 'deploy', {}, 'a worker deploy restarts the room at a message: what is written stays, memory is wiped, every player joins again (TRAPS §277)'),
  D('hidden', 'hidden', { holdMs: 60000 }, 'a hidden tab (iPhone Safari): the phone sends nothing for a while, then what it held at once'),
  D('fps60', 'fps', { fps: 60 }, 'a phone drawing 60 frames a second sends its moves 60 times a second'),
  D('fps30', 'fps', { fps: 30 }, '30 a second: a Low Power iPhone, a hot one (the ladder\'s steady lower rate)'),
  D('fps20', 'fps', { fps: 20 }, '20 a second: an old phone in a busy fight'),
  D('fps4', 'fps', { fps: 4 }, '4 a second: a phone that can barely draw (this box\'s own browser)'),
  D('delay', 'delay', { ms: 300 }, 'the line\'s delay: every message late by the same, in order'),
  D('loss', 'loss', { rate: 0.05 }, 'the line\'s loss: the socket drops at a message, what was sent until the rejoin is lost, and the player joins again'),
  D('lane_full', 'lane', { drawLane: 'full' }, 'each drawLane (card O): today the one, `full`, which changes nothing the room sees'),
]);
export const disturbance = (id) => DISTURBANCES.find((d) => d.id === id) || null;

/** A script of messages as `d` delivers it: each step `{ at, i, drop,
 *  deploy, rejoin }` -- `at` ms after the start (the clock to advance to),
 *  `i` the script's index.  Seeded, so a run is the same every time.
 *  `opts.at` for `deploy`: the message the restart lands before (default the
 *  middle); `opts.gapMs`: the script's own spacing (default 100). */
export function schedule(script, d, opts = {}) {
  const n = script.length;
  const gap = opts.gapMs || 100;
  const clock = seededClock({ seed: opts.seed || 7 });
  const out = [];
  let t = 0;
  const lossAt = d.kind === 'loss' ? Math.min(n - 1, Math.floor(clock.random() / d.rate) % Math.max(1, n)) : -1;
  const hideFrom = Math.floor(n / 3), hideTo = Math.floor((2 * n) / 3);
  for (let i = 0; i < n; i++) {
    const step = { i, at: 0, drop: false, deploy: false, rejoin: false };
    if (d.kind === 'fps') t += 1000 / d.fps;
    else t += gap;
    step.at = d.kind === 'delay' ? t + d.ms : t;
    if (d.kind === 'deploy' && i === (opts.at === undefined ? Math.floor(n / 2) : opts.at)) step.deploy = true;
    if (d.kind === 'hidden') {
      const back = hideFrom * gap + d.holdMs;                 /* the tab is seen again */
      if (i >= hideFrom && i < hideTo) step.at = back;          /* held, then all at once */
      else if (i >= hideTo) step.at = back + (i - hideTo + 1) * gap;   /* and the rest after them */
    }
    if (d.kind === 'loss' && i === lossAt) step.drop = true;
    if (d.kind === 'loss' && i === lossAt + 1) step.rejoin = true;
    out.push(step);
  }
  /* what is held arrives together: delivery is in time order, the script's order kept for the same time */
  return out.sort((a, b) => a.at - b.at || a.i - b.i);
}

/* ══════════ THE RUNNING ROOM REFUSES (v2.3.6440, card DG PR 1) ══════════
 *
 * WHY.  The "one door" tests read the source as text, and the shape review
 * of 2026-11-23 (docs/plan/census/shape-doors.md) planted 22 second writers
 * spelled the ways a tired programmer writes them -- `Object.assign(ps,
 * {coins})`, `ps.hp ||= ...`, `ps[k] = ...`, `const { inventory } = ps`,
 * `delete ps.dead`, a player held in a variable named `m` -- and all 22
 * walked past the seven doors' tests.  A pattern of text cannot know every
 * spelling; the running room can: whatever the spelling, the write lands on
 * the record, and the record can ask who is writing.
 *
 * WHAT.  Every live player's record in a GameRoom of a suite that imports
 * this file (the room's `playerState`; a record is guarded as it is put in)
 * holds its guarded fields behind a guard:
 *   - a SET of one (an assignment of any kind, `Object.assign`, a computed
 *     key, a destructured alias written through: they all land here) is
 *     refused -- a TypeError thrown, and the suite failed at its end --
 *     unless the field's door is on the call stack (GUARDED below: each
 *     field's door functions, by file and name), or the place is one the
 *     door's own table lists as a whole write (BAG_WHOLE, POINTS_WHOLE: each
 *     row named here, so a new row must be), or the write is a NEW empty
 *     container where there was none (`new_bag`: `ps.inventory = {}` for a
 *     player who has none; the same for life skills and combat skills);
 *   - a DELETE of one is refused the same way inside a container (the bag,
 *     the quest maps, the stashes, the points); a `delete ps.dead` on the
 *     record itself cannot be refused (the record is not a Proxy, so a raw
 *     reference to it stays the same object), so it is CAUGHT instead: after
 *     every message, and at the suite's end, each guarded record is checked
 *     for its guards, and a field deleted or redefined fails the suite.
 * A write from a TEST file (a suite seeding a purse by hand) is not judged:
 * only a write whose nearest frame is in server/src.
 *
 * HOW.  Scalars (coins, hp, the life phase, xp and level, the old grid's
 * points) become accessor properties on the record itself (its identity
 * kept: a join's local `ps` and the room's map hold the same object); a
 * field the record does not have yet is caught by a thin prototype layer
 * under the record.  Containers (the bag, the quest maps and lists, the
 * stashes, `prog3`'s counts and combat skills, the life skills) are Proxies,
 * stored once, so every read returns the same one.  `structuredClone` is
 * wrapped to copy through them (a Proxy cannot be cloned).
 *
 * NO COST ON THE LIVE WORKER: nothing here is in server/src; the guard is
 * this file's, armed when a suite imports it.  `TESTROOM_GUARD=0` (an env
 * var) disarms it for one run; `roomGuard.off(fn)` for one call.
 * Its own checks: testroom.test.mjs; the door suites play paths under it. */
const GUARD_ON = !(typeof process !== 'undefined' && process.env && process.env.TESTROOM_GUARD === '0');

/* ── each guarded field's door: `file.js functionName` on the stack ── */
const fns = (file, ...names) => names.map((n) => file + ' ' + n);
const GOLD_DOOR = fns('gold.js', '_goldGive', '_goldTake', '_goldSet');
const HP_DOOR = fns('life.js', '_hpSet');
const LIFE_DOOR = fns('life.js', '_lifeTo');
const DEAD_DOOR = fns('life.js', '_lifeTo', '_lifeDeadClaim');
const XP_DOOR = fns('xp.js', 'xpGive', 'xpLevelUp', 'xpSet', 'xpMake');
const POINTS_DOOR = fns('skillpoints.js', 'pointsGive', 'pointsTake', 'pointsSet', 'pointsDeal');
const BAG_DOOR = fns('bag.js', 'bagGive', 'bagTake', 'bagSet');
const QUEST_DOOR = fns('queststate.js', 'questStateSet', 'questCountAdd', 'questCountSet', 'questForget', 'questLoad', 'questKeep', 'questKeptTake');
const STASH_DOOR = fns('stash.js', 'stashGive', 'stashTake', 'stashSet');

/* The whole writes each door's own table lists, each named by where it runs.
   A row of BAG_WHOLE or POINTS_WHOLE with no line here stops every suite on
   this room (below): a new whole write is named here as it is added. */
const BAG_WHOLE_AT = Object.freeze({
  new_bag: null,                                   /* the `fresh` rule: a new empty bag where there was none */
  join_load: 'join.js _handleJoin',
  join_first: 'join.js _handleJoin',
  death_wipe: 'index.js _handlePlayerDeath',
  respawn_wipe: 'index.js _tickPlayerRespawn',
});
const POINTS_WHOLE_AT = Object.freeze({
  join_adopt: 'join.js _handleJoin',
  migrate_legacy: null,                            /* a stored record, never a live player's */
});
for (const [table, at, name] of [[BAG_WHOLE, BAG_WHOLE_AT, 'BAG_WHOLE'], [POINTS_WHOLE, POINTS_WHOLE_AT, 'POINTS_WHOLE']]) {
  const missing = Object.keys(table).filter((k) => !Object.prototype.hasOwnProperty.call(at, k));
  if (missing.length) throw new Error('testroom: ' + name + ' row(s) ' + missing.join(', ') + ' have no place named in testroom.mjs (' + name + '_AT): name where each runs');
}
const atsOf = (o) => Object.values(o).filter(Boolean);

/* A guarded field.  doors: may write it (and anything under it); whole: may
   also put the whole container; fresh: a new empty container may be put
   where there is none, from anywhere; each: every key's value under it;
   keys: some keys' (the rest are free); freeIf: a value that is not the
   guarded kind (a note beside the tracks) is free. */
const G = (o) => Object.freeze(o);
const leaf = (doors) => G({ doors });
const TRACK = G({ doors: XP_DOOR, keys: { level: leaf(XP_DOOR), xp: leaf(XP_DOOR) } });
const isTrack = (v) => !!v && typeof v === 'object' && ('level' in v || 'xp' in v);
const TRACK_OR_NOTE = G({ ...TRACK, freeIf: (v) => !isTrack(v) });
const pointsMap = (each) => G({ doors: POINTS_DOOR, each });
export const GUARDED = Object.freeze({
  coins: leaf(GOLD_DOOR),
  hp: leaf(HP_DOOR),
  life: leaf(LIFE_DOOR), dying: leaf(LIFE_DOOR), dead: leaf(DEAD_DOOR),
  xp: leaf(XP_DOOR), level: leaf(XP_DOOR),
  unspentT2: leaf(POINTS_DOOR), buildPointsThisLvl: leaf(POINTS_DOOR),
  inventory: G({ doors: BAG_DOOR, whole: atsOf(BAG_WHOLE_AT), fresh: true, each: leaf(BAG_DOOR) }),
  _quests: G({ doors: QUEST_DOOR, each: leaf(QUEST_DOOR) }),
  _questKills: G({ doors: QUEST_DOOR, each: leaf(QUEST_DOOR) }),
  _questFlags: G({ doors: QUEST_DOOR, each: leaf(QUEST_DOOR) }),
  _questGrantOverflow: G({ doors: QUEST_DOOR, each: leaf(QUEST_DOOR) }),
  _questWeaponUnfit: G({ doors: QUEST_DOOR, each: leaf(QUEST_DOOR) }),
  ...Object.fromEntries(['weaponStash', 'armorStash', 'legsStash', 'shieldStash', 'gearStash', 'amuletStash']
    .map((f) => [f, G({ doors: STASH_DOOR, each: leaf(STASH_DOOR) })])),
  prog3: G({ doors: POINTS_DOOR, whole: atsOf(POINTS_WHOLE_AT), keys: {
    pool: leaf(POINTS_DOOR), shared: leaf(POINTS_DOOR), ppl: leaf(POINTS_DOOR), spl: leaf(POINTS_DOOR),
    poolBy: pointsMap(leaf(POINTS_DOOR)), alloc: pointsMap(leaf(POINTS_DOOR)), atk: pointsMap(pointsMap(leaf(POINTS_DOOR))),
    sk: G({ doors: XP_DOOR, fresh: true, each: TRACK }),
  } }),
  lifeSkills: G({ doors: XP_DOOR, whole: ['join.js _handleJoin'], fresh: true, each: TRACK_OR_NOTE }),
});

/* ── who is writing: the call stack, read as V8's call sites ── */
const HERE = import.meta.url;
function callSites() {
  const lim = Error.stackTraceLimit, prep = Error.prepareStackTrace;
  Error.stackTraceLimit = Infinity;
  Error.prepareStackTrace = (_e, cs) => cs;
  const o = {};
  Error.captureStackTrace(o, callSites);
  const cs = o.stack;
  Error.stackTraceLimit = lim; Error.prepareStackTrace = prep;
  return Array.isArray(cs) ? cs : [];
}
const baseName = (f) => String(f || '').replace(/^.*[\\/]/, '');
const siteKey = (c) => baseName(c.getFileName()) + ' ' + (c.getFunctionName() || c.getMethodName() || '');
const siteAt = (c) => baseName(c.getFileName()) + ':' + c.getLineNumber() + (c.getFunctionName() ? ' ' + c.getFunctionName() : '');

const refusals = [];
let offDepth = 0;
export const roomGuard = Object.freeze({
  armed: () => GUARD_ON,
  /** every refusal so far: { path, op, at, why } */
  refusals: () => refusals.slice(),
  /** `fn` run with the guard off (a suite testing a raw shape on purpose) */
  off(fn) { offDepth++; try { return fn(); } finally { offDepth--; } },
  /** forget the refusals so far (a suite that plants one on purpose) */
  clear() { refusals.length = 0; },
  /** v2.3.6440 (the gatekeeper's purpose review, sitting 56): is the guard
   *  ON this record, in this room?  `armed()` reads only the env var: a
   *  gutted guardRecord, or a room whose `playerState` is an own data
   *  property (a class field would make one) past the map's guard, left every
   *  R check green.  This reads the record itself: `coins` is the guard's own
   *  accessor (or, absent, the guard's layer is under the record), the bag
   *  is the guard's Proxy, and the room's map is the prototype's guarded one.
   *  -> [] when it holds, else what does not. */
  holds(ps, room) {
    const bad = [];
    if (!GUARD_ON) bad.push('the guard is not armed (TESTROOM_GUARD=0)');
    if (!ps || typeof ps !== 'object') { bad.push('no record'); return bad; }
    const d = Object.getOwnPropertyDescriptor(ps, 'coins');
    const own = OWN_GETTERS.get(ps);
    if (d ? !(d.get && own && own.get('coins') === d.get) : !LAYERS.has(Object.getPrototypeOf(ps))) bad.push('coins is not the guard\'s accessor');
    if (ps.inventory && typeof ps.inventory === 'object' && !TARGET_OF.has(ps.inventory)) bad.push('the bag is not the guard\'s Proxy');
    if (room) {
      if (Object.prototype.hasOwnProperty.call(room, 'playerState')) bad.push('the room\'s playerState is its own property, past the guarded map');
      else if (!Object.values(room.playerState || {}).includes(ps)) bad.push('the record is not in the room\'s map');
    }
    return bad;
  },
});
function refuse(path, op, at, why) {
  const r = { path, op, at, why };
  refusals.push(r);
  try { process.stderr.write('FAIL testroom: ' + op + ' of ' + path + ' outside its door, at ' + at + ' (' + why + ')\n'); } catch { /* nothing */ }
  throw new TypeError('testroom: ' + op + ' of ' + path + ' refused: no door running (' + at + ')');
}
const isEmpty = (v) => !!v && typeof v === 'object' && Object.keys(v).length === 0;

/* Judge one write of `path` under `spec`.  `whole` is true when the write
   puts a container (or deletes one); `cur` the value it replaces. */
function judge(spec, path, op, cur, v, whole) {
  if (!GUARD_ON || offDepth) return;
  const cs = callSites();
  const first = cs.find((c) => { const f = c.getFileName(); return f && f !== HERE && !f.startsWith('node:'); });
  if (!first) return;
  const file = String(first.getFileName());
  if (!/[\\/]server[\\/]src[\\/]/.test(file)) return;      /* a test's own hand */
  const ok = new Set(spec.doors);
  if (whole && spec.whole) for (const w of spec.whole) ok.add(w);
  if (cs.some((c) => ok.has(siteKey(c)))) return;
  if (whole && spec.fresh && op === 'set' && (cur === undefined || cur === null || typeof cur !== 'object') && isEmpty(v)) return;
  /* a note beside the tracks (life skills' `pets`, `gemsUnpaid`): put or
     taken freely, so long as no track is made or lost by it */
  if (spec.freeIf && spec.freeIf(cur) && (op === 'delete' || spec.freeIf(v))) return;
  refuse(path, op, siteAt(first), 'its door: ' + [...new Set(spec.doors.map((d) => d.split(' ')[0]))].join(', '));
}

/* ── containers: a Proxy each, made once ── */
const PROXY_OF = new WeakMap();   /* target -> proxy */
const TARGET_OF = new WeakMap();  /* proxy -> target */
let wrappedAny = false;
const childOf = (spec, k) => (spec.keys ? (Object.prototype.hasOwnProperty.call(spec.keys, k) ? spec.keys[k] : null) : spec.each || null);
const isContainer = (spec) => !!(spec && (spec.each || spec.keys));
function wrap(v, spec, path) {
  if (!isContainer(spec) || !v || typeof v !== 'object') return v;
  if (TARGET_OF.has(v)) return v;
  const had = PROXY_OF.get(v);
  if (had) return had;
  /* what it holds already is guarded too */
  for (const k of Object.keys(v)) {
    const c = childOf(spec, k);
    if (isContainer(c)) { const d = Object.getOwnPropertyDescriptor(v, k); if (d && 'value' in d) v[k] = wrap(d.value, c, path + '.' + k); }
  }
  const p = new Proxy(v, {
    set(t, k, nv) {
      const c = typeof k === 'string' ? childOf(spec, k) : null;
      if (c) judge(c, path + '.' + k, 'set', t[k], nv, isContainer(c));
      else if (Array.isArray(t) && typeof k === 'string' && spec.each) judge(spec, path + '.' + k, 'set', t[k], nv, false);
      return Reflect.set(t, k, c ? wrap(nv, c, path + '.' + k) : nv);
    },
    deleteProperty(t, k) {
      const c = typeof k === 'string' ? childOf(spec, k) : null;
      if (c && Object.prototype.hasOwnProperty.call(t, k)) judge(c, path + '.' + k, 'delete', t[k], undefined, isContainer(c));
      return Reflect.deleteProperty(t, k);
    },
    defineProperty(t, k, d) {
      const c = typeof k === 'string' ? childOf(spec, k) : null;
      if (c) judge(c, path + '.' + k, 'define', t[k], d && d.value, isContainer(c));
      return Reflect.defineProperty(t, k, c && d && 'value' in d ? { ...d, value: wrap(d.value, c, path + '.' + k) } : d);
    },
  });
  PROXY_OF.set(v, p); TARGET_OF.set(p, v);
  wrappedAny = true;
  return p;
}

/* ── the record: its guarded fields as accessors; the absent ones on a layer under it ── */
/* weakly held: a record the room forgets is the heap's to free (heap-forget.test measures it) */
const GUARDED_SET = new WeakSet();
const GUARDED_REFS = new Set();   /* WeakRef(record), for the sweep */
const OWN_GETTERS = new WeakMap();   /* record -> Map(field -> getter it must still have) */
const LAYERS = new WeakSet();
function ownAccessor(ps, k, spec, value) {
  let val = wrap(value, spec, 'ps.' + k);
  const get = function () { return val; };
  Object.defineProperty(ps, k, {
    configurable: true, enumerable: true, get,
    set(nv) { judge(spec, 'ps.' + k, 'set', val, nv, isContainer(spec)); val = wrap(nv, spec, 'ps.' + k); },
  });
  OWN_GETTERS.get(ps).set(k, get);
}
function guardRecord(ps) {
  if (!GUARD_ON || !ps || typeof ps !== 'object' || GUARDED_SET.has(ps) || TARGET_OF.has(ps)) return ps;
  GUARDED_SET.add(ps);
  GUARDED_REFS.add(new WeakRef(ps));
  OWN_GETTERS.set(ps, new Map());
  const absent = [];
  for (const [k, spec] of Object.entries(GUARDED)) {
    const d = Object.getOwnPropertyDescriptor(ps, k);
    if (!d) absent.push([k, spec]);
    else if ('value' in d) ownAccessor(ps, k, spec, d.value);
  }
  const under = Object.getPrototypeOf(ps);
  const layer = Object.create(under);
  for (const [k, spec] of absent) {
    Object.defineProperty(layer, k, {
      configurable: true, enumerable: false,
      get() { return undefined; },
      set(nv) {
        judge(spec, 'ps.' + k, 'set', undefined, nv, isContainer(spec));
        if (OWN_GETTERS.has(this)) ownAccessor(this, k, spec, nv);
        else Object.defineProperty(this, k, { value: nv, writable: true, enumerable: true, configurable: true });
      },
    });
  }
  /* a prototype as any other is, with its `constructor` (wire-hostile.test
     counts a record whose prototype was swapped by a `__proto__` key: a
     plain object put under it has none) */
  Object.defineProperty(layer, 'constructor', { value: under ? under.constructor : Object, writable: true, configurable: true, enumerable: false });
  LAYERS.add(layer);
  Object.setPrototypeOf(ps, layer);
  return ps;
}

/* A field deleted from a record (or redefined past its guard): caught here,
   after every message and at the suite's end. */
function sweep(when) {
  if (!GUARD_ON) return;
  for (const ref of GUARDED_REFS) {
    const ps = ref.deref();
    if (!ps) { GUARDED_REFS.delete(ref); continue; }
    const m = OWN_GETTERS.get(ps);
    for (const [k, get] of m) {
      const d = Object.getOwnPropertyDescriptor(ps, k);
      if (d && d.get === get) continue;
      m.delete(k);
      const r = { path: 'ps.' + k, op: d ? 'redefine' : 'delete', at: when, why: 'a guarded field ' + (d ? 'redefined' : 'deleted') + ' outside its door' };
      refusals.push(r);
      try { process.stderr.write('FAIL testroom: ' + r.op + ' of ' + r.path + ' outside its door, ' + when + '\n'); } catch { /* nothing */ }
    }
  }
}

/* structuredClone cannot clone a Proxy: copy through the guard first */
function plain(v, seen) {
  if (v === null || typeof v !== 'object') return v;
  if (seen.has(v)) return seen.get(v);
  const raw = TARGET_OF.get(v) || v;
  if (Array.isArray(raw)) { const out = []; seen.set(v, out); for (let i = 0; i < raw.length; i++) out[i] = plain(raw[i], seen); return out; }
  const proto = Object.getPrototypeOf(raw);
  if (proto === Object.prototype || proto === null || LAYERS.has(proto)) {
    const out = proto === null ? Object.create(null) : {};
    seen.set(v, out);
    for (const k of Object.keys(raw)) out[k] = plain(raw[k], seen);
    return out;
  }
  if (raw instanceof Map) { const out = new Map(); seen.set(v, out); for (const [k, x] of raw) out.set(plain(k, seen), plain(x, seen)); return out; }
  if (raw instanceof Set) { const out = new Set(); seen.set(v, out); for (const x of raw) out.add(plain(x, seen)); return out; }
  return raw;
}

if (GUARD_ON) {
  const realClone = globalThis.structuredClone;
  globalThis.structuredClone = function structuredClone(v, o) {
    return realClone(wrappedAny || GUARDED_REFS.size ? plain(v, new Map()) : v, o);
  };
  /* the room's map of live players: every record put in is guarded */
  const MAPS = new WeakMap();
  const guardMap = (m) => {
    if (!m || typeof m !== 'object') return m;
    for (const k of Object.keys(m)) guardRecord(m[k]);
    return new Proxy(m, {
      set(t, k, v) { guardRecord(v); return Reflect.set(t, k, v); },
      defineProperty(t, k, d) { if (d && 'value' in d) guardRecord(d.value); return Reflect.defineProperty(t, k, d); },
    });
  };
  Object.defineProperty(GameRoom.prototype, 'playerState', {
    configurable: true,
    get() { return MAPS.get(this); },
    set(m) { MAPS.set(this, guardMap(m)); },
  });
  const realMsg = GameRoom.prototype.webSocketMessage;
  GameRoom.prototype.webSocketMessage = async function webSocketMessage(ws, message) {
    try { return await realMsg.call(this, ws, message); }
    finally { let t = '?'; try { t = String(JSON.parse(message).type); } catch { /* not ours */ } sweep('during a `' + t.slice(0, 40) + '` message'); }
  };
  process.on('exit', () => {
    sweep('found at the suite\'s end');
    if (refusals.length) {
      process.stderr.write('FAIL testroom: ' + refusals.length + ' write(s) of a guarded field outside its door (card DG PR 1; testroom.mjs "THE RUNNING ROOM REFUSES")\n');
      process.exitCode = 1;
    }
  });
}
