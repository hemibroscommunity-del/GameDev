/* ═══ v2.3.2119: "FOLD THE DASHBOARD" — dashMinBus ═══
 *
 * Owner: "make it possible to minimize the entire dashboard with a button
 * on that empty space next to gold."
 *
 * WHAT MINIMIZED MEANS. The columns row (BAG / EQUIPPED / COMBAT) goes;
 * the identity row — gold, the readouts, the nav buttons, and the fold
 * button itself — stays, because a band that vanished completely would
 * take the only way back with it (the same trap the v2.3.1642 nav-group
 * note guards: navigation cannot hide with the thing it escapes).
 *
 * WHY A BUS AND NOT COMPONENT STATE. The band's geometry does not belong
 * to BottomDashboard: BroTown's resize() stamps --dash-h and --cols-h and
 * sizes the WORLD CANVAS as viewport minus band, and the canvas watchdog
 * (v2.3.2082 lineage) re-derives that same arithmetic on a timer to heal
 * wrong sizes. A minimize the canvas doesn't know about is a black band
 * where the columns row was; one the watchdog doesn't know about is a
 * "healing" resize war every 500ms. So the flag lives where uiBusyBus
 * lives — module scope, both sides subscribe — and BroTown owns turning
 * it into pixels, exactly as it owns every other viewport change.
 *
 * THE SETTER POKES resize() THROUGH THE WINDOW EVENT, not a direct call:
 * resize is a closure inside BroTown's canvas effect, already listening
 * for 'resize'. Dispatching the event it already handles means one
 * geometry path, not a second one that drifts.
 *
 * REMEMBERED for the same reason WorldChatFeed's fold is (v2.3.2099): a
 * player who folded the band to see the world means it, and a reconnect
 * remounts everything. Read defensively — a private window throws on
 * localStorage access, and a fold preference is not worth a boot failure. */
const MIN_KEY = 'bt_dash_min';
const readMin = () => {
  try { return localStorage.getItem(MIN_KEY) === '1'; } catch (e) { return false; }
};

const listeners = new Set();

export const dashMinBus = {
  min: readMin(),
  set(v) {
    const next = !!v;
    if (next === dashMinBus.min) return;
    dashMinBus.min = next;
    try { localStorage.setItem(MIN_KEY, next ? '1' : '0'); } catch (e) { /* private window */ }
    for (const fn of listeners) fn(next);
    /* The one geometry path: BroTown's resize() listens for this. */
    try { window.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ }
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
