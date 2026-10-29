/* ═══ v2.3.3731: ROBUST RUNNING STATISTICS FOR THE SERVER'S BOT SIGNALS ═══
 *
 * botsig.js measures what a script must send anyway (message timing, path
 * shapes, reaction times, where it stands) over HUNDREDS of events, because a
 * single measurement is blurred by the network: a phone's frame arrives 20 to
 * 200 ms late, differently every time.  Means and variances are dragged by
 * one stalled frame; quantiles are not.  So each measure is a small LOG-SCALE
 * HISTOGRAM -- a fixed array of counts, mergeable, cheap to store, decayed by
 * halving (the Welford cap's exponential forgetting, botfp.js) -- and the
 * signals read quantiles off it.  No raw event is kept.
 *
 * Pure functions, no imports: node tests them directly. */

/* A histogram of positive values on a log scale: `per` bins an octave from
   `lo`, `n` bins, everything under `lo` in bin 0 and over the top in the
   last.  Stored as a plain array of counts. */
export function histNew(n) { return new Array(n).fill(0); }

export function histBin(v, lo, per, n) {
  if (!(v > lo)) return 0;
  const b = Math.floor(per * Math.log2(v / lo)) + 1;
  return b >= n ? n - 1 : b;
}

/* the value a bin stands for (its lower edge; bin 0 is `lo` and under) */
export function histVal(b, lo, per) {
  return b <= 0 ? lo : lo * Math.pow(2, (b - 1) / per);
}

/* add one value; past `cap` events every count halves (old evidence fades,
   and a stored histogram stays small) */
export function histAdd(h, v, lo, per, cap) {
  if (!Array.isArray(h)) return;
  h[histBin(v, lo, per, h.length)]++;
  let t = 0;
  for (const c of h) t += c;
  if (cap && t > cap) for (let i = 0; i < h.length; i++) h[i] = Math.floor(h[i] / 2);
}

export function histTotal(h) {
  let t = 0;
  if (Array.isArray(h)) for (const c of h) t += c;
  return t;
}

/* the bin holding quantile q (0..1) */
export function histQuantBin(h, q) {
  const t = histTotal(h);
  if (!t) return -1;
  const want = q * t;
  let acc = 0;
  for (let i = 0; i < h.length; i++) {
    acc += h[i];
    if (acc >= want && h[i] > 0) return i;
  }
  return h.length - 1;
}

/* THE SPREAD, robustly: how many bins lie between the 10th and the 90th
   percentile.  At `per` bins an octave, a spread of `per` means the slow
   tenth is twice the quick tenth.  A timer read through a network lands in
   one or two bins; a thumb spreads over many. */
export function histSpread(h) {
  const a = histQuantBin(h, 0.1), b = histQuantBin(h, 0.9);
  return a < 0 ? Infinity : b - a;
}

/* THE PEAK: the largest share of all events in any `w` neighbouring bins.
   One repeated value (the same standing distance, the same gap) is a peak
   near 1; a person's spread keeps it well under. */
export function histPeak(h, w) {
  const t = histTotal(h);
  if (!t) return 0;
  const width = Math.max(1, w | 0);
  let best = 0, run = 0;
  for (let i = 0; i < h.length; i++) {
    run += h[i];
    if (i >= width) run -= h[i - width];
    if (run > best) best = run;
  }
  return best / t;
}

/* the median, as a value */
export function histMedian(h, lo, per) {
  const b = histQuantBin(h, 0.5);
  return b < 0 ? null : histVal(b, lo, per);
}

/* a share of events at or under a value */
export function histShareUnder(h, v, lo, per) {
  const t = histTotal(h);
  if (!t) return 0;
  const lim = histBin(v, lo, per, h.length);
  let acc = 0;
  for (let i = 0; i <= lim && i < h.length; i++) acc += h[i];
  return acc / t;
}

/* A histogram of an angle's turn per step, linear bins from 0 to 180 degrees. */
export function linBin(v, max, n) {
  if (!(v > 0)) return 0;
  const b = Math.floor((v / max) * n);
  return b >= n ? n - 1 : b;
}
