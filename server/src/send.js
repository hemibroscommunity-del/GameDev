/* THE SEND DOOR -- v2.3.5193 (grand plan step 4.1b, step 1; card K PR 8;
 * docs/specs/send-door.md).
 *
 * One `_send`: the place a frame is written to a player's socket.  It writes
 * exactly what was written before (the same object made into the same JSON,
 * or the string already made), and counts the frame by its type: how many,
 * and how long, in memory.
 *
 *   this._send(ws, msg)          msg an object: JSON.stringify(msg), its type msg.type
 *   this._send(ws, s, type)      s a frame already made (the tick's, a ping's):
 *                                written as it is, counted under `type`
 *   this._sendRoom(msg, except)  every socket in the room but `except`: the
 *                                frame made once (broadcastAll / broadcastExcept)
 *
 * `_send` throws as `ws.send` throws: a caller that caught a dead socket's
 * throw still catches it, and one that did not still does not -- nothing
 * about what a send does changes, only where it is written.  The room's form
 * catches each socket's, as broadcastAll always did.
 *
 * THE COUNT: a Map of type -> [frames, length], the frame's length in
 * BYTES as it goes on the wire, UTF-8 (v2.3.6445, card DG PR 6: it counted
 * characters, `s.length`, and the plan's 4.1b says bytes: an emoji is two
 * characters and four bytes, a name's accented letter one and two;
 * `utf8Bytes` below, which reads past an ASCII frame at the engine's speed).  A type not in
 * the form TYPE_RE, or past TYPES_MAX types, is counted under OTHER.  Never
 * stored on its own: it RIDES the day's book (daybook.js sendRide, the part
 * `send`, a riding part) -- folded into today's sums only when the book is
 * already putting today's (no row of its own: cost-guard §15e), and read
 * with the book through the Test panel's one admin route (`/dev/daybook`,
 * bookRead adds what is counted and not yet folded).
 *
 * THE CENSUS: a raw `.send(` anywhere else in server/src is counted by
 * server/test/send-door.test.mjs, its line only falling (rule 3); card K
 * PR 13 moves the rest, and at 0 the gatekeeper makes it strict.
 *
 * `sendcount: false` in the live flags: nothing is counted.  The door stays.
 */

export const SEND = Object.freeze({
  TYPE_RE: /^[a-z][a-z0-9_]{0,47}$/,
  TYPES_MAX: 256,   /* the wire table's out rows are ~170: room for them all */
  OTHER: '_other',  /* the day's book's keys take it; no type starts with _ */
});

/* v2.3.6445 (card DG PR 6): a frame's length in UTF-8 bytes, as the socket
   writes it.  The worker's JSON is ASCII but for a player's own words, so an
   all-ASCII frame (the regular expression's one pass, in the engine) is its
   length; only a frame with a wider character is walked.  JSON.stringify
   writes no lone half of a pair, so each half of a pair is two bytes. */
const WIDE = /[^\x00-\x7f]/;
export function utf8Bytes(s) {
  if (typeof s !== 'string') return 0;
  if (!WIDE.test(s)) return s.length;
  let n = s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) continue;
    n += c < 0x800 || (c >= 0xd800 && c <= 0xdfff) ? 1 : 2;
  }
  return n;
}

/* v2.3.5198 (card K PR 13): a frame written OUTSIDE any room -- the worker's
   refusal of a socket before it reaches one (origin.js refuseOrigin): no
   room, so nothing counts it; written as JSON.stringify(msg), as before */
export function sendOutside(ws, msg) {
  ws.send(JSON.stringify(msg));
}

export const sendMethods = {
  _sendCountOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'sendcount') && !f.sendcount);
  },

  /* THE DOOR.  Writes the frame, then counts it (a write that threw sent
     nothing, and its throw goes to the caller, as before). */
  _send(ws, msg, type) {
    const s = typeof msg === 'string' ? msg : JSON.stringify(msg);
    ws.send(s);
    try { if (this._usageSent) this._usageSent(type !== undefined ? type : (msg && msg.type)); } catch (e) { /* a count never stops a send */ }   /* v2.3.6001: the usage meter, a counter bump (usagemeter.js; card CS PR 2) */
    if (!this._sendCountOff()) this._sendCount(type !== undefined ? type : (msg && msg.type), utf8Bytes(s));   /* v2.3.6445: bytes, not characters */
  },

  /* The room's form: every socket but `except`, the frame made once; a dead
     socket's throw caught (broadcastAll's way).  v2.3.5724 (card K2 PR 5;
     the second red team): only a socket whose player has JOINED (its
     session has an id) -- one that opened and never joined was sent the
     whole room's traffic (every relay, every look, every chat line) and
     needs none of it: a joining phone is sent the room whole in its
     state_sync.  `relaytyped: false`: every socket, as before. */
  _sendRoom(msg, except) {
    const s = JSON.stringify(msg);
    const type = msg && msg.type;
    const joinedOnly = !(this._relayTypedOff && this._relayTypedOff());
    for (const [ws, ss] of this.sessions) {
      if (ws === except) continue;
      if (joinedOnly && !(ss && ss.id)) continue;
      try { this._send(ws, s, type); } catch {}
    }
  },

  _sendCount(type, len) {
    try {
      let t = this._sendTally;
      if (!t) t = this._sendTally = new Map();   /* keyed by a type: a Map (rule 4) */
      let k = typeof type === 'string' && SEND.TYPE_RE.test(type) ? type : SEND.OTHER;
      let e = t.get(k);
      if (!e && t.size >= SEND.TYPES_MAX) { k = SEND.OTHER; e = t.get(k); }
      if (!e) { e = [0, 0]; t.set(k, e); }
      e[0] += 1; e[1] += len;
    } catch (err) { /* a count must never stop what it counts */ }
  },

  /* What is counted and not yet folded into the book, as the book's tree
     ({ type: [frames, length] }), or null.  `take` empties it. */
  _sendTree(take) {
    const t = this._sendTally;
    if (!t || !t.size) return null;
    const tree = Object.create(null);
    for (const [k, e] of t) tree[k] = [e[0], e[1]];
    if (take) t.clear();
    return tree;
  },
};
