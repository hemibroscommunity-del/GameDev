/* Vanilla-JS diagnostic banner — bypasses React entirely.
   Mounts a fixed-position div directly to document.body at z-index
   2147483647 (32-bit max).  It is a sibling of every React-rendered
   element and outside any React stacking context, so nothing in the
   game tree can cover it.  Self-installs on import; only activates
   when the URL contains `?debug=1`.

   Captures the last N lines from console.log/warn/error/info and
   shows them in a scrollable monospace strip at the top of the
   screen.  Lines tagged [pixi-…] or [bt-…] are highlighted.

   This is intentionally crude — the React DebugOverlay is the nicer
   tool, but it's been disappearing on the user after PLAY for
   reasons I can't reproduce.  The vanilla banner is a "last resort"
   diagnostic surface that works even if React, the canvas, the
   stacking-context tree, or the viewport sizing are all broken. */

const MAX_LINES = 60;
const BANNER_ID = 'bt-diag-banner';

let active = false;
let banner = null;
let body = null;
const lines = [];

const shouldActivate = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('debug') === '1';
  } catch {
    return false;
  }
};

const ensureMounted = () => {
  if (banner) return;
  banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'height:22vh',
    'background:#1a0000',
    'color:#ff6b6b',
    'font:11px/1.35 ui-monospace,Menlo,Consolas,monospace',
    'padding:4px 8px',
    'box-sizing:border-box',
    'overflow:hidden',
    'z-index:2147483647',
    'border-bottom:3px solid #ff0000',
    'pointer-events:auto',
    'user-select:text',
    '-webkit-user-select:text',
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';');

  const header = document.createElement('div');
  header.style.cssText = 'color:#ffaaaa;font-weight:700;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;flex-shrink:0';
  const headerLabel = document.createElement('span');
  headerLabel.textContent = '[bt-diag] live console';
  const headerCollapse = document.createElement('span');
  headerCollapse.textContent = '[hide ▲]';
  headerCollapse.style.cssText = 'color:#ffd700;font-size:10px';
  header.appendChild(headerLabel);
  header.appendChild(headerCollapse);
  let collapsed = false;
  header.onclick = () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : 'block';
    banner.style.height = collapsed ? 'auto' : '22vh';
    headerCollapse.textContent = collapsed ? '[show ▼]' : '[hide ▲]';
  };
  banner.appendChild(header);

  body = document.createElement('div');
  body.style.cssText = 'overflow-y:auto;overflow-x:hidden;height:calc(100% - 22px);-webkit-overflow-scrolling:touch';
  banner.appendChild(body);

  document.body.appendChild(banner);
};

const renderLine = (line) => {
  const el = document.createElement('div');
  let color = '#cccccc';
  if (line.level === 'error') color = '#ff5e6c';
  else if (line.level === 'warn') color = '#ffb74d';
  else if (line.level === 'info') color = '#81d4fa';
  if (line.text.indexOf('[pixi-') === 0 || line.text.indexOf('[bt-perf]') === 0) color = '#3dd497';
  el.style.color = color;
  el.style.marginBottom = '2px';
  const ts = new Date(line.t).toTimeString().slice(0, 8);
  el.textContent = `${ts} ${line.text}`;
  return el;
};

const refresh = () => {
  if (!body) return;
  body.innerHTML = '';
  for (const line of lines) body.appendChild(renderLine(line));
  body.scrollTop = body.scrollHeight;
};

const PERSIST_KEY = 'bt-diag-lines';
const PERSIST_MAX = 80;

/* On install, restore any persisted lines from localStorage and prepend
   a "post-crash recovery" marker.  This is what makes the banner useful
   when the tab fully crashed — the next page load surfaces the last 80
   lines that were captured before the crash. */
const restorePersisted = () => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const prev = JSON.parse(raw);
    if (!Array.isArray(prev)) return;
    lines.push({ t: Date.now(), level: 'warn', text: '────── PRIOR SESSION (' + prev.length + ' lines) ──────' });
    for (const ln of prev) lines.push(ln);
    lines.push({ t: Date.now(), level: 'warn', text: '────── END PRIOR SESSION ──────' });
  } catch {}
};

let persistThrottle = 0;
const persist = () => {
  /* Throttle to ~5 writes per second.  localStorage.setItem is sync and
     can stall the main thread if called from every console.log. */
  const now = Date.now();
  if (now - persistThrottle < 200) return;
  persistThrottle = now;
  try {
    const tail = lines.slice(-PERSIST_MAX);
    localStorage.setItem(PERSIST_KEY, JSON.stringify(tail));
  } catch {}
};

const push = (level, args) => {
  const text = args.map(a => {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');
  lines.push({ t: Date.now(), level, text });
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
  /* Errors are persisted IMMEDIATELY without throttle so the last gasp
     before a crash always lands in localStorage. */
  if (level === 'error') {
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify(lines.slice(-PERSIST_MAX))); } catch {}
  } else {
    persist();
  }
  if (active) {
    ensureMounted();
    refresh();
  }
};

const hookConsole = () => {
  for (const lvl of ['log', 'warn', 'error', 'info']) {
    const orig = console[lvl].bind(console);
    console[lvl] = (...args) => {
      push(lvl, args);
      orig(...args);
    };
  }
  window.addEventListener('error', (e) => push('error', [e.message, e.filename + ':' + e.lineno, e.error && e.error.stack]));
  window.addEventListener('unhandledrejection', (e) => push('error', ['unhandledrejection:', e.reason && (e.reason.stack || e.reason.message || e.reason)]));
};

export const installDiagBanner = () => {
  if (active) return;
  active = shouldActivate();
  hookConsole();
  if (!active) return;
  restorePersisted();
  push('info', ['[bt-diag] banner installed; ?debug=1 detected']);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { ensureMounted(); refresh(); });
  } else {
    ensureMounted();
    refresh();
  }
};
