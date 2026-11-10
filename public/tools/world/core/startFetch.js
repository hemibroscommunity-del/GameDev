/* ═══ v2.3.4370: THE GROUND WORKER'S START LISTS, WITH A TIME LIMIT AND A RETRY ═══
 *
 * The Wheel's ground worker (ground-worker.js) fetches a few files as it
 * starts: the bake (objects.bin, the overview, the lands), the objects list
 * and the ground list.  Until now each was one bare fetch with no time limit:
 * a Wi-Fi blip as the world opened lost the buildings, doors or ground
 * pictures for the whole visit, and a fetch that hung held the world on flat
 * sea until the browser gave up (state-machine sweep 2026-11-03, V11 T1-12;
 * TRAPS §123's rule had been applied to the ground pictures only).
 *
 * startFetch(url, read, opts): fetch `url` (a string, or a function making a
 * fresh one each try) and hand the response to `read`, which returns what the
 * caller wants (the bytes, the JSON).  Each try -- the download AND its body
 * -- gets `ms` before it is cut; a try that throws, is cut, or answers 5xx is
 * tried again after `pauses[n]`, up to `tries` times; the last failure is
 * thrown.  A 404 is handed to `read` like any answer: `read` decides.
 *
 * The time limit is generous on purpose (20 s): objects.bin is ~0.7 MB, and a
 * slow phone that downloads it in 14 s today must never be cut and retried
 * into a failure.  It is for the hang, not the slow line.
 *
 * No imports, so node can test it with a stand-in fetch
 * (server/test/ground-start.test.mjs).
 */
export const START_FETCH = Object.freeze({ tries: 3, ms: 20000, pauses: [1000, 2000] });

export async function startFetch(url, read, opts) {
  const o = opts || {};
  const tries = o.tries || START_FETCH.tries, ms = o.ms || START_FETCH.ms;
  const pauses = o.pauses || START_FETCH.pauses;
  const get = o.fetch || ((u, init) => fetch(u, init));
  let last = null;
  for (let n = 0; n < tries; n++) {
    if (n > 0) await new Promise((r) => setTimeout(r, pauses[Math.min(n - 1, pauses.length - 1)] || 0));
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    let timer = null;
    const cut = new Promise((_, rej) => { timer = setTimeout(() => { if (ac) ac.abort(); rej(new Error('timed out')); }, ms); });
    try {
      const u = typeof url === 'function' ? url() : url;
      const job = (async () => {
        const r = await get(u, Object.assign({}, o.init || {}, ac ? { signal: ac.signal } : {}));
        if (r && r.status >= 500) throw new Error(`${r.status}`);
        return read(r);
      })();
      job.catch(() => {});   /* a cut try's own rejection, after the race is over */
      return await Promise.race([job, cut]);
    } catch (e) {
      last = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw last || new Error('failed');
}
