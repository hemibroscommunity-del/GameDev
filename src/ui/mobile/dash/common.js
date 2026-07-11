// Shared style + helper module for the in-dashboard panels.

/* v2.3.1227: Lantern Slate (docs/LANTERN-SLATE-SPEC.md) — dark
   mineral charcoal shelf, warm-white text, lantern-brass accent.
   Replaces the v2.3.1226 light&airy set (owner rejected the beige). */
export const COL = {
  bg:        '#202C32',                    // panel / band-mid
  bgStrong:  '#182227',                    // header strips
  raised:    '#2B3940',                    // actionable card / button
  well:      '#121B20',                    // tray / track
  wellSoft:  '#19252A',                    // empty slot / quiet cell
  slot:      '#243137',                    // occupied slot base
  border:    'rgba(238, 242, 235, 0.14)',
  divider:   'rgba(238, 242, 235, 0.10)',
  edgeWarm:  'rgba(229, 202, 157, 0.28)',
  text:      '#F7F2E7',
  text2:     '#B9C1BF',
  muted:     '#96A2A0',
  accent:    '#D8A85F',                    // lantern brass
  accentFill:'#3B3427',
  focus:     '#F0C878',
  onAccent:  '#20170D',
  hp:        '#D95C54',
  stam:      '#D8A94D',
  mp:        '#4D86D5',
  xp:        '#61B06B',
  gold:      '#D8A85F',
  tile:      '#19252A',
  tileBor:   'rgba(238, 242, 235, 0.08)',
};

/* v2.3.1227: Lantern Slate rarity — thin edge language, never fills. */
export const TIER_COLOR = {
  common:    '#8B9695',
  uncommon:  '#59BF91',
  rare:      '#5B99DE',
  epic:      '#9A76D3',
  legendary: '#A477DF',
  godly:     '#F0C45F',
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
