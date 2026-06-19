import React, { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '@/game/chat.js';

/* Always-on chat input line, centered just above the bottom dashboard
   (replaces the old ChatLauncher icon + ChatBubble popup).  Type a message of
   any length: it wraps onto new lines and the box grows UPWARD (bottom-anchored)
   so the whole message stays visible, then scrolls past a max height.  A Send
   button sits at the bottom-right; the keyboard's return also sends.

   No microphone button -- the iOS keyboard already exposes a built-in dictation
   mic for any text field (the Web Speech API isn't available in iOS Safari).

   Sends through the live game state via the shared sendChatMessage() helper, so
   no props need threading from BroTown.  setChatLog is a no-op here (there's no
   chat-history panel; received messages render as overhead bubbles in Pixi). */

const REST_BOTTOM = 'calc(var(--dash-h) + 12px)';
const MAX_H = 120;       // px; ~5 lines, then the textarea scrolls
const NOOP_DEPS = { setChatLog: () => {} };

export const ChatBar = () => {
  const taRef = useRef(null);
  const focusedRef = useRef(false);
  const [val, setVal] = useState('');
  const [kbBottom, setKbBottom] = useState(null); // px when keyboard is up, else null

  const grow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, MAX_H) + 'px';
  };

  /* Lift the bar above the iOS soft keyboard while focused.  The app wrapper
     height is locked and the keyboard OVERLAYS the layout (BroTown.jsx), so a
     bottom-anchored bar would otherwise be hidden behind it.  visualViewport's
     height shrink tells us the keyboard's height. */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onVV = () => {
      if (!focusedRef.current) { setKbBottom(null); return; }
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setKbBottom(overlap > 60 ? Math.round(overlap + 8) : null);
    };
    vv.addEventListener('resize', onVV);
    vv.addEventListener('scroll', onVV);
    return () => { vv.removeEventListener('resize', onVV); vv.removeEventListener('scroll', onVV); };
  }, []);

  const submit = () => {
    const text = val.trim();
    if (!text) return;
    const S = window._gameState && window._gameState.current;
    if (S) { try { sendChatMessage(S, text, NOOP_DEPS); } catch (e) {} }
    setVal('');
    const ta = taRef.current;
    if (ta) { ta.style.height = 'auto'; if (S && S._isDesktop) ta.focus(); else ta.blur(); }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.target.blur(); }
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: kbBottom != null ? kbBottom + 'px' : REST_BOTTOM,
        width: 'min(86vw, 420px)',
        zIndex: 31,                     // above dashboard (30), below prompts/modals (35+)
        display: 'flex',
        alignItems: 'flex-end',         // Send stays bottom-aligned as the textarea grows
        gap: 6,
        padding: '6px 8px',
        background: 'rgba(13, 14, 22, 0.96)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxSizing: 'border-box',
      }}
    >
      <textarea
        ref={taRef}
        value={val}
        rows={1}
        onChange={(e) => { setVal(e.target.value); grow(); }}
        onKeyDown={onKeyDown}
        onFocus={() => { focusedRef.current = true; setTimeout(() => { try { window.visualViewport && window.visualViewport.dispatchEvent(new Event('resize')); } catch (e) {} }, 250); }}
        onBlur={() => { focusedRef.current = false; setKbBottom(null); }}
        placeholder="Say something…"
        maxLength={240}
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck="false"
        style={{
          flex: 1,
          resize: 'none',
          overflowY: 'auto',
          maxHeight: MAX_H,
          lineHeight: '20px',
          padding: '7px 9px',
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 7,
          color: '#E8EAF8',
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: 16,                 // >=16 so iOS Safari doesn't zoom on focus
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <button
        onClick={submit}
        aria-label="Send"
        style={{
          flex: '0 0 auto',
          height: 34,
          padding: '0 14px',
          background: val.trim() ? '#3b82f6' : 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 7,
          color: val.trim() ? '#fff' : '#8890b8',
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'background .12s, color .12s',
        }}
      >
        Send
      </button>
    </div>
  );
};
