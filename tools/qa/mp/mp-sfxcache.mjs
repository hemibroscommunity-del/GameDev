/* ═══ v2.3.3714: DECODED SOUND HELD ONLY WHILE IT IS NEEDED (`?sfxcache`) ═══
 *
 * The owner: "The game needs to be extremely memory efficient."  Every sound
 * effect was decoded on the loading screen and held for the session (~27 MB,
 * the memory check's `sound` line).  With `?sfxcache` (data/sfxCache.js) only
 * the pinned sounds -- everything a fight, a walk or a tap plays -- are
 * decoded up front; the rest keep their file's bytes and are decoded on their
 * first play into a cache of BUDGET_MB, the least recently played let go
 * first.
 *
 * Two phones in the world's BroTown, one `?sfxcache=0` (the game as it was)
 * and one as the game is (v2.3.3760: the cache on by default):
 *   1. the sounds loaded on both: every one decoded on the first; every
 *      pinned one decoded on the second, and every other file's bytes held
 *      (guard);
 *   2. the sound held decoded (BT_AUDIO.decodedMB, the game's own count), each
 *      way, and how much less with the switch -- each sound's decoded size
 *      written to out/sfxcache.json;
 *   3. EVERY SOUND PLAYS ONCE on the cache's phone through the game's own
 *      play(): each one not pinned starts cold, decoded on its play, and
 *      starts -- none dropped, none late, none failed;
 *   4. the delays: each cold sound's, from the ask to its start, under the
 *      aim (COLD_MS, 30 ms) -- the slowest named;
 *   5. after every sound has played, the cache is within its budget: the
 *      decoded sounds not pinned BUDGET_MB or under, the least recently
 *      played let go, and a sound let go plays again (cold, and starts);
 *   6. a family decoded ahead: the line's cast warms the bite, the reel and
 *      the splash before they are asked for (PREFETCH.family); the farm's
 *      sounds on entering it (PREFETCH.zone, through startZoneAmbient);
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs sfxcache
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* wait until nothing is loading and every key wanted is in */
const settle = (P, cache) => P.page.evaluate(async (cache) => {
  const t0 = Date.now();
  const A = () => window.BT_AUDIO;
  /* a gesture: the context is made in one */
  try { if (A() && !A().ctx && A().unlock) A().unlock(); } catch (e) { /* */ }
  while (Date.now() - t0 < 90000) {
    const a = A();
    if (a && a.ctx && a._loadedManifest) {
      const keys = Object.keys(a.SFX_MANIFEST);
      const loading = Object.keys(a._sampleLoading || {}).length + Object.keys(a._sfxBytesP || {}).length;
      const want = cache ? keys.filter((k) => a._sfxPinned[k]) : keys;
      if (!loading && want.every((k) => a._samples[k])) break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  const a = A();
  const keys = a ? Object.keys(a.SFX_MANIFEST) : [];
  const urls = [...new Set(keys.map((k) => a.SFX_MANIFEST[k]))];
  return {
    keys: keys.length,
    decoded: keys.filter((k) => a._samples[k]).length,
    pinned: keys.filter((k) => a._sfxPinned[k]).length,
    pinnedIn: keys.filter((k) => a._sfxPinned[k] && a._samples[k]).length,
    filesHeld: urls.filter((u) => a._sfxBytes[u]).length,
    unpinnedFiles: (() => {
      const pinUrl = new Set(keys.filter((k) => a._sfxPinned[k]).map((k) => a.SFX_MANIFEST[k]));
      return new Set(keys.filter((k) => !a._sfxPinned[k] && !pinUrl.has(a.SFX_MANIFEST[k])).map((k) => a.SFX_MANIFEST[k])).size;
    })(),
    mb: a.decodedMB ? a.decodedMB() : null,
    cache: window.__btSfxCache ? window.__btSfxCache() : null,
  };
}, cache);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Allheld', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'sfxcache=0' });   /* v2.3.3760: the off-ramp (on is the default) */
  const B = await H.newPlayer(browser, { name: 'Cacheear', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });   /* the default: on */
  const errs = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    await A.page.mouse.click(195, 300).catch(() => {});
    await B.page.mouse.click(195, 300).catch(() => {});
    const a = await settle(A, false);
    const b = await settle(B, true);
    rec.ok(`1. every sound decoded on the first phone (${a.decoded}/${a.keys}); on the cache's, every pinned one (${b.pinnedIn}/${b.pinned}) and every other file's bytes held (${b.filesHeld} files, ${b.cache && b.cache.filesMB} MB) (guard)`,
      a.decoded === a.keys && !(a.cache && a.cache.on) && b.cache && b.cache.on && b.pinnedIn === b.pinned && b.filesHeld >= b.unpinnedFiles, { a, b });

    /* 2. the sound held decoded, each way; each sound's decoded size */
    const sizes = await A.page.evaluate(() => {
      const BA = window.BT_AUDIO, out = [];
      for (const k of Object.keys(BA.SFX_MANIFEST)) {
        const s = BA._samples[k];
        out.push({ k, pinned: !!BA._sfxPinned[k], mb: s ? +(BA._bufBytes(s) / 1048576).toFixed(3) : null, ch: s ? s.numberOfChannels : 0, rate: s ? s.sampleRate : 0, s: s ? +s.duration.toFixed(2) : 0 });
      }
      return out.sort((x, y) => (y.mb || 0) - (x.mb || 0));
    });
    const less = a.mb && b.mb ? +(a.mb.mb - b.mb.mb).toFixed(1) : null;
    rec.ok(`2. the sound held decoded: ${a.mb && a.mb.mb} MB as the game is, ${b.mb && b.mb.mb} MB with the cache (pinned ${b.cache && b.cache.pinnedMB} MB): ${less} MB less`,
      less != null && less >= 3.5, { a: a.mb, b: b.mb, biggest: sizes.slice(0, 12) });

    /* 3-4. every sound played once on the cache's phone, one at a time */
    const played = await B.page.evaluate(async () => {
      const BA = window.BT_AUDIO, out = [];
      /* counted from here: a sound asked for before its own decode on the
         loading screen is the loading screen's, not the cache's */
      const st = BA._sfxStat();
      st.late = 0; st.failed = 0; st.lateKeys = []; st.coldMs = Object.create(null);
      /* this box's page answers a decode seconds late behind its frames (step
         4): the late line raised, so each play is seen to start */
      BA.SFX_LATE_MS = 20000;
      for (const k of Object.keys(BA.SFX_MANIFEST)) {
        const was = !!BA._samples[k];
        const t0 = performance.now();
        const h = BA.play(k, { vol: 0.02, duration: 0.05 });
        let started = !!(h && h.src && !h.cold), ms = 0;
        if (h && h.cold) {
          while (performance.now() - t0 < 20000 && !h.real) await new Promise((r) => setTimeout(r, 2));
          started = !!h.real;
          ms = BA._sfxStat().coldMs[k];
        }
        out.push({ k, warm: was, cold: !!(h && h.cold), started, ms });
        await new Promise((r) => setTimeout(r, 60));
      }
      return { out, cache: window.__btSfxCache() };
    });
    const notStarted = played.out.filter((x) => !x.started);
    const cold = played.out.filter((x) => x.cold);
    rec.ok(`3. every sound (${played.out.length}) plays once through the game's own play(): ${cold.length} of them cold, decoded on their play; all started (late ${played.cache.late}, failed ${played.cache.failed})`,
      notStarted.length === 0 && cold.length >= 10 && played.cache.late === 0 && played.cache.failed === 0, { notStarted, lateKeys: played.cache.lateKeys });
    /* 3b. at its level: a cold play starts exactly as a warm one does -- the
       same gain, rate, offset and length -- each of five sounds played cold
       (let go first) and then warm, with the same asks */
    const level = await B.page.evaluate(async () => {
      const BA = window.BT_AUDIO, out = [];
      const keys = Object.keys(BA.SFX_MANIFEST).filter((k) => !BA._sfxPinned[k] && !BA._sfxPinnedTag(BA.SFX_MANIFEST[k] + (BA._lowRate(k) ? '@low' : ''))).slice(0, 5);
      const orig = BA._startOn;
      let seen = null;
      BA._startOn = function (buf, o, g) {
        const r = orig.call(this, buf, o, g);
        seen = r ? { vol: +r.gain.gain.value.toFixed(4), rate: +r.src.playbackRate.value.toFixed(4), off: o.offset || 0, dur: o.duration, delay: o.delay || 0 } : null;
        return r;
      };
      try {
        for (const k of keys) {
          const t = BA._sampleTag[k];
          if (t && BA._sfxLru) { BA._sfxLru.remove(t); BA._sfxDrop(t); }
          const ask = { vol: 0.123, rate: 1.07, offset: 0.02, duration: 0.15 };
          seen = null;
          const h = BA.play(k, Object.assign({}, ask));
          const t0 = performance.now();
          while (h && h.cold && !h.real && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 2));
          const cold = seen;
          seen = null;
          const h2 = BA.play(k, Object.assign({}, ask));
          out.push({ k, wasCold: !!(h && h.cold), warm2: !!(h2 && !h2.cold), cold, warm: seen });
        }
      } finally { BA._startOn = orig; }
      return out;
    });
    const sameLevel = level.every((x) => x.wasCold && x.warm2 && x.cold && x.warm && JSON.stringify(x.cold) === JSON.stringify(x.warm) && x.cold.vol === 0.123);
    rec.ok(`3b. at its level: ${level.length} sounds played cold and then warm start with the same gain, rate, offset and length (${level.map((x) => x.k).join(', ')})`,
      level.length === 5 && sameLevel, level);

    /* 4. the delays.  In the game's page on this box the ask waits behind
       its frames (a software renderer: a few frames a second, TRAPS §200),
       so that reading is the box's, shown for what it is; the cold delay
       itself is the decode: every sound not pinned decoded from its held
       bytes as the cache does it (the Blob's bytes, decodeAudioData at the
       game's rate, the stereo fold), in a page of the same origin with no
       game in it, each five times, its median kept. */
    const slow = cold.slice().sort((x, y) => y.ms - x.ms);
    const ms = cold.map((x) => x.ms).sort((x, y) => x - y);
    const med = ms.length ? ms[ms.length >> 1] : null;
    const keysCold = await B.page.evaluate(() => Object.keys(window.BT_AUDIO.SFX_MANIFEST).filter((k) => !window.BT_AUDIO._sfxPinned[k]).map((k) => [k, window.BT_AUDIO.SFX_MANIFEST[k], window.BT_AUDIO._lowRate(k)]));
    const bench = await B.ctx.newPage();
    let dec = [];
    try {
      await bench.goto(`http://localhost:${webPort}/deploy-scores.html`, { waitUntil: 'domcontentloaded' });
      dec = await bench.evaluate(async (keys) => {
        const ctx = new AudioContext();
        const low = new OfflineAudioContext(1, 1, 24000);
        const out = [];
        for (const [k, url, isLow] of keys) {
          const blob = await (await fetch(url)).blob();
          const t = [];
          for (let i = 0; i < 5; i++) {
            const t0 = performance.now();
            const ab = await blob.arrayBuffer();
            await (isLow ? low : ctx).decodeAudioData(ab);
            t.push(performance.now() - t0);
          }
          t.sort((x, y) => x - y);
          out.push({ k, ms: +t[2].toFixed(1), worst: +t[4].toFixed(1), kb: Math.round(blob.size / 1024) });
        }
        await ctx.close();
        return out.sort((a, b) => b.ms - a.ms);
      }, keysCold);
    } finally { await bench.close().catch(() => {}); }
    const aim = played.cache.coldAimMs;
    const over = dec.filter((d) => d.ms > aim);
    rec.ok(`4. the cold delay, each sound not pinned decoded from its held bytes: slowest ${dec.slice(0, 4).map((d) => d.k + ' ' + d.ms).join(', ')} ms -- every one under ${aim} ms (in the game's page on this box, behind its few frames a second: median ${med} ms, slowest ${slow[0] && slow[0].ms})`,
      dec.length >= 10 && over.length === 0, { over, dec: dec.slice(0, 12), inGame: slow.slice(0, 8) });

    /* 5. within the budget; one let go plays again */
    const after = await B.page.evaluate(async () => {
      const BA = window.BT_AUDIO, c = window.__btSfxCache();
      const gone = Object.keys(BA.SFX_MANIFEST).filter((k) => !BA._sfxPinned[k] && !BA._samples[k]);
      let again = null;
      if (gone.length) {
        const k = gone[0], h = BA.play(k, { vol: 0.02, duration: 0.05 }), t0 = performance.now();
        while (h && h.cold && !h.real && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 2));
        again = { k, cold: !!(h && h.cold), started: !!(h && (h.real || !h.cold)) };
      }
      return { c, gone: gone.length, again, mb: BA.decodedMB() };
    });
    rec.ok(`5. after every sound has played, the cache holds ${after.c.cachedMB} MB not pinned (budget ${after.c.budgetMB}), ${after.c.evicted} let go -- ${after.gone} sounds now not held; one let go (${after.again && after.again.k}) plays again`,
      after.c.cachedMB <= after.c.budgetMB + 0.01 && after.c.lruMB <= after.c.budgetMB && (after.gone === 0 || (after.again && after.again.cold && after.again.started)), after);

    /* 6. decoded ahead: a family's first sound, a zone (fishing-reeling: the
       reel's clicks; the reel's loop itself is pinned) */
    const ahead = await B.page.evaluate(async () => {
      const BA = window.BT_AUDIO;
      /* let the fishing family and the farm's go first */
      const fam = ['fishing-reeling'];
      const farm = ['farm-hoe', 'farm-water', 'farm-mould', 'farm-harvest'];
      for (const k of fam.concat(farm, ['river-water'])) { const t = BA._sampleTag[k]; if (t && BA._sfxLru) { BA._sfxLru.remove(t); BA._sfxDrop(t); } }
      const before = fam.concat(farm).filter((k) => BA._samples[k]);
      /* the river under a cast (its loop's first start in the session) warms the reel */
      if (BA._sfxLoopSeen) delete BA._sfxLoopSeen['river-water'];
      BA.startSfxLoop('river-water', 0.01);
      BA._sfxZonePrefetch('farm_home');
      const t0 = performance.now();
      while (performance.now() - t0 < 8000 && !fam.concat(farm).every((k) => BA._samples[k])) await new Promise((r) => setTimeout(r, 10));
      BA.stopSfxLoop('river-water');
      return { before, fam: fam.filter((k) => BA._samples[k]), farm: farm.filter((k) => BA._samples[k]) };
    });
    rec.ok(`6. decoded ahead: the river under a cast warms the reel (${ahead.fam.join(', ')}), entering the farm its sounds (${ahead.farm.length}/4)`,
      ahead.before.length === 0 && ahead.fam.length === 1 && ahead.farm.length === 4, ahead);

    rec.ok(`7. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));

    const out = join(process.cwd(), 'tools/qa/mp/out');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'sfxcache.json'), JSON.stringify({ off: a.mb, on: b.mb, cache: after.c, sizes, played: played.out, decodeMs: dec }, null, 1));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
