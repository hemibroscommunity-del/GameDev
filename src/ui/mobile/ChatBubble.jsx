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
