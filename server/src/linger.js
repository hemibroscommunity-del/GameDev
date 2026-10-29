/* ═══ v2.3.3260: LEAVING IN THE MIDDLE OF A FIGHT -- THE BODY STAYS ═══
 *
 * Owner, 2026-10-14: "Also what happens if a player leaves mid-game while
 * they are attacked? The idea is that fishing becomes a valuable skill
 * because they can use it during "no man's land" combat ..." -- then, on the
 * answer, "I want you to plan and implement fixes for all of these".
 *
 * WHAT HAPPENED.  Closing the game mid-fight was a free escape: the socket's
 * close took the body out of the world at once (index.js webSocketClose), with
 * its HP and skulls saved, and a fresh launch put you back in BroTown.  In No
 * man's land -- where the bag is the killer's prize -- the loser of any fight
 * could keep everything by swiping the app away.
 *
 * WHAT HAPPENS NOW.  A player who leaves within PVP_HEAL.WINDOW_MS (10 s) of a
 * hit between them and another player, in the Wheel, leaves their body behind
 * for LINGER.MS (20 s): it stands where it was, still hittable and killable
 * under No man's land's rules (the killer takes the bag), by monsters too.
 * When the time is up, or once it has died and come back, it goes as any
 * leaver does.
 *   - Coming back from the SAME SPOT (a reconnect after a network blip, the
 *     app brought back from the background): the join takes the body back at
 *     once -- its HP as it is now, saved first -- and you fight on.  Within
 *     RESUME_PX of it, in its zone, alive.
 *   - Coming back from anywhere else (a fresh launch starts in town): the
 *     join is refused until the body has gone -- `linger_wait {ms}` and the
 *     close code 4010.  The game says why and counts down
 *     (src/ui/LingerScreen.js); an older game just retries its reconnect,
 *     which the refusal answers the same way until the time is up.
 * A duel is left alone (it has its own 15 s grace, then forfeits), and so is
 * anyone who was not in a fight with a player, or the last one in the room
 * (nobody is left to fight).  Memory only (rule 11): a deploy or an eviction
 * ends every linger, which is what happened before.
 *
 * Kill switch: `linger: false` in liveflags -- every leaver leaves at once
 * again, and a lingering body ends on the next sweep.
 */
import { PVP_HEAL } from './data.js';

export const LINGER = Object.freeze({
  MS: 20000,
  /* how close a reconnect must claim to be to take the body back: a blip
     where the game kept walking, not a teleport */
  RESUME_PX: 300,
  /* what a refusal adds to the wait, so the retry lands after the body went */
  WAIT_SLACK_MS: 400,
  /* the close code a refused join gets (wsClient.js knows it; an older game
     reconnects as after any drop) */
  CLOSE_CODE: 4010,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const lingerMethods = {
  _lingerOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'linger') && !f.linger);
  },

  /* Is this player in a fight with another player, by the eating rule's own
     clock (cooking.js: the last hit between players, on the room)? */
  _lingerFightRecent(id, now) {
    const c = this._pvpHealClocks ? this._pvpHealClocks.get(id) : null;
    return !!c && now - (c.pvpAt || 0) < PVP_HEAL.WINDOW_MS;
  },

  /* webSocketClose: should this leaver's body stay?  If so it is marked and
     kept, and the close does only what does not touch the body. */
  _lingerOnClose(session, now) {
    const t = typeof now === 'number' ? now : Date.now();
    const id = session && session.id;
    const ps = id ? this.playerState[id] : null;
    if (!ps || this._lingerOff()) return false;
    if (ps.dying || ps.dead || ps.disconnected || ps.lingering) return false;
    if (ps.z !== 'wheel') return false;                         /* No man's land is the Wheel's */
    /* v2.3.3265: a spar with your own clones (spar.js) is not a fight to stay
       for -- they leave with you */
    if (this._sparHas && this._sparHas(id)) return false;
    if (this._duelFor && this._duelFor(id)) return false;       /* a duel has its own grace */
    if (!this._lingerFightRecent(id, t)) return false;
    /* the last one in the room: nobody left to fight (the closing session is
       still in the map) */
    let others = 0;
    for (const [, s] of this.sessions) if (s && s.id && s.id !== id) others++;
    if (others === 0) return false;
    ps.lingering = true;
    ps._lingerUntil = t + LINGER.MS;
    ps._lingerZ = ps.z;
    /* it stands still and drops its guard: nobody is holding the stick */
    ps.vx = 0; ps.vy = 0;
    ps.blocking = false; ps.blockStartT = 0; ps.dodging = false;
    ps.ex = null; ps._exAt = 0;
    ps._sprintStep = false;
    if (!this._lingerBodies) this._lingerBodies = new Map();
    this._lingerBodies.set(id, { until: ps._lingerUntil, session });
    this.dirtyPlayers.add(id);   /* the stop goes out on the next tick: phones draw a peer along its speed */
    return true;
  },

  /* A lingering body's session, for the joiner's snapshot (index.js
     getAllPlayerData): the look and the name it left with. */
  _lingerSessions() {
    return this._lingerBodies ? this._lingerBodies : null;
  },

  /* The tick: end the lingers that are over -- the time is up, the switch
     was thrown, or the body died and has come back (it respawns in town). */
  _lingerSweep(now) {
    if (!this._lingerBodies || this._lingerBodies.size === 0) return;
    const t = typeof now === 'number' ? now : Date.now();
    const off = this._lingerOff();
    for (const [id, b] of this._lingerBodies) {
      const ps = this.playerState[id];
      const over = !ps || !ps.lingering || off || t >= b.until
        || (!ps.dying && ps.z !== ps._lingerZ);
      if (!over) continue;
      if (ps && ps.dying) continue;   /* let the death finish: the respawn tick brings it back first */
      const p = this._lingerEnd(id);
      if (p && p.catch) p.catch(() => {});
    }
  },

  /* End one: the leaving webSocketClose put off -- the body out of the world,
     its caches dropped, player_leave.  `quiet` (a join taking the body back)
     skips the leave: the join's own player_join follows. */
  async _lingerEnd(id, quiet) {
    if (this._lingerBodies) this._lingerBodies.delete(id);
    const ps = this.playerState[id];
    if (!ps || !ps.lingering) return;
    ps.lingering = false;
    ps.disconnected = true;
    /* v2.3.3327: where the body stood, for the next join (lastplace.js) --
       a resume's own join is judged from it, within RESUME_PX */
    if (this._placeRemember) this._placeRemember(id, ps, Date.now());
    delete this.playerState[id];
    this._gearProvForget(id);
    if (this._bankForget) this._bankForget(id);   /* v2.3.3785 */
    const pets = this._petbookDirtyCopy(id);
    this._petbookForget(id);
    const codex = this._codexDirtyCopy(id);
    this._codexForget(id);
    delete this.stateHistory[id];
    /* v2.3.3322: the extraction record outlives the body, as it outlives a
       socket (index.js webSocketClose; gathering.js HARVEST_PROOF) */
    this.dirtyPlayers.delete(id);
    if (!quiet) this.broadcastAll({ type: 'player_leave', id });
    /* the body's last word: its HP, bag and all, as it stands now (a hit
       during the linger was coalesced, _saveRpgVitals) */
    try { await this._saveRpg(id, ps); } catch (e) { /* the next join reads what was saved */ }
    if (pets) await this._petbookPut(id, pets);
    if (codex) await this._codexPut(id, codex);
  },

  /* A join from a player whose body is lingering.  'none' (no body: go on),
     'resume' (the body was taken back: go on, it is saved and gone) or
     { wait: ms } (refuse). */
  async _lingerOnJoin(id, data, now) {
    const t = typeof now === 'number' ? now : Date.now();
    const b = this._lingerBodies ? this._lingerBodies.get(id) : null;
    const ps = b ? this.playerState[id] : null;
    if (!b || !ps || !ps.lingering) {
      if (b) this._lingerBodies.delete(id);
      return 'none';
    }
    /* over, though the sweep has not run yet: the time is up, the switch
       is thrown, or it died and has come back (in town) */
    if (this._lingerOff() || t >= b.until || (!ps.dying && ps.z !== ps._lingerZ)) {
      if (!ps.dying) { await this._lingerEnd(id); return 'none'; }
    }
    const d = data && typeof data === 'object' ? data : {};
    const x = Number(d.x), y = Number(d.y);
    const near = d.z === ps.z && Number.isFinite(x) && Number.isFinite(y)
      && (x - ps.x) * (x - ps.x) + (y - ps.y) * (y - ps.y) <= LINGER.RESUME_PX * LINGER.RESUME_PX;
    if (near && !ps.dying && !ps.dead) {
      await this._lingerEnd(id, true);
      return 'resume';
    }
    /* a body dying waits for its respawn (5 s at most), else for its time */
    const until = ps.dying ? Math.min(b.until, (ps.respawnAt || t) + 50) : b.until;
    return { wait: Math.max(0, until - t) + LINGER.WAIT_SLACK_MS };
  },
};
