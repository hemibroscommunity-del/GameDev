import React, { useEffect, useRef, useState } from 'react';
import { debugBus } from './debugBus.js';
import { BUILD_INFO } from '../ui/BuildBadge.jsx';

const PANELS = ['Console', 'State', 'WS', 'Perf'];

const fmtTime = (t) => {
  const d = new Date(t);
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
};

const lvlColor = (lvl) => ({
  log: '#cfd8dc', info: '#81d4fa', warn: '#ffb74d', error: '#ef5350',
}[lvl] || '#cfd8dc');

// Activation: 4-finger tap, OR long-press (3s) in top-left 60x60 corner.
const useActivationGesture = () => {
  useEffect(() => {
    const onTouch = (e) => {
      if (e.touches && e.touches.length >= 4) {
        debugBus.enable();
        debugBus.toggle();
      }
    };
    let pressTimer = null;
    const onPressStart = (e) => {
      const x = (e.touches?.[0]?.clientX ?? e.clientX);
      const y = (e.touches?.[0]?.clientY ?? e.clientY);
      if (x < 60 && y < 60) {
        pressTimer = setTimeout(() => {
          debugBus.enable();
          debugBus.toggle();
        }, 3000);
      }
    };
    const onPressEnd = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchstart', onPressStart, { passive: true });
    window.addEventListener('touchend', onPressEnd, { passive: true });
    window.addEventListener('mousedown', onPressStart);
    window.addEventListener('mouseup', onPressEnd);
    return () => {
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchstart', onPressStart);
      window.removeEventListener('touchend', onPressEnd);
      window.removeEventListener('mousedown', onPressStart);
      window.removeEventListener('mouseup', onPressEnd);
    };
  }, []);
};

const usePerf = (enabled) => {
  useEffect(() => {
    if (!enabled) return;
    let frames = 0, last = performance.now(), raf = 0, lastFrame = last;
    const tick = (now) => {
      frames++;
      debugBus.state.perf.frameMs = +(now - lastFrame).toFixed(1);
      lastFrame = now;
      if (now - last >= 1000) {
        debugBus.state.perf.fps = Math.round((frames * 1000) / (now - last));
        frames = 0; last = now;
        const s = debugBus.getState();
        if (s) {
          debugBus.state.perf.ticks = s._tickCount || s.tickCount || 0;
          debugBus.state.perf.renderer = s._rendererKind || (window.__pixiActive ? 'pixi' : 'canvas2d');
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
};

const useBusVersion = () => {
  const [, setV] = useState(0);
  useEffect(() => debugBus.subscribe(() => setV(v => v + 1)), []);
};

const ConsolePanel = () => {
  const ref = useRef(null);
  const [filter, setFilter] = useState('');
  const [input, setInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; });
  const filtered = filter
    ? debugBus.logs.filter(l => l.text.toLowerCase().includes(filter.toLowerCase()))
    : debugBus.logs;
  const submit = () => { debugBus.runCmd(input); setInput(''); setHistIdx(-1); };
  const onKey = (e) => {
    if (e.key === 'Enter') submit();
    else if (e.key === 'ArrowUp') {
      const h = debugBus.commandHistory;
      const i = histIdx < 0 ? h.length - 1 : Math.max(0, histIdx - 1);
      if (h[i]) { setInput(h[i]); setHistIdx(i); }
    } else if (e.key === 'ArrowDown') {
      const h = debugBus.commandHistory;
      if (histIdx >= 0 && histIdx < h.length - 1) {
        setInput(h[histIdx + 1]); setHistIdx(histIdx + 1);
      } else { setInput(''); setHistIdx(-1); }
    }
  };
  const copyAll = () => {
    const txt = debugBus.logs.map(l => `[${fmtTime(l.t)}] ${l.level.toUpperCase()} ${l.text}`).join('\n');
    navigator.clipboard?.writeText(txt).then(
      () => debugBus.pushLog('info', ['copied ' + debugBus.logs.length + ' lines']),
      () => debugBus.pushLog('warn', ['clipboard unavailable']),
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#111' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter"
          style={inputStyle} />
        <button onClick={copyAll} style={btnStyle}>copy</button>
        <button onClick={() => { debugBus.logs.length = 0; debugBus.pushLog('info', ['cleared']); }}
          style={btnStyle}>clear</button>
      </div>
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 4, fontFamily: 'monospace', fontSize: 11 }}>
        {filtered.map((l, i) => (
          <div key={i} style={{ color: lvlColor(l.level), whiteSpace: 'pre-wrap', borderBottom: '1px solid #222', padding: '2px 0' }}>
            <span style={{ opacity: .5, marginRight: 6 }}>{fmtTime(l.t).slice(0, 12)}</span>
            {l.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#111', borderTop: '1px solid #333' }}>
        <span style={{ color: '#4caf50', fontFamily: 'monospace', fontSize: 12, alignSelf: 'center' }}>&gt;</span>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
          placeholder="help, state, set <path> <json>, reload..."
          style={{ ...inputStyle, flex: 1 }} />
        <button onClick={submit} style={btnStyle}>run</button>
      </div>
    </div>
  );
};

const StatePanel = () => {
  const [path, setPath] = useState('');
  const s = debugBus.getState();
  let target = s;
  if (path && s) {
    for (const k of path.split('.').filter(Boolean)) target = target?.[k];
  }
  const render = (v, depth = 0) => {
    if (v == null) return <span style={{ color: '#888' }}>{String(v)}</span>;
    if (typeof v !== 'object') return <span style={{ color: '#aed581' }}>{JSON.stringify(v)}</span>;
    if (depth > 2) return <span style={{ color: '#888' }}>…</span>;
    const isArr = Array.isArray(v);
    const entries = Object.entries(v).slice(0, 50);
    return (
      <div style={{ paddingLeft: depth ? 12 : 0 }}>
        {isArr ? `Array(${v.length})` : ''}
        {entries.map(([k, vv]) => (
          <div key={k}>
            <span style={{ color: '#80cbc4' }}>{k}</span>
            <span style={{ opacity: .5 }}>: </span>
            {render(vv, depth + 1)}
          </div>
        ))}
        {Object.keys(v).length > 50 && <div style={{ color: '#888' }}>…+{Object.keys(v).length - 50} more</div>}
      </div>
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 4, background: '#111' }}>
        <input value={path} onChange={e => setPath(e.target.value)} placeholder="dotted.path (empty = root)"
          style={{ ...inputStyle, width: '100%' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 6, fontFamily: 'monospace', fontSize: 11 }}>
        {s ? render(target) : <div style={{ color: '#888' }}>no game state yet</div>}
      </div>
    </div>
  );
};

const WSPanel = () => {
  const [sel, setSel] = useState(null);
  const frames = debugBus.wsFrames;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 4, background: '#111', fontSize: 11, color: '#aaa' }}>
        {frames.length} frames · status: {debugBus.state.perf.wsState}
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #333' }}>
          {frames.slice().reverse().map((f, i) => {
            const idx = frames.length - 1 - i;
            return (
              <div key={idx} onClick={() => setSel(idx)}
                style={{ padding: '3px 6px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
                  background: sel === idx ? '#1e3a5f' : 'transparent',
                  borderBottom: '1px solid #1a1a1a',
                  color: f.dir === 'in' ? '#81c784' : '#ffb74d' }}>
                <span style={{ opacity: .6 }}>{fmtTime(f.t).slice(0, 12)}</span>
                {' '}{f.dir === 'in' ? '←' : '→'} {f.summary}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 6, fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap' }}>
          {sel != null && frames[sel]
            ? JSON.stringify(frames[sel].raw, null, 2)
            : <span style={{ color: '#888' }}>select a frame</span>}
        </div>
      </div>
    </div>
  );
};

const PerfPanel = () => {
  const p = debugBus.state.perf;
  const s = debugBus.getState();
  const rows = [
    ['FPS', p.fps],
    ['Frame ms', p.frameMs],
    ['Renderer', p.renderer],
    ['Tick count', p.ticks],
    ['WS state', p.wsState],
    ['Build', `v${BUILD_INFO.version} · ${BUILD_INFO.sha} · ${BUILD_INFO.time}`],
    ['UA', navigator.userAgent.slice(0, 80)],
    ['Viewport', `${window.innerWidth}×${window.innerHeight} dpr ${window.devicePixelRatio}`],
    ['Game keys', s ? Object.keys(s).length : '-'],
  ];
  return (
    <div style={{ padding: 8, fontFamily: 'monospace', fontSize: 12, color: '#cfd8dc' }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', padding: '4px 0' }}>
          <span style={{ color: '#80cbc4' }}>{k}</span>
          <span>{String(v)}</span>
        </div>
      ))}
    </div>
  );
};

const inputStyle = {
  background: '#000', border: '1px solid #333', color: '#cfd8dc',
  fontFamily: 'monospace', fontSize: 12, padding: '3px 6px', borderRadius: 3,
};
const btnStyle = {
  background: '#1e3a5f', border: '1px solid #2196f3', color: '#fff',
  fontFamily: 'monospace', fontSize: 11, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
};

export const DebugOverlay = () => {
  useActivationGesture();
  useBusVersion();
  usePerf(debugBus.state.enabled);
  const [tab, setTab] = useState('Console');

  if (!debugBus.state.enabled) return null;

  // Floating "D" — only when console is hidden. Bottom-right is fine then
  // because there's no run-button to overlap with.
  if (!debugBus.state.visible) {
    return (
      <div onClick={() => debugBus.toggle()}
        style={{
          position: 'fixed', bottom: 8, right: 8, zIndex: 100000,
          width: 36, height: 36, borderRadius: 18, background: '#d32f2f',
          color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.5)',
          userSelect: 'none', touchAction: 'manipulation',
        }}>
        D
      </div>
    );
  }

  // Console open — close button lives inside the tab row so it can't sit on
  // top of the run button at the bottom-right of the input area.
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      height: '40vh',
      background: 'rgba(10,10,12,.96)',
      borderTop: '2px solid #2196f3',
      /* Sit BELOW the welcome modal (z-index 9999) so the PLAY button is
         tappable during character creation.  Once the modal unmounts the
         panel reveals naturally (nothing covers it).  D button remains at
         100000 so it's always reachable to toggle the panel back. */
      zIndex: 5000,
      display: 'flex', flexDirection: 'column',
      color: '#cfd8dc',
    }}>
      <div style={{ display: 'flex', background: '#0a0a0a', borderBottom: '1px solid #333' }}>
        {PANELS.map(p => (
          <div key={p} onClick={() => setTab(p)}
            style={{
              padding: '8px 12px', cursor: 'pointer',
              background: tab === p ? '#1e3a5f' : 'transparent',
              color: tab === p ? '#fff' : '#90a4ae',
              fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
              borderRight: '1px solid #222',
            }}>{p}</div>
        ))}
        <div style={{ flex: 1 }} />
        <div onClick={() => debugBus.disable()}
          style={{ padding: '8px 10px', cursor: 'pointer', color: '#ef5350', fontFamily: 'monospace', fontSize: 11 }}>
          disable
        </div>
        <div onClick={() => debugBus.toggle()}
          style={{
            padding: '8px 14px', cursor: 'pointer', color: '#fff',
            background: '#d32f2f',
            fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
            userSelect: 'none', touchAction: 'manipulation',
          }}>
          ×
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === 'Console' && <ConsolePanel />}
        {tab === 'State'   && <StatePanel />}
        {tab === 'WS'      && <WSPanel />}
        {tab === 'Perf'    && <PerfPanel />}
      </div>
    </div>
  );
};
