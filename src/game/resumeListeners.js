/* ═══ v2.3.4482: THE RETURN TO THE TAB IS HEARD ONCE ═══
 *
 * wsClient's setupWebSocket listens for the player coming back to the tab
 * (`visibilitychange` on the document, `pageshow` from Safari's parked-page
 * cache) and runs its recovery: a reconnect, a rejoin for a fresh world, a
 * renderer rebuild.  It added those two listeners on every set-up and its
 * teardown never took them off -- and the set-up runs again each time the game
 * is entered (BroTown.jsx's effect re-runs on the name window, the login and
 * the boot phase).  So after leaving to the menu and coming back in, every
 * return to the app ran the recovery once per set-up, the old copies from a
 * torn-down set-up whose socket was already null (and its `!ws` road is
 * "connect now": a second line from a closed set-up).
 *
 * armResumeListeners adds the pair and hands back the one function that takes
 * them off; the set-up's teardown calls it.  No imports:
 * server/test/resume-once.test.mjs runs it in node.
 *
 *   onHidden()       -- the page went hidden (the away clock starts)
 *   onVisible()      -- the page is visible again
 *   onBfcache()      -- the page came back from Safari's parked-page cache
 */
export function armResumeListeners(doc, win, onHidden, onVisible, onBfcache) {
  var live = true;
  function onVis() {
    if (!live) return;   /* belt and braces: a removed listener never runs anyway */
    if (doc.visibilityState === 'hidden') { onHidden(); return; }
    if (doc.visibilityState === 'visible') onVisible();
  }
  function onShow(e) {
    if (!live) return;
    if (e && e.persisted) onBfcache();
  }
  try { if (doc) doc.addEventListener('visibilitychange', onVis); } catch (e) { /* no document: nothing to hear */ }
  try { if (win) win.addEventListener('pageshow', onShow); } catch (e) { /* no window: nothing to hear */ }
  return function disarm() {
    live = false;
    try { if (doc) doc.removeEventListener('visibilitychange', onVis); } catch (e) {}
    try { if (win) win.removeEventListener('pageshow', onShow); } catch (e) {}
  };
}
