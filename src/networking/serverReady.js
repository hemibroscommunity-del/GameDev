/* ═══ v2.3.2437: THE WORLD WAITS FOR THE SERVER ═══
 *
 * Owner, 2026-09-10, twice: "THIS IS AN ONLINE GAME ONLY. Just don't let
 * the player in if there's no online connection" / "don't let the player in
 * at all unless it's ready to go".
 *
 * WHAT WAS HAPPENING.  The loading screen (IntroVideo) lifted when the
 * avatar's ASSETS were baked -- and only that.  Nothing anywhere waited for
 * the server.  So when the game room stopped answering joins, the player
 * still walked into a world: the client's own client-local remnant, with
 * no capabilities, no server player record, local monsters, the legacy
 * six-tile Points grid and combat levels reading 0.  From the owner's phone
 * that read as "zeros for combat primary skills", "old menus", and
 * "offline legacy stuff" -- and a whole day was spent chasing a capability
 * FLAG that was never the problem.  The room was simply not answering, and
 * the client covered for it.
 *
 * CLAUDE.md has said since 2026-07-02 that any client-local game logic is
 * a legacy remnant, not a mode.  This makes that true at the door: the
 * world is revealed only after a state_sync that advertises the
 * capabilities the game is built on, and it is veiled again if the socket
 * drops.  The legacy paths still exist in the code; a player can no longer
 * be standing in them.
 *
 * WHAT "READY" MEANS.  A state_sync arrived AND its caps object carries
 * every name in SERVER_READY_CAPS.  A cap that is false and a cap that is
 * absent read the same to every gate in the client (rule 19), so they read
 * the same here.  The list is deliberately ONE name: prog3 is the cap whose
 * absence swaps the entire Points screen for a dead legacy grid and zeroes
 * the combat levels -- the exact thing the owner saw.  Everything else
 * degrades to something still recognisably the game.
 *
 * THE LOCKOUT HAZARD, and why the list is a registry.  Cloudflare Pages
 * (the client) and the worker deploy from the same merge to main on
 * SEPARATE pipelines, and Pages is usually first.  A client that requires a
 * cap the running worker does not advertise yet keeps EVERY player at the
 * loading screen until the worker catches up -- or forever, if the worker
 * deploy failed.  So precheck's ready-caps check fails the push unless every
 * name here is already in origin/main's caps literal: a cap can never be
 * required in the same PR that introduces it.  Do not add to this list
 * casually; every name is a promise that no deployed worker lacks it.
 *
 * A NOT-READY SERVER IS RETRIED, not obeyed.  If state_sync arrives without
 * the caps (an old worker, or a live flag switching one off), wsClient
 * re-joins on a fixed cadence and the loading screen says so.  A player is
 * never dropped into the legacy game because the server said it could not
 * do the new one; they wait, visibly, for a server that can.
 */
import { getState } from '@/ui/mobile/dash/common.js';

export const SERVER_READY_CAPS = ['prog3'];

/* How long a dropped socket may stay dropped before the veil goes up.  A
   blip on cellular reconnects inside a second and should never flash a
   screen; a real drop is visible by three. */
const LOST_GRACE_MS = 3000;
/* The initial hold on a road with no loading screen (a resume): a healthy
   join answers well inside this, so the veil never appears on it. */
const INITIAL_GRACE_MS = 800;

let _state = { ready: false, reason: 'waiting', since: Date.now() };
let _waiters = [];
let _subs = [];

/* Why this caps object is not enough, or null when it is. */
export function serverReadyReason(caps) {
  if (!caps || typeof caps !== 'object') return 'no-caps';
  for (let i = 0; i < SERVER_READY_CAPS.length; i++) {
    if (!caps[SERVER_READY_CAPS[i]]) return 'missing:' + SERVER_READY_CAPS[i];
  }
  return null;
}

export function getServerReadyState() { return _state; }

/* Called on every state_sync with its caps.  Returns true when the world
   may be shown. */
export function markServerReady(caps) {
  const why = serverReadyReason(caps);
  if (why) { _set(false, why); return false; }
  _set(true, null);
  const w = _waiters; _waiters = [];
  for (let i = 0; i < w.length; i++) { try { w[i](); } catch (e) { /* a waiter must not break the sync */ } }
  return true;
}

/* Called when the socket drops on a road that will reconnect. */
export function resetServerReady(reason) { _set(false, reason || 'lost'); }

/* Resolves the first time the server is ready.  The loading screen awaits
   this beside the asset preload; unlike the preload it has NO cap -- the
   owner's rule is that the world does not appear without it. */
export function waitForServerReady() {
  if (_state.ready) return Promise.resolve();
  return new Promise((resolve) => { _waiters.push(resolve); });
}

export function onServerReady(cb) {
  _subs.push(cb);
  return () => { _subs = _subs.filter((x) => x !== cb); };
}

function _set(ready, reason) {
  const changed = _state.ready !== ready || _state.reason !== reason;
  _state = { ready, reason, since: changed ? Date.now() : _state.since };
  if (!changed) return;
  const subs = _subs.slice();
  for (let i = 0; i < subs.length; i++) { try { subs[i](_state); } catch (e) { /* see above */ } }
}

/* Plain-language line for whichever screen is holding the player. */
export function serverHoldText(st, elapsedMs) {
  const s = st || _state;
  if (s.ready) return '';
  if (s.reason === 'lost') return 'Reconnecting to Bro Town…';
  if (s.reason === 'no-caps' || (s.reason && s.reason.indexOf('missing:') === 0)) {
    return 'The game server isn’t fully up yet — retrying…';
  }
  const t = typeof elapsedMs === 'number' ? elapsedMs : (Date.now() - s.since);
  if (t < 6000) return '';
  if (t < 20000) return 'Connecting to Bro Town…';
  return 'Still connecting — the game server isn’t answering yet. Hang on, we keep trying.';
}

/* ═══ THE VEIL: the hold for a world that is already on screen ═══
   The loading screen narrates the initial wait itself.  Every OTHER road
   -- a resume that skips the loading screen, ?debug=1, and a socket that
   drops mid-session -- gets this: a full-screen veil in the per-zone
   loading overlay's own language, over the world, swallowing input, until
   the next state_sync.  DOM rather than React, like RoomFullScreen: it has
   to work whatever the React tree is doing.  S._netHold freezes movement
   underneath it so the player is not walked off a ledge by a stale
   joystick while veiled. */
let _veil = null;
let _veilTimer = null;
let _installed = false;

function _showVeil(st) {
  const text = serverHoldText(st, Infinity) || 'Connecting to Bro Town…';
  if (_veil) {
    const t = _veil.querySelector('.bt-connect-veil-text');
    if (t) t.textContent = text;
    return;
  }
  try {
    _veil = document.createElement('div');
    _veil.className = 'bt-zone-loading bt-connect-veil';
    const spin = document.createElement('div');
    spin.className = 'bt-zone-loading-spin';
    const t = document.createElement('div');
    t.className = 'bt-connect-veil-text';
    t.textContent = text;
    const sub = document.createElement('div');
    sub.className = 'bt-connect-veil-sub';
    sub.textContent = 'Bro Town is online only — the world comes back the moment the server does.';
    _veil.appendChild(spin); _veil.appendChild(t); _veil.appendChild(sub);
    document.body.appendChild(_veil);
  } catch (e) { _veil = null; }
}

function _hideVeil() {
  if (_veilTimer) { clearTimeout(_veilTimer); _veilTimer = null; }
  if (_veil) { try { _veil.remove(); } catch (e) {} _veil = null; }
}

function _apply(st, graceMs) {
  const S = getState();
  if (st.ready) { if (S) S._netHold = false; _hideVeil(); return; }
  if (S) S._netHold = true;
  if (_veilTimer) clearTimeout(_veilTimer);
  _veilTimer = setTimeout(() => {
    _veilTimer = null;
    if (_state.ready) return;
    /* The loading screen is its own hold and says its own words. */
    if (document.querySelector('.bt-intro')) return;
    _showVeil(_state);
  }, graceMs);
}

/* Idempotent.  Called once the game has decided how it is entering the
   world; from then on the veil follows the ready state. */
export function installWorldHold() {
  if (_installed) return;
  _installed = true;
  onServerReady((st) => _apply(st, st.reason === 'lost' ? LOST_GRACE_MS : INITIAL_GRACE_MS));
  _apply(_state, INITIAL_GRACE_MS);
}

/* For the QA harness and the test panel. */
export function connectVeilOpen() { return !!_veil; }
