import React from 'react';

/* v2.3.1311 (owner spec, Hero rework): ONE bar construction for all
   three vitals.  HP previously used the sprite-sheet trough while
   stamina/mana were plain CSS lines — three resources, two visual
   languages.  This component gives every vital the same end caps,
   trough, numeric alignment and inner highlight; HP is 2px thicker
   because it is the most important resource (spec allows 1-2px).
   Icons come from the owner's HD pixel-art hero-stat sheet so all
   three match in style and optical scale. */

/* ═══ v2.3.1922: THE HEART IS JUST A HEART ═══
   Owner: "can you find just a heart icon to use for HP and not anything
   inside of it? It looks like that has a lightning bolt or something on it"

   It does, near enough: hero/hp.webp is a heart with a white ECG trace
   struck across it, and at the 18px this panel draws it at, that trace is a
   pale zigzag and nothing more.  The reading is worse than a coincidence —
   the row directly beneath it is ENERGY, whose icon is an actual gold
   lightning bolt, so the eye is being asked to tell a squiggle from a bolt
   at 18px in a column where a bolt is a real answer.

   hp-heart.webp is the SAME artwork with the trace painted out, not a
   different heart: same silhouette, same bevel, same palette, same optical
   scale, so it still belongs to the hero sheet that stamina and mana come
   from.  (The game's other heart, /icons/popups/heart.webp, is a flat red
   one with a heavy black keyline — drawn to read against the world at 40px,
   and visibly a different art language beside these two.)

   The old file stays where it is: it is genuinely a health-with-vitals mark
   and may be wanted as one later. */
export const VITAL_ICONS = {
  hp:      '/icons/ui/hero/hp-heart.webp?v=2.3.1922',
  stamina: '/icons/ui/hero/stamina.webp?v=2.3.1311',
  mana:    '/icons/ui/hero/mana.webp?v=2.3.1311',
};

/* v2.3.1883: the short names the owner's reference labels the bars with
   ("HP / EN / MP").  They live beside the icons rather than in the one screen
   that draws them, because a second copy of this map is how stamina ends up
   called EN on one panel and STA on the next.  The keys are the renderer's,
   not the player's: `stamina` is shown as ENERGY across the UI and `mana` as
   MP, and those two disagreements are exactly what this map exists to hold in
   one place. */
export const VITAL_LABEL = { hp: 'HP', stamina: 'EN', mana: 'MP' };

/* v2.3.1892: the letter's colour, taken off the top stop of the bar's own
   gradient below.  Dropping the icons for HP/EN/MP (owner) would otherwise
   drop the colour coding with them, and the colour is what makes the three
   readable at a glance rather than three identical grey numbers. */
export const VITAL_TINT = { hp: '#E06A5E', stamina: '#E9BF77', mana: '#74ACE8' };

const FILL = {
  hp:      'linear-gradient(180deg, #E06A5E 0%, #C74A3E 55%, #A93A30 100%)',
  stamina: 'linear-gradient(180deg, #E9BF77 0%, #D8A85F 55%, #B98A44 100%)',
  mana:    'linear-gradient(180deg, #74ACE8 0%, #5B99DE 55%, #4479B8 100%)',
};

/* `inset` (v2.3.1922) is anything to draw INSIDE the trough — the compact
   vitals put their "84 / 120" there rather than beside the bar.  It lives on
   this component instead of at the call site so the numbers keep sharing the
   bar's own rounding and clip: a sibling absolutely positioned over the bar
   from outside would have to re-guess both, and would drift the first time
   either changes here. */
/* ═══ v2.3.2497: THE MANA BAR IS THE BLOCK BAR ═══
 * Owner, asked what to do about the mana bar's border sideways (it is
 * `1px solid rgba(255,255,255,.08)` below -- 8% white, which is not a border,
 * it is a rumour): "reuse the existing block-style bar asset, the mana blocks
 * that shipped alongside the stamina block asset."
 *
 * So no new border treatment is invented.  This draws the owner's own sheet
 * (/icons/ui/blocks-mp.webp, v2.3.2300, already in the preload manifest and
 * already what the in-world spend bar under the character is made of), which
 * brings its own painted frame and its own caps.
 *
 * SIX FRAMES, AND THE INDEX IS THE NUMBER OF FILLED BLOCKS -- frame 0 is empty,
 * frame 5 is full (fxStrips.js reverses the sheet's own countdown precisely so
 * no call site ever writes `5 - filled`).  A 600%-wide background with the x
 * position stepped in fifths picks one; the blocks are the readout, so there is
 * no separate fill element for mana at all.
 *
 * FIVE BLOCKS, not the in-world bar's investable N.  The pixi bar rebuilds
 * itself from cap/middle/cell pieces because the row grows to ten with
 * investment (v2.3.2302); this row is a fixed-width panel gauge with the exact
 * numbers printed beside it, so it reads the pool in fifths and the sheet's own
 * six frames express that exactly.  blocksFor is imported rather than copied --
 * its FLOOR is the contract (a block showing IS a cast you can afford).
 *
 * STRETCHED horizontally, and that was checked by rendering it rather than
 * reasoned about: at 160x10, 160x12 and 160x14 the frame, the caps and the five
 * cells all read cleanly.  The vertical axis is NOT stretched (the sheet is 99
 * tall and the bar is 10-12), so the frame's top and bottom edges keep their
 * proportion; it is the block cells that get wider, which is the axis a bar is
 * allowed to be wrong on.
 *
 * HP and ENERGY are untouched.  The owner named mana; stamina has the matching
 * sheet ready if he wants the pair. */
const BLOCK_SHEET = { mana: '/icons/ui/blocks-mp.webp?v=2.3.2300' };
const BLOCK_FRAMES = 6;   /* empty + five filled */
const BLOCK_N = 5;

export const VitalBar = ({ kind, cur, max, thick, inset }) => {
  const h = thick != null ? thick : (kind === 'hp' ? 10 : 8);
  const pct = Math.max(0, Math.min(100, (cur / (max || 1)) * 100));
  const sheet = BLOCK_SHEET[kind];
  if (sheet) {
    /* FLOOR, the same rule fxStrips.blocksFor states: a block is a fifth of the
       pool and a special costs one, so "blocks showing" is "casts you can still
       afford".  Rounding up would light a block the game would refuse to spend.
       Inlined rather than imported: fxStrips pulls in pixi and Assets, and this
       is a DOM component that must not drag the renderer into its bundle for
       one division. */
    const m = Math.max(1, max || 1);
    const v = Math.max(0, Math.min(m, cur || 0));
    const lit = Math.max(0, Math.min(BLOCK_N, Math.floor((v * BLOCK_N) / m)));
    return (
      <div style={{
        flex: 1,
        height: h,
        minWidth: 0,
        position: 'relative',
        backgroundImage: `url('${sheet}')`,
        backgroundRepeat: 'no-repeat',
        /* 600% wide: one frame fills the box, and the x position steps in
           fifths of the REMAINING width, which is how a percentage background
           position addresses a strip. */
        backgroundSize: `${BLOCK_FRAMES * 100}% 100%`,
        backgroundPosition: `${(lit / (BLOCK_FRAMES - 1)) * 100}% 0`,
        transition: 'background-position .15s steps(1, end)',
      }}>
        {inset != null && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            /* The readout has to survive a ground that is no longer one flat
               colour: a lit block is bright blue and the gutter beside it is
               near-black, and the same white digits cross both.  A halo rather
               than a colour change, for the reason the trough version gives --
               one treatment that works over both halves.  A text-shadow, never
               a `filter`: this sits over the WebGL canvas and CLAUDE.md records
               what filters do there on iOS. */
            textShadow: '0 1px 2px rgba(3,8,10,.95), 0 0 4px rgba(3,8,10,.85)',
          }}>{inset}</div>
        )}
      </div>
    );
  }
  return (
    <div style={{
      flex: 1,
      height: h,
      borderRadius: h / 2,
      background: 'rgba(0,0,0,.5)',
      border: '1px solid rgba(255,255,255,.08)',
      overflow: 'hidden',
      position: 'relative',
      minWidth: 0,
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        borderRadius: h / 2,
        background: FILL[kind] || FILL.stamina,
        transition: 'width .15s linear',
      }} />
      {/* shared inner highlight — one thin catch-light along the top
          of the trough, identical on all three vitals. */}
      <div style={{
        position: 'absolute', left: 2, right: 2, top: 1, height: 1,
        borderRadius: 1,
        background: 'rgba(255,255,255,.18)',
        pointerEvents: 'none',
      }} />
      {/* v2.3.1922: the in-trough readout.  Centred on the whole bar, NOT on
          the fill, so the number holds still while the resource drains — a
          label that tracked the fill edge would slide across the row on every
          hit.  It therefore has to stay legible over both halves at once,
          which is what the dark halo buys: white on the fill, white on the
          empty trough, one treatment. */}
      {inset != null && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>{inset}</div>
      )}
    </div>
  );
};
