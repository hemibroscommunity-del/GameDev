/* ═══ CHAT — send path + incoming chat/emote event handlers ═══ */
/* v2.3.767: moved verbatim from src/ui/BroTown.jsx (REBUILD-PLAN Phase 2,
   behavior-frozen):
   - sendChatMessage: the network/state body of the sendChat useCallback
     (~1515). The React-input concerns (reading/clearing chatInput, keyboard
     re-focus) stay in BroTown's thin wrapper — they belong to the input
     widget, not the chat system.
   - handleChatEvent / handleEmoteEvent: the 'chat' / 'emote' cases of
     _processGameEvent (~3091 / ~3122).
   React state setters arrive via the `deps` argument; S is the live game
   state (stateRef.current). Imports are explicit — extracted modules must
   never rely on the globalThis copies of DATA or the babel helpers
   (they're assigned only when BroTown.jsx evaluates). */
import { BT_AUDIO } from '@/data/index.js';
import { _toConsumableArray } from '@/lib/babelHelpers.js';

/* Send a chat line: broadcast to the room, local echo into the chat log +
   own overhead bubble. `text` is already trimmed/validated by the caller.
   deps = { setChatLog } */
export function sendChatMessage(S, text, deps) {
  var setChatLog = deps.setChatLog;
  /* v2.3.1212: party chat -- "/p <msg>" routes the line to party
     members only (server-validated relay, party.js), reusing this chat
     log tagged with a shield + party color.  If you're not in a party,
     it's a local-only hint (nothing sent). */
  var _pm = /^\/p\s+([\s\S]+)/i.exec(text);
  if (_pm) {
    var _ptext = _pm[1].trim();
    if (!_ptext) return;
    var _sysHint = function (msg) {
      S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
        id: '_sys', name: '🛡 Party', text: msg, color: '#8a8f98', ts: Date.now(), party: true
      }]);
      setChatLog(_toConsumableArray(S.chatLog));
    };
    /* Deploy-order gate (rule 19 / TRAPS #9): send party_chat ONLY to a
       worker that owns the validated case.  An older worker (parties but
       no party_chat handler) would fall through to the room-wide
       rebroadcast and LEAK the line to everyone -- so if the cap is
       absent, keep the message local and say so, never send it. */
    if (!(S._serverCaps && S._serverCaps.partyChat)) {
      _sysHint('Party chat needs a server update — not sent.');
      return;
    }
    var _inParty = !!(S._party && Array.isArray(S._party.members) && S._party.members.length > 0);
    if (!_inParty) {
      _sysHint("You're not in a party.");
      return;
    }
    if (S.channel) S.channel.send({ type: 'broadcast', event: 'party_chat', payload: { text: _ptext } });
    BT_AUDIO.chatSend();
    if (S.stats) S.stats.msgsSent++;
    S.chatBubbles[S.myId] = { text: _ptext, ts: Date.now() };
    S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
      id: S.myId, name: '🛡 ' + S.myName, text: _ptext, color: '#3dd497', ts: Date.now(), party: true
    }]);
    setChatLog(_toConsumableArray(S.chatLog));
    return;
  }
  if (S.channel) S.channel.send({
    type: 'broadcast',
    event: 'chat',
    payload: {
      id: S.myId,
      name: S.myName,
      text: text,
      color: S.myColor
    }
  });
  BT_AUDIO.chatSend();
  if (S.stats) S.stats.msgsSent++;
  S.chatBubbles[S.myId] = {
    text: text,
    ts: Date.now()
  };
  S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
    id: S.myId,
    name: S.myName,
    text: text,
    color: S.myColor,
    ts: Date.now()
  }]);
  setChatLog(_toConsumableArray(S.chatLog));
}

/* Incoming peer chat ('chat' broadcast event). Honors the local block list
   (drop entirely) and mute list (log as '[muted]', no bubble, no unread).
   deps = { setChatLog, setUnreadChats } */
export function handleChatEvent(payload, S, deps) {
  var setChatLog = deps.setChatLog,
    setUnreadChats = deps.setUnreadChats;
  if (!payload || payload.id === S.myId) return;
  try {
    var bl = JSON.parse(localStorage.getItem('bt_blocked') || '[]');
    if (bl.includes(payload.id)) return;
  } catch (e) {}
  var isMuted = false;
  try {
    var ml = JSON.parse(localStorage.getItem('bt_muted') || '[]');
    isMuted = ml.includes(payload.id);
  } catch (e) {}
  if (!isMuted && payload.id) S.chatBubbles[payload.id] = {
    text: payload.text,
    ts: Date.now()
  };
  BT_AUDIO.chatReceive();
  S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
    id: payload.id,
    name: payload.name,
    text: isMuted ? '[muted]' : payload.text,
    color: payload.color,
    ts: Date.now(),
    muted: isMuted
  }]);
  setChatLog(_toConsumableArray(S.chatLog));
  if (!isMuted) setUnreadChats(function (prev) {
    return prev + 1;
  });
}

/* v2.3.1212: incoming party chat ('party_chat', server-relayed to party
   members only; the sender is stamped server-side so it can't be forged).
   Renders in the shared chat log tagged with a shield + party color,
   honoring the same block/mute lists as room chat.  Own messages were
   already echoed optimistically by sendChatMessage, so drop from===myId.
   deps = { setChatLog, setUnreadChats } */
export function handlePartyChatEvent(payload, S, deps) {
  var setChatLog = deps.setChatLog,
    setUnreadChats = deps.setUnreadChats;
  if (!payload || !payload.from || payload.from === S.myId) return;
  try {
    var bl = JSON.parse(localStorage.getItem('bt_blocked') || '[]');
    if (bl.includes(payload.from)) return;
  } catch (e) {}
  var isMuted = false;
  try {
    var ml = JSON.parse(localStorage.getItem('bt_muted') || '[]');
    isMuted = ml.includes(payload.from);
  } catch (e) {}
  if (!isMuted) S.chatBubbles[payload.from] = { text: payload.text, ts: Date.now() };
  BT_AUDIO.chatReceive();
  S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
    id: payload.from,
    name: '🛡 ' + (payload.fromName || 'Bro'),
    text: isMuted ? '[muted]' : payload.text,
    color: '#3dd497',
    ts: Date.now(),
    party: true,
    muted: isMuted
  }]);
  setChatLog(_toConsumableArray(S.chatLog));
  if (!isMuted && setUnreadChats) setUnreadChats(function (prev) { return prev + 1; });
}

/* Incoming peer emote ('emote' broadcast event): overhead emoji + two-tone
   chirp. */
export function handleEmoteEvent(payload, S) {
  if (payload.id && S.others[payload.id]) S.others[payload.id].emote = {
    emoji: payload.emoji,
    ts: Date.now()
  };
  BT_AUDIO.beep(800, 0.06, 0.06, 'sine');
  setTimeout(function () {
    return BT_AUDIO.beep(1000, 0.04, 0.06, 'sine');
  }, 60);
}
