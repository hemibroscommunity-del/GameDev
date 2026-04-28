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
          stop propagation on the bubble itself so taps inside don't bubble. */}
      <div
        onPointerDown={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'transparent',
          zIndex: 95,
        }}
      />
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          // Roughly above the player avatar — camera keeps the player
          // around vertical center, so 38% from top sits over the head.
          top: '38%',
          transform: 'translate(-50%, -100%)',
          zIndex: 96,
          minWidth: 220,
          maxWidth: '70vw',
          padding: '8px 10px',
          background: 'rgba(20, 22, 32, 0.92)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10,
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          color: '#fff',
          fontFamily: 'VT323, monospace',
        }}
      >
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
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6,
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 16,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
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
          borderTop: '8px solid rgba(20, 22, 32, 0.92)',
        }} />
      </div>
    </>
  );
};
