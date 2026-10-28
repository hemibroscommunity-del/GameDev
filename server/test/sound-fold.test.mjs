/* A STEREO SOUND WHOSE TWO SIDES ARE ONE IS KEPT AS ONE -- v2.3.3706
 * (docs/specs/sound-fold.md).
 *
 * The owner: "Memory seems to be the persistent bottleneck ... Getting that
 * to run as low as possible without sacrificing performance is the goal."
 * Six of the game's stereo sound files carry one signal on both sides, so
 * after a decode such a buffer is kept as one channel (src/data/soundFold.js,
 * called by BT_AUDIO.loadSample), and Web Audio plays it out of both speakers.
 *   1. which two-channel signals are one: equal sides, sides 66 dB apart (as
 *      fish-reel's), not 41 dB apart (shield-bash's, the next widest), silence;
 *   2. the fold: one channel of the mean, the same samples to the bit where
 *      the sides were equal; a wide one, a mono one, a failed make kept as
 *      they were;
 *   3. the wiring: every decode the loader makes passes through it, and
 *      `?stereosfx` keeps them stereo. */
import { readFileSync } from 'fs';
import { sidesAreOne, foldToMono, SIDE_DB } from '../../src/data/soundFold.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const ROOT = new URL('../../', import.meta.url).pathname;

/* a little stand-in for an AudioBuffer, with the copies Web Audio has; it
   counts every getChannelData (the page handed a sound's own samples: they
   then count as the page's buffers, the memory check's `buffers` line) */
let handedOver = 0;
function buf(chans, rate = 48000) {
  const length = chans[0].length;
  return {
    numberOfChannels: chans.length, length, sampleRate: rate,
    getChannelData: (i) => { handedOver++; return chans[i]; },
    copyFromChannel: (dest, ch, start = 0) => { dest.set(chans[ch].subarray(start, start + Math.min(dest.length, length - start))); },
    copyToChannel: (src, ch, start = 0) => { chans[ch].set(src.subarray(0, Math.min(src.length, length - start)), start); },
    _chans: chans,
  };
}
const make = (c, n, r) => buf(Array.from({ length: c }, () => new Float32Array(n)), r);
const pair = (l, r) => buf([l, r]);
function tone(n, f, amp = 0.5, phase = 0) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = amp * Math.sin(2 * Math.PI * f * i / 48000 + phase);
  return a;
}
/* r = l + a difference `db` under the sum */
function withSide(l, db) {
  const r = new Float32Array(l.length);
  const k = Math.pow(10, db / 20) * 2;   /* (l - r) is k * l against (l + r) ~ 2l */
  for (let i = 0; i < l.length; i++) r[i] = l[i] - k * l[i] * Math.sin(i * 0.37);
  return r;
}

/* 1. which signals are one */
const N = 4800;
const L = tone(N, 440);
check(`1a. the line is ${SIDE_DB} dB`, SIDE_DB === -60);
check('1b. equal sides are one', sidesAreOne(pair(L, Float32Array.from(L))));
check('1c. sides 66 dB apart are one (fish-reel\'s)', sidesAreOne(pair(L, withSide(L, -66))));
check('1d. sides 41 dB apart are two (shield-bash\'s, the next widest)', !sidesAreOne(pair(L, withSide(L, -41))));
check('1e. a real stereo sound is two', !sidesAreOne(pair(L, tone(N, 440, 0.5, 1.2))));
check('1f. silence on both sides is one, silence on one side is two',
  sidesAreOne(pair(new Float32Array(N), new Float32Array(N))) && !sidesAreOne(pair(L, new Float32Array(N))));
check('1g. one channel, or none, is never "one of two"', !sidesAreOne(buf([L])) && !sidesAreOne(null));

/* 2. the fold */
{
  const b = buf([L, Float32Array.from(L)]);
  const out = foldToMono(b, make);
  check('2a. equal sides: one channel, as long, at the same rate', out !== b && out.numberOfChannels === 1 && out.length === N && out.sampleRate === 48000);
  const m = out._chans[0];
  let same = true;
  for (let i = 0; i < N; i++) if (m[i] !== L[i]) { same = false; break; }
  check('2b. ...the same samples, to the bit', same);
  const r = withSide(L, -66);
  const out2 = foldToMono(buf([L, r]), make);
  let ok = out2.numberOfChannels === 1;
  for (let i = 0; i < N && ok; i++) if (Math.abs(out2._chans[0][i] - (L[i] + r[i]) / 2) > 1e-7) ok = false;
  check('2c. sides 66 dB apart: one channel, their mean', ok);
  const wide = buf([L, tone(N, 440, 0.5, 1.2)]);
  check('2d. a wide one is kept as it was', foldToMono(wide, make) === wide);
  const mono = buf([L]);
  check('2e. a one-channel sound is kept as it was', foldToMono(mono, make) === mono);
  const eq = buf([L, Float32Array.from(L)]);
  check('2f. a make that throws keeps it as it was', foldToMono(eq, () => { throw new Error('no'); }) === eq);
  check('2g. a make that makes the wrong thing keeps it as it was', foldToMono(eq, (c, n, rt) => make(2, n, rt)) === eq);
  check('2h. no buffer, no make: nothing done', foldToMono(null, make) === null && foldToMono(eq, null) === eq);
}

/* 2i-2k. never hands the page a sound's own samples (getChannelData), and a
   long one is read through its windows, its last one short */
{
  handedOver = 0;
  const n = 16384 * 3 + 777;
  const l = tone(n, 330, 0.4);
  const eq = buf([l, Float32Array.from(l)]);
  const wide = buf([l, tone(n, 330, 0.4, 1.2)]);
  const outEq = foldToMono(eq, make);
  const keptWide = foldToMono(wide, make);
  check('2i. folding one and keeping another asks neither for its own samples (no getChannelData: they would count as the page\'s buffers)',
    handedOver === 0 && outEq !== eq && keptWide === wide, { handedOver });
  let same = true;
  for (let i = 0; i < n; i++) if (outEq._chans[0][i] !== l[i]) { same = false; break; }
  check('2j. a long one folds whole through its windows, the last one short, to the bit', same && outEq.length === n);
  const r = Float32Array.from(l);
  r[n - 1] += 0.5;   /* one sample apart, in the short last window */
  check('2k. ...and its last window is read: one sample apart there is enough to keep it two', !sidesAreOne(buf([l, r])));
}

/* 3. the wiring */
{
  const gd = readFileSync(ROOT + 'src/data/gameDisplay.js', 'utf8');
  check('3a. the sound module takes the fold from soundFold.js', /import \{ foldToMono \} from '\.\/soundFold\.js';/.test(gd));
  check('3b. every decode the sample loader makes goes through it',
    /\.then\(function \(b\) \{ delete self\._tagLoads\[tag\]; return self\._fold\(b, key\); \}/.test(gd));
  check('3c. the fold is made by the context\'s own createBuffer, and ?stereosfx keeps them stereo',
    /foldToMono\(b, function \(c, n, r\) \{ return ctx\.createBuffer\(c, n, r\); \}\)/.test(gd)
    && /if \(!b \|\| this\._stereoSfx\) return b;/.test(gd) && /\[\?&\]stereosfx\\b/.test(gd));
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsound-fold: all pass');
