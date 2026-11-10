/* ═══ v2.3.4395: WAS THE PAGE BUSY, OR WAS IT WAITING? ═══
 *
 * The owner's iPhone: "worst 378.0 = game 16.0 + outside 362.0", and no job
 * named past 13 ms.  "Outside" is everything between two of the game's
 * frames, and it is two different things with two different cures:
 *   - the page was BUSY: some code of ours (or the browser's, on the page's
 *     own thread) ran for that long -- a picture being prepared, a window
 *     being laid out.  The cure is to find it and split it or move it;
 *   - the page was WAITING: it had nothing to do and the browser did not
 *     call it -- the graphics chip had not finished the frames already sent,
 *     or the phone was doing something of its own.  The cure is to send the
 *     chip less (fewer frames a second, fewer pixels), not to hunt for code.
 * Safari has no long-task report, so with the meter on (`?perf=1` only) a
 * timer beats every few ms; a beat that comes late was held up by something
 * running.  busyIn(t0, t1, frames) is how long, between two moments, apart
 * from the game's own frames.  Tasks under about 6 ms are not counted.
 *
 * A browser that will not beat faster than every 12 ms (a throttled page)
 * cannot say: busyIn gives null, and the meter prints the old line.
 */
const BEAT_MS = 4;
const KEEP = 400;
let _on = false, _last = 0, _base = BEAT_MS, _n = 0;
const _gaps = new Float32Array(200);
let _gi = 0, _gn = 0;
const _held = [];   /* { a, b }: the page held from a to b (ms on performance.now) */

export function startBusyBeat() {
  if (_on || typeof window === 'undefined') return;
  _on = true;
  _last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const gap = now - _last;
    _last = now;
    _gaps[_gi] = gap; _gi = (_gi + 1) % _gaps.length; if (_gn < _gaps.length) _gn++;
    /* the beat this browser really gives: the low end of what it has given */
    if (++_n % 100 === 0) { const v = Array.from(_gaps.subarray(0, _gn)).sort((x, y) => x - y); _base = Math.max(1, v[Math.floor(v.length * 0.2)] || BEAT_MS); }
    if (gap > _base + 6) { _held.push({ a: now - gap + _base, b: now }); if (_held.length > KEEP) _held.splice(0, KEEP / 4); }
  }, BEAT_MS);
}

/** ms the page was held between t0 and t1, apart from `frames` ([start,
 *  end] pairs: the game's own); null when the beat is too slow to say. */
export function busyIn(t0, t1, frames) {
  if (!_on || _n < 100 || _base > 12) return null;
  let ms = 0;
  for (const h of _held) {
    const a = Math.max(h.a, t0), b = Math.min(h.b, t1);
    if (b <= a) continue;
    let part = b - a;
    if (frames) for (const f of frames) { const x = Math.max(a, f[0]), y = Math.min(b, f[1]); if (y > x) part -= y - x; }
    if (part > 0) ms += part;
  }
  return ms;
}
