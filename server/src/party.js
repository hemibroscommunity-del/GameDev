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

/* v2.3.3313: alliance.js imports this file too; nothing of it is read at load
   time on either side (a cycle ES modules allow only so), so ALLIANCE is used
   inside the methods alone */
import { ALLIANCE, allyRowOf, cleanAlly } from './alliance.js';

export const PARTY = {
  MAX_SIZE: 4,             // matches dungeon.js PARTY_HP_SCALE's 4-slot table (v2.3.3284: the cap with `partykeep: false`)
  INVITE_TTL: 60000,       // 1 min to accept an invite
  VITALS_MS: 2000,         // roster re-echo cadence (live HP/zone)
  OFFLINE_GRACE_MS: 120000,// 'away' window before a dropped member is removed (v2.3.3284: only with `partykeep: false`)
  CHAT_MAX: 200,           // v2.3.1212: party-chat line length clamp
  INVITE_REPEAT_MS: 5000,  // v2.3.1970: min gap between two invite cards from the same inviter
  /* ═══ v2.3.3284: A PARTY THAT LASTS (docs/specs/party.md) ═══
     The owner: a party "that stays persistent until you remove yourself from
     the party and it becomes 'alliance' at 20+ people", then "Go recommended"
     to the plan.  This is its first step: the party is STORED, so it outlives
     a logout, a reconnect and a deploy, and it grows past four.  Dungeons
     stay four (dungeon.js _dungeonPullPartyMembers). */
  KEEP_MAX: 50,            // members, online or not
  /* the stored record's shape; a newer one is left whole.  v2.3.3313: 2 is a
     record with `ally` (alliance.js) -- one without stays 1, so a rollback to
     v2.3.3284 still reads every party that never became an alliance */
  V: 2,
  SEEN_WRITE_MS: 6 * 3600 * 1000,      // a member's `seen` is written at a join at most this often
  LEADER_IDLE_MS: 7 * 24 * 3600 * 1000, // a leader not seen this long hands the party on
  NAME_MAX: 24,            // a stored name, clamped on the way in
};

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

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
    const keep = this._partyKeepOn();
    const now = Date.now();
    /* v2.3.3313: who counts toward the alliance (alliance.js) */
    const ally = keep && typeof this._allyOn === 'function' && this._allyOn() ? this._allyCount(p, now) : null;
    const out = {
      id: p.id,
      leader: p.leader,
      state: 'open',
      /* v2.3.3284: how many it can hold, so the game says "7/50" */
      max: this._partyMax(),
      members: p.members.map((pid) => {
        const ps = this.playerState[pid];
        const meta = p.meta[pid] || {};
        const m = {
          id: pid,
          name: meta.name || 'Bro',
          level: ps ? (ps.level || 1) : (meta.level || 1),
          hp: ps ? Math.max(0, Math.round(ps.hp !== undefined ? ps.hp : 100)) : 0,
          maxHp: ps ? (ps.maxHp || 100) : (meta.maxHp || 100),
          zone: ps ? (ps.z || 'town') : null,
          away: !ps,
          dead: !!(ps && (ps.dying || ps.dead)),
        };
        /* v2.3.3284: an offline member of a party that lasts is OFFLINE, not
           reconnecting -- and when they were last on, in seconds (an older
           game reads `away` and greys them as before) */
        if (keep && !ps) {
          m.off = 1;
          if (meta.seen > 0) m.seen = Math.max(0, Math.round((now - meta.seen) / 1000));
        }
        if (ally && ally.ids.has(pid)) m.act = 1;
        return m;
      }),
    };
    /* ═══ v2.3.3313: THE ALLIANCE (alliance.js, docs/specs/alliance.md) ═══
       Always while the alliance is on, so the window can say how far off 20
       the party is: whether it is one, its name and tag, its active members
       against AT (to become one) and DROP (to stay one), how long until the
       leader may rename it or fight again, and its war. */
    if (ally) {
      const a = p.ally || null;
      const w = this._allyWarOf(p.id);
      out.ally = {
        on: !!(a && a.on),
        name: (a && a.name) || null,
        tag: (a && a.tag) || null,
        since: a && a.on ? a.since || 0 : 0,
        active: ally.active,
        at: ALLIANCE.AT, drop: ALLIANCE.DROP,
        renameIn: a && a.name && a.renamedAt ? Math.max(0, a.renamedAt + ALLIANCE.RENAME_MS - now) : 0,
        warIn: this._allyWarWait(p.id, now),
        war: w ? this._allyWarWire(w, p.id, now) : null,
      };
      /* v2.3.3321: a former clan, whose tag its members wear below 20 too
         (clanparty.js) */
      if (a && a.clan) out.ally.clan = 1;
    }
    return out;
  },

  /* ═══ v2.3.3284: THE STORED PARTY (docs/specs/party.md "A party that lasts") ═══
     `party:<id>` is the roster, `party_by_player:<pid>` each member's own
     word for which party they are in -- the index is the truth: a record
     that lists someone whose index names another party (a crash between two
     writes, a kill-switch flip) loses them when it is next loaded.  Written
     only when the roster changes, fire-and-forget (handoff rule 10: the
     output gate holds every message until the write is durable); read at a
     member's join.  `partykeep: false` in the live flags reads and writes
     nothing and puts the old in-memory party back for everything after it. */
  _partyKeepOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'partykeep') && !f.partykeep);
  },

  _partyMax() {
    return this._partyKeepOn() ? PARTY.KEEP_MAX : PARTY.MAX_SIZE;
  },

  _partyStorageDo(op, key, val) {
    if (!this._partyKeepOn() || !this.state || !this.state.storage) return;
    try {
      const pr = op === 'put' ? this.state.storage.put(key, val) : this.state.storage.delete(key);
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    } catch (e) { /* the next roster change writes it again */ }
  },

  /* the whole record, as stored: the members oldest first, and for each the
     name and level the list shows while they are offline */
  _partyStore(p) {
    const meta = Object.create(null);   /* keyed by player ids: a '__proto__' must store (the party meta lesson, v2.3.1185) */
    for (const pid of p.members) {
      const m = p.meta[pid] || (p.meta[pid] = {});
      /* v2.3.3313: an online member's level as it is now -- the alliance's
         row counts levels from what is stored (alliance.js allyRowOf) */
      const ps = this.playerState[pid];
      if (ps && ps.level) m.level = ps.level | 0;
      meta[pid] = { name: String(m.name || 'Bro').slice(0, PARTY.NAME_MAX), level: m.level | 0 || 1, at: +m.at || p.ts || 0, seen: +m.seen || 0 };
      /* what storage holds now: a join compares against THIS, not the
         in-memory `seen` a disconnect moves, or a member who comes and goes
         with the party in memory would never have their `seen` written */
      m.ss = meta[pid].seen;
    }
    /* v2.3.3313: a party that has been an alliance carries it, as shape 2,
       and its board row goes in the same run (one write batch) */
    const rec = { v: p.ally ? PARTY.V : 1, id: p.id, leader: p.leader, members: p.members.slice(), meta, ts: p.ts || 0 };
    if (p.ally) rec.ally = { on: !!p.ally.on, since: +p.ally.since || 0, name: p.ally.name || null, tag: p.ally.tag || null, renamedAt: +p.ally.renamedAt || 0 };
    /* v2.3.3321: and a former clan says so (clanparty.js) */
    if (p.ally && p.ally.clan) rec.ally.clan = 1;
    this._partyStorageDo('put', 'party:' + p.id, rec);
    if (p.ally && typeof this._allyRowPut === 'function') this._allyRowPut(p, meta);
  },

  _partyIndexPut(pid, partyId) { this._partyStorageDo('put', 'party_by_player:' + pid, partyId); },
  _partyIndexDrop(pid) { this._partyStorageDo('delete', 'party_by_player:' + pid); },

  /* A member's stored party, loaded at their join.  Returns the party (in
     memory from now on, every member indexed), or null.  A read that throws
     marks the player UNKNOWN (`_partyUnknownIds`): they can neither invite
     nor accept until a join reads it, so a lost read can never put them in
     two parties.  Storage awaits only, so nothing else runs in between
     (handoff rule 9). */
  async _partyLoad(playerId) {
    const st = this.state && this.state.storage;
    if (!st) return null;
    if (!this._parties) this._parties = new Map();
    if (!this._partyByPlayer) this._partyByPlayer = new Map();
    if (!this._partyUnknownIds) this._partyUnknownIds = new Set();
    let id;
    try { id = await st.get('party_by_player:' + playerId); }
    catch (e) { this._partyUnknownIds.add(playerId); return null; }
    this._partyUnknownIds.delete(playerId);
    if (!id || typeof id !== 'string') return null;
    const live = this._parties.get(id);
    if (live) {
      if (live.members.includes(playerId)) { this._partyByPlayer.set(playerId, live); return live; }
      this._partyIndexDrop(playerId);
      return null;
    }
    let rec;
    try { rec = await st.get('party:' + id); }
    catch (e) { this._partyUnknownIds.add(playerId); return null; }
    if (!rec || typeof rec !== 'object' || rec.id !== id || !Array.isArray(rec.members)) { this._partyIndexDrop(playerId); return null; }
    /* a newer shape (a rollback): left whole and untouched, and the player
       unknown, never a partyless one free to join another */
    if ((rec.v | 0) > PARTY.V) { this._partyUnknownIds.add(playerId); return null; }
    let members = [];
    for (const m of rec.members) if (typeof m === 'string' && m && !members.includes(m)) members.push(m);
    if (!members.includes(playerId)) { this._partyIndexDrop(playerId); return null; }
    /* the index is the truth: keep only the members whose own index names
       this party (one batched read, once a party a worker's life) */
    let idx = null;
    try { idx = await st.get(members.map((m) => 'party_by_player:' + m)); }
    catch (e) { idx = null; }
    const healed = idx instanceof Map ? members.filter((m) => m === playerId || idx.get('party_by_player:' + m) === id) : members;
    const p = { id, leader: rec.leader, members: healed, meta: Object.create(null), ts: +rec.ts || Date.now(), lastVitals: 0 };
    /* v2.3.3313: its alliance, as this worker reads one */
    if (rec.ally) p.ally = cleanAlly(rec.ally) || undefined;
    const rm = rec.meta && typeof rec.meta === 'object' ? rec.meta : {};
    for (const m of healed) {
      const x = own(rm, m) && rm[m] && typeof rm[m] === 'object' ? rm[m] : {};
      p.meta[m] = { name: String(x.name || 'Bro').slice(0, PARTY.NAME_MAX), level: x.level | 0 || 1, at: +x.at || 0, seen: +x.seen || 0 };
      p.meta[m].ss = p.meta[m].seen;
    }
    if (p.members.length <= 1) {
      /* everyone else has gone: a party of one is just a player */
      this._partyStorageDo('delete', 'party:' + id);
      if (rec.ally && typeof this._allyRowDrop === 'function') this._allyRowDrop(id);
      this._partyIndexDrop(playerId);
      return null;
    }
    if (!p.members.includes(p.leader)) p.leader = p.members[0];
    this._parties.set(id, p);
    for (const m of p.members) {
      /* a member already in another live party keeps it (a flip of the
         switch); their own index decides at their next join */
      if (!this._partyByPlayer.has(m)) this._partyByPlayer.set(m, p);
    }
    if (healed.length !== members.length || p.leader !== rec.leader) this._partyStore(p);
    return p;
  },

  /* v2.3.3284: a character restart leaves its party (persistence.js
     _resetCharacterData): a fresh character has joined nothing */
  async _partyOnReset(playerId) {
    const p = this._partyOf(playerId);
    if (p) { this._partyRemoveMember(p, playerId, 'left'); return; }
    if (!this._partyKeepOn()) return;
    const st = this.state && this.state.storage;
    if (!st) return;
    try {
      const id = await st.get('party_by_player:' + playerId);
      if (typeof id !== 'string' || !id) return;
      const rec = await st.get('party:' + id);
      await st.delete('party_by_player:' + playerId);
      if (!rec || typeof rec !== 'object' || !Array.isArray(rec.members) || (rec.v | 0) > PARTY.V) return;
      const members = rec.members.filter((m) => m !== playerId);
      if (members.length <= 1) {
        await st.delete('party:' + id);
        /* v2.3.3313: and its alliance's row (alliance.js) */
        if (rec.ally) { if (this._allyIndex) this._allyIndex.delete(id); await st.delete('ally:' + id); }
        for (const m of members) await st.delete('party_by_player:' + m);
        return;
      }
      const meta = Object.assign(Object.create(null), rec.meta || {});   /* keyed by player ids */
      delete meta[playerId];
      await st.put('party:' + id, Object.assign({}, rec, { members, meta, leader: rec.leader === playerId ? members[0] : rec.leader }));
      if (rec.ally) {
        const row = allyRowOf(id, cleanAlly(rec.ally), members, meta);
        if (this._allyIndex) this._allyIndex.set(id, row);
        await st.put('ally:' + id, row);
      }
    } catch (e) { /* best-effort, as the rest of the reset */ }
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
    /* v2.3.3367: then cleaned, as every chat lane is; party chat is private,
       so no repeat filter (chatguard.js) */
    text = this._chatGuardClean(text);
    if (!text) return;
    /* v2.3.3367: and paid for from the social allowance room chat and emotes
       spend (chatguard.js SOCIAL: five at once, then one every 2 s, the three
       lanes together) -- party chat had no limit of its own but the socket's
       message budget, so a script could send a party of 50 about 120 lines a
       second.  Spent once the line is real, so a blank one costs nothing */
    if (!this._chatGuardOff() && !this._socialAllow(session, Date.now())) return;
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
    /* v2.3.3284: a player whose stored party could not be read is in an
       unknown party, so neither side of an invite (party.md) */
    if (this._partyUnknownIds && this._partyUnknownIds.has(fromId)) {
      return this._partySend(fromId, 'party_error', { reason: 'not-loaded' });
    }
    if (this._partyOf(target) || (this._partyUnknownIds && this._partyUnknownIds.has(target))) {
      return this._partySend(fromId, 'party_error', { reason: 'target-busy', name: this._partyNameOf(target) });
    }
    const mine = this._partyOf(fromId);
    if (mine && mine.members.length >= this._partyMax()) {
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
    /* v2.3.3284: an unknown stored party (a read that failed) on either side */
    if (this._partyUnknownIds && (this._partyUnknownIds.has(accepterId) || this._partyUnknownIds.has(inviter))) {
      return this._partySend(accepterId, 'party_error', { reason: 'not-loaded' });
    }
    if (!this._parties) this._parties = new Map();
    if (!this._partyByPlayer) this._partyByPlayer = new Map();
    let p = this._partyOf(inviter);
    const fresh = !p;
    if (p) {
      // Capacity re-check at accept: the party may have filled since
      // the invite went out (the invite's snapshot is NOT authoritative).
      if (p.members.length >= this._partyMax()) {
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
      p.meta[inviter] = { name: this._partyNameOf(inviter), level: inviterPs.level || 1, maxHp: inviterPs.maxHp || 100, at: Date.now(), seen: Date.now() };
      this._parties.set(p.id, p);
      this._partyByPlayer.set(inviter, p);
    }
    p.members.push(accepterId);
    p.meta[accepterId] = { name: this._partyNameOf(accepterId), level: ps.level || 1, maxHp: ps.maxHp || 100, at: Date.now(), seen: Date.now() };
    this._partyByPlayer.set(accepterId, p);
    /* v2.3.3284: stored -- the indexes first, so a crash between the writes
       leaves an index the next read drops, never a member nobody can see */
    if (fresh) this._partyIndexPut(inviter, p.id);
    this._partyIndexPut(accepterId, p.id);
    this._partyStore(p);
    /* v2.3.3313: the 20th active member makes it an alliance, and an
       alliance's newcomer wears its tag (alliance.js) */
    const became = this._allyOn && this._allyOn() ? this._allyCheck(p, Date.now()) : null;
    if (this._allySetTag) this._allySetTag(accepterId);
    this._partyBroadcast(p, became ? { joined: accepterId, became } : { joined: accepterId });
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
    this._partyIndexDrop(pid);   /* v2.3.3284: the index first, as at a join */
    this._partySend(pid, 'party_state', { state: 'none', reason });
    /* v2.3.3313: out of the party, out of its alliance's tag */
    if (this._allySetTag) this._allySetTag(pid);
    if (p.members.length <= 1) {
      this._parties.delete(p.id);
      for (const rest of p.members) {
        if (this._partyByPlayer) this._partyByPlayer.delete(rest);
        this._partyIndexDrop(rest);
        this._partySend(rest, 'party_state', { state: 'none', reason: 'disbanded' });
        if (this._allySetTag) this._allySetTag(rest);
      }
      this._partyStorageDo('delete', 'party:' + p.id);
      /* ...and a party that ends takes its alliance's row and name */
      if (p.ally && this._allyRowDrop) this._allyRowDrop(p.id);
      return;
    }
    if (p.leader === pid) p.leader = p.members[0]; // oldest member inherits
    this._partyStore(p);
    const became = this._allyOn && this._allyOn() ? this._allyCheck(p, Date.now()) : null;
    this._partyBroadcast(p, became ? { removed: pid, reason, became } : { removed: pid, reason });
  },

  // webSocketClose hook: mark away (grace), don't remove — iOS tab
  // suspends and deploy bounces are routine (the duel-grace lesson).
  _partyOnDisconnect(playerId) {
    const p = this._partyOf(playerId);
    if (!p || !p.meta[playerId]) return;
    p.meta[playerId].awaySince = Date.now();
    /* v2.3.3284: when they were last on, for the list (in memory: written
       with the next roster change, or at their next join) */
    p.meta[playerId].seen = Date.now();
    this._partyBroadcast(p);
  },

  /* Join hook.  MUST run after the joiner's state_sync send: clients
   * clear their party HUD on every state_sync (a deploy wipes rosters,
   * so stale client state must not survive a reconnect), and this
   * re-send is what restores the HUD when the roster DID survive. */
  async _partyOnRejoin(playerId) {
    let p = this._partyOf(playerId);
    /* v2.3.3284: a party that lasts is read from storage at the join of
       any member who has none in memory (a logout, a deploy) */
    if (!p && this._partyKeepOn()) {
      try { p = await this._partyLoad(playerId); } catch (e) { p = null; }
      /* the socket may have gone while it was read */
      if (!this.playerState[playerId]) return;
    }
    if (!p) return;
    const meta = p.meta[playerId] || (p.meta[playerId] = {});
    delete meta.awaySince;
    if (this._partyKeepOn()) {
      /* name and level for the list, and `seen` for the alliance's count of
         active members (the next step) -- written only when they changed,
         or `seen` is older than SEEN_WRITE_MS: a reconnect storm writes
         nothing */
      const ps = this.playerState[playerId];
      const now = Date.now();
      const name = String(this._partyNameOf(playerId)).slice(0, PARTY.NAME_MAX);
      const level = (ps && ps.level) | 0 || 1;
      let dirty = meta.name !== name || (meta.level | 0) !== level || !(now - (+meta.ss || 0) < PARTY.SEEN_WRITE_MS);
      meta.name = name; meta.level = level; meta.seen = now;
      if (ps && ps.maxHp) meta.maxHp = ps.maxHp;
      /* a leader not seen for LEADER_IDLE_MS hands the party on to the
         longest-standing member online now (lazy: handoff rule 12) */
      if (p.leader !== playerId && !this.playerState[p.leader]) {
        const lm = p.meta[p.leader] || {};
        if (+lm.seen > 0 && now - lm.seen > PARTY.LEADER_IDLE_MS) {
          const next = p.members.find((m) => !!this.playerState[m]);
          if (next && next !== p.leader) { p.leader = next; dirty = true; }
        }
      }
      if (dirty) this._partyStore(p);
    }
    /* ═══ v2.3.3313: THE ALLIANCE (alliance.js) ═══
       The index and the wars are loaded at an alliance member's join (once a
       worker's life: a war's kills are scored only once they are), the count
       is taken, and the joiner's tag goes to everyone -- forced, as every
       phone has just made a fresh copy of them without it. */
    let became = null;
    if (this._allyOn && this._allyOn()) {
      if (p.ally && !this._allyIndex) {
        try { await this._allyEnsure(); } catch (e) { /* the next join tries again */ }
        if (!this.playerState[playerId] || this._partyOf(playerId) !== p) return;
      }
      became = this._allyCheck(p, Date.now());
    }
    if (this._allySetTag) this._allySetTag(playerId, true);
    this._partyBroadcast(p, became ? { became } : undefined);
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
      /* v2.3.3284: a party that lasts keeps its offline members */
      if (!this._partyKeepOn()) for (const pid of [...p.members]) {
        const meta = p.meta[pid];
        if (meta && meta.awaySince && now - meta.awaySince > PARTY.OFFLINE_GRACE_MS) {
          this._partyRemoveMember(p, pid, 'offline');
        }
      }
      if (!this._parties.has(p.id)) continue; // removal disbanded it
      /* v2.3.3284: a party that lasts stays in memory with nobody on; its
         roster is built for nobody, so it is not built */
      if (!p.members.some((m) => !!this.playerState[m])) continue;
      if (now - p.lastVitals >= PARTY.VITALS_MS) {
        p.lastVitals = now;
        /* v2.3.3313: a member reaching level 5 mid-visit, or one going stale,
           moves the count (a flip is the only write); and every online
           member's tag is checked against the truth -- one string compare
           each, and how the tags come off when the switch is thrown */
        const became = this._allyOn && this._allyOn() ? this._allyCheck(p, now) : null;
        if (this._allySetTag) for (const m of p.members) if (this.playerState[m]) this._allySetTag(m);
        this._partyBroadcast(p, became ? { became } : undefined);
      }
    }
  },
};
