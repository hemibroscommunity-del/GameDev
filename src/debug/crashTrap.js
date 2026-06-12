/* Crash trap — v2.3.763.
 *
 * The owner reported in-game instability on iPhone: the world canvas turning
 * black mid-fight (classic WebGL context loss) and being thrown back to the
 * login page (classic iOS memory-pressure tab reload).  Neither leaves a
 * trace a non-technical tester can report, so this captures the evidence:
 *
 * - window 'error' + 'unhandledrejection' -> ring buffer in localStorage
 *   ('bt-crashlog', last 8 entries, survives the reload that follows an iOS
 *   tab eviction).
 * - 'webglcontextlost' on the game canvas (installed by pixiApp) -> same
 *   buffer, tagged CONTEXT_LOST -- the smoking gun for the black-canvas
 *   symptom if that's what it is.
 * - A page load right after a crash logs the previous entries to the console
 *   and, with ?dev=1, shows a dismissible red banner with the last entry so
 *   the owner can screenshot it.
 */

const KEY = 'bt-crashlog';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}

/* ═══ v2.3.782: field telemetry ═══
   Screenshot-driven debugging died here: every serious entry also uploads
   the whole ring buffer to the server's Feedback DO (POST
   /api/feedback/crash; read back via GET /api/feedback/crashes).  Sent as
   text/plain so sendBeacon needs no CORS preflight; payload fields are
   clamped server-side.  Debounced (30s, expedited to 1.5s for fatal
   kinds) + per-session rate-limited server-side, so a strike storm can't
   flood storage.  Telemetry must NEVER throw into the game. */
const _SID = Math.random().toString(36).slice(2, 10);
const _IMMEDIATE = new Set(['error', 'rejection', 'CONTEXT_LOST', 'pixi-init-failed', 'auto-reload', 'prior']);
let _flushTimer = null;
let _flushAt = 0;
let _lastSentLen = -1;
function _apiBase() {
  try {
    return (window.BROTOWN_WS_URL || 'wss://brotown-server.hemibroscommunity.workers.dev')
      .replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  } catch (e) { return ''; }
}
function _doFlush() {
  _flushTimer = null;
  try {
    const log = read();
    if (!log.length || log.length === _lastSentLen) return;
    _lastSentLen = log.length;
    const payload = JSON.stringify({
      sid: _SID,
      v: typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev',
      ua: (navigator && navigator.userAgent) || '',
      zone: (window._gameState && window._gameState.current && window._gameState.current.currentZone) || '',
      log: log.slice(-16),
    });
    const url = _apiBase() + '/api/feedback/crash';
    let sent = false;
    try {
      if (navigator.sendBeacon) sent = navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain' }));
    } catch (e) { sent = false; }
    if (!sent) fetch(url, { method: 'POST', body: payload, keepalive: true }).catch(() => {});
  } catch (e) { /* telemetry is best-effort */ }
}
function _scheduleFlush(kind) {
  try {
    const delay = _IMMEDIATE.has(kind) ? 1500 : 30000;
    const due = Date.now() + delay;
    if (_flushTimer && due < _flushAt) { clearTimeout(_flushTimer); _flushTimer = null; }
    if (!_flushTimer) { _flushAt = due; _flushTimer = setTimeout(_doFlush, delay); }
  } catch (e) { /* ignore */ }
}

export function recordCrash(kind, msg) {
  try {
    const log = read();
    log.push({ t: new Date().toISOString(), kind, msg: String(msg).slice(0, 500) });
    /* v2.3.773: 8 was too small -- routine [resume] entries (one per window
       switch in the two-window repro) pushed the actual evidence out. */
    while (log.length > 16) log.shift();
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch (e) { /* storage unavailable */ }
  try { console.error('[bt-crash]', kind, msg); } catch (e) { /* ignore */ }
  /* v2.3.782: upload (debounced).  'resume' alone is routine tab-switch
     noise and doesn't trigger a send -- it still rides along in the ring
     buffer whenever a real event flushes. */
  if (kind !== 'resume') _scheduleFlush(kind);
}

function banner(text) {
  try {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;'
      + 'background:#7a1020;color:#fff;font:11px/1.4 monospace;padding:6px 28px 6px 8px;'
      + 'white-space:pre-wrap;word-break:break-all;';
    el.textContent = text;
    const x = document.createElement('span');
    x.textContent = '✕';
    x.style.cssText = 'position:absolute;top:4px;right:8px;cursor:pointer;font-size:14px;';
    x.onclick = () => el.remove();
    el.appendChild(x);
    document.body.appendChild(el);
  } catch (e) { /* ignore */ }
}

export function installCrashTrap() {
  window.addEventListener('error', (e) => {
    recordCrash('error', (e.message || 'unknown') + (e.filename ? ` @ ${e.filename}:${e.lineno}` : ''));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    recordCrash('rejection', (r && (r.stack || r.message)) || String(r));
  });
  /* Surface the PREVIOUS session's crashes (an iOS tab reload lands here). */
  const prior = read();
  if (prior.length) {
    try { console.warn('[bt-crash] prior session log:', prior); } catch (e) { /* ignore */ }
    /* v2.3.782: a page that iOS evicted could never report anything --
       but its ring buffer survived in localStorage.  Upload it on the
       NEXT boot so even eviction deaths leave server-side evidence. */
    _scheduleFlush('prior');
    if (/[?&]dev=1\b/.test(window.location.search)) {
      /* v2.3.773: show the TAIL of the log, not just the last entry --
         the last entry was always a routine [resume] and hid the story.
         v2.3.776: header carries the build version so a screenshot also
         answers "which deploy was this?". */
      const ver = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
      const tail = prior.slice(-6).map((e) => `${e.t.slice(11, 19)} [${e.kind}] ${e.msg.slice(0, 110)}`).join('\n');
      banner(`CRASH LOG v${ver} (last ${Math.min(6, prior.length)} of ${prior.length})\n${tail}`);
    }
  }
}

/** Hook the game canvas for WebGL context loss (called from pixiApp). */
export function watchContextLoss(canvas) {
  if (!canvas || !canvas.addEventListener) return;
  canvas.addEventListener('webglcontextlost', (e) => {
    /* v2.3.773: ignore teardown-induced losses.  Pixi's own destroy()
       calls loseContext() on the OLD canvas during an epoch rebuild --
       by then React has already detached it.  Without this guard that
       synthetic loss re-arms __btGlLostAt and every later tab switch
       triggers a spurious full rebuild. */
    if (!canvas.isConnected) return;
    /* v2.3.771: preventDefault tells the browser we want the context BACK --
       without it 'webglcontextrestored' never fires and the canvas stays
       black forever (the iPhone background-tab symptom). */
    try { e.preventDefault(); } catch (err) { /* ignore */ }
    recordCrash('CONTEXT_LOST', 'WebGL context lost (GPU memory pressure / tab suspend)');
    /* v2.3.772: escalation.  preventDefault only ASKS the browser to
       restore the context; iOS Safari often never does.  When the loss
       happened in a background tab this timer is frozen with the page and
       fires on resume -- exactly when the rebuild can actually work.
       v2.3.773: escalate UNCONDITIONALLY, restored or not.  A restored
       context passes isContextLost() but every baked body/armor frame
       lives in GPU-only render textures whose contents did NOT survive --
       the world stays black anyway (the two-iPhone-windows repro: both
       sessions black, log showing nothing but a clean [resume]). */
    window.__btGlLostAt = Date.now();
    setTimeout(() => {
      try {
        if (window._rebuildRenderer) window._rebuildRenderer('contextlost: rebuilding (restore is not survivable)');
      } catch (err) { /* ignore */ }
    }, 2500);
    if (/[?&]dev=1\b/.test(window.location.search)) banner('WEBGL CONTEXT LOST — the black-screen bug just happened. Screenshot this.');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    recordCrash('CONTEXT_RESTORED', 'WebGL context restored');
  });
}
