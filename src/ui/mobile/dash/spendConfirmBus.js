/* Build-skill point-spend confirmation bus (v2.3.911).
 *
 * Opened from T2Panel's `+` button with the channel context:
 *   open({ isDef, cat, key, channel, current, skillLabel })
 * The SpendPointConfirm overlay subscribes, renders a before -> after
 * preview, and applies the point on confirm (re-checking the guards).
 */

const state = { open: false, target: null };
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const spendConfirmBus = {
  state,
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
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window._spendConfirmBus = spendConfirmBus;
