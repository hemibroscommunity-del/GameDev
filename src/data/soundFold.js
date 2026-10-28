/* ═══ v2.3.3706: A STEREO SOUND WHOSE TWO SIDES ARE ONE IS KEPT AS ONE ═══
 *
 * The owner, 2026-10-28: "Memory seems to be the persistent bottleneck in
 * terms of performance in this game.  Getting that to run as low as possible
 * without sacrificing performance is the goal."
 *
 * A decoded sound is raw float32 PCM, one array a channel: a second of stereo
 * at 48 kHz is 375 KB.  Six of the game's stereo sound files carry one signal
 * on both sides (made from mono recordings): coin-pickup, flip-lose,
 * footstep-v2, pan-sizzle and quest-complete, their sides equal to the bit,
 * and fish-reel, whose difference is 66 dB under the sound -- 6.3 MB of the
 * ~30 MB of sound held decoded, half of it a second copy (3.2 MB less, as
 * mp-soundfold and the memory check measure it).
 *
 * So after a decode (gameDisplay.js BT_AUDIO.loadSample), a stereo buffer
 * whose two sides differ by less than SIDE_DB of their sum is kept as one
 * channel, the mean of the two.  Web Audio plays a one-channel buffer out of
 * both speakers ("speakers" up-mixing: the same signal left and right), so
 * the sound is the same -- to the bit where the sides were equal, and within
 * 60 dB where they were not.  A sound with any real stereo width (the other
 * 33 stereo files: their sides 41 dB apart or less) is kept as it is.
 * `?stereosfx` keeps them all, as before.  No imports: the server's suites run
 * it in node (sound-fold.test.mjs). */

export const SIDE_DB = -60;
const SIDE_RATIO = Math.pow(10, SIDE_DB / 10);   /* an energy ratio */

/* ═══ READ THROUGH A SMALL WINDOW, NEVER getChannelData ═══
   A decoded sound's samples belong to the browser until the page asks for
   them: getChannelData hands the page the channel itself, and from then on
   its whole data counts as one of the page's own buffers (in Chromium, the
   memory check's `buffers` line: asking for both sides of the 39 stereo
   sounds took it from 24 to 42 MB, mp-membudget).  copyFromChannel copies a
   stretch into an array of ours and copyToChannel back, so nothing of the
   sound is handed over: two (three) small arrays of CHUNK samples, reused. */
const CHUNK = 16384;
let _a = null, _b = null, _m = null;
function scratch() {
  if (!_a) { _a = new Float32Array(CHUNK); _b = new Float32Array(CHUNK); _m = new Float32Array(CHUNK); }
}
/* fn(left, right, n, start) for each stretch of `buf`'s two sides */
function eachStretch(buf, fn) {
  const len = buf.length;
  if (typeof buf.copyFromChannel === 'function') {
    scratch();
    for (let s = 0; s < len; s += CHUNK) {
      const n = Math.min(CHUNK, len - s);
      buf.copyFromChannel(_a, 0, s);
      buf.copyFromChannel(_b, 1, s);
      if (fn(_a, _b, n, s) === false) return;
    }
    return;
  }
  /* (a stand-in with no copyFromChannel: its channels as they are) */
  const l = buf.getChannelData(0), r = buf.getChannelData(1);
  for (let s = 0; s < len; s += CHUNK) {
    const n = Math.min(CHUNK, len - s);
    if (fn(l.subarray(s, s + n), r.subarray(s, s + n), n, s) === false) return;
  }
}

/** Are a two-channel buffer's sides one signal? */
export function sidesAreOne(buf) {
  if (!buf || buf.numberOfChannels !== 2 || !(buf.length > 0)) return false;
  let sum = 0, diff = 0;
  eachStretch(buf, (l, r, n) => {
    for (let i = 0; i < n; i++) {
      const a = l[i], b = r[i];
      const s = a + b, d = a - b;
      sum += s * s;
      diff += d * d;
    }
  });
  if (sum === 0) return diff === 0;   /* silent on both sides: one */
  return diff <= sum * SIDE_RATIO;
}

/** The buffer to keep: `buf` itself, or a one-channel buffer of its two
 *  sides' mean, made by `make(channels, length, sampleRate)` (the audio
 *  context's createBuffer).  Anything it cannot make is kept as it was. */
export function foldToMono(buf, make) {
  if (!buf || buf.numberOfChannels !== 2 || typeof make !== 'function') return buf;
  if (!sidesAreOne(buf)) return buf;
  let out = null;
  try { out = make(1, buf.length, buf.sampleRate); } catch (e) { return buf; }
  if (!out || out.numberOfChannels !== 1 || out.length !== buf.length) return buf;
  scratch();
  const put = typeof out.copyToChannel === 'function';
  const dst = put ? null : out.getChannelData(0);
  eachStretch(buf, (l, r, n, s) => {
    for (let i = 0; i < n; i++) _m[i] = (l[i] + r[i]) * 0.5;
    if (put) out.copyToChannel(n === CHUNK ? _m : _m.subarray(0, n), 0, s);
    else dst.set(_m.subarray(0, n), s);
  });
  return out;
}
