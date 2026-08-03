/* ═══ v2.3.1125: CLAN REGISTRY + SERVER-SCORED WARS (Wave 2 PR9; spec
 * in docs/specs/clans.md) ═══
 *
 * Clans used to be 100% client-side: membership in localStorage
 * ('bt_clan'), the 500g creation fee debited locally, the clan tag
 * stuffed into join/track cosmetics (fully forgeable), wars declared
 * unilaterally by broadcast, kills SELF-SCORED by each client, and the
 * war reward self-credited by whoever decided they won.  The registry
 * and the war referee now live in the GameRoom.
 *
 * Wire strategy: the server re-emits the SAME message shapes the client
 * already renders (clan_war_declare / clan_war_kill / clan_war_end), so
 * the war UI needs zero changes -- only the client's self-credit /
 * self-scoring sites are gated off by caps.clans.  Client->server clan
 * commands (create/join/leave/kick/war_declare) are explicit switch
 * cases; pure server emissions (clan_state, clan_error, clan_war_kill,
 * clan_war_end) are PRIVILEGED.
 *
 * Storage (registry only -- never inside the rpg blob):
 *   clan:<clanId>           {id, name, tag, color1, color2, logo,
 *                            leaderId, members[], createdAt}
 *   clan_by_player:<pid>    clanId  (join-time stamp + death scoring
 *                            need O(1) lookup)
 *   clan_war:<warId>        war snapshot (survives deploys; scores are
 *                            re-persisted on change)
 *
 * Wars: scored purely from the server's own PvP death resolution --
 * _warOnDeath hooks _handlePlayerDeath and parses cause 'pvp:<id>'.
 * War zones are the 8 lawless zones (client CLAN_WAR_ZONES mirror), so
 * kills already land with no consent machinery.  Duel kills are
 * excluded (no farming war points in a consensual duel).  Wars resolve
 * by endsAt on the tick AND lazily on wake (no alarms; the tick stops
 * when the room empties -- ARCHITECTURE-HANDOFF rule 12).  Rewards are
 * flat gold per member via _creditPlayer (offline-safe, idempotent).
 * AP is deliberately NOT granted (GDD §27.3 deleted AP; the client
 * popup text is cosmetic).  MVP bonus deferred (handoff backlog). */

import { ZONES } from './data.js';

export const CLANS = {
  CREATE_COST: 500,           // GDD §29 sink
  MAX_MEMBERS: 20,
  INVITE_TTL: 120000,
  WAR_DURATION: 1800000,      // 30 min (GDD §42)
  WAR_REWARDS: { winner: { gold: 500 }, loser: { gold: 50 } }, // client CLAN_WAR_REWARDS mirror (gold only)
  // v2.3.1179: ended-war snapshot retention.  clan_war:<id> was written
  // on declare/kill/resolve but never deleted -- one orphan key per war
  // ever declared.  48h after endTime mirrors the oplog prune window
  // (inbox.js): long enough for any crash-retry of the reward loop to
  // find its opId stamps, then gone.
  WAR_RETENTION: 172800000,
};

export const clanMethods = {
  // Lazy registry cache (the _mktEnsureIndex pattern).  Also the lazy
  // war-resolution hook: any wake that touches clans settles overdue wars.
  async _clansEnsure() {
    if (this._clans) { await this._clanWarsLazyResolve(); return; }
    this._clans = new Map();        // clanId -> record
    this._clanByPlayer = new Map(); // playerId -> clanId
    this._clanWars = new Map();     // warId -> war
    const clanEntries = await this.state.storage.list({ prefix: 'clan:' });
    for (const [, c] of clanEntries) {
      if (c && c.id) {
        this._clans.set(c.id, c);
        for (const pid of c.members || []) this._clanByPlayer.set(pid, c.id);
      }
    }
    const warEntries = await this.state.storage.list({ prefix: 'clan_war:' });
    const _now = Date.now();
    for (const [k, w] of warEntries) {
      if (w && w.id && w.status === 'active') this._clanWars.set(w.id, w);
      // v2.3.1179: bounded retention for ended-war snapshots (see
      // CLANS.WAR_RETENTION).  Runs on the once-per-wake registry
      // load, the same lazy slot that resolves overdue wars (rule 12)
      // -- also drains the pre-retention backlog of orphans.
      // Fire-and-forget: a missed delete retries next wake.
      else if (!w || (w.endTime || 0) <= _now - CLANS.WAR_RETENTION) {
        this.state.storage.delete(k);
      }
    }
    await this._clanWarsLazyResolve();
  },

  _clanOf(playerId) {
    if (!this._clans || !this._clanByPlayer) return null;
    const cid = this._clanByPlayer.get(playerId);
    return cid ? this._clans.get(cid) || null : null;
  },

  // Authoritative tag: called wherever the client used to self-report
  // cosmetics (join + track).  Overrides whatever the client stuffed in.
  _clanStampTag(playerId, data) {
    if (!data || !this._clans) return;
    const clan = this._clanOf(playerId);
    if (clan) {
      data.clanTag = clan.tag;
      data.clanColor1 = clan.color1;
    } else if (data.clanTag) {
      // Not in a registered clan -> no tag.  This is what kills forgery.
      delete data.clanTag;
      delete data.clanColor1;
    }
  },

  _clanSendState(playerId) {
    const clan = this._clanOf(playerId);
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify({ type: 'clan_state', payload: { clan: clan || null } }));
    } catch (e) {}
  },

  _clanError(playerId, text) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'clan_error', payload: { text } })); } catch (e) {}
  },

  async _handleClanCreate(session, payload) {
    if (!session || !session.id) return;
    await this._clansEnsure();
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    if (this._clanOf(session.id)) return this._clanError(session.id, 'Already in a clan');
    const name = (typeof payload.name === 'string' ? payload.name : '').trim();
    const tag = (typeof payload.tag === 'string' ? payload.tag : '').trim().toUpperCase();
    if (name.length < 3 || name.length > 16) return this._clanError(session.id, 'Name must be 3-16 chars');
    if (!/^[A-Z0-9]{1,4}$/.test(tag)) return this._clanError(session.id, 'Tag must be 1-4 letters/numbers');
    for (const c of this._clans.values()) {
      if (c.tag === tag) return this._clanError(session.id, 'Tag [' + tag + '] is taken');
      if (c.name.toLowerCase() === name.toLowerCase()) return this._clanError(session.id, 'Name is taken');
    }
    if ((ps.coins || 0) < CLANS.CREATE_COST) return this._clanError(session.id, 'Need ' + CLANS.CREATE_COST + 'g');
    ps.coins -= CLANS.CREATE_COST;
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    const clan = {
      id: crypto.randomUUID(), name, tag,
      color1: typeof payload.color1 === 'string' ? payload.color1.slice(0, 9) : '#a78bfa',
      color2: typeof payload.color2 === 'string' ? payload.color2.slice(0, 9) : '#5b52ff',
      logo: Array.isArray(payload.logo) ? payload.logo.slice(0, 8) : null,
      leaderId: session.id, members: [session.id], createdAt: Date.now(),
    };
    this._clans.set(clan.id, clan);
    this._clanByPlayer.set(session.id, clan.id);
    await this.state.storage.put('clan:' + clan.id, clan);
    await this.state.storage.put('clan_by_player:' + session.id, clan.id);
    this._clanStampTag(session.id, session.data);
    this._clanSendState(session.id);
  },

  /* clan_invite stays a RELAY (the target's popup UI already handles
   * it) -- we just record the pending half so a later clan_join_accept
   * can be validated per-sender-session (the duel-handshake pattern). */
  async _observeClanInvite(fromId, msg) {
    await this._clansEnsure();
    const target = msg.payload && msg.payload.target;
    if (!target || typeof target !== 'string' || target === fromId) return;
    if (target.length > 64) return; // v2.3.1622: bound the map key (friends.js:116 precedent)
    const clan = this._clanOf(fromId);
    if (!clan || clan.leaderId !== fromId) return;          // only leaders invite
    if (clan.members.length >= CLANS.MAX_MEMBERS) return;
    if (this._clanOf(target)) return;                       // already clanned
    if (!this._clanInvites) this._clanInvites = new Map();  // 'inviter>target' -> {clanId, ts}
    this._clanInvites.set(fromId + '>' + target, { clanId: clan.id, ts: Date.now() });
  },

  async _handleClanJoinAccept(session, payload) {
    if (!session || !session.id) return;
    await this._clansEnsure();
    const inviter = payload && payload.inviter;
    if (!inviter || typeof inviter !== 'string') return;
    const key = inviter + '>' + session.id;
    const inv = this._clanInvites && this._clanInvites.get(key);
    if (this._clanInvites) this._clanInvites.delete(key);
    if (!inv || Date.now() - inv.ts > CLANS.INVITE_TTL) return; // forged/expired
    const clan = this._clans.get(inv.clanId);
    if (!clan || clan.members.length >= CLANS.MAX_MEMBERS) return;
    if (this._clanOf(session.id)) return;
    clan.members.push(session.id);
    this._clanByPlayer.set(session.id, clan.id);
    await this.state.storage.put('clan:' + clan.id, clan);
    await this.state.storage.put('clan_by_player:' + session.id, clan.id);
    this._clanStampTag(session.id, session.data);
    for (const pid of clan.members) this._clanSendState(pid);
  },

  async _handleClanLeave(session) {
    if (!session || !session.id) return;
    await this._clansEnsure();
    await this._clanRemoveMember(session.id);
  },

  async _handleClanKick(session, payload) {
    if (!session || !session.id) return;
    await this._clansEnsure();
    const clan = this._clanOf(session.id);
    const target = payload && payload.target;
    if (!clan || clan.leaderId !== session.id) return;
    if (!target || target === session.id || !clan.members.includes(target)) return;
    await this._clanRemoveMember(target);
  },

  async _clanRemoveMember(playerId) {
    const clan = this._clanOf(playerId);
    if (!clan) return;
    clan.members = clan.members.filter((m) => m !== playerId);
    this._clanByPlayer.delete(playerId);
    await this.state.storage.delete('clan_by_player:' + playerId);
    if (clan.members.length === 0) {
      // Last member out dissolves the clan (leader leaving alone).
      this._clans.delete(clan.id);
      await this.state.storage.delete('clan:' + clan.id);
    } else {
      if (clan.leaderId === playerId) clan.leaderId = clan.members[0]; // succession: oldest member
      await this.state.storage.put('clan:' + clan.id, clan);
      for (const pid of clan.members) this._clanSendState(pid);
    }
    const ps = this.playerState[playerId];
    if (ps) {
      const session = [...this.sessions.values()].find((s) => s.id === playerId);
      if (session) this._clanStampTag(playerId, session.data);
    }
    this._clanSendState(playerId);
  },

  /* War declaration: leader-only, both clans real, neither already at
   * war, zone must be a lawless zone (that's what makes the kills land
   * with zero consent machinery).  The server BUILDS the war object in
   * the exact shape the client's clan_war_declare handler renders and
   * re-emits it authoritatively. */
  async _handleClanWarDeclare(session, payload) {
    if (!session || !session.id) return;
    await this._clansEnsure();
    const clan = this._clanOf(session.id);
    if (!clan || clan.leaderId !== session.id) return;
    const defenderTag = (payload && typeof payload.defenderTag === 'string') ? payload.defenderTag.toUpperCase()
      : (payload && payload.war && payload.war.defender && typeof payload.war.defender.tag === 'string') ? payload.war.defender.tag.toUpperCase()
      : null;
    if (!defenderTag || defenderTag === clan.tag) return;
    let defender = null;
    for (const c of this._clans.values()) if (c.tag === defenderTag) { defender = c; break; }
    if (!defender) return this._clanError(session.id, 'No registered clan [' + defenderTag + ']');
    for (const w of this._clanWars.values()) {
      if (w.status === 'active' && [w.challenger.clanId, w.defender.clanId].some((cid) => cid === clan.id || cid === defender.id)) {
        return this._clanError(session.id, 'A war is already active');
      }
    }
    const zone = (payload && typeof payload.zone === 'string') ? payload.zone
      : (payload && payload.war && payload.war.zone) || null;
    if (!zone || !ZONES[zone] || !ZONES[zone].lawless) return this._clanError(session.id, 'Pick a wilderness war zone');
    const now = Date.now();
    const war = {
      id: crypto.randomUUID(), zone, status: 'active',
      startTime: now, endTime: now + CLANS.WAR_DURATION,
      challenger: { clanId: clan.id, tag: clan.tag, name: clan.name, score: 0, members: [...clan.members] },
      defender: { clanId: defender.id, tag: defender.tag, name: defender.name, score: 0, members: [...defender.members] },
      killLog: [],
    };
    this._clanWars.set(war.id, war);
    await this.state.storage.put('clan_war:' + war.id, war);
    // Same shape the client already renders at its clan_war_declare case.
    this.eventBuffer.push({ type: 'clan_war_declare', from: session.id, payload: { war, challengerTag: clan.tag, defenderTag: defender.tag } });
  },

  /* Scoring hook -- called from _handlePlayerDeath beside _duelOnDeath.
   * Only the server's own PvP resolution feeds this (cause 'pvp:<id>'),
   * so scores cannot be forged.  Duel kills are excluded. */
  _warOnDeath(victimId, cause) {
    if (!this._clanWars || this._clanWars.size === 0) return;
    if (typeof cause !== 'string' || !cause.startsWith('pvp:')) return;
    const attackerId = cause.slice(4);
    const d = this._duelFor && this._duelFor(attackerId);
    if (d && (d.a === victimId || d.b === victimId)) return; // consensual duel, not war
    const aClan = this._clanOf(attackerId);
    const vClan = this._clanOf(victimId);
    if (!aClan || !vClan || aClan.id === vClan.id) return;
    const victimPs = this.playerState[victimId];
    for (const war of this._clanWars.values()) {
      if (war.status !== 'active') continue;
      const side = war.challenger.clanId === aClan.id ? 'challenger'
        : war.defender.clanId === aClan.id ? 'defender' : null;
      const otherSide = side === 'challenger' ? 'defender' : 'challenger';
      if (!side || war[otherSide].clanId !== vClan.id) continue;
      if (!victimPs || victimPs.z !== war.zone) return; // outside the war zone
      war[side].score += 1;
      const aSession = [...this.sessions.values()].find((s) => s.id === attackerId);
      const vSession = [...this.sessions.values()].find((s) => s.id === victimId);
      const kill = { killer: (aSession && aSession.name) || attackerId, victim: (vSession && vSession.name) || victimId, points: 1, ts: Date.now() };
      war.killLog.push(kill);
      if (war.killLog.length > 100) war.killLog.splice(0, war.killLog.length - 100);
      this.state.storage.put('clan_war:' + war.id, war); // fire-and-forget snapshot
      // Same shape the client already renders at its clan_war_kill case.
      this.eventBuffer.push({ type: 'clan_war_kill', payload: { warId: war.id, kill, scoreSide: side } });
      return;
    }
  },

  _tickClanWars(now) {
    if (!this._clanWars) return;
    for (const war of [...this._clanWars.values()]) {
      if (war.status === 'active' && now >= war.endTime) this._resolveClanWar(war);
    }
  },

  /* v2.3.1622: expire pending clan invites.  CLANS.INVITE_TTL was only
     read to REJECT a late accept (_handleClanJoinAccept) -- nothing ever
     deleted the entry, so an invite nobody answers stayed resident for
     the life of the DO.  Same omission as _pendingTradeOffers; every
     other invite map in the room already sweeps.
     ADDITIVE: the single-shot delete on accept stays, and an entry
     removed here was already past the point where accepting it would
     have worked, so no reachable behaviour changes. */
  _tickClanInvites(now) {
    if (!this._clanInvites) return;
    for (const [k, inv] of this._clanInvites) {
      if (now - inv.ts > CLANS.INVITE_TTL) this._clanInvites.delete(k);
    }
  },

  async _clanWarsLazyResolve() {
    // Rule 12: a war that ended while the room was empty resolves on
    // the next wake that touches clans.
    if (!this._clanWars) return;
    const now = Date.now();
    for (const war of [...this._clanWars.values()]) {
      if (war.status === 'active' && now >= war.endTime) this._resolveClanWar(war);
    }
  },

  _resolveClanWar(war) {
    if (war.status !== 'active') return; // double-resolution guard
    war.status = 'ended';
    this._clanWars.delete(war.id);
    const winnerSide = war.challenger.score > war.defender.score ? 'challenger'
      : war.defender.score > war.challenger.score ? 'defender' : null;
    const winnerTag = winnerSide ? war[winnerSide].tag : null; // null = draw; client shows both as losers
    this.eventBuffer.push({ type: 'clan_war_end', payload: { warId: war.id, winner: winnerTag } });
    // Flat gold per member, offline-safe + idempotent.  Draw pays the
    // loser rate to both sides.  AP deliberately not granted (GDD §27.3
    // deleted AP; the client popup text is cosmetic).
    (async () => {
      try {
        for (const sideName of ['challenger', 'defender']) {
          const side = war[sideName];
          const rate = (winnerSide && sideName === winnerSide) ? CLANS.WAR_REWARDS.winner : CLANS.WAR_REWARDS.loser;
          for (const pid of side.members || []) {
            await this._creditPlayer(pid, {
              opId: 'clanwar:' + war.id + ':' + pid, source: 'clanwar', kind: 'gold',
              payload: { amount: rate.gold },
              note: 'clan war vs [' + war[sideName === 'challenger' ? 'defender' : 'challenger'].tag + ']' + (winnerSide ? (sideName === winnerSide ? ' — victory' : ' — defeat') : ' — draw'),
            });
          }
        }
        await this.state.storage.put('clan_war:' + war.id, war); // final snapshot (status ended)
      } catch (e) { /* opIds make a retry safe; next lazy resolve won't re-enter (status flipped) */ }
    })();
  },
};
