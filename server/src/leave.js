/* ═══ v2.3.4830: THE SESSION DOOR -- every way a player's socket leaves goes through here ═══
 * (spec: docs/specs/session-door.md; pinned by server/test/session-door.test.mjs)
 *
 * WHY.  "The player leaves" was written by hand in many places that drifted:
 * the runtime's close (index.js webSocketClose), the AFK sweep (tick.js), the
 * flood close (flood.js), the owner's kick (admin.js), the device / key
 * refusal (devicelock.js), the character reset (persistence.js), a join that
 * threw (join.js), a body take that timed out (bodytake.js), a second login
 * during a fight (join.js, v2.3.4432), the takeover's own eviction (join.js
 * v2.3.702, which ran two of the close's duties by hand) and the join's
 * refusals (join.js, verify.js: the session dropped, nothing else).  Each new
 * duty had to be copied into each place; the ones that missed it are the
 * sweep's bugs (state-machine sweep V3, S1-4: "written by hand three times and
 * drifts, plus the takeover doing one duty of many").  The gold door
 * (gold.js) and the monster-hit door (hits.js) have the same shape.
 *
 * THE DOOR is one method, _playerLeaves(ws, why).  `why` names the way of
 * leaving: its row in LEAVE_WAYS says which duties that way runs.  The
 * session's life is one field, `session.phase`:
 *   'open'   the socket is accepted, no character yet (index.js fetch);
 *   'joined' the join named the character (join.js, beside `session.id`);
 *   'gone'   the door ran for it.  A second run for the same socket (the
 *            runtime's own close after a kick, an AFK sweep, a reset) skips
 *            the duties -- they ran -- and does only the room's tail (the
 *            session out of the map, the tick's stop when the room is empty).
 * Before v2.3.4830 a second run while the first was still awaiting its save
 * ran the duel's away clock, the trade's cancel, player_leave and the rest a
 * second time.
 *
 * STEP 1 (this version): NOTHING A PLAYER SEES CHANGES.  Every row keeps
 * exactly the duties its place ran before, in the same order (the close's
 * body is moved here line for line); the takeover still runs only the bot
 * summary and the save.  session-door.test plays each way of leaving against
 * a spy and holds the table to what each place did; a scan there fails a new
 * caller of webSocketClose, a `sessions.delete` outside this file, or a
 * leave duty called from anywhere else.
 * STEP 2 / 3 (their own versions and switches): the takeover's skipped
 * duties, where they are bugs (docs/specs/session-door.md).
 *
 * WHAT IS NOT HERE: the END of a lingering body (linger.js _lingerEnd) -- the
 * second half of a close that left the body in a fight, run later by the
 * tick.  It is a body leaving, not a socket; it calls no duty of this table
 * but the body's own (the caches, player_leave, the save).
 */
import { bookFlush } from './daybook.js';   /* v2.3.5085: the last one out writes the day's book (card E PR 6) */

/* The duties, in the order the door runs them (the close's order):
     linger   the body stays if its fight is on (linger.js _lingerOnClose)
     spar     your sparring clones go with you (spar.js)
     save     'dirty': the record's unsaved part (`_regenDirty`), awaited;
              'takeover': the same, unless `takeoversave: false` or the body
              is kept (bodytake.js) -- the takeover's own rule (v2.3.4377)
     daily    the daily quests' last count (dailyrewards.js), awaited
     body     the body out of the world and its caches dropped (unless it
              lingers): the place remembered, the gear ledger, the vault,
              the pets / codex / catches / accuracy copies taken
     duel     the duel's 15 s away clock (duel.js)
     trade    the trade window's cancel (trade2)
     party    the party's 'away' (party.js)
     botfp    the bot summary written ('safe': in a try, the takeover's way)
     consent  PvP consent cleared
     mute     the chat-mute lookup released (chatmod.js)
     leave    player_leave to everyone (unless it lingers)
     count    player_count to everyone
     lastOut  the last one out ends every linger and stops the tick
     copies   the pets / codex / catches / accuracy copies written, awaited
   And two of the door's own:
     dropNow  the session leaves the map at once, not after the awaits (the
              AFK sweep and the flood close call the door unawaited and must
              see the player gone at once; afk.test)
     rethrow  a failure inside reaches the caller (the runtime's close and
              the fight takeover's await always let it through; the others
              swallowed it) */
const FULL = Object.freeze({
  linger: true, spar: true, save: 'dirty', daily: true, body: true,
  duel: true, trade: true, party: true, botfp: true, consent: true, mute: true,
  leave: true, count: true, lastOut: true, copies: true,
});

export const LEAVE_WAYS = Object.freeze({
  /* the runtime's close: the socket has gone (index.js webSocketClose) */
  close:      Object.freeze({ ...FULL, rethrow: true }),
  /* the runtime's error (index.js webSocketError), never awaited */
  error:      FULL,
  /* the AFK sweep (tick.js), 4006 */
  afk:        Object.freeze({ ...FULL, dropNow: true }),
  /* the flood close (flood.js _floodClose) */
  flood:      Object.freeze({ ...FULL, dropNow: true }),
  /* the owner's kick / freeze (admin.js _adminPutOut) */
  kick:       FULL,
  /* the device lock or a stale key (devicelock.js _authPutOut) */
  device:     FULL,
  /* the character reset (persistence.js), 4005 */
  reset:      FULL,
  /* a join that threw after it named the character (join.js) */
  joinFailed: FULL,
  /* a body take that never stood at its body (bodytake.js _bodyTakeFail) */
  bodyTakeFailed: FULL,
  /* a second login while the old body is in a fight (join.js, v2.3.4432):
     the old session's real close, so the body lingers */
  takeoverFight: Object.freeze({ ...FULL, rethrow: true }),
  /* a second login outside a fight (join.js, v2.3.702): ONLY the bot summary
     and the save (v2.3.3174, v2.3.4377).  The rest is skipped on purpose so
     a reconnect does not cancel a trade (TRAPS §162) -- the list of what is
     a bug and what is not is the spec's (session-door.md). */
  takeover:   Object.freeze({ botfp: 'safe', save: 'takeover' }),
  /* a join refused before it named a character (join.js, verify.js): the
     session dropped, nothing else */
  refused:    Object.freeze({ dropNow: true }),
});

export const leaveMethods = {
  /* THE DOOR.  Returns a promise (the caller may await it); the session is
     out of the map when it settles, whatever happened inside. */
  _playerLeaves(ws, why, opts) {
    let row = LEAVE_WAYS[why];
    if (!row) throw new Error('session door: no way of leaving named ' + why);
    /* v2.3.4921: a refusal reaching a session that HAS joined runs the full
       leave, so its body does not stay standing (session-door.md "Known
       leftovers", the sweep's V3).  It takes a race: two joins on one socket,
       the second waiting on the account check (botsig.js _sigReverifyOk,
       `botsig_reverify`, off by default) while the first finished -- then the
       second's refusal dropped the session only, and the first's player stood
       in the world, walked by every tick, with no socket to close it.
       `refusejoined: false` in the live flags: the session dropped only. */
    if (why === 'refused' && this._refuseJoinedOn()) {
      const s = this.sessions.get(ws);
      if (s && s.phase === 'joined') row = FULL;
    }
    const p = this._leaveRun(ws, row, opts || null);
    if (row.dropNow) this.sessions.delete(ws);
    const done = () => { this.sessions.delete(ws); };
    return p.then(done, (e) => { done(); if (row.rethrow) throw e; });
  },

  _refuseJoinedOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'refusejoined') && !f.refusejoined);
  },

  /* The duties, as the close ran them (index.js webSocketClose before
     v2.3.4830, line for line), each behind its column. */
  async _leaveRun(ws, d, opts) {
    const session = this.sessions.get(ws);
    const first = !!session && session.phase !== 'gone';
    if (session) session.phase = 'gone';
    let _petsLeft = null;   /* v2.3.3120: see below */
    let _codexLeft = null;  /* v2.3.3209: the same, for the codex (codex.js) */
    let _fishLeft = null;   /* v2.3.4036: and the catches to weigh (fishlog.js) */
    let _accLeft = null;    /* v2.3.4545: and the shots and hits not yet written (accuracy.js) */
    if (first && session.id) {
      if (d.botfp === 'safe') {
        /* v2.3.3174: the takeover writes the bot fingerprint's summary first,
           as a clean close does.  _botfpOnJoin re-reads botstat: (written at
           most every PUT_MIN_MS, 30 s) over the LIVE record -- so a second
           login rolled the gathering and cooking hour counts back by up to
           30 s of strikes (botfp.test §9b). */
        try { this._botfpFlush(session); } catch (e) { /* evidence is best-effort; the join goes on */ }
      }
      if (d.save === 'takeover') {
        /* v2.3.4377: ...and the record's unsaved part, as a close does.  The
           join reads rpg: back from storage over the live state, so damage
           taken above 25% health (coalesced, persistence.js _saveRpgVitals),
           a paced tap past the burst (flood.js _saveRpgPaced) and up to
           REGEN_SAVE_MS of regen were given back: a script could reconnect
           to heal (state-machine sweep V3, S2-13).  `takeoversave: false` in
           the live flags skips it (liveops).  v2.3.4455: a kept body is not
           read back: nothing to save over. */
        const _tf = this._liveFlags;
        const _tsOff = !!(_tf && typeof _tf === 'object' && Object.prototype.hasOwnProperty.call(_tf, 'takeoversave') && !_tf.takeoversave);
        const _oldPs = this.playerState[session.id];
        if (!_tsOff && !(opts && opts.kept) && _oldPs && _oldPs._regenDirty) {
          try { await this._saveRpg(session.id, _oldPs); } catch (e) { /* the join goes on, as before */ }
        }
      }
      /* ═══ v2.3.3260: LEAVING IN THE MIDDLE OF A FIGHT, THE BODY STAYS ═══
         A player who leaves within 10 s of a hit between them and another
         player, in the Wheel, leaves their body behind for LINGER.MS,
         hittable (linger.js).  This close then does only what does not touch
         the body -- the flushes, the duel/trade/party/consent bookkeeping --
         and the rest (the body out of the world, its caches, player_leave)
         waits for _lingerEnd. */
      const _linger = d.linger ? this._lingerOnClose(session, Date.now()) : false;
      /* v2.3.3265: your sparring clones go with you (spar.js) -- after the
         linger's decision, which a spar keeps from happening */
      if (d.spar && this._sparOnLeave) this._sparOnLeave(session.id);
      if (d.body && this.playerState[session.id] && !_linger) this.playerState[session.id].disconnected = true;
      /* v2.3.1619: flush coalesced regen before the in-memory blob is
         dropped.  The regen tick only writes durably every
         REGEN_SAVE_MS, so a player who regenerated inside that window
         and then left would reload the PRE-regen pools on their next
         join -- visible as HP/stamina snapping backwards at the worst
         possible moment.  Awaited: this is the last chance to persist,
         a disconnect is not latency-critical, and an unawaited put can
         be lost to DO eviction.  No-ops (_regenDirty false) for every
         player whose last write was value-bearing. */
      const _ps = this.playerState[session.id];
      if (d.save === 'dirty' && _ps && _ps._regenDirty) await this._saveRpg(session.id, _ps);
      /* v2.3.3140: the daily quests' counting is written at most every 30 s;
         this is its last chance (dailyrewards.js).  Awaited for the same
         reason as the regen flush above -- and, like it, ONLY when there is
         something to write: a promise comes back just then, so a clean close
         stays synchronous for the AFK sweep (afk.test.mjs). */
      const _drClose = d.daily ? this._drOnClose(session.id) : null;
      if (_drClose) await _drClose;
      if (d.body && !_linger) {   /* v2.3.3260: a lingering body keeps all of this until _lingerEnd */
      /* v2.3.3327: where the worker had them, for the next join to be
         judged from (lastplace.js) */
      this._placeRemember(session.id, this.playerState[session.id], Date.now());
      delete this.playerState[session.id];
      /* v2.3.2534: drop the in-memory provenance ledger with the session.
         The record itself is durable in gear_prov:<pid> and reloads on the
         next join (gearprov.js); this is only the cache. */
      this._gearProvForget(session.id);
      this._bankForget(session.id);   /* v2.3.3785: the vault's cache, the same way (bank.js) */
      /* v2.3.3120: the pets record's cache goes with the session too
         (petbook.js).  A try counted only in memory is copied out here and
         written at the very END of this handler -- awaited, as the last
         chance to keep it, but after every synchronous step, because the AFK
         sweep (tick.js) calls this without awaiting and must still see the
         player leave at once. */
      _petsLeft = this._petbookDirtyCopy(session.id);
      this._petbookForget(session.id);
      /* v2.3.3209: and the codex's (codex.js): counting since its last write,
         copied out now and written at the end with the pets record */
      _codexLeft = this._codexDirtyCopy(session.id);
      this._codexForget(session.id);
      /* v2.3.4036: the catches to weigh, the codex's way (fishlog.js) */
      _fishLeft = this._fishlogDirtyCopy(session.id);
      this._fishlogForget(session.id);
      /* v2.3.4545: the shots and hits counted since the last write, the same way (accuracy.js) */
      _accLeft = this._accDirtyCopy(session.id);
      /* v2.3.3527: achievements hold nothing unwritten (achievements.js) */
      this._achvForget(session.id);
      delete this.stateHistory[session.id];
      }
      /* v2.3.3322: the extraction record is NOT deleted here any more.  A
         harvest's strike is paid only against its own start now
         (gathering.js HARVEST_PROOF), and the phone replays a strike its
         dropped socket ate after it rejoins (wsClient.js _holdForRejoin): the
         record must outlive the socket for the replay to be timed against it.
         _sweepStaleExtractions collects it at EXTRACTION_TIMEOUT_MS as ever,
         and nothing reads it for a player who is not here (_extractionShielded
         asks for the player first). */
      if (d.body && !_linger) this.dirtyPlayers.delete(session.id);   /* v2.3.3260: the body's stop goes out first */
      // v2.3.1121: an active duel gets a 15s reconnect grace (iOS tab
      // suspends and deploy bounces are routine) before _tickDuels
      // forfeits it -- so this runs BEFORE the consent clear, which
      // would otherwise end the fight unconditionally.
      if (d.duel) this._duelOnDisconnect(session.id);
      if (d.trade) this._trade2OnDisconnect(session.id); // v2.3.1132: a dropped party cancels the window
      if (d.party) this._partyOnDisconnect(session.id); // v2.3.1185: mark 'away' (grace), don't remove -- reconnects are routine
      if (d.botfp === true) this._botfpFlush(session); // v2.3.1146: final botstat: write so evidence survives the disconnect
      if (d.consent) this._clearPvpConsent(session.id); // v2.3.1116: consent doesn't survive a disconnect
      /* v2.3.1981: drop the in-memory mute Set (chatmod.js).  The list
         itself is durable in chat_mute:<pid> and reloads on the next
         join -- this only releases the fan-out lookup copy, so a room
         that has seen a thousand players does not hold a thousand Sets. */
      if (d.mute) this._chatModOnClose(session.id);
      if (d.leave && !_linger) this.broadcastAll({ type: 'player_leave', id: session.id });   /* v2.3.3260: a lingering body is still there */
      if (d.count) this.broadcastAll({ type: 'player_count', count: this.getPlayerCount() - 1 });
    }
    this.sessions.delete(ws);
    /* the room's tail runs on every close the runtime delivers, a second one
       included (a session already gone): the tick must stop in an empty room */
    if (d.lastOut) {
      /* v2.3.3260: the last one out ends every linger (linger.js): nobody is
         left to fight, and the tick that sweeps them stops just below */
      if (this.sessions.size === 0 && this._lingerBodies && this._lingerBodies.size) {
        for (const id of [...this._lingerBodies.keys()]) { const _le = this._lingerEnd(id); if (_le && _le.catch) _le.catch(() => {}); }
      }
      if (this.sessions.size === 0 && this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
      /* v2.3.5085: the day's book writes what waits (daybook.js bookFlush): an
         empty room's worker may be put to sleep before the next add (card E
         PR 6; the owner's yes of 2026-11-14) */
      if (this.sessions.size === 0) { const _bk = bookFlush(this); if (_bk && _bk.catch) _bk.catch(() => {}); }
    }
    if (d.copies) {
      if (_petsLeft) await this._petbookPut(session.id, _petsLeft);
      if (_codexLeft) await this._codexPut(session.id, _codexLeft);
      if (_fishLeft) await this._fishlogPut(session.id, _fishLeft);
      if (_accLeft) await this._accPut(session.id, _accLeft);
    }
  },
};
