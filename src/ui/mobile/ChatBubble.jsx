import React, { useEffect, useRef, useState } from 'react';
import { chatBubbleBus } from './chatBubbleBus.js';
import { chatLogBus } from './chatLogBus.js';
import { sendChatMessage } from '../../game/chat.js';

// Over-the-character chat bubble. Opens from the bottom-dashboard chat
// icon, focuses immediately so the soft keyboard appears, and closes when
// anything outside the bubble is tapped.
//
// We send via the live game state (window._gameState.current.channel)
// so this component doesn't need to import or thread sendChat from BroTown.

/* ═══ v2.3.1980: ONE SEND PATH, NOT TWO ═══
 * This used to build and broadcast the `chat` payload itself, a second
 * implementation of what game/chat.js sendChatMessage already does. The
 * copy had drifted in three ways, and the third one leaked:
 *   - no chat-send sound (BT_AUDIO.chatSend),
 *   - S.stats.msgsSent counted here but the log entry shape was hand-rolled,
 *   - and "/p <message>" was NOT recognised, so party chat typed into this
 *     composer -- the one the game actually opens when you tap your own
 *     character -- went out over the ROOM relay to every player in the
 *     world instead of to your party. A private lane that silently isn't
 *     private is worse than not having one.
 * Routing through the real sender fixes all three and means the feed below
 * sees party lines tagged the way the rest of the game tags them.
 *
 * sendChatMessage wants a setChatLog; it only ever uses it to say "the log
 * changed", which is exactly what the bus is for. */
const sendThroughGameState = (text) => {
  const t = text.trim();
  if (!t) return;
  const S = window._gameState && window._gameState.current;
  if (!S) return;
  if (!S.chatBubbles) S.chatBubbles = Object.create(null);   /* v2.3.1970: see BroTown.jsx -- keyed by a wire id */
  if (!S.chatLog) S.chatLog = [];
  if (!S.stats) S.stats = { msgsSent: 0 };
  if (typeof S.stats.msgsSent !== 'number') S.stats.msgsSent = 0;
  try {
    sendChatMessage(S, t, { setChatLog: () => chatLogBus.bump() });
  } catch (e) {
    /* Never swallow the message on an unexpected throw: fall back to the
       plain room broadcast this component used to do on its own. */
    try {
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'chat',
        payload: { id: S.myId, name: S.myName, text: t, color: S.myColor },
      });
    } catch (_e) { /* offline: the local echo below is all there is */ }
    S.chatBubbles[S.myId] = { text: t, ts: Date.now() };
    S.chatLog = [...S.chatLog.slice(-40), {
      id: S.myId, name: S.myName, text: t, color: S.myColor, ts: Date.now(),
    }];
    chatLogBus.bump();
  }
};

/* v2.3.2037: the bt_chatfeed preference is gone with the toggle it
   remembered. Nothing reads the key any more; an old value left in
   localStorage is inert. */

/* ═══ v2.3.2037: SPEAK INSTEAD OF TYPE ═══
 * Owner: "is it possible to have a microphone button on the chat window? It
 * would be easier for people to speak to text and then just send it."
 *
 * Yes, and with no dependency and no server: the Web Speech API is built into
 * the browser. On the primary platform it is `webkitSpeechRecognition` (iOS
 * Safari has shipped it since 14.5), Chrome uses the same prefixed name, and
 * Firefox has neither.
 *
 * SO THE BUTTON IS CONDITIONAL, not decorative. `supported` is resolved once
 * from the constructor actually existing, and the control does not render at
 * all where it does not. A mic button that silently does nothing on a third
 * of phones is worse than no mic button, because the player concludes the
 * game is broken rather than that the feature is absent.
 *
 * It fills the INPUT rather than sending: the owner asked to "speak to text
 * and then just send it", and dictation mishears things. Landing the words in
 * the box lets you fix them before anyone else sees them.
 *
 * interimResults is off deliberately -- watching the text rewrite itself
 * mid-sentence is unsettling, and there is nothing to do with a half-word.
 * continuous is off too: one utterance, one line, which is the shape of a
 * chat message. */
const SpeechRec = (typeof window !== 'undefined')
  ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
  : null;

/* How many people are in the room, world-wide. BroTown mirrors the
   server's `player_count` onto the game state (see its _playerCount note);
   S.others + yourself is the fallback for the frames before the first
   mirror lands. Never below 1 -- you are online, by definition. */
const onlineNow = (S) => {
  if (!S) return 1;
  if (typeof S._playerCount === 'number' && S._playerCount >= 1) return Math.round(S._playerCount);
  try { return Object.keys(S.others || {}).length + 1; } catch (e) { return 1; }
};

export const ChatBubble = () => {
  const [, force] = useState(0);
  const inputRef = useRef(null);
  const [val, setVal] = useState('');
  const [online, setOnline] = useState(1);
  /* 'idle' | 'listening'. Kept as state rather than a ref because the button
     has to LOOK different while it is listening -- a mic you cannot tell is
     on is a mic people talk at and then wonder about. */
  const [micOn, setMicOn] = useState(false);
  const recRef = useRef(null);

  /* Stop the recogniser if the composer closes mid-sentence. Without this the
     browser keeps the mic hot and iOS shows the recording indicator over a
     game the player has already gone back to. */
  useEffect(() => () => {
    try { if (recRef.current) recRef.current.abort(); } catch (e) { /* already gone */ }
  }, []);

  useEffect(() => chatBubbleBus.subscribe(() => force(v => v + 1)), []);

  /* ═══ v2.3.1980: THE COUNT HAS TO CHANGE WHILE YOU ARE LOOKING AT IT ═══
     The number itself is BroTown's (mirrored onto the game state from the
     worker's `player_count`), and this component has no subscription to it
     -- so the first version read it once at render and then sat there, and
     a window left open through three joins still said the number it opened
     with. mp-chatfeed caught it on the leave case.
     A 1 Hz sample while the window is OPEN is the whole fix. It costs
     nothing when closed, and setOnline with an unchanged value is a React
     no-op, so a quiet room re-renders zero times. */
  useEffect(() => {
    if (!chatBubbleBus.open) return undefined;
    const read = () => {
      const n = onlineNow(window._gameState && window._gameState.current);
      setOnline((prev) => (prev === n ? prev : n));
    };
    read();
    const t = setInterval(read, 1000);
    return () => clearInterval(t);
  }, [chatBubbleBus.open]);

  // Focus the input the moment we open so the keyboard appears without
  // a second tap. requestAnimationFrame so the element is mounted first.
  useEffect(() => {
    if (chatBubbleBus.open) {
      requestAnimationFrame(() => { try { inputRef.current?.focus(); } catch {} });
    } else {
      setVal('');
    }
  }, [chatBubbleBus.open]);

  if (!chatBubbleBus.open) return null;

  const dictate = () => {
    if (!SpeechRec) return;
    if (micOn) {
      try { recRef.current && recRef.current.stop(); } catch (e) {}
      return;
    }
    let rec;
    try { rec = new SpeechRec(); } catch (e) { return; }
    recRef.current = rec;
    rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      let said = '';
      try { said = ((ev.results[0] || [])[0] || {}).transcript || ''; } catch (e) { said = ''; }
      said = said.trim();
      if (!said) return;
      /* APPEND, never replace: dictating a second time after fixing a word by
         hand should add to the sentence, not silently eat what is there. The
         120 cap is the input's own maxLength -- enforced here too, because
         setting .value past it in code is not blocked by the attribute. */
      setVal((cur) => (cur ? (cur.replace(/\s+$/, '') + ' ' + said) : said).slice(0, 120));
    };
    rec.onend = () => { setMicOn(false); recRef.current = null; };
    /* Permission refused, no network, no speech heard -- all land here, and
       all mean the same thing to the player: the button is no longer lit. */
    rec.onerror = () => { setMicOn(false); };
    try { rec.start(); setMicOn(true); } catch (e) { setMicOn(false); }
  };

  const close = () => chatBubbleBus.setOpen(false);
  const submit = () => {
    sendThroughGameState(val);
    setVal('');
    /* v2.3.2037: sending closes the composer again, unconditionally.
       v2.3.1980 kept it open when the inline feed was showing, because
       closing would have hidden the conversation you had just joined. The
       feed is no longer in here -- it is the always-on World Chat section in
       the lower left -- so the reason to stay open went with it, and the
       original "one line, then back to the game" is the right behaviour on a
       phone where this card covers the world. */
    close();
  };

  return (
    <>
      {/* Tap-anywhere-else dismiss layer — pointer-events on, but we
          stop propagation on the bubble itself so taps inside don't bubble.
          v2.3.1015: covers only the play area ABOVE the dashboard (not
          inset:0), so the toolbar Chat button isn't under it.  Otherwise the
          tap's pointerdown would close here and pointerup would re-open on the
          button, defeating the toggle.  Play-area tap still dismisses. */}
      <div
        onPointerDown={close}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 'var(--dash-h)',
          background: 'transparent',
          zIndex: 95,
        }}
      />
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          // The player avatar sits at ~37% from the top of the viewport
          // (canvas is upper 75 vh, camera-centered).  Anchor the bubble
          // bottom at 25% so the tail sits well above the player's head.
          top: '25%',
          transform: 'translate(-50%, -100%)',
          zIndex: 96,
          /* v2.3.1980: the composer alone keeps its old size; with the feed
             showing it becomes a panel. The BOTTOM edge stays pinned at 25%
             either way -- that anchor is load-bearing, not cosmetic: it is
             what keeps the composer clear of the iOS soft keyboard, and the
             card grows UPWARD from it (translate -100%). The feed's height
             cap below is what stops that growth running off the top. */
          /* v2.3.2037: back to the narrow composer. The wide variant existed
             only to fit the inline feed, which now lives elsewhere -- a card
             that stayed 94vw wide to hold an input and two buttons would
             cover the world for no reason. */
          minWidth: 220,
          maxWidth: '70vw',
          padding: '8px 10px',
          /* v2.3.1233: Lantern Slate — world-floating card (gradient fill,
             strong border, radius 12, panel shadow; docs/LANTERN-SLATE-SPEC.md
             §10).  No backdrop-filter: fill is opaque enough on its own. */
          /* v2.3.1235: batch-4 rollout — corrected world-chrome recipe
             (flat rgba(13,22,27,.88) + strong hairline, radius 10; the
             composer is an anchored surface over the world). */
          background: 'rgba(13,22,27,.88)',
          border: '1px solid rgba(229,237,233,.20)',
          borderRadius: 10,
          boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          color: '#F4F0E7',
          fontFamily: 'Source Sans 3, sans-serif',
        }}
      >
        {/* ═══ v2.3.1980: WHO IS HERE, AND THE FEED SWITCH ═══
            Owner: "Add players online count and a world chat toggle on chat
            window."  The count is the room's, not the zone's -- see
            onlineNow. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, marginBottom: 6, minHeight: 24,
        }}>
          <div
            data-chat-online={online}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#B6C1BE', minWidth: 0 }}
          >
            {/* A lit dot, because "12 online" with nothing beside it reads as
                a score. Green is the one semantic colour on this surface. */}
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flex: '0 0 auto',
              background: '#3DD497', boxShadow: '0 0 6px rgba(61,212,151,.7)',
            }} />
            <span style={{ whiteSpace: 'nowrap' }}>
              <b style={{ color: '#F4F0E7', fontVariantNumeric: 'tabular-nums' }}>{online}</b>
              {' online'}
            </span>
          </div>
        </div>

        {/* ═══ v2.3.2037: THE FEED MOVED OUT ═══
            Owner: "Just have the chat appear in the lower left area above the
            dashboards in a new 'World Chat' section", clarified as "by chat
            appear I mean sent messages. Keep chat window where it is."
            So the list that used to live here -- behind a "World chat" toggle
            (v2.3.1980) -- is now WorldChatFeed.jsx, always on screen in the
            lower left. The toggle went with it: with every line being world
            chat and the feed no longer inside this card, it had nothing left
            to switch between, and a control with one setting reads as a
            choice that isn't one.
            What stays here is the composer, exactly where it was. */}

        {/* v2.3.1013: input + Send button (Send carried over from the
            short-lived always-on chat bar).  Enter still submits. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            ref={inputRef}
            data-chat-input=""
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { submit(); }
              else if (e.key === 'Escape') { close(); }
            }}
            placeholder="Say something…"
            maxLength={120}
            /* v2.3.1233: spec input — #121B20 well, 44px tall, brass caret;
               fontSize stays 16 (iOS Safari zooms inputs below 16px). */
            /* v2.3.1235: batch-4 rollout — corrected tokens: well #111E23
               trough, hairline .11, warm-white #F4F0E7, brass-highlight
               caret. */
            style={{
              flex: 1,
              minWidth: 0,
              height: 44,
              padding: '0 10px',
              background: '#111E23',
              border: '1px solid rgba(229,237,233,.11)',
              borderRadius: 8,
              color: '#F4F0E7',
              caretColor: '#EAC675',
              fontFamily: 'inherit',
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {SpeechRec ? (
            <button
              type="button"
              onClick={dictate}
              data-chat-mic={micOn ? 'on' : 'off'}
              aria-pressed={micOn}
              aria-label={micOn ? 'Stop dictating' : 'Speak your message'}
              /* Quiet secondary, not a second primary: Send is this surface's
                 one gold control (Lantern Slate), and the mic is the way IN to
                 a message rather than the way out. It goes red while live --
                 the one place a warning colour is right here, because an open
                 mic is a thing you want to notice. 44px square is the touch
                 floor, matching the input's height beside it. */
              style={{
                flex: '0 0 auto',
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: micOn ? 'rgba(224,106,94,.22)' : '#293B41',
                border: micOn ? '1px solid rgba(224,106,94,.75)' : '1px solid rgba(229,237,233,.20)',
                borderRadius: 8,
                color: micOn ? '#E06A5E' : '#B6C1BE',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {/* Inline SVG, not an emoji: 🎤 renders as a different object on
                  every platform and cannot take the live colour above. */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            </button>
          ) : null}
          <button
            onClick={submit}
            aria-label="Send"
            /* v2.3.1233: primary-action brass when there's text to send
               (#D8A85F bg + #20170D label); quiet raised surface when empty. */
            /* v2.3.1235: batch-4 rollout — committed gold-gradient primary
               (#EAC675 edge, #172126 ink, radius 10, button 13/700) when
               armed; corrected secondary (#293B41 + strong hairline,
               disabled #667875 label) when empty. ONE primary per surface. */
            style={{
              flex: '0 0 auto',
              height: 44,
              padding: '0 14px',
              background: val.trim() ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : '#293B41',
              border: val.trim() ? '1px solid #EAC675' : '1px solid rgba(229,237,233,.20)',
              borderRadius: 10,
              color: val.trim() ? '#172126' : '#667875',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </div>
        {/* Tail pointing down toward the character. */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: -8,
          width: 0,
          height: 0,
          transform: 'translateX(-50%)',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          /* v2.3.1233: tail matches the card gradient's bottom stop. */
          /* v2.3.1235: batch-4 rollout — tail re-matched to the corrected
             flat world-chrome fill above (a mismatched tail reads as a
             seam). */
          borderTop: '8px solid rgba(13,22,27,.88)',
        }} />
      </div>
    </>
  );
};
