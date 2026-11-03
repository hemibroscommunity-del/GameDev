/* v2.3.4156: "SHOULD THIS RING UPLOAD NOW?" (the state-machine sweep, N2-1)
   crashTrap.js kept the ring at 16 entries and skipped an upload when the
   ring's LENGTH matched the last one sent.  Once the ring is full the length
   stays 16 (push, then shift), so after the first upload no later crash on
   that page was ever sent and the owner stopped seeing new crashes.  The
   newest entry is what changes, so the decision reads that: its time, kind
   and message.  No imports, so node can test it. */
export function ringKey(log) {
  const e = Array.isArray(log) && log.length ? log[log.length - 1] : null;
  return e ? String(e.t) + '|' + String(e.kind) + '|' + String(e.msg).length : '';
}
/* Returns the key to remember when the ring should upload, or '' when it
   should not (an empty ring, or the newest entry is the one already sent). */
export function ringUploadKey(log, lastSentKey) {
  const k = ringKey(log);
  return k && k !== lastSentKey ? k : '';
}
