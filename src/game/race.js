/* ═══ v2.3.3519: LIL BRO'S RACE, ON THIS PHONE ═══
 *
 * The owner, planning the quest line for an exposé: "Maybe a quest racing an
 * npc (like a clone of you) where you have to sprint around a simple course."
 * The racer is Lil Bro, the kid on the square who has said "Betcha can't
 * catch me!" since v2.3.2064; the tour's race_1 is his (gameSystems.js).
 *
 * THE WORKER OWNS THE RACE (server/src/race.js): `race_start` is answered by
 * `race_state` -- the course in the room's own coordinates, Lil Bro's path and
 * speed, and how long until the gun -- every flag you touch by `race_cp`, and
 * the end by `race_end` {won, ms, lilMs} or {err}.  This module only SHOWS it:
 *   - holds you on the line through the countdown (raceHeld, read by
 *     BroTown's walk as the loading veils are) -- the worker calls a lap
 *     begun away from it a false start;
 *   - runs Lil Bro along the worker's path at the worker's speed from the
 *     same moment (raceDriveNpc, from BroTown's NPC loop), so the kid you see
 *     is the time you are judged against;
 *   - the countdown, the clock and the result (ui/RaceHud.jsx, raceBus),
 *     the flags in the world (rendering/raceFlags.js) and the gold road to the
 *     next one (game/questRoute.js raceRoutePoint).
 * Nothing here decides a win: a flag is ticked when the worker says so.
 * In memory only (`S._race`, `S._raceLil`), like the worker's: a race lost to
 * a reconnect is run again.
 *
 * No imports but the sound cue, so the race's rules can be read by a node
 * test without the game.
 */
import { cue } from '@/game/eventSounds.js';

const LIL = 'Lil Bro';
/* how long the phone waits for the worker to answer race_start before it
   lets you walk again (an answer is one round trip) */
const ASK_MS = 4000;
/* the worker's grace after his time (race.js GRACE_MS) and a little more:
   a race the phone never heard the end of is forgotten then */
const FORGET_AFTER_MS = 30000 + 6000;
/* how long the result card stays up by itself */
export const RACE_RESULT_MS = 6000;

/* ── who is listening (ui/RaceHud.jsx) ── */
const _subs = new Set();
export const raceBus = {
  sub(fn) { _subs.add(fn); return () => _subs.delete(fn); },
  emit() { for (const fn of Array.from(_subs)) { try { fn(); } catch (e) { /* a listener's fault is its own */ } } },
};

/** Does the worker run the race?  (caps.race; `race: false` in its live
 *  flags un-advertises it, and then it starts none) */
export function raceOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.race);
}

/** Is a race on: asked for, counting down, or running? */
export function raceLive(S) {
  const r = S && S._race;
  return !!(r && (r.phase === 'asked' || r.phase === 'count' || r.phase === 'run'));
}

/** Hold the player still: from the ask to the gun.  BroTown's walk reads it
 *  (finalSpd 0), as it reads the loading veils. */
export function raceHeld(S, now) {
  const r = S && S._race;
  if (!r) return false;
  const t = typeof now === 'number' ? now : Date.now();
  if (r.phase === 'asked') return t - r.at < ASK_MS;
  return r.phase === 'count' && t < r.t0;
}

/** On your marks: ask the worker for a race.  False when one is already on,
 *  or there is no socket to ask on. */
export function requestRace(S) {
  if (!S || !S.channel || raceLive(S)) return false;
  S._race = { phase: 'asked', at: Date.now() };
  try { S.channel.send({ type: 'race_start', payload: {} }); } catch (e) { S._race = null; return false; }
  raceBus.emit();
  return true;
}

function pathLen(path) {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return d;
}

/** Where along `path` the kid is after `d` px. */
export function pointAlong(path, d) {
  if (!Array.isArray(path) || !path.length) return null;
  let left = Math.max(0, d);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= seg && seg > 0) { const k = left / seg; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
    left -= seg;
  }
  return path[path.length - 1].slice();
}

const okPts = (a) => Array.isArray(a) && a.length >= 2 && a.every((p) => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]));

function lilSays(S, text) {
  const n = Array.isArray(S && S.npcs) ? S.npcs.find((o) => o && o.name === LIL) : null;
  if (n) n.chatBubble = { text, ts: Date.now(), isQuest: true };
}

/** race_state: the worker said go -- in `in` ms.  The course and Lil Bro's
 *  line come in the room's own coordinates. */
export function onRaceState(S, p) {
  if (!S || !p || !okPts(p.flags) || !okPts(p.path)) return;
  const now = Date.now();
  const t0 = now + Math.max(0, Math.min(10000, Number(p.in) || 0));
  const speed = Math.max(1, Number(p.speed) || 165);
  const lilMs = Math.max(1, Number(p.lilMs) || 1);
  S._race = { phase: 'count', t0, lilMs, speed, flagR: Number(p.flagR) || 80,
    flags: p.flags, path: p.path, next: 0, said: 0, count: -1 };
  S._raceLil = { path: p.path, t0, speed, len: pathLen(p.path), lilMs };
  lilSays(S, 'On your marks!');
  raceBus.emit();
}

/** race_cp: a flag touched (not the last -- the finish is race_end). */
export function onRaceCheckpoint(S, p) {
  const r = S && S._race;
  if (!r || r.phase !== 'run' && r.phase !== 'count') return;
  const i = Math.floor(Number(p && p.i));
  if (!(i >= 0) || i + 1 <= r.next) return;
  r.next = i + 1;
  r.flagAt = Date.now();
  try { cue('pickGem'); } catch (e) { /* a sound */ }
  raceBus.emit();
}

/** race_end: won or lost (`ms` your time, `lilMs` his), or refused (`err`). */
export function onRaceEnd(S, p) {
  if (!S) return;
  const res = p || {};
  const was = S._race;
  S._race = { phase: 'done', result: res, at: Date.now(),
    flags: was && was.flags, next: was && was.flags ? was.flags.length : 0 };
  /* refused before it began: nobody runs */
  if (res.err && (!was || was.phase === 'asked')) S._raceLil = null;
  /* a race that ends early (a false start, leaving the Wheel) stops the kid
     where he is: he walks home by himself (his wander, pathRadius 0) */
  if (res.err === 'early' || res.err === 'left') S._raceLil = null;
  try {
    if (res.won) { cue('duelWin'); lilSays(S, 'No fair! NO FAIR!'); }
    else if (res.err === 'early') { cue('denied'); lilSays(S, 'False start! Cheater!'); }
    else if (!res.err || res.err === 'late') { cue('duelLose'); lilSays(S, 'Too slow, slowpoke!'); }
    else cue('denied');
  } catch (e) { /* a sound */ }
  raceBus.emit();
}

/** Close the result card (its OK, or the time running out). */
export function dismissRace(S) {
  if (S && S._race && S._race.phase === 'done') { S._race = null; raceBus.emit(); }
}

/** Once a frame (BroTown's loop): the countdown's beats and the gun, and a
 *  race the phone never heard the end of forgotten. */
export function raceTick(S, now) {
  const r = S && S._race;
  if (!r) return;
  const t = typeof now === 'number' ? now : Date.now();
  if (r.phase === 'asked') {
    if (t - r.at > ASK_MS) { S._race = null; raceBus.emit(); }
    return;
  }
  if (r.phase === 'count') {
    const left = Math.ceil((r.t0 - t) / 1000);
    if (left !== r.count) {
      r.count = left;
      try { cue(left > 0 ? 'revealTick' : 'duelStart'); } catch (e) { /* a sound */ }
      raceBus.emit();
    }
    if (t >= r.t0) {
      r.phase = 'run';
      lilSays(S, 'See ya, slowpoke!');
      raceBus.emit();
    }
    return;
  }
  if (r.phase === 'run') {
    if (t - r.t0 > r.lilMs + FORGET_AFTER_MS) { S._race = null; raceBus.emit(); }
    return;
  }
  if (r.phase === 'done' && t - r.at > RACE_RESULT_MS) dismissRace(S);
}

/** BroTown's NPC loop asks this for every NPC: true while it moves Lil Bro
 *  along the worker's path itself (the loop then leaves him be).  He stands
 *  on the line through the countdown, runs from the gun at the worker's
 *  speed, and is let go a moment after his own finish -- at his spot, where
 *  the path ends. */
export function raceDriveNpc(S, npc, now) {
  const L = S && S._raceLil;
  if (!L || !npc || npc.name !== LIL) return false;
  const t = typeof now === 'number' ? now : Date.now();
  const d = t > L.t0 ? (t - L.t0) * L.speed / 1000 : 0;
  const p = pointAlong(L.path, d);
  if (!p) { S._raceLil = null; return false; }
  npc.x = p[0]; npc.y = p[1];
  npc.renderX = p[0]; npc.renderY = p[1];
  npc.targetX = p[0]; npc.targetY = p[1];
  if (d >= L.len && t - L.t0 > L.lilMs + 1500) {
    S._raceLil = null;
    /* home is where the path ended: his wander (pathRadius 0) holds him there */
    npc.spawnX = p[0]; npc.spawnY = p[1];
  }
  return true;
}

/** The gold road's point while a race runs: the next flag (questRoute.js). */
export function raceRoutePoint(S) {
  const r = S && S._race;
  if (!r || (r.phase !== 'count' && r.phase !== 'run') || !Array.isArray(r.flags)) return null;
  const f = r.flags[Math.min(r.next, r.flags.length - 1)];
  return f ? { x: f[0], y: f[1], flag: r.next } : null;
}

/** What the HUD shows: { phase, count, secs, next, of, result } -- read by
 *  ui/RaceHud.jsx and the QA probe. */
export function raceView(S, now) {
  const r = S && S._race;
  if (!r) return null;
  const t = typeof now === 'number' ? now : Date.now();
  return {
    phase: r.phase,
    count: r.phase === 'count' ? Math.max(0, Math.ceil((r.t0 - t) / 1000)) : 0,
    secs: r.phase === 'run' ? Math.max(0, (t - r.t0) / 1000) : 0,
    lilSecs: r.lilMs ? r.lilMs / 1000 : 0,
    next: r.next || 0,
    of: Array.isArray(r.flags) ? r.flags.length : 0,
    result: r.result || null,
  };
}

/* The words for a refusal or an early end (race_end `err`). */
export const RACE_ERR_WORDS = {
  far: 'Stand next to Lil Bro to start.',
  quest: 'Talk to Lil Bro first.',
  where: 'The race is in BroTown.',
  off: 'No races right now.',
  soon: 'Hang on a second...',
  early: 'False start! Wait for GO.',
  left: 'You left the race.',
  late: 'Too slow. Lil Bro went home.',
};

if (typeof window !== 'undefined') {
  /* QA probe, house style: the race as this phone sees it */
  window.__btRace = function () {
    const S = (window._gameState && window._gameState.current) || null;
    return S ? { view: raceView(S), lil: !!(S._raceLil), held: raceHeld(S) } : null;
  };
}
