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

/* ═══ v2.3.1970: A RECEIVED LINE IS UNTRUSTED TEXT ═══
   The worker clamps room chat at CHAT_RELAY.TEXT_MAX = 200 and stamps the
   sender as of the same version (server/src/index.js _sanitizeChatRelay);
   party chat and friend DMs were already clamped server-side.  This is the
   CLIENT half of that, and it is not belt-and-braces for its own sake:
   worker and client deploy independently (handoff rule 19), so a client
   that meets an un-upgraded worker still has to survive whatever it hands
   over — and what a chat line reaches is a PIXI Text in the world layer
   (effectsRenderer._renderChatBubble, fontSize 21, wordWrapWidth 320) whose
   background Graphics is sized from the MEASURED text.  16 KB — the old
   ceiling, which was just the v2.3.1618 frame gate — is ~640 wrapped lines,
   i.e. a texture and a rounded rect some 17,000 px tall, past the max
   texture size of every iOS GPU.  Room chat is also the one relay
   v2.3.1575 deliberately did not zone-scope, so one line reached every
   player in the world.
   Control chars go too: the bubble is a single Text object and an embedded
   newline is free vertical space nobody typed. */
var CHAT_TEXT_MAX = 200;   /* mirrors CHAT_RELAY.TEXT_MAX / PARTY.CHAT_MAX */
var CHAT_NAME_MAX = 48;    /* mirrors the nameplate clamp in entityRenderer */
export function clampChatText(v) {
  if (typeof v !== 'string') return '';
  return v.slice(0, CHAT_TEXT_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
}
function clampChatName(v) {
  if (typeof v !== 'string') return 'Bro';
  return v.slice(0, CHAT_NAME_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim() || 'Bro';
}

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
  /* v2.3.1970: clamp before anything else touches it (see clampChatText).
     An empty line after the trim is nothing to render, and dropping it here
     also drops the sound and the unread badge that would otherwise fire for
     a message with no message in it. */
  var _text = clampChatText(payload.text);
  if (!_text) return;
  var _name = clampChatName(payload.name);
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
    text: _text,
    ts: Date.now()
  };
  BT_AUDIO.chatReceive();
  S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
    id: payload.id,
    name: _name,
    text: isMuted ? '[muted]' : _text,
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
  /* v2.3.1970: same clamp as room chat -- the worker already bounds this
     lane at PARTY.CHAT_MAX, so this is purely the deploy-order half. */
  var _ptext = clampChatText(payload.text);
  if (!_ptext) return;
  try {
    var bl = JSON.parse(localStorage.getItem('bt_blocked') || '[]');
    if (bl.includes(payload.from)) return;
  } catch (e) {}
  var isMuted = false;
  try {
    var ml = JSON.parse(localStorage.getItem('bt_muted') || '[]');
    isMuted = ml.includes(payload.from);
  } catch (e) {}
  if (!isMuted) S.chatBubbles[payload.from] = { text: _ptext, ts: Date.now() };
  BT_AUDIO.chatReceive();
  S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
    id: payload.from,
    name: '🛡 ' + clampChatName(payload.fromName),
    text: isMuted ? '[muted]' : _ptext,
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
  /* ═══ v2.3.1748: AN EMOTE IS A THING THAT HAPPENS IN A PLACE ═══
     The event relay is room-wide (see server/src/index.js), so this fired for
     every emote anywhere in the world.  The overhead emoji at least needed the
     peer to be on screen, but the CHIRP ran unconditionally and before any id
     test — so a stranger in another zone beeped in your ears.  Both now
     require the emoter to be standing in your zone. */
  var _o = payload && payload.id ? S.others[payload.id] : null;
  if (!_o) return;
  if ((_o.zone || _o.z || 'town') !== S.currentZone) return;
  _o.emote = { emoji: payload.emoji, ts: Date.now() };
  BT_AUDIO.beep(800, 0.06, 0.06, 'sine');
  setTimeout(function () {
    return BT_AUDIO.beep(1000, 0.04, 0.06, 'sine');
  }, 60);
}
