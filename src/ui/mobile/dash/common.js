// Shared style + helper module for the in-dashboard panels.

/* v2.3.1226: light & airy palette per docs/UI-BIBLE.md Part 2 —
   Parchment surfaces, Ink text, Slate secondary, Brass accent,
   hairline ink-alpha borders.  Every dash panel inherits this. */
export const COL = {
  bg:        'rgba(247, 242, 232, 0.96)',  // Parchment
  border:    'rgba(34, 48, 60, 0.16)',     // Hairline
  divider:   'rgba(34, 48, 60, 0.10)',
  text:      '#22303C',                    // Ink
  muted:     '#68737F',                    // Slate
  accent:    '#B08D57',                    // Brass
  hp:        '#C0392B',
  stam:      '#B7791F',
  mp:        '#2B6CB0',
  xp:        '#2F855A',
  gold:      '#B7791F',
  tile:      'rgba(34, 48, 60, 0.05)',     // Bone-ish well
  tileBor:   'rgba(34, 48, 60, 0.14)',
};

/* v2.3.1226: recalibrated darker for light surfaces (UI-BIBLE Part 2
   rarity table).  Godly = gold base of the prismatic treatment. */
export const TIER_COLOR = {
  common:    '#68737F',
  uncommon:  '#2F855A',
  rare:      '#2B6CB0',
  epic:      '#7C3AED',
  legendary: '#B7791F',
  godly:     '#8A6A3B',
};

export const getState = () => (typeof window !== 'undefined') && window._gameState && window._gameState.current;

// Common panel container — fills the dashboard's content area below the header.
// touchAction: 'pan-y' opts back in to vertical scrolling for the inner panel
// since the parent dashboard sets touch-action:none to suppress accidental
// browser pan/zoom on swipes over dashboard chrome.
export const panelStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  touchAction: 'pan-y',
  padding: '8px 12px 10px',
  color: COL.text,
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 15,
};

export const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 6px',
  borderRadius: 4,
};
