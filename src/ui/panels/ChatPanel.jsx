import React from 'react';
/* v2.3.2139: the channel picker, shared with the mobile composer.  A
   picker on only one of the two surfaces is one a player learns and then
   loses. */
import { ChatChannelChips, lanePlaceholder } from '@/ui/mobile/ChatChannelChips.jsx';

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
/* v2.3.1235: batch-4 rollout — corrected tokens: world-chrome overlay
   rgba(13,22,27,.88) + strong hairline, well #111E23 input trough,
   gold-gradient Send primary (#EAC675 edge, #172126 ink, radius 10),
   close bumped to the 44pt hitbox floor. Styles only; every handler
   body byte-identical. */
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
      /* v2.3.2139: a column now — the lane chips sit above the row this
         surface has always had.  The row itself is unchanged, wrapped below. */
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 6,
      padding: 8,
      /* v2.3.1235: batch-4 rollout — established world-chrome recipe
         (anchored surface over the world) + strong hairline; radius 10
         (12 is off the approved radii set). */
      background: 'rgba(13,22,27,.88)',
      borderRadius: 10,
      border: '1px solid rgba(229,237,233,.20)',
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, /*#__PURE__*/React.createElement(ChatChannelChips, null),
  /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', gap: 6, width: '100%' }
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
      /* v2.3.1235: batch-4 rollout — 44pt hitbox floor + corrected
         secondary recipe (raised #293B41, strong hairline). */
      width: 44,
      height: 44,
      borderRadius: 8,
      border: '1px solid rgba(229,237,233,.20)',
      flexShrink: 0,
      background: '#293B41',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      padding: 0,
      color: '#B6C1BE'
    }
  }, "✕"), /*#__PURE__*/React.createElement("input", {
    ref: chatInputRef,
    /* v2.3.2078: the same handle ChatBubble's composer carries.  There are
       TWO composers — this legacy panel (opened by __broLegacyUI.chat) and
       the mobile ChatBubble textarea — and a scenario had no way to type
       into whichever one was up except by shape: `the input immediately
       before the Send button`.  That broke on ChatBubble at v2.3.2039 when
       the composer became a <textarea> on its own row, and it would have
       broken here on the next layout change.  One selector, both surfaces
       (TRAPS §29). */
    "data-chat-input": "",
    placeholder: lanePlaceholder("Tap to type…"),
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
      /* v2.3.1235: batch-4 rollout — corrected well token #111E23
         (same opacity property; the white-on-white guard below keeps
         its shape, only the token changes). */
      background: '#111E23',
      WebkitAppearance: 'none',
      appearance: 'none',
      /* v2.3.1233b: audit hardening — if a UA still force-paints the
         field white despite appearance:none (the incident class the
         comment above records; autofill styling also repaints bg
         independently), warm-white text would be invisible. The inset
         box-shadow paints the interior dark ON TOP of any UA
         background, making white-on-white impossible. */
      WebkitBoxShadow: 'inset 0 0 0 100px #111E23',
      boxShadow: 'inset 0 0 0 100px #111E23',
      border: '1px solid rgba(229,237,233,.11)',
      borderRadius: 8,
      color: '#F4F0E7',
      WebkitTextFillColor: '#F4F0E7',
      caretColor: '#EAC675',
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
      /* v2.3.1235: batch-4 rollout — Send adopts the committed
         gold-gradient primary recipe (#EAC675 edge, #172126 ink,
         radius 10); it is this surface's ONE primary. */
      minHeight: 44,
      padding: '0 16px',
      background: 'linear-gradient(180deg,#E2B765,#D2A14D)',
      color: '#172126',
      border: '1px solid #EAC675',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      flexShrink: 0,
      fontFamily: 'Source Sans 3,sans-serif'
    }
  }, "Send")));
}
