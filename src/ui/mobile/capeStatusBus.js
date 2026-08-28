/* ═══ v2.3.2118: THE TICKET COUNT, AS A BUS ═══
 *
 * Owner: "Can you just include one line near chat like #/# golden tickets
 * left?" — the third position for this readout, and each move was earned:
 * v2.3.2101 put the full status sentence in world chat because the drop had
 * been reported dead four times against state nobody could see; v2.3.2117
 * pulled it to the console because a status line posted on every join held
 * the chat panel open over the left joystick.  This bus is the middle
 * ground's plumbing: the payload travels to a ONE-LINE chip in
 * WorldChatFeed instead of to a panel or to nowhere.
 *
 * WHY A BUS AND NOT S._capeStatusLine.  WorldChatFeed sits outside
 * BroTown's tree (GameApp mounts it beside ChatBubble; its own header says
 * it "has no path to BroTown's React state"), and `cape_status` arrives
 * exactly once, on join — usually BEFORE the feed mounts.  A component
 * polling S would repaint on luck; uiBusyBus already solved this shape, so
 * this mirrors it: hold the last payload, notify subscribers, and let a
 * late mount initialise from `.payload` (the v2.3.2085 lesson — a first
 * paint that missed the only send is the whole bug).
 *
 * Carries the RAW payload, not a formatted line: the chip needs numbers
 * (`capes.crimson.remaining` / `cap`), and the human sentence already has a
 * home in S._capeStatusLine for QA and the console. */
const listeners = new Set();

export const capeStatusBus = {
  /* Last cape_status payload from the worker, or null before the join
     lands.  Shape: { live, rate, capes: { crimson: { cap, remaining } } } —
     `remaining` is null while the worker's ledger is cold ("unknown" and
     "none left" are different answers; see eventcapes.js). */
  payload: null,
  set(p) {
    capeStatusBus.payload = p || null;
    for (const fn of listeners) fn(capeStatusBus.payload);
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

/* Same autotest posture as window._gameState / window._uiPanels: the QA
   harnesses run against a built bundle where module scope is unreachable,
   and the chip only renders during a live event — which a localhost preview
   with the socket down can never produce on its own. */
if (typeof window !== 'undefined') window._capeStatusBus = capeStatusBus;
