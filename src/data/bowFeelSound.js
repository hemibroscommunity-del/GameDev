/* ═══ v2.3.4802: THE BOW'S SOUNDS -- made, not recorded ═══
 *
 * The owner's brief (docs/specs/bow-feel.md): "the string creaks rising in
 * pitch", at full draw "a quiet click", on the lift "a sharp twang".  An
 * iPhone page cannot vibrate, so the sound carries the draw.  No sound FILE
 * can come here (no open internet), so each is synthesised with WebAudio in
 * the weapon feel kit's way (data/weaponFeelSound.js): a few oscillators and
 * one short noise buffer of its own, nothing decoded.
 *
 * Played by BT_AUDIO.bowSound(kind, k, opts) (gameDisplay.js), behind the same
 * gates as the kit's feelSound (the mute, the loading screen's sound gate),
 * on the effects bus.  Every kind is labelled in the Sound Studio
 * (soundStudio.js OTHER_PLAYS, the `bow*` rows):
 *
 *   'nock'     the thumb down: the arrow set on the string, a small soft tick
 *   'creak'    the draw: returns { set(r, tremble), stop() } -- a woody,
 *              grainy creak whose pitch rises an octave as r goes 0 -> 1; a
 *              tired arm (tremble 0..1) makes it waver
 *   'click'    full draw settled: a quiet click (the sweet spot)
 *   'twang'    the loose: the string's twang, k its share (a half draw a
 *              thinner, shorter twang; a full one a deeper ring; over 1 the
 *              perfect shot, a brighter ring on top)
 *   'letdown'  the string let down (slid back to the touch point): a soft,
 *              falling slack
 *
 * EVERY NODE IS LET GO when its sound ends (onended -> disconnect): the
 * v2.3.2126 lesson.  No imports: node reads it (server/test/bow-feel.test.mjs). */

var _noise = null;   /* { ctx, buf } -- 0.3 s of brown-ish noise, one a context */

function noiseBuf(ctx) {
  if (_noise && _noise.ctx === ctx) return _noise.buf;
  var n = Math.max(1, Math.floor(ctx.sampleRate * 0.3));
  var buf = ctx.createBuffer(1, n, ctx.sampleRate);
  /* written with copyToChannel (CLAUDE.md: never getChannelData on a sound) */
  var d = new Float32Array(n);
  var seed = 7654321, last = 0;
  for (var i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    var w = (seed / 0x3fffffff) - 1;
    last = 0.86 * last + 0.14 * w * 3;   /* a little darker than white: wood, not hiss */
    d[i] = Math.max(-1, Math.min(1, last));
  }
  buf.copyToChannel(d, 0);
  _noise = { ctx: ctx, buf: buf };
  return buf;
}

function letGo(src, nodes) {
  src.onended = function () {
    for (var i = 0; i < nodes.length; i++) { try { nodes[i].disconnect(); } catch (e) { /* already gone */ } }
  };
}

/* a plucked tone: `type` at f0 falling to f1 over d s, peak vol, through a
   low-pass that closes (a string's ring dulls as it dies) */
function pluck(ctx, out, type, f0, f1, vol, d, cut0, cut1, at) {
  var t0 = ctx.currentTime + (at || 0);
  var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + d);
  f.type = 'lowpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(cut0, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, cut1), t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(f); f.connect(g); g.connect(out);
  letGo(o, [o, f, g]);
  o.start(t0); o.stop(t0 + d + 0.02);
  return o;
}

/* a burst of the noise through a band-pass */
function tick(ctx, out, freq, q, vol, d, at) {
  var t0 = ctx.currentTime + (at || 0);
  var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf(ctx);
  f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(out);
  letGo(s, [s, f, g]);
  s.start(t0, 0, Math.min(0.3, d + 0.02));
  return s;
}

function clampK(k) { var x = Number(k); return isFinite(x) ? Math.max(0, Math.min(1.4, x)) : 1; }

/** Play one of the bow's sounds on `ctx` into `out`.  Returns the creak's
 *  handle for 'creak', else true (or null for an unknown kind). */
export function bowSynth(ctx, out, kind, k, opts) {
  if (!ctx || !out) return null;
  var o = opts || {};
  var x = clampK(k);
  var level = o.vol != null ? Math.max(0, Math.min(1.5, Number(o.vol) || 0)) : 1;
  if (kind === 'nock') {
    /* the arrow's nock on the string: a small woody tick and a hint of the string */
    tick(ctx, out, 2400, 3, 0.06 * level, 0.035, 0);
    pluck(ctx, out, 'triangle', 330, 320, 0.02 * level, 0.07, 1800, 600, 0.004);
    return true;
  }
  if (kind === 'click') {
    /* the sweet spot: one quiet, dry click */
    tick(ctx, out, 3600, 6, 0.07 * level, 0.022, 0);
    tick(ctx, out, 1500, 4, 0.035 * level, 0.03, 0.006);
    return true;
  }
  if (kind === 'twang') {
    /* the loose: a sawtooth string that drops a little in pitch as it rings,
       its low-pass closing -- a half draw thin and short, a full one deeper
       and longer; a perfect one (k over 1) a bright ring on top.  A snap of
       noise starts it (the string leaving the fingers). */
    var full = Math.min(1, x);
    var f0 = 300 - 110 * full;                 /* a full draw rings lower: more weight */
    var d = 0.12 + 0.26 * full;
    tick(ctx, out, 2600, 1.5, (0.05 + 0.08 * full) * level, 0.03, 0);
    pluck(ctx, out, 'sawtooth', f0 * 1.06, f0 * 0.94, (0.07 + 0.11 * full) * level, d, 3200 + 1600 * full, 260, 0.002);
    pluck(ctx, out, 'triangle', f0 * 2.01, f0 * 1.9, 0.035 * level * full, d * 0.7, 2600, 400, 0.002);
    if (x > 1.05) pluck(ctx, out, 'sine', 1760, 1700, 0.04 * level, 0.22, 6000, 3000, 0.01);
    return true;
  }
  if (kind === 'letdown') {
    /* the string eased back: a soft creak falling away */
    pluck(ctx, out, 'triangle', 300, 150, 0.03 * level, 0.18, 900, 300, 0);
    tick(ctx, out, 700, 2, 0.025 * level, 0.12, 0);
    return true;
  }
  if (kind === 'creak') {
    /* THE DRAW: grains of the noise through a narrow band-pass whose centre the
       caller lifts with the draw (set(r): x1 to x2, an octave), and a faint
       sawtooth under it at the same pitch; a slow amplitude flutter makes the
       grains (wood under strain).  set(r, tremble) with a tired arm wobbles
       the pitch.  stop() fades it and lets every node go. */
    var t0 = ctx.currentTime;
    var base = o.base > 0 ? o.base : 180;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf(ctx); src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 9; bp.frequency.setValueAtTime(base * 4, t0);
    var saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.setValueAtTime(base, t0);
    var sawG = ctx.createGain(); sawG.gain.setValueAtTime(0.012 * level, t0);
    var lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.setValueAtTime(23, t0);
    var lfoG = ctx.createGain(); lfoG.gain.setValueAtTime(0.35, t0);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.09 * level), t0 + 0.05);
    var flutter = ctx.createGain(); flutter.gain.setValueAtTime(0.65, t0);
    lfo.connect(lfoG); lfoG.connect(flutter.gain);
    src.connect(bp); bp.connect(flutter);
    saw.connect(sawG); sawG.connect(flutter);
    flutter.connect(g); g.connect(out);
    letGo(src, [src, bp, saw, sawG, lfo, lfoG, flutter, g]);
    src.start(t0); saw.start(t0); lfo.start(t0);
    var done = false;
    return {
      set: function (r, tremble) {
        if (done) return;
        var rr = r > 0 ? (r >= 1 ? 1 : r) : 0;
        var w = tremble > 0 ? Math.min(1, tremble) * 0.06 * Math.sin(ctx.currentTime * 37) : 0;
        var f = base * (1 + rr) * (1 + w);
        try {
          bp.frequency.setTargetAtTime(f * 4, ctx.currentTime, 0.03);
          saw.frequency.setTargetAtTime(f, ctx.currentTime, 0.03);
          lfo.frequency.setTargetAtTime(23 + 14 * rr, ctx.currentTime, 0.05);
        } catch (e) { /* sound only */ }
      },
      stop: function (fast) {
        if (done) return;
        done = true;
        var t = ctx.currentTime;
        var tau = fast ? 0.008 : 0.03;   /* a loose cuts it dead: the beat of quiet */
        try {
          g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, tau);
          src.stop(t + 0.12); saw.stop(t + 0.12); lfo.stop(t + 0.12);
        } catch (e) { try { src.stop(); saw.stop(); lfo.stop(); } catch (e2) { /* gone */ } }
      },
    };
  }
  return null;
}

/** For the Sound Studio's button: a draw of a second (the creak rising, the
 *  click at full), then the loose. */
export function bowDrawDemo(ctx, out, vol) {
  var h = bowSynth(ctx, out, 'nock', 1, { vol: vol });
  if (!h) return null;
  var c = bowSynth(ctx, out, 'creak', 1, { vol: vol });
  if (!c) return true;
  var steps = 8;
  for (var i = 1; i <= steps; i++) (function (j) { setTimeout(function () { c.set(j / steps); }, 60 + j * 70); })(i);
  setTimeout(function () { bowSynth(ctx, out, 'click', 1, { vol: vol }); }, 640);
  setTimeout(function () { c.stop(true); bowSynth(ctx, out, 'twang', 1, { vol: vol }); }, 900);
  return true;
}
