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
function stamp(open, code, mode) {
  try { window.__btDeviceScreen = { open, code, mode: mode || 'device', shown: ((window.__btDeviceScreen || {}).shown || 0) + (open ? 1 : 0), at: Date.now() }; }
  catch (e) { /* no window */ }
}

/* ═══ v2.3.3355: ...OR "THIS LOGIN KEY NO LONGER WORKS" ═══
   The same screen for join_rejected {reason: 'key'} (server/src/loginkeys.js):
   a new key the owner took back, or an old key retired.  The way on is a key
   from the owner ("Give it a new key") typed at the door, so this mode has a
   button to the door's Login Key form as well. */
const COPY = {
  device: {
    title: 'This character is played on another device',
    text: 'A character can only be played on a device it was played on before. '
      + 'To play it here, ask the game\u2019s owner to let this device in, and give them this code:',
    after: 'Once they have, tap Try again within 30 minutes.',
  },
  key: {
    title: 'This Login Key no longer works',
    text: 'Ask the game\u2019s owner for a new Login Key, and give them this code:',
    after: 'Then tap Use a Login Key and type the new one.',
  },
};

/** Show the screen: `code` is this character's player id; `opts.mode` is
 *  'device' (the default) or 'key'. */
export function showDeviceScreen(code, opts) {
  const c = typeof code === 'string' ? code : '';
  const mode = opts && opts.mode === 'key' ? 'key' : 'device';
  try {
    ensureCss();
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      el.setAttribute('role', 'alert');
      const card = document.createElement('div');
      card.className = 'bt-dv-card';
      const title = document.createElement('h2');
      title.className = 'bt-dv-title';
      const text = document.createElement('p');
      text.className = 'bt-dv-text';
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
      /* v2.3.3355: the door's Login Key form, for a key from the owner */
      const door = document.createElement('button');
      door.type = 'button';
      door.className = 'bt-dv-copy bt-dv-door';
      door.textContent = 'Use a Login Key';
      door.addEventListener('click', () => {
        try { window.location.replace(window.location.pathname + '?noresume=1&login=1'); } catch (e) { /* nothing to do */ }
      });
      card.appendChild(title); card.appendChild(text); card.appendChild(codeEl);
      card.appendChild(copy); card.appendChild(door); card.appendChild(retry); card.appendChild(after);
      el.appendChild(card);
      document.body.appendChild(el);
    }
    el.querySelector('.bt-dv-code').textContent = c;
    /* v2.3.3355: the words for this mode, the door's button only for a key */
    const t = COPY[mode];
    el.querySelector('.bt-dv-title').textContent = t.title;
    el.querySelector('.bt-dv-text').textContent = t.text;
    el.querySelector('.bt-dv-after').textContent = t.after;
    el.querySelector('.bt-dv-door').style.display = mode === 'key' ? '' : 'none';
    el.setAttribute('data-mode', mode);
  } catch (e) { /* DOM unavailable */ }
  stamp(true, c, mode);
}
