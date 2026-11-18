/* ═══ v2.3.6200: ui's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */
import { BLOCK_GEOM } from '../fxStrips.js';
import { PLAYER_SIZE_MULT } from '../tables/look.js';
import { PVP_THREAT_CONSENT_MS } from '@/data/gameSystems.js';
import { RES_BAR_H, RES_BAR_W, RES_GHOST_HEX, RES_SPENT_GAP } from '../tables/ui.js';
import { xpDecayMult } from '@/data/xpDecay.js';

/* ── v2.3.6200: level 0 ── */
/* v2.3.1193: threat-skull phase (docs/specs/threats.md, "Skull
   rendering").  'red' while the threat countdown runs, 'white' for the
   consent window after it lapses (the server treats expiry as an
   ignore — _tickThreats) or after an explicit ignore, null once
   everything has aged out.  Pure time math, cheap enough for the
   per-player frame loop; feeds a change-cache so display writes only
   happen when the phase flips. */
export function threatSkullPhase(type, until, now) {
  if (!type || !until) return null;
  if (now < until) return type;
  if (type === 'red' && now < until + PVP_THREAT_CONSENT_MS) return 'white';
  return null;
}
/* v2.3.3035: the scale the band over a figure is drawn at, in a zone of
   perspective `zoneScale` -- the harvest's bar is drawn at it at the resource,
   "as large as the normal hp bar" (v2.3.3027) wherever it hangs.  (v2.3.3027's
   bandOverBoots, the band over a stand-in's boots, went with the bar over the
   head.) */
export function bandScale(zoneScale) {
  return PLAYER_SIZE_MULT * (zoneScale || 1);
}
/* Pixi strokes a Graphics with a number and a Text with a css string, and the
   band table is numbers.  One converter, so the digit and the ring cannot
   drift by way of a second hand-written hex literal. */
export function _hexOf(n) { return '#' + Number(n).toString(16).padStart(6, '0'); }
/* Which band a monster's level falls in, relative to the player's.
   Exported so the QA probe and any future caller ask the same question once
   rather than each restating the thresholds (the mirror-audit lesson).
   v2.3.3251: `fadeLevel`, the level the XP fade measures you by (the skill of
   the weapon in your hand), or null when this worker fades nothing -- 'faded'
   (grey) is the fade's own answer, xpDecayMult < 1, never a threshold
   restated here, so the plate turns grey exactly where the XP drops. */
export function plateBandFor(monsterLevel, playerLevel, fadeLevel) {
  if (fadeLevel != null && xpDecayMult(fadeLevel, monsterLevel == null ? 1 : monsterLevel) < 1) return 'faded';
  const d = (monsterLevel == null ? 1 : monsterLevel) - (playerLevel || 1);
  if (d <= -2) return 'low';
  if (d <= 0) return 'near';
  if (d <= 2) return 'high';
  return 'danger';
}
/* v2.3.2530: set the name's ink and weight, and ONLY when they changed.
   A Pixi Text is a texture and a style write regenerates it, so this is
   guarded rather than written every rebuild -- the plate is already rebuilt
   only on a key change, and there is no reason for an alarm flicker to also
   re-rasterise a name whose type did not move. */
export function _setPillType(display, fill, weight) {
  const t = display && display._pillName;
  if (!t) return;
  if (String(t.style.fill) !== fill) t.style.fill = fill;
  if (String(t.style.fontWeight) !== weight) t.style.fontWeight = weight;
}
/* v2.3.1896 (owner: "thick white border ... black fill when it's spent ...
   large enough so that you can fit the numbers on each bar").  The bar grew
   from 46x4 to 66x14 to hold an 8px readout: 14 less two 2px borders leaves
   10px of interior, and 8px of text centred in 10 is the smallest that stays
   legible at this scale.  The width follows so "118 / 118" is not cramped
   against the ends. */
/* v2.3.1896c: 66x14 -> 72x16, and the readout 8px -> 10 bold (owner: "space
   to make the numbers bolder and larger").  16 less two 2px borders leaves
   12px of interior, which is what 10px text needs to sit centred without
   crowding the keyline; the width follows so "118 / 118" keeps its air. */
export const RES_BORDER = 2;          /* the white keyline, drawn OUTSIDE the track */
export const RES_SRC_CELL = BLOCK_GEOM.cell;
export const RES_SRC_PITCH = BLOCK_GEOM.pitch;
export const _barSrcW = (n) => RES_SRC_CELL + (n - 5) * RES_SRC_PITCH;
export const RES_HOLD_MS = 1000;      /* full alpha for a second after the last spend */
export const RES_FADE_MS = 1000;      /* then a second of fade — gone at 2s */
/* v2.3.1897: the spent amount, as a number, gliding off the bar's right end
   (owner: "I want the resource number spent to glide to the right of the
   resource bar (as a negative number)").  The ghost chunk stays — it is the
   MASS that leaves — and this is the same gesture continued past the bar's
   edge with a figure on it, so you can read HOW MUCH left rather than
   estimate it from a sliver.

   v2.3.1898 (owner: "I saw the number appear but not gliding.  I want the
   numbers to slowly move right then fade", and "the glide numbers need to
   match the same timing as the resource bars for appearing and fading"):
   it used to ride the CHUNK's clock — 13px over RES_SLIDE_MS.  420ms is
   under a third of a second of travel across thirteen pixels, which lands
   before the eye gets there: you see a number appear, already parked.  It now
   drifts across the bar's WHOLE life instead, 26px over the full hold+fade,
   so it is still moving while it fades out.  Tying it to RES_HOLD_MS +
   RES_FADE_MS rather than a duration of its own is what makes "match the
   bar's timing" true by construction — one clock, so the two cannot drift
   apart when someone retunes the fade. */
export const RES_SPENT_TRAVEL = 26;   /* how far right of that it drifts */
export const RES_SPENT_GLIDE_MS = RES_HOLD_MS + RES_FADE_MS;
/* v2.3.1899: how far along its travel the number is, 0..1.
   Owner: "The spent energy numbers glide and fade correctly but not the mp
   numbers.  It's still the quick still pop up."

   Both bars run identical code, so the difference was never in the drawing —
   it was in the DATA.  A trace of three real specials in town showed the MP
   number snapping back to its origin on every further spend (t=739, t=1357):
   in real play you cast repeatedly, so it restarts before it has travelled
   far enough to look like motion.  Energy looked fine only because it was
   being spent once.  The reason MP is the one that shows it is town regen —
   the hub pays 10% of maxMana every ~670ms (v2.3.1414), so mana is topped up
   and spendable again immediately, and casts land close together.

   So the glide no longer restarts.  A spend that lands while the bar is
   still on screen picks up from where the number currently IS and glides on
   toward the far end; only a spend arriving after the bar has gone starts
   over at the origin.  The travel is therefore monotonic — it can never jump
   backwards — and every spend still produces visible movement, because there
   is always ground left between here and the end. */
export function _resGlideProgress(gfx, now) {
  if (!gfx._resGlideAt) return 0;
  const base = gfx._resGlideBase || 0;
  const t = Math.min(1, Math.max(0, (now - gfx._resGlideAt) / RES_SPENT_GLIDE_MS));
  return base + (1 - base) * t;
}
export function _drawResourceLabel(label, cur, max, y, alpha) {
  if (!label) return;
  if (alpha <= 0.01) { label.visible = false; return; }
  const txt = Math.ceil(cur) + ' / ' + Math.ceil(max);
  if (label.text !== txt) label.text = txt;
  label.x = 0;
  label.y = y + RES_BAR_H / 2;
  label.alpha = alpha;
  label.visible = true;
}
/* v2.3.1897: the "-N" that glides off the bar's right end.  Left-anchored at
   the keyline and travelling outward, so it reads as the amount LEAVING the
   bar rather than a second gauge parked beside it.  It carries a black stroke
   because unlike the on-bar readout it sits over open terrain, not over the
   bar's own black track — white-on-sand is the one place this text has no
   ground of its own. */
export function _drawResourceSpent(label, gfx, kind, y, alpha) {
  if (!label) return;
  const amt = gfx && gfx._resSpentAmt;
  /* No chunk (a refill, or the seed frame) means nothing to announce.  Gated
     on the bar's own alpha too, so the number cannot outlive the bar — the
     class of bug the stale probes in this file keep producing. */
  if (alpha <= 0.01 || !amt) { label.visible = false; return; }
  const txt = '-' + amt;
  if (label.text !== txt) label.text = txt;
  if (label.style.fill !== RES_GHOST_HEX[kind]) label.style.fill = RES_GHOST_HEX[kind];
  /* v2.3.1898: the bar's clock, and very close to linear.  A strong ease-out
     over two seconds spends most of its travel in the first quarter and then
     sits still for the rest — which is the "appears but does not glide" the
     owner reported, just slower.  The mild exponent keeps a little
     deceleration at the end without ever stopping. */
  const t = Math.min(1, Math.max(0, gfx._resSpentT == null ? 1 : gfx._resSpentT));
  const ease = Math.pow(t, 0.85);
  label.x = RES_BAR_W / 2 + RES_BORDER + RES_SPENT_GAP + RES_SPENT_TRAVEL * ease;
  label.y = y + RES_BAR_H / 2;
  label.alpha = alpha;
  label.visible = true;
}
