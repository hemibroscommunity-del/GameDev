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
 * report attaches those the reporter could have received (REPORT_LINES,
 * the lines addressed to them first; v2.3.5623, v2.3.5628) and, beside them,
 * the speaker's last LEGACY_LINES in any lane (`said`).  A report message
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

import { MUTABLE_RELAY_TYPES } from './wire/lists.js';   /* v2.3.5182: from the wire table */
import { PACE } from './flood.js';   /* v2.3.3274: the mute list is written at a pace */
import { WIRE_DOOR } from './wire/door.js';   /* v2.3.5184: the names no player id is (the wire door's) */

export const CHATMOD = {
  MUTE_MAX: 200,             // muted ids one player may hold
  NAME_MAX: 24,              // stored display-name clamp (matches FRIENDS)
  ID_MAX: 64,                // a bp_ id is ~20 chars; this is the sanity bound
  CONTEXT_LINES: 20,         // server-seen lines a speaker's ring holds (v2.3.5623: 3 -> 20, card MOD PR 3)
  REPORT_LINES: 10,          // v2.3.5623: lines a report quotes: the speaker's that the reporter could have received
  LEGACY_LINES: 3,           // v2.3.5623: what a report quoted before (`reportring: false`): the speaker's last 3, any lane
  TOS_MAX: 50,               // v2.3.5623: a party line's hearers kept (PARTY.KEEP_MAX)
  CONTEXT_AGE_MS: 15 * 60 * 1000, // older lines are not evidence of THIS report
  SEEN_MAX: 240,             // speakers held in the line ring (2x MAX_PLAYERS; v2.3.3205: the cap 60 -> 120)
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
/* v2.3.3393: and `dice_roll` -- the worker's event, not a relay, but stamped
   with its roller as `from` (dice.js): a line in the chat in their name */
/* v2.3.5182 (card K PR 2): every row whose `muted` is `mutable` in the wire
   table (server/src/wire/lists.js) */
export { MUTABLE_RELAY_TYPES };

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


/* v2.3.5623 (card K's review): the fair trim's choice -- the index of the
   oldest line of the hearer holding the most lines (`to`, or one hearer for
   the room and the areas); a tie, the oldest of the tied.  The newest line
   is never the one dropped (its hearer's oldest goes first). */
export function chatModTrimAt(arr) {
  const count = new Map();
  for (const l of arr) { const k = l.to || '*'; count.set(k, (count.get(k) || 0) + 1); }
  let most = 0;
  for (const n of count.values()) if (n > most) most = n;
  for (let i = 0; i < arr.length; i++) if (count.get(arr[i].to || '*') === most) return i;
  return 0;
}
export const chatModMethods = {
  /* Lazily built so the constructor stays untouched and a DO restart
     rebuilds them empty (which is correct — join reloads the mutes). */
  _chatModMaps() {
    if (!this.chatMutes) this.chatMutes = new Map();   // pid -> Set(mutedId)
    if (!this.chatMuteDocs) this.chatMuteDocs = new Map();   // v2.3.3274: pid -> the doc itself (see _chatMuteDoc)
    if (!this.chatSeen) this.chatSeen = new Map();     // pid -> [{text, ts, zone, lane}]
    if (!this._chatReportLog) this._chatReportLog = new Map(); // pid -> [{ts, target}]
  },

  /* The muter's stored doc as a NULL-PROTO id-keyed map (rule H — a
     player who muted '__proto__' must not write through the prototype). */
  async _chatMuteDoc(pid) {
    /* v2.3.3274: once loaded, the doc held in memory is the truth -- its
       writes are paced (flood.js PACE.MUTE), so a copy read back from storage
       could be behind a change not written yet. */
    if (this.chatMuteDocs && this.chatMuteDocs.has(pid)) return this.chatMuteDocs.get(pid);
    const stored = await this.state.storage.get('chat_mute:' + pid);
    const doc = Object.create(null);
    const src = stored && stored.list;
    if (src && typeof src === 'object') {
      for (const id of Object.keys(src)) {
        /* v2.3.5184: a mute of `__proto__` stored before the mend below is
           not read back (an own key of the doc, kept in memory) */
        if (WIRE_DOOR.BAD_KEYS.has(id) && !(this._wireDoorOff && this._wireDoorOff())) continue;
        const e = src[id];
        doc[id] = { name: cleanName(e && e.name, 'Bro'), at: (e && +e.at) || 0 };
      }
    }
    return doc;
  },

  _chatModCache(pid, doc) {
    this._chatModMaps();
    this.chatMutes.set(pid, new Set(Object.keys(doc)));
    this.chatMuteDocs.set(pid, doc);   /* v2.3.3274 */
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
     least recently heard speaker.
     v2.3.5623 (card MOD PR 3; the red team's RT-3 S4, card K's design): and
     WHOM it was for -- `to` the target's id for a whisper, a friend's message
     or a shop thread, the party's id for party chat, null for the room or an
     area (everyone there).  A report quotes the speaker's lines the REPORTER
     could have received (_chatModRecentLines), so a harasser's two whispers
     are not flushed out of the evidence by three harmless lines to someone
     else (RT-3's t5-evidence.mjs: the report held "nice weather / lol /
     gg").  The ring holds CONTEXT_LINES (20) a speaker, still per speaker and
     still under SEEN_MAX speakers.
     v2.3.5623 (card K's review): and a FAIR trim.  One ring of 20 still let
     21 harmless lines to anyone else push two whispers out (the same flush,
     7 times the typing, instant for a script), so past CONTEXT_LINES the
     line dropped is the oldest of whoever holds the most lines (the room and
     the areas count as one hearer; a tie drops the oldest of the tied): a
     victim's few lines stay while the spam to Bob eats Bob's own.  Bounded
     still: a speaker who whispers 20 OTHER people once each, then, pushes the
     oldest out (each of those whispers is its own evidence).  `tos`: a party
     line's hearers when it was said (the members online), so a victim who
     leaves or is kicked before reporting -- the natural order -- keeps it. */
  _chatModRemember(pid, text, zone, lane, to, tos) {
    if (!pid || !text) return;
    this._chatModMaps();
    const prev = this.chatSeen.get(pid);
    if (prev) this.chatSeen.delete(pid);
    const arr = prev || [];
    /* v2.3.5629: the speaker's name as the room showed it, kept with its
       lines, so a report on a speaker who has left (a guest with no record)
       still names it */
    const _ps = this.playerState && this.playerState[pid];
    if (_ps && typeof _ps.name === 'string' && _ps.name) arr.n = _ps.name;
    const line = { text, ts: Date.now(), zone: zone || null, lane: lane || 'room', to: typeof to === 'string' && to ? to : null };
    if (Array.isArray(tos) && tos.length) line.tos = tos.slice(0, CHATMOD.TOS_MAX);
    arr.push(line);
    while (arr.length > CHATMOD.CONTEXT_LINES) {
      if (!this._reportRingOn()) { arr.splice(0, arr.length - CHATMOD.CONTEXT_LINES); break; }
      arr.splice(chatModTrimAt(arr), 1);
    }
    this.chatSeen.set(pid, arr);
    if (this.chatSeen.size > CHATMOD.SEEN_MAX) {
      const oldest = this.chatSeen.keys().next().value;
      if (oldest !== undefined) this.chatSeen.delete(oldest);
    }
  },

  /* The speaker's recent lines a report quotes.  v2.3.5623: with a
     reporter, only the lines that reporter could have received -- addressed
     to them, to their party, or said to the room, or to an area in the zone
     the reporter stands in -- the last REPORT_LINES of them.  KILL SWITCH
     `reportring: false` in the live flags: the last LEGACY_LINES, any lane,
     as before. */
  /* the kill switch `reportring: false` (live flags): the report's filter
     and the fair trim both off */
  _reportRingOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'reportring') && !f.reportring);
  },

  _chatModRecentLines(pid, reporter) {
    if (!this.chatSeen) return [];
    const arr = this.chatSeen.get(pid);
    if (!arr) return [];
    const cutoff = Date.now() - CHATMOD.CONTEXT_AGE_MS;
    const recent = arr.filter((l) => l.ts >= cutoff);
    let picked;
    if (this._reportRingOn() && reporter) {
      const party = this._partyOf ? this._partyOf(reporter) : null;
      const partyId = party && party.id ? party.id : null;
      /* v2.3.5623 (card K's review): an area line matches the zone the
         reporter stands in NOW (where they were then is not kept): a victim
         who has walked on loses those; a party line, its hearers when said
         (`tos`), so leaving the party first keeps it */
      const myZone = this.playerState[reporter] ? this.playerState[reporter].z : null;
      /* v2.3.5628 (card MOD PR 8; sitting 23's review): the lines ADDRESSED
         to the reporter (a whisper, a friend's message, a shop thread, the
         reporter's party) come first, the room's and the area's fill what is
         left: ten harmless public lines after two abusive whispers pushed the
         whispers out of the report (RT-3 S4's flush again).  In the order
         they were said. */
      const direct = recent.filter((l) => l.to === reporter
        || (l.lane === 'party' && (l.tos ? l.tos.includes(reporter) : !!partyId && l.to === partyId)));
      const pub = recent.filter((l) => (l.lane === 'room' && !l.to) || (l.lane === 'area' && !l.to && l.zone && l.zone === myZone));
      const mine = direct.slice(-CHATMOD.REPORT_LINES);
      const room = CHATMOD.REPORT_LINES - mine.length > 0 ? pub.slice(-(CHATMOD.REPORT_LINES - mine.length)) : [];
      picked = mine.concat(room).sort((a, b) => a.ts - b.ts);
    } else {
      picked = recent.slice(-CHATMOD.LEGACY_LINES);
    }
    return picked.map((l) => ({ text: l.text, ts: l.ts, zone: l.zone, lane: l.lane }));
  },

  _chatModNameOf(pid, claimed) {
    const ps = this.playerState[pid];
    if (ps && ps.name) return ps.name;
    for (const [, s] of this.sessions) { if (s.id === pid) return s.name || 'Bro'; }
    /* v2.3.5629: a speaker who has left, by the name its lines were heard under */
    const heard = this.chatSeen && this.chatSeen.get(pid);
    if (heard && typeof heard.n === 'string' && heard.n) return heard.n;
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
    try { this._send(ws, { type, payload }); } catch (e) {}
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
    if (!pid) return;
    /* v2.3.3274: a change held for the lane's next token is written now */
    if (this._paceFlush) this._paceFlush(pid);
    if (this.chatMutes) this.chatMutes.delete(pid);
    if (this.chatMuteDocs) this.chatMuteDocs.delete(pid);
  },

  async _handleChatMute(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const target = payload && payload.target;
    if (!validId(target, me)) return;
    const on = !!(payload && payload.on);
    const doc = await this._chatMuteDoc(me);
    /* v2.3.5184 (card K PR 4; the hostile census's chat_mute, 2 cases): a
       target named `__proto__`, `constructor` or `prototype` names no player,
       and as a key of the list it was stored as an own key of the record
       (`{ list: { ...doc } }`) and kept in memory.  The list is answered
       unchanged, as for a mute that changes nothing.  `wiredoor: false`:
       taken as before. */
    if (WIRE_DOOR.BAD_KEYS.has(target) && !(this._wireDoorOff && this._wireDoorOff())) return this._chatModSendList(me, doc);
    /* v2.3.3274: nothing changed, nothing written -- un-muting someone never
       muted wrote a row a message (flood.js).  The list is answered all the
       same, as the window waits for it. */
    if (on === !!doc[target]) return this._chatModSendList(me, doc);
    if (on) {
      if (Object.keys(doc).length >= CHATMOD.MUTE_MAX) {
        return this._chatModSendList(me, doc, { error: 'list-full' });
      }
      doc[target] = { name: this._chatModNameOf(target, payload && payload.name), at: Date.now() };
    } else {
      delete doc[target];
    }
    this._chatModCache(me, doc);
    /* Spread into a plain object for structured-clone storage; the
       null-proto guarantee matters in MEMORY (lookups), not at rest —
       the friends.js _friendsPut precedent.
       v2.3.3274: at the lane's pace (PACE.MUTE): a change past the burst is
       held, the doc above being the truth, and written when the next token
       comes or when the player leaves (_chatModOnClose). */
    const _write = () => this.state.storage.put('chat_mute:' + me, { list: { ...doc }, at: Date.now() }).catch(() => {});
    if (this._paced) this._paced('mute', me, PACE.MUTE, _write); else await _write();
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
    /* v2.3.5629 (card MOD PR 9; the planning session's call, 2026-11-17):
       or a speaker the room HEARD -- its lines are in the ring.  A guest who
       chatted and left without earning has no record (card OPS's guestlazy),
       and the report on it answered `not-found`: the abuse it typed was
       kept, and nobody could file it.  An id never heard and never saved is
       still `not-found`. */
    const heard = this._reportRingOn() && !!(this.chatSeen && this.chatSeen.has(target));   /* `reportring: false`: as before */
    if (!targetPs && !heard && !(await this.state.storage.get('rpg:' + target))) {
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
      lines: this._chatModRecentLines(target, me),   /* v2.3.5623: what the reporter could have received */
      /* v2.3.5628 (card MOD PR 8; sitting 23's review: the card says
         "beside the speaker's own lines"): and the speaker's own last
         LEGACY_LINES, any lane, as a report held before PR 3 */
      said: this._reportRingOn() ? this._chatModRecentLines(target) : undefined,
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
      /* ═══ v2.3.3398: WHAT THE OWNER NEEDS TO ACT ON A REPORT ═══
         The Test panel's Chat reports section (DevPanel.jsx) shows these and
         kicks, freezes and unfreezes from them -- until now only a curl
         command read them, and the owner runs the game from a phone.  Each
         row on the page says whether the reported player is ONLINE NOW (the
         record's targetOnline is when the report was made) and FROZEN now
         (`frozen:<pid>`, admin.js /freeze) -- one read per player on the page
         (at most `limit`), on a read the owner makes. */
      const page = rows.slice(0, limit);
      const frozenOf = new Map();
      for (const r of page) {
        const t = typeof r.target === 'string' ? r.target : '';
        if (t && !frozenOf.has(t)) frozenOf.set(t, !!(await this.state.storage.get('frozen:' + t)));
      }
      for (const r of page) {
        r.frozen = frozenOf.get(r.target) === true;
        /* connected now: a session of theirs (admin.js's own test for a kick) */
        r.onlineNow = !!(typeof r.target === 'string' && this._wsBySessionId(r.target));
      }
      return json({ ok: true, total: rows.length, pruned: stale.length, reports: page });
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
