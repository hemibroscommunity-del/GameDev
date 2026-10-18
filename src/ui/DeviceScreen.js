/* ═══ v2.3.3344: "THIS CHARACTER IS PLAYED ON ANOTHER DEVICE" ═══
 *
 * A character's Login Key works only on devices it has been played on
 * (server/src/devicelock.js, docs/specs/device-lock.md).  The right key from
 * any other device is answered join_rejected {reason: 'device'} and close 4016,
 * and this is the screen that says what to do: ask the game's owner, with the
 * code this screen shows -- the character's player id, which the owner pastes
 * into the Test panel's "Player logins" -- and tap Try again once they have.
 *
 * PLAIN DOM, NOT REACT, for the reason OriginScreen.js and RoomFullScreen.js
 * give: the refusal arrives from an onclose handler that can fire while the
 * IntroVideo overlay covers the viewport and the React tree is still mounting.
 * Nothing retries by itself: every try would be refused until the owner acts.
 * Sized for iPhone Safari at 390x844; Lantern Slate colours
 * (docs/LANTERN-SLATE-SPEC.md).                                            */

const ID = 'bt-device';
const STYLE_ID = 'bt-device-css';

let el = null;

function ensureCss() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = [
    '@keyframes bt-dv-in{from{opacity:0}to{opacity:1}}',
    '#' + ID + '{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;',
    'justify-content:center;padding:24px;box-sizing:border-box;',
    'background:radial-gradient(circle at 50% 30%,#253239 0%,#172126 55%,#10181D 100%);',
    "font-family:'Source Sans 3',system-ui,sans-serif;color:#B9C1BF;",
    'animation:bt-dv-in .25s ease-out both;-webkit-tap-highlight-color:transparent;}',
    '#' + ID + ' .bt-dv-card{width:100%;max-width:320px;text-align:center;}',
    '#' + ID + ' h2{margin:0 0 10px;font-size:21px;line-height:1.25;font-weight:700;color:#F7F2E7;}',
    '#' + ID + ' p{margin:0 0 14px;font-size:14px;line-height:1.5;color:#B9C1BF;}',
    '#' + ID + ' .bt-dv-code{margin:0 0 10px;padding:10px 12px;border-radius:10px;background:#0E1519;',
    'border:1px solid #33434A;color:#F7F2E7;font:600 14px ui-monospace,Menlo,monospace;',
    'word-break:break-all;user-select:all;-webkit-user-select:all;}',
    '#' + ID + ' button{display:block;box-sizing:border-box;width:100%;padding:12px 16px;border-radius:10px;',
    'font-size:15px;font-weight:700;border:0;margin:0 0 10px;cursor:pointer;}',
    '#' + ID + ' .bt-dv-copy{background:#253239;color:#F7F2E7;border:1px solid #33434A;}',
    '#' + ID + ' .bt-dv-retry{background:#D8A85F;color:#20170D;}',
    '#' + ID + ' .bt-dv-retry:active{background:#B88643;}',
  ].join('');
  document.head.appendChild(st);
}

/* the probe for headless runs (tools/qa/mp/mp-devicelock.mjs) and the owner's
   console, the shape of __btOriginScreen */
function stamp(open, code) {
  try { window.__btDeviceScreen = { open, code, shown: ((window.__btDeviceScreen || {}).shown || 0) + (open ? 1 : 0), at: Date.now() }; }
  catch (e) { /* no window */ }
}

/** Show the screen: `code` is this character's player id. */
export function showDeviceScreen(code) {
  const c = typeof code === 'string' ? code : '';
  try {
    ensureCss();
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      el.setAttribute('role', 'alert');
      const card = document.createElement('div');
      card.className = 'bt-dv-card';
      const title = document.createElement('h2');
      title.textContent = 'This character is played on another device';
      const text = document.createElement('p');
      text.textContent = 'A character can only be played on a device it was played on before. '
        + 'To play it here, ask the game’s owner to let this device in, and give them this code:';
      const codeEl = document.createElement('div');
      codeEl.className = 'bt-dv-code';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'bt-dv-copy';
      copy.textContent = 'Copy the code';
      copy.addEventListener('click', () => {
        const v = codeEl.textContent || '';
        const done = () => { copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy the code'; }, 1600); };
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(v).then(done, () => {}); return; }
        } catch (e) { /* no clipboard: the code is selectable */ }
      });
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'bt-dv-retry';
      retry.textContent = 'Try again';
      /* once the owner has let this device in: a fresh start joins again */
      retry.addEventListener('click', () => {
        try { sessionStorage.setItem('bt_play_now', '1'); } catch (e) { /* private mode */ }
        try { window.location.reload(); } catch (e) { /* nothing to do */ }
      });
      const after = document.createElement('p');
      after.className = 'bt-dv-after';
      after.textContent = 'Once they have, tap Try again within 30 minutes.';
      card.appendChild(title); card.appendChild(text); card.appendChild(codeEl);
      card.appendChild(copy); card.appendChild(retry); card.appendChild(after);
      el.appendChild(card);
      document.body.appendChild(el);
    }
    el.querySelector('.bt-dv-code').textContent = c;
  } catch (e) { /* DOM unavailable */ }
  stamp(true, c);
}
