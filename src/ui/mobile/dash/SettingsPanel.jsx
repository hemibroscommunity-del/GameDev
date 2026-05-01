import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const Toggle = ({ label, value, onChange }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 0',
    borderBottom: `1px solid ${COL.divider}`,
    fontSize: 15,
  }}>
    <span>{label}</span>
    <button
      onClick={onChange}
      style={{
        width: 36, height: 18,
        borderRadius: 9,
        background: value ? COL.accent : 'rgba(255,255,255,0.1)',
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: value ? 20 : 2,
        width: 14, height: 14,
        borderRadius: '50%',
        background: '#fff',
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
      <div style={{ marginTop: 8, fontSize: 15, color: COL.muted }}>
        Tap the floating <b>D</b> button for the full devtools console.
      </div>
    </div>
  );
};
