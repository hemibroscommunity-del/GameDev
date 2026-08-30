import React, { useEffect, useRef, useState } from 'react';
import { guardActive, onGuardChange } from './modalGuardBus.js'; /* v2.3.2145 */
import { chatBubbleBus } from './chatBubbleBus.js';
import { chatLogBus } from './chatLogBus.js';
import { sendChatMessage } from '../../game/chat.js';
/* v2.3.2139: the channel picker.  The chips only set a mode — the line is
   composed inside sendChatMessage, so this composer stays ignorant of how
   a lane is spelled (see chatChannel.js on why that matters here). */
import { ChatChannelChips, lanePlaceholder } from './ChatChannelChips.jsx';

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

/* ═══ v2.3.2039: YOU CAN SEE WHAT YOU ARE ABOUT TO SEND ═══
 * Owner: "it's tricky to see your full message before sending because it
 * gets cut off."
 *
 * It was a single-line <input> in a 70vw card sharing its row with a mic and
 * a Send button -- about 130px of text on a 390px phone, or eight characters
 * of a 120-character message. Everything before the caret scrolled off to the
 * left, so the one moment you most want to re-read a sentence (before the
 * whole room does) was the one moment you could not.
 *
 * A <textarea> WRAPS, which is the actual fix: the same 120 characters laid
 * out over three lines instead of scrolled through a slot. It grows from one
 * line to three and scrolls past that, so an empty composer is the same size
 * it always was and only a long message costs height -- and the card is
 * bottom-anchored (translate -100%), so it grows UPWARD, away from the soft
 * keyboard rather than under it.
 *
 * The composer also gets its own full-width row, with the mic and Send
 * beneath. Sharing a row with two 44px controls was costing the text ~100px
 * of the card's width; nothing else on this surface needs that width, and the
 * text needs all of it.
 */
const LINE_H = 21;          /* 16px font at ~1.3 -- matches the style below */
const BOX_PAD = 22;         /* 10px top + 10px bottom + the 1px hairlines */
const MIN_H = 44;           /* the touch floor the input has always had */
/* FOUR lines, which is what a full 120 characters needs at the corrected
   card width -- measured on the built client, not guessed. It is also the
   most the card can afford: the bottom edge is pinned at 25% of the viewport
   (the tail has to sit above the player's head), so on a 390x844 phone the
   whole card gets ~211px and a fifth line would push its top under the notch.
   Freeing the online count's row above paid for this one. */
const MAX_H = LINE_H * 4 + BOX_PAD;

/* Re-measure by collapsing first: scrollHeight of an element already sized to
   its content reports the CURRENT height, not the needed one, so a textarea
   that has grown can never shrink again when you delete a line. */
const grow = (el) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.max(MIN_H, Math.min(el.scrollHeight, MAX_H)) + 'px';
};

export const ChatBubble = () => {
  const [, force] = useState(0);
  const inputRef = useRef(null);
  const [val, setVal] = useState('');
  const [online, setOnline] = useState(1);
  /* ═══ v2.3.2039: THREE MIC STATES, NOT TWO ═══
     Owner: "show a spinning icon while the game processes your speech to
     text. There's a little delay."

     There is, and it is not the game's -- the Web Speech API ships the audio
     off to be recognised, and the gap between you stopping talking and the
     words appearing is that round trip. The API tells us about it precisely:
     `speechend`/`audioend` fire when the recogniser stops HEARING, `result`
     and then `end` fire when it has DECIDED. Everything between those is the
     wait the owner saw, and nothing was drawn for it -- the button simply
     un-lit and sat there looking finished while the phone was still working.

     'idle' | 'listening' | 'thinking'. State, not a ref: the whole point is
     that the button looks different in each. */
  const [micState, setMicState] = useState('idle');
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

  /* Driven off `val` rather than off onChange, because dictation and the
     post-send reset both write it without an input event. */
  useEffect(() => { grow(inputRef.current); }, [val]);

  // Focus the input the moment we open so the keyboard appears without
  // a second tap. requestAnimationFrame so the element is mounted first.
  useEffect(() => {
    if (chatBubbleBus.open) {
      requestAnimationFrame(() => { try { inputRef.current?.focus(); } catch {} });
    } else {
      setVal('');
    }
  }, [chatBubbleBus.open]);

  /* ═══ v2.3.2145: THE COMPOSER STANDS DOWN FOR A DECISION PANEL ═══
     Owner: "I couldn't accept any trades because notifications blocked it."

     This component's first child is a transparent tap catcher covering the
     entire play area at z-index 95, mounted for exactly as long as the
     composer is open, whose job is to close the composer on the next tap
     anywhere. The trade window is z-index 32. So with the composer open,
     every tap aimed at Accept was swallowed by an invisible sheet above it --
     the button was not merely hard to hit, it was unreachable.

     Closing rather than hiding, and closing through the bus, so the toolbar's
     Chat button agrees about the state; leaving `open` true while rendering
     null would give a chat box that is shut on screen and open to the toggle.
     Whatever was typed is kept -- the composer restores it on reopen -- so
     nothing a player wrote is thrown away by a trade invite landing. */
  React.useEffect(() => onGuardChange(() => {
    if (guardActive() && chatBubbleBus.open) { try { chatBubbleBus.close(); } catch (e) { /* ignore */ } }
  }), []);

  if (!chatBubbleBus.open) return null;
  /* Belt as well as braces: a panel that opens in the same commit as this
     render has already pushed the guard but not yet fired the listener. */
  if (guardActive()) return null;

  const dictate = () => {
    if (!SpeechRec) return;
    /* Any non-idle state means "there is a recogniser running" -- stop it.
       Guarding on the whole state rather than on 'listening' is what stops a
       second recogniser being started during the thinking window, which on
       iOS ends the first one and loses the sentence you just spoke. */
    if (micState !== 'idle') {
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
    /* THE WAIT BEGINS HERE. Both events are wired because implementations
       disagree about which they send and whether they send both: Chrome fires
       speechend then audioend, and a recogniser stopped by tapping the button
       may skip speechend entirely. Setting the same state from either is
       idempotent, and missing it would leave the button lit through the wait
       -- the exact state this change exists to remove. */
    rec.onspeechend = () => setMicState((m) => (m === 'listening' ? 'thinking' : m));
    rec.onaudioend  = () => setMicState((m) => (m === 'listening' ? 'thinking' : m));
    /* ...and ends here, at `end` rather than at `result`: `end` is the one
       event guaranteed to arrive on every path, including the ones where no
       result ever comes (silence, a refused permission, a dropped network).
       Spinning forever because the words never arrived would be worse than
       the flat button this replaces. */
    rec.onend = () => { setMicState('idle'); recRef.current = null; };
    /* Permission refused, no network, no speech heard -- all land here, and
       all mean the same thing to the player: the button is no longer busy. */
    rec.onerror = () => { setMicState('idle'); };
    try { rec.start(); setMicState('listening'); } catch (e) { setMicState('idle'); }
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
        /* The dismiss layer covers the whole play area, so a long press
           landing on it is a long press "on the game" as far as the player is
           concerned -- and it is outside .brotown-wrap for the same reason the
           card is. */
        className="bt-chat-noselect"
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
        /* v2.3.2039: see .bt-chat-noselect in game.css -- a long press here
           used to start a selection that ran across the whole play area. */
        className="bt-chat-noselect"
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
          /* ═══ v2.3.2039: AN EXPLICIT WIDTH, NOT JUST A CAP ═══
             `maxWidth` alone never bound anything here. A fixed-position box
             with no width shrink-wraps to its content, and the only content
             with an intrinsic width was the button row -- so the card sat at
             its 220px floor and the composer's `width:100%` resolved against
             THAT, giving ~175px of text: about twenty characters of a
             hundred-and-twenty character message. Measured on the built
             client; the first pass at this fix raised maxWidth to 86vw and
             changed the rendered width by nothing at all, because a cap on a
             box that was already narrower than the cap does nothing.
             So: a real width. Capped in px as well as vw so it does not
             become a letterbox on a tablet. */
          width: 'min(92vw, 460px)',
          minWidth: 220,
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
        {/* ═══ v2.3.2039: THE ONLINE COUNT MOVED INTO THE CONTROL ROW ═══
            It had a row of its own (24px + 6px of margin) holding one short
            phrase, and this card has almost no room to spare: its bottom edge
            is pinned at 25% of the viewport so the tail sits above the
            player's head, which leaves ~28px of headroom above it on a 390x844
            phone before the card runs under the notch. That row was the price
            of a fourth line in the composer, and a fourth line is what makes a
            full-length message visible in one piece. Same content, same
            `data-chat-online` hook, one row cheaper -- see below. */}

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
        {/* v2.3.2039: the composer takes the full width on its own row and the
            two controls sit beneath it -- see the note by `grow` above. */}
        <ChatChannelChips compact />
        <textarea
          ref={inputRef}
          data-chat-input=""
          rows={1}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            /* Enter SENDS, and preventDefault is what makes that true in a
               textarea: without it the newline is inserted as well, so the
               next message starts with a blank line. Shift+Enter is left as
               the deliberate way to write one on a keyboard. */
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            else if (e.key === 'Escape') { close(); }
          }}
          placeholder={lanePlaceholder('Say something…')}
          maxLength={120}
          /* v2.3.1233: spec input — #121B20 well, 44px tall, brass caret;
             fontSize stays 16 (iOS Safari zooms inputs below 16px). */
          /* v2.3.1235: batch-4 rollout — corrected tokens: well #111E23
             trough, hairline .11, warm-white #F4F0E7, brass-highlight
             caret. */
          style={{
            display: 'block',
            width: '100%',
            minWidth: 0,
            height: MIN_H,
            maxHeight: MAX_H,
            padding: '10px 10px',
            background: '#111E23',
            border: '1px solid rgba(229,237,233,.11)',
            borderRadius: 8,
            color: '#F4F0E7',
            caretColor: '#EAC675',
            fontFamily: 'inherit',
            fontSize: 16,
            lineHeight: LINE_H + 'px',
            outline: 'none',
            boxSizing: 'border-box',
            /* A composer that can be dragged bigger by its corner, over the
               world, on a phone: no. Height is what `grow` says it is. */
            resize: 'none',
            overflowY: 'auto',
            /* The one selectable thing in the card. Belt and braces with the
               `.bt-chat-noselect textarea` rule: the shell sets
               user-select:none, and on iOS an inherited `none` makes a field
               uneditable rather than merely unselectable. */
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <div
            data-chat-online={online}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, flex: '0 0 auto',
              fontSize: 12, color: '#B6C1BE', minWidth: 0, paddingLeft: 2,
            }}
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
          {SpeechRec ? (
            <button
              type="button"
              onClick={dictate}
              data-chat-mic={micState}
              aria-pressed={micState === 'listening'}
              /* v2.3.2039: aria-busy is the screen-reader half of the spinner.
                 A sighted player sees it turn; without this, someone using
                 VoiceOver gets no signal that the button is mid-work at all. */
              aria-busy={micState === 'thinking'}
              aria-label={
                micState === 'thinking' ? 'Turning your speech into text'
                : micState === 'listening' ? 'Stop dictating'
                : 'Speak your message'
              }
              /* Quiet secondary, not a second primary: Send is this surface's
                 one gold control (Lantern Slate), and the mic is the way IN to
                 a message rather than the way out. It goes red while live --
                 the one place a warning colour is right here, because an open
                 mic is a thing you want to notice. 44px square is the touch
                 floor, matching the input's height beside it. */
              /* v2.3.2039: the THINKING state is brass, not red. Red means
                 "your microphone is open"; the mic is closed by this point and
                 the phone is just working, which is the ordinary busy colour
                 this UI already uses for waiting. Reusing red would have said
                 the mic was still listening when it was not. */
              style={{
                flex: '0 0 auto',
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: micState === 'listening' ? 'rgba(224,106,94,.22)'
                  : micState === 'thinking' ? 'rgba(234,198,117,.16)' : '#293B41',
                border: micState === 'listening' ? '1px solid rgba(224,106,94,.75)'
                  : micState === 'thinking' ? '1px solid rgba(234,198,117,.55)'
                  : '1px solid rgba(229,237,233,.20)',
                borderRadius: 8,
                color: micState === 'listening' ? '#E06A5E'
                  : micState === 'thinking' ? '#EAC675' : '#B6C1BE',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {micState === 'thinking' ? (
                /* bt-exit-spin is the app's existing spinner keyframe
                   (src/styles/game.css, used by the exit and zone-loading
                   veils) -- one definition of "the game is working", not a
                   second one that rotates at a different speed. currentColor
                   ties the ring to the button's state colour above. */
                <span
                  data-chat-mic-spin=""
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2.5px solid rgba(234,198,117,.25)',
                    borderTopColor: 'currentColor',
                    animation: 'bt-exit-spin .8s linear infinite',
                  }}
                />
              ) : (
                /* Inline SVG, not an emoji: 🎤 renders as a different object on
                    every platform and cannot take the live colour above. */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <path d="M12 18v3" />
                </svg>
              )}
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
              /* v2.3.2039: takes the rest of the control row now that the
                 composer is above rather than beside it. A 62px button
                 marooned against the card's right edge with empty space to
                 its left reads as unfinished, and the bigger target is free. */
              flex: 1,
              minWidth: 0,
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
