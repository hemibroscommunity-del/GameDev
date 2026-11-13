/* ═══ v2.3.5007: THE HEAP TRIM'S ONE SWITCH (`?heaptrim=0`) ═══
 *
 * The owner, 2026-11-13: "Go recommended" -- trim the page's JavaScript heap,
 * whose line in the memory check (tools/qa/mp/memory-budget.mjs, `heap`, 38.5
 * MB) main's own code read 36.5-38.0 MB against on CI: any pull request could
 * fail it by the luck of the run.  Heap snapshots of the check's trip
 * (docs/specs/heap-trim-2026-11-13.md) found no one big holder: half the heap
 * is the code the engine compiles as the game runs (kept for good), and the
 * rest is spread thin.  Four trims of things kept with no use, none of them
 * seen or heard:
 *
 *   1. the head pieces' meta.json documentation (entityRenderer.js
 *      _fetchTraitMeta): the `note`s, ~170 KB of words, read by nothing;
 *   2. the look palette's frame records (lookPalette.js buildSheet): made for
 *      a sheet when it is first DRAWN, not for all ~190 sheets as they load,
 *      and every frame of a sheet sharing its one whole-frame box;
 *   3. Pixi's batches' texture-id tables (batchIdsLean.js): emptied as Pixi
 *      empties the batch, where Pixi left every id it ever saw in them;
 *   4. Pixi's Rectangles, Matrices, points and Bounds keep their whole
 *      numbers unboxed (fieldLean.js): Chrome boxed every number in them.
 *
 * `?heaptrim=0` is the page as before, all four (read once, as the page
 * loads).  No imports: node can read it.
 */
let _on = null;
export function heapTrimOn() {
  if (_on === null) {
    _on = true;
    try {
      if (typeof location !== 'undefined' && /[?&]heaptrim=(0|off|false)(&|$)/.test(location.search || '')) _on = false;
    } catch (e) { /* on */ }
  }
  return _on;
}
