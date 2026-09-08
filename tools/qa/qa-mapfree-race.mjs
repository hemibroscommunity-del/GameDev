/* ═══ A FREE THAT LANDS MID-LOAD MUST NOT LEAVE A HUSK BEHIND (v2.3.2344) ═══
 *
 * freeZoneMap deletes the zone from `_residentZoneMaps` and then calls
 * Assets.unload(url).  When the map's Assets.load is STILL IN FLIGHT, Pixi's
 * Loader.unload does not miss: it awaits the pending load and destroys the
 * texture it resolves with (pixi.js/lib/assets/loader/Loader.mjs, unload).
 * The load's own continuation then ran anyway -- Assets.load Cache.set the
 * destroyed texture (the free's Cache.remove had run BEFORE anything landed),
 * and preloadStartZoneMap's .then put the zone back into the resident set.
 * Next entry: the gate sees "resident", arms no overlay, and the ground paints
 * from a destroyed source.
 *
 * Reachable without contrivance: the farm kicks preloadZoneAssets('farm_home')
 * un-awaited and the return tile frees it inside the download window; any
 * spoke entered under the gate's 15s cap is left with its load in flight.
 *
 * THIS PIN DRIVES THE REAL PIXI ASSETS + LOADER AND THE REAL tiledMaps.js in
 * node -- no browser, no fetch.  Only the load-parser is a stand-in: a short
 * async load resolving a texture-shaped object whose unload destroys it, the
 * same contract loadTextures has.  Nothing in the ordering under test lives in
 * the parser; it lives in Assets/Loader and in tiledMaps, both of which are the
 * shipped code.  Not a millisecond is asserted: the overlap is created by
 * waiting for the load to be IN the loader's promiseCache, not by a timer.
 *
 *   node tools/qa/qa-mapfree-race.mjs        (exit 0 = green)
 *
 * Mutation-tested: RED on the pre-v2.3.2344 tiledMaps.js (resident=true and a
 * destroyed texture in the cache), GREEN with the guard. */

globalThis.document = { baseURI: 'http://localhost/' }; /* path.toAbsolute reads it */
globalThis.window = globalThis;

const { Assets } = await import('pixi.js');
await Assets.init({ skipDetections: true });

/* the stand-in parser: same load/unload contract as Pixi's texture parser */
Assets.loader.parsers.length = 0;
Assets.loader.parsers.push({
  name: 'qa-fake-map', extension: { type: 'load-parser' }, test: () => true,
  load: () => new Promise((r) => setTimeout(() => r({
    destroyed: false, source: {},
    destroy() { this.destroyed = true; },
  }), 30)),
  unload: (tex) => { tex.destroy(); },
});

const M = await import(new URL('../../src/rendering/tiledMaps.js', import.meta.url));
const ZONE = 'farm_home';
const URL_ = M.IMAGE_ZONE_MAPS[ZONE];
if (!URL_) { console.error('FAIL: no image map for', ZONE); process.exit(2); }

let fails = 0;
function check(ok, label) {
  console.log((ok ? 'ok   ' : 'FAIL ') + label);
  if (!ok) fails++;
}

/* 1. load + free overlap: start the load, wait until it is IN the loader's
      promiseCache (i.e. genuinely pending), then free. */
const loadP = M.preloadStartZoneMap(ZONE);
while (!Object.keys(Assets.loader.promiseCache).length) await new Promise((r) => setImmediate(r));
const freeP = M.freeZoneMap(ZONE);
const tex = await loadP;
await freeP;
await new Promise((r) => setTimeout(r, 60)); /* let every continuation drain */

check(M.isZoneMapResident(ZONE) === false, 'zone is NOT resident after a free that landed mid-load');
check(!(tex && tex.destroyed), 'preloadStartZoneMap did not hand back a destroyed texture');
const cached = Assets.cache.has(URL_) ? Assets.cache.get(URL_) : null;
check(!(cached && cached.destroyed), 'Assets.cache holds no destroyed texture for the map');

/* 2. the next entry is a genuine miss that fetches a LIVE map and re-arms the
      resident set -- the guard must not have wedged the cache. */
const tex2 = await M.preloadStartZoneMap(ZONE);
check(!!tex2 && !tex2.destroyed, 'a later entry loads a live texture again');
check(M.isZoneMapResident(ZONE) === true, '...and the zone is resident after it');
check(Assets.cache.has(URL_) && Assets.cache.get(URL_) === tex2, '...and the cache holds that live texture');

/* 3. control: an ordinary free of a RESIDENT map still clears it. */
await M.freeZoneMap(ZONE);
check(M.isZoneMapResident(ZONE) === false, 'control: a plain free of a resident map clears the resident set');
check(!Assets.cache.has(URL_), 'control: ...and the cache entry');

console.log(fails ? `\n${fails} FAILED` : '\nqa-mapfree-race: all green');
process.exit(fails ? 1 : 0);
