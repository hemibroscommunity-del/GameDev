/* The sword sounds like what it landed in, and the FIRST blow makes a sound.
 *
 * v2.3.2452.  Two owner reports, one file:
 *   "I prefer more of a fleshy sound when the sword hits... Only for fleshy
 *    monsters though.  Like fire goblin, slime are fleshy.  Bony is mummy."
 *   "the first swing does not register the monster hit sound."
 *
 * Both failures are SILENT ones — a wrong-but-present sample and a missing
 * sample are equally invisible to lint, to the build, and to every existing
 * suite.  So this decodes the real files out of the real bundle and checks
 * the three things that can actually regress:
 *
 *   1. ROUTING — swordHit(opts, kind) reaches the sample the material table
 *      promises, for every kind, through the real function (play() is stubbed
 *      to record, not faked at a higher level).
 *   2. LEVEL — the three hit samples are recorded 4.4x apart, so the routing
 *      is worthless if the gain table does not level them: a correctly-routed
 *      fleshy hit that is 4x too quiet reads as the sound failing to play,
 *      which is report #2 wearing report #1's clothes.  Measured by decoding
 *      each file and comparing peak-window RMS * its gain.
 *   3. PRELOAD — loadCriticalSfx() actually decodes the combat-critical
 *      samples, so the first swing of a cold session is not the one that
 *      kicks the fetch.
 *
 *   node tools/qa/mp/mp-hitsound.mjs        # needs dist/ built
 */
import * as H from './harness.mjs';

const WEB = 8091;
const srv = await H.serveDist(WEB);
const b = await H.launch();
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

try {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${WEB}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!(window.BT_AUDIO && window.BT_AUDIO.SFX_MANIFEST), null, { timeout: 30000 });

  /* ── 1. ROUTING ───────────────────────────────────────────────────────── */
  const routed = await p.evaluate(() => {
    const A = window.BT_AUDIO;
    const seen = [];
    const real = A.play;
    A.play = function (key, opts) { seen.push({ key: key, vol: opts && opts.vol }); return null; };
    /* Every kind HIT_MATERIALS can produce, plus the unknown-material path. */
    for (const kind of ['goo', 'ember', 'flesh', 'bone', 'stone', 'wat', undefined]) {
      A.swordHit({ vol: 0.55 }, kind);
    }
    A.play = real;
    return { seen: seen, table: A.HIT_KEY_BY_MATERIAL, gains: A.HIT_KEY_GAIN };
  });

  const K = routed.seen.map((s) => s.key);
  /* The owner named these two directly. */
  ok(K[0] === 'monster-hit', `slime/goo -> fleshy monster-hit (got ${K[0]})`);
  ok(K[1] === 'monster-hit', `fire goblin/ember -> fleshy monster-hit (got ${K[1]})`);
  ok(K[3] === 'sword-hit3', `mummy/bone -> dry sword-hit3 (got ${K[3]})`);
  /* And the rest of the table. */
  ok(K[2] === 'monster-hit', `players+NPCs/flesh -> fleshy monster-hit (got ${K[2]})`);
  ok(K[4] === 'sword-hit2', `rock/stone -> clang sword-hit2 (got ${K[4]})`);
  ok(K[5] === 'monster-hit', `unknown material falls back fleshy (got ${K[5]})`);
  ok(K[6] === 'monster-hit', `absent material falls back fleshy (got ${K[6]})`);
  /* Snow must NOT be in the table — the snowman plays its own thud and the
     melee call site skips it; an entry here would double up. */
  ok(!routed.table.snow, 'snow is absent from the hit table (snowman owns its own)');

  /* ── 2. LEVEL ─────────────────────────────────────────────────────────── */
  /* Decode each routed sample for real and compare loudness AFTER gain.
     The reference is sword-hit3 — the level the vol:0.55 call sites were
     tuned against before this change. */
  const lvl = await p.evaluate(async (gains) => {
    const A = window.BT_AUDIO;
    const ctx = new AudioContext();
    const out = {};
    for (const key of ['monster-hit', 'sword-hit3', 'sword-hit2']) {
      const r = await fetch(A.SFX_MANIFEST[key]);
      const buf = await ctx.decodeAudioData(await r.arrayBuffer());
      const ch = buf.getChannelData(0);
      const w = Math.floor(buf.sampleRate * 0.02);
      let best = 0, peak = 0;
      for (let i = 0; i < ch.length; i += w) {
        let s = 0, n = 0;
        for (let j = i; j < i + w && j < ch.length; j++) {
          s += ch[j] * ch[j]; n++;
          if (Math.abs(ch[j]) > peak) peak = Math.abs(ch[j]);
        }
        const rms = Math.sqrt(s / Math.max(1, n));
        if (rms > best) best = rms;
      }
      out[key] = { rms: best, peak: peak, gain: gains[key] };
    }
    return out;
  }, routed.gains);

  const ref = lvl['sword-hit3'].rms * lvl['sword-hit3'].gain;
  for (const key of ['monster-hit', 'sword-hit2']) {
    const got = lvl[key].rms * lvl[key].gain;
    const ratio = got / ref;
    ok(ratio > 0.7 && ratio < 1.4,
      `${key} is level-matched to sword-hit3 (${ratio.toFixed(2)}x, raw ${(lvl[key].rms / lvl['sword-hit3'].rms).toFixed(2)}x)`);
  }
  /* The whole point of the gain table: raw, the fleshy sample is far quieter
     than the one it replaces. If this ever stops being true the table is
     stale and the numbers above need re-measuring, not re-fitting. */
  const rawRatio = lvl['monster-hit'].rms / lvl['sword-hit3'].rms;
  ok(rawRatio < 0.6, `monster-hit really is the quiet upload raw (${rawRatio.toFixed(2)}x sword-hit3)`);
  /* And no sample clips at the level the call sites use. */
  for (const key of Object.keys(lvl)) {
    const outPeak = lvl[key].peak * 0.55 * (await p.evaluate(() => window.BT_AUDIO.HIT_GAIN)) * lvl[key].gain;
    ok(outPeak < 1, `${key} does not clip at vol 0.55 (peak ${outPeak.toFixed(2)})`);
  }

  /* ── 3. PRELOAD ───────────────────────────────────────────────────────── */
  const pre = await p.evaluate(async () => {
    const A = window.BT_AUDIO;
    /* A cold context, exactly as the first gesture builds one. */
    A._samples = {};
    A._sampleLoading = {};
    A._loadedCriticalSfx = false;
    if (!A.ctx) A.init();
    const list = A.COMBAT_CRITICAL_SFX.slice();
    A.loadCriticalSfx();
    /* loadSample resolves after decode; give the handful a real window. */
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      if (list.every((k) => A._samples[k])) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    return { list: list, have: list.filter((k) => !!A._samples[k]), idem: (A.loadCriticalSfx(), true) };
  });

  ok(pre.list.includes('monster-hit') && pre.list.includes('sword-hit3') && pre.list.includes('sword-hit2'),
    'every routed hit sample is on the combat-critical list');
  ok(pre.have.length === pre.list.length,
    `all ${pre.list.length} combat-critical samples decode before first use (${pre.have.length} ready)`);

  /* The list must not quietly grow into the whole manifest — that would put
     v2.3.2330's 1.1 MB back onto the loading gate's critical path. */
  const bytes = await p.evaluate(async () => {
    const A = window.BT_AUDIO;
    let total = 0;
    for (const k of A.COMBAT_CRITICAL_SFX) {
      const r = await fetch(A.SFX_MANIFEST[k]);
      total += (await r.arrayBuffer()).byteLength;
    }
    return total;
  });
  ok(bytes < 150000, `combat-critical preload stays small (${(bytes / 1024).toFixed(0)} KB < 150 KB)`);

  ok(errs.length === 0, `no page errors (${errs.slice(0, 2).join(' | ')})`);
} finally {
  await b.close();
  srv.close();
}
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
