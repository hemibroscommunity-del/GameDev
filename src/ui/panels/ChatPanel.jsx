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
      gap: 4,
      padding: '5px 8px',
      background: 'rgba(10,8,20,.95)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,.2)',
      boxShadow: '0 4px 24px rgba(0,0,0,.7)'
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
      width: 28,
      height: 28,
      borderRadius: 6,
      border: 'none',
      flexShrink: 0,
      background: 'rgba(255,255,255,.1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      padding: 0,
      color: '#fff'
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("input", {
    ref: chatInputRef,
    placeholder: "Tap to type\u2026",
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
      padding: '8px 10px',
      /* Opaque white BG + black text so the input stays readable
         regardless of iOS / Android default input styling overrides
         (some platforms force white BG even when CSS asks for
         translucent — that combined with our prior color:#fff was
         showing as white-on-white). */
      background: '#ffffff',
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 6,
      color: '#000',
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
      padding: '8px 14px',
      background: 'var(--pop)',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      flexShrink: 0,
      fontFamily: 'Source Sans 3,sans-serif'
    }
  }, "Send"));
}
