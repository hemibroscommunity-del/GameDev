/* ═══ v2.3.3541: THE FREE POINTS RESET ═══
 *
 * The owner, 2026-10-21: "I value SIMPLICITY and INTELLIGIBILITY" -- the
 * after-review list's second item, agreed as: "Today, points you spend are
 * spent for good.  After the change one button gives them back, so you can
 * try a different build ... It lets players learn the points system by
 * trying it."
 *
 * `points_reset {}` from the phone (the Points tab's Reset button, two taps)
 * gives every placed point back: each weapon's lane and the shared pool,
 * dealt again from the levels by the one deal there is (prog3.js
 * prog3RespecPoints, the one-level re-deal's own -- under `onelevel: false`
 * the old sum's shared pool).  Levels, XP, gear, gold, everything else kept.
 *
 * FREE.  REFUSED, with an answer and nothing changed or written:
 *   - 'fight'  in a fight: a blow dealt or taken in the last 10 s, or a
 *              fight with a player (cooking.js _anyFightAt, the one-bite
 *              rule's window) -- a build is not swapped mid-duel;
 *   - 'soon'   within a minute of your last reset (GAP_MS): each is one
 *              saved row (the cost guard), and a minute is nothing to wait
 *              for a build you are trying;
 *   - 'none'   nothing placed to give back;
 *   - 'off'    the switch.
 * A dead player, or one with no points system (prog3), is answered nothing.
 *
 * Worn gear stays worn: a requirement is asked at the moment you put a
 * piece on (prog3.js _prog3GearOk, "gates apply at equip time only"), so a
 * reset never strips armour that asked for Defense points.
 *
 * The answer `points_reset_result {ok, err?, wait?, pool, poolBy, shared}` is
 * server-only (PRIVILEGED_EVENTS); the player_state echo carries the new
 * prog3 the phone draws from.
 *
 * KILL SWITCH (lower case, TRAPS §117): `pointsreset: false` in the live
 * flags -- every reset refused ('off'), and caps.pointsreset false at the next
 * join, so the button is not shown.
 *
 * v2.3.4372: THE MINUTE SURVIVES A REJOIN (the state-machine sweep, V9c
 * M3-14).  The minute was `ps._pointsResetAt` alone, and every join rebuilds
 * `ps` (join.js, `this.playerState[msg.id] = {...}`), so a rejoin forgot it:
 * a script's reset, respend, rejoin loop wrote 1 + 6(L-1) rows a minute for a
 * level-L character (the reset's one row, then one `_saveRpg` a point
 * respent) -- about 131,000 a day at level 16, past the free plan's 100,000
 * writes a day for the whole game.  Now the stamp is ALSO kept in a room Map
 * keyed by player id (`_pointsResetAts`, memory only, never saved: a worker
 * restart forgets it, as it forgets the sockets), read with the socket's own;
 * the later of the two is the minute.  Bounded: each reset drops the stamps a
 * minute old from the front (the Map is in time order: delete then set), and
 * never more than RESET_MAX are held.
 *   KILL SWITCH (lower case): `pointsresetroom: false` -- the room's Map is
 * neither read nor written, and the minute is the socket's alone, as before.
 *   Test mode keeps the minute: it is a cost guard (a row a reset), and test
 * mode leaves "every save and payment rule" on (testmode.js); the owner's
 * test lever (/dev/combat deal: true) deals points without it.
 */
import { prog3RespecPoints, PROG3 } from './prog3.js';

export const POINTS_RESET = Object.freeze({
  GAP_MS: 60000,
  /* v2.3.4372: the most stamps the room holds (a player id each, a minute
     each) -- far above the resets a room sees in a minute */
  RESET_MAX: 2048,
});

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** How many points are placed in a prog3 block: the shared stats and every
 *  weapon's offense stats.  0 for anything that is not one. */
export function pointsPlaced(p3) {
  if (!p3 || typeof p3 !== 'object') return 0;
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  let t = 0;
  if (p3.alloc && typeof p3.alloc === 'object') for (const k of Object.keys(p3.alloc)) t += n(p3.alloc[k]);
  if (p3.atk && typeof p3.atk === 'object') {
    for (const cat of PROG3.SKILLS) {
      const a = p3.atk[cat];
      if (a && typeof a === 'object') for (const k of Object.keys(a)) t += n(a[k]);
    }
  }
  return t;
}

export const pointsResetMethods = {
  _pointsResetOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'pointsreset') && !f.pointsreset);
  },

  /* v2.3.4372: the room keeps the minute across a rejoin unless switched off */
  _pointsResetRoomOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'pointsresetroom') && !f.pointsresetroom);
  },

  /* v2.3.4372: when this player id last reset, by the room's Map (0: none
     within the minute, or the switch off) */
  _pointsResetRoomAt(pid, now) {
    if (!this._pointsResetRoomOn()) return 0;
    const m = this._pointsResetAts;
    const at = m ? Number(m.get(pid)) || 0 : 0;
    return at > 0 && now - at < POINTS_RESET.GAP_MS ? at : 0;
  },

  _pointsResetRoomStamp(pid, now) {
    if (!this._pointsResetRoomOn()) return;
    const m = this._pointsResetAts || (this._pointsResetAts = new Map());
    m.delete(pid);   /* re-inserted last: the Map stays in time order */
    m.set(pid, now);
    for (const [k, at] of m) {
      if (now - at < POINTS_RESET.GAP_MS) break;
      m.delete(k);
    }
    while (m.size > POINTS_RESET.RESET_MAX) m.delete(m.keys().next().value);
  },

  _pointsResetSend(pid, payload) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'points_reset_result', payload })); } catch (e) { /* gone */ }
  },

  _handlePointsReset(session) {
    if (!session || !session.id) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.dead || ps.dying || !ps.prog3 || typeof ps.prog3 !== 'object') return;
    if (this._pointsResetOff()) { this._pointsResetSend(pid, { ok: false, err: 'off' }); return; }
    const now = Date.now();
    if (typeof this._anyFightAt === 'function' && this._anyFightAt(pid, ps, now)) {
      this._pointsResetSend(pid, { ok: false, err: 'fight' });
      return;
    }
    /* v2.3.4372: the later of the socket's stamp and the room's (a rejoin
       rebuilds the first, never the second) */
    const last = Math.max(Number(ps._pointsResetAt) || 0, this._pointsResetRoomAt(pid, now));
    if (last > 0 && now - last < POINTS_RESET.GAP_MS) {
      this._pointsResetSend(pid, { ok: false, err: 'soon', wait: POINTS_RESET.GAP_MS - (now - last) });
      return;
    }
    if (pointsPlaced(ps.prog3) === 0) { this._pointsResetSend(pid, { ok: false, err: 'none' }); return; }
    const sumRule = typeof this._oneLevelOn === 'function' ? !this._oneLevelOn() : false;
    prog3RespecPoints(ps.prog3, sumRule);
    ps._pointsResetAt = now;
    this._pointsResetRoomStamp(pid, now);
    this._prog3Recompute(ps);
    this._saveRpg(pid, ps);
    const p3 = ps.prog3;
    this._pointsResetSend(pid, { ok: true, pool: p3.pool, poolBy: { ...p3.poolBy }, shared: p3.shared });
    const ws = this._wsBySessionId(pid);
    if (ws) this._sendPlayerState(ws, pid);
  },
};
