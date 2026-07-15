// Shared style + helper module for the in-dashboard panels.

/* v2.3.1227: Lantern Slate (docs/LANTERN-SLATE-SPEC.md) — dark
   mineral charcoal shelf, warm-white text, lantern-brass accent.
   Replaces the v2.3.1226 light&airy set (owner rejected the beige). */
/* v2.3.1235: correction-pass palette (owner-approved ChatGPT review) —
   brighter greener slate, four depth roles. MUST stay in sync with the
   :root --ui-* tokens in src/styles/game.css. accentFill went from a
   solid brown to translucent brass-soft: selected surfaces read as a
   tint over their base, not a mud fill. */
export const COL = {
  bg:        '#1E2E34',                    // sheet
  bgStrong:  '#27393F',                    // header strips
  raised:    '#293B41',                    // actionable card / button
  well:      '#111E23',                    // tray / track
  wellDeep:  '#0B161B',                    // deep inventory tray
  wellSoft:  '#16262C',                    // empty slot / quiet cell
  slot:      '#24363C',                    // occupied slot base (card)
  border:    'rgba(229, 237, 233, 0.11)',
  borderStrong: 'rgba(229, 237, 233, 0.20)',
  divider:   'rgba(229, 237, 233, 0.11)',
  edgeWarm:  'rgba(216, 170, 88, 0.42)',
  text:      '#F4F0E7',
  text2:     '#B6C1BE',
  muted:     '#8D9B98',
  disabled:  '#667875',
  accent:    '#D8AA58',                    // lantern brass
  accentFill:'rgba(216, 170, 88, 0.15)',
  focus:     '#EAC675',
  onAccent:  '#172126',
  danger:    '#D8635D',
  hp:        '#E35D5B',
  stam:      '#DFAE4E',
  mp:        '#4F8FDE',
  xp:        '#58B97B',
  gold:      '#D8AA58',
  tile:      '#16262C',
  tileBor:   'rgba(229, 237, 233, 0.08)',
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
  /* v2.3.1307: contain iOS momentum/rubber-band INSIDE the panel.
     Without this, a fling in an open panel keeps its overscroll
     bounce alive while the sheet collapses — which reads as the whole
     BAND rubber-banding (the owner's persistent "bounce after
     collapsing the expanded menus" report; the band's own writers and
     easing were already single-writer and non-overshooting). */
  overscrollBehavior: 'contain',
  padding: '8px 12px 10px',
  color: COL.text,
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 15,
  /* v2.3.1235: batch-1 QA — bottom scroll-edge fade (pure CSS, no JS):
     any row crossing the sheet's fold fades out over the last 18px,
     signalling more content below; at scroll end the fade zone holds
     only the panels' bottom padding so nothing visibly dims. QA caught
     the Weapons channel list ending EXACTLY at the fold at 390×844 with
     no cue that a third row existed. */
  WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
  maskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
};

export const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 6px',
  borderRadius: 4,
};
