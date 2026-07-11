import React from 'react';

/* === ChatPanel — the open-chat input overlay === */
/* v2.3.892: extracted verbatim from the chatOpen JSX subtree in
   BroTown.jsx (the chat input bar shown when chat is open: type +
   send a message). Behavior-frozen UI decomposition; the `chatOpen &&`
   gate stays in BroTown. 6 props: chatInput (state), chatInputRef /
   chatInputValRef (the SAME refs BroTown's canvas render loop mirrors,
   passed through so they keep pointing at the live input), sendChat (a
   useCallback), setChatInput, setChatOpen. No data imports or hoisted
   temps. */
/* v2.3.1232: Lantern Slate restyle — world-overlay card, 44px input
   trough + brass Send primary. Handlers/refs untouched. */
export function ChatPanel(props) {
  var chatInput = props.chatInput,
    chatInputRef = props.chatInputRef,
    chatInputValRef = props.chatInputValRef,
    sendChat = props.sendChat,
    setChatInput = props.setChatInput,
    setChatOpen = props.setChatOpen;
  return React.createElement("div", {
    style: {
      position: 'fixed',
      left: 10,
      right: 10,
      bottom: '70%',
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: 8,
      background: 'rgba(17,25,29,.94)',
      borderRadius: 12,
      border: '1px solid rgba(238,242,235,.24)',
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      setChatOpen(false);
      setChatInput('');
      chatInputValRef.current = '';
    },
    onClick: function onClick() {
      setChatOpen(false);
      setChatInput('');
      chatInputValRef.current = '';
    },
    style: {
      /* v2.3.1232: secondary raised close, larger touch target */
      width: 36,
      height: 36,
      borderRadius: 8,
      border: '1px solid rgba(238,242,235,.14)',
      flexShrink: 0,
      background: '#2B3940',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      padding: 0,
      color: '#B9C1BF'
    }
  }, "✕"), /*#__PURE__*/React.createElement("input", {
    ref: chatInputRef,
    placeholder: "Tap to type…",
    value: chatInput,
    onChange: function onChange(e) {
      setChatInput(e.target.value);
      chatInputValRef.current = e.target.value;
    },
    onKeyDown: function onKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChat();
        setChatOpen(false);
        if (chatInputRef.current) chatInputRef.current.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setChatOpen(false);
        if (chatInputRef.current) chatInputRef.current.blur();
      }
    },
    enterKeyHint: "send",
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: "false",
    maxLength: 200,
    style: {
      flex: 1,
      height: 44,
      padding: '0 12px',
      boxSizing: 'border-box',
      /* Opaque white BG + black text so the input stays readable
         regardless of iOS / Android default input styling overrides
         (some platforms force white BG even when CSS asks for
         translucent — that combined with our prior color:#fff was
         showing as white-on-white). */
      /* v2.3.1232: Lantern input trough. OPAQUE #121B20 keeps the
         property that fixed the incident above (translucency was the
         trigger), and WebkitAppearance:'none' disables the platform
         default styling that forced the white BG in the first place. */
      background: '#121B20',
      WebkitAppearance: 'none',
      appearance: 'none',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 8,
      color: '#F7F2E7',
      caretColor: '#F0C878',
      /* 16px: keep — smaller font sizes make iOS Safari zoom the page
         on focus. */
      fontSize: 16,
      outline: 'none',
      minWidth: 0
    }
  }), /*#__PURE__*/React.createElement("button", {
    onTouchStart: function onTouchStart(e) {
      e.preventDefault();
      if (chatInputRef.current) chatInputRef.current.blur();
      sendChat();
    },
    onClick: function onClick() {
      if (chatInputRef.current) chatInputRef.current.blur();
      sendChat();
    },
    style: {
      /* v2.3.1232: brass primary send (44px, text-on-accent) */
      minHeight: 44,
      padding: '0 16px',
      background: '#D8A85F',
      color: '#20170D',
      border: 'none',
      borderRadius: 11,
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      flexShrink: 0,
      fontFamily: 'Source Sans 3,sans-serif'
    }
  }, "Send"));
}
