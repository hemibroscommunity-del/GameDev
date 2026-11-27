/* ═══ v2.3.6763: THE SPARE SETS' GATE AND PACE (card LOAD part 3b) ═══
 *
 * src/rendering/systems/entityRenderer.js prewarmAltWornSets: the sets one
 * equip away bake after the loading screen is gone (the owner's "Yes",
 * 2026-11-27; the chain's order: game/spareLater.js).  Nothing of a spare pass
 * runs before pixiRenderer.js opens spare time (the world in); after it the
 * pass's page work goes at the top of a frame (framePacer.js beforeDraw).
 * `?sparelater=0`: the gate open from the start, the old order.
 */
import { sw } from './switches.js';
import { beforeDraw } from './framePacer.js';

const SPARE_LATER = typeof location === 'undefined' || !sw('sparelater');
export const spareLaterOn = () => SPARE_LATER;
let _open = !SPARE_LATER, _openFn = null;
const _time = SPARE_LATER ? new Promise((r) => { _openFn = r; }) : Promise.resolve();
/** A spare pass in play waits for this (`later`: the pass after the screen, counted). */
export function spareTime(later) { if (later) laterNote('run'); return _time; }
/** The loading screen is gone: the spare sets may bake (pixiRenderer.js). */
export function openSpareTime() {
  _open = true;
  if (_openFn) { const f = _openFn; _openFn = null; f(); }
}
let _ranFn = null;
const _ran = new Promise((r) => { _ranFn = r; });
/** A spare pass ran to its end (not stopped by a newer one): the first such
 *  end after spare time opened settles whenSpareSetsBaked. */
export function spareSetsRan(fast, laterT0, upload) {
  /* `later`: the last frames to the chip as the equip's pass sends its own (2 ms a frame) */
  if (laterT0) { laterSlice(laterT0); laterNote('end'); _quiet(upload); }
  if (_open && !fast && _ranFn) { const f = _ranFn; _ranFn = null; f(); }
}
/** The readout's "The spare armour sets were baked" (pixiRenderer.js). */
export const whenSpareSetsBaked = () => _ran;
export const topOfFrame = () => new Promise((r) => beforeDraw(r));
const _quiet = (f) => { try { const p = f(); if (p && p.catch) p.catch(() => { /* best-effort */ }); } catch (e) { /* best-effort */ } };
/** `later`: never more than a few ms on the page at a go -- past 4 ms since
 *  `t0`, wait for the top of the next frame.  Returns the new `t0`. */
export async function laterBreath(t0) {
  if (performance.now() - t0 <= 4) return t0;
  laterSlice(t0);
  await topOfFrame();
  return performance.now();
}
/** `later`: one job -- at the top of a frame, the frames already back go to
 *  the chip (2 ms at most) and the job goes out to the worker (unless a newer
 *  pass took over meanwhile: `alive`), its answer awaited.  Returns the new `t0`. */
export async function laterJob(t0, alive, upload, bake) {
  laterSlice(t0);
  await topOfFrame();
  if (!alive()) return performance.now();
  const t1 = performance.now();
  _quiet(upload);
  let job = null;
  try { job = bake(); } catch (e) { /* best-effort */ }
  laterSlice(t1, true);
  try { await job; } catch (e) { /* best-effort */ }
  return performance.now();
}
/* QA (mp-sparelater): the `later` pass's runs, ends and jobs, and the longest
   stretch the page spent on it between two of its waits (the 12 ms line) */
const _st = { runs: 0, ends: 0, jobs: 0, slices: 0, maxMs: 0, at: [] };
export function laterSlice(t0, job) {
  const ms = performance.now() - t0;
  _st.slices++;
  if (job) _st.jobs++;
  if (ms > _st.maxMs) _st.maxMs = +ms.toFixed(2);
}
export function laterNote(ev) {
  if (ev === 'run') _st.runs++;
  else if (ev === 'end') _st.ends++;
  if (ev !== 'ran' && _st.at.length < 24) _st.at.push({ ev, t: Math.round(performance.now()) });
}
if (typeof window !== 'undefined') {
  try { window.__btSpareLater = () => Object.assign({ on: SPARE_LATER, opened: _open }, _st, { at: _st.at.slice() }); } catch (e) { /* QA only */ }
}
