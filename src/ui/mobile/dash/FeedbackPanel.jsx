import React, { useState } from 'react';
import { COL, panelStyle } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — tabs
   become the spec segmented control (36px on the #121B20 well track,
   active = raised + 2px brass bottom edge), the textarea becomes a
   spec input well (#121B20, 16px font so iOS Safari doesn't auto-zoom
   on focus — same floor as AccountLoginForm), and Send becomes the
   panel's one primary brass button (44px min, #20170D text).  The
   channel send payload and sent-flash timing are unchanged. */
export const FeedbackPanel = () => {
  const [tab, setTab] = useState('submit');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    try {
      const S = window._gameState && window._gameState.current;
      if (S?.channel) {
        S.channel.send({
          type: 'broadcast',
          event: 'feedback',
          payload: { id: S.myId, name: S.myName, text: t, ts: Date.now() },
        });
      }
    } catch {}
    setText('');
    setSent(true);
    setTimeout(() => setSent(false), 1500);
  };

  return (
    <div style={panelStyle}>
      <div style={{
        display: 'flex', gap: 2, marginBottom: 8,
        background: COL.well, borderRadius: 10, padding: 2,
        border: `1px solid ${COL.tileBor}`,
      }}>
        <button onClick={() => setTab('submit')} style={tabBtn(tab === 'submit')}>Submit</button>
        <button onClick={() => setTab('browse')} style={tabBtn(tab === 'browse')}>Browse</button>
      </div>
      {tab === 'submit' ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us what's working or broken…"
            maxLength={500}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: 72,
              padding: '10px 10px',
              background: COL.well,
              border: `1px solid ${COL.border}`,
              borderRadius: 8,
              color: COL.text,
              caretColor: COL.focus,
              fontFamily: 'inherit',
              fontSize: 16,
              lineHeight: 1.4,
              resize: 'none',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
              {text.length}/500
            </span>
            <button onClick={submit} style={{
              minHeight: 44,
              padding: '0 20px',
              background: COL.accent,
              border: 'none',
              borderRadius: 11,
              color: COL.onAccent,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}>{sent ? 'Sent' : 'Send'}</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <img src="/icons/ui/panel-feedback.webp" alt="" draggable={false}
            style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4 }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('💬')); }} />
          <div style={{ fontSize: 13, color: COL.muted, marginTop: 6 }}>
            Browse view coming soon — server feedback log isn't streamed to clients yet.
          </div>
        </div>
      )}
    </div>
  );
};

/* Spec segmented control segment — see comment at top of file. */
const tabBtn = (active) => ({
  flex: 1,
  height: 36,
  background: active ? COL.raised : 'transparent',
  color: active ? COL.text : COL.text2,
  border: 'none',
  borderBottom: `2px solid ${active ? COL.accent : 'transparent'}`,
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
});
