/* ═══ v2.3.2595: "ARE YOU SURE?" FOR A POINT SPEND ═══
 *
 * Owner: "Add a second window asking if they're sure they want to spend the
 * point."
 *
 * A point is permanent — there is no refund short of a migration — and the
 * Points screen now spends from a [+] flush against the edge of a 48px cell,
 * which is exactly the control a thumb brushes on the way past.  So the
 * spend asks first.
 *
 * WHY NOT `spendConfirmBus` (dash/spendConfirmBus.js), which already exists
 * and is already named for this: that one belongs to the retired T2 channel
 * grid and its overlay APPLIES THE POINT CLIENT-SIDE (`R[specKey][key] += 1`,
 * recalcDerived, persist).  Under prog3 the allocation is the SERVER's —
 * `prog3_allocate` goes out and the worker's echo is the only thing that may
 * move a count (prog3.js: "allocation is a server endpoint, not
 * client-applied-and-clamped").  Reusing it would mean a confirm dialog that
 * writes a number the worker never agreed to, which is the exact class of
 * drift the whole rebuild exists to remove.  Same shape, different owner.
 *
 * The 13-line bus shape every other one-surface-asks-another in this repo
 * uses (heroSectionBus, spendConfirmBus, infoPopupBus).
 */

const state = { open: false, target: null };
const listeners = new Set();
const emit = () => { for (const fn of listeners) { try { fn(); } catch (e) { /* a listener must not take the screen down */ } } };

export const prog3SpendBus = {
  state,
  /** open({ stat, label, cat, laneLabel, pts, cap, nowText, afterText, perText, iconSrc, run }) */
  open(target) {
    state.open = true;
    state.target = target;
    emit();
  },
  close() {
    if (!state.open) return;
    state.open = false;
    state.target = null;
    emit();
  },
  current() { return state.open ? state.target : null; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

/* The same window handle InfoPopup publishes, for the QA harnesses. */
if (typeof window !== 'undefined') window.__btProg3Spend = prog3SpendBus;
