/* ═══ v2.3.1981: CHAT MUTE + REPORT — the client half ═══
   Server: server/src/chatmod.js.  Spec: docs/specs/chat-moderation.md.

   Muting used to begin and end in this browser: `bt_muted` in
   localStorage, read by handleChatEvent (chat.js) to relabel a line as
   `[muted]` AFTER it had already been delivered.  So a mute did not
   follow the player to another device, did not survive clearing site
   data, and never actually stopped the text from arriving — and there
   was no way at all to tell the operator about the person saying it.

   With a chatMute-capable worker the list lives in Durable Object
   storage keyed to the stable `bp_` identity, and the worker refuses to
   send a muted player's chat/emote to the muter's socket at all.  This
   module is the thin client side of that: it owns the localStorage
   mirror (which is BOTH the legacy fallback and what the existing
   Social/Inspect UI reads), pushes changes to the worker when it can,
   and republishes the server's list when it arrives.

   DEPLOY-ORDER (handoff rule 19 / TRAPS #9).  `caps.chatMute` gates
   every send.  Against an old worker there is no case for `chat_mute`,
   so it would fall through to the DEFAULT BRANCH and be REBROADCAST to
   the whole room — i.e. muting somebody would announce to everyone that
   you had muted them.  That is why nothing is sent unless the flag is
   present, and why the local list and chat.js's `[muted]` rendering are
   KEPT rather than deleted: against an old worker they are the whole
   feature, and against a new one they are a harmless second filter over
   a stream the worker has already filtered. */

var MUTE_KEY = 'bt_muted';
/* One-time upload of mutes made before this browser ever met a
   chatMute-capable worker — the friends `bt_friendsMigrated` precedent.
   After it, the SERVER's list is the truth, which is what makes an
   unmute performed on your phone stick when you open your laptop. */
var MIGRATED_KEY = 'bt_mutesMigrated';
var MIGRATE_MAX = 25;

var _subs = [];

function _read() {
  try {
    var v = JSON.parse(localStorage.getItem(MUTE_KEY) || '[]');
    return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }) : [];
  } catch (e) { return []; }
}
function _write(list) {
  try { localStorage.setItem(MUTE_KEY, JSON.stringify(list)); } catch (e) {}
  for (var i = 0; i < _subs.length; i++) {
    try { _subs[i](list.slice()); } catch (e) {}
  }
}

/* Read the current list (localStorage mirror of the server's). */
export function readMutedIds() { return _read(); }

/* Subscribe to list changes (BroTown keeps `mutedList` React state in
   sync with this so the Social panel and the inspect card agree with the
   server rather than with whatever this browser last remembered).
   Returns an unsubscribe. */
export function subscribeMutes(fn) {
  _subs.push(fn);
  return function () {
    var i = _subs.indexOf(fn);
    if (i >= 0) _subs.splice(i, 1);
  };
}

/* True when this worker settles mutes server-side.  THE caps gate — the
   caps conformance audit (server/test/caps-audit.test.mjs) pairs this
   read with the `chatMute: true` advertisement in join.js. */
export function chatMuteSettled(S) {
  return !!(S && S._serverCaps && S._serverCaps.chatMute && S.channel);
}

/* Mute or unmute. The local list is written either way (prediction, and
   the whole feature against an old worker); the send is caps-gated. */
export function setMuted(S, targetId, on, name) {
  if (!targetId) return readMutedIds();
  var list = _read();
  var has = list.indexOf(targetId) >= 0;
  if (on && !has) list = list.concat([targetId]);
  else if (!on && has) list = list.filter(function (m) { return m !== targetId; });
  _write(list);
  if (chatMuteSettled(S)) {
    try {
      S.channel.send({
        type: 'broadcast', event: 'chat_mute',
        payload: { target: targetId, on: !!on, name: name || '' },
      });
    } catch (e) {}
  }
  return list;
}

/* Report a player for chat abuse.  Deliberately server-only: there is no
   local fallback to have, because a report that goes nowhere is worse
   than a button that admits it is unavailable.  `reason` is one of the
   worker's allowlisted codes — anything else is stored as 'other'.
   Returns false when the worker can't take it, so the caller can say so. */
export function reportPlayer(S, targetId, reason) {
  if (!targetId || !chatMuteSettled(S)) return false;
  try {
    S.channel.send({
      type: 'broadcast', event: 'chat_report',
      payload: { target: targetId, reason: reason || 'other' },
    });
  } catch (e) { return false; }
  return true;
}

/* `chat_mute_list` from the worker (join echo + every mutation ack).
   The server's list REPLACES the local mirror — that is the point of
   moving it server-side — except for the one-time migration of mutes
   this browser made before the worker could hold them. */
export function applyServerMuteList(payload, S) {
  var rows = (payload && Array.isArray(payload.list)) ? payload.list : [];
  var ids = [];
  var byId = Object.create(null); /* client-supplied ids as keys (TRAPS #6) */
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var id = r && (typeof r === 'string' ? r : r.id);
    if (typeof id !== 'string' || !id || byId[id]) continue;
    byId[id] = true;
    ids.push(id);
  }
  if (S) {
    S._serverMutes = ids.slice();
    S._serverMuteNames = rows;
  }
  var migrated = false;
  try { migrated = !!localStorage.getItem(MIGRATED_KEY); } catch (e) { migrated = true; }
  if (!migrated && chatMuteSettled(S)) {
    var local = _read();
    var sent = 0;
    for (var j = 0; j < local.length && sent < MIGRATE_MAX; j++) {
      if (byId[local[j]]) continue;
      try {
        S.channel.send({
          type: 'broadcast', event: 'chat_mute',
          payload: { target: local[j], on: true, name: '' },
        });
      } catch (e) {}
      sent++;
      /* Keep it locally until the worker's echo confirms it, so the
         list never visibly empties mid-migration. */
      ids.push(local[j]);
    }
    try { localStorage.setItem(MIGRATED_KEY, '1'); } catch (e) {}
  }
  _write(ids);
  return ids;
}
