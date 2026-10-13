/* ═══ v2.3.3203: A PLAYER WALKING STEADILY IS SENT LESS OFTEN ═══
 *
 * Every tick, every player who moved goes out to every phone near them
 * (tick.js; far ones less often since #886).  A phone sends its moves 30
 * times a second, so a crowd's phones are each sent every walker 30 times a
 * second -- and the room compresses each message for each phone, which is
 * about a third of its thread at 150 players (gdb samples of the runtime:
 * deflate_slow, longest_match, compress_block on the room's own thread;
 * docs/specs/load-test.md).
 *
 * But a phone does not draw another player from those positions.  It draws
 * them moving along the speed the last update gave (`vx`, `vy`; dead
 * reckoning, src/game/visualSystems.js), and only pulls them back when they
 * are more than 30 px off.  So while a player walks in a straight line, the
 * updates in between say nothing a phone would draw differently.
 *
 * So a Wheel player's update is HELD while all of this is true:
 *   - it has been sent before, less than MAX_MS ago;
 *   - everything but the position and speed is as it was sent (gear, facing,
 *     zone, harvest, sprint, skull, pet ... -- every other field the update
 *     carries, read off the update itself, so a field added later is covered);
 *   - they are still moving, or still standing (a start or a stop goes out at
 *     once: it changes the pose the phones draw);
 *   - they move at the speed the last update gave (within V_REL), and where
 *     they are is within ERR_PX of the line it drew them along -- what the
 *     phones are drawing -- and about as far along it as that speed takes
 *     them (JITTER_MS: a busy room takes moves in late and unevenly).
 * A turn, a stop, a new piece of gear, a shove, anything else goes out at
 * once.  A held update is not dropped: the player stays "moved" and is looked
 * at again next tick, and goes out within MAX_MS with where they are then.
 *
 * MAX_MS is two of a phone's moves; the phones treat a player with no update
 * for 150 ms as standing (entityRenderer.js STALE_UPDATE_MS), far above it.
 * Presence ticks (the 1 Hz roster) are never held.  Server only: the phones
 * already draw this way, and an old phone gets the same updates, fewer.
 *
 * Kill switch: `steadymovers: false` in the live flags -- every move goes out
 * again, from the next tick.  /dev/overview's `steadyMovers` says how much it
 * saves with real thumbs (_steadyInfo).
 */
export const STEADY = Object.freeze({
  /* off the line they are drawn along: at most this far to either side */
  ERR_PX: 2,
  MAX_MS: 66,
  /* their speed may differ from the one sent by this share of it (each of
     vx, vy), or V_MIN hundredths, whichever is more: ~2 degrees */
  V_REL: 0.04,
  V_MIN: 3,
  /* ALONG the line, where they are may differ from where the sent speed
     says by what this much lateness in the moves' arrival would make: a busy
     room takes moves in late and unevenly, a phone does not send them late */
  JITTER_MS: 50,
  /* v2.3.3204: a move this long after the last one sent (by the MOVES'
     times) is never held: its phone already spaced it.  A phone on the safe
     ground sends a steady walk every MAX_MS itself (src/game/moveDiet.js);
     held by the TICKS' times, half of those came a tick late (measured: the
     others saw positions 12-16 ms later).  MAX_MS less a tick and a bit. */
  SPACED_MS: 44,
});

/* an update's vx/vy: hundredths of a pixel per 60 Hz frame (wsClient.js reads
   `data.vx / 100` as pixels a frame) -> pixels a millisecond */
const PX_PER_MS = 60 / 100 / 1000;

/* Everything in an update but its position and speed, as one string. */
export function steadySig(w) {
  let s = '';
  for (const k in w) {
    if (k === 'x' || k === 'y' || k === 'vx' || k === 'vy') continue;
    const v = w[k];
    s += k + '\u0001' + (v === undefined ? '\u0003' : typeof v === 'string' ? v : JSON.stringify(v)) + '\u0002';
  }
  return s;
}

/* May this update wait?  `last` is what went out last ({sentAt, t, x, y,
   vx, vy, sig}), `w` the update now, `sig` its steadySig, `now` the tick's
   time and `at` the time of the move that put the player where `w` says (the
   line is checked between the two MOVES' times -- a position is where the
   player was when their phone sent it, not at the tick). */
export function steadyHold(last, w, sig, now, at) {
  if (!last || typeof now !== 'number' || typeof at !== 'number') return false;
  const since = now - last.sentAt;
  if (!(since >= 0) || since >= STEADY.MAX_MS) return false;
  if (sig !== last.sig) return false;
  const vx = typeof w.vx === 'number' ? w.vx : 0, vy = typeof w.vy === 'number' ? w.vy : 0;
  const moving = vx !== 0 || vy !== 0;
  if (moving !== (last.vx !== 0 || last.vy !== 0)) return false;
  if (typeof w.x !== 'number' || typeof w.y !== 'number') return false;
  const dx = w.x - last.x, dy = w.y - last.y;
  const E = STEADY.ERR_PX;
  /* standing: where they stood */
  if (!moving) return dx * dx + dy * dy <= E * E;
  /* walking: at the speed that was sent ... */
  const sp = Math.sqrt(last.vx * last.vx + last.vy * last.vy);
  const vtol = Math.max(STEADY.V_MIN, sp * STEADY.V_REL);
  if (Math.abs(vx - last.vx) > vtol || Math.abs(vy - last.vy) > vtol) return false;
  /* ... on its line (a turn, a sidestep, a shove leave it) ... */
  const ux = last.vx / sp, uy = last.vy / sp;
  const cross = dx * uy - dy * ux;
  if (Math.abs(cross) > E) return false;
  /* ... and about as far along it as that speed takes them (the moves'
     times are when the room took them in, which a busy room does late) */
  const dt = at - last.t;
  if (!(dt >= 0) || dt >= STEADY.SPACED_MS) return false;
  const along = dx * ux + dy * uy;
  const expect = sp * PX_PER_MS * dt;
  return Math.abs(along - expect) <= E + sp * PX_PER_MS * STEADY.JITTER_MS;
}

export const steadyMoversMethods = {
  /* `steadymovers: false` in the live flags: every move goes out */
  _steadyOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'steadymovers') && !f.steadymovers);
  },

  /* tick.js, for each Wheel player who moved this tick: true = hold the
     update (they stay "moved" for the next tick), false = it goes out now,
     and is remembered as what went out.  `at` is their last move's time
     (movement.js ps.lastMoveAt), else the tick's. */
  _steadyHold(id, w, now, at) {
    let m = this._steadyLast;
    if (!m) m = this._steadyLast = new Map();
    const t = typeof at === 'number' ? at : now;
    /* counted for /dev/overview: every look is an update the room sent
       before this, except a held one looked at again with no new move since
       (`held`: id -> the move time it was held at) */
    const c = this._steadyCount || (this._steadyCount = { moved: 0, sent: 0, held: new Map() });
    if (c.held.get(id) !== t) c.moved++;
    const sig = steadySig(w);
    if (steadyHold(m.get(id), w, sig, now, t)) { c.held.set(id, t); return true; }
    c.held.delete(id);
    c.sent++;
    this._steadySent(id, w, now, t, sig);
    return false;
  },

  /* /dev/overview: since the room started, the Wheel's movers' updates the
     room would have sent before (one a tick with a new move: `moved`), the
     ones it did send (`sent`), and the share it saved.  The load test's bots
     walk dead straight and real thumbs wobble (docs/specs/steady-movers.md),
     so this is the real saving. */
  _steadyInfo() {
    const c = this._steadyCount;
    const moved = c ? c.moved : 0, sent = c ? c.sent : 0;
    return { on: !this._steadyOff(), moved, sent, saved: moved ? Math.round(1000 * (1 - sent / moved)) / 1000 : null };
  },

  /* What went out for a player, to hold the next ones against: from
     _steadyHold, and from the far send (tick.js), which gives every phone in
     the Wheel everyone who moved -- the held ones too, where they are now. */
  _steadySent(id, w, now, at, sig) {
    let m = this._steadyLast;
    if (!m) m = this._steadyLast = new Map();
    m.set(id, {
      sentAt: now, t: typeof at === 'number' ? at : now,
      x: typeof w.x === 'number' ? w.x : 0, y: typeof w.y === 'number' ? w.y : 0,
      vx: typeof w.vx === 'number' ? w.vx : 0, vy: typeof w.vy === 'number' ? w.vy : 0,
      sig: sig === undefined ? steadySig(w) : sig,
    });
  },

  /* what went out for players no longer in the room is forgotten (presence
     ticks, tick.js) */
  _steadyPrune() {
    const m = this._steadyLast;
    if (m && m.size) for (const id of m.keys()) if (!this.playerState[id]) m.delete(id);
    const held = this._steadyCount && this._steadyCount.held;
    if (held && held.size) for (const id of held.keys()) if (!this.playerState[id]) held.delete(id);
  },
};
