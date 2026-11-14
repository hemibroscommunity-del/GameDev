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
    /* v2.3.5012: the stretch's totals in the callback's own
       locals, added to the outer ones once a stretch.  Added up straight
       into `sum` and `diff`, two variables the callback closes over, every
       sample wrote a fresh number object into the closure (V8 keeps a closed
       over double boxed): two allocations a sample, the whole sound long.
       The page's allocation profile put it at 4.4 MB of garbage for one
       sound's first play (foldToMono < sidesAreOne), and the stutter sweep
       lists the fold at 14 to 21 ms (held-budget.mjs). */
    let s2 = 0, d2 = 0;
    for (let i = 0; i < n; i++) {
      const a = l[i], b = r[i];
      const s = a + b, d = a - b;
      s2 += s * s;
      d2 += d * d;
    }
    sum += s2;
    diff += d2;
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

/* ═══ v2.3.5045: THE FOLD A FEW MS AT A TIME, A FRAME BETWEEN ═══
   held-budget.mjs `other: BT_AUDIO$1._fold > foldToMono`: the fold runs once,
   right after a sound's first decode (its first play, as the sound cache
   loads them), in ONE piece: the two sides read and summed (sidesAreOne),
   then their mean copied into a new buffer -- 8 to 21 ms held on the QA box
   for the long ones (fish-reel, quest-complete), at the held sweep's `lands`
   and `town`.  foldToMonoSliced is the same fold, the same sums in the same
   order and the same copy (so the same buffer, sample for sample:
   sound-fold.test 4), walked a stretch at a time: once a piece has run
   `sliceMs`, `await turn()` lets the page draw a frame before the next
   stretch.  Its own scratch arrays (foldToMono's are shared), and one fold at
   a time (a line), so two sounds folding at once never share a stretch.
   Resolves to what foldToMono would return. */
let _sa = null, _sb = null, _sm = null;
let _slicedLine = Promise.resolve();
const _now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
export function foldToMonoSliced(buf, make, turn, sliceMs = 4, now = _now) {
  /* v2.3.5045, after the gatekeeper's sitting 4 (#1712): a sound with nothing
     to fold (one channel already, none, or no way to make the fold) never
     waits in the line: it waited behind any two-sided sound being folded,
     ~50 ms late on its first play */
  if (!buf || buf.numberOfChannels !== 2 || typeof make !== 'function' || !(buf.length > 0)) return Promise.resolve(buf);
  const job = () => _foldSliced(buf, make, turn, sliceMs, now);
  const p = _slicedLine.then(job, job);
  _slicedLine = p.then(() => {}, () => {});
  return p;
}
async function _foldSliced(buf, make, turn, sliceMs, now) {
  if (!buf || buf.numberOfChannels !== 2 || typeof make !== 'function') return buf;
  if (!_sa) { _sa = new Float32Array(CHUNK); _sb = new Float32Array(CHUNK); _sm = new Float32Array(CHUNK); }
  const len = buf.length;
  if (!(len > 0)) return buf;
  const copy = typeof buf.copyFromChannel === 'function';
  const L = copy ? null : buf.getChannelData(0), R = copy ? null : buf.getChannelData(1);
  /* stretch s of the two sides, as eachStretch hands them */
  const sides = (s, n) => {
    if (copy) { buf.copyFromChannel(_sa, 0, s); buf.copyFromChannel(_sb, 1, s); return [_sa, _sb]; }
    return [L.subarray(s, s + n), R.subarray(s, s + n)];
  };
  let t0 = now();
  const pace = async () => {
    if (typeof turn !== 'function' || now() - t0 < sliceMs) return;
    await turn();
    t0 = now();
  };
  /* 1: sidesAreOne's sums, stretch by stretch */
  let sum = 0, diff = 0;
  for (let s = 0; s < len; s += CHUNK) {
    const n = Math.min(CHUNK, len - s);
    const [l, r] = sides(s, n);
    let s2 = 0, d2 = 0;
    for (let i = 0; i < n; i++) {
      const a = l[i], b = r[i];
      const x = a + b, d = a - b;
      s2 += x * x;
      d2 += d * d;
    }
    sum += s2;
    diff += d2;
    await pace();
  }
  const one = sum === 0 ? diff === 0 : diff <= sum * SIDE_RATIO;
  if (!one) return buf;
  /* 2: foldToMono's copy, stretch by stretch */
  let out = null;
  try { out = make(1, buf.length, buf.sampleRate); } catch (e) { return buf; }
  if (!out || out.numberOfChannels !== 1 || out.length !== buf.length) return buf;
  const put = typeof out.copyToChannel === 'function';
  const dst = put ? null : out.getChannelData(0);
  for (let s = 0; s < len; s += CHUNK) {
    const n = Math.min(CHUNK, len - s);
    const [l, r] = sides(s, n);
    for (let i = 0; i < n; i++) _sm[i] = (l[i] + r[i]) * 0.5;
    if (put) out.copyToChannel(n === CHUNK ? _sm : _sm.subarray(0, n), 0, s);
    else dst.set(_sm.subarray(0, n), s);
    await pace();
  }
  return out;
}

/* ═══ v2.3.5045: THE FOLD THE GAME USES (gameDisplay.js BT_AUDIO._fold) ═══
   Moved here from gameDisplay.js after the gatekeeper's sitting 4, to keep
   that file under its line (tools/guards/four-lines).  In play the fold is
   walked a few ms at a time, a frame let in between (foldToMonoSliced, the
   turn below: the frame, then a timer, or a timer alone after 120 ms if no
   frame comes); the sound is kept, and plays, when it is done.
   `?foldgentle=0`: in one go, as before (foldToMono, the buffer itself, not
   a promise).  `kept(out)` is told what was kept. */
export const FOLD_GENTLE_OFF = (() => { try { return typeof location !== 'undefined' && /[?&]foldgentle=(0|off|false)\b/.test(location.search || ''); } catch (e) { return false; } })();
export function foldTurn() {
  return new Promise((res) => {
    let done = false;
    const go = () => { if (!done) { done = true; res(); } };
    try { requestAnimationFrame(() => { setTimeout(go, 0); }); } catch (e) { /* the timer below */ }
    setTimeout(go, 120);
  });
}
export function foldForGame(b, make, kept, turn = foldTurn, gentleOff = FOLD_GENTLE_OFF) {
  if (gentleOff) { const out = foldToMono(b, make); kept(out); return out; }
  return foldToMonoSliced(b, make, turn).then((out) => { kept(out); return out; });
}
