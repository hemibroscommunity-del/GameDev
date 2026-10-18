/* ═══ v2.3.3343: WHEN AND HOW LOUD THE NEW SOUNDS PLAY ═══
 *
 * Owner, 2026-10-18: "Start adding the have ones" (docs/SOUND-GAPS.md).  The
 * sounds are data/eventSounds.js's table, slices of recordings already in
 * the game; this file plays them, the way game/hitSounds.js plays the hit
 * voices:
 *
 *   cue(name, k)            one of the table's cues at share k of its level
 *                           (1 = as written): your own events.
 *   cueAt(S, name, x, y, k) a cue that happens somewhere in the world -- a
 *                           monster's throw, a burst going off -- quieter the
 *                           further it is from you (hitSounds.earVol: full
 *                           within 220 px, nothing past 1,150).
 *   peerShare(S, x, y)      what another player's action is heard at: about
 *                           half your own (PEER_K) by distance, at most
 *                           PEER_BURST in a moment, so a crowd is a murmur
 *                           and not a wall of noise.  0 = not heard.  The
 *                           caller plays its own helper at that share (your
 *                           swing's whoosh, your arrow, your footstep).
 *   cuePeer(S, name, x, y)  a table cue at peerShare.
 *
 * A cue some events can fire many times in a moment has a least gap
 * (CUE_GAP_MS).  Sound only: nothing here may throw into the code that calls
 * it, so every entry point catches.  window.__btCues is the tests' probe. */
import { BT_AUDIO } from '@/data/index.js';
import { EVENT_SOUNDS, CUE_GAP_MS } from '@/data/eventSounds.js';
import { earVol } from '@/game/hitSounds.js';

/* Another player's action, heard beside you: about half your own level. */
export const PEER_K = 0.5;
/* At most this many sounds of other players in PEER_WINDOW_MS. */
export const PEER_BURST = 4;
export const PEER_WINDOW_MS = 200;
/* Under this share a sound is not worth starting. */
const QUIET = 0.02;

export const cueStats = {
  played: Object.create(null),   /* name -> times asked (CLAUDE.md rule 4) */
  gapped: 0, quiet: 0, peerCapped: 0, peer: 0,
  last: null, log: [],
};

const _lastAt = new Map();
let _peerAt = [];

function has(obj, k) { return Object.prototype.hasOwnProperty.call(obj, k); }

function note(name, k, played) {
  cueStats.played[name] = (cueStats.played[name] || 0) + 1;
  cueStats.last = { name, k, played, at: Date.now() };
  cueStats.log.push(cueStats.last);
  if (cueStats.log.length > 40) cueStats.log.shift();
}

/** Play cue `name` at share `k` (default 1) of its level, its pitch times
 *  `rate` (default 1, a hair of random detune either way).  Returns whether
 *  a sample started (false while its sample is still loading, or muted). */
export function cue(name, k, rate) {
  try {
    if (!name || !has(EVENT_SOUNDS, name)) return false;
    const share = k == null ? 1 : Math.max(0, Math.min(1.5, Number(k) || 0));
    if (!(share > QUIET)) { cueStats.quiet++; return false; }
    const now = Date.now();
    const gap = has(CUE_GAP_MS, name) ? CUE_GAP_MS[name] : 0;
    if (gap > 0) {
      const t = _lastAt.get(name);
      if (t != null && now - t < gap) { cueStats.gapped++; return false; }
    }
    _lastAt.set(name, now);
    const r = (Number(rate) > 0 ? Number(rate) : 1) * (1 + (Math.random() - 0.5) * 0.05);
    let any = false;
    const layers = EVENT_SOUNDS[name];
    for (let i = 0; i < layers.length; i++) any = !!BT_AUDIO._playLayer(layers[i], share, r, 1) || any;
    note(name, share, any);
    return any;
  } catch (e) { return false; /* sound only */ }
}

/** Cue `name` for something at world (x, y): by distance from you. */
export function cueAt(S, name, x, y, k) {
  try {
    const ev = earVol(S, x, y);
    if (!(ev > QUIET)) { cueStats.quiet++; return false; }
    return cue(name, (k == null ? 1 : k) * ev);
  } catch (e) { return false; }
}

/** The share another player's action at (x, y) is heard at, or 0 when it is
 *  too far off or PEER_BURST of theirs have just played.  Counts toward the
 *  burst when it says yes. */
export function peerShare(S, x, y) {
  try {
    const ev = earVol(S, x, y);
    if (!(ev > QUIET)) return 0;
    const now = Date.now();
    _peerAt = _peerAt.filter((t) => now - t < PEER_WINDOW_MS);
    if (_peerAt.length >= PEER_BURST) { cueStats.peerCapped++; return 0; }
    _peerAt.push(now);
    cueStats.peer++;
    return PEER_K * ev;
  } catch (e) { return 0; }
}

/* Another player's footsteps have a budget of their own, so a crowd's walking
   never takes the places of their blows (PEER_BURST): at most this many in
   PEER_WINDOW_MS, at about half your own step's level. */
export const PEER_STEP_K = 0.5;
export const PEER_STEP_BURST = 3;
let _stepAt = [];

/** The share another player's footstep at (x, y) is heard at, or 0. */
export function peerStepShare(S, x, y) {
  try {
    const ev = earVol(S, x, y);
    if (!(ev > QUIET * 2)) return 0;
    const now = Date.now();
    _stepAt = _stepAt.filter((t) => now - t < PEER_WINDOW_MS);
    if (_stepAt.length >= PEER_STEP_BURST) { cueStats.peerCapped++; return 0; }
    _stepAt.push(now);
    cueStats.peerSteps = (cueStats.peerSteps || 0) + 1;
    return PEER_STEP_K * ev;
  } catch (e) { return 0; }
}

/** A table cue for another player's action at (x, y). */
export function cuePeer(S, name, x, y, k) {
  const s = peerShare(S, x, y);
  return s > 0 ? cue(name, s * (k == null ? 1 : k)) : false;
}

/** Another player's action that sounds as YOURS does: `layers`, one of
 *  BT_AUDIO's own tables read when it plays (SPRINT_PUSH, SWIM_SPLASH.in,
 *  a SWIM_STROKES row), every layer at `vol` times their share -- never a
 *  copy in this file's table, which would go stale the day yours is retuned
 *  (the sprint's push-off was, v2.3.3336).  `budget` 'step' takes their
 *  footsteps' budget (a stroke).  `label` names it in cueStats. */
export function peerOwn(S, label, layers, vol, x, y, budget) {
  try {
    if (!Array.isArray(layers) || !layers.length) return false;
    const s = budget === 'step' ? peerStepShare(S, x, y) : peerShare(S, x, y);
    if (!(s > 0)) return false;
    const list = typeof layers[0] === 'string' ? [layers] : layers;   /* one layer, or a list */
    const r = 1 + (Math.random() - 0.5) * 0.06;
    let any = false;
    for (let i = 0; i < list.length; i++) any = !!BT_AUDIO._playLayer(list[i], (vol == null ? 1 : vol) * s, r, 1) || any;
    note(label, s, any);
    return any;
  } catch (e) { return false; /* sound only */ }
}

/* QA probe, house style (hitSounds' __btHitSounds). */
if (typeof window !== 'undefined') {
  window.__btCues = {
    stats: cueStats,
    names: () => Object.keys(EVENT_SOUNDS),
    /* every sample a cue plays (they decode on the loading screen) */
    keys: () => [...new Set(Object.keys(EVENT_SOUNDS).flatMap((n) => EVENT_SOUNDS[n].map((L) => L[0])))],
    play: (name, k) => cue(name, k),
    reset: () => { cueStats.played = Object.create(null); cueStats.log = []; cueStats.last = null; _lastAt.clear(); _peerAt = []; _stepAt = []; },
    consts: { PEER_K, PEER_BURST, PEER_WINDOW_MS, PEER_STEP_K, PEER_STEP_BURST },
  };
}
