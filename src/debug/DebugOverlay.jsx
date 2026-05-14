import React, { useEffect, useRef, useState } from 'react';
import { debugBus } from './debugBus.js';
import { perfTracker } from './perfTracker.js';
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

/** Mini frame-time chart.  Plots last N samples' totalMs as vertical
 *  bars, color-coded by severity, with reference lines at 16.7 ms (60
 *  fps) and 33.3 ms (30 fps).  Direct canvas draw — cheap. */
const FrameChart = ({ samples, width = 360, height = 70 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    cvs.width = width * dpr; cvs.height = height * dpr;
    cvs.style.width = width + 'px'; cvs.style.height = height + 'px';
    const ctx = cvs.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    /* Cap chart at 80 ms so single 200 ms freezes don't squash the
       60 fps band into one pixel. */
    const capMs = 80;
    const n = Math.min(samples.length, width);
    const slice = samples.slice(-n);
    const barW = Math.max(1, width / Math.max(n, 1));
    /* 60 / 30 fps reference lines */
    ctx.strokeStyle = '#1e4620'; ctx.lineWidth = 1;
    ctx.beginPath();
    const y60 = height - (16.7 / capMs) * height;
    ctx.moveTo(0, y60); ctx.lineTo(width, y60); ctx.stroke();
    ctx.strokeStyle = '#4a3920';
    ctx.beginPath();
    const y30 = height - (33.3 / capMs) * height;
    ctx.moveTo(0, y30); ctx.lineTo(width, y30); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const s = slice[i];
      const ms = Math.min(s.totalMs, capMs);
      const h = (ms / capMs) * height;
      let color = '#4caf50';
      if (s.totalMs > 100) color = '#ef5350';
      else if (s.totalMs > 33.3) color = '#ffb74d';
      else if (s.totalMs > 20)   color = '#ffd54f';
      ctx.fillStyle = color;
      ctx.fillRect(i * barW, height - h, Math.max(1, barW - 0.5), h);
    }
    /* Axis label */
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.fillText('80ms', 2, 10);
    ctx.fillText('30fps', 2, y30 - 1);
    ctx.fillText('60fps', 2, y60 - 1);
  }, [samples, width, height]);
  return <canvas ref={ref} style={{ display: 'block', border: '1px solid #222', background: '#0a0a0a' }} />;
};

const fmt1 = (x) => (typeof x === 'number' ? x.toFixed(1) : '-');
const fmt0 = (x) => (typeof x === 'number' ? Math.round(x) : '-');

const PerfPanel = () => {
  const [, setV] = useState(0);
  /* Local refresh timer — ~4 Hz is enough for a perf overview and
     avoids re-rendering on every emit() (which fires from console /
     WS hooks while the overlay is open). */
  useEffect(() => {
    const id = setInterval(() => setV(v => v + 1), 250);
    return () => clearInterval(id);
  }, []);

  const samples = perfTracker.getSamples();
  const longFrames = perfTracker.getLongFrames();
  const longTasks = perfTracker.getLongTasks();
  const extEvents = perfTracker.getExtEvents();
  const zoneStats = perfTracker.getZoneStats();
  const last60 = perfTracker.summary(60);
  const last600 = perfTracker.summary(600);
  const last = samples[samples.length - 1];
  const p = debugBus.state.perf;
  const s = debugBus.getState();
  const zoneMean = zoneStats.totalFrames ? (zoneStats.sumMs / zoneStats.totalFrames) : 0;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#80cbc4', fontSize: 11, fontWeight: 700, padding: '4px 0', borderBottom: '1px solid #1a3a3a' }}>
        {title}
      </div>
      {children}
    </div>
  );

  const Cell = ({ k, v, hot }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
      <span style={{ color: '#90a4ae' }}>{k}</span>
      <span style={{ color: hot ? '#ef5350' : '#cfd8dc' }}>{String(v)}</span>
    </div>
  );

  /* Long-frame attribution.  First decide: was the spike OUR work
     (workMs ≈ totalMs) or the browser BETWEEN our callbacks
     (workMs << totalMs)?  Only when it's our work do we drill into
     which sub-stage dominated. */
  const stageOf = (lf) => {
    const work = lf.workMs || 0;
    const outside = lf.totalMs - work;
    if (outside > work && outside > 16) {
      return 'outside ' + fmt1(outside);
    }
    const stages = [
      ['sim',    lf.simMs || 0],
      ['tile',   lf.tileMs || 0],
      ['entity', lf.entityMs || 0],
      ['fx',     lf.effectsMs || 0],
      ['fps',    lf.fpsMs || 0],
      ['app',    lf.appMs || 0],
    ];
    let best = stages[0];
    for (const s of stages) if (s[1] > best[1]) best = s;
    return best[0] + ' ' + fmt1(best[1]);
  };

  return (
    <div style={{ padding: 8, fontFamily: 'monospace', color: '#cfd8dc', overflowY: 'auto', height: '100%' }}>
      <Section title="LIVE">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Cell k="FPS (avg 1s)" v={p.fps} />
          <Cell k="Interval ms" v={fmt1(last && last.totalMs)} hot={last && last.totalMs > 33} />
          <Cell k="Work ms (ours)" v={fmt1(last && last.workMs)} hot={last && last.workMs > 16} />
          <Cell k="Outside ms (browser)" v={fmt1(last && (last.totalMs - (last.workMs || 0)))} hot={last && (last.totalMs - (last.workMs || 0)) > 30} />
          <Cell k="Sim ms" v={fmt1(last && last.simMs)} />
          <Cell k="Render ms" v={fmt1(last && last.renderMs)} />
          <Cell k="Renderer" v={p.renderer} />
          <Cell k="WS state" v={p.wsState} />
        </div>
      </Section>

      <Section title="FRAME-TIME (last ~10s, cap 80ms)">
        <FrameChart samples={samples} />
      </Section>

      <Section title="DISTRIBUTION">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Cell k="last 60 p50" v={fmt1(last60.p50) + ' ms'} />
          <Cell k="last 600 p50" v={fmt1(last600.p50) + ' ms'} />
          <Cell k="last 60 p95" v={fmt1(last60.p95) + ' ms'} hot={last60.p95 > 33} />
          <Cell k="last 600 p95" v={fmt1(last600.p95) + ' ms'} hot={last600.p95 > 33} />
          <Cell k="last 60 p99" v={fmt1(last60.p99) + ' ms'} hot={last60.p99 > 50} />
          <Cell k="last 600 p99" v={fmt1(last600.p99) + ' ms'} hot={last600.p99 > 50} />
          <Cell k="last 60 max" v={fmt1(last60.max) + ' ms'} hot={last60.max > 50} />
          <Cell k="last 600 max" v={fmt1(last600.max) + ' ms'} hot={last600.max > 50} />
        </div>
      </Section>

      <Section title={'ZONE — ' + zoneStats.zone + ' (since entry)'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Cell k="frames" v={zoneStats.totalFrames} />
          <Cell k="mean ms" v={fmt1(zoneMean)} />
          <Cell k="slow >30ms" v={zoneStats.slowFrames} hot={zoneStats.slowFrames > 5} />
          <Cell k="freeze >100ms" v={zoneStats.freezeFrames} hot={zoneStats.freezeFrames > 0} />
          <Cell k="max ms" v={fmt1(zoneStats.maxMs)} hot={zoneStats.maxMs > 100} />
          <Cell k="age (s)" v={fmt0((performance.now() - zoneStats.startT) / 1000)} />
        </div>
      </Section>

      <Section title={'LONG FRAMES >30ms (' + longFrames.length + ', last 60)'}>
        <div style={{ fontSize: 10, maxHeight: 120, overflowY: 'auto' }}>
          {longFrames.length === 0 && <div style={{ color: '#888' }}>none captured yet</div>}
          {longFrames.slice().reverse().map((lf, i) => (
            <div key={i} style={{ borderBottom: '1px solid #1a1a1a', padding: '2px 0', display: 'grid', gridTemplateColumns: '60px 50px 70px 1fr', gap: 4 }}>
              <span style={{ color: lf.totalMs > 100 ? '#ef5350' : '#ffb74d' }}>{fmt1(lf.totalMs)}ms</span>
              <span style={{ color: '#90a4ae' }}>{lf.zone}</span>
              <span style={{ color: '#aed581' }}>{stageOf(lf)}</span>
              <span style={{ color: '#888' }}>
                m{lf.monsters} p{lf.projectiles} hp{lf.hitParticles} dn{lf.dmgNumbers}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={'EXTERNAL EVENTS >5ms (' + extEvents.length + ', non-RAF, e.g. ws handler)'}>
        <div style={{ fontSize: 10, maxHeight: 90, overflowY: 'auto' }}>
          {extEvents.length === 0 && <div style={{ color: '#888' }}>none captured yet</div>}
          {extEvents.slice().reverse().slice(0, 20).map((ev, i) => (
            <div key={i} style={{ borderBottom: '1px solid #1a1a1a', padding: '2px 0', display: 'grid', gridTemplateColumns: '60px 1fr', gap: 4 }}>
              <span style={{ color: ev.ms > 30 ? '#ef5350' : '#ffb74d' }}>{fmt1(ev.ms)}ms</span>
              <span style={{ color: '#aed581' }}>{ev.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={'BROWSER LONG TASKS >50ms (' + longTasks.length + (perfTracker.hasLongTaskObserver() ? '' : ', unsupported on this browser') + ')'}>
        <div style={{ fontSize: 10, maxHeight: 90, overflowY: 'auto' }}>
          {longTasks.length === 0 && perfTracker.hasLongTaskObserver() && <div style={{ color: '#888' }}>none captured yet</div>}
          {longTasks.slice().reverse().slice(0, 30).map((lt, i) => (
            <div key={i} style={{ borderBottom: '1px solid #1a1a1a', padding: '2px 0', display: 'grid', gridTemplateColumns: '60px 1fr', gap: 4 }}>
              <span style={{ color: lt.durationMs > 100 ? '#ef5350' : '#ffb74d' }}>{fmt1(lt.durationMs)}ms</span>
              <span style={{ color: '#90a4ae' }}>{lt.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="ENTITY COUNTS (now)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Cell k="monsters" v={last ? last.monsters : 0} />
          <Cell k="others" v={last ? last.others : 0} />
          <Cell k="projectiles" v={last ? last.projectiles : 0} />
          <Cell k="slime proj" v={last ? last.slimeProj : 0} />
          <Cell k="hit particles" v={last ? last.hitParticles : 0} hot={last && last.hitParticles > 200} />
          <Cell k="dmg numbers" v={last ? last.dmgNumbers : 0} hot={last && last.dmgNumbers > 30} />
          <Cell k="ground loot" v={last ? last.groundLoot : 0} />
          <Cell k="ground splatter" v={last ? last.groundSplatter : 0} hot={last && last.groundSplatter > 100} />
          <Cell k="campfires" v={last ? last.campfires : 0} />
        </div>
      </Section>

      <Section title="ENVIRONMENT">
        <Cell k="Build" v={`v${BUILD_INFO.version} · ${BUILD_INFO.sha}`} />
        <Cell k="Viewport" v={`${window.innerWidth}x${window.innerHeight} dpr ${window.devicePixelRatio}`} />
        <Cell k="UA" v={navigator.userAgent.slice(0, 60)} />
        <Cell k="Game keys" v={s ? Object.keys(s).length : '-'} />
      </Section>

      <div style={{ display: 'flex', gap: 6, paddingTop: 6 }}>
        <button style={btnStyle} onClick={() => perfTracker.reset()}>reset buffers</button>
        <button style={btnStyle} onClick={() => {
          /* Dump full perf state to console so user can copy it */
          /* eslint-disable no-console */
          console.warn('[perfdump]', {
            zone: perfTracker.getZoneStats(),
            last60: perfTracker.summary(60),
            last600: perfTracker.summary(600),
            longFrames: perfTracker.getLongFrames(),
            longTasks: perfTracker.getLongTasks(),
          });
          /* eslint-enable no-console */
          debugBus.pushLog('info', ['[perfdump] written to console + this log']);
        }}>dump to console</button>
      </div>
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
      /* TOP 25vh strip with very high z-index so it's visible above
         everything (welcome modal at 9999, intro video at 100, canvas).
         Welcome modal box is vertically centred (~50vh), so PLAY at
         ~60-65vh is comfortably below this strip and stays tappable.
         BottomDashboard at 28vh from the bottom is also untouched. */
      position: 'fixed', left: 0, right: 0, top: 0,
      height: '25vh',
      background: 'rgba(10,10,12,.96)',
      borderBottom: '2px solid #2196f3',
      zIndex: 99999,
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
