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

/* Remembered per device, like the block/mute lists next to it. */
const FEED_KEY = 'bt_chatfeed';
const readFeedPref = () => {
  try { return localStorage.getItem(FEED_KEY) === '1'; } catch (e) { return false; }
};
const writeFeedPref = (v) => {
  try { localStorage.setItem(FEED_KEY, v ? '1' : '0'); } catch (e) { /* private mode */ }
};

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
  /* v2.3.1980: the world-chat feed. `logV` exists to re-render on a new
     message -- the messages themselves are read off the game state, so
     there is no second copy of the log to keep in step. */
  const [feedOn, setFeedOn] = useState(readFeedPref);
  const [logV, setLogV] = useState(0);
  const [online, setOnline] = useState(1);
  const feedRef = useRef(null);

  useEffect(() => chatBubbleBus.subscribe(() => force(v => v + 1)), []);
  useEffect(() => chatLogBus.subscribe(() => setLogV(v => v + 1)), []);

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

  /* Newest at the bottom, so the newest is what you see -- on open, and on
     every arriving line. Not conditional on being scrolled to the bottom
     already: the feed is four to six lines tall, so there is no reading
     position worth preserving, and a chat that does not follow the
     conversation is the more surprising of the two behaviours here. */
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logV, feedOn, chatBubbleBus.open]);

  if (!chatBubbleBus.open) return null;

  const S = window._gameState && window._gameState.current;
  /* Oldest first so it reads downward like every other chat. The log is
     already capped at 40-50 entries by its writers; 30 is what fits. */
  const lines = feedOn ? ((S && S.chatLog) || []).slice(-30) : [];
  const toggleFeed = () => {
    setFeedOn((v) => { writeFeedPref(!v); return !v; });
    /* Re-focusing keeps the keyboard up: on iOS the toggle steals focus and
       the keyboard collapses, which shifts the whole composer mid-tap. */
    requestAnimationFrame(() => { try { inputRef.current?.focus(); } catch (e) {} });
  };

  const close = () => chatBubbleBus.setOpen(false);
  const submit = () => {
    sendThroughGameState(val);
    setVal('');
    /* v2.3.1980: sending closes the BUBBLE, as it always has -- one line,
       then back to the game. It must not close the FEED: you opened that to
       follow a conversation, and a window that shuts every time you answer
       cannot hold one. Caught by mp-chatfeed, which could not read its own
       messages back. */
    if (!feedOn) { close(); return; }
    requestAnimationFrame(() => { try { inputRef.current?.focus(); } catch (e) {} });
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
          minWidth: feedOn ? 280 : 220,
          maxWidth: feedOn ? 'min(560px, 94vw)' : '70vw',
          width: feedOn ? '94vw' : undefined,
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
          <button
            onClick={toggleFeed}
            data-chat-feed={feedOn ? 'on' : 'off'}
            aria-pressed={feedOn}
            aria-label="World chat"
            /* Quiet raised secondary when off, lit hairline when on. NOT the
               gold primary: Send is this surface's one primary (Lantern
               Slate rule), and a second gold control would compete with it. */
            style={{
              flex: '0 0 auto',
              height: 26,
              padding: '0 9px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: feedOn ? '#1B2E33' : '#293B41',
              border: feedOn ? '1px solid rgba(234,198,117,.55)' : '1px solid rgba(229,237,233,.20)',
              borderRadius: 8,
              color: feedOn ? '#EAC675' : '#B6C1BE',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.02em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>{feedOn ? '▾' : '▸'}</span>
            World chat
          </button>
        </div>

        {feedOn && (
          <div
            ref={feedRef}
            data-chat-feed-list={lines.length}
            /* The height cap is arithmetic, not taste: the card's bottom edge
               is at 25vh and it grows upward, so anything past
               (25vh - the chrome around the feed) leaves the screen. 104px is
               that chrome (16 padding + 24 header + 12 gaps + 44 composer +
               8 margin); the 64px floor keeps it usable on a short phone. */
            style={{
              maxHeight: 'max(64px, calc(25vh - 104px))',
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              marginBottom: 6,
              padding: '6px 8px',
              background: '#111E23',
              border: '1px solid rgba(229,237,233,.11)',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            {lines.length === 0 ? (
              <div style={{ color: '#667875', fontStyle: 'italic' }}>Nothing said yet.</div>
            ) : lines.map((m, i) => (
              /* ts+i, not ts: two lines can land in the same millisecond, and
                 an index alone re-keys every row when the log rolls over. */
              <div key={(m.ts || 0) + '-' + i} style={{ marginBottom: 3, wordBreak: 'break-word' }}>
                {m.name ? (
                  <span style={{ color: m.color || '#8FB8C9', fontWeight: 700 }}>{m.name}: </span>
                ) : null}
                <span style={{ color: m.muted ? '#667875' : (m.name ? '#F4F0E7' : '#EAC675') }}>{m.text}</span>
              </div>
            ))}
          </div>
        )}

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
