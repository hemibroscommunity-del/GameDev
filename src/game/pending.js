/* ═══ v2.3.6683: WHAT IS OUT, WHAT IT HOLDS, AND WHEN ITS OUTCOME IS UNKNOWN (card UI2-bro, PR 1) ═══
 *
 * Beside the action door (src/game/actions.js: a request's one way out, and
 * its request id, `reqId`).  The owner's master specification, 2026-11-25,
 * part 14 Q84: "local pending indicator on the affected control, with
 * relevant repeated/conflicting actions temporarily unavailable"; "prevent
 * duplicate submission"; "If the response is lost or transaction outcome is
 * uncertain, show an unresolved/reconciling state rather than falsely
 * reporting success or failure. Verify transaction status before retrying a
 * potentially completed action"; "Success: update affected components after
 * authoritative server confirmation."  And Q82: "do not signal success until
 * confirmed when a server mutation is involved."
 *
 * ONE STATE, ONE TRANSITION FUNCTION (CLAUDE.md §5: a phase lives in one
 * field).  The state is a frozen map of request id -> { holds, since }: the
 * controls the request holds (a control's own name: 'title:equip', ...) and
 * when it went.  A request's phase is read from it, never kept beside it:
 *   'out'      sent, no answer yet, inside its window (`wait` ms);
 *   'unknown'  no answer past its window: the outcome is NOT known (it may
 *              have landed), so its controls stay held and the screen says
 *              so, and the way out is the worker's own word (its state_sync,
 *              its event), which settles it;
 * and a settled request is gone from the map: its controls are free.  Nothing
 * here says "done": success is the worker's event, read by the page that
 * shows it (the specification's "after authoritative server confirmation").
 *
 * The page's screens keep one such state and hand it down (open-hand.test);
 * card UI2-bro's PR 2 proves it on the title's Equip.
 *
 * NO IMPORTS: node tests it (tools/guards/screen-zones.test.mjs). */

/* how long a request waits for its answer before its outcome reads unknown:
   the action door's resend window twice over (actions.js RESEND_MS, 1500) */
export const PENDING_WAIT_MS = 3000;

const EMPTY = Object.freeze(Object.create(null));

/** The state with nothing out. */
export function pendingInit() { return EMPTY; }

/** Is a control held by a request that is out (or whose outcome is unknown)? */
export function pendingHolds(s, control) {
  const c = String(control);
  for (const id of Object.keys(s || EMPTY)) if (s[id].holds.indexOf(c) >= 0) return id;
  return null;
}

/**
 * THE ONE TRANSITION.  `a.type`:
 *   'send'    { id, holds: [control...], now }: a request goes out.  REFUSED
 *             (the same state back) while any control it would hold is held:
 *             a second press never goes out while the first is out, nor
 *             while its outcome is unknown;
 *   'settle'  { id }: the worker answered (yes or no) or its state shows the
 *             outcome: the request is gone and its controls are free;
 *   'clear'   the connection's fresh state_sync: everything out is settled by
 *             the worker's whole word.
 * Returns the next state (the same object when nothing changes).
 */
export function pendingStep(s, a) {
  const cur = s || EMPTY;
  if (!a) return cur;
  switch (a.type) {
    case 'send': {
      const id = a.id == null ? '' : String(a.id);
      const holds = Array.isArray(a.holds) ? a.holds.map(String) : [];
      if (!id || !holds.length || Object.prototype.hasOwnProperty.call(cur, id)) return cur;
      for (const c of holds) if (pendingHolds(cur, c)) return cur;
      const next = Object.create(null);
      for (const k of Object.keys(cur)) next[k] = cur[k];
      next[id] = Object.freeze({ holds: Object.freeze(holds), since: Number(a.now) || 0 });
      return Object.freeze(next);
    }
    case 'settle': {
      const id = a.id == null ? '' : String(a.id);
      if (!Object.prototype.hasOwnProperty.call(cur, id)) return cur;
      const next = Object.create(null);
      for (const k of Object.keys(cur)) if (k !== id) next[k] = cur[k];
      return Object.freeze(next);
    }
    case 'clear':
      return Object.keys(cur).length ? EMPTY : cur;
    default:
      return cur;
  }
}

/**
 * A control's mark: 'free' (it may be pressed), 'out' (its request is on the
 * way: the pending mark, the press refused) or 'unknown' (no answer in its
 * window: "not confirmed yet", the press still refused). Never 'done': a
 * request is never success until the worker's own word settles it.
 */
export function pendingMark(s, control, now, wait) {
  const id = pendingHolds(s, control);
  if (!id) return 'free';
  const w = wait == null ? PENDING_WAIT_MS : Number(wait);
  return (Number(now) || 0) - s[id].since > w ? 'unknown' : 'out';
}
