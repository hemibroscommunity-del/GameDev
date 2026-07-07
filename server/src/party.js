/* ═══ v2.3.1175: PARTY ROSTER (handoff backlog item D; spec in
 * docs/specs/party.md) ═══
 *
 * The co-op layer already works without a roster: kill credit is
 * damage-contribution (GDD §7, index.js xpRecipients) and dungeon boss
 * HP scales by players present (dungeon.js PARTY_HP_SCALE).  What was
 * missing is the SOCIAL surface: knowing who you're running with,
 * seeing their HP/zone from across the map, and inviting a friend
 * before you both walk into the same dungeon.  Item D's charter is
 * explicit: UI + a roster, do NOT touch the §7 share math — and this
 * module doesn't; joining a party changes no combat/XP/loot numbers.
 *
 * Shape (the duel/trade2 handshake pattern):
 *   party_invite {target}    Any member (or a partyless player) invites.
 *                            Recorded per-sender-session ('from>to' with
 *                            a TTL, rule 14) and relayed as a private
 *                            party_invited to the target.
 *   party_accept {target}    Honored only against a live invite recorded
 *                            from the INVITER's own connection; a forged
 *                            or expired accept is dropped (rule 15
 *                            posture — nothing to relay, so just drop).
 *   party_decline {target}   Clears the invite; inviter gets a private
 *                            party_error {reason:'declined'}.
 *   party_leave              Leave; leadership promotes to the oldest
 *                            remaining member; a 1-member party
 *                            disbands.
 *   party_kick {target}      Leader only.
 *
 * Every roster change re-echoes the full snapshot to every online
 * member as party_state (PRIVILEGED) — the client HUD is a pure
 * renderer of server truth, same posture as trade2_state.  The tick
 * also re-echoes at VITALS_MS cadence so member HP bars and zone tags
 * stay live CROSS-ZONE (the whole point of the HUD: you can't see a
 * partymate's sprite from another zone).
 *
 * Storage: NONE, deliberately.  A party holds no escrowed value, so
 * per rule 11 in-memory is the correct tier — a worker deploy wipes
 * rosters and loses nothing but a re-invite.  Clients clear their
 * party state on every state_sync (fresh join/reconnect) and the join
 * path re-sends the roster if the server still has one, so a deploy
 * leaves no ghost HUD.  Disconnects get an OFFLINE_GRACE_MS window
 * (iOS tab suspends and deploy bounces are routine — the duel grace
 * lesson) shown as 'away' before the sweep removes them. */

export const PARTY = {
  MAX_SIZE: 4,             // matches dungeon.js PARTY_HP_SCALE's 4-slot table
  INVITE_TTL: 60000,       // 1 min to accept an invite
  VITALS_MS: 2000,         // roster re-echo cadence (live HP/zone)
  OFFLINE_GRACE_MS: 120000 // 'away' window before a dropped member is removed
};

export const partyMethods = {
  _partySend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
  },

  _partyOf(playerId) {
    return (this._partyByPlayer && this._partyByPlayer.get(playerId)) || null;
  },

  // Display name: playerState.name (join data carries it for real
  // clients) with a session-name fallback (some tests/minimal joins
  // omit it from data).
  _partyNameOf(pid) {
    const ps = this.playerState[pid];
    if (ps && ps.name) return ps.name;
    for (const [, s] of this.sessions) { if (s.id === pid) return s.name || 'Bro'; }
    return 'Bro';
  },

  _partyWire(p) {
    return {
      id: p.id,
      leader: p.leader,
      state: 'open',
      members: p.members.map((pid) => {
        const ps = this.playerState[pid];
        const meta = p.meta[pid] || {};
        return {
          id: pid,
          name: meta.name || 'Bro',
          level: ps ? (ps.level || 1) : (meta.level || 1),
          hp: ps ? Math.max(0, Math.round(ps.hp !== undefined ? ps.hp : 100)) : 0,
          maxHp: ps ? (ps.maxHp || 100) : (meta.maxHp || 100),
          zone: ps ? (ps.z || 'town') : null,
          away: !ps,
          dead: !!(ps && (ps.dying || ps.dead)),
        };
      }),
    };
  },

  _partyBroadcast(p, extra) {
    const wire = Object.assign(this._partyWire(p), extra || {});
    for (const pid of p.members) this._partySend(pid, 'party_state', wire);
  },

  _handlePartyInvite(session, payload) {
    const fromId = session.id;
    const ps = this.playerState[fromId];
    if (!ps) return;
    const target = payload && payload.target;
    if (!target || typeof target !== 'string' || target === fromId) return;
    if (!this._partyInvites) this._partyInvites = new Map(); // 'from>to' -> ts
    const targetPs = this.playerState[target];
    if (!targetPs) {
      return this._partySend(fromId, 'party_error', { reason: 'target-gone' });
    }
    if (this._partyOf(target)) {
      return this._partySend(fromId, 'party_error', { reason: 'target-busy', name: this._partyNameOf(target) });
    }
    const mine = this._partyOf(fromId);
    if (mine && mine.members.length >= PARTY.MAX_SIZE) {
      return this._partySend(fromId, 'party_error', { reason: 'full' });
    }
    this._partyInvites.set(fromId + '>' + target, Date.now());
    this._partySend(target, 'party_invited', {
      from: fromId,
      fromName: this._partyNameOf(fromId),
      partySize: mine ? mine.members.length : 1,
    });
  },

  _handlePartyAccept(session, payload) {
    const accepterId = session.id;
    const inviter = payload && payload.target;
    if (!inviter || typeof inviter !== 'string' || inviter === accepterId) return;
    if (!this._partyInvites) return; // forged accept with no invite ever recorded
    const ts = this._partyInvites.get(inviter + '>' + accepterId);
    this._partyInvites.delete(inviter + '>' + accepterId);
    // Forged / replayed / expired accepts are DROPPED (rule 15 posture:
    // there is no relay half here, so silence is the whole answer).
    if (!ts || Date.now() - ts > PARTY.INVITE_TTL) return;
    const ps = this.playerState[accepterId];
    const inviterPs = this.playerState[inviter];
    if (!ps) return;
    if (!inviterPs) {
      return this._partySend(accepterId, 'party_error', { reason: 'target-gone' });
    }
    if (this._partyOf(accepterId)) {
      return this._partySend(accepterId, 'party_error', { reason: 'busy' });
    }
    if (!this._parties) this._parties = new Map();
    if (!this._partyByPlayer) this._partyByPlayer = new Map();
    let p = this._partyOf(inviter);
    if (p) {
      // Capacity re-check at accept: the party may have filled since
      // the invite went out (the invite's snapshot is NOT authoritative).
      if (p.members.length >= PARTY.MAX_SIZE) {
        return this._partySend(accepterId, 'party_error', { reason: 'full' });
      }
    } else {
      p = {
        id: crypto.randomUUID(),
        leader: inviter,
        members: [inviter],
        meta: { [inviter]: { name: this._partyNameOf(inviter), level: inviterPs.level || 1, maxHp: inviterPs.maxHp || 100 } },
        ts: Date.now(),
        lastVitals: 0,
      };
      this._parties.set(p.id, p);
      this._partyByPlayer.set(inviter, p);
    }
    p.members.push(accepterId);
    p.meta[accepterId] = { name: this._partyNameOf(accepterId), level: ps.level || 1, maxHp: ps.maxHp || 100 };
    this._partyByPlayer.set(accepterId, p);
    this._partyBroadcast(p, { joined: accepterId });
  },

  _handlePartyDecline(session, payload) {
    const inviter = payload && payload.target;
    if (!inviter || typeof inviter !== 'string' || !this._partyInvites) return;
    // Only a real pending invite produces a decline notice — otherwise
    // this would be a free "X declined" popup-spam surface.
    if (!this._partyInvites.delete(inviter + '>' + session.id)) return;
    const ps = this.playerState[session.id];
    this._partySend(inviter, 'party_error', { reason: 'declined', name: this._partyNameOf(session.id) });
  },

  _handlePartyLeave(session) {
    const p = this._partyOf(session.id);
    if (!p) return;
    this._partyRemoveMember(p, session.id, 'left');
  },

  _handlePartyKick(session, payload) {
    const p = this._partyOf(session.id);
    const target = payload && payload.target;
    if (!p || p.leader !== session.id) return; // leader-only
    if (!target || target === session.id || !p.members.includes(target)) return;
    this._partyRemoveMember(p, target, 'kicked');
  },

  /* Shared removal core (leave / kick / offline-grace expiry).  The
   * removed player gets a terminal party_state {state:'none'}; a party
   * left with one member disbands (a solo "party" is just a player). */
  _partyRemoveMember(p, pid, reason) {
    p.members = p.members.filter((m) => m !== pid);
    delete p.meta[pid];
    if (this._partyByPlayer) this._partyByPlayer.delete(pid);
    this._partySend(pid, 'party_state', { state: 'none', reason });
    if (p.members.length <= 1) {
      this._parties.delete(p.id);
      for (const rest of p.members) {
        if (this._partyByPlayer) this._partyByPlayer.delete(rest);
        this._partySend(rest, 'party_state', { state: 'none', reason: 'disbanded' });
      }
      return;
    }
    if (p.leader === pid) p.leader = p.members[0]; // oldest member inherits
    this._partyBroadcast(p, { removed: pid, reason });
  },

  // webSocketClose hook: mark away (grace), don't remove — iOS tab
  // suspends and deploy bounces are routine (the duel-grace lesson).
  _partyOnDisconnect(playerId) {
    const p = this._partyOf(playerId);
    if (!p || !p.meta[playerId]) return;
    p.meta[playerId].awaySince = Date.now();
    this._partyBroadcast(p);
  },

  /* Join hook.  MUST run after the joiner's state_sync send: clients
   * clear their party HUD on every state_sync (a deploy wipes rosters,
   * so stale client state must not survive a reconnect), and this
   * re-send is what restores the HUD when the roster DID survive. */
  _partyOnRejoin(playerId) {
    const p = this._partyOf(playerId);
    if (!p) return;
    if (p.meta[playerId]) delete p.meta[playerId].awaySince;
    this._partyBroadcast(p);
  },

  // Tick housekeeping: expire invites, sweep away-members past grace,
  // re-echo rosters at VITALS_MS so HP/zone stay live cross-zone.
  _tickParties(now) {
    if (this._partyInvites) {
      for (const [k, ts] of this._partyInvites) {
        if (now - ts > PARTY.INVITE_TTL) this._partyInvites.delete(k);
      }
    }
    if (!this._parties) return;
    for (const p of [...this._parties.values()]) {
      for (const pid of [...p.members]) {
        const meta = p.meta[pid];
        if (meta && meta.awaySince && now - meta.awaySince > PARTY.OFFLINE_GRACE_MS) {
          this._partyRemoveMember(p, pid, 'offline');
        }
      }
      if (!this._parties.has(p.id)) continue; // removal disbanded it
      if (now - p.lastVitals >= PARTY.VITALS_MS) {
        p.lastVitals = now;
        this._partyBroadcast(p);
      }
    }
  },
};
