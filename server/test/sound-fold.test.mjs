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
 *      `?stereosfx` keeps them stereo;
 *   4. (v2.3.5045) the fold a few ms at a time: the one-go fold's buffer,
 *      sample for sample, a frame let in between pieces. */
import { readFileSync } from 'fs';
import { sidesAreOne, foldToMono, foldToMonoSliced, foldForGame, SIDE_DB } from '../../src/data/soundFold.js';   /* v2.3.5045: + the fold in pieces; + the game's (sitting 4) */

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
  check('3a. the sound module takes the fold from soundFold.js', /import \{ foldForGame \} from '\.\/soundFold\.js';/.test(gd));   /* v2.3.5045: the game's fold (in pieces) */
  check('3b. every decode the sample loader makes goes through it',
    /\.then\(function \(b\) \{ delete self\._tagLoads\[tag\]; return self\._fold\(b, key\); \}/.test(gd));
  check('3c. the fold is made by the context\'s own createBuffer, and ?stereosfx keeps them stereo',
    /foldForGame\(b, function \(c, n, r\) \{ return ctx\.createBuffer\(c, n, r\); \}, function \(out\) \{ if \(out !== b\) self\._folded\.push/.test(gd)
    && /if \(!b \|\| this\._stereoSfx\) return b;/.test(gd) && /\[\?&\]stereosfx\\b/.test(gd));
}

/* 4. v2.3.5045: the fold a few ms at a time (foldToMonoSliced): what the one-go fold gives, sample for sample, with a
   frame let in between pieces */
{
  const n = 16384 * 3 + 777;
  const l = tone(n, 330, 0.4);
  const same = (a, b) => {
    if (a === b) return 'same object';
    if (!a || !b || a.numberOfChannels !== b.numberOfChannels || a.length !== b.length) return false;
    for (let c = 0; c < a.numberOfChannels; c++) { const x = a._chans[c], y = b._chans[c]; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; }
    return true;
  };
  let turns = 0;
  const turn = () => { turns++; return Promise.resolve(); };
  let clock = 0;
  const now = () => (clock += 1);   /* every look at the clock is 1 ms on: a slice of 4 ms is a few stretches */
  const cases = [
    ['equal sides', () => buf([l, Float32Array.from(l)])],
    ['66 dB apart', () => buf([l, withSide(l, -66)])],
    ['41 dB apart (kept)', () => buf([l, withSide(l, -41)])],
    ['wide (kept)', () => buf([l, tone(n, 330, 0.4, 1.2)])],
    ['silence', () => buf([new Float32Array(n), new Float32Array(n)])],
    ['one side silent (kept)', () => buf([l, new Float32Array(n)])],
    ['one channel (kept)', () => buf([l])],
  ];
  const rows = [];
  for (const [name, mk] of cases) {
    const a = mk(), b = mk();
    const one = foldToMono(a, make);
    const sliced = await foldToMonoSliced(b, make, turn, 4, now);
    const kept = one === a;
    rows.push([name, kept ? (sliced === b) : same(one, sliced) === true]);
  }
  check('4a. the fold in pieces is the one-go fold: the same buffer, sample for sample, and the same ones kept as they were (' + rows.map((r) => r[0]).join(', ') + ')', rows.every((r) => r[1]), rows);
  /* a slice of 0 ms: a turn after every stretch -- the sums' four, then the copy's four */
  let t2 = 0;
  await foldToMonoSliced(buf([l, Float32Array.from(l)]), make, () => { t2++; return Promise.resolve(); }, 0, now);
  check(`4b. ...and it lets a frame in between pieces: with a slice of 0 ms, after every stretch of the sums and of the copy (${t2} turns for 4 + 4 stretches; ${turns} in 4a's at 4 ms)`, t2 === 8 && turns > 0, { t2, turns });
  /* two at once (two sounds decoded together): each its own, though they share the line */
  const x = buf([l, Float32Array.from(l)]), y = buf([tone(n, 220, 0.3), tone(n, 220, 0.3)]);
  const [fx, fy] = await Promise.all([foldToMonoSliced(x, make, turn, 0, now), foldToMonoSliced(y, make, turn, 0, now)]);
  check('4c. two folds at once: each is its own sound, to the bit (one at a time, its own scratch)',
    same(fx, foldToMono(buf([l, Float32Array.from(l)]), make)) === true && same(fy, foldToMono(buf([tone(n, 220, 0.3), tone(n, 220, 0.3)]), make)) === true);
  const eq = buf([l, Float32Array.from(l)]);
  check('4d. a make that throws, or no make, keeps it as it was', (await foldToMonoSliced(eq, () => { throw new Error('no'); }, turn)) === eq
    && (await foldToMonoSliced(eq, null, turn)) === eq && (await foldToMonoSliced(null, make, turn)) === null);
  /* v2.3.5045, after the gatekeeper's sitting 4: the game's fold is soundFold.js foldForGame (moved out of
     gameDisplay.js for four-lines) */
  const sf = readFileSync(ROOT + 'src/data/soundFold.js', 'utf8');
  check('4e. the game folds in pieces, a frame between (`foldTurn`), and `?foldgentle=0` folds in one go',
    /return foldToMonoSliced\(b, make, turn\)\.then\(\(out\) => \{ kept\(out\); return out; \}\);/.test(sf)
    && /if \(gentleOff\) \{ const out = foldToMono\(b, make\); kept\(out\); return out; \}/.test(sf)
    && /foldgentle=\(0\|off\|false\)/.test(sf) && /turn = foldTurn, gentleOff = FOLD_GENTLE_OFF/.test(sf));
  const keptIn = [], keptOff = [];
  const gIn = await foldForGame(buf([l, Float32Array.from(l)]), make, (o) => keptIn.push(o), turn, false);
  const gOffBuf = buf([l, Float32Array.from(l)]);
  const gOff = foldForGame(gOffBuf, make, (o) => keptOff.push(o), turn, true);
  check('4f. ...foldForGame: in pieces a promise of the fold, in one go the fold itself; each tells `kept` what it kept',
    same(gIn, foldToMono(buf([l, Float32Array.from(l)]), make)) === true && keptIn[0] === gIn
    && !(gOff instanceof Promise) && gOff.numberOfChannels === 1 && keptOff[0] === gOff);
  /* #1712's small one: a sound with nothing to fold waited in the line behind a two-sided one being folded.  Break
     proof, by hand: foldToMonoSliced's first line (the early return) taken out -> 4g red. */
  let release = null;
  const held = new Promise((r) => { release = r; });
  const slow = foldToMonoSliced(buf([l, Float32Array.from(l)]), make, () => held, 0, now);
  const mono = buf([l]);
  let monoBack = null;
  foldToMonoSliced(mono, make, turn, 0, now).then((o) => { monoBack = o; });
  await new Promise((r) => setTimeout(r, 20));
  const monoFirst = monoBack === mono;
  release();
  await slow;
  check('4g. ...and a sound with nothing to fold (one channel) never waits behind a fold in the line', monoFirst);
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsound-fold: all pass');
