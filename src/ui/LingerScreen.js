/* ═══ v2.3.3258: "YOUR BRO IS STILL IN THAT FIGHT" ═══
 *
 * The worker keeps the body of a player who left in the middle of a fight
 * with another player in the world for a few seconds, still hittable
 * (server/src/linger.js), so closing the game is no escape from a fight in
 * No man's land.  Coming back from where the body stands takes it back at
 * once; coming back any other way (a fresh launch starts in town) is refused
 * until it has gone -- `linger_wait {ms}`, close 4010 -- and this is the
 * screen that says so, counting down to the reconnect wsClient.js has queued.
 *
 * Plain DOM over everything, for RoomFullScreen.js's reasons: the refusal
 * arrives from an onclose that can fire in any phase, the loading screen
 * included.  Lantern Slate colours (docs/LANTERN-SLATE-SPEC.md), one column,
 * sized for an iPhone at 390 x 844 and for sideways. */

const ID = 'bt-linger-wait';
const STYLE_ID = 'bt-linger-wait-css';

let el = null;
let timer = null;
let nextAt = 0;

function ensureCss() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = [
    '@keyframes bt-lg-spin{to{transform:rotate(360deg)}}',
    '@keyframes bt-lg-in{from{opacity:0}to{opacity:1}}',
    '#' + ID + '{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;',
    'justify-content:center;padding:24px;box-sizing:border-box;',
    'background:radial-gradient(circle at 50% 30%,#2B2426 0%,#1A1A1E 55%,#10181D 100%);',
    "font-family:'Source Sans 3',system-ui,sans-serif;color:#B9C1BF;",
    'animation:bt-lg-in .25s ease-out both;-webkit-tap-highlight-color:transparent;}',
    '#' + ID + ' .bt-lg-card{width:100%;max-width:320px;text-align:center;}',
    '#' + ID + ' .bt-lg-ring{width:44px;height:44px;margin:0 auto 18px;border-radius:50%;',
    'border:3px solid rgba(214,92,76,.2);border-top-color:#D65C4C;',
    'animation:bt-lg-spin 1s linear infinite;}',
    '#' + ID + ' h2{margin:0 0 10px;font-size:21px;line-height:1.25;font-weight:700;color:#F7F2E7;}',
    '#' + ID + ' p{margin:0 0 16px;font-size:14px;line-height:1.5;color:#B9C1BF;}',
    '#' + ID + ' .bt-lg-next{display:inline-block;padding:6px 12px;border-radius:8px;background:#121B20;',
    'border:1px solid rgba(216,168,95,.22);font-size:13px;font-weight:700;color:#D8A85F;',
    'font-variant-numeric:tabular-nums;}',
    '@media (prefers-reduced-motion:reduce){#' + ID + ' .bt-lg-ring{animation-duration:3s}}',
  ].join('');
  document.head.appendChild(st);
}

/* for headless runs and the console (house style: __btRoomFull) */
function stamp(open) {
  try { window.__btLingerWait = { open, nextAt, at: Date.now() }; } catch (e) { /* no window */ }
}

function paint() {
  if (!el) return;
  const left = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
  const n = el.querySelector('.bt-lg-next');
  if (n) n.textContent = left > 0 ? 'Back in ' + left + 's' : 'Coming back…';
}

/** Show (or update) the screen: `info.nextAt` is when the reconnect goes. */
export function showLingerWait(info) {
  nextAt = (info && info.nextAt) || (Date.now() + 5000);
  try {
    ensureCss();
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML =
        '<div class="bt-lg-card">'
        + '<div class="bt-lg-ring"></div>'
        + '<h2>Your bro is still in that fight</h2>'
        + '<p>You left in the middle of a fight with another player, so your bro '
        + 'stays where you left them for a few seconds &mdash; leaving is never a '
        + 'way out of a fight.</p>'
        + '<div class="bt-lg-next"></div>'
        + '</div>';
      document.body.appendChild(el);
    }
    paint();
    if (timer) clearInterval(timer);
    timer = setInterval(paint, 250);
  } catch (e) { /* no DOM: the reconnect still runs */ }
  stamp(true);
}

/** Take it down (the join was let in). */
export function hideLingerWait() {
  if (timer) { clearInterval(timer); timer = null; }
  const was = !!el;
  try { if (el) el.remove(); } catch (e) { /* gone */ }
  el = null;
  if (was) stamp(false);
}

export function lingerWaitOpen() { return !!el; }
