/* audio_to_chiptune.mjs — TRANSCRIBE a track, then re-synthesise it as
 * chiptune (v2.3.1804).
 *
 * Owner: "The remix function doesn't work from Suno.  Would you be able to
 * convert one of the songs we already have into chiptune and the format that
 * works best?"
 *
 * This is not a filter.  tools/audio_crush.mjs makes the SAME orchestral
 * performance coarser, which sounds like a damaged recording; this listens to
 * the track, works out what notes are being played, and plays those notes on
 * NES voices.  The output is therefore the tune, not the recording.
 *
 * HOW
 *   1. decode to mono 22050 (headless Chromium — no ffmpeg in this sandbox)
 *   2. STFT, and per frame pick a melody pitch and a bass pitch, each by
 *      Harmonic Product Spectrum so an overtone cannot masquerade as the
 *      fundamental an octave up
 *   3. median-filter the pitch track (single-frame jitter is not a note),
 *      segment into runs, drop anything too short to be played
 *   4. find the tempo from the onset envelope and quantise onto a 1/8 grid
 *   5. emit NOTE DATA — and that is the deliverable, not the audio
 *
 * WHY NOTE DATA IS "THE FORMAT THAT WORKS BEST", which was the other half of
 * the question.  Resident memory for a decoded track is duration x rate x
 * channels regardless of what is on it, so a chiptune MP3 costs exactly what
 * an orchestral one does: gameDisplay.js records 40-56 MiB per track, a
 * 56 MiB cap, an eviction scheme, and desert already over budget.  The same
 * music as notes is a few KB, decodes to nothing, loops seamlessly at the bar
 * line instead of at whatever sample the file happens to end on, and can be
 * re-voiced later without re-exporting anything.
 *
 * Usage: node tools/audio_to_chiptune.mjs <in.mp3> <out-prefix> [seconds]
 *        writes <out-prefix>.json (the notes) and <out-prefix>.wav (a preview)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [src, prefix, secArg] = process.argv.slice(2);
if (!src || !prefix) { console.error('usage: audio_to_chiptune.mjs <in.mp3> <out-prefix> [seconds]'); process.exit(1); }
const MAXSEC = parseFloat(secArg || '0');
const SR = 22050;

/* ── 1. decode ─────────────────────────────────────────────────────────── */
const tmp = `/tmp/a2c-${process.pid}.wav`;
execFileSync(process.execPath, ['tools/audio_crush.mjs', src, tmp, String(SR), '12'], { stdio: 'pipe' });
const wav = readFileSync(tmp);
const nSamp = wav.readUInt32LE(40) / 2;
let x = new Float32Array(nSamp);
for (let i = 0; i < nSamp; i++) x[i] = wav.readInt16LE(44 + i * 2) / 32768;
if (MAXSEC > 0 && x.length > MAXSEC * SR) x = x.slice(0, Math.floor(MAXSEC * SR));

/* ── 2. STFT ───────────────────────────────────────────────────────────── */
const NFFT = 2048, HOP = 512;
const win = new Float32Array(NFFT);
for (let i = 0; i < NFFT; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (NFFT - 1));

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

const nFrames = Math.max(1, Math.floor((x.length - NFFT) / HOP));
const mags = [];
const flux = new Float32Array(nFrames);
let prev = null;
for (let f = 0; f < nFrames; f++) {
  const re = new Float32Array(NFFT), im = new Float32Array(NFFT);
  for (let i = 0; i < NFFT; i++) re[i] = x[f * HOP + i] * win[i];
  fft(re, im);
  const m = new Float32Array(NFFT / 2);
  let fl = 0;
  for (let k = 0; k < NFFT / 2; k++) {
    m[k] = Math.hypot(re[k], im[k]);
    if (prev) { const d = m[k] - prev[k]; if (d > 0) fl += d; }
  }
  mags.push(m); flux[f] = fl; prev = m;
}
const binHz = SR / NFFT;

/* HPS: multiply the spectrum by decimated copies of itself, so a true
   fundamental (whose harmonics line up) beats a loud overtone.
   Returns the top-K candidates per frame rather than one winner, because a
   single argmax is what made the first cut unusable — orchestral texture is
   polyphonic, so the loudest thing in the melody band changes instrument
   frame to frame and the "melody" came out as a shower of octave leaps. */
function candidates(m, loHz, hiHz, harmonics, K) {
  const lo = Math.max(2, Math.floor(loHz / binHz)), hi = Math.min(m.length - 1, Math.ceil(hiHz / binHz));
  const scored = [];
  for (let k = lo; k <= hi; k++) {
    if (m[k] < m[k - 1] || m[k] < m[k + 1]) continue;      /* local peaks only */
    let p = m[k];
    for (let h = 2; h <= harmonics; h++) { const kk = k * h; if (kk < m.length) p *= m[kk]; else { p = 0; break; } }
    if (p <= 0) continue;
    const a = m[k - 1], b = m[k], c = m[k + 1] || 0;
    const d = (a - c) / (2 * (a - 2 * b + c) || 1e-9);
    scored.push({ hz: (k + Math.max(-0.5, Math.min(0.5, d))) * binHz, power: p, mag: b });
  }
  scored.sort((p, q) => q.power - p.power);
  return scored.slice(0, K);
}
const midi = (hz) => Math.round(69 + 12 * Math.log2(hz / 440));

/* ── VITERBI over the candidates ──
   A melody is CONTINUOUS: the right answer is not the loudest peak in each
   frame independently, it is the cheapest PATH through all the frames, where
   leaping an octave costs something.  Without this the tracker is free to hop
   between the violins, the horns and an overtone of the bass on consecutive
   frames, which is exactly what it did. */
function trackPitch(loHz, hiHz, harmonics, jumpCost, octaveCost) {
  const K = 5;
  const frames = [];
  for (let f = 0; f < nFrames; f++) {
    const cs = candidates(mags[f], loHz, hiHz, harmonics, K).map((c) => ({ n: midi(c.hz), s: Math.log(c.power + 1e-12) }));
    frames.push(cs.length ? cs : [{ n: 0, s: -40 }]);
  }
  const dp = frames.map((cs) => cs.map(() => -Infinity));
  const bk = frames.map((cs) => cs.map(() => -1));
  for (let i = 0; i < frames[0].length; i++) dp[0][i] = frames[0][i].s;
  for (let f = 1; f < nFrames; f++) {
    for (let i = 0; i < frames[f].length; i++) {
      const ni = frames[f][i].n;
      for (let j = 0; j < frames[f - 1].length; j++) {
        const nj = frames[f - 1][j].n;
        const d = Math.abs(ni - nj);
        /* free to stay; cheap to step; an octave leap has to earn itself */
        const pen = d === 0 ? 0 : jumpCost * Math.min(d, 12) + (d >= 11 ? octaveCost : 0);
        const v = dp[f - 1][j] + frames[f][i].s - pen;
        if (v > dp[f][i]) { dp[f][i] = v; bk[f][i] = j; }
      }
    }
  }
  let bi = 0;
  for (let i = 1; i < frames[nFrames - 1].length; i++) if (dp[nFrames - 1][i] > dp[nFrames - 1][bi]) bi = i;
  const path = new Array(nFrames);
  for (let f = nFrames - 1; f >= 0; f--) { path[f] = frames[f][bi].n; bi = bk[f][bi] >= 0 ? bk[f][bi] : 0; }
  return path;
}

const energy = new Float32Array(nFrames);
for (let f = 0; f < nFrames; f++) {
  const m = mags[f];
  let e = 0; for (let k = 0; k < m.length; k++) e += m[k];
  energy[f] = e;
}
const melRaw = trackPitch(196, 1050, 3, 0.55, 2.2);
const basRaw = trackPitch(55, 200, 2, 0.7, 3.0);
/* silence gate: frames well below the median get no note at all */
const eSorted = Array.from(energy).sort((a, b) => a - b);
const eMed = eSorted[Math.floor(eSorted.length / 2)] || 1;
for (let f = 0; f < nFrames; f++) if (energy[f] < eMed * 0.18) { melRaw[f] = 0; basRaw[f] = 0; }

function medianFilter(arr, w) {
  const out = arr.slice();
  const h = w >> 1;
  for (let i = 0; i < arr.length; i++) {
    const s = [];
    for (let j = Math.max(0, i - h); j <= Math.min(arr.length - 1, i + h); j++) s.push(arr[j]);
    s.sort((a, b) => a - b);
    out[i] = s[s.length >> 1];
  }
  return out;
}
let mel = medianFilter(melRaw, 7);
let bas = medianFilter(basRaw, 11);

/* ── KEY, AND SNAP TO IT ──
   Even with the path constraint the tracker still lands the odd note a
   semitone out, and one wrong semitone is the most audible mistake available
   on a square wave — there is no timbre to hide behind.  Pick the diatonic set
   that already accounts for most of what was heard, then move the strays to
   the nearest degree of it.  This cannot invent a melody, only stop one
   sounding broken: on the village theme the histogram is C/A-minor with a
   single F# against 68 in-key notes, and that F# is the only thing it moves. */
const PROFILE = new Float64Array(12);
for (const n of melRaw) if (n) PROFILE[n % 12] += 2;
for (const n of basRaw) if (n) PROFILE[n % 12] += 1;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
let keyRoot = 0, keyScore = -1;
for (let r = 0; r < 12; r++) {
  let sc = 0;
  for (const d of MAJOR) sc += PROFILE[(r + d) % 12];
  if (sc > keyScore) { keyScore = sc; keyRoot = r; }
}
const inKey = new Set(MAJOR.map((d) => (keyRoot + d) % 12));
const snap = (n) => {
  if (!n || inKey.has(n % 12)) return n;
  for (let d = 1; d <= 2; d++) {
    if (inKey.has(((n - d) % 12 + 12) % 12)) return n - d;
    if (inKey.has((n + d) % 12)) return n + d;
  }
  return n;
};
const snappedLead = mel.filter((n) => n && !inKey.has(n % 12)).length;
mel = mel.map(snap);
bas = bas.map(snap);

/* ── 4. tempo ──────────────────────────────────────────────────────────── */
const frameSec = HOP / SR;
let bestLag = 0, bestScore = -1;
for (let lag = Math.round(0.30 / frameSec); lag <= Math.round(1.00 / frameSec); lag++) {
  let s = 0;
  for (let f = 0; f + lag < nFrames; f++) s += flux[f] * flux[f + lag];
  s /= (nFrames - lag);
  if (s > bestScore) { bestScore = s; bestLag = lag; }
}
let beat = bestLag * frameSec;
while (beat < 0.34) beat *= 2;          /* >176 BPM reads as double-time */
while (beat > 0.86) beat /= 2;
const bpm = Math.round(60 / beat);
const step = beat / 2;                   /* 1/8 grid */

/* ── 3+5. segment onto the grid ────────────────────────────────────────── */
function segment(track, minSteps) {
  const nSteps = Math.floor((nFrames * frameSec) / step);
  const out = [];
  for (let s = 0; s < nSteps; s++) {
    const f0 = Math.floor((s * step) / frameSec), f1 = Math.floor(((s + 1) * step) / frameSec);
    const counts = Object.create(null);
    for (let f = f0; f < f1 && f < nFrames; f++) counts[track[f]] = (counts[track[f]] || 0) + 1;
    let bestN = 0, bestC = 0;
    for (const k of Object.keys(counts)) if (counts[k] > bestC) { bestC = counts[k]; bestN = +k; }
    out.push(bestN);
  }
  /* merge runs, drop stutter */
  const merged = out.slice();
  for (let i = 1; i < merged.length - 1; i++) {
    if (merged[i] !== merged[i - 1] && merged[i - 1] === merged[i + 1]) merged[i] = merged[i - 1];
  }
  return merged;
}
const melSteps = segment(mel, 1);
const basSteps = segment(bas, 1);
/* percussion: grid steps carrying an onset peak */
const fluxSteps = [];
for (let s = 0; s < melSteps.length; s++) {
  const f0 = Math.floor((s * step) / frameSec), f1 = Math.floor(((s + 1) * step) / frameSec);
  let mx = 0; for (let f = f0; f < f1 && f < nFrames; f++) mx = Math.max(mx, flux[f]);
  fluxSteps.push(mx);
}
const fSorted = fluxSteps.slice().sort((a, b) => a - b);
const fThr = fSorted[Math.floor(fSorted.length * 0.62)] || 0;
const perc = fluxSteps.map((v) => (v > fThr ? 1 : 0));

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const data = {
  source: src, bpm, key: NAMES[keyRoot] + ' major / ' + NAMES[(keyRoot + 9) % 12] + ' minor',
  stepSec: +step.toFixed(5), steps: melSteps.length,
  lead: melSteps, bass: basSteps, perc,
};
writeFileSync(prefix + '.json', JSON.stringify(data));

/* ── preview render ────────────────────────────────────────────────────── */
/* ═══ v2.3.1806: HOLD THE NOTE ═══
   Owner, on the first render: "The chiptune is too much like isolated notes
   instead of a melody.  Is there a way to hold each note as it transitions to
   the next one?"

   Yes, and the fault was entirely in the VOICING — the transcription was
   fine.  Every step was struck with a decay envelope that reached silence
   inside its own 1/8, so each note died before its neighbour began and the
   ear got 69 events instead of a line.  Two things fix it:

     1. NOTES ARE SEGMENTS, NOT STEPS.  Consecutive steps on the same pitch
        are ONE note held across them, struck once.  (The piano roll has drawn
        them that way from the start — the picture was right and the sound was
        not.)
     2. SUSTAIN, then a release only at the very END of the note.  A short
        attack, a small dip to a sustain level, then hold, then ~20ms of
        release into the next note — long enough to avoid a click, far too
        short to be heard as a gap.

   The hat that marked every step is gone too: a click on each 1/8 was
   reinforcing exactly the pulse the owner is describing.  The noise channel
   now speaks only where an onset was actually detected. */
const OSR = 22050;
const total = Math.ceil(melSteps.length * step * OSR);
const out = new Float32Array(total);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let lfsr = 1;
const noise = () => { const b = ((lfsr ^ (lfsr >> 1)) & 1); lfsr = (lfsr >> 1) | (b << 14); return (lfsr & 1) ? 1 : -1; };

/* Merge runs of equal pitch into held notes — the same merge the roll draws. */
function segments(track) {
  const segs = [];
  let i = 0;
  while (i < track.length) {
    if (!track[i]) { i++; continue; }
    let j = i;
    while (j + 1 < track.length && track[j + 1] === track[i]) j++;
    segs.push({ n: track[i], t0: i * step, t1: (j + 1) * step });
    i = j + 1;
  }
  return segs;
}
const ATT = 0.008, DIP = 0.045, SUS = 0.84, REL = 0.020;
function envelope(t, dur) {
  if (t < 0 || t > dur) return 0;
  const rel = Math.min(REL, dur * 0.25);
  if (t < ATT) return t / ATT;                             /* strike */
  if (t > dur - rel) return SUS * (dur - t) / rel;         /* let go, at the END */
  if (t < ATT + DIP) return 1 - (1 - SUS) * (t - ATT) / DIP;
  return SUS;                                              /* HOLD */
}
/* Adds one voice's segments into the buffer.  `wave` takes a phase in [0,1). */
function render(segs, wave, gain, semitoneShift, vib) {
  for (const g of segs) {
    const dur = g.t1 - g.t0;
    const f = hz(g.n + (semitoneShift || 0));
    const i0 = Math.floor(g.t0 * OSR), i1 = Math.min(total, Math.ceil(g.t1 * OSR));
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const t = i / OSR - g.t0;
      /* Vibrato only once a note has been held a while — it is what makes a
         sustained square read as sung rather than as a test tone, and on a
         short note it would just sound out of tune. */
      const fv = (vib && t > 0.22) ? f * (1 + 0.005 * Math.sin(2 * Math.PI * 5.5 * (t - 0.22))) : f;
      ph += fv / OSR;
      if (ph >= 1) ph -= 1;
      out[i] += wave(ph) * gain * envelope(t, dur);
    }
  }
}
const pulse50 = (p) => (p < 0.5 ? 1 : -1);
const pulse25 = (p) => (p < 0.25 ? 1 : -1);
const tri16 = (p) => { const v = p < 0.5 ? p * 4 - 1 : 3 - p * 4; return Math.round(v * 7.5) / 7.5; };

const leadSegs = segments(melSteps), bassSegs = segments(basSteps);
render(leadSegs, pulse50, 0.25, 0, true);
/* PULSE 2: the same note an octave down at a narrow duty.  The NES's second
   voice, and deliberately the SAME note rather than an invented harmony — a
   third guessed against a transcription that is already approximate is how
   you get a chord that fights the original. */
render(leadSegs, pulse25, 0.12, -12, false);
render(bassSegs, tri16, 0.30, 0, false);
/* NOISE: only where an onset was detected.  A hat on every step was marking
   the grid, which is the very thing that made this read as steps. */
for (let s = 0; s < perc.length; s++) {
  if (!perc[s]) continue;
  const i0 = Math.floor(s * step * OSR), i1 = Math.min(total, i0 + Math.ceil(0.06 * OSR));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / OSR;
    out[i] += noise() * 0.10 * Math.pow(Math.max(0, 1 - t / 0.06), 2);
  }
}
for (let i = 0; i < total; i++) out[i] = Math.max(-1, Math.min(1, out[i] * 0.8));
const pcm = Int16Array.from(out, (v) => v * 32767);
const b = Buffer.alloc(44 + pcm.length * 2);
b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVE', 8);
b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(OSR, 24); b.writeUInt32LE(OSR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40);
Buffer.from(pcm.buffer).copy(b, 44);
writeFileSync(prefix + '.wav', b);

const voiced = melSteps.filter(Boolean).length;
console.log(`  key ${NAMES[keyRoot]} major / ${NAMES[(keyRoot + 9) % 12]} minor, ${snappedLead} out-of-key lead frame(s) snapped`);
console.log(`${prefix}.json  ${bpm} BPM, ${melSteps.length} steps (${(melSteps.length * step).toFixed(1)}s), lead voiced ${voiced}/${melSteps.length}, ${(JSON.stringify(data).length / 1024).toFixed(1)}KB`);
console.log(`${prefix}.wav   preview, ${(b.length / 1024).toFixed(0)}KB`);
