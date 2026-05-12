// Shared style + helper module for the in-dashboard panels.

export const COL = {
  bg:        'rgba(13, 14, 22, 0.92)',
  border:    'rgba(255, 255, 255, 0.10)',
  divider:   'rgba(255, 255, 255, 0.06)',
  text:      '#E8EAF8',
  muted:     '#8890b8',
  accent:    '#5b52ff',
  hp:        '#ff5e6c',
  stam:      '#f5c542',
  mp:        '#3b82f6',
  xp:        '#3ddc97',
  gold:      '#f5c542',
  tile:      'rgba(255, 255, 255, 0.04)',
  tileBor:   'rgba(255, 255, 255, 0.10)',
};

export const TIER_COLOR = {
  common:    '#9ca3af',
  uncommon:  '#3ddc97',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
  godly:     '#ef4444',
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
  fontFamily: 'VT323, monospace',
  fontSize: 15,
};

export const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 6px',
  borderRadius: 4,
};

export const emptyMsg = (text) => ({
  text,
  style: {
    color: COL.muted,
    textAlign: 'center',
    fontSize: 15,
    paddingTop: 18,
  },
});
