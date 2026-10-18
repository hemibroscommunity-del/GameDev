/* ═══ v2.3.3430: TEST MODE -- THE OWNER'S OWN CHARACTERS WITHOUT THE HONESTY CHECKS ═══
 *
 * The owner, offered three ways to test without the anti-cheat in the way,
 * chose this one (option 2): a switch in the Test panel, for their own
 * characters, stored per character so it keeps working after launch, with a
 * small tag on the screen while it is on.  Anything earned with it on stays
 * with the character -- the owner's plan is to start players fresh at launch.
 *
 * WHY IT IS NEEDED.  Since the anti-bot review (docs/specs/antibot-review.md)
 * the worker judges what an honest phone could not do: a move past the move
 * budget is followed, not taken; a harvest strike with no start of its own is
 * refused; a bow hit from past its reach is dropped; the first quests are
 * taken in order.  An honest phone never meets them -- but the owner's
 * testing does: the Test panel's warps and level buttons, a page reloaded in
 * the middle of a harvest, a quest finished out of order to look at the next
 * one.  Every one of those reads to the worker exactly like a script.
 *
 * WHAT IT TURNS OFF, for a test-mode character only (each a `_testMode(ps)`
 * at its own check, so a search for _testMode finds them all):
 *   - the speed limits on moving: the move budget and the per-message bound
 *     (movement.js _handleMove), the follow after it (_tickMoveFollow) and the
 *     reconnect's judge (lastplace.js _placeOnJoin) -- the phone's place is
 *     taken as it says;
 *   - the timing checks on harvesting and cooking: the too-early strike and
 *     the strike with no start of its own (gathering.js _handleNodeStrike),
 *     the 45 perfect harvests a minute (_ratedHarvestAccuracy), the 45 cooks a
 *     minute and the 900 ms between cooks (cooking.js), and the bot scoring
 *     with its 2,400-an-hour caps (botfp.js _botfpOnStrike, _botfpOnCook) --
 *     nothing is scored or flagged;
 *   - the limits on how fast and how far a hit on a MONSTER lands: the
 *     weapon slot, reach and rate and the paid special's window (hitproof.js,
 *     combat.js _handleMonsterDamage), the per-monster lanes (210 ms, three
 *     specials in 1.2 s) and the 400 px melee and 3,600 px Wheel reach;
 *   - the order of the first quests (quests.js _questBarred, v2.3.3179: the
 *     'first' and 'order' rules; a quest nobody can give is still refused);
 *   - the dodge-roll window against a player's blow (movement.js _rollOn,
 *     v2.3.3292): the phone's `dodging` is believed, as before it.
 *
 * WHAT IT LEAVES ON, for everyone, the test-mode character included: the
 * flood and message budgets, the join window and the per-address limits
 * (flood.js), the relay's allowlist and its rebuild in the sender's name
 * (relay.js), PRIVILEGED_EVENTS, the origin lock, every save and payment rule,
 * the login key and its lockouts, a frozen account, PvP consent and every
 * check on a hit between PLAYERS (pvpbalance.js), loot ownership, the zone
 * locks, the tool and level gates and a harvest's reach, damage being the
 * worker's own roll, and the admin key itself.  A test-mode character can
 * still only do what its phone does; it is simply not doubted.
 *
 * WHO CAN TURN IT ON.  Only the admin key, through the Test panel's
 * POST /api/admin/dev/testmode {playerId, on} (devtools.js), which the owner's
 * panel sends with its own player id.  NO WebSocket message turns it on or
 * off: anything a phone can SAY a script can say (the devtools.js header's
 * whole argument), so the switch lives where the key is.  Turning it ON needs
 * the character online (the id is then a real player, never a stray storage
 * key); turning it OFF works for any id.
 *
 * STORED as `testmode:<playerId>` -> {v, on: true, at, name}; present is on,
 * deleted is off (registered in the handoff's storage-key table).  Read once
 * at the join, BEFORE the reconnect's place is judged (join.js), and kept on
 * the player's state as `ps._testMode` -- memory only, never on the rpg blob
 * (handoff rule 1).  A read that fails is OFF: the checks stay on.  Deleted
 * with the character by a restart (persistence.js _resetCharacterData), which
 * starts it as a new player would; the Test panel turns it on again.
 *
 * TOLD to the phone in state_sync's `testMode` (true only while it is on and
 * allowed) and, when the owner flips it, in `test_mode {on}` -- PRIVILEGED:
 * forged into a relay, it would paint the tag on another player's screen.
 *
 * KILL SWITCH: `testmode: false` in the live flags turns every character's
 * test mode off at once, every check back on (a phone keeps its tag until it
 * joins again).
 */

export const TEST_MODE = Object.freeze({
  PREFIX: 'testmode:',
  V: 1,
  /* the Test panel's list of who has it (GET /api/admin/dev/testmodes) */
  LIST_MAX: 50,
  /* a player id is a storage key's tail: bounded, nothing but a string */
  ID_MAX: 96,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const testModeMethods = {
  /* the kill switch (header) */
  _testModeAllowed() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'testmode') && !f.testmode);
  },

  /* THE question every check asks: is this player in test mode right now? */
  _testMode(ps) {
    return !!(ps && ps._testMode === true && this._testModeAllowed());
  },

  /* the join's one read (join.js), before the place is judged */
  async _testModeRead(playerId) {
    if (typeof playerId !== 'string' || !playerId || playerId.length > TEST_MODE.ID_MAX) return false;
    try {
      const r = await this.state.storage.get(TEST_MODE.PREFIX + playerId);
      return !!(r && typeof r === 'object' && r.on === true);
    } catch (e) {
      return false;   /* fail closed: the checks stay on */
    }
  },

  /* POST /api/admin/dev/testmode {playerId, on} (devtools.js).  The admin key
     is checked by the route's caller (admin.js _adminFetch), and the op is
     written to the admin log there. */
  async _testModeSet(playerId, on) {
    if (typeof playerId !== 'string' || !playerId || playerId.length > TEST_MODE.ID_MAX) {
      return { ok: false, error: 'playerId required' };
    }
    const ps = this.playerState[playerId] || null;
    const want = on === true;
    if (want && !ps) return { ok: false, error: 'player not online' };
    const key = TEST_MODE.PREFIX + playerId;
    if (want) {
      const name = this._testModeName(playerId);
      await this.state.storage.put(key, { v: TEST_MODE.V, on: true, at: Date.now(), name });
    } else {
      await this.state.storage.delete(key);
    }
    if (ps) {
      ps._testMode = want;
      if (!want) {
        /* back under the checks from where the worker has them now: a move
           budget that starts full and a first move judged from here */
        ps._mvBudget = undefined; ps._mvBudgetAt = undefined;
        ps.lastMoveAt = Date.now();
      }
      this._testModeTell(playerId);
    }
    return { ok: true, on: want, online: !!ps, allowed: this._testModeAllowed() };
  },

  /* a live player's name: the worker keeps it on the session (join.js) */
  _testModeName(playerId) {
    const ps = this.playerState[playerId];
    if (ps && typeof ps.name === 'string' && ps.name) return ps.name.slice(0, 40);
    const ws = this._wsBySessionId(playerId);
    const sess = ws && this.sessions ? this.sessions.get(ws) : null;
    return sess && typeof sess.name === 'string' && sess.name ? sess.name.slice(0, 40) : null;
  },

  /* the phone's tag: on only while it is on AND allowed */
  _testModeTell(playerId) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify({ type: 'test_mode', payload: { on: this._testMode(this.playerState[playerId]) } }));
    } catch (e) { /* the player is gone; their next join reads the record */ }
  },

  /* GET /api/admin/dev/testmodes: who has it, newest first (a handful; bounded) */
  async _testModeList() {
    const out = [];
    try {
      const rows = await this.state.storage.list({ prefix: TEST_MODE.PREFIX, limit: TEST_MODE.LIST_MAX });
      for (const [k, r] of rows) {
        if (!r || typeof r !== 'object' || r.on !== true) continue;
        const id = k.slice(TEST_MODE.PREFIX.length);
        const live = this.playerState[id];
        out.push({ id, name: (live && this._testModeName(id)) || r.name || null, at: r.at || 0, online: !!live });
      }
    } catch (e) {
      return { ok: false, error: 'could not read the list' };
    }
    out.sort((a, b) => b.at - a.at);
    return { ok: true, allowed: this._testModeAllowed(), list: out };
  },

  /* for /api/admin/overview: is it allowed, and who is in it now */
  _testModeInfo() {
    let online = 0;
    for (const id in this.playerState) {
      if (this.playerState[id] && this.playerState[id]._testMode === true) online++;
    }
    return { allowed: this._testModeAllowed(), online };
  },
};
