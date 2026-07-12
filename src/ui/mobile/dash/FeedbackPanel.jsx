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
      {/* v2.3.1235: batch-1 rollout — track border was COL.tileBor
          (rgba .08), an off-token line; only line (.11) / line-strong
          (.20) are approved. */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 8,
        background: COL.well, borderRadius: 10, padding: 2,
        border: `1px solid ${COL.border}`,
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
            {/* v2.3.1235: batch-1 rollout — Send is this surface's one
                filled-gold action; moved from a flat-brass radius-11
                one-off onto the shared button-primary class (gold
                gradient, #EAC675 border, radius 10, #172126 text). */}
            <button onClick={submit} className="button-primary" style={{
              minHeight: 44,
              padding: '0 20px',
              fontSize: 13,
              touchAction: 'manipulation',
            }}>{sent ? 'Sent' : 'Send'}</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {/* v2.3.1235: batch-1 rollout — empty-state contract: icon ≤40px,
              message 13/700 secondary + support sentence 12 muted (was a
              44px icon over one 13/400 muted run-on line). */}
          <img src="/icons/ui/panel-feedback.webp" alt="" draggable={false}
            style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('💬')); }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>
            Browse view coming soon.
          </div>
          <div style={{ fontSize: 12, color: COL.muted, marginTop: 2 }}>
            The server feedback log isn't streamed to clients yet.
          </div>
        </div>
      )}
    </div>
  );
};

/* Spec segmented control segment — see comment at top of file.
   v2.3.1235: batch-1 rollout — segments are tappable, so they carry the
   ≥44px hitbox contract themselves (was height 36). */
const tabBtn = (active) => ({
  flex: 1,
  minHeight: 44,
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
