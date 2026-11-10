/* ═══ v2.3.4365: A BLOCK IS CHECKED ONCE, AGAINST ONE TABLE ═══
   The state-machine sweep (2026-11-03, V6 N2-18 and V12 M4-9; review R2):
   the phone asked the block list handler by handler (gameEvents.js,
   chat.js), and a handler that forgot to ask let a blocked player through.
   The game's own Duel button sends `duel_wager_request`, and only the older
   `duel_request` asked, so a blocked player's challenge still raised the card
   and its sound; a friend request from them still chimed.

   Now processGameEvent asks `dropAsBlocked` once, before its switch, and
   every social message type is a row here: the type, and the payload field
   that names the player it comes from (the relay rebuilds `id` and `from` as
   the sender's, relay.js; the worker's own friend, trade and party messages
   name the asker `from`).  Adding a type is one line.
   server/test/blocked-asks.test.mjs reads gameEvents.js and fails when a case
   that raises a request card, a chat line or a chime is in neither table.

   No imports, so node can test it: the caller hands in its block check
   (chatMute.js isBlockedId, which reads the stored list fresh).  Both tables
   are null-prototype: the type is whatever arrived on the socket, and a plain
   {} answers '__proto__' (CLAUDE.md §3). */

function table(rows) {
  var t = Object.create(null);
  for (var k in rows) t[k] = rows[k];
  return Object.freeze(t);
}

/* type -> the payload field holding the sender's id */
export var BLOCKED_SOCIAL = table({
  /* chat and emotes (chat.js asks too, as a second filter) */
  chat: 'id',
  emote: 'id',
  dice_roll: 'id',
  party_chat: 'from',
  area_chat: 'from',
  whisper: 'from',
  /* requests: "Blocked: no chat, emotes or requests from them" (the card) */
  duel_request: 'from',
  duel_wager_request: 'from',   /* the game's own Duel button (InspectPlayerPanel) */
  trade2_invite: 'from',        /* v2.3.4442: only here now (its case's own second check, a leftover, removed) */
  trade_offer: 'from',
  party_invited: 'from',
  clan_invite: 'from',
  friend_request_in: 'from',    /* the chime; the Requests rows ask friendsSync */
  /* v2.3.4365: the owner, 2026-11-10: "Block also stops direct messages".
     The worker still stores and delivers it; the phone drops it before any
     line, badge or sound (the thread and unread already saved ask
     friendsSync, so unblocking shows them again) */
  friend_dm: 'from',
});

/* Messages that carry many rows from several senders: the event stays, the
   rows from a blocked player go.  type -> [the list's field, the sender's
   field in a row] */
export var BLOCKED_ROWS = table({
  friend_dm_backlog: ['messages', 'from'],   /* the offline box, delivered once */
});

/* Social types left OUT on purpose, each with why (the test reads these). */
export var NOT_BLOCKED = table({
  friend_dm_backlog: 'many senders in one event: its rows are filtered instead (BLOCKED_ROWS)',
  friend_accepted: 'an answer to a request you sent yourself',
  pvp_threat: 'a warning that an attack is coming: hiding it would not stop the attack',
});

/* The sender a blocked check reads, or '' for a type not in the table. */
export function blockedSenderOf(type, payload) {
  var key = typeof type === 'string' ? BLOCKED_SOCIAL[type] : undefined;
  if (!key || !payload || typeof payload !== 'object') return '';
  var id = payload[key];
  return typeof id === 'string' ? id : '';
}

/* True when this message is from a player on the block list: dropped
   before any card, line, popup or sound. */
export function dropAsBlocked(type, payload, isBlocked) {
  var from = blockedSenderOf(type, payload);
  return !!from && typeof isBlocked === 'function' && !!isBlocked(from);
}

/* The payload with a blocked player's rows taken out (a copy; the same
   payload when nothing goes).  For a type not in BLOCKED_ROWS, as it came. */
export function withoutBlockedRows(type, payload, isBlocked) {
  var spec = typeof type === 'string' ? BLOCKED_ROWS[type] : undefined;
  if (!spec || !payload || typeof payload !== 'object' || typeof isBlocked !== 'function') return payload;
  var rows = payload[spec[0]];
  if (!Array.isArray(rows)) return payload;
  var kept = rows.filter(function (r) {
    var id = r && typeof r === 'object' ? r[spec[1]] : '';
    return !(typeof id === 'string' && id && isBlocked(id));
  });
  if (kept.length === rows.length) return payload;
  var out = {};
  for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) out[k] = payload[k];
  out[spec[0]] = kept;
  return out;
}
