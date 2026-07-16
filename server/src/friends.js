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

export const FRIENDS = {
  LIST_MAX: 100,        // friendships per player
  REQ_OUT_MAX: 25,      // pending outgoing requests per player
  DM_MAX: 280,          // chars per message
  DM_BACKLOG_MAX: 50,   // stored offline DMs per recipient
  NAME_MAX: 24,         // stored display-name clamp
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
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
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
      try { ws.send(JSON.stringify({ type: 'friend_sync', payload: wire })); } catch (e) {}
      const box = await this.state.storage.get('friend_msg:' + pid);
      if (Array.isArray(box) && box.length) {
        try { ws.send(JSON.stringify({ type: 'friend_dm_backlog', payload: { messages: box } })); } catch (e) {}
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
    if (ownKeys(theirs.list).length >= FRIENDS.LIST_MAX) {
      return this._friendsSend(from, 'friend_error', { reason: 'target-full', target });
    }
    const now = Date.now();
    /* reqOut name is client-supplied DISPLAY data for the requester's
     * own UI (they saw it in-world); the reqIn name shown to the TARGET
     * is the server's own identity for the sender — unforgeable. */
    mine.reqOut[target] = { name: cleanName(payload.name, 'Bro'), at: now };
    theirs.reqIn[from] = { name: this._friendsNameOf(from), at: now };
    await this._friendsPut(from, mine);
    await this._friendsPut(target, theirs);
    this._friendsSend(target, 'friend_request_in', { from, fromName: theirs.reqIn[from].name, at: now });
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
    if (!mine.list[fid]) return;
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
    if (!text) return;
    const mine = await this._friendsDoc(from);
    if (!mine.list[to]) {
      return this._friendsSend(from, 'friend_error', { reason: 'not-friends', target: to });
    }
    const wire = { from, fromName: this._friendsNameOf(from), text, ts: Date.now() };
    if (!this._friendsSend(to, 'friend_dm', wire)) {
      const box = (await this.state.storage.get('friend_msg:' + to)) || [];
      box.push(wire);
      if (box.length > FRIENDS.DM_BACKLOG_MAX) box.splice(0, box.length - FRIENDS.DM_BACKLOG_MAX);
      await this.state.storage.put('friend_msg:' + to, box);
    }
  },
};
