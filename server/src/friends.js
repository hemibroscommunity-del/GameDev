/* v2.3.1323: FRIENDS — mutual friendships, requests, direct messages.
 *
 * Until now "friends" were a one-directional localStorage list on each
 * client (bt_friends) — no consent, no persistence across devices, no
 * messaging.  This mixin makes friendship a SERVER fact:
 *
 *   - friend_request / accept / decline / remove: a clan-invite-style
 *     handshake (rule 14 — an accept is honored only against a stored
 *     request from the other side; a forged accept is DROPPED, rule 15).
 *     Requests persist in storage, so they reach offline players on
 *     their next join (unlike the memory-only party invites — a friend
 *     request is a durable social fact, not a fleeting session offer).
 *   - friend_dm: friend-gated direct messages on the party_chat shape
 *     (server-stamped sender, length-clamped, control-stripped, its own
 *     validated case — never the room rebroadcast).  Offline recipients
 *     get a capped storage backlog delivered on join.
 *
 * Storage (registered in ARCHITECTURE-HANDOFF rule 2):
 *   friends:<pid>    {list, reqIn, reqOut} — id-keyed maps of
 *                    {name, at|since}.  Loaded into null-proto copies
 *                    (rule H: pids are client-supplied keys).
 *   friend_msg:<pid> [{from, fromName, text, ts}] offline DM backlog,
 *                    capped at DM_BACKLOG_MAX (oldest dropped).
 *
 * No coins/items move here, so there are no opIds (rule 5 applies to
 *  settlement); every mutation is a plain last-write state change and
 *  re-syncs both parties' docs.
 * Deploy-order (rule 19): caps.friends gates the client's server flows;
 *  old clients keep their localStorage list untouched, old servers just
 *  never see the new event types (unknown types rebroadcast — but all
 *  five friend_* CLIENT events are harmless echoes to old clients,
 *  which have no handlers for them).
 */

import { PACE } from './flood.js';   /* v2.3.3274: an offline friend's box takes so many lines a sender */

export const FRIENDS = {
  LIST_MAX: 100,        // friendships per player
  REQ_OUT_MAX: 25,      // pending outgoing requests per player
  REQ_IN_MAX: 50,       // v2.3.5709: pending requests a player RECEIVES (card SEC PR 10)
  DM_MAX: 280,          // chars per message
  DM_BACKLOG_MAX: 50,   // stored offline DMs per recipient
  NAME_MAX: 24,         // stored display-name clamp
  /* v2.3.5624 (card MOD PR 4; the red team's RT-3 S5): one request a player
     to the same target per this long -- a request, its cancel and the
     request again was a popup at the target each time, with no pace -- and
     the paces held, at most PACE_KEYS (the oldest go first) */
  REQUEST_REPEAT_MS: 5000,
  PACE_KEYS: 2000,
  /* v2.3.5811 (card RV, SEC-F4): a request received this long ago and never
     answered is let go, where the record is written anyway (never a write
     of its own); the 50 ceiling (REQ_IN_MAX) then refills by itself */
  REQ_IN_TTL_MS: 30 * 86400000,
};

/* v2.3.5811 (card RV): `friendfix: false` in the live flags, the kill switch
   for ACC-5 and SEC-F4 below (lower case, on unless written false) */
const friendFixOn = (room) => {
  const f = room && room._liveFlags;
  return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'friendfix') && !f.friendfix);
};
/* the requests a doc RECEIVED that have run out, let go (in place) */
const dropStale = (doc, now) => {
  if (!doc || !doc.reqIn) return;
  for (const k of Object.keys(doc.reqIn)) {
    const r = doc.reqIn[k];
    const at = r && typeof r.at === 'number' ? r.at : 0;
    if (now - at > FRIENDS.REQ_IN_TTL_MS) delete doc.reqIn[k];
  }
};

/* v2.3.5811 (Z44's review): ...and the requests a doc SENT that have run
   out, the same way: the target's copy goes by dropStale above (written
   where the target's record is), so the sender's own copy goes where the
   sender's record is written -- on their next request -- or it held one of
   their REQ_OUT_MAX slots, and a repeat to the same player, for good */
const dropStaleOut = (doc, now) => {
  if (!doc || !doc.reqOut) return;
  for (const k of Object.keys(doc.reqOut)) {
    const r = doc.reqOut[k];
    const at = r && typeof r.at === 'number' ? r.at : 0;
    if (now - at > FRIENDS.REQ_IN_TTL_MS) delete doc.reqOut[k];
  }
};

const ownKeys = (o) => (o ? Object.keys(o) : []);
const cleanName = (v, fallback) => {
  if (typeof v !== 'string') return fallback;
  const s = v.slice(0, FRIENDS.NAME_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
  return s || fallback;
};

export const friendsMethods = {
  /* Load a player's friend doc with NULL-PROTO id-keyed maps (rule H —
   * '__proto__' as a pid must be inert). */
  async _friendsDoc(pid) {
    const stored = await this.state.storage.get('friends:' + pid);
    const doc = { list: Object.create(null), reqIn: Object.create(null), reqOut: Object.create(null) };
    if (stored) {
      for (const part of ['list', 'reqIn', 'reqOut']) {
        const src = stored[part];
        if (src && typeof src === 'object') {
          for (const id of Object.keys(src)) doc[part][id] = src[id];
        }
      }
    }
    return doc;
  },

  async _friendsPut(pid, doc) {
    /* Spread into plain objects for structured-clone storage; the
     * null-proto guard matters in MEMORY (lookups), not at rest. */
    await this.state.storage.put('friends:' + pid, {
      list: { ...doc.list }, reqIn: { ...doc.reqIn }, reqOut: { ...doc.reqOut },
    });
  },

  _friendsSend(pid, type, payload) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return false;
    try { this._send(ws, { type, payload }); } catch (e) {}
    return true;
  },

  _friendsNameOf(pid) {
    const ps = this.playerState[pid];
    if (ps && ps.name) return ps.name;
    for (const [, s] of this.sessions) { if (s.id === pid) return s.name || 'Bro'; }
    return 'Bro';
  },

  async _friendsSyncTo(pid) {
    const doc = await this._friendsDoc(pid);
    this._friendsSend(pid, 'friend_sync', {
      list: { ...doc.list }, reqIn: { ...doc.reqIn }, reqOut: { ...doc.reqOut },
    });
  },

  /* Join hook (join.js, after the inbox drain): current doc + any DM
   * backlog, then the backlog is cleared (delivered-once semantics —
   * the client persists threads locally). */
  async _friendsOnJoin(pid, ws) {
    try {
      const doc = await this._friendsDoc(pid);
      const wire = { list: { ...doc.list }, reqIn: { ...doc.reqIn }, reqOut: { ...doc.reqOut } };
      try { this._send(ws, { type: 'friend_sync', payload: wire }); } catch (e) {}
      const box = await this.state.storage.get('friend_msg:' + pid);
      if (Array.isArray(box) && box.length) {
        try { this._send(ws, { type: 'friend_dm_backlog', payload: { messages: box } }); } catch (e) {}
        await this.state.storage.delete('friend_msg:' + pid);
      }
    } catch (e) { /* social must never break a join */ }
  },

  async _handleFriendRequest(session, payload) {
    const from = session.id;
    const target = payload && payload.target;
    if (!from || !target || typeof target !== 'string' || target === from) return;
    if (target.length > 64) return;
    const mine = await this._friendsDoc(from);
    if (mine.list[target]) {
      return this._friendsSend(from, 'friend_error', { reason: 'already-friends', target });
    }
    /* v2.3.5811 (Z44's review): a request of mine that ran out is let go
       first (dropStaleOut above; my record is written below on a new one) */
    if (friendFixOn(this)) dropStaleOut(mine, Date.now());
    if (mine.reqOut[target]) return; // duplicate request: idempotent no-op
    /* Crossing requests = mutual intent -> auto-accept. */
    if (mine.reqIn[target]) return this._friendAcceptCore(from, target);
    if (ownKeys(mine.reqOut).length >= FRIENDS.REQ_OUT_MAX) {
      return this._friendsSend(from, 'friend_error', { reason: 'too-many-requests' });
    }
    /* The target must be a REAL player: online now, or persisted. */
    const online = !!this.playerState[target];
    if (!online) {
      const blob = await this.state.storage.get('rpg:' + target);
      if (!blob) return this._friendsSend(from, 'friend_error', { reason: 'not-found', target });
    }
    const theirs = await this._friendsDoc(target);
    /* v2.3.5811 (card RV, SEC-F4): a request received a month ago and never
       answered is let go before the ceiling is asked: the target's record is
       written just below, so no write of its own */
    if (friendFixOn(this)) dropStale(theirs, Date.now());
    if (ownKeys(theirs.list).length >= FRIENDS.LIST_MAX) {
      return this._friendsSend(from, 'friend_error', { reason: 'target-full', target });
    }
    /* v2.3.5709 (card SEC PR 10): and the requests a player RECEIVES have a
       ceiling (none had: one player's record grew by a request from every
       made-up id), answered as a full list is.  KILL SWITCH `reqincap: false`. */
    {
      const _rf = this._liveFlags;
      const _cap = !(_rf && typeof _rf === 'object' && Object.prototype.hasOwnProperty.call(_rf, 'reqincap') && !_rf.reqincap);
      if (_cap && ownKeys(theirs.reqIn).length >= FRIENDS.REQ_IN_MAX) {
        return this._friendsSend(from, 'friend_error', { reason: 'target-full', target });
      }
    }
    /* v2.3.5624: one NEW request card to the same target per
       REQUEST_REPEAT_MS: a repeat's card is held (v2.3.5628: the request still recorded and answered; a
       request, its cancel and the request again: party.js's rule; the
       answers above -- already friends, a duplicate -- stay as they were).
       KILL SWITCH `invitepace: false` in the live flags. */
    /* v2.3.5628 (card MOD PR 8; sitting 23's review): a repeat inside the
       window is ANSWERED AS SENT, as the card says -- the request is
       recorded and both lists synced as ever -- only its card (the target's
       popup and sound) is held.  It was dropped silently: the sender's page
       had no answer. */
    let _held = false;
    const _f = this._liveFlags;
    if (!(_f && typeof _f === 'object' && Object.prototype.hasOwnProperty.call(_f, 'invitepace') && !_f.invitepace)) {
      if (!this._friendReqAt) this._friendReqAt = new Map();   /* 'from>target' -> ts: capped, oldest first */
      const _k = from + '>' + target, _now = Date.now();
      const _was = this._friendReqAt.get(_k);
      if (_was && _now - _was < FRIENDS.REQUEST_REPEAT_MS) _held = true;
      else {
        this._friendReqAt.delete(_k);
        this._friendReqAt.set(_k, _now);
        while (this._friendReqAt.size > FRIENDS.PACE_KEYS) this._friendReqAt.delete(this._friendReqAt.keys().next().value);
      }
    }
    const now = Date.now();
    /* reqOut name is client-supplied DISPLAY data for the requester's
     * own UI (they saw it in-world); the reqIn name shown to the TARGET
     * is the server's own identity for the sender — unforgeable. */
    mine.reqOut[target] = { name: cleanName(payload.name, 'Bro'), at: now };
    theirs.reqIn[from] = { name: this._friendsNameOf(from), at: now };
    await this._friendsPut(from, mine);
    await this._friendsPut(target, theirs);
    if (!_held) this._friendsSend(target, 'friend_request_in', { from, fromName: theirs.reqIn[from].name, at: now });   /* v2.3.5628: a held repeat has no card */
    await this._friendsSyncTo(from);
    if (online) await this._friendsSyncTo(target);
  },

  /* a accepts b's request.  Honored ONLY against a stored reqIn from b
   * (rule 14); anything else drops silently (rule 15 — no oracle). */
  async _friendAcceptCore(a, b) {
    const da = await this._friendsDoc(a);
    if (!da.reqIn[b]) return;
    const db = await this._friendsDoc(b);
    const now = Date.now();
    const nameOfB = da.reqIn[b].name || this._friendsNameOf(b);
    /* ═══ v2.3.5811 (card RV, ACC-5): BOTH SIDES, OR NEITHER ═══
       Each side was added only while its own list had room, so a list that
       filled between the request and the accept made a friendship of one
       side: that side could message the other for ever (a DM asks only the
       sender's list), and the other could not remove them (a remove asks
       only the remover's).  Now a full list on either side refuses the
       accept and keeps the request, with the answer a full list already
       has.  `friendfix: false`: as before. */
    if (friendFixOn(this) && ownKeys(da.list).length >= FRIENDS.LIST_MAX) {
      /* v2.3.5811 (Z44's review): the accepter's OWN list full says so, not
         "their list is full" (src/game/friendErrors.js `own-full`) */
      return this._friendsSend(a, 'friend_error', { reason: 'own-full', target: b });
    }
    if (friendFixOn(this) && ownKeys(db.list).length >= FRIENDS.LIST_MAX) {
      return this._friendsSend(a, 'friend_error', { reason: 'target-full', target: b });
    }
    delete da.reqIn[b]; delete da.reqOut[b];
    delete db.reqOut[a]; delete db.reqIn[a];
    if (ownKeys(da.list).length < FRIENDS.LIST_MAX) da.list[b] = { name: nameOfB, since: now };
    if (ownKeys(db.list).length < FRIENDS.LIST_MAX) db.list[a] = { name: this._friendsNameOf(a), since: now };
    await this._friendsPut(a, da);
    await this._friendsPut(b, db);
    this._friendsSend(b, 'friend_accepted', { by: a, byName: this._friendsNameOf(a), at: now });
    await this._friendsSyncTo(a);
    await this._friendsSyncTo(b);
  },

  async _handleFriendAccept(session, payload) {
    const from = payload && payload.from;
    if (!session.id || !from || typeof from !== 'string') return;
    await this._friendAcceptCore(session.id, from);
  },

  async _handleFriendDecline(session, payload) {
    const me = session.id;
    const from = payload && payload.from;
    if (!me || !from || typeof from !== 'string') return;
    const mine = await this._friendsDoc(me);
    if (!mine.reqIn[from]) return;
    delete mine.reqIn[from];
    const theirs = await this._friendsDoc(from);
    delete theirs.reqOut[me];
    await this._friendsPut(me, mine);
    await this._friendsPut(from, theirs);
    await this._friendsSyncTo(me);
    /* Deliberately NO notification to the requester — declining is
     * private (matches every mainstream social surface). */
    if (this.playerState[from]) await this._friendsSyncTo(from);
  },

  async _handleFriendRemove(session, payload) {
    const me = session.id;
    const fid = payload && payload.fid;
    if (!me || !fid || typeof fid !== 'string') return;
    const mine = await this._friendsDoc(me);
    if (!mine.list[fid]) {
      /* v2.3.5811 (card RV, ACC-5): a friendship of ONE side (made before the
         accept above held both) is ended by the side it names too: the one
         who could not remove it was the one being messaged.  Only when the
         other side's list still holds this player; nothing else changes. */
      if (!friendFixOn(this) || fid.length > 64) return;
      const theirs1 = await this._friendsDoc(fid);
      if (!theirs1.list[me]) return;
      delete theirs1.list[me];
      await this._friendsPut(fid, theirs1);
      await this._friendsSyncTo(me);
      if (this.playerState[fid]) await this._friendsSyncTo(fid);
      return;
    }
    delete mine.list[fid];
    const theirs = await this._friendsDoc(fid);
    delete theirs.list[me];
    await this._friendsPut(me, mine);
    await this._friendsPut(fid, theirs);
    await this._friendsSyncTo(me);
    if (this.playerState[fid]) await this._friendsSyncTo(fid);
  },

  /* Friend-gated DM on the party_chat shape: clamp raw length FIRST,
   * strip control chars, server-stamped sender.  Online -> live event;
   * offline -> capped storage backlog (delivered + cleared on join). */
  async _handleFriendDm(session, payload) {
    const from = session.id;
    const to = payload && payload.to;
    let text = payload && payload.text;
    if (!from || !to || typeof to !== 'string' || typeof text !== 'string') return;
    text = text.slice(0, FRIENDS.DM_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    /* v2.3.3396: then cleaned, as every chat lane is (chatguard.js) -- before
       the allowance, so a line with nothing left in it costs none, as an
       empty one never did; a DM is private, so no repeat filter */
    text = this._chatGuardClean(text);
    if (!text) return;
    /* v2.3.3274: a DM is a chat line and spends the sender's chat allowance
       (chatlanes.js _laneAllow: six, then one every 1.5 s).  There was no
       limit at all, and each line to an offline friend was a row written. */
    if (this._laneAllow && !this._laneAllow(from)) return;
    const mine = await this._friendsDoc(from);
    if (!mine.list[to]) {
      return this._friendsSend(from, 'friend_error', { reason: 'not-friends', target: to });
    }
    const wire = { from, fromName: this._friendsNameOf(from), text, ts: Date.now() };
    /* v2.3.1981: a mute silences EVERY lane, including this one, and the
       line is dropped rather than backlogged -- a mute that still filled
       your inbox for the next login would be a mute in name only
       (chatmod.js).  Remembered first, because a DM is the lane where the
       nastiest things get said and the report path can only quote lines
       the server actually saw. */
    this._chatModRemember(from, text, this.playerState[from] && this.playerState[from].z, 'dm', to);   /* v2.3.5623: whom it was for */
    if (this._chatModMuted(to, from)) return;
    if (!this._friendsSend(to, 'friend_dm', wire)) {
      const box = (await this.state.storage.get('friend_msg:' + to)) || [];
      /* v2.3.3274: one sender may leave PACE.DM_PER_SENDER_BOX unread lines in
         a friend's box; past that a line is dropped, not written (flood.js) */
      let _mine = 0;
      for (const e of box) if (e && e.from === from) _mine++;
      if (_mine >= PACE.DM_PER_SENDER_BOX) return;
      box.push(wire);
      if (box.length > FRIENDS.DM_BACKLOG_MAX) box.splice(0, box.length - FRIENDS.DM_BACKLOG_MAX);
      await this.state.storage.put('friend_msg:' + to, box);
    }
  },
};
