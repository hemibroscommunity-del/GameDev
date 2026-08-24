import React from 'react';

/* v2.3.1311 (owner spec, Hero rework): ONE bar construction for all
   three vitals.  HP previously used the sprite-sheet trough while
   stamina/mana were plain CSS lines — three resources, two visual
   languages.  This component gives every vital the same end caps,
   trough, numeric alignment and inner highlight; HP is 2px thicker
   because it is the most important resource (spec allows 1-2px).
   Icons come from the owner's HD pixel-art hero-stat sheet so all
   three match in style and optical scale. */

export const VITAL_ICONS = {
  hp:      '/icons/ui/hero/hp.webp?v=2.3.1311',
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

const FILL = {
  hp:      'linear-gradient(180deg, #E06A5E 0%, #C74A3E 55%, #A93A30 100%)',
  stamina: 'linear-gradient(180deg, #E9BF77 0%, #D8A85F 55%, #B98A44 100%)',
  mana:    'linear-gradient(180deg, #74ACE8 0%, #5B99DE 55%, #4479B8 100%)',
};

export const VitalBar = ({ kind, cur, max, thick }) => {
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
    </div>
  );
};
