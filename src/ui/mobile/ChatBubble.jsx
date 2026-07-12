import React, { useEffect, useRef, useState } from 'react';
import { chatBubbleBus } from './chatBubbleBus.js';

// Over-the-character chat bubble. Opens from the bottom-dashboard chat
// icon, focuses immediately so the soft keyboard appears, and closes when
// anything outside the bubble is tapped.
//
// We send via the live game state (window._gameState.current.channel)
// so this component doesn't need to import or thread sendChat from BroTown.
const sendThroughGameState = (text) => {
  const t = text.trim();
  if (!t) return;
  const S = window._gameState && window._gameState.current;
  if (!S) return;
  try {
    if (S.channel) S.channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: { id: S.myId, name: S.myName, text: t, color: S.myColor },
    });
  } catch {}
  if (!S.chatBubbles) S.chatBubbles = {};
  S.chatBubbles[S.myId] = { text: t, ts: Date.now() };
  if (!S.chatLog) S.chatLog = [];
  S.chatLog = [...S.chatLog.slice(-40), {
    id: S.myId, name: S.myName, text: t, color: S.myColor, ts: Date.now(),
  }];
  if (S.stats) S.stats.msgsSent = (S.stats.msgsSent || 0) + 1;
};

export const ChatBubble = () => {
  const [, force] = useState(0);
  const inputRef = useRef(null);
  const [val, setVal] = useState('');

  useEffect(() => chatBubbleBus.subscribe(() => force(v => v + 1)), []);

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

  const close = () => chatBubbleBus.setOpen(false);
  const submit = () => {
    sendThroughGameState(val);
    setVal('');
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
          minWidth: 220,
          maxWidth: '70vw',
          padding: '8px 10px',
          /* v2.3.1233: Lantern Slate — world-floating card (gradient fill,
             strong border, radius 12, panel shadow; docs/LANTERN-SLATE-SPEC.md
             §10).  No backdrop-filter: fill is opaque enough on its own. */
          background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
          border: '1px solid rgba(238,242,235,.24)',
          borderRadius: 12,
          boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          color: '#F7F2E7',
          fontFamily: 'Source Sans 3, sans-serif',
        }}
      >
        {/* v2.3.1013: input + Send button (Send carried over from the
            short-lived always-on chat bar).  Enter still submits. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            ref={inputRef}
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
            style={{
              flex: 1,
              minWidth: 0,
              height: 44,
              padding: '0 10px',
              background: '#121B20',
              border: '1px solid rgba(238,242,235,.14)',
              borderRadius: 8,
              color: '#F7F2E7',
              caretColor: '#F0C878',
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
            style={{
              flex: '0 0 auto',
              height: 44,
              padding: '0 14px',
              background: val.trim() ? '#D8A85F' : '#2B3940',
              border: '1px solid rgba(238,242,235,.14)',
              borderRadius: 11,
              color: val.trim() ? '#20170D' : '#687575',
              fontFamily: 'inherit',
              fontSize: 14,
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
          borderTop: '8px solid rgba(17,25,29,.94)',
        }} />
      </div>
    </>
  );
};
