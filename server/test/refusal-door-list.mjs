/* THE REFUSAL DOOR'S CLOSED LIST -- v2.3.4791 (refusal-door.test.mjs).
 *
 * Every place a handler of a phone's message stops early and answers
 * NOTHING, each with why that is right (or, `known`, why it is not yet
 * fixed).  The suite fails on an exit missing from this list, and on a line
 * here whose exit is gone: the list is exactly the code, and it only
 * shrinks (FROZEN below).
 *
 * WHY.  The phone draws an act before the worker answers (a quest's gold, a
 * weapon in the hand, a harvest's XP, a stat point spent), and protocol v2
 * sends only what CHANGED: a refusal changed nothing, so a bare `return`
 * sends nothing and the phone keeps its guess until the next login.  The
 * state-machine sweep found it again and again (TRAPS §284, §313; #1486,
 * #1500, #1504, #1496, #1537).  The rule: a refusal of something the phone
 * predicts answers it -- its system's error or result message, or
 * `_resendPlayerState(ws, id, fields)` for the fields the phone drew.
 *
 * ADDING A LINE.  Answer the phone instead whenever you can.  A line is for a
 * silence that is RIGHT: name its code (several, space-separated, when the
 * guard joins reasons with ||), add `: a note` where the code alone does not
 * say it, and raise FROZEN.listed by one in the same change, saying why in
 * the PR.  A `known` line is a bug kept on purpose for a later lane: it
 * needs its note, and raises FROZEN.known too.
 *
 * The keys are the guard as written (`if (...)`, the `else` or the block
 * around the exit), whitespace folded; a guard written twice in one handler
 * is `... #2`.  A handler is a `case` of _onMessage's switch or a method it
 * calls (HANDLERS below). */

/* Each code: why an exit with it may answer nothing. */
export const CODES = Object.freeze({
  norec: 'no session, socket or record for the request: the switch takes nothing before the join, and the join made the record',
  dead: 'the player is dying, dead, a spectator or away: the death, the respawn and the rejoin send the whole state',
  off: 'the system\'s live switch is off (liveops): the phone\'s cap gate keeps its button away',
  rate: 'a rate limit, cooldown, cadence or repeat: a spammer learns nothing, and an answer is one more message to pay for (the v2.3.1134 posture)',
  dup: 'an opId already seen: the first copy was answered',
  shape: 'malformed or unknown input (a wrong type, an id no table holds, a field missing): only a script or a tampered phone sends it, and an answer helps it probe',
  fight: 'a hit or attack the worker does not take (out of reach, wrong zone, staggered, a target that cannot be hurt): the phone\'s swing draws no damage; HP and hits come on the tick',
  tick: 'a move: the tick\'s state is the answer',
  report: 'the phone reporting its own state, which is its to say (the shield on its arm, telemetry): nothing is refused',
  noop: 'nothing to change: already so, or nothing left (a second tap after the first was answered, a miss the phone reported itself)',
  bot: 'an anti-bot drop: a bot learns nothing',
  snap: 'answered at the next step: the harvest\'s strike that follows is refused with the node and the skills sent back (strikesnap, #1537)',
  err: 'the worker\'s own storage read came back empty or threw: nothing changed',
  gone: 'names an invite, party, trade or alliance that is not (or no longer) there for this player: its system told the phone when it went',
  mute: 'the target muted the sender: a mute is private, so the sender is not told',
  inner: 'the call just before decides (an intercept or a sanitizer the switch reads the result of): its own exits are listed under its name',
  nolive: 'no live phone sends this (its button is gone or its system retired): only a script reaches it',
  delta: 'answered only with `_sendPlayerState`, the v2 delta, which sends nothing when nothing changed',
  known: 'NOT RIGHT, NOT FIXED YET: a refusal a real phone can meet in play that answers nothing (TRAPS §284); a candidate for a fix lane, whether or not the phone predicts it is not judged here',
});

/* Guards read the same everywhere: the request's record is missing, or its
   player is dying, dead or away.  Exempt in every handler (norec / dead
   above).  A closed set: a new spelling of the same check is listed per
   handler, not added here. */
export const STRUCTURAL = new Set([
  'if (!session || !session.id)', 'if (!session.id)', 'if (!sid)', 'if (!ps)', 'if (!me)', 'if (!pid)',
  'if (!_ps)', 'if (!attackerPs)', 'if (!this.playerState[pid])', 'if (!pid || !this.playerState[pid])',
  'if (!pid || !this.playerState || !this.playerState[pid])', 'if (!session.id || !this.playerState[session.id])',
  'if (!ps || ps.dying || ps.dead || ps.disconnected)', 'if (ps.dying || ps.dead || ps.disconnected)',
  'if (!ps || ps.dying || ps.dead)', 'if (!ps || ps.dead || ps.dying)', 'if (!ps || ps.disconnected)',
  'if (ps.dying || ps.disconnected)', 'if (attackerPs.dying || attackerPs.dead || attackerPs.disconnected)',
  'if (attackerPs.dying || attackerPs.disconnected)',
]);

/* What the reader reads besides every `_handle*` method a case calls:
   handlers named otherwise (EXTRA), and methods whose RESULT the switch
   reads, where only a return of nothing, null or false is a drop (VALUE). */
export const HANDLERS = Object.freeze({
  EXTRA: new Set(['_achvTitle', '_resolvePvPAttack', '_presence2Watch']),
  VALUE: new Set(['_interceptTrade', '_interceptDuel', '_interceptThreat', '_sanitizeChatRelay', '_sanitizeEmoteRelay']),
});

/* Every other method a case of the switch calls, and why it is not a handler
   of the phone's request.  A new one fails the suite until it is a handler
   (`_handle*`, EXTRA or VALUE) or listed here. */
export const INFRA = Object.freeze({
  _floodClose: 'closes the socket: the answer itself',
  _sigOnMove: 'bot signals: they count, they never refuse (botsig.js)',
  _sigOnHit: 'bot signals', _sigOnStart: 'bot signals', _sigOnStrike: 'bot signals', _sigOnCook: 'bot signals', _sigOnAbility: 'bot signals',
  _accShots: 'telemetry stamps on `track`', _clanStampTag: 'telemetry stamps on `track`', _capeStamp: 'telemetry stamps on `track`',
  _achvStamp: 'telemetry stamps on `track`', _levelStamp: 'telemetry stamps on `track`', _stampRecordLook: 'telemetry stamps on `track`',
  _lookRelay: 'tells the others a look changed (lookrelay.js)',
  _swingDropsGuard: 'lowers the guard on a swing (moveclaims.js); refuses nothing',
  _shopList: 'returns the shop\'s answer; the case sends it whatever it is (shop_state)',
  _shopQuote: 'returns the shop\'s answer; the case sends it (shop_quoted)',
  _shopSell: 'returns the shop\'s answer; the case sends it, refusals included (shop_result)',
  _shopBuy: 'returns the shop\'s answer; the case sends it, refusals included (shop_result)',
  _shopSend: 'the shop\'s answer itself',
  _wsBySessionId: 'finds the socket', _sendPlayerState: 'the echo after a paid sale',
  _relayAllowed: 'the relay list (relay.js): read by the default case\'s own guard',
  _socialLane: 'which allowance a relay spends', _socialAllow: 'the social allowance: read by the default case\'s own guard',
  _pfBowShot: 'times a bow shot for the trial (freeswing.js); refuses nothing',
  _dgShot: 'v2.3.4801: stamps a drawn arrow or a gathered bolt (drawgather.js); refuses nothing',
  _relayBuild: 'rebuilds a relay in the sender\'s name', _clanPartyOn: 'the clans-are-parties switch: read by the default case\'s own guard',
  _observeClanInvite: 'records a clan invite\'s pending half; refuses nothing',
  _sparSeen: 'shows a spar clone what it saw; refuses nothing',
});

/* A case with no code at all: the type is swallowed on purpose. */
export const SWALLOWED = Object.freeze({
  feedback: 'v2.3.2820: reports go by POST now; an old bundle\'s socket report must not fan out to the room',
});

/* The list's size when it was frozen (v2.3.4791).  Lower these as lines come
   off; raising one is a decision the PR names. */
export const FROZEN = Object.freeze({ listed: 270, known: 0 });   /* v2.3.4801: +1, the draw and gather's quiet drop (drawgather.js); v2.3.4880: -22, the workshop answers (forge, amulet forge, gem cut, smelter, armour forge); v2.3.4881: -14, the points, the chest, the capes and the reroll; v2.3.4882: -4, the purses; v2.3.4883: -6, the weapon stash; v2.3.4884: the heap burn's 4 recoded `fight`, the fire's 1 off; v2.3.4885: -2, the last three answer (party accept, trade2's weapon cap, the relay trade's run-out offer; and a party accept with no invite map, after a deploy), two right silences beside them named */

/* handler -> { guard: 'code[ code...][: note]' } */
export const ALLOW = {
  '_handlePose': {
    "if (session._poseAt && now - session._poseAt < POSE.MIN_GAP_MS)": "rate",
    "if ((ps.po || null) === id)": "noop",
  },
  '_handleDice': {
    "if (this._diceOff())": "off",
    "if (!ask)": "shape",
    "if (ps._diceAt && now - ps._diceAt < DICE.GAP_MS)": "rate",
  },
  '_handlePointsReset': {
    "if (!ps || ps.dead || ps.dying || !ps.prog3 || typeof ps.prog3 !== 'object')": "norec dead",
  },
  '_handleMove': {
    "if (typeof msg.x !== 'number' || typeof msg.y !== 'number')": "shape",
    "if (_zoneRejected)": "tick",
  },
  'case pong': {
    "if (typeof msg.ts === 'number' && msg.ts !== session.lastPing)": "shape",
  },
  'case track': {
    "if (!msg.data || typeof msg.data !== 'object')": "report",
  },
  '_resolvePvPAttack': {
    "if (this._pvpStaggered && this._pvpStaggered(attackerPs))": "fight",
    "if (kind === 'melee' && this._pvpDazed && this._pvpDazed(attackerPs))": "fight",
  },
  '_handleMonsterDamage': {
    "if (!monsterId || !zone)": "shape",
    "if (!monsters)": "fight",
    "if (!this._monsterDamageable(m))": "fight",
    "if (this._wheelSpectator && this._wheelSpectator(attackerPs))": "dead",
    "if (attackerPs.z !== zone)": "fight",
    "if (this._pvpStaggered && this._pvpStaggered(attackerPs))": "fight",
    "if (_hp && !this._hitWeaponOk(attackerPs, _effSlot))": "fight",
    "if (_rdx * _rdx + _rdy * _rdy > this.PVE_MELEE_RANGE * this.PVE_MELEE_RANGE)": "fight",
    "if (_reach !== null && _hdx * _hdx + _hdy * _hdy > _reach * _reach)": "fight",
    "if (_wdx * _wdx + _wdy * _wdy > WHEEL.RANGED_MAX * WHEEL.RANGED_MAX)": "fight",
    "if (_hp && !isSpecial && !this._hitRateTake(attackerPs, _effSlot, _hpNow, _dg ? (_dg.drop ? 0 : _dg.f) : 1))": "rate",
    "if (cad.s.length >= 3)": "rate",
    "if (nowTs - cad.n < 210)": "rate",
    "if (_f === null)": "fight",
    "if (!_t)": "rate: v2.3.4801, a drawn arrow's or gathered bolt's claim on a shot that lands nothing (sooner than its floor) or on a target it took already (drawgather.js _dgTake): the sword's `_f === null`",
  },
  '_handleExtractionStart': {
    "if (!nodeId || !zone || !skill)": "shape",
    "if (!list)": "shape",
    "if (!n || !n.alive)": "snap",
    "if (!this._hasGatherTool(ps, skill))": "snap",
    "if (!this._gatherLevelOk(ps, n))": "snap",
  },
  '_handleArrowBlast': {
    "if (refusal)": "fight",
  },
  '_handleNodeStrike': {
    "if (!id || !zone)": "shape",
    "if (!list)": "shape",
    "if (!n)": "shape",
    "if (!this._harvestRecoverOk(session.id, now))": "rate",
    "if (coercedAccuracy === 'miss')": "noop",
  },
  '_handleStatAllocate': {
    "if (!this._isValidStat(stat))": "shape",
  },
  '_handleProg3Allocate': {
    "if (!p3)": "norec",
    "if (typeof stat !== 'string')": "shape",
    "if (!sd)": "shape",
    "if (typeof cat !== 'string' || PROG3.SKILLS.indexOf(cat) < 0)": "shape",
  },
  '_handleCookRequest': {
    "if (typeof fishKey !== 'string' || !fishKey.startsWith('fish_'))": "shape",
    "if (!this._cookRateOk(ps))": "rate",
    "if (bot.drop)": "bot",
    "if (ps._lastCookAt && (nowCk - ps._lastCookAt) < COOK_FLOOR_MS && !this._testMode(ps))": "rate",
    "if ((ps.inventory[fishKey] || 0) <= 0)": "delta: the phone predicts no bag change on the channel path, only its popup (#1537 refuted it)",
  },
  '_handleAbilityUse': {
    "if (type !== 'dodge' && type !== 'lunge' && type !== 'retreat' && type !== 'swipe')": "shape",
  },
  '_handleAbility': {
    "if (typeof kind !== 'string')": "shape",
    "if (!Object.prototype.hasOwnProperty.call(STAM_ABILITIES, kind))": "shape",
  },
  '_handleElementBurst': {
    "if (this._wheelSpectator && this._wheelSpectator(ps))": "dead",
  },
  '_handleLoginSpinAsk': {
    "if (!session || !session.id || this._loginSpinOff())": "norec off",
  },
  '_handleLoginSpinGo': {
    "if (!session || !session.id || this._loginSpinOff())": "norec off",
    "catch { return; }": "err",
  },
  '_handleLoginSpinRound': {
    "if (!session || !session.id || this._loginSpinOff())": "norec off",
    "catch { return; }": "err",
  },
  '_handleChestOpen': {
    "if (invKey !== CHEST.KEY)": "shape",
    "if (this._chestOff())": "off",
    "if (opId && typeof opId === 'string' && await this._opSeen('chestop:' + opId))": "dup",
  },
  '_handleRewardsGet': {
    "if (ps._lastRewardsGetAt && now - ps._lastRewardsGetAt < 800)": "rate",
    "if (!rec)": "err",
  },
  '_handleDailySpin': {
    "if (this._spinOff())": "off",
    "if (ps._lastDailySpinAt && now - ps._lastDailySpinAt < SPIN.COOLDOWN_MS)": "rate",
    "if (opId && await this._opSeen('spinop:' + opId))": "dup",
    "if (!rec || !this.playerState[pid])": "err norec",
  },
  '_handleDailyReroll': {
    "if (this._dqOff())": "off",
    "if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= QUESTS.COUNT)": "shape",
    "if (!rec)": "err",
  },
  '_handleSeasonClaim': {
    "if (this._seOff())": "off",
    "if (!rec)": "err",
    "if (!claimed.length)": "noop",
  },
  '_handleHeapBurn': {
    "if (!ps || !this._heapBurnOn())": "norec off",
    "if (ps.z !== 'wheel' || ps.dead || ps.dying || ps.disconnected || ps._spar)": "fight: v2.3.4884, a heap tick the worker does not burn (off the Wheel, or in a spar): the phone predicts no damage (game/heapBurn.js draws only the flames), HP comes on the hits, and an answer would be a message a second while the phone stands in the fire",
    "if (!(ps.hp > 0))": "dead",
    "if (ps._arenaMatch || (this._duelFor && this._duelFor(pid)))": "fight: v2.3.4884, a heap tick the worker does not burn (in an arena match or a duel): the phone predicts no damage (game/heapBurn.js draws only the flames), HP comes on the hits, and an answer would be a message a second while the phone stands in the fire",
    "if (!this._wheelSafeAt(ps.x, ps.y))": "fight: v2.3.4884, a heap tick the worker does not burn (off the safe ground): the phone predicts no damage (game/heapBurn.js draws only the flames), HP comes on the hits, and an answer would be a message a second while the phone stands in the fire",
    "if (this._extractionShielded && this._extractionShielded(pid, t))": "fight: v2.3.4884, a heap tick the worker does not burn (a harvester takes no damage, hits.js rule 3): the phone predicts no damage (game/heapBurn.js draws only the flames), HP comes on the hits, and an answer would be a message a second while the phone stands in the fire",
    "if (t - (ps._heapBurnAt || 0) < HEAP_BURN.EVERY_MS)": "rate",
  },
  '_handleSmeltBar': {
    "if (this._smeltOff())": "off",
    "if (!r)": "shape",
    "if (!ps.inventory)": "norec",
  },
  '_handleFarmOpen': {
    "if (!this._farmRateOk(session.id))": "rate",
  },
  '_handleFarmAct': {
    "if (!this._farmRateOk(session.id))": "rate",
    "if (!own(OPS, op))": "shape",
    "if (!Array.isArray(rawBeds))": "shape",
    "if (!beds.length)": "shape",
    "if (!own(FARM.CROPS, cropId))": "shape",
  },
  '_handleFarmOrder': {
    "if (!this._farmRateOk(pid))": "rate",
    "if (!Number.isInteger(slot) || slot < 0 || slot >= FARM_ORDERS.PER_DAY)": "shape",
  },
  '_handleFarmBuy': {
    "if (!this._farmRateOk(session.id))": "rate",
    "else { return null;": "shape",
  },
  '_handleForgeArmor': {
    "if (!session || !session.id || this._armorForgeOff())": "norec off",
    "if (typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(ARMOR_FORGE.RECIPES, key))": "shape",
    "if (!ps || ps.dying || ps.dead || ps.disconnected || !ps.inventory)": "norec dead",
  },
  '_handleNmlAttack': {
    "if (this._nmlOff() || !this._nmlChoiceOn())": "off",
    "if (typeof aid !== 'string' || !own(this.playerState, aid))": "shape",
    "if (!a || a.dead || a.dying || a.disconnected)": "norec dead",
    "if (!tid || tid === aid || tid.length > 64 || !own(this.playerState, tid))": "shape",
    "if (!t || t.dead || t.dying || t.disconnected || !(t.hp > 0))": "fight",
    "if (a.z !== WHEEL_ZONE || t.z !== WHEEL_ZONE)": "fight",
    "if (typeof a.x !== 'number' || typeof t.x !== 'number' || Math.hypot(t.x - a.x, t.y - a.y) > NML.CHOOSE_R)": "fight",
    "if (now - (a._nmlChoiceAt || 0) < NML.CHOOSE_GAP_MS)": "rate",
    "if (!this._nmlAllowed(aid, tid))": "fight",
    "if (this._pvpConsent && (this._pvpConsent.get(this._pvpPairKey(aid, tid)) || 0) > now)": "fight",
  },
  '_handleNmlLockAsk': {
    "if (this._nmlOff() || !this._nmlLockOn())": "off",
    "if (typeof aid !== 'string' || !own(this.playerState, aid))": "shape",
    "if (!a || a.dead || a.disconnected || !vid || vid === aid || vid.length > 64 || !own(this.playerState, vid))": "norec dead shape",
    "if (!this._nmlLockedFrom(a, vid, now))": "noop",
    "if (now - (a._nmlLockAskAt.get(vid) || 0) < NML.LOCK_ASK_MS)": "rate",
    "if (!ws)": "norec",
    "catch { return false; }": "err",
  },
  '_handleNmlLockAllow': {
    "if (this._nmlOff() || !this._nmlLockOn())": "off",
    "if (typeof vid !== 'string' || !own(this.playerState, vid))": "shape",
    "if (!v || !aid || aid === vid || aid.length > 64 || !own(this.playerState, aid))": "norec shape",
    "if (now - (v._nmlAllowAt || 0) < NML.CHOOSE_GAP_MS)": "rate",
    "if (!this._nmlLockedFrom(a, vid, now))": "noop",
  },
  '_handleShieldWear': {
    "if (this._shieldWearOff() || !session || !session.id)": "off norec",
    "if (!ps || !payload || typeof payload !== 'object')": "norec shape",
    "if (payload.none === true)": "report",
    "if (!gid && !sig)": "report",
    "if (worn && same(worn))": "report",
    "if (this._fightLockHolds && this._fightLockHolds(session.id, 'fightlockequip'))": "report",
    "if (!piece)": "report",
  },
  '_handleCapeRedeem': {
    "if (!capeId)": "shape",
    "if (opId && typeof opId === 'string' && await this._opSeen('capered:' + opId))": "dup",
  },
  '_handleCapeEquip': {
    "if (ps.capeOff === next)": "noop",
  },
  '_handleEatRequest': {
    "if (typeof invKey !== 'string')": "shape",
    "if (meal.slot !== 'meal' && meal.slot !== 'now')": "shape",
    "if (!cropHeal && !invKey.startsWith('cooked_fish_'))": "shape",
  },
  '_handleDrinkRequest': {
    "if (typeof invKey !== 'string')": "shape",
    "if (dish && dish.slot !== 'brew')": "shape",
  },
  '_handleFiremakingRequest': {
    "if (typeof invKey !== 'string')": "shape",
    "if (!invKey.startsWith('wood_'))": "shape",
  },
  '_handleShopPurchase': {
    "if (typeof itemId !== 'string')": "shape",
    "if (!DIEGO_SHELF.includes(itemId))": "nolive: the shelf that sent it went in v2.3.2618",
    "if (!item)": "nolive: the shelf that sent it went in v2.3.2618",
    "if ((ps.coins || 0) < finalCost)": "nolive: the shelf that sent it went in v2.3.2618",
    "if (!this._applyShopItem(ps, item, session.id))": "nolive: the shelf that sent it went in v2.3.2618",
  },
  '_handleTrade2Open': {
    "if (!target || typeof target !== 'string' || target === session.id)": "shape",
  },
  '_handleTrade2Set': {
    "if (!s)": "gone",
  },
  '_handleTrade2Ready': {
    "if (!s)": "gone",
  },
  '_handleTrade2Confirm': {
    "if (!s)": "gone",
  },
  '_handleTrade2StageWeapon': {
    "if (!s)": "gone",
    "if (this._paceTake && !this._paceTake('t2wpn', session.id, PACE.T2WPN))": "rate",
    "if (!Number.isInteger(idx) || idx < 0 || idx >= ps.weaponStash.length)": "shape",
    "if (typeof (payload && payload.expectName) === 'string' && ps.weaponStash[idx] && ps.weaponStash[idx].name !== payload.expectName)": "shape",
    "if (!weapon)": "shape",
  },
  '_handleTrade2UnstageWeapon': {
    "if (!s || !s.weapons)": "gone",
    "if (at < 0)": "noop",
    "if (this._paceTake && !this._paceTake('t2wpn', session.id, PACE.T2WPN))": "rate",
  },
  '_handleTrade2Pets': {
    "if (!s)": "gone",
    "if (!raw)": "shape",
  },
  '_handlePartyInvite': {
    "if (!target || typeof target !== 'string' || target === fromId)": "shape",
    "if (_lastSent && Date.now() - _lastSent < PARTY.INVITE_REPEAT_MS)": "rate",
  },
  '_handlePartyAccept': {
    "if (!inviter || typeof inviter !== 'string' || inviter === accepterId)": "shape",
    "if (mine && mine === this._partyOf(inviter))": "noop: v2.3.4885, a second Join on an invite the first already took: the first put this player in the party and was answered",
  },
  '_handlePartyDecline': {
    "if (!inviter || typeof inviter !== 'string' || !this._partyInvites)": "shape",
    "if (!this._partyInvites.delete(inviter + '>' + session.id))": "noop",
  },
  '_handlePartyLeave': {
    "if (!p)": "noop",
  },
  '_handlePartyKick': {
    "if (!p || p.leader !== session.id)": "gone",
    "if (!target || target === session.id || !p.members.includes(target))": "shape",
  },
  '_handlePartyChat': {
    "if (!p)": "gone",
    "if (typeof text !== 'string')": "shape",
    "if (!text)": "shape",
    "if (!this._chatGuardOff() && !this._socialAllow(session, Date.now()))": "rate",
  },
  '_handleAllianceName': {
    "if (this._partyOf(pid) !== p || p.leader !== pid || !p.ally || !p.ally.on)": "gone",
  },
  '_handleAllianceWar': {
    "if (this._partyOf(pid) !== p || p.leader !== pid || !p.ally || !p.ally.on || p.ally.tag === tag)": "gone",
  },
  '_handleAllianceBoard': {
    "if (session._allyBoardAt && now - session._allyBoardAt < ALLIANCE.BOARD_EVERY_MS)": "rate",
  },
  '_handleAreaChat': {
    "if (!text)": "shape",
    "if (!this._laneAllow(session.id))": "rate",
    "if (!zone)": "norec",
    "if (this._chatRepeated(session, 'area', text))": "rate",
  },
  '_handleWhisper': {
    "if (!text)": "shape",
    "if (typeof to !== 'string')": "shape",
    "if (!to)": "shape",
    "if (!this._laneAllow(session.id))": "rate",
    "if (this._chatModMuted(targetId, session.id))": "mute",
  },
  '_handleStoreDm': {
    "if (!listingId || !text)": "shape",
  },
  '_handleStoreDmOpen': {
    "if (!listingId)": "shape",
  },
  '_handleStoreOffer': {
    "if (!listingId)": "shape",
  },
  '_handleStoreOfferCancel': {
    "if (!listingId)": "shape",
  },
  '_handleStoreOfferReply': {
    "if (!listingId || !buyerId)": "shape",
  },
  '_handleFriendRequest': {
    "if (!from || !target || typeof target !== 'string' || target === from)": "norec shape",
    "if (target.length > 64)": "shape",
    "if (mine.reqOut[target])": "noop",
  },
  '_handleFriendAccept': {
    "if (!session.id || !from || typeof from !== 'string')": "norec shape",
  },
  '_handleFriendDecline': {
    "if (!me || !from || typeof from !== 'string')": "norec shape",
    "if (!mine.reqIn[from])": "noop",
  },
  '_handleFriendRemove': {
    "if (!me || !fid || typeof fid !== 'string')": "norec shape",
    "if (!mine.list[fid])": "noop",
  },
  '_handleFriendDm': {
    "if (!from || !to || typeof to !== 'string' || typeof text !== 'string')": "norec shape",
    "if (!text)": "shape",
    "if (this._laneAllow && !this._laneAllow(from))": "rate",
    "if (this._chatModMuted(to, from))": "mute",
    "if (_mine >= PACE.DM_PER_SENDER_BOX)": "rate",
  },
  '_handleChatMute': {
    "if (!validId(target, me))": "shape",
  },
  '_handleGambleRequest': {
    "if (!Number.isFinite(wager) || wager < 10 || wager > 10000)": "shape",
    "if (ps._lastGambleAt && now - ps._lastGambleAt < 2000)": "rate",
  },
  '_handleAceFlipRequest': {
    "if (!Number.isFinite(stake) || stake < ACE_FLIP.MIN_STAKE)": "shape",
    "if (ps._lastAceFlipAt && now - ps._lastAceFlipAt < ACE_FLIP.COOLDOWN_MS)": "rate",
  },
  '_handleAceItemFlipRequest': {
    "if (ps._lastAceFlipAt && now - ps._lastAceFlipAt < ACE_ITEMS.COOLDOWN_MS)": "rate",
    "if (!want || typeof want !== 'object')": "shape",
    "if (!ps.inventory || typeof ps.inventory !== 'object')": "norec",
  },
  '_handleFishInspect': {
    "if (!info)": "shape",
    "if (!this.playerState[pid] || (book.rec.u[info.raw] || 0) <= 0)": "norec shape",
  },
  '_handleAccRequest': {
    "if (!ws)": "norec",
  },
  '_handleJackpotDeposit': {
    "if (this._flagOn && this._flagOn('disable_jackpot'))": "off",
    "if (!Number.isFinite(amount) || amount < CADENCE.JACKPOT_MIN || amount > CADENCE.JACKPOT_MAX)": "shape",
    "if (amount % CADENCE.JACKPOT_TICKET !== 0)": "shape",
  },
  '_handleClanJoinAccept': {
    "if (!inviter || typeof inviter !== 'string')": "shape",
    "if (!inv || Date.now() - inv.ts > CLANS.INVITE_TTL)": "nolive: clans are parties (v2.3.3321); reached only with that switch off",
    "if (!clan || clan.members.length >= CLANS.MAX_MEMBERS)": "nolive: clans are parties (v2.3.3321); reached only with that switch off",
    "if (this._clanOf(session.id))": "nolive: clans are parties (v2.3.3321); reached only with that switch off",
  },
  '_handleClanKick': {
    "if (!clan || clan.leaderId !== session.id)": "nolive: no phone sends clan_kick",
    "if (!target || target === session.id || !clan.members.includes(target))": "nolive: no phone sends clan_kick",
  },
  '_handleClanWarDeclare': {
    "if (!clan || clan.leaderId !== session.id)": "nolive: clans are parties (v2.3.3321); reached only with that switch off",
    "if (!defenderTag || defenderTag === clan.tag)": "nolive: clans are parties (v2.3.3321); reached only with that switch off",
  },
  '_handleEquipRequest': {
    "if (!this._isWeaponSlot(slot))": "shape",
    "if (!Number.isInteger(stashIdx) || stashIdx < 0)": "shape",
  },
  '_handleSellWeapon': {
    "if (!Number.isInteger(stashIdx) || stashIdx < 0)": "shape",
  },
  '_handleUnequipRequest': {
    "if (!this._isValidEquipSlot(slot))": "shape",
    "if (!current)": "noop",
  },
  '_handleSetActiveSlot': {
    "if (ps.activeSlot === slot)": "noop",
  },
  '_handleForgeWeapon': {
    "if (weaponType !== 'greatsword' && weaponType !== 'sword' && weaponType !== 'bow' && weaponType !== 'staff')": "shape",
    "if (typeof tierKey !== 'string')": "shape",
    "if (wantWw !== !!isWoodwork)": "shape",
    "if (!Object.prototype.hasOwnProperty.call(table, tierKey))": "shape",
    "if (!tier)": "shape",
  },
  '_handleAmuletForge': {
    "if (!tier)": "shape",
    "if (typeof gem !== 'string' || !AMULET_GEMS.has(gem))": "shape",
    "if (!Array.isArray(ps.weaponStash) || !Number.isInteger(idx) || idx < 0 || idx >= ps.weaponStash.length)": "shape",
    "else { return; // unknown target -- deny by default": "shape",
    "else { return; // unknown op -- deny by default": "shape",
  },
  '_handleGemCut': {
    "if (typeof gem !== 'string' || !AMULET_GEMS.has(gem))": "shape",
  },
  '_handleQuestAccept': {
    "if (typeof questId !== 'string')": "shape",
    "if (!Object.prototype.hasOwnProperty.call(rewards, questId))": "shape",
    "if (!reward)": "shape",
  },
  '_handleQuestTurnIn': {
    "if (typeof questId !== 'string')": "shape",
    "if (!Object.prototype.hasOwnProperty.call(rewards, questId))": "shape",
    "if (!reward)": "shape",
  },
  '_handleCharacterReset': {
    "if (!payload || payload.confirm !== true)": "shape",
  },
  'case (default)': {
    "if (PRIVILEGED_EVENTS.has(msg.type))": "shape",
    "if (!this._relayAllowed(msg.type))": "shape",
    "if (_social && !this._socialAllow(session, _now))": "rate",
    "if (session.relayTokens < 1)": "rate",
    "if (msg.type === 'chat' && !this._sanitizeChatRelay(session, msg))": "inner",
    "if (msg.type === 'emote' && !this._sanitizeEmoteRelay(session, msg))": "inner",
    "if (!msg)": "inner",
    "if (!msg) #2": "inner",
    "if (this._clanPartyOn())": "nolive",
    "if (!msg) #3": "inner",
  },
  '_sanitizeChatRelay': {
    "if (!p || typeof p !== 'object')": "norec shape",
    "if (!text)": "shape",
    "if (this._chatRepeated(session, 'room', text))": "rate",
  },
  '_sanitizeEmoteRelay': {
    "if (this._emotesOff())": "off",
    "if (!emoteMoveListed(mv) || this._movesOff())": "shape off",
    "if (!emoteListed(e))": "shape",
  },
  '_interceptTrade': {
    "if (!target || typeof target !== 'string' || target === fromId)": "shape",
    "if (target.length > 64)": "shape",
    "if (!offer)": "shape",
    "if (!pending)": "gone: v2.3.4885, a forged accept, or a replayed one whose first settled the offer (an offer that ran out answers trade_reject now)",
  },
  '_interceptDuel': {
    "if (!target || typeof target !== 'string' || target === fromId)": "shape",
    "if (target.length > 64)": "shape",
  },
  '_interceptThreat': {
    "if (this._flagOn && this._flagOn('disable_threats'))": "off",
    "if (!target || typeof target !== 'string' || target === fromId)": "shape",
    "if (!this.OPEN_PVP)": "off",
    "if (!aPs || !tPs || aPs.dying || tPs.dying)": "norec dead",
    "if (aPs._threatCdUntil && now < aPs._threatCdUntil)": "rate",
    "if (!rec || now > rec.deadline)": "gone",
  },
};
Object.freeze(ALLOW);
