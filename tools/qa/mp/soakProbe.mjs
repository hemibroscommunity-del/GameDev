/* ═══ v2.3.4674: THE SOAK PROBE, on its own ═══
 * Counts every growing pool a long session can leak: the game state's arrays
 * and id maps, the renderer's facade, the scene graph two levels down and the
 * renderer's closure-held pools (poolSizesProbe).  Run in the page
 * (page.evaluate(PROBE)).  It lived in mp-soak.mjs, an old-map scenario deleted
 * with the others (docs/OLD-MAP-TESTS.md); mp-longplay and mp-heapdiff, which
 * play the world, read it from here. */
export const PROBE = () => {
  const S = window._gameState && window._gameState.current;
  const out = {};
  if (!S) return out;
  for (const k of Object.keys(S)) {
    const v = S[k];
    if (Array.isArray(v)) out['S.' + k] = v.length;
    else if (v instanceof Map || v instanceof Set) out['S.' + k] = v.size;
    else if (v && typeof v === 'object' && !v.nodeType) {
      /* plain id-keyed maps (others, monsters-by-id caches, cooldowns) */
      const n = Object.keys(v).length;
      if (n > 0 && n < 100000) out['S.' + k + '{}'] = n;
    }
  }
  const R = window._pixiRenderer;
  if (R) {
    /* KNOWN COVERAGE LIMIT, stated rather than papered over: the pools most
       likely to leak per-entity display objects (monsterDisplays,
       otherPlayerDisplays, the remote-swing sprite maps) live on the
       entity/effects sub-renderers, which initPixiRenderer keeps in CLOSURE
       and never exposes — window._pixiRenderer is a facade of functions.  So
       this probe cannot count them, and a leak confined to those maps would
       pass here.  What DOES cover them indirectly is the scene-graph walk
       below: an orphaned display object still shows up as a child somewhere.
       If a leak is ever traced to one of those maps, expose them on the
       facade behind the existing autotest surface rather than widening this. */
    for (const k of Object.keys(R)) {
      const v = R[k];
      if (v instanceof Map || v instanceof Set) out['R.' + k] = v.size;
      else if (Array.isArray(v) && v.length) out['R.' + k] = v.length;
    }
    /* Scene graph: a pooled sprite that is created and never destroyed shows
       up here even when the pool that owns it looks stable. */
    const walk = (c, label, depth) => {
      if (!c || !c.children || depth > 2) return;
      out['gfx.' + label] = c.children.length;
      if (depth < 2) {
        c.children.forEach((ch, i) => {
          if (ch && ch.children && ch.children.length > 8) walk(ch, label + '/' + i, depth + 1);
        });
      }
    };
    try { if (R.app && R.app.stage) walk(R.app.stage, 'stage', 0); } catch (e) {}
    /* v2.3.1751: the closure-held per-entity pools, through the probe the note
       above asks for.  These are the maps this harness could not see, and
       monsterDisplays is churned by exactly the "lots of monster killing" the
       owner described. */
    try {
      if (R.poolSizesProbe) {
        const pools = R.poolSizesProbe();
        for (const k of Object.keys(pools)) out['pool.' + k] = pools[k];
      }
    } catch (e) { /* absent on an older bundle */ }
  }
  if (window.performance && performance.memory) out['heapMB'] = Math.round(performance.memory.usedJSHeapSize / 1048576);
  return out;
};
