/* ═══ v2.3.2159: "HOW DO I GET RID OF THE BROWSER BAR?" — installHintBus ═══
 *
 * Owner, after testing landscape on a real iPhone: "a lot of the screen is
 * eaten by the active browser at the top.  Is there any way around that?"
 * and, told the answer was Add to Home Screen: "there needs to be some kind
 * of instruction on the game itself on how to do this."
 *
 * The bus exists for the same reason every other one here does: the hint
 * card mounts in GameApp (it is world chrome), but the thing that reopens a
 * dismissed hint is a Settings row, and SettingsPanel has no path to
 * GameApp's state.  One open() and a subscription; the card owns everything
 * else. */
const listeners = new Set();
export const installHintBus = {
  open() { for (const fn of listeners) fn(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
