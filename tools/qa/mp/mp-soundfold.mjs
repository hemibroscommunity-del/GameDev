/* ═══ v2.3.3706: A STEREO SOUND WHOSE TWO SIDES ARE ONE IS KEPT AS ONE ═══
 *
 * The owner, 2026-10-28: "Memory seems to be the persistent bottleneck in
 * terms of performance in this game.  Getting that to run as low as possible
 * without sacrificing performance is the goal."
 *
 * Six of the game's stereo sound files carry one signal on both sides, and a
 * decoded sound is held as raw float32, one array a side: after its decode
 * such a buffer is now kept as one channel (src/data/soundFold.js), which Web
 * Audio plays out of both speakers.
 *
 * Two phones in the world, one as the game is and one `?stereosfx`:
 *   1. every sound loaded on both (guard);
 *   2. exactly the six are kept as one channel, and none on the other phone;
 *   3. the sound held decoded is that much less (BT_AUDIO.decodedMB, the
 *      game's own count);
 *   4. EACH SOUNDS THE SAME: each of the six decoded again from its file as
 *      stereo and both played through an offline context of two channels --
 *      left and right the same as the stereo file's, to the bit for the five
 *      whose sides are equal, within 60 dB for fish-reel;
 *   5. each plays through the game's own player with no error;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs soundfold
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FOLD = ['coin-pickup', 'flip-lose', 'footstep-v2', 'pan-sizzle', 'quest-complete', 'fish-reel'];

const waitSounds = (P) => P.page.evaluate(async (keys) => {
  const t0 = Date.now();
  const A = () => window.BT_AUDIO;
  while (Date.now() - t0 < 60000) {
    const a = A();
    if (a && a._samples && keys.every((k) => a._samples[k]) && !Object.keys(a._sampleLoading || {}).length) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const a = A();
  return {
    have: keys.filter((k) => a && a._samples && a._samples[k]),
    loading: a ? Object.keys(a._sampleLoading || {}).length : -1,
    decoded: a && a.decodedMB ? a.decodedMB() : null,
    fold: window.__btSoundFold ? window.__btSoundFold() : null,
    ch: keys.map((k) => (a && a._samples[k] ? a._samples[k].numberOfChannels : 0)),
  };
}, FOLD);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Foldear', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'sfxcache=0' });   /* v2.3.3735: every sound decoded, the sound cache off (on by default): this reads decoded buffers of sounds it does not pin */
  const B = await H.newPlayer(browser, { name: 'Stereoear', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'stereosfx&sfxcache=0' });
  const errs = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    const a = await waitSounds(A);
    const b = await waitSounds(B);
    rec.ok(`1. every one of the six loaded on both phones (${a.have.length}, ${b.have.length}) (guard)`, a.have.length === FOLD.length && b.have.length === FOLD.length, { a: a.have, b: b.have });

    /* 2. exactly the six kept as one channel */
    const folded = (a.fold && a.fold.folded) || [];
    const extra = folded.filter((k) => !FOLD.includes(k));
    const missing = FOLD.filter((k) => !folded.includes(k) && !folded.some((f) => f === k));
    rec.ok(`2. exactly the six kept as one channel (${folded.join(', ')}), ${a.fold && a.fold.savedMB} MB; none with ?stereosfx (${(b.fold && b.fold.folded || []).length})`,
      !!a.fold && a.fold.on && missing.length === 0 && extra.length === 0 && a.ch.every((c) => c === 1)
      && !!b.fold && !b.fold.on && b.fold.folded.length === 0 && b.ch.every((c) => c === 2), { a, b, extra, missing });

    /* 3. the sound held decoded, the game's own count */
    const less = b.decoded && a.decoded ? +(b.decoded.mb - a.decoded.mb).toFixed(1) : null;
    rec.ok(`3. the sound held decoded ${a.decoded && a.decoded.mb} MB against ${b.decoded && b.decoded.mb} with ?stereosfx: ${less} MB less`,
      less != null && less >= 2.5, { a: a.decoded, b: b.decoded });

    /* 3b. the fold never hands the page a sound's own samples: getChannelData
       would (each channel's whole data then counted as one of the page's
       buffers -- the first cut, which read both sides that way, took
       mp-membudget's `buffers` line from 24 to 42 MB).  The page's buffers
       after two collections, beside the stereo phone's (read before step 4,
       which reads the samples itself) */
    const bufMB = async (P) => {
      const cdp = await P.ctx.newCDPSession(P.page);
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      await P.page.waitForTimeout(300);
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      const hu = await cdp.send('Runtime.getHeapUsage').catch(() => ({}));
      await cdp.detach().catch(() => {});
      return hu.backingStorageSize != null ? +(hu.backingStorageSize / 1048576).toFixed(1) : null;
    };
    const [ba, bb] = [await bufMB(A), await bufMB(B)];
    rec.ok(`3b. ...and no sound's own samples handed to the page: its raw buffers ${ba} MB beside the stereo phone's ${bb} (within 2 MB)`,
      ba != null && bb != null && ba <= bb + 2, { ba, bb });

    /* 4. each sounds the same: the kept buffer and the file decoded again as
       stereo, both played through two channels */
    const same = await A.page.evaluate(async (keys) => {
      const BA = window.BT_AUDIO, out = [];
      for (const k of keys) {
        const kept = BA._samples[k];
        const url = BA.SFX_MANIFEST ? BA.SFX_MANIFEST[k] : null;
        const tag = BA._sampleTag && BA._sampleTag[k];
        const src = url || (tag ? String(tag).replace(/@low$/, '') : null);
        if (!kept || !src) { out.push({ k, err: 'no buffer or file' }); continue; }
        const ab = await (await fetch(src)).arrayBuffer();
        const OC = window.OfflineAudioContext;
        const dec = new OC(2, 1, kept.sampleRate);
        const st = await dec.decodeAudioData(ab);
        const render = async (buf) => {
          const oc = new OC(2, buf.length, buf.sampleRate);
          const s = oc.createBufferSource();
          s.buffer = buf; s.connect(oc.destination); s.start(0);
          const r = await oc.startRendering();
          return [r.getChannelData(0), r.getChannelData(1)];
        };
        const [kl, kr] = await render(kept);
        const [sl, sr] = await render(st);
        let worst = 0, sig = 0, exact = true;
        const n = Math.min(kl.length, sl.length);
        for (let i = 0; i < n; i++) {
          const dl = kl[i] - sl[i], dr = kr[i] - sr[i];
          if (dl !== 0 || dr !== 0) exact = false;
          worst += dl * dl + dr * dr;
          sig += sl[i] * sl[i] + sr[i] * sr[i];
        }
        const db = sig > 0 ? 10 * Math.log10(Math.max(worst, 1e-30) / sig) : null;
        out.push({ k, ch: kept.numberOfChannels, stereoCh: st.numberOfChannels, n, exact, db: db == null ? null : +db.toFixed(1) });
      }
      return out;
    }, FOLD);
    rec.ok(`4. each sounds the same as its stereo file, left and right: ${same.map((x) => `${x.k} ${x.exact ? 'to the bit' : x.db + ' dB'}`).join(', ')}`,
      same.length === FOLD.length && same.every((x) => !x.err && x.ch === 1 && x.stereoCh === 2 && (x.exact || (x.db != null && x.db <= -60))), same);

    /* 5. each plays through the game's own player */
    const played = await A.page.evaluate((keys) => {
      const BA = window.BT_AUDIO, out = [];
      for (const k of keys) {
        try { BA.play(k, { vol: 0.01 }); out.push({ k, ok: true }); } catch (e) { out.push({ k, ok: false, e: String(e && e.message || e) }); }
      }
      return out;
    }, FOLD);
    await A.page.waitForTimeout(1500);
    rec.ok('5. each plays through the game\'s own player with no error', played.every((x) => x.ok), played);
    rec.ok('6. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
