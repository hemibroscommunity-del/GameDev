/* ═══ v2.3.3560: A TAP THAT CLOSES A WINDOW TAPS NOTHING UNDER IT ═══
 *
 * Found on the Points tab (#1070): on a 390 px phone, the ✕ of a shared
 * stat's window (Max HP, Defense...) closed the window AND opened the world
 * map.  The owner: "Yes begin the fix".
 *
 * A tap is a press, a lift, then -- a moment later -- a click (and before it,
 * on a touch screen, a mousedown and a mouseup), all at the finger's spot.
 * The stat window closes on the LIFT (InfoPopup.jsx, by design since
 * v2.3.2131: the tap that OPENS it is a lift too, and that tap's own click
 * lands on the window just put up -- a window that closed on a click would
 * close the moment it opened).  React takes the window off the page before
 * the browser sends the click, and the browser sends it to whatever is under
 * the finger THEN.  There, the minimap's invisible "open the world map"
 * button (WorldMapOverlay.jsx: a body-level portal, z 45, opens on a click):
 * a shared stat's window is short, so its ✕ lies over the minimap; a weapon
 * stat's is taller and its ✕ clear of it.  Over the world, the same click is a
 * tap on the canvas (a monster locked, a resource worked: BroTown's onClick
 * only knows the taps that began on it, _touchHandledAt).
 *
 * game.css's `body:has(.bt-inspect) [data-world-map-open]{pointer-events:none}`
 * cannot help: by the time the click comes the window is gone, so the rule no
 * longer holds.  tapDismiss.js's answer, acting on the click itself, cannot
 * be used here either: a window opened by a lift is under its own opening
 * tap's click.
 *
 * So the control that takes its window away on a lift says so:
 * swallowTapClick(e) in its handler eats what that same tap is still to send
 * -- its mousedown, mouseup and click -- and nothing else:
 *   - only near where the finger lifted (NEAR_PX: a tap that moved further is
 *     a drag and sends no click),
 *   - only until KEEP_MS after it (every element is touch-action:manipulation
 *     since v2.3.3454, so the click comes at once; _touchHandledAt allows 600),
 *   - only until the next press: a new tap is a new gesture, and its click is
 *     the player's, even on the same spot a moment later,
 *   - only events the browser made (isTrusted): never a test's dispatchEvent,
 *     el.click() or the Esc key's press of a ✕ (deskKeys.js pressControl,
 *     which arms nothing either), and never a click a key made (detail 0);
 *   - and once: the click ends it.
 * It eats them on the DOCUMENT, in the capture phase: the page's own
 * listeners on window (wsClient's come-back) and the sound recovery's on
 * document (GameApp, registered first) still hear them; React (on #root) and
 * everything under it do not.
 *
 * OPT-IN, like tapDismiss: a lift that leaves its control where it was needs
 * nothing (the click lands on the control again, which has no onClick), and
 * a window that closes on a CLICK needs nothing (the click is the tap's last
 * event).  A control that removes itself, or its window, on pointerup -- or a
 * surface that hides on a press and should not pass the tap on -- calls this
 * first.  TRAPS §247.
 *
 * QA: window.__btTapClicks -- { armed, eaten, last } (last: what was eaten,
 * on what, how long after the lift).  `?tapthrough` in the address is the
 * game as it was: nothing armed, the click goes where the browser sends it
 * (mp-tapthrough shows the bug with it).
 */

const KEEP_MS = 700;
const NEAR_PX = 32;

let _armed = null;      /* { x, y, at } while a lift's click is still to come */
let _off = null;        /* ?tapthrough, read once */
let _bound = false;
const _qa = { armed: 0, eaten: 0, last: null };

const _now = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());

function _describe(t) {
  try {
    if (!t || !t.tagName) return String(t && t.nodeName || '?');
    let s = t.tagName.toLowerCase();
    for (const a of t.attributes || []) {
      if (a.name.startsWith('data-')) { s += '[' + a.name + ']'; break; }
    }
    return s;
  } catch (_e) { return '?'; }
}

function _eat(e) {
  const a = _armed;
  if (!a || !e.isTrusted) return;
  /* a click made by a key (Enter, Space on a button) is never a tap's */
  if (e.type === 'click' && e.detail === 0) return;
  const late = _now() - a.at;
  if (late > KEEP_MS) { _armed = null; return; }
  if (Math.abs(e.clientX - a.x) > NEAR_PX || Math.abs(e.clientY - a.y) > NEAR_PX) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.type === 'click') {
    _armed = null;
    _qa.eaten++;
    _qa.last = { on: _describe(e.target), afterMs: Math.round(late) };
  }
}

function _pressed(e) {
  /* a new press is a new tap: its click is the player's */
  if (_armed && e.isTrusted) _armed = null;
}

function _bind() {
  if (_bound || typeof document === 'undefined') return;
  _bound = true;
  document.addEventListener('pointerdown', _pressed, { capture: true, passive: true });
  document.addEventListener('mousedown', _eat, true);
  document.addEventListener('mouseup', _eat, true);
  document.addEventListener('click', _eat, true);
}

try { if (typeof window !== 'undefined') window.__btTapClicks = _qa; } catch (_e) { /* no window */ }

/**
 * Call from a pointerup handler that takes its control (or its window) off the
 * page: the click this same tap is still to send is eaten, so it lands on
 * nothing.  Safe with any event or none (a key, a timer: nothing armed).
 */
export function swallowTapClick(e) {
  if (_off === null) {
    try { _off = /[?&]tapthrough(=|&|$)/.test((typeof location !== 'undefined' && location.search) || ''); } catch (_e) { _off = false; }
    _qa.off = _off;
  }
  if (_off) return;
  const ne = e && (e.nativeEvent || e);
  if (!ne || ne.isTrusted !== true || typeof ne.clientX !== 'number') return;
  _bind();
  _armed = { x: ne.clientX, y: ne.clientY, at: _now() };
  _qa.armed++;
}
