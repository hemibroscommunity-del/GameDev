/* ═══ v2.3.1953: HOW TALL YOU ARE, AND HOW BROAD ═══
 *
 * Owner: "is there a way to add 'height' to your character as an option?
 * Just thinking creatively here" ... then "Yes build the heights too.  I
 * liked the previews you built.  Whatever option choices you think are best.
 * Maybe also frame wideness (thin, medium, large)".
 *
 * ── NO NEW ART, AND THAT IS THE WHOLE POINT ──
 * Every other trait in this folder picks a SPRITE.  This one picks two
 * numbers, because the figure is one sheet of pixel art and a second set of
 * body sheets at another height would multiply every animation, every gear
 * overlay and every recolour bake by three.  A render scale costs nothing at
 * load time and nothing on the wire, and the two axes are independent, so
 * three heights x three frames is NINE silhouettes from one sheet:
 * short+large reads as a stocky bloke, tall+thin reads as lanky.
 *   v2.3.1996: the frame axis is now LOCKED to medium by owner directive,
 *   so what ships is the THREE heights.  See FRAME_CATALOG below for why
 *   the lock lives in the catalog rather than in the picker.
 *
 * ── THE NUMBERS ARE MEASURED, NOT GUESSED ──
 * Rendered as a 3x3 contact sheet at several spreads (scratch probe
 * build-grid), south and southwest, bare and with hat + beard + shirt.
 *   - +-10% was real but timid: you had to put two figures side by side.
 *   - +-18% was clearly legible but the HEAD started to read as stretched
 *     (a 1.18 head on a tall+thin figure looks long rather than tall).
 * The pair below sits between them: every build is tellable on its own, and
 * nothing looks like a squashed sprite.  Frame gets slightly more room than
 * height because horizontal stretch on this figure is mostly shoulders and
 * boots, which absorb it better than a face does.
 *
 * ── COSMETIC ONLY, STRUCTURALLY ──
 * This is a RENDER scale and nothing else.  It is applied to the display
 * container in entityRenderer and to the canvas transform in
 * characterPortrait; no hitbox, no reach, no speed and no collision radius
 * reads it, and none can, because none of them touch a display object.  That
 * mattered before it was built: if `tall` grew the hurtbox it would be a
 * downgrade, and if it grew the melee reach it would be pay-to-be-lanky.
 */

/* ═══ v2.3.2268: HEIGHT IS LOCKED TO AVERAGE, THE WAY FRAME ALREADY WAS ═══
 *
 * Owner: "I changed my mind on the build sizes during the create a character.
 * It looks bad.  Use the medium (default) character only.  Remove it as an
 * option in the trait picker and remove the tall and short build from the
 * game."
 *
 * This is the same move v2.3.1996 made on FRAME_CATALOG, for the same reason
 * and with the same one-line reach -- see that note below, every word of it
 * applies here.  The catalog is the ONE place that decides what a height id may
 * be, so emptying it to a single entry locks the axis everywhere at once rather
 * than hiding a picker the store, the wire and the renderer would all still
 * honour:
 *
 *   - heightMul('tall'|'short')   -> 1 (not found -> 1), so a peer still on an
 *     older client with a tall build selected renders AVERAGE here.
 *   - sanitizeHeight(anything)    -> 'average'.
 *   - setBuildHeight('tall')      -> rejected; the store keeps 'average'.
 *   - the localStorage read below fails its `some()` check, so a player who
 *     picked Short or Tall before today loads average rather than being stuck
 *     on a build the game no longer offers.  THAT is the migration, and it
 *     needs no migration code: the guard was written for exactly this.
 *   - wireHeight() is now always undefined, so 'ht' drops off the join frame
 *     entirely -- there is nothing to relay when there is only one answer.
 *
 * The plumbing STAYS (buildScale still multiplies sy; 'ht' is still an allowed
 * cosmetic key on the server).  It costs nothing at 1.00, and putting the
 * heights back later is this array plus the picker, not a protocol change.
 *
 * With both axes now locked the BUILD TAB has nothing left to offer, so it
 * goes from the picker too (NameModal) -- a tab whose only control is a
 * single already-selected option is worse than no tab. */
export const HEIGHT_CATALOG = [
  { id: 'average', name: 'Average', mul: 1.00 },
];

/* ═══ v2.3.1996: FRAME IS LOCKED TO MEDIUM ═══
 *
 * Owner: "keep the medium build only and only allow the height to change".
 *
 * The catalog is the ONE place that decides what a frame id may be, so
 * emptying it to a single entry locks the axis everywhere at once rather than
 * hiding a picker that the store, the wire and the renderer would all still
 * honour.  Every consumer already answers the default for an id it does not
 * recognise -- that was the deploy-order safety property v2.3.1953 was built
 * with -- so this one edit is enough to hold the lock:
 *
 *   - frameMul('thin'|'large')  -> 1 (not found -> 1), so a peer on an older
 *     client who still has a wide build selected renders MEDIUM here.
 *   - sanitizeFrame(anything)   -> 'medium'.
 *   - setBuildFrame('large')    -> rejected; the store keeps 'medium'.
 *   - the localStorage read below fails its `some()` check, so a player who
 *     picked Thin or Large before today loads medium instead of being stuck
 *     on a build the game no longer offers.
 *   - wireFrame() is now always undefined, so 'fr' drops off the join frame
 *     entirely -- there is nothing to relay when there is only one answer.
 *
 * The plumbing STAYS (buildScale still multiplies sx; 'fr' is still an allowed
 * cosmetic key on the server).  It costs nothing at 1.00, and putting a second
 * frame back later is then this array plus the picker, not a protocol change.
 * The height axis is untouched: short / average / tall all still pick, still
 * relay, still render.
 */
export const FRAME_CATALOG = [
  { id: 'medium', name: 'Medium', mul: 1.00 },
];

export const DEFAULT_HEIGHT = 'average';
export const DEFAULT_FRAME = 'medium';

/** Vertical multiplier for a height id.  Unknown / absent -> 1 (average), so a
 *  peer on an older client, or one who never opened the tab, renders exactly as
 *  they do today.  That fallback is the deploy-order safety property: this can
 *  ship on either side first. */
export function heightMul(id) {
  const e = HEIGHT_CATALOG.find((h) => h.id === id);
  return e ? e.mul : 1;
}

/** Horizontal multiplier for a frame id.  Same fallback, same reason. */
export function frameMul(id) {
  const e = FRAME_CATALOG.find((f) => f.id === id);
  return e ? e.mul : 1;
}

/** The pair, as the renderer wants it: { sx, sy } to multiply a display scale
 *  by.  One place computes it so the world, the portrait and the designer
 *  preview can never disagree about what "tall" means. */
export function buildScale(heightId, frameId) {
  return { sx: frameMul(frameId), sy: heightMul(heightId) };
}

/* ═══ v2.3.1953: WHY THE PORTRAIT DRAWS EVERYONE A LITTLE SMALLER ═══
 *
 * A 256-frame portrait has no spare room.  MEASURED (probe crown.mjs, every
 * hat x five facings): a bare figure spans y 0.125 to its feet at 0.977, an
 * afro under a sombrero starts at 0.059 — and a handful of oversized hats
 * (wizard hat, both crowns, shark hat, axe head over an afro) ALREADY reach
 * y 0 and are clipped by the frame today, before any of this.
 *
 * There is no way to show a 13%-taller figure in a fixed box without making
 * the reference smaller — that IS what taller means — so every full-figure
 * portrait draws through this one constant.  It is set from the realistic
 * worst case rather than the absolute one:
 *
 *     0.977 / ((0.977 - 0.059) * 1.13) = 0.942     [afro + sombrero, tall]
 *
 * so a tall bro in the biggest NORMAL hat lands right at the top edge.  The
 * five hats that overflow the frame at average build still overflow it at
 * tall, by a little more; fitting THOSE would need 0.885, which would shrink
 * every portrait in the game by 12% to accommodate five hats that are already
 * cropped.  Not worth it, and stated here so it is a decision rather than a
 * surprise.
 *
 * It applies to EVERY build including average, or `tall` and `average` would
 * be measured against different references and the comparison would be a lie.
 * The headshot path opts out (portraitDataUrl passes buildFit:false): it
 * renders at the default build and crops in raw pixel coordinates.
 */
export const PORTRAIT_FIT = 0.94;

/* ── selection store (localStorage), same shape as eyeColorCatalog ── */
const HEIGHT_KEY = 'bt-height';
const FRAME_KEY = 'bt-frame';

let _height = DEFAULT_HEIGHT;
let _frame = DEFAULT_FRAME;
try {
  const h = typeof localStorage !== 'undefined' && localStorage.getItem(HEIGHT_KEY);
  if (h && HEIGHT_CATALOG.some((e) => e.id === h)) _height = h;
  const f = typeof localStorage !== 'undefined' && localStorage.getItem(FRAME_KEY);
  if (f && FRAME_CATALOG.some((e) => e.id === f)) _frame = f;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();
function _notify() { _listeners.forEach((fn) => { try { fn(_height, _frame); } catch (e) { /* ignore */ } }); }

export function getBuildHeight() { return _height; }
export function getBuildFrame() { return _frame; }

export function setBuildHeight(id) {
  if (id === _height || !HEIGHT_CATALOG.some((e) => e.id === id)) return;
  _height = id;
  try { localStorage.setItem(HEIGHT_KEY, id); } catch (e) { /* ignore */ }
  _notify();
}

export function setBuildFrame(id) {
  if (id === _frame || !FRAME_CATALOG.some((e) => e.id === id)) return;
  _frame = id;
  try { localStorage.setItem(FRAME_KEY, id); } catch (e) { /* ignore */ }
  _notify();
}

export function onBuildChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** What to put on the wire: the id, or undefined when it is the default.
 *  Undefined keeps the whole feature off the join frame of everyone who never
 *  opened the tab, exactly as the drawings do. */
export function wireHeight() { return _height === DEFAULT_HEIGHT ? undefined : _height; }
export function wireFrame() { return _frame === DEFAULT_FRAME ? undefined : _frame; }

/** Sanitise an id off the wire.  A peer can send anything; an unknown value
 *  falls back to the default rather than reaching a lookup that would return
 *  undefined and multiply a scale by NaN. */
export function sanitizeHeight(id) {
  return HEIGHT_CATALOG.some((e) => e.id === id) ? id : DEFAULT_HEIGHT;
}

/* Dev probe, house style (__btAtkMark, __btMaybeSwordDash): what the STORE
 * actually holds, which is not the same question as what the renderer drew.
 * v2.3.2268 locks both axes by emptying their catalogs, and the thing that
 * makes that safe is the localStorage guard rejecting a retired id -- a
 * renderer that ignored `tall` while the store still held it would look
 * identical on screen and hand the retired build straight back to the wire.
 * mp-build asserts through this, so that distinction is testable rather than
 * assumed. */
if (typeof window !== 'undefined') {
  window.__btBuild = function () {
    return {
      height: _height, frame: _frame,
      heights: HEIGHT_CATALOG.map((e) => e.id),
      frames: FRAME_CATALOG.map((e) => e.id),
      wire: { ht: wireHeight(), fr: wireFrame() },
    };
  };
}
export function sanitizeFrame(id) {
  return FRAME_CATALOG.some((e) => e.id === id) ? id : DEFAULT_FRAME;
}
