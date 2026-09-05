/* ═══ WHO OWNS THE SCREEN RIGHT NOW (v2.3.2145) ═══
 *
 * Owner: "during trade make the world notifications (chat, etc) UNDER those
 * panels. I couldn't accept any trades because notifications blocked it."
 *
 * WHAT WAS ACTUALLY IN THE WAY. Not the chat FEED -- that has been
 * pointerEvents:'none' since it was built and cannot swallow a tap. It was the
 * chat COMPOSER's dismiss layer (ChatBubble): a transparent, full-play-area
 * div at z-index 95, mounted for as long as the composer is open, whose whole
 * job is to catch the next tap anywhere and close the composer. The trade
 * window is `.bt-inspect`, z-index 32. So with the composer open, every tap
 * aimed at Accept was caught by an invisible sheet forty layers above it and
 * spent closing the chat box instead. The button was never reachable.
 *
 * WHY A BUS AND NOT A BIGGER Z-INDEX. Raising the trade panel would fix this
 * pair and lose to the next overlay someone adds; game.css already records
 * that lesson at .bt-inspect ("the chip is position:fixed OUTSIDE
 * .brotown-wrap ... so it paints over ANY in-wrap modal no matter its z-index
 * -- geometric clearance is the fix; the z-ladder can't reach it"). Stacking
 * contexts make the z-ladder unreliable ACROSS these surfaces, so the rule is
 * stated as intent instead: while a decision panel is open, the transient
 * world chrome stands down. A surface that stands down cannot block a tap at
 * any z-index, in any stacking context.
 *
 * COUNTED, not a boolean: a trade window can be open under an item popup, and
 * the last one to close must not clear a guard the other still holds.
 */
let _depth = 0;
const _listeners = [];

/* v2.3.2145: a user-facing mute, carried here because it answers the same
   question -- may the transient chrome speak right now -- and because the
   silence control and the trade guard must not be able to disagree. */
const MUTE_KEY = 'bt-mute-notifications';
let _muted = false;
try { _muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* private mode */ }

const _emit = () => { _listeners.forEach((fn) => { try { fn(); } catch (e) { /* a listener must not break the bus */ } }); };

/** A decision panel has taken the screen. Returns the matching release. */
export function guardPush() {
  _depth += 1;
  if (_depth === 1) _emit();
  let released = false;
  return () => {
    if (released) return;               /* React StrictMode double-invokes cleanups */
    released = true;
    _depth = Math.max(0, _depth - 1);
    if (_depth === 0) _emit();
  };
}

/** True while any decision panel owns the screen. */
export function guardActive() { return _depth > 0; }

/** True when the player has silenced notifications themselves. */
export function notificationsMuted() { return _muted; }

export function setNotificationsMuted(on) {
  const next = !!on;
  if (next === _muted) return;
  _muted = next;
  try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch (e) { /* ignore */ }
  _emit();
}

/** The one question every transient surface asks: should I stand down? */
export function chromeSilenced() { return _depth > 0 || _muted; }

/* ═══ v2.3.2276: THE GUARD, AS ONE LINE A PANEL CAN OPT INTO ═══
 *
 * Owner: "Chat should always be the bottom layer if any menus open up beside
 * it (want it beneath trade menus, player menus, etc)."
 *
 * guardPush had exactly three call sites, all of them trade panels, so a
 * PLAYER menu -- which the owner names -- stood nothing down.  Measured in a
 * real browser (mp-chatlayer): the chat FEED already loses to an open
 * `.bt-inspect` panel, so "painted underneath" is not the missing half.  What
 * is missing is the composer's dismiss layer, a transparent full-play-area
 * sheet whose whole job is to catch the next tap -- and it does not care what
 * it is above.
 *
 * A hook rather than a copied useEffect because the three existing call sites
 * are already three copies of the same line, and this is about to be more.
 *
 * `active` IS NOT OPTIONAL POLITENESS, and the first cut of this shipped
 * without it and was caught by mp-chatlayer within the hour.  The three trade
 * panels are mounted CONDITIONALLY -- their mount is their visibility -- so a
 * bare push on mount is right for them.  ShopkeeperPanel is not: it is mounted
 * unconditionally in GameApp and returns null while the shop is shut, so
 * pushing on mount pinned the guard for the whole session and the chat box
 * could never open again.  Pass the panel's own "am I showing" expression
 * wherever the two differ; the default keeps the mount-is-visibility case a
 * one-liner. */
export function useModalGuard(React, active = true) {
  React.useEffect(() => {
    if (!active) return undefined;
    return guardPush();
  }, [active]);
}

export function onGuardChange(fn) {
  _listeners.push(fn);
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); };
}

if (typeof window !== 'undefined') {
  window.__btModalGuard = () => ({ depth: _depth, muted: _muted, silenced: chromeSilenced() });
}
