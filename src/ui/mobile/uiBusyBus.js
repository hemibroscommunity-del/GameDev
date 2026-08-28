/* ═══ v2.3.2085: "A PANEL IS OPEN" — uiBusyBus ═══
 *
 * WHAT IT IS FOR.  Chrome that floats over the world has to get out of the
 * way when a panel opens on top of it, and the pieces that need to know sit
 * outside BroTown's component tree.  GameApp mounts WorldChatFeed beside
 * ChatBubble and its own comment says why this is needed: that component
 * "has no path to BroTown's React state".
 *
 * THE BUG THAT MADE IT.  mp-trade had failed for weeks with a message that
 * reads as innocent -- "element is visible, enabled and stable", then a
 * timeout -- and once H.clickText started naming what elementFromPoint finds
 * at the button's centre (v2.3.2084), it answered in one run: the world chat
 * log's scrollable list, sitting over the inspect card's Trade button.
 *
 * WorldChatFeed's own header says "IT DOES NOT EAT TAPS", and that is true of
 * the WORLD behind it -- the shell is pointerEvents:'none' precisely so a
 * joystick drag in the lower left still works.  It is not true of a panel
 * ABOVE it: the scrollable list must be pointerEvents:'auto' to be
 * scrollable, and that list is a 260x104 rectangle in the same corner as the
 * inspect card's action row.  So the card's single most important button --
 * Trade -- could not be pressed while any chat line was on screen.
 *
 * WHY NOT A Z-INDEX.  The obvious fix is "put the card above the feed", and
 * the card already claims z 99800 against the feed's 25 (zLayers.js).  It
 * loses anyway, because the feed's shell is styled `left: 8px` and renders at
 * x=295: its `position: fixed` is being captured by a transformed ancestor,
 * which also scopes the z-index inside that ancestor's stacking context.
 * That is TRAPS §20 -- a fixed wrap is its own stacking context -- and it
 * means no number either side can pick settles this.  What settles it is the
 * feed declining the tap, which is what it already does for the world.
 *
 * Deliberately carries a BOOLEAN and nothing else.  Which panel is open is
 * BroTown's business; the only thing chrome needs is whether to stand aside.
 */
const listeners = new Set();

export const uiBusyBus = {
  /* True while any full panel or the inspect card is open — BroTown writes
     it from the same `_anyPanelOpen` it uses for its own gating, so there is
     one definition of "busy" rather than two that drift. */
  busy: false,
  set(v) {
    const next = !!v;
    if (next === uiBusyBus.busy) return;   /* no-op writes cost nothing */
    uiBusyBus.busy = next;
    for (const fn of listeners) fn(next);
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
