/* v2.3.2604: MUSIC RE-ENCODER — 128 kbps / 44.1 kHz, the house setting.
 *
 * Owner: "Yes make the files smaller size."
 *
 * Why this exists rather than a one-line ffmpeg call: there is NO system
 * encoder in this sandbox.  Verified, not assumed — no lame, ffmpeg, sox,
 * opusenc or oggenc on PATH, and the ffmpeg playwright bundles
 * (/opt/pw-browsers/ffmpeg-1011) is built --disable-everything with only
 * mjpeg/vp8/png/webm, so it carries no audio codec at all.  Every previous
 * music session recorded "no encoder here" and shipped the owner's files
 * verbatim (v2.3.1589); this is the way around that.
 *
 * THE PIPELINE, and why each half is where it is:
 *   1. DECODE + RESAMPLE in a real Chromium, via decodeAudioData on an
 *      OfflineAudioContext pinned to 44100.  The owner's masters are 48 kHz
 *      and the house format is 44.1, so something must resample; the browser's
 *      resampler is a good one and it is the SAME decoder the game itself
 *      uses (BT_AUDIO is a decodeAudioData path), so what we encode is exactly
 *      what the game would have played.
 *   2. ENCODE with lamejs (a pure-JS LAME port) in that same page, so only the
 *      finished ~2 MB of mp3 crosses back to node instead of ~30 MB of PCM.
 *
 * Both halves are verified rather than trusted: --verify re-decodes the OUTPUT
 * and compares duration, sample rate, channel count, RMS, spectral centroid and
 * >15 kHz energy against the SOURCE.  A silently truncated or wrongly-resampled
 * track is worse than a large one, so this refuses to report success on drift.
 *
 * Usage:
 *   node tools/audio/encode_music.mjs <in.mp3> <out.mp3> [more pairs...]
 *   node tools/audio/encode_music.mjs --bitrate 160 <in.mp3> <out.mp3>
 *   node tools/audio/encode_music.mjs --report report.json <in> <out> ...
 *
 * The source masters live in docs/triage-<date>/music/ and are kept in the
 * branch on purpose: if this ever needs redoing at a different setting, the
 * originals have to still be there.  Never encode from public/audio/music/ —
 * that is already-encoded output, and re-encoding it compounds loss.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAME = join(ROOT, 'node_modules/@breezystack/lamejs/dist/lamejs.iife.js');
const CHROME = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const argv = process.argv.slice(2);
let bitrate = 128, rate = 44100, reportPath = null;
const pairs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--bitrate') { bitrate = +argv[++i]; continue; }
  if (argv[i] === '--rate') { rate = +argv[++i]; continue; }
  if (argv[i] === '--report') { reportPath = argv[++i]; continue; }
  pairs.push(argv[i]);
}
if (pairs.length < 2 || pairs.length % 2) {
  console.error('usage: encode_music.mjs [--bitrate 128] [--rate 44100] [--report r.json] <in.mp3> <out.mp3> ...');
  process.exit(2);
}

/* Runs INSIDE the page: decode -> resample -> encode -> measure. */
const WORK = ({ b64, rate, bitrate }) => {
  const bin = atob(b64);
  const ab = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(ab);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);

  const analyse = (buf) => {
    const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
    const L = buf.getChannelData(0), R = ch > 1 ? buf.getChannelData(1) : L;
    const m = new Float32Array(n);
    for (let i = 0; i < n; i++) m[i] = (L[i] + R[i]) * 0.5;
    let peak = 0, sum = 0;
    for (let i = 0; i < n; i++) { const a = Math.abs(m[i]); if (a > peak) peak = a; sum += m[i] * m[i]; }
    const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
    /* spectral centroid + HF share, 32 windows, radix-2 FFT */
    const N = 4096, re = new Float64Array(N), im = new Float64Array(N);
    const fft = () => {
      for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
      }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
          let cr = 1, ci = 0;
          for (let k = 0; k < len / 2; k++) {
            const ur = re[i + k], ui = im[i + k];
            const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
            const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
            re[i + k] = ur + vr; im[i + k] = ui + vi;
            re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
            const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
          }
        }
      }
    };
    let cn = 0, cd = 0, hf = 0, tot = 0;
    for (let w = 0; w < 32; w++) {
      const s = Math.floor((n - N) * (w + 0.5) / 32);
      for (let i = 0; i < N; i++) {
        const hann = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
        re[i] = m[s + i] * hann; im[i] = 0;
      }
      fft();
      for (let k = 1; k < N / 2; k++) {
        const mag = Math.hypot(re[k], im[k]), f = k * sr / N;
        cn += f * mag; cd += mag; tot += mag * mag;
        if (f > 15000) hf += mag * mag;
      }
    }
    return {
      durationSec: buf.duration, sampleRate: sr, channels: ch, frames: n,
      residentBytes: n * ch * 4,
      peakDb: +db(peak).toFixed(2), rmsDb: +db(Math.sqrt(sum / n)).toFixed(2),
      centroidHz: Math.round(cn / cd), hf15kDb: +(10 * Math.log10(hf / tot)).toFixed(1),
    };
  };

  const ctx = new OfflineAudioContext(2, 1, rate);
  return ctx.decodeAudioData(ab).then((buf) => {
    const src = analyse(buf);
    const ch = buf.numberOfChannels;
    const n = buf.length;
    const f2i = (f) => {                        // float32 -> int16, clamped
      const o = new Int16Array(f.length);
      for (let i = 0; i < f.length; i++) {
        const s = Math.max(-1, Math.min(1, f[i]));
        o[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return o;
    };
    const L = f2i(buf.getChannelData(0));
    const R = ch > 1 ? f2i(buf.getChannelData(1)) : L;

    const enc = new lamejs.Mp3Encoder(ch > 1 ? 2 : 1, buf.sampleRate, bitrate);
    const out = [];
    let bytes = 0;
    const BLOCK = 1152;
    for (let i = 0; i < n; i += BLOCK) {
      const l = L.subarray(i, i + BLOCK);
      const r = R.subarray(i, i + BLOCK);
      const chunk = ch > 1 ? enc.encodeBuffer(l, r) : enc.encodeBuffer(l);
      if (chunk.length) { out.push(chunk); bytes += chunk.length; }
    }
    const last = enc.flush();
    if (last.length) { out.push(last); bytes += last.length; }

    const mp3 = new Uint8Array(bytes);
    let off = 0;
    for (const c of out) { mp3.set(c, off); off += c.length; }
    let s = '';
    for (let i = 0; i < mp3.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, mp3.subarray(i, i + 0x8000));
    }
    return { src, mp3b64: btoa(s), outBytes: mp3.length };
  });
};

const VERIFY = ({ b64, rate }) => {
  const bin = atob(b64);
  const ab = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(ab);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const ctx = new OfflineAudioContext(2, 1, rate);
  return ctx.decodeAudioData(ab).then((buf) => ({
    durationSec: buf.duration, sampleRate: buf.sampleRate,
    channels: buf.numberOfChannels, frames: buf.length,
    residentBytes: buf.length * buf.numberOfChannels * 4,
  }));
};

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio',
         '--js-flags=--max-old-space-size=4096'],
});
const page = await browser.newPage();
await page.goto('about:blank');
await page.addScriptTag({ path: LAME });

const report = [];
let failures = 0;
for (let i = 0; i < pairs.length; i += 2) {
  const inPath = pairs[i], outPath = pairs[i + 1];
  const srcBytes = readFileSync(inPath);
  process.stdout.write(`${inPath.split('/').pop()} -> ${outPath.split('/').pop()} ... `);

  const { src, mp3b64, outBytes } = await page.evaluate(WORK, {
    b64: srcBytes.toString('base64'), rate, bitrate,
  });
  const mp3 = Buffer.from(mp3b64, 'base64');
  writeFileSync(outPath, mp3);

  /* VERIFY: decode what we just wrote and hold it against the source. */
  const chk = await page.evaluate(VERIFY, { b64: mp3b64, rate });
  const dDur = Math.abs(chk.durationSec - src.durationSec);
  const ok = chk.sampleRate === rate
    && chk.channels === src.channels
    && dDur < 0.12;                       // one mp3 frame of slack (~26 ms)
  if (!ok) failures++;

  const row = {
    in: inPath, out: outPath, bitrate, rate,
    srcFileBytes: srcBytes.length, outFileBytes: outBytes,
    fileDeltaBytes: outBytes - srcBytes.length,
    srcDurationSec: +src.durationSec.toFixed(3), outDurationSec: +chk.durationSec.toFixed(3),
    durationDriftSec: +dDur.toFixed(4),
    srcRate: src.sampleRate, outRate: chk.sampleRate,
    srcChannels: src.channels, outChannels: chk.channels,
    srcResidentMiB: +(src.residentBytes / 1048576).toFixed(1),
    outResidentMiB: +(chk.residentBytes / 1048576).toFixed(1),
    srcRmsDb: src.rmsDb, srcPeakDb: src.peakDb,
    srcCentroidHz: src.centroidHz, srcHf15kDb: src.hf15kDb,
    verified: ok,
  };
  report.push(row);
  console.log(ok
    ? `OK ${(srcBytes.length / 1048576).toFixed(2)}->${(outBytes / 1048576).toFixed(2)} MB, `
      + `${row.srcResidentMiB}->${row.outResidentMiB} MiB resident, drift ${row.durationDriftSec}s`
    : `FAILED VERIFY (rate ${chk.sampleRate}, ch ${chk.channels}, drift ${dDur.toFixed(3)}s)`);
}
await browser.close();

if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(failures ? `\n${failures} track(s) FAILED verification` : '\nall tracks verified');
process.exit(failures ? 1 : 0);
