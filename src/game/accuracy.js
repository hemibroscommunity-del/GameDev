/* ═══ v2.3.4545: ACCURACY, ON THE PHONE ═══
 *
 * The owner, 2026-11-10: "I want somewhere that stats keep track of
 * 'accuracy' (maybe for all 3 weapon types) like the amount of times the
 * projectile hit on target."
 *
 * The worker counts the HITS (the ones it accepted: server/src/accuracy.js)
 * but never hears of a miss, so the phone numbers its SHOTS: every basic
 * sword swing, arrow and staff bolt gets the next number of its weapon as it
 * starts (accShot).  The counts ride the `track` the phone already sends
 * (`ac`, accTrack), and each hit claim carries its shot's number (`sn`), so
 * an arrow that passes through three monsters is one hit.  Specials are not
 * shots here: they carry no number.
 *
 * Counted from nothing at every state_sync (accReset, wsClient): the worker
 * starts its copy again there too, so a reconnect counts nothing twice.
 * Only against a worker that says caps.accuracy.
 *
 * This file also keeps the worker's answer (`acc_state`) for the Journey page.
 * No imports: node tests read it.  Spec: docs/specs/accuracy.md. */

export const ACC_SLOTS = ['melee', 'ranged', 'staff'];
export const ACC_NAMES = { melee: 'Sword', ranged: 'Bow', staff: 'Staff' };

/** The worker counts accuracy (caps.accuracy, read directly: caps-audit). */
export function accLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.accuracy);
}

/** A new join: the counts begin again. */
export function accReset(S) {
  if (S) S._acc = { melee: 0, ranged: 0, staff: 0 };
}

/** A basic shot of `slot` starts: its number (1, 2, ...), or 0 where nothing is counted. */
export function accShot(S, slot) {
  if (!accLive(S) || (slot !== 'melee' && slot !== 'ranged' && slot !== 'staff')) return 0;
  const a = S._acc || (S._acc = { melee: 0, ranged: 0, staff: 0 });
  a[slot] = (a[slot] | 0) + 1;
  return a[slot];
}

/** The number of the shot of `slot` in progress (a swing's hits claim it), or 0. */
export function accSn(S, slot) {
  return accLive(S) && S._acc ? (S._acc[slot] | 0) : 0;
}

/** For `track`: [sword, bow, staff] shots since this join -- undefined until one is fired. */
export function accTrack(S) {
  if (!accLive(S) || !S._acc) return undefined;
  const a = S._acc;
  if (!(a.melee || a.ranged || a.staff)) return undefined;
  return [a.melee | 0, a.ranged | 0, a.staff | 0];
}

const listeners = new Set();
function emit() { for (const fn of listeners) { try { fn(); } catch (_e) { /* a screen's own */ } } }

/** The Journey page follows the answer: returns the unsubscribe. */
export function subscribeAccuracy(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Ask the worker for your own numbers. */
export function askAccuracy(S) {
  if (!accLive(S) || !S.channel) return false;
  try { S.channel.send({ type: 'acc_request', payload: {} }); } catch (_e) { return false; }
  return true;
}

/** `acc_state` from the worker (wsClient's direct switch): kept on S. */
export function onAccState(S, p) {
  if (!S || !p || typeof p !== 'object') return;
  const w = (p.w && typeof p.w === 'object') ? p.w : {};
  const out = { off: !!p.off, at: Date.now(), w: {} };
  for (const slot of ACC_SLOTS) {
    const a = (w[slot] && typeof w[slot] === 'object') ? w[slot] : {};
    const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
    out.w[slot] = { s: n(a.s), h: Math.min(n(a.s), n(a.h)), rs: n(a.rs), rh: Math.min(n(a.rs), n(a.rh)) };
  }
  S._accState = out;
  if (typeof window !== 'undefined') window.__btAccuracy = out;
  emit();
}

/** "62%" -- or a dash before the first shot. */
export function accPct(shots, hits) {
  const s = Math.floor(Number(shots) || 0), h = Math.floor(Number(hits) || 0);
  if (!(s > 0)) return '—';
  return Math.round(100 * Math.min(s, Math.max(0, h)) / s) + '%';
}
