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

export function recordCrash(kind, msg) {
  try {
    const log = read();
    log.push({ t: new Date().toISOString(), kind, msg: String(msg).slice(0, 500) });
    while (log.length > 8) log.shift();
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch (e) { /* storage unavailable */ }
  try { console.error('[bt-crash]', kind, msg); } catch (e) { /* ignore */ }
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
    if (/[?&]dev=1\b/.test(window.location.search)) {
      const last = prior[prior.length - 1];
      banner(`LAST CRASH ${last.t}\n[${last.kind}] ${last.msg}\n(bt-crashlog has ${prior.length} entries)`);
    }
  }
}

/** Hook the game canvas for WebGL context loss (called from pixiApp). */
export function watchContextLoss(canvas) {
  if (!canvas || !canvas.addEventListener) return;
  canvas.addEventListener('webglcontextlost', (e) => {
    recordCrash('CONTEXT_LOST', 'WebGL context lost (GPU memory pressure / driver reset)');
    if (/[?&]dev=1\b/.test(window.location.search)) banner('WEBGL CONTEXT LOST — the black-screen bug just happened. Screenshot this.');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    recordCrash('CONTEXT_RESTORED', 'WebGL context restored');
  });
}
