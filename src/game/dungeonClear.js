/* ═══ v2.3.3556: AFTER THE CLEAR, TIME TO PICK UP THE LOOT ═══
 *
 * The owner, of dungeons: "This will probably need work to get right."  The
 * tour (docs/specs/dungeons-today.md) found a clear took you out three seconds
 * after "DUNGEON CLEARED!", whatever the boss had dropped still on the floor.
 * Now you have DUNGEON_LOOT_MS: a card at the top counts it down ("Out in
 * 27 s"), its Leave now goes at once, and the way out at the bottom of the
 * arena still works.  The worker keeps a cleared run while anyone is in it
 * (server/src/dungeon.js _tickDungeons, up to five minutes), so this is the
 * phone's own clock.
 *
 * No imports: the rules run in node (server/test/dungeon-clear.test.mjs).
 * gameEvents.js's dungeon_complete starts it, ui/mobile/DungeonClearHud.jsx
 * draws it.
 */

export const DUNGEON_LOOT_MS = 30000;

/* ── who is listening (ui/mobile/DungeonClearHud.jsx) ── */
const subs = new Set();
export const dungeonClearBus = {
  sub(fn) { subs.add(fn); return () => subs.delete(fn); },
  emit() { for (const fn of [...subs]) { try { fn(); } catch (e) { /* a listener's own trouble */ } } },
};

/** The clear of dungeon `zone` began at `now`: you leave by `leave` when the
    time is up, or sooner by the card's Leave now.  `leave` is called at most
    once, and only while you are still in that dungeon -- a run you walked out
    of, and a new one you went straight back into, are never left for it. */
export function startDungeonClear(S, zone, now, leave, setTimer) {
  if (!S || typeof zone !== 'string' || typeof leave !== 'function') return null;
  const clear = { zone, until: now + DUNGEON_LOOT_MS, gone: false };
  const go = () => {
    if (clear.gone) return false;
    clear.gone = true;
    if (S._dungeonClear === clear) S._dungeonClear = null;
    dungeonClearBus.emit();
    if (S._serverDungeon !== zone) return false;
    leave();
    return true;
  };
  clear.go = go;
  S._dungeonClear = clear;
  (setTimer || setTimeout)(go, DUNGEON_LOOT_MS);
  dungeonClearBus.emit();
  return clear;
}

/** What the card shows: null, or { zone, secs } -- the whole seconds left,
    never below 0 -- while you stand in the cleared dungeon. */
export function dungeonClearView(S, now) {
  const c = S && S._dungeonClear;
  if (!c || c.gone || S._serverDungeon !== c.zone) return null;
  return { zone: c.zone, secs: Math.max(0, Math.ceil((c.until - now) / 1000)) };
}

/** The card's Leave now. */
export function leaveClearedDungeon(S) {
  const c = S && S._dungeonClear;
  return !!(c && typeof c.go === 'function' && c.go());
}
