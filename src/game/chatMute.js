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

/* ═══ v2.3.3391: ONE READING OF THE BLOCK LIST ═══
   `bt_blocked` is written in two shapes: plain ids by the inspect card
   (InspectPlayerPanel) and the old Social panel, `{ id, name }` by the
   dashboard's friends list (sheet/friendsModel.js blockPlayer).  Every reader
   compared ids with `includes(id)`, so a block made from the friends list hid
   nothing -- their chat still showed -- and the old Social panel threw on one
   (`bid.slice`).  Found by the fun & social plan's check of the code
   (docs/FUN-SOCIAL-PLAN.md, Phase 0).  Every reader asks these now, and both
   shapes stay valid: the lists already saved on phones are left as they are. */
export function blockedIdOf(b) {
  return b && typeof b === 'object' ? (typeof b.id === 'string' ? b.id : '') : (typeof b === 'string' ? b : '');
}
export function readBlockedIds() {
  try {
    var v = JSON.parse(localStorage.getItem('bt_blocked') || '[]');
    return Array.isArray(v) ? v.map(blockedIdOf).filter(Boolean) : [];
  } catch (e) { return []; }
}
export function isBlockedId(id) {
  return !!id && readBlockedIds().indexOf(id) >= 0;
}

/* ═══ v2.3.4365: ONE WRITER OF THE BLOCK LIST ═══
   The state-machine sweep (2026-11-03, V12 P2-19): the list had two copies on
   the phone.  BroTown read `bt_blocked` once at load into React state and the
   player card wrote THAT copy back, plus or minus one id, on every Block and
   Unblock -- so a block made on the Friends page since the load was silently
   erased by the next Block or Unblock of anybody on a player card, and that
   player's chat, emotes and requests came through again.  Now every writer
   (the Friends page through friendsModel.js, the player card, the old Social
   panel) comes here: it reads the stored list fresh, changes the one id and
   leaves every other entry as it was saved (both shapes), then tells the
   subscribers, so BroTown's copy follows the stored list instead of
   overwriting it.  A new entry is saved as `{ id, name }`. */
var _blockSubs = [];
export function setBlockedId(id, on, name) {
  if (typeof id !== 'string' || !id) return readBlockedIds();
  var raw;
  try {
    raw = JSON.parse(localStorage.getItem('bt_blocked') || '[]');
  } catch (e) { raw = []; }
  if (!Array.isArray(raw)) raw = [];
  var has = raw.some(function (b) { return blockedIdOf(b) === id; });
  var next = raw;
  if (on && !has) next = raw.concat([{ id: id, name: typeof name === 'string' ? name : '' }]);
  else if (!on && has) next = raw.filter(function (b) { return blockedIdOf(b) !== id; });
  if (next !== raw) {
    try { localStorage.setItem('bt_blocked', JSON.stringify(next)); } catch (e) {}
    for (var i = 0; i < _blockSubs.length; i++) {
      try { _blockSubs[i](next.slice()); } catch (e) {}
    }
  }
  return next;
}
/* BroTown keeps its `blockedList` state in step with this (as subscribeMutes
   does for mutes).  Returns an unsubscribe. */
export function subscribeBlocks(fn) {
  _blockSubs.push(fn);
  return function () {
    var i = _blockSubs.indexOf(fn);
    if (i >= 0) _blockSubs.splice(i, 1);
  };
}

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

/* ═══ v2.3.4402: A MUTE TAPPED WHILE THE CONNECTION IS DOWN IS KEPT ═══
   The state-machine sweep (2026-11-03, VA "chat mute during reconnect";
   PLAN cause 5).  During a blip or a deploy the caps and S.channel survive,
   so setMuted sent -- and the channel dropped the message on the floor
   (wsClient.js channelShim: the socket is not OPEN) without a word.  The
   card said "Muted" from the local list, then the rejoin's chat_mute_list
   REPLACED the local list with the worker's, which had never heard of it:
   the harasser's chat was back, silently.  Mute is a safety tool.

   KEPT, not refused: this module already treats the local list as the
   prediction and the worker's echo as the truth, so the honest move is to
   keep the prediction until the worker can be told.  The channel now says
   whether a message went (false: dropped); a dropped mute or unmute is kept
   here, the LAST tap per player winning, and applyServerMuteList (the
   rejoin's echo, the first thing a rejoin hears from the worker) sends it
   once and lays it over the worker's list until an echo agrees.  A kept
   change the worker already agrees with (muted on another device, or muted
   and unmuted in the same gap) is dropped unsent.  Memory only: a reload
   during the gap starts from the worker's list, as before. */
var _kept = new Map();   /* targetId -> { on, name, sent } */

function _sendMute(S, targetId, on, name) {
  try {
    return S.channel.send({
      type: 'broadcast', event: 'chat_mute',
      payload: { target: targetId, on: !!on, name: name || '' },
    }) === true;
  } catch (e) { return false; }
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
    if (_sendMute(S, targetId, on, name)) _kept.delete(targetId);
    else _kept.set(targetId, { on: !!on, name: name || '', sent: false });
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
  /* v2.3.4402: the kept taps (above).  Agreed (or refused: list-full) ones
     are done; the rest are sent once and shown until an echo agrees. */
  _kept.forEach(function (k, kid) {
    if (!!byId[kid] === k.on || (k.sent && payload && payload.error)) { _kept.delete(kid); return; }
    if (!k.sent && chatMuteSettled(S)) k.sent = _sendMute(S, kid, k.on, k.name);
    if (k.on) { byId[kid] = true; ids.push(kid); }
    else { byId[kid] = false; ids = ids.filter(function (m) { return m !== kid; }); }
  });
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
