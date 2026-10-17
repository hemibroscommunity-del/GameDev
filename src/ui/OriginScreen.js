/* ═══ v2.3.3312: "THIS ISN'T THE OFFICIAL BROTOWN" — the screen a copy gets ═══
 *
 * The worker lets only the game's own sites open a socket (brotown.net, its
 * Pages previews and a machine's own pages: server/src/origin.js).  A page on
 * any other address is a copy of the game -- renamed, re-skinned, passed off
 * as somebody else's -- and the worker answers it with join_rejected
 * {reason: 'origin', home} and close 4015.  This is the half that shows it,
 * so a copy that kept our code sends its players to the real game.
 *
 * PLAIN DOM, NOT REACT, for the reason RoomFullScreen.js gives: the refusal
 * arrives from an onclose handler that can fire while the IntroVideo overlay
 * covers the viewport and while the React tree is still mounting.  Nothing
 * here retries: every try would be refused the same.
 *
 * The small print names this page's own address, so the owner, putting the
 * game on a new domain before adding it to ORIGINS (wrangler.toml), can see
 * at once what the server was shown.  Sized for iPhone Safari at 390x844;
 * Lantern Slate colours (docs/LANTERN-SLATE-SPEC.md).                    */

const ID = 'bt-origin';
const STYLE_ID = 'bt-origin-css';
const HOME = 'https://brotown.net';

let el = null;

function ensureCss() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = [
    '@keyframes bt-og-in{from{opacity:0}to{opacity:1}}',
    '#' + ID + '{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;',
    'justify-content:center;padding:24px;box-sizing:border-box;',
    'background:radial-gradient(circle at 50% 30%,#253239 0%,#172126 55%,#10181D 100%);',
    "font-family:'Source Sans 3',system-ui,sans-serif;color:#B9C1BF;",
    'animation:bt-og-in .25s ease-out both;-webkit-tap-highlight-color:transparent;}',
    '#' + ID + ' .bt-og-card{width:100%;max-width:320px;text-align:center;}',
    '#' + ID + ' h2{margin:0 0 10px;font-size:21px;line-height:1.25;font-weight:700;color:#F7F2E7;}',
    '#' + ID + ' p{margin:0 0 18px;font-size:14px;line-height:1.5;color:#B9C1BF;}',
    '#' + ID + ' a.bt-og-go{display:block;box-sizing:border-box;width:100%;padding:12px 16px;border-radius:10px;',
    'font-size:15px;font-weight:700;text-decoration:none;background:#D8A85F;color:#20170D;}',
    '#' + ID + ' a.bt-og-go:active{background:#B88643;}',
    '#' + ID + ' .bt-og-here{margin:14px 0 0;font-size:11px;color:#687575;word-break:break-all;}',
  ].join('');
  document.head.appendChild(st);
}

/* the address to send players to: the worker's, when it is a plain https
   address, else the game's own */
function homeOf(home) {
  try {
    const u = new URL(String(home || ''));
    if (u.protocol === 'https:' && !u.username && !u.password) return { href: u.origin, label: u.hostname };
  } catch (e) { /* not an address */ }
  return { href: HOME, label: 'brotown.net' };
}

/* the probe for headless runs (tools/qa/mp/mp-originlock.mjs) and the
   owner's console, the shape of __btRoomFull */
function stamp(open, href) {
  try { window.__btOriginScreen = { open, href, shown: ((window.__btOriginScreen || {}).shown || 0) + (open ? 1 : 0), at: Date.now() }; }
  catch (e) { /* no window */ }
}

/** Show the screen: `home` is the worker's join_rejected.home. */
export function showOriginScreen(home) {
  const h = homeOf(home);
  try {
    ensureCss();
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      el.setAttribute('role', 'alert');
      const card = document.createElement('div');
      card.className = 'bt-og-card';
      const title = document.createElement('h2');
      title.textContent = "This isn't the official BroTown";
      const text = document.createElement('p');
      text.className = 'bt-og-text';
      const go = document.createElement('a');
      go.className = 'bt-og-go';
      const here = document.createElement('div');
      here.className = 'bt-og-here';
      card.appendChild(title); card.appendChild(text); card.appendChild(go); card.appendChild(here);
      el.appendChild(card);
      document.body.appendChild(el);
    }
    el.querySelector('.bt-og-text').textContent = 'BroTown is played at ' + h.label + ', and its world only opens there.';
    const go = el.querySelector('.bt-og-go');
    go.href = h.href;
    go.textContent = 'Play at ' + h.label;
    let at = '';
    try { at = location.host; } catch (e) { at = ''; }
    el.querySelector('.bt-og-here').textContent = at ? 'This page is at ' + at + '.' : '';
  } catch (e) { /* DOM unavailable */ }
  stamp(true, h.href);
}
