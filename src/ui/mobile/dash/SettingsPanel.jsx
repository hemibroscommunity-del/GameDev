import React, { useState } from 'react';
import { COL, panelStyle } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — 44px
   setting rows, and the switch grows to a 46×26 touchable pill: track
   is the #121B20 well when off, brass when on (brass = active state,
   the one accent in this region).  Toggle handlers and localStorage
   keys are unchanged. */
const Toggle = ({ label, value, onChange }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    padding: '0 8px',
    borderBottom: `1px solid ${COL.divider}`,
  }}>
    <span style={{ fontSize: 13.5, color: COL.text }}>{label}</span>
    <button
      onClick={onChange}
      style={{
        width: 46, height: 26,
        flex: '0 0 auto',
        borderRadius: 999,
        background: value ? COL.accent : COL.well,
        border: `1px solid ${value ? COL.accent : COL.border}`,
        boxSizing: 'border-box',
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
        touchAction: 'manipulation',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: value ? 22 : 2,
        width: 20, height: 20,
        borderRadius: '50%',
        background: COL.text,
        boxShadow: '0 1px 2px rgba(0,0,0,.35)',
        transition: 'left .15s',
      }} />
    </button>
  </div>
);

export const SettingsPanel = () => {
  const [, force] = useState(0);
  const [audio, setAudio] = useState(() => {
    try { return localStorage.getItem('brotown_audio_off') !== '1'; } catch { return true; }
  });
  const [debug, setDebug] = useState(() => {
    try { return localStorage.getItem('brotown_debug') === '1'; } catch { return false; }
  });

  const toggleAudio = () => {
    const next = !audio;
    setAudio(next);
    try { localStorage.setItem('brotown_audio_off', next ? '0' : '1'); } catch {}
    try { window.BT_AUDIO && (window.BT_AUDIO.muted = !next); } catch {}
  };
  const toggleDebug = () => {
    const next = !debug;
    setDebug(next);
    try {
      if (next) window.debug?.enable?.();
      else window.debug?.disable?.();
    } catch {}
  };

  return (
    <div style={panelStyle}>
      <Toggle label="Audio" value={audio} onChange={toggleAudio} />
      <Toggle label="Debug overlay (D)" value={debug} onChange={toggleDebug} />
      <div style={{ marginTop: 10, padding: '0 8px', fontSize: 13, color: COL.muted, lineHeight: 1.4 }}>
        Tap the floating <b>D</b> button for the full devtools console.
      </div>
    </div>
  );
};
