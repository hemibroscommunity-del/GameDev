/* chiptune_render.mjs — render a NES-shaped tune to WAV (v2.3.1802).
 *
 * Owner: "I'm also wanting a change in direction for the music.  I want it to
 * sound more like NES instead of an epic orchestra.  Is there a way I can just
 * convert it to lower bit music somehow?"
 *
 * The answer to the literal question is tools/audio_crush.mjs, which
 * downsamples and quantises an existing track.  This file exists because the
 * answer to the REAL question is different: a crush makes the same orchestral
 * performance sound damaged, whereas NES music is four synthesised voices
 * playing a written part.  Those are not degrees of the same thing, and the
 * only way to settle which one the owner means is to put both in their ears.
 *
 * Kept in the repo rather than thrown away because if the direction is taken,
 * this is where the tracks get made — the channel model below (two pulse, a
 * stepped triangle, an LFSR noise) is the 2A03's, and the tune is data.
 *
 * Usage: node tools/chiptune_render.mjs <out.wav>
 */
import { writeFileSync } from 'node:fs';
const SR = 22050, BPM = 132, BEAT = 60 / BPM, LEN = 16 * BEAT;
const n = Math.floor(SR * LEN);
const out = new Float32Array(n);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const N = { A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, A2: 45, C3: 48, D3: 50, E3: 52, F3: 53, G3: 55 };

/* pulse: duty-cycle square, the NES's two lead voices */
function pulse(t, f, duty) { const p = (t * f) % 1; return p < duty ? 0.25 : -0.25; }
/* triangle: 16-step staircase, the NES's bass — quantised on purpose */
function tri(t, f) { const p = (t * f) % 1; const v = p < 0.5 ? p * 4 - 1 : 3 - p * 4; return Math.round(v * 7.5) / 7.5 * 0.3; }
let lfsr = 1;
function noise() { const b = ((lfsr ^ (lfsr >> 1)) & 1); lfsr = (lfsr >> 1) | (b << 14); return (lfsr & 1) ? 0.12 : -0.12; }

/* melody (lead), 1/8 notes; 0 = rest */
const lead = [N.A4,N.C5,N.E5,N.C5, N.D5,N.C5,N.B4,0, N.G4,N.B4,N.D5,N.B4, N.C5,N.B4,N.A4,0,
              N.A4,N.C5,N.E5,N.A4, N.F4,N.E4,N.D4,0, N.E4,N.G4,N.B4,N.G4, N.A4,0,N.A4,0];
/* counter-melody, quieter, 1/8 */
const harm = [N.E4,0,N.A4,0, N.F4,0,N.G4,0, N.D4,0,N.G4,0, N.E4,0,N.E4,0,
              N.E4,0,N.A4,0, N.D4,0,N.F4,0, N.C4,0,N.E4,0, N.A3,0,N.A3,0];
/* bass, 1/4 */
const bass = [N.A2,N.A2,N.F3,N.F3, N.G3,N.G3,N.E3,N.E3, N.A2,N.A2,N.D3,N.D3, N.E3,N.E3,N.A2,N.A2];

const env = (x, dur) => { const a = 0.004; if (x < a) return x / a; const d = Math.max(0, 1 - (x - a) / (dur * 0.9)); return d * d; };
for (let i = 0; i < n; i++) {
  const t = i / SR;
  const eighth = Math.floor(t / (BEAT / 2)) % lead.length;
  const quarter = Math.floor(t / BEAT) % bass.length;
  const te = t % (BEAT / 2), tq = t % BEAT;
  let v = 0;
  if (lead[eighth]) v += pulse(t, hz(lead[eighth]), 0.5) * env(te, BEAT / 2) * 0.9;
  if (harm[eighth]) v += pulse(t, hz(harm[eighth]), 0.125) * env(te, BEAT / 2) * 0.55;
  v += tri(t, hz(bass[quarter])) * env(tq, BEAT) * 0.9;
  /* hats on the off-beat, a snare-ish burst on 2 and 4 */
  const sixteenth = Math.floor(t / (BEAT / 4));
  if (sixteenth % 2 === 1) v += noise() * env(t % (BEAT / 4), BEAT / 8) * 0.35;
  if (quarter % 2 === 1 && tq < 0.06) v += noise() * env(tq, 0.06) * 1.5;
  out[i] = Math.max(-1, Math.min(1, v * 0.75));
}
const pcm = Int16Array.from(out, (v) => v * 32767);
const b = Buffer.alloc(44 + pcm.length * 2);
b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVE', 8);
b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40);
Buffer.from(pcm.buffer).copy(b, 44);
writeFileSync(process.argv[2], b);
console.log(process.argv[2], (b.length / 1024).toFixed(0) + 'KB', LEN.toFixed(1) + 's');
