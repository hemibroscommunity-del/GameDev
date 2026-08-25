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
export const VitalBar = ({ kind, cur, max, thick, inset }) => {
  const h = thick != null ? thick : (kind === 'hp' ? 10 : 8);
  const pct = Math.max(0, Math.min(100, (cur / (max || 1)) * 100));
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
