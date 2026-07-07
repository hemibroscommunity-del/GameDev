/* ═══ v2.3.1175: PARTY SYSTEM (handoff backlog item D; spec in
 * docs/specs/party.md) ═══
 *
 * A party is a ROSTER, nothing more — the handoff note is explicit:
 * kill credit is already GDD §7 damage-contribution (xpRecipients in
 * index.js) and works co-op today, so this module deliberately does
 * NOT touch the share math, loot rules, or any combat path.  What it
 * adds is the social layer that was missing: a named group with a
 * leader, invites, and a server-truth member list every client can
 * render (party frames, "where's my friend" zone tags).
 *
 * Session machine (in-memory, deploy voids it — nothing escrowed,
 * per rule 11: a wipe loses nothing of value):
 *   party_invite {target}   Leader-or-solo invites a player.  The
 *                           half is recorded per-sender-session
 *                           (rule 14) with a 60s TTL; the target gets
 *                           a private party_invited popup event.
 *   party_accept {from}     Honored only against a live recorded
 *                           invite — a forged/expired accept is
 *                           answered privately, never relayed
 *                           (rule 15 posture; these are explicit
 *                           switch cases so no half ever reaches the
 *                           rebroadcast branch at all).  First accept
 *                           CREATES the party with the inviter as
 *                           leader; later accepts join it, capped at
 *                           MAX_SIZE.
 *   party_decline {from}    Clears the invite, tells the inviter.
 *   party_leave             Leaving leader promotes the next-oldest
 *                           member; a party of one disbands.
 *   party_kick {target}     Leader only.
 *
 * Every roster change re-echoes the full snapshot privately to every
 * member as party_state (PRIVILEGED) — the client panel is a pure
 * renderer of server truth, same posture as trade2_state.  Member
 * name/level are CACHED on the member record at join time because
 * webSocketClose deletes playerState — an away member must still
 * render in the frame.
 *
 * Disconnect does NOT drop you instantly: iOS tab suspends and deploy
 * bounces are routine (the duel-grace lesson, v2.3.1121), so members
 * get a 2-minute away window (shown as away:true) before the tick
 * sweep removes them.  Rejoin inside the window just clears the flag
 * — and re-echoes the snapshot, which is also how a reconnecting
 * client recovers its party UI without any client-side persistence. */

export const PARTY = {
  MAX_SIZE: 4,          // GDD §55.7 dungeon scaling tops out at 4 present
  INVITE_TTL: 60000,    // invite popup lifetime
  GRACE_MS: 120000,     // away window before a disconnected member is dropped
};

export const partyMethods = {
  _partySend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
  },

  _partyError(playerId, code, extra) {
    this._partySend(playerId, 'party_error', Object.assign({ code }, extra || {}));
  },

  _partyFor(playerId) {
    if (!this._partyByPlayer || !this._parties) return null;
    const pid = this._partyByPlayer.get(playerId);
    return pid ? this._parties.get(pid) || null : null;
  },

  // Display names live on the SESSION (join sets session.name), not on
  // playerState — trade2's ps.name reads silently fall back to
  // 'Trader' for the same reason.  Session first, ps as a backstop.
  _partyNameOf(playerId) {
    const s = this._sessionById(playerId);
    const ps = this.playerState[playerId];
    return (s && s.name) || (ps && ps.name) || 'Bro';
  },

  _partyWire(p) {
    return {
      id: p.id, leader: p.leader, state: 'active',
      members: p.members.map((m) => {
        const ps = this.playerState[m.id];
        // Refresh the cache while the member is online so the frame
        // tracks level-ups; keep the last-seen values while away.
        if (ps) { m.name = this._partyNameOf(m.id); m.level = ps.level || m.level; }
        return {
          id: m.id, name: m.name || 'Bro', level: m.level || 1,
          away: !!m.awayUntil,
          z: ps ? ps.z : undefined, // undefined stays off the wire
        };
      }),
    };
  },

  _partyBroadcast(p) {
    const wire = this._partyWire(p);
    for (const m of p.members) this._partySend(m.id, 'party_state', wire);
  },

  _handlePartyInvite(session, payload) {
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead) return;
    const target = payload && payload.target;
    if (!target || typeof target !== 'string' || target === session.id) return;
    const targetPs = this.playerState[target];
    if (!targetPs || targetPs.disconnected) return this._partyError(session.id, 'target-gone');
    const mine = this._partyFor(session.id);
    if (mine && mine.leader !== session.id) return this._partyError(session.id, 'not-leader');
    if (mine && mine.members.length >= PARTY.MAX_SIZE) return this._partyError(session.id, 'full');
    if (this._partyFor(target)) return this._partyError(session.id, 'target-busy');
    if (!this._partyInvites) this._partyInvites = new Map(); // 'from>to' -> ts
    this._partyInvites.set(session.id + '>' + target, Date.now());
    this._partySend(target, 'party_invited', {
      from: session.id, fromName: this._partyNameOf(session.id),
      size: mine ? mine.members.length : 1,
    });
    // Same "your half is in" echo shape as trade2's 'invited'.
    this._partySend(session.id, 'party_state', { state: 'invited', target });
  },

  _handlePartyAccept(session, payload) {
    const from = payload && payload.from;
    if (!from || typeof from !== 'string' || from === session.id) return;
    const now = Date.now();
    const key = from + '>' + session.id;
    const inv = this._partyInvites && this._partyInvites.get(key);
    if (this._partyInvites) this._partyInvites.delete(key);
    // Forged / replayed / expired accept: answered privately, dropped.
    if (!inv || now - inv > PARTY.INVITE_TTL) return this._partyError(session.id, 'expired');
    if (this._partyFor(session.id)) return this._partyError(session.id, 'busy');
    const inviterPs = this.playerState[from];
    if (!inviterPs || inviterPs.disconnected) return this._partyError(session.id, 'target-gone');
    if (!this._parties) this._parties = new Map();
    if (!this._partyByPlayer) this._partyByPlayer = new Map();
    let p = this._partyFor(from);
    if (p && p.members.length >= PARTY.MAX_SIZE) return this._partyError(session.id, 'full');
    // The invite's numbers are authoritative (rule 14 posture): the
    // inviter is ALWAYS the initial leader; an edited accept carries
    // nothing the server reads beyond 'from'.
    if (!p) {
      p = {
        id: crypto.randomUUID(), leader: from, createdAt: now,
        members: [{ id: from, name: this._partyNameOf(from), level: inviterPs.level || 1, awayUntil: 0 }],
      };
      this._parties.set(p.id, p);
      this._partyByPlayer.set(from, p.id);
    }
    const ps = this.playerState[session.id];
    p.members.push({ id: session.id, name: this._partyNameOf(session.id), level: (ps && ps.level) || 1, awayUntil: 0 });
    this._partyByPlayer.set(session.id, p.id);
    this._partyBroadcast(p);
  },

  _handlePartyDecline(session, payload) {
    const from = payload && payload.from;
    if (!from || typeof from !== 'string') return;
    if (this._partyInvites) this._partyInvites.delete(from + '>' + session.id);
    this._partyError(from, 'declined', { who: session.id });
  },

  _handlePartyLeave(session) {
    const p = this._partyFor(session.id);
    if (p) this._partyRemove(p, session.id, 'left');
  },

  _handlePartyKick(session, payload) {
    const p = this._partyFor(session.id);
    if (!p || p.leader !== session.id) return;
    const target = payload && payload.target;
    if (!target || typeof target !== 'string' || target === session.id) return;
    if (!p.members.some((m) => m.id === target)) return;
    this._partyRemove(p, target, 'kicked');
  },

  /* Shared removal core (leave / kick / away-timeout all converge
   * here): drop the member, promote a new leader if needed, disband
   * at size one.  The removed member gets a terminal party_state so
   * the client clears its frame; survivors get the fresh roster. */
  _partyRemove(p, playerId, how) {
    p.members = p.members.filter((m) => m.id !== playerId);
    this._partyByPlayer.delete(playerId);
    this._partySend(playerId, 'party_state', { id: p.id, state: how });
    if (p.leader === playerId && p.members.length > 0) p.leader = p.members[0].id;
    if (p.members.length <= 1) {
      this._parties.delete(p.id);
      const last = p.members[0];
      if (last) {
        this._partyByPlayer.delete(last.id);
        this._partySend(last.id, 'party_state', { id: p.id, state: 'disbanded' });
      }
      return;
    }
    this._partyBroadcast(p);
  },

  // webSocketClose hook — start the away window, show it to the rest.
  _partyOnDisconnect(playerId) {
    const p = this._partyFor(playerId);
    if (!p) return;
    const m = p.members.find((x) => x.id === playerId);
    if (m) m.awayUntil = Date.now() + PARTY.GRACE_MS;
    this._partyBroadcast(p);
  },

  // Join hook — clear the away flag; the broadcast doubles as the
  // reconnecting client's UI recovery snapshot.
  _partyOnRejoin(playerId) {
    const p = this._partyFor(playerId);
    if (!p) return;
    const m = p.members.find((x) => x.id === playerId);
    if (m) m.awayUntil = 0;
    this._partyBroadcast(p);
  },

  // Tick housekeeping — expire stale invites, drop members whose away
  // window lapsed.  Cheap map walks, same posture as _tickDuels.
  _tickParties(now) {
    if (this._partyInvites) {
      for (const [k, ts] of this._partyInvites) {
        if (now - ts > PARTY.INVITE_TTL) this._partyInvites.delete(k);
      }
    }
    if (this._parties) {
      for (const p of [...this._parties.values()]) {
        for (const m of [...p.members]) {
          if (m.awayUntil && now > m.awayUntil) this._partyRemove(p, m.id, 'timeout');
        }
      }
    }
  },
};
