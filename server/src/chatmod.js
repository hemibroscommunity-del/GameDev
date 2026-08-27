/* ═══ v2.3.1981: CHAT MODERATION — server-side mute + abuse reports ═══
 *
 * Blocking somebody was a LOCALSTORAGE ARRAY (`bt_muted` / `bt_blocked`,
 * read in src/game/chat.js).  Three things follow from that, and all
 * three are the wrong answer for a public demo:
 *
 *   1. The mute does not survive the device.  A player who mutes a
 *      harasser on their phone meets them again, unmuted, on a laptop
 *      or after clearing site data.  Identity is already durable
 *      (stable `bp_` ids, identity.md) — the mute was the only half
 *      still living in the browser.
 *   2. The line still ARRIVES.  Filtering happened after the message
 *      had been fanned out to the socket, so "mute" meant the abuse was
 *      rendered as `[muted]` rather than not delivered.  Anything the
 *      client can choose to hide, a modified client can choose to show,
 *      and the text is on the wire either way.
 *   3. There was NO report path at all.  An operator running a public
 *      demo had no record of who said what to whom — only whatever a
 *      player thought to screenshot.
 *
 * So: the mute list is a server fact, enforced on the FAN-OUT (tick.js
 * filters the muter's own tick frame; party chat and friend DMs are
 * filtered at their send loops), and a report is a durable storage
 * record the operator reads over the existing owner-keyed admin API.
 *
 * THE OFFENDING TEXT IS THE SERVER'S COPY, NEVER THE CLIENT'S CLAIM
 * (rule 16).  `_chatModRemember` records each line as `_sanitizeChatRelay`
 * (index.js) / `_handlePartyChat` (party.js) finished sanitising it —
 * clamped, control-stripped, sender stamped from the session — and a
 * report attaches the last CONTEXT_LINES of those.  A report message
 * therefore carries only WHO and WHY; nothing a client types can end up
 * in the operator's evidence, so a report cannot be used to plant words
 * in somebody else's mouth.
 *
 * Storage (registered in ARCHITECTURE-HANDOFF rule 2):
 *   chat_mute:<pid>       {list: {mutedId: {name, at}}} — the muter's own
 *                         list.  Loaded into a null-proto map + a Set on
 *                         join (rule H: pids are client-supplied keys).
 *   chat_report:<id>      one report: reporter, target, both server-known
 *                         names, reason code, zone, and the server's copy
 *                         of the recent lines.  Pruned past RETAIN_MS on
 *                         the admin read.
 *
 * No coins or items move here, so there are no opIds (rule 5 is about
 * settlement); every mutation is a last-write state change that re-syncs
 * the muter's own doc.
 *
 * Deploy-order (rule 19): caps.chatMute gates the client.  Against an OLD
 * worker the flag is absent, the client keeps its localStorage list and
 * its `[muted]` rendering, and never sends the two new types.  Against a
 * NEW worker an old client simply never mutes server-side — its local
 * list still works, because the client-side filter in chat.js is KEPT as
 * the fallback half rather than deleted.
 *
 * In-memory, deliberately (rule 11 — a deploy wipe must lose nothing of
 * value): the mute Sets (reloaded from storage on the next join), the
 * per-speaker line ring (context for a report; a wipe costs at most the
 * last few lines of evidence, and the report itself is durable), and the
 * report rate-limit counters (a wipe hands a reporter a fresh budget,
 * which is the cheapest possible thing to lose — and nobody can force a
 * deploy to get it).
 */

export const CHATMOD = {
  MUTE_MAX: 200,             // muted ids one player may hold
  NAME_MAX: 24,              // stored display-name clamp (matches FRIENDS)
  ID_MAX: 64,                // a bp_ id is ~20 chars; this is the sanity bound
  CONTEXT_LINES: 3,          // server-seen lines attached to a report
  CONTEXT_AGE_MS: 15 * 60 * 1000, // older lines are not evidence of THIS report
  SEEN_MAX: 120,             // speakers held in the line ring (2x MAX_PLAYERS)
  REPORT_PER_HOUR: 5,        // per reporter
  REPORT_PER_DAY: 20,        // per reporter
  REPORT_DUP_MS: 60 * 1000,  // same reporter + same target inside this = dup
  RETAIN_MS: 30 * 24 * 3600 * 1000, // reports pruned past this on admin read
  ADMIN_LIST_MAX: 200,       // rows one admin read may return
};

/* Relay types a MUTE suppresses.  Deliberately NOT "everything this
   player relays": mute is about chat, block is about interaction, and
   silently dropping a muted player's trade/duel/threat halves would
   turn a chat control into an invisible interaction gate the muter
   never asked for (and would break handshakes mid-flight).  `emote` is
   in because it is a chat bubble that makes a NOISE — the client chirps
   on every one (chat.js handleEmoteEvent). */
export const MUTABLE_RELAY_TYPES = new Set(['chat', 'emote']);

/* Reason codes.  An ALLOWLIST rather than free text, on purpose: the
   report record is read by the operator, and free text from a client is
   a place to put a slur, a URL, or 16 KB of padding.  Everything the
   operator needs to judge the case is already server-derived. */
export const REPORT_REASONS = new Set(['spam', 'abuse', 'harassment', 'cheating', 'other']);

const cleanName = (v, fallback) => {
  if (typeof v !== 'string') return fallback;
  const s = v.slice(0, CHATMOD.NAME_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
  return s || fallback;
};
const validId = (v, notMe) => (typeof v === 'string' && !!v && v.length <= CHATMOD.ID_MAX && v !== notMe);

export const chatModMethods = {
  /* Lazily built so the constructor stays untouched and a DO restart
     rebuilds them empty (which is correct — join reloads the mutes). */
  _chatModMaps() {
    if (!this.chatMutes) this.chatMutes = new Map();   // pid -> Set(mutedId)
    if (!this.chatSeen) this.chatSeen = new Map();     // pid -> [{text, ts, zone, lane}]
    if (!this._chatReportLog) this._chatReportLog = new Map(); // pid -> [{ts, target}]
  },

  /* The muter's stored doc as a NULL-PROTO id-keyed map (rule H — a
     player who muted '__proto__' must not write through the prototype). */
  async _chatMuteDoc(pid) {
    const stored = await this.state.storage.get('chat_mute:' + pid);
    const doc = Object.create(null);
    const src = stored && stored.list;
    if (src && typeof src === 'object') {
      for (const id of Object.keys(src)) {
        const e = src[id];
        doc[id] = { name: cleanName(e && e.name, 'Bro'), at: (e && +e.at) || 0 };
      }
    }
    return doc;
  },

  _chatModCache(pid, doc) {
    this._chatModMaps();
    this.chatMutes.set(pid, new Set(Object.keys(doc)));
  },

  /* SYNCHRONOUS by design — the tick fan-out and the party/DM send loops
     ask this per recipient, per message, and neither may await. */
  _chatModMuted(muterId, speakerId) {
    if (!muterId || !speakerId || !this.chatMutes) return false;
    const set = this.chatMutes.get(muterId);
    return !!(set && set.has(speakerId));
  },

  /* The server-stamped sender of a RELAYED event.  `from` is written by
     the default branch of webSocketMessage (index.js) from the session,
     so it is unforgeable; payload.id is the client's claim and is
     deliberately not consulted here. */
  _chatModSpeakerOf(e) {
    if (!e || !MUTABLE_RELAY_TYPES.has(e.type)) return null;
    return typeof e.from === 'string' && e.from ? e.from : null;
  },

  /* Speakers of the mutable events in this tick's batch, or null when
     the batch has none — which is the overwhelmingly common case and the
     reason the whole filter costs nothing on a normal tick. */
  _chatModSpeakers(events) {
    let out = null;
    for (const e of events) {
      const sp = this._chatModSpeakerOf(e);
      if (sp) (out || (out = new Set())).add(sp);
    }
    return out;
  },

  /* '' when this session mutes nobody who spoke this tick (so it shares
     the normal per-(zone, protocolVersion) serialization), otherwise a
     stable key naming exactly the intersection — every session with the
     same intersection still shares ONE serialization, preserving the
     "build once, send many" property of the fan-out. */
  _chatModMuteKey(sessionId, speakers) {
    if (!sessionId || !speakers || !this.chatMutes) return '';
    const set = this.chatMutes.get(sessionId);
    if (!set || set.size === 0) return '';
    let hit = null;
    for (const sp of speakers) if (set.has(sp)) (hit || (hit = [])).push(sp);
    return hit ? '|m:' + hit.sort().join(',') : '';
  },

  _chatModMuteSet(sessionId) {
    return (this.chatMutes && this.chatMutes.get(sessionId)) || null;
  },

  /* Remember a line AS THE SERVER SAW IT (already clamped + stripped by
     the caller).  LRU-bounded: re-inserting moves the speaker to the end
     of the Map's insertion order, so evicting the first key evicts the
     least recently heard speaker. */
  _chatModRemember(pid, text, zone, lane) {
    if (!pid || !text) return;
    this._chatModMaps();
    const prev = this.chatSeen.get(pid);
    if (prev) this.chatSeen.delete(pid);
    const arr = prev || [];
    arr.push({ text, ts: Date.now(), zone: zone || null, lane: lane || 'room' });
    if (arr.length > CHATMOD.CONTEXT_LINES) arr.splice(0, arr.length - CHATMOD.CONTEXT_LINES);
    this.chatSeen.set(pid, arr);
    if (this.chatSeen.size > CHATMOD.SEEN_MAX) {
      const oldest = this.chatSeen.keys().next().value;
      if (oldest !== undefined) this.chatSeen.delete(oldest);
    }
  },

  _chatModRecentLines(pid) {
    if (!this.chatSeen) return [];
    const arr = this.chatSeen.get(pid);
    if (!arr) return [];
    const cutoff = Date.now() - CHATMOD.CONTEXT_AGE_MS;
    return arr.filter((l) => l.ts >= cutoff)
      .map((l) => ({ text: l.text, ts: l.ts, zone: l.zone, lane: l.lane }));
  },

  _chatModNameOf(pid, claimed) {
    const ps = this.playerState[pid];
    if (ps && ps.name) return ps.name;
    for (const [, s] of this.sessions) { if (s.id === pid) return s.name || 'Bro'; }
    /* Offline: fall back to the requester's CLAIM, clamped.  Display-only
       and only ever shown back to the person who typed it (their own mute
       list), exactly the friends.js reqOut precedent — it never reaches a
       third party and never lands in a report (both report names are
       resolved from the server's own state, with 'Bro' where it can't be). */
    return cleanName(claimed, 'Bro');
  },

  _chatModSend(pid, type, payload) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return false;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
    return true;
  },

  _chatModListWire(doc) {
    const list = Object.keys(doc).map((id) => ({ id, name: doc[id].name, at: doc[id].at }));
    list.sort((a, b) => (b.at || 0) - (a.at || 0));
    return list;
  },

  _chatModSendList(pid, doc, extra) {
    this._chatModSend(pid, 'chat_mute_list', { list: this._chatModListWire(doc), settled: true, ...(extra || {}) });
  },

  /* Join hook (join.js, after the friends sync): the mute list is loaded
     into memory BEFORE the player can receive anything, so the very first
     tick after a join is already filtered, and echoed so the client's UI
     shows the server's list rather than whatever this browser remembers. */
  async _chatModOnJoin(pid, ws) {
    try {
      const doc = await this._chatMuteDoc(pid);
      this._chatModCache(pid, doc);
      const wire = { list: this._chatModListWire(doc), settled: true };
      try { ws.send(JSON.stringify({ type: 'chat_mute_list', payload: wire })); } catch (e) {}
    } catch (e) { /* moderation must never break a join */ }
  },

  /* Drop the in-memory Set when the socket goes; the doc is durable and
     the next join reloads it.  The line ring is NOT dropped — a report
     filed seconds after the offender logs off still needs its evidence,
     and the ring is LRU-bounded above. */
  _chatModOnClose(pid) {
    if (pid && this.chatMutes) this.chatMutes.delete(pid);
  },

  async _handleChatMute(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const target = payload && payload.target;
    if (!validId(target, me)) return;
    const on = !!(payload && payload.on);
    const doc = await this._chatMuteDoc(me);
    if (on) {
      if (!doc[target]) {
        if (Object.keys(doc).length >= CHATMOD.MUTE_MAX) {
          return this._chatModSendList(me, doc, { error: 'list-full' });
        }
        doc[target] = { name: this._chatModNameOf(target, payload && payload.name), at: Date.now() };
      }
    } else if (doc[target]) {
      delete doc[target];
    }
    /* Spread into a plain object for structured-clone storage; the
       null-proto guarantee matters in MEMORY (lookups), not at rest —
       the friends.js _friendsPut precedent. */
    await this.state.storage.put('chat_mute:' + me, { list: { ...doc }, at: Date.now() });
    this._chatModCache(me, doc);
    this._chatModSendList(me, doc);
  },

  /* Rate gate: '' when the report may proceed, else the refusal code.
     In-memory (see the header note on rule 11). */
  _chatModReportGate(me, target) {
    this._chatModMaps();
    const now = Date.now();
    let log = this._chatReportLog.get(me) || [];
    log = log.filter((r) => now - r.ts < 24 * 3600 * 1000);
    if (log.some((r) => r.target === target && now - r.ts < CHATMOD.REPORT_DUP_MS)) {
      this._chatReportLog.set(me, log);
      return 'duplicate';
    }
    if (log.length >= CHATMOD.REPORT_PER_DAY) { this._chatReportLog.set(me, log); return 'rate-day'; }
    if (log.filter((r) => now - r.ts < 3600 * 1000).length >= CHATMOD.REPORT_PER_HOUR) {
      this._chatReportLog.set(me, log);
      return 'rate-hour';
    }
    log.push({ ts: now, target });
    this._chatReportLog.set(me, log);
    return '';
  },

  async _handleChatReport(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const target = payload && payload.target;
    if (!validId(target, me)) {
      return this._chatModSend(me, 'chat_report_ack', { ok: false, error: 'bad-target' });
    }
    /* The target must be a REAL player — online now, or persisted.  Same
       existence test friends.js runs, for the same reason: a report on an
       id nobody has ever held is noise in the operator's queue. */
    const targetPs = this.playerState[target];
    if (!targetPs && !(await this.state.storage.get('rpg:' + target))) {
      return this._chatModSend(me, 'chat_report_ack', { ok: false, error: 'not-found' });
    }
    const gate = this._chatModReportGate(me, target);
    if (gate) return this._chatModSend(me, 'chat_report_ack', { ok: false, error: gate });
    const reason = (payload && REPORT_REASONS.has(payload.reason)) ? payload.reason : 'other';
    const myPs = this.playerState[me];
    const at = Date.now();
    const id = at.toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    const rec = {
      at,
      reason,
      by: me,
      byName: this._chatModNameOf(me),
      target,
      targetName: this._chatModNameOf(target),
      /* The zone the REPORTED player is standing in, falling back to the
         reporter's — chat is the one relay that is not zone-scoped
         (v2.3.1575), so the two can legitimately differ. */
      zone: (targetPs && targetPs.z) || (myPs && myPs.z) || null,
      targetOnline: !!targetPs,
      /* Server's copy of what was actually said (see the header). */
      lines: this._chatModRecentLines(target),
    };
    await this.state.storage.put('chat_report:' + id, rec);
    this._chatModSend(me, 'chat_report_ack', { ok: true, id, lines: rec.lines.length, settled: true });
  },

  /* Operator surface, mounted under the existing owner-keyed admin API
     (admin.js: Bearer ADMIN_KEY, fail-closed 404 when unconfigured).
     Same contract as _liveopsRoutes / _chainScoreAdminRoute: return null
     for a path this module does not own.
       GET    /api/admin/reports?limit=&target=   newest first
       DELETE /api/admin/reports?id=              dismiss one handled report
     No moderation UI is claimed here — the operator acts with the levers
     that already exist (/freeze, /kick, admin_log). */
  async _chatModAdminRoute(request, url, path, json) {
    if (request.method === 'GET' && path === '/reports') {
      const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);
      const limit = Math.max(1, Math.min(CHATMOD.ADMIN_LIST_MAX, Number.isFinite(rawLimit) ? rawLimit : 50));
      const filter = url.searchParams.get('target') || '';
      const all = await this.state.storage.list({ prefix: 'chat_report:' });
      const cutoff = Date.now() - CHATMOD.RETAIN_MS;
      const stale = [];
      let rows = [];
      for (const [k, v] of all) {
        if (!v || typeof v !== 'object' || typeof v.at !== 'number' || v.at < cutoff) { stale.push(k); continue; }
        rows.push({ key: k, ...v });
      }
      /* Retention prune runs on the READ: reports are written rarely and
         read rarely, so this keeps the write path a single put — and rule
         12 says anything time-based has to resolve lazily, because there
         are no alarms and the tick stops in an empty room. */
      for (const k of stale) await this.state.storage.delete(k);
      if (filter) rows = rows.filter((r) => r.target === filter || r.by === filter);
      rows.sort((a, b) => (b.at || 0) - (a.at || 0));
      return json({ ok: true, total: rows.length, pruned: stale.length, reports: rows.slice(0, limit) });
    }
    if (request.method === 'DELETE' && path === '/reports') {
      const id = url.searchParams.get('id');
      if (!id) return json({ ok: false, error: 'id required' }, 400);
      const key = id.startsWith('chat_report:') ? id : 'chat_report:' + id;
      const had = await this.state.storage.get(key);
      if (!had) return json({ ok: false, error: 'not found' }, 404);
      await this.state.storage.delete(key);
      await this._adminLog({ op: 'report_dismiss', reportKey: key, target: had.target, by: had.by });
      return json({ ok: true, dismissed: key });
    }
    return null;
  },
};
