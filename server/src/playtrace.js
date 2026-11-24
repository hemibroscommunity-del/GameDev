/* ═══ v2.3.6482: THE OWNER'S PLAY IS THE FIRST HUMAN RECORD (grand plan step 10.8; card WHO PR 3) ═══
 *
 * Today the one real player is not measured at all: the owner plays in test
 * mode (testmode.js), and test mode turns the honesty checks OFF.  So the
 * league (tools/league, step 10.7) scores every detector against the
 * house's own bots and one scripted-but-human-paced trace -- and against no
 * person.  This file records a person: the first ten active minutes of a
 * test-mode sitting (the owner's characters: the owner's yes, call 13 of
 * the plan), one row, labelled `human`, in the league's own trace form, so
 * rung 4 (tools/league/replay.mjs) replays it as it replays its own.
 *
 * Designed once in docs/SHAPES.md part 7 (the trace's row, `play_trace:`).
 * This file is the row's ONE writer.
 *
 * WHAT IS RECORDED, memory only while it records (`ps._trace`, never saved
 * with the character: persistence writes a fixed field list):
 *   - what the page sent, of the kinds a detector reads (TRACE.TYPES: the
 *     league's own list, tools/league/bots/page-script.mjs KEEP, and the
 *     bow's place), each `{t, m}`: ms since the recording began, the message
 *     as the wire door let it through.  A move is kept as what changed from
 *     the one before (`mv`), the league's packTrace form, exact; a standing
 *     page's repeats are thinned to one a second (the league's thinRepeats);
 *   - a strike's `after`: the person's own wait past the plan (gathering.js
 *     HONEST_CYCLE; the league's toTrace reads a recording the same way), so
 *     a replay waits for its own room's plan as the person did;
 *   - WOULD REFUSE: test mode runs the honesty checks in shadow.  A check
 *     that would have refused (TRACE.WOULD) says so here (`traceWould`) and
 *     play goes on as test mode lets it.  Counted by reason on the row (`wr`),
 *     with the moment of the first TRACE.WOULD_AT of them (`wt`).
 *
 * WHEN THE ROW IS WRITTEN: ONE put a sitting (the orchestrator's word,
 * 2026-11-24; playtrace.test holds it) -- when the recording's active
 * seconds (`act`: the sitting's card's rule, gaps of at most SIT.IDLE_MS
 * between what the page sent, on a clock of its own -- test mode judges no
 * move, so the card counts none) pass TRACE.ACTIVE_S (ten minutes), at the
 * message that finds them past; or when the recording is full
 * (TRACE.MAX_BYTES, `cut: 'size'`); or at the first leave while it records
 * (`cut: 'leave'`, when at least TRACE.MIN_ACTIVE_S of it was played).
 * Whichever comes first ends the recording: a phone that comes back inside
 * the same sitting is not recorded again, so a reconnect cuts a recording
 * short (a sample, honestly labelled by its `cut`).  No timer, no read, no
 * delete, test-mode sittings only.  A character keeps
 * TRACE.KEEP rows: the key's slot is the sitting's id (in seconds) modulo
 * KEEP, so a newer sitting may take an older's slot.  Nothing that counts
 * value is in it.
 *
 * ONLY A SITTING'S BEGINNING STARTS ONE (a card the join just opened):
 * a sitting carried on across a deploy, a crash or a dropped body is not
 * recorded again from its middle (so its first row is never written over
 * with a later part).  What a deploy cuts in memory is lost: a trace is a
 * sample, not a sum, and no sum reads it.
 *
 * WHAT IT NEEDS: the sitting's card (`sitting: false` records nothing: its
 * id names the row and says a sitting began) and a test-mode character.  A character not in
 * test mode is never recorded: a trace is a person's only with the owner's
 * yes, and only the owner's characters have test mode.
 *
 * THE KILL SWITCH `playtrace: false` in the live flags: nothing is recorded,
 * no row written, no would-refuse counted, the cap `playtrace` not
 * advertised.  Rows written stay.
 *
 * Nothing a player sees changes.  Suite: server/test/playtrace.test.mjs.
 * The spec is this header and SHAPES part 7. */
import { HONEST_CYCLE, HARVEST_PROOF } from './gathering.js';   /* read at call time only (the two import each other) */
import { MOVE_BUDGET } from './movement.js';   /* read at call time only (the two import each other) */
import { SIT } from './sitting.js';

export const TRACE = Object.freeze({
  PREFIX: 'play_trace:',
  V: 1,                   /* the row's shape */
  FORM: 2,                /* the league's trace form: moves as what changed (replay.mjs packTrace) */
  LABELS: Object.freeze(['human']),
  ACTIVE_S: 600,          /* the first ten active minutes */
  MIN_ACTIVE_S: 60,       /* a shorter recording at the leave is not kept */
  KEEP: 8,                /* rows a character keeps */
  MAX_BYTES: 96000,       /* a row under Durable Object storage's 128 KiB a value */
  THIN_MS: 1000,          /* a standing page's repeats: one a second */
  WOULD_AT: 64,           /* would-refuse moments kept; every one is counted */
  TYPES: Object.freeze(['move', 'extraction_start', 'node_strike', 'cook_request', 'firemaking_request',
    'monster_damage', 'monster_dmg_at', 'ability_use', 'player_projectile']),
  /* the checks test mode runs in shadow: each a name its site hands traceWould */
  WOULD: Object.freeze(['move_budget', 'strike_early', 'strike_unstarted',
    'cook_rate', 'cook_floor', 'cook_start', 'hit_weapon', 'hit_far', 'hit_rate', 'hit_swing', 'hit_shot']),
});
const TYPES = new Set(TRACE.TYPES);

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const fin = (v) => typeof v === 'number' && Number.isFinite(v);

/** `playtrace: false` in the live flags. */
export function traceOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && own(f, 'playtrace') && f.playtrace === false);
}
function sitOn(room) {
  const f = room && room._liveFlags;
  return !(f && typeof f === 'object' && own(f, 'sitting') && f.sitting === false);
}
function isTest(room, ps) {
  return !!(room && typeof room._testMode === 'function' && room._testMode(ps));
}
/* the open sitting's card, or null */
function cardOf(ps) {
  const e = ps && ps._econ;
  return e && typeof e === 'object' && Array.isArray(e.s) && e.s.length >= SIT.LEN ? e.s : null;
}

/** The row's key: a character's slot for a sitting. */
export function traceKey(pid, sid) {
  return TRACE.PREFIX + pid + ':' + (Math.floor(Math.abs(Number(sid) || 0) / 1000) % TRACE.KEEP);
}

/** At the join, once the sitting's card is open (join.js): a test-mode
 *  character's sitting under its first ten active minutes starts (or, a
 *  reconnect with the body kept, goes on with) its recording. */
export function traceBegin(room, ps, pid, sid, now) {
  if (!ps || typeof ps !== 'object' || traceOff(room) || !sitOn(room)) return false;
  if (!fin(sid) || !sid || !isTest(room, ps)) { if (ps._trace) delete ps._trace; return false; }
  const s = cardOf(ps);
  if (!s || s[SIT.COL.t] !== sid) return false;
  if (ps._trace && ps._trace.sid === sid) return true;   /* the same sitting goes on */
  /* only a sitting the join just OPENED starts one (its card never touched
     since: sitting.js sitBlank), never one carried on -- a later part is
     never recorded over the first */
  if (ps._traceDone === sid || s[SIT.COL.u] !== s[SIT.COL.t]) return false;
  const t0 = Math.floor(fin(now) ? now : Date.now());
  ps._trace = {
    sid, t0, act: 0, at: t0, pid: String(pid),
    start: null,   /* where the replay joins: the first move's place (the room's at the end when none) */
    ev: [], bytes: 0, prev: null, prevKey: null, prevT: -1e9, startT: null,
    kinds: Object.create(null), wr: Object.create(null), wt: [],
  };
  return true;
}

/** A message the page sent (index.js _onMessage, after the wire door): kept
 *  when it is a kind a detector reads.  Memory only, but for the one put
 *  that ends a recording (the header). */
export function traceNote(room, session, msg, now) {
  const ps = session && room && room.playerState ? room.playerState[session.id] : null;
  if (!ps || !ps._trace) return;   /* every message of every player passes here: nothing made, at once */
  try { note(room, session, ps, msg, now); } catch (e) { /* a recording never stops a message */ }
}
function note(room, session, ps, msg, now) {
  const R = ps._trace;
  if (!msg || typeof msg !== 'object' || traceOff(room)) return;
  const tNow = Math.floor(fin(now) ? now : Date.now());
  if (R.act >= TRACE.ACTIVE_S * 1000) { traceEnd(room, ps, 'ten', tNow); return; }
  if (!TYPES.has(msg.type)) return;
  /* active time, the sitting's card's rule (sitting.js): the gaps between
     what the page sent no longer than SIT.IDLE_MS, summed.  Its own clock:
     test mode judges no move, so the card counts none of its moves */
  const gap = tNow - R.at;
  if (gap > 0 && gap <= SIT.IDLE_MS) R.act += gap;
  if (gap > 0) R.at = tNow;
  const t = Math.max(0, tNow - R.t0);
  let m;
  try { m = JSON.parse(JSON.stringify(msg)); } catch (e) { return; }
  if (m.type === 'move') {
    const key = JSON.stringify(m);
    if (key === R.prevKey && t - R.prevT < TRACE.THIN_MS) return;
    R.prevKey = key; R.prevT = t;
  } else R.prevKey = null;
  let e;
  if (m.type === 'move') {
    const mv = {};
    for (const k of Object.keys(m)) if (!R.prev || JSON.stringify(R.prev[k]) !== JSON.stringify(m[k])) mv[k] = m[k];
    for (const k of Object.keys(R.prev || {})) if (!own(m, k)) mv[k] = { $gone: 1 };
    R.prev = m;
    e = { t, mv };
    if (!R.start && fin(m.x) && fin(m.y)) R.start = placeAt(Math.round(m.x), Math.round(m.y), typeof m.z === 'string' ? m.z : placeOf(ps).z);
  } else {
    e = { t, m };
    if (m.type === 'extraction_start') R.startT = t;
    if (m.type === 'node_strike') {
      const ex = room.extractions && room.extractions[session.id];
      if (R.startT != null && ex && Array.isArray(ex.hits) && fin(ex.startedAt) && fin(ex.openDelayBase)) {
        e.after = Math.max(0, Math.round(tNow - (ex.startedAt + ex.openDelayBase + HONEST_CYCLE.LEAD_MS + HONEST_CYCLE.SETTLE_MS)));
      }
      R.startT = null;
    }
    R.kinds[m.type] = (R.kinds[m.type] || 0) + 1;
  }
  const size = JSON.stringify(e).length + 1;
  if (R.bytes + size > TRACE.MAX_BYTES) { traceEnd(room, ps, 'size', tNow); return; }
  R.bytes += size;
  R.ev.push(e);
}

/** A check test mode ran in shadow would have refused (its site, one
 *  call): counted on the recording, play goes on as test mode lets it. */
export function traceWould(room, ps, why, now) {
  const R = ps && ps._trace;
  if (!R || traceOff(room) || !TRACE.WOULD.includes(why)) return;
  R.wr[why] = (R.wr[why] || 0) + 1;
  if (R.wt.length < TRACE.WOULD_AT) R.wt.push([Math.max(0, Math.floor((fin(now) ? now : Date.now()) - R.t0)), TRACE.WOULD.indexOf(why)]);
}

/* v2.3.6484: a place as the league's trace form holds it, written once
   (a place READ into a recording, never a write of a player's zone:
   phase-table 2d's one row for this file) */
function placeAt(x, y, z) {
  return { x, y, z };
}
function placeOf(ps) {
  return placeAt(fin(ps && ps.x) ? Math.round(ps.x) : 0, fin(ps && ps.y) ? Math.round(ps.y) : 0, ps && typeof ps.z === 'string' ? ps.z : '');
}

/** THE MOVE'S SHADOW (movement.js, one call, a test-mode character's move
 *  while it records).  Test mode does not judge a move at all, and the
 *  judging spends play's own state (the budget, a gust, a sprint's bill), so
 *  the shadow asks the room's OWN budget function (`_moveBudgetNow`, pure on
 *  what it is handed) about a budget of the recording's own (`R.mb`, `R.mbAt`),
 *  at the sprint's rate when the move is one (`k`, the site's `_sprintK`: the
 *  most it could be judged at), and reads a gust without spending it.
 *  Nothing of play is read back or changed.  `judged` false (a zone change, a
 *  first move) starts the shadow budget again, as the room's own does.  With
 *  `movebudget: false` (the old per-message bound) nothing is shadowed. */
export function traceMoveShadow(room, ps, msg, now, judged, k) {
  const R = ps && ps._trace;
  if (!R || traceOff(room)) return;
  try {
    if (!judged || !msg || !fin(ps.x) || !fin(ps.y) || !fin(msg.x) || !fin(msg.y)) { R.mb = undefined; R.mbAt = undefined; return; }
    if (typeof room._moveBudgetOn !== 'function' || !room._moveBudgetOn()) return;
    const sp = room._moveSpeedK(ps);
    const rate = MOVE_BUDGET.SPEED_PX * sp.spdCap * sp.moveMult * (fin(k) && k > 0 ? k : 1);
    const t = fin(now) ? now : Date.now();
    const budget = room._moveBudgetNow({ _mvBudget: R.mb, _mvBudgetAt: R.mbAt }, rate, t);
    const gust = ps._gustLeft > 0 && t < (ps._gustUntil || 0) ? ps._gustLeft : 0;
    const dist = Math.hypot(msg.x - ps.x, msg.y - ps.y);
    if (dist > budget + gust) { traceWould(room, ps, 'move_budget', t); R.mb = 0; }
    else R.mb = Math.max(0, budget - dist);
    R.mbAt = t;
  } catch (e) { /* a shadow never changes a move */ }
}

/** A test-mode strike with no start of its own (gathering.js, one call):
 *  the room lets one through a HARVEST_PROOF.RECOVER_MS (a page reloaded in
 *  a harvest) and refuses the rest.  Test mode stamps no recovery, so the
 *  shadow keeps a clock of the recording's own (`R.rc`): play's is never
 *  read or stamped. */
export function traceStartless(room, ps, now) {
  const R = ps && ps._trace;
  if (!R || traceOff(room)) return;
  const t = fin(now) ? now : Date.now();
  if (R.rc && t - R.rc < HARVEST_PROOF.RECOVER_MS) traceWould(room, ps, 'strike_unstarted', t);
  else R.rc = t;
}

/** A test-mode cook's rate (cooking.js _cookRateOk, one call): the room's
 *  `per` a minute, on a history of the recording's own (`R.ch`). */
export function traceCookRate(room, ps, per) {
  const R = ps && ps._trace;
  if (!R || traceOff(room) || !fin(per)) return;
  const t = Date.now();
  R.ch = (R.ch || []).filter((x) => t - x < 60000);
  if (R.ch.length >= per) traceWould(room, ps, 'cook_rate', t);
  else R.ch.push(t);
}

/** A test-mode hit on a monster (combat.js, one call, while it records):
 *  the hit proof's chain in its own order -- the weapon, the reach (the
 *  sword's, a bow's or staff's own, the Wheel's widest), the bow's or staff's
 *  rate, the bow's arrow seen, the sword's swing -- stopping at the first
 *  that would refuse, as the real chain does.  The weapon and the reaches are
 *  pure reads.  The rate, the arrow and the swing are the room's own TAKES on
 *  lanes nothing but those checks reads, and test mode reads none of them
 *  for its character: so the take is the check itself, run, its verdict
 *  recorded and its refusal skipped (and should test mode be turned off, the
 *  lanes are as the checks would have left them).  A special is left as test
 *  mode leaves it (its window is never asked).  `o`: { slot, zone, now,
 *  special, cost, sw, id, wheelMax, free }. */
export function traceHitShadow(room, ps, m, o) {
  const R = ps && ps._trace;
  if (!R || traceOff(room) || !o) return;
  try {
    const t = fin(o.now) ? o.now : Date.now();
    const would = (why) => { traceWould(room, ps, why, t); return true; };
    const hp = typeof room._hitProofOn === 'function' && room._hitProofOn();
    if (hp && !room._hitWeaponOk(ps, o.slot)) return would('hit_weapon');
    if (m && fin(ps.x) && fin(ps.y) && fin(m.x) && fin(m.y)) {
      const d2 = (ps.x - m.x) * (ps.x - m.x) + (ps.y - m.y) * (ps.y - m.y);
      if (o.slot === 'melee') { const r = room._swordReach(); if (d2 > r * r) return would('hit_far'); }
      else if (hp) { const r = room._hitReach(ps, o.slot, t); if (r !== null && d2 > r * r) return would('hit_far'); }
      else if (o.zone === 'wheel' && fin(o.wheelMax) && d2 > o.wheelMax * o.wheelMax) return would('hit_far');
    }
    if (o.special) return false;
    if (hp && !room._hitRateTake(ps, o.slot, t, o.cost)) return would('hit_rate');
    if (o.slot === 'ranged' && room._bowShotDrop(ps, o.sw, o.id, t)) return would('hit_shot');
    if (o.slot === 'melee' && room._swordSwingOn() && !o.free && !room._swordSwingTake(ps, o.id, t)) return would('hit_swing');
  } catch (e) { /* a shadow never changes a hit */ }
  return false;
}

/* what the recording mostly was: the league's setups by name */
function kindOf(k) {
  const n = (t) => k[t] || 0;
  const by = [['harvest', n('extraction_start') + n('node_strike')], ['cook', n('cook_request') + n('firemaking_request')],
    ['fight', n('monster_damage') + n('monster_dmg_at') + n('player_projectile') + n('ability_use')]];
  by.sort((p, q) => q[1] - p[1]);
  return by[0][1] > 0 ? by[0][0] : 'walk';
}

/** The row a recording makes (pure: the suite reads it). */
export function traceRowOf(R, why, at, ps) {
  const recorded = new Date(at).toISOString().slice(0, 10);
  return {
    v: TRACE.V, label: 'human', pid: R.pid, sid: R.sid, at, act: Math.round(R.act / 1000), cut: why,
    wr: Object.assign({}, R.wr), wt: R.wt.slice(),
    trace: {
      v: TRACE.FORM, name: 'play_trace ' + R.pid + ' ' + R.sid, what: 'human', kind: kindOf(R.kinds),
      recorded, by: 'server/src/playtrace.js', start: Object.assign({}, R.start || placeOf(ps)), events: R.ev.slice(),
    },
  };
}

/** The recording ends: its one row is put (not awaited: nothing waits on a
 *  sample), and the sitting is marked done in memory.  `why` 'ten', 'size'
 *  or 'leave' (leave.js: the row so far, and the recording ends -- a phone
 *  back inside the sitting is not recorded again). */
export function traceEnd(room, ps, why, now) {
  const R = ps && ps._trace;
  if (!R) return null;
  delete ps._trace;
  ps._traceDone = R.sid;
  const t = Math.floor(fin(now) ? now : Date.now());
  if (traceOff(room)) return null;
  if (why === 'leave' && R.act < TRACE.MIN_ACTIVE_S * 1000) return null;
  if (!R.ev.length) return null;
  const row = traceRowOf(R, why, t, ps);
  try {
    const p = room.state.storage.put(traceKey(R.pid, R.sid), row);
    if (p && typeof p.catch === 'function') p.catch(() => {});
    return row;
  } catch (e) { return null; }   /* a recording must never stop what it records */
}

/** A stored row made safe and read as the league's trace (unpacked by its
 *  own unpackTrace), or null. */
export function traceRead(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== TRACE.V || !TRACE.LABELS.includes(raw.label)) return null;
  const tr = raw.trace;
  if (!tr || typeof tr !== 'object' || tr.v !== TRACE.FORM || !Array.isArray(tr.events) || !tr.start) return null;
  return tr;
}
