/* ═══ v2.3.6200: ui's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */
import { BLOCK_BARS, BLOCK_GEOM, blocksFor } from '../fxStrips.js';
import { PLAYER_SIZE_MULT } from '../tables/look.js';
import { PVP_THREAT_CONSENT_MS } from '@/data/gameSystems.js';
import { RES_BAR_H, RES_BAR_W, RES_BLOCK_W, RES_GHOST_HEX, RES_SPENT_GAP } from '../tables/ui.js';
import { xpDecayMult } from '@/data/xpDecay.js';
import { Sprite, Texture } from 'pixi.js';

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

/* ── v2.3.6201: main's level 1 ── */
export const RES_BAR_MAX_W = 118;
export const _barScaleX = (n) => Math.min(RES_BLOCK_W / RES_SRC_CELL, RES_BAR_MAX_W / _barSrcW(n));

/* ── v2.3.6201: main's level 2 ── */
export const _barWidth = (n) => Math.round(_barScaleX(n) * _barSrcW(n));

/* ── v2.3.6201: main's level 3 ── */
/* v2.3.1896b: the gap has to clear BOTH borders, not just the bar.  At
   +3 the MP border's bottom edge (y + H + BORDER) landed 1px BELOW the
   energy border's top (y - BORDER) and the two rounded outlines merged into
   one lozenge — visible the moment they were photographed together.  Bar +
   two borders + 3px of real air. */
/* v2.3.1896c: derived from RES_MP_Y, not from a repeated literal.  It said
   `40 + ...` while MP moved to 52, so the energy bar climbed INTO the MP bar
   and clipped its readout — caught in the screenshot, not by the suite, which
   only asserts enY > mpY and was still true.  Deriving it makes the two
   impossible to separate again. */
/* v2.3.2300: the block sheet's own aspect. His frames are 273x98, so a bar
   drawn 76 wide is 27 tall -- taller than the 20 the old bar plus its keyline
   occupied, which is why RES_EN_Y is re-derived below rather than left at a
   number tuned for the old one. 76 keeps the width the owner has been looking
   at since v2.3.1896c; the height follows the art rather than being squashed
   into the old slot, because five blocks squeezed to 16px stop reading as five
   things. */
export const RES_BLOCK_H = Math.round(RES_BLOCK_W * 98 / 273);
/* One bar.  Returns its alpha, so the caller can decide about the plate. */
export function _drawResourceBar(gfx, sprite, kind, cur, max, y, now, n) {
  const m = Math.max(1, max || 1);
  const v = Math.max(0, Math.min(m, cur || 0));
  /* Seed on the first frame so arriving at partial MP does not read as a
     spend and flash the bar for nothing — the same trap the HP ring hit at
     v2.3.1682. */
  if (gfx._resLast == null) {
    gfx._resLast = v; gfx._resSpentAt = 0; gfx._resFrom = v;
    gfx._resSpentAmt = 0;
    gfx._resGlideAt = 0; gfx._resGlideBase = 0;
  }
  if (v < gfx._resLast - 0.01) {
    /* Was the bar still on screen when this spend landed?  Read BEFORE
       _resSpentAt is overwritten below — it is the whole test. */
    const _prevSince = now - (gfx._resSpentAt || 0);
    const _wasUp = !!gfx._resSpentAt && _prevSince <= RES_HOLD_MS + RES_FADE_MS;
    gfx._resFrom = gfx._resLast;         /* re-base the chunk on every spend */
    /* The FADE still re-arms on every spend — that is the owner's original
       rule ("disappear after 2 seconds if no further mp is used").  Only the
       GLIDE is now continuous across the burst. */
    gfx._resGlideBase = _wasUp ? _resGlideProgress(gfx, now) : 0;
    gfx._resGlideAt = now;
    gfx._resSpentAt = now;
    /* v2.3.1897: LATCHED here, not recomputed per frame.  Mana and stamina
       regenerate server-side, so a regen tick arrives as a rise and lands in
       the refill branch below — recomputed each frame, the "-N" would blink
       out the first time the server topped you up, which inside a 2s hold is
       most of the time.  The chunk can afford that (it is gone in 420ms); a
       number the player is still reading cannot.  A further spend re-latches,
       matching the chunk, which also shows only the newest spend. */
    /* v2.3.1900 (owner: "Successive expenditures of mp and energy are treated
       cumulatively (numbers keep adding up the more you spend) I just want
       the expended amount"): the number is THIS spend, not a running total.
       v2.3.1899 accumulated, which was the wrong answer to a real problem —
       so keep the guard and drop the total.

       The real problem: mana arrives fractional under town regen (77 -> 77.1
       -> 90 -> 90.1), so a sub-half-unit dip counts as a spend by the 0.01
       test above and Math.round()s to ZERO.  Overwriting blindly with that
       BLANKED a live number mid-glide while its bar stayed up (caught at
       t=1460 in the three-cast trace).  So a drop that does not round to at
       least 1 leaves the displayed amount alone: real costs are whole
       numbers, and anything under a unit is regen jitter, not an expenditure
       worth announcing.  It still re-arms the bar, which is the pre-existing
       behaviour of the 0.01 test and not this change's business. */
    const _rounded = Math.round(gfx._resLast - v);
    if (_rounded >= 1) gfx._resSpentAmt = _rounded;
    else if (!_wasUp) gfx._resSpentAmt = 0;
  } else if (v > gfx._resLast + 0.01) {
    gfx._resFrom = v;                    /* refill: no chunk, and no reveal */
  }
  gfx._resLast = v;

  const since = now - (gfx._resSpentAt || 0);
  let alpha = 0;
  if (gfx._resSpentAt) {
    if (since <= RES_HOLD_MS) alpha = 1;
    else if (since <= RES_HOLD_MS + RES_FADE_MS) alpha = 1 - (since - RES_HOLD_MS) / RES_FADE_MS;
  }
  /* ═══ v2.3.2300: FIVE BLOCKS, NOT A PROPORTIONAL BAR ═══
     Owner: "instead of seeing tiny percentages and trying to do mental math
     each time stamina or mana is used, I want just 5 blocks (with thick borders
     between them but all connected inside a rectangle)."

     Everything ABOVE this line is untouched -- the spend detection, the
     hold-then-fade clock, the re-arm on a second spend. That is the behaviour
     v2.3.1895-1900 tuned with the owner over five rounds and none of it was
     what he is complaining about. What changes is only what gets DRAWN, so the
     bars still appear on a spend, hold for a second, fade by two, and hold
     their reserved positions.

     THE GRAPHICS STOPS DRAWING AND KEEPS ITS JOB. Every `_res*` field the
     probe publishes and the death-reset sweep clears lives on this object, and
     moving that bookkeeping onto the sprite would mean touching both the
     revive path and the keep-list. It is the state; the sprite is the view.

     THE SLIDING CHUNK AND THE "-N" ARE GONE with the proportional fill. They
     existed to make a fraction legible as a quantity ("how much of the bar just
     left"), which is precisely the mental arithmetic being removed -- and with
     a block readout the answer is visible without a number, because a whole
     block goes out. Their bookkeeping is nulled rather than left stale, so the
     probe reports the absence rather than the last value from before the swap. */
  gfx.clear();
  gfx._resSlideT = 1;
  gfx._resSpentT = 1;
  gfx._resGhostX = null; gfx._resGhostW = 0;
  gfx._resSpentAmt = 0;
  if (alpha <= 0.01) {
    gfx.alpha = 0;
    if (sprite) { sprite.visible = false; sprite.alpha = 0; }
    return 0;
  }
  gfx.alpha = alpha;
  if (sprite) {
    const parts = BLOCK_BARS[kind] && BLOCK_BARS[kind].parts;
    const N = Math.max(1, Math.floor(n || 5));
    const lit = blocksFor(v, m, N);
    /* No sheet (a 404, or a frame before the preload settled) means no bar --
       NOT a half-drawn one. The preloading law makes the second case a bug
       rather than a state to design for, and the manifest awaits these; this
       is the honest degradation for the first. */
    if (parts) {
      const k = _barScaleX(N);
      const W = _barWidth(N);
      const L = -W / 2;          /* the container sits at x=0, so the bar grows
                                    symmetrically about the player's centre --
                                    this is what preserves the anchor(0.5, 0)
                                    semantics the single sprite used to have. */
      sprite.x = 0;
      sprite.y = y;
      sprite.alpha = alpha;
      sprite.visible = true;

      /* ═══ v2.3.6206: THE FRAME GETS ITS PICTURES HERE, AS THE BLOCKS DO ═══
         The owner, 2026-11-25 (iPhone 14 Pro): "They look like they have holes
         in them instead of a full pill shape like the original."  The cap,
         middle and cap were handed their pictures ONCE, when the bar was made
         (entityRenderer mkBlocks: `parts && parts.capL`), and a bar made
         before the sheet was cut kept Texture.EMPTY for good: five loose
         blocks with the ground between them.  The blocks never broke because
         they are given theirs every draw, below.  So the frame is too: a
         reference compare a frame, and a swap once. */
      if (sprite._capL.texture !== parts.capL) sprite._capL.texture = parts.capL;
      if (sprite._mid.texture !== parts.mid) sprite._mid.texture = parts.mid;
      if (sprite._capR.texture !== parts.capR) sprite._capR.texture = parts.capR;
      const capW = BLOCK_GEOM.cap * k;
      sprite._capL.x = L;            sprite._capL.width = capW;  sprite._capL.height = RES_BLOCK_H;
      sprite._mid.x = L + capW;      sprite._mid.width = Math.max(0, W - capW * 2); sprite._mid.height = RES_BLOCK_H;
      sprite._capR.x = L + W - capW; sprite._capR.width = capW;  sprite._capR.height = RES_BLOCK_H;

      /* v2.3.2302: cells are POOLED, never destroyed when N changes. N moves
         on a level-up, an allocation and a respec -- all of which can happen
         mid-fight -- and `new Sprite()` on the frame the sixth block arrives
         is a hitch on the one frame the player is actually watching the bar.
         Grow to fit, then hide the surplus. */
      while (sprite._cells.length < N) {
        const c = new Sprite(parts.empty);
        c.anchor.set(0, 0);
        sprite.addChild(c);
        sprite._cells.push(c);
      }
      for (let i = 0; i < sprite._cells.length; i++) {
        const c = sprite._cells[i];
        if (i >= N) { c.visible = false; continue; }
        const tex = i < lit ? parts.lit : parts.empty;
        if (c.texture !== tex) c.texture = tex;
        c.x = L + k * (BLOCK_GEOM.first + RES_SRC_PITCH * i);
        c.width = BLOCK_GEOM.cellW * k;
        c.height = RES_BLOCK_H;
        c.visible = true;
      }
    } else {
      sprite.visible = false;
    }
  }
  return alpha;
}

/* ── v2.3.6206 (card EN): where the two bars' pieces are drawn ──
   For mp-resbars only, called by its probe (window.__btResBarBoxes), never in
   a frame: each piece's box on the stage and whether it holds a picture of the
   sheet (Texture.EMPTY is the blank a piece was made with before its sheet
   was cut: the owner's "holes", 2026-11-25). */
export function resBarBoxes(d) {
  /* a piece's two corners carried to the stage (every piece is anchored at
     (0, 0), so its own space runs from 0 to its picture's size) */
  const box = (q) => {
    if (!q || q.destroyed) return null;
    const t = q.texture;
    const o = (t && t.orig) || { width: 0, height: 0 };
    const a = q.toGlobal({ x: 0, y: 0 }), z = q.toGlobal({ x: o.width, y: o.height });
    return { x: Math.min(a.x, z.x), y: Math.min(a.y, z.y), w: Math.abs(z.x - a.x), h: Math.abs(z.y - a.y), visible: !!q.visible,
      pic: !!(t && t !== Texture.EMPTY && t.source && !t.source.destroyed && o.width > 1) };
  };
  const one = (sp) => {
    if (!sp || sp.destroyed) return null;
    return { visible: !!sp.visible, alpha: sp.alpha, noCast: sp._castsNoShadow === true,
      capL: box(sp._capL), mid: box(sp._mid), capR: box(sp._capR),
      cells: (sp._cells || []).filter((c) => c.visible).map(box) };
  };
  return { mp: one(d && d._resMpBlocks), en: one(d && d._resEnBlocks) };
}
