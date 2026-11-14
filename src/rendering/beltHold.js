/* ═══ v2.3.5560: THE CHAIN BELT'S STAND-IN: THE IDLE FRAME ═══
 *
 * The owner, 2026-11-14, by the planning session ("Just go recommended"):
 * "the gear a character is WEARING at login loads behind the loading screen
 * (the preloading law), and a piece first put on mid-play draws its
 * stand-in until its sheet is ready, never nothing."
 *
 * Measured on main first (a QA probe, copper chest and greaves on a phone):
 *   - worn at login, every sheet the armour needs is in behind the loading
 *     screen, the chain belt too (entityRenderer.js prewarmMaskedBodyFrames
 *     waits for gearSheets.js preloadBeltSheets): nothing is first asked
 *     for after it lifts;
 *   - put on in play, the chest and the greaves are drawn at once (their
 *     colour numbers, or the RGBA every catalog piece loads behind the
 *     loading screen), but the chain belt has no layer of its own: it is
 *     painted onto the waist inside the masked body's jog bake, from its
 *     five jog sheets, and those are first asked for then -- 5.5 to 12.3 s
 *     each on the body bake's worker (pack-page, v2.3.5253).  Meanwhile a
 *     jog bake goes without the chain and is not kept (`beltPending`), so
 *     every jog frame of that facing drew the plain body under the armour,
 *     the trousers showing at the waist, and asked the worker for a bake it
 *     would throw away.
 *
 * The planning session's stand-in (worn-first.md's option B, for the belt):
 * no jog frame of a facing can have been baked with its chain before that
 * facing's sheet is in, so the frame held is the IDLE one -- while the
 * facing's belt sheet is on its way, a figure that would jog in a masked
 * bake (both pieces worn, and a facing the painted full-set figure does not
 * cover: north-east and north-west for a matched pair, every facing for a
 * mixed one) is drawn standing, its body, mask and armour together, the
 * belt in the stand pose's own art.  It runs again once the sheet is in.
 * No new memory: a test of the sheet's state, a frame.  A sheet given up on
 * (`[]`) is never waited for (the jog is drawn as before), and
 * `?beltstandin=0` is the game as it was.
 */
import { resolveDirection } from './playerSprites.js';
import { gearArt, gearMaterial } from './gearVariants.js';
import { gearSheetState, gearSheetWaiting } from './gearSheets.js';

const BELT_HOLD = (() => { try { return !/(^|[?&])beltstandin=(0|off|false)(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();
const _stats = { held: 0, peers: 0, firstAt: 0, lastAt: 0 };   /* QA: frames held (yours, others'), and when yours were */

/** The painted full-set figure draws this jog (pose, facing), so no masked
 *  bake is made for it (moved here from entityRenderer.js, v2.3.1408's
 *  `_fullsetCoversBake`, unchanged). */
export function fullsetCoversBake(worn, pose, dir) {
  /* v2.3.1408: DISPLAY_DS guard lifted with _fullsetFrame's (the figure
     path now runs at any DS), so the dead-bake skip keeps paying. */
  if (pose !== 'jog' || dir === 'northeast') return false;
  /* v2.3.1757: the worn keys carry the ITEM id, so a recoloured pair has to be
     matched through gearArt or its dead bakes stop being skipped. */
  const artOf = (pfx) => {
    const w = worn.find((x) => x.k && x.k.indexOf(pfx) === 0);
    return w ? gearArt(w.k.slice(pfx.length)) : null;
  };
  if (artOf('chest:') !== 'steelplate' || artOf('legs:') !== 'steelgreaves') return false;
  /* v2.3.1761: a mixed-metal pair does NOT get the figure (see _fullsetFrame),
     so its masked bake is not dead weight — skipping it here would drop the
     player back to a bare body on those frames. */
  const matOf = (pfx) => {
    const w = worn.find((x) => x.k && x.k.indexOf(pfx) === 0);
    return w ? gearMaterial(w.k.slice(pfx.length)) : null;
  };
  return matOf('chest:') === matOf('legs:');
}

/** A figure facing `facing` in `chest` and `legs` stands while its jog's
 *  chain belt sheet is on its way (its load started here when nobody has
 *  asked); `peer` counts it as another player's (QA). */
export function beltHoldsJog(facing, chest, legs, peer) {
  if (!BELT_HOLD || !chest || chest === 'none' || !legs || legs === 'none') return false;
  const dir = resolveDirection(facing).dir;
  if (fullsetCoversBake([{ k: 'chest:' + chest }, { k: 'legs:' + legs }], 'jog', dir)) return false;
  if (!gearSheetWaiting('belt', 'chainbelt', 'jog', dir)) return false;
  if (peer) { _stats.peers++; return true; }
  const now = Math.round(performance.now());
  if (!_stats.held++) _stats.firstAt = now;
  _stats.lastAt = now;
  return true;
}

/* QA (mp-beltstandin): the frames held, and a facing's belt sheet's state, asking nothing */
if (typeof window !== 'undefined') window.__btBeltHold = (dir) => ({ on: BELT_HOLD, ..._stats, sheet: dir ? gearSheetState('belt', 'chainbelt', 'jog', dir) : null });
