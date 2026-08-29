/* ═══ CHAT LANES — say it to the room, the zone, or one person (v2.3.2134) ═══
 *
 * Owner, from the demo feedback: per-channel chat -- @user / @area / @all.
 *
 * WHAT ALREADY EXISTED, so this adds only what was missing:
 *   @all   -- room chat.  The default-branch relay, room-wide since
 *             v2.3.1575 deliberately left it out of interest management.
 *             Unchanged by this module.
 *   party  -- /p, its own validated case (party.js, v2.3.1212).
 *   friend -- friend-gated DMs (friends.js, v2.3.1323).
 *
 * MISSING, and added here:
 *   @area  -- the same zone only.  index.js's own note calls room chat
 *             "the ONE relay interest management deliberately did not
 *             zone-scope"; this is the lane for people who want to talk to
 *             whoever is standing near them.
 *   @user  -- a whisper to any player in the room, not just a friend.
 *             friend_dm requires an accepted friendship, so there was no way
 *             to answer a stranger privately.
 *
 * BUILT ON party_chat's SHAPE ON PURPOSE (rule 22).  Own validated cases,
 * never the room-wide rebroadcast; the payload is REBUILT from an allowlist
 * rather than filtered (rule 16 / TRAPS #13); the sender is stamped from the
 * SESSION so it cannot be forged (the v2.3.1150 note on the room relay says
 * in so many words that a client can forge payload.id/name there); text is
 * control-stripped and clamped BEFORE trim so padding cannot smuggle a long
 * line; both emitted types are PRIVILEGED (index.js) so a client cannot
 * inject them; nothing is stored (chat is ephemeral, rule 11).
 *
 * ═══ THE RATE LIMIT IS NOT OPTIONAL HERE ═══
 * Room chat rides the DEFAULT branch, which has the relay token bucket
 * ("8 burst + 4/s absorbs a human hammering chat").  An explicit case in the
 * router switch never reaches it -- which is precisely the hole v2.3.1970
 * found in party_invite ("party_invite is an EXPLICIT case in the router
 * switch, so the default branch's relay token bucket never sees it, and
 * there is no global inbound rate limit").  Both lanes below are explicit
 * cases, and a whisper is a targeted lane pointed at one person's screen, so
 * this module carries its own bucket rather than repeating that incident.
 *
 * Deploy-order (rule 19): the client gates its /a and /w sends on the NARROW
 * caps.areaChat / caps.whisper, never on some broader flag.  An older worker
 * has no case for either type, so it would fall through to the default branch
 * and REBROADCAST the line to the whole room -- a whisper shouted at
 * everyone, which is the worst possible failure.  So an un-upgraded worker
 * must never receive one, exactly as party.js argues for /p.
 */

export const CHAT_LANES = {
  TEXT_MAX: 200,          // matches CHAT_RELAY.TEXT_MAX and PARTY.CHAT_MAX --
                          // one line looks the same in every lane
  NAME_MAX: 24,           // the longest target name a whisper will look up
  /* The bucket the default branch would otherwise have given us. */
  BURST: 6,               // messages a player may send back-to-back
  REFILL_MS: 1500,        // ...and one more every this often
};

export const chatLaneMethods = {
  /* Same one-liner as _partySend.  Not reused from party.js: that module is
     about parties, and a chat lane reaching into it for transport would make
     a future room re-shard have to untangle the two (rule 22). */
  _laneSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return false;
    try { ws.send(JSON.stringify({ type, payload })); return true; } catch (e) { return false; }
  },

  /* Display name, with the same fallback ladder _partyNameOf uses -- some
     minimal joins (and the tests) omit the name from playerState. */
  _laneNameOf(pid) {
    const ps = this.playerState[pid];
    if (ps && ps.name) return ps.name;
    for (const [, s] of this.sessions) { if (s.id === pid) return s.name || 'Bro'; }
    return 'Bro';
  },

  /* One token bucket per sender, shared by both lanes so a sender cannot get
     a fresh allowance by alternating between them.  Map, not a plain object:
     it is keyed by a session id, which is client-influenced (CLAUDE.md rule
     4).  In-memory only -- a deploy restarts the DO and wipes it (rule 12),
     which is correct for a rate limit on ephemeral text. */
  _laneAllow(pid) {
    if (!this._laneBuckets) this._laneBuckets = new Map();
    const now = Date.now();
    let b = this._laneBuckets.get(pid);
    if (!b) { b = { tokens: CHAT_LANES.BURST, at: now }; this._laneBuckets.set(pid, b); }
    const gained = Math.floor((now - b.at) / CHAT_LANES.REFILL_MS);
    if (gained > 0) {
      b.tokens = Math.min(CHAT_LANES.BURST, b.tokens + gained);
      b.at = now;
    }
    if (b.tokens <= 0) return false;
    b.tokens--;
    return true;
  },

  /* Shared front half of both handlers: the sender is real, the line is a
     string, and it survives clamping.  Returns the cleaned text or null. */
  _laneText(session, payload) {
    if (!session || !session.id) return null;
    let text = payload && payload.text;
    if (typeof text !== 'string') return null;
    /* Clamp the RAW length first, then strip, then trim -- the order party.js
       settled on so a padded string cannot smuggle a long line. */
    text = text.slice(0, CHAT_LANES.TEXT_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    return text || null;
  },

  /* ── @area: everyone standing in the same zone ── */
  _handleAreaChat(session, payload) {
    const text = this._laneText(session, payload);
    if (!text) return;
    if (!this._laneAllow(session.id)) return;
    const ps = this.playerState[session.id];
    /* No zone means we cannot answer "who is nearby", so there is nobody to
       deliver to.  Denied by default rather than falling back to the room --
       falling back would turn a quiet lane into a loud one. */
    const zone = ps && ps.z;
    if (!zone) return;
    const wire = {
      from: session.id,                       // server-known, unforgeable
      fromName: this._laneNameOf(session.id),
      zone,
      text,
      ts: Date.now(),
    };
    /* The report path quotes the SERVER's copy of what was said, and a
       zone-scoped lane is one harassment can hide in for the same reason
       party chat is (chatmod.js, v2.3.1981). */
    this._chatModRemember(session.id, text, zone, 'area');
    for (const [, s] of this.sessions) {
      if (!s || !s.id) continue;
      const theirs = this.playerState[s.id];
      if (!theirs || theirs.z !== zone) continue;
      /* Per-recipient lane, so a mute drops the line before it is sent
         rather than sending it to be hidden. */
      if (this._chatModMuted(s.id, session.id)) continue;
      this._laneSend(s.id, 'area_chat', wire);
    }
  },

  /* ── @user: one player, by name ── */
  _handleWhisper(session, payload) {
    const text = this._laneText(session, payload);
    if (!text) return;
    let to = payload && payload.to;
    if (typeof to !== 'string') return;
    to = to.slice(0, CHAT_LANES.NAME_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    if (!to) return;
    if (!this._laneAllow(session.id)) return;

    /* Resolve by display name, case-insensitively.  Names are not unique in
       this game, so an ambiguous match is REFUSED rather than delivered to a
       guess -- sending a private line to the wrong person is worse than not
       sending it. */
    const want = to.toLowerCase();
    const hits = [];
    for (const [, s] of this.sessions) {
      if (!s || !s.id || s.id === session.id) continue;
      if (this._laneNameOf(s.id).toLowerCase() === want) hits.push(s.id);
    }
    if (hits.length === 0) {
      return this._laneSend(session.id, 'whisper_error', { reason: 'no-such-player', to });
    }
    if (hits.length > 1) {
      return this._laneSend(session.id, 'whisper_error', { reason: 'ambiguous', to, count: hits.length });
    }
    const targetId = hits[0];
    const wire = {
      from: session.id,
      fromName: this._laneNameOf(session.id),
      to: targetId,
      toName: this._laneNameOf(targetId),
      text,
      ts: Date.now(),
    };
    this._chatModRemember(session.id, text,
      (this.playerState[session.id] && this.playerState[session.id].z) || null, 'whisper');
    /* A mute is silent to the sender ON PURPOSE.  Telling them "you are
       muted" hands a harasser a way to confirm they got through to someone
       -- chatmod.js makes the same argument for the room lane.  The sender's
       own client echoes optimistically either way. */
    if (this._chatModMuted(targetId, session.id)) return;
    this._laneSend(targetId, 'whisper', wire);
  },
};
