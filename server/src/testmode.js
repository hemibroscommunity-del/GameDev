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
 *     reconnect's judge (lastplace.js _placeOnJoin, and v2.3.5722 its stand
 *     for a join naming no place, `joinplace`) -- the phone's place is taken
 *     as it says;
 *   - the timing checks on harvesting and cooking: the too-early strike and
 *     the strike with no start of its own (gathering.js _handleNodeStrike),
 *     the 45 perfect harvests a minute (_ratedHarvestAccuracy), a perfect held
 *     to an honest gesture's time and to 15 in any 20 strikes (v2.3.5900,
 *     gathering.js _harvestGraded, harvestgrade.js, `harvestgrade`, an opt-in,
 *     ON since v2.3.5906: asked through the strike's `_tm`), the 45 cooks a
 *     minute and the 900 ms between cooks (cooking.js), a cook's result held
 *     to the cook it started (v2.3.5553, cooking.js _cookStartOk,
 *     `cookstart`, ON since v2.3.5727), and the bot scoring
 *     with its 2,400-an-hour caps (botfp.js _botfpOnStrike, _botfpOnCook) --
 *     nothing is scored or flagged; and the server's own bot signals (v2.3.3731,
 *     botsig.js _sigSkip, _sigOnWindup, _sigReverifyOk): nothing measured,
 *     flagged or re-checked;
 *   - the limits on how fast and how far a hit on a MONSTER lands: the
 *     weapon slot, reach and rate and the paid special's window (hitproof.js,
 *     combat.js _handleMonsterDamage), the per-monster lanes (210 ms, three
 *     specials in 1.2 s) and the 400 px melee and 3,600 px Wheel reach; the
 *     sword's swing and its 150 px reach and believed shove (v2.3.5548,
 *     swordswing.js, `swordswing`) and a bow's claim held to an arrow seen
 *     (v2.3.5550, bowshot.js, `bowshot`; within it its reach from where the
 *     arrow left, v2.3.5901 `bowreach`, and its path, v2.3.5904 `bowpath`),
 *     both asked in combat.js;
 *   - the order of the first quests (quests.js _questBarred, v2.3.3179: the
 *     'first' and 'order' rules; a quest nobody can give is still refused);
 *   - the dodge-roll window against a player's blow (movement.js _rollOn,
 *     v2.3.3292): the phone's `dodging` is believed, as before it.
 * And one that asks without being a check (v2.3.4545, accuracy.js
 * _accDayAdd): a test-mode character's shots and hits are left out of the
 * owner's totals a day -- the owner's testing is not the players' aim.  It
 * turns nothing off: the character's own accuracy is counted as anyone's.
 * And another (v2.3.5627, silence.js _ownerDeviceNote): a device a
 * test-mode character joins from is kept as the owner's (`ownerdev:`), so a
 * freeze's device rule never holds the owner's own phone.  It turns nothing
 * off either.  And another (v2.3.6480, actor.js actorTest): a record that
 * keeps who acted marks a test-mode character's (an `xfer:` row's actor
 * `test: true`; the day's book's `test` key, apart from play).  It turns
 * nothing off either.  And another (v2.3.6482, playtrace.js, grand plan
 * 10.8): a test-mode sitting's first ten active minutes are recorded (one
 * `play_trace:` row, labelled human) and, while they are, the checks above
 * run IN SHADOW -- the move budget on a budget of the recording's own
 * (traceMoveShadow), the too-early and startless strike (traceWould,
 * traceStartless), the cook's rate, floor and start (traceCookRate,
 * traceWould), the hit proof's chain (traceHitShadow) -- and what they would
 * have refused is counted on the row; botfp, botsig, the quests' order,
 * lastplace and the roll window are not shadowed (the league's replay is
 * their shadow).  It turns nothing off either.
 *
 * WHAT IT LEAVES ON, for everyone, the test-mode character included: the
 * flood and message budgets, the join window and the per-address limits
 * (flood.js), the relay's allowlist and its rebuild in the sender's name
 * (relay.js), PRIVILEGED_EVENTS, the origin lock, a web request's body cap
 * (v2.3.5720, wire/door.js BODY_CAP: `bodycap`), the look relay's pace and
 * bytes (v2.3.5721, lookrelay.js LOOK_PACE: `lookpace`), a Workshop run's
 * safe ground (v2.3.5725, dungeon.js: `dungeonground`), a move's fields held
 * to their form (v2.3.5723, movement.js MOVE_FIELDS: `movefields`), a relay's
 * fields typed and the room's send to joined sockets only (v2.3.5724,
 * relay.js RELAY_FORMS: `relaytyped`), the room ceiling's honest floor
 * (v2.3.5728, flood.js HONEST_PER_S: `ceilfair`), a guest's share of the
 * places, a played character's seat and an IPv6 /48 counted (v2.3.5729,
 * seathold.js GUEST_SHARE, flood.js ip48Key: `guestshare`), a join taking
 * only what is its own (v2.3.5730, join.js, seathold.js: `joinguard`), a
 * duel's frames to its two players alone (v2.3.5731, eventplace.js
 * duelPlaceOf: `duelquiet`), a join's colour and avatar held to their forms
 * (v2.3.5733, join.js, lookform.js: `lookjoin`), the owner's routes
 * with no key and the public reads at the edge (v2.3.5726, wire/door.js:
 * the worker settings `EDGE_GUARD`, `EDGE_CACHE`), every save and payment rule,
 * the login key and its lockouts, a frozen account, PvP consent and every
 * check on a hit between PLAYERS (pvpbalance.js), loot ownership, the zone
 * locks, the tool and level gates and a harvest's reach, damage being the
 * worker's own roll, and the admin key itself.  A test-mode character can
 * still only do what its phone does; it is simply not doubted.
 * Also left on, for everyone (v2.3.5801, card RV): a General Store sell
 * filed under its weapon's own tier, and a refund and its order's delete in
 * one write (market.js: `mkttier`, `mktheal`); the rise chest's stamp kept
 * for good by the oplog prune (v2.3.5802, inbox.js OP_PRUNE.KEEP: `risekeep`);
 * goods credited in the dying seconds kept through the respawn (v2.3.5803,
 * inbox.js _applyCreditToPs: `dyingkeep`); No man's land's killer paid in
 * the victim's own write (v2.3.5804, nomansland.js _nmlOnDeath: `nmlonewrite`);
 * a duel challenge's cards paced and a muted challenger unheard, a decline
 * only of a real challenge, the pot and its escrow's delete one write
 * (v2.3.5805, duel.js: `duelpace`, `duelonewrite`); a muted sender's shop-thread
 * line not shown on open, and a player who mutes you away to you
 * (v2.3.5806, storechat.js, chatlanes.js, party.js: `storemute`, `mutehides`);
 * a player's avatar and colour in the game's own forms on the board and on
 * the page (v2.3.5807, lookform.js, src/game/lookForm.js: `?lookform=0`); an
 * old key's after-join check held while `oldkeyheld` is (v2.3.5808, loginkeys.js);
 * an offer's Yes waits for a bid half made, and a payment and its escrow's
 * delete one write (v2.3.5809, storeoffer.js, trade2.js, gladiator.js:
 * `offerpend`, `leftoverheal`); a friendship both sides or neither, and a request
 * nobody answers let go after 30 days (v2.3.5811, friends.js: `friendfix`); the
 * cleaner's blank and hidden characters, and a new pet or alliance name held
 * to the name rule (v2.3.5814, chatguard.js, petbook.js, alliance.js:
 * `cleanmore`, `namestaff`); the rewind's plan names the owner's login acts since
 * its time (v2.3.5815, restore.js: `rewindsays`); the jackpot's deposit asks
 * the purse again after its awaits (v2.3.5813, cadence.js: `jackcheck`); the
 * Auction House's `/mine` shows a player's bids only to that player's own
 * session (v2.3.5817, store.js: `minebids`); a join's shield and cosmetic
 * claims merged only when the ledger backs them (v2.3.5812, gearstash.js:
 * `shieldclaim`); a daily spin's and the login spin's paid
 * mark in the credit's own run (v2.3.5810, dailyrewards.js, loginspin.js:
 * `paidmark`); a `track`'s avatar, colour and look words in the game's own
 * forms (v2.3.5819, lookform.js: `lookform`); the daily chest's stamp and
 * save in one write (v2.3.6021, dailychest.js, under `paidmark`); a body in
 * its dying seconds stakes, offers and trades nothing (v2.3.6022, gladiator.js,
 * storeoffer.js, trade.js, trade2.js, under V3's `deadtake`); the General
 * Store's book read a page an await and the room's only once whole
 * (v2.3.6023, market.js, the page under V5's `listcap`); a re-listed noted
 * order's first taker paid back before its delete under `mktsettle: false`
 * (v2.3.6025, market.js: `mktback`); the daily spin's pace kept by the room
 * across a rejoin (v2.3.6024, dailyrewards.js, under V3's `pacekeep`).
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
      this._send(ws, { type: 'test_mode', payload: { on: this._testMode(this.playerState[playerId]) } });
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
