/* The sword sounds like what it landed in, and the FIRST blow makes a sound.
 *
 * v2.3.2452.  Two owner reports, one file:
 *   "I prefer more of a fleshy sound when the sword hits... Only for fleshy
 *    monsters though.  Like fire goblin, slime are fleshy.  Bony is mummy."
 *   "the first swing does not register the monster hit sound."
 *
 * v2.3.3001: "modify hit sound effects based on material type ... against
 * monsters (arrow, melee, magic hit sound for snowmen vs slime etc should all
 * sound like their material type)".  The three-sample mixer is a VOICE per
 * material now (BT_AUDIO.HIT_VOICES, a body and a texture), so this checks
 * the voices:
 *
 *   1. ROUTING -- materialHit (and swordHit, the old name) reaches the samples
 *      each material's voice promises, through the real function (play() is
 *      stubbed to record, not faked at a higher level): WHOLE when its samples
 *      are in, and TODAY'S SOUND (`fb`) when a texture is not -- outside the
 *      Wheel, whose footstep clips carry most of them -- never silence.  The
 *      mummy stays bony (sword-hit3 alone).
 *   2. LEVEL -- every voice, both alternates, RENDERED for real through Web
 *      Audio (an OfflineAudioContext, the same slices, rates, delays, gains and
 *      fades the game plays) at the arrow's 0.6, the loudest call: no clipping
 *      (there is no limiter), and each within reach of sword-hit3 at the same
 *      level -- the reference every hit has been tuned against since v2.3.2452,
 *      measured the way the tables were tuned: the mean of the plain and the
 *      A-weighted (by ear) loudness.
 *      The monster balls' breaks (SHOT_SOUNDS) on you, likewise.
 *   3. PRELOAD -- loadCriticalSfx() actually decodes the combat-critical
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

/* What each material's voice is made of, and what it falls back to. */
const WHOLE = {
  flesh: ['monster-hit'], bone: ['sword-hit3'],
  goo: ['monster-hit', 'step-mud'], ember: ['monster-hit', 'cook-success'],
  stone: ['mine-strike', 'step-stone'], snow: ['snowman-hit', 'step-snow'],
  mud: ['step-mud', 'monster-hit'], wet: ['monster-hit', 'fish-on-hook'],
};
const TODAY = {
  flesh: 'monster-hit', bone: 'sword-hit3', goo: 'monster-hit', ember: 'monster-hit',
  stone: 'sword-hit2', snow: 'snowman-hit', mud: 'monster-hit', wet: 'monster-hit',
};

try {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${WEB}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!(window.BT_AUDIO && window.BT_AUDIO.SFX_MANIFEST && window.BT_AUDIO.HIT_VOICES), null, { timeout: 30000 });

  /* ── 1. ROUTING ───────────────────────────────────────────────────────── */
  const routed = await p.evaluate((mats) => {
    const A = window.BT_AUDIO;
    const real = A.play, realSamples = A._samples;
    const run = (have) => {
      const out = {};
      A._samples = {};
      for (const k of have) A._samples[k] = { duration: 2 };   /* "decoded": play() is stubbed */
      for (const m of mats.concat(['wat', undefined])) {
        const seen = [];
        A.play = function (key, opts) { seen.push({ key, vol: opts && opts.vol, offset: opts && opts.offset, duration: opts && opts.duration, delay: opts && opts.delay }); return null; };
        A.materialHit(m, { vol: 0.55 });
        out[String(m)] = { keys: seen.map((s) => s.key), how: A._lastHit && A._lastHit.how, calls: seen };
      }
      return out;
    };
    /* every sample in: the whole voices */
    const all = new Set();
    for (const m of mats) {
      const V = A.HIT_VOICES[m];
      for (const L of V.hit.concat(V.layer || [])) all.add(L[0]);
      if (V.fb) all.add(V.fb[0]);
    }
    const whole = run([...all]);
    /* only the manifest's: outside the Wheel, its footstep clips not in */
    const man = Object.keys(A.SFX_MANIFEST);
    const outside = run(man);
    /* nothing at all: a cold first blow */
    const cold = run([]);
    /* the old name still reaches the same voice */
    A._samples = {};
    for (const k of all) A._samples[k] = { duration: 2 };
    const old = [];
    A.play = function (key) { old.push(key); return null; };
    A.swordHit({ vol: 0.55 }, 'stone');
    A.play = real;
    A._samples = realSamples;
    return { whole, outside, cold, old, man, mats: Object.keys(A.HIT_VOICES) };
  }, Object.keys(WHOLE));

  ok(JSON.stringify(routed.mats.slice().sort()) === JSON.stringify(Object.keys(WHOLE).sort()),
    `the voices are the eight materials (${routed.mats.join(', ')})`);
  for (const [m, keys] of Object.entries(WHOLE)) {
    const got = routed.whole[m];
    ok(got && JSON.stringify(got.keys) === JSON.stringify(keys) && got.how === 'voice',
      `${m}: the whole voice, ${keys.join(' + ')} (got ${got ? got.keys.join(' + ') : 'nothing'}, ${got && got.how})`);
  }
  ok(routed.whole.bone.keys.length === 1 && routed.whole.bone.keys[0] === 'sword-hit3',
    'the mummy stays bony: bone is sword-hit3 alone ("Bony is mummy", v2.3.2452)');
  ok(routed.whole.wat.keys.join() === 'monster-hit' && routed.whole.undefined.keys.join() === 'monster-hit',
    'an unknown or absent material is flesh, as before');
  ok(routed.old.join(' + ') === 'mine-strike + step-stone', `swordHit (the old name) plays the same voice (${routed.old.join(' + ')})`);
  for (const [m, key] of Object.entries(TODAY)) {
    const got = routed.outside[m];
    /* a voice made only of manifest samples (the fire goblin's sizzle, the
       fishman's splash) is whole everywhere; one that needs a Wheel clip is
       today's sound outside the Wheel */
    const inMan = WHOLE[m].every((k) => routed.man.includes(k));
    const want = inMan ? WHOLE[m] : [key];
    ok(got && JSON.stringify(got.keys) === JSON.stringify(want),
      `outside the Wheel ${m} is ${inMan ? 'its whole voice (all in the manifest)' : "today's sound"}, ${want.join(' + ')} (got ${got ? got.keys.join(' + ') : 'nothing'})`);
    const c = routed.cold[m];
    ok(c && c.keys.length >= 1 && c.keys[0] === key, `cold, ${m} still ASKS for today's ${key}, so play() fetches it (got ${c ? c.keys.join(' + ') : 'nothing'})`);
  }
  ok(['goo', 'stone', 'snow', 'mud'].every((m) => !WHOLE[m].every((k) => routed.man.includes(k))),
    'the Wheel\'s footstep clips are NOT in the manifest (so the fallback above is the real outside-the-Wheel case)');
  /* the snowman's double hit is gone: his voice has no slime thud in it */
  ok(!routed.whole.snow.keys.includes('monster-hit') && !routed.outside.snow.keys.includes('monster-hit'), 'the snowman never plays the slime\'s thud');

  /* ── 2. LEVEL ─────────────────────────────────────────────────────────── */
  const lvl = await p.evaluate(async () => {
    const A = window.BT_AUDIO;
    const SR = 48000;
    const urlOf = (k) => A.SFX_MANIFEST[k] || ('/sfx/footstep/' + k + '.mp3');
    const dec = new AudioContext();
    const bufs = {};
    const need = new Set(['sword-hit3']);
    const tables = [];
    for (const m of Object.keys(A.HIT_VOICES)) {
      const V = A.HIT_VOICES[m];
      const n = Math.max(V.hit.length, (V.layer || []).length);
      for (let i = 0; i < n; i++) tables.push({ name: m + ' ' + 'AB'[i], hg: A.HIT_GAIN, vol: 0.6, layers: [V.hit[i % V.hit.length]].concat(V.layer ? [V.layer[i % V.layer.length]] : []) });
      if (V.fb) tables.push({ name: m + ' fb', hg: A.HIT_GAIN, vol: 0.6, layers: [V.fb] });
    }
    for (const s of Object.keys(A.SHOT_SOUNDS)) {
      const B = A.SHOT_SOUNDS[s];
      tables.push({ name: 'ball ' + s, hg: 1, vol: 1, shot: true, layers: B.layers });
      if (B.fb) tables.push({ name: 'ball ' + s + ' fb', hg: 1, vol: 1, shot: true, layers: [B.fb] });
    }
    for (const t of tables) for (const L of t.layers) need.add(L[0]);
    for (const k of need) {
      const r = await fetch(urlOf(k));
      bufs[k] = await dec.decodeAudioData(await r.arrayBuffer());
    }
    /* v2.3.3001: LOUDNESS THE WAY THE TABLES WERE TUNED -- the PROP_SOUNDS
       method (gameDisplay.js): the mean of the PLAIN and the A-WEIGHTED
       loudest-50-ms RMS, each against sword-hit3's.  Plain RMS alone counts
       a thud's bass, most of which a phone's speaker never makes, at full
       weight: by it the snowman's own thud -- the very sound he has made
       since v2.3.1124, `fb` here -- is 1.5x sword-hit3, where the ear-
       weighted half puts it level.  A-weighting at 48 kHz in three sections
       (bilinear; -19.1 dB at 100 Hz, 0 at 1 kHz, -30.3 at 50 Hz). */
    const AW = [
      [[0.234300592866472, 0.468601185732944, 0.234300592866472], [1, -0.224558458059779, 0.0126066252715464]],
      [[1, -2, 1], [1, -1.89387049472307, 0.895159769094662]],
      [[1, -2, 1], [1, -1.99461445599302, 0.994621707014084]],
    ];
    const loudest = (ch) => {
      const w = Math.floor(SR * 0.05);
      let s = 0, best = 0;
      for (let i = 0; i < ch.length; i++) {
        s += ch[i] * ch[i];
        if (i >= w) s -= ch[i - w] * ch[i - w];
        if (i >= w - 1 && s > best) best = s;
      }
      return Math.sqrt(Math.max(0, best) / w);
    };
    const render = async (layers, vol, hg) => {
      /* mono, as the measurement scripts fold a stereo file; channel 0 plain,
         and the same mix through the A-weighting into a second context */
      const once = async (aw) => {
        const oc = new OfflineAudioContext(1, Math.ceil(SR * 1.4), SR);
        let bus = oc.destination;
        if (aw) {
          for (let i = AW.length - 1; i >= 0; i--) { const f = oc.createIIRFilter(AW[i][0], AW[i][1]); f.connect(bus); bus = f; }
        }
        for (const L of layers) {
          const src = oc.createBufferSource();
          src.buffer = bufs[L[0]];
          const rate = L[4] || 1;
          src.playbackRate.value = rate;
          const g = oc.createGain();
          const v = vol * hg * L[3];
          g.gain.value = v;
          src.connect(g); g.connect(bus);
          const when = L[5] || 0;
          if (L[2] > 0) src.start(when, L[1] || 0, L[2]); else src.start(when, L[1] || 0);
          if (L[6] > 0 && L[2] > 0) {
            const real = L[2] / rate;
            g.gain.setValueAtTime(v, when + Math.max(0, real - L[6]));
            g.gain.linearRampToValueAtTime(0, when + real);
          }
        }
        return (await oc.startRendering()).getChannelData(0);
      };
      const plain = await once(false);
      let peak = 0;
      for (let i = 0; i < plain.length; i++) if (Math.abs(plain[i]) > peak) peak = Math.abs(plain[i]);
      return { peak, rms: loudest(plain), arms: loudest(await once(true)) };
    };
    const ref = await render([['sword-hit3', 0, 0, 1]], 0.6, A.HIT_GAIN);
    const res = [];
    for (const t of tables) {
      const r = await render(t.layers, t.vol, t.hg);
      res.push({ name: t.name, shot: !!t.shot, peak: r.peak, ratio: 0.5 * (r.rms / ref.rms + r.arms / ref.arms), plain: r.rms / ref.rms, ear: r.arms / ref.arms });
    }
    return { ref, res };
  });

  for (const r of lvl.res) {
    ok(r.peak < 0.95, `${r.name}: no clipping at ${r.shot ? 'full, on you' : "the arrow's 0.6"} (peak ${r.peak.toFixed(2)})`);
    if (!r.shot) {
      ok(r.ratio > 0.7 && r.ratio < 1.45, `${r.name}: level-matched to sword-hit3 (${r.ratio.toFixed(2)}x: plain ${r.plain.toFixed(2)}, by ear ${r.ear.toFixed(2)})`);
    } else {
      /* a ball on you sits at or under a blow: measured 0.55-0.98 of it */
      ok(r.ratio > 0.3 && r.ratio < 1.15, `${r.name}: at or under a blow's level (${r.ratio.toFixed(2)}x sword-hit3 at 0.6: plain ${r.plain.toFixed(2)}, by ear ${r.ear.toFixed(2)})`);
    }
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

  ok(pre.list.includes('monster-hit') && pre.list.includes('sword-hit3') && pre.list.includes('sword-hit2') && pre.list.includes('snowman-hit'),
    'every fallback a hit voice can need on the first blow is on the combat-critical list');
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
