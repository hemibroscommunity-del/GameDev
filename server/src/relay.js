/* ═══ v2.3.3304: THE RELAY IS AN ALLOWLIST, AND IT SAYS WHO SENT IT ═══
 *
 * Found by the architecture review (2026-10-17).  The router's default
 * branch (index.js _onMessage) relays a phone's message to the others in the
 * room: chat, an emote, a swing, an arrow, a roll, a trade, duel or threat
 * handshake.  Two things were wrong with it:
 *
 *   1. It relayed ANY type that was not in PRIVILEGED_EVENTS -- a deny-list.
 *      Every type the worker sends itself is on it (wire-audit holds that),
 *      but a type the phone HANDLES that no worker and no phone sends -- an
 *      old handler, a dormant one -- could be sent by anyone, and junk of any
 *      type went out to every socket within the relay budget.  Now only the
 *      types an honest phone relays go through (RELAY.TYPES); the rest are
 *      dropped, silently, as a privileged type always was.
 *
 *   2. The worker stamped the sender on the message (`from`), but the phone
 *      read the PAYLOAD's `id` first (wsClient.js: `payload.id || from`), and
 *      several of its handlers read the payload's own `from` and `fromName`
 *      (a clan invite, a duel request, a threat, a trade's note).  So a
 *      script could relay "Bob died", "Bob rolled", "Bob invites you to his
 *      clan" in Bob's name.  Now every relay is REBUILT -- {type, payload}
 *      and nothing else, the payload a copy whose sender fields are the
 *      worker's: `id` always, and `from` / `playerId` (the id) and
 *      `fromName` / `playerName` / `name` (the name) wherever the phone put
 *      one.  Chat has worked that way since v2.3.1970 (_sanitizeChatRelay);
 *      now every relay does.  An honest phone already sends its own id and
 *      name in each, so nothing it sends reads differently.
 *
 * `relaylist: false` in the live flags relays every type that is not
 * privileged again (the old deny-list); the rebuild stays, as it changes
 * nothing an honest phone sends.  relay.test.mjs holds the list to the
 * phone's own code: every broadcast in src/ is a router case, a relay, or a
 * privileged type the worker drops on purpose.
 */

import { RELAY_TYPES } from './wire/lists.js';

export const RELAY = Object.freeze({
  /* The broadcasts an honest phone sends that the router has no case for,
     so they reach the default branch -- each drawn by the others' pages
     (gameEvents.js processGameEvent) and several settled on the way through
     (the trade, duel and threat intercepts, the clan invite's record).
     v2.3.5181: MADE FROM THE WIRE TABLE (server/src/wire/lists.js; card K):
     every row of server/src/wire/relays.js, where the comment above a row
     says which page sends it.  A new relay is a row there, nothing here. */
  TYPES: Object.freeze(RELAY_TYPES),
  /* the payload's own names for the sender's id, and for the sender's name */
  ID_KEYS: Object.freeze(['from', 'playerId']),
  NAME_KEYS: Object.freeze(['fromName', 'playerName', 'name']),
  /* v2.3.5543 (the red team's RT-1, N10): THE RELAY'S BYTES.  A relay was
     copied with every field the phone put in it, up to the 16 KB frame, and
     the tick keeps what it cannot send QUEUED with no cap: 48 guests relaying
     a 14 KB `stunned` 4 times a second sent an honest player 2.25 MB a
     second (2,417 KB here, relay-flood.test).  Three bounds, each on bytes,
     beside the count (RELAY_BURST / RELAY_REFILL_PER_S):
       MAX_BYTES     one relay as it goes out (its JSON).  An honest one is
                     under 1 KB (the largest: a projectile, a duel's card);
                     the old one-way trade offer, sent only to a worker
                     without trade2, is a bag's counts.
       BYTES_BURST / BYTES_PER_S  a socket's relay bytes, a bucket as the
                     count is: 8 KB at once, 2 KB a second after.
       QUEUE_BYTES_MAX  the relays waiting in the room's queue: past it a
                     new relay is dropped (never the worker's own events).
     A drop is silent to the sender (as the count's is) and counted
     (`_relayByteDrops`, by why; the socket's `relayBytesDropped`); the first
     LOG_FIRST of a worker's life are logged.  `relaybytes: false` in the
     live flags: none of the three (today's way). */
  MAX_BYTES: 4096,
  BYTES_BURST: 8192,
  BYTES_PER_S: 2048,
  QUEUE_BYTES_MAX: 256 * 1024,
  LOG_FIRST: 20,
});

/* v2.3.5543: each queued relay's bytes, so the tick's drain gives them back
   (_relayDrained).  A WeakMap: nothing is added to the message the phones get */
const QUEUED = new WeakMap();

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const relayMethods = {
  /* May a phone relay a message of this type to the others? */
  _relayAllowed(type) {
    if (RELAY.TYPES.has(type)) return true;
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'relaylist') && !f.relaylist);
  },

  /* The relay as it goes out: a new message, its payload a copy in the
     sender's name.  Anything else the phone put on the message is left
     behind (an honest phone sends {type, payload} and nothing else:
     wsClient.js channelShim). */
  _relayBuild(session, msg) {
    const src = msg && msg.payload;
    const p = (src && typeof src === 'object' && !Array.isArray(src)) ? { ...src } : {};
    p.id = session.id;
    for (const k of RELAY.ID_KEYS) if (own(p, k)) p[k] = session.id;
    const name = this._relayName(session);
    for (const k of RELAY.NAME_KEYS) if (own(p, k)) p[k] = name;
    return { type: msg.type, payload: p };
  },

  /* v2.3.5543 (N10): may this relay go into the room's queue?  True when it
     is DROPPED (too big, past its socket's byte budget, or the queue past its
     cap); counted and, the first few, logged.  Called last, on the relay as
     it will go out (index.js, before the queue's push). */
  _relayBytesDrop(session, msg, now) {
    if (this._relayBytesOff && this._relayBytesOff()) return false;
    let bytes = 0;
    try { bytes = JSON.stringify(msg).length; } catch (e) { bytes = RELAY.MAX_BYTES + 1; }
    const t = typeof now === 'number' ? now : Date.now();
    let why = '';
    if (bytes > RELAY.MAX_BYTES) why = 'size';
    else {
      if (this._relayBytesHave(session, t) < bytes) why = 'budget';
      else if ((this._relayQueued || 0) + bytes > RELAY.QUEUE_BYTES_MAX) why = 'queue';
    }
    if (why) {
      session.relayBytesDropped = (session.relayBytesDropped || 0) + 1;
      if (!this._relayByteDrops) this._relayByteDrops = Object.create(null);
      this._relayByteDrops[why] = (this._relayByteDrops[why] || 0) + 1;
      this._relayByteDropped = (this._relayByteDropped || 0) + 1;
      if (this._relayByteDropped <= RELAY.LOG_FIRST) {
        try { console.warn('[relaybytes] dropped ' + String(msg && msg.type).slice(0, 32) + ': ' + why + ' ' + bytes + ' B'); } catch (e) { /* the count stands */ }
      }
      return true;
    }
    session.relayBytes -= bytes;
    this._relayQueued = (this._relayQueued || 0) + bytes;
    QUEUED.set(msg, bytes);
    return false;
  },

  /* v2.3.5721 (card K2 PR 2): the socket's relay bytes now, refilled to
     `now` (the bucket above; moved here from _relayBytesDrop, unchanged, so
     the look relay (lookrelay.js) spends from the same bucket) */
  _relayBytesHave(session, now) {
    const t = typeof now === 'number' ? now : Date.now();
    if (typeof session.relayBytes !== 'number') { session.relayBytes = RELAY.BYTES_BURST; session.relayBytesAt = t; }
    session.relayBytes = Math.min(RELAY.BYTES_BURST, session.relayBytes + Math.max(0, (t - (session.relayBytesAt || t)) / 1000) * RELAY.BYTES_PER_S);
    session.relayBytesAt = t;
    return session.relayBytes;
  },

  /* v2.3.5543: the tick sent these events: their bytes leave the queue's count */
  _relayDrained(events) {
    if (!this._relayQueued || !events) return;
    for (const e of events) {
      const b = e && typeof e === 'object' ? QUEUED.get(e) : undefined;
      if (b) { this._relayQueued = Math.max(0, this._relayQueued - b); QUEUED.delete(e); }
    }
  },

  /* The worker's own copy of who this is -- chat's (_sanitizeChatRelay):
     the stored character name where there is one, else the name the join
     sanitised (join.js sanitizeDisplayName). */
  _relayName(session) {
    const ps = this.playerState[session.id];
    return (ps && typeof ps.name === 'string' && ps.name) || session.name || 'Bro';
  },
};
