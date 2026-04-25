// Utility wheel configuration: slot identity, defaults, and per-slot customization.
// Spec: brotown_wheel_and_card_ui_specs.md Part 1.

// Six clock positions. 6 o'clock is FIXED to "more" — not customizable.
export const SLOT_POSITIONS = [
  { id: '12', angle: -90,  customizable: true  },
  { id: '2',  angle: -30,  customizable: true  },
  { id: '4',  angle:  30,  customizable: true  },
  { id: '6',  angle:  90,  customizable: false }, // FIXED
  { id: '8',  angle: 150,  customizable: true  },
  { id: '10', angle: 210,  customizable: true  },
];

// Catalog of tools that can fill a slot. Icons are simple inline SVG paths
// scaled to a 24-unit viewBox so the wheel can render them at any size.
export const TOOL_CATALOG = {
  inventory:  { label: 'Inventory',  icon: 'M4 7h16v12H4z M8 7V5a4 4 0 0 1 8 0v2' },
  journey:    { label: 'Journey',    icon: 'M4 6h16M4 12h16M4 18h10' },
  map:        { label: 'Map',        icon: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16' },
  social:     { label: 'Social',     icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 21v-1a8 8 0 0 1 16 0v1M19 8v6M22 11h-6' },
  selfInspect:{ label: 'Self',       icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1' },
  more:       { label: 'More',       icon: 'M5 12a1 1 0 1 0 .01 0M12 12a1 1 0 1 0 .01 0M19 12a1 1 0 1 0 .01 0' },
  // Additional tools the player can swap into slots:
  bank:       { label: 'Bank',       icon: 'M3 21h18M5 21V10l7-5 7 5v11M9 21V13M15 21V13' },
  clan:       { label: 'Clan',       icon: 'M4 21l8-18 8 18H4z M12 3v18' },
  market:     { label: 'Market',     icon: 'M3 7h18l-2 12H5L3 7zM8 7V4h8v3' },
  arena:      { label: 'Arena',      icon: 'M5 5l14 14M5 19L19 5M12 2v20M2 12h20' },
  quests:     { label: 'Quests',     icon: 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4' },
  settings:   { label: 'Settings',   icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M5 12H2M22 12h-3M6 6L4 4M20 20l-2-2M6 18l-2 2M20 4l-2 2' },
};

// Default per-slot tool. Spec §"Default tool set":
// 12 inv · 2 journey · 4 map · 6 MORE · 8 social · 10 self-inspect.
export const DEFAULT_SLOT_TOOLS = {
  '12': 'inventory',
  '2':  'journey',
  '4':  'map',
  '6':  'more',         // fixed
  '8':  'social',
  '10': 'selfInspect',
};

const STORAGE_KEY = 'brotown_wheel_slots_v1';

export const loadSlotConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SLOT_TOOLS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SLOT_TOOLS, ...parsed, '6': 'more' }; // force 6 o'clock fixed
  } catch {
    return { ...DEFAULT_SLOT_TOOLS };
  }
};

export const saveSlotConfig = (config) => {
  try {
    const safe = { ...config, '6': 'more' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {}
};
