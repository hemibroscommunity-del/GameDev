/* ═══ v2.3.1129: THREAT MACHINE (handoff backlog item C; spec in
 * docs/specs/threats.md) ═══
 *
 * The red-skull threat system (GDD §19 posture) replaces the PR1
 * interim consent observer.  What existed before was mostly theatre --
 * three code-verified breaks meant the feature NEVER worked end-to-end:
 *   - _observePvpConsent required payload.accepted, but the client's
 *     ThreatIncomingPanel sends action:'ignored'|'guards' -- consent
 *     was never granted, so an "accepted" threat still couldn't fight
 *     in town.
 *   - The threat popup's countdown did millisecond math on a value the
 *     handler defaulted to 120 (seconds) -- an incoming threat showed
 *     a ~0.12s bar.
 *   - "Call Guards" promised a 10% gold fine + 30-min gear lock in its
 *     button copy and implemented neither; the 30-min threat cooldown
 *     lived only in the threatener's own client.
 *
 * The machine (built like duel.js -- intercept-and-rebroadcast so the
 * existing panel UI keeps rendering the relayed messages):
 *   - pvp_threat: server stamps the authoritative countdown
 *     (2 min + 2 min per level the attacker is ABOVE the target,
 *     capped at 10 min -- higher-level gankers give their prey more
 *     time to respond) and enforces the 30-min cooldown server-side.
 *   - Ignore (or letting the countdown expire): the undirected consent
 *     pair is registered -- BOTH sides can fight in safe zones for
 *     CONSENT_MS, the same _pvpAllowed primitive duels use.  Ignoring
 *     a threat is accepting the risk; the target can also fight back.
 *   - Call Guards: the threatener is fined 10% of their coins (a pure
 *     gold SINK -- nobody receives it) and gear-locked for 30 minutes.
 *     No consent is granted.  The fine is a single mutation on live ps
 *     (the gamble pattern: one input-gated event, threatener online by
 *     construction since they just sent the relay).
 *
 * Gear lock: 'gearlock:<pid>' in STORAGE, not just ps -- ps is rebuilt
 * on rejoin, so an in-memory flag would make the punishment "reload
 * the page".  The join path loads it into ps._gearLockUntil; the five
 * equip-mutating handlers gate on _threatGearLocked, which also
 * re-echoes player_state -- the echo snaps back any local client
 * mutation (the same self-correction the armor-swap comment in
 * _handleStatsUpdate documents).  The cosmetic eqc/eql/eqs move relay
 * stays ungated: it's peer-render presentation, not the loadout.
 *
 * Deliberate deviation: no caps flag.  There is no client self-credit
 * path to gate -- old and new clients send identical messages; old
 * workers just relay them blindly (pre-existing behavior).
 *
 * In-memory by design: pending threats and the cooldown die with a
 * deploy (nuisance-scale loss); only the gear lock -- the actual
 * punishment -- survives in storage. */

export const THREAT = {
  BASE_MS: 120000,        // 2-min base countdown (client PVP_THREAT_BASE_COUNTDOWN)
  PER_LEVEL_MS: 120000,   // +2 min per level the attacker is above the target
  MAX_MS: 600000,         // countdown cap (10 min)
  LEVY_PCT: 0.10,         // Call Guards fine: 10% of the threatener's coins
  GEAR_LOCK_MS: 1800000,  // 30-min gear lock
  COOLDOWN_MS: 1800000,   // 30-min per-player threat cooldown (client mirrors)
  CONSENT_MS: 600000,     // ignored/expired threat: fight window (10 min)
};

export const threatMethods = {
  _threatSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
  },

  /* Intercept the relayed threat handshake (default-branch hook, the
   * duel/trade pattern).  Returns the message to rebroadcast or null
   * (forged/expired/cooldown halves are dropped, never relayed). */
  async _interceptThreat(fromId, msg) {
    // v2.3.1146: live-ops kill switch.  Return null (DROP, rule 15) --
    // relaying while "disabled" would trigger legacy client-side threat
    // handling on the receiving end.
    if (this._flagOn && this._flagOn('disable_threats')) return null;
    const payload = msg.payload || {};
    const target = payload.target;
    if (!target || typeof target !== 'string' || target === fromId) return null;
    if (!this._threats) this._threats = new Map(); // 'from>target' -> {deadline, ts}
    const now = Date.now();

    if (msg.type === 'pvp_threat') {
      const aPs = this.playerState[fromId];
      const tPs = this.playerState[target];
      if (!aPs || !tPs || aPs.dying || tPs.dying) return null;
      // Server-side cooldown.  In-memory (ps rebuilds on rejoin) --
      // bypassing it by reloading only buys more threat SPAM, which
      // the target can keep ignoring; the levy/lock punishments are
      // what must survive, and they live in storage.
      if (aPs._threatCdUntil && now < aPs._threatCdUntil) return null;
      aPs._threatCdUntil = now + THREAT.COOLDOWN_MS;
      // Authoritative countdown from SERVER levels (the client sends
      // fromLevel but it's never trusted).  More time the higher the
      // attacker is above the target.
      const diff = Math.max(0, (aPs.level || 1) - (tPs.level || 1));
      const countdown = Math.min(THREAT.BASE_MS + diff * THREAT.PER_LEVEL_MS, THREAT.MAX_MS);
      this._threats.set(fromId + '>' + target, { deadline: now + countdown, ts: now });
      payload.countdown = countdown; // ms -- the panel does ms math
      payload.settled = true;
      return msg;
    }

    // threat_response: fromId = responder (the threatened player),
    // target = the original threatener.
    const rec = this._threats.get(target + '>' + fromId);
    if (!rec || now > rec.deadline) return null; // forged / replayed / expired
    this._threats.delete(target + '>' + fromId);
    const action = payload.action;

    if (action === 'guards') {
      const aPs = this.playerState[target];
      let levy = 0;
      if (aPs) {
        // 10% fine -- pure sink, single mutation on live ps.
        levy = Math.floor((aPs.coins || 0) * THREAT.LEVY_PCT);
        if (levy > 0) {
          aPs.coins -= levy;
          this._saveRpg(target, aPs);
          this._queuePlayerStateFlush(target);
        }
        // Gear lock -- storage-backed so a reconnect can't shed it.
        const lockUntil = now + THREAT.GEAR_LOCK_MS;
        aPs._gearLockUntil = lockUntil;
        await this.state.storage.put('gearlock:' + target, lockUntil);
        this._threatSend(target, 'threat_penalty', { levy, lockUntil, by: fromId });
      }
      payload.levy = levy; // display only (the relay drives popups)
      payload.settled = true;
      return msg;
    }

    // 'ignored' (and any unrecognized action defaults to ignore --
    // matches the expiry semantics): both sides may fight.
    if (!this._pvpConsent) this._pvpConsent = new Map();
    this._pvpConsent.set(this._pvpPairKey(fromId, target), now + THREAT.CONSENT_MS);
    payload.settled = true;
    return msg;
  },

  // Piggybacks on the tick loop: an unanswered countdown expiring is
  // an ignore -- the pair may fight, both sides are told privately.
  _tickThreats(now) {
    if (!this._threats) return;
    for (const [k, rec] of this._threats) {
      if (now <= rec.deadline) continue;
      this._threats.delete(k);
      const cut = k.indexOf('>');
      const from = k.slice(0, cut), target = k.slice(cut + 1);
      if (!this._pvpConsent) this._pvpConsent = new Map();
      this._pvpConsent.set(this._pvpPairKey(from, target), now + THREAT.CONSENT_MS);
      this._threatSend(from, 'threat_expired', { target, attackable: true });
      this._threatSend(target, 'threat_expired', { from, attackable: true });
    }
  },

  /* Gear-lock gate for the equip-mutating handlers.  Returns true when
   * locked; also notifies the client (rate-limited) and re-echoes the
   * authoritative player_state so any local equip mutation snaps back. */
  _threatGearLocked(playerId, ps) {
    if (!ps || !ps._gearLockUntil || Date.now() >= ps._gearLockUntil) return false;
    const now = Date.now();
    if (!ps._gearLockNotifAt || now - ps._gearLockNotifAt > 2000) {
      ps._gearLockNotifAt = now;
      this._threatSend(playerId, 'gear_locked', { until: ps._gearLockUntil });
      const ws = this._wsBySessionId(playerId);
      if (ws) this._sendPlayerState(ws, playerId);
    }
    return true;
  },
};
