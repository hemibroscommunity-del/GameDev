import React, { useState } from 'react';
import { COL, panelStyle } from './common.js';

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
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
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
              minHeight: 60,
              padding: 6,
              background: 'rgba(0,0,0,.35)',
              border: `1px solid ${COL.tileBor}`,
              borderRadius: 4,
              color: COL.text,
              fontFamily: 'inherit',
              fontSize: 12,
              resize: 'none',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: COL.muted }}>{text.length}/500</span>
            <button onClick={submit} style={{
              padding: '4px 12px',
              background: COL.accent,
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 12,
              cursor: 'pointer',
            }}>{sent ? 'Sent' : 'Send'}</button>
          </div>
        </>
      ) : (
        <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '14px 0' }}>
          Browse view coming soon — server feedback log isn't streamed to clients yet.
        </div>
      )}
    </div>
  );
};

const tabBtn = (active) => ({
  flex: 1,
  padding: '4px',
  background: active ? COL.accent : 'transparent',
  color: active ? '#fff' : COL.muted,
  border: `1px solid ${active ? COL.accent : COL.tileBor}`,
  borderRadius: 4,
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
});
