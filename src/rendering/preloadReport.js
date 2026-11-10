/* ═══ v2.3.4415: THE LOADING SCREEN'S REPORT SAYS WHAT HAPPENED ═══
 *
 * preloadWorldAnimations (preloadAnimations.js) waits on every group of the
 * loading screen and writes each group's ending to window.__btPreloadReport,
 * the tool TRAPS §12 names for checking the preloading law.  Until v2.3.4415
 * each group was wrapped in `.catch(() => {})` BEFORE Promise.allSettled, so
 * a group that failed read "fulfilled" (state-machine sweep V17a R5-6): the
 * report could only ever say "loaded".  allSettled never rejects on its own,
 * so the wrap guarded nothing; without it a failed group reads "rejected",
 * and the gate still lifts exactly as before (it waits for the settle, never
 * for a success).
 *
 * A group whose loader swallows its own failure (resolves null) still reads
 * "fulfilled": that is the loader's answer, not this report's.
 *
 * No imports (node runs it in server/test/renderer-life.test.mjs). */

/** Settle every group of `groups` (name -> promise or value) and write each
 *  one's status, "fulfilled" or "rejected", into `report` under its name. */
export async function settleGroups(groups, report) {
  const out = report || {};
  const names = Object.keys(groups);
  const settled = await Promise.allSettled(names.map((n) => Promise.resolve(groups[n])));
  names.forEach((n, i) => { out[n] = settled[i].status; });
  return out;
}
