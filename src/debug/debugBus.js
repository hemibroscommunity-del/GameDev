// Debug bus: log capture, command registry, WS sniffer, state pointer.
// All mobile devtools-replacement plumbing lives here so the rest of the
// codebase can stay untouched. Wire new debug commands with debugBus.cmd(...).

const MAX_LOGS = 500;
const MAX_WS_FRAMES = 200;

const listeners = new Set();
const logs = [];
const wsFrames = [];
const commands = new Map();
let commandHistory = [];

const state = {
  enabled: false,
  visible: false,
  perf: { fps: 0, frameMs: 0, ticks: 0, renderer: '?', wsState: 'closed' },
};

const emit = () => { for (const fn of listeners) fn(); };

const pushLog = (level, args) => {
  const text = args.map(a => {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object') {
      try { return JSON.stringify(a, null, 2); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');
  logs.push({ t: Date.now(), level, text });
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
  emit();
};

const pushWS = (dir, data) => {
  let summary = '';
  let parsed = null;
  try {
    parsed = typeof data === 'string' ? JSON.parse(data) : data;
    summary = parsed?.type || (typeof data === 'string' ? data.slice(0, 60) : '[binary]');
  } catch {
    summary = typeof data === 'string' ? data.slice(0, 60) : '[binary]';
  }
  wsFrames.push({ t: Date.now(), dir, summary, raw: parsed ?? data });
  if (wsFrames.length > MAX_WS_FRAMES) wsFrames.splice(0, wsFrames.length - MAX_WS_FRAMES);
  emit();
};

let consoleHooked = false;
const hookConsole = () => {
  if (consoleHooked) return;
  consoleHooked = true;
  for (const lvl of ['log', 'warn', 'error', 'info']) {
    const orig = console[lvl].bind(console);
    /* Gate capture on visible — when the debug overlay is closed
       (state.visible === false), skip the JSON.stringify + array
       push + emit() that pushLog does on every console call.  This
       cut ~30 console.warn-induced React re-renders per second on
       mobile during sustained gameplay.  Errors still go through
       always so post-mortem logs aren't lost. */
    console[lvl] = (...args) => {
      if (state.visible || lvl === 'error') pushLog(lvl, args);
      orig(...args);
    };
  }
  window.addEventListener('error', (e) => pushLog('error', [e.message, e.filename + ':' + e.lineno]));
  window.addEventListener('unhandledrejection', (e) => pushLog('error', ['unhandledrejection:', e.reason]));
};

let wsHooked = false;
const hookWebSocket = () => {
  if (wsHooked) return;
  wsHooked = true;
  const Native = window.WebSocket;
  const Wrapped = function (url, protocols) {
    const ws = protocols ? new Native(url, protocols) : new Native(url);
    state.perf.wsState = 'connecting';
    ws.addEventListener('open',  () => { state.perf.wsState = 'open';   emit(); });
    ws.addEventListener('close', () => { state.perf.wsState = 'closed'; emit(); });
    ws.addEventListener('error', () => { state.perf.wsState = 'error';  emit(); });
    /* Gate WS capture on visible — when the debug overlay is closed,
       skip JSON.parse + storing parsed object in wsFrames + emit().
       This was the smoking gun: 30 Hz server ticks * JSON.parse +
       React re-render through emit() = ~1 s cadence GC pauses that
       read as "world sticks for a moment every second" on mobile. */
    ws.addEventListener('message', (evt) => {
      if (state.visible) pushWS('in', evt.data);
    });
    const origSend = ws.send.bind(ws);
    ws.send = (data) => {
      if (state.visible) pushWS('out', data);
      return origSend(data);
    };
    return ws;
  };
  Wrapped.prototype = Native.prototype;
  Wrapped.CONNECTING = Native.CONNECTING;
  Wrapped.OPEN = Native.OPEN;
  Wrapped.CLOSING = Native.CLOSING;
  Wrapped.CLOSED = Native.CLOSED;
  window.WebSocket = Wrapped;
};

const enable = () => {
  if (state.enabled) return;
  state.enabled = true;
  hookConsole();
  hookWebSocket();
  try { localStorage.setItem('brotown_debug', '1'); } catch {}
  pushLog('info', ['[debug] enabled']);
  emit();
};

const disable = () => {
  state.enabled = false;
  state.visible = false;
  try { localStorage.removeItem('brotown_debug'); } catch {}
  emit();
};

const toggle = () => { state.visible = !state.visible; emit(); };

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

const cmd = (name, fn, help = '') => {
  commands.set(name, { fn, help });
};

const runCmd = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  commandHistory.push(trimmed);
  if (commandHistory.length > 50) commandHistory.shift();
  const [name, ...args] = trimmed.split(/\s+/);
  if (name === 'help') {
    pushLog('info', ['Commands: ' + [...commands.keys()].sort().join(', ')]);
    return;
  }
  if (name === 'clear') { logs.length = 0; emit(); return; }
  const c = commands.get(name);
  if (!c) {
    pushLog('warn', [`unknown command: ${name} (try 'help')`]);
    return;
  }
  try {
    const result = c.fn(args, getState());
    if (result !== undefined) pushLog('info', [result]);
  } catch (err) {
    pushLog('error', [`cmd ${name} failed:`, err]);
  }
};

const getState = () => (window._gameState && window._gameState.current) || null;

cmd('state', (args) => {
  const s = getState(); if (!s) return '(no state)';
  if (!args.length) return Object.keys(s).sort().join(', ');
  let cur = s;
  for (const k of args[0].split('.')) {
    if (cur == null) return '(undefined)';
    cur = cur[k];
  }
  return cur;
}, 'state [path]  — inspect stateRef.current at dotted path');

cmd('set', (args) => {
  const s = getState(); if (!s) return '(no state)';
  if (args.length < 2) return 'usage: set <path> <json>';
  const path = args[0].split('.');
  const value = JSON.parse(args.slice(1).join(' '));
  let cur = s;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
  return `set ${args[0]} = ${JSON.stringify(value)}`;
}, 'set <path> <json>  — mutate stateRef value');

cmd('reload', () => { location.reload(); }, 'reload  — reload the page');

const initFromUrl = () => {
  /* Debug overlay always enabled — user has no desktop access for live tuning,
     so the floating D/× button needs to be visible on every page load. URL
     `?nodebug=1` opts out (or call debugBus.disable() then reload).
     URL `?debug=1` auto-opens the console panel so the user doesn't have to
     find the floating button — useful when the game canvas is broken and
     they need diagnostics immediately. */
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('nodebug') === '1') {
      try { localStorage.removeItem('brotown_debug'); } catch {}
      return;
    }
    enable();
    if (params.get('debug') === '1') {
      state.visible = true;
      emit();
    }
    return;
  } catch {}
  enable();
};

export const debugBus = {
  state, logs, wsFrames, commands, commandHistory,
  enable, disable, toggle, subscribe,
  cmd, runCmd, getState, pushLog,
  initFromUrl,
};

if (typeof window !== 'undefined') {
  window.debug = debugBus;
}
