/* ═══ v2.3.3077: THE GATHERING POSES ARE MADE THE FIRST TIME THEY CAN BE WANTED ═══
 *
 * Owner, 2026-10-06, of the memory plan's trade-offs (docs/MEMORY-PLAN.md,
 * Phase 4): "Yes do all of them" -- among them "gathering poses built the
 * first time you gather (~27 MB): one small hitch the first time".
 *
 * The lumberjack, the cook and the fire-lighter are full-figure stand-ins
 * (effectsRenderer) baked with your skin and drawings: ~27 MB of canvases
 * made on the loading screen for every player, most of whom are not chopping,
 * cooking or lighting a fire yet, and none of it on the GPU until they do.
 * Now each is made the first time it CAN be wanted (effectsRenderer
 * _standInTriggers): the lumberjack when a tree is in reach and you hold the
 * axe for it, the cook when a campfire is lit, the fire-lighter when a log is
 * in your bag, any of them when a harvest of its kind starts or another
 * player near you does one.  So the bake lands while you walk up to the tree,
 * before the tap, and the hitch the owner accepted is that bake.
 *
 * A pose not made yet never hides a body: the walking figure stays where the
 * stand-in would have stood until it is ready (entityRenderer _chopHide and
 * the peers' _rexStandIn ask standInReady), never an empty spot.
 *
 * This registry is the one place both renderers read; the effects renderer
 * hands in how to make each (setStandInMaker).  QA: window.__btStandIns,
 * window.__btStandInMake.
 */
const KINDS = ['chop', 'cook', 'fire'];
const RETRY_MS = 15000;     /* a failed make is tried again after this */
let _gen = 0;
let _make = null;
const _st = Object.create(null);
/* v2.3.3136: whether the farm's covers -- what stands where the cook's pan
   is when the farmer kneels (src/data/farmCovers.js) -- are loaded.  The
   farm's pictures load and go with the farm (rendering/farmWorld.js), not
   with a renderer, so a rebuilt renderer leaves this as it was. */
let _farmCovers = false;
function fresh() { for (const k of KINDS) _st[k] = { state: 'idle', at: 0, ms: null, why: null }; }
fresh();

/** The effects renderer's maker: (kind) => Promise<boolean> (true when its
 *  frames exist).  A new renderer (a black screen's rebuild) starts every
 *  pose over: its frames are its own. */
export function setStandInMaker(fn) {
  _gen++;
  _make = typeof fn === 'function' ? fn : null;
  fresh();
}

/** Start making `kind` if it is not made or on its way.  Idempotent. */
export function ensureStandIn(kind, why) {
  const s = _st[kind];
  if (!s || !_make) return null;
  if (s.state === 'ready' || s.state === 'loading') return s.p || null;
  if (s.state === 'failed' && Date.now() - s.at < RETRY_MS) return null;
  const gen = _gen;
  s.state = 'loading';
  s.at = Date.now();
  s.why = why || null;
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  s.p = Promise.resolve()
    .then(() => _make(kind))
    .then((ok) => {
      if (gen !== _gen) return;
      s.state = ok ? 'ready' : 'failed';
      s.ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
      s.at = Date.now();
    }, () => {
      if (gen !== _gen) return;
      s.state = 'failed';
      s.at = Date.now();
    });
  return s.p;
}

/** Is `kind` made (its frames exist)? */
export function standInReady(kind) {
  const s = _st[kind];
  return !!s && s.state === 'ready';
}

/** Has `kind` been asked for (made, on its way, or failed)?  A skin or
 *  drawing change re-bakes only a pose that has been. */
export function standInStarted(kind) {
  const s = _st[kind];
  return !!s && s.state !== 'idle';
}

if (typeof window !== 'undefined') {
  /* QA: ask for a pose now, as a player's first want would (mp-standinskin
     reads the three poses' skin, which needs them made) */
  window.__btStandInMake = (kind) => Promise.resolve(ensureStandIn(kind, 'qa'));
  window.__btStandIns = () => {
    const out = {};
    for (const k of KINDS) out[k] = { state: _st[k].state, ms: _st[k].ms, why: _st[k].why };
    return out;
  };
}

/** v2.3.3136: the farm's covers are in (farmWorld.js preloadFarmArt), or gone. */
export function setFarmCoversReady(v) { _farmCovers = !!v; }
/** v2.3.3136: can the farmer kneel?  The cook's pose made with your skin and
 *  drawings, and the covers in.  Until then the walking body stays drawn. */
export function farmKneelReady() { return _farmCovers && standInReady('cook'); }
