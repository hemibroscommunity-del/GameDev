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

/* ═══ v2.3.5724 (card K2 PR 5; the second red team): A RELAY'S FIELDS TYPED ═══
   A relay was copied with every field the phone put in it, each as sent:
   `monster_dmg_at`'s `dmg` reached every screen in the zone as text; a
   `trade_reject` or `duel_decline` carrying `reason: 'paused'` made the
   other phone say the game's own "Saving is paused" words, and a
   `pvp_confirmed` its kill words.  Now (`relaytyped`) a relay keeps ONLY
   the fields its row names (the wire table's `trust`: wire/relays.js),
   each held to the FORM an honest page sends -- a census of every sender
   in src/ and every reader (gameEvents.js, wsClient.js), 2026-11-17:
     id      a player's id: a string of at most 64 (join.js);
     num     a finite number (within NUM_MAX);   int  a whole one;
     bool    true or false, or 1 or 0 (four flags go as the number 1:
             a projectile's retreat, volley and pc, a jump's flip);
     strN    a string of at most N characters;   strN? the same, or null;
     text    chat's line: a string, cut to TEXT_MAX here (the chat relay's
             own sanitiser cuts it again to 200: speech input can pass the
             box's maxLength, so it is cut, never refused);
     offer   a trade's offer: a plain object of at most OFFER_KEYS item
             keys (64 characters) to whole counts >= 0 (trade.js cleans it
             again at commit);
     ints2, ints5  an array of exactly 2 or 5 whole numbers.
   A field out of its form is DROPPED -- the relay still goes.  Only the
   rebuild's own fields are added (the stamped id and name, as before), and
   the worker's intercepts that run after it (a trade's, a duel's, a
   threat's: index.js) add theirs as before.  Fields honest pages send and
   no page reads (a strike's `blocked`, an action's `reqId`) go no further.
   wire-hostile.test and relaytyped.test hold the table to the rows. */
export const RELAY_FORMS = Object.freeze({
  trade_accept: { target: 'id' },
  trade_offer: { target: 'id', offer: 'offer' },
  trade_reject: { target: 'id' },
  clan_invite: { target: 'id', clanName: 'str32', clanTag: 'str8' },
  duel_accept: { target: 'id', wager: 'int' },
  duel_decline: { target: 'id' },
  duel_request: { target: 'id' },
  duel_wager_request: { target: 'id', wager: 'int' },
  pvp_threat: { target: 'id', fromLevel: 'int' },
  threat_response: { target: 'id', action: 'str16' },
  chat: { text: 'text', color: 'str32' },
  emote: { emoji: 'str16', move: 'str16' },
  campfire_lit: { x: 'num', y: 'num', zone: 'str64', expiresAt: 'num' },
  campfire_out: {},
  gather_node: { node: 'str64?', x: 'num', y: 'num', zone: 'str64' },
  monster_dmg_at: { x: 'num', y: 'num', dmg: 'num', isCrit: 'bool' },
  player_died_to_monster: { x: 'num', y: 'num' },
  player_dodge: { kind: 'str16', angle: 'num', dur: 'num', walk: 'bool' },
  player_hurt_by_monster: { dmg: 'num' },
  player_jump: { dur: 'num', peak: 'num', flip: 'bool', h0: 'num', v: 'num', g: 'num', ang: 'num' },
  player_projectile: { ts: 'num', isStaff: 'bool', isSpecial: 'bool', retreat: 'bool', dr: 'num', ga: 'num', big: 'bool',
    x: 'num', y: 'num', ang: 'num', el: 'str16', life: 'num', speedPx: 'num', delayMs: 'num', volley: 'bool', pc: 'bool',
    tg: 'id', lp: 'ints2', gf: 'ints5' },
  player_respawned: {},
  player_shield: { up: 'bool' },
  player_swing: { special: 'bool', bash: 'bool', whirl: 'bool', r: 'num', wpn: 'str32', ang: 'num' },
  pvp_confirmed: { target: 'id', died: 'bool', dmg: 'num', srv: 'bool' },
  stunned: { target: 'id', duration: 'num' },
});
export const RELAY_FORM = Object.freeze({ NUM_MAX: 1e15,   /* above an epoch in ms (a campfire's expiresAt, a shot's ts: ~1.8e12) */ TEXT_MAX: 1000, OFFER_KEYS: 200, KEY_MAX: 64, ID_MAX: 64 });

const isStr = (v, n) => typeof v === 'string' && v.length <= n;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= RELAY_FORM.NUM_MAX;
const isInt = (v) => isNum(v) && Math.floor(v) === v;
const isInts = (v, n) => Array.isArray(v) && v.length === n && v.every(isInt);
/** One field to its form: the value to keep, or undefined to drop it. */
export function relayFieldForm(form, v) {
  switch (form) {
    case 'id': return isStr(v, RELAY_FORM.ID_MAX) ? v : undefined;
    case 'num': return isNum(v) ? v : undefined;
    case 'int': return isInt(v) ? v : undefined;
    case 'bool': return (v === true || v === false || v === 1 || v === 0) ? v : undefined;
    case 'text': return typeof v === 'string' ? (v.length > RELAY_FORM.TEXT_MAX ? v.slice(0, RELAY_FORM.TEXT_MAX) : v) : undefined;
    case 'ints2': return isInts(v, 2) ? v.slice() : undefined;
    case 'ints5': return isInts(v, 5) ? v.slice() : undefined;
    case 'offer': {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
      const keys = Object.keys(v);
      if (keys.length > RELAY_FORM.OFFER_KEYS) return undefined;
      const o = {};
      for (const k of keys) {
        if (k.length > RELAY_FORM.KEY_MAX || !isInt(v[k]) || v[k] < 0) return undefined;
        o[k] = v[k];
      }
      return o;
    }
    default: {
      const m = /^str(\d+)(\?)?$/.exec(String(form));
      if (!m) return undefined;
      if (v === null && m[2]) return null;
      return isStr(v, +m[1]) ? v : undefined;
    }
  }
}

/* v2.3.5543: each queued relay's bytes, so the tick's drain gives them back
   (_relayDrained).  A WeakMap: nothing is added to the message the phones get */
const QUEUED = new WeakMap();

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const relayMethods = {
  /* v2.3.5724: `relaytyped: false` in the live flags: a relay keeps every
     field the phone put in it, and the room's send reaches a socket that
     never joined, as before (on unless its own falsy value) */
  _relayTypedOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'relaytyped') && !f.relaytyped);
  },

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
    let p = (src && typeof src === 'object' && !Array.isArray(src)) ? { ...src } : {};
    /* v2.3.5724: only the row's fields, each to its form (RELAY_FORMS
       above); the sender's id and name keys are the worker's (below) */
    const forms = !this._relayTypedOff() && msg && Object.prototype.hasOwnProperty.call(RELAY_FORMS, msg.type) ? RELAY_FORMS[msg.type] : null;
    if (forms) {
      const typed = {};
      for (const k of Object.keys(forms)) {
        if (!own(p, k)) continue;
        const v = relayFieldForm(forms[k], p[k]);
        if (v !== undefined) typed[k] = v;
      }
      for (const k of RELAY.ID_KEYS) if (own(p, k)) typed[k] = true;
      for (const k of RELAY.NAME_KEYS) if (own(p, k)) typed[k] = true;
      p = typed;
    }
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
