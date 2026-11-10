/* ═══ v2.3.4382: A REJOIN IS TOLD ITS LIVE DUEL AND TRADE AGAIN ═══
 * (spec: docs/specs/duels.md and docs/specs/trading.md, "After a rejoin")
 *
 * The state-machine sweep (2026-11-03; V6 N2-18, V8b P2-1 and S6-2, review
 * R2 W1.3): a phone kept its own copy of a duel and a trade across a
 * reconnect, and the worker never said whether they were still on.  A duel
 * that ended while the phone was away stayed on it; a phone back inside the
 * 15 s grace was never told its duel went on (the worker kept it: no regen,
 * the bag locked); a dead trade window stayed up; a live invite card was
 * dropped.
 *
 * The party's shape (join.js, v2.3.1185): the phone clears at state_sync
 * (src/game/rejoinSlots.js), and this, called right AFTER state_sync and to
 * the joining socket only, says again what is still live:
 *   - a social or wagered duel: `duel_resume` {foe, foeName, wager}
 *     (PRIVILEGED).  An arena match is left to the arena's own re-send
 *     (gladiator.js _arenaOnRejoin), as before;
 *   - an open trade: the full `trade2_state` (what every partner action
 *     sends both sides already), else the newest live invite: `trade2_invite`
 *     toward you, or your own waiting drawer (`trade2_state` 'invited').
 * Sends only -- a join adds no storage write (cost-guard.test).
 *
 * THE CAP: `state_sync.caps.rejoinResend` = REJOIN.COUNT, the number of the
 * phone's slots the worker re-sends (1 the duel, 2 the trade); it grows as
 * slots join (TRAPS §9), and the phone clears a slot only at its number.
 * THE KILL SWITCH: live flag `rejoinresend: false` -- no re-sends, the cap
 * un-advertised (the phone then clears nothing new), and trade2_cancel for a
 * missing trade answered with silence again, as before. */

import { TRADE2 } from './trade2.js';

export const REJOIN = Object.freeze({
  COUNT: 2,
});

export const rejoinResendMethods = {
  _rejoinResendOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'rejoinresend') && !f.rejoinresend);
  },

  /* the cap: how many slots this worker re-sends (0 when switched off) */
  _rejoinResendCount() {
    return this._rejoinResendOff() ? 0 : REJOIN.COUNT;
  },

  /* join.js, right after state_sync */
  _rejoinResend(playerId, ws) {
    if (!ws || !playerId || this._rejoinResendOff()) return;
    try { this._duelResend(playerId, ws); } catch (e) { /* the duel's own messages still end it */ }
    try { this._t2Resend(playerId, ws); } catch (e) { /* the partner's next action re-sends the trade */ }
  },

  _duelResend(playerId, ws) {
    const d = this._duelFor ? this._duelFor(playerId) : null;
    if (!d || d.arenaMatch) return false;   /* the arena says its own (_arenaOnRejoin) */
    const foe = d.a === playerId ? d.b : d.a;
    const fs = this.playerState[foe];
    try {
      ws.send(JSON.stringify({ type: 'duel_resume', payload: { foe, foeName: (fs && fs.name) || '', wager: d.wager || 0 } }));
    } catch (e) { return false; }
    return true;
  },

  _t2Resend(playerId, ws) {
    const send = (type, payload) => { try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* gone */ } };
    const s = this._t2SessionFor ? this._t2SessionFor(playerId) : null;
    if (s) { send('trade2_state', Object.assign(this._t2Wire(s), { rejoin: true })); return 'open'; }
    if (!this._t2Invites || this._t2Invites.size === 0) return null;
    /* the phone has one slot: the newest live invite either way */
    const now = Date.now();
    let best = null;
    for (const [k, ts] of this._t2Invites) {
      if (now - ts >= TRADE2.INVITE_TTL) continue;
      const gt = k.indexOf('>');
      if (gt <= 0) continue;
      const from = k.slice(0, gt), to = k.slice(gt + 1);
      if (from !== playerId && to !== playerId) continue;
      const peer = from === playerId ? to : from;
      if (!peer || this._t2SessionFor(peer) || !this.playerState[peer]) continue;
      if (!best || ts > best.ts) best = { ts, peer, out: from === playerId };
    }
    if (!best) return null;
    if (best.out) { send('trade2_state', { state: 'invited', target: best.peer, rejoin: true }); return 'invited'; }
    const ps = this.playerState[best.peer];
    send('trade2_invite', { from: best.peer, fromName: (ps && ps.name) || 'Someone', rejoin: true });
    return 'invite';
  },
};
