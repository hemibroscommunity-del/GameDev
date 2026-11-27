/* ═══ v2.3.6763: THE SPARE ARMOUR SETS BAKE AFTER THE LOADING SCREEN (card LOAD part 3b) ═══
 *
 * The owner's iPhone, a first login (2026-11-27, the Test panel's Loading
 * times): the loading screen up 42.5 s, lifted by "its 20 s limit";
 * "25.0 s The armour's body frames were baked", "54.7 s The spare armour sets
 * were baked", "55.1 s The bro was ready".  The spare sets (the frames of each
 * piece in the bag put on over what you wear: entityRenderer.js
 * prewarmAltWornSets) were the screen's last half-minute.  Asked "may the
 * spare armour sets finish preparing after the loading screen lifts? ... the
 * only cost is that changing armour in your first half-minute might wait a
 * moment", THE OWNER, 05:30 UTC 2026-11-27: "Yes".
 *
 * So the bro's chain after the loads (pixiRenderer.js preloadPlayerAssets)
 * is, by default:
 *   screen:  masks, upload, gear, warm, done    <- what the loading screen awaits
 *   spare:   (screen) then spareTime, then alt  <- after the lift, in spare time
 * and with `?sparelater=0` the old order, alt behind the screen:
 *   screen:  masks, alt, upload, gear, warm, done
 * Everything the bro WEARS still bakes and goes to the graphics chip behind
 * the screen (masks, upload); only the sets one equip away move.
 *
 * Each step is a function giving a promise (or nothing); a step that throws
 * or rejects is passed over, as the old chain's .catch(() => {}) did.
 * `note(step)` is called as each step ends (pixiRenderer's _preStep: QA's
 * __btPreloadSteps and the Loading times readout's `bro-<step>`).
 *
 * No imports, so node can test it (tools/guards/sparelater.test.mjs).
 */

const _run = (f) => Promise.resolve().then(() => (typeof f === 'function' ? f() : null)).catch(() => {});

/** The bro's chain after the loads.  `later`: the spare sets after the screen
 *  (the default); false, the old order.  Returns { screen, spare }: `screen` is
 *  what the loading screen waits for, `spare` settles once the spare sets are
 *  baked (behind the screen, the same moment as `screen`, with later off). */
export function broChain(later, steps, note) {
  const S = steps || {};
  const mark = (k) => () => { try { if (note) note(k); } catch (e) { /* a mark's own trouble */ } };
  let chain = _run(S.masks).then(mark('masks'));
  if (!later) chain = chain.then(() => _run(S.alt)).then(mark('alt'));
  chain = chain.then(() => _run(S.upload)).then(mark('upload'))
    .then(() => _run(S.gear)).then(mark('gear'))
    .then(() => _run(S.warm)).then(mark('done'));
  const spare = !later ? chain
    : chain.then(() => _run(S.spareTime)).then(() => _run(S.alt)).then(mark('alt'));
  return { screen: chain, spare };
}
