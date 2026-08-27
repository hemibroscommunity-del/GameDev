/* ═══ v2.3.1982: "THE WORLD IS FULL" — the screen the 61st player gets ═══
 *
 * The worker has always refused the 61st socket (MAX_PLAYERS, index.js),
 * but the refusal was a bare 503 on a handshake that never upgraded, so
 * the client could not tell it apart from a dropped connection: it
 * retried every 10 seconds forever behind a loading screen that never
 * said a word.  The worker says why now (join.js `room_full`); this is
 * the half that shows it.
 *
 * PLAIN DOM, NOT REACT, and deliberately so — the same reasoning
 * wsClient.js records for showResumeBanner (v2.3.771/v2.3.1913): a
 * refusal arrives from an onclose handler that can fire at ANY phase,
 * including while the IntroVideo overlay is painted over the whole
 * viewport (z-index 100) and while the React tree is still mounting.  A
 * React screen would need the message to survive a phase it cannot see.
 * This attaches to document.body above everything and answers to nobody.
 *
 * It also must read as WAITING, not frozen: the ring turns on the
 * compositor (a transform animation keeps moving even when the main
 * thread is busy baking sprite sheets), the countdown ticks down every
 * second, and the attempt counter climbs.  A still screen with a nice
 * sentence on it is the thing we are replacing.
 *
 * Sized for iPhone Safari at 390x844 (the primary platform): one
 * centred column, 320px cap, nothing that needs a scroll.
 * Colours are Lantern Slate tokens (docs/LANTERN-SLATE-SPEC.md).      */

const ID = 'bt-room-full';
const STYLE_ID = 'bt-room-full-css';

/* Module state: the live handle, so show() can UPDATE the open screen
   (new count, new deadline) instead of rebuilding it every retry —
   rebuilding would restart the ring animation on every attempt, which is
   the "frozen" read we are trying to avoid. */
let el = null;
let timer = null;
let nextAt = 0;
let attempts = 0;

function ensureCss() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = [
    '@keyframes bt-rf-spin{to{transform:rotate(360deg)}}',
    '@keyframes bt-rf-in{from{opacity:0}to{opacity:1}}',
    '#' + ID + '{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;',
    'justify-content:center;padding:24px;box-sizing:border-box;',
    'background:radial-gradient(circle at 50% 30%,#253239 0%,#172126 55%,#10181D 100%);',
    "font-family:'Source Sans 3',system-ui,sans-serif;color:#B9C1BF;",
    'animation:bt-rf-in .25s ease-out both;-webkit-tap-highlight-color:transparent;}',
    '#' + ID + ' .bt-rf-card{width:100%;max-width:320px;text-align:center;}',
    '#' + ID + ' .bt-rf-ring{width:44px;height:44px;margin:0 auto 18px;border-radius:50%;',
    'border:3px solid rgba(216,168,95,.18);border-top-color:#D8A85F;',
    'animation:bt-rf-spin 1s linear infinite;}',
    '#' + ID + ' h2{margin:0 0 10px;font-size:21px;line-height:1.25;font-weight:700;color:#F7F2E7;}',
    '#' + ID + ' p{margin:0 0 16px;font-size:14px;line-height:1.5;color:#B9C1BF;}',
    '#' + ID + ' .bt-rf-count{display:inline-block;margin:0 0 18px;padding:6px 12px;border-radius:8px;',
    'background:#121B20;border:1px solid rgba(216,168,95,.22);font-size:12px;font-weight:700;',
    'letter-spacing:.12em;text-transform:uppercase;color:#D8A85F;}',
    '#' + ID + ' .bt-rf-next{font-size:13px;font-weight:600;color:#F7F2E7;margin:0 0 4px;}',
    '#' + ID + ' .bt-rf-tries{font-size:11px;color:#687575;margin:0 0 18px;}',
    '#' + ID + ' button{width:100%;padding:12px 16px;border:0;border-radius:10px;',
    "font-family:inherit;font-size:15px;font-weight:700;background:#D8A85F;color:#20170D;cursor:pointer;}",
    '#' + ID + ' button:active{background:#B88643;}',
    '@media (prefers-reduced-motion:reduce){#' + ID + ' .bt-rf-ring{animation-duration:3s}}',
  ].join('');
  document.head.appendChild(st);
}

/* One shared probe for headless runs (tools/qa/mp/mp-roomfull.mjs) and
   for the owner's own console — the same shape as __btPhase/__btIntro.
   A screen nobody can read from the outside is a screen no test can
   prove, which is how this whole failure survived a capacity campaign. */
function stamp(open, info) {
  try {
    window.__btRoomFull = {
      open,
      count: (info && info.count) || 0,
      cap: (info && info.cap) || 0,
      retryMs: (info && info.retryMs) || 0,
      attempts,
      nextAt,
      at: Date.now(),
    };
  } catch (e) { /* no window (SSR/tests) */ }
}

function paintCountdown() {
  if (!el) return;
  const left = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
  const next = el.querySelector('.bt-rf-next');
  if (next) {
    next.textContent = left > 0
      ? 'Looking for a spot again in ' + left + 's'
      : 'Looking for a spot…';
  }
  const tries = el.querySelector('.bt-rf-tries');
  if (tries) tries.textContent = attempts === 1 ? 'Checked once' : 'Checked ' + attempts + ' times';
}

/**
 * Show (or update) the full-world screen.
 * @param {object} info  {count, cap, retryMs} from the worker's room_full
 * @param {number} info.nextAt  epoch ms of the next automatic attempt
 * @param {function} info.onRetryNow  called when the player taps "Try now"
 */
export function showRoomFull(info) {
  const i = info || {};
  attempts = i.attempts || attempts + 1;
  nextAt = i.nextAt || (Date.now() + (i.retryMs || 5000));
  try {
    ensureCss();
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML =
        '<div class="bt-rf-card">'
        + '<div class="bt-rf-ring"></div>'
        + '<h2>Bro Town is full right now</h2>'
        + '<div class="bt-rf-count"></div>'
        + '<p>Every spot in the world is taken. Keep this open — you will drop '
        + 'straight in the moment someone leaves.</p>'
        + '<div class="bt-rf-next"></div>'
        + '<div class="bt-rf-tries"></div>'
        + '<button type="button">Try now</button>'
        + '</div>';
      document.body.appendChild(el);
    }
    /* Rebound on every call, not just on create: the screen is UPDATED in
       place across retries (rebuilding it would restart the ring and read
       as a frozen loop), so a handler bound once would hold the first
       attempt's closure forever. */
    if (i.onRetryNow) {
      el.querySelector('button').onclick = function () {
        /* An immediate attempt, and the countdown restarts from it — so a
           tap does something visible even when the world is still full. */
        try { i.onRetryNow(); } catch (e) {}
      };
    }
    const c = el.querySelector('.bt-rf-count');
    if (c) {
      /* "how many are in it if you can" — the worker sends both numbers,
         but an old/odd payload might not, so the line degrades to the
         plain fact rather than printing "0 / 0". */
      c.textContent = (i.count && i.cap)
        ? i.count + ' / ' + i.cap + ' bros inside'
        : 'World at capacity';
    }
    paintCountdown();
    if (timer) clearInterval(timer);
    timer = setInterval(paintCountdown, 1000);
  } catch (e) { /* DOM unavailable — the retry loop still runs */ }
  stamp(true, i);
}

/** Take it down (a slot opened, or the player got in some other way). */
export function hideRoomFull() {
  if (timer) { clearInterval(timer); timer = null; }
  try { if (el) el.remove(); } catch (e) {}
  el = null;
  const had = attempts;
  attempts = 0;
  nextAt = 0;
  if (had) stamp(false, null);
}

/** Is the screen currently up?  (wsClient asks before deciding whether a
 *  close is part of the waiting loop or an ordinary disconnect.) */
export function roomFullOpen() { return !!el; }
