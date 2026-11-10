/* ═══ v2.3.4367: ONE LINE AT A TIME ═══
 *
 * A phone keeps ONE game socket.  Opening a new one used to leave the old one
 * running when the caller had not retired it first (the state-machine sweep,
 * 2026-11-03, V4 N1-2 / U3-20): a "Try now" tap on the "BroTown is full"
 * screen while the automatic try was still connecting made a second line, and
 * the stray later knocked the live one off -- the full screen back over a
 * world the bro was in, or a false "connected from another window" banner.
 *
 * retireSocket is the one way an old line is let go: its handlers come off
 * FIRST (so its close can neither re-arm a reconnect nor stamp a status), then
 * it is closed.  wsClient's connect() calls it on the line it replaces, so
 * every road that connects is covered, and the effect's cleanup calls it too.
 * No imports: server/test/socket-one.test.mjs runs it in node.
 */
export function retireSocket(sock, code, reason) {
  if (!sock) return false;
  try {
    sock.onopen = null;
    sock.onmessage = null;
    sock.onclose = null;
    sock.onerror = null;
  } catch (e) { /* a socket that will not take a null still gets closed */ }
  try {
    /* CONNECTING (0) or OPEN (1): close it.  CLOSING or CLOSED: already going. */
    if (sock.readyState === 0 || sock.readyState === 1) sock.close(code || 1000, reason || 'replaced');
  } catch (e) { /* closing a line that is already gone is not an error */ }
  return true;
}
