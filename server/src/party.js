/* ═══ v2.3.1185: PARTY ROSTER (handoff backlog item D; spec in
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
  OFFLINE_GRACE_MS: 120000,// 'away' window before a dropped member is removed
  CHAT_MAX: 200,           // v2.3.1212: party-chat line length clamp
  INVITE_REPEAT_MS: 5000   // v2.3.1970: min gap between two invite cards from the same inviter
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

  /* v2.3.1212 (item D follow-up): party chat -- a party-scoped chat
   * relay.  Per the handoff note it is its OWN validated case (rule 13),
   * NOT the default room-wide rebroadcast: the sender must be in a party
   * and the line is delivered ONLY to that party's members, stamped with
   * the SERVER's own identity for the sender (from = session.id, name
   * from server state) so the origin can't be forged.  Text is length-
   * clamped and control-stripped; the client renders it as plain text
   * (no markup), so there is no injection surface.  party_chat is
   * PRIVILEGED (index.js) -- a client can't inject the server-shaped
   * event.  No storage (chat is ephemeral, rule 11).  Deploy-order: the
   * client gates the /p send on its OWN narrow caps.partyChat (rule 19 /
   * TRAPS #9), NOT caps.party -- a worker with parties (v2.3.1185) but
   * no party_chat case (<=v2.3.1211) would fall through to the room-wide
   * rebroadcast and LEAK the line, so an un-upgraded worker must never
   * receive a party_chat send. */
  _handlePartyChat(session, payload) {
    if (!session || !session.id) return;
    const p = this._partyOf(session.id);
    if (!p) return; // not in a party -> deny by default (nothing to relay)
    let text = payload && payload.text;
    if (typeof text !== 'string') return;
    // Strip control chars, clamp length, trim.  The order matters: clamp
    // the RAW length first so a padded string can't smuggle a long line.
    text = text.slice(0, PARTY.CHAT_MAX).replace(/[\x00-\x1f\x7f]/g, " ").trim();
    if (!text) return;
    const wire = {
      from: session.id, // server-known identity -- unforgeable sender
      fromName: this._partyNameOf(session.id),
      text,
      ts: Date.now(),
    };
    /* v2.3.1981: this lane is per-recipient already, so the mute applies
       right here -- a muted party member's line is not sent, rather than
       sent and hidden (chatmod.js).  Remember it first: the report path
       quotes the SERVER's copy of what was said, and party chat is a lane
       harassment can hide in precisely because the room never sees it. */
    this._chatModRemember(session.id, text, this.playerState[session.id] && this.playerState[session.id].z, 'party');
    // Deliver to every online member (the sender's own client already
    // echoed optimistically and drops from === myId, mirroring room chat).
    for (const pid of p.members) {
      if (this._chatModMuted(pid, session.id)) continue;
      this._partySend(pid, 'party_chat', wire);
    }
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
    /* ═══ v2.3.1970: ONE CARD PER INVITER PER INVITE_REPEAT_MS ═══
       Every other notice in this module is guarded against being a
       popup-spam surface -- _handlePartyDecline answers only a REAL
       pending invite for exactly this reason -- but the invite itself was
       not.  party_invite is an EXPLICIT case in the router switch, so the
       default branch's relay token bucket never sees it, and there is no
       global inbound rate limit: a crafted client could send it as fast
       as the socket allows and the target's screen took a pushDmgPopup
       AND a BT_AUDIO.beep for every one (gameEvents.js party_invited),
       on repeat, from a single griefer.
       A COOLDOWN rather than a flat "one invite, ever": a re-send is a
       legitimate move when the first one went missing -- qa-party-smoke
       re-invites once after 8s for precisely that reason, and refusing it
       outright would take away that harness's only recovery path.  5s is
       well under that retry and well over any human double-tap.
       The timestamp IS refreshed on a delivered re-invite: TTL exists so
       a STALE card cannot be accepted, and an invite the inviter is
       actively re-sending is not stale.  Dropped silently rather than
       answered (the v2.3.1134 posture -- a refusal is a second message
       and an oracle for whoever is probing). */
    const _lastSent = this._partyInvites.get(fromId + '>' + target);
    if (_lastSent && Date.now() - _lastSent < PARTY.INVITE_REPEAT_MS) return;
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
    // Forged / replayed accepts are DROPPED (rule 15 posture: there is
    // no relay half here, so silence is the whole answer — and no
    // oracle for forgers).  v2.3.1185: an EXPIRED invite is different:
    // the accepter genuinely tapped Join on a card that aged out, so
    // dead air reads as a broken button — answer privately (grafted
    // from the competing party build in PR #221).
    if (!ts) return;
    if (Date.now() - ts > PARTY.INVITE_TTL) {
      return this._partySend(accepterId, 'party_error', { reason: 'expired' });
    }
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
        // v2.3.1185: null-prototype — meta is keyed by client-supplied
        // player ids, and on a plain {} an id like '__proto__' hits the
        // inherited accessor instead of storing (the duel.away lesson,
        // v2.3.1175).
        meta: Object.create(null),
        ts: Date.now(),
        lastVitals: 0,
      };
      p.meta[inviter] = { name: this._partyNameOf(inviter), level: inviterPs.level || 1, maxHp: inviterPs.maxHp || 100 };
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
