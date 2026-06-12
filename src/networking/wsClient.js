/* ═══ NET TICK METRICS — ring buffers for the FPS/NET overlay ═══ */
/* v2.3.766: this file used to hold a 1,400-line setupWebSocket() extracted
   from index.html — a dead pre-protocol-v2 copy that was never called (the
   live WebSocket client is inline in src/ui/BroTown.jsx; see
   docs/WIRE-PROTOCOL.md). Deleted per docs/REBUILD-PLAN.md Phase 1 so it can
   never be mistaken for the live client again. REBUILD-PLAN Phase 5 moves
   the real inline client into this file.

   Only the tick ring buffers below were kept: src/rendering/systems/
   fpsOverlay.js imports the getters. NOTE (pre-existing behavior, unchanged
   here): nothing currently pushes into these buffers — only the deleted
   setupWebSocket ever fed them — so the overlay's tick metrics read empty
   history today. Wiring the live inline client's `tick` handler into them
   is a Phase 5 follow-up, not a Phase 1 concern (behavior-frozen). */

/* Tick arrival timestamps — module-level so the buffer survives
 * WebSocket reconnects and can be sampled by the FPS/NET overlay.
 * performance.now() values, capped at ~5 minutes of history.  Bytes-per-tick
 * payload sizes ride along so we can flag size spikes too. */
const TICK_HISTORY_MS = 5 * 60 * 1000;
const tickTimes = [];
const tickSizes = [];

/** Returns the live tick-time ring buffer (do not mutate from outside). */
export function getTickTimes() { return tickTimes; }
/** Returns the live tick-size ring buffer (do not mutate from outside). */
export function getTickSizes() { return tickSizes; }
