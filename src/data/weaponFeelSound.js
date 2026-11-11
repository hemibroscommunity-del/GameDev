/* ═══ v2.3.4800: THE WEAPON FEEL'S SOUNDS -- made, not recorded ═══
 *
 * FEEL-SPEC (the owner's approved brief, 2026-11-11): "Sound does most of the
 * work (an iPhone web page cannot vibrate): a rising build sound, a layered
 * release sized to its strength, the heaviest layer at contact."  No new
 * sound FILES can come here, so these are synthesised with WebAudio: a few
 * oscillators and one short noise buffer, nothing decoded, nothing held but
 * that buffer (0.25 s mono, ~45 KB at 48 kHz, made once a context).
 *
 * Played through BT_AUDIO.feelSound(kind, k, opts) (gameDisplay.js), which
 * checks the mute and the loading screen's sound gate and puts it on the
 * effects bus, under the Settings slider.  Every kind is labelled in the
 * Sound Studio (soundStudio.js OTHER_PLAYS, `feel*` rows; sound-cues §12g).
 *
 *   'ready'    the glint: a small bright ring as a weapon comes full (the
 *              perfect window opens).  Quiet; k scales it.
 *   'contact'  the cut landing: k 0..1.3 (weaponFeel feelStrength's k).  A
 *              light cut is a high tick; a full one adds a low thud; a perfect
 *              one a deeper, longer thud and a crack of noise -- the heaviest
 *              layer at contact.  Layered OVER the material's own hit sound.
 *   'release'  a weapon let go (the bow's snap, the orb's blast): a burst of
 *              filtered noise, brighter and longer with k.
 *   'stage'    a build stage landing (the staff's spark -> orb -> sphere):
 *              a pulse, a step deeper each stage (opts.stage 1..3).
 *   'blast'    v2.3.4803: the staff's orb let go (game/staffFeel.js): the air
 *              swells INWARD a split second (noise rising, its band climbing),
 *              then a boom, deeper and longer with k (0.6 an orb, 1.1 a
 *              sphere).  A spark is the snap of 'release' instead.
 *   'build'    the rising build tone: returns a handle { set(r), stop() } --
 *              set(r) glides its pitch from 1x (r 0) to 2x (r 1, an octave)
 *              (weaponFeel feelBuildRate); stop() fades it out and lets go.
 *
 * EVERY NODE IS LET GO when its sound ends (onended -> disconnect): the
 * v2.3.2126 lesson (BT_AUDIO._startOn), where nodes never disconnected grew
 * the audio graph by 20,000 an hour.
 *
 * No imports: node can read it (server/test/weapon-feel.test.mjs). */

var _noise = null;   /* { ctx, buf } -- one short white-noise buffer a context */

function noiseBuf(ctx) {
  if (_noise && _noise.ctx === ctx) return _noise.buf;
  var n = Math.max(1, Math.floor(ctx.sampleRate * 0.25));
  var buf = ctx.createBuffer(1, n, ctx.sampleRate);
  /* written with copyToChannel (CLAUDE.md: never getChannelData on a sound) */
  var d = new Float32Array(n);
  var seed = 1234567;
  for (var i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = (seed / 0x3fffffff) - 1; }
  buf.copyToChannel(d, 0);
  _noise = { ctx: ctx, buf: buf };
  return buf;
}

/* let every node of one sound go when its last source ends */
function letGo(src, nodes) {
  src.onended = function () {
    for (var i = 0; i < nodes.length; i++) { try { nodes[i].disconnect(); } catch (e) { /* already gone */ } }
  };
}

/* one tone: an oscillator `type` at `f0` gliding to `f1`, peak `vol`, attack
   `a` s, decay to silence by `d` s, starting `at` s from now */
function tone(ctx, out, type, f0, f1, vol, a, d, at) {
  var t0 = ctx.currentTime + (at || 0);
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.max(0.002, a));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(out);
  letGo(o, [o, g]);
  o.start(t0); o.stop(t0 + d + 0.02);
  return o;
}

/* a burst of noise through a band-pass at `freq`, peak `vol`, `d` s long */
function hiss(ctx, out, freq, q, vol, d, at) {
  var t0 = ctx.currentTime + (at || 0);
  var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf(ctx);
  f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(out);
  letGo(s, [s, f, g]);
  s.start(t0, 0, Math.min(0.25, d + 0.02));
  return s;
}

function clampK(k) { var x = Number(k); return isFinite(x) ? Math.max(0, Math.min(1.4, x)) : 1; }

/** Play one of the feel's sounds on `ctx`, into `out`.  `kind` above; `k` its
 *  strength.  Returns a handle for 'build', else true (or null if nothing). */
export function feelSynth(ctx, out, kind, k, opts) {
  if (!ctx || !out) return null;
  var o = opts || {};
  var x = clampK(k);
  var level = o.vol != null ? Math.max(0, Math.min(1.5, Number(o.vol) || 0)) : 1;
  if (kind === 'ready') {
    /* a small bright ring: two partials a fifth apart, gone in 0.18 s */
    var v = 0.05 * level * (0.6 + 0.4 * Math.min(1, x));
    tone(ctx, out, 'sine', 2637, 2637, v, 0.004, 0.18, 0);
    tone(ctx, out, 'sine', 3951, 3951, v * 0.55, 0.004, 0.12, 0.012);
    return true;
  }
  if (kind === 'contact') {
    /* a tick for every cut; a thud under a full one; a deeper, longer thud
       and a crack for a perfect one (k over 1) */
    var tick = 0.05 + 0.05 * Math.min(1, x);
    hiss(ctx, out, 3200, 1.2, tick * level, 0.05, 0);
    if (x >= 0.6) {
      var heavy = x > 1.05;
      tone(ctx, out, 'sine', heavy ? 120 : 150, heavy ? 42 : 60, (heavy ? 0.34 : 0.22) * level * Math.min(1.3, x), 0.004, heavy ? 0.26 : 0.16, 0);
      if (heavy) hiss(ctx, out, 900, 0.8, 0.12 * level, 0.12, 0.004);
    }
    return true;
  }
  if (kind === 'release') {
    /* a snap of air, brighter and longer with what was built */
    hiss(ctx, out, 1400 + 1800 * Math.min(1, x), 0.9, (0.06 + 0.12 * Math.min(1, x)) * level, 0.08 + 0.12 * Math.min(1, x), 0);
    return true;
  }
  if (kind === 'blast') {
    /* v2.3.4803: the swell -- noise through a band-pass climbing 500 -> 2600
       Hz, its level RISING (the inward pull), cut short at `sw` -- then the
       boom under it: a sine falling to the floor of hearing, and a crack of
       noise for a sphere (k over 1) */
    var sw = 0.06 + 0.05 * Math.min(1, x);
    var t0b = ctx.currentTime;
    var sb = ctx.createBufferSource(), fb = ctx.createBiquadFilter(), gb = ctx.createGain();
    sb.buffer = noiseBuf(ctx);
    fb.type = 'bandpass'; fb.Q.value = 1.1;
    fb.frequency.setValueAtTime(500, t0b);
    fb.frequency.exponentialRampToValueAtTime(2600, t0b + sw);
    gb.gain.setValueAtTime(0.0002, t0b);
    gb.gain.exponentialRampToValueAtTime(Math.max(0.0003, (0.05 + 0.07 * Math.min(1, x)) * level), t0b + sw);
    gb.gain.exponentialRampToValueAtTime(0.0001, t0b + sw + 0.03);
    sb.connect(fb); fb.connect(gb); gb.connect(out);
    letGo(sb, [sb, fb, gb]);
    sb.start(t0b, 0, Math.min(0.25, sw + 0.05));
    var big = x > 1.05;
    tone(ctx, out, 'sine', big ? 110 : 150, big ? 32 : 48, (0.16 + 0.16 * Math.min(1.3, x)) * level, 0.005, 0.22 + 0.2 * Math.min(1.3, x), sw);
    if (big) hiss(ctx, out, 700, 0.7, 0.11 * level, 0.16, sw + 0.004);
    return true;
  }
  if (kind === 'stage') {
    /* a pulse, a step deeper each stage (1..3) */
    var st = Math.max(1, Math.min(3, Number(o.stage) || 1));
    var f = 660 / Math.pow(1.335, st - 1);   /* a fourth down a stage */
    tone(ctx, out, 'triangle', f * 1.02, f, 0.09 * level, 0.006, 0.22, 0);
    return true;
  }
  if (kind === 'build') {
    /* the rising tone: a soft triangle with a slow wobble, its pitch set by
       the caller each frame (set(r)), faded out by stop() */
    var t0 = ctx.currentTime;
    var base = o.base > 0 ? o.base : 220;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(base, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.045 * level), t0 + 0.06);
    osc.connect(g); g.connect(out);
    letGo(osc, [osc, g]);
    osc.start(t0);
    var done = false;
    return {
      set: function (r) {
        if (done) return;
        var rr = r > 0 ? (r >= 1 ? 1 : r) : 0;
        try { osc.frequency.setTargetAtTime(base * (1 + rr), ctx.currentTime, 0.03); } catch (e) { /* sound only */ }
      },
      stop: function () {
        if (done) return;
        done = true;
        var t = ctx.currentTime;
        try { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.03); osc.stop(t + 0.15); } catch (e) { try { osc.stop(); } catch (e2) { /* gone */ } }
      },
    };
  }
  return null;
}

/** For the Sound Studio's play button: a one-second build that rises and
 *  stops (the studio cannot hold a thumb down).  v2.3.4803: `base` the tone's
 *  pitch (the staff's hum is 130; the default 220). */
export function feelBuildDemo(ctx, out, vol, base) {
  var h = feelSynth(ctx, out, 'build', 1, { vol: vol, base: base });
  if (!h) return null;
  var steps = 10;
  for (var i = 1; i <= steps; i++) (function (j) { setTimeout(function () { h.set(j / steps); }, j * 100); })(i);
  setTimeout(function () { h.stop(); feelSynth(ctx, out, 'release', 1, { vol: vol }); }, 1050);
  return true;
}
